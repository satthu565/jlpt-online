'use client';

import React, { useState } from 'react';
import { Select } from '@jlpt/ui';
import type { AdminRevenueReport } from './types';
import type { BillingManager } from './billing-service';

export interface RevenueReportProps {
  billingManager: BillingManager;
}

export function RevenueReportView({ billingManager }: RevenueReportProps): React.JSX.Element {
  const [currency, setCurrency] = useState('VND');
  const report: AdminRevenueReport = billingManager.getRevenueReport(currency);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 data-testid="revenue-heading" className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Báo cáo tài chính & doanh thu (Revenue Report)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Doanh thu gộp (Gross), tiền hoàn trả (Refunds) và doanh thu thuần (Net) tách theo đơn vị tiền tệ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tiền tệ:</label>
          <Select
            data-testid="currency-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-auto min-w-[150px]"
          >
            <option value="VND">VND (Việt Nam Đồng)</option>
            <option value="JPY">JPY (Yên Nhật)</option>
            <option value="USD">USD (Đô la Mỹ)</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div data-testid="card-gross" className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Doanh thu gộp (Gross)</div>
          <div data-testid="gross-amount" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {report.grossMinor.toLocaleString('vi-VN')} {report.currency}
          </div>
        </div>

        <div data-testid="card-refunds" className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Hoàn tiền (Refunds)</div>
          <div data-testid="refund-amount" className="text-2xl font-bold text-red-600 dark:text-red-400">
            {report.refundMinor.toLocaleString('vi-VN')} {report.currency}
          </div>
        </div>

        <div data-testid="card-net" className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Doanh thu thuần (Net)</div>
          <div data-testid="net-amount" className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {report.netMinor.toLocaleString('vi-VN')} {report.currency}
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-100 dark:bg-gray-700/60 rounded-md text-sm text-gray-600 dark:text-gray-300">
        <strong>Lưu ý đối soát kế toán:</strong> Số liệu doanh thu tuân thủ nguyên tắc minor units (số nguyên), tách riêng từng loại tiền tệ và không quy đổi gộp tránh sai lệch tỷ giá.
      </div>
    </div>
  );
}
