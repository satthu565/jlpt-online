'use client';

import React, { useState } from 'react';
import type { AdminRevenueReport } from './types';
import type { BillingManager } from './billing-service';

export interface RevenueReportProps {
  billingManager: BillingManager;
}

export function RevenueReportView({ billingManager }: RevenueReportProps): React.JSX.Element {
  const [currency, setCurrency] = useState('VND');
  const report: AdminRevenueReport = billingManager.getRevenueReport(currency);

  return (
    <div style={{ padding: '1.5rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 data-testid="revenue-heading" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            Báo cáo tài chính & doanh thu (Revenue Report)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            Doanh thu gộp (Gross), tiền hoàn trả (Refunds) và doanh thu thuần (Net) tách theo đơn vị tiền tệ.
          </p>
        </div>
        <div>
          <label style={{ marginRight: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Tiền tệ:</label>
          <select
            data-testid="currency-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="VND">VND (Việt Nam Đồng)</option>
            <option value="JPY">JPY (Yên Nhật)</option>
            <option value="USD">USD (Đô la Mỹ)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div data-testid="card-gross" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Doanh thu gộp (Gross)</div>
          <div data-testid="gross-amount" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            {report.grossMinor.toLocaleString('vi-VN')} {report.currency}
          </div>
        </div>

        <div data-testid="card-refunds" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Hoàn tiền (Refunds)</div>
          <div data-testid="refund-amount" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>
            {report.refundMinor.toLocaleString('vi-VN')} {report.currency}
          </div>
        </div>

        <div data-testid="card-net" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Doanh thu thuần (Net)</div>
          <div data-testid="net-amount" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
            {report.netMinor.toLocaleString('vi-VN')} {report.currency}
          </div>
        </div>
      </div>

      <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.875rem', color: '#475569' }}>
        <strong>Lưu ý đối soát kế toán:</strong> Số liệu doanh thu tuân thủ nguyên tắc minor units (số nguyên), tách riêng từng loại tiền tệ và không quy đổi gộp tránh sai lệch tỷ giá.
      </div>
    </div>
  );
}
