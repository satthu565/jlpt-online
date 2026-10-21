'use client';

import { Eye, Focus, Headphones, Keyboard } from 'lucide-react';
import React from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Switch } from '@jlpt/ui/components/switch';
import { FuriganaToggle } from '@jlpt/ui/components/furigana-toggle';
import { useSelectLookupSetting } from '../../corpus';
import { useI18n } from '../../../lib/i18n';

export type JapaneseFontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface ExamToolbarProps {
  fontSize: JapaneseFontSize;
  onFontSizeChange: (size: JapaneseFontSize) => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  onOpenShortcutsHelp: () => void;
  onOpenSpeakerTest: () => void;
  hasListeningTimeline?: boolean;
  selectLookupEnabled?: boolean;
  onSelectLookupChange?: (enabled: boolean) => void;
  className?: string;
}

export function ExamToolbar({
  fontSize,
  onFontSizeChange,
  isZenMode,
  onToggleZenMode,
  onOpenShortcutsHelp,
  onOpenSpeakerTest,
  hasListeningTimeline = false,
  selectLookupEnabled,
  onSelectLookupChange,
  className = '',
}: ExamToolbarProps): React.JSX.Element {
  const { t } = useI18n();
  const [defaultLookupEnabled, setDefaultLookupEnabled] = useSelectLookupSetting();
  const isLookupActive = selectLookupEnabled !== undefined ? selectLookupEnabled : defaultLookupEnabled;
  const handleLookupChange = onSelectLookupChange || setDefaultLookupEnabled;
  const fontSizes: Array<{ id: JapaneseFontSize; label: string; title: string }> = [
    { id: 'sm', label: 'A-', title: 'Cỡ chữ nhỏ (14px)' },
    { id: 'base', label: 'A', title: 'Cỡ chữ tiêu chuẩn (16px)' },
    { id: 'lg', label: 'A+', title: 'Cỡ chữ lớn (18px)' },
    { id: 'xl', label: 'A++', title: 'Cỡ chữ rất lớn (22px)' },
  ];

  return (
    <div
      className={`jlpt-exam-toolbar flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 text-xs ${className}`}
      role="toolbar"
      aria-label="Thanh công cụ làm bài thi"
    >
      {/* Left: Japanese font size zoom */}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-600 dark:text-slate-400 font-medium">
          Cỡ chữ tiếng Nhật:
        </span>
        <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] inline-flex p-0.5">
          {fontSizes.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={fontSize === item.id ? 'primary' : 'ghost'}
              onClick={() => onFontSizeChange(item.id)}
              title={item.title}
              className="px-2 py-0.5 text-xs font-semibold min-h-[32px] h-8"
              aria-label={item.title}
              aria-pressed={fontSize === item.id}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Right: Furigana toggle, Select Lookup toggle, Zen Mode, Speaker test, Shortcuts help */}
      <div className="flex flex-wrap items-center gap-2">
        <FuriganaToggle size="sm" />

        {/* H06: Switch Tra từ khi bôi đen */}
        <div className="flex items-center gap-1.5 px-1 py-0.5" data-testid="select-lookup-toggle-wrap">
          <Switch
            id="exam-select-lookup-switch"
            data-testid="select-lookup-switch"
            checked={isLookupActive}
            onCheckedChange={handleLookupChange}
            aria-label={t('dictionary.selectLookupLabel')}
          />
          <label
            htmlFor="exam-select-lookup-switch"
            className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none"
          >
            {t('dictionary.selectLookupLabel')}
          </label>
        </div>

        {hasListeningTimeline && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenSpeakerTest}
            title="Kiểm tra tai nghe / loa"
            aria-label="Kiểm tra loa"
          >
            <Headphones className="size-4" aria-hidden="true" /> Thử loa
          </Button>
        )}

        <Button
          type="button"
          variant={isZenMode ? 'primary' : 'outline'}
          size="sm"
          onClick={onToggleZenMode}
          title={isZenMode ? 'Thoát chế độ tập trung (Z)' : 'Bật chế độ tối giản tập trung (Z)'}
          aria-label={isZenMode ? 'Thoát chế độ tập trung' : 'Chế độ tập trung (Zen Mode)'}
        >
          {isZenMode ? <><Eye className="size-4" aria-hidden="true" /> Hiện thanh công cụ</> : <><Focus className="size-4" aria-hidden="true" /> Tập trung (Zen)</>}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenShortcutsHelp}
          title="Xem danh sách phím tắt (?)"
          aria-label="Phím tắt trợ giúp"
          className="hidden sm:inline-flex"
        >
          <Keyboard className="size-4" aria-hidden="true" /> Phím tắt
        </Button>
      </div>
    </div>
  );
}
