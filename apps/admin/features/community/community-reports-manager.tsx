'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from '@jlpt/ui/components/alert';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { apiClient } from '../../lib/api-client';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';

export interface CommunityReport {
  id: string;
  commentId: string;
  reason: string;
  status: 'pending' | 'in_review' | 'resolved' | 'dismissed';
  createdAt: string;
  content: string;
  isDeleted: boolean;
}

type Resolution = { status: 'resolved' | 'dismissed'; action: 'hide_comment' | 'none' };

/** Reported comments (GET admin/community-reports) with hide / dismiss actions (PATCH admin/community-reports/:id). */
export function CommunityReportsManager(): React.JSX.Element {
  const { locale } = useAdminAuth();
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.request<{ items?: CommunityReport[] }>('GET', '/api/v1/admin/community-reports', {
        requiredRoles: ['admin', 'moderator'],
      });
      setReports(Array.isArray(res?.items) ? res.items : []);
    } catch (err: unknown) {
      setError((err as Error)?.message || t('communityModeration.loadError', locale));
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (report: CommunityReport, resolution: Resolution) => {
    setBusyId(report.id);
    setError(null);
    setMessage(null);
    try {
      await apiClient.request('PATCH', `/api/v1/admin/community-reports/${encodeURIComponent(report.id)}`, {
        requiredRoles: ['admin', 'moderator'],
        body: { ...resolution, reason: report.reason },
      });
      setMessage(t('communityModeration.done', locale));
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || t('communityModeration.loadError', locale));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="community-reports-manager">
      <div className="flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={() => void load()} disabled={isLoading}>
          {t('communityModeration.refresh', locale)}
        </Button>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {isLoading ? (
        <p className="text-sm text-gray-500" data-testid="community-reports-loading" aria-busy="true">
          …
        </p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-gray-500" data-testid="community-reports-empty">
          {t('communityModeration.empty', locale)}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-left">
                <TableHead>{t('communityModeration.content', locale)}</TableHead>
                <TableHead>{t('communityModeration.reason', locale)}</TableHead>
                <TableHead>{t('communityModeration.status', locale)}</TableHead>
                <TableHead>{t('communityModeration.reportedAt', locale)}</TableHead>
                <TableHead>{t('communityModeration.actions', locale)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => {
                const open = r.status === 'pending' || r.status === 'in_review';
                return (
                  <TableRow key={r.id} data-testid="community-report-row">
                    <TableCell className="max-w-xs break-words">
                      {r.isDeleted ? t('communityModeration.deleted', locale) : r.content}
                    </TableCell>
                    <TableCell className="max-w-xs break-words">{r.reason}</TableCell>
                    <TableCell>
                      <Badge variant={open ? 'warning' : 'default'}>{t(`communityModeration.${r.status}`, locale)}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(r.createdAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>
                      {open && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={busyId === r.id}
                            onClick={() => void resolve(r, { status: 'resolved', action: 'hide_comment' })}
                          >
                            {t('communityModeration.hide', locale)}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busyId === r.id}
                            onClick={() => void resolve(r, { status: 'dismissed', action: 'none' })}
                          >
                            {t('communityModeration.dismiss', locale)}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
