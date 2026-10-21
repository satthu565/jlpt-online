'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';

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
    () => initialExperiments ?? [],
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
        const sortedList = [...rawList].sort((a: RawExperiment, b: RawExperiment) =>
          (a.id || '').localeCompare(b.id || ''),
        );
        setExperiments(
          sortedList.map((e: RawExperiment) => ({
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
        body: JSON.stringify({}),
      });

      if (res.ok) {
        setExperiments((prev) =>
          prev.map((exp) => (exp.id === id ? { ...exp, isActive: !exp.isActive } : exp)),
        );
        await fetchExperiments();
        return;
      }
      setErrorMsg('Lỗi khi thay đổi trạng thái thử nghiệm.');
    } catch {
      setErrorMsg('Lỗi khi thay đổi trạng thái thử nghiệm.');
    }
  };

  return (
    <AdminGuard pathname="/experiments">
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden font-sans">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('experiments.title', locale)}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('experiments.subtitle', locale)}
            </p>
          </div>
        </header>

        {errorMsg && (
          <div
            role="alert"
            data-testid="experiments-error-alert"
            className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-xs flex items-center justify-between"
          >
            <span>{errorMsg}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void fetchExperiments()}
              className="text-[11px] h-7 px-2.5"
            >
              {t('common.retry', locale)}
            </Button>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            data-testid="experiments-loading"
            className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        {experiments.length === 0 && !isLoading && !errorMsg ? (
          <div
            data-testid="experiments-empty"
            className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-6 text-center text-gray-500 dark:text-gray-400 text-xs"
          >
            {t('experiments.empty', locale)}
          </div>
        ) : (
          <div className="grid gap-6">
            {experiments.map((exp) => (
              <div
                key={exp.id}
                data-testid={`experiment-card-${exp.id}`}
                className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{exp.name}</h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Mã thử nghiệm: <code className="font-mono text-blue-700 dark:text-blue-400">{exp.id}</code>
                      {exp.description ? ` | ${exp.description}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <span
                      data-testid={`experiment-status-${exp.id}`}
                      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        exp.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {exp.isActive ? t('experiments.active', locale) : t('experiments.paused', locale)}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`btn-toggle-experiment-${exp.id}`}
                      onClick={() => void toggleActive(exp.id)}
                      className="text-xs"
                    >
                      {exp.isActive ? t('experiments.pause', locale) : t('experiments.resume', locale)}
                    </Button>
                  </div>
                </div>

                {/* Variant Comparison Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left font-semibold">Biến thể (Variant)</TableHead>
                        <TableHead className="text-left font-semibold">Tỷ lệ lưu lượng</TableHead>
                        <TableHead className="text-left font-semibold">Lượt gán (Sticky)</TableHead>
                        <TableHead className="text-left font-semibold">Số chuyển đổi</TableHead>
                        <TableHead className="text-right font-semibold">Tỷ lệ chuyển đổi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exp.variants.map((v) => (
                        <TableRow key={v.key}>
                          <TableCell className="font-semibold">
                            <code>{v.key}</code> ({v.name})
                          </TableCell>
                          <TableCell>{v.weight}%</TableCell>
                          <TableCell>{v.assignments.toLocaleString('vi-VN')}</TableCell>
                          <TableCell>{v.conversions.toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-right font-bold">
                            {v.conversionRate}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
