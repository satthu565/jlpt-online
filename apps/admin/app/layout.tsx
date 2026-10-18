import React from 'react';
import './globals.css';
import { AdminAuthProvider } from '../lib/auth-context';
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
    <html lang="vi">
      <body
        className="bg-gray-50 text-gray-900 min-h-screen antialiased overflow-x-hidden font-sans"
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <AdminAuthProvider>
          <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
            <AdminNavigation />
            <main className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0 overflow-x-hidden w-full max-w-full">
              {children}
            </main>
          </div>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
