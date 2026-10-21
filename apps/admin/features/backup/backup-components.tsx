import { AlertTriangle, Check } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@jlpt/ui/components/button';
import type { BackupService } from './backup-service';
import type { OperatorBackupJob, BackupSummary } from './types';
import type { StaffUser } from '../../lib/auth-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';

export interface BackupManagerViewProps {
  backupService?: BackupService;
  currentUser: StaffUser | null;
  jobs?: OperatorBackupJob[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onTrigger?: (jobType: string) => Promise<void>;
}

export function BackupManagerView({
  backupService,
  currentUser,
  jobs,
  isLoading,
  error,
  onRetry,
  onTrigger,
}: BackupManagerViewProps): React.JSX.Element {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [internalSummary, setInternalSummary] = useState<BackupSummary | null>(() =>
    backupService ? backupService.getSummary() : null,
  );

  const displayJobs = jobs !== undefined ? jobs : (internalSummary?.jobs ?? []);
  const summary: BackupSummary = {
    jobs: displayJobs,
    totalJobs: displayJobs.length,
    totalJobsCount: displayJobs.length,
    lastSuccessfulBaseBackup: displayJobs.find((j) => j.jobType === 'base-backup' && j.status === 'completed')?.completedAt,
    lastSuccessfulPitrDrill: displayJobs.find((j) => j.jobType === 'restore-pitr' && j.status === 'completed')?.completedAt,
    totalSizeBytes: displayJobs.filter((j) => j.status === 'completed').reduce((sum, j) => sum + (j.sizeBytes || 0), 0),
    isRpoMet: Boolean(displayJobs.find((j) => j.jobType === 'base-backup' && j.status === 'completed')),
  };

  const handleTrigger = async (jobType: 'base-backup' | 'restore-pitr' | 'export-bundle') => {
    setInternalError(null);
    setSuccessMsg(null);

    if (!currentUser) {
      setInternalError('Chưa xác thực người vận hành.');
      return;
    }

    if (onTrigger) {
      try {
        await onTrigger(jobType);
        setSuccessMsg(`Đã kích hoạt thành công operator job: ${jobType}.`);
      } catch (err: unknown) {
        setInternalError(err instanceof Error ? err.message : 'Lỗi khi kích hoạt operator job.');
      }
      return;
    }

    if (backupService) {
      try {
        const job = await backupService.triggerJob(
          jobType,
          currentUser.id,
          currentUser.email,
          {},
          'global',
        );

        setInternalSummary(backupService.getSummary());
        setSuccessMsg(`Đã kích hoạt thành công operator job: ${job.jobType} (${job.id}).`);
      } catch (err: unknown) {
        setInternalError(err instanceof Error ? err.message : 'Lỗi khi kích hoạt operator job.');
      }
    }
  };

  const activeError = error || internalError;

  return (
    <div data-testid="backup-management-panel" className="space-y-6">
      {/* Security alert notice */}
      <div
        data-testid="backup-security-notice"
        className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1"
      >
        <div className="font-bold uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <span>Chính sách bảo vệ an toàn &amp; vận hành sao lưu</span>
        </div>
        <p>
          Toàn bộ thao tác sao lưu hệ thống, diễn tập khôi phục PITR (Point-In-Time Recovery) và xuất gói dữ liệu kiểm toán
          phải tuân thủ các quy tắc bảo mật. Mọi biến môi trường nhạy cảm (mật khẩu DB, private token, access keys) tự động bị khử định danh thành <code>[REDACTED_SECRET]</code> trước khi lưu nhật ký.
        </p>
      </div>

      {activeError && (
        <div
          role="alert"
          data-testid="backup-error-alert"
          className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between"
        >
          <span>{activeError}</span>
          {onRetry && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onRetry}
            >
              Thử lại
            </Button>
          )}
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="backup-loading"
          className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải danh sách tác vụ sao lưu...</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          data-testid="backup-success-alert"
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm"
        >
          <Check className="inline size-4 align-[-2px]" aria-hidden="true" /> {successMsg}
        </div>
      )}

