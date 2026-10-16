import type { Blueprint, PublicExamSnapshot, ExamAnswerKey } from '@jlpt/schema';
import type { AdminExam } from '../content/types';
import type { StaffOperator } from '../review/types';

export type ExamStatus = 'draft' | 'published' | 'takedown' | 'archived';

export interface PublishedVersionRecord {
  version: number;
  publishedAt: string;
  publishedBy: string;
  snapshot: PublicExamSnapshot;
  answerKey: ExamAnswerKey;
  takedownAt?: string | null;
  takedownBy?: string | null;
  takedownReason?: string | null;
}

export interface PrePublishValidationResult {
  valid: boolean;
  violations: string[];
}

export class ExamActionForbiddenError extends Error {
  public readonly code = 'EXAM_ACTION_FORBIDDEN';
  constructor(message = 'Chỉ Quản trị viên (Admin) mới có quyền xuất bản hoặc gỡ đề thi.') {
    super(message);
    this.name = 'ExamActionForbiddenError';
  }
}

export class ExamValidationError extends Error {
  public readonly code = 'EXAM_VALIDATION_FAILED';
  public readonly violations: string[];
  constructor(message: string, violations: string[] = []) {
    super(message);
    this.name = 'ExamValidationError';
    this.violations = violations;
  }
}

export class ExamImmutableVersionError extends Error {
  public readonly code = 'IMMUTABLE_VERSION';
  constructor(
    message = 'Không thể sửa đè đề thi đã xuất bản (published version is immutable). Hãy tạo bản thảo mới (branch new draft).',
  ) {
    super(message);
    this.name = 'ExamImmutableVersionError';
  }
}

export type { AdminExam, Blueprint, StaffOperator };
