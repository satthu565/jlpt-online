import crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema.js';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  answerOptions,
  contentReviews,
  correctAnswers,
  examSources,
  importJobs,
  questionGroupVersions,
  questionGroups,
  questionVersions,
  questions,
} from '../../db/schema.js';

type DbTx = Parameters<Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]>[0];
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { assertNoAnswerLeak } from '@jlpt/schema';
import { LicenseService } from '../license/license.service.js';
import { MediaService } from '../media/media.service.js';
import type {
  CreateQuestionGroupDto,
  GroupSearchFilters,
  HideGroupDto,
  QuestionSearchFilters,
  ReviewDecisionDto,
  UpdateQuestionGroupDto,
} from './question-bank.types.js';

function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

@Injectable()
export class QuestionBankService {
  // In-memory cache to track last editor per group version
  private readonly groupLastEditors = new Map<string, string>();

  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly licenseService: LicenseService,
    private readonly mediaService: MediaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Question Groups & Questions CRUD (QB-01...QB-07, QB-15, ADM-05)
  // ---------------------------------------------------------------------------

  async createGroup(dto: CreateQuestionGroupDto, authorId: string) {
    if (!dto.questions || dto.questions.length === 0) {
      throw new BadRequestException('Nhóm câu hỏi phải chứa ít nhất 1 câu hỏi');
    }

    // Verify source & license if provided
    if (dto.sourceId) {
      await this.licenseService.getSource(dto.sourceId);
    }
    if (dto.licenseId) {
      await this.licenseService.getLicense(dto.licenseId);
    }

    const groupId = generateUuidV7();

    return this.dbClient.db.transaction(async (tx: DbTx) => {
      // 1. Insert question_groups
      const [group] = await tx
        .insert(questionGroups)
        .values({
          id: groupId,
          sourceId: dto.sourceId || null,
          licenseId: dto.licenseId || null,
          level: dto.level,
          sectionCode: dto.sectionCode,
          title: dto.title || null,
        })
        .returning();

      // 2. Insert question_group_versions (version 1, draft)
      const [groupVersion] = await tx
        .insert(questionGroupVersions)
        .values({
          groupId,
          version: 1,
          passage: dto.passage || [],
          audioSha256: dto.audioSha256 || null,
          status: 'draft',
        })
        .returning();

      // Track author as last editor for version 1 (QB-15)
      this.groupLastEditors.set(`${groupId}:1`, authorId);
      if (isValidUuid(authorId)) {
        try {
          await tx.insert(contentReviews).values({
            id: generateUuidV7(),
            targetType: 'group_version',
            targetId: groupId,
            targetVersion: 1,
            reviewerId: authorId,
            lastEditorId: authorId,
            status: 'draft',
            comments: 'Khởi tạo nhóm câu hỏi',
          });
        } catch {
          // Fall back gracefully if authorId not in users table
        }
      }

      // 3. Insert questions and version 1 for each question
      const createdQuestions: Array<Record<string, unknown>> = [];

      for (let i = 0; i < dto.questions.length; i++) {
        const qDto = dto.questions[i];
        if (!qDto) continue;
        const questionId = generateUuidV7();

        const [qRecord] = await tx
          .insert(questions)
          .values({
            id: questionId,
            groupId,
            level: dto.level,
            skill: qDto.skill,
            mondaiType: qDto.mondaiType,
            origin: qDto.origin || 'self_authored',
          })
          .returning();

        const [qVersion] = await tx
          .insert(questionVersions)
          .values({
            questionId,
            version: 1,
            stem: qDto.stem,
            explanation: qDto.explanation || null,
            status: 'draft',
          })
          .returning();

        // Answer options
        const createdOptions: Array<typeof answerOptions.$inferSelect> = [];
        for (const opt of qDto.options) {
          const [optRecord] = await tx
            .insert(answerOptions)
            .values({
              questionId,
              questionVersion: 1,
              orderIndex: opt.orderIndex,
              content: opt.content,
            })
            .returning();
          if (optRecord) {
            createdOptions.push(optRecord);
          }
        }

        // Correct answer
        const [correctRecord] = await tx
          .insert(correctAnswers)
          .values({
            questionId,
            questionVersion: 1,
            correctOption: qDto.correctOption,
            explanationNotes: null,
          })
          .returning();

        createdQuestions.push({
          ...qRecord,
          version: qVersion,
          options: createdOptions,
          correctAnswer: correctRecord,
        });
      }

      return {
        ...group,
        version: groupVersion,
        questions: createdQuestions,
      };
    });
  }

