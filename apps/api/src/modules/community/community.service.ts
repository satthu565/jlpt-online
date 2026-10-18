import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, isNull, lte, or } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { isUuid } from '../../common/pipes/uuid-param.pipe.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import type {
  PostDiscussionCommentDto,
  ReportCommentDto,
  ResolveCommunityReportDto,
  ShareAchievementDto,
} from './community.types.js';

interface ThreadRow {
  id: string;
}

interface CommentWithAuthorRow {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string | null;
  content: string;
  createdAt: Date;
  deletedAt: Date | null;
}

interface CommunityReportRow {
  id: string;
  commentId: string;
  reportedBy: string;
  reason: string;
  status: string;
  createdAt: Date;
  commentContent: string;
  commentAuthorId: string;
  commentDeletedAt: Date | null;
}

@Injectable()
export class CommunityService {
  constructor(@Inject(DB_CLIENT) private readonly client: DbClientInstance) {}

  // ---------------------------------------------------------------------------
  // GAME-07: Chia sẻ thành tích cá nhân
  // ---------------------------------------------------------------------------

  async shareAchievement(userId: string, input: ShareAchievementDto) {
    if (!input.achievementId) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã thành tích không được để trống.',
      });
    }

    const shareToken = generateUuidV7().replace(/-/g, '');

    await this.client.db.insert(schema.achievementShares).values({
      id: generateUuidV7(),
      userId,
      shareToken,
      payload: {
        achievementId: input.achievementId,
        sharedAt: new Date().toISOString(),
      },
    });

    const shareUrl = `/share/achievements/${shareToken}`;
    return { shareUrl };
  }

  // ---------------------------------------------------------------------------
  // GAME-08: Thảo luận về câu hỏi sau khi hoàn thành bài
  // Acceptance 4: Discussion chỉ sau completion và moderation
  // ---------------------------------------------------------------------------

  /**
   * Asserts that user has completed at least one exam attempt containing questionId
   */
  async assertQuestionCompleted(questionId: string, user: AuthUserContext) {
    if (!isUuid(questionId)) {
      throw new BadRequestException({
        code: 'INVALID_UUID',
        message: 'Mã câu hỏi không đúng định dạng UUID.',
      });
    }

    if (user.role === 'admin' || user.role === 'moderator') {
      return;
    }

    const serverNow = new Date();

    const attempts = await this.client.db
      .select({ id: schema.examAttempts.id })
      .from(schema.examAttempts)
      .innerJoin(
        schema.examItems,
        eq(schema.examAttempts.examId, schema.examItems.examId),
      )
      .leftJoin(
        schema.eventAttempts,
        eq(schema.eventAttempts.attemptId, schema.examAttempts.id),
      )
      .leftJoin(
        schema.examEvents,
        eq(schema.examEvents.id, schema.eventAttempts.eventId),
      )
      .where(
        and(
          eq(schema.examAttempts.userId, user.userId),
          eq(schema.examAttempts.status, 'submitted'),
          eq(schema.examItems.questionId, questionId),
          or(
            isNull(schema.eventAttempts.id),
            lte(schema.examEvents.resultReleaseAt, serverNow),
          ),
        ),
      )
      .limit(1);

    if (attempts.length === 0) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message:
          'Bạn chỉ có thể xem và tham gia thảo luận sau khi đã hoàn thành một bài thi có chứa câu hỏi này (và kết quả sự kiện thi đã được công bố).',
      });
    }
  }

  /**
   * Danh sách câu hỏi khả dụng để thảo luận (đã hoàn thành hoặc tài khoản quản trị)
   */
  async listDiscussableQuestions(user?: AuthUserContext) {
    if (!user) {
      return { items: [] };
    }

    if (user.role === 'admin' || user.role === 'moderator') {
      const rows = await this.client.db
        .select({
          id: schema.questions.id,
          stem: schema.questionVersions.stem,
          level: schema.questions.level,
        })
        .from(schema.questions)
        .leftJoin(
          schema.questionVersions,
          eq(schema.questions.id, schema.questionVersions.questionId),
        )
        .where(isNull(schema.questions.deletedAt))
        .limit(20);
      return { items: rows };
    }

    const serverNow = new Date();
    const rows = await this.client.db
      .select({
        id: schema.examItems.questionId,
        stem: schema.questionVersions.stem,
        level: schema.questions.level,
      })
      .from(schema.examAttempts)
      .innerJoin(
        schema.examItems,
        eq(schema.examAttempts.examId, schema.examItems.examId),
      )
      .innerJoin(
        schema.questions,
        eq(schema.examItems.questionId, schema.questions.id),
      )
      .leftJoin(
        schema.questionVersions,
        eq(schema.questions.id, schema.questionVersions.questionId),
      )
      .leftJoin(
        schema.eventAttempts,
        eq(schema.eventAttempts.attemptId, schema.examAttempts.id),
      )
      .leftJoin(
        schema.examEvents,
        eq(schema.examEvents.id, schema.eventAttempts.eventId),
      )
      .where(
        and(
          eq(schema.examAttempts.userId, user.userId),
          eq(schema.examAttempts.status, 'submitted'),
          or(
            isNull(schema.eventAttempts.id),
            lte(schema.examEvents.resultReleaseAt, serverNow),
          ),
        ),
      )
      .limit(20);

    return { items: rows };
  }

  /**
   * Xem thảo luận và bình luận về câu hỏi
   */
  async listQuestionDiscussions(questionId: string, user: AuthUserContext) {
    await this.assertQuestionCompleted(questionId, user);

    // 1. Fetch active threads for question
    const threads = await this.client.db
      .select({ id: schema.discussionThreads.id })
      .from(schema.discussionThreads)
      .where(
        and(
          eq(schema.discussionThreads.targetType, 'question'),
          eq(schema.discussionThreads.targetId, questionId),
          isNull(schema.discussionThreads.deletedAt),
        ),
      );

    if (threads.length === 0) {
      return { items: [] };
    }

    const threadIds = (threads as ThreadRow[]).map((t: ThreadRow) => t.id);

    // 2. Fetch comments with user info filtered by threadId in SQL (P2 fix)
    const allComments = await this.client.db
      .select({
        id: schema.comments.id,
        threadId: schema.comments.threadId,
        authorId: schema.comments.authorId,
        authorName: schema.users.name,
        content: schema.comments.content,
        createdAt: schema.comments.createdAt,
        deletedAt: schema.comments.deletedAt,
      })
      .from(schema.comments)
      .innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
      .where(
        and(
          inArray(schema.comments.threadId, threadIds),
          isNull(schema.comments.deletedAt),
        ),
      )
      .orderBy(desc(schema.comments.createdAt));

    // 3. Filter out hidden/moderated comments
    const hiddenActions = await this.client.db
      .select({ targetId: schema.moderationActions.targetId })
      .from(schema.moderationActions)
      .where(
        and(
          eq(schema.moderationActions.targetType, 'comment'),
          eq(schema.moderationActions.action, 'hide_comment'),
        ),
      );

    interface HiddenActionRow {
      targetId: string;
    }
    const hiddenSet = new Set((hiddenActions as HiddenActionRow[]).map((h: HiddenActionRow) => h.targetId));

    const visibleComments = (allComments as CommentWithAuthorRow[]).filter(
      (c: CommentWithAuthorRow) => !hiddenSet.has(c.id),
    );

    const items = visibleComments.map((c: CommentWithAuthorRow) => ({
      id: c.id,
      threadId: c.threadId,
      authorId: c.authorId,
      authorName: c.authorName || 'Người dùng',
      content: c.content,
      createdAt: c.createdAt.toISOString(),
    }));

    return { items };
  }

  /**
   * Đăng bình luận hỏi đáp về câu hỏi
   */
  async postQuestionComment(
    questionId: string,
    user: AuthUserContext,
    input: PostDiscussionCommentDto,
  ) {
    await this.assertQuestionCompleted(questionId, user);

    if (!input.content || input.content.trim().length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Nội dung bình luận không được để trống.',
      });
    }

    // Find or create discussion thread
    let [thread] = await this.client.db
      .select()
      .from(schema.discussionThreads)
      .where(
        and(
          eq(schema.discussionThreads.targetType, 'question'),
          eq(schema.discussionThreads.targetId, questionId),
          isNull(schema.discussionThreads.deletedAt),
        ),
      )
      .limit(1);

    if (!thread) {
      const threadId = generateUuidV7();
      await this.client.db.insert(schema.discussionThreads).values({
        id: threadId,
        targetType: 'question',
        targetId: questionId,
        authorId: user.userId,
        title: input.title || `Thảo luận câu hỏi`,
        content: input.content.trim(),
      });
      thread = {
        id: threadId,
        targetType: 'question',
        targetId: questionId,
        authorId: user.userId,
        title: input.title || `Thảo luận câu hỏi`,
        content: input.content.trim(),
        deletedAt: null,
        createdAt: new Date(),
      };
    }

    const commentId = generateUuidV7();
    await this.client.db.insert(schema.comments).values({
      id: commentId,
      threadId: thread.id,
      authorId: user.userId,
      content: input.content.trim(),
    });

    return { commentId };
  }

  // ---------------------------------------------------------------------------
  // GAME-09: Báo cáo vi phạm và kiểm duyệt bình luận
  // ---------------------------------------------------------------------------

  /**
   * Báo cáo bình luận vi phạm
   */
  async reportComment(
    commentId: string,
    user: AuthUserContext,
    input: ReportCommentDto,
  ) {
    if (!isUuid(commentId)) {
      throw new BadRequestException({
        code: 'INVALID_UUID',
        message: 'Mã bình luận không đúng định dạng UUID.',
      });
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Lý do báo cáo không được để trống.',
      });
    }

    const [comment] = await this.client.db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId))
      .limit(1);

    if (!comment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy bình luận.',
      });
    }

    // Check if user already reported this comment
    const [existing] = await this.client.db
      .select()
      .from(schema.commentReports)
      .where(
        and(
          eq(schema.commentReports.commentId, commentId),
          eq(schema.commentReports.reportedBy, user.userId),
        ),
      )
      .limit(1);

    if (existing) {
      return { reportId: existing.id };
    }

    const reportId = generateUuidV7();
    await this.client.db.insert(schema.commentReports).values({
      id: reportId,
      commentId,
      reportedBy: user.userId,
      reason: input.reason.trim(),
      status: 'open',
    });

    return { reportId };
  }

  /**
   * Xóa bình luận của mình hoặc do điều hành viên xóa
   */
  async deleteComment(commentId: string, user: AuthUserContext) {
    if (!isUuid(commentId)) {
      throw new BadRequestException({
        code: 'INVALID_UUID',
        message: 'Mã bình luận không đúng định dạng UUID.',
      });
    }

    const [comment] = await this.client.db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId))
      .limit(1);

    if (!comment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy bình luận.',
      });
    }

    // Only comment author or admin/moderator can delete
    if (
      comment.authorId !== user.userId &&
      user.role !== 'admin' &&
      user.role !== 'moderator'
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền xóa bình luận này.',
      });
    }

    await this.client.db
      .update(schema.comments)
      .set({ deletedAt: new Date() })
      .where(eq(schema.comments.id, commentId));

    return { message: 'Đã xóa bình luận' };
  }

  /**
   * Admin/Moderator: Danh sách báo cáo bình luận cộng đồng
   */
  async adminListCommunityReports(user: AuthUserContext) {
    this.assertModeratorOrAdmin(user);

    const reports = await this.client.db
      .select({
        id: schema.commentReports.id,
        commentId: schema.commentReports.commentId,
        reportedBy: schema.commentReports.reportedBy,
        reason: schema.commentReports.reason,
        status: schema.commentReports.status,
        createdAt: schema.commentReports.createdAt,
        commentContent: schema.comments.content,
        commentAuthorId: schema.comments.authorId,
        commentDeletedAt: schema.comments.deletedAt,
      })
      .from(schema.commentReports)
      .innerJoin(
        schema.comments,
        eq(schema.comments.id, schema.commentReports.commentId),
      )
      .orderBy(desc(schema.commentReports.createdAt));

    const items = (reports as CommunityReportRow[]).map((r: CommunityReportRow) => ({
      id: r.id,
      commentId: r.commentId,
      reportedBy: r.reportedBy,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      content: r.commentContent,
      authorId: r.commentAuthorId,
      isDeleted: r.commentDeletedAt !== null,
    }));

    return { items };
  }

  /**
   * Admin/Moderator: Xử lý vi phạm bình luận
   */
  async adminResolveCommunityReport(
    reportId: string,
    user: AuthUserContext,
    input: ResolveCommunityReportDto,
  ) {
    this.assertModeratorOrAdmin(user);

    if (!isUuid(reportId)) {
      throw new BadRequestException({
        code: 'INVALID_UUID',
        message: 'Mã báo cáo không đúng định dạng UUID.',
      });
    }

    const [report] = await this.client.db
      .select()
      .from(schema.commentReports)
      .where(eq(schema.commentReports.id, reportId))
      .limit(1);

    if (!report) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy báo cáo.',
      });
    }

    // Update report status
    await this.client.db
      .update(schema.commentReports)
      .set({ status: input.status })
      .where(eq(schema.commentReports.id, reportId));

    // Record moderation action
    const actionId = generateUuidV7();
    await this.client.db.insert(schema.moderationActions).values({
      id: actionId,
      targetType: 'comment',
      targetId: report.commentId,
      moderatorId: user.userId,
      action: input.action,
      reason: input.reason,
    });

    // If hide_comment action, soft-delete comment
    if (input.action === 'hide_comment') {
      await this.client.db
        .update(schema.comments)
        .set({ deletedAt: new Date() })
        .where(eq(schema.comments.id, report.commentId));
    }

    return { updated: true };
  }

  private assertModeratorOrAdmin(user: AuthUserContext) {
    if (user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Chỉ điều hành viên hoặc quản trị viên mới có quyền này.',
      });
    }
  }
}
