'use client';

import React from 'react';
import { useTheme } from '../theme-context.js';
import type { ThemeMode } from '../tokens.js';

export interface ThemeToggleProps {
  className?: string;
  labels?: {
    toggleTheme?: string;
    light?: string;
    dark?: string;
    system?: string;
  };
}

export function ThemeToggle({
  className = '',
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-muted, #f1f5f9)',
        borderRadius: '9999px',
        padding: '3px',
        border: '1px solid var(--border-default, #cbd5e1)',
        gap: '2px',
      }}
      className={`jlpt-theme-toggle ${className}`}
    >
      {modes.map(({ mode, label, icon }) => {
        const isSelected = theme === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            aria-pressed={isSelected}
            aria-label={`${label} (${mode === 'system' ? `đang chọn: ${resolvedTheme}` : mode})`}
            title={label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 10px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: isSelected ? 600 : 500,
              backgroundColor: isSelected ? 'var(--bg-surface, #ffffff)' : 'transparent',
              color: isSelected ? 'var(--text-primary, #0f172a)' : 'var(--text-muted, #64748b)',
              boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease-in-out',
              minHeight: '36px',
              minWidth: '36px',
            }}
          >
            <span aria-hidden="true" style={{ marginRight: '4px' }}>
              {icon}
            </span>
            <span className="theme-toggle-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
