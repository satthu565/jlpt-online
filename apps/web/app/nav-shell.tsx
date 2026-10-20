'use client';

import { BarChart3, ChevronDown, Globe, History, LogOut, UserRound } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Header, type NavItem } from '@jlpt/ui/components/header';
import { Button } from '@jlpt/ui/components/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@jlpt/ui/components/dropdown-menu';
import { useI18n, type Locale } from '../lib/i18n';
import { useAuth } from '../lib/auth-context';

const ThemeToggle = dynamic(
  () => import('@jlpt/ui/components/theme-toggle').then((m) => m.ThemeToggle),
  { ssr: false },
);

const LocaleSwitcher = dynamic(
  () => import('@jlpt/ui/components/locale-switcher').then((m) => m.LocaleSwitcher),
  { ssr: false },
);

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
    { label: t('common.nav.schedules'), href: '/lich-thi' },
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
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 font-semibold text-sm px-3 py-1.5 rounded-lg bg-[var(--bg-muted)] hover:bg-[var(--bg-hover)]"
            aria-label={t('common.nav.account')}
          >
            <UserRound className="size-4" aria-hidden="true" />
            <span className="max-w-[110px] truncate">
              {user.name || user.email.split('@')[0]}
            </span>
            <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 p-2 space-y-2">
          <div className="px-2 py-1 text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)] truncate">
            {user.email}
          </div>
          <DropdownMenuItem asChild>
            <a href="/tai-khoan" className="flex items-center gap-2 cursor-pointer w-full text-sm">
              <UserRound className="size-4" aria-hidden="true" />
              <span>{t('common.nav.account')}</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/lich-su" className="flex items-center gap-2 cursor-pointer w-full text-sm">
              <History className="size-4" aria-hidden="true" />
              <span>{t('common.nav.examHistory')}</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/thong-ke" className="flex items-center gap-2 cursor-pointer w-full text-sm">
              <BarChart3 className="size-4" aria-hidden="true" />
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
            <LogOut className="size-4" aria-hidden="true" />
            <span>{t('common.nav.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : (
    <div className="header-auth-buttons flex items-center gap-1.5">
      <Button variant="ghost" size="sm" asChild>
        <a className="no-underline" href="/dang-nhap">
          {t('common.nav.login')}
        </a>
      </Button>
      <Button variant="primary" size="sm" asChild>
        <a className="no-underline" href="/dang-ky">
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
            <Globe className="size-[1.1rem]" aria-hidden="true" />
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

