'use client';

import React, { useState } from 'react';
import { ChevronDown, Ellipsis, Menu, X } from 'lucide-react';
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
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> | React.ReactNode;
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

function renderNavItemIcon(icon?: NavItem['icon']) {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return (
      <span className="inline-flex size-4 xl:size-4.5 shrink-0 items-center justify-center text-current" aria-hidden="true">
        {icon}
      </span>
    );
  }
  const IconComp = icon as React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  return <IconComp className="size-4 xl:size-4.5 shrink-0 text-current" aria-hidden="true" />;
}

function desktopLinkClass(active: boolean | undefined): string {
  return cn(
    'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-1.5 text-xs no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-active-fg,#D6000F)] focus-visible:ring-offset-2 lg:px-2 lg:text-xs xl:gap-2 xl:px-2.5 xl:text-sm 2xl:px-3.5',
    active
      ? 'header-nav-link--active bg-[var(--nav-active-bg,#FDE8EA)] font-semibold text-[var(--nav-active-fg,#D6000F)]'
      : 'font-medium text-[var(--nav-inactive-fg,#334155)] hover:bg-[var(--nav-inactive-hover-bg,#f8fafc)] hover:text-[var(--text-primary,#0f172a)] dark:text-[var(--nav-inactive-fg,#e2e8f0)] dark:hover:bg-[var(--nav-inactive-hover-bg,rgba(255,255,255,0.06))]',
  );
}

function mobileLinkClass(active: boolean | undefined, nested: boolean): string {
  return cn(
    'flex min-h-11 items-center gap-2.5 rounded-xl text-base no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-active-fg,#D6000F)] focus-visible:ring-offset-2',
    nested ? 'py-2 pl-6 pr-4' : 'px-4 py-2.5',
    active
      ? 'header-nav-link--active bg-[var(--nav-active-bg,#FDE8EA)] font-semibold text-[var(--nav-active-fg,#D6000F)]'
      : 'font-medium text-[var(--nav-inactive-fg,#334155)] hover:bg-[var(--nav-inactive-hover-bg,#f8fafc)] dark:text-[var(--nav-inactive-fg,#e2e8f0)] dark:hover:bg-[var(--nav-inactive-hover-bg,rgba(255,255,255,0.06))]',
  );
}

export function Header({
  brandName = 'JLPT Online',
  brandHref = '/',
  logoSrc = '/images/brand/logo-v3-header.webp',
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
      <div className="container box-border flex min-h-16 w-full max-w-full items-center justify-between gap-4">
        <div className="header-brand-nav flex shrink min-w-0 items-center gap-2 lg:gap-2.5 xl:gap-3 2xl:gap-4">
          <a
            href={brandHref}
            aria-label={effectiveLogoAlt}
            className={cn('header-brand-logo flex shrink-0 items-center gap-2 text-xl font-extrabold tracking-tight no-underline', PRIMARY)}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={effectiveLogoAlt}
                width={501}
                height={96}
                loading="eager"
                decoding="async"
                className="h-8 sm:h-12 lg:h-8.5 xl:h-9 2xl:h-10 w-auto object-contain shrink-0 dark:bg-white dark:rounded-lg dark:px-2 dark:py-1"
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

          <nav aria-label="Main Navigation" className="desktop-nav flex items-center gap-0.5 xl:gap-1 2xl:gap-1.5">
            {navItems.map((item) => {
              if (item.children && item.children.length > 0) {
                const isChildActive = Boolean(item.active || item.children.some((c) => c.active));
                return (
                  <DropdownMenu key={item.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'header-nav-link header-nav-dropdown-trigger cursor-pointer border-0 bg-transparent font-[inherit]',
                          desktopLinkClass(isChildActive),
                        )}
                        aria-current={isChildActive ? 'page' : undefined}
                      >
                        {renderNavItemIcon(item.icon ?? Ellipsis)}
                        <span>{item.label}</span>
                        <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[12rem] p-1.5 shadow-md">
                      {item.children.map((subItem) => (
                        <DropdownMenuItem key={subItem.href || subItem.label} asChild>
                          <a
                            href={subItem.href}
                            className={cn(
                              'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm no-underline transition-colors',
                              subItem.active
                                ? 'header-nav-link--active bg-[var(--nav-active-bg,#FDE8EA)] font-semibold text-[var(--nav-active-fg,#D6000F)]'
                                : 'font-medium text-[var(--nav-inactive-fg,#334155)] hover:bg-[var(--nav-inactive-hover-bg,#f8fafc)] dark:text-[var(--nav-inactive-fg,#e2e8f0)] dark:hover:bg-[var(--nav-inactive-hover-bg,rgba(255,255,255,0.06))]',
                            )}
                            aria-current={subItem.active ? 'page' : undefined}
                          >
                            {renderNavItemIcon(subItem.icon)}
                            <span>{subItem.label}</span>
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
                  {renderNavItemIcon(item.icon)}
                  <span>{item.label}</span>
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
          <nav className="flex flex-col gap-1.5" aria-label="Mobile Links">
            {navItems.map((item) => {
              if (item.children && item.children.length > 0) {
                return (
                  <div className="flex flex-col gap-1" key={item.label}>
                    <div className="flex items-center gap-2 px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted,#94a3b8)]">
                      {renderNavItemIcon(item.icon ?? Ellipsis)}
                      <span>{item.label}</span>
                    </div>
                    {item.children.map((subItem) => (
                      <a
                        key={subItem.href || subItem.label}
                        href={subItem.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-current={subItem.active ? 'page' : undefined}
                        className={mobileLinkClass(subItem.active, true)}
                      >
                        {renderNavItemIcon(subItem.icon)}
                        <span>{subItem.label}</span>
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
                  {renderNavItemIcon(item.icon)}
                  <span>{item.label}</span>
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
