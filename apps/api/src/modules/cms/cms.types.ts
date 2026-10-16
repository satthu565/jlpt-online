import type {
  Level,
  MondaiType,
  RichBlock,
  RichText,
  Skill,
  ExamKind,
  PublicExamSnapshot,
  ExamAnswerKey,
} from '@jlpt/schema';

export interface CreateGroupInput {
  level: Level;
  sectionCode: string;
  mondaiType: MondaiType;
  skill: Skill;
  title?: string;
  instructions: RichText;
  passage?: RichBlock[] | null;
  audioSha256?: string;
  audioMediaKey?: string;
  mediaIds?: string[];
  questions: {
    tempId?: string;
    stem: RichText;
    options: { label: string; content: RichText }[];
    correctOption: number;
    explanation?: RichText;
    tags?: string[];
  }[];
  sourceRef: string;
  sourcePage?: number;
}

export interface UpdateGroupInput {
  title?: string;
  instructions?: RichText;
  passage?: RichBlock[] | null;
  audioSha256?: string;
  audioMediaKey?: string;
  mediaIds?: string[];
  questions?: {
    questionId?: string;
    tempId?: string;
    stem: RichText;
    options: { label: string; content: RichText }[];
    correctOption: number;
    explanation?: RichText;
    tags?: string[];
  }[];
  sourceRef?: string;
  sourcePage?: number;
}

export interface CreateExamInput {
  slug: string;
  level: Level;
  title: string;
  kind: ExamKind;
  year?: number;
  session?: string;
  description: string;
  blueprintId: string;
  blueprintVersion: number;
  sourceRefs: string[];
}

export interface UpdateExamInput {
  title?: string;
  description?: string;
  sourceRefs?: string[];
}

export interface ExamPublishResult {
  examId: string;
  version: number;
  publishedAt: string;
  snapshot: PublicExamSnapshot;
  answerKey: ExamAnswerKey;
}
