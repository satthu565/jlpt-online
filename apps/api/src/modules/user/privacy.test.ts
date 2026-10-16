import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { eq } from 'drizzle-orm';

import type { Role, Level } from '@jlpt/schema';

function makeUser(id: string, role: Role = 'student'): AuthUserContext {
  return {
    userId: id,
    email: `${id}@test.jlpt.local`,
    name: `User ${id}`,
    role,
    sessionId: `018e0000-0000-7000-8000-000000000099`,
    sessionToken: `token-${id}`,
    emailVerified: true,
  };
}

describe('A02: User Privacy, Profile & Account Management Tests (ACC-06, ACC-08, ACC-09, ACC-11, ACC-13, SYS-19, Acceptance 5)', () => {
  let dbClient: DbClientInstance;
  let outboxService: OutboxService;
  let userService: UserService;
  let userController: UserController;

  const testUser = makeUser('018e0000-0000-7000-8000-000000000091');
  const otherUser = makeUser('018e0000-0000-7000-8000-000000000092');

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    outboxService = new OutboxService(dbClient);
    userService = new UserService(dbClient, outboxService);
    userController = new UserController(userService);

    // Seed test user
    for (const u of [testUser, otherUser]) {
      await dbClient.db.insert(schema.users).values({
        id: u.userId,
        email: u.email,
        name: u.name,
        role: u.role,
      });
    }
  });

  afterEach(async () => {
    await dbClient.close();
  });

  // ---------------------------------------------------------------------------
  // ACC-06: Chỉnh sửa tên, ảnh đại diện, thông tin cá nhân & Acceptance 5 (delete avatar)
  // ---------------------------------------------------------------------------
  describe('ACC-06: Profile & Avatar Management', () => {
    it('Updates user profile fields correctly', async () => {
      const updated = await userController.updateProfile(testUser, {
        name: 'Nguyễn Văn A',
        targetLevel: 'N2',
        locale: 'ja',
        timezone: 'Asia/Tokyo',
      });

      expect(updated.name).toBe('Nguyễn Văn A');
      expect(updated.targetLevel).toBe('N2');
      expect(updated.locale).toBe('ja');
      expect(updated.timezone).toBe('Asia/Tokyo');
    });

    it('Rejects invalid targetLevel', async () => {
      await expect(
        userController.updateProfile(testUser, {
          targetLevel: 'N99' as unknown as Level,
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('Uploads and deletes avatar (Acceptance 5: delete avatar)', async () => {
      // 1. Upload avatar
      const uploadRes = await userController.uploadAvatar(testUser, {
        avatarUrl: '/images/avatar-custom.png',
      });
      expect(uploadRes.avatarUrl).toBe('/images/avatar-custom.png');

      const profileAfterUpload = await userController.getProfile(testUser);
      expect(profileAfterUpload.avatarUrl).toBe('/images/avatar-custom.png');

      // 2. Delete avatar (Acceptance 5)
      const deleteRes = await userController.deleteAvatar(testUser);
      expect(deleteRes.success).toBe(true);

      const profileAfterDelete = await userController.getProfile(testUser);
      expect(profileAfterDelete.avatarUrl).toBeNull();
      expect(profileAfterDelete.image).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // ACC-08: Đặt mục tiêu kỳ thi tháng 7 hoặc tháng 12
  // ---------------------------------------------------------------------------
  describe('ACC-08: Target Exam Date', () => {
    it('Allows setting target exam date for July or December exam', async () => {
      const updatedJuly = await userController.updateProfile(testUser, {
        targetExamDate: '2026-07-05',
      });
      expect(updatedJuly.targetExamDate).toBe('2026-07-05');

      const updatedDec = await userController.updateProfile(testUser, {
        targetExamDate: '2026-12-06',
      });
      expect(updatedDec.targetExamDate).toBe('2026-12-06');
    });

    it('Rejects invalid date string format', async () => {
      await expect(
        userController.updateProfile(testUser, {
          targetExamDate: 'invalid-date-string',
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Ngày thi dự kiến không hợp lệ'),
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ACC-09: Đặt mục tiêu điểm số (0 - 180)
  // ---------------------------------------------------------------------------
  describe('ACC-09: Target Score', () => {
    it('Allows setting target score within 0 to 180', async () => {
      const updated = await userController.updateProfile(testUser, {
        targetScore: 160,
      });
      expect(updated.targetScore).toBe(160);
    });

    it('Rejects negative target score or score exceeding 180', async () => {
      await expect(
        userController.updateProfile(testUser, {
          targetScore: -1,
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('0 đến 180'),
        },
      });

      await expect(
        userController.updateProfile(testUser, {
          targetScore: 181,
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('0 đến 180'),
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ACC-11: Xem thời gian đã dành cho việc ôn tập & phân tích
  // ---------------------------------------------------------------------------
  describe('ACC-11: Study Time & User Analytics', () => {
    it('Calculates study time minutes and aggregates attempts and skills', async () => {
      // 1. Seed study session and completions (2 sessions: 1800s + 1800s = 3600s = 60 mins)
      const planId = generateUuidV7();
      await dbClient.db.insert(schema.studyPlans).values({
        id: planId,
        userId: testUser.userId,
        targetLevel: 'N2',
        targetDate: '2026-12-06',
      });

      const sessionId = generateUuidV7();
      await dbClient.db.insert(schema.studySessions).values({
        id: sessionId,
        planId,
        userId: testUser.userId,
        scheduledDate: '2026-10-16',
        durationMinutes: 60,
      });

      await dbClient.db.insert(schema.studySessionCompletions).values([
        {
          id: generateUuidV7(),
          sessionId,
          clientEventId: generateUuidV7(),
          timeSpentSeconds: 1800,
          completedAt: new Date(),
        },
        {
          id: generateUuidV7(),
          sessionId,
          clientEventId: generateUuidV7(),
          timeSpentSeconds: 1800,
          completedAt: new Date(),
        },
      ]);

      // 2. Seed exam attempts
      const examId = generateUuidV7();
      await dbClient.db.insert(schema.exams).values({
        id: examId,
        slug: `exam-stat-${examId}`,
        title: 'Đề Thi Thử Stats',
        level: 'N2',
        kind: 'practice',
        scoringMethod: 'scaled',
      });
      const blueprintId = generateUuidV7();
      await dbClient.db.insert(schema.blueprints).values({
        id: blueprintId,
        level: 'N2',
        version: 1,
        kind: 'synthetic',
        status: 'active',
        isOfficial: false,
        isConfirmed: true,
        confirmedBy: testUser.userId,
        confirmedAt: new Date(),
        effectiveFrom: '2026-01-01',
        sourceRef: {},
        sections: [],
        scoring: {},
      });

      await dbClient.db.insert(schema.examVersions).values({
        examId,
        version: 1,
        snapshotKey: `exams/${examId}/v1/snapshot.json`,
        manifestKey: `exams/${examId}/v1/manifest.json`,
        blueprintId,
        blueprintVersion: 1,
        scoring: {
          method: 'linear_reference',
          guestTrial: false,
        },
        totalQuestions: 10,
        publishedAt: new Date(),
        publishedBy: testUser.userId,
      });

      await dbClient.db.insert(schema.examAttempts).values({
        id: generateUuidV7(),
        userId: testUser.userId,
        examId,
        examVersion: 1,
        mode: 'practice',
        status: 'submitted',
        leaseId: generateUuidV7(),
        attemptMonth: '2026-10-01',
        submittedAt: new Date(),
        result: { scoring: { total: 150 } },
      });

      // 3. Seed user skill aggregates
      await dbClient.db.insert(schema.userSkillAggregates).values([
        {
          userId: testUser.userId,
          skill: 'language_knowledge',
          accuracyRate: 85,
          sampleSize: 120,
        },
        {
          userId: testUser.userId,
          skill: 'reading',
          accuracyRate: 78,
          sampleSize: 45,
        },
      ]);

      // 4. Fetch analytics
      const analytics = await userController.getUserAnalytics(testUser);
      expect(analytics.studyTimeMinutes).toBe(60);
      expect(analytics.totalAttempts).toBe(1);
      expect(analytics.averageAccuracy).toBe(150);
      expect(analytics.bySkill['language_knowledge']?.accuracy).toBe(85);
      expect(analytics.bySkill['reading']?.totalQuestions).toBe(45);
    });
  });

  // ---------------------------------------------------------------------------
  // ACC-13 & Acceptance 5: Account export & Formula injection sanitization
  // ---------------------------------------------------------------------------
  describe('ACC-13 & Acceptance 5: Account Data Export (GDPR)', () => {
    it('Exports personal data and sanitizes formula injection characters', async () => {
      // Update user with formula injection payload in name
      await dbClient.db
        .update(schema.users)
        .set({
          name: '=cmd|"/C calc"!A0',
          email: '+formula@test.jlpt.local',
        })
        .where(eq(schema.users.id, testUser.userId));

      const exportRes = await userController.requestDataExport(testUser, { kind: 'JSON' });
      expect(exportRes.jobId).toBeDefined();
      expect(exportRes.status).toBe('completed');
      expect(exportRes.downloadUrl).toContain('/exports/user-data-');

      // Formula characters must be sanitized (prefixed with quote)
      expect(String(exportRes.data.profile.name).startsWith("'")).toBe(true);
      expect(String(exportRes.data.profile.email).startsWith("'")).toBe(true);

      // Verify job record stored in DB
      const [job] = await dbClient.db
        .select()
        .from(schema.dataExportJobs)
        .where(eq(schema.dataExportJobs.id, exportRes.jobId));
      expect(job).toBeDefined();
      expect(job?.userId).toBe(testUser.userId);
    });
  });

  // ---------------------------------------------------------------------------
  // ACC-13, SYS-19 & Acceptance 5: Account Deletion Request & Retention Guards
  // ---------------------------------------------------------------------------
  describe('ACC-13, SYS-19: Account Deletion Request & Retention Policy', () => {
    it('Enforces retention obligations when deleting account data and records status', async () => {
      // 1. Initial deletion request status is none
      const initialStatus = await userController.getDeletionRequestStatus(testUser);
      expect(initialStatus.status).toBe('none');

      // 2. Submit deletion request
      const deletionRes = await userController.createDeletionRequest(testUser, {
        reason: 'Không còn nhu cầu sử dụng dịch vụ',
      });

      expect(deletionRes.id).toBeDefined();
      // Retention policy not yet approved for billing/audit -> blocked_retention
      expect(deletionRes.status).toBe('blocked_retention');
      expect(deletionRes.preservedDomains).toContain('billing');

      // 3. Status now returns the recorded request
      const currentStatus = await userController.getDeletionRequestStatus(testUser);
      expect(currentStatus.status).toBe('blocked_retention');
      expect(currentStatus.id).toBe(deletionRes.id);

      // 4. Outbox event emitted
      const outboxEvents = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'privacy.deletion.requested'));
      expect(outboxEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // ACC-12 & Acceptance 5: Quản lý phiên đăng nhập (Sessions đầy đủ)
  // ---------------------------------------------------------------------------
  describe('ACC-12 & Acceptance 5: Session Management', () => {
    const currentSessionId = testUser.sessionId!;
    const otherSession1Id = generateUuidV7();
    const otherSession2Id = generateUuidV7();

    beforeEach(async () => {
      const now = new Date();
      const future = new Date(Date.now() + 86400000);

      // Seed 3 sessions for testUser: currentSessionId, otherSession1Id, otherSession2Id
      await dbClient.db.insert(schema.sessions).values([
        {
          id: currentSessionId,
          userId: testUser.userId,
          token: `token-current-${currentSessionId}`,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          expiresAt: future,
          createdAt: now,
        },
        {
          id: otherSession1Id,
          userId: testUser.userId,
          token: `token-other-${otherSession1Id}`,
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          expiresAt: future,
          createdAt: now,
        },
        {
          id: otherSession2Id,
          userId: testUser.userId,
          token: `token-other-${otherSession2Id}`,
          ipAddress: '172.16.0.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          expiresAt: future,
          createdAt: now,
        },
      ]);
    });

    it('Lists user sessions with isCurrent flag', async () => {
      const sessions = await userController.getSessions(testUser);
      expect(sessions.items).toHaveLength(3);

      const current = sessions.items.find((s) => s.id === currentSessionId);
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);

      const other1 = sessions.items.find((s) => s.id === otherSession1Id);
      expect(other1).toBeDefined();
      expect(other1?.isCurrent).toBe(false);
    });

    it('Revokes a specific session (ACC-12)', async () => {
      await userController.revokeSession(testUser, otherSession1Id);

      const remainingSessions = await userController.getSessions(testUser);
      expect(remainingSessions.items).toHaveLength(2);
      expect(remainingSessions.items.some((s) => s.id === otherSession1Id)).toBe(false);
    });

    it('Revokes all other sessions leaving only current session (ACC-12, Acceptance 5: session đầy đủ)', async () => {
      const revokeRes = await userController.revokeAllOtherSessions(testUser);
      expect(revokeRes.success).toBe(true);

      const remainingSessions = await userController.getSessions(testUser);
      expect(remainingSessions.items).toHaveLength(1);
      expect(remainingSessions.items[0]?.id).toBe(currentSessionId);
      expect(remainingSessions.items[0]?.isCurrent).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // User Consents Management
  // ---------------------------------------------------------------------------
  describe('User Consents Management', () => {
    it('Records and updates user consents emitting outbox events', async () => {
      // 1. Grant consent
      await userController.updateUserConsents(testUser, {
        consents: [
          {
            purpose: 'analytics_tracking',
            policyVersion: '1.0.0',
            granted: true,
          },
        ],
      });

      const list1 = await userController.getUserConsents(testUser);
      expect(list1.items).toHaveLength(1);
      expect(list1.items[0]?.purpose).toBe('analytics_tracking');
      expect(list1.items[0]?.granted).toBe(true);

      // 2. Withdraw consent
      await userController.updateUserConsents(testUser, {
        consents: [
          {
            purpose: 'analytics_tracking',
            policyVersion: '1.0.0',
            granted: false,
          },
        ],
      });

      const list2 = await userController.getUserConsents(testUser);
      expect(list2.items).toHaveLength(1);
      expect(list2.items[0]?.granted).toBe(false);

      // Verify outbox events emitted
      const outboxEvents = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'privacy.consent.changed'));
      expect(outboxEvents.length).toBeGreaterThanOrEqual(2);
    });
  });
});
