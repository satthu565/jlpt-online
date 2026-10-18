import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq, desc } from 'drizzle-orm';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../main.js';
import { SmtpTestServer } from '../email/smtp-test-server.js';
import { EmailService } from '../email/email.service.js';
import { AuthService } from './auth.service.js';
import { getOrCreateDbClient, DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import { seedDatabase } from '../../db/seed.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { generateTotp, encryptTotpSecret, hashRecoveryCode } from '../../common/utils/totp.js';
import type { AuthUserContext, UserTotpMetadata } from '../../common/types/auth.types.js';
import { hashPassword } from 'better-auth/crypto';
import { runDemoSeed } from '../import/demo-seed.js';

describe('F03 Authentication, Verification, and Mailpit Integration', () => {
  let app: NestFastifyApplication;
  let smtpServer: SmtpTestServer;

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

      // Verify email was received over TCP by the SMTP Test Server
      expect(smtpServer.messages.length).toBeGreaterThan(0);
      const smtpMessage = smtpServer.messages.find(
        (m) => m.to.includes(testEmail) && m.subject.includes('Xác minh'),
      );
      expect(smtpMessage).toBeDefined();
      expect(smtpMessage?.to).toContain(testEmail);
      expect(smtpMessage?.subject).toBe('Xác minh tài khoản JLPT Online');

      // Extract verification token directly from TCP SMTP payload
      const tokenMatch = smtpMessage?.body.match(/token=([a-f0-9]+)/i);
      expect(tokenMatch).not.toBeNull();
      verificationToken = tokenMatch![1]!;
      expect(verificationToken.length).toBeGreaterThan(16);
    });

    it('Đăng ký vẫn trả 201 khi SMTP không kết nối được; email gửi lại qua outbox và có test', async () => {
      const failEmail = `smtp_fail_${Date.now()}@example.com`;
      const emailService = app.get(EmailService);
      const originalSend = emailService.sendVerificationEmail.bind(emailService);
      emailService.sendVerificationEmail = vi.fn().mockRejectedValue(new Error('SMTP down: ECONNREFUSED 127.0.0.1:1025'));

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/sign-up/email',
          payload: {
            email: failEmail,
            password: originalPassword,
            name: 'Fallback User',
          },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.payload);
        expect(body.user.email).toBe(failEmail);
        expect(body.user.emailVerified).toBe(false);

        const client = app.get<DbClientInstance>(DB_CLIENT);
        const outboxItems = await client.db
          .select()
          .from(schema.outbox)
          .where(eq(schema.outbox.topic, 'notification.email'))
          .orderBy(desc(schema.outbox.createdAt))
          .limit(5);

        const found = outboxItems.find(
          (item: { payload: { to?: string; type?: string } }) =>
            item.payload?.to === failEmail && item.payload?.type === 'verification',
        );
        expect(found).toBeDefined();
        expect(found.payload.verificationUrl).toContain('/xac-minh-email?token=');
      } finally {
        emailService.sendVerificationEmail = originalSend;
      }
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

      // Verify reset email was received over TCP by the SMTP Test Server
      expect(smtpServer.messages.length).toBeGreaterThan(0);
      const resetSmtpMessage = smtpServer.messages.find(
        (m) => m.to.includes(testEmail) && m.subject.includes('Đặt lại mật khẩu'),
      );
      expect(resetSmtpMessage).toBeDefined();
      expect(resetSmtpMessage?.to).toContain(testEmail);
      expect(resetSmtpMessage?.subject).toBe('Đặt lại mật khẩu JLPT Online');

      // Extract reset token directly from TCP SMTP payload
      const tokenMatch = resetSmtpMessage?.body.match(/token=([a-f0-9]+)/i);
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
    let genuineState = '';

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
      genuineState = body.state;
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

    it('ACC-03: OAuth callback từ chối khi state không tồn tại / không trùng khớp (CSRF Protection)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/google/callback?code=test_code&state=forged_state_attacker_999',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('state');
    });

    it('ACC-03: OAuth callback từ chối khi redirectUrl trong callback nằm ngoài allowlist', async () => {
      // First initiate a fresh OAuth state
      const initRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/google',
      });
      const initBody = JSON.parse(initRes.payload);
      const testState = initBody.state;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/google/callback?code=test_code&state=${testState}&redirectUrl=https://evil.org`,
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('ACC-03: OAuth callback chấp nhận khi state server-side hợp lệ và redirect trong allowlist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/google/callback?code=valid_code&state=${genuineState}&redirectUrl=http://localhost:3000/dashboard`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.targetUrl).toBe('http://localhost:3000/dashboard');
    });

    it('ACC-03: Single-Use State: OAuth callback từ chối khi dùng lại state lần 2 (Anti-Replay)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/google/callback?code=valid_code&state=${genuineState}`,
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('state');
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
      expect(revokeRes.statusCode).toBe(204);

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

  describe('I08 Staff Two-Factor Authentication (TOTP RFC 6238 & Single-Use Recovery Codes)', () => {
    const staffEmail = `staff_totp_${Date.now()}@test.local`;
    const staffPassword = 'StaffPassword123!';
    let staffId = '';
    let staffSessionToken = '';
    let staffSetupSecret = '';
    let recoveryCodes: string[] = [];

    beforeAll(async () => {
      const client = await getOrCreateDbClient();

      // Seed test staff account (publisher@jlpt.local) with known test credentials and TOTP for test suite
      const publisherId = '0192f000-0000-7000-8000-0000000000b1';
      const defaultPasswordHash = await hashPassword('Admin123456!');
      await client.db
        .insert(schema.users)
        .values({
          id: publisherId,
          name: 'Demo Content Publisher',
          email: 'publisher@jlpt.local',
          emailVerified: true,
          role: 'admin',
          locale: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
        })
        .onConflictDoNothing();

      await client.db
        .insert(schema.accounts)
        .values({
          id: generateUuidV7(),
          userId: publisherId,
          accountId: publisherId,
          providerId: 'credential',
          password: defaultPasswordHash,
        })
        .onConflictDoNothing();

      const encPublisherSecret = encryptTotpSecret('JBSWY3DPEHPK3PXP', publisherId);
      await client.db
        .insert(schema.userProfiles)
        .values({
          userId: publisherId,
          metadata: {
            twoFactor: {
              enabled: true,
              encryptedSecret: encPublisherSecret,
              hashedRecoveryCodes: ['RECV-0001', 'RECV-0002', 'RECV-0003', 'RECV-0004'].map(hashRecoveryCode),
              verifiedAt: new Date().toISOString(),
              failedAttempts: 0,
              lockedUntil: null,
            },
          },
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schema.userProfiles.userId],
          set: {
            metadata: {
              twoFactor: {
                enabled: true,
                encryptedSecret: encPublisherSecret,
                hashedRecoveryCodes: ['RECV-0001', 'RECV-0002', 'RECV-0003', 'RECV-0004'].map(hashRecoveryCode),
                verifiedAt: new Date().toISOString(),
                failedAttempts: 0,
                lockedUntil: null,
              },
            },
            updatedAt: new Date(),
          },
        });

      // Create staff account
      staffId = generateUuidV7();
      const accountId = generateUuidV7();
      const hashedPassword = await hashPassword(staffPassword);

      await client.db.insert(schema.users).values({
        id: staffId,
        email: staffEmail,
        name: 'Staff TOTP Tester',
        role: 'editor',
        emailVerified: true,
        locale: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
      });

      await client.db.insert(schema.accounts).values({
        id: accountId,
        userId: staffId,
        accountId: staffId,
        providerId: 'credential',
        password: hashedPassword,
      });

      // Sign in to obtain session
      const signInRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        payload: {
          email: staffEmail,
          password: staffPassword,
        },
      });

      expect(signInRes.statusCode).toBe(200);
      const body = JSON.parse(signInRes.payload);
      staffSessionToken = body.session.token;
      expect(body.user.twoFactorEnabled).toBe(false);
      expect(body.user.twoFactorStatus).toBe('setup_required');
    });

    it('Acceptance 1: Đăng ký TOTP sinh secret lưu mã hóa, trả otpauth URI, QR SVG, và 8 mã khôi phục', async () => {
      // 1. Unauthenticated request rejected
      const unauthRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/setup',
      });
      expect(unauthRes.statusCode).toBe(401);

      // 2. Authenticated request initiates setup
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/setup',
        headers: { authorization: `Bearer ${staffSessionToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.secret).toBeDefined();
      expect(data.secret.length).toBe(32);
      expect(data.formattedSecret.split(' ').length).toBe(8);
      expect(data.otpauthUri).toContain('otpauth://totp/');
      expect(data.otpauthUri).toContain(staffEmail);
      expect(data.recoveryCodes.length).toBe(8);
      expect(data.qrSvg).toContain('<svg');

      staffSetupSecret = data.secret;
      recoveryCodes = data.recoveryCodes;

      // Check DB: Secret is stored encrypted in pending setup, never in plain text
      const client = await getOrCreateDbClient();
      const verifs = await client.db
        .select()
        .from(schema.verifications)
        .where(eq(schema.verifications.identifier, `totp_setup_${staffId}`));

      expect(verifs.length).toBe(1);
      expect(verifs[0]!.value).not.toContain(staffSetupSecret);
      expect(verifs[0]!.value).toContain(':');
    });

    it('Acceptance 1 & 2: Xác nhận đăng ký bằng mã 6 số (kích hoạt 2FA, đánh dấu session twoFactorVerified)', async () => {
      // 1. Invalid code rejected
      const invalidRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/confirm',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { code: '000000' },
      });
      expect(invalidRes.statusCode).toBe(400);

      // 2. Malformed code rejected
      const malformedRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/confirm',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { code: 'abc' },
      });
      expect(malformedRes.statusCode).toBe(400);

      // 3. Valid RFC 6238 code confirms setup
      const validCode = generateTotp(staffSetupSecret);
      const confirmRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/confirm',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { code: validCode },
      });
      expect(confirmRes.statusCode).toBe(200);
      const body = JSON.parse(confirmRes.payload);
      expect(body.success).toBe(true);

      // 4. Verify user profile now has twoFactor enabled in DB
      const client = await getOrCreateDbClient();
      const profiles = await client.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, staffId));
      expect(profiles.length).toBe(1);
      const meta = profiles[0]!.metadata as { twoFactor: UserTotpMetadata };
      expect(meta.twoFactor.enabled).toBe(true);
      expect(meta.twoFactor.encryptedSecret).not.toBe(staffSetupSecret);
      expect(meta.twoFactor.hashedRecoveryCodes?.length).toBe(8);

      // 5. Verify audit log entry for enrollment
      const auditLogs = await client.db
        .select()
        .from(schema.operatorActions)
        .where(eq(schema.operatorActions.action, 'TOTP_ENROLLED'));
      expect(auditLogs.some((l: { operatorId: string | null }) => l.operatorId === staffId)).toBe(true);
    });

    it('Acceptance 2 & 3: Thử thách TOTP sau khi đăng nhập mật khẩu; session chỉ đánh dấu twoFactorVerified khi mã đúng', async () => {
      // 1. Password login creates unverified session
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        payload: {
          email: staffEmail,
          password: staffPassword,
        },
      });
      expect(loginRes.statusCode).toBe(200);
      const loginBody = JSON.parse(loginRes.payload);
      const newSessionToken = loginBody.session.token;
      expect(loginBody.user.twoFactorEnabled).toBe(true);
      expect(loginBody.user.twoFactorStatus).toBe('challenge_required');
      expect(loginBody.session.twoFactorVerified).toBe(false);

      // 2. Challenge with wrong code is rejected
      const wrongChallengeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/challenge',
        headers: { authorization: `Bearer ${newSessionToken}` },
        payload: { code: '999999' },
      });
      expect(wrongChallengeRes.statusCode).toBe(403);

      // 3. Challenge with valid code succeeds and marks session twoFactorVerified
      const validCode = generateTotp(staffSetupSecret);
      const challengeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/challenge',
        headers: { authorization: `Bearer ${newSessionToken}` },
        payload: { code: validCode },
      });
      expect(challengeRes.statusCode).toBe(200);
      const challengeBody = JSON.parse(challengeRes.payload);
      expect(challengeBody.verified).toBe(true);
      expect(challengeBody.session.twoFactorVerified).toBe(true);
    });

    it('Acceptance 1: Mã cũ (Anti-Replay) bị từ chối khi gọi lại trong cùng bước thời gian', async () => {
      // Immediate second call with identical code ("mã cũ") is rejected
      const replayCode = generateTotp(staffSetupSecret);
      const secondRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/challenge',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { code: replayCode },
      });
      expect(secondRes.statusCode).toBe(403);
      const errBody = JSON.parse(secondRes.payload);
      expect(errBody.error?.message).toContain('mã cũ');
    });

    it('Acceptance 3: Khóa tài khoản sau 5 lần nhập sai liên tiếp (Brute-Force Protection)', async () => {
      // 5 failed challenge attempts
      for (let i = 0; i < 5; i++) {
        const failRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/totp/challenge',
          headers: { authorization: `Bearer ${staffSessionToken}` },
          payload: { code: '000000' },
        });
        expect(failRes.statusCode).toBe(403);
      }

      // 6th attempt (even with valid code) is locked out
      const validCode = generateTotp(staffSetupSecret);
      const lockedRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/challenge',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { code: validCode },
      });
      expect(lockedRes.statusCode).toBe(403);
      const err = JSON.parse(lockedRes.payload);
      expect(err.error?.code).toBe('ACCOUNT_LOCKED');

      // Reset lockout for subsequent test steps
      const client = await getOrCreateDbClient();
      const [profile] = await client.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, staffId));
      const meta = profile!.metadata as { twoFactor: UserTotpMetadata };
      meta.twoFactor.failedAttempts = 0;
      meta.twoFactor.lockedUntil = null;
      await client.db
        .update(schema.userProfiles)
        .set({ metadata: meta })
        .where(eq(schema.userProfiles.userId, staffId));
    });

    it('Acceptance 1 & 3: Mã khôi phục dùng một lần lưu dạng hash (tiêu thụ thành công, từ chối khi dùng lại hoặc sai)', async () => {
      const targetCode = recoveryCodes[0]!;

      // 1. First use of recovery code succeeds
      const recoveryRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/recovery',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { code: targetCode },
      });
      expect(recoveryRes.statusCode).toBe(200);
      const recoveryBody = JSON.parse(recoveryRes.payload);
      expect(recoveryBody.verified).toBe(true);
      expect(recoveryBody.remainingCodesCount).toBe(7);

      // Verify audit log for recovery code usage
      const client = await getOrCreateDbClient();
      const auditLogs = await client.db
        .select()
        .from(schema.operatorActions)
        .where(eq(schema.operatorActions.action, 'TOTP_RECOVERY_CODE_USED'));
      expect(auditLogs.some((l: { operatorId: string | null }) => l.operatorId === staffId)).toBe(true);

      // 2. Re-using the same recovery code is rejected (Single-Use Token)
      const reuseRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/recovery',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { code: targetCode },
      });
      expect(reuseRes.statusCode).toBe(403);

      // 3. Non-existent / invalid recovery code rejected
      const invalidCodeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/recovery',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { code: 'INVALID-RECOVERY-CODE' },
      });
      expect(invalidCodeRes.statusCode).toBe(403);
    });

    it('Acceptance 1: Tắt/đặt lại 2FA có ghi nhận nhật ký kiểm toán (Audit Log)', async () => {
      // 1. Negative: Tự tắt không kèm code hoặc password bị từ chối 400 CONFIRMATION_REQUIRED
      const noConfirmRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/disable',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: {},
      });
      expect(noConfirmRes.statusCode).toBe(400);
      const noConfirmBody = JSON.parse(noConfirmRes.payload);
      expect(noConfirmBody.error?.code).toBe('CONFIRMATION_REQUIRED');

      // 2. Negative: Tự tắt với mã TOTP sai bị từ chối 403 TWO_FACTOR_REQUIRED
      const wrongCodeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/disable',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { code: '000000' },
      });
      expect(wrongCodeRes.statusCode).toBe(403);
      const wrongCodeBody = JSON.parse(wrongCodeRes.payload);
      expect(wrongCodeBody.error?.code).toBe('TWO_FACTOR_REQUIRED');

      // 3. Negative: Tự tắt với mật khẩu sai bị từ chối 401 UNAUTHENTICATED
      const wrongPwdRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/disable',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { password: 'WrongPassword123!' },
      });
      expect(wrongPwdRes.statusCode).toBe(401);

      // 4. Positive: Staff disables their own 2FA with valid TOTP code
      const validCode = generateTotp(staffSetupSecret);
      const disableRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/disable',
        headers: { authorization: `Bearer ${staffSessionToken}` },
        payload: { code: validCode },
      });
      expect(disableRes.statusCode).toBe(200);

      // 5. Verify 2FA is marked disabled in DB
      const client = await getOrCreateDbClient();
      const [profile] = await client.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, staffId));
      const meta = profile!.metadata as { twoFactor: UserTotpMetadata };
      expect(meta.twoFactor.enabled).toBe(false);

      // 6. Verify audit log entry
      const auditLogs = await client.db
        .select()
        .from(schema.operatorActions)
        .where(eq(schema.operatorActions.action, 'TOTP_DISABLED'));
      expect(auditLogs.some((l: { operatorId: string | null }) => l.operatorId === staffId)).toBe(true);
    });

    it('Acceptance 2: Không còn secret TOTP mặc định trong code chạy thật; từ chối khi tài khoản chưa có secret', async () => {
      // Create user without 2FA secret
      const noTotpId = generateUuidV7();
      const noTotpToken = 'no_totp_token_' + Date.now();
      const client = await getOrCreateDbClient();

      await client.db.insert(schema.users).values({
        id: noTotpId,
        email: `nototp_${Date.now()}@test.local`,
        role: 'admin',
        emailVerified: true,
      });

      await client.db.insert(schema.sessions).values({
        id: generateUuidV7(),
        userId: noTotpId,
        token: noTotpToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Calling admin route with x-totp-code does NOT fall back to JBSWY3DPEHPK3PXP
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit-logs',
        headers: {
          authorization: `Bearer ${noTotpToken}`,
          host: 'admin.jlpt.local',
          'x-totp-code': generateTotp('JBSWY3DPEHPK3PXP'),
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error?.code).toBe('TWO_FACTOR_REQUIRED');
      expect(body.error?.message).toContain('chưa thiết lập');
    });

    it('Acceptance 3: Tài khoản nhân sự seed staging (publisher@jlpt.local) có secret biết trước JBSWY3DPEHPK3PXP cho E2E', async () => {
      // Login as publisher
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        payload: {
          email: 'publisher@jlpt.local',
          password: 'Admin123456!',
        },
      });
      expect(loginRes.statusCode).toBe(200);
      const loginBody = JSON.parse(loginRes.payload);
      expect(loginBody.user.role).toBe('admin');
      expect(loginBody.user.twoFactorEnabled).toBe(true);

      const token = loginBody.session.token;
      const validCode = generateTotp('JBSWY3DPEHPK3PXP');

      // Validates TOTP code against seeded secret JBSWY3DPEHPK3PXP
      const challengeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/totp/challenge',
        headers: { authorization: `Bearer ${token}` },
        payload: { code: validCode },
      });
      expect(challengeRes.statusCode).toBe(200);
      const challengeBody = JSON.parse(challengeRes.payload);
      expect(challengeBody.verified).toBe(true);
    });

    it('Review Hardening: Production guards ngăn chặn seed tài khoản và bypass session token trong production', async () => {
      const authService = app.get(AuthService);
      const originalNodeEnv = process.env.NODE_ENV;
      const originalAppEnv = process.env.APP_ENV;
      try {
        process.env.NODE_ENV = 'production';
        process.env.APP_ENV = 'production';

        // 1. AuthService không còn hàm tự động seed tài khoản
        expect(Reflect.get(authService, 'ensureStaffAccountsSeeded')).toBeUndefined();
        expect(Reflect.get(authService, 'onModuleInit')).toBeUndefined();

        // 2. demo-seed từ chối chạy trong production
        await expect(runDemoSeed()).rejects.toThrow(/từ chối chạy.*production/i);

        // 3. getSession does not bypass twoFactorVerified for demo tokens in production
        const client = await getOrCreateDbClient();
        const prodTestUserId = generateUuidV7();
        const prodTestSessionId = generateUuidV7();
        const prodDemoToken = 'tok_editor_demo';

        // Clear any existing verification row for this session ID
        await client.db
          .delete(schema.verifications)
          .where(eq(schema.verifications.identifier, `session_2fa_${prodTestSessionId}`));

        // Insert session with demo token
        await client.db
          .insert(schema.users)
          .values({
            id: prodTestUserId,
            email: `prod_demo_${Date.now()}@test.local`,
            name: 'Prod Demo User',
            role: 'editor',
            emailVerified: true,
          })
          .onConflictDoNothing();

        await client.db
          .insert(schema.sessions)
          .values({
            id: prodTestSessionId,
            userId: prodTestUserId,
            token: prodDemoToken,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })
          .onConflictDoNothing();

        const session = await authService.getSession(prodDemoToken);
        if (session) {
          expect(session.twoFactorVerified).toBe(false);
        }
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalAppEnv !== undefined) {
          process.env.APP_ENV = originalAppEnv;
        } else {
          delete process.env.APP_ENV;
        }
      }
    });

    it('Review Hardening: TotpGuard từ chối nhân sự đã bật 2FA khi truy cập route admin dù ENFORCE_STAFF_2FA không bật', async () => {
      const originalEnforce = process.env.ENFORCE_STAFF_2FA;
      const originalNodeEnv = process.env.NODE_ENV;
      try {
        process.env.ENFORCE_STAFF_2FA = 'false';
        process.env.NODE_ENV = 'development';

        const client = await getOrCreateDbClient();
        const testStaffId = generateUuidV7();
        const testSessionId = generateUuidV7();
        const testToken = 'staff_2fa_guard_test_' + Date.now();

        await client.db.insert(schema.users).values({
          id: testStaffId,
          email: `staff_guard_${Date.now()}@test.local`,
          name: 'Guard Tester',
          role: 'admin',
          emailVerified: true,
        });

        await client.db.insert(schema.sessions).values({
          id: testSessionId,
          userId: testStaffId,
          token: testToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const secret = 'JBSWY3DPEHPK3PXP';
        await client.db.insert(schema.userProfiles).values({
          id: generateUuidV7(),
          userId: testStaffId,
          metadata: {
            twoFactor: {
              enabled: true,
              encryptedSecret: encryptTotpSecret(secret, testStaffId),
              hashedRecoveryCodes: [],
              failedAttempts: 0,
              lockedUntil: null,
            },
          },
        });

        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/audit-logs',
          headers: {
            authorization: `Bearer ${testToken}`,
            host: 'admin.jlpt.local',
          },
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.payload);
        expect(body.error?.code).toBe('TWO_FACTOR_REQUIRED');
        expect(body.error?.message).toContain('Yêu cầu xác thực hai bước');
      } finally {
        process.env.ENFORCE_STAFF_2FA = originalEnforce;
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('Review Hardening: Tự tắt 2FA giải mã secret từ DB khi caller.totpSecret không có sẵn trong context', async () => {
      const client = await getOrCreateDbClient();
      const authService = app.get(AuthService);
      const testUserId = generateUuidV7();
      const testSecret = 'JBSWY3DPEHPK3PXP';

      await client.db.insert(schema.users).values({
        id: testUserId,
        email: `self_disable_${Date.now()}@test.local`,
        name: 'Self Disable Tester',
        role: 'editor',
        emailVerified: true,
      });

      await client.db.insert(schema.userProfiles).values({
        id: generateUuidV7(),
        userId: testUserId,
        metadata: {
          twoFactor: {
            enabled: true,
            encryptedSecret: encryptTotpSecret(testSecret, testUserId),
            hashedRecoveryCodes: [],
            failedAttempts: 0,
            lockedUntil: null,
          },
        },
      });

      const callerContext: AuthUserContext = {
        userId: testUserId,
        email: `self_disable_${Date.now()}@test.local`,
        name: 'Self Disable Tester',
        role: 'editor',
        sessionId: generateUuidV7(),
        sessionToken: 'test_token',
        emailVerified: true,
        twoFactorEnabled: true,
        twoFactorVerified: true,
        totpSecret: undefined, // Simulating missing secret in caller context
      };

      // 1. Wrong code rejected even if secret resolved from DB
      await expect(
        authService.disableTotp(callerContext, testUserId, { code: '000000' }),
      ).rejects.toThrow('Mã xác thực TOTP không chính xác');

      // 2. Correct code accepted after resolving secret from DB
      const validCode = generateTotp(testSecret);
      const result = await authService.disableTotp(callerContext, testUserId, { code: validCode });
      expect(result.success).toBe(true);

      // Verify disabled in DB
      const [profile] = await client.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, testUserId));
      const meta = profile!.metadata as { twoFactor: UserTotpMetadata };
      expect(meta.twoFactor.enabled).toBe(false);
    });
  });

  describe('I10 Hardening: Bỏ tự tạo tài khoản nhân sự khi API khởi động', () => {
    it('Acceptance 1: API khởi động với mọi NODE_ENV không tạo hay sửa tài khoản nào; có test kiểm tra', async () => {
      const client = await getOrCreateDbClient();
      const envValues: (string | undefined)[] = [undefined, 'development', 'staging', 'production', 'test'];

      for (const envVal of envValues) {
        const origNodeEnv = process.env.NODE_ENV;
        const origAppEnv = process.env.APP_ENV;
        try {
          if (envVal === undefined) {
            delete process.env.NODE_ENV;
          } else {
            process.env.NODE_ENV = envVal;
          }
          delete process.env.APP_ENV;

          // Snapshot database user, account, and profile counts prior to bootstrap
          const usersBefore = (await client.db.select().from(schema.users)).length;
          const accountsBefore = (await client.db.select().from(schema.accounts)).length;
          const profilesBefore = (await client.db.select().from(schema.userProfiles)).length;

          // Start fresh API instance and trigger full bootstrap
          const testApp = await createApp();
          await testApp.init();

          // Snapshot database user, account, and profile counts after bootstrap
          const usersAfter = (await client.db.select().from(schema.users)).length;
          const accountsAfter = (await client.db.select().from(schema.accounts)).length;
          const profilesAfter = (await client.db.select().from(schema.userProfiles)).length;

          expect(usersAfter).toBe(usersBefore);
          expect(accountsAfter).toBe(accountsBefore);
          expect(profilesAfter).toBe(profilesBefore);
        } finally {
          process.env.NODE_ENV = origNodeEnv;
          if (origAppEnv !== undefined) {
            process.env.APP_ENV = origAppEnv;
          } else {
            delete process.env.APP_ENV;
          }
        }
      }
    });

    it('Acceptance 1: AuthService không có hook onModuleInit hay method tạo tài khoản nhân sự', () => {
      const authService = app.get(AuthService);
      expect(Reflect.get(authService, 'onModuleInit')).toBeUndefined();
      expect(Reflect.get(authService, 'ensureStaffAccountsSeeded')).toBeUndefined();
      expect(Reflect.get(authService, 'seedStaffTotp')).toBeUndefined();
    });

    it('Acceptance 2: Script seed staging từ chối chạy khi APP_ENV=production', async () => {
      const origAppEnv = process.env.APP_ENV;
      const origNodeEnv = process.env.NODE_ENV;
      try {
        // 1. Rejects when APP_ENV=production
        process.env.APP_ENV = 'production';
        process.env.NODE_ENV = 'development';
        await expect(runDemoSeed()).rejects.toThrow(/từ chối chạy.*production/i);

        // 2. Case-insensitive check (e.g. PRODUCTION)
        process.env.APP_ENV = 'PRODUCTION';
        await expect(runDemoSeed()).rejects.toThrow(/từ chối chạy.*production/i);

        // 3. Rejects when NODE_ENV=production
        delete process.env.APP_ENV;
        process.env.NODE_ENV = 'production';
        await expect(runDemoSeed()).rejects.toThrow(/từ chối chạy.*production/i);
      } finally {
        if (origAppEnv !== undefined) {
          process.env.APP_ENV = origAppEnv;
        } else {
          delete process.env.APP_ENV;
        }
        process.env.NODE_ENV = origNodeEnv;
      }
    });

    it('Acceptance 3: grep mật khẩu/secret mặc định trong apps/api/src (trừ test và seed) không còn kết quả', () => {
      const srcDir = path.resolve(fileURLToPath(import.meta.url), '../../');
      const files: string[] = [];

      function walk(dir: string) {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) {
            if (item.name !== 'node_modules' && item.name !== 'dist') {
              walk(full);
            }
          } else if (item.isFile()) {
            const isCodeFile = item.name.endsWith('.ts') || item.name.endsWith('.js');
            const isTest = item.name.includes('.test.') || item.name.includes('.spec.');
            const isSeed = item.name.includes('seed');
            if (isCodeFile && !isTest && !isSeed) {
              files.push(full);
            }
          }
        }
      }

      walk(srcDir);
      expect(files.length).toBeGreaterThan(0);

      const forbiddenSecrets = ['Admin123456!', 'JBSWY3DPEHPK3PXP'];
      const violations: { file: string; secret: string }[] = [];

      for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        for (const s of forbiddenSecrets) {
          if (text.includes(s)) {
            violations.push({ file, secret: s });
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });
});

