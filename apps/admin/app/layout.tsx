import React from 'react';

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
      <body>{children}</body>
    </html>
  );
}
