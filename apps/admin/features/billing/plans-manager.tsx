'use client';

import React, { useState } from 'react';
import type { AdminPlanItem } from './types';
import type { BillingManager } from './billing-service';

export interface PlansManagerProps {
  billingManager: BillingManager;
  onPlanCreated?: (plan: AdminPlanItem) => void;
}

export function PlansManager({ billingManager, onPlanCreated }: PlansManagerProps): React.JSX.Element {
  const [plans, setPlans] = useState<AdminPlanItem[]>(() => billingManager.listPlans());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [interval, setInterval] = useState('month');
  const [priceMinor, setPriceMinor] = useState(199000);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const created = billingManager.createPlan({
        name,
        code,
        interval,
        priceMinor: Number(priceMinor),
        currency: 'VND',
        entitlements: ['unlimited_exams', 'ai_explanations'],
      });
      setPlans(billingManager.listPlans());
      setSuccessMsg(`Đã tạo/cập nhật gói ${created.name} thành công.`);
      setIsModalOpen(false);
      setName('');
      setCode('');
      onPlanCreated?.(created);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tạo gói dịch vụ.');
    }
  };

  return (
    <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 data-testid="plans-heading" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            Quản lý gói dịch vụ (Membership Plans)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            Thiết lập bảng giá, thời hạn và phân quyền tính năng cho học viên.
          </p>
        </div>
        <button
          type="button"
          data-testid="create-plan-button"
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '0.5rem 1rem',
            background: '#2563eb',
            color: '#fff',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          + Tạo gói mới
        </button>
      </div>

      {successMsg && (
        <div data-testid="plan-success-msg" style={{ padding: '0.75rem', background: '#ecfdf5', color: '#065f46', borderRadius: '6px', marginBottom: '1rem' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="plan-error-msg" style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <table data-testid="plans-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '0.75rem' }}>Mã gói</th>
            <th style={{ padding: '0.75rem' }}>Tên gói</th>
            <th style={{ padding: '0.75rem' }}>Thời hạn</th>
            <th style={{ padding: '0.75rem' }}>Giá (VND)</th>
            <th style={{ padding: '0.75rem' }}>Phiên bản</th>
            <th style={{ padding: '0.75rem' }}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} data-testid={`plan-row-${p.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600 }}>{p.id}</td>
              <td style={{ padding: '0.75rem' }}>{p.name}</td>
              <td style={{ padding: '0.75rem' }}>{p.interval}</td>
              <td style={{ padding: '0.75rem' }}>{p.priceMinor.toLocaleString('vi-VN')} đ</td>
              <td style={{ padding: '0.75rem' }}>v{p.version}</td>
              <td style={{ padding: '0.75rem' }}>
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    background: p.isActive ? '#dcfce7' : '#f1f5f9',
                    color: p.isActive ? '#15803d' : '#64748b',
                  }}
                >
                  {p.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div
          data-testid="create-plan-modal"
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
          <div style={{ background: '#fff', borderRadius: '8px', padding: '1.5rem', width: '420px', maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 1rem' }}>Tạo / Cập nhật gói dịch vụ</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Mã gói (Code):</label>
                <input
                  data-testid="plan-code-input"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. premium_6months"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Tên hiển thị:</label>
                <input
                  data-testid="plan-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gói Premium 6 Tháng"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Chu kỳ thanh toán:</label>
                <select
                  data-testid="plan-interval-select"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                >
                  <option value="month">1 Tháng (month)</option>
                  <option value="quarter">3 Tháng (quarter)</option>
                  <option value="year">1 Năm (year)</option>
                  <option value="lifetime">Trọn đời (lifetime)</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Giá bán (VND):</label>
                <input
                  data-testid="plan-price-input"
                  type="number"
                  min="0"
                  required
                  value={priceMinor}
                  onChange={(e) => setPriceMinor(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  data-testid="save-plan-button"
                  style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Lưu gói
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
