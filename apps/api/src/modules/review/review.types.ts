export type ReviewTargetType = 'group_version' | 'question_version' | 'exam_version';

export interface SubmitReviewDto {
  targetType: ReviewTargetType;
  targetId: string;
  targetVersion: number;
}

export interface ReviewDecisionDto {
  decision: 'approved' | 'rejected';
  comments?: string;
}

export interface ContentReviewRecord {
  id: string;
  targetType: string;
  targetId: string;
  targetVersion: number;
  reviewerId: string;
  lastEditorId: string;
  status: string;
  comments: string | null;
  reviewedAt: Date;
}
