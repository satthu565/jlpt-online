'use client';

<<<<<<< HEAD
import React, { useState } from 'react';
import { Button, Textarea } from '@jlpt/ui';
=======
import React, { useState, useEffect, useCallback } from 'react';
>>>>>>> origin/main
import type { AdminRefundItem } from './types';
import type { BillingManager } from './billing-service';
import { useOptionalAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface RefundsManagerProps {
  billingManager?: BillingManager;
  onRefundUpdated?: (refund: AdminRefundItem) => void;
}

export function RefundsManager({ billingManager, onRefundUpdated }: RefundsManagerProps): React.JSX.Element {
  const auth = useOptionalAdminAuth();
  const token = auth?.token ?? null;
  const locale = auth?.locale ?? 'vi';
  const [refunds, setRefunds] = useState<AdminRefundItem[]>(() =>
    billingManager ? billingManager.listRefunds() : [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [rejectingRefundId, setRejectingRefundId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRefunds = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/v1/admin/refunds', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setFetchError(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setFetchError(t('auth.forbidden', locale));
        } else {
          setFetchError(t('common.error', locale));
        }
        return;
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : data.refunds || data.items || [];
      if (Array.isArray(items)) {
        setRefunds(items);
      }
    } catch {
      if (!billingManager) {
        setFetchError(t('common.error', locale));
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, locale, billingManager]);

  useEffect(() => {
    void fetchRefunds();
  }, [fetchRefunds]);

  const handleApprove = async (refundId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/v1/admin/refunds/${encodeURIComponent(refundId)}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const updated = await res.json();
        setSuccessMsg(`Đã phê duyệt hoàn tiền đơn hàng (${(updated.amount || 0).toLocaleString('vi-VN')} VND).`);
        void fetchRefunds();
        onRefundUpdated?.(updated);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Lỗi khi phê duyệt hoàn tiền.');
    } catch (err: unknown) {
      if (billingManager) {
        try {
          const updated = billingManager.approveRefund(refundId);
          setRefunds(billingManager.listRefunds());
          setSuccessMsg(`Đã phê duyệt hoàn tiền đơn hàng (${updated.amount.toLocaleString('vi-VN')} VND).`);
          onRefundUpdated?.(updated);
          return;
        } catch (bmErr: unknown) {
          setErrorMsg(bmErr instanceof Error ? bmErr.message : 'Lỗi khi phê duyệt hoàn tiền.');
          return;
        }
      }
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi phê duyệt hoàn tiền.');
    }
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRefundId) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/v1/admin/refunds/${encodeURIComponent(rejectingRefundId)}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSuccessMsg('Đã từ chối yêu cầu hoàn tiền.');
        setRejectingRefundId(null);
        setRejectReason('');
        void fetchRefunds();
        onRefundUpdated?.(updated);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Lỗi khi từ chối hoàn tiền.');
    } catch (err: unknown) {
      if (billingManager) {
        try {
          const updated = billingManager.rejectRefund(rejectingRefundId, rejectReason);
          setRefunds(billingManager.listRefunds());
          setSuccessMsg('Đã từ chối yêu cầu hoàn tiền.');
          setRejectingRefundId(null);
          setRejectReason('');
          onRefundUpdated?.(updated);
          return;
        } catch (bmErr: unknown) {
          setErrorMsg(bmErr instanceof Error ? bmErr.message : 'Lỗi khi từ chối hoàn tiền.');
          return;
        }
      }
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi từ chối hoàn tiền.');
    }
  };

  return (
<<<<<<< HEAD
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-xs">
      <div className="mb-4">
        <h2 data-testid="refunds-heading" className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Quản lý yêu cầu hoàn tiền (Refund Requests)
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Xét duyệt và đối soát các yêu cầu hoàn tiền theo chính sách thương mại.
=======
    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 space-y-4">
      <div>
        <h2 data-testid="refunds-heading" className="text-lg font-bold text-gray-900">
          Quản lý yêu cầu hoàn tiền (Refund Requests)
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {t('commercial.refundsSubtitle', locale)}
>>>>>>> origin/main
        </p>
      </div>

      {fetchError && (
        <div
          role="alert"
          data-testid="refunds-error-alert"
          className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center justify-between"
        >
          <span>{fetchError}</span>
          <button
            onClick={() => void fetchRefunds()}
            className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
          >
            {t('common.retry', locale)}
          </button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="refunds-loading"
          className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading', locale)}</span>
        </div>
      )}

      {successMsg && (
<<<<<<< HEAD
        <div data-testid="refund-success-msg" className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-md text-sm font-semibold mb-4">
=======
        <div data-testid="refund-success-msg" className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-xs">
>>>>>>> origin/main
          {successMsg}
        </div>
      )}

      {errorMsg && (
<<<<<<< HEAD
        <div data-testid="refund-error-msg" className="p-3 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-md text-sm font-semibold mb-4">
=======
        <div data-testid="refund-error-msg" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
>>>>>>> origin/main
          {errorMsg}
        </div>
      )}

<<<<<<< HEAD
      <div className="overflow-x-auto">
        <table data-testid="refunds-table" className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
              <th className="p-3 font-semibold">Mã yêu cầu</th>
              <th className="p-3 font-semibold">Mã đơn hàng</th>
              <th className="p-3 font-semibold">Số tiền</th>
              <th className="p-3 font-semibold">Lý do</th>
              <th className="p-3 font-semibold">Trạng thái</th>
              <th className="p-3 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <tr key={r.id} data-testid={`refund-row-${r.id}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="p-3 font-mono text-gray-900 dark:text-gray-100">{r.id.slice(0, 13)}...</td>
                <td className="p-3 font-mono text-gray-500 dark:text-gray-400">{r.orderId.slice(0, 13)}...</td>
                <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">{r.amount.toLocaleString('vi-VN')} đ</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{r.reason || 'Không có'}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      r.status === 'refunded'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                        : r.status === 'requested'
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-3">
                  {r.status === 'requested' ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        data-testid={`approve-refund-${r.id}`}
                        onClick={() => handleApprove(r.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                      >
                        Duyệt
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        data-testid={`reject-refund-${r.id}`}
                        onClick={() => setRejectingRefundId(r.id)}
                        className="text-xs"
                      >
                        Từ chối
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Đã hoàn tất</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
=======
      {refunds.length === 0 && !isLoading && !fetchError ? (
        <div data-testid="refunds-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
          {t('commercial.emptyRefunds', locale)}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table data-testid="refunds-table" className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Mã yêu cầu</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Mã đơn hàng</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Số tiền</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Lý do</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {refunds.map((r) => {
                const refId = r.id || '';
                const ordId = r.orderId || '';
                const amount = typeof r.amount === 'number' ? r.amount : Number(r.amount || 0);
                return (
                  <tr key={refId} data-testid={`refund-row-${refId}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-900">{refId.slice(0, 13)}...</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{ordId.slice(0, 13)}...</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{amount.toLocaleString('vi-VN')} đ</td>
                    <td className="px-4 py-3 text-gray-600">{r.reason || 'Không có'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          r.status === 'refunded'
                            ? 'bg-green-100 text-green-800'
                            : r.status === 'requested'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'requested' ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            data-testid={`approve-refund-${refId}`}
                            onClick={() => void handleApprove(refId)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium"
                          >
                            {t('commercial.approve', locale)}
                          </button>
                          <button
                            type="button"
                            data-testid={`reject-refund-${refId}`}
                            onClick={() => setRejectingRefundId(refId)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-medium"
                          >
                            {t('commercial.reject', locale)}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Đã hoàn tất</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
>>>>>>> origin/main

      {rejectingRefundId && (
        <div
          data-testid="reject-refund-modal"
<<<<<<< HEAD
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Từ chối yêu cầu hoàn tiền</h3>
            <form onSubmit={handleRejectConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Lý do từ chối:</label>
                <Textarea
=======
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Từ chối yêu cầu hoàn tiền</h3>
            <form onSubmit={handleRejectConfirm} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Lý do từ chối:</label>
                <textarea
>>>>>>> origin/main
                  data-testid="reject-reason-input"
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ghi rõ lý do theo chính sách hoàn tiền..."
<<<<<<< HEAD
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
=======
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
>>>>>>> origin/main
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingRefundId(null)}
<<<<<<< HEAD
=======
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50"
>>>>>>> origin/main
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  data-testid="confirm-reject-button"
<<<<<<< HEAD
=======
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow-xs"
>>>>>>> origin/main
                >
                  Xác nhận từ chối
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
