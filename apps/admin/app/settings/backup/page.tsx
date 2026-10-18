'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { BackupManagerView } from '../../../features/backup';
import type { OperatorBackupJob } from '../../../features/backup/types';
import { t } from '../../../lib/i18n';

export default function BackupSettingsPage(): React.JSX.Element {
  const { user, token, locale } = useAdminAuth();
  const [jobs, setJobs] = useState<OperatorBackupJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/settings/backup/jobs', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setError(t('auth.forbidden', locale));
        } else {
          setError(t('common.error', locale));
        }
        setIsLoading(false);
        return;
      }

      const data = (await res.json()) as { items?: OperatorBackupJob[] };
      setJobs(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError(t('common.error', locale));
    } finally {
      setIsLoading(false);
    }
  }, [token, locale]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const handleTrigger = async (jobType: string) => {
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/settings/backup/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify({
          jobType,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setError(t('auth.forbidden', locale));
        } else {
          setError(t('common.error', locale));
        }
        return;
      }

      await fetchJobs();
    } catch {
      setError(t('common.error', locale));
    }
  };

  return (
    <AdminGuard pathname="/settings/backup" requiredRoles={['admin']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            Sao lưu &amp; Phục hồi Hệ thống (ADM-20 / SYS-08)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản trị snapshot dữ liệu, diễn tập khôi phục điểm thời gian (PITR) với WAL-G lên Object Storage và xuất gói dữ liệu kiểm toán.
          </p>
        </div>

        <BackupManagerView
          jobs={jobs}
          currentUser={user}
          isLoading={isLoading}
          error={error}
          onRetry={fetchJobs}
          onTrigger={handleTrigger}
        />
      </div>
    </AdminGuard>
  );
}
