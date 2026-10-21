'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Textarea } from '@jlpt/ui/components/textarea';
import type { AdminRefundItem } from './types';
import type { BillingManager } from './billing-service';
import { useOptionalAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';

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
    <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-4 md:p-6 space-y-4">
      <div>
        <h2 data-testid="refunds-heading" className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Quản lý yêu cầu hoàn tiền (Refund Requests)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('commercial.refundsSubtitle', locale)}
        </p>
      </div>

      {fetchError && (
        <div
          role="alert"
          data-testid="refunds-error-alert"
          className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-xs flex items-center justify-between"
        >
          <span>{fetchError}</span>
          <Button
            type="button"
            size="sm"
            onClick={() => void fetchRefunds()}
            className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
          >
            {t('common.retry', locale)}
          </Button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="refunds-loading"
          className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading', locale)}</span>
        </div>
      )}

      {successMsg && (
        <div data-testid="refund-success-msg" className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-md text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="refund-error-msg" className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-md text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {refunds.length === 0 && !isLoading && !fetchError ? (
        <div data-testid="refunds-empty" className="surface surface--secondary rounded-2xl p-6 text-center text-gray-500 dark:text-gray-400 text-xs">
          {t('commercial.emptyRefunds', locale)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table data-testid="refunds-table">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left font-semibold">Mã yêu cầu</TableHead>
                <TableHead className="text-left font-semibold">Mã đơn hàng</TableHead>
                <TableHead className="text-left font-semibold">Số tiền</TableHead>
                <TableHead className="text-left font-semibold">Lý do</TableHead>
                <TableHead className="text-left font-semibold">Trạng thái</TableHead>
                <TableHead className="text-left font-semibold">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.map((r) => {
                const refId = r.id || '';
                const ordId = r.orderId || '';
                const amount = typeof r.amount === 'number' ? r.amount : Number(r.amount || 0);
                return (
                  <TableRow key={refId} data-testid={`refund-row-${refId}`}>
                    <TableCell className="font-mono">{refId.slice(0, 13)}...</TableCell>
                    <TableCell className="font-mono">{ordId.slice(0, 13)}...</TableCell>
                    <TableCell className="font-semibold">{amount.toLocaleString('vi-VN')} đ</TableCell>
                    <TableCell>{r.reason || 'Không có'}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          r.status === 'refunded'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                            : r.status === 'requested'
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                            : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.status === 'requested' ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            data-testid={`approve-refund-${refId}`}
                            onClick={() => void handleApprove(refId)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium"
                          >
                            {t('commercial.approve', locale)}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            data-testid={`reject-refund-${refId}`}
                            onClick={() => setRejectingRefundId(refId)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-medium"
                          >
                            {t('commercial.reject', locale)}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">Đã hoàn tất</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {rejectingRefundId && (
        <div
          data-testid="reject-refund-modal"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Từ chối yêu cầu hoàn tiền</h3>
            <form onSubmit={handleRejectConfirm} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Lý do từ chối:</label>
                <Textarea
                  data-testid="reject-reason-input"
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ghi rõ lý do theo chính sách hoàn tiền..."
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingRefundId(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  data-testid="confirm-reject-button"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold"
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
