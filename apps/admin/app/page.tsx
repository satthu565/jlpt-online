'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button, Card } from '@jlpt/ui';
import { AdminGuard } from '../lib/ui-guard';
import { useAdminAuth } from '../lib/auth-context';
import { getNavigationSections } from '../lib/navigation';
import { t } from '../lib/i18n';

export interface DashboardMetrics {
  totalUsers: number;
  totalExams: number;
  overallCompletionRate: number;
  openReportsCount: number;
  grossRevenueVnd: number;
  activeDau: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  time: string;
  type: string;
}

export default function AdminDashboardPage(): React.JSX.Element {
  const { user, token, locale } = useAdminAuth();
  const sections = user ? getNavigationSections(user.role) : [];

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    totalExams: 0,
    overallCompletionRate: 0,
    openReportsCount: 0,
    grossRevenueVnd: 0,
    activeDau: 0,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/dashboard', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setError(t('auth.forbidden', locale));
        } else {
          setError(t('common.error', locale));
        }
        setIsLoading(false);
        return;
      }

      const data = (await res.json()) as {
        metrics?: DashboardMetrics;
        activities?: ActivityItem[];
        totalUsers?: number;
        totalExams?: number;
        overallCompletionRate?: number;
        openReportsCount?: number;
        grossRevenueVnd?: number;
        activeUsers30d?: number;
        recentActivities?: Array<{ id: string; title: string; timestamp?: string; time?: string; type: string }>;
      };

      if (data.metrics) {
        setMetrics(data.metrics);
      } else if (data.totalUsers !== undefined) {
        setMetrics({
          totalUsers: data.totalUsers ?? 0,
          totalExams: data.totalExams ?? 0,
          overallCompletionRate: data.overallCompletionRate ?? 0,
          openReportsCount: data.openReportsCount ?? 0,
          grossRevenueVnd: data.grossRevenueVnd ?? 0,
          activeDau: data.activeUsers30d ?? 0,
        });
      }

      if (Array.isArray(data.activities)) {
        setActivities(data.activities);
      } else if (Array.isArray(data.recentActivities)) {
        setActivities(
          data.recentActivities.map((act) => ({
            id: act.id,
            title: act.title,
            time: act.time || (act.timestamp ? new Date(act.timestamp).toLocaleTimeString('vi-VN') : 'Vừa xong'),
            type: act.type,
          })),
        );
      }
    } catch {
      setError(t('common.error', locale));
    } finally {
      setIsLoading(false);
    }
  }, [token, locale]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  return (
    <AdminGuard pathname="/">
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        {/* Header */}
        <header className="bg-white p-6 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div>
            <h1 data-testid="page-title" className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
              Tổng quan chỉ số hoạt động hệ thống
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Xin chào <strong>{user?.name || user?.email}</strong> — Chúc bạn một ngày làm việc hiệu quả!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="btn-refresh-dashboard"
              onClick={() => void fetchDashboard()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              ↻ {t('common.retry', locale)}
            </button>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
              Vai trò: {user ? t(`roles.${user.role}`, locale) : ''}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              ✓ TOTP 2FA Đã kích hoạt
            </span>
          </div>
        </header>

        {/* Alerts: Loading / Error */}
        {error && (
          <div
            role="alert"
            data-testid="dashboard-error-alert"
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void fetchDashboard()}
            >
              {t('common.retry', locale)}
            </Button>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            data-testid="dashboard-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <section aria-labelledby="metrics-heading" className="space-y-3">
          <h2 id="metrics-heading" className="text-lg font-bold text-gray-800">
            Chỉ số hoạt động cốt lõi (Live System Overview)
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div
              data-testid="stat-total-users"
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-1"
            >
              <div className="text-xs text-gray-500 font-medium">Người dùng hệ thống</div>
              <div className="text-2xl font-extrabold text-gray-900">
                {metrics.totalUsers.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Tài khoản học viên &amp; nhân sự</div>
            </div>

            <div
              data-testid="stat-total-exams"
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-1"
            >
              <div className="text-xs text-gray-500 font-medium">Đề thi công bố</div>
              <div className="text-2xl font-extrabold text-blue-600">
                {metrics.totalExams}
              </div>
              <div className="text-xs text-gray-500">Từ N5 đến N1</div>
            </div>

            <div
              data-testid="stat-completion-rate"
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-1"
            >
              <div className="text-xs text-gray-500 font-medium">Tỷ lệ hoàn thành đề</div>
              <div className="text-2xl font-extrabold text-emerald-600">
                {metrics.overallCompletionRate}%
              </div>
              <div className="text-xs text-gray-500">Bài thi nộp thành công</div>
            </div>

            <div
              data-testid="stat-open-reports"
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-1"
            >
              <div className="text-xs text-gray-500 font-medium">Báo lỗi câu hỏi</div>
              <div className="text-2xl font-extrabold text-amber-600">
                {metrics.openReportsCount}
              </div>
              <div className="text-xs text-amber-600 font-medium">Cần xử lý &amp; kiểm duyệt</div>
            </div>

            <div
              data-testid="stat-gross-revenue"
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-1"
            >
              <div className="text-xs text-gray-500 font-medium">Doanh thu gói học</div>
              <div className="text-2xl font-extrabold text-purple-600 truncate">
                {metrics.grossRevenueVnd.toLocaleString()} đ
              </div>
              <div className="text-xs text-emerald-600 font-medium">Đã đối soát thanh toán</div>
            </div>
          </div>
        </section>

        {/* Dynamic Section Cards */}
        <section aria-labelledby="modules-heading" className="space-y-3">
          <h2 id="modules-heading" className="text-lg font-bold text-gray-800">
            Chức năng quản trị được phân quyền
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections
              .filter((sec) => sec.id !== 'overview')
              .flatMap((sec) => sec.items)
              .map((item) => (
                <Card
                  key={item.id}
                  data-testid={`dashboard-card-${item.id}`}
                  className="p-5 hover:border-blue-500 hover:shadow-md transition duration-150 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                        <Link
                          href={item.href}
                          className="hover:text-blue-600 no-underline hover:underline text-gray-900 dark:text-gray-100 focus:outline-none"
                        >
                          {t(item.labelKey, locale)}
                        </Link>
                      </h3>
                      <Link
                        href={item.href}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="text-blue-600 text-lg font-bold no-underline"
                      >
                        →
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed no-underline">
                      Truy cập mô-đun {t(item.labelKey, locale).toLowerCase()} theo thẩm quyền của bạn.
                    </p>
                  </div>
                </Card>
              ))}
          </div>
        </section>

        {/* Recent Activity Stream */}
        <section aria-labelledby="activity-heading" className="space-y-3">
          <h2 id="activity-heading" className="text-lg font-bold text-gray-800">
            Nhật ký hoạt động trực tiếp gần đây
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 shadow-xs">
            {activities.length === 0 ? (
              <div data-testid="activity-empty" className="p-6 text-center text-xs text-gray-400 italic">
                {t('common.empty', locale)}
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  data-testid={`activity-item-${act.id}`}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{act.title}</div>
                    <div className="text-xs text-gray-500">Phân hệ: {act.type}</div>
                  </div>
                  <span className="text-xs text-gray-400">{act.time}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminGuard>
  );
}
