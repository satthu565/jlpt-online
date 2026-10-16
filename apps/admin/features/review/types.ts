import type { Role } from '@jlpt/schema';
import type { AdminQuestionGroup } from '../content/types';

export type ReviewTargetType = 'question_group' | 'exam' | 'explanation';
export type ReviewItemStatus = 'draft' | 'in_review' | 'approved' | 'rejected';
export type ReviewDecision = 'approved' | 'rejected';

export interface ReviewItem {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  version: number;
  title: string;
  status: ReviewItemStatus;
  authorId: string;
  lastEditedBy: string;
  reviewerId?: string | null;
  reviewComment?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  sourceRef?: string;
  sourcePage?: number;
  groupData?: AdminQuestionGroup;
}

export interface ReviewAuditLog {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  version: number;
  actorId: string;
  action: 'submitted' | 'approved' | 'rejected' | 'edited';
  comment?: string;
  timestamp: string;
}

export interface ReviewDecisionInput {
  decision: ReviewDecision;
  comment?: string;
}

export class SelfReviewForbiddenError extends Error {
  public readonly code = 'SELF_REVIEW_FORBIDDEN';
  constructor(
    message = 'Editor không thể tự duyệt nội dung do chính mình biên tập (Quy tắc 4 mắt / Two-person rule).',
  ) {
    super(message);
    this.name = 'SelfReviewForbiddenError';
  }
}

export class ReviewPermissionError extends Error {
  public readonly code = 'REVIEW_FORBIDDEN';
  constructor(message = 'Chỉ người duyệt (Reviewer) hoặc Quản trị viên mới có quyền phê duyệt nội dung.') {
    super(message);
    this.name = 'ReviewPermissionError';
  }
}

export interface StaffOperator {
  id: string;
  email: string;
  role: Role;
  name?: string;
}
