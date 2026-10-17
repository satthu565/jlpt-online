import fs from 'node:fs';
import path from 'node:path';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import {
  calculateStandardExamResult,
  REFERENCE_SCORING_DISCLAIMER,
  type StandardExamResultOptions,
} from '@jlpt/exam-engine';
import type { BlueprintScoring, ExamAnswerKey, Result } from '@jlpt/schema';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { getRepoRoot } from '../../common/utils/paths.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

type DbTx = Parameters<Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]>[0];

interface CachedExamScoringData {
  answerKey: ExamAnswerKey;
  scoring: BlueprintScoring;
}

@Injectable()
export class ScoringService {
  private readonly cache = new Map<string, CachedExamScoringData>();

  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  /**
   * Loads or fetches cached exam answer key and scoring configuration.
   */
  async getExamScoringData(examId: string, version: number, tx?: DbTx): Promise<CachedExamScoringData> {
    const cacheKey = `${examId}:v${version}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const db = tx || this.dbClient.db;

    // Fetch exam version for scoring config
    const [ev] = await db
      .select()
      .from(schema.examVersions)
      .where(and(eq(schema.examVersions.examId, examId), eq(schema.examVersions.version, version)))
      .limit(1);

    if (!ev) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Không tìm thấy phiên bản đề thi ${examId} v${version}`,
      });
    }

    // Fetch answer key from exam_answer_keys table
    const [akRow] = await db
      .select()
      .from(schema.examAnswerKeys)
      .where(and(eq(schema.examAnswerKeys.examId, examId), eq(schema.examAnswerKeys.version, version)))
      .limit(1);

    if (!akRow) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Không tìm thấy bảng đáp án (exam_answer_keys) của đề thi ${examId} v${version}`,
      });
    }

    // Also verify blueprint scoring if needed
    const [bpRow] = await db
      .select()
      .from(schema.blueprintVersions)
      .where(
        and(
          eq(schema.blueprintVersions.blueprintId, ev.blueprintId),
          eq(schema.blueprintVersions.version, ev.blueprintVersion),
        ),
      )
      .limit(1);

    let blueprintScoring = (bpRow?.scoring ?? ev.scoring) as BlueprintScoring;
    if (
      !blueprintScoring?.scoringSections ||
      !Array.isArray(blueprintScoring.scoringSections) ||
      blueprintScoring.scoringSections.length === 0
    ) {
      // Try to load from blueprint fixtures
      try {
        const repoRoot = getRepoRoot();
        const bpDir = path.join(repoRoot, 'packages/schema/fixtures/blueprints');
        const [examRow] = await db
          .select({ level: schema.exams.level })
          .from(schema.exams)
          .where(eq(schema.exams.id, examId))
          .limit(1);
        const levelStr = (examRow?.level || 'n5').toLowerCase();
        const bpFile = path.join(bpDir, `synthetic-${levelStr}.json`);
        if (fs.existsSync(bpFile)) {
          const bpData = JSON.parse(fs.readFileSync(bpFile, 'utf-8'));
          if (bpData?.scoring?.scoringSections) {
            blueprintScoring = bpData.scoring;
          }
        }
      } catch {
        // fallback below
      }

      // If still missing, fallback to standard scoring sections
      if (
        !blueprintScoring?.scoringSections ||
        !Array.isArray(blueprintScoring.scoringSections) ||
        blueprintScoring.scoringSections.length === 0
      ) {
        blueprintScoring = {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            {
              code: 'language_reading',
              label: 'Kiến thức ngôn ngữ & Đọc hiểu',
              skills: ['kanji', 'vocabulary', 'grammar', 'reading'],
              maxScaled: 120,
              minPass: 38,
            },
            {
              code: 'listening',
              label: 'Nghe hiểu',
              skills: ['listening'],
              maxScaled: 60,
              minPass: 19,
            },
          ],
          totalMax: 180,
          totalPass: 80,
        };
      }
    }

    const answerKey: ExamAnswerKey = {
      examId: akRow.examId,
      version: akRow.version,
      keys: akRow.keys,
      skills: akRow.skills as ExamAnswerKey['skills'],
      mondaiTypes: akRow.mondaiTypes as ExamAnswerKey['mondaiTypes'],
      sectionRanges: akRow.sectionRanges as [number, number][],
    };

    const data: CachedExamScoringData = {
      answerKey,
      scoring: blueprintScoring,
    };

    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * Scores an attempt using standard linear reference scaling.
   */
  async scoreAttempt(
    examId: string,
    version: number,
    answers: number[],
    options?: StandardExamResultOptions,
    tx?: DbTx,
  ): Promise<Result> {
    const { answerKey, scoring } = await this.getExamScoringData(examId, version, tx);

    const result = calculateStandardExamResult(answers, answerKey, scoring, options);

    // Ensure disclaimer is set
    if (!result.scoring.disclaimer) {
      result.scoring.disclaimer = REFERENCE_SCORING_DISCLAIMER;
    }

    return result;
  }
}
