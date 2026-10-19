'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AdminRevenueReport } from './types';
import type { BillingManager } from './billing-service';
import { useOptionalAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface RevenueReportProps {
  billingManager?: BillingManager;
}

export function RevenueReportView({ billingManager }: RevenueReportProps): React.JSX.Element {
  const auth = useOptionalAdminAuth();
  const token = auth?.token ?? null;
  const locale = auth?.locale ?? 'vi';
  const [currency, setCurrency] = useState('VND');
  const [report, setReport] = useState<AdminRevenueReport>(() =>
    billingManager
      ? billingManager.getRevenueReport(currency)
      : {
          grossMinor: 0,
          refundMinor: 0,
          netMinor: 0,
          currency: 'VND',
          breakdownByCurrency: {
            VND: { grossMinor: 0, refundMinor: 0, netMinor: 0, orderCount: 0, refundCount: 0 },
          },
        },
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/reports/revenue?currency=${encodeURIComponent(currency)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setErrorMsg(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setErrorMsg(t('auth.forbidden', locale));
        } else {
          setErrorMsg(t('common.error', locale));
        }
        return;
      }

      const data = await res.json();
      setReport({
        grossMinor: Number(data.grossMinor ?? 0),
        refundMinor: Number(data.refundMinor ?? 0),
        netMinor: Number(data.netMinor ?? 0),
        currency: data.currency || currency,
        breakdownByCurrency: data.breakdownByCurrency || {},
      });
    } catch {
      if (billingManager) {
        setReport(billingManager.getRevenueReport(currency));
      } else {
        setErrorMsg(t('common.error', locale));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currency, token, locale, billingManager]);

  useEffect(() => {
    void fetchRevenue();
  }, [fetchRevenue]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 data-testid="revenue-heading" className="text-lg font-bold text-gray-900">
            {t('reports.revenueTitle', locale)}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('reports.revenueSubtitle', locale)}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="text-xs font-semibold text-gray-700">{t('reports.currency', locale)}:</label>
          <select
            data-testid="currency-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold bg-white text-gray-800 focus:ring-1 focus:ring-blue-500"
          >
            <option value="VND">VND (Việt Nam Đồng)</option>
            <option value="JPY">JPY (Yên Nhật)</option>
            <option value="USD">USD (Đô la Mỹ)</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          data-testid="revenue-error-alert"
          className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center justify-between"
        >
          <span>{errorMsg}</span>
          <button
            onClick={() => void fetchRevenue()}
            className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
          >
            {t('common.retry', locale)}
          </button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="revenue-loading"
          className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading', locale)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div data-testid="card-gross" className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 font-medium mb-1">{t('reports.grossRevenue', locale)}</div>
          <div data-testid="gross-amount" className="text-xl md:text-2xl font-bold text-slate-900">
            {report.grossMinor.toLocaleString('vi-VN')} {report.currency}
          </div>
        </div>

        <div data-testid="card-refunds" className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-xs text-red-600 font-medium mb-1">{t('reports.refunds', locale)}</div>
          <div data-testid="refund-amount" className="text-xl md:text-2xl font-bold text-red-600">
            {report.refundMinor.toLocaleString('vi-VN')} {report.currency}
          </div>
        </div>

        <div data-testid="card-net" className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
          <div className="text-xs text-emerald-600 font-medium mb-1">{t('reports.netRevenue', locale)}</div>
          <div data-testid="net-amount" className="text-xl md:text-2xl font-bold text-emerald-700">
            {report.netMinor.toLocaleString('vi-VN')} {report.currency}
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 leading-relaxed">
        <strong>Lưu ý đối soát kế toán:</strong> Số liệu doanh thu tuân thủ nguyên tắc minor units (số nguyên), tách riêng từng loại tiền tệ và không quy đổi gộp tránh sai lệch tỷ giá.
      </div>
    </div>
  );
}
