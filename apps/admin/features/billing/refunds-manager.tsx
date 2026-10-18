'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 space-y-4">
      <div>
        <h2 data-testid="refunds-heading" className="text-lg font-bold text-gray-900">
          Quản lý yêu cầu hoàn tiền (Refund Requests)
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {t('commercial.refundsSubtitle', locale)}
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
        <div data-testid="refund-success-msg" className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-xs">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="refund-error-msg" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {errorMsg}
        </div>
      )}

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
              {refunds.map((r) => (
                <tr key={r.id} data-testid={`refund-row-${r.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-900">{r.id.slice(0, 13)}...</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{r.orderId.slice(0, 13)}...</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.amount.toLocaleString('vi-VN')} đ</td>
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
                          data-testid={`approve-refund-${r.id}`}
                          onClick={() => void handleApprove(r.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium"
                        >
                          {t('commercial.approve', locale)}
                        </button>
                        <button
                          type="button"
                          data-testid={`reject-refund-${r.id}`}
                          onClick={() => setRejectingRefundId(r.id)}
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectingRefundId && (
        <div
          data-testid="reject-refund-modal"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Từ chối yêu cầu hoàn tiền</h3>
            <form onSubmit={handleRejectConfirm} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Lý do từ chối:</label>
                <textarea
                  data-testid="reject-reason-input"
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ghi rõ lý do theo chính sách hoàn tiền..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRefundId(null)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  data-testid="confirm-reject-button"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow-xs"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
