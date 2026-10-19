'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button, ThemeToggle, cn } from '@jlpt/ui';
import { useAdminAuth } from './auth-context';
import { getNavigationSections } from './navigation';
import { t, SUPPORTED_LOCALES, type Locale } from './i18n';

export function AdminNavigation(): React.JSX.Element | null {
  const { user, isAuthenticated, logout, locale, setLocale } = useAdminAuth();
  const pathname = usePathname() || '/';
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  const sections = getNavigationSections(user.role);

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 border-b border-gray-800 z-30 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⛩️</span>
          <span className="text-sm font-bold text-white">{t('app.portalName', locale)}</span>
        </div>
        <Button
          type="button"
          data-testid="btn-open-mobile-nav"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open Navigation"
          variant="ghost"
          size="sm"
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg min-h-0"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          data-testid="mobile-nav-backdrop"
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Navigation */}
      <nav
        role="navigation"
        aria-label="Admin Navigation"
        data-testid="admin-navigation"
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-gray-100 flex flex-col border-r border-gray-800 transform transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⛩️</span>
            <div>
              <span className="text-sm font-bold text-white m-0 block">
                {t('app.portalName', locale)}
              </span>
              <span className="text-xs text-gray-400">v1.0.0</span>
            </div>
          </div>
          <Button
            type="button"
            data-testid="btn-close-mobile-nav"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close Navigation"
            variant="ghost"
            size="sm"
            className="md:hidden p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg min-h-0"
          >
            ✕
          </Button>
        </div>

        {/* User Badge */}
        <div
          data-testid="staff-profile-badge"
          className="p-3.5 bg-gray-800/80 border-b border-gray-700/80"
        >
          <div className="text-sm font-semibold text-gray-50">
            {user.name || user.email}
          </div>
          <div className="text-xs text-gray-400 mb-1">
            {user.email}
          </div>
          <div className="flex items-center gap-2">
            <span
              data-testid="user-role-badge"
              className={cn(
                'inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase text-white',
                user.role === 'admin'
                  ? 'bg-purple-600'
                  : user.role === 'editor'
                    ? 'bg-sky-600'
                    : user.role === 'reviewer'
                      ? 'bg-emerald-600'
                      : 'bg-amber-600',
              )}
            >
              {user.role}
            </span>
            <span
              title="2FA Verified"
              className="text-[11px] text-emerald-400 font-semibold inline-flex items-center gap-1"
            >
              ✓ 2FA
            </span>
          </div>
        </div>

        {/* Dynamic Nav Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {sections.map((section) => (
            <div key={section.id}>
              <div className="text-[11px] font-bold text-gray-400 uppercase px-3 pb-2 tracking-wider">
                {t(section.titleKey, locale)}
              </div>

              <ul className="list-none m-0 p-0 space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <li key={item.id}>
                      <a
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                        data-testid={`nav-item-${item.id}`}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-md text-sm no-underline transition-colors',
                          isActive
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/60 font-normal',
                        )}
                      >
                        <span>{t(item.labelKey, locale)}</span>
                        {item.badge && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-200">
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

        {/* Bottom Footer: Theme Toggle, Language Switcher and Sign Out */}
        <div className="p-4 border-t border-gray-800 flex flex-col gap-3 bg-gray-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Giao diện / テーマ</span>
            <ThemeToggle compact />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Ngôn ngữ / 言語</span>
            <div className="flex gap-1">
              {SUPPORTED_LOCALES.map((loc) => (
                <Button
                  key={loc}
                  type="button"
                  onClick={() => setLocale(loc as Locale)}
                  aria-label={`Switch to ${loc}`}
                  data-testid={`admin-locale-${loc}`}
                  size="sm"
                  variant={locale === loc ? 'primary' : 'outline'}
                  className={cn(
                    'px-2 py-0.5 text-[11px] uppercase rounded border min-h-0 h-auto font-medium',
                    locale === loc
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700',
                  )}
                >
                  {loc}
                </Button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void logout()}
            data-testid="logout-button"
            variant="secondary"
            className="w-full justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700 text-sm font-medium min-h-[38px]"
          >
            <span>🚪</span>
            <span>{t('auth.signOutButton', locale)}</span>
          </Button>
        </div>
      </nav>
    </>
  );
}

