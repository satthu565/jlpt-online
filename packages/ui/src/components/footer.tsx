import React from 'react';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterProps {
  brandName?: string;
  tagline?: string;
  links?: FooterLink[];
  copyright?: string;
  localeControl?: React.ReactNode;
  themeControl?: React.ReactNode;
  className?: string;
}

export function Footer({
  brandName = 'JLPT Online',
  tagline = 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn JLPT N1–N5',
  links = [],
  copyright,
  localeControl,
  themeControl,
  className = '',
}: FooterProps): React.JSX.Element {
  const currentYear = new Date().getFullYear();
  const defaultCopyright = `© ${currentYear} ${brandName}. Bảo lưu mọi quyền.`;

  return (
    <footer
      style={{
        backgroundColor: 'var(--bg-surface, #ffffff)',
        borderTop: '1px solid var(--border-subtle, #e2e8f0)',
        paddingTop: '2.5rem',
        paddingBottom: '2.5rem',
        marginTop: 'auto',
        color: 'var(--text-secondary, #475569)',
        fontSize: '0.875rem',
      }}
      className={`jlpt-footer ${className}`}
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            justifyContent: 'space-between',
          }}
          className="footer-grid"
        >
          {/* Brand & Tagline */}
          <div style={{ maxWidth: '400px' }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: '1.125rem',
                color: 'var(--text-primary, #0f172a)',
                marginBottom: '0.5rem',
              }}
            >
              {brandName}
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', lineHeight: 1.5 }}>
              {tagline}
            </p>
          </div>

          {/* Quick Links */}
          {links.length > 0 && (
            <nav aria-label="Footer Navigation">
              <ul
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      style={{
                        color: 'var(--text-secondary, #475569)',
                        textDecoration: 'none',
                        transition: 'color 0.15s ease',
                      }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {localeControl}
              {themeControl}
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            color: 'var(--text-muted, #64748b)',
            fontSize: '0.8125rem',
          }}
        >
          <div>{copyright || defaultCopyright}</div>
          <div>Thiết kế tuân thủ WCAG 2.1 AA trợ năng và tương thích thiết bị di động.</div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .footer-grid {
            flex-direction: row !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </footer>
  );
}
