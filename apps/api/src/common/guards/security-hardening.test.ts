import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { signMediaToken } from '@jlpt/media-token';
import { eq } from 'drizzle-orm';
import { AppModule } from '../../app.module.js';

import { RateLimitGuard, getRateLimitNamespace } from './rate-limit.guard.js';
import { isSafeUploadPath, assertSafeUploadPath, UnsafePathError } from '../utils/paths.js';
import { generateUuidV7 } from '../utils/uuid.js';

import { getOrCreateDbClient } from '../database/database.module.js';
import { AuthService } from '../../modules/auth/auth.service.js';
import { StorageService } from '../../modules/storage/storage.service.js';
import { LocalFsStorage, StorageSecurityError } from '../../modules/storage/local-fs.storage.js';
import { R2Storage } from '../../modules/storage/r2.storage.js';
import { MediaService } from '../../modules/media/media.service.js';
import { CommunityService } from '../../modules/community/community.service.js';
import { AttemptService } from '../../modules/attempt/attempt.service.js';
import { OutboxService } from '../../modules/outbox/outbox.service.js';
import { EntitlementService } from '../../modules/entitlement/entitlement.service.js';
import * as schema from '../../db/schema.js';

// Minimal 1x1 PNG fixture
const SAMPLE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('V02 API Security Hardening & Incident Fixes', () => {
  let app: NestFastifyApplication;
  let communityService: CommunityService;
  let storageService: StorageService;
  let mediaService: MediaService;
  let entitlementService: EntitlementService;
  let outboxService: OutboxService;
  let rateLimitGuard: RateLimitGuard;

  // Test users
  let studentAToken = '';
  let studentAId = '';
  let studentBToken = '';
  let studentBId = '';
  let teacherOrgAToken = '';
  let teacherOrgAId = '';
  let teacherOrgBToken = '';
  let teacherOrgBId = '';
  let adminToken = '';
  let adminId = '';

  let orgAId = '';
  let orgBId = '';

  const mediaTokenSecret = 'test_media_token_secret_for_hardening_suite_123';

  beforeAll(async () => {
    process.env.ADMIN_HOST = 'admin.jlpt.local';
    process.env.MEDIA_TOKEN_SECRET = mediaTokenSecret;

    const client = await getOrCreateDbClient();

    // 1. Seed Student A
    studentAId = generateUuidV7();
    studentAToken = `token_student_a_${Date.now()}`;
    await client.db.insert(schema.users).values({
      id: studentAId,
      email: `student_a_${Date.now()}@example.com`,
      name: 'Student A',
      role: 'student',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: studentAId,
      token: studentAToken,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    // 2. Seed Student B
    studentBId = generateUuidV7();
    studentBToken = `token_student_b_${Date.now()}`;
    await client.db.insert(schema.users).values({
      id: studentBId,
      email: `student_b_${Date.now()}@example.com`,
      name: 'Student B',
      role: 'student',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: studentBId,
      token: studentBToken,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    // 3. Seed Teacher Org A & Organization A
    teacherOrgAId = generateUuidV7();
    teacherOrgAToken = `token_teacher_org_a_${Date.now()}`;
    await client.db.insert(schema.users).values({
      id: teacherOrgAId,
      email: `teacher_a_${Date.now()}@example.com`,
      name: 'Teacher Org A',
      role: 'teacher',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: teacherOrgAId,
      token: teacherOrgAToken,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    orgAId = generateUuidV7();
    await client.db.insert(schema.organizations).values({
      id: orgAId,
      name: 'JLPT Center A',
      slug: `center-a-${Date.now()}`,
    });
    await client.db.insert(schema.orgMemberships).values({
      id: generateUuidV7(),
      orgId: orgAId,
      userId: teacherOrgAId,
      role: 'owner',
    });

    // 4. Seed Teacher Org B & Organization B
    teacherOrgBId = generateUuidV7();
    teacherOrgBToken = `token_teacher_org_b_${Date.now()}`;
    await client.db.insert(schema.users).values({
      id: teacherOrgBId,
      email: `teacher_b_${Date.now()}@example.com`,
      name: 'Teacher Org B',
      role: 'teacher',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: teacherOrgBId,
      token: teacherOrgBToken,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    orgBId = generateUuidV7();
    await client.db.insert(schema.organizations).values({
      id: orgBId,
      name: 'JLPT Center B',
      slug: `center-b-${Date.now()}`,
    });
    await client.db.insert(schema.orgMemberships).values({
      id: generateUuidV7(),
      orgId: orgBId,
      userId: teacherOrgBId,
      role: 'owner',
    });

    // 5. Seed Admin
    adminId = generateUuidV7();
    adminToken = `token_admin_${Date.now()}`;
    await client.db.insert(schema.users).values({
      id: adminId,
      email: `admin_${Date.now()}@example.com`,
      name: 'Admin User',
      role: 'admin',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: adminId,
      token: adminToken,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    // Create and boot NestJS test app
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { logger: ['error', 'warn'] },
    );

    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    communityService = app.get(CommunityService);
    storageService = app.get(StorageService);
    mediaService = app.get(MediaService);
    outboxService = app.get(OutboxService);
    entitlementService = new EntitlementService(client, outboxService);
    rateLimitGuard = app.get(RateLimitGuard);
  });

  afterAll(async () => {
    delete process.env.ADMIN_HOST;
    delete process.env.MEDIA_TOKEN_SECRET;
    await app.close();
  });

  // ===========================================================================
  // ACCEPTANCE CRITERION 1: Mọi endpoint có ownership/tenant/entitlement tests
  // ===========================================================================
  describe('Acceptance 1: Mọi endpoint có ownership/tenant/entitlement tests', () => {
    describe('1.1 Ownership Protection', () => {
      it('User A profile and sessions are completely private from User B', async () => {
        // User A fetches their sessions
        const resA = await app.inject({
          method: 'GET',
          url: '/api/v1/me/sessions',
          headers: { authorization: `Bearer ${studentAToken}` },
        });
        expect(resA.statusCode).toBe(200);
        const bodyA = JSON.parse(resA.payload);
        expect(bodyA.items.length).toBeGreaterThanOrEqual(1);
        const sessionAId = bodyA.items[0].id;

        // User B attempts to revoke User A session
        const resB = await app.inject({
          method: 'DELETE',
          url: `/api/v1/me/sessions/${sessionAId}`,
          headers: { authorization: `Bearer ${studentBToken}` },
        });
        // Returns 204 but did NOT delete User A's session because it was filtered by user_id
        expect(resB.statusCode).toBe(204);

        // Verify User A session still exists in DB
        const client = await getOrCreateDbClient();
        const [stillExists] = await client.db
          .select()
          .from(schema.sessions)
          .where(eq(schema.sessions.id, sessionAId));
        expect(stillExists).toBeDefined();
        expect(stillExists.userId).toBe(studentAId);
      });

      it('User B cannot export or delete User A account data', async () => {
        // User A requests GDPR data export
        const exportRes = await app.inject({
          method: 'POST',
          url: '/api/v1/me/data-exports',
          headers: { authorization: `Bearer ${studentAToken}` },
        });
        expect(exportRes.statusCode).toBe(200);
        const exportBody = JSON.parse(exportRes.payload);
        expect(exportBody.data.profile.id).toBe(studentAId);
        expect(exportBody.data.profile.id).not.toBe(studentBId);

        // User B requests deletion of User B account - User A is untouched
        const deleteResB = await app.inject({
          method: 'POST',
          url: '/api/v1/me/deletion-request',
          headers: { authorization: `Bearer ${studentBToken}` },
          payload: { reason: 'No longer learning', confirmation: 'CONFIRM' },
        });
        expect(deleteResB.statusCode).toBe(200);

        // Check deletion status of User A is NOT requested
        const statusResA = await app.inject({
          method: 'GET',
          url: '/api/v1/me/deletion-request',
          headers: { authorization: `Bearer ${studentAToken}` },
        });
        expect(statusResA.statusCode).toBe(200);
        const statusA = JSON.parse(statusResA.payload);
        expect(statusA.status).toBe('none');
      });

      it('Comment ownership: User B cannot delete User A comment (FORBIDDEN)', async () => {
        const client = await getOrCreateDbClient();
        const commentId = generateUuidV7();
        const threadId = generateUuidV7();

        // Seed thread
        await client.db.insert(schema.discussionThreads).values({
          id: threadId,
          targetType: 'question',
          targetId: generateUuidV7(),
          authorId: studentAId,
          title: 'Thảo luận câu 1',
          content: 'Nội dung thảo luận câu 1',
        });

        // Seed comment by User A
        await client.db.insert(schema.comments).values({
          id: commentId,
          threadId,
          authorId: studentAId,
          content: 'Bình luận của Học viên A',
        });

        // User B attempts to delete User A comment
        const deleteRes = await app.inject({
          method: 'DELETE',
          url: `/api/v1/comments/${commentId}`,
          headers: { authorization: `Bearer ${studentBToken}` },
        });

        expect(deleteRes.statusCode).toBe(403);
        const errBody = JSON.parse(deleteRes.payload);
        expect(errBody.error.code).toBe('FORBIDDEN');

        // Author User A can delete their own comment
        const deleteResAuthor = await app.inject({
          method: 'DELETE',
          url: `/api/v1/comments/${commentId}`,
          headers: { authorization: `Bearer ${studentAToken}` },
        });
        expect(deleteResAuthor.statusCode).toBe(200);
      });

      it('Attempt ownership: Student B cannot view or submit Student A exam attempt', async () => {
        const client = await getOrCreateDbClient();
        const examId = generateUuidV7();
        const blueprintId = generateUuidV7();
        const attemptId = generateUuidV7();
        const leaseId = generateUuidV7();

        // Seed exam
        await client.db.insert(schema.exams).values({
          id: examId,
          slug: `exam-test-${Date.now()}`,
          title: 'Đề Thi Thử N2',
          level: 'N2',
          kind: 'practice',
          scoringMethod: 'scaled',
          publishedVersion: 1,
        });

        // Seed blueprint
        await client.db.insert(schema.blueprints).values({
          id: blueprintId,
          level: 'N2',
          version: 1,
          kind: 'synthetic',
          status: 'active',
          isOfficial: false,
          isConfirmed: true,
          confirmedBy: adminId,
          confirmedAt: new Date(),
          effectiveFrom: '2026-01-01',
          sourceRef: {},
          sections: [],
          scoring: {},
        });

        // Seed exam version
        await client.db.insert(schema.examVersions).values({
          examId,
          version: 1,
          snapshotKey: `exams/${examId}/v1/snapshot.json`,
          manifestKey: `exams/${examId}/v1/manifest.json`,
          blueprintId,
          blueprintVersion: 1,
          totalQuestions: 100,
          scoring: {
            method: 'linear_reference',
            guestTrial: false,
            scoringSections: [],
          },
          publishedAt: new Date(),
          publishedBy: adminId,
        });

        // Seed attempt belonging to Student A
        await client.db.insert(schema.examAttempts).values({
          id: attemptId,
          userId: studentAId,
          examId,
          examVersion: 1,
          mode: 'real',
          status: 'in_progress',
          leaseId,
          attemptMonth: '2026-10-01',
          currentSection: 0,
          currentDeadline: new Date(Date.now() + 3600 * 1000),
        });

        // Student B attempts to read Student A attempt
        const getRes = await app.inject({
          method: 'GET',
          url: `/api/v1/attempts/${attemptId}`,
          headers: { authorization: `Bearer ${studentBToken}` },
        });
        expect(getRes.statusCode).toBe(404);

        // Student B attempts to submit Student A attempt
        const submitRes = await app.inject({
          method: 'POST',
          url: `/api/v1/attempts/${attemptId}/submit`,
          headers: { authorization: `Bearer ${studentBToken}` },
          payload: {
            lease: leaseId,
            seq: 1,
            answers: [],
            flags: [],
          },
        });
        expect(submitRes.statusCode).toBe(404);
      });
    });

    describe('1.2 Tenant Isolation (Cross-Tenant Protection)', () => {
      it('Teacher Org A cannot read or manage classes of Org B (TENANT_FORBIDDEN)', async () => {
        // Teacher Org B creates class in Org B
        const client = await getOrCreateDbClient();
        const classBId = generateUuidV7();
        await client.db.insert(schema.classes).values({
          id: classBId,
          orgId: orgBId,
          teacherId: teacherOrgBId,
          name: 'N2 Intensive Org B',
          level: 'N2',
        });

        // Teacher Org A tries to list classes of Org B
        const listRes = await app.inject({
          method: 'GET',
          url: `/api/v1/organizations/${orgBId}/classes`,
          headers: { authorization: `Bearer ${teacherOrgAToken}` },
        });
        expect(listRes.statusCode).toBe(403);
        const errList = JSON.parse(listRes.payload);
        expect(errList.error.code).toBe('TENANT_FORBIDDEN');

        // Teacher Org A tries to read class members of class in Org B
        const getRes = await app.inject({
          method: 'GET',
          url: `/api/v1/classes/${classBId}/members`,
          headers: { authorization: `Bearer ${teacherOrgAToken}` },
        });
        expect(getRes.statusCode).toBe(403);
        const errGet = JSON.parse(getRes.payload);
        expect(errGet.error.code).toBe('TENANT_FORBIDDEN');
      });

      it('Teacher Org A cannot assign tasks to learners of Org B (INVALID_LEARNER)', async () => {
        // Create class in Org A
        const client = await getOrCreateDbClient();
        const classAId = generateUuidV7();
        await client.db.insert(schema.classes).values({
          id: classAId,
          orgId: orgAId,
          teacherId: teacherOrgAId,
          name: 'N1 Master Org A',
          level: 'N1',
        });

        // Student B is not a member of Class A
        const assignRes = await app.inject({
          method: 'POST',
          url: `/api/v1/classes/${classAId}/assignments`,
          headers: { authorization: `Bearer ${teacherOrgAToken}` },
          payload: {
            title: 'Bài tập ngữ pháp tuần 1',
            examId: null,
            targetType: 'learners',
            opensAtUTC: new Date().toISOString(),
            dueAtUTC: new Date(Date.now() + 86400000).toISOString(),
            learnerIds: [studentBId], // Outside tenant / class!
          },
        });

        expect(assignRes.statusCode).toBe(400);
        const err = JSON.parse(assignRes.payload);
        expect(err.error.code).toBe('INVALID_LEARNER');
      });

      it('TenantGuard blocks cross-tenant headers (x-organization-id) when user has active tenant', async () => {
        const authService = app.get(AuthService);
        const originalGetSession = authService.getSession.bind(authService);

        // Inject session with tenantId: orgAId
        authService.getSession = async (token: string) => {
          const session = await originalGetSession(token);
          if (session && token === teacherOrgAToken) {
            return { ...session, tenantId: orgAId };
          }
          return session;
        };

        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/organizations/${orgBId}/classes`,
          headers: {
            authorization: `Bearer ${teacherOrgAToken}`,
            'x-organization-id': orgBId,
          },
        });

        expect(res.statusCode).toBe(403);
        const err = JSON.parse(res.payload);
        expect(err.error.code).toBe('TENANT_FORBIDDEN');

        // Restore
        authService.getSession = originalGetSession;
      });

      it('Tenant seat allocation cannot be hijacked by other organizations', async () => {
        // Initialize Org A plan with 2 seats
        await entitlementService.setTenantPlan(orgAId, { totalSeats: 2, usedSeats: 0 });
        const resA = await entitlementService.assignTenantSeat(orgAId);
        expect(resA.success).toBe(true);
        expect(resA.remainingSeats).toBe(1);

        // Org B plan is isolated
        const planB = await entitlementService.getTenantPlan(orgBId);
        expect(planB.usedSeats).toBe(0);
      });
    });

    describe('1.3 Entitlement & Role Gating', () => {
      it('Student cannot access admin endpoints (FORBIDDEN)', async () => {
        // 1. GET /admin/imports
        const resImports = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/imports',
          headers: {
            authorization: `Bearer ${studentAToken}`,
            host: 'admin.jlpt.local',
          },
        });
        expect(resImports.statusCode).toBe(403);
        expect(JSON.parse(resImports.payload).error.code).toBe('FORBIDDEN');

        // 2. POST /admin/media
        const resMedia = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/media',
          headers: {
            authorization: `Bearer ${studentAToken}`,
            host: 'admin.jlpt.local',
          },
          payload: { filename: 'test.png', dataBase64: SAMPLE_PNG.toString('base64') },
        });
        expect(resMedia.statusCode).toBe(403);
        expect(JSON.parse(resMedia.payload).error.code).toBe('FORBIDDEN');

        // 3. GET /admin/audit-logs
        const resAudit = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/audit-logs',
          headers: {
            authorization: `Bearer ${studentAToken}`,
            host: 'admin.jlpt.local',
          },
        });
        expect(resAudit.statusCode).toBe(403);
        expect(JSON.parse(resAudit.payload).error.code).toBe('FORBIDDEN');
      });

      it('Free tier user is gated from premium features (FEATURE_GATED)', async () => {
        const checkUnlimited = await entitlementService.checkFeatureAccess(studentAId, 'unlimited_exams');
        expect(checkUnlimited.allowed).toBe(false);
        expect(checkUnlimited.code).toBe('FEATURE_GATED');

        const checkOffline = await entitlementService.checkFeatureAccess(studentAId, 'download_offline');
        expect(checkOffline.allowed).toBe(false);
        expect(checkOffline.code).toBe('FEATURE_GATED');
      });

      it('Event Embargo: Learner cannot view embargoed event results before resultReleaseAt', async () => {
        const client = await getOrCreateDbClient();
        const eventId = generateUuidV7();
        const examId = generateUuidV7();
        const attemptId = generateUuidV7();
        const now = new Date();

        const opensAt = new Date(now.getTime() - 3600 * 1000);
        const startsAt = new Date(now.getTime() - 3000 * 1000);
        const endsAt = new Date(now.getTime() + 3600 * 1000);
        const resultReleaseAt = new Date(now.getTime() + 7200 * 1000); // 2 hours later

        // Seed exam event
        await client.db.insert(schema.examEvents).values({
          id: eventId,
          title: 'JLPT N2 Mock Contest 2026',
          level: 'N2',
          opensAt,
          startsAt,
          endsAt,
          resultReleaseAt,
          capacity: 100,
        });

        // Seed prerequisite blueprint, exam, examVersion, and examAttempt
        const bpId = generateUuidV7();
        await client.db.insert(schema.blueprints).values({
          id: bpId,
          level: 'N2',
          version: 1,
          kind: 'official',
          status: 'active',
          effectiveFrom: '2026-01-01',
          sourceRef: {},
          sections: [],
          scoring: {},
        });

        await client.db.insert(schema.exams).values({
          id: examId,
          slug: `exam-n2-${Date.now()}`,
          level: 'N2',
          title: 'JLPT N2 Mock Exam',
          kind: 'official',
          totalQuestions: 100,
        });

        await client.db.insert(schema.examVersions).values({
          examId,
          version: 1,
          snapshotKey: 'snapshots/n2.json',
          manifestKey: 'manifests/n2.json',
          blueprintId: bpId,
          blueprintVersion: 1,
          scoring: {},
          totalQuestions: 100,
          publishedAt: now,
          publishedBy: adminId,
        });

        await client.db.insert(schema.examAttempts).values({
          id: attemptId,
          userId: studentAId,
          examId,
          examVersion: 1,
          mode: 'real',
          status: 'submitted',
          leaseId: generateUuidV7(),
          attemptMonth: '2026-10-01',
          startedAt: now,
          submittedAt: now,
        });

        // Seed event attempt
        await client.db.insert(schema.eventAttempts).values({
          id: generateUuidV7(),
          eventId,
          attemptId,
          userId: studentAId,
          submittedAt: now,
        });

        // Student A early submit tries to review answers
        await expect(
          app.get(AttemptService).reviewAttempt(attemptId, {
            userId: studentAId,
            role: 'student',
            sessionId: 'dummy',
            sessionToken: 'dummy_token',
            email: 'student_a@test.local',
            name: 'Student A',
            emailVerified: true,
          }),
        ).rejects.toThrow('Kết quả sự kiện thi chưa được công bố.');
      });

      it('Discussion entitlement: Learner who has not completed exam cannot view discussions', async () => {
        const questionId = generateUuidV7();

        // Student A has not completed exam with questionId
        await expect(
          communityService.listQuestionDiscussions(questionId, {
            userId: studentAId,
            role: 'student',
            sessionId: 'dummy',
            sessionToken: 'dummy_token',
            email: 'student_a@test.local',
            name: 'Student A',
            emailVerified: true,
          }),
        ).rejects.toThrow('Bạn chỉ có thể xem và tham gia thảo luận sau khi đã hoàn thành');
      });
    });
  });

  // ===========================================================================
  // ACCEPTANCE CRITERION 2: Unsafe upload path và expired URL fail
  // ===========================================================================
  describe('Acceptance 2: Unsafe upload path và expired URL fail', () => {
    describe('2.1 Unsafe Upload Paths Rejection', () => {
      it('isSafeUploadPath correctly rejects directory traversal and unsafe sequences', () => {
        const dangerousPaths = [
          '../outside.png',
          '../../etc/passwd',
          'folder/../../escaped.jpg',
          '/absolute/root/file.png',
          '\\windows\\system32\\cmd.exe',
          'media\\backslashes.png',
          'C:\\boot.ini',
          'file\0null.png',
          'media/%2e%2e/traversal.png',
          'media/%2e%2e%2fevil.png',
          './hidden.png',
          '   ',
          '',
        ];

        for (const p of dangerousPaths) {
          expect(isSafeUploadPath(p)).toBe(false);
          expect(() => assertSafeUploadPath(p)).toThrow(UnsafePathError);
        }

        const safePaths = [
          'photo.png',
          'media/photo.png',
          'audio/track01.mp3',
          'imports/package_v2.zip',
          'avatars/user-123.jpg',
        ];

        for (const p of safePaths) {
          expect(isSafeUploadPath(p)).toBe(true);
          expect(assertSafeUploadPath(p)).toBe(p);
        }
      });

      it('StorageService, LocalFsStorage & R2Storage fail on unsafe upload paths', async () => {
        const dummyData = Buffer.from('test content');

        const maliciousKeys = [
          '../escape.txt',
          'media/../../etc/shadow',
          '/root/secret.env',
          'media\\test.png',
          'media/\0poison.bin',
          'media/%2e%2e%2fevil.txt',
          'C:\\Windows\\system32',
        ];

        const local = new LocalFsStorage();
        const r2 = new R2Storage({ bucketName: 'test-bucket' });

        for (const key of maliciousKeys) {
          await expect(local.put(key, dummyData)).rejects.toThrow(StorageSecurityError);
          await expect(local.get(key)).rejects.toThrow(StorageSecurityError);
          await expect(local.head(key)).rejects.toThrow(StorageSecurityError);
          await expect(local.delete(key)).rejects.toThrow(StorageSecurityError);

          await expect(r2.put(key, dummyData)).rejects.toThrow(StorageSecurityError);
          await expect(r2.get(key)).rejects.toThrow(StorageSecurityError);
          await expect(r2.head(key)).rejects.toThrow(StorageSecurityError);
          await expect(r2.delete(key)).rejects.toThrow(StorageSecurityError);

          await expect(storageService.put(key, dummyData)).rejects.toThrow(StorageSecurityError);
        }
      });

      it('POST /api/v1/admin/media rejects unsafe filename in upload payload (BadRequestException)', async () => {
        const unsafeFilenames = [
          '../../etc/cron.d/evil.png',
          '/etc/shadow',
          'media\\shell.png',
          'payload\0.png',
        ];

        for (const filename of unsafeFilenames) {
          const res = await app.inject({
            method: 'POST',
            url: '/api/v1/admin/media',
            headers: {
              authorization: `Bearer ${adminToken}`,
              host: 'admin.jlpt.local',
            },
            payload: {
              filename,
              mimeType: 'image/png',
              dataBase64: SAMPLE_PNG.toString('base64'),
            },
          });

          expect(res.statusCode).toBe(400);
          const err = JSON.parse(res.payload);
          expect(err.error.message).toContain('unsafe upload path');
        }
      });

      it('POST /api/v1/me/avatar rejects unsafe avatarUrl with traversal or dangerous schemes (BadRequestException)', async () => {
        const unsafeAvatarUrls = [
          '../../etc/passwd',
          '../images/custom.png',
          'javascript:alert("xss")',
          'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
          'file:///etc/hosts',
          'vbscript:msgbox(1)',
          'avatar\\escaped.png',
          'avatar\0poison.png',
        ];

        for (const avatarUrl of unsafeAvatarUrls) {
          const res = await app.inject({
            method: 'POST',
            url: '/api/v1/me/avatar',
            headers: { authorization: `Bearer ${studentAToken}` },
            payload: { avatarUrl },
          });

          expect(res.statusCode).toBe(400);
          const err = JSON.parse(res.payload);
          expect(err.error.code).toBe('VALIDATION_ERROR');
        }
      });

      it('POST /api/v1/admin/imports rejects unsafe package filename', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/imports',
          headers: {
            authorization: `Bearer ${adminToken}`,
            host: 'admin.jlpt.local',
          },
          payload: {
            fileName: '../../unsafe-pack.zip',
            dataBase64: Buffer.from('dummy').toString('base64'),
          },
        });

        expect(res.statusCode).toBe(400);
        const err = JSON.parse(res.payload);
        expect(err.error.message).toContain('unsafe upload path');
      });
    });

    describe('2.2 Expired URL Failures', () => {
      let validAssetId = '';

      beforeAll(async () => {
        // Upload a valid test media asset
        const asset = await mediaService.uploadMedia(SAMPLE_PNG, 'test-sample.png', 'image/png');
        validAssetId = asset.id;
      });

      it('GET /api/v1/media/:id with expired signed token fails with 403 EXPIRED_URL', async () => {
        // Generate an expired token (1 hour ago)
        const expiredUnix = Math.floor(Date.now() / 1000) - 3600;
        const expiredToken = await signMediaToken(
          { mediaKey: `media/${validAssetId}.png`, exp: expiredUnix },
          mediaTokenSecret,
        );

        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/media/${validAssetId}?t=${expiredToken}`,
        });

        expect(res.statusCode).toBe(403);
        const err = JSON.parse(res.payload);
        expect(err.error.code).toBe('EXPIRED_URL');
        expect(err.error.message).toContain('Token truy cập media không hợp lệ hoặc đã hết hạn');
      });

      it('GET /api/v1/media/:id with expired timestamp parameter (exp in past) fails with 403 EXPIRED_URL', async () => {
        const pastExp = Math.floor(Date.now() / 1000) - 100;

        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/media/${validAssetId}?exp=${pastExp}`,
        });

        expect(res.statusCode).toBe(403);
        const err = JSON.parse(res.payload);
        expect(err.error.code).toBe('EXPIRED_URL');
        expect(err.error.message).toContain('URL truy cập media đã hết hạn');
      });

      it('GET /api/v1/media/:id with tampered signature fails with 403 EXPIRED_URL', async () => {
        const futureExp = Math.floor(Date.now() / 1000) + 3600;
        const validToken = await signMediaToken(
          { mediaKey: `media/${validAssetId}.png`, exp: futureExp },
          mediaTokenSecret,
        );
        const tamperedToken = validToken.slice(0, -5) + 'xxxxx';

        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/media/${validAssetId}?t=${tamperedToken}`,
        });

        expect(res.statusCode).toBe(403);
        const err = JSON.parse(res.payload);
        expect(err.error.code).toBe('EXPIRED_URL');
      });

      it('GET /api/v1/media/:id with valid unexpired signed token succeeds with 200 OK', async () => {
        const futureExp = Math.floor(Date.now() / 1000) + 3600;
        const validToken = await signMediaToken(
          { mediaKey: `media/${validAssetId}.png`, exp: futureExp },
          mediaTokenSecret,
        );

        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/media/${validAssetId}?t=${validToken}`,
        });

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('image/png');
      });

      it('MediaService.verifySignedMediaUrl correctly validates expired vs valid URLs', async () => {
        // Expired URL
        const expiredUrl = await mediaService.generateSignedMediaUrl(validAssetId, -100);
        const expiredVerification = await mediaService.verifySignedMediaUrl(expiredUrl);
        expect(expiredVerification.valid).toBe(false);

        // Valid URL
        const validUrl = await mediaService.generateSignedMediaUrl(validAssetId, 3600);
        const validVerification = await mediaService.verifySignedMediaUrl(validUrl);
        expect(validVerification.valid).toBe(true);
      });
    });
  });

  // ===========================================================================
  // ACCEPTANCE CRITERION 3: Rate-limit không dùng chung namespace staging/worker
  // ===========================================================================
  describe('Acceptance 3: Rate-limit không dùng chung namespace staging/worker', () => {
    it('getRateLimitNamespace resolves independent namespaces for workers, staging, and redis prefixes', () => {
      const origEnv = { ...process.env };

      try {
        // Worker W1
        process.env.WORKER_ID = 'W1';
        delete process.env.RATE_LIMIT_NAMESPACE;
        delete process.env.REDIS_CACHE_KEY_PREFIX;
        delete process.env.APP_ENV;
        expect(getRateLimitNamespace()).toBe('worker:w1');

        // Worker W2
        process.env.WORKER_ID = 'W2';
        expect(getRateLimitNamespace()).toBe('worker:w2');

        // Staging
        delete process.env.WORKER_ID;
        process.env.APP_ENV = 'staging';
        expect(getRateLimitNamespace()).toBe('staging');

        // Redis cache prefix
        delete process.env.APP_ENV;
        process.env.REDIS_CACHE_KEY_PREFIX = 'jlpt:staging:cache:';
        expect(getRateLimitNamespace()).toBe('jlpt:staging:cache');

        // Explicit rate limit namespace
        process.env.RATE_LIMIT_NAMESPACE = 'custom:rate:limit';
        expect(getRateLimitNamespace()).toBe('custom:rate:limit');
      } finally {
        process.env = origEnv;
      }
    });

    it('Rate limits in worker:w1 namespace NEVER consume quota of worker:w2 or staging', async () => {
      const origWorkerId = process.env.WORKER_ID;
      const origAppEnv = process.env.APP_ENV;
      const origRateNs = process.env.RATE_LIMIT_NAMESPACE;

      try {
        const clientIp = '192.168.1.100';
        const limitPrefix = 'test-isolated-endpoint';

        // 1. Configure Worker W1 namespace
        process.env.RATE_LIMIT_NAMESPACE = 'worker:w1';
        expect(rateLimitGuard.getNamespace()).toBe('worker:w1');
        rateLimitGuard.reset(limitPrefix);

        // Generate rate limit keys
        const keyW1 = rateLimitGuard.getRateLimitKey(limitPrefix, clientIp);
        expect(keyW1).toBe(`worker:w1:${limitPrefix}:${clientIp}`);

        // 2. Configure Worker W2 namespace
        process.env.RATE_LIMIT_NAMESPACE = 'worker:w2';
        expect(rateLimitGuard.getNamespace()).toBe('worker:w2');
        rateLimitGuard.reset(limitPrefix);
        const keyW2 = rateLimitGuard.getRateLimitKey(limitPrefix, clientIp);
        expect(keyW2).toBe(`worker:w2:${limitPrefix}:${clientIp}`);

        // 3. Configure Staging namespace
        process.env.RATE_LIMIT_NAMESPACE = 'staging';
        expect(rateLimitGuard.getNamespace()).toBe('staging');
        rateLimitGuard.reset(limitPrefix);
        const keyStaging = rateLimitGuard.getRateLimitKey(limitPrefix, clientIp);
        expect(keyStaging).toBe(`staging:${limitPrefix}:${clientIp}`);

        // Keys MUST BE mutually exclusive
        expect(keyW1).not.toBe(keyW2);
        expect(keyW1).not.toBe(keyStaging);
        expect(keyW2).not.toBe(keyStaging);

        // 4. Simulate mock context helper
        const createMockContext = (ip: string) =>
          ({
            switchToHttp: () => ({
              getRequest: () => ({
                headers: { 'cf-connecting-ip': ip },
                ip,
              }),
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
          }) as unknown as Parameters<typeof rateLimitGuard.canActivate>[0];

        // Worker W1 makes requests up to limit (limit: 2)
        process.env.RATE_LIMIT_NAMESPACE = 'worker:w1';
        // Mock reflector returning limit = 2
        (rateLimitGuard as unknown as { reflector: { getAllAndOverride: () => unknown } }).reflector = {
          getAllAndOverride: () => ({ limit: 2, windowSec: 60, keyPrefix: limitPrefix }),
        };

        const ctx = createMockContext(clientIp);

        // Request 1 on W1 -> PASS
        expect(rateLimitGuard.canActivate(ctx)).toBe(true);
        // Request 2 on W1 -> PASS
        expect(rateLimitGuard.canActivate(ctx)).toBe(true);
        // Request 3 on W1 -> EXCEEDED (429 RATE_LIMITED)
        expect(() => rateLimitGuard.canActivate(ctx)).toThrowError();

        // 5. Switch to Worker W2 - MUST NOT BE RATE LIMITED!
        process.env.RATE_LIMIT_NAMESPACE = 'worker:w2';
        expect(rateLimitGuard.canActivate(ctx)).toBe(true);
        expect(rateLimitGuard.canActivate(ctx)).toBe(true);
        expect(() => rateLimitGuard.canActivate(ctx)).toThrowError();

        // 6. Switch to Staging - MUST NOT BE RATE LIMITED!
        process.env.RATE_LIMIT_NAMESPACE = 'staging';
        expect(rateLimitGuard.canActivate(ctx)).toBe(true);
        expect(rateLimitGuard.canActivate(ctx)).toBe(true);
        expect(() => rateLimitGuard.canActivate(ctx)).toThrowError();

        // 7. Resetting W1 does NOT reset W2 or Staging
        process.env.RATE_LIMIT_NAMESPACE = 'worker:w1';
        rateLimitGuard.reset(limitPrefix);

        // W1 is now reset -> PASS
        expect(rateLimitGuard.canActivate(ctx)).toBe(true);

        // W2 and Staging remain exhausted
        process.env.RATE_LIMIT_NAMESPACE = 'worker:w2';
        expect(() => rateLimitGuard.canActivate(ctx)).toThrowError();

        process.env.RATE_LIMIT_NAMESPACE = 'staging';
        expect(() => rateLimitGuard.canActivate(ctx)).toThrowError();
      } finally {
        process.env.WORKER_ID = origWorkerId;
        process.env.APP_ENV = origAppEnv;
        process.env.RATE_LIMIT_NAMESPACE = origRateNs;
      }
    });
  });
});