  /**
   * Acceptance 2: Sửa nội dung approved tạo phiên bản mới
   * If group version is draft/rejected -> update in place.
   * If group version is approved -> increment version, create new draft version,
   * preserving the existing approved version completely untouched!
   */
  async updateGroup(groupId: string, dto: UpdateQuestionGroupDto, editorId: string) {
    const existingGroup = await this.getGroupRaw(groupId);

    // Get latest version
    const latestVersions = await this.dbClient.db
      .select()
      .from(questionGroupVersions)
      .where(eq(questionGroupVersions.groupId, groupId))
      .orderBy(desc(questionGroupVersions.version))
      .limit(1);

    if (latestVersions.length === 0) {
      throw new NotFoundException(`Không tìm thấy phiên bản cho nhóm câu hỏi: ${groupId}`);
    }

    const currentVersion = latestVersions[0];

    // If approved or hidden, create NEW version (Acceptance 2, QB-13)
    if (currentVersion.status === 'approved' || currentVersion.status === 'hidden') {
      const nextVersionNum = currentVersion.version + 1;

      return this.dbClient.db.transaction(async (tx: DbTx) => {
        // Optional update group metadata
        if (dto.title !== undefined || dto.level !== undefined || dto.sectionCode !== undefined) {
          await tx
            .update(questionGroups)
            .set({
              title: dto.title ?? existingGroup.title,
              level: dto.level ?? existingGroup.level,
              sectionCode: dto.sectionCode ?? existingGroup.sectionCode,
              sourceId: dto.sourceId ?? existingGroup.sourceId,
              licenseId: dto.licenseId ?? existingGroup.licenseId,
            })
            .where(eq(questionGroups.id, groupId));
        }

        // Insert new group version row
        const [newGroupVersion] = await tx
          .insert(questionGroupVersions)
          .values({
            groupId,
            version: nextVersionNum,
            passage: dto.passage ?? currentVersion.passage,
            audioSha256: dto.audioSha256 ?? currentVersion.audioSha256,
            status: 'draft', // New version starts in draft
          })
          .returning();

        this.groupLastEditors.set(`${groupId}:${nextVersionNum}`, editorId);
        if (isValidUuid(editorId)) {
          try {
            await tx.insert(contentReviews).values({
              id: generateUuidV7(),
              targetType: 'group_version',
              targetId: groupId,
              targetVersion: nextVersionNum,
              reviewerId: editorId,
              lastEditorId: editorId,
              status: 'draft',
              comments: 'Cập nhật phiên bản mới',
            });
          } catch {
            // Fall back gracefully
          }
        }

        // Fetch existing questions
        const existingQRecords = await tx
          .select()
          .from(questions)
          .where(and(eq(questions.groupId, groupId), isNull(questions.deletedAt)));

        const updatedQuestions: Array<Record<string, unknown>> = [];

        if (dto.questions && dto.questions.length > 0) {
          for (let i = 0; i < dto.questions.length; i++) {
            const qDto = dto.questions[i];
            if (!qDto) continue;
            const matchingQ = existingQRecords[i];
            let qId = matchingQ?.id;

            if (!qId) {
              qId = generateUuidV7();
              await tx.insert(questions).values({
                id: qId,
                groupId,
                level: dto.level ?? existingGroup.level,
                skill: qDto.skill,
                mondaiType: qDto.mondaiType,
                origin: qDto.origin || 'self_authored',
              });
            }

            // Insert new question version
            const [newQVersion] = await tx
              .insert(questionVersions)
              .values({
                questionId: qId,
                version: nextVersionNum,
                stem: qDto.stem,
                explanation: qDto.explanation || null,
                status: 'draft',
              })
              .returning();

            // Insert answer options for new version
            const newOptions: Array<typeof answerOptions.$inferSelect> = [];
            for (const opt of qDto.options) {
              const [optRecord] = await tx
                .insert(answerOptions)
                .values({
                  questionId: qId,
                  questionVersion: nextVersionNum,
                  orderIndex: opt.orderIndex,
                  content: opt.content,
                })
                .returning();
              if (optRecord) {
                newOptions.push(optRecord);
              }
            }

            // Insert correct answer for new version
            const [newCorrect] = await tx
              .insert(correctAnswers)
              .values({
                questionId: qId,
                questionVersion: nextVersionNum,
                correctOption: qDto.correctOption,
                explanationNotes: null,
              })
              .returning();

            updatedQuestions.push({
              id: qId,
              version: newQVersion,
              options: newOptions,
              correctAnswer: newCorrect,
            });
          }
        }

        return {
          ...existingGroup,
          version: newGroupVersion,
          questions: updatedQuestions,
          isNewVersion: true,
        };
      });
    }

    // In-place update for draft / rejected versions
    return this.dbClient.db.transaction(async (tx: DbTx) => {
      // Update group version
      const [updatedGroupVersion] = await tx
        .update(questionGroupVersions)
        .set({
          passage: dto.passage ?? currentVersion.passage,
          audioSha256: dto.audioSha256 ?? currentVersion.audioSha256,
          status: 'draft', // Reset to draft if was rejected
        })
        .where(
          and(
            eq(questionGroupVersions.groupId, groupId),
            eq(questionGroupVersions.version, currentVersion.version),
          ),
        )
        .returning();

      this.groupLastEditors.set(`${groupId}:${currentVersion.version}`, editorId);
      if (isValidUuid(editorId)) {
        try {
          await tx.insert(contentReviews).values({
            id: generateUuidV7(),
            targetType: 'group_version',
            targetId: groupId,
            targetVersion: currentVersion.version,
            reviewerId: editorId,
            lastEditorId: editorId,
            status: 'draft',
            comments: 'Sửa đổi bản nháp',
          });
        } catch {
          // Fall back gracefully
        }
      }

      // If questions provided, update questions
      if (dto.questions && dto.questions.length > 0) {
        const existingQRecords = await tx
          .select()
          .from(questions)
          .where(and(eq(questions.groupId, groupId), isNull(questions.deletedAt)));

        for (let i = 0; i < dto.questions.length; i++) {
          const qDto = dto.questions[i];
          if (!qDto) continue;
          const existingQ = existingQRecords[i];
          if (existingQ) {
            await tx
              .update(questionVersions)
              .set({
                stem: qDto.stem,
                explanation: qDto.explanation || null,
                status: 'draft',
              })
              .where(
                and(
                  eq(questionVersions.questionId, existingQ.id),
                  eq(questionVersions.version, currentVersion.version),
                ),
              );

            // Replace options
            await tx
              .delete(answerOptions)
              .where(
                and(
                  eq(answerOptions.questionId, existingQ.id),
                  eq(answerOptions.questionVersion, currentVersion.version),
                ),
              );

            for (const opt of qDto.options) {
              await tx.insert(answerOptions).values({
                questionId: existingQ.id,
                questionVersion: currentVersion.version,
                orderIndex: opt.orderIndex,
                content: opt.content,
              });
            }

            // Replace correct answer
            await tx
              .delete(correctAnswers)
              .where(
                and(
                  eq(correctAnswers.questionId, existingQ.id),
                  eq(correctAnswers.questionVersion, currentVersion.version),
                ),
              );

            await tx.insert(correctAnswers).values({
              questionId: existingQ.id,
              questionVersion: currentVersion.version,
              correctOption: qDto.correctOption,
              explanationNotes: null,
            });
          }
        }
      }

      return {
        ...existingGroup,
        version: updatedGroupVersion,
        isNewVersion: false,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Review Workflow (Separation of duties: Reviewer != Last Editor)
  // ---------------------------------------------------------------------------

  async submitForReview(groupId: string, expectedVersion: number, editorId: string) {
    const versionRow = await this.getGroupVersion(groupId, expectedVersion);

    if (versionRow.status !== 'draft' && versionRow.status !== 'rejected') {
      throw new ConflictException(
        `Chỉ có thể gửi duyệt phiên bản ở trạng thái draft hoặc rejected (hiện tại: ${versionRow.status})`,
      );
    }

    this.groupLastEditors.set(`${groupId}:${expectedVersion}`, editorId);
    if (isValidUuid(editorId)) {
      try {
        await this.dbClient.db.insert(contentReviews).values({
          id: generateUuidV7(),
          targetType: 'group_version',
          targetId: groupId,
          targetVersion: expectedVersion,
          reviewerId: editorId,
          lastEditorId: editorId,
          status: 'submitted',
          comments: 'Nộp yêu cầu kiểm duyệt',
        });
      } catch {
        // Fall back gracefully
      }
    }

    const [updated] = await this.dbClient.db
      .update(questionGroupVersions)
      .set({ status: 'in_review' })
      .where(
        and(
          eq(questionGroupVersions.groupId, groupId),
          eq(questionGroupVersions.version, expectedVersion),
        ),
      )
      .returning();

    // Also update questions to in_review
    await this.updateQuestionsStatus(groupId, expectedVersion, 'in_review');

    return updated;
  }

  async reviewGroup(
    groupId: string,
    expectedVersion: number,
    decisionDto: ReviewDecisionDto,
    reviewerId: string,
  ) {
    const versionRow = await this.getGroupVersion(groupId, expectedVersion);

    if (versionRow.status !== 'in_review') {
      throw new ConflictException(
        `Chỉ có thể duyệt phiên bản đang ở trạng thái in_review (hiện tại: ${versionRow.status})`,
      );
    }

    // Server verification: Reviewer cannot be the last editor! (QB-15)
    let lastEditorId = this.groupLastEditors.get(`${groupId}:${expectedVersion}`);
    if (!lastEditorId) {
      try {
        const reviewLogs = await this.dbClient.db
          .select()
          .from(contentReviews)
          .where(
            and(
              eq(contentReviews.targetType, 'group_version'),
              eq(contentReviews.targetId, groupId),
              eq(contentReviews.targetVersion, expectedVersion),
            ),
          )
          .orderBy(desc(contentReviews.reviewedAt), desc(contentReviews.id))
          .limit(1);

        const recoveredEditor = reviewLogs[0]?.lastEditorId;
        if (recoveredEditor) {
          lastEditorId = recoveredEditor;
          this.groupLastEditors.set(`${groupId}:${expectedVersion}`, recoveredEditor);
        }
      } catch {
        // Fall back gracefully
      }
    }

    if (lastEditorId && lastEditorId === reviewerId) {
      throw new ForbiddenException(
        'Người duyệt không được là người sửa cuối cùng của nội dung này (vi phạm quy tắc kiểm duyệt độc lập)',
      );
    }

    const newStatus = decisionDto.decision === 'approved' ? 'approved' : 'rejected';

    const [updated] = await this.dbClient.db
      .update(questionGroupVersions)
      .set({ status: newStatus })
      .where(
        and(
          eq(questionGroupVersions.groupId, groupId),
          eq(questionGroupVersions.version, expectedVersion),
        ),
      )
      .returning();

    // Update questions status
    await this.updateQuestionsStatus(groupId, expectedVersion, newStatus);

    // Insert record in content_reviews
    const reviewId = generateUuidV7();
    await this.dbClient.db.insert(contentReviews).values({
      id: reviewId,
      targetType: 'group_version',
      targetId: groupId,
      targetVersion: expectedVersion,
      reviewerId,
      lastEditorId: lastEditorId || reviewerId,
      status: newStatus,
      comments: decisionDto.comment || null,
    });

    return {
      success: true,
      status: newStatus,
      version: updated,
    };
  }

  // ---------------------------------------------------------------------------
  // Temporary Hiding (QB-13)
  // ---------------------------------------------------------------------------

  async hideGroup(groupId: string, dto: HideGroupDto, operatorUserId: string) {
    const latestVersions = await this.dbClient.db
      .select()
      .from(questionGroupVersions)
      .where(eq(questionGroupVersions.groupId, groupId))
      .orderBy(desc(questionGroupVersions.version))
      .limit(1);

    if (latestVersions.length === 0) {
      throw new NotFoundException(`Nhóm câu hỏi không tồn tại: ${groupId}`);
    }

    const currentVersion = latestVersions[0];

    const [updated] = await this.dbClient.db
      .update(questionGroupVersions)
      .set({ status: 'hidden' })
      .where(
        and(
          eq(questionGroupVersions.groupId, groupId),
          eq(questionGroupVersions.version, currentVersion.version),
        ),
      )
      .returning();

    await this.updateQuestionsStatus(groupId, currentVersion.version, 'hidden');

    return {
      success: true,
      status: 'hidden',
      reason: dto.reason,
      operator: operatorUserId,
      version: updated,
    };
  }

  // ---------------------------------------------------------------------------
  // Search & Filter (QB-11, QB-02, QB-03)
  // ---------------------------------------------------------------------------

  async searchQuestions(filters: QuestionSearchFilters) {
    const conditions: Array<SQL | undefined> = [isNull(questions.deletedAt)];

    if (filters.level) {
      conditions.push(eq(questions.level, filters.level));
    }
    if (filters.skill) {
      conditions.push(eq(questions.skill, filters.skill));
    }
    if (filters.mondaiType) {
      conditions.push(eq(questions.mondaiType, filters.mondaiType));
    }
    if (filters.status) {
      conditions.push(eq(questionVersions.status, filters.status));
    }

    return this.dbClient.db
      .select({
        questionId: questions.id,
        groupId: questions.groupId,
        level: questions.level,
        skill: questions.skill,
        mondaiType: questions.mondaiType,
        origin: questions.origin,
        version: questionVersions.version,
        stem: questionVersions.stem,
        status: questionVersions.status,
      })
      .from(questions)
      .innerJoin(questionVersions, eq(questions.id, questionVersions.questionId))
      .where(and(...conditions))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);
  }

  async searchGroups(filters: GroupSearchFilters) {
    const conditions: Array<SQL | undefined> = [isNull(questionGroups.deletedAt)];

    if (filters.level) {
      conditions.push(eq(questionGroups.level, filters.level));
    }
    if (filters.sectionCode) {
      conditions.push(eq(questionGroups.sectionCode, filters.sectionCode));
    }
    if (filters.sourceId) {
      conditions.push(eq(questionGroups.sourceId, filters.sourceId));
    }

    return this.dbClient.db
      .select({
        groupId: questionGroups.id,
        level: questionGroups.level,
        sectionCode: questionGroups.sectionCode,
        title: questionGroups.title,
        sourceId: questionGroups.sourceId,
        licenseId: questionGroups.licenseId,
        version: questionGroupVersions.version,
        status: questionGroupVersions.status,
        passage: questionGroupVersions.passage,
        audioSha256: questionGroupVersions.audioSha256,
      })
      .from(questionGroups)
      .innerJoin(
        questionGroupVersions,
        eq(questionGroups.id, questionGroupVersions.groupId),
      )
      .where(and(...conditions))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);
  }

  // ---------------------------------------------------------------------------
  // Public Preview & Answer Leak Protection
  // ---------------------------------------------------------------------------

  async getGroupPublicPreview(groupId: string, versionNum?: number) {
    const group = await this.getGroupRaw(groupId);

    let versionRow: typeof questionGroupVersions.$inferSelect;
    if (versionNum) {
      versionRow = await this.getGroupVersion(groupId, versionNum);
    } else {
      const versions = await this.dbClient.db
        .select()
        .from(questionGroupVersions)
        .where(
          and(
            eq(questionGroupVersions.groupId, groupId),
            eq(questionGroupVersions.status, 'approved'),
          ),
        )
        .orderBy(desc(questionGroupVersions.version))
        .limit(1);
      if (versions.length === 0 || !versions[0]) {
        throw new NotFoundException(
          `Không tìm thấy phiên bản đã duyệt (approved) cho nhóm câu hỏi: ${groupId}`,
        );
      }
      versionRow = versions[0];
    }

    // Fetch questions
    const qRecords = await this.dbClient.db
      .select()
      .from(questions)
      .where(and(eq(questions.groupId, groupId), isNull(questions.deletedAt)));

    const publicQuestions: Array<{
      index: number;
      questionId: string;
      number: string;
      stem: string;
      options: Array<{ label: string; content: string }>;
    }> = [];

    for (let idx = 0; idx < qRecords.length; idx++) {
      const q = qRecords[idx];
      const qvRows = await this.dbClient.db
        .select()
        .from(questionVersions)
        .where(
          and(
            eq(questionVersions.questionId, q.id),
            eq(questionVersions.version, versionRow.version),
          ),
        )
        .limit(1);

      const qv = qvRows[0];
      if (!qv) continue;

      // Options
      const optRows = await this.dbClient.db
        .select()
        .from(answerOptions)
        .where(
          and(
            eq(answerOptions.questionId, q.id),
            eq(answerOptions.questionVersion, versionRow.version),
          ),
        )
        .orderBy(answerOptions.orderIndex);

      publicQuestions.push({
        index: idx,
        questionId: q.id,
        number: `${idx + 1}`,
        stem: qv.stem,
        options: optRows.map((o: typeof answerOptions.$inferSelect) => ({
          label: `${o.orderIndex}`,
          content: o.content,
        })),
      });
    }

    const publicGroupDto = {
      groupId: group.id,
      version: versionRow.version,
      mondaiType: qRecords[0]?.mondaiType || 'kanji_reading',
      instructions: [{ t: 'text', text: group.title || '' }],
      passage: Array.isArray(versionRow.passage) ? versionRow.passage : null,
      media: versionRow.audioSha256 ? [versionRow.audioSha256] : [],
      questions: publicQuestions,
    };

    // Strictly enforce NO answer fields leaked to students/public!
    assertNoAnswerLeak(publicGroupDto);

    return publicGroupDto;
  }

  // ---------------------------------------------------------------------------
  // Acceptance 4: Import Idempotency by Checksum
  // ---------------------------------------------------------------------------

  async importPackage(packageBuffer: Buffer, fileName: string, uploadedByUserId: string) {
    const packageSha256 = crypto.createHash('sha256').update(packageBuffer).digest('hex');

    // 1. Check existing import jobs with identical checksum
    const existingSuccessful = await this.dbClient.db
      .select()
      .from(importJobs)
      .where(
        and(
          eq(importJobs.packageSha256, packageSha256),
          eq(importJobs.status, 'succeeded'),
        ),
      )
      .limit(1);

    if (existingSuccessful.length > 0) {
      // Idempotent: return existing record without duplicate insertions
      return {
        idempotent: true,
        jobId: existingSuccessful[0].id,
        status: existingSuccessful[0].status,
        packageSha256,
        message: 'Import trùng checksum idempotent',
      };
    }

    // 2. Validate zip archive (Zip-Slip, Zip-Bomb, media magic bytes)
    const files = this.mediaService.validateAndExtractZip(packageBuffer);

    if (!files['import.json']) {
      throw new BadRequestException('Gói nhập thiếu tệp import.json ở thư mục gốc');
    }

    const jsonStr = files['import.json'].toString('utf8');
    interface ImportPackageJson {
      packageId?: string;
      revision?: number;
      source?: {
        slug?: string;
        level?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
        provenance?: 'past_exam' | 'self_authored' | 'licensed_partner' | 'community';
      };
      exam?: { level?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5' };
      groups?: Array<{
        sectionCode?: string;
        title?: string;
        passage?: unknown[];
        audioSha256?: string;
        mondaiType?: string;
        questions?: Array<{
          skill?: 'kanji' | 'vocabulary' | 'grammar' | 'reading' | 'listening';
          stem?: unknown;
          explanation?: string;
          options?: Array<{ label?: string; content?: unknown }>;
          correctOption?: number;
        }>;
      }>;
    }
    let importData: ImportPackageJson;
    try {
      importData = JSON.parse(jsonStr) as ImportPackageJson;
    } catch {
      throw new BadRequestException('import.json không phải là JSON UTF-8 hợp lệ');
    }

    const packageId = importData.packageId || generateUuidV7();
    const revision = importData.revision || 1;

    // Check for conflicting revision with different content checksum
    const conflictingJob = await this.dbClient.db
      .select()
      .from(importJobs)
      .where(
        and(
          sql`error_log->>'packageId' = ${packageId}`,
          sql`error_log->>'revision' = ${String(revision)}`,
        ),
      )
      .limit(1);

    if (
      conflictingJob.length > 0 &&
      conflictingJob[0] &&
      conflictingJob[0].packageSha256 !== packageSha256
    ) {
      throw new ConflictException(
        `IDEMPOTENCY_CONFLICT: Gói nhập cùng packageId (${packageId}) và revision (${revision}) nhưng có checksum khác nhau`,
      );
    }

    // 3. License verification if source specified
    let sourceId: string | undefined;
    if (importData.source?.slug) {
      const srcList = await this.dbClient.db
        .select()
        .from(examSources)
        .where(eq(examSources.slug, importData.source.slug))
        .limit(1);

      if (srcList.length > 0 && srcList[0]) {
        sourceId = srcList[0].id;
        // Verify source has active license
        await this.licenseService.enforcePublishable(sourceId);
      }
    }

    // 4. Create import job and records in database transaction
    const jobId = generateUuidV7();
    const targetLevel = importData.source?.level || importData.exam?.level || 'N5';

    await this.dbClient.db.transaction(async (tx: DbTx) => {
      // Insert import_jobs
      await tx.insert(importJobs).values({
        id: jobId,
        uploadedBy: uploadedByUserId,
        status: 'succeeded',
        packageSha256,
        fileName,
        targetLevel,
        errorLog: { packageId, revision },
      });

      // Insert media assets from ZIP
      for (const [filePath, content] of Object.entries(files)) {
        if (filePath.startsWith('media/') && !filePath.endsWith('/')) {
          await this.mediaService.uploadMedia(content, filePath);
        }
      }

      // Insert question groups if provided
      if (Array.isArray(importData.groups)) {
        for (const grp of importData.groups) {
          const groupId = generateUuidV7();
          await tx.insert(questionGroups).values({
            id: groupId,
            sourceId: sourceId || null,
            licenseId: null,
            level: targetLevel,
            sectionCode: grp.sectionCode || 'language_vocab',
            title: grp.title || null,
          });

          await tx.insert(questionGroupVersions).values({
            groupId,
            version: 1,
            passage: grp.passage || [],
            audioSha256: grp.audioSha256 || null,
            status: 'draft',
          });

          if (Array.isArray(grp.questions)) {
            for (const q of grp.questions) {
              const qId = generateUuidV7();
              await tx.insert(questions).values({
                id: qId,
                groupId,
                level: targetLevel,
                skill: q.skill || 'vocabulary',
                mondaiType: grp.mondaiType || 'contextual',
                origin: importData.source?.provenance || 'self_authored',
              });

              await tx.insert(questionVersions).values({
                questionId: qId,
                version: 1,
                stem: q.stem || [{ t: 'text', text: '' }],
                explanation: q.explanation || null,
                status: 'draft',
              });

              if (Array.isArray(q.options)) {
                for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
                  const opt = q.options[oIdx];
                  if (!opt) continue;
                  await tx.insert(answerOptions).values({
                    questionId: qId,
                    questionVersion: 1,
                    orderIndex: oIdx + 1,
                    content: opt.content || [{ t: 'text', text: opt.label || '' }],
                  });
                }
              }

              if (q.correctOption) {
                await tx.insert(correctAnswers).values({
                  questionId: qId,
                  questionVersion: 1,
                  correctOption: q.correctOption,
                  explanationNotes: null,
                });
              }
            }
          }
        }
      }
    });

    return {
      idempotent: false,
      jobId,
      status: 'succeeded',
      packageSha256,
    };
  }

  /**
   * QB-01: Admin get group by ID with its latest version and questions.
   */
  async getGroup(groupId: string) {
    const group = await this.getGroupRaw(groupId);

    const latestVersions = await this.dbClient.db
      .select()
      .from(questionGroupVersions)
      .where(eq(questionGroupVersions.groupId, groupId))
      .orderBy(desc(questionGroupVersions.version))
      .limit(1);

    if (latestVersions.length === 0 || !latestVersions[0]) {
      throw new NotFoundException(`Không tìm thấy phiên bản cho nhóm câu hỏi: ${groupId}`);
    }

    const currentVersion = latestVersions[0];

    const qRecords = await this.dbClient.db
      .select()
      .from(questions)
      .where(and(eq(questions.groupId, groupId), isNull(questions.deletedAt)));

    const questionDetails: Array<Record<string, unknown>> = [];

    for (const q of qRecords) {
      const qvRows = await this.dbClient.db
        .select()
        .from(questionVersions)
        .where(
          and(
            eq(questionVersions.questionId, q.id),
            eq(questionVersions.version, currentVersion.version),
          ),
        )
        .limit(1);

      const opts = await this.dbClient.db
        .select()
        .from(answerOptions)
        .where(
          and(
            eq(answerOptions.questionId, q.id),
            eq(answerOptions.questionVersion, currentVersion.version),
          ),
        )
        .orderBy(answerOptions.orderIndex);

      const correct = await this.dbClient.db
        .select()
        .from(correctAnswers)
        .where(
          and(
            eq(correctAnswers.questionId, q.id),
            eq(correctAnswers.questionVersion, currentVersion.version),
          ),
        )
        .limit(1);

      questionDetails.push({
        ...q,
        version: qvRows[0] || null,
        options: opts,
        correctAnswer: correct[0] || null,
      });
    }

    return {
      ...group,
      version: currentVersion,
      questions: questionDetails,
    };
  }

  /**
   * QB-01: Soft-deletes a question group and its questions.
   */
  async deleteGroup(groupId: string, _deletedByUserId: string): Promise<void> {
    await this.getGroupRaw(groupId);

    const now = new Date();
    await this.dbClient.db.transaction(async (tx: DbTx) => {
      await tx
        .update(questionGroups)
        .set({ deletedAt: now })
        .where(eq(questionGroups.id, groupId));

      await tx
        .update(questions)
        .set({ deletedAt: now })
        .where(eq(questions.groupId, groupId));
    });
  }

  /**
   * QB-04, QB-17: List immutable version history of a question group.
   */
  async listGroupVersions(groupId: string): Promise<{ items: Array<typeof questionGroupVersions.$inferSelect> }> {
    await this.getGroupRaw(groupId);

    const versions = await this.dbClient.db
      .select()
      .from(questionGroupVersions)
      .where(eq(questionGroupVersions.groupId, groupId))
      .orderBy(desc(questionGroupVersions.version));

    return { items: versions };
  }

  // ---------------------------------------------------------------------------
  // Helper methods
  // ---------------------------------------------------------------------------

  private async getGroupRaw(groupId: string) {
    const records = await this.dbClient.db
      .select()
      .from(questionGroups)
      .where(and(eq(questionGroups.id, groupId), isNull(questionGroups.deletedAt)))
      .limit(1);

    if (records.length === 0) {
      throw new NotFoundException(`Nhóm câu hỏi không tồn tại: ${groupId}`);
    }
    return records[0];
  }

  private async getGroupVersion(groupId: string, version: number) {
    const records = await this.dbClient.db
      .select()
      .from(questionGroupVersions)
      .where(
        and(
          eq(questionGroupVersions.groupId, groupId),
          eq(questionGroupVersions.version, version),
        ),
      )
      .limit(1);

    if (records.length === 0) {
      throw new NotFoundException(
        `Không tìm thấy phiên bản ${version} của nhóm câu hỏi: ${groupId}`,
      );
    }
    return records[0];
  }

  private async updateQuestionsStatus(groupId: string, version: number, status: string) {
    const qList = await this.dbClient.db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.groupId, groupId));

    for (const q of qList) {
      await this.dbClient.db
        .update(questionVersions)
        .set({ status })
        .where(
          and(
            eq(questionVersions.questionId, q.id),
            eq(questionVersions.version, version),
          ),
        );
    }
  }
}
