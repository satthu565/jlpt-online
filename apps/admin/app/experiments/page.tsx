'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface ExperimentVariant {
  key: string;
  name: string;
  weight: number;
  assignments: number;
  conversions: number;
  conversionRate: number;
}

export interface ExperimentItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  totalAssignments: number;
  totalExposures: number;
  variants: ExperimentVariant[];
}

const DEFAULT_INITIAL_EXPERIMENTS: ExperimentItem[] = [
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
];

export interface ExperimentsAdminPageProps {
  initialExperiments?: ExperimentItem[];
}

interface RawVariant {
  key: string;
  name?: string;
  weight?: number;
  assignments?: number;
  conversions?: number;
  conversionRate?: number;
}

interface RawExperiment {
  id: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  totalAssignments?: number;
  totalExposures?: number;
  variants?: RawVariant[];
}

export default function ExperimentsAdminPage({ initialExperiments }: ExperimentsAdminPageProps = {}): React.JSX.Element {
  const { token, locale } = useAdminAuth();

  const [experiments, setExperiments] = useState<ExperimentItem[]>(
    () => (initialExperiments !== undefined ? initialExperiments : DEFAULT_INITIAL_EXPERIMENTS),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchExperiments = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/experiments', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setErrorMsg(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setErrorMsg(t('auth.forbidden', locale));
        } else {
          setErrorMsg(t('common.error', locale));
        }
        return;
      }

      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.items || data.experiments || [];
      if (Array.isArray(rawList)) {
        setExperiments(
          (rawList as RawExperiment[]).map((e: RawExperiment) => ({
            id: e.id,
            name: e.name || e.id,
            description: e.description || '',
            isActive: Boolean(e.isActive),
            totalAssignments: Number(e.totalAssignments ?? 0),
            totalExposures: Number(e.totalExposures ?? 0),
            variants: Array.isArray(e.variants)
              ? e.variants.map((v: RawVariant) => ({
                  key: v.key,
                  name: v.name || v.key,
                  weight: Number(v.weight ?? 50),
                  assignments: Number(v.assignments ?? 0),
                  conversions: Number(v.conversions ?? 0),
                  conversionRate: Number(v.conversionRate ?? 0),
                }))
              : [],
          })),
        );
      }
    } catch {
      setErrorMsg(t('common.error', locale));
    } finally {
      setIsLoading(false);
    }
  }, [token, locale]);

  useEffect(() => {
    void fetchExperiments();
  }, [fetchExperiments]);

  const toggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/experiments/${encodeURIComponent(id)}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (res.ok) {
        void fetchExperiments();
        return;
      }
      setErrorMsg('Lỗi khi thay đổi trạng thái thử nghiệm.');
    } catch {
      setErrorMsg('Lỗi khi thay đổi trạng thái thử nghiệm.');
    }
  };

  return (
    <AdminGuard pathname="/experiments">
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
              {t('experiments.title', locale)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('experiments.subtitle', locale)}
            </p>
          </div>
        </header>

        {errorMsg && (
          <div
            role="alert"
            data-testid="experiments-error-alert"
            className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center justify-between"
          >
            <span>{errorMsg}</span>
            <button
              onClick={() => void fetchExperiments()}
              className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
            >
              {t('common.retry', locale)}
            </button>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            data-testid="experiments-loading"
            className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        {experiments.length === 0 && !isLoading && !errorMsg ? (
          <div
            data-testid="experiments-empty"
            className="p-6 text-center text-gray-500 bg-white rounded-lg border border-gray-200 text-xs"
          >
            {t('experiments.empty', locale)}
          </div>
        ) : (
          <div className="grid gap-6">
            {experiments.map((exp) => (
              <div
                key={exp.id}
                data-testid={`experiment-card-${exp.id}`}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{exp.name}</h3>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Mã thử nghiệm: <code className="font-mono text-blue-700">{exp.id}</code>
                      {exp.description ? ` | ${exp.description}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <span
                      data-testid={`experiment-status-${exp.id}`}
                      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        exp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {exp.isActive ? t('experiments.active', locale) : t('experiments.paused', locale)}
                    </span>

                    <button
                      type="button"
                      data-testid={`btn-toggle-experiment-${exp.id}`}
                      onClick={() => void toggleActive(exp.id)}
                      className="px-3 py-1 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {exp.isActive ? t('experiments.pause', locale) : t('experiments.resume', locale)}
                    </button>
                  </div>
                </div>

                {/* Variant Comparison Table */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-600 uppercase">Biến thể (Variant)</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-600 uppercase">Tỷ lệ lưu lượng</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-600 uppercase">Lượt gán (Sticky)</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-600 uppercase">Số chuyển đổi</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-600 uppercase">Tỷ lệ chuyển đổi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {exp.variants.map((v) => (
                        <tr key={v.key} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-semibold text-gray-900">
                            <code>{v.key}</code> ({v.name})
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{v.weight}%</td>
                          <td className="px-4 py-2.5 text-gray-600">{v.assignments.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2.5 text-gray-600">{v.conversions.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-blue-600">
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
        )}
      </div>
    </AdminGuard>
  );
}
