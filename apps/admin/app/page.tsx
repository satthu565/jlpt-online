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
        <header className="p-6 rounded-2xl border border-divider/60 bg-surface shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar color="accent" size="lg" className="ring-2 ring-primary/20">
              <AvatarFallback className="font-bold text-sm">{userInitials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  data-testid="page-title"
                  className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground"
                >
                  Tổng quan chỉ số hoạt động hệ thống
                </h1>
                <Sparkles className="size-5 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-1 text-sm text-default-500">
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
              className="font-semibold gap-1.5 shadow-xs"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{t('common.retry', locale)}</span>
            </Button>
            <Chip color="accent" variant="soft" className="text-xs font-semibold">
              Vai trò: {user ? t(`roles.${user.role}`, locale) : ''}
            </Chip>
            <Chip color="success" variant="soft" className="text-xs font-semibold gap-1">
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
            className="p-4 bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 rounded-xl text-sm flex items-center justify-between"
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
            className="p-4 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 rounded-xl text-sm flex items-center gap-2.5"
          >
            <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <section aria-labelledby="metrics-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="metrics-heading" className="text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="size-5 text-primary" aria-hidden="true" />
              <span>Chỉ số hoạt động cốt lõi (Live System Overview)</span>
            </h2>
            <span className="text-xs text-default-400 font-medium">Cập nhật thời gian thực</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* 1. Tổng người dùng */}
            <Card
              data-testid="stat-total-users"
              className="p-5 border border-divider/60 shadow-xs hover:shadow-md transition-shadow duration-200 bg-surface rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-default-500 font-medium">Người dùng hệ thống</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                    {metrics.totalUsers.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Users className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-divider/50 flex items-center justify-between text-xs">
                <span className="text-default-500">Tài khoản học viên &amp; nhân sự</span>
                <Chip size="sm" color="success" variant="soft" className="h-5 text-[11px] font-semibold">
                  Hoạt động
                </Chip>
              </div>
            </Card>

            {/* 2. Đề thi công bố */}
            <Card
              data-testid="stat-total-exams"
              className="p-5 border border-divider/60 shadow-xs hover:shadow-md transition-shadow duration-200 bg-surface rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-default-500 font-medium">Đề thi công bố</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                    {metrics.totalExams}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-divider/50 flex items-center justify-between text-xs">
                <span className="text-default-500">Từ N5 đến N1</span>
                <Chip size="sm" color="accent" variant="soft" className="h-5 text-[11px] font-semibold">
                  N5–N1
                </Chip>
              </div>
            </Card>

            {/* 3. Tỷ lệ hoàn thành */}
            <Card
              data-testid="stat-completion-rate"
              className="p-5 border border-divider/60 shadow-xs hover:shadow-md transition-shadow duration-200 bg-surface rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-default-500 font-medium">Tỷ lệ hoàn thành đề</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {metrics.overallCompletionRate}%
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-divider/50 flex items-center justify-between text-xs">
                <span className="text-default-500">Bài thi nộp thành công</span>
                <Chip size="sm" color="success" variant="soft" className="h-5 text-[11px] font-semibold">
                  &gt;70%
                </Chip>
              </div>
            </Card>

            {/* 4. Báo lỗi câu hỏi */}
            <Card
              data-testid="stat-open-reports"
              className="p-5 border border-divider/60 shadow-xs hover:shadow-md transition-shadow duration-200 bg-surface rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-default-500 font-medium">Báo lỗi câu hỏi</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                    {metrics.openReportsCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-divider/50 flex items-center justify-between text-xs">
                <span className="text-amber-600 dark:text-amber-400 font-medium">Cần xử lý &amp; kiểm duyệt</span>
                <Chip size="sm" color="warning" variant="soft" className="h-5 text-[11px] font-semibold">
                  Chờ duyệt
                </Chip>
              </div>
            </Card>

            {/* 5. Doanh thu gói học */}
            <Card
              data-testid="stat-gross-revenue"
              className="p-5 border border-divider/60 shadow-xs hover:shadow-md transition-shadow duration-200 bg-surface rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-default-500 font-medium">Doanh thu gói học</div>
                  <div className="text-2xl md:text-3xl font-extrabold text-foreground truncate tracking-tight">
                    {metrics.grossRevenueVnd.toLocaleString()} đ
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <DollarSign className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-divider/50 flex items-center justify-between text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Đã đối soát thanh toán</span>
                <Chip size="sm" color="success" variant="soft" className="h-5 text-[11px] font-semibold">
                  Đối soát
                </Chip>
              </div>
            </Card>
          </div>
        </section>

        {/* Dynamic Section Cards */}
        <section aria-labelledby="modules-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="modules-heading" className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="size-5 text-primary" aria-hidden="true" />
              <span>Chức năng quản trị được phân quyền</span>
            </h2>
            <span className="text-xs text-default-400">
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
                  className="p-5 border border-divider/60 hover:border-primary/60 hover:shadow-md transition-all duration-200 flex flex-col justify-between bg-surface rounded-2xl group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
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
                        className="text-primary text-lg font-bold no-underline group-hover:translate-x-1 transition-transform"
                      >
                        →
                      </Link>
                    </div>
                    <p className="text-xs text-default-500 dark:text-default-400 leading-relaxed no-underline">
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
            <h2 id="activity-heading" className="text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="size-5 text-primary" aria-hidden="true" />
              <span>Nhật ký hoạt động trực tiếp gần đây</span>
            </h2>
            <span className="text-xs text-default-400">Cập nhật từ audit log</span>
          </div>

          <Card className="border border-divider/60 rounded-2xl shadow-xs overflow-hidden bg-surface divide-y divide-divider/50">
            {activities.length === 0 ? (
              <div data-testid="activity-empty" className="p-8 text-center text-xs text-default-400 italic">
                {t('common.empty', locale)}
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  data-testid={`activity-item-${act.id}`}
                  className="p-4 flex items-center justify-between hover:bg-default-100/50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-foreground">{act.title}</div>
                    <div className="text-xs text-default-500">Phân hệ: {act.type}</div>
                  </div>
                  <Chip size="sm" variant="soft" color="default" className="text-xs font-mono">
                    {act.time}
                  </Chip>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>
    </AdminGuard>
  );
}