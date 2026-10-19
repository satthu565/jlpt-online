'use client';

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './dropdown-menu.js';

export interface NavItem {
  label: string;
  href?: string;
  active?: boolean;
  children?: NavItem[];
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
        maxWidth: '100vw',
        overflowX: 'clip',
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
          maxWidth: '100%',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Brand / Logo */}
        <div className="header-brand-nav" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
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
              flexShrink: 0,
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
            {navItems.map((item) => {
              if (item.children && item.children.length > 0) {
                const isChildActive = item.children.some((c) => c.active);
                return (
                  <DropdownMenu key={item.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="header-nav-link header-nav-dropdown-trigger"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.875rem',
                          fontWeight: isChildActive ? 600 : 500,
                          color: isChildActive ? 'var(--color-primary, #16a34a)' : 'var(--text-secondary, #475569)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.375rem 0.5rem',
                          borderRadius: '6px',
                          fontFamily: 'inherit',
                          whiteSpace: 'nowrap',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        <span>{item.label}</span>
                        <span aria-hidden="true" style={{ fontSize: '0.625rem', opacity: 0.7 }}>▼</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[11rem] p-1.5 shadow-md">
                      {item.children.map((subItem) => (
                        <DropdownMenuItem key={subItem.href || subItem.label} asChild>
                          <a
                            href={subItem.href}
                            className="flex items-center w-full px-2.5 py-1.5 text-sm cursor-pointer rounded-sm"
                            aria-current={subItem.active ? 'page' : undefined}
                            style={{
                              color: subItem.active ? 'var(--color-primary, #16a34a)' : undefined,
                              fontWeight: subItem.active ? 600 : undefined,
                              textDecoration: 'none',
                            }}
                          >
                            {subItem.label}
                          </a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              return (
                <a
                  key={item.href || item.label}
                  href={item.href}
                  className="header-nav-link"
                  aria-current={item.active ? 'page' : undefined}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: item.active ? 600 : 500,
                    color: item.active ? 'var(--color-primary, #16a34a)' : 'var(--text-secondary, #475569)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    padding: '0.375rem 0.5rem',
                    borderRadius: '6px',
                    transition: 'color 0.15s ease',
                  }}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Right Controls & Auth */}
        <div className="header-right-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
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
            {navItems.map((item) => {
              if (item.children && item.children.length > 0) {
                return (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--text-muted, #94a3b8)',
                        padding: '0.5rem 1rem 0.25rem',
                      }}
                    >
                      {item.label}
                    </div>
                    {item.children.map((subItem) => (
                      <a
                        key={subItem.href || subItem.label}
                        href={subItem.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-current={subItem.active ? 'page' : undefined}
                        style={{
                          fontSize: '1rem',
                          fontWeight: subItem.active ? 600 : 500,
                          color: subItem.active ? 'var(--color-primary, #16a34a)' : 'var(--text-primary, #0f172a)',
                          textDecoration: 'none',
                          padding: '0.625rem 1rem 0.625rem 1.5rem',
                          borderRadius: '6px',
                          backgroundColor: subItem.active ? 'var(--color-primary-light, #dcfce7)' : 'transparent',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {subItem.label}
                      </a>
                    ))}
                  </div>
                );
              }

              return (
                <a
                  key={item.href || item.label}
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
              );
            })}
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
        @media (max-width: 1400px) {
          .theme-toggle-label {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .theme-toggle-label {
            display: none !important;
          }
          .header-auth-buttons {
            display: none !important;
          }
        }
        @media (max-width: 1279px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-button {
            display: inline-flex !important;
          }
        }
        @media (min-width: 1280px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-button {
            display: none !important;
          }
          .mobile-drawer {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
