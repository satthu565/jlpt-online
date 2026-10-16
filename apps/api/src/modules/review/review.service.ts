import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { ExplanationDraftSchema, type ExplanationDraft } from '@jlpt/schema';
import { LicenseService } from '../license/license.service.js';

export interface CreateReportInput {
  questionId: string;
  explanationId?: string;
  issueType: 'wrong_answer' | 'confusing_explanation' | 'typo' | 'audio_issue' | 'other' | string;
  description: string;
}

@Injectable()
export class ReviewService {
  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly licenseService: LicenseService,
  ) {}

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
      conditions.push(eq(schema.explanationVersions.status, filters.status));
    }

    const items = await db
      .select()
      .from(schema.explanationVersions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.explanationVersions.createdAt));

    return { items };
  }

  /**
   * Updates an explanation draft.
   */
  async updateExplanation(
    id: string,
    editorId: string,
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

    const [updated] = await this.dbClient.db
      .update(schema.explanationVersions)
      .set({
        content: mergedContent,
        locale: (rawDraft.language as string) || exp.locale,
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

    // Exam status check: in real mode, explanation is forbidden while exam is in progress
    if (attempt.mode === 'real' && attempt.status === 'in_progress') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Không thể xem lời giải trong khi đang làm bài thi thật.',
      });
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

      if (lic?.terms) {
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
}
