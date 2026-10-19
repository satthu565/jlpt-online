'use client';

import React, { useState } from 'react';
import { Button, Textarea } from '@jlpt/ui';
import type { AdminRefundItem } from './types';
import type { BillingManager } from './billing-service';

export interface RefundsManagerProps {
  billingManager: BillingManager;
  onRefundUpdated?: (refund: AdminRefundItem) => void;
}

export function RefundsManager({ billingManager, onRefundUpdated }: RefundsManagerProps): React.JSX.Element {
  const [refunds, setRefunds] = useState<AdminRefundItem[]>(() => billingManager.listRefunds());
  const [rejectingRefundId, setRejectingRefundId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleApprove = (refundId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = billingManager.approveRefund(refundId);
      setRefunds(billingManager.listRefunds());
      setSuccessMsg(`Đã phê duyệt hoàn tiền đơn hàng (${updated.amount.toLocaleString('vi-VN')} VND).`);
      onRefundUpdated?.(updated);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi phê duyệt hoàn tiền.');
    }
  };

  const handleRejectConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRefundId) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = billingManager.rejectRefund(rejectingRefundId, rejectReason);
      setRefunds(billingManager.listRefunds());
      setSuccessMsg('Đã từ chối yêu cầu hoàn tiền.');
      setRejectingRefundId(null);
      setRejectReason('');
      onRefundUpdated?.(updated);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi từ chối hoàn tiền.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-xs">
      <div className="mb-4">
        <h2 data-testid="refunds-heading" className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Quản lý yêu cầu hoàn tiền (Refund Requests)
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Xét duyệt và đối soát các yêu cầu hoàn tiền theo chính sách thương mại.
        </p>
      </div>

      {successMsg && (
        <div data-testid="refund-success-msg" className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-md text-sm font-semibold mb-4">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="refund-error-msg" className="p-3 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-md text-sm font-semibold mb-4">
          {errorMsg}
        </div>
      )}

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

      {rejectingRefundId && (
        <div
          data-testid="reject-refund-modal"
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Từ chối yêu cầu hoàn tiền</h3>
            <form onSubmit={handleRejectConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Lý do từ chối:</label>
                <Textarea
                  data-testid="reject-reason-input"
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ghi rõ lý do theo chính sách hoàn tiền..."
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
