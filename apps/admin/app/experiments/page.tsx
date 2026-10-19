'use client';

import React, { useState } from 'react';
import { Button } from '@jlpt/ui';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';

export interface ExperimentItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  totalAssignments: number;
  totalExposures: number;
  variants: Array<{
    key: string;
    name: string;
    weight: number;
    assignments: number;
    conversions: number;
    conversionRate: number;
  }>;
}

export default function ExperimentsAdminPage(): React.JSX.Element {
  const { user: _user } = useAdminAuth();

  const [experiments, setExperiments] = useState<ExperimentItem[]>([
    {
      id: 'exp_checkout_layout_v1',
      name: 'Thử nghiệm giao diện thanh toán (1 bước vs 2 bước)',
      description: 'Đánh giá tỷ lệ hoàn tất đơn hàng gói Premium khi giảm bớt trường nhập liệu.',
      isActive: true,
      totalAssignments: 1420,
      totalExposures: 1210,
      variants: [
        {
          key: 'control',
          name: 'Gốc (2 bước)',
          weight: 50,
          assignments: 710,
          conversions: 84,
          conversionRate: 11.8,
        },
        {
          key: 'variant_b',
          name: 'Mới (1 chạm)',
          weight: 50,
          assignments: 710,
          conversions: 106,
          conversionRate: 14.9,
        },
      ],
    },
    {
      id: 'exp_reading_font_size',
      name: 'Thử nghiệm cỡ chữ đoạn văn Đọc hiểu',
      description: 'So sánh cỡ chữ 16px và 18px đối với tốc độ đọc hiểu và hoàn thành mondai.',
      isActive: false,
      totalAssignments: 580,
      totalExposures: 520,
      variants: [
        {
          key: 'control',
          name: 'Chuẩn 16px',
          weight: 50,
          assignments: 290,
          conversions: 210,
          conversionRate: 72.4,
        },
        {
          key: 'large_18px',
          name: 'Lớn 18px',
          weight: 50,
          assignments: 290,
          conversions: 228,
          conversionRate: 78.6,
        },
      ],
    },
  ]);

  const toggleActive = (id: string) => {
    setExperiments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isActive: !e.isActive } : e)),
    );
  };

  return (
    <AdminGuard pathname="/experiments">
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Quản trị Thử nghiệm A/B & Tối ưu Giao diện
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Cơ chế phân bổ cố định (Sticky Assignment) ẩn danh bảo vệ PII, theo dõi tỷ lệ chuyển đổi thời gian thực.
            </p>
          </div>
        </header>

        <div className="grid gap-6">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              data-testid={`experiment-card-${exp.id}`}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {exp.name}
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Mã thử nghiệm: <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">{exp.id}</code> | {exp.description}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    data-testid={`experiment-status-${exp.id}`}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      exp.isActive
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {exp.isActive ? 'ĐANG CHẠY (ACTIVE)' : 'TẠM DỪNG'}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid={`btn-toggle-experiment-${exp.id}`}
                    onClick={() => toggleActive(exp.id)}
                  >
                    {exp.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                  </Button>
                </div>
              </div>

              {/* Variant Comparison Table */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-x-auto border border-gray-100 dark:border-gray-700">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                      <th className="p-3">Biến thể (Variant)</th>
                      <th className="p-3">Tỷ lệ lưu lượng</th>
                      <th className="p-3">Lượt gán (Sticky)</th>
                      <th className="p-3">Số chuyển đổi</th>
                      <th className="p-3 text-right">Tỷ lệ chuyển đổi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exp.variants.map((v) => (
                      <tr key={v.key} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                        <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">
                          <code>{v.key}</code> ({v.name})
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">{v.weight}%</td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">{v.assignments.toLocaleString()}</td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">{v.conversions.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          {v.conversionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}
