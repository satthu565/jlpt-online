import type {
  AttemptMode,
  AttemptStatus,
  MondaiType,
  PublicExamSnapshot,
  PublicOption,
  RichBlock,
  RichText,
} from '@jlpt/schema';

export type SyncState = 'saved' | 'saving' | 'offline_saved' | 'error' | 'conflict';

export interface StoredAttempt {
  attemptId: string;
  examId: string;
  lease: string;
  mode: AttemptMode;
  status: AttemptStatus;
  currentSection: number;
  answers: number[];
  flags: number[];
  timeSpentMs?: number[];
  lastAckedSeq: number;
  currentSeq: number;
  clientStartedAt: string;
  sectionDeadlines: Record<number, string>;
  updatedAt: string;
}

export interface OutboxEntry {
  id?: number;
  attemptId: string;
  lease: string;
  seq: number;
  answers: number[];
  flags: number[];
  timeSpentMs?: number[];
  changes: Array<{ i: number; v: number; at: number }>;
  status: 'pending' | 'syncing' | 'acked' | 'failed';
  createdAt: string;
  sentAt?: string;
  ackedAt?: string;
  error?: string;
  retries: number;
}

export interface ExamSessionState {
  examId: string;
  attemptId: string;
  lease: string;
  mode: AttemptMode;
  status: AttemptStatus;
  snapshot: PublicExamSnapshot;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  answers: number[];
  flags: number[];
  timeSpentMs: number[];
  lastAckedSeq: number;
  currentSeq: number;
  syncState: SyncState;
  syncErrorMessage?: string;
  serverNow: string;
  sectionDeadlines: Record<number, string>;
  lockedSections: number[];
}

export interface FlatQuestionItem {
  globalIndex: number;
  sectionIndex: number;
  sectionCode: string;
  sectionTitle: string;
  groupIndex: number;
  groupId: string;
  mondaiType: MondaiType;
  instructions: RichText;
  passage: RichBlock[] | null;
  questionId: string;
  number: string;
  stem: RichText;
  options: PublicOption[];
  media?: string[];
  isLocked: boolean;
}
