'use client';

import { Check } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Select } from '@jlpt/ui/components/select';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface AcquisitionReportDto {
  totalNewUsers: number;
  byPeriod: { period: string; count: number }[];
  byRole: Record<string, number>;
  byLocale: Record<string, number>;
}

export interface ActivityReportDto {
  dau: number;
  mau: number;
  dailyActiveUsers: { date: string; count: number }[];
}

export interface ExamCompletionReportDto {
  started: number;
  completed: number;
  inProgress: number;
  completionRate: number;
}

export interface AbandonmentReportDto {
  started: number;
  completed: number;
  abandoned: number;
  abandonmentRate: number;
}

export interface LevelsReportDto {
  levels: { level: string; attempts: number; completed: number; avgScore: number; passRate: number }[];
  totalAttempts: number;
}

export interface PopularExamsReportDto {
  popularExams: { examId: string; title: string; level: string; attempts: number; completions: number; avgScore: number; passRate: number }[];
  totalExamsEvaluated: number;
}

export interface SessionDurationReportDto {
  avgDurationSeconds: number;
  medianDurationSeconds: number;
  distribution: { range: string; count: number; percentage: number }[];
  totalSessions: number;
}

export interface RetentionReportDto {
  dataStatus: 'sufficient' | 'insufficient_data';
  cohorts: {
    cohortDate: string;
    cohortSize: number;
    daysSinceCohort: number;
    d7Status: 'sufficient' | 'insufficient_data';
    d7Rate: number | null;
    d30Status: 'sufficient' | 'insufficient_data';
    d30Rate: number | null;
  }[];
  summaryD7: number | null;
  summaryD30: number | null;
  message: string;
}

export interface FunnelReportDto {
  steps: {
    step: string;
    name: string;
    users: number;
    conversionFromPrevious: number;
    overallConversion: number;
  }[];
  overallConversionRate: number;
}

export interface ContentReviewReportDto {
  totalPackages: number;
  byStatus: { pending: number; processing: number; completed: number; failed: number };
  recentJobs: { id: string; status: string; source: string; totalQuestions: number; createdAt: string }[];
}

export interface ContentIncidentsReportDto {
  totalIncidents: number;
  questionReportsCount: number;
  audioIncidentsCount: number;
  importValidationWarnings: number;
  byIssueType: Record<string, number>;
  notes: string;
}

export interface MixUsageReportDto {
  totalMixedExams: number;
  byLevel: Record<string, number>;
  byMode: Record<string, number>;
  avgQuestionCount: number;
}

export interface ConversionReportDto {
  totalFreeUsers: number;
  paidUsers: number;
  conversionRate: number;
  totalOrders: number;
  grossRevenueMinor: number;
  netRevenueMinor: number;
  currency: string;
  arpuMinor: number;
}

export interface ProviderCostsReportDto {
  aiRequestsCount: number;
  aiTokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  estimatedAiCostUsd: number;
  estimatedAiCostVnd: number;
  storageAssetsCount: number;
  storageSizeMb: number;
  estimatedStorageCostVnd: number;
  totalEstimatedCostVnd: number;
}

export interface ExperimentPerformanceReportDto {
  experiments: {
    experimentId: string;
    name: string;
    isActive: boolean;
    variants: { variant: string; exposures: number; conversions: number; conversionRate: number }[];
    hasStatisticalSignificance: boolean;
    sampleSize: number;
    minSampleSize: number;
  }[];
}

const REPORT_TABS = [
  { id: 'acquisition', label: '01. Người dùng mới' },
  { id: 'dau_mau', label: '02. Hoạt động DAU/MAU' },
  { id: 'completion', label: '03. Hoàn thành bài thi' },
  { id: 'abandonment', label: '04. Bỏ dở bài thi' },
  { id: 'popular_levels', label: '05. Cấp độ N1-N5' },
  { id: 'popular_exams', label: '06. Bộ đề phổ biến' },
  { id: 'duration', label: '07. Thời gian sử dụng' },
  { id: 'retention', label: '08. Giữ chân D7/D30' },
  { id: 'funnel', label: '09. Phễu đăng ký' },
  { id: 'content_review', label: '10. Duyệt gói nhập' },
  { id: 'content_incidents', label: '11. Sự cố câu hỏi & audio' },
  { id: 'mix_usage', label: '12. Sử dụng trộn đề' },
  { id: 'conversion', label: '13. Chuyển đổi Premium' },
  { id: 'provider_costs', label: '14. Chi phí AI & Storage' },
  { id: 'experiment_performance', label: '15. Thử nghiệm A/B' },
];

