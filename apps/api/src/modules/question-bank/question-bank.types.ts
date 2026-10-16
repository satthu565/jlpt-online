import type { Level, MondaiType, QuestionOrigin, ReviewStatus, Skill } from '@jlpt/schema';

export interface AnswerOptionInput {
  orderIndex: number;
  content: unknown; // RichText or RichBlock
}

export interface QuestionInput {
  tempId?: string;
  number?: string;
  stem: unknown; // RichText
  options: AnswerOptionInput[];
  correctOption: number;
  explanation?: unknown;
  skill: Skill;
  mondaiType: MondaiType;
  origin?: QuestionOrigin;
}

export interface CreateQuestionGroupDto {
  level: Level;
  sectionCode: string;
  title?: string;
  sourceId?: string;
  licenseId?: string;
  passage?: unknown;
  audioSha256?: string;
  questions: QuestionInput[];
}

export interface UpdateQuestionGroupDto {
  title?: string;
  level?: Level;
  sectionCode?: string;
  sourceId?: string;
  licenseId?: string;
  passage?: unknown;
  audioSha256?: string;
  questions?: QuestionInput[];
}

export interface ReviewDecisionDto {
  decision: 'approved' | 'rejected';
  comment?: string;
  expectedVersion?: number;
}

export interface HideGroupDto {
  reason: string;
}

export interface QuestionSearchFilters {
  level?: Level;
  skill?: Skill;
  mondaiType?: MondaiType;
  status?: ReviewStatus;
  sourceId?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface GroupSearchFilters {
  level?: Level;
  sectionCode?: string;
  status?: ReviewStatus;
  sourceId?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}
