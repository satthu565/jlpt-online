import 'reflect-metadata';
process.env.EMAIL_DRIVER = 'memory';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { OriginGuard } from '../../common/guards/origin.guard.js';
import { TotpGuard } from '../../common/guards/totp.guard.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';
import { ApiExceptionFilter } from '../../common/filters/api-exception.filter.js';
import { PiiMaskingInterceptor } from '../../common/interceptors/pii-masking.interceptor.js';
import { DatabaseModule, getOrCreateDbClient } from '../../common/database/database.module.js';
import { EmailModule } from '../email/email.module.js';
import { EmailService } from '../email/email.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationModule } from './notification.module.js';
import { NotificationService } from './notification.service.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';

@Module({
  imports: [
    DatabaseModule,
    EmailModule,
    AuthModule,
    NotificationModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TotpGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: PiiMaskingInterceptor },
  ],
})
class TestNotificationAppModule {}

describe('L02 Notification Preferences, Quiet Hours & Idempotent Delivery (NOTI-03..NOTI-10)', () => {
  let app: NestFastifyApplication;
  let notiService: NotificationService;
  let emailService: EmailService;

  let studentId: string;
  let studentToken: string;

  beforeAll(async () => {
    const client = await getOrCreateDbClient();

    studentId = generateUuidV7();
    studentToken = 'tok_noti_student_' + Date.now();
    await client.db.insert(schema.users).values({
      id: studentId,
      email: `student_noti_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: studentId,
      token: studentToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const moduleRef = await NestFactory.create<NestFastifyApplication>(
      TestNotificationAppModule,
      new FastifyAdapter(),
    );
    app = moduleRef;
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    notiService = app.get(NotificationService);
    emailService = app.get(EmailService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // ===========================================================================
  // 1. Notification Preferences & Opt-Out (NOTI-10, Acceptance 3)
  // ===========================================================================
  describe('Notification Preferences & Opt-Out (NOTI-10)', () => {
    it('lấy tùy chọn thông báo mặc định của người dùng', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/me/notification-preferences',
        headers: { authorization: `Bearer ${studentToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.emailUpdates).toBe(true);
      expect(body.quietHours).toEqual({ start: '22:00', end: '07:00' });
      expect(body.timezone).toBe('Asia/Ho_Chi_Minh');
      expect(body.typeSettings.practice_reminder).toBe(true);
    });

    it('cập nhật tùy chọn thông báo (tắt một loại thông báo, đổi quietHours và timezone)', async () => {
      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/me/notification-preferences',
        headers: { authorization: `Bearer ${studentToken}` },
        payload: {
          quietHours: { start: '23:00', end: '08:00' },
          timezone: 'Asia/Tokyo',
          typeSettings: {
            practice_reminder: false, // Opt-out practice reminder
          },
        },
      });

      expect(patchRes.statusCode).toBe(200);
      const updated = JSON.parse(patchRes.body);
      expect(updated.quietHours).toEqual({ start: '23:00', end: '08:00' });
      expect(updated.timezone).toBe('Asia/Tokyo');
      expect(updated.typeSettings.practice_reminder).toBe(false);
    });

    it('chính sách Opt-Out: Không gửi thông báo khi người dùng đã tắt loại thông báo đó', async () => {
      emailService.clearSentEmails();

      // Dispatch practice reminder which was turned off
      const result = await notiService.sendPracticeReminder(studentId, 'att-123');

      expect(result.status).toBe('opted_out');
      expect(result.delivered).toBe(false);
      expect(emailService.getSentEmails().length).toBe(0);
    });
  });

  // ===========================================================================
  // 2. Quiet Hours & Deferral (Acceptance 3)
  // ===========================================================================
  describe('Quiet Hours & Deferral (Acceptance 3)', () => {
    it('hoãn gửi thông báo học tập khi thời điểm rơi vào khung giờ yên tĩnh (deferred_quiet_hours)', async () => {
      emailService.clearSentEmails();

      // Current time set to 23:30 JST (inside 23:00 - 08:00 quiet hours in Asia/Tokyo)
      // 23:30 JST = 14:30 UTC
      const quietTimeUTC = new Date('2026-10-16T14:30:00.000Z');

      const result = await notiService.dispatchNotification({
        recipientId: studentId,
        type: 'new_exam',
        payload: {
          examTitle: 'Đề N5 Luyện Đêm',
          subject: 'Có đề mới',
          message: 'Vào học ngay',
        },
        now: quietTimeUTC,
      });

      expect(result.status).toBe('deferred_quiet_hours');
      expect(result.delivered).toBe(false);
      expect(result.scheduledFor).toBeDefined();
      expect(emailService.getSentEmails().length).toBe(0); // Not delivered immediately!
    });

    it('thông báo giao dịch khẩn cấp (payment_status) bỏ qua quiet hours và gửi ngay', async () => {
      emailService.clearSentEmails();

      // Even during quiet hours, critical notifications bypass quiet hours
      const result = await notiService.sendPaymentStatusNotification(
        studentId,
        'order-999',
        'thành công',
      );

      expect(result.status).toBe('delivered');
      expect(result.delivered).toBe(true);
      expect(emailService.getSentEmails().length).toBe(1);
      expect(emailService.getLastEmail()?.subject).toContain('order-999');
    });

    it('gửi ngay khi nằm ngoài khung giờ yên tĩnh', async () => {
      emailService.clearSentEmails();

      // 10:00 JST = 01:00 UTC (outside 23:00 - 08:00 quiet hours)
      const dayTimeUTC = new Date('2026-10-16T01:00:00.000Z');

      const result = await notiService.dispatchNotification({
        recipientId: studentId,
        type: 'srs_due',
        payload: {
          dueCount: 15,
          subject: 'Ôn tập từ vựng',
          message: '15 từ vựng đến hạn',
        },
        now: dayTimeUTC,
      });

      expect(result.status).toBe('delivered');
      expect(result.delivered).toBe(true);
      expect(emailService.getSentEmails().length).toBe(1);
    });

    it('không gây sập RangeError khi timezone không hợp lệ và fallback an toàn (P2 fix)', () => {
      const now = new Date('2026-10-16T14:30:00.000Z');
      const quietHours = { start: '22:00', end: '07:00' };

      // Passing an invalid timezone string must not throw RangeError
      expect(() => {
        const inQuiet = notiService.isInQuietHours(now, quietHours, 'Invalid/Timezone_Name');
        expect(typeof inQuiet).toBe('boolean');
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // 3. Idempotency & Deduplication (Acceptance 3)
  // ===========================================================================
  describe('Idempotency & Deduplication (Acceptance 3)', () => {
    it('chống gửi trùng lặp thông báo khi có cùng dedupeKey (duplicate_suppressed)', async () => {
      emailService.clearSentEmails();
      const dayTimeUTC = new Date('2026-10-16T01:00:00.000Z');
      const dedupeKey = 'unique_weekly_event_123';

      // First dispatch
      const res1 = await notiService.dispatchNotification({
        recipientId: studentId,
        type: 'weekly_stats',
        payload: { stats: { total: 50 }, message: 'Tuần qua bạn làm được 50 câu' },
        dedupeKey,
        now: dayTimeUTC,
      });

      expect(res1.status).toBe('delivered');
      expect(res1.delivered).toBe(true);
      expect(emailService.getSentEmails().length).toBe(1);

      // Second dispatch with same dedupeKey
      const res2 = await notiService.dispatchNotification({
        recipientId: studentId,
        type: 'weekly_stats',
        payload: { stats: { total: 50 }, message: 'Tuần qua bạn làm được 50 câu' },
        dedupeKey,
        now: dayTimeUTC,
      });

      expect(res2.status).toBe('duplicate_suppressed');
      expect(res2.delivered).toBe(false);
      // Still exactly 1 email sent!
      expect(emailService.getSentEmails().length).toBe(1);
    });
  });

  // ===========================================================================
  // 4. Concrete Senders Verification (NOTI-03..NOTI-09)
  // ===========================================================================
  describe('Concrete Notification Senders (NOTI-03..NOTI-09)', () => {
    beforeAll(async () => {
      // Re-enable practice reminder for testing sender
      await notiService.updatePreferences(studentId, {
        quietHours: { start: '00:00', end: '04:00' },
        timezone: 'Asia/Ho_Chi_Minh',
        typeSettings: { practice_reminder: true },
      });
    });

    it('NOTI-03: Nhắc tiếp tục bài luyện dang dở', async () => {
      emailService.clearSentEmails();
      const res = await notiService.sendPracticeReminder(studentId, 'att-999');
      expect(res.status).toBe('delivered');
      expect(emailService.getLastEmail()?.subject).toContain('bài luyện tập');
    });

    it('NOTI-04: Thông báo có đề mới', async () => {
      emailService.clearSentEmails();
      const res = await notiService.sendNewExamNotification(studentId, 'exam-n4-1', 'Đề N4 Mẫu 2026');
      expect(res.status).toBe('delivered');
      expect(emailService.getLastEmail()?.subject).toContain('Đề N4 Mẫu 2026');
    });

    it('NOTI-05: Nhắc ôn từ đến hạn SRS', async () => {
      emailService.clearSentEmails();
      const res = await notiService.sendSrsDueNotification(studentId, 25);
      expect(res.status).toBe('delivered');
      expect(emailService.getLastEmail()?.subject).toContain('25 thẻ từ vựng');
    });

    it('NOTI-06: Thống kê kết quả tuần', async () => {
      emailService.clearSentEmails();
      const res = await notiService.sendWeeklyStatsNotification(studentId, { accuracy: 85 });
      expect(res.status).toBe('delivered');
      expect(emailService.getLastEmail()?.subject).toContain('tiến độ học tập tuần');
    });

    it('NOTI-07: Nhắc lịch thi mục tiêu', async () => {
      emailService.clearSentEmails();
      const res = await notiService.sendTargetExamReminder(studentId, 45);
      expect(res.status).toBe('delivered');
      expect(emailService.getLastEmail()?.subject).toContain('45 ngày');
    });

    it('NOTI-08: Thông báo kết quả thi thử đồng loạt', async () => {
      emailService.clearSentEmails();
      const res = await notiService.sendExamResultReleasedNotification(studentId, 'event-01');
      expect(res.status).toBe('delivered');
      expect(emailService.getLastEmail()?.subject).toContain('Kết quả thi thử đồng loạt');
    });

    it('NOTI-09: Thông báo tình trạng thanh toán', async () => {
      emailService.clearSentEmails();
      const res = await notiService.sendPaymentStatusNotification(studentId, 'order-premium-01', 'thành công');
      expect(res.status).toBe('delivered');
      expect(emailService.getLastEmail()?.subject).toContain('order-premium-01');
    });
  });
});
