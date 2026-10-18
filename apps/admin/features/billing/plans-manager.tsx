'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AdminPlanItem } from './types';
import type { BillingManager } from './billing-service';
import { useOptionalAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface PlansManagerProps {
  billingManager?: BillingManager;
  onPlanCreated?: (plan: AdminPlanItem) => void;
}

export function PlansManager({ billingManager, onPlanCreated }: PlansManagerProps): React.JSX.Element {
  const auth = useOptionalAdminAuth();
  const token = auth?.token ?? null;
  const locale = auth?.locale ?? 'vi';
  const [plans, setPlans] = useState<AdminPlanItem[]>(() => (billingManager ? billingManager.listPlans() : []));
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [interval, setInterval] = useState('month');
  const [priceMinor, setPriceMinor] = useState(199000);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/v1/admin/plans', {
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
      const items = Array.isArray(data) ? data : data.plans || data.items || [];
      if (Array.isArray(items)) {
        setPlans(items);
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
    void fetchPlans();
  }, [fetchPlans]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      name,
      code,
      interval,
      priceMinor: Number(priceMinor),
      currency: 'VND',
      entitlements: ['unlimited_exams', 'ai_explanations'],
    };

    try {
      const res = await fetch('/api/v1/admin/plans', {
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
        setSuccessMsg(`Đã tạo/cập nhật gói ${created.name || name} thành công.`);
        setIsModalOpen(false);
        setName('');
        setCode('');
        void fetchPlans();
        onPlanCreated?.(created);
        return;
      }

      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Lỗi khi tạo gói dịch vụ.');
    } catch (err: unknown) {
      if (billingManager) {
        try {
          const created = billingManager.createPlan(payload);
          setPlans(billingManager.listPlans());
          setSuccessMsg(`Đã tạo/cập nhật gói ${created.name} thành công.`);
          setIsModalOpen(false);
          setName('');
          setCode('');
          onPlanCreated?.(created);
          return;
        } catch (bmErr: unknown) {
          setErrorMsg(bmErr instanceof Error ? bmErr.message : 'Lỗi khi tạo gói dịch vụ.');
          return;
        }
      }
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tạo gói dịch vụ.');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 data-testid="plans-heading" className="text-lg font-bold text-gray-900">
            Quản lý gói dịch vụ (Membership Plans)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('commercial.plansSubtitle', locale)}
          </p>
        </div>
        <button
          type="button"
          data-testid="create-plan-button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs self-start sm:self-auto"
        >
          + {t('commercial.createPlan', locale)}
        </button>
      </div>

      {fetchError && (
        <div
          role="alert"
          data-testid="plans-error-alert"
          className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center justify-between"
        >
          <span>{fetchError}</span>
          <button
            onClick={() => void fetchPlans()}
            className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
          >
            {t('common.retry', locale)}
          </button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="plans-loading"
          className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading', locale)}</span>
        </div>
      )}

      {successMsg && (
        <div data-testid="plan-success-msg" className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-xs">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="plan-error-msg" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {errorMsg}
        </div>
      )}

      {plans.length === 0 && !isLoading && !fetchError ? (
        <div data-testid="plans-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
          {t('commercial.emptyPlans', locale)}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table data-testid="plans-table" className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Mã gói</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Tên gói</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Thời hạn</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Giá (VND)</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Phiên bản</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {plans.map((p) => (
                <tr key={p.id} data-testid={`plan-row-${p.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{p.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.interval}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.priceMinor.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-3 text-gray-500">v{p.version}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div
          data-testid="create-plan-modal"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Tạo / Cập nhật gói dịch vụ</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mã gói (Code):</label>
                <input
                  data-testid="plan-code-input"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. premium_6months"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên hiển thị:</label>
                <input
                  data-testid="plan-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gói Premium 6 Tháng"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Chu kỳ thanh toán:</label>
                <select
                  data-testid="plan-interval-select"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="month">1 Tháng (month)</option>
                  <option value="quarter">3 Tháng (quarter)</option>
                  <option value="year">1 Năm (year)</option>
                  <option value="lifetime">Trọn đời (lifetime)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Giá bán (VND):</label>
                <input
                  data-testid="plan-price-input"
                  type="number"
                  min="0"
                  required
                  value={priceMinor}
                  onChange={(e) => setPriceMinor(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
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
                  data-testid="save-plan-button"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs"
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
