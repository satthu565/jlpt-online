'use client';

import React from 'react';
import { ThemeProvider } from '@jlpt/ui';
import { AdminAuthProvider } from '../lib/auth-context';

export function AdminProviders({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="system">
      <AdminAuthProvider>
        {children}
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
