import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../main.js';
import { getOrCreateDbClient } from '../../common/database/database.module.js';
import { seedDatabase } from '../../db/seed.js';
import * as schema from '../../db/schema.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { AuthService } from '../auth/auth.service.js';
import { StorageService } from '../storage/storage.service.js';
import { signMediaToken } from '@jlpt/media-token';
import { generateUuidV7 } from '../../common/utils/uuid.js';

describe('I01 Full Integration & Hardening Verification', () => {
  let app: NestFastifyApplication;
  let outboxService: OutboxService;
  let authService: AuthService;
  let storageService: StorageService;
  let dbClient: Awaited<ReturnType<typeof getOrCreateDbClient>>;

  let adminHeaders: Record<string, string>;
  let editorHeaders: Record<string, string>;
  let reviewerHeaders: Record<string, string>;
  let studentHeaders: Record<string, string>;
  let editorId: string;

  beforeAll(async () => {
    process.env.ADMIN_HOST = 'admin.jlpt.local';
    process.env.MEDIA_TOKEN_SECRET = 'staging_media_token_secret_for_reproducible_smoke_tests';

    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    dbClient = await getOrCreateDbClient();
    await seedDatabase(dbClient);

    outboxService = app.get(OutboxService);
    authService = app.get(AuthService);
    storageService = app.get(StorageService);

    // 1. Create Student User & Session
    const studentId = '0192f000-0000-7000-8000-0000000000c1';
    const studentToken = 'tok_student_verified_' + Date.now();
    await dbClient.db.insert(schema.users).values({
      id: studentId,
      email: `student_${Date.now()}@test.local`,
      role: 'student',
      emailVerified: true,
    }).onConflictDoNothing();
    await dbClient.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: studentId,
      token: studentToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // 2. Create Editor User & Session
    editorId = '0192f000-0000-7000-8000-0000000000e1';
    const editorToken = 'tok_editor_demo_' + Date.now();
    await dbClient.db.insert(schema.users).values({
      id: editorId,
      email: `editor_${Date.now()}@test.local`,
      role: 'editor',
      emailVerified: true,
    }).onConflictDoNothing();
    await dbClient.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: editorId,
      token: editorToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // 3. Create Reviewer User & Session
    const reviewerId = '0192f000-0000-7000-8000-0000000000d1';
    const reviewerToken = 'tok_reviewer_demo_' + Date.now();
    await dbClient.db.insert(schema.users).values({
      id: reviewerId,
      email: `reviewer_${Date.now()}@test.local`,
      role: 'reviewer',
      emailVerified: true,
    }).onConflictDoNothing();
    await dbClient.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: reviewerId,
      token: reviewerToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // 4. Create Admin User & Session
    const adminId = '0192f000-0000-7000-8000-0000000000b1';
    const adminToken = 'tok_admin_demo_' + Date.now();
    await dbClient.db.insert(schema.users).values({
      id: adminId,
      email: `admin_${Date.now()}@test.local`,
      role: 'admin',
      emailVerified: true,
    }).onConflictDoNothing();
    await dbClient.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: adminId,
      token: adminToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      Host: 'admin.jlpt.local',
    };

    editorHeaders = {
      Authorization: `Bearer ${editorToken}`,
      Host: 'admin.jlpt.local',
    };

    reviewerHeaders = {
      Authorization: `Bearer ${reviewerToken}`,
      Host: 'admin.jlpt.local',
    };

    studentHeaders = {
      Authorization: `Bearer ${studentToken}`,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  // ===========================================================================
  // Acceptance 1: Registration returns 201 on SMTP failure + queued in outbox
  // ===========================================================================
  describe('Acceptance 1: Đăng ký vẫn trả 201 khi SMTP không kết nối được; email gửi lại qua outbox', () => {
    it('returns 201 on sign-up even when SMTP throws, queues email in outbox, and outbox relay retries', async () => {
      const email = `smtp_fail_${Date.now()}@test.local`;
      const password = 'StrongPassword123!';

      // Mock emailService to simulate SMTP failure on sign up
      const emailService = (authService as unknown as { emailService: { sendVerificationEmail: (_to: string, url: string, name?: string) => Promise<void> } }).emailService;
      const originalSend = emailService.sendVerificationEmail;
      emailService.sendVerificationEmail = async () => {
        throw new Error('ECONNREFUSED: SMTP server down');
      };

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/sign-up/email',
          payload: {
            email,
            password,
            name: 'Candidate SMTP Fail',
          },
        });

        // Registration MUST succeed with 201
        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.payload);
        expect(body.user.email).toBe(email);

        // Verify outbox record was inserted with topic 'notification.email' and publishedAt null
        const outboxRows = await dbClient.db
          .select()
          .from(schema.outbox)
          .where(eq(schema.outbox.topic, 'notification.email'));

        const queued = outboxRows.find((r: typeof schema.outbox.$inferSelect) => {
          const payload = r.payload as { to?: string };
          return payload?.to === email;
        });

        expect(queued).toBeDefined();
        expect(queued.publishedAt).toBeNull();
        const payload = queued.payload as { type: string; verificationUrl: string };
        expect(payload.type).toBe('verification');
        expect(payload.verificationUrl).toContain('/xac-minh-email?token=');

        // Restore send method and verify outbox relay successfully processes it
        let sentUrl = '';
        emailService.sendVerificationEmail = async (_to: string, url: string) => {
          sentUrl = url;
        };

        const relayedCount = await outboxService.relayOutbox();
        expect(relayedCount).toBeGreaterThanOrEqual(1);
        expect(sentUrl).toContain('/xac-minh-email?token=');

        // Verify row is now marked published
        const [updatedOutbox] = await dbClient.db
          .select()
          .from(schema.outbox)
          .where(eq(schema.outbox.id, queued.id));

        expect(updatedOutbox?.publishedAt).not.toBeNull();
      } finally {
        emailService.sendVerificationEmail = originalSend;
      }
    });
  });

  // ===========================================================================
  // Acceptance 2: Verification and reset password links open real pages & complete
  // ===========================================================================
  describe('Acceptance 2: Link xác minh và đặt lại mật khẩu mở đúng trang web và hoàn tất được', () => {
    it('verifies email with token extracted from /xac-minh-email link', async () => {
      const email = `verify_flow_${Date.now()}@test.local`;
      const password = 'InitialPassword123!';

      let capturedUrl = '';
      const emailService = (authService as unknown as { emailService: { sendVerificationEmail: (_to: string, url: string) => Promise<void> } }).emailService;
      const originalSend = emailService.sendVerificationEmail;
      emailService.sendVerificationEmail = async (_to: string, url: string) => {
        capturedUrl = url;
      };

      try {
        const signupRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/sign-up/email',
          payload: { email, password, name: 'Verify Flow User' },
        });
        expect(signupRes.statusCode).toBe(201);

        // Verify link points to actual Next.js route /xac-minh-email
        expect(capturedUrl).toContain('/xac-minh-email?token=');
        const token = new URL(capturedUrl).searchParams.get('token');
        expect(token).toBeTruthy();

        // Perform email verification via API
        const verifyRes = await app.inject({
          method: 'GET',
          url: `/api/v1/auth/verify-email?token=${token}`,
        });
        expect(verifyRes.statusCode).toBe(200);
        const verifyBody = JSON.parse(verifyRes.payload);
        expect(verifyBody.verified).toBe(true);

        // Verify user in DB has emailVerified = true
        const [userRow] = await dbClient.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email));
        expect(userRow?.emailVerified).toBe(true);
      } finally {
        emailService.sendVerificationEmail = originalSend;
      }
    });

    it('resets password with token extracted from /dat-lai-mat-khau link', async () => {
      const email = `reset_flow_${Date.now()}@test.local`;
      const originalPassword = 'InitialPassword123!';
      const newPassword = 'NewSecretPassword456!';

      // Create user first and verify email
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-up/email',
        payload: { email, password: originalPassword, name: 'Reset User' },
      });
      await dbClient.db
        .update(schema.users)
        .set({ emailVerified: true })
        .where(eq(schema.users.email, email));

      let capturedResetUrl = '';
      const emailService = (authService as unknown as { emailService: { sendPasswordResetEmail: (_to: string, url: string) => Promise<void> } }).emailService;
      const originalResetSend = emailService.sendPasswordResetEmail;
      emailService.sendPasswordResetEmail = async (_to: string, url: string) => {
        capturedResetUrl = url;
      };

      try {
        // Request password reset
        const forgetRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/forgot-password',
          payload: { email },
        });
        expect(forgetRes.statusCode).toBe(200);

        // Verify URL points to actual frontend path /dat-lai-mat-khau
        expect(capturedResetUrl).toContain('/dat-lai-mat-khau?token=');
        const token = new URL(capturedResetUrl).searchParams.get('token');
        expect(token).toBeTruthy();

        // Complete password reset
        const resetRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/reset-password',
          payload: {
            token,
            newPassword,
          },
        });
        expect(resetRes.statusCode).toBe(200);
        const resetBody = JSON.parse(resetRes.payload);
        expect(resetBody.success).toBe(true);

        // Login with new password succeeds
        const loginRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/sign-in/email',
          payload: { email, password: newPassword },
        });
        expect(loginRes.statusCode).toBe(200);
      } finally {
        emailService.sendPasswordResetEmail = originalResetSend;
      }
    });
  });

  // ===========================================================================
  // Acceptance 3: Exam snapshot, audio Range 206, and submission without media.jlpt.local
  // ===========================================================================
  describe('Acceptance 3: Lượt thi trên staging tải được snapshot, audio Range 206 và nộp bài', () => {
    it('creates attempt without media.jlpt.local, loads snapshot, streams audio with 206, and submits', async () => {
      // Find a published exam
      const examsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/exams',
      });
      expect(examsRes.statusCode).toBe(200);
      const examsList = JSON.parse(examsRes.payload);
      const demoExam = examsList.items[0];
      expect(demoExam).toBeDefined();

      // Start attempt
      const attemptRes = await app.inject({
        method: 'POST',
        url: '/api/v1/attempts',
        headers: studentHeaders,
        payload: {
          examId: demoExam.id,
          mode: 'real',
        },
      });

      expect([201, 409]).toContain(attemptRes.statusCode);
      let attemptId = '';
      let lease = '';
      let snapshotUrl = '';
      let _mediaToken = '';

      if (attemptRes.statusCode === 201) {
        const attemptBody = JSON.parse(attemptRes.payload);
        attemptId = attemptBody.attemptId;
        lease = attemptBody.lease;
        snapshotUrl = attemptBody.snapshotUrl;
        _mediaToken = attemptBody.mediaToken;
      } else {
        // Resume existing open attempt
        const conflictBody = JSON.parse(attemptRes.payload);
        attemptId = conflictBody.details.attemptId;
        const resumeRes = await app.inject({
          method: 'POST',
          url: `/api/v1/attempts/${attemptId}/resume`,
          headers: studentHeaders,
        });
        expect(resumeRes.statusCode).toBe(200);
        const resumeBody = JSON.parse(resumeRes.payload);
        lease = resumeBody.lease;
        snapshotUrl = resumeBody.snapshotUrl;
        _mediaToken = resumeBody.mediaToken;
      }

      // Verify snapshotUrl does NOT depend on media.jlpt.local
      expect(snapshotUrl).not.toContain('media.jlpt.local');
      expect(snapshotUrl).toContain(`/exams/${demoExam.id}/v${demoExam.publishedVersion || 1}/snapshot.json?t=`);

      // Extract path for injection
      const urlObj = new URL(snapshotUrl, 'http://localhost');
      const fetchPath = `${urlObj.pathname}${urlObj.search}`;

      // 1. Load snapshot JSON via API
      const snapRes = await app.inject({
        method: 'GET',
        url: fetchPath,
      });
      expect(snapRes.statusCode).toBe(200);
      const snapshotData = JSON.parse(snapRes.payload);
      expect(snapshotData.examId).toBe(demoExam.id);
      expect(snapshotData.sections).toBeInstanceOf(Array);

      // Verify Zero Answer Leak: snapshot has NO answer keys
      expect(JSON.stringify(snapshotData)).not.toContain('correctOption');
      expect(JSON.stringify(snapshotData)).not.toContain('answerKey');

      // 2. Test audio Range 206 streaming
      // Seed a test audio in storage
      const audioKey = 'media/test-listening-sample.mp3';
      const audioContent = Buffer.alloc(1024, 0x5a); // 1KB sample
      await storageService.put(audioKey, audioContent, { mimeType: 'audio/mpeg' });

      // Build media token for this audio
      const secret = process.env.MEDIA_TOKEN_SECRET || 'staging_media_token_secret_for_reproducible_smoke_tests';
      const audioToken = await signMediaToken(
        { a: attemptId, e: demoExam.id, exp: Math.floor(Date.now() / 1000) + 3600 },
        secret,
      );

      // Test Range request on /api/v1/media/test-listening-sample.mp3
      const mediaRes = await app.inject({
        method: 'GET',
        url: `/api/v1/media/test-listening-sample.mp3?t=${audioToken}`,
        headers: {
          Range: 'bytes=0-499',
        },
      });

      expect(mediaRes.statusCode).toBe(206);
      expect(mediaRes.headers['content-range']).toBe('bytes 0-499/1024');
      expect(mediaRes.headers['content-length']).toBe('500');
      expect(mediaRes.headers['accept-ranges']).toBe('bytes');
      expect(mediaRes.headers['content-type']).toBe('audio/mpeg');

      // Also test alias route /api/v1/m/:id
      const mAliasRes = await app.inject({
        method: 'GET',
        url: `/api/v1/m/test-listening-sample.mp3?t=${audioToken}`,
        headers: {
          Range: 'bytes=500-1023',
        },
      });
      expect(mAliasRes.statusCode).toBe(206);
      expect(mAliasRes.headers['content-range']).toBe('bytes 500-1023/1024');

      // 3. Submit attempt
      const submitRes = await app.inject({
        method: 'POST',
        url: `/api/v1/attempts/${attemptId}/submit`,
        headers: studentHeaders,
        payload: {
          lease,
          seq: 1,
          answers: [1, 2, 3],
          flags: [0, 0, 0],
        },
      });

      expect(submitRes.statusCode).toBe(200);
      const submitBody = JSON.parse(submitRes.payload);
      expect(submitBody.result).toBeDefined();
      expect(submitBody.result.scoring).toBeDefined();
    });

    it('rejects snapshot request when media token is invalid or forged', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/sample-exam-id/v1/snapshot.json?t=bad_tampered_token',
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects snapshot request when unauthenticated user provides no token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/sample-exam-id/v1/snapshot.json',
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects snapshot request when client provides invalid or forged Authorization header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/sample-exam-id/v1/snapshot.json',
        headers: {
          Authorization: 'Bearer forged_or_fake_token',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects snapshot request when authenticated student provides Authorization header without mediaToken', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/sample-exam-id/v1/snapshot.json',
        headers: studentHeaders,
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows snapshot request when authenticated admin or editor provides Authorization header', async () => {
      const examsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/exams',
      });
      const examsList = JSON.parse(examsRes.payload);
      const exam = examsList.items[0];

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/exams/${exam.id}/v${exam.publishedVersion || 1}/snapshot.json`,
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const snapshot = JSON.parse(res.payload);
      expect(snapshot.examId).toBe(exam.id);
    });
  });

  // ===========================================================================
  // Acceptance 4: Admin endpoints for all 12 areas exist with RBAC
  // ===========================================================================
  describe('Acceptance 4: Danh sách endpoint admin cho 12 module (users, audit, exams, questions, imports, reviews, blueprints, media, vocab, moderation, notifications, org)', () => {
    // 1. Users
    it('ADM-01: Admin can list and update users, editor cannot self-elevate', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: adminHeaders,
      });
      expect(listRes.statusCode).toBe(200);
      const usersData = JSON.parse(listRes.payload);
      expect(usersData.items).toBeInstanceOf(Array);

      // Student is blocked from listing users
      const studentRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: studentHeaders,
      });
      expect(studentRes.statusCode).toBe(403);

      // Editor cannot self-elevate to admin
      const elevateRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/users/0192f000-0000-7000-8000-0000000000e1',
        headers: editorHeaders,
        payload: { role: 'admin' },
      });
      expect(elevateRes.statusCode).toBe(403);
    });

    // 2. Audit
    it('ADM-05: Only admin can access audit logs', async () => {
      const adminAudit = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit-logs',
        headers: adminHeaders,
      });
      expect(adminAudit.statusCode).toBe(200);

      // Editor is forbidden
      const editorAudit = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit-logs',
        headers: editorHeaders,
      });
      expect(editorAudit.statusCode).toBe(403);
    });

    // 3. Exams
    it('ADM-03: Admin and Editor can manage and validate exams', async () => {
      const listExams = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/exams',
        headers: editorHeaders,
      });
      expect(listExams.statusCode).toBe(200);

      // Create draft exam
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/exams',
        headers: editorHeaders,
        payload: {
          title: 'Admin Draft Exam N3',
          level: 'N3',
          kind: 'practice',
        },
      });
      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.payload);
      expect(created.id).toBeDefined();

      // Validate exam
      const valRes = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/exams/${created.id}/validate`,
        headers: editorHeaders,
      });
      expect(valRes.statusCode).toBe(201);
      const valData = JSON.parse(valRes.payload);
      expect(valData.valid).toBe(false); // New empty exam has violations
      expect(valData.violations.length).toBeGreaterThan(0);
    });

    // 4. Questions
    it('ADM-07: Editor and Admin can search question groups', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/groups',
        headers: editorHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.items).toBeInstanceOf(Array);
    });

    // 5. Imports
    it('ADM-08: Admin and Editor can list import jobs', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/imports',
        headers: editorHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.items).toBeInstanceOf(Array);
    });

    // 6. Reviews
    it('ADM-06: Reviewer and Admin can access pending reviews', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/reviews',
        headers: reviewerHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.items).toBeInstanceOf(Array);

      // Editor cannot list reviews (strictly reviewer/admin only)
      const editorRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/reviews',
        headers: editorHeaders,
      });
      expect(editorRes.statusCode).toBe(403);
    });

    // 7. Blueprints
    it('ADM-04: Editor can view and admin can activate blueprints', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/blueprints',
        headers: editorHeaders,
      });
      expect(listRes.statusCode).toBe(200);
      const bpList = JSON.parse(listRes.payload);
      expect(bpList.items).toBeInstanceOf(Array);

      // Student is blocked
      const studentRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/blueprints',
        headers: studentHeaders,
      });
      expect(studentRes.statusCode).toBe(403);
    });

    // 8. Media
    it('ADM-10: Staff can list media assets in admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media',
        headers: editorHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.items).toBeInstanceOf(Array);
    });

    // 9. Vocab
    it('ADM-12: Editor can CRUD vocab entries', async () => {
      // List
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/vocab',
        headers: editorHeaders,
      });
      expect(listRes.statusCode).toBe(200);
      const listData = JSON.parse(listRes.payload);
      expect(listData.items.length).toBeGreaterThan(0);

      // Create
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/vocab',
        headers: editorHeaders,
        payload: {
          word: '怠慢',
          reading: 'たいまん',
          meaningVi: 'Cẩu thả, thiếu trách nhiệm',
          level: 'N1',
        },
      });
      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.payload);
      expect(created.item.word).toBe('怠慢');

      // Delete
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/vocab/${created.item.id}`,
        headers: editorHeaders,
      });
      expect(delRes.statusCode).toBe(200);
    });

    // 10. Moderation
    it('ADM-13: Staff can view AI logs and approve flagged items', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/moderation/ai',
        headers: reviewerHeaders,
      });
      expect(listRes.statusCode).toBe(200);
      const listData = JSON.parse(listRes.payload);
      expect(listData.items).toBeInstanceOf(Array);

      // Approve flagged item
      const approveRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/moderation/ai/ai-req-102/approve',
        headers: reviewerHeaders,
      });
      expect(approveRes.statusCode).toBe(201);
      const appBody = JSON.parse(approveRes.payload);
      expect(appBody.success).toBe(true);
      expect(appBody.item.reviewStatus).toBe('reviewed');
    });

    // 11. Notifications
    it('ADM-18: Admin can manage notification templates and send test', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/notifications/templates',
        headers: adminHeaders,
      });
      expect(listRes.statusCode).toBe(200);
      const listData = JSON.parse(listRes.payload);
      expect(listData.items.length).toBeGreaterThan(0);

      // Update template
      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/notifications/templates/tpl-1',
        headers: adminHeaders,
        payload: {
          subject: 'Chào mừng bạn đến với JLPT Online Pro!',
        },
      });
      expect(patchRes.statusCode).toBe(200);

      // Test send
      const sendRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/notifications/test-send',
        headers: adminHeaders,
        payload: {
          toEmail: 'tester@jlpt.local',
        },
      });
      expect(sendRes.statusCode).toBe(201);
    });

    // 12. Org & Teacher Applications
    it('ADM-19: Admin can review teacher applications and list organizations', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/teacher-applications',
        headers: adminHeaders,
      });
      expect(listRes.statusCode).toBe(200);
      const listData = JSON.parse(listRes.payload);
      expect(listData.items.length).toBeGreaterThan(0);

      // Approve
      const approveRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/teacher-applications/app-01/approve',
        headers: adminHeaders,
      });
      expect(approveRes.statusCode).toBe(201);
      const approveBody = JSON.parse(approveRes.payload);
      expect(approveBody.application.status).toBe('approved');

      // Verify user was promoted to role teacher in PostgreSQL schema.users
      const candidateUser = await dbClient.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, approveBody.application.userId));
      expect(candidateUser[0].role).toBe('teacher');

      // Verify application status updated in PostgreSQL schema.teacherApplications
      const appInDb = await dbClient.db
        .select()
        .from(schema.teacherApplications)
        .where(eq(schema.teacherApplications.id, approveBody.application.targetId || '0192f000-0000-7000-8000-000000000071'));
      expect(appInDb[0].status).toBe('approved');

      // Organizations
      const orgRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/organizations',
        headers: adminHeaders,
      });
      expect(orgRes.statusCode).toBe(200);
      const orgData = JSON.parse(orgRes.payload);
      expect(orgData.items.length).toBeGreaterThan(0);

      // Verify organizations are persisted in PostgreSQL schema.organizations
      const orgsInDb = await dbClient.db.select().from(schema.organizations);
      expect(orgsInDb.length).toBeGreaterThan(0);
    });
  });
});
