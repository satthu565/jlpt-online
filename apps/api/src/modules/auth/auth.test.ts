import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import type { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { createApp } from '../../main.js';
import { SmtpTestServer } from '../email/smtp-test-server.js';
import { EmailService } from '../email/email.service.js';
import { getOrCreateDbClient } from '../../common/database/database.module.js';
import { seedDatabase } from '../../db/seed.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';

describe('F03 Authentication, Verification, and Mailpit Integration', () => {
  let app: NestFastifyApplication;
  let smtpServer: SmtpTestServer;
  let emailService: EmailService;

  beforeAll(async () => {
    // 1. Start SMTP Test Server on port 1025 (Mailpit standard port)
    smtpServer = new SmtpTestServer();
    const started = await smtpServer.start(1025, '127.0.0.1');
    if (!started) {
      console.log('Port 1025 already bound; Mailpit container is assumed to receive messages.');
    }

    // 2. Start Nest Fastify Application
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    emailService = app.get(EmailService);

    // 3. Seed database with synthetic blueprints and exams
    const client = await getOrCreateDbClient();
    await seedDatabase(client);
  });

  afterAll(async () => {
    await app.close();
    await smtpServer.stop();
  });

  describe('Acceptance 1: Đăng ký xác minh đăng nhập đăng xuất và reset một lần chạy thật trên Mailpit', () => {
    const testEmail = `student_${Date.now()}@example.com`;
    const originalPassword = 'InitialPassword123!';
    const newPassword = 'NewSecretPassword456!';
    let verificationToken = '';
    let sessionToken = '';
    let resetToken = '';

    it('ACC-01 & NOTI-01: Đăng ký tài khoản thành công và gửi email xác minh qua Mailpit', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-up/email',
        payload: {
          email: testEmail,
          password: originalPassword,
          name: 'Nguyen Van A',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.user.email).toBe(testEmail);
      expect(body.user.emailVerified).toBe(false);

      // Verify email was captured by SMTP server / EmailService
      const lastEmail = emailService.getLastEmail();
      expect(lastEmail).toBeDefined();
      expect(lastEmail?.to).toBe(testEmail);
      expect(lastEmail?.subject).toBe('Xác minh tài khoản JLPT Online');

      // Extract verification token from email
      const tokenMatch = lastEmail?.html.match(/token=([a-f0-9]+)/i);
      expect(tokenMatch).not.toBeNull();
      verificationToken = tokenMatch![1]!;
      expect(verificationToken.length).toBeGreaterThan(16);
    });

    it('Từ chối đăng nhập khi email chưa được xác minh', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        payload: {
          email: testEmail,
          password: originalPassword,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('ACC-05: Xác minh email bằng token hợp lệ', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/verify-email?token=${verificationToken}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.verified).toBe(true);
      expect(body.email).toBe(testEmail);
    });

    it('Token xác minh chỉ có thể sử dụng một lần (từ chối khi gọi lại)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/verify-email?token=${verificationToken}`,
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('ACC-02: Đăng nhập thành công, nhận session token và Set-Cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        payload: {
          email: testEmail,
          password: originalPassword,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.user.email).toBe(testEmail);
      expect(body.user.emailVerified).toBe(true);
      expect(body.session.token).toBeDefined();

      sessionToken = body.session.token;

      // Check Set-Cookie header
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(String(cookies)).toContain('auth_token=');
      expect(String(cookies)).toContain('HttpOnly');
    });

    it('Truy cập endpoint có xác thực (/api/v1/me) bằng Bearer header và Cookie', async () => {
      // 1. Using Authorization Header
      const headerRes = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });
      expect(headerRes.statusCode).toBe(200);
      const headerBody = JSON.parse(headerRes.payload);
      expect(headerBody.email).toBe(testEmail);

      // 2. Using Cookie
      const cookieRes = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          cookie: `auth_token=${sessionToken}`,
        },
      });
      expect(cookieRes.statusCode).toBe(200);
      const cookieBody = JSON.parse(cookieRes.payload);
      expect(cookieBody.email).toBe(testEmail);
    });

    it('ACC-02: Đăng xuất thành công, session bị hủy', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-out',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);

      // Verify that the invalidated session cannot access protected routes
      const checkRes = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });
      expect(checkRes.statusCode).toBe(401);
      const checkBody = JSON.parse(checkRes.payload);
      expect(checkBody.error.code).toBe('UNAUTHENTICATED');
    });

    it('ACC-04 & NOTI-02: Quên mật khẩu, gửi email đặt lại mật khẩu qua Mailpit', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: {
          email: testEmail,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);

      // Verify reset email was sent via Mailpit
      const lastEmail = emailService.getLastEmail();
      expect(lastEmail).toBeDefined();
      expect(lastEmail?.to).toBe(testEmail);
      expect(lastEmail?.subject).toBe('Đặt lại mật khẩu JLPT Online');

      // Extract reset token from email
      const tokenMatch = lastEmail?.html.match(/token=([a-f0-9]+)/i);
      expect(tokenMatch).not.toBeNull();
      resetToken = tokenMatch![1]!;
      expect(resetToken.length).toBeGreaterThan(16);
    });

    it('ACC-04: Đặt lại mật khẩu mới bằng reset token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetToken,
          newPassword,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    it('Reset một lần: Từ chối dùng lại reset token lần 2 (Single-Use Token)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetToken,
          newPassword: 'AnotherPassword789!',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Mật khẩu cũ không đăng nhập được, mật khẩu mới đăng nhập thành công', async () => {
      // 1. Old password fails
      const failRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        payload: {
          email: testEmail,
          password: originalPassword,
        },
      });
      expect(failRes.statusCode).toBe(401);

      // 2. New password succeeds
      const successRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        payload: {
          email: testEmail,
          password: newPassword,
        },
      });
      expect(successRes.statusCode).toBe(200);
      const body = JSON.parse(successRes.payload);
      expect(body.user.email).toBe(testEmail);
      sessionToken = body.session.token;
    });
  });

  describe('Acceptance 2: OAuth callback kiểm tra state và redirect allowlist', () => {
    it('ACC-03: Khởi tạo Google OAuth trả về authUrl, state và redirect allowlist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/google?redirectUrl=http://localhost:3000/auth/callback',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.authUrl).toContain('accounts.google.com');
      expect(body.state).toBeDefined();
      expect(body.redirectUrl).toBe('http://localhost:3000/auth/callback');
    });

    it('ACC-03: Từ chối redirectUrl ngoài allowlist (phishing / open redirect)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/google?redirectUrl=https://attacker-stealer.com/steal-session',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('ACC-03: OAuth callback từ chối khi state không trùng khớp (CSRF Protection)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/google/callback?code=test_code&state=forged_state&expectedState=genuine_state',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('state');
    });

    it('ACC-03: OAuth callback từ chối khi redirectUrl trong callback nằm ngoài allowlist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/google/callback?code=test_code&state=match_state&expectedState=match_state&redirectUrl=https://evil.org',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('ACC-03: OAuth callback chấp nhận khi state trùng khớp và redirect trong allowlist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/google/callback?code=valid_code&state=correct_123&expectedState=correct_123&redirectUrl=http://localhost:3000/dashboard',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.targetUrl).toBe('http://localhost:3000/dashboard');
    });
  });

  describe('User Profile & Sessions Management (ACC-07, ACC-10, ACC-12)', () => {
    let userToken = '';
    let userId = '';

    beforeAll(async () => {
      const email = `profile_user_${Date.now()}@example.com`;
      const pass = 'ProfileUser123!';

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-up/email',
        payload: { email, password: pass, name: 'Profile User' },
      });

      // Directly verify user in DB for this suite
      const client = await getOrCreateDbClient();
      await client.db
        .update(schema.users)
        .set({ emailVerified: true })
        .where(eq(schema.users.email, email));

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        payload: { email, password: pass },
      });
      const loginBody = JSON.parse(loginRes.payload);
      userToken = loginBody.session.token;
      userId = loginBody.user.id;
    });

    it('ACC-07: Cập nhật mục tiêu trình độ JLPT (N1–N5)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/me',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { targetLevel: 'N2' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.targetLevel).toBe('N2');
    });

    it('ACC-07: Từ chối cấp độ JLPT không hợp lệ (ví dụ: N6)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/me',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { targetLevel: 'N6' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('ACC-10: Xem tổng số đề đã hoàn thành (completedExams)', async () => {
      // 1. Initial count: 0
      const res1 = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res1.statusCode).toBe(200);
      const body1 = JSON.parse(res1.payload);
      expect(body1.completedExams).toBe(0);

      // 2. Insert a submitted attempt in DB using seeded examVersion
      const client = await getOrCreateDbClient();
      const versions = await client.db.select().from(schema.examVersions).limit(1);
      const targetExam = versions[0];
      if (!targetExam) {
        throw new Error('No exam versions seeded');
      }

      const attemptId = generateUuidV7();
      const leaseId = generateUuidV7();

      await client.db.insert(schema.examAttempts).values({
        id: attemptId,
        userId,
        examId: targetExam.examId,
        examVersion: targetExam.version,
        mode: 'practice',
        status: 'submitted',
        leaseId,
        attemptMonth: '2026-10-01',
      });

      // 3. Updated count: 1
      const res2 = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(res2.statusCode).toBe(200);
      const body2 = JSON.parse(res2.payload);
      expect(body2.completedExams).toBe(1);
    });

    it('ACC-12: Quản lý thiết bị và các phiên đăng nhập', async () => {
      // 1. Create a second session
      const client = await getOrCreateDbClient();
      const secondSessionId = generateUuidV7();
      const secondSessionToken = 'second_device_token_abc';
      await client.db.insert(schema.sessions).values({
        id: secondSessionId,
        userId,
        token: secondSessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userAgent: 'Mozilla/5.0 (iPhone)',
        ipAddress: '192.168.1.100',
      });

      // 2. List sessions
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/me/sessions',
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(listRes.statusCode).toBe(200);
      const listBody = JSON.parse(listRes.payload);
      expect(listBody.items.length).toBeGreaterThanOrEqual(2);
      const current = listBody.items.find((s: { isCurrent: boolean }) => s.isCurrent);
      expect(current).toBeDefined();

      // 3. Revoke specific session (second session)
      const revokeRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/me/sessions/${secondSessionId}`,
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(revokeRes.statusCode).toBe(200);

      // Verify second session token no longer works
      const checkRes = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { authorization: `Bearer ${secondSessionToken}` },
      });
      expect(checkRes.statusCode).toBe(401);

      // 4. Revoke all other sessions
      const revokeAllRes = await app.inject({
        method: 'DELETE',
        url: '/api/v1/me/sessions',
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(revokeAllRes.statusCode).toBe(200);

      // Current session still works
      const currentCheck = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(currentCheck.statusCode).toBe(200);
    });
  });
});
