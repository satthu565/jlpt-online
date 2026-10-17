'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import type { AuditLogEntry } from '../../features/users/types';
import { AuditLogTimeline } from '../../features/users/user-components';
import { t } from '../../lib/i18n';

export interface AuditLogsPageProps {
  initialLogs?: AuditLogEntry[];
}

export default function AuditLogsPage({ initialLogs = [] }: AuditLogsPageProps = {}): React.JSX.Element {
  const { user, token, locale } = useAdminAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/audit-logs?limit=50', {
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

      const data = (await res.json()) as { items?: AuditLogEntry[] };
      if (Array.isArray(data.items)) {
        setLogs(data.items);
      }
    } catch {
      // Offline fallback: retain current logs
    } finally {
      setIsLoading(false);
    }
  }, [token, locale]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <AdminGuard pathname="/audit-logs" requiredRoles={['admin']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            Nhật ký kiểm toán hệ thống (Audit Logs - ADM-14)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ghi nhận toàn bộ thao tác phân quyền, xuất bản đề thi và thay đổi cấu hình với đầy đủ dấu vết an toàn.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="audit-error-alert"
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={() => void fetchLogs()}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
            >
              {t('common.retry', locale)}
            </button>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            data-testid="audit-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        {user && <AuditLogTimeline logs={logs} />}
      </div>
    </AdminGuard>
  );
}
