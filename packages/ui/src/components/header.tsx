'use client';

import React, { useState } from 'react';

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface HeaderProps {
  brandName?: string;
  brandHref?: string;
  navItems?: NavItem[];
  rightControls?: React.ReactNode;
  userMenu?: React.ReactNode;
  mobileMenuOpenLabel?: string;
  mobileMenuCloseLabel?: string;
  className?: string;
}

export function Header({
  brandName = 'JLPT Online',
  brandHref = '/',
  navItems = [],
  rightControls,
  userMenu,
  mobileMenuOpenLabel = 'Mở menu điều hướng',
  mobileMenuCloseLabel = 'Đóng menu',
  className = '',
}: HeaderProps): React.JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-surface, #ffffff)',
        borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: 'var(--shadow-sm)',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
      className={`jlpt-header ${className}`}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
      >
        {/* Brand / Logo */}
        <div className="header-brand-nav" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a
            href={brandHref}
            className="header-brand-logo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 800,
              fontSize: '1.25rem',
              color: 'var(--color-primary, #16a34a)',
              textDecoration: 'none',
              letterSpacing: '-0.025em',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary, #16a34a)',
                color: 'var(--text-inverse, #ffffff)',
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              J
            </span>
            <span>{brandName}</span>
          </a>

          {/* Desktop Navigation */}
          <nav
            aria-label="Main Navigation"
            className="desktop-nav"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="header-nav-link"
                aria-current={item.active ? 'page' : undefined}
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: item.active ? 600 : 500,
                  color: item.active ? 'var(--color-primary, #16a34a)' : 'var(--text-secondary, #475569)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  padding: '0.5rem 0.625rem',
                  borderRadius: '6px',
                  transition: 'color 0.15s ease',
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Right Controls & Auth */}
        <div className="header-right-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {rightControls && (
            <div className="header-desktop-controls">
              {rightControls}
            </div>
          )}
          {userMenu}

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={isMobileMenuOpen ? mobileMenuCloseLabel : mobileMenuOpenLabel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--border-default, #cbd5e1)',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              cursor: 'pointer',
              minHeight: '40px',
              minWidth: '40px',
            }}
            className="mobile-menu-button"
          >
            <span aria-hidden="true" style={{ fontSize: '1.25rem', lineHeight: 1 }}>
              {isMobileMenuOpen ? '✕' : '☰'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation (SYS-01) */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          role="region"
          aria-label="Mobile Navigation"
          style={{
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            backgroundColor: 'var(--bg-surface, #ffffff)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-md)',
          }}
          className="mobile-drawer"
        >
          <nav
            aria-label="Mobile Links"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-current={item.active ? 'page' : undefined}
                style={{
                  fontSize: '1rem',
                  fontWeight: item.active ? 600 : 500,
                  color: item.active ? 'var(--color-primary, #16a34a)' : 'var(--text-primary, #0f172a)',
                  textDecoration: 'none',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: item.active ? 'var(--color-primary-light, #dcfce7)' : 'transparent',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
          {rightControls && (
            <div
              style={{
                borderTop: '1px solid var(--border-subtle, #e2e8f0)',
                paddingTop: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {rightControls}
            </div>
          )}
        </div>
      )}

      <style>{`
        .jlpt-header {
          width: 100%;
          max-width: 100vw;
          overflow-x: clip;
        }
        .jlpt-header .container {
          max-width: 100%;
          box-sizing: border-box;
        }
        @media (min-width: 1024px) {
          .jlpt-header .container {
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }
        @media (max-width: 768px) {
          .header-desktop-controls {
            display: none !important;
          }
          .desktop-nav {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .desktop-nav {
            display: flex !important;
            gap: 0.25rem;
            align-items: center;
          }
          .header-desktop-controls {
            display: flex !important;
            gap: 0.375rem;
          }
          .header-brand-nav {
            gap: 0.75rem !important;
          }
          .header-right-group {
            gap: 0.5rem !important;
          }
          .header-nav-link {
            padding: 0.375rem 0.45rem !important;
            font-size: 0.875rem !important;
          }
          .mobile-menu-button {
            display: none !important;
          }
          .mobile-drawer {
            display: none !important;
          }
        }
        @media (max-width: 1440px) {
          .header-desktop-controls .theme-toggle-label {
            display: none !important;
          }
          .header-desktop-controls .theme-toggle-icon {
            margin-right: 0 !important;
          }
          .header-desktop-controls .jlpt-theme-toggle button {
            padding: 6px 8px !important;
          }
          .header-desktop-controls .jlpt-locale-switcher select {
            padding: 0.375rem 0.5rem !important;
            font-size: 0.8125rem !important;
            max-width: 115px !important;
          }
        }
        @media (min-width: 1440px) {
          .desktop-nav {
            gap: 0.5rem;
          }
          .header-brand-nav {
            gap: 1.25rem !important;
          }
          .header-nav-link {
            padding: 0.5rem 0.625rem !important;
            font-size: 0.9375rem !important;
          }
          .header-desktop-controls {
            gap: 0.5rem;
          }
        }
      `}</style>
    </header>
  );
}
