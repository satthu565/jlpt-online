import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { OutboxService, type DbTx } from '../outbox/outbox.service.js';
import type { ReviewDecisionDto, ReviewTargetType } from './review.types.js';

@Injectable()
export class ReviewService {
  // In-memory cache for fast editor tracking: `${targetType}:${targetId}:${targetVersion}` -> editorUserId
  private readonly targetLastEditors = new Map<string, string>();

  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly outboxService: OutboxService,
  ) {}

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
  ): Promise<{ id: string; status: string; reviewedAt: Date }> {
    // 1. Check editor != reviewer
    const lastEditorId = await this.getLastEditor(targetType, targetId, version);

    // If lastEditorId cannot be determined, strictly reject to preserve 4-eyes integrity
    if (!lastEditorId) {
      throw new BadRequestException(
        'Không thể xác định người biên tập (lastEditorId) của nội dung này; không thể kiểm duyệt (bảo đảm nguyên tắc 4-eyes)',
      );
    }

    // Strictly enforce 4-eyes separation of duties: editor != reviewer
    if (lastEditorId === reviewerId) {
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
}
