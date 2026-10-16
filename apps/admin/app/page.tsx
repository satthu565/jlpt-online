'use client';

import React, { useState } from 'react';
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

export default function AdminDashboardPage(): React.JSX.Element {
  const { user, locale } = useAdminAuth();
  const sections = user ? getNavigationSections(user.role) : [];

  const [metrics] = useState<DashboardMetrics>({
    totalUsers: 1420,
    totalExams: 36,
    overallCompletionRate: 78.4,
    openReportsCount: 4,
    grossRevenueVnd: 48900000,
    activeDau: 320,
  });

  const [activities] = useState<Array<{ id: string; title: string; time: string; type: string }>>([
    { id: '1', title: 'Thí sinh hoàn thành bài thi thử N3 tháng 12', time: '5 phút trước', type: 'exam' },
    { id: '2', title: 'Đơn hàng gói Premium 3 Tháng được thanh toán thành công', time: '12 phút trước', type: 'payment' },
    { id: '3', title: 'Biên tập viên xuất bản bài viết Hướng dẫn thi JLPT', time: '1 giờ trước', type: 'cms' },
    { id: '4', title: 'Báo cáo lỗi câu hỏi Nghe N2 được gửi từ học viên', time: '2 giờ trước', type: 'report' },
  ]);

  return (
    <AdminGuard pathname="/">
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <header
          style={{
            background: '#ffffff',
            padding: '1.5rem 2rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#111827' }}>
              {t('app.title', locale)}
            </h1>
            <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem' }}>
              Xin chào <strong>{user?.name || user?.email}</strong> — Chúc bạn một ngày làm việc hiệu quả!
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                background: '#e0e7ff',
                color: '#3730a3',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Vai trò: {user ? t(`roles.${user.role}`, locale) : ''}
            </span>
            <span
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                background: '#d1fae5',
                color: '#065f46',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              ✓ TOTP 2FA Đã kích hoạt
            </span>
          </div>
        </header>

        {/* ADM-01: Key Performance Metrics Overview */}
        <section aria-labelledby="kpi-heading" style={{ marginBottom: '2.5rem' }}>
          <h2 id="kpi-heading" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#1f2937' }}>
            Tổng quan chỉ số hoạt động hệ thống (ADM-01)
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              data-testid="stat-total-users"
              style={{
                background: '#ffffff',
                padding: '1.25rem',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.35rem' }}>Tổng người dùng</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>
                {metrics.totalUsers.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.25rem' }}>
                DAU: {metrics.activeDau} hoạt động hôm nay
              </div>
            </div>

            <div
              data-testid="stat-total-exams"
              style={{
                background: '#ffffff',
                padding: '1.25rem',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.35rem' }}>Đề thi hoạt động</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb' }}>
                {metrics.totalExams}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Từ N5 đến N1</div>
            </div>

            <div
              data-testid="stat-completion-rate"
              style={{
                background: '#ffffff',
                padding: '1.25rem',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.35rem' }}>Tỷ lệ hoàn thành</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#059669' }}>
                {metrics.overallCompletionRate}%
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Bài thi nộp thành công</div>
            </div>

            <div
              data-testid="stat-open-reports"
              style={{
                background: '#ffffff',
                padding: '1.25rem',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.35rem' }}>Báo lỗi câu hỏi</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#d97706' }}>
                {metrics.openReportsCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '0.25rem' }}>Cần xử lý & kiểm duyệt</div>
            </div>

            <div
              data-testid="stat-gross-revenue"
              style={{
                background: '#ffffff',
                padding: '1.25rem',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.35rem' }}>Doanh thu gói học</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#7c3aed' }}>
                {metrics.grossRevenueVnd.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.25rem' }}>Đã đối soát thanh toán</div>
            </div>
          </div>
        </section>

        {/* Dynamic Section Cards */}
        <section aria-labelledby="modules-heading" style={{ marginBottom: '2.5rem' }}>
          <h2 id="modules-heading" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Chức năng quản trị được phân quyền
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {sections
              .filter((sec) => sec.id !== 'overview')
              .flatMap((sec) => sec.items)
              .map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  data-testid={`dashboard-card-${item.id}`}
                  style={{
                    display: 'block',
                    background: '#ffffff',
                    padding: '1.5rem',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    textDecoration: 'none',
                    color: '#111827',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'border-color 0.15s, transform 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#1f2937' }}>
                      {t(item.labelKey, locale)}
                    </h3>
                    <span style={{ fontSize: '1.2rem', color: '#2563eb' }}>→</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
                    Truy cập mô-đun {t(item.labelKey, locale).toLowerCase()} theo thẩm quyền của bạn.
                  </p>
                </a>
              ))}
          </div>
        </section>

        {/* Recent Activity Stream */}
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#1f2937' }}>
            Nhật ký hoạt động trực tiếp gần đây
          </h2>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}
          >
            {activities.map((act, idx) => (
              <div
                key={act.id}
                data-testid={`activity-item-${act.id}`}
                style={{
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: idx < activities.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#111827' }}>{act.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Phân hệ: {act.type}</div>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{act.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminGuard>
  );
}
