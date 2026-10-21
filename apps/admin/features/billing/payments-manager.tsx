'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@jlpt/ui/components/button';
import type { AdminPaymentItem, AdminSubscriptionItem } from './types';
import type { BillingManager } from './billing-service';
import { useOptionalAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';

export interface PaymentsManagerProps {
  billingManager?: BillingManager;
  initialTab?: 'payments' | 'subscriptions';
}

export function PaymentsManager({ billingManager, initialTab = 'payments' }: PaymentsManagerProps): React.JSX.Element {
  const auth = useOptionalAdminAuth();
  const token = auth?.token ?? null;
  const locale = auth?.locale ?? 'vi';
  const [payments, setPayments] = useState<AdminPaymentItem[]>(() =>
    billingManager ? billingManager.listPayments() : [],
  );
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>(() =>
    billingManager ? billingManager.listSubscriptions() : [],
  );
  const [tab, setTab] = useState<'payments' | 'subscriptions'>(initialTab);
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
    <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-4 md:p-6 space-y-4 font-sans">
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
        <Button
          type="button"
          variant={tab === 'payments' ? 'primary' : 'secondary'}
          size="sm"
          data-testid="tab-payments"
          onClick={() => setTab('payments')}
          className="text-xs font-semibold whitespace-nowrap"
        >
          Giao dịch thanh toán ({payments.length})
        </Button>
        <Button
          type="button"
          variant={tab === 'subscriptions' ? 'primary' : 'secondary'}
          size="sm"
          data-testid="tab-subscriptions"
          onClick={() => setTab('subscriptions')}
          className="text-xs font-semibold whitespace-nowrap"
        >
          Thuê bao học viên ({subscriptions.length})
        </Button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          data-testid="payments-error-alert"
          className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-xs flex items-center justify-between"
        >
          <span>{errorMsg}</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void fetchData()}
            className="text-[11px] h-7 px-2.5"
          >
            {t('common.retry', locale)}
          </Button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="payments-loading"
          className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading', locale)}</span>
        </div>
      )}

      {tab === 'payments' && (
        <>
          {payments.length === 0 && !isLoading && !errorMsg ? (
            <div data-testid="payments-empty" className="surface surface--secondary rounded-2xl p-6 text-center text-gray-500 dark:text-gray-400 text-xs">
              {t('commercial.emptyPayments', locale)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="payments-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left font-semibold">Mã đơn hàng</TableHead>
                    <TableHead className="text-left font-semibold">Học viên (ID)</TableHead>
                    <TableHead className="text-left font-semibold">Số tiền</TableHead>
                    <TableHead className="text-left font-semibold">Trạng thái</TableHead>
                    <TableHead className="text-left font-semibold">Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const orderId = p.orderId || '';
                    const userId = p.userId || '';
                    const amount = typeof p.totalAmount === 'number' ? p.totalAmount : Number(p.totalAmount || 0);
                    const currency = p.currency || 'VND';
                    const status = p.status || 'created';
                    const createdAtStr = p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '';
                    return (
                      <TableRow key={orderId} data-testid={`payment-row-${orderId}`}>
                        <TableCell className="font-mono">{orderId.slice(0, 13)}...</TableCell>
                        <TableCell className="font-mono">{userId.slice(0, 13)}...</TableCell>
                        <TableCell className="font-semibold">
                          {amount.toLocaleString('vi-VN')} {currency}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              status === 'paid'
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                            }`}
                          >
                            {status}
                          </span>
                        </TableCell>
                        <TableCell>{createdAtStr}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {tab === 'subscriptions' && (
        <>
          {subscriptions.length === 0 && !isLoading && !errorMsg ? (
            <div data-testid="subscriptions-empty" className="surface surface--secondary rounded-2xl p-6 text-center text-gray-500 dark:text-gray-400 text-xs">
              {t('commercial.emptySubscriptions', locale)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="subscriptions-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left font-semibold">Mã thuê bao</TableHead>
                    <TableHead className="text-left font-semibold">Gói</TableHead>
                    <TableHead className="text-left font-semibold">Trạng thái</TableHead>
                    <TableHead className="text-left font-semibold">Kỳ hiện tại</TableHead>
                    <TableHead className="text-left font-semibold">Tự gia hạn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((s) => {
                    const subId = s.id || '';
                    const planId = s.planId || '';
                    const status = s.status || 'active';
                    const startStr = s.currentPeriodStart ? new Date(s.currentPeriodStart).toLocaleDateString('vi-VN') : '';
                    const endStr = s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('vi-VN') : '';
                    return (
                      <TableRow key={subId} data-testid={`sub-row-${subId}`}>
                        <TableCell className="font-mono">{subId.slice(0, 13)}...</TableCell>
                        <TableCell className="font-semibold">{planId}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              status === 'active'
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                            }`}
                          >
                            {status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {startStr} - {endStr}
                        </TableCell>
                        <TableCell>
                          {s.cancelAtPeriodEnd ? 'Không (đã hủy)' : 'Có'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
