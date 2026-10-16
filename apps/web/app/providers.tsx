'use client';

import React from 'react';
import { ThemeProvider, SkipToContent } from '@jlpt/ui';
import { I18nProvider } from '../lib/i18n';
import { AuthProvider } from '../lib/auth-context';
import { NavigationHeader, NavigationFooter } from './nav-shell';

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="system">
      <I18nProvider initialLocale="vi">
        <AuthProvider>
          <SkipToContent targetId="main-content" label="Chuyển đến nội dung chính" />
          <NavigationHeader />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <NavigationFooter />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
