'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from './auth-context';
import { getNavigationSections } from './navigation';
import { t, SUPPORTED_LOCALES, type Locale } from './i18n';

export function AdminNavigation(): React.JSX.Element | null {
  const { user, isAuthenticated, logout, locale, setLocale } = useAdminAuth();
  const pathname = usePathname() || '/';

  if (!isAuthenticated || !user) {
    return null;
  }

  const sections = getNavigationSections(user.role);

  return (
    <nav
      role="navigation"
      aria-label="Admin Navigation"
      data-testid="admin-navigation"
      style={{
        width: '260px',
        minHeight: '100vh',
        background: '#111827',
        color: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #374151',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '1.25rem 1rem',
          borderBottom: '1px solid #1f2937',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⛩️</span>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              {t('app.portalName', locale)}
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>v1.0.0</span>
          </div>
        </div>
      </div>

      {/* User Badge */}
      <div
        data-testid="staff-profile-badge"
        style={{
          padding: '0.875rem 1rem',
          background: '#1f2937',
          borderBottom: '1px solid #374151',
        }}
      >
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f9fafb' }}>
          {user.name || user.email}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
          {user.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            data-testid="user-role-badge"
            style={{
              display: 'inline-block',
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              background:
                user.role === 'admin'
                  ? '#7c3aed'
                  : user.role === 'editor'
                    ? '#0284c7'
                    : user.role === 'reviewer'
                      ? '#059669'
                      : '#d97706',
              color: '#ffffff',
            }}
          >
            {user.role}
          </span>
          <span
            title="2FA Verified"
            style={{
              fontSize: '0.7rem',
              color: '#10b981',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
          >
            ✓ 2FA
          </span>
        </div>
      </div>

      {/* Dynamic Nav Items */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 0.5rem',
        }}
      >
        {sections.map((section) => (
          <div key={section.id} style={{ marginBottom: '1.25rem' }}>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#6b7280',
                textTransform: 'uppercase',
                padding: '0 0.75rem 0.5rem',
                letterSpacing: '0.05em',
              }}
            >
              {t(section.titleKey, locale)}
            </div>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <li key={item.id} style={{ marginBottom: '0.125rem' }}>
                    <a
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      data-testid={`nav-item-${item.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        textDecoration: 'none',
                        color: isActive ? '#ffffff' : '#9ca3af',
                        background: isActive ? '#2563eb' : 'transparent',
                        fontWeight: isActive ? 600 : 400,
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      <span>{t(item.labelKey, locale)}</span>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '9999px',
                            background: '#374151',
                            color: '#e5e7eb',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Footer: Language Switcher and Sign Out */}
      <div
        style={{
          padding: '0.875rem 1rem',
          borderTop: '1px solid #1f2937',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Ngôn ngữ / 言語</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc}
                onClick={() => setLocale(loc as Locale)}
                aria-label={`Switch to ${loc}`}
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  background: locale === loc ? '#2563eb' : '#1f2937',
                  color: locale === loc ? '#ffffff' : '#9ca3af',
                  cursor: 'pointer',
                  fontWeight: locale === loc ? 700 : 400,
                  textTransform: 'uppercase',
                }}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => void logout()}
          data-testid="logout-button"
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#374151',
            color: '#f3f4f6',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <span>🚪</span>
          <span>{t('auth.signOutButton', locale)}</span>
        </button>
      </div>
    </nav>
  );
}
