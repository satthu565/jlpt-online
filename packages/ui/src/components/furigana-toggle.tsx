'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './button.js';

export const FURIGANA_STORAGE_KEY = 'jlpt_furigana_enabled';
export const FURIGANA_EVENT_NAME = 'jlpt:furigana-changed';

export interface FuriganaToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  onToggle?: (enabled: boolean) => void;
  showIcon?: boolean;
}

/**
 * Returns current global furigana setting from localStorage and DOM.
 */
export function getFuriganaSetting(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(FURIGANA_STORAGE_KEY);
    return saved !== 'false';
  } catch {
    return true;
  }
}

/**
 * Updates global furigana setting across localStorage, DOM attribute, and custom event.
 */
export function setFuriganaSetting(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FURIGANA_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
  try {
    document.documentElement.setAttribute('data-furigana', enabled ? 'on' : 'off');
    if (enabled) {
      document.documentElement.classList.remove('hide-furigana');
    } else {
      document.documentElement.classList.add('hide-furigana');
    }
  } catch {
    // Ignore DOM errors
  }
  try {
    window.dispatchEvent(new CustomEvent(FURIGANA_EVENT_NAME, { detail: { enabled } }));
  } catch {
    // Ignore event errors
  }
}

/**
 * Hook to read and subscribe to furigana state.
 */
export function useFurigana(): [boolean, (nextState: boolean | ((prev: boolean) => boolean)) => void] {
  const [enabled, setEnabledState] = useState<boolean>(() => getFuriganaSetting());

  useEffect(() => {
    // Sync initial state to document DOM on mount
    const current = getFuriganaSetting();
    setEnabledState(current);
    document.documentElement.setAttribute('data-furigana', current ? 'on' : 'off');
    if (current) {
      document.documentElement.classList.remove('hide-furigana');
    } else {
      document.documentElement.classList.add('hide-furigana');
    }

    const handleEvent = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>;
      if (custom.detail && typeof custom.detail.enabled === 'boolean') {
        setEnabledState(custom.detail.enabled);
      } else {
        setEnabledState(getFuriganaSetting());
      }
    };

    window.addEventListener(FURIGANA_EVENT_NAME, handleEvent);
    return () => {
      window.removeEventListener(FURIGANA_EVENT_NAME, handleEvent);
    };
  }, []);

  const setEnabled = useCallback((nextState: boolean | ((prev: boolean) => boolean)) => {
    setEnabledState((prev) => {
      const val = typeof nextState === 'function' ? nextState(prev) : nextState;
      setFuriganaSetting(val);
      return val;
    });
  }, []);

  return [enabled, setEnabled];
}

/**
 * FuriganaToggle: Button to toggle Furigana ruby text on/off in practice, exam, and review.
 * Persists selection in localStorage across page reloads (Acceptance 2).
 */
export function FuriganaToggle({
  className = '',
  size = 'sm',
  variant = 'outline',
  onToggle,
  showIcon = true,
}: FuriganaToggleProps): React.JSX.Element {
  const [enabled, setEnabled] = useFurigana();

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    onToggle?.(next);
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleToggle}
      className={`jlpt-furigana-toggle font-medium transition-colors ${
        enabled
          ? 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30'
          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
      } ${className}`}
      data-testid="toggle-furigana-btn"
      aria-label={enabled ? 'Tắt Furigana' : 'Bật Furigana'}
      aria-pressed={enabled}
      title={enabled ? 'Nhấn để ẩn cách đọc Furigana (chỉ hiện Kanji)' : 'Nhấn để hiện cách đọc Furigana'}
    >
      {showIcon && <span className="font-japanese font-bold mr-1">ふ</span>}
      <span>{enabled ? 'Furigana: BẬT' : 'Furigana: TẮT'}</span>
    </Button>
  );
}
