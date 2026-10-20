'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@jlpt/ui';
import type { BillingManager } from './billing-service';
import type { AdminReconciliationRun, AdminDiscrepancyItem } from './types';
import type { StaffUser } from '../../lib/auth-context';
import { useOptionalAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface ReconciliationManagerProps {
  initialRuns?: AdminReconciliationRun[];
  billingManager?: BillingManager;
  currentUser?: StaffUser | null;
}

interface RawReconciliationRun {
  id: string;
  provider?: string;
  periodStart?: string;
  periodEnd?: string;
  discrepanciesFound?: number;
  discrepancies?: AdminDiscrepancyItem[];
  status?: 'reconciled' | 'discrepancy_detected';
  runAt?: string;
}

export function ReconciliationManager({
  initialRuns,
  currentUser: _currentUser,
}: ReconciliationManagerProps): React.JSX.Element {
  const auth = useOptionalAdminAuth();
  const token = auth?.token ?? null;
  const locale = auth?.locale ?? 'vi';
  const [runs, setRuns] = useState<AdminReconciliationRun[]>(() => initialRuns ?? []);
  const [selectedRun, setSelectedRun] = useState<AdminReconciliationRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/admin/reconciliation/runs', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setErrorMsg(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setErrorMsg(t('auth.forbidden', locale));
        } else {
          setErrorMsg(t('common.error', locale));
        }
        return;
      }

      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.runs || data.items || [];
      if (Array.isArray(rawList)) {
        setRuns(
          (rawList as RawReconciliationRun[]).map((r: RawReconciliationRun) => ({
            id: r.id,
            provider: r.provider || 'payos',
            periodStart: r.periodStart ? new Date(r.periodStart).toISOString() : new Date().toISOString(),
            periodEnd: r.periodEnd ? new Date(r.periodEnd).toISOString() : new Date().toISOString(),
            discrepanciesFound: Number(r.discrepanciesFound ?? (Array.isArray(r.discrepancies) ? r.discrepancies.length : 0)),
            discrepancies: Array.isArray(r.discrepancies) ? r.discrepancies : [],
            status: r.status || (Number(r.discrepanciesFound || 0) === 0 ? 'reconciled' : 'discrepancy_detected'),
            runAt: r.runAt ? new Date(r.runAt).toISOString() : new Date().toISOString(),
          })),
        );
      }
    } catch {
      setErrorMsg(t('common.error', locale));
    } finally {
      setIsLoading(false);
    }
  }, [token, locale]);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  const handleRunReconciliation = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/admin/reconciliation/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify({
          provider: 'payos',
          externalStatements: [],
        }),
      });

      if (res.ok) {
        const newRun = await res.json();
        const formattedRun: AdminReconciliationRun = {
          id: newRun.id || newRun.runId || `rec_run_${Date.now()}`,
          provider: newRun.provider || 'payos',
          periodStart: newRun.periodStart || new Date().toISOString(),
          periodEnd: newRun.periodEnd || new Date().toISOString(),
          discrepanciesFound: Number(newRun.discrepanciesFound || 0),
          discrepancies: Array.isArray(newRun.discrepancies) ? newRun.discrepancies : [],
          status: newRun.status || (Number(newRun.discrepanciesFound || 0) === 0 ? 'reconciled' : 'discrepancy_detected'),
          runAt: newRun.runAt || new Date().toISOString(),
        };
        setSelectedRun(formattedRun);
        setSuccessMsg(
          `Đã hoàn tất đối soát kỳ ${formattedRun.id}. Trạng thái: ${
            formattedRun.status === 'reconciled' ? 'Khớp 100%' : 'Có sai lệch'
          }.`,
        );
        void fetchRuns();
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Lỗi khi chạy đối soát.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi chạy đối soát.');
    }
  };

  return (
    <div data-testid="reconciliation-panel" className="space-y-6 font-sans">
      <div className="p-4 md:p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div>
          <h2 data-testid="reconciliation-heading" className="text-base font-bold text-gray-900 dark:text-gray-100">
            Đối soát Giao dịch &amp; Hoàn tiền (Payment Reconciliation)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('commercial.reconciliationSubtitle', locale)}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          data-testid="btn-run-reconciliation"
          onClick={handleRunReconciliation}
          className="self-start sm:self-auto text-xs"
        >
          {t('commercial.runReconciliation', locale)}
        </Button>
      </div>

      {successMsg && (
        <div data-testid="reconciliation-success-alert" className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded text-xs">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          data-testid="reconciliation-error-alert"
          className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-xs flex items-center justify-between"
        >
          <span>{errorMsg}</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void fetchRuns()}
            className="text-[11px] h-7 px-2.5"
          >
            {t('common.retry', locale)}
          </Button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="reconciliation-loading"
          className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading', locale)}</span>
        </div>
      )}

      {runs.length === 0 && !isLoading && !errorMsg ? (
        <div data-testid="reconciliation-empty" className="p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-100 dark:border-gray-700 text-xs">
          {t('commercial.emptyReconciliation', locale)}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto shadow-xs">
          <table data-testid="reconciliation-runs-table" className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Mã phiên</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Cổng thanh toán</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Kỳ đối soát</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Số sai lệch</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Thời gian chạy</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 uppercase">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {runs.map((r) => (
                <tr key={r.id} data-testid={`reconciliation-row-${r.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-gray-100">{r.id}</td>
                  <td className="px-4 py-3 font-semibold uppercase text-gray-900 dark:text-gray-100">{r.provider}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {new Date(r.periodStart).toLocaleDateString('vi-VN')} –{' '}
                    {new Date(r.periodEnd).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      data-testid={`discrepancy-badge-${r.id}`}
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        r.discrepanciesFound === 0
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {r.discrepanciesFound} sai lệch
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        r.status === 'reconciled'
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {r.status === 'reconciled' ? 'Khớp hoàn toàn' : 'Phát hiện lệch'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(r.runAt).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-testid={`btn-view-run-${r.id}`}
                      onClick={() => setSelectedRun(r)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium h-7 px-2"
                    >
                      Xem
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRun && (
        <div data-testid="reconciliation-detail-modal" className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
              Chi tiết đối soát phiên: <code className="text-blue-700 dark:text-blue-400">{selectedRun.id}</code>
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRun(null)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium h-7 px-2"
            >
              Đóng ✕
            </Button>
          </div>

          {selectedRun.discrepanciesFound === 0 ? (
            <div data-testid="reconciliation-no-discrepancy" className="p-3 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300">
              ✓ Toàn bộ đơn hàng và khoản hoàn tiền khớp 100% với chứng từ cổng thanh toán. Không có giao dịch thất thoát.
            </div>
          ) : (
            <div data-testid="reconciliation-discrepancies-list" className="space-y-2">
              {(selectedRun.discrepancies || []).map((disc, idx) => (
                <div key={idx} data-testid={`discrepancy-item-${idx}`} className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded text-xs space-y-1">
                  <div className="flex items-center justify-between text-red-800 dark:text-red-300 font-semibold">
                    <span>Loại: <code>{disc.type}</code></span>
                    <span>Đơn hàng: {disc.orderId || 'N/A'}</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{disc.description}</p>
                  {disc.expectedAmountMinor !== undefined && disc.actualAmountMinor !== undefined && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Dự kiến: {disc.expectedAmountMinor} • Thực tế: {disc.actualAmountMinor}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
