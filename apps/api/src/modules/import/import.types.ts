export interface ImportIssue {
  id: string;
  severity: 'blocking' | 'warning';
  path: string;
  reason: string;
  sourcePages?: number[];
}

export interface ImportJobSummary {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'draft_created' | 'DRAFT_ONLY' | 'READY_FOR_REVIEW' | 'replaced' | string;
  readiness?: 'DRAFT_ONLY' | 'READY_FOR_REVIEW' | 'INVALID';
  mode?: 'draft' | 'ready';
  packageSha256: string;
  fileName: string;
  targetLevel?: string | null;
  packageId?: string;
  revision?: number;
  contentHash?: string;
  blockingIssueCount?: number;
  nonBlockingIssueCount?: number;
  extractedQuestionsCount?: number;
  issues?: ImportIssue[];
  draftExamId?: string;
  createdAt: Date | string;
  completedAt?: Date | string | null;
  message?: string;
  idempotent?: boolean;
}

export interface ImportPackageOptions {
  mode?: 'draft' | 'ready';
  targetLevel?: string;
}
