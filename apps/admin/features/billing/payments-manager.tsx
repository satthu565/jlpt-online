'use client';

import React, { useState } from 'react';
import { Button } from '@jlpt/ui';
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-xs">
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
        <Button
          type="button"
          variant={tab === 'payments' ? 'primary' : 'secondary'}
          size="sm"
          data-testid="tab-payments"
          onClick={() => setTab('payments')}
        >
          Giao dịch thanh toán ({payments.length})
        </Button>
        <Button
          type="button"
          variant={tab === 'subscriptions' ? 'primary' : 'secondary'}
          size="sm"
          data-testid="tab-subscriptions"
          onClick={() => setTab('subscriptions')}
        >
          Thuê bao học viên ({subscriptions.length})
        </Button>
      </div>

      {tab === 'payments' && (
        <div className="overflow-x-auto">
          <table data-testid="payments-table" className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                <th className="p-3 font-semibold">Mã đơn hàng</th>
                <th className="p-3 font-semibold">Học viên (ID)</th>
                <th className="p-3 font-semibold">Số tiền</th>
                <th className="p-3 font-semibold">Trạng thái</th>
                <th className="p-3 font-semibold">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.orderId} data-testid={`payment-row-${p.orderId}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="p-3 font-mono text-gray-900 dark:text-gray-100">{p.orderId.slice(0, 13)}...</td>
                  <td className="p-3 font-mono text-gray-500 dark:text-gray-400">{p.userId.slice(0, 13)}...</td>
                  <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">{p.totalAmount.toLocaleString('vi-VN')} {p.currency}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        p.status === 'paid'
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">
                    {new Date(p.createdAt).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="overflow-x-auto">
          <table data-testid="subscriptions-table" className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                <th className="p-3 font-semibold">Mã thuê bao</th>
                <th className="p-3 font-semibold">Gói</th>
                <th className="p-3 font-semibold">Trạng thái</th>
                <th className="p-3 font-semibold">Kỳ hiện tại</th>
                <th className="p-3 font-semibold">Tự gia hạn</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id} data-testid={`sub-row-${s.id}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="p-3 font-mono text-gray-900 dark:text-gray-100">{s.id.slice(0, 13)}...</td>
                  <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">{s.planId}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        s.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">
                    {new Date(s.currentPeriodStart).toLocaleDateString('vi-VN')} - {new Date(s.currentPeriodEnd).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">
                    {s.cancelAtPeriodEnd ? 'Không (đã hủy)' : 'Có'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
