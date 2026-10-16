import crypto from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
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
  MixConfigSchema,
  type MixConfig,
  type GeneratedExam,
  type Level,
  type Blueprint,
  type MondaiType,
  type Skill,
} from '@jlpt/schema';
import {
  generateMixedExam as generateMixedExamEngine,
  PoolShortageError,
  type CandidateGroup,
} from '@jlpt/exam-engine';
import { LicenseService } from '../license/license.service.js';
import { PracticeService } from './practice.service.js';

@Injectable()
export class MixService {
  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly licenseService: LicenseService,
    private readonly practiceService: PracticeService,
  ) {}

  /**
   * Helper to retrieve or construct a blueprint for mixed exam generation.
   */
  private async getBlueprint(level: Level, version?: number): Promise<Blueprint> {
    const db = this.dbClient.db;

    const bpRows = await db
      .select()
      .from(schema.blueprints)
      .where(
        and(
          eq(schema.blueprints.level, level),
          version ? eq(schema.blueprints.version, version) : undefined,
          eq(schema.blueprints.status, 'active'),
        ),
      )
      .limit(1);

    if (bpRows.length > 0) {
      const row = bpRows[0]!;
      return {
        level: row.level as Level,
        version: row.version,
        kind: row.kind as 'synthetic' | 'official',
        status: row.status as 'active',
        isOfficial: row.isOfficial,
        isConfirmed: row.isConfirmed,
        effectiveFrom: row.effectiveFrom,
        sourceRef: row.sourceRef as any,
        note: row.note ?? undefined,
        sections: row.sections as any,
        scoring: row.scoring as any,
      };
    }

    // Default synthetic blueprint structure if no DB blueprint exists
    return {
      level,
      version: 1,
      kind: 'synthetic',
      status: 'active',
      isOfficial: false,
      isConfirmed: true,
      effectiveFrom: '2026-10',
      sourceRef: [{ url: 'https://jlpt.jp', accessedAt: '2026-10-01' }],
      sections: [
        {
          code: 'language_vocab',
          title: 'Kiến thức ngôn ngữ',
          durationSec: 1800,
          mondai: [
            {
              type: 'kanji_reading' as MondaiType,
              skill: 'kanji' as Skill,
              questionCount: 4,
            },
            {
              type: 'contextual' as MondaiType,
              skill: 'vocabulary' as Skill,
              questionCount: 4,
            },
          ],
        },
      ],
      scoring: {
        method: 'linear_reference' as const,
        rounding: 'round' as const,
        scoringSections: [
          {
            code: 'language_vocab',
            label: 'Kiến thức ngôn ngữ',
            skills: ['kanji' as const, 'vocabulary' as const],
            maxScaled: 60,
            minPass: 19,
          },
        ],
        totalMax: 60,
        totalPass: 19,
      },
    };
  }

  /**
   * Generates a mixed exam based on MixConfig (MIX-13..MIX-17).
   */
  async generateMixedExam(
    userId: string,
    rawConfig: unknown,
  ): Promise<GeneratedExam> {
    const config = MixConfigSchema.parse(rawConfig);
    const db = this.dbClient.db;

    // Load pool from DB
    const pool = await this.practiceService.loadCandidateGroups(userId, config.level, {
      skills: config.skills,
      mondaiTypes: config.mondaiTypes,
      sourceIds: config.sourceSessions,
      difficultyRange: config.difficultyRange,
    });

    const blueprint = await this.getBlueprint(config.level, config.blueprintVersion);

    try {
      const result = generateMixedExamEngine({
        blueprint,
        config,
        pool,
        now: new Date(),
        engineVersion: '1.0.0',
      });

      const generatedExamId = generateUuidV7();
      const examId = generateUuidV7();
      const now = new Date();

      // 1. Insert into generated_exams (MIX-13)
      await db.insert(schema.generatedExams).values({
        id: generatedExamId,
        ownerId: userId,
        configJson: config,
        seed: String(result.generatedExam.seed),
        engineVersion: result.generatedExam.engineVersion,
        selectionHash: result.generatedExam.configHash,
        createdAt: now,
      });

      // 2. Insert into generated_exam_items & update question_exposures (QB-18)
      let orderIndex = 0;
      const allSelectedQuestions: Array<{ id: string; correctOption: number }> = [];

      for (const g of result.selectedGroups) {
        for (const q of g.questions) {
          await db.insert(schema.generatedExamItems).values({
            generatedExamId,
            questionId: q.id,
            orderIndex,
          });

          const [ans] = await db
            .select()
            .from(schema.correctAnswers)
            .where(eq(schema.correctAnswers.questionId, q.id))
            .limit(1);

          allSelectedQuestions.push({
            id: q.id,
            correctOption: ans?.correctOption ?? 1,
          });

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

      // 3. Create backing exam record
      const durationSec = 3600; // default 60 mins
      const title = `Đề trộn ${config.level} (${allSelectedQuestions.length} câu)`;

      await db.insert(schema.exams).values({
        id: examId,
        slug: `mixed-${generatedExamId}`,
        title,
        description: `Đề thi trộn tự động (chế độ ${config.mode})`,
        level: config.level,
        kind: 'mixed',
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
              code: 'mixed_section',
              title: 'Phần thi trộn',
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
        code: 'mixed_section',
        title: 'Phần thi trộn',
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
        skills: allSelectedQuestions.map(() => config.skills[0] || 'mixed'),
        mondaiTypes: allSelectedQuestions.map(() => 'mixed_mondai'),
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
   * MIX-15: One-click quick mix exam generation.
   */
  async quickMix(userId: string, level?: Level): Promise<GeneratedExam> {
    const targetLevel = level || 'N5';
    const config: MixConfig = {
      level: targetLevel,
      sourceSessions: [],
      sourceWeights: {},
      skills: ['kanji', 'vocabulary'],
      mondaiTypes: ['kanji_reading', 'contextual'],
      mode: 'Random',
      blueprintVersion: 1,
      seed: Math.floor(Math.random() * 2147483647),
    };

    return this.generateMixedExam(userId, config);
  }

  /**
   * MIX-13: Lists generated exams created by the user.
   */
  async listGeneratedExams(userId: string) {
    const db = this.dbClient.db;

    const items = await db
      .select({
        id: schema.generatedExams.id,
        seed: schema.generatedExams.seed,
        engineVersion: schema.generatedExams.engineVersion,
        createdAt: schema.generatedExams.createdAt,
        config: schema.generatedExams.configJson,
      })
      .from(schema.generatedExams)
      .where(eq(schema.generatedExams.ownerId, userId))
      .orderBy(desc(schema.generatedExams.createdAt));

    return { items };
  }

  /**
   * MIX-13: Gets details of a generated exam without answer keys.
   */
  async getGeneratedExam(userId: string, id: string) {
    const db = this.dbClient.db;

    const [gen] = await db
      .select()
      .from(schema.generatedExams)
      .where(and(eq(schema.generatedExams.id, id), eq(schema.generatedExams.ownerId, userId)))
      .limit(1);

    if (!gen) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy đề thi đã sinh.',
      });
    }

    const items = await db
      .select({
        questionId: schema.generatedExamItems.questionId,
        orderIndex: schema.generatedExamItems.orderIndex,
      })
      .from(schema.generatedExamItems)
      .where(eq(schema.generatedExamItems.generatedExamId, id))
      .orderBy(schema.generatedExamItems.orderIndex);

    return {
      id: gen.id,
      seed: Number.parseInt(gen.seed, 10),
      engineVersion: gen.engineVersion,
      createdAt: gen.createdAt.toISOString(),
      config: gen.configJson,
      totalQuestions: items.length,
      items,
    };
  }

  /**
   * MIX-14: Re-generates a mixed/practice exam using saved configuration.
   */
  async regenerateExam(
    userId: string,
    generatedExamId: string,
    newSeed?: number,
  ): Promise<GeneratedExam> {
    const saved = await this.getGeneratedExam(userId, generatedExamId);
    const config = saved.config as Record<string, unknown>;

    const seedToUse = newSeed ?? Math.floor(Math.random() * 2147483647);
    const updatedConfig = { ...config, seed: seedToUse };

    if ('mode' in config) {
      return this.generateMixedExam(userId, updatedConfig);
    } else {
      return this.practiceService.generatePracticeExam(userId, updatedConfig);
    }
  }

  /**
   * MIX-17: Shares a generated exam via link.
   * Acceptance 2: Chia sẻ đề không vượt license và owner scope.
   */
  async shareExam(
    userId: string,
    generatedExamId: string,
    expiresAt?: Date,
  ): Promise<{ token: string; shareUrl: string; expiresAt: string }> {
    const db = this.dbClient.db;

    // 1. Verify owner scope
    const [gen] = await db
      .select()
      .from(schema.generatedExams)
      .where(and(eq(schema.generatedExams.id, generatedExamId), eq(schema.generatedExams.ownerId, userId)))
      .limit(1);

    if (!gen) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Chỉ chủ sở hữu của đề thi mới được phép tạo liên kết chia sẻ.',
      });
    }

    // 2. Verify licensing of all questions included in this exam
    const items = await db
      .select({
        questionId: schema.generatedExamItems.questionId,
        groupId: schema.questions.groupId,
        licenseId: schema.questionGroups.licenseId,
      })
      .from(schema.generatedExamItems)
      .innerJoin(schema.questions, eq(schema.generatedExamItems.questionId, schema.questions.id))
      .innerJoin(schema.questionGroups, eq(schema.questions.groupId, schema.questionGroups.id))
      .where(eq(schema.generatedExamItems.generatedExamId, generatedExamId));

    const licenseIds = [
      ...new Set(
        items
          .map((i: { questionId: string; groupId: string; licenseId: string | null }) => i.licenseId)
          .filter(Boolean),
      ),
    ] as string[];

    if (licenseIds.length > 0) {
      const now = new Date();
      const licenses = await db
        .select()
        .from(schema.contentLicenses)
        .where(inArray(schema.contentLicenses.id, licenseIds));

      for (const lic of licenses) {
        if (lic.revokedAt !== null) {
          throw new ForbiddenException({
            code: 'LICENSE_RESTRICTION',
            message: 'Nội dung trong đề thi có giấy phép đã bị thu hồi, không thể chia sẻ công khai.',
          });
        }
        if (lic.expiresAt !== null && lic.expiresAt <= now) {
          throw new ForbiddenException({
            code: 'LICENSE_RESTRICTION',
            message: 'Nội dung trong đề thi có giấy phép đã hết hạn, không thể chia sẻ công khai.',
          });
        }

        try {
          if (lic.terms) {
            const parsed = JSON.parse(lic.terms);
            const rights = parsed.rights || {};
            if (rights.remixAllowed === false || rights.displayAllowed === false) {
              throw new ForbiddenException({
                code: 'LICENSE_RESTRICTION',
                message: 'Nội dung trong đề thi có điều khoản cấm chia sẻ hoặc phối trộn.',
              });
            }
          }
        } catch (e) {
          if (e instanceof ForbiddenException) throw e;
        }
      }
    }

    // 3. Generate token & hash
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const finalExpiresAt = expiresAt ?? new Date(Date.now() + 7 * 86400000); // 7 days

    await db.insert(schema.examShares).values({
      id: generateUuidV7(),
      ownerId: userId,
      resourceType: 'generated_exam',
      resourceId: generatedExamId,
      tokenHash,
      expiresAt: finalExpiresAt,
      createdAt: new Date(),
    });

    return {
      token,
      shareUrl: `/shared-exams/${token}`,
      expiresAt: finalExpiresAt.toISOString(),
    };
  }

  /**
   * MIX-17: Resolves a shared exam link without exposing answer keys.
   */
  async getSharedExam(token: string) {
    const db = this.dbClient.db;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [share] = await db
      .select()
      .from(schema.examShares)
      .where(eq(schema.examShares.tokenHash, tokenHash))
      .limit(1);

    if (!share) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Liên kết chia sẻ không tồn tại hoặc đã bị xóa.',
      });
    }

    if (share.expiresAt <= new Date()) {
      throw new NotFoundException({
        code: 'SHARE_EXPIRED',
        message: 'Liên kết chia sẻ này đã hết hạn.',
      });
    }

    // Load generated exam and backing exam info
    const [gen] = await db
      .select()
      .from(schema.generatedExams)
      .where(eq(schema.generatedExams.id, share.resourceId))
      .limit(1);

    if (!gen) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy đề thi được chia sẻ.',
      });
    }

    const items = await db
      .select({ questionId: schema.generatedExamItems.questionId })
      .from(schema.generatedExamItems)
      .where(eq(schema.generatedExamItems.generatedExamId, gen.id));

    const config = gen.configJson as Record<string, unknown>;

    return {
      id: gen.id,
      title: `Đề thi chia sẻ (${config['level'] ?? 'JLPT'})`,
      level: config['level'] ?? 'N5',
      kind: 'mixed',
      totalQuestions: items.length,
      createdAt: gen.createdAt.toISOString(),
      expiresAt: share.expiresAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Question Marks (PRA-13, EXPL-10)
  // ---------------------------------------------------------------------------

  async markQuestion(userId: string, questionId: string, markType = 'review') {
    const db = this.dbClient.db;
    await db
      .insert(schema.questionMarks)
      .values({
        userId,
        questionId,
        markType,
        createdAt: new Date(),
      })
      .onConflictDoNothing();

    return { marked: true, questionId, markType };
  }

  async unmarkQuestion(userId: string, questionId: string, markType = 'review') {
    const db = this.dbClient.db;
    await db
      .delete(schema.questionMarks)
      .where(
        and(
          eq(schema.questionMarks.userId, userId),
          eq(schema.questionMarks.questionId, questionId),
          eq(schema.questionMarks.markType, markType),
        ),
      );

    return { marked: false, questionId };
  }

  async listMarkedQuestions(userId: string) {
    const db = this.dbClient.db;
    const items = await db
      .select({
        questionId: schema.questionMarks.questionId,
        markType: schema.questionMarks.markType,
        createdAt: schema.questionMarks.createdAt,
      })
      .from(schema.questionMarks)
      .where(eq(schema.questionMarks.userId, userId))
      .orderBy(desc(schema.questionMarks.createdAt));

    return { items };
  }

  // ---------------------------------------------------------------------------
  // Exam Favorites
  // ---------------------------------------------------------------------------

  async favoriteExam(userId: string, examId: string) {
    const db = this.dbClient.db;
    await db
      .insert(schema.examFavorites)
      .values({
        userId,
        examId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();

    return { favorited: true, examId };
  }

  async unfavoriteExam(userId: string, examId: string) {
    const db = this.dbClient.db;
    await db
      .delete(schema.examFavorites)
      .where(
        and(
          eq(schema.examFavorites.userId, userId),
          eq(schema.examFavorites.examId, examId),
        ),
      );

    return { favorited: false, examId };
  }

  async listFavoriteExams(userId: string) {
    const db = this.dbClient.db;
    const items = await db
      .select({
        examId: schema.examFavorites.examId,
        createdAt: schema.examFavorites.createdAt,
      })
      .from(schema.examFavorites)
      .where(eq(schema.examFavorites.userId, userId))
      .orderBy(desc(schema.examFavorites.createdAt));

    return { items };
  }
}
