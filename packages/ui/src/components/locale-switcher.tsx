'use client';

import React from 'react';

export type SupportedLocale = 'vi' | 'ja' | 'en';

export interface LocaleSwitcherProps {
  currentLocale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  className?: string;
  labels?: {
    selectLanguage?: string;
    vi?: string;
    ja?: string;
    en?: string;
  };
}

export function LocaleSwitcher({
  currentLocale,
  onLocaleChange,
  className = '',
  labels = {},
}: LocaleSwitcherProps): React.JSX.Element {
  const languageOptions: Array<{ code: SupportedLocale; name: string; flag: string }> = [
    { code: 'vi', name: labels.vi || 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'ja', name: labels.ja || '日本語', flag: '🇯🇵' },
    { code: 'en', name: labels.en || 'English', flag: '🇬🇧' },
  ];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}
      className={`jlpt-locale-switcher ${className}`}
    >
      <label htmlFor="jlpt-locale-select" className="sr-only">
        {labels.selectLanguage || 'Chọn ngôn ngữ giao diện'}
      </label>
      <select
        id="jlpt-locale-select"
        value={currentLocale}
        onChange={(e) => onLocaleChange(e.target.value as SupportedLocale)}
        aria-label={labels.selectLanguage || 'Chọn ngôn ngữ giao diện'}
        style={{
          padding: '0.375rem 0.625rem',
          borderRadius: '6px',
          border: '1px solid var(--border-default, #cbd5e1)',
          backgroundColor: 'var(--bg-surface, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          minHeight: '36px',
          fontFamily: 'inherit',
        }}
      >
        {languageOptions.map(({ code, name, flag }) => (
          <option key={code} value={code}>
            {flag} {name}
          </option>
        ))}
      </select>
    </div>
  );
}
