'use client';

import * as React from 'react';
import { useTheme } from '../theme-context.js';
import type { ThemeMode } from '../tokens.js';
import { cn } from '../lib/utils.js';

export interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
  labels?: {
    toggleTheme?: string;
    light?: string;
    dark?: string;
    system?: string;
  };
}

export function ThemeToggle({
  className = '',
  compact = false,
  labels = {},
}: ThemeToggleProps): React.JSX.Element {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const defaultLabels = {
    toggleTheme: 'Chuyển đổi giao diện sáng/tối',
    light: 'Sáng',
    dark: 'Tối',
    system: 'Hệ thống',
    ...labels,
  };

  const modes: Array<{ mode: ThemeMode; label: string; icon: string }> = [
    { mode: 'light', label: defaultLabels.light, icon: '☀️' },
    { mode: 'dark', label: defaultLabels.dark, icon: '🌙' },
    { mode: 'system', label: defaultLabels.system, icon: '💻' },
  ];

  return (
    <div
      role="group"
      aria-label={defaultLabels.toggleTheme}
      className={cn(
        'jlpt-theme-toggle inline-flex items-center bg-[var(--bg-muted,#f1f5f9)] rounded-full p-[3px] border border-[var(--border-default,#cbd5e1)] gap-0.5 dark:bg-[var(--bg-muted,#1e293b)] dark:border-[var(--border-default,#475569)]',
        className,
      )}
    >
      {modes.map(({ mode, label, icon }) => {
        const isSelected = theme === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            aria-pressed={isSelected}
            aria-label={`${label} (${mode === 'system' ? resolvedTheme : mode})`}
            title={label}
            className={cn(
              'inline-flex items-center justify-center rounded-full border-0 cursor-pointer text-sm transition-all min-h-[36px] min-w-[36px]',
              compact ? 'px-2 py-1.5' : 'px-2.5 py-1.5',
              isSelected
                ? 'font-semibold bg-[var(--bg-surface,#ffffff)] text-[var(--text-primary,#0f172a)] shadow-sm dark:bg-[var(--bg-surface-elevated,#334155)] dark:text-[var(--text-primary,#f8fafc)]'
                : 'font-medium bg-transparent text-[var(--text-muted,#64748b)] hover:text-[var(--text-primary,#0f172a)] dark:text-[var(--text-muted,#94a3b8)] dark:hover:text-[var(--text-primary,#f8fafc)]',
            )}
          >
            <span
              aria-hidden="true"
              className={cn('theme-toggle-icon', compact ? 'mr-0' : 'mr-1')}
            >
              {icon}
            </span>
            <span
              className={cn('theme-toggle-label', compact && 'hidden')}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
