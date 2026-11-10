'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Check,
  RefreshCw,
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button, Card, Chip, Avatar, AvatarFallback } from '@heroui/react';
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

  const userInitials = (user?.name || user?.email || 'AD').slice(0, 2).toUpperCase();

  return (
    <AdminGuard pathname="/">
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        {/* Header Hero Banner */}
        <header className="p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar color="accent" size="lg" className="ring-2 ring-teal-500/20 bg-teal-50 text-teal-700">
              <AvatarFallback className="font-bold text-sm">{userInitials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  data-testid="page-title"
                  className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white"
                >
                  Tổng quan chỉ số hoạt động hệ thống
                </h1>
                <Sparkles className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Xin chào <strong>{user?.name || user?.email}</strong> — Chúc bạn một ngày làm việc hiệu quả!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              type="button"
              data-testid="btn-refresh-dashboard"
              variant="primary"
              size="sm"
              onClick={() => void fetchDashboard()}
              className="font-semibold gap-1.5 shadow-xs bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{t('common.retry', locale)}</span>
            </Button>
            <Chip color="accent" variant="soft" className="text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 border border-teal-200/80">
              Vai trò: {user ? t(`roles.${user.role}`, locale) : ''}
            </Chip>
            <Chip color="success" variant="soft" className="text-xs font-semibold gap-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <Check className="size-3.5 inline align-[-1px]" aria-hidden="true" />
              <span>TOTP 2FA Đã kích hoạt</span>
            </Chip>
          </div>
        </header>

        {/* Alerts: Loading / Error */}
        {error && (
          <div
            role="alert"
            data-testid="dashboard-error-alert"
            className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <Button
              variant="danger"
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
            className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded-xl text-sm flex items-center gap-2.5"
          >
            <div className="size-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <section aria-labelledby="metrics-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="metrics-heading" className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Chỉ số hoạt động cốt lõi (Live System Overview)</span>
            </h2>
            <span className="text-xs text-gray-400 font-medium">Cập nhật thời gian thực</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* 1. Tổng người dùng */}
            <Card
              data-testid="stat-total-users"
              className="p-5 border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-900 rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Người dùng hệ thống</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {metrics.totalUsers.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40">
                  <Users className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Tài khoản học viên &amp; nhân sự</span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Hoạt động
                </span>
              </div>
            </Card>

            {/* 2. Đề thi công bố */}
            <Card
              data-testid="stat-total-exams"
              className="p-5 border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-900 rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Đề thi công bố</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-teal-600 dark:text-teal-400 tracking-tight">
                    {metrics.totalExams}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40">
                  <FileText className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Từ N5 đến N1</span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                  N5–N1
                </span>
              </div>
            </Card>

            {/* 3. Tỷ lệ hoàn thành */}
            <Card
              data-testid="stat-completion-rate"
              className="p-5 border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-900 rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tỷ lệ hoàn thành đề</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {metrics.overallCompletionRate}%
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                  <TrendingUp className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Bài thi nộp thành công</span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  &gt;70%
                </span>
              </div>
            </Card>

            {/* 4. Báo lỗi câu hỏi */}
            <Card
              data-testid="stat-open-reports"
              className="p-5 border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-900 rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Báo lỗi câu hỏi</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                    {metrics.openReportsCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <span className="text-amber-600 dark:text-amber-400 font-medium">Cần xử lý &amp; kiểm duyệt</span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                  Chờ duyệt
                </span>
              </div>
            </Card>

            {/* 5. Doanh thu gói học */}
            <Card
              data-testid="stat-gross-revenue"
              className="p-5 border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-900 rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Doanh thu gói học</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white truncate tracking-tight">
                    {metrics.grossRevenueVnd.toLocaleString()} đ
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40">
                  <DollarSign className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Đã đối soát thanh toán</span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Đối soát
                </span>
              </div>
            </Card>
          </div>
        </section>

        {/* Dynamic Section Cards */}
        <section aria-labelledby="modules-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="modules-heading" className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Chức năng quản trị được phân quyền</span>
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {sections.filter((sec) => sec.id !== 'overview').flatMap((s) => s.items).length} phân hệ khả dụng
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections
              .filter((sec) => sec.id !== 'overview')
              .flatMap((sec) => sec.items)
              .map((item) => (
                <Card
                  key={item.id}
                  data-testid={`dashboard-card-${item.id}`}
                  className="p-5 border border-gray-200/80 dark:border-gray-800 hover:border-teal-500/60 dark:hover:border-teal-500/60 hover:shadow-md transition-all duration-200 flex flex-col justify-between bg-white dark:bg-gray-900 rounded-2xl group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-teal-600 transition-colors">
                        <Link
                          href={item.href}
                          className="hover:underline focus:outline-none"
                        >
                          {t(item.labelKey, locale)}
                        </Link>
                      </h3>
                      <Link
                        href={item.href}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="text-teal-600 text-lg font-bold no-underline group-hover:translate-x-1 transition-transform"
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
          <div className="flex items-center justify-between">
            <h2 id="activity-heading" className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Nhật ký hoạt động trực tiếp gần đây</span>
            </h2>
            <span className="text-xs text-gray-400">Cập nhật từ audit log</span>
          </div>

          <Card className="border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {activities.length === 0 ? (
              <div data-testid="activity-empty" className="p-8 text-center text-xs text-gray-400 italic">
                {t('common.empty', locale)}
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  data-testid={`activity-item-${act.id}`}
                  className="p-4 flex items-center justify-between hover:bg-teal-50/30 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{act.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Phân hệ: {act.type}</div>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {act.time}
                  </span>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>
    </AdminGuard>
  );
}