      {/* SLA & Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-4">
          <div className="text-xs text-gray-500">Mục tiêu Điểm khôi phục (RPO)</div>
          <div data-testid="backup-rpo-indicator" className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${summary.isRpoMet ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>≤ 5 phút (WAL-G R2)</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            Trạng thái: {summary.isRpoMet ? 'Đạt chuẩn SLA' : 'Cần diễn tập'}
          </div>
        </div>

        <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-4">
          <div className="text-xs text-gray-500">Bản sao lưu Base gần nhất</div>
          <div data-testid="last-base-backup" className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-1">
            {summary.lastSuccessfulBaseBackup ? new Date(summary.lastSuccessfulBaseBackup).toLocaleString('vi-VN') : 'Chưa ghi nhận'}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Tần suất: Hằng ngày (03:00 UTC)</div>
        </div>

        <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-4">
          <div className="text-xs text-gray-500">Lần diễn tập PITR gần nhất</div>
          <div data-testid="last-pitr-drill" className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-1">
            {summary.lastSuccessfulPitrDrill ? new Date(summary.lastSuccessfulPitrDrill).toLocaleString('vi-VN') : 'Chưa ghi nhận'}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Môi trường: Staging Isolated DB</div>
        </div>

        <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-4">
          <div className="text-xs text-gray-500">Tổng dung lượng sao lưu</div>
          <div data-testid="total-backup-size" className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-1">
            {Math.round((summary.totalSizeBytes / 1024 / 1024) * 10) / 10} MB
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">{summary.totalJobsCount} bản ghi hoàn tất</div>
        </div>
      </div>

      {/* Operator Trigger Actions */}
      <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-4 space-y-3">
        <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200">Kích hoạt tác vụ sao lưu / diễn tập thủ công</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            data-testid="btn-trigger-base-backup"
            onClick={() => void handleTrigger('base-backup')}
          >
            Chạy Base Backup (WAL-G)
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-testid="btn-trigger-export-bundle"
            onClick={() => void handleTrigger('export-bundle')}
          >
            Xuất gói dữ liệu quản trị (Sanitized)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="btn-trigger-restore-pitr"
            onClick={() => void handleTrigger('restore-pitr')}
          >
            Diễn tập khôi phục PITR (Staging Isolated)
          </Button>
        </div>
      </div>

      {/* Backup Jobs History Table */}
      <div className="overflow-x-auto">
        <Table data-testid="backup-jobs-table" className="text-left">
          <TableHeader className="font-semibold">
            <TableRow>
              <TableHead>Mã Job</TableHead>
              <TableHead>Loại tác vụ</TableHead>
              <TableHead>Người vận hành</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Dung lượng</TableHead>
              <TableHead>Vị trí lưu trữ</TableHead>
              <TableHead>Thời gian hoàn thành</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} data-testid="backup-empty" className="text-center italic">
                  Chưa có tác vụ sao lưu nào được thực thi. Nhấn nút bên trên để khởi tạo bản sao lưu mới.
                </TableCell>
              </TableRow>
            ) : (
              summary.jobs.map((job) => (
                <TableRow key={job.id} data-testid={`backup-job-${job.id}`}>
                  <TableCell className="font-mono font-medium">{job.id}</TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded font-mono bg-blue-50 text-blue-700 font-semibold">
                      {job.jobType}
                    </span>
                  </TableCell>
                  <TableCell data-testid={`backup-actor-${job.id}`} className="font-medium">
                    {job.operatorEmail || job.initiatedBy || 'admin@jlpt.local'}
                  </TableCell>
                  <TableCell data-testid={`backup-tenant-${job.id}`} className="font-semibold">
                    {job.tenantId || 'global'}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium">
                      {job.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">
                    {job.sizeBytes ? `${Math.round((job.sizeBytes / 1024 / 1024) * 10) / 10} MB` : '—'}
                  </TableCell>
                  <TableCell className="font-mono truncate max-w-xs">{job.outputLocation || '—'}</TableCell>
                  <TableCell>
                    {job.completedAt ? new Date(job.completedAt).toLocaleString('vi-VN') : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
