'use client';

import React from 'react';
import { ThemeProvider, SkipToContent } from '@jlpt/ui';
import { I18nProvider, useI18n } from '../lib/i18n';
import { AuthProvider } from '../lib/auth-context';
import { NavigationHeader, NavigationFooter } from './nav-shell';
import { CookieConsentManager } from '../components/cookie-consent-manager';
import { WebVitalsReporter } from '../components/web-vitals-reporter';

function LocalizedSkipToContent(): React.JSX.Element {
  const { t } = useI18n();
  return <SkipToContent targetId="main-content" label={t('a11y.skipToContent')} />;
}

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="system">
      <I18nProvider initialLocale="vi">
        <AuthProvider>
          <WebVitalsReporter />
          <LocalizedSkipToContent />
          <NavigationHeader />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <NavigationFooter />
          <CookieConsentManager />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

