'use client';

import React, { useState } from 'react';
import { Button, Input } from '@jlpt/ui';
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-xs mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 data-testid="coupons-heading" className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Quản lý mã giảm giá (Coupons & Discounts)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Chiến dịch khuyến mại, giảm phần trăm hoặc số tiền cố định, giới hạn lượt dùng nguyên tử.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          data-testid="create-coupon-button"
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          + Tạo mã mới
        </Button>
      </div>

      {successMsg && (
        <div data-testid="coupon-success-msg" className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-md text-sm font-semibold mb-4">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="coupon-error-msg" className="p-3 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-md text-sm font-semibold mb-4">
          {errorMsg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table data-testid="coupons-table" className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
              <th className="p-3 font-semibold">Mã giảm giá</th>
              <th className="p-3 font-semibold">Mức giảm</th>
              <th className="p-3 font-semibold">Đã dùng / Giới hạn</th>
              <th className="p-3 font-semibold">Hết hạn</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.code} data-testid={`coupon-row-${c.code}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{c.code}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">
                  {c.discountPercent ? `${c.discountPercent}%` : `${c.discountAmount?.toLocaleString('vi-VN')} đ`}
                </td>
                <td className="p-3 text-gray-700 dark:text-gray-300">
                  {c.timesRedeemed} / {c.maxRedemptions}
                </td>
                <td className="p-3 text-gray-500 dark:text-gray-400">
                  {c.validUntil ? new Date(c.validUntil).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div
          data-testid="create-coupon-modal"
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tạo mã giảm giá mới</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Mã coupon:</label>
                <Input
                  data-testid="coupon-code-input"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. FLASH20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Loại giảm giá:</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <Input
                      type="radio"
                      name="discountType"
                      checked={discountType === 'percent'}
                      onChange={() => setDiscountType('percent')}
                      className="w-4 h-4 min-h-0"
                    />
                    Phần trăm (%)
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <Input
                      type="radio"
                      name="discountType"
                      checked={discountType === 'amount'}
                      onChange={() => setDiscountType('amount')}
                      className="w-4 h-4 min-h-0"
                    />
                    Số tiền cố định (VND)
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {discountType === 'percent' ? 'Phần trăm giảm (%):' : 'Số tiền giảm (VND):'}
                </label>
                <Input
                  data-testid="coupon-discount-input"
                  type="number"
                  min="1"
                  required
                  value={discountVal}
                  onChange={(e) => setDiscountVal(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Số lượt dùng tối đa:</label>
                <Input
                  data-testid="coupon-maxuses-input"
                  type="number"
                  min="1"
                  required
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Hạn sử dụng:</label>
                <Input
                  data-testid="coupon-expiry-input"
                  type="text"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  data-testid="save-coupon-button"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Lưu mã
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
