'use client';

import React, { useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './dropdown-menu.js';
import { cn } from '../lib/utils.js';

export interface NavItem {
  label: string;
  href?: string;
  active?: boolean;
  children?: NavItem[];
}

export interface HeaderProps {
  brandName?: string;
  brandHref?: string;
  logoSrc?: string;
  logoAlt?: string;
  navItems?: NavItem[];
  rightControls?: React.ReactNode;
  userMenu?: React.ReactNode;
  mobileMenuOpenLabel?: string;
  mobileMenuCloseLabel?: string;
  className?: string;
}

const PRIMARY = 'text-[var(--color-primary,#16a34a)]';

function desktopLinkClass(active: boolean | undefined): string {
  return cn(
    'whitespace-nowrap rounded-md px-2 py-1.5 text-sm no-underline transition-colors hover:text-[var(--color-primary,#16a34a)]',
    active ? `font-semibold ${PRIMARY}` : 'font-medium text-[var(--text-secondary,#475569)]',
  );
}

function mobileLinkClass(active: boolean | undefined, nested: boolean): string {
  return cn(
    'flex min-h-11 items-center rounded-md text-base no-underline',
    nested ? 'py-2.5 pl-6 pr-4' : 'px-4 py-3',
    active
      ? `bg-[var(--color-primary-light,#dcfce7)] font-semibold ${PRIMARY}`
      : 'font-medium text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-muted,#f1f5f9)]',
  );
}

export function Header({
  brandName = 'JLPT Online',
  brandHref = '/',
  logoSrc = '/images/brand/logo-v2-header.webp',
  logoAlt,
  navItems = [],
  rightControls,
  userMenu,
  mobileMenuOpenLabel = 'Mở menu điều hướng',
  mobileMenuCloseLabel = 'Đóng menu',
  className = '',
}: HeaderProps): React.JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const effectiveLogoAlt = logoAlt ?? (logoSrc ? 'Gokakuya.com - Trang chủ' : brandName);

  return (
    <header
      className={cn(
        'jlpt-header sticky top-0 z-40 max-w-[100vw] overflow-x-clip border-b border-[var(--border-subtle,#e2e8f0)] bg-[var(--bg-surface,#ffffff)] shadow-[var(--shadow-sm)] transition-colors',
        className,
      )}
    >
      <div className="container box-border flex h-16 w-full max-w-full items-center justify-between">
        <div className="header-brand-nav flex items-center gap-5">
          <a
            href={brandHref}
            aria-label={effectiveLogoAlt}
            className={cn('header-brand-logo flex shrink-0 items-center gap-2 text-xl font-extrabold tracking-tight no-underline', PRIMARY)}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={effectiveLogoAlt}
                width={285}
                height={96}
                loading="eager"
                decoding="async"
                className="h-11 w-auto object-contain shrink-0 dark:bg-white dark:rounded-lg dark:px-2 dark:py-1"
              />
            ) : (
              <>
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--color-primary,#16a34a)] text-base font-bold text-[var(--text-inverse,#ffffff)]">
                  J
                </span>
                {brandName && <span>{brandName}</span>}
              </>
            )}
          </a>

          <nav aria-label="Main Navigation" className="desktop-nav">
            {navItems.map((item) => {
              if (item.children && item.children.length > 0) {
                const isChildActive = item.children.some((c) => c.active);
                return (
                  <DropdownMenu key={item.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'header-nav-link header-nav-dropdown-trigger inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent font-[inherit]',
                          desktopLinkClass(isChildActive),
                        )}
                      >
                        <span>{item.label}</span>
                        <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[11rem] p-1.5 shadow-md">
                      {item.children.map((subItem) => (
                        <DropdownMenuItem key={subItem.href || subItem.label} asChild>
                          <a
                            href={subItem.href}
                            className={cn(
                              'flex w-full cursor-pointer items-center rounded-sm px-2.5 py-1.5 text-sm no-underline',
                              subItem.active && `font-semibold ${PRIMARY}`,
                            )}
                            aria-current={subItem.active ? 'page' : undefined}
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
                  className={cn('header-nav-link', desktopLinkClass(item.active))}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="header-right-group flex shrink-0 items-center gap-3">
          {rightControls && <div className="header-desktop-controls">{rightControls}</div>}
          {userMenu}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={isMobileMenuOpen ? mobileMenuCloseLabel : mobileMenuOpenLabel}
            className="mobile-menu-button inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-md border border-[var(--border-default,#cbd5e1)] bg-[var(--bg-surface,#ffffff)] p-2 text-[var(--text-primary,#0f172a)]"
          >
            {isMobileMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          role="region"
          aria-label="Mobile Navigation"
          className="mobile-drawer flex flex-col gap-3 border-t border-[var(--border-subtle,#e2e8f0)] bg-[var(--bg-surface,#ffffff)] p-4 shadow-[var(--shadow-md)]"
        >
          <nav className="flex flex-col gap-2" aria-label="Mobile Links">
            {navItems.map((item) => {
              if (item.children && item.children.length > 0) {
                return (
                  <div className="flex flex-col gap-1" key={item.label}>
                    <div className="px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted,#94a3b8)]">
                      {item.label}
                    </div>
                    {item.children.map((subItem) => (
                      <a
                        key={subItem.href || subItem.label}
                        href={subItem.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-current={subItem.active ? 'page' : undefined}
                        className={mobileLinkClass(subItem.active, true)}
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
                  className={mobileLinkClass(item.active, false)}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
          {rightControls && (
            <div className="flex items-center justify-between border-t border-[var(--border-subtle,#e2e8f0)] pt-3">
              {rightControls}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
