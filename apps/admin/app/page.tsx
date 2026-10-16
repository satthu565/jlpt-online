'use client';

import React from 'react';
import { AdminGuard } from '../lib/ui-guard';
import { useAdminAuth } from '../lib/auth-context';
import { getNavigationSections } from '../lib/navigation';
import { t } from '../lib/i18n';

export default function AdminDashboardPage(): React.JSX.Element {
  const { user, locale } = useAdminAuth();
  const sections = user ? getNavigationSections(user.role) : [];

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

        {/* Dynamic Section Cards */}
        <section aria-labelledby="modules-heading">
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
      </div>
    </AdminGuard>
  );
}
