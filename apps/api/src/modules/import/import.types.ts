export interface ImportJobSummary {
  id: string;
  status: 'pending' | 'succeeded' | 'failed';
  packageSha256: string;
  fileName: string;
  targetLevel?: string | null;
  packageId?: string;
  revision?: number;
  contentHash?: string;
  createdAt: Date;
  completedAt?: Date | null;
  message?: string;
  idempotent?: boolean;
}

export interface ImportPackageOptions {
  mode?: 'draft' | 'ready';
  targetLevel?: string;
}
