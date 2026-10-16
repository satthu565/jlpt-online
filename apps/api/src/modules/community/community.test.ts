import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import type { Role } from '@jlpt/schema';
import { CommunityService } from './community.service.js';
import { CommunityController } from './community.controller.js';
import { eq } from 'drizzle-orm';

function makeUser(id: string, role: Role = 'student'): AuthUserContext {
  return {
    userId: id,
    email: `${id}@test.jlpt.local`,
    name: `User ${id}`,
    role,
    sessionId: `session-${id}`,
    sessionToken: `token-${id}`,
    emailVerified: true,
  };
}

describe('A02: Community Module Tests (GAME-07..09, Acceptance 4: Discussion chỉ sau completion và moderation)', () => {
  let dbClient: DbClientInstance;
  let communityService: CommunityService;
  let communityController: CommunityController;

  const studentCompleted = makeUser('018e0000-0000-7000-8000-000000000021');
  const studentNotCompleted = makeUser('018e0000-0000-7000-8000-000000000022');
  const moderatorUser = makeUser('018e0000-0000-7000-8000-000000000023', 'moderator');
  const adminUser = makeUser('018e0000-0000-7000-8000-000000000024', 'admin');

  let questionId: string;
  let examId: string;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    communityService = new CommunityService(dbClient);
    communityController = new CommunityController(communityService);

    // Seed users
    for (const u of [studentCompleted, studentNotCompleted, moderatorUser, adminUser]) {
      await dbClient.db.insert(schema.users).values({
        id: u.userId,
        email: u.email,
        name: u.name,
        role: u.role,
      });
    }

    // Seed question and exam
    const groupId = generateUuidV7();
    await dbClient.db.insert(schema.questionGroups).values({
      id: groupId,
      level: 'N2',
      sectionCode: 'language_vocab',
    });

    questionId = generateUuidV7();
    await dbClient.db.insert(schema.questions).values({
      id: questionId,
      groupId,
      level: 'N2',
      skill: 'vocabulary',
      mondaiType: 'kanji_reading',
      origin: 'synthetic',
    });

    examId = generateUuidV7();
    await dbClient.db.insert(schema.exams).values({
      id: examId,
      slug: `exam-comm-${examId}`,
      title: 'Đề Thi Thảo Luận N2',
      level: 'N2',
      kind: 'practice',
      scoringMethod: 'scaled',
      publishedVersion: 1,
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
      confirmedBy: adminUser.userId,
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
        scoringSections: [
          { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['vocabulary', 'grammar', 'reading'], maxScaled: 120, minPass: 38 },
        ],
      },
      totalQuestions: 1,
      publishedAt: new Date(),
      publishedBy: adminUser.userId,
    });

    const sectionId = generateUuidV7();
    await dbClient.db.insert(schema.examSections).values({
      id: sectionId,
      examId,
      code: 'language_vocab',
      title: 'Kiến thức ngôn ngữ',
      durationSec: 3600,
      orderIndex: 0,
    });

    // Link question to examItems
    await dbClient.db.insert(schema.examItems).values({
      id: generateUuidV7(),
      examId,
      sectionId,
      questionId,
      orderIndex: 0,
    });

    // studentCompleted completes and submits the exam attempt
    const attemptId = generateUuidV7();
    await dbClient.db.insert(schema.examAttempts).values({
      id: attemptId,
      userId: studentCompleted.userId,
      examId,
      examVersion: 1,
      mode: 'real',
      status: 'submitted',
      leaseId: generateUuidV7(),
      attemptMonth: '2026-10-01',
      submittedAt: new Date(),
      result: {
        scoring: { total: 120 },
      },
    });
  });

  afterEach(async () => {
    await dbClient.close();
  });

  // ---------------------------------------------------------------------------
  // Acceptance 4: Discussion chỉ sau completion và moderation
  // ---------------------------------------------------------------------------
  describe('Acceptance 4: Discussion chỉ sau completion và moderation', () => {
    it('Blocks user who has not completed the exam containing the question from viewing or posting comments', async () => {
      // 1. studentNotCompleted attempts to view discussion -> 403 Forbidden
      await expect(
        communityController.listQuestionDiscussions(questionId, studentNotCompleted),
      ).rejects.toMatchObject({
        response: {
          code: 'FORBIDDEN',
          message: expect.stringContaining('sau khi đã hoàn thành một bài thi'),
        },
      });

      // 2. studentNotCompleted attempts to post a comment -> 403 Forbidden
      await expect(
        communityController.postQuestionComment(questionId, studentNotCompleted, {
          content: 'Câu này giải thích sao vậy mọi người?',
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'FORBIDDEN',
          message: expect.stringContaining('sau khi đã hoàn thành một bài thi'),
        },
      });
    });

    it('Allows user who completed the exam containing the question to view and post comments', async () => {
      // 1. Initially empty
      const listBefore = await communityController.listQuestionDiscussions(questionId, studentCompleted);
      expect(listBefore.items).toHaveLength(0);

      // 2. Post comment
      const postResult = await communityController.postQuestionComment(questionId, studentCompleted, {
        content: 'Theo mình câu này đáp án 2 vì cấu trúc にしたがって thể hiện sự biến đổi song song.',
      });
      expect(postResult.commentId).toBeDefined();

      // 3. View discussion returns the comment
      const listAfter = await communityController.listQuestionDiscussions(questionId, studentCompleted);
      expect(listAfter.items).toHaveLength(1);
      expect(listAfter.items[0]?.content).toContain('にしたがって');
      expect(listAfter.items[0]?.authorId).toBe(studentCompleted.userId);
    });

    it('Hides comments from discussion once moderator resolves report with hide_comment', async () => {
      // 1. Student posts a comment
      const { commentId } = await communityController.postQuestionComment(questionId, studentCompleted, {
        content: 'Bình luận không phù hợp spam quảng cáo!',
      });

      // 2. Report the comment
      const reportRes = await communityController.reportComment(commentId, studentCompleted, {
        reason: 'Spam quảng cáo website ngoài',
      });
      expect(reportRes.reportId).toBeDefined();

      // 3. Moderator lists reports
      const reports = await communityController.adminListCommunityReports(moderatorUser);
      expect(reports.items.length).toBeGreaterThanOrEqual(1);
      const targetReport = reports.items.find((r) => r.commentId === commentId);
      expect(targetReport).toBeDefined();

      // 4. Moderator resolves with action: 'hide_comment'
      await communityController.adminResolveCommunityReport(targetReport!.id, moderatorUser, {
        status: 'resolved',
        action: 'hide_comment',
        reason: 'Xác nhận vi phạm spam, đã ẩn bình luận',
      });

      // 5. Normal user views discussion: comment is now HIDDEN!
      const listAfterModeration = await communityController.listQuestionDiscussions(questionId, studentCompleted);
      expect(listAfterModeration.items.some((c) => c.id === commentId)).toBe(false);
    });

    it('Author can delete own comment', async () => {
      const { commentId } = await communityController.postQuestionComment(questionId, studentCompleted, {
        content: 'Bình luận sắp bị tác giả xóa',
      });

      const delResult = await communityController.deleteComment(commentId, studentCompleted);
      expect(delResult.message).toBe('Đã xóa bình luận');

      const list = await communityController.listQuestionDiscussions(questionId, studentCompleted);
      expect(list.items.some((c) => c.id === commentId)).toBe(false);
    });

    it('GAME-08, Acceptance 3 & 4: Blocks early-submit participant in an ongoing exam event before resultReleaseAt from accessing discussion', async () => {
      // 1. Create a dedicated question and exam for an event
      const eventQuestionId = generateUuidV7();
      await dbClient.db.insert(schema.questions).values({
        id: eventQuestionId,
        level: 'N2',
        skill: 'vocabulary',
        mondaiType: 'kanji_reading',
        origin: 'synthetic',
      });

      const eventExamId = generateUuidV7();
      await dbClient.db.insert(schema.exams).values({
        id: eventExamId,
        slug: `exam-event-${eventExamId}`,
        title: 'Đề thi sự kiện bí mật',
        level: 'N2',
        kind: 'real',
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
        confirmedBy: adminUser.userId,
        confirmedAt: new Date(),
        effectiveFrom: '2026-01-01',
        sourceRef: {},
        sections: [],
        scoring: {},
      });

      await dbClient.db.insert(schema.examVersions).values({
        examId: eventExamId,
        version: 1,
        snapshotKey: `exams/${eventExamId}/v1/snapshot.json`,
        manifestKey: `exams/${eventExamId}/v1/manifest.json`,
        blueprintId,
        blueprintVersion: 1,
        scoring: {
          method: 'linear_reference',
          guestTrial: false,
        },
        totalQuestions: 1,
        publishedAt: new Date(),
        publishedBy: adminUser.userId,
      });

      const secId = generateUuidV7();
      await dbClient.db.insert(schema.examSections).values({
        id: secId,
        examId: eventExamId,
        code: 'language_knowledge',
        title: 'Kiến thức ngôn ngữ',
        durationSec: 3600,
        orderIndex: 0,
      });

      await dbClient.db.insert(schema.examItems).values({
        id: generateUuidV7(),
        examId: eventExamId,
        sectionId: secId,
        questionId: eventQuestionId,
        orderIndex: 0,
      });

      // 2. Create examEvent with resultReleaseAt in the future (+2 hours)
      const eventId = generateUuidV7();
      const now = Date.now();
      await dbClient.db.insert(schema.examEvents).values({
        id: eventId,
        title: 'JLPT Grand Prix 2026',
        level: 'N2',
        opensAt: new Date(now - 3600000),
        startsAt: new Date(now - 1800000),
        endsAt: new Date(now + 3600000),
        resultReleaseAt: new Date(now + 7200000), // embargoed!
        capacity: 100,
        registeredCount: 1,
      });

      // 3. User submits attempt early
      const attemptId = generateUuidV7();
      await dbClient.db.insert(schema.examAttempts).values({
        id: attemptId,
        userId: studentNotCompleted.userId,
        examId: eventExamId,
        examVersion: 1,
        mode: 'real',
        status: 'submitted',
        leaseId: generateUuidV7(),
        attemptMonth: '2026-10-01',
        submittedAt: new Date(),
        result: {
          scoring: { total: 100 },
        },
      });

      // Link attempt to eventAttempts
      await dbClient.db.insert(schema.eventAttempts).values({
        id: generateUuidV7(),
        eventId,
        attemptId,
        userId: studentNotCompleted.userId,
      });

      // 4. User tries to view discussion while event results are EMBARGOED -> 403 Forbidden!
      await expect(
        communityController.listQuestionDiscussions(eventQuestionId, studentNotCompleted),
      ).rejects.toMatchObject({
        response: {
          code: 'FORBIDDEN',
        },
      });

      // User tries to post comment while embargoed -> 403 Forbidden!
      await expect(
        communityController.postQuestionComment(eventQuestionId, studentNotCompleted, {
          content: 'Lộ đáp án sớm trong kỳ thi đang diễn ra!',
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'FORBIDDEN',
        },
      });

      // 5. Result release time arrives (set timeline to the past so opensAt <= startsAt < endsAt <= resultReleaseAt <= now)
      const past = Date.now() - 10000;
      await dbClient.db
        .update(schema.examEvents)
        .set({
          opensAt: new Date(past - 4000),
          startsAt: new Date(past - 3000),
          endsAt: new Date(past - 2000),
          resultReleaseAt: new Date(past - 1000),
        })
        .where(eq(schema.examEvents.id, eventId));

      // Now discussion access is unlocked!
      const unlockedList = await communityController.listQuestionDiscussions(eventQuestionId, studentNotCompleted);
      expect(unlockedList.items).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // GAME-07: Chia sẻ thành tích cá nhân
  // ---------------------------------------------------------------------------
  describe('GAME-07: Chia sẻ thành tích cá nhân', () => {
    it('Creates anonymous shareable achievement link', async () => {
      const achievementId = generateUuidV7();
      const share = await communityController.shareAchievement(studentCompleted, {
        achievementId,
      });

      expect(share.shareUrl).toBeDefined();
      expect(share.shareUrl).toMatch(/^\/share\/achievements\/[a-f0-9]+$/);

      const [record] = await dbClient.db
        .select()
        .from(schema.achievementShares)
        .where(eq(schema.achievementShares.userId, studentCompleted.userId));
      expect(record).toBeDefined();
    });
  });
});
