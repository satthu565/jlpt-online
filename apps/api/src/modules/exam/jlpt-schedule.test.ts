import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ExamModule } from './exam.module.js';
import { AdminModule } from '../admin/admin.module.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { jlptExamSchedules } from './jlpt-schedule.schema.js';

@Module({
  imports: [
    DatabaseModule,
    EmailModule,
    AuthModule,
    AuditModule,
    ExamModule,
    AdminModule,
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
class TestJlptScheduleAppModule {}

describe('P03: JLPT Exam Schedules in Vietnam API & RBAC & Audit', () => {
  let app: NestFastifyApplication;
  let adminUserId: string;
  let adminToken: string;
  let studentUserId: string;
  let studentToken: string;

  beforeAll(async () => {
    const client = await getOrCreateDbClient();

    // 1. Create Admin
    adminUserId = generateUuidV7();
    adminToken = 'tok_admin_' + Date.now();
    await client.db.insert(schema.users).values({
      id: adminUserId,
      email: `admin_${Date.now()}@example.com`,
      role: 'admin',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: adminUserId,
      token: adminToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 2. Create Student
    studentUserId = generateUuidV7();
    studentToken = 'tok_student_' + Date.now();
    await client.db.insert(schema.users).values({
      id: studentUserId,
      email: `student_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: studentUserId,
      token: studentToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 3. Clear existing test schedules to verify clean/empty behavior
    await client.db.delete(jlptExamSchedules);

    // Boot app
    const adapter = new FastifyAdapter();
    app = await NestFactory.create<NestFastifyApplication>(
      TestJlptScheduleAppModule,
      adapter,
      { logger: false },
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Public schedule endpoint returns empty list when no published schedules exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/jlpt-schedules',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toBeDefined();
    expect(body.items).toEqual([]);

    // Route alias /exams/schedules
    const aliasRes = await app.inject({
      method: 'GET',
      url: '/api/v1/exams/schedules',
    });
    expect(aliasRes.statusCode).toBe(200);
    expect(JSON.parse(aliasRes.body).items).toEqual([]);
  });

  it('2. Regular student cannot create JLPT exam schedules (403 Forbidden)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/jlpt-schedules',
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        title: 'Kỳ thi JLPT Tháng 12/2026',
        examDate: '2026-12-06',
        registrationDeadline: '2026-09-15T17:00:00.000Z',
        locations: [
          { city: 'Hà Nội', name: 'ĐH Ngoại ngữ', address: 'Số 2 Phạm Văn Đồng' },
        ],
        officialUrl: 'https://jlpt.vnu.edu.vn',
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('3. Admin creates draft schedule, records audit log, and it is NOT visible on public endpoint', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/jlpt-schedules',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      payload: {
        title: 'Kỳ thi JLPT Tháng 12/2026',
        examDate: '2026-12-06',
        registrationDeadline: '2026-09-15T17:00:00.000Z',
        registrationOpensAt: '2026-08-01T08:00:00.000Z',
        locations: [
          { city: 'Hà Nội', name: 'Đại học Ngoại ngữ - ĐHQGHN', address: 'Số 2 Phạm Văn Đồng, Cầu Giấy, Hà Nội' },
          { city: 'Đà Nẵng', name: 'Đại học Ngoại ngữ - ĐH Đà Nẵng', address: '131 Lương Nhữ Hộc, Cẩm Lệ, Đà Nẵng' },
          { city: 'TP.HCM', name: 'Đại học KHXH&NV - ĐHQG TP.HCM', address: '10-12 Đinh Tiên Hoàng, Quận 1, TP.HCM' },
        ],
        officialUrl: 'https://jlpt.vnu.edu.vn',
        levels: ['N1', 'N2', 'N3', 'N4', 'N5'],
        notes: 'Thí sinh mang theo CCCD và phiếu báo dự thi.',
      },
    });

    expect(createRes.statusCode).toBe(201);
    const schedule = JSON.parse(createRes.body);
    expect(schedule.id).toBeDefined();
    expect(schedule.title).toBe('Kỳ thi JLPT Tháng 12/2026');
    expect(schedule.status).toBe('draft');
    expect(schedule.locations.length).toBe(3);

    // Verify audit log was recorded
    const client = await getOrCreateDbClient();
    const [auditLog] = await client.db
      .select()
      .from(schema.operatorActions)
      .where(eq(schema.operatorActions.action, 'create_jlpt_schedule'));

    expect(auditLog).toBeDefined();
    expect(auditLog.operatorId).toBe(adminUserId);
    expect(auditLog.targetResource).toContain(schedule.id);

    // Public endpoint must NOT see draft schedule
    const pubListRes = await app.inject({
      method: 'GET',
      url: '/api/v1/jlpt-schedules',
    });
    expect(JSON.parse(pubListRes.body).items).toEqual([]);

    const pubGetRes = await app.inject({
      method: 'GET',
      url: `/api/v1/jlpt-schedules/${schedule.id}`,
    });
    expect(pubGetRes.statusCode).toBe(404);
  });

  it('4. Admin updates and publishes schedule; public endpoint immediately sees published schedule', async () => {
    // List admin schedules to get draft ID
    const listAdminRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/jlpt-schedules',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const scheduleId = JSON.parse(listAdminRes.body).items[0].id;

    // Update notes
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/jlpt-schedules/${scheduleId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      payload: {
        notes: 'Cập nhật lệ phí thi và thời hạn nộp hồ sơ.',
      },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(JSON.parse(updateRes.body).notes).toBe('Cập nhật lệ phí thi và thời hạn nộp hồ sơ.');

    // Publish
    const pubActionRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/jlpt-schedules/${scheduleId}/publish`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(pubActionRes.statusCode).toBe(201);
    const published = JSON.parse(pubActionRes.body);
    expect(published.status).toBe('published');
    expect(published.publishedAt).not.toBeNull();

    // Now public endpoint SEES published schedule!
    const pubRes = await app.inject({
      method: 'GET',
      url: '/api/v1/jlpt-schedules',
    });
    expect(pubRes.statusCode).toBe(200);
    const pubItems = JSON.parse(pubRes.body).items;
    expect(pubItems.length).toBe(1);
    expect(pubItems[0].id).toBe(scheduleId);
    expect(pubItems[0].title).toBe('Kỳ thi JLPT Tháng 12/2026');
    expect(pubItems[0].locations.length).toBe(3);

    // Detail by ID
    const pubDetailRes = await app.inject({
      method: 'GET',
      url: `/api/v1/jlpt-schedules/${scheduleId}`,
    });
    expect(pubDetailRes.statusCode).toBe(200);
    expect(JSON.parse(pubDetailRes.body).id).toBe(scheduleId);
  });

  it('5. Admin unpublishes schedule; public endpoint immediately hides it', async () => {
    const client = await getOrCreateDbClient();
    const [sched] = await client.db
      .select({ id: jlptExamSchedules.id })
      .from(jlptExamSchedules)
      .limit(1);

    const unpublishRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/jlpt-schedules/${sched.id}/unpublish`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(unpublishRes.statusCode).toBe(201);
    expect(JSON.parse(unpublishRes.body).status).toBe('draft');

    // Public list is empty again
    const pubRes = await app.inject({
      method: 'GET',
      url: '/api/v1/jlpt-schedules',
    });
    expect(JSON.parse(pubRes.body).items).toEqual([]);
  });

  it('6. Admin deletes schedule, audit log records deletion', async () => {
    const client = await getOrCreateDbClient();
    const [sched] = await client.db
      .select({ id: jlptExamSchedules.id })
      .from(jlptExamSchedules)
      .limit(1);

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/jlpt-schedules/${sched.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.statusCode).toBe(200);

    const check = await client.db
      .select()
      .from(jlptExamSchedules)
      .where(eq(jlptExamSchedules.id, sched.id));
    expect(check.length).toBe(0);

    // Audit log check
    const [auditLog] = await client.db
      .select()
      .from(schema.operatorActions)
      .where(eq(schema.operatorActions.action, 'delete_jlpt_schedule'));
    expect(auditLog).toBeDefined();
    expect(auditLog.targetResource).toContain(sched.id);
  });
});
