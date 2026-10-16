'use client';

import React, { useState } from 'react';
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
    <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 data-testid="refunds-heading" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          Quản lý yêu cầu hoàn tiền (Refund Requests)
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Xét duyệt và đối soát các yêu cầu hoàn tiền theo chính sách thương mại.
        </p>
      </div>

      {successMsg && (
        <div data-testid="refund-success-msg" style={{ padding: '0.75rem', background: '#ecfdf5', color: '#065f46', borderRadius: '6px', marginBottom: '1rem' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="refund-error-msg" style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <table data-testid="refunds-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '0.75rem' }}>Mã yêu cầu</th>
            <th style={{ padding: '0.75rem' }}>Mã đơn hàng</th>
            <th style={{ padding: '0.75rem' }}>Số tiền</th>
            <th style={{ padding: '0.75rem' }}>Lý do</th>
            <th style={{ padding: '0.75rem' }}>Trạng thái</th>
            <th style={{ padding: '0.75rem' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {refunds.map((r) => (
            <tr key={r.id} data-testid={`refund-row-${r.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{r.id.slice(0, 13)}...</td>
              <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{r.orderId.slice(0, 13)}...</td>
              <td style={{ padding: '0.75rem', fontWeight: 600 }}>{r.amount.toLocaleString('vi-VN')} đ</td>
              <td style={{ padding: '0.75rem' }}>{r.reason || 'Không có'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    background:
                      r.status === 'refunded'
                        ? '#dcfce7'
                        : r.status === 'requested'
                        ? '#fef3c7'
                        : '#fef2f2',
                    color:
                      r.status === 'refunded'
                        ? '#15803d'
                        : r.status === 'requested'
                        ? '#92400e'
                        : '#991b1b',
                  }}
                >
                  {r.status}
                </span>
              </td>
              <td style={{ padding: '0.75rem' }}>
                {r.status === 'requested' ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      data-testid={`approve-refund-${r.id}`}
                      onClick={() => handleApprove(r.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      data-testid={`reject-refund-${r.id}`}
                      onClick={() => setRejectingRefundId(r.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      Từ chối
                    </button>
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Đã hoàn tất</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rejectingRefundId && (
        <div
          data-testid="reject-refund-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div style={{ background: '#fff', borderRadius: '8px', padding: '1.5rem', width: '380px' }}>
            <h3 style={{ margin: '0 0 1rem' }}>Từ chối yêu cầu hoàn tiền</h3>
            <form onSubmit={handleRejectConfirm}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Lý do từ chối:</label>
                <textarea
                  data-testid="reject-reason-input"
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ghi rõ lý do theo chính sách hoàn tiền..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRejectingRefundId(null)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  data-testid="confirm-reject-button"
                  style={{ padding: '0.5rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
