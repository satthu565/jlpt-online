import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { CommunityService } from './community.service.js';
import { CommunityController } from './community.controller.js';

function makeUser(id: string, role: 'student' | 'moderator' | 'admin' = 'student'): AuthUserContext {
  return {
    userId: id,
    email: `${id}@test.jlpt.local`,
    name: `User ${id}`,
    role: role as any,
    sessionId: `session-${id}`,
    sessionToken: `token-${id}`,
    emailVerified: true,
  };
}

describe('A02: Community Module Tests (GAME-07..09, Acceptance 4: Discussion chỉ sau completion và moderation)', () => {
  let dbClient: DbClientInstance;
  let communityService: CommunityService;
  let communityController: CommunityController;

  const studentCompleted = makeUser('student-completed');
  const studentNotCompleted = makeUser('student-not-completed');
  const moderatorUser = makeUser('moderator-user', 'moderator');
  const adminUser = makeUser('admin-user', 'admin');

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
      section: 'language_vocab',
    });

    questionId = generateUuidV7();
    await dbClient.db.insert(schema.questions).values({
      id: questionId,
      groupId,
      mondai: 1,
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

    await dbClient.db.insert(schema.examVersions).values({
      id: generateUuidV7(),
      examId,
      version: 1,
      schemaVersion: '1.0.0',
      contentHash: 'hash-comm',
      totalItems: 1,
      publishedAt: new Date(),
      scoring: {},
    });

    // Link question to examItems
    await dbClient.db.insert(schema.examItems).values({
      id: generateUuidV7(),
      examId,
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
      expect(listAfter.items[0]?.content).toContain('に従って');
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
