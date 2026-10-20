'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { MixShortageInfo } from '../types';
import { Button } from '@jlpt/ui/components/button';

export interface MixShortageNoticeProps {
  shortage: MixShortageInfo;
  onAutoBalance?: () => void;
  onIncludeMoreSources?: () => void;
  onProceedWithAvailable?: () => void;
  className?: string;
}

export function MixShortageNotice({
  shortage,
  onAutoBalance,
  onIncludeMoreSources,
  onProceedWithAvailable,
  className = '',
}: MixShortageNoticeProps): React.JSX.Element {
  return (
    <div
      data-testid="mix-shortage-notice"
      className={`p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 space-y-3 ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" aria-hidden="true" />
        <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
          Không đủ câu hỏi để đảm bảo cấu trúc đề thi trộn ({shortage.mode})
        </h4>
      </div>

      <p className="text-xs text-rose-900/90 dark:text-rose-300/90 leading-relaxed">
        {shortage.message ||
          `Hệ thống không tìm đủ câu hỏi trong các nguồn đã chọn để đáp ứng tiêu chuẩn blueprint cho cấp độ ${shortage.level}.`}
      </p>

      {shortage.missingMondaiTypes && shortage.missingMondaiTypes.length > 0 && (
        <div className="text-xs bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40">
          <span className="font-semibold block mb-1 text-rose-800 dark:text-rose-300">
            Dạng câu đang bị thiếu câu hỏi:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {shortage.missingMondaiTypes.map((m, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded font-mono text-[11px] bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {shortage.suggestions && shortage.suggestions.length > 0 && (
        <ul className="text-[11px] list-disc list-inside space-y-1 text-rose-800 dark:text-rose-300">
          {shortage.suggestions.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {onProceedWithAvailable && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onProceedWithAvailable}
            data-testid="mix-proceed-available-btn"
          >
            Tiếp tục với số câu hiện có ({shortage.available} câu)
          </Button>
        )}
        {onAutoBalance && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAutoBalance}
            data-testid="mix-auto-balance-btn"
          >
            Tự động điều chỉnh tỷ lệ nguồn (Auto-balance)
          </Button>
        )}
        {onIncludeMoreSources && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onIncludeMoreSources}
            data-testid="mix-add-sources-btn"
          >
            Bổ sung tất cả các kỳ thi có sẵn
          </Button>
        )}
      </div>
    </div>
  );
}
