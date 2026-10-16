import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import {
  blueprints,
  blueprintVersions,
  examAttempts,
  exams,
  examVersions,
  questions,
  users,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';

function mockUser(userId: string): AuthUserContext {
  return {
    userId,
    email: `stats-${userId}@jlpt.local`,
    name: 'Stats Student',
    role: 'student',
    sessionId: 'test-session-id',
    sessionToken: 'test-session-token',
    emailVerified: true,
    tenantId: 'default',
  };
}

describe('L05: Stats & Readiness Module Tests (PLAN-12, Acceptance 3, Analytics)', () => {
  let dbClient: DbClientInstance;
  let statsService: StatsService;
  let statsController: StatsController;

  const testUserId = generateUuidV7();
  let examId: string;
  let blueprintId: string;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    // 1. Create test user
    await dbClient.db.insert(users).values({
      id: testUserId,
      email: `stats-${testUserId}@jlpt.local`,
      name: 'Stats Learner',
      role: 'user',
    });

    // 2. Create blueprint & version
    blueprintId = generateUuidV7();
    await dbClient.db.insert(blueprints).values({
      id: blueprintId,
      level: 'N3',
      version: 1,
      kind: 'synthetic',
      status: 'active',
      effectiveFrom: '2026-01-01',
      sourceRef: {},
      sections: [{ code: 'language_vocab', title: 'Kiến thức ngôn ngữ', durationSec: 1800 }],
      scoring: {
        method: 'linear_reference',
        maxScore: 180,
        passingScore: 95,
        scoringSections: [
          { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['vocabulary', 'grammar', 'reading'], maxScaled: 120, minPass: 38 },
          { code: 'listening', label: 'Nghe hiểu', skills: ['listening'], maxScaled: 60, minPass: 19 },
        ],
      },
    });

    await dbClient.db.insert(blueprintVersions).values({
      blueprintId,
      version: 1,
      sections: [],
      scoring: {
        method: 'linear_reference',
        maxScore: 180,
        passingScore: 95,
      },
      changedBy: testUserId,
    });

    // 3. Create exam & published version
    examId = generateUuidV7();
    await dbClient.db.insert(exams).values({
      id: examId,
      slug: `exam-test-${examId.slice(0, 8)}`,
      level: 'N3',
      title: 'Đề thi thử JLPT N3 Chuẩn hóa',
      kind: 'mock',
      totalQuestions: 100,
      publishedVersion: 1,
    });

    await dbClient.db.insert(examVersions).values({
      examId,
      version: 1,
      snapshotKey: `exams/${examId}/v1/snapshot.json`,
      manifestKey: `exams/${examId}/v1/manifest.json`,
      blueprintId,
      blueprintVersion: 1,
      scoring: { method: 'linear_reference' },
      totalQuestions: 100,
      publishedAt: new Date(),
      publishedBy: testUserId,
    });

    statsService = new StatsService(dbClient);
    statsController = new StatsController(statsService);
  });

  afterEach(async () => {
    await dbClient.close();
  });

  // ---------------------------------------------------------------------------
  // Acceptance 3: No-data readiness không bịa kết quả (PLAN-12)
  // ---------------------------------------------------------------------------
  describe('Acceptance 3 & PLAN-12: No-data readiness không bịa kết quả', () => {
    it('returns isCalibrated = false with prominent disclaimer and wide confidence interval when user has 0 exam attempts', async () => {
      const readiness = await statsController.getReadiness(
        mockUser(testUserId),
        { targetLevel: 'N3' },
      );

      // Verification: Zero attempts MUST NOT claim calibration or fake confidence
      expect(readiness.isCalibrated).toBe(false);
      expect(readiness.status).toBe('UNCALIBRATED_ESTIMATE');
      expect(readiness.sampleExamsCount).toBe(0);
      expect(readiness.marginOfError).toBe(0.2); // Conservative margin of error (±20%)
      expect(readiness.disclaimer).toContain(
        'Ước lượng chưa được hiệu chỉnh do thiếu dữ liệu lịch sử làm bài',
      );

      const [lower, upper] = readiness.confidenceInterval;
      expect(upper - lower).toBeGreaterThanOrEqual(0.25); // Wide uncertainty range!
    });

    it('remains uncalibrated when user has only 1 or 2 exam attempts (< 3 minimum threshold)', async () => {
      // Insert 2 completed full exam attempts
      for (let i = 0; i < 2; i++) {
        await dbClient.db.insert(examAttempts).values({
          id: generateUuidV7(),
          userId: testUserId,
          examId,
          examVersion: 1,
          mode: 'real',
          status: 'submitted',
          leaseId: generateUuidV7(),
          attemptMonth: '2026-10-01',
          result: {
            totalScaledScore: 110,
            isPassed: true,
            totalQuestions: 100,
          },
        });
      }

      const readiness = await statsController.getReadiness(
        mockUser(testUserId),
        { targetLevel: 'N3' },
      );

      // Still insufficient (<3 attempts), must remain uncalibrated
      expect(readiness.isCalibrated).toBe(false);
      expect(readiness.status).toBe('UNCALIBRATED_ESTIMATE');
      expect(readiness.sampleExamsCount).toBe(2);
      expect(readiness.disclaimer).toContain('Ước lượng chưa được hiệu chỉnh');
    });

    it('switches to CALIBRATED status with narrow confidence interval once user completes >= 3 full exams', async () => {
      // Insert 3 completed full exam attempts
      for (let i = 0; i < 3; i++) {
        await dbClient.db.insert(examAttempts).values({
          id: generateUuidV7(),
          userId: testUserId,
          examId,
          examVersion: 1,
          mode: 'real',
          status: 'submitted',
          leaseId: generateUuidV7(),
          attemptMonth: '2026-10-01',
          result: {
            totalScaledScore: 125,
            isPassed: true,
            totalQuestions: 100,
          },
        });
      }

      const readiness = await statsController.getReadiness(
        mockUser(testUserId),
        { targetLevel: 'N3' },
      );

      // Calibrated threshold reached!
      expect(readiness.isCalibrated).toBe(true);
      expect(readiness.status).toBe('CALIBRATED');
      expect(readiness.sampleExamsCount).toBe(3);
      expect(readiness.marginOfError).toBeLessThanOrEqual(0.08); // Tight calibrated margin!
      expect(readiness.disclaimer).toContain('Xác suất đỗ được hiệu chuẩn');
    });
  });

  // ---------------------------------------------------------------------------
  // Analytics & Incremental Aggregates (STAT-09, STAT-12, STAT-13, STAT-14)
  // ---------------------------------------------------------------------------
  describe('Analytics & Incremental Aggregates', () => {
    it('records question answers and incrementally updates skill accuracy and question difficulty stats', async () => {
      const qId = generateUuidV7();
      await dbClient.db.insert(questions).values({
        id: qId,
        level: 'N3',
        skill: 'vocabulary',
        mondaiType: 'mondai_1',
        origin: 'JLPT-2024-07',
      });

      // 1. First user answer: Correct
      await statsService.recordQuestionAnswer(testUserId, {
        questionId: qId,
        isCorrect: true,
        skill: 'vocabulary',
      });

      let diff = await statsService.getQuestionDifficultyStats(qId);
      expect(diff).not.toBeNull();
      expect(diff!.totalAttempts).toBe(1);
      expect(diff!.correctAttempts).toBe(1);
      expect(diff!.difficultyIndex).toBe(0); // 100% correct -> difficulty 0

      // 2. Second user answer: Incorrect
      await statsService.recordQuestionAnswer(testUserId, {
        questionId: qId,
        isCorrect: false,
        skill: 'vocabulary',
      });

      diff = await statsService.getQuestionDifficultyStats(qId);
      expect(diff!.totalAttempts).toBe(2);
      expect(diff!.correctAttempts).toBe(1);
      expect(diff!.difficultyIndex).toBe(50); // 1 out of 2 correct -> difficulty 50
    });

    it('records answer change events (STAT-12)', async () => {
      const qId = generateUuidV7();
      await dbClient.db.insert(questions).values({
        id: qId,
        level: 'N3',
        skill: 'vocabulary',
        mondaiType: 'mondai_1',
        origin: 'JLPT-2024-07',
      });

      await statsService.recordAnswerChange({
        questionId: qId,
        changedFrom: 1,
        changedTo: 3,
      });
      // Succeeds without foreign key error
    });

    it('generates complete analytics report including readiness, speed-accuracy, and progress comparisons (GET /me/analytics)', async () => {
      const report = await statsController.getAnalytics(
        mockUser(testUserId),
        'N3',
      );

      expect(report.userId).toBe(testUserId);
      expect(report.readiness).toBeDefined();
      expect(report.readiness.isCalibrated).toBe(false); // No data readiness rule
      expect(report.speedAccuracy).toBeDefined();
      expect(report.answerChanges).toBeDefined();
      expect(report.unseenProgress).toBeDefined();
      expect(report.trueProgress).toBeDefined();
      expect(report.generatedAt).toBeDefined();
    });
  });
});
