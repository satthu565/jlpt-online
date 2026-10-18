export type NotebookItemKind = 'vocab' | 'grammar' | 'kanji';

export interface NotebookItemDto {
  id: string;
  userId: string;
  kind: NotebookItemKind;
  entryId: string;
  term?: string;
  reading?: string;
  meaning?: string;
  hanViet?: string;
  partOfSpeech?: string;
  examples?: string[];
  strokeCount?: number;
  mastered: boolean;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotebookItemDto {
  kind: NotebookItemKind;
  entryId?: string;
  term?: string;
  reading?: string;
  meaning?: string;
  hanViet?: string;
  partOfSpeech?: string;
  examples?: string[];
  strokeCount?: number;
  mastered?: boolean;
  tags?: string[];
}

export interface UpdateNotebookItemDto {
  mastered?: boolean;
  tags?: string[];
  expectedVersion?: number;
}

export interface NotebookQueryDto {
  kind?: NotebookItemKind;
  mastered?: boolean;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CardDto {
  id: string;
  userId: string;
  notebookItemId: string;
  front: Record<string, unknown>;
  back: Record<string, unknown>;
  status: string;
  createdAt: string;
  schedule?: CardScheduleDto;
}

export interface CardScheduleDto {
  cardId: string;
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
}

export interface GenerateCardsDto {
  template?: 'term_to_meaning' | 'meaning_to_term' | 'kanji_to_reading' | 'grammar_pattern';
}

export interface SubmitReviewDto {
  cardId: string;
  clientReviewId: string;
  rating: 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy
  timezone?: string;
  reviewedAt?: string;
}

export interface ReviewResultDto {
  cardId: string;
  nextDueAt: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  state: string;
  isIdempotentReplay: boolean;
  reviewedAt: string;
}

export interface DueCardsQueryDto {
  timezone?: string;
  limit?: number;
}

export interface DueCardsResponseDto {
  items: Array<{
    cardId: string;
    notebookItemId: string;
    front: Record<string, unknown>;
    back: Record<string, unknown>;
    dueAt: string;
    intervalDays: number;
    repetitions: number;
    state: string;
    kind?: NotebookItemKind;
  }>;
  totalCount: number;
  timezone: string;
  asOf: string;
}

export interface NotebookQuizRequestDto {
  kind?: NotebookItemKind;
  tags?: string[];
  count?: number;
  seed?: number;
}

export interface NotebookQuizItemDto {
  id: string;
  stem: string;
  options: string[];
  correctOptionIndex: number;
  kind: NotebookItemKind;
  notebookItemId: string;
  explanation?: string;
  hanViet?: string;
}

export interface NotebookQuizResponseDto {
  quizId: string;
  questions: NotebookQuizItemDto[];
  totalQuestions: number;
  createdAt: string;
}

export interface NotebookExportRequestDto {
  kind?: NotebookItemKind;
  tags?: string[];
  mastered?: boolean;
}

export interface TTSRequestDto {
  text: string;
  locale?: string;
  voice?: string;
  entryId?: string;
}

export interface TTSResponseDto {
  audioUrl: string;
  format: 'mp3' | 'wav';
  license: string;
  attribution: string;
  isExternal: boolean;
  status: 'READY' | 'SANDBOX';
  quota: {
    remaining: number;
    resetAt: string;
  };
}

export interface QuestionExampleDto {
  questionId: string;
  level: string;
  skill: string;
  stem: string;
  passage?: string;
  matchedTerm: string;
}
