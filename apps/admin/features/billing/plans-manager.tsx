'use client';

import React, { useState } from 'react';
import { Button, Input, Select } from '@jlpt/ui';
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 data-testid="plans-heading" className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Quản lý gói dịch vụ (Membership Plans)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Thiết lập bảng giá, thời hạn và phân quyền tính năng cho học viên.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          data-testid="create-plan-button"
          onClick={() => setIsModalOpen(true)}
        >
          + Tạo gói mới
        </Button>
      </div>

      {successMsg && (
        <div data-testid="plan-success-msg" className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-md text-sm font-semibold mb-4">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div data-testid="plan-error-msg" className="p-3 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-md text-sm font-semibold mb-4">
          {errorMsg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table data-testid="plans-table" className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
              <th className="p-3 font-semibold">Mã gói</th>
              <th className="p-3 font-semibold">Tên gói</th>
              <th className="p-3 font-semibold">Thời hạn</th>
              <th className="p-3 font-semibold">Giá (VND)</th>
              <th className="p-3 font-semibold">Phiên bản</th>
              <th className="p-3 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} data-testid={`plan-row-${p.id}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">{p.id}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{p.name}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{p.interval}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{p.priceMinor.toLocaleString('vi-VN')} đ</td>
                <td className="p-3 text-gray-500 dark:text-gray-400">v{p.version}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
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

      {isModalOpen && (
        <div
          data-testid="create-plan-modal"
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tạo / Cập nhật gói dịch vụ</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Mã gói (Code):</label>
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
