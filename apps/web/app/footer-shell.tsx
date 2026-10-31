'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Footer } from '@jlpt/ui/components/footer';
import { useI18n, type Locale } from '../lib/i18n';
import { FEATURES } from '../lib/features';

const ThemeToggle = dynamic(
  () => import('@jlpt/ui/components/theme-toggle').then((m) => m.ThemeToggle),
  { ssr: false },
);

const LocaleSwitcher = dynamic(
  () => import('@jlpt/ui/components/locale-switcher').then((m) => m.LocaleSwitcher),
  { ssr: false },
);

export function NavigationFooter(): React.JSX.Element {
  const { t, locale, setLocale } = useI18n();

  const footerLinks = [
    { label: t('common.footer.about'), href: '/gioi-thieu' },
    { label: t('common.footer.levels'), href: '/n3' },
    { label: t('common.footer.vocabAndGrammar'), href: '/tu-vung' },
    { label: t('common.footer.vocabStats'), href: '/thong-ke-tu-vung' },
    { label: t('common.footer.schedules'), href: '/lich-thi' },
    { label: t('common.footer.faq'), href: '/faq' },
    { label: t('common.footer.technicalSupport'), href: '/ho-tro' },
    { label: t('common.footer.terms'), href: '/dieu-khoan' },
    ...(FEATURES.privacyPolicyPage ? [{ label: t('common.footer.privacy'), href: '/chinh-sach' }] : []),
    { label: t('common.footer.contact'), href: '/lien-he' },
  ];

  return (
    <Footer
      brandName={t('common.brand')}
      tagline={t('common.tagline')}
      logoSrc="/images/brand/logo-v2-footer.webp"
      logoAlt="Gokakuya.com"
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
