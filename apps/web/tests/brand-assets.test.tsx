import { describe, it, expect } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import { NavigationHeader } from '../app/nav-shell';
import { NavigationFooter } from '../app/footer-shell';
import { metadata } from '../app/layout';
import { I18nProvider } from '../lib/i18n';
import viMessages from '../messages/vi.json' with { type: 'json' };

function renderWithI18n(ui: React.ReactElement): string {
  return renderToString(
    <I18nProvider initialLocale="vi" messages={viMessages}>
      {ui}
    </I18nProvider>,
  );
}

describe('Brand Logo & Mascot Assets (Gokakuya.com & JLPT Online)', () => {
  const brandDir = path.resolve(__dirname, '../public/images/brand');

  it('ensures all required brand assets exist on disk in apps/web/public/images/brand/', () => {
    const requiredFiles = [
      'mascot-512.png',
      'mascot-192.png',
      'mascot-96.png',
      'mascot-32.png',
      'logo-gokakuya.webp',
    ];
    for (const file of requiredFiles) {
      const fullPath = path.join(brandDir, file);
      expect(fs.existsSync(fullPath), `Missing ${file} in ${brandDir}`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(100);
    }

    const faviconPath = path.resolve(__dirname, '../public/favicon.ico');
    expect(fs.existsSync(faviconPath), 'Missing public/favicon.ico').toBe(true);
  });

  it('renders NavigationHeader with circular mascot-96.png, alt, fixed dimensions, and brand text', () => {
    const html = renderWithI18n(<NavigationHeader />);
    // Brand name text is preserved
    expect(html).toContain('JLPT Online');
    // Mascot image replaced old "J" square
    expect(html).toContain('src="/images/brand/mascot-96.png"');
    expect(html).toContain('alt="JLPT Online"');
    expect(html).toContain('width="32"');
    expect(html).toContain('height="32"');
    expect(html).toContain('rounded-full');
    expect(html).toContain('loading="eager"');
    expect(html).not.toContain('>J<');
  });

  it('renders NavigationFooter with Gokakuya logo, fixed dimensions, rounded-xl, and alt', () => {
    const html = renderWithI18n(<NavigationFooter />);
    expect(html).toContain('src="/images/brand/logo-gokakuya.webp"');
    expect(html).toContain('alt="Gokakuya.com"');
    expect(html).toContain('rounded-xl');
    expect(html).toContain('width="180"');
    expect(html).toContain('height="120"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('JLPT Online');
  });

  it('declares mascot icons and Open Graph Gokakuya image in root metadata', () => {
    expect(metadata.icons).toBeDefined();
    const icons = metadata.icons as {
      icon: Array<{ url: string; sizes?: string; type?: string }>;
      apple: Array<{ url: string; sizes?: string; type?: string }>;
    };

    expect(icons.icon).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: '/images/brand/mascot-32.png', sizes: '32x32' }),
        expect.objectContaining({ url: '/images/brand/mascot-96.png', sizes: '96x96' }),
      ]),
    );

    expect(icons.apple).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: '/images/brand/mascot-192.png', sizes: '192x192' }),
      ]),
    );

    expect(metadata.openGraph).toBeDefined();
    const og = metadata.openGraph as {
      images: Array<{ url: string; width?: number; height?: number; alt?: string }>;
    };
    expect(og.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: '/images/brand/logo-gokakuya.webp',
          width: 768,
          height: 512,
          alt: 'Gokakuya.com',
        }),
      ]),
    );
  });
});
