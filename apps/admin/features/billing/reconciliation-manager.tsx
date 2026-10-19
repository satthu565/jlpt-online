'use client';

import React, { useState } from 'react';
import { Button } from '@jlpt/ui';
import type { BillingManager } from './billing-service';
import type { AdminReconciliationRun } from './types';
import type { StaffUser } from '../../lib/auth-context';

export interface ReconciliationManagerProps {
  billingManager: BillingManager;
  currentUser?: StaffUser | null;
}

export function ReconciliationManager({
  billingManager,
  currentUser,
}: ReconciliationManagerProps): React.JSX.Element {
  const [runs, setRuns] = useState<AdminReconciliationRun[]>(() =>
    billingManager.listReconciliationRuns(),
  );
  const [selectedRun, setSelectedRun] = useState<AdminReconciliationRun | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunReconciliation = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

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
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi chạy đối soát.');
    }
  };

  return (
    <div data-testid="reconciliation-panel" className="space-y-6">
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 data-testid="reconciliation-heading" className="text-base font-bold text-gray-900 dark:text-gray-100">
            Đối soát Giao dịch &amp; Hoàn tiền (Payment Reconciliation - ADM-16)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Đối chiếu tự động giữa đơn hàng, khoản thanh toán và hoàn tiền nội bộ với chứng từ cổng thanh toán.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          data-testid="btn-run-reconciliation"
          onClick={handleRunReconciliation}
        >
          Chạy đối soát (Run Reconciliation)
        </Button>
      </div>

      {successMsg && (
        <div data-testid="reconciliation-success-alert" className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded text-sm">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="reconciliation-error-alert" className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-sm">
          {errorMsg}
        </div>
      )}

      {/* Runs Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <table data-testid="reconciliation-runs-table" className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
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
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {runs.map((r) => (
              <tr key={r.id} data-testid={`reconciliation-row-${r.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-gray-100">{r.id}</td>
                <td className="px-4 py-3 font-semibold uppercase text-gray-900 dark:text-gray-100">{r.provider}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {new Date(r.periodStart).toLocaleDateString('vi-VN')} –{' '}
                  {new Date(r.periodEnd).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3">
                  <span
                    data-testid={`discrepancy-badge-${r.id}`}
                    className={`px-2 py-0.5 rounded font-semibold ${
                      r.discrepanciesFound === 0
                        ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {r.discrepanciesFound} sai lệch
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
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
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Xem
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Discrepancies Details if selected */}
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
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Đóng ✕
            </Button>
          </div>

          {selectedRun.discrepanciesFound === 0 ? (
            <div data-testid="reconciliation-no-discrepancy" className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-green-700 dark:text-green-300">
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
