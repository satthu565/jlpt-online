'use client';

import React, { useState } from 'react';
import type { AdminCouponItem } from './types';
import type { BillingManager } from './billing-service';

export interface CouponsManagerProps {
  billingManager: BillingManager;
  onCouponCreated?: (coupon: AdminCouponItem) => void;
}

export function CouponsManager({ billingManager, onCouponCreated }: CouponsManagerProps): React.JSX.Element {
  const [coupons, setCoupons] = useState<AdminCouponItem[]>(() => billingManager.listCoupons());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountVal, setDiscountVal] = useState(20);
  const [maxRedemptions, setMaxRedemptions] = useState(100);
  const [expiresAt, setExpiresAt] = useState('2026-12-31T23:59:59Z');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const created = billingManager.createCoupon({
        code,
        discountPercent: discountType === 'percent' ? Number(discountVal) : null,
        discountAmount: discountType === 'amount' ? Number(discountVal) : null,
        maxRedemptions: Number(maxRedemptions),
        validUntil: expiresAt,
      });
      setCoupons(billingManager.listCoupons());
      setSuccessMsg(`Đã tạo mã giảm giá ${created.code} thành công.`);
      setIsModalOpen(false);
      setCode('');
      onCouponCreated?.(created);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tạo mã giảm giá.');
    }
  };

  return (
    <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 data-testid="coupons-heading" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            Quản lý mã giảm giá (Coupons & Discounts)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            Chiến dịch khuyến mại, giảm phần trăm hoặc số tiền cố định, giới hạn lượt dùng nguyên tử.
          </p>
        </div>
        <button
          type="button"
          data-testid="create-coupon-button"
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '0.5rem 1rem',
            background: '#059669',
            color: '#fff',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          + Tạo mã mới
        </button>
      </div>

      {successMsg && (
        <div data-testid="coupon-success-msg" style={{ padding: '0.75rem', background: '#ecfdf5', color: '#065f46', borderRadius: '6px', marginBottom: '1rem' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="coupon-error-msg" style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <table data-testid="coupons-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '0.75rem' }}>Mã giảm giá</th>
            <th style={{ padding: '0.75rem' }}>Mức giảm</th>
            <th style={{ padding: '0.75rem' }}>Đã dùng / Giới hạn</th>
            <th style={{ padding: '0.75rem' }}>Hết hạn</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.code} data-testid={`coupon-row-${c.code}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600, color: '#059669' }}>{c.code}</td>
              <td style={{ padding: '0.75rem' }}>
                {c.discountPercent ? `${c.discountPercent}%` : `${c.discountAmount?.toLocaleString('vi-VN')} đ`}
              </td>
              <td style={{ padding: '0.75rem' }}>
                {c.timesRedeemed} / {c.maxRedemptions}
              </td>
              <td style={{ padding: '0.75rem', color: '#64748b' }}>
                {c.validUntil ? new Date(c.validUntil).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div
          data-testid="create-coupon-modal"
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
            <h3 style={{ margin: '0 0 1rem' }}>Tạo mã giảm giá mới</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Mã coupon:</label>
                <input
                  data-testid="coupon-code-input"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. FLASH20"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Loại giảm giá:</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                  <label>
                    <input
                      type="radio"
                      name="discountType"
                      checked={discountType === 'percent'}
                      onChange={() => setDiscountType('percent')}
                    />{' '}
                    Phần trăm (%)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="discountType"
                      checked={discountType === 'amount'}
                      onChange={() => setDiscountType('amount')}
                    />{' '}
                    Số tiền cố định (VND)
                  </label>
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                  {discountType === 'percent' ? 'Phần trăm giảm (%):' : 'Số tiền giảm (VND):'}
                </label>
                <input
                  data-testid="coupon-discount-input"
                  type="number"
                  min="1"
                  required
                  value={discountVal}
                  onChange={(e) => setDiscountVal(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Số lượt dùng tối đa:</label>
                <input
                  data-testid="coupon-maxuses-input"
                  type="number"
                  min="1"
                  required
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Hạn sử dụng:</label>
                <input
                  data-testid="coupon-expiry-input"
                  type="text"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
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
                  data-testid="save-coupon-button"
                  style={{ padding: '0.5rem 1rem', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Lưu mã
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
