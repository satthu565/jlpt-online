import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { ExplanationDraftSchema, type ExplanationDraft } from '@jlpt/schema';
import { extractPlainTextFromRichText } from '../import/explanation-parser.js';
import { OutboxService, type DbTx } from '../outbox/outbox.service.js';
import { LicenseService } from '../license/license.service.js';
import type { ReviewDecisionDto, ReviewTargetType } from './review.types.js';

export interface CreateReportInput {
  questionId: string;
  explanationId?: string;
  issueType: 'wrong_answer' | 'confusing_explanation' | 'typo' | 'audio_issue' | 'other' | string;
  description: string;
}

@Injectable()
export class ReviewService {
  // In-memory cache for fast editor tracking: `${targetType}:${targetId}:${targetVersion}` -> editorUserId
  private readonly targetLastEditors = new Map<string, string>();

  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly outboxService: OutboxService,
    @Optional() private readonly licenseService?: LicenseService,
  ) {}

  // ---------------------------------------------------------------------------
  // Content Review & Approval (B01)
  // ---------------------------------------------------------------------------

  /**
   * Records the last editor for a specific content target version.
   */
  recordEditor(targetType: ReviewTargetType, targetId: string, version: number, editorId: string): void {
    this.targetLastEditors.set(`${targetType}:${targetId}:${version}`, editorId);
  }

  /**
   * Retrieves the recorded last editor for a specific target version.
   */
  async getLastEditor(targetType: ReviewTargetType, targetId: string, version: number): Promise<string | null> {
    const key = `${targetType}:${targetId}:${version}`;
    const cached = this.targetLastEditors.get(key);
    if (cached) return cached;

    // 1. Search persistent content_reviews journal for prior recorded editor (draft or earlier review)
    const logs = await this.dbClient.db
      .select()
      .from(schema.contentReviews)
      .where(
        and(
          eq(schema.contentReviews.targetType, targetType),
          eq(schema.contentReviews.targetId, targetId),
          eq(schema.contentReviews.targetVersion, version),
        ),
      )
      .orderBy(desc(schema.contentReviews.reviewedAt), desc(schema.contentReviews.id))
      .limit(1);

    if (logs.length > 0 && logs[0]?.lastEditorId) {
      this.targetLastEditors.set(key, logs[0].lastEditorId);
      return logs[0].lastEditorId;
    }

    // 2. Search persistent import_artifacts joined with import_jobs for direct origin
    const artifactType =
      targetType === 'group_version'
        ? 'group'
        : targetType === 'question_version'
          ? 'question'
          : 'exam';

    const artifactRows = await this.dbClient.db
      .select({
        uploadedBy: schema.importJobs.uploadedBy,
      })
      .from(schema.importArtifacts)
      .innerJoin(schema.importJobs, eq(schema.importArtifacts.jobId, schema.importJobs.id))
      .where(
        and(
          eq(schema.importArtifacts.artifactType, artifactType),
          eq(schema.importArtifacts.storageKey, targetId),
        ),
      )
      .orderBy(desc(schema.importJobs.createdAt))
      .limit(1);

    if (artifactRows.length > 0 && artifactRows[0]?.uploadedBy) {
      this.targetLastEditors.set(key, artifactRows[0].uploadedBy);
      return artifactRows[0].uploadedBy;
    }

    // 3. Fallback for question_version: resolve parent group's editor
    if (targetType === 'question_version') {
      const q = await this.dbClient.db
        .select()
        .from(schema.questions)
        .where(eq(schema.questions.id, targetId))
        .limit(1);

      if (q[0]?.groupId) {
        const groupEditor = await this.getLastEditor('group_version', q[0].groupId, version);
        if (groupEditor) {
          this.targetLastEditors.set(key, groupEditor);
          return groupEditor;
        }
      }
    }

    // 4. Fallback for group_version: find import job linked to this group's source (filter by source slug, NO global limit 1)
    if (targetType === 'group_version') {
      const grp = await this.dbClient.db
        .select()
        .from(schema.questionGroups)
        .where(eq(schema.questionGroups.id, targetId))
        .limit(1);

      if (grp[0]?.sourceId) {
        const src = await this.dbClient.db
          .select()
          .from(schema.examSources)
          .where(eq(schema.examSources.id, grp[0].sourceId))
          .limit(1);

        if (src[0]?.slug) {
          const jobs = await this.dbClient.db.select().from(schema.importJobs);
          const matchingJob = jobs.find((j: typeof schema.importJobs.$inferSelect) => {
            const errLog = j.errorLog as Record<string, unknown> | null;
            return (
              errLog &&
              (errLog['packageId'] === src[0]!.slug ||
                errLog['examSlug'] === src[0]!.slug ||
                j.fileName.includes(src[0]!.slug))
            );
          });
          if (matchingJob?.uploadedBy) {
            this.targetLastEditors.set(key, matchingJob.uploadedBy);
            return matchingJob.uploadedBy;
          }
        }
      }
    }

    return null;
  }

  /**
   * Submits a target version for review (changes status to 'in_review').
   */
  async submitForReview(
    targetType: ReviewTargetType,
    targetId: string,
    version: number,
    editorId: string,
  ): Promise<{ status: string }> {
    // 1. Guard against submitting DRAFT_ONLY packages or items with missing answers
    const artifactType =
      targetType === 'group_version'
        ? 'group'
        : targetType === 'question_version'
          ? 'question'
          : 'exam';

    const importJobsForTarget = await this.dbClient.db
      .select({
        id: schema.importJobs.id,
        status: schema.importJobs.status,
        errorLog: schema.importJobs.errorLog,
      })
      .from(schema.importArtifacts)
      .innerJoin(schema.importJobs, eq(schema.importArtifacts.jobId, schema.importJobs.id))
      .where(
        and(
          eq(schema.importArtifacts.artifactType, artifactType),
          eq(schema.importArtifacts.storageKey, targetId),
        ),
      )
      .orderBy(desc(schema.importJobs.createdAt))
      .limit(1);

    if (importJobsForTarget.length > 0) {
      const latestJob = importJobsForTarget[0]!;
      const errLog = latestJob.errorLog as Record<string, unknown> | null;
      if (
        latestJob.status === 'DRAFT_ONLY' ||
        errLog?.['readiness'] === 'DRAFT_ONLY' ||
        errLog?.['mode'] === 'draft' ||
        (typeof errLog?.['blockingIssueCount'] === 'number' && (errLog['blockingIssueCount'] as number) > 0)
      ) {
        throw new BadRequestException(
          `Không thể gửi duyệt nội dung thuộc gói nháp (DRAFT_ONLY). Cần nạp gói ở chế độ ready với revision cao hơn trước khi duyệt.`,
        );
      }
    }

    if (targetType === 'group_version') {
      const qRows = await this.dbClient.db
        .select({ id: schema.questions.id })
        .from(schema.questions)
        .where(eq(schema.questions.groupId, targetId));

      if (qRows.length > 0) {
        const qIds = qRows.map((q: { id: string }) => q.id);
        const caRows = await this.dbClient.db
          .select({
            questionId: schema.correctAnswers.questionId,
            correctOption: schema.correctAnswers.correctOption,
          })
          .from(schema.correctAnswers)
          .where(
            and(
              inArray(schema.correctAnswers.questionId, qIds),
              eq(schema.correctAnswers.questionVersion, version),
            ),
          );
        const answered = new Set(
          caRows
            .filter((r: { questionId: string; correctOption: number | null }) => r.correctOption !== null && r.correctOption !== undefined)
            .map((r: { questionId: string }) => r.questionId),
        );
        for (const qId of qIds) {
          if (!answered.has(qId)) {
            throw new BadRequestException(
              `Không thể gửi duyệt: câu hỏi ${qId} trong nhóm chưa có đáp án đúng (thuộc bản nháp DRAFT_ONLY).`,
            );
          }
        }
      }
    } else if (targetType === 'question_version') {
      const ca = await this.dbClient.db
        .select()
        .from(schema.correctAnswers)
        .where(
          and(
            eq(schema.correctAnswers.questionId, targetId),
            eq(schema.correctAnswers.questionVersion, version),
          ),
        )
        .limit(1);
      if (ca.length === 0 || ca[0]?.correctOption === null) {
        throw new BadRequestException(
          `Không thể gửi duyệt: câu hỏi ${targetId} chưa có đáp án đúng (thuộc bản nháp DRAFT_ONLY).`,
        );
      }
    }

    this.recordEditor(targetType, targetId, version, editorId);

    if (targetType === 'group_version') {
      const existing = await this.dbClient.db
        .select()
        .from(schema.questionGroupVersions)
        .where(
          and(
            eq(schema.questionGroupVersions.groupId, targetId),
            eq(schema.questionGroupVersions.version, version),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException(`Nhóm câu hỏi không tồn tại phiên bản ${version}`);
      }

      await this.dbClient.db
        .update(schema.questionGroupVersions)
        .set({ status: 'in_review' })
        .where(
          and(
            eq(schema.questionGroupVersions.groupId, targetId),
            eq(schema.questionGroupVersions.version, version),
          ),
        );

      // Also set questions in this group to in_review
      const qRows = await this.dbClient.db
        .select()
        .from(schema.questions)
        .where(eq(schema.questions.groupId, targetId));

      for (const q of qRows) {
        this.recordEditor('question_version', q.id, version, editorId);

        await this.dbClient.db
          .update(schema.questionVersions)
          .set({ status: 'in_review' })
          .where(
            and(
              eq(schema.questionVersions.questionId, q.id),
              eq(schema.questionVersions.version, version),
            ),
          );
      }
    } else if (targetType === 'question_version') {
      await this.dbClient.db
        .update(schema.questionVersions)
        .set({ status: 'in_review' })
        .where(
          and(
            eq(schema.questionVersions.questionId, targetId),
            eq(schema.questionVersions.version, version),
          ),
        );
    }

    return { status: 'in_review' };
  }

  /**
   * Enforces separation of duties (editor != reviewer) and commits review decision + outbox event transactionally.
   */
  async reviewDecision(
    targetType: ReviewTargetType,
    targetId: string,
    version: number,
    decisionDto: ReviewDecisionDto,
    reviewerId: string,
    tx?: DbTx,
    /**
     * adminOverride: an admin approving a whole exam in one action (owner decision 2026-10-20, single-operator
     * phase). Skips only the editor != reviewer rule; the DRAFT_ONLY and missing-answer guards still apply.
     * Callers must check the admin role and write an audit entry.
     */
    opts: { adminOverride?: boolean } = {},
  ): Promise<{ id: string; status: string; reviewedAt: Date }> {
    const db = tx ?? this.dbClient.db;

    // 1. Guard against approving DRAFT_ONLY packages or items with missing answers
    if (decisionDto.decision === 'approved') {
      const artifactType =
        targetType === 'group_version'
          ? 'group'
          : targetType === 'question_version'
            ? 'question'
            : 'exam';

      const importJobsForTarget = await db
        .select({
          id: schema.importJobs.id,
          status: schema.importJobs.status,
          errorLog: schema.importJobs.errorLog,
          createdAt: schema.importJobs.createdAt,
        })
        .from(schema.importArtifacts)
        .innerJoin(schema.importJobs, eq(schema.importArtifacts.jobId, schema.importJobs.id))
        .where(
          and(
            eq(schema.importArtifacts.artifactType, artifactType),
            eq(schema.importArtifacts.storageKey, targetId),
          ),
        )
        .orderBy(desc(schema.importJobs.createdAt))
        .limit(1);

      if (importJobsForTarget.length > 0) {
        const latestJob = importJobsForTarget[0]!;
        const errLog = latestJob.errorLog as Record<string, unknown> | null;
        if (
          latestJob.status === 'DRAFT_ONLY' ||
          errLog?.['readiness'] === 'DRAFT_ONLY' ||
          errLog?.['mode'] === 'draft' ||
          (typeof errLog?.['blockingIssueCount'] === 'number' && (errLog['blockingIssueCount'] as number) > 0)
        ) {
          throw new BadRequestException(
            `Không thể phê duyệt nội dung thuộc gói nháp (DRAFT_ONLY). Cần nạp gói ở chế độ ready với revision cao hơn trước khi duyệt.`,
          );
        }
      }

      if (targetType === 'group_version') {
        const qRows = await db
          .select({ id: schema.questions.id })
          .from(schema.questions)
          .where(eq(schema.questions.groupId, targetId));

        if (qRows.length > 0) {
          const qIds = qRows.map((q: { id: string }) => q.id);
          const caRows = await db
            .select({
              questionId: schema.correctAnswers.questionId,
              correctOption: schema.correctAnswers.correctOption,
            })
            .from(schema.correctAnswers)
            .where(
              and(
                inArray(schema.correctAnswers.questionId, qIds),
                eq(schema.correctAnswers.questionVersion, version),
              ),
            );
          const answered = new Set(
            caRows
              .filter((r: { questionId: string; correctOption: number | null }) => r.correctOption !== null && r.correctOption !== undefined)
              .map((r: { questionId: string }) => r.questionId),
          );
          for (const qId of qIds) {
            if (!answered.has(qId)) {
              throw new BadRequestException(
                `Không thể phê duyệt: câu hỏi ${qId} trong nhóm chưa có đáp án đúng (thuộc bản nháp DRAFT_ONLY).`,
              );
            }
          }
        }
      } else if (targetType === 'question_version') {
        const ca = await db
          .select()
          .from(schema.correctAnswers)
          .where(
            and(
              eq(schema.correctAnswers.questionId, targetId),
              eq(schema.correctAnswers.questionVersion, version),
            ),
          )
          .limit(1);
        if (ca.length === 0 || ca[0]?.correctOption === null) {
          throw new BadRequestException(
            `Không thể phê duyệt: câu hỏi ${targetId} chưa có đáp án đúng (thuộc bản nháp DRAFT_ONLY).`,
          );
        }
      }
    }

    // 2. Check editor != reviewer
    // An explicit admin override records the admin as editor when the editor is unknown.
    const lastEditorId =
      (await this.getLastEditor(targetType, targetId, version)) ?? (opts.adminOverride ? reviewerId : null);

    // If lastEditorId cannot be determined, strictly reject to preserve 4-eyes integrity
    if (!lastEditorId) {
      throw new BadRequestException(
        'Không thể xác định người biên tập (lastEditorId) của nội dung này; không thể kiểm duyệt (bảo đảm nguyên tắc 4-eyes)',
      );
    }

    // Strictly enforce 4-eyes separation of duties: editor != reviewer
    if (lastEditorId === reviewerId && !opts.adminOverride) {
      throw new ForbiddenException(
        'Người duyệt không được là người sửa cuối cùng của nội dung này (tách biệt vai trò editor!=reviewer - Acceptance 3)',
      );
    }

    const reviewId = generateUuidV7();
    const now = new Date();

    const executeOperation = async (activeTx: DbTx) => {
      // 1. Insert contentReviews record
      await activeTx.insert(schema.contentReviews).values({
        id: reviewId,
        targetType,
        targetId,
        targetVersion: version,
        reviewerId,
        lastEditorId,
        status: decisionDto.decision,
        comments: decisionDto.comments || null,
        reviewedAt: now,
      });

      // 2. Update status of target version
      if (targetType === 'group_version') {
        await activeTx
          .update(schema.questionGroupVersions)
          .set({ status: decisionDto.decision })
          .where(
            and(
              eq(schema.questionGroupVersions.groupId, targetId),
              eq(schema.questionGroupVersions.version, version),
            ),
          );

        // Update all questions under this group to the same decision
        const questionsInGroup = await activeTx
          .select({ id: schema.questions.id })
          .from(schema.questions)
          .where(eq(schema.questions.groupId, targetId));

        for (const q of questionsInGroup) {
          await activeTx
            .update(schema.questionVersions)
            .set({ status: decisionDto.decision })
            .where(
              and(
                eq(schema.questionVersions.questionId, q.id),
                eq(schema.questionVersions.version, version),
              ),
            );
        }
      } else if (targetType === 'question_version') {
        await activeTx
          .update(schema.questionVersions)
          .set({ status: decisionDto.decision })
          .where(
            and(
              eq(schema.questionVersions.questionId, targetId),
              eq(schema.questionVersions.version, version),
            ),
          );
      }

      // 3. Emit outbox event if approved
      if (decisionDto.decision === 'approved') {
        const resourceType = targetType === 'group_version' ? 'group' : 'exam';
        await this.outboxService.emitEvent(
          'content.approved',
          targetId,
          reviewerId,
          {
            resourceType,
            resourceId: targetId,
            version,
            reviewerId,
          },
          activeTx,
        );
      }

      return {
        id: reviewId,
        status: decisionDto.decision,
        reviewedAt: now,
      };
    };

    if (tx) {
      return executeOperation(tx);
    } else {
      return this.dbClient.db.transaction(executeOperation);
    }
  }

  /**
   * Approves all question groups and questions for a specific exam.
   * Enforces separation of duties (reviewer != editor) for all items.
   */
  async approveAllExamQuestions(
    examId: string,
    reviewerId: string,
    editorId: string,
    comments = 'Duyệt toàn bộ nội dung đề thi',
  ): Promise<{ approvedGroups: number; approvedQuestions: number }> {
    if (reviewerId === editorId) {
      throw new ForbiddenException(
        'Người duyệt đề thi không được trùng với người nạp / chỉnh sửa đề thi (editor!=reviewer)',
      );
    }

    // Find all sections and items for this exam
    const sections = await this.dbClient.db
      .select()
      .from(schema.examSections)
      .where(eq(schema.examSections.examId, examId));

    const sectionIds = sections.map((s: typeof schema.examSections.$inferSelect) => s.id);
    if (sectionIds.length === 0) {
      throw new NotFoundException(`Đề thi ${examId} chưa có phần thi`);
    }

    const items = await this.dbClient.db
      .select({ questionId: schema.examItems.questionId })
      .from(schema.examItems)
      .where(eq(schema.examItems.examId, examId));

    const questionIds = items.map((i: { questionId: string }) => i.questionId);
    if (questionIds.length === 0) {
      throw new NotFoundException(`Đề thi ${examId} không có câu hỏi nào`);
    }

    const allQuestions = await this.dbClient.db.select().from(schema.questions);
    const examQuestions = allQuestions.filter((q: typeof schema.questions.$inferSelect) => questionIds.includes(q.id));
    const groupIds = Array.from(new Set(examQuestions.map((q: typeof schema.questions.$inferSelect) => q.groupId).filter(Boolean))) as string[];

    return this.dbClient.db.transaction(async (tx: DbTx) => {
      let approvedGroups = 0;
      let approvedQuestions = 0;

      for (const gid of groupIds) {
        this.recordEditor('group_version', gid, 1, editorId);
        await this.reviewDecision(
          'group_version',
          gid,
          1,
          { decision: 'approved', comments },
          reviewerId,
          tx,
        );
        approvedGroups++;
      }

      for (const qid of questionIds) {
        this.recordEditor('question_version', qid, 1, editorId);
        await this.reviewDecision(
          'question_version',
          qid,
          1,
          { decision: 'approved', comments },
          reviewerId,
          tx,
        );
        approvedQuestions++;
      }

      return { approvedGroups, approvedQuestions };
    });
  }

  // ---------------------------------------------------------------------------
  // Explanations CRUD & Versioning (QB-08, EXPL-01..09, EXPL-13)
  // ---------------------------------------------------------------------------

  /**
   * Creates a draft explanation version for a question (QB-08, EXPL-01..09).
   */
  async createExplanation(
    authorId: string,
    rawDraft: unknown,
  ): Promise<typeof schema.explanationVersions.$inferSelect> {
    const draft = ExplanationDraftSchema.parse(rawDraft);
    const db = this.dbClient.db;

    // Verify question exists
    const [q] = await db
      .select({ id: schema.questions.id })
      .from(schema.questions)
      .where(eq(schema.questions.id, draft.questionId))
      .limit(1);

    if (!q) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Không tìm thấy câu hỏi ${draft.questionId}`,
      });
    }

    // Determine next version
    const existingVersions = await db
      .select({ version: schema.explanationVersions.version })
      .from(schema.explanationVersions)
      .where(eq(schema.explanationVersions.questionId, draft.questionId))
      .orderBy(desc(schema.explanationVersions.version))
      .limit(1);

    const nextVersion = existingVersions.length > 0 ? existingVersions[0]!.version + 1 : 1;

    const id = generateUuidV7();
    const [inserted] = await db
      .insert(schema.explanationVersions)
      .values({
        id,
        questionId: draft.questionId,
        version: nextVersion,
        content: draft,
        locale: draft.language || 'vi',
        authorId,
        status: 'draft',
        createdAt: new Date(),
      })
      .returning();

    return inserted!;
  }

  /**
   * Retrieves an explanation by ID.
   */
  async getExplanation(id: string): Promise<typeof schema.explanationVersions.$inferSelect> {
    const [exp] = await this.dbClient.db
      .select()
      .from(schema.explanationVersions)
      .where(eq(schema.explanationVersions.id, id))
      .limit(1);

    if (!exp) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy bản giải thích.',
      });
    }

    return exp;
  }

  /**
   * Lists explanation versions with optional filtering by questionId or status.
   */
  async listExplanations(filters?: { questionId?: string; status?: string }) {
    const db = this.dbClient.db;
    const conditions = [];

    if (filters?.questionId) {
      conditions.push(eq(schema.explanationVersions.questionId, filters.questionId));
    }
    if (filters?.status) {
      if (filters.status === 'pending' || filters.status === 'draft') {
        conditions.push(inArray(schema.explanationVersions.status, ['draft', 'pending']));
      } else {
        conditions.push(eq(schema.explanationVersions.status, filters.status));
      }
    }

    const rows = await db
      .select({
        id: schema.explanationVersions.id,
        questionId: schema.explanationVersions.questionId,
        version: schema.explanationVersions.version,
        content: schema.explanationVersions.content,
        locale: schema.explanationVersions.locale,
        authorId: schema.explanationVersions.authorId,
        aiGenerated: schema.explanationVersions.aiGenerated,
        status: schema.explanationVersions.status,
        createdAt: schema.explanationVersions.createdAt,
        questionLevel: schema.questions.level,
        authorName: schema.users.name,
        authorEmail: schema.users.email,
      })
      .from(schema.explanationVersions)
      .leftJoin(schema.questions, eq(schema.explanationVersions.questionId, schema.questions.id))
      .leftJoin(schema.users, eq(schema.explanationVersions.authorId, schema.users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.explanationVersions.createdAt));

    const items = rows.map((r: {
      id: string;
      questionId: string;
      version: number;
      content: unknown;
      locale: string;
      authorId: string;
      aiGenerated: boolean;
      status: string;
      createdAt: Date;
      questionLevel: string | null;
      authorName: string | null;
      authorEmail: string | null;
    }) => {
      const content = (r.content || {}) as Record<string, unknown>;

      let explanationMarkdown = (content['explanationMarkdown'] as string) || '';
      if (!explanationMarkdown) {
        const correctText = extractPlainTextFromRichText(content['correctReason']);
        const wrongMap = content['wrongReasonsByOption'] as Record<string, unknown> | undefined;
        const parts: string[] = [];
        if (correctText) {
          parts.push(`**Lý do đúng**:\n${correctText}`);
        }
        if (wrongMap && typeof wrongMap === 'object') {
          const wrongParts = Object.entries(wrongMap).map(([opt, reason]) => {
            return `- [${opt}] Phương án ${opt}: ${extractPlainTextFromRichText(reason)}`;
          });
          if (wrongParts.length > 0) {
            parts.push(`**Phân tích các phương án còn lại**:\n${wrongParts.join('\n')}`);
          }
        }
        explanationMarkdown = parts.join('\n\n') || correctText;
      }

      const translationVi =
        (content['translationVi'] as string) ||
        (content['translation'] ? extractPlainTextFromRichText(content['translation']) : '');

      return {
        id: r.id,
        questionId: r.questionId,
        version: r.version,
        content: r.content,
        locale: r.locale,
        authorId: r.authorId,
        aiGenerated: r.aiGenerated,
        status: r.status === 'draft' ? 'pending' : r.status,
        rawStatus: r.status,
        createdAt: r.createdAt,
        level: r.questionLevel || 'N5',
        authorName: r.authorName || r.authorEmail || 'Biên tập viên',
        explanationMarkdown,
        translationVi,
      };
    });

    return { items };
  }

  /**
   * Updates an explanation draft.
   */
  async updateExplanation(
    id: string,
    _editorId: string,
    rawDraft: Partial<ExplanationDraft>,
  ): Promise<typeof schema.explanationVersions.$inferSelect> {
    const exp = await this.getExplanation(id);

    if (exp.status === 'approved') {
      throw new BadRequestException({
        code: 'CANNOT_MODIFY_APPROVED',
        message: 'Không thể sửa bản giải thích đã được duyệt. Vui lòng tạo phiên bản mới.',
      });
    }

    const currentContent = exp.content as Record<string, unknown>;
    const mergedContent = { ...currentContent, ...rawDraft };
    const validatedContent = ExplanationDraftSchema.parse(mergedContent);

    const [updated] = await this.dbClient.db
      .update(schema.explanationVersions)
      .set({
        content: validatedContent,
        locale: validatedContent.language || exp.locale,
      })
      .where(eq(schema.explanationVersions.id, id))
      .returning();

    return updated!;
  }

  /**
   * Moderates an explanation version (EXPL-13).
   * Acceptance / Contract: author != reviewer (four-eyes principle).
   */
  async reviewExplanation(
    id: string,
    reviewerId: string,
    decision: 'approved' | 'rejected',
    comments?: string,
  ): Promise<typeof schema.explanationVersions.$inferSelect> {
    const exp = await this.getExplanation(id);

    // CRITICAL: Author cannot review or approve their own explanation!
    if (exp.authorId === reviewerId) {
      throw new ForbiddenException({
        code: 'SELF_REVIEW_FORBIDDEN',
        message: 'Tác giả không được phép tự duyệt bản giải thích của chính mình.',
      });
    }

    const db = this.dbClient.db;

    // Update explanation version status
    const [updated] = await db
      .update(schema.explanationVersions)
      .set({ status: decision })
      .where(eq(schema.explanationVersions.id, id))
      .returning();

    // Insert into content_reviews
    await db.insert(schema.contentReviews).values({
      id: generateUuidV7(),
      targetType: 'explanation_version',
      targetId: exp.id,
      targetVersion: exp.version,
      reviewerId,
      lastEditorId: exp.authorId,
      status: decision,
      comments: comments || null,
      reviewedAt: new Date(),
    });

    return updated!;
  }

  /**
   * Learner accesses explanation for question index during practice or after exam submission.
   * EXPL-01..09, AUDIO-08, AUDIO-09.
   */
  async getLearnerExplanation(
    attemptId: string,
    index: number,
    userId?: string,
    guestId?: string,
  ) {
    const db = this.dbClient.db;

    // 1. Fetch attempt
    const [attempt] = await db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy lượt thi.',
      });
    }

    // Ownership check
    const isOwner = (userId && attempt.userId === userId) || (guestId && attempt.guestId === guestId);
    if (!isOwner) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền truy cập lượt thi này.',
      });
    }

    // Exam status check: in real mode, only allowed when submitted AND not embargoed
    if (attempt.mode === 'real') {
      if (attempt.status !== 'submitted') {
        throw new ConflictException({
          code: 'RESULTS_EMBARGOED',
          message: 'Kết quả chưa được công bố.',
        });
      }

      // Check event embargo if attempt is part of an exam event
      const [eventAttempt] = await db
        .select({
          resultReleaseAt: schema.examEvents.resultReleaseAt,
        })
        .from(schema.eventAttempts)
        .innerJoin(schema.examEvents, eq(schema.eventAttempts.eventId, schema.examEvents.id))
        .where(eq(schema.eventAttempts.attemptId, attemptId))
        .limit(1);

      if (eventAttempt && new Date() < new Date(eventAttempt.resultReleaseAt)) {
        throw new ConflictException({
          code: 'RESULTS_EMBARGOED',
          message: 'Kết quả chưa được công bố.',
        });
      }
    }

    // If practice mode and in_progress, question must have been answered
    if (attempt.mode === 'practice' && attempt.status === 'in_progress') {
      const [sheet] = await db
        .select()
        .from(schema.attemptAnswerSheets)
        .where(eq(schema.attemptAnswerSheets.attemptId, attemptId))
        .limit(1);

      const userVal = sheet?.answers[index] ?? 0;
      if (userVal === 0) {
        throw new UnprocessableEntityException({
          code: 'QUESTION_UNANSWERED',
          message: 'Chưa chọn đáp án cho câu hỏi này.',
        });
      }
    }

    // 2. Fetch question at this index in the exam
    const examItem = await db
      .select({
        questionId: schema.examItems.questionId,
        groupId: schema.questions.groupId,
        licenseId: schema.questionGroups.licenseId,
      })
      .from(schema.examItems)
      .innerJoin(schema.questions, eq(schema.examItems.questionId, schema.questions.id))
      .innerJoin(schema.questionGroups, eq(schema.questions.groupId, schema.questionGroups.id))
      .where(
        and(
          eq(schema.examItems.examId, attempt.examId),
          eq(schema.examItems.orderIndex, index),
        ),
      )
      .limit(1);

    if (examItem.length === 0) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Không tìm thấy câu hỏi ở vị trí ${index}`,
      });
    }

    const qInfo = examItem[0]!;

    // 3. Fetch latest approved explanation
    const [approvedExp] = await db
      .select()
      .from(schema.explanationVersions)
      .where(
        and(
          eq(schema.explanationVersions.questionId, qInfo.questionId),
          eq(schema.explanationVersions.status, 'approved'),
        ),
      )
      .orderBy(desc(schema.explanationVersions.version))
      .limit(1);

    if (!approvedExp) {
      return {
        index,
        questionId: qInfo.questionId,
        hasExplanation: false,
        explanation: null,
      };
    }

    const content = approvedExp.content as Record<string, unknown>;

    // 4. Audio transcript license check (AUDIO-08)
    let transcriptAllowed = true;
    if (qInfo.licenseId) {
      const [lic] = await db
        .select()
        .from(schema.contentLicenses)
        .where(eq(schema.contentLicenses.id, qInfo.licenseId))
        .limit(1);

      if (lic) {
        if (lic.revokedAt !== null || (lic.expiresAt && new Date(lic.expiresAt) <= new Date())) {
          transcriptAllowed = false;
        } else if (lic.terms) {
          try {
            const parsed = JSON.parse(lic.terms);
            if (parsed.rights?.transcriptAllowed === false) {
              transcriptAllowed = false;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    const transcript = transcriptAllowed ? content['transcript'] ?? null : null;
    const evidenceRanges = transcriptAllowed ? content['evidenceRanges'] ?? [] : [];

    return {
      index,
      questionId: qInfo.questionId,
      hasExplanation: true,
      correctReason: content['correctReason'] ?? null,
      wrongReasonsByOption: content['wrongReasonsByOption'] ?? null,
      translation: content['translation'] ?? null,
      vocabTags: content['vocabTags'] ?? [],
      grammarTags: content['grammarTags'] ?? [],
      transcript,
      evidenceRanges,
    };
  }

  // ---------------------------------------------------------------------------
  // Content Reports (EXPL-12)
  // ---------------------------------------------------------------------------

  /**
   * Reports an issue with a question or explanation (EXPL-12).
   */
  async createReport(reporterId: string, input: CreateReportInput) {
    const db = this.dbClient.db;

    const id = generateUuidV7();
    const [report] = await db
      .insert(schema.questionReports)
      .values({
        id,
        questionId: input.questionId,
        reportedBy: reporterId,
        issueType: input.issueType,
        description: input.description,
        status: 'open',
        createdAt: new Date(),
      })
      .returning();

    return report!;
  }

  /**
   * Lists content reports for staff moderation.
   */
  async listReports(filters?: { status?: string; questionId?: string }) {
    const db = this.dbClient.db;
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(schema.questionReports.status, filters.status));
    }
    if (filters?.questionId) {
      conditions.push(eq(schema.questionReports.questionId, filters.questionId));
    }

    const items = await db
      .select()
      .from(schema.questionReports)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.questionReports.createdAt));

    return { items };
  }

  /**
   * Updates report status.
   */
  async updateReport(
    id: string,
    update: { status: 'in_review' | 'resolved' | 'dismissed'; notes?: string },
  ) {
    const [updated] = await this.dbClient.db
      .update(schema.questionReports)
      .set({ status: update.status })
      .where(eq(schema.questionReports.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy báo cáo.',
      });
    }

    return updated;
  }

  /**
   * Admin: List pending reviews and recent review records (ADM-02, ADM-06).
   */
  async listReviews(): Promise<{ items: unknown[] }> {
    const pendingGroups = await this.dbClient.db
      .select()
      .from(schema.questionGroupVersions)
      .where(eq(schema.questionGroupVersions.status, 'in_review'))
      .orderBy(desc(schema.questionGroupVersions.createdAt));

    const pastReviews = await this.dbClient.db
      .select()
      .from(schema.contentReviews)
      .orderBy(desc(schema.contentReviews.reviewedAt))
      .limit(50);

    const items = [
      ...pendingGroups.map((g: typeof schema.questionGroupVersions.$inferSelect) => ({
        id: `${g.groupId}-v${g.version}`,
        targetType: 'group_version',
        targetId: g.groupId,
        version: g.version,
        title: `Mondai group (v${g.version})`,
        status: g.status,
        authorId: null,
        createdAt: g.createdAt,
      })),
      ...pastReviews.map((r: typeof schema.contentReviews.$inferSelect) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        version: r.targetVersion,
        reviewerId: r.reviewerId,
        status: r.status,
        comments: r.comments,
        reviewedAt: r.reviewedAt,
      })),
    ];

    return { items };
  }
}
