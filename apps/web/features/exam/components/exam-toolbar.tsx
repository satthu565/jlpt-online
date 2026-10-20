'use client';

import React from 'react';
import { Button } from '@jlpt/ui/components/button';
import { FuriganaToggle } from '@jlpt/ui/components/furigana-toggle';

export type JapaneseFontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface ExamToolbarProps {
  fontSize: JapaneseFontSize;
  onFontSizeChange: (size: JapaneseFontSize) => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  onOpenShortcutsHelp: () => void;
  onOpenSpeakerTest: () => void;
  hasListeningTimeline?: boolean;
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
  className = '',
}: ExamToolbarProps): React.JSX.Element {
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
      {/* Left: Japanese font size zoom (EXAM-23) */}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-600 dark:text-slate-400 font-medium">
          Cỡ chữ tiếng Nhật:
        </span>
        <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 p-0.5 bg-white dark:bg-slate-900">
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

      {/* Right: Furigana toggle, Zen Mode, Speaker test, Shortcuts help */}
      <div className="flex items-center gap-2">
        <FuriganaToggle size="sm" />

        {hasListeningTimeline && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenSpeakerTest}
            title="Kiểm tra tai nghe / loa"
            aria-label="Kiểm tra loa"
          >
            🎧 Thử loa
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
          {isZenMode ? '👁 Hiện thanh công cụ' : '🎯 Tập trung (Zen)'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenShortcutsHelp}
          title="Xem danh sách phím tắt (?)"
          aria-label="Phím tắt trợ giúp"
        >
          ⌨ Phím tắt
        </Button>
      </div>
    </div>
  );
}
