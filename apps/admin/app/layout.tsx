import React from 'react';
import { AdminAuthProvider } from '../lib/auth-context';
import { AdminNavigation } from '../lib/admin-nav';

export const metadata = {
  title: 'JLPT Admin Portal',
  description: 'Hệ thống quản trị và kiểm duyệt đề thi JLPT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: '#f9fafb',
          color: '#111827',
          minHeight: '100vh',
        }}
      >
        <AdminAuthProvider>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <AdminNavigation />
            <main
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {children}
            </main>
          </div>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
