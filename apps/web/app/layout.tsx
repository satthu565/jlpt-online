import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { CONSENT_HEAD_SCRIPT } from '../lib/consent-keys';
import { SITE_NAME, SITE_URL } from '../lib/site';
// Read on the server and handed to the client provider as a prop, so it is not part of any JS chunk.
import viMessages from '../messages/vi.json' with { type: 'json' };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} - Luyện thi tiếng Nhật trực tuyến chuẩn JLPT`,
  description: 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn JLPT N1–N5 với đồng hồ đồng bộ và phân tích chi tiết.',
  icons: {
    icon: [
      { url: '/images/brand/mascot-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/brand/mascot-96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/images/brand/mascot-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    title: `${SITE_NAME} - Luyện thi tiếng Nhật trực tuyến chuẩn JLPT`,
    description: 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn JLPT N1–N5 với đồng hồ đồng bộ và phân tích chi tiết.',
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: '/images/brand/logo-gokakuya.webp',
        width: 768,
        height: 512,
        alt: 'Gokakuya.com',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Luyện thi tiếng Nhật trực tuyến chuẩn JLPT`,
    description: 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn JLPT N1–N5 với đồng hồ đồng bộ và phân tích chi tiết.',
    images: ['/images/brand/logo-gokakuya.webp'],
  },
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
