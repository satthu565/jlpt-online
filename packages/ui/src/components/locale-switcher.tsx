'use client';

import React from 'react';

export type SupportedLocale = 'vi' | 'ja' | 'en';

export interface LocaleSwitcherProps {
  currentLocale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  className?: string;
  compact?: boolean;
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
  compact = false,
  labels = {},
}: LocaleSwitcherProps): React.JSX.Element {
  const languageOptions: Array<{ code: SupportedLocale; name: string; flag: string }> = [
    { code: 'vi', name: compact ? (labels.vi && labels.vi !== 'Tiếng Việt' ? labels.vi : 'VI') : (labels.vi || 'Tiếng Việt'), flag: '🇻🇳' },
    { code: 'ja', name: compact ? (labels.ja && labels.ja !== '日本語' ? labels.ja : 'JA') : (labels.ja || '日本語'), flag: '🇯🇵' },
    { code: 'en', name: compact ? (labels.en && labels.en !== 'English' ? labels.en : 'EN') : (labels.en || 'English'), flag: '🇬🇧' },
  ];

  return (
    <div
      className={`jlpt-locale-switcher inline-flex items-center gap-1 ${className}`}
    >
      <label htmlFor="jlpt-locale-select" className="sr-only">
        {labels.selectLanguage || 'Chọn ngôn ngữ giao diện'}
      </label>
      <select
        id="jlpt-locale-select"
        value={currentLocale}
        onChange={(e) => onLocaleChange(e.target.value as SupportedLocale)}
        aria-label={labels.selectLanguage || 'Chọn ngôn ngữ giao diện'}
        className={`input input--primary min-h-9 cursor-pointer font-medium ${compact ? 'max-w-[110px] px-2 py-1.5 text-[0.8125rem]' : 'px-2.5 py-1.5 text-sm'}`}
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
