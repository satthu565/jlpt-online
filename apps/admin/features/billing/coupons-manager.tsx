'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AdminCouponItem } from './types';
import type { BillingManager } from './billing-service';
import { useOptionalAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface CouponsManagerProps {
  billingManager?: BillingManager;
  onCouponCreated?: (coupon: AdminCouponItem) => void;
}

export function CouponsManager({ billingManager, onCouponCreated }: CouponsManagerProps): React.JSX.Element {
  const auth = useOptionalAdminAuth();
  const token = auth?.token ?? null;
  const locale = auth?.locale ?? 'vi';
  const [coupons, setCoupons] = useState<AdminCouponItem[]>(() => (billingManager ? billingManager.listCoupons() : []));
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountVal, setDiscountVal] = useState(20);
  const [maxRedemptions, setMaxRedemptions] = useState(100);
  const [expiresAt, setExpiresAt] = useState('2026-12-31T23:59:59Z');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/v1/admin/coupons', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setFetchError(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setFetchError(t('auth.forbidden', locale));
        } else {
          setFetchError(t('common.error', locale));
        }
        return;
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : data.coupons || data.items || [];
      if (Array.isArray(items)) {
        setCoupons(items);
      }
    } catch {
      if (!billingManager) {
        setFetchError(t('common.error', locale));
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, locale, billingManager]);

  useEffect(() => {
    void fetchCoupons();
  }, [fetchCoupons]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      code,
      discountPercent: discountType === 'percent' ? Number(discountVal) : null,
      discountAmount: discountType === 'amount' ? Number(discountVal) : null,
      maxRedemptions: Number(maxRedemptions),
      validUntil: expiresAt,
    };

    try {
      const res = await fetch('/api/v1/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        setSuccessMsg(`Đã tạo mã giảm giá ${created.code || code} thành công.`);
        setIsModalOpen(false);
        setCode('');
        void fetchCoupons();
        onCouponCreated?.(created);
        return;
      }

      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Lỗi khi tạo mã giảm giá.');
    } catch (err: unknown) {
      if (billingManager) {
        try {
          const created = billingManager.createCoupon(payload);
          setCoupons(billingManager.listCoupons());
          setSuccessMsg(`Đã tạo mã giảm giá ${created.code} thành công.`);
          setIsModalOpen(false);
          setCode('');
          onCouponCreated?.(created);
          return;
        } catch (bmErr: unknown) {
          setErrorMsg(bmErr instanceof Error ? bmErr.message : 'Lỗi khi tạo mã giảm giá.');
          return;
        }
      }
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tạo mã giảm giá.');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 data-testid="coupons-heading" className="text-lg font-bold text-gray-900">
            Quản lý mã giảm giá (Coupons &amp; Discounts)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Chiến dịch khuyến mại, giảm phần trăm hoặc số tiền cố định, giới hạn lượt dùng nguyên tử.
          </p>
        </div>
        <button
          type="button"
          data-testid="create-coupon-button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-xs self-start sm:self-auto"
        >
          + {t('commercial.createCoupon', locale)}
        </button>
      </div>

      {fetchError && (
        <div
          role="alert"
          data-testid="coupons-error-alert"
          className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center justify-between"
        >
          <span>{fetchError}</span>
          <button
            onClick={() => void fetchCoupons()}
            className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
          >
            {t('common.retry', locale)}
          </button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="coupons-loading"
          className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading', locale)}</span>
        </div>
      )}

      {successMsg && (
        <div data-testid="coupon-success-msg" className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-xs">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="coupon-error-msg" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {errorMsg}
        </div>
      )}

      {coupons.length === 0 && !isLoading && !fetchError ? (
        <div data-testid="coupons-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
          {t('commercial.emptyCoupons', locale)}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table data-testid="coupons-table" className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Mã giảm giá</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Mức giảm</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Đã dùng / Giới hạn</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Hết hạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {coupons.map((c) => (
                <tr key={c.code} data-testid={`coupon-row-${c.code}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-700">{c.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.discountPercent ? `${c.discountPercent}%` : `${c.discountAmount?.toLocaleString('vi-VN')} đ`}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.timesRedeemed} / {c.maxRedemptions}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.validUntil ? new Date(c.validUntil).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div
          data-testid="create-coupon-modal"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Tạo mã giảm giá mới</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mã coupon:</label>
                <input
                  data-testid="coupon-code-input"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. FLASH20"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs uppercase focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Loại giảm giá:</label>
                <div className="flex gap-4 text-xs text-gray-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={discountType === 'percent'}
                      onChange={() => setDiscountType('percent')}
                      className="text-emerald-600"
                    />
                    Phần trăm (%)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={discountType === 'amount'}
                      onChange={() => setDiscountType('amount')}
                      className="text-emerald-600"
                    />
                    Số tiền cố định (VND)
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {discountType === 'percent' ? 'Phần trăm giảm (%):' : 'Số tiền giảm (VND):'}
                </label>
                <input
                  data-testid="coupon-discount-input"
                  type="number"
                  min="1"
                  required
                  value={discountVal}
                  onChange={(e) => setDiscountVal(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Số lượt dùng tối đa:</label>
                <input
                  data-testid="coupon-maxuses-input"
                  type="number"
                  min="1"
                  required
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Hạn sử dụng:</label>
                <input
                  data-testid="coupon-expiry-input"
                  type="text"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  data-testid="save-coupon-button"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-xs"
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
