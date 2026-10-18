export type AllowedOperatorJobType = 'base-backup' | 'export-bundle' | 'restore-pitr';

export interface OperatorBackupJob {
  id: string;
  jobType: AllowedOperatorJobType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  initiatedBy: string;
  operatorEmail?: string;
  tenantId: string;
  sizeBytes?: number;
  sanitizedConfig?: Record<string, string>;
  outputLocation?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface BackupManagerSummary {
  totalJobs: number;
  lastBackupAt?: string;
  lastDrillAt?: string;
  jobs: OperatorBackupJob[];
}

export interface BackupFilterCriteria {
  jobType?: AllowedOperatorJobType;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

export interface BackupSummary extends BackupManagerSummary {
  totalJobsCount: number;
  lastSuccessfulBaseBackup?: string;
  lastSuccessfulPitrDrill?: string;
  totalSizeBytes: number;
  isRpoMet: boolean;
}

