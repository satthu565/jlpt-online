'use client';

import dynamic from 'next/dynamic';
import { ThemeProvider } from '@jlpt/ui/theme-context';
import { SkipToContent } from '@jlpt/ui/components/skip-to-content';
import { I18nProvider, useI18n, type MessageTree } from '../lib/i18n';
import { AuthProvider } from '../lib/auth-context';
import { NavigationHeader } from './nav-shell';

import { NavigationFooter } from './footer-shell';

const WebVitalsReporter = dynamic(
  () => import('../components/web-vitals-reporter').then((m) => m.WebVitalsReporter),
  { ssr: false },
);

const CookieConsentManager = dynamic(
  () => import('../components/cookie-consent-manager').then((m) => m.CookieConsentManager),
  { ssr: false },
);

function LocalizedSkipToContent(): React.JSX.Element {
  const { t } = useI18n();
  return <SkipToContent targetId="main-content" label={t('a11y.skipToContent')} />;
}

export function Providers({
  children,
  messages,
}: {
  children: React.ReactNode;
  messages: MessageTree;
}): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="system">
      <I18nProvider initialLocale="vi" messages={messages}>
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

