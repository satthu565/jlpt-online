'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Select } from '@jlpt/ui';
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
      term: interval,
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 shadow-xs font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 data-testid="plans-heading" className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Quản lý gói dịch vụ (Membership Plans)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('commercial.plansSubtitle', locale)}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          data-testid="create-plan-button"
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-auto text-xs"
        >
          + Tạo gói mới
        </Button>
      </div>

      {fetchError && (
        <div
          role="alert"
          data-testid="plans-fetch-error"
          className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-xs flex items-center justify-between mb-4"
        >
          <span>{fetchError}</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void fetchPlans()}
            className="text-[11px] h-7 px-2.5"
          >
            {t('common.retry', locale)}
          </Button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          data-testid="plans-loading"
          className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs flex items-center gap-2 mb-4"
        >
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading', locale)}</span>
        </div>
      )}

      {successMsg && (
        <div data-testid="plan-success-msg" className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded text-xs mb-4">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="plan-error-msg" className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-xs mb-4">
          {errorMsg}
        </div>
      )}

      {plans.length === 0 && !isLoading && !fetchError ? (
        <div data-testid="plans-empty" className="p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-100 dark:border-gray-700 text-xs">
          {t('commercial.emptyPlans', locale)}
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-xs">
          <table data-testid="plans-table" className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Mã gói</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Tên gói</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Thời hạn</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Giá (VND)</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Phiên bản</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {plans.map((p) => (
                <tr key={p.id} data-testid={`plan-row-${p.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-gray-100">{p.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.interval}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{p.priceMinor.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">v{p.version}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        p.isActive
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tạo / Cập nhật gói dịch vụ</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Mã định danh (Code):</label>
                <Input
                  data-testid="plan-code-input"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. premium_6months"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tên hiển thị:</label>
                <Input
                  data-testid="plan-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gói Premium 6 Tháng"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Chu kỳ thanh toán:</label>
                <Select
                  data-testid="plan-interval-select"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                >
                  <option value="month">1 Tháng (month)</option>
                  <option value="quarter">3 Tháng (quarter)</option>
                  <option value="half_year">6 Tháng (half_year)</option>
                  <option value="year">1 Năm (year)</option>
                  <option value="lifetime">Trọn đời (lifetime)</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Giá bán (VND):</label>
                <Input
                  data-testid="plan-price-input"
                  type="number"
                  min="0"
                  required
                  value={priceMinor}
                  onChange={(e) => setPriceMinor(Number(e.target.value))}
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
                  data-testid="save-plan-button"
                >
                  Lưu gói
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
