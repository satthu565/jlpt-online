'use client';

import React from 'react';
import {
  Header,
  Footer,
  ThemeToggle,
  LocaleSwitcher,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  type NavItem,
} from '@jlpt/ui';
import { useI18n, type Locale } from '../lib/i18n';
import { useAuth } from '../lib/auth-context';

export function NavigationHeader(): React.JSX.Element {
  const { t, locale, setLocale } = useI18n();
  const { user, signOut } = useAuth();

  // Core navigation items displayed directly
  const navItems: NavItem[] = [
    { label: t('common.nav.home'), href: '/' },
    { label: t('common.nav.exams'), href: '/de-thi' },
    { label: t('common.nav.practice'), href: '/luyen-tap' },
    { label: t('common.nav.vocabulary'), href: '/tu-vung' },
    { label: t('common.nav.grammar'), href: '/ngu-phap' },
    { label: t('common.nav.notebook'), href: '/so-tay' },
  ];

  // Secondary items grouped into "Thêm" (More) dropdown menu
  const moreItems: NavItem[] = [
    { label: t('common.nav.planner'), href: '/ke-hoach' },
    { label: t('common.nav.classroom'), href: '/lop-hoc' },
    { label: t('common.nav.events'), href: '/su-kien' },
    { label: t('common.nav.pricing'), href: '/goi-thanh-vien' },
  ];

  if (user) {
    moreItems.push({ label: t('common.nav.examHistory'), href: '/lich-su' });
    moreItems.push({ label: t('common.nav.analytics'), href: '/thong-ke' });
  }

  navItems.push({
    label: t('common.nav.more') || 'Thêm',
    children: moreItems,
  });

  // Account menu with integrated Language & Theme switchers
  const userMenu = user ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 font-semibold text-sm px-3 py-1.5 rounded-lg bg-[var(--bg-muted)] hover:bg-[var(--bg-hover)]"
            aria-label={t('common.nav.account')}
          >
            <span>👤</span>
            <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name || user.email.split('@')[0]}
            </span>
            <span aria-hidden="true" style={{ fontSize: '0.625rem', opacity: 0.7 }}>▼</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 p-2 space-y-2">
          <div className="px-2 py-1 text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)] truncate">
            {user.email}
          </div>
          <DropdownMenuItem asChild>
            <a href="/tai-khoan" className="flex items-center gap-2 cursor-pointer w-full text-sm">
              <span>👤</span>
              <span>{t('common.nav.account')}</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/lich-su" className="flex items-center gap-2 cursor-pointer w-full text-sm">
              <span>📊</span>
              <span>{t('common.nav.examHistory')}</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/thong-ke" className="flex items-center gap-2 cursor-pointer w-full text-sm">
              <span>📈</span>
              <span>{t('common.nav.analytics')}</span>
            </a>
          </DropdownMenuItem>
          <div className="border-t border-[var(--border-subtle)] my-1" />
          <div className="px-2 text-xs font-semibold text-[var(--text-muted)]">
            {t('locale.select') || 'Ngôn ngữ'}
          </div>
          <div className="px-2">
            <LocaleSwitcher
              currentLocale={locale}
              onLocaleChange={(newLoc: Locale) => setLocale(newLoc)}
              compact
              labels={{
                selectLanguage: t('locale.select'),
                vi: 'VI',
                ja: 'JA',
                en: 'EN',
              }}
            />
          </div>
          <div className="px-2 text-xs font-semibold text-[var(--text-muted)] mt-1">
            {t('theme.toggle') || 'Giao diện'}
          </div>
          <div className="px-2">
            <ThemeToggle
              compact
              labels={{
                toggleTheme: t('theme.toggle'),
                light: t('theme.light'),
                dark: t('theme.dark'),
                system: t('theme.system'),
              }}
            />
          </div>
          <div className="border-t border-[var(--border-subtle)] my-1" />
          <DropdownMenuItem
            onClick={() => signOut()}
            className="text-red-600 focus:text-red-700 cursor-pointer flex items-center gap-2 w-full text-sm font-medium"
            aria-label={t('common.nav.logout')}
          >
            <span>🚪</span>
            <span>{t('common.nav.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : (
    <div className="header-auth-buttons" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <Button variant="ghost" size="sm" asChild>
        <a href="/dang-nhap" style={{ textDecoration: 'none' }}>
          {t('common.nav.login')}
        </a>
      </Button>
      <Button variant="primary" size="sm" asChild>
        <a href="/dang-ky" style={{ textDecoration: 'none' }}>
          {t('common.nav.register')}
        </a>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300"
            aria-label={t('locale.select') || 'Cài đặt giao diện và ngôn ngữ'}
          >
            <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>🌐</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-2 space-y-2">
          <div className="px-2 text-xs font-semibold text-[var(--text-muted)]">
            {t('locale.select') || 'Ngôn ngữ'}
          </div>
          <div className="px-2">
            <LocaleSwitcher
              currentLocale={locale}
              onLocaleChange={(newLoc: Locale) => setLocale(newLoc)}
              compact
              labels={{
                selectLanguage: t('locale.select'),
                vi: 'VI',
                ja: 'JA',
                en: 'EN',
              }}
            />
          </div>
          <div className="px-2 text-xs font-semibold text-[var(--text-muted)] mt-1">
            {t('theme.toggle') || 'Giao diện'}
          </div>
          <div className="px-2">
            <ThemeToggle
              compact
              labels={{
                toggleTheme: t('theme.toggle'),
                light: t('theme.light'),
                dark: t('theme.dark'),
                system: t('theme.system'),
              }}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <Header
      brandName={t('common.brand')}
      navItems={navItems}
      userMenu={userMenu}
      mobileMenuOpenLabel={t('a11y.openMenu')}
      mobileMenuCloseLabel={t('a11y.closeMenu')}
    />
  );
}

export function NavigationFooter(): React.JSX.Element {
  const { t, locale, setLocale } = useI18n();

  const footerLinks = [
    { label: t('common.footer.about'), href: '/gioi-thieu' },
    { label: t('common.footer.levels'), href: '/n3' },
    { label: t('common.footer.vocabAndGrammar'), href: '/tu-vung' },
    { label: t('common.footer.vocabStats'), href: '/thong-ke-tu-vung' },
    { label: t('common.footer.faq'), href: '/faq' },
    { label: t('common.footer.technicalSupport'), href: '/ho-tro' },
    { label: t('common.footer.terms'), href: '/dieu-khoan' },
    { label: t('common.footer.privacy'), href: '/chinh-sach' },
    { label: t('common.footer.contact'), href: '/lien-he' },
  ];

  return (
    <Footer
      brandName={t('common.brand')}
      tagline={t('common.tagline')}
      links={footerLinks}
      copyright={t('common.footer.copyright')}
      a11yNotice={t('common.footer.accessibilityNotice')}
      localeControl={
        <LocaleSwitcher
          currentLocale={locale}
          onLocaleChange={(newLoc: Locale) => setLocale(newLoc)}
          labels={{
            selectLanguage: t('locale.select'),
            vi: t('locale.vi'),
            ja: t('locale.ja'),
            en: t('locale.en'),
          }}
        />
      }
      themeControl={
        <ThemeToggle
          labels={{
            toggleTheme: t('theme.toggle'),
            light: t('theme.light'),
            dark: t('theme.dark'),
            system: t('theme.system'),
          }}
        />
      }
    />
  );
}
