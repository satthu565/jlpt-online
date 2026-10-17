import type { AllowedOperatorJobType, BackupManagerSummary, OperatorBackupJob } from './types';
import type { AuditLogService } from '../users/audit-service';

export const ALLOWED_OPERATOR_JOBS: readonly AllowedOperatorJobType[] = [
  'base-backup',
  'export-bundle',
  'restore-pitr',
] as const;

const SENSITIVE_KEY_PATTERN = /pass|secret|key|token|auth|credential|cert|salt|private/i;

export class BackupService {
  private jobs: OperatorBackupJob[] = [];

  constructor(
    private readonly auditService?: AuditLogService,
    initialJobs: OperatorBackupJob[] = [],
  ) {
    this.jobs = [...initialJobs];
  }

  /**
   * Sanitizes configuration snapshots: masks any credentials or secrets so raw values NEVER enter browser state.
   */
  public sanitizeConfig(rawConfig: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawConfig)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        sanitized[k] = '[REDACTED_SECRET]';
      } else {
        sanitized[k] = String(v);
      }
    }
    return sanitized;
  }

  /**
   * Triggers an authorized operator job only. Rejects arbitrary commands or shell injections.
   */
  public triggerJob(
    jobType: string,
    operator: { id: string; email?: string; role: string; tenantId?: string },
    configSnapshot?: Record<string, string>,
  ): OperatorBackupJob {
    if (operator.role !== 'admin') {
      throw new Error('Chỉ quản trị viên cấp cao (Admin) mới có quyền kích hoạt tác vụ sao lưu và phục hồi.');
    }

    if (!ALLOWED_OPERATOR_JOBS.includes(jobType as AllowedOperatorJobType)) {
      throw new Error(
        `Từ chối lệnh trái phép: "${jobType}". Giao diện quản trị chỉ cho phép kích hoạt các operator job đã được phê duyệt (${ALLOWED_OPERATOR_JOBS.join(', ')}).`,
      );
    }

    const tenantId = operator.tenantId || 'global';
    const jobId = `job_${jobType.replace(/-/g, '_')}_${Date.now()}`;
    const sanitizedConfig = configSnapshot ? this.sanitizeConfig(configSnapshot) : undefined;

    const newJob: OperatorBackupJob = {
      id: jobId,
      jobType: jobType as AllowedOperatorJobType,
      status: 'completed',
      initiatedBy: operator.id,
      operatorEmail: operator.email,
      tenantId,
      sizeBytes: jobType === 'export-bundle' ? 1024 * 512 : 1024 * 1024 * 52,
      sanitizedConfig,
      outputLocation:
        jobType === 'restore-pitr'
          ? 'staging-pitr-drill-verified'
          : `s3://jlpt-backups/prod/${jobId}.tar.gz`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    this.jobs.unshift(newJob);

    // Record audit log with actor and tenant
    if (this.auditService) {
      this.auditService.recordAction(
        {
          id: operator.id,
          email: operator.email,
          role: operator.role,
          tenantId,
        },
        'backup_job_trigger',
        'backup_jobs',
        jobId,
        {
          jobType,
          tenantId,
          sanitizedConfig,
        },
      );
    }

    return newJob;
  }

  public listJobs(): OperatorBackupJob[] {
    return [...this.jobs];
  }

  public getSummary(): BackupManagerSummary {
    const lastBackup = this.jobs.find((j) => j.jobType === 'base-backup' && j.status === 'completed');
    const lastDrill = this.jobs.find((j) => j.jobType === 'restore-pitr' && j.status === 'completed');

    return {
      totalJobs: this.jobs.length,
      lastBackupAt: lastBackup?.completedAt,
      lastDrillAt: lastDrill?.completedAt,
      jobs: [...this.jobs],
    };
  }
}
