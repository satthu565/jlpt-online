import type { AdminQuestionGroup } from '../content/types';
import {
  type ReviewItem,
  type ReviewAuditLog,
  type ReviewDecisionInput,
  type StaffOperator,
  SelfReviewForbiddenError,
  ReviewPermissionError,
} from './types';

export class ReviewService {
  private items: Map<string, ReviewItem[]> = new Map(); // targetId -> list of versions
  private auditLogs: ReviewAuditLog[] = [];

  constructor(initialItems: ReviewItem[] = []) {
    for (const item of initialItems) {
      const list = this.items.get(item.targetId) ?? [];
      list.push(item);
      this.items.set(item.targetId, list);
    }
  }

  public listPendingReviews(): ReviewItem[] {
    const list: ReviewItem[] = [];
    for (const versions of this.items.values()) {
      for (const item of versions) {
        if (item.status === 'in_review') {
          list.push(item);
        }
      }
    }
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  public listAllReviews(): ReviewItem[] {
    const list: ReviewItem[] = [];
    for (const versions of this.items.values()) {
      for (const item of versions) {
        list.push(item);
      }
    }
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  public getReviewItem(targetId: string, version?: number): ReviewItem | null {
    const versions = this.items.get(targetId);
    if (!versions || versions.length === 0) return null;
    if (version !== undefined) {
      return versions.find((v) => v.version === version) ?? null;
    }
    return [...versions].sort((a, b) => b.version - a.version)[0] ?? null;
  }

  public getAuditLogs(targetId?: string): ReviewAuditLog[] {
    if (!targetId) return [...this.auditLogs];
    return this.auditLogs.filter((log) => log.targetId === targetId);
  }

  /**
   * Submits content item for review (draft -> in_review)
   */
  public submitForReview(
    input: {
      targetType: 'question_group' | 'exam' | 'explanation';
      targetId: string;
      version: number;
      title: string;
      sourceRef?: string;
      sourcePage?: number;
      groupData?: AdminQuestionGroup;
    },
    operator: StaffOperator,
  ): ReviewItem {
    const now = new Date().toISOString();
    const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newItem: ReviewItem = {
      id,
      targetType: input.targetType,
      targetId: input.targetId,
      version: input.version,
      title: input.title,
      status: 'in_review',
      authorId: operator.id,
      lastEditedBy: operator.id,
      submittedAt: now,
      sourceRef: input.sourceRef,
      sourcePage: input.sourcePage,
      groupData: input.groupData,
    };

    const versions = this.items.get(input.targetId) ?? [];
    versions.push(newItem);
    this.items.set(input.targetId, versions);

    this.auditLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      targetType: input.targetType,
      targetId: input.targetId,
      version: input.version,
      actorId: operator.id,
      action: 'submitted',
      timestamp: now,
    });

    return newItem;
  }

  /**
   * PDF-20: Cho phép biên tập viên sửa nội dung trong hàng đợi review
   */
  public updateContentInReview(
    targetId: string,
    version: number,
    updates: Partial<AdminQuestionGroup>,
    editor: StaffOperator,
  ): ReviewItem {
    const item = this.getReviewItem(targetId, version);
    if (!item) {
      throw new Error(`Không tìm thấy mục kiểm duyệt: ${targetId} (v${version})`);
    }

    const now = new Date().toISOString();
    const updatedGroupData: AdminQuestionGroup | undefined = item.groupData
      ? {
          ...item.groupData,
          ...updates,
          lastEditedBy: editor.id,
          updatedAt: now,
        }
      : undefined;

    item.lastEditedBy = editor.id;
    item.sourceRef = updates.sourceRef ?? item.sourceRef;
    item.sourcePage = updates.sourcePage ?? item.sourcePage;
    item.groupData = updatedGroupData;

    this.auditLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      targetType: item.targetType,
      targetId: item.targetId,
      version: item.version,
      actorId: editor.id,
      action: 'edited',
      comment: 'Cập nhật nội dung câu hỏi bởi biên tập viên',
      timestamp: now,
    });

    return item;
  }

  /**
   * PDF-25 & Acceptance 2: Duyệt dữ liệu trước khi xuất bản
   * Enforces: "Editor không tự duyệt"
   * Reviewer cannot be the author or the last editor of the item.
   */
  public reviewDecision(
    targetId: string,
    version: number,
    input: ReviewDecisionInput,
    reviewer: StaffOperator,
  ): ReviewItem {
    // 1. Role verification
    if (reviewer.role !== 'reviewer' && reviewer.role !== 'admin') {
      throw new ReviewPermissionError(
        'Chỉ người duyệt (Reviewer) hoặc Quản trị viên mới có quyền phê duyệt nội dung.',
      );
    }

    // 2. Fetch target item
    const item = this.getReviewItem(targetId, version);
    if (!item) {
      throw new Error(`Không tìm thấy mục kiểm duyệt: ${targetId} (v${version})`);
    }

    // 3. Strict 4-eyes enforcement: "Editor không tự duyệt"
    if (item.authorId === reviewer.id || item.lastEditedBy === reviewer.id) {
      throw new SelfReviewForbiddenError(
        'Editor không thể tự duyệt nội dung do chính mình biên tập (Quy tắc 4 mắt / Two-person rule).',
      );
    }

    // 4. Require comment on rejection
    if (input.decision === 'rejected' && (!input.comment || !input.comment.trim())) {
      throw new Error('Cần cung cấp lý do/nhận xét khi từ chối phê duyệt nội dung.');
    }

    const now = new Date().toISOString();
    item.status = input.decision;
    item.reviewerId = reviewer.id;
    item.reviewComment = input.comment ?? null;
    item.reviewedAt = now;

    if (item.groupData) {
      item.groupData.status = input.decision;
      item.groupData.reviewerId = reviewer.id;
      item.groupData.reviewComment = input.comment ?? null;
      item.groupData.updatedAt = now;
    }

    this.auditLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      targetType: item.targetType,
      targetId: item.targetId,
      version: item.version,
      actorId: reviewer.id,
      action: input.decision,
      comment: input.comment,
      timestamp: now,
    });

    return item;
  }
}
