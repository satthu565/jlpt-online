'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { BillingManager } from './billing-service';
import type { AdminReconciliationRun } from './types';
import type { StaffUser } from '../../lib/auth-context';
import { useOptionalAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface ReconciliationManagerProps {
  billingManager?: BillingManager;
  currentUser?: StaffUser | null;
}

export function ReconciliationManager({
  billingManager,
  currentUser,
}: ReconciliationManagerProps): React.JSX.Element {
  const auth = useOptionalAdminAuth();
  const token = auth?.token ?? null;
  const locale = auth?.locale ?? 'vi';
  const [runs, setRuns] = useState<AdminReconciliationRun[]>(() =>
    billingManager ? billingManager.listReconciliationRuns() : [],
  );
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

interface RawReconciliationRun {
  id: string;
  provider?: string;
  periodStart?: string;
  periodEnd?: string;
  discrepanciesFound?: number;
  discrepancies?: import('./types').AdminDiscrepancyItem[];
  status?: 'reconciled' | 'discrepancy_detected';
  runAt?: string;
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
      if (!billingManager) {
        setErrorMsg(t('common.error', locale));
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, locale, billingManager]);

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
      if (billingManager) {
        try {
          const newRun = billingManager.runReconciliation('payos', [], {
            id: currentUser?.id || 'admin_user',
            email: currentUser?.email,
            role: currentUser?.role || 'admin',
            tenantId: 'global',
          });
          setRuns(billingManager.listReconciliationRuns());
          setSelectedRun(newRun);
          setSuccessMsg(
            `Đã hoàn tất đối soát kỳ ${newRun.id}. Trạng thái: ${
              newRun.status === 'reconciled' ? 'Khớp 100%' : 'Có sai lệch'
            }.`,
          );
          return;
        } catch (bmErr: unknown) {
          setErrorMsg(bmErr instanceof Error ? bmErr.message : 'Lỗi khi chạy đối soát.');
          return;
        }
      }
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi chạy đối soát.');
    }
  };

  return (
    <div data-testid="reconciliation-panel" className="space-y-6">
      <div className="p-4 md:p-6 bg-white border border-gray-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 data-testid="reconciliation-heading" className="text-base font-bold text-gray-900">
            Đối soát Giao dịch &amp; Hoàn tiền (Payment Reconciliation - ADM-16)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('commercial.reconciliationSubtitle', locale)}
          </p>
        </div>
        <button
          type="button"
          data-testid="btn-run-reconciliation"
          onClick={handleRunReconciliation}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs self-start sm:self-auto"
        >
          {t('commercial.runReconciliation', locale)}
        </button>
      </div>

      {successMsg && (
        <div data-testid="reconciliation-success-alert" className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-xs">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          data-testid="reconciliation-error-alert"
          className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center justify-between"
        >
          <span>{errorMsg}</span>
          <button
            onClick={() => void fetchRuns()}
            className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
          >
            {t('common.retry', locale)}
          </button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="reconciliation-loading"
          className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading', locale)}</span>
        </div>
      )}

      {runs.length === 0 && !isLoading && !errorMsg ? (
        <div data-testid="reconciliation-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
          {t('commercial.emptyReconciliation', locale)}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table data-testid="reconciliation-runs-table" className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Mã phiên</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Cổng thanh toán</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Kỳ đối soát</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Số sai lệch</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Thời gian chạy</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {runs.map((r) => (
                <tr key={r.id} data-testid={`reconciliation-row-${r.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{r.id}</td>
                  <td className="px-4 py-3 font-semibold uppercase">{r.provider}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(r.periodStart).toLocaleDateString('vi-VN')} –{' '}
                    {new Date(r.periodEnd).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      data-testid={`discrepancy-badge-${r.id}`}
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        r.discrepanciesFound === 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {r.discrepanciesFound} sai lệch
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        r.status === 'reconciled'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status === 'reconciled' ? 'Khớp hoàn toàn' : 'Phát hiện lệch'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(r.runAt).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      data-testid={`btn-view-run-${r.id}`}
                      onClick={() => setSelectedRun(r)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRun && (
        <div data-testid="reconciliation-detail-modal" className="p-4 bg-gray-50 border rounded-lg space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <h3 className="text-sm font-bold text-gray-800">
              Chi tiết đối soát phiên: <code className="text-blue-700">{selectedRun.id}</code>
            </h3>
            <button
              type="button"
              onClick={() => setSelectedRun(null)}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Đóng ✕
            </button>
          </div>

          {selectedRun.discrepanciesFound === 0 ? (
            <div data-testid="reconciliation-no-discrepancy" className="p-3 bg-white border border-green-200 rounded text-xs text-green-700">
              ✓ Toàn bộ đơn hàng và khoản hoàn tiền khớp 100% với chứng từ cổng thanh toán. Không có giao dịch thất thoát.
            </div>
          ) : (
            <div data-testid="reconciliation-discrepancies-list" className="space-y-2">
              {(selectedRun.discrepancies || []).map((disc, idx) => (
                <div key={idx} data-testid={`discrepancy-item-${idx}`} className="p-2.5 bg-red-50 border border-red-200 rounded text-xs space-y-1">
                  <div className="flex items-center justify-between text-red-800 font-semibold">
                    <span>Loại: <code>{disc.type}</code></span>
                    <span>Đơn hàng: {disc.orderId || 'N/A'}</span>
                  </div>
                  <p className="text-gray-700">{disc.description}</p>
                  {disc.expectedAmountMinor !== undefined && disc.actualAmountMinor !== undefined && (
                    <div className="text-[11px] text-gray-500">
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
