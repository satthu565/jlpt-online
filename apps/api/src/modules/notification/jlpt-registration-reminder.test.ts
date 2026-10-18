import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseModule, getOrCreateDbClient } from '../../common/database/database.module.js';
import { EmailModule } from '../email/email.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { NotificationModule } from './notification.module.js';
import { NotificationService } from './notification.service.js';
import { ExamModule } from '../exam/exam.module.js';
import { JlptScheduleService } from '../exam/jlpt-schedule.service.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';

@Module({
  imports: [
    DatabaseModule,
    EmailModule,
    AuthModule,
    AuditModule,
    NotificationModule,
    ExamModule,
  ],
})
class TestNotificationReminderAppModule {}

describe('P03: JLPT Registration & Exam Date Reminders via Outbox', () => {
  let app: NestFastifyApplication;
  let notificationService: NotificationService;
  let scheduleService: JlptScheduleService;

  let activeStudentId: string;
  let optedOutStudentId: string;
  let adminId: string;
  let publishedScheduleId: string;

  beforeAll(async () => {
    const client = await getOrCreateDbClient();

    // 0. Create Admin User
    adminId = generateUuidV7();
    await client.db.insert(schema.users).values({
      id: adminId,
      email: `admin_${Date.now()}@example.com`,
      role: 'admin',
      emailVerified: true,
    });

    // 1. Create Active Student (default preferences: examReminders = true)
    activeStudentId = generateUuidV7();
    await client.db.insert(schema.users).values({
      id: activeStudentId,
      email: `active_student_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
    });

    // 2. Create Opted-Out Student
    optedOutStudentId = generateUuidV7();
    await client.db.insert(schema.users).values({
      id: optedOutStudentId,
      email: `optout_student_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
    });

    // Boot app
    const adapter = new FastifyAdapter();
    app = await NestFactory.create<NestFastifyApplication>(
      TestNotificationReminderAppModule,
      adapter,
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    notificationService = app.get(NotificationService);
    scheduleService = app.get(JlptScheduleService);

    // Disable exam reminders for optedOutStudent
    await notificationService.updatePreferences(optedOutStudentId, {
      examReminders: false,
    });

    // Verify preferences
    const activePrefs = await notificationService.getPreferences(activeStudentId);
    expect(activePrefs.examReminders).toBe(true);

    const optoutPrefs = await notificationService.getPreferences(optedOutStudentId);
    expect(optoutPrefs.examReminders).toBe(false);

    // 3. Create a published JLPT schedule with registration deadline 7 days in future
    const now = new Date();
    const futureDeadline = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const futureExamDate = new Date(now.getTime() + 60 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);

    const created = await scheduleService.createSchedule(
      {
        title: 'Kỳ thi JLPT Tháng 12/2026',
        examDate: futureExamDate,
        registrationDeadline: futureDeadline.toISOString(),
        locations: [
          { city: 'Hà Nội', name: 'ĐH Ngoại ngữ', address: 'Số 2 Phạm Văn Đồng' },
        ],
        officialUrl: 'https://jlpt.vnu.edu.vn',
        levels: ['N1', 'N2', 'N3', 'N4', 'N5'],
      },
      adminId,
    );
    publishedScheduleId = created.id;

    // Publish schedule
    await scheduleService.publishSchedule(publishedScheduleId, adminId);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Registration reminder emits event to outbox for opted-in user and respects opt-out user', async () => {
    const client = await getOrCreateDbClient();

    // Clear prior outbox rows for clean test
    await client.db
      .delete(schema.outbox)
      .where(eq(schema.outbox.topic, 'notification.jlpt_registration_reminder'));

    // Process registration reminders
    const result = await notificationService.processJlptRegistrationReminders({
      scheduleId: publishedScheduleId,
    });

    expect(result.sent).toBeGreaterThanOrEqual(1);
    expect(result.skippedOptOut).toBeGreaterThanOrEqual(1);

    // Check outbox row
    const outboxRows = await client.db
      .select()
      .from(schema.outbox)
      .where(eq(schema.outbox.topic, 'notification.jlpt_registration_reminder'));

    // Active user MUST receive outbox event
    const activeUserEvent = outboxRows.find((row: typeof schema.outbox.$inferSelect) => {
      const p = row.payload as Record<string, unknown>;
      return p?.['recipientId'] === activeStudentId;
    });
    expect(activeUserEvent).toBeDefined();

    const payload = activeUserEvent!.payload as Record<string, unknown>;
    expect(payload['scheduleId']).toBe(publishedScheduleId);
    expect(payload['title']).toBe('Kỳ thi JLPT Tháng 12/2026');
    expect(payload['daysLeft']).toBeGreaterThanOrEqual(6);
    expect(payload['dedupeKey']).toBe(`jlpt_reg_reminder_${publishedScheduleId}_${activeStudentId}_7d`);
    expect(payload['officialUrl']).toBe('https://jlpt.vnu.edu.vn');

    // Opted-out user MUST NOT receive any outbox event!
    const optoutEvent = outboxRows.find((row: typeof schema.outbox.$inferSelect) => {
      const p = row.payload as Record<string, unknown>;
      return p?.['recipientId'] === optedOutStudentId;
    });
    expect(optoutEvent).toBeUndefined();
  });

  it('2. Exactly once delivery: re-running reminder job sends 0 duplicate outbox events', async () => {
    const client = await getOrCreateDbClient();

    const countBefore = (
      await client.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'notification.jlpt_registration_reminder'))
    ).length;

    // Run again
    const resultAgain = await notificationService.processJlptRegistrationReminders({
      scheduleId: publishedScheduleId,
    });

    // 0 new sent events, deduplication recognized
    expect(resultAgain.sent).toBe(0);
    expect(resultAgain.skippedDuplicate).toBeGreaterThanOrEqual(1);

    const countAfter = (
      await client.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'notification.jlpt_registration_reminder'))
    ).length;

    // Count is exactly identical (no double delivery)
    expect(countAfter).toBe(countBefore);
  });

  it('3. User selectively turning off jlpt_registration_reminder in typeSettings is respected', async () => {
    // Re-enable examReminders, but specifically turn off jlpt_registration_reminder
    await notificationService.updatePreferences(activeStudentId, {
      examReminders: true,
      typeSettings: {
        jlpt_registration_reminder: false,
      },
    });

    const prefs = await notificationService.getPreferences(activeStudentId);
    expect(prefs.typeSettings['jlpt_registration_reminder']).toBe(false);

    // Create a new schedule
    const newSched = await scheduleService.createSchedule(
      {
        title: 'Kỳ thi JLPT Tháng 07/2027',
        examDate: '2027-07-04',
        registrationDeadline: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
        locations: [
          { city: 'Đà Nẵng', name: 'ĐH Ngoại ngữ ĐN', address: '131 Lương Nhữ Hộc' },
        ],
        officialUrl: 'https://jlpt.danang.edu.vn',
        levels: ['N1', 'N2', 'N3'],
      },
      adminId,
    );
    await scheduleService.publishSchedule(newSched.id, adminId);

    const result = await notificationService.processJlptRegistrationReminders({
      scheduleId: newSched.id,
    });

    // Active student has disabled jlpt_registration_reminder, so skippedOptOut increases
    expect(result.skippedOptOut).toBeGreaterThanOrEqual(1);

    const client = await getOrCreateDbClient();
    const rows = await client.db
      .select()
      .from(schema.outbox)
      .where(eq(schema.outbox.topic, 'notification.jlpt_registration_reminder'));

    const event = rows.find((r: typeof schema.outbox.$inferSelect) => {
      const p = r.payload as Record<string, unknown>;
      return p?.['scheduleId'] === newSched.id && p?.['recipientId'] === activeStudentId;
    });
    expect(event).toBeUndefined();
  });

  it('4. Exam date reminder emits event to outbox exactly once and respects opt-out', async () => {
    const client = await getOrCreateDbClient();

    // Clear prior outbox rows for clean test
    await client.db
      .delete(schema.outbox)
      .where(eq(schema.outbox.topic, 'notification.jlpt_exam_reminder'));

    // Enable exam reminders for activeStudent
    await notificationService.updatePreferences(activeStudentId, {
      examReminders: true,
      typeSettings: {
        jlpt_exam_reminder: true,
      },
    });

    // Run exam date reminders
    const res1 = await notificationService.processJlptExamDateReminders({
      scheduleId: publishedScheduleId,
    });

    expect(res1.sent).toBeGreaterThanOrEqual(1);

    const rows = await client.db
      .select()
      .from(schema.outbox)
      .where(eq(schema.outbox.topic, 'notification.jlpt_exam_reminder'));

    const activeUserEvent = rows.find((row: typeof schema.outbox.$inferSelect) => {
      const p = row.payload as Record<string, unknown>;
      return p?.['recipientId'] === activeStudentId;
    });
    expect(activeUserEvent).toBeDefined();

    const payload = activeUserEvent!.payload as Record<string, unknown>;
    expect(payload['dedupeKey']).toBe(`jlpt_exam_date_reminder_${publishedScheduleId}_${activeStudentId}_60d`);

    // Re-run for deduplication check
    const res2 = await notificationService.processJlptExamDateReminders({
      scheduleId: publishedScheduleId,
    });
    expect(res2.sent).toBe(0);
    expect(res2.skippedDuplicate).toBeGreaterThanOrEqual(1);
  });

  it('5. Expired registration deadline (diffMs <= 0) sends 0 reminders and skips past schedule', async () => {
    // Create a schedule with deadline in the past
    const pastDeadline = new Date(Date.now() - 2 * 3600 * 1000); // 2 hours ago
    const pastSched = await scheduleService.createSchedule(
      {
        title: 'Kỳ thi JLPT Đã Hết Hạn Đăng Ký',
        examDate: '2026-12-06',
        registrationDeadline: pastDeadline.toISOString(),
        locations: [
          { city: 'Hà Nội', name: 'ĐH Ngoại ngữ', address: 'Số 2 Phạm Văn Đồng' },
        ],
        officialUrl: 'https://jlpt.vnu.edu.vn',
        levels: ['N5'],
      },
      adminId,
    );
    await scheduleService.publishSchedule(pastSched.id, adminId);

    const client = await getOrCreateDbClient();
    const countBefore = (
      await client.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'notification.jlpt_registration_reminder'))
    ).length;

    const result = await notificationService.processJlptRegistrationReminders({
      scheduleId: pastSched.id,
    });

    expect(result.sent).toBe(0);

    const countAfter = (
      await client.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'notification.jlpt_registration_reminder'))
    ).length;

    expect(countAfter).toBe(countBefore);
  });

  it('6. Milestone-based idempotency: 1d milestone reminder is sent even if 7d was sent previously', async () => {
    // publishedSchedule was already sent with 7d milestone in Test 1.
    // Now simulate time moving to 20 hours before deadline (daysLeft <= 1 -> windowKey '1d')
    const sched = await scheduleService.getAdminScheduleById(publishedScheduleId);
    const deadline = new Date(sched.registrationDeadline);
    const simulatedNow = new Date(deadline.getTime() - 20 * 3600 * 1000); // 20 hours before deadline

    const res1d = await notificationService.processJlptRegistrationReminders({
      scheduleId: publishedScheduleId,
      now: simulatedNow,
    });

    // Active student receives the 1d milestone reminder!
    expect(res1d.sent).toBeGreaterThanOrEqual(1);

    const client = await getOrCreateDbClient();
    const outboxRows = await client.db
      .select()
      .from(schema.outbox)
      .where(eq(schema.outbox.topic, 'notification.jlpt_registration_reminder'));

    const event1d = outboxRows.find((row: typeof schema.outbox.$inferSelect) => {
      const p = row.payload as Record<string, unknown>;
      return (
        p?.['recipientId'] === activeStudentId &&
        p?.['scheduleId'] === publishedScheduleId &&
        p?.['dedupeKey'] === `jlpt_reg_reminder_${publishedScheduleId}_${activeStudentId}_1d`
      );
    });
    expect(event1d).toBeDefined();

    // Re-running with same simulated time produces 0 new events (deduplicated for '1d')
    const res1dAgain = await notificationService.processJlptRegistrationReminders({
      scheduleId: publishedScheduleId,
      now: simulatedNow,
    });
    expect(res1dAgain.sent).toBe(0);
    expect(res1dAgain.skippedDuplicate).toBeGreaterThanOrEqual(1);
  });
});
