import React from 'react';
import './globals.css';
import { AdminProviders } from './providers';
import { AdminNavigation } from '../lib/admin-nav';

export const metadata = {
  title: 'JLPT Online - Admin Portal',
  description: 'Hệ thống Quản trị & Điều hành JLPT Toàn diện',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="bg-[var(--bg-page,#f8fafc)] text-[var(--text-primary,#0f172a)] dark:bg-[var(--bg-page,#0b1120)] dark:text-[var(--text-primary,#f8fafc)] min-h-screen antialiased overflow-x-hidden font-sans m-0 p-0">
        <AdminProviders>
          <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
            <AdminNavigation />
            <main className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0 overflow-x-hidden w-full max-w-full">
              {children}
            </main>
          </div>
        </AdminProviders>
      </body>
    </html>
  );
}

