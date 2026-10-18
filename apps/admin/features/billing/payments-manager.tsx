'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AdminPaymentItem, AdminSubscriptionItem } from './types';
import type { BillingManager } from './billing-service';
import { useOptionalAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface PaymentsManagerProps {
  billingManager?: BillingManager;
}

export function PaymentsManager({ billingManager }: PaymentsManagerProps): React.JSX.Element {
  const auth = useOptionalAdminAuth();
  const token = auth?.token ?? null;
  const locale = auth?.locale ?? 'vi';
  const [payments, setPayments] = useState<AdminPaymentItem[]>(() =>
    billingManager ? billingManager.listPayments() : [],
  );
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>(() =>
    billingManager ? billingManager.listSubscriptions() : [],
  );
  const [tab, setTab] = useState<'payments' | 'subscriptions'>('payments');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Host: 'admin.jlpt.local',
      };

      const [paymentsRes, subsRes] = await Promise.all([
        fetch('/api/v1/admin/payments', { headers }),
        fetch('/api/v1/admin/subscriptions', { headers }),
      ]);

      if (!paymentsRes.ok || !subsRes.ok) {
        const failedRes = !paymentsRes.ok ? paymentsRes : subsRes;
        if (failedRes.status === 401) {
          setErrorMsg(t('auth.unauthenticated', locale));
        } else if (failedRes.status === 403) {
          setErrorMsg(t('auth.forbidden', locale));
        } else {
          setErrorMsg(t('common.error', locale));
        }
        return;
      }

      const paymentsData = await paymentsRes.json();
      const subsData = await subsRes.json();

      const paymentItems = Array.isArray(paymentsData)
        ? paymentsData
        : paymentsData.payments || paymentsData.items || [];
      const subItems = Array.isArray(subsData)
        ? subsData
        : subsData.subscriptions || subsData.items || [];

      if (Array.isArray(paymentItems)) setPayments(paymentItems);
      if (Array.isArray(subItems)) setSubscriptions(subItems);
    } catch {
      if (!billingManager) {
        setErrorMsg(t('common.error', locale));
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, locale, billingManager]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 space-y-4">
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          data-testid="tab-payments"
          onClick={() => setTab('payments')}
          className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
            tab === 'payments' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Giao dịch thanh toán ({payments.length})
        </button>
        <button
          type="button"
          data-testid="tab-subscriptions"
          onClick={() => setTab('subscriptions')}
          className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
            tab === 'subscriptions' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Thuê bao học viên ({subscriptions.length})
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          data-testid="payments-error-alert"
          className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center justify-between"
        >
          <span>{errorMsg}</span>
          <button
            onClick={() => void fetchData()}
            className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
          >
            {t('common.retry', locale)}
          </button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="payments-loading"
          className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading', locale)}</span>
        </div>
      )}

      {tab === 'payments' && (
        <>
          {payments.length === 0 && !isLoading && !errorMsg ? (
            <div data-testid="payments-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
              {t('commercial.emptyPayments', locale)}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table data-testid="payments-table" className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Mã đơn hàng</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Học viên (ID)</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Số tiền</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {payments.map((p) => {
                    const orderId = p.orderId || '';
                    const userId = p.userId || '';
                    const amount = typeof p.totalAmount === 'number' ? p.totalAmount : Number(p.totalAmount || 0);
                    const currency = p.currency || 'VND';
                    const status = p.status || 'created';
                    const createdAtStr = p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '';
                    return (
                      <tr key={orderId} data-testid={`payment-row-${orderId}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-900">{orderId.slice(0, 13)}...</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{userId.slice(0, 13)}...</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {amount.toLocaleString('vi-VN')} {currency}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{createdAtStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'subscriptions' && (
        <>
          {subscriptions.length === 0 && !isLoading && !errorMsg ? (
            <div data-testid="subscriptions-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
              {t('commercial.emptySubscriptions', locale)}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table data-testid="subscriptions-table" className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Mã thuê bao</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Gói</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Kỳ hiện tại</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Tự gia hạn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {subscriptions.map((s) => {
                    const subId = s.id || '';
                    const planId = s.planId || '';
                    const status = s.status || 'active';
                    const startStr = s.currentPeriodStart ? new Date(s.currentPeriodStart).toLocaleDateString('vi-VN') : '';
                    const endStr = s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('vi-VN') : '';
                    return (
                      <tr key={subId} data-testid={`sub-row-${subId}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-900">{subId.slice(0, 13)}...</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{planId}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {startStr} - {endStr}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.cancelAtPeriodEnd ? 'Không (đã hủy)' : 'Có'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
