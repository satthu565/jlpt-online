'use client';

import React, { useState } from 'react';
import type { AdminPaymentItem, AdminSubscriptionItem } from './types';
import type { BillingManager } from './billing-service';

export interface PaymentsManagerProps {
  billingManager: BillingManager;
}

export function PaymentsManager({ billingManager }: PaymentsManagerProps): React.JSX.Element {
  const [payments] = useState<AdminPaymentItem[]>(() => billingManager.listPayments());
  const [subscriptions] = useState<AdminSubscriptionItem[]>(() => billingManager.listSubscriptions());
  const [tab, setTab] = useState<'payments' | 'subscriptions'>('payments');

  return (
    <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          data-testid="tab-payments"
          onClick={() => setTab('payments')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: tab === 'payments' ? '#2563eb' : '#f1f5f9',
            color: tab === 'payments' ? '#fff' : '#475569',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Giao dịch thanh toán ({payments.length})
        </button>
        <button
          type="button"
          data-testid="tab-subscriptions"
          onClick={() => setTab('subscriptions')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: tab === 'subscriptions' ? '#2563eb' : '#f1f5f9',
            color: tab === 'subscriptions' ? '#fff' : '#475569',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Thuê bao học viên ({subscriptions.length})
        </button>
      </div>

      {tab === 'payments' && (
        <table data-testid="payments-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '0.75rem' }}>Mã đơn hàng</th>
              <th style={{ padding: '0.75rem' }}>Học viên (ID)</th>
              <th style={{ padding: '0.75rem' }}>Số tiền</th>
              <th style={{ padding: '0.75rem' }}>Trạng thái</th>
              <th style={{ padding: '0.75rem' }}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.orderId} data-testid={`payment-row-${p.orderId}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{p.orderId.slice(0, 13)}...</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{p.userId.slice(0, 13)}...</td>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{p.totalAmount.toLocaleString('vi-VN')} {p.currency}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      background: p.status === 'paid' ? '#dcfce7' : '#fef2f2',
                      color: p.status === 'paid' ? '#15803d' : '#991b1b',
                    }}
                  >
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', color: '#64748b' }}>
                  {new Date(p.createdAt).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'subscriptions' && (
        <table data-testid="subscriptions-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '0.75rem' }}>Mã thuê bao</th>
              <th style={{ padding: '0.75rem' }}>Gói</th>
              <th style={{ padding: '0.75rem' }}>Trạng thái</th>
              <th style={{ padding: '0.75rem' }}>Kỳ hiện tại</th>
              <th style={{ padding: '0.75rem' }}>Tự gia hạn</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => (
              <tr key={s.id} data-testid={`sub-row-${s.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{s.id.slice(0, 13)}...</td>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{s.planId}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      background: s.status === 'active' ? '#dcfce7' : '#fef2f2',
                      color: s.status === 'active' ? '#15803d' : '#991b1b',
                    }}
                  >
                    {s.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', color: '#64748b' }}>
                  {new Date(s.currentPeriodStart).toLocaleDateString('vi-VN')} - {new Date(s.currentPeriodEnd).toLocaleDateString('vi-VN')}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {s.cancelAtPeriodEnd ? 'Không (đã hủy)' : 'Có'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
