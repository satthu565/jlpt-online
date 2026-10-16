import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import {
  PracticeConfigSchema,
  type PracticeConfig,
  type GeneratedExam,
  type Level,
  type MondaiType,
  type Skill,
} from '@jlpt/schema';
import {
  generatePracticeExam as generatePracticeExamEngine,
  PoolShortageError,
  type CandidateGroup,
  type CandidateQuestion,
  type CandidateGroupLicense,
} from '@jlpt/exam-engine';
import { LicenseService } from '../license/license.service.js';

@Injectable()
export class PracticeService {
  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly licenseService: LicenseService,
  ) {}

  /**
   * Loads candidate question groups from the database for the given level and user.
   */
  async loadCandidateGroups(
    userId: string,
    level: Level,
    options?: {
      skills?: Skill[];
      mondaiTypes?: MondaiType[];
      sourceIds?: string[];
      tagIds?: string[];
      difficultyRange?: [number, number];
    },
  ): Promise<CandidateGroup[]> {
    const db = this.dbClient.db;

    // 1. Fetch question groups for this level
    const groupConditions = [
      eq(schema.questionGroups.level, level),
      isNull(schema.questionGroups.deletedAt),
    ];

    if (options?.sourceIds && options.sourceIds.length > 0) {
      groupConditions.push(inArray(schema.questionGroups.sourceId, options.sourceIds));
    }

    const groups = await db
      .select()
      .from(schema.questionGroups)
      .where(and(...groupConditions));

    if (groups.length === 0) {
      return [];
    }

    const groupIds = groups.map((g: { id: string }) => g.id);

    // 2. Fetch approved versions for these groups
    const groupVersions = await db
      .select()
      .from(schema.questionGroupVersions)
      .where(
        and(
          inArray(schema.questionGroupVersions.groupId, groupIds),
          eq(schema.questionGroupVersions.status, 'approved'),
        ),
      );

    const approvedGroupIds = new Set(groupVersions.map((gv: { groupId: string }) => gv.groupId));

    // 3. Fetch questions belonging to these groups
    const qList = await db
      .select()
      .from(schema.questions)
      .where(
        and(
          inArray(schema.questions.groupId, groupIds),
          isNull(schema.questions.deletedAt),
        ),
      );

    if (qList.length === 0) {
      return [];
    }

    const questionIds = qList.map((q: { id: string }) => q.id);

    // 4. Fetch approved question versions
    const qVersions = await db
      .select()
      .from(schema.questionVersions)
      .where(
        and(
          inArray(schema.questionVersions.questionId, questionIds),
          eq(schema.questionVersions.status, 'approved'),
        ),
      );

    // 5. Fetch correct answers
    const answers = await db
      .select()
      .from(schema.correctAnswers)
      .where(inArray(schema.correctAnswers.questionId, questionIds));

    // 6. Fetch user exposures
    const exposures = await db
      .select()
      .from(schema.questionExposures)
      .where(
        and(
          eq(schema.questionExposures.userId, userId),
          inArray(schema.questionExposures.questionId, questionIds),
        ),
      );
    const exposureMap = new Map<string, number>(
      exposures.map((e: { questionId: string; exposureCount: number }) => [e.questionId, Number(e.exposureCount)]),
    );

    // 7. Fetch user question marks
    const marks = await db
      .select()
      .from(schema.questionMarks)
      .where(
        and(
          eq(schema.questionMarks.userId, userId),
          inArray(schema.questionMarks.questionId, questionIds),
        ),
      );
    const markSet = new Set(marks.map((m: { questionId: string }) => m.questionId));

    // 8. Fetch user question history (for wrong count)
    const history = await db
      .select()
      .from(schema.userQuestionHistory)
      .where(
        and(
          eq(schema.userQuestionHistory.userId, userId),
          inArray(schema.userQuestionHistory.questionId, questionIds),
        ),
      );
    const wrongMap = new Map<string, number>(
      history.map((h: { questionId: string; wrongCount: number }) => [h.questionId, Number(h.wrongCount)]),
    );

    // 9. Fetch licenses
    const licenseIds = [...new Set(groups.map((g: { licenseId: string | null }) => g.licenseId).filter(Boolean))] as string[];
    const licenses = licenseIds.length > 0
      ? await db
          .select()
          .from(schema.contentLicenses)
          .where(inArray(schema.contentLicenses.id, licenseIds))
      : [];

    const licenseMap = new Map<string, CandidateGroupLicense>(
      licenses.map((lic: typeof schema.contentLicenses.$inferSelect) => {
        let rights = { remixAllowed: true, displayAllowed: true };
        try {
          if (lic.terms) {
            const parsed = JSON.parse(lic.terms);
            if (parsed.rights) rights = parsed.rights;
          }
        } catch {
          // ignore
        }
        return [
          lic.id,
          {
            licenseId: lic.id,
            remixAllowed: rights.remixAllowed ?? true,
            displayAllowed: rights.displayAllowed ?? true,
            expiresAt: lic.expiresAt ? lic.expiresAt.toISOString() : undefined,
          },
        ];
      }),
    );

    // 10. Assemble CandidateGroup objects
    const candidateGroups: CandidateGroup[] = [];

    for (const group of groups) {
      const isApproved = approvedGroupIds.has(group.id);
      const groupQuestions = qList.filter((q: { groupId: string | null }) => q.groupId === group.id);
      if (groupQuestions.length === 0) continue;

      const candidateQuestions: CandidateQuestion[] = [];
      let groupWrongCount = 0;
      let groupMaxExposure = 0;
      let groupIsMarked = false;

      for (const q of groupQuestions) {
        const hasAns = answers.some((a: { questionId: string }) => a.questionId === q.id);
        if (!hasAns) continue;

        const exposureCount: number = exposureMap.get(q.id) ?? 0;
        const isMarked: boolean = markSet.has(q.id);
        const wrongCount: number = wrongMap.get(q.id) ?? 0;

        if (exposureCount > groupMaxExposure) groupMaxExposure = exposureCount;
        if (isMarked) groupIsMarked = true;
        groupWrongCount += wrongCount;

        candidateQuestions.push({
          id: q.id,
          exposureCount,
          isMarked,
          wrongCount,
          difficulty: 0.5,
        });
      }

      if (candidateQuestions.length === 0) continue;

      const firstQ = groupQuestions[0]!;
      const lic = group.licenseId ? licenseMap.get(group.licenseId) : undefined;

      candidateGroups.push({
        groupId: group.id,
        sourceSession: group.sourceId || 'default-source',
        sourceId: group.sourceId || undefined,
        level: group.level as Level,
        sectionCode: group.sectionCode || 'language_vocab',
        mondaiType: firstQ.mondaiType as MondaiType,
        skill: firstQ.skill as Skill,
        questions: candidateQuestions,
        questionCount: candidateQuestions.length,
        passage: group.passage ?? undefined,
        hasMedia: Boolean(group.audioSha256),
        isApproved,
        hasAnswerKeys: true,
        license: lic,
        maxExposure: groupMaxExposure,
        totalWrongCount: groupWrongCount,
        isMarked: groupIsMarked,
        averageDifficulty: 0.5,
      });
    }

    return candidateGroups;
  }

  /**
   * Generates a practice exam based on PracticeConfig (PRA-10..PRA-17).
   */
  async generatePracticeExam(
    userId: string,
    rawConfig: unknown,
  ): Promise<GeneratedExam> {
    const config = PracticeConfigSchema.parse(rawConfig);
    const db = this.dbClient.db;

    // Load pool from DB
    const pool = await this.loadCandidateGroups(userId, config.level, {
      skills: config.skills,
      mondaiTypes: config.mondaiTypes,
      sourceIds: config.sourceIds,
      tagIds: config.tagIds,
      difficultyRange: config.difficultyRange,
    });

    try {
      const result = generatePracticeExamEngine({
        config,
        pool,
        now: new Date(),
        engineVersion: '1.0.0',
      });

      const generatedExamId = generateUuidV7();
      const examId = generateUuidV7();
      const now = new Date();

      // 1. Insert into generated_exams
      await db.insert(schema.generatedExams).values({
        id: generatedExamId,
        ownerId: userId,
        configJson: config,
        seed: String(result.generatedExam.seed),
        engineVersion: result.generatedExam.engineVersion,
        selectionHash: result.generatedExam.configHash,
        createdAt: now,
      });

      // 2. Insert into generated_exam_items & update question_exposures (QB-18, PRA-12)
      let orderIndex = 0;
      const allSelectedQuestions: Array<{ id: string; correctOption: number }> = [];

      for (const g of result.selectedGroups) {
        for (const q of g.questions) {
          await db.insert(schema.generatedExamItems).values({
            generatedExamId,
            questionId: q.id,
            orderIndex,
          });

          // Fetch correct answer for exam answer key
          const [ans] = await db
            .select()
            .from(schema.correctAnswers)
            .where(eq(schema.correctAnswers.questionId, q.id))
            .limit(1);

          allSelectedQuestions.push({
            id: q.id,
            correctOption: ans?.correctOption ?? 1,
          });

          // Increment question exposure for user
          await db
            .insert(schema.questionExposures)
            .values({
              userId,
              questionId: q.id,
              exposureCount: 1,
              lastExposedAt: now,
            })
            .onConflictDoUpdate({
              target: [schema.questionExposures.userId, schema.questionExposures.questionId],
              set: {
                exposureCount: sql`${schema.questionExposures.exposureCount} + 1`,
                lastExposedAt: now,
              },
            });

          orderIndex++;
        }
      }

      // 3. Create backing exam record so user can take attempt immediately
      const durationSec = config.timeLimitSec || 1800; // default 30 mins
      const title = `Luyện tập ${config.level} - ${config.skills.join(', ')} (${result.selectedGroups.reduce((acc, g) => acc + g.questionCount, 0)} câu)`;

      await db.insert(schema.exams).values({
        id: examId,
        slug: `practice-${generatedExamId}`,
        title,
        description: `Đề luyện tập sinh tự động: ${config.pool}`,
        level: config.level,
        kind: 'practice',
        year: now.getFullYear(),
        session: '7',
        totalQuestions: allSelectedQuestions.length,
        publishedVersion: 1,
        createdAt: now,
        updatedAt: now,
      });

      // Find or create blueprint for this level
      let [bp] = await db
        .select({ id: schema.blueprints.id })
        .from(schema.blueprints)
        .where(eq(schema.blueprints.level, config.level))
        .limit(1);

      let bpId = bp?.id;
      if (!bpId) {
        bpId = generateUuidV7();
        await db.insert(schema.blueprints).values({
          id: bpId,
          level: config.level,
          version: 1,
          kind: 'synthetic',
          status: 'active',
          isOfficial: false,
          isConfirmed: true,
          effectiveFrom: '2026-10',
          sourceRef: [{ provider: 'self', label: 'JLPT Synthetic' }],
          sections: [],
          scoring: { sections: [], totalMax: 60, passingTotal: 19 },
        });
      }

      await db.insert(schema.examVersions).values({
        examId,
        version: 1,
        snapshotKey: `exams/${examId}/v1/snapshot.json`,
        manifestKey: `exams/${examId}/v1/manifest.json`,
        blueprintId: bpId,
        blueprintVersion: 1,
        scoring: {
          sections: [
            {
              code: 'practice_section',
              title: 'Luyện tập',
              maxScaled: 60,
              weight: 1.0,
            },
          ],
        },
        totalQuestions: allSelectedQuestions.length,
        publishedAt: now,
        publishedBy: userId,
      });

      const sectionId = generateUuidV7();
      await db.insert(schema.examSections).values({
        id: sectionId,
        examId,
        code: 'practice_section',
        title: 'Phần luyện tập',
        durationSec,
        orderIndex: 0,
        passingScore: null,
      });

      for (let i = 0; i < allSelectedQuestions.length; i++) {
        const sq = allSelectedQuestions[i]!;
        await db.insert(schema.examItems).values({
          id: generateUuidV7(),
          examId,
          sectionId,
          questionId: sq.id,
          orderIndex: i,
          itemWeight: 1,
        });
      }

      await db.insert(schema.examAnswerKeys).values({
        examId,
        version: 1,
        keys: allSelectedQuestions.map((sq) => sq.correctOption),
        skills: allSelectedQuestions.map(() => config.skills[0] || 'general'),
        mondaiTypes: allSelectedQuestions.map(() => 'practice_mondai'),
        sectionRanges: [[0, Math.max(0, allSelectedQuestions.length - 1)]],
      });

      return {
        id: generatedExamId,
        examId,
        version: 1,
        seed: result.generatedExam.seed,
        engineVersion: result.generatedExam.engineVersion,
        configHash: result.generatedExam.configHash,
        selectionGroupIds: result.generatedExam.selectionGroupIds,
        sourceSummary: result.sourceSummary,
        warnings: result.warnings,
        blueprintConformant: result.generatedExam.blueprintConformant,
      };
    } catch (err: unknown) {
      if (
        (err instanceof Error && (err.name === 'PoolShortageError' || 'shortages' in err)) ||
        (typeof PoolShortageError === 'function' && err instanceof PoolShortageError)
      ) {
        const anyErr = err as unknown as Record<string, unknown>;
        throw new UnprocessableEntityException({
          code: 'POOL_SHORTAGE',
          message: (err as Error).message,
          shortages: anyErr['shortages'],
        });
      }
      throw err;
    }
  }

  /**
   * PRA-17: Lists in-progress practice sessions for continuing.
   */
  async listInProgressPractice(userId: string) {
    const db = this.dbClient.db;

    const attempts = await db
      .select({
        attemptId: schema.examAttempts.id,
        examId: schema.examAttempts.examId,
        examVersion: schema.examAttempts.examVersion,
        startedAt: schema.examAttempts.startedAt,
        status: schema.examAttempts.status,
        mode: schema.examAttempts.mode,
        title: schema.exams.title,
        level: schema.exams.level,
        totalQuestions: schema.exams.totalQuestions,
      })
      .from(schema.examAttempts)
      .innerJoin(schema.exams, eq(schema.examAttempts.examId, schema.exams.id))
      .where(
        and(
          eq(schema.examAttempts.userId, userId),
          eq(schema.examAttempts.mode, 'practice'),
          eq(schema.examAttempts.status, 'in_progress'),
        ),
      )
      .orderBy(desc(schema.examAttempts.startedAt));

    const items = [];
    for (const a of attempts) {
      const [sheet] = await db
        .select()
        .from(schema.attemptAnswerSheets)
        .where(eq(schema.attemptAnswerSheets.attemptId, a.attemptId));

      const answeredCount = sheet?.answers?.filter((val: number) => val > 0).length ?? 0;

      items.push({
        id: a.attemptId,
        examId: a.examId,
        title: a.title,
        level: a.level,
        startedAt: a.startedAt.toISOString(),
        answeredCount,
        totalQuestions: a.totalQuestions,
        lastSeq: sheet?.lastSeq ?? 0,
      });
    }

    return { items };
  }
}
