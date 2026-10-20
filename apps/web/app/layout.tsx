import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { CONSENT_HEAD_SCRIPT } from '../lib/consent-keys';
// Read on the server and handed to the client provider as a prop, so it is not part of any JS chunk.
import viMessages from '../messages/vi.json' with { type: 'json' };

export const metadata: Metadata = {
  title: 'JLPT Online - Luyện thi tiếng Nhật trực tuyến chuẩn JLPT',
  description: 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn JLPT N1–N5 với đồng hồ đồng bộ và phân tích chi tiết.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1120' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: CONSENT_HEAD_SCRIPT }} />
        <link
          rel="preload"
          href="/fonts/inter-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/inter-vietnamese.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers messages={viMessages}>{children}</Providers>
      </body>
    </html>
  );
}
