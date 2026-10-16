'use client';

import React from 'react';
import {
  Header,
  Footer,
  ThemeToggle,
  LocaleSwitcher,
  Button,
} from '@jlpt/ui';
import { useI18n, type Locale } from '../lib/i18n';
import { useAuth } from '../lib/auth-context';

export function NavigationHeader(): React.JSX.Element {
  const { t, locale, setLocale } = useI18n();
  const { user, signOut } = useAuth();

  const navItems = [
    { label: t('common.nav.home'), href: '/' },
    { label: t('common.nav.levels'), href: '#levels' },
    { label: t('common.nav.exams'), href: '/de-thi' },
    { label: t('common.nav.practice'), href: '/luyen-tap' },
  ];

  if (user) {
    navItems.push({ label: t('common.nav.account'), href: '/tai-khoan' });
  }

  const userMenu = user ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <a
        href="/tai-khoan"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          textDecoration: 'none',
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-muted)',
        }}
      >
        <span>👤</span>
        <span>{user.name || user.email.split('@')[0]}</span>
      </a>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut()}
        aria-label={t('common.nav.logout')}
      >
        {t('common.nav.logout')}
      </Button>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <a
        href="/dang-nhap"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          textDecoration: 'none',
          padding: '6px 12px',
          borderRadius: '6px',
        }}
      >
        {t('common.nav.login')}
      </a>
      <a
        href="/dang-ky"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-inverse)',
          backgroundColor: 'var(--color-primary)',
          textDecoration: 'none',
          padding: '6px 14px',
          borderRadius: '6px',
        }}
      >
        {t('common.nav.register')}
      </a>
    </div>
  );

  const rightControls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
      <ThemeToggle
        labels={{
          toggleTheme: t('theme.toggle'),
          light: t('theme.light'),
          dark: t('theme.dark'),
          system: t('theme.system'),
        }}
      />
    </div>
  );

  return (
    <Header
      brandName={t('common.brand')}
      navItems={navItems}
      rightControls={rightControls}
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
    { label: t('common.footer.terms'), href: '/dieu-khoan' },
    { label: t('common.footer.privacy'), href: '/chinh-sach' },
    { label: t('common.footer.faq'), href: '/faq' },
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
