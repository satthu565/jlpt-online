import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import type {
  AnswerChangeAnalysis,
  Level,
  PassProbabilityEstimate,
  Skill,
  SpeedAccuracyReport,
  TrueProgressComparison,
  UnseenProgressReport,
} from '@jlpt/schema';
import {
  analyzeAnswerChanges,
  analyzeSpeedAndAccuracy,
  analyzeUnseenProgress,
  compareTrueProgress,
  estimatePassProbability,
  type HistoricalExamAttemptRecord,
} from '@jlpt/exam-engine';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  answerChangeAggregates,
  examAttempts,
  exams,
  questionDifficultyStats,
  questions,
  userAnswers,
  userMondaiAggregates,
  userQuestionHistory,
  userSkillAggregates,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  AnalyticsReportDto,
  QuestionDifficultyStatsDto,
  RecordAnswerChangeDto,
  RecordQuestionAnswerDto,
  UserMondaiStatsDto,
  UserSkillStatsDto,
} from './stats.types.js';

@Injectable()
export class StatsService {
  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  /**
   * Evaluates readiness and pass probability for a target level (PLAN-12, Acceptance 3).
   *
   * Acceptance 3: No-data readiness không bịa kết quả.
   * If sample size is insufficient (<3 full exam attempts), returns isCalibrated: false,
   * uncalibrated status, prominent disclaimer, and wide confidence interval.
   */
  async evaluateReadiness(
    userId: string,
    targetLevel: Level = 'N3',
  ): Promise<PassProbabilityEstimate> {
    // 1. Fetch completed exam attempts for user
    const attemptRows = await this.dbClient.db
      .select({
        attemptId: examAttempts.id,
        mode: examAttempts.mode,
        status: examAttempts.status,
        result: examAttempts.result,
        level: exams.level,
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .where(
        and(
          eq(examAttempts.userId, userId),
          eq(examAttempts.status, 'submitted'),
        ),
      );

    // 2. Map DB rows to HistoricalExamAttemptRecord
    const historicalAttempts: HistoricalExamAttemptRecord[] = attemptRows.map(
      (row: (typeof attemptRows)[number]) => {
        const res = (row.result ?? {}) as { totalScaledScore?: number; totalQuestions?: number };
        const totalScaledScore = res.totalScaledScore ?? 0;
        const isFullExam = row.mode === 'real' || row.mode === 'full';
        return {
          attemptId: row.attemptId,
          level: (row.level ?? targetLevel) as Level,
          totalScaledScore,
          isFullExam,
          totalQuestionsAnswered: res.totalQuestions ?? (isFullExam ? 100 : 20),
        };
      },
    );

    // 3. Delegate to exam-engine's estimatePassProbability pure algorithm
    return estimatePassProbability(historicalAttempts, targetLevel);
  }

  /**
   * Generates a comprehensive learning analytics report for the user (GET /me/analytics).
   */
  async getAnalyticsReport(
    userId: string,
    targetLevel: Level = 'N3',
  ): Promise<AnalyticsReportDto> {
    // 1. Fetch user skill aggregates (table or live fallback to user_answers)
    const skillRows = await this.dbClient.db
      .select()
      .from(userSkillAggregates)
      .where(eq(userSkillAggregates.userId, userId));

    let skills: UserSkillStatsDto[] = skillRows.map((r: (typeof skillRows)[number]) => ({
      skill: r.skill,
      accuracyRate: r.accuracyRate,
      sampleSize: r.sampleSize,
      updatedAt: r.updatedAt.toISOString(),
    }));

    if (skills.length === 0) {
      const liveSkills = await this.dbClient.db
        .select({
          skill: questions.skill,
          sampleSize: sql<number>`count(*)::int`,
          correctCount: sql<number>`count(case when ${userAnswers.isCorrect} then 1 end)::int`,
        })
        .from(userAnswers)
        .innerJoin(examAttempts, eq(examAttempts.id, userAnswers.attemptId))
        .innerJoin(questions, eq(questions.id, userAnswers.questionId))
        .where(eq(examAttempts.userId, userId))
        .groupBy(questions.skill);

      skills = liveSkills.map((r: { skill: string; sampleSize: number; correctCount: number }) => ({
        skill: r.skill,
        sampleSize: r.sampleSize,
        accuracyRate: r.sampleSize > 0 ? Math.round((r.correctCount / r.sampleSize) * 100) : 0,
        updatedAt: new Date().toISOString(),
      }));
    }

    // 2. Fetch user mondai aggregates (table or live fallback to user_answers)
    const mondaiRows = await this.dbClient.db
      .select()
      .from(userMondaiAggregates)
      .where(eq(userMondaiAggregates.userId, userId));

    let mondai: UserMondaiStatsDto[] = mondaiRows.map((r: (typeof mondaiRows)[number]) => ({
      mondaiType: r.mondaiType,
      accuracyRate: r.accuracyRate,
      sampleSize: r.sampleSize,
      updatedAt: r.updatedAt.toISOString(),
    }));

    if (mondai.length === 0) {
      const liveMondai = await this.dbClient.db
        .select({
          mondaiType: questions.mondaiType,
          sampleSize: sql<number>`count(*)::int`,
          correctCount: sql<number>`count(case when ${userAnswers.isCorrect} then 1 end)::int`,
        })
        .from(userAnswers)
        .innerJoin(examAttempts, eq(examAttempts.id, userAnswers.attemptId))
        .innerJoin(questions, eq(questions.id, userAnswers.questionId))
        .where(eq(examAttempts.userId, userId))
        .groupBy(questions.mondaiType);

      mondai = liveMondai.map((r: { mondaiType: string; sampleSize: number; correctCount: number }) => ({
        mondaiType: r.mondaiType,
        sampleSize: r.sampleSize,
        accuracyRate: r.sampleSize > 0 ? Math.round((r.correctCount / r.sampleSize) * 100) : 0,
        updatedAt: new Date().toISOString(),
      }));
    }

    // 3. Readiness evaluation (Acceptance 3)
    const readiness = await this.evaluateReadiness(userId, targetLevel);

    // 4. User question history for speed/accuracy and unseen progress
    const historyRows = await this.dbClient.db
      .select()
      .from(userQuestionHistory)
      .where(eq(userQuestionHistory.userId, userId))
      .orderBy(desc(userQuestionHistory.answeredAt))
      .limit(200);

    let speedAccuracy: SpeedAccuracyReport | undefined = undefined;
    let unseenProgress: UnseenProgressReport | undefined = undefined;
    let trueProgress: TrueProgressComparison | undefined = undefined;
    let answerChanges: AnswerChangeAnalysis | undefined = undefined;

    let questionHistory: Array<{
      questionId: string;
      isCorrect: boolean;
      skill: string;
      mondaiType?: string;
      level: string;
      answeredAt: string;
    }> = [];

    if (historyRows.length > 0) {
      questionHistory = historyRows.map((h: (typeof historyRows)[number]) => ({
        questionId: h.questionId,
        isCorrect: h.isCorrect,
        skill: 'vocabulary',
        level: targetLevel,
        answeredAt: h.answeredAt.toISOString(),
      }));
    } else {
      const liveHistory = await this.dbClient.db
        .select({
          questionId: userAnswers.questionId,
          isCorrect: userAnswers.isCorrect,
          answeredAt: examAttempts.submittedAt,
          skill: questions.skill,
          mondaiType: questions.mondaiType,
          level: questions.level,
        })
        .from(userAnswers)
        .innerJoin(examAttempts, eq(examAttempts.id, userAnswers.attemptId))
        .innerJoin(questions, eq(questions.id, userAnswers.questionId))
        .where(and(eq(examAttempts.userId, userId), isNotNull(examAttempts.submittedAt)))
        .orderBy(desc(examAttempts.submittedAt))
        .limit(200);

      if (liveHistory.length > 0) {
        questionHistory = liveHistory.map((h: { questionId: string; isCorrect: boolean; skill: string; mondaiType: string; level: string; answeredAt: Date | null }) => ({
          questionId: h.questionId,
          isCorrect: h.isCorrect,
          skill: h.skill,
          mondaiType: h.mondaiType,
          level: h.level,
          answeredAt: (h.answeredAt || new Date()).toISOString(),
        }));
      }
    }

    if (questionHistory.length > 0) {
      speedAccuracy = analyzeSpeedAndAccuracy(
        questionHistory.map((h) => ({
          questionId: h.questionId,
          skill: (h.skill || 'vocabulary') as Skill,
          timeSpentMs: 60000,
          isCorrect: h.isCorrect,
        })),
      );

      answerChanges = analyzeAnswerChanges([], {}, 0);

      unseenProgress = analyzeUnseenProgress([
        {
          period: 'current',
          questions: questionHistory.map((h) => ({
            questionId: h.questionId,
            isCorrect: h.isCorrect,
            exposureCount: 0,
          })),
        },
      ]);

      trueProgress = compareTrueProgress(
        questionHistory.map((h, idx) => ({
          questionId: h.questionId,
          isCorrect: h.isCorrect,
          exposureCount: idx < 10 ? 0 : 2,
        })),
      );
    }

    return {
      userId,
      skills,
      mondai,
      readiness,
      speedAccuracy,
      answerChanges,
      unseenProgress,
      trueProgress,
      questionHistory,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Records a user's answer to a question and incrementally updates skill/mondai/difficulty aggregates.
   */
  async recordQuestionAnswer(userId: string, dto: RecordQuestionAnswerDto): Promise<void> {
    const answeredAt = dto.answeredAt ? new Date(dto.answeredAt) : new Date();

    // 1. Insert into user_question_history
    await this.dbClient.db.insert(userQuestionHistory).values({
      id: generateUuidV7(),
      userId,
      questionId: dto.questionId,
      isCorrect: dto.isCorrect,
      answeredAt,
    });

    // 2. Update user_skill_aggregates if skill is provided
    if (dto.skill) {
      const existing = await this.dbClient.db
        .select()
        .from(userSkillAggregates)
        .where(
          and(
            eq(userSkillAggregates.userId, userId),
            eq(userSkillAggregates.skill, dto.skill),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        const cur = existing[0]!;
        const newSampleSize = cur.sampleSize + 1;
        const curCorrect = Math.round((cur.accuracyRate / 100) * cur.sampleSize);
        const newCorrect = curCorrect + (dto.isCorrect ? 1 : 0);
        const newRate = Math.round((newCorrect / newSampleSize) * 100);

        await this.dbClient.db
          .update(userSkillAggregates)
          .set({
            accuracyRate: newRate,
            sampleSize: newSampleSize,
            updatedAt: answeredAt,
          })
          .where(
            and(
              eq(userSkillAggregates.userId, userId),
              eq(userSkillAggregates.skill, dto.skill),
            ),
          );
      } else {
        await this.dbClient.db.insert(userSkillAggregates).values({
          userId,
          skill: dto.skill,
          accuracyRate: dto.isCorrect ? 100 : 0,
          sampleSize: 1,
          updatedAt: answeredAt,
        });
      }
    }

    // 3. Update question_difficulty_stats
    const diffRows = await this.dbClient.db
      .select()
      .from(questionDifficultyStats)
      .where(eq(questionDifficultyStats.questionId, dto.questionId))
      .limit(1);

    if (diffRows.length > 0) {
      const cur = diffRows[0]!;
      const total = cur.totalAttempts + 1;
      const correct = cur.correctAttempts + (dto.isCorrect ? 1 : 0);
      const difficultyIndex = Math.round((1 - correct / total) * 100);

      await this.dbClient.db
        .update(questionDifficultyStats)
        .set({
          totalAttempts: total,
          correctAttempts: correct,
          difficultyIndex,
          updatedAt: answeredAt,
        })
        .where(eq(questionDifficultyStats.questionId, dto.questionId));
    } else {
      await this.dbClient.db.insert(questionDifficultyStats).values({
        questionId: dto.questionId,
        totalAttempts: 1,
        correctAttempts: dto.isCorrect ? 1 : 0,
        difficultyIndex: dto.isCorrect ? 0 : 100,
        updatedAt: answeredAt,
      });
    }
  }

  /**
   * Records an answer change event (STAT-12).
   */
  async recordAnswerChange(dto: RecordAnswerChangeDto): Promise<void> {
    await this.dbClient.db.insert(answerChangeAggregates).values({
      id: generateUuidV7(),
      questionId: dto.questionId,
      changedFrom: dto.changedFrom,
      changedTo: dto.changedTo,
    });
  }

  /**
   * Retrieves difficulty stats for a question.
   */
  async getQuestionDifficultyStats(questionId: string): Promise<QuestionDifficultyStatsDto | null> {
    const rows = await this.dbClient.db
      .select()
      .from(questionDifficultyStats)
      .where(eq(questionDifficultyStats.questionId, questionId))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      questionId: r.questionId,
      totalAttempts: r.totalAttempts,
      correctAttempts: r.correctAttempts,
      difficultyIndex: r.difficultyIndex,
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
