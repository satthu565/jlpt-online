export type NotebookItemKind = 'vocab' | 'grammar' | 'kanji';

export interface NotebookItem {
  id: string;
  userId: string;
  kind: NotebookItemKind;
  entryId?: string;
  term: string;
  reading?: string;
  hanViet?: string;
  meaning: string;
  partOfSpeech?: string;
  examples?: string[];
  notes?: string;
  strokeCount?: number;
  mastered: boolean;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotebookItemInput {
  kind: NotebookItemKind;
  term: string;
  reading?: string;
  hanViet?: string;
  meaning: string;
  partOfSpeech?: string;
  examples?: string[];
  notes?: string;
  strokeCount?: number;
  tags?: string[];
}

export interface UpdateNotebookItemInput {
  term?: string;
  reading?: string;
  hanViet?: string;
  meaning?: string;
  partOfSpeech?: string;
  examples?: string[];
  notes?: string;
  mastered?: boolean;
  tags?: string[];
  expectedVersion?: number;
}

export interface QuestionExample {
  questionId: string;
  level: string;
  skill: string;
  stem: string;
  passage?: string;
  matchedTerm: string;
}

export interface DueFlashcard {
  cardId: string;
  notebookItemId: string;
  front: {
    term?: string;
    reading?: string;
    prompt?: string;
    [key: string]: unknown;
  };
  back: {
    meaning?: string;
    reading?: string;
    hanViet?: string;
    examples?: string[];
    [key: string]: unknown;
  };
  dueAt: string;
  intervalDays: number;
  repetitions: number;
  easeFactor?: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  kind?: NotebookItemKind;
}

export type ReviewRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface ReviewSubmission {
  cardId: string;
  clientReviewId: string;
  rating: ReviewRating;
  reviewedAt: string;
  timezone: string;
}

export interface ReviewResult {
  cardId: string;
  nextDueAt: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  state: string;
  isIdempotentReplay: boolean;
  reviewedAt: string;
}

export interface SyncQueueItem {
  id: string; // clientReviewId
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  timezone: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  error?: string;
}

export interface NotebookQuizQuestion {
  id: string;
  stem: string;
  options: string[];
  correctOptionIndex: number;
  kind: NotebookItemKind;
  notebookItemId: string;
  explanation?: string;
}

export interface NotebookQuiz {
  quizId: string;
  questions: NotebookQuizQuestion[];
  totalQuestions: number;
  createdAt: string;
}

export interface TTSResponse {
  audioUrl: string;
  format: 'mp3' | 'wav';
  license: string;
  attribution: string;
  status: 'READY' | 'SANDBOX';
}
