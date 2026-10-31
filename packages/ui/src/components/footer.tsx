import React from 'react';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterProps {
  brandName?: string;
  tagline?: string;
  logoSrc?: string;
  logoAlt?: string;
  links?: FooterLink[];
  copyright?: string;
  a11yNotice?: string;
  localeControl?: React.ReactNode;
  themeControl?: React.ReactNode;
  className?: string;
}

export function Footer({
  brandName = 'JLPT Online',
  tagline = 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn JLPT N1–N5',
  logoSrc = '/images/brand/logo-v3-footer.webp',
  logoAlt = 'Gokakuya.com',
  links = [],
  copyright,
  a11yNotice = 'Thiết kế tuân thủ WCAG 2.1 AA trợ năng và tương thích thiết bị di động.',
  localeControl,
  themeControl,
  className = '',
}: FooterProps): React.JSX.Element {
  const currentYear = new Date().getFullYear();
  const defaultCopyright = `© ${currentYear} ${brandName}. Bảo lưu mọi quyền.`;

  return (
    <footer
      className={`jlpt-footer mt-auto border-t border-[var(--border-subtle,#e2e8f0)] bg-[var(--bg-surface,#ffffff)] py-10 text-sm text-[var(--text-secondary,#475569)] ${className}`}
    >
      <div className="container">
        <div
          className="footer-grid flex flex-col justify-between gap-6 md:flex-row md:items-start">
          {/* Brand & Tagline */}
          <div className="max-w-[400px]">
            {logoSrc ? (
              <div className="mb-3">
                <img
                  src={logoSrc}
                  alt={logoAlt}
                  width={520}
                  height={100}
                  loading="lazy"
                  decoding="async"
                  className="w-56 max-w-full h-auto object-contain"
                />
              </div>
            ) : brandName ? (
              <div className="font-bold text-lg text-[var(--text-primary,#0f172a)] mb-2">
                {brandName}
              </div>
            ) : null}
            <p className="m-0 text-[var(--text-muted,#64748b)] leading-normal">
              {tagline}
            </p>
          </div>

          {/* Quick Links */}
          {links.length > 0 && (
            <nav aria-label="Footer Navigation">
              <ul className="flex flex-wrap gap-5 list-none p-0 m-0">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-[var(--text-secondary,#475569)] no-underline transition-colors hover:text-[var(--color-primary,#16a34a)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Footer Controls (Locale + Theme) */}
          {(localeControl || themeControl) && (
            <div className="flex items-center gap-4 flex-wrap">
              {localeControl}
              {themeControl}
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col gap-2 border-t border-[var(--border-subtle,#e2e8f0)] pt-6 text-[0.8125rem] text-[var(--text-muted,#64748b)]">
          <div>{copyright || defaultCopyright}</div>
          {a11yNotice && <div>{a11yNotice}</div>}
        </div>
      </div>
    </footer>
  );
}