export default function ReportsHubPage(): React.JSX.Element {
  const { token, locale } = useAdminAuth();

  const [activeReport, setActiveReport] = useState<string>('acquisition');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [reportData, setReportData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/reports/${encodeURIComponent(activeReport)}?period=${encodeURIComponent(dateRange)}`, {
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
      setReportData(data);
    } catch {
      setErrorMsg(t('common.error', locale));
    } finally {
      setIsLoading(false);
    }
  }, [activeReport, dateRange, token, locale]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const handleExportCsv = async (kind: string) => {
    try {
      const res = await fetch(`/api/v1/admin/reports/${encodeURIComponent(kind)}/export?period=${encodeURIComponent(dateRange)}&format=csv`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (!res.ok) {
        setErrorMsg('Lỗi khi xuất file CSV.');
        return;
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `report_${kind}_${dateRange}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setDownloadSuccess(t('reports.exportSuccess', locale) || `Đã xuất báo cáo ${kind} định dạng CSV an toàn.`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch {
      setErrorMsg('Lỗi khi xuất file CSV.');
    }
  };

  const acq = (activeReport === 'acquisition' ? reportData : null) as AcquisitionReportDto | null;
  const act = (activeReport === 'dau_mau' ? reportData : null) as ActivityReportDto | null;
  const comp = (activeReport === 'completion' ? reportData : null) as ExamCompletionReportDto | null;
  const aban = (activeReport === 'abandonment' ? reportData : null) as AbandonmentReportDto | null;
  const lev = (activeReport === 'popular_levels' ? reportData : null) as LevelsReportDto | null;
  const popEx = (activeReport === 'popular_exams' ? reportData : null) as PopularExamsReportDto | null;
  const dur = (activeReport === 'duration' ? reportData : null) as SessionDurationReportDto | null;
  const ret = (activeReport === 'retention' ? reportData : null) as RetentionReportDto | null;
  const fun = (activeReport === 'funnel' ? reportData : null) as FunnelReportDto | null;
  const rev = (activeReport === 'content_review' ? reportData : null) as ContentReviewReportDto | null;
  const inc = (activeReport === 'content_incidents' ? reportData : null) as ContentIncidentsReportDto | null;
  const mix = (activeReport === 'mix_usage' ? reportData : null) as MixUsageReportDto | null;
  const conv = (activeReport === 'conversion' ? reportData : null) as ConversionReportDto | null;
  const costs = (activeReport === 'provider_costs' ? reportData : null) as ProviderCostsReportDto | null;
  const expPerf = (activeReport === 'experiment_performance' ? reportData : null) as ExperimentPerformanceReportDto | null;

  return (
    <AdminGuard pathname="/reports">
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden font-sans">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('reports.hubTitle', locale)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('reports.hubSubtitle', locale)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-auto px-3 py-2 text-xs font-semibold"
            >
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="90d">90 ngày qua</option>
              <option value="all">Toàn bộ thời gian</option>
            </Select>

            <Button
              type="button"
              variant="default"
              data-testid="btn-export-csv"
              onClick={() => void handleExportCsv(activeReport)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-xs"
            >
              ↓ {t('reports.exportCsv', locale)}
            </Button>
          </div>
        </header>

        {downloadSuccess && (
          <div
            data-testid="alert-export-success"
            className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs font-semibold"
          >
            <Check className="inline size-4 align-[-2px]" aria-hidden="true" /> {downloadSuccess}
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            data-testid="reports-error-alert"
            className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center justify-between"
          >
            <span>{errorMsg}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void fetchReport()}
              className="text-[11px] h-7 px-2.5"
            >
              {t('common.retry', locale)}
            </Button>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            data-testid="reports-loading"
            className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        {/* 15 Tabs Navigation */}
        <div
          data-testid="reports-tab-nav"
          className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-700"
        >
          {REPORT_TABS.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={activeReport === tab.id ? 'primary' : 'secondary'}
              size="sm"
              data-testid={`report-tab-${tab.id}`}
              onClick={() => setActiveReport(tab.id)}
              className="text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Active Report Content Container */}
        <div
          data-testid="report-content-panel"
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 shadow-xs"
        >
          {/* REPORT-01: Acquisition */}
          {activeReport === 'acquisition' && (
            <div data-testid="report-view-acquisition" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Số người dùng mới theo ngày/tháng
              </h2>
              {acq ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Tổng người dùng mới</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {(acq.totalNewUsers ?? 0).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Ngôn ngữ Tiếng Việt (vi)</div>
                      <div className="text-2xl font-bold text-blue-600 mt-1">
                        {(acq.byLocale?.['vi'] ?? 0).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Ngôn ngữ Tiếng Nhật (ja)</div>
                      <div className="text-2xl font-bold text-emerald-600 mt-1">
                        {(acq.byLocale?.['ja'] ?? 0).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Ngôn ngữ Tiếng Anh (en)</div>
                      <div className="text-2xl font-bold text-purple-600 mt-1">
                        {(acq.byLocale?.['en'] ?? 0).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  {acq.byPeriod && acq.byPeriod.length > 0 && (
                    <div className="overflow-x-auto border rounded-lg mt-4">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Thời gian</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-600">Số lượng đăng ký</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {acq.byPeriod.map((p) => (
                            <tr key={p.period} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-gray-900">{p.period}</td>
                              <td className="px-4 py-2 text-right font-semibold text-blue-600">{p.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-02: DAU/MAU */}
          {activeReport === 'dau_mau' && (
            <div data-testid="report-view-dau_mau" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Số người dùng hoạt động hàng ngày / hàng tháng (DAU/MAU)
              </h2>
              {act ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Hoạt động trong ngày (DAU)</div>
                      <div className="text-2xl font-bold text-blue-600 mt-1">
                        {(act.dau ?? 0).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Hoạt động trong 30 ngày (MAU)</div>
                      <div className="text-2xl font-bold text-emerald-600 mt-1">
                        {(act.mau ?? 0).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  {act.dailyActiveUsers && act.dailyActiveUsers.length > 0 && (
                    <div className="overflow-x-auto border rounded-lg mt-4">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Ngày</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-600">Lượt hoạt động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {act.dailyActiveUsers.map((d) => (
                            <tr key={d.date} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-gray-900">{d.date}</td>
                              <td className="px-4 py-2 text-right font-semibold text-gray-900">{d.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-03: Exam Completion */}
          {activeReport === 'completion' && (
            <div data-testid="report-view-completion" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Lượt bắt đầu và hoàn thành bài thi
              </h2>
              {comp ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Bắt đầu làm bài</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{comp.started ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Đã hoàn thành</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{comp.completed ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Đang làm dở</div>
                    <div className="text-2xl font-bold text-amber-600 mt-1">{comp.inProgress ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Tỷ lệ hoàn thành</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{comp.completionRate ?? 0}%</div>
                  </div>
                </div>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-04: Abandonment */}
          {activeReport === 'abandonment' && (
            <div data-testid="report-view-abandonment" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Tỷ lệ bỏ dở bài thi
              </h2>
              {aban ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Lượt bắt đầu</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{aban.started ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Lượt hoàn thành</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{aban.completed ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Lượt bỏ dở</div>
                    <div className="text-2xl font-bold text-red-600 mt-1">{aban.abandoned ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Tỷ lệ bỏ dở</div>
                    <div className="text-2xl font-bold text-red-600 mt-1">{aban.abandonmentRate ?? 0}%</div>
                  </div>
                </div>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-05: Popular Levels */}
          {activeReport === 'popular_levels' && (
            <div data-testid="report-view-popular_levels" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Phân bổ cấp độ thi JLPT (N1-N5)
              </h2>
              {lev ? (
                <>
                  <div className="text-xs text-gray-600 font-medium">
                    Tổng lượt thi đánh giá: <strong className="text-gray-900">{lev.totalAttempts ?? 0}</strong>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Cấp độ</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-600">Lượt thi</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-600">Hoàn thành</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-600">Điểm TB</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-600">Tỷ lệ đỗ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {lev.levels && lev.levels.length > 0 ? (
                          lev.levels.map((l) => (
                            <tr key={l.level} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-bold text-gray-900">{l.level}</td>
                              <td className="px-4 py-2 text-right">{l.attempts}</td>
                              <td className="px-4 py-2 text-right">{l.completed}</td>
                              <td className="px-4 py-2 text-right font-mono">{l.avgScore}</td>
                              <td className="px-4 py-2 text-right font-semibold text-emerald-600">{l.passRate}%</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-4 text-center text-gray-400">Chưa có dữ liệu</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-06: Popular Exams */}
          {activeReport === 'popular_exams' && (
            <div data-testid="report-view-popular_exams" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Danh sách bộ đề thi phổ biến nhất
              </h2>
              {popEx ? (
                <>
                  <div className="text-xs text-gray-600 font-medium">
                    Tổng số đề thi: <strong className="text-gray-900">{popEx.totalExamsEvaluated ?? 0}</strong>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Tên đề thi</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Cấp độ</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-600">Lượt thi</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-600">Hoàn thành</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-600">Điểm TB</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-600">Tỷ lệ đỗ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {popEx.popularExams && popEx.popularExams.length > 0 ? (
                          popEx.popularExams.map((e) => (
                            <tr key={e.examId} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium text-gray-900">{e.title}</td>
                              <td className="px-4 py-2 font-semibold text-blue-600">{e.level}</td>
                              <td className="px-4 py-2 text-right">{e.attempts}</td>
                              <td className="px-4 py-2 text-right">{e.completions}</td>
                              <td className="px-4 py-2 text-right font-mono">{e.avgScore}</td>
                              <td className="px-4 py-2 text-right font-semibold text-emerald-600">{e.passRate}%</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 text-center text-gray-400">Chưa có dữ liệu</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-07: Session Duration */}
          {activeReport === 'duration' && (
            <div data-testid="report-view-duration" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Thời gian sử dụng trung bình mỗi phiên
              </h2>
              {dur ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Thời gian trung bình</div>
                      <div className="text-2xl font-bold text-blue-600 mt-1">
                        {Math.round((dur.avgDurationSeconds ?? 0) / 60)} phút
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Thời gian trung vị</div>
                      <div className="text-2xl font-bold text-emerald-600 mt-1">
                        {Math.round((dur.medianDurationSeconds ?? 0) / 60)} phút
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Tổng số phiên</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {(dur.totalSessions ?? 0).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  {dur.distribution && dur.distribution.length > 0 && (
                    <div className="overflow-x-auto border rounded-lg mt-4">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Khoảng thời gian</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-600">Số phiên</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-600">Tỷ lệ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {dur.distribution.map((d) => (
                            <tr key={d.range} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-900">{d.range}</td>
                              <td className="px-4 py-2 text-right">{d.count}</td>
                              <td className="px-4 py-2 text-right font-semibold text-blue-600">{d.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-08: Retention */}
          {activeReport === 'retention' && (
            <div data-testid="report-view-retention" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Tỷ lệ quay lại sau 7/30 ngày (Retention)
              </h2>

              {ret?.dataStatus === 'insufficient_data' && (
                <div
                  data-testid="alert-insufficient-data"
                  className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 font-medium space-y-1"
                >
                  <div>
                    ℹ️ Trạng thái: <code>insufficient-data</code> — {ret.message || 'Các cohort người dùng mới đăng ký chưa đủ 7 hoặc 30 ngày quan sát.'}
                  </div>
                  <p className="text-amber-800">
                    Hệ thống hiển thị <code>insufficient-data</code> thay vì hiển thị tỷ lệ 0% giả gây hiểu lầm.
                  </p>
                </div>
              )}

              {ret && (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Cohort ngày</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Quy mô cohort</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Tỷ lệ D7 (7 ngày)</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase">Tỷ lệ D30 (30 ngày)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {ret.cohorts && ret.cohorts.length > 0 ? (
                        ret.cohorts.map((c) => (
                          <tr key={c.cohortDate} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-gray-900">{c.cohortDate} ({c.daysSinceCohort} ngày trước)</td>
                            <td className="px-4 py-3 text-gray-600">{c.cohortSize} học viên</td>
                            <td className="px-4 py-3 font-mono font-semibold">
                              {c.d7Status === 'insufficient_data' ? (
                                <span className="text-amber-600">insufficient-data</span>
                              ) : (
                                <span className="text-emerald-600">{c.d7Rate}%</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold">
                              {c.d30Status === 'insufficient_data' ? (
                                <span className="text-amber-600">insufficient-data</span>
                              ) : (
                                <span className="text-emerald-600">{c.d30Rate}%</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                            Chưa có cohort nào được ghi nhận.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {!ret && !isLoading && !errorMsg && (
                <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                  {t('reports.empty', locale)}
                </div>
              )}
            </div>
          )}

          {/* REPORT-09: Funnel */}
          {activeReport === 'funnel' && (
            <div data-testid="report-view-funnel" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Phân tích phễu đăng ký và bắt đầu làm đề
              </h2>
              {fun ? (
                <>
                  <div className="text-xs text-gray-600 font-medium">
                    Tỷ lệ chuyển đổi toàn phễu: <strong className="text-emerald-600">{fun.overallConversionRate ?? 0}%</strong>
                  </div>
                  <div className="grid gap-3 text-xs">
                    {fun.steps && fun.steps.length > 0 ? (
                      fun.steps.map((s, idx) => (
                        <div
                          key={s.step}
                          className={`p-3 rounded-lg border flex justify-between items-center ${
                            idx === 0
                              ? 'bg-gray-50 border-gray-200'
                              : idx === 1
                              ? 'bg-blue-50 border-blue-200 text-blue-900'
                              : idx === 2
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          }`}
                        >
                          <div>
                            <span className="font-semibold">{s.step}. {s.name}</span>
                            {idx > 0 && (
                              <span className="text-[11px] opacity-75 ml-2">(Chuyển tiếp: {s.conversionFromPrevious}%)</span>
                            )}
                          </div>
                          <strong className="text-gray-900">
                            {(s.users ?? 0).toLocaleString('vi-VN')} người dùng ({s.overallConversion}%)
                          </strong>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-4">Chưa có dữ liệu phễu</div>
                    )}
                  </div>
                </>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-10: Content Review */}
          {activeReport === 'content_review' && (
            <div data-testid="report-view-content_review" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Tiến độ kiểm duyệt gói nhập đề thi
              </h2>
              {rev ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-gray-50 p-3 rounded border text-center">
                      <div className="text-xs text-gray-500">Tổng gói</div>
                      <div className="text-xl font-bold text-gray-900 mt-1">{rev.totalPackages ?? 0}</div>
                    </div>
                    <div className="bg-amber-50 p-3 rounded border border-amber-200 text-center">
                      <div className="text-xs text-amber-700">Chờ duyệt</div>
                      <div className="text-xl font-bold text-amber-700 mt-1">{rev.byStatus?.pending ?? 0}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200 text-center">
                      <div className="text-xs text-blue-700">Đang xử lý</div>
                      <div className="text-xl font-bold text-blue-700 mt-1">{rev.byStatus?.processing ?? 0}</div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded border border-emerald-200 text-center">
                      <div className="text-xs text-emerald-700">Hoàn tất</div>
                      <div className="text-xl font-bold text-emerald-700 mt-1">{rev.byStatus?.completed ?? 0}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded border border-red-200 text-center">
                      <div className="text-xs text-red-700">Thất bại</div>
                      <div className="text-xl font-bold text-red-700 mt-1">{rev.byStatus?.failed ?? 0}</div>
                    </div>
                  </div>
                  {rev.recentJobs && rev.recentJobs.length > 0 && (
                    <div className="overflow-x-auto border rounded-lg mt-4">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Mã gói</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Nguồn</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-600">Số câu</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {rev.recentJobs.map((j) => (
                            <tr key={j.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-gray-900">{(j.id || '').slice(0, 10)}...</td>
                              <td className="px-4 py-2 text-gray-600">{j.source}</td>
                              <td className="px-4 py-2 text-right">{j.totalQuestions}</td>
                              <td className="px-4 py-2 font-semibold">{j.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-11: Content Incidents */}
          {activeReport === 'content_incidents' && (
            <div data-testid="report-view-content_incidents" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Thống kê sự cố câu hỏi và âm thanh
              </h2>
              {inc ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Tổng số sự cố</div>
                    <div className="text-2xl font-bold text-red-600 mt-1">{inc.totalIncidents ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Khiếu nại câu hỏi</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{inc.questionReportsCount ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Lỗi âm thanh</div>
                    <div className="text-2xl font-bold text-amber-600 mt-1">{inc.audioIncidentsCount ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Cảnh báo kiểm định</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{inc.importValidationWarnings ?? 0}</div>
                  </div>
                </div>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-12: Mix Usage */}
          {activeReport === 'mix_usage' && (
            <div data-testid="report-view-mix_usage" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Tình hình sử dụng tính năng trộn đề
              </h2>
              {mix ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Tổng lượt tạo đề trộn</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{mix.totalMixedExams ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Trung bình câu / đề</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{mix.avgQuestionCount ?? 0}</div>
                  </div>
                </div>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-13: Conversion */}
          {activeReport === 'conversion' && (
            <div data-testid="report-view-conversion" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Báo cáo chuyển đổi Free → Premium
              </h2>
              {conv ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Học viên Miễn phí</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">
                      {(conv.totalFreeUsers ?? 0).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Học viên Trả phí</div>
                    <div className="text-xl font-bold text-emerald-600 mt-1">
                      {(conv.paidUsers ?? 0).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Tỷ lệ chuyển đổi</div>
                    <div className="text-xl font-bold text-blue-600 mt-1">
                      {conv.conversionRate ?? 0}%
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Doanh thu thuần</div>
                    <div className="text-xl font-bold text-purple-600 mt-1">
                      {(conv.netRevenueMinor ?? 0).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-14: Provider Costs */}
          {activeReport === 'provider_costs' && (
            <div data-testid="report-view-provider_costs" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Giám sát chi phí AI và Lưu trữ đám mây
              </h2>
              {costs ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Lượt gọi AI</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">{costs.aiRequestsCount ?? 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Tổng token AI</div>
                    <div className="text-xl font-bold text-blue-600 mt-1">
                      {(costs.aiTokenUsage?.totalTokens ?? 0).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Chi phí AI ước tính</div>
                    <div className="text-xl font-bold text-emerald-600 mt-1">
                      {(costs.estimatedAiCostVnd ?? 0).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500 font-medium">Lưu trữ tệp</div>
                    <div className="text-xl font-bold text-purple-600 mt-1">
                      {costs.storageSizeMb ?? 0} MB
                    </div>
                  </div>
                </div>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORT-15: Experiment Performance */}
          {activeReport === 'experiment_performance' && (
            <div data-testid="report-view-experiment_performance" className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Hiệu quả thử nghiệm A/B
              </h2>
              {expPerf && expPerf.experiments && expPerf.experiments.length > 0 ? (
                <div className="space-y-4">
                  {expPerf.experiments.map((e) => (
                    <div key={e.experimentId} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-gray-900">{e.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${e.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                          {e.isActive ? 'Đang chạy' : 'Đã dừng'}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-white">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Biến thể</th>
                              <th className="px-3 py-2 text-right font-semibold">Tiếp xúc</th>
                              <th className="px-3 py-2 text-right font-semibold">Chuyển đổi</th>
                              <th className="px-3 py-2 text-right font-semibold">Tỷ lệ chuyển đổi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {e.variants.map((v) => (
                              <tr key={v.variant}>
                                <td className="px-3 py-2 font-mono">{v.variant}</td>
                                <td className="px-3 py-2 text-right">{v.exposures}</td>
                                <td className="px-3 py-2 text-right">{v.conversions}</td>
                                <td className="px-3 py-2 text-right font-semibold text-emerald-600">{v.conversionRate}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !isLoading && !errorMsg && (
                  <div data-testid="reports-empty" className="p-6 text-center text-gray-500 bg-gray-50 rounded border border-gray-100 text-xs">
                    {t('reports.empty', locale)}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
