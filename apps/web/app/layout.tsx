import React from 'react';

export const metadata = {
  title: 'JLPT Online',
  description: 'Nền tảng thi và luyện thi JLPT trực tuyến',
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
