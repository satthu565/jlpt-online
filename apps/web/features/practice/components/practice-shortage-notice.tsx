'use client';

import { AlertTriangle } from 'lucide-react';
import React from 'react';
import type { PracticeShortageInfo } from '../types';
import { Button } from '@jlpt/ui/components/button';

export interface PracticeShortageNoticeProps {
  shortage: PracticeShortageInfo;
  onProceedWithAvailable?: () => void;
  onAdjustFilters?: () => void;
  className?: string;
}

export function PracticeShortageNotice({
  shortage,
  onProceedWithAvailable,
  onAdjustFilters,
  className = '',
}: PracticeShortageNoticeProps): React.JSX.Element {
  return (
    <div
      data-testid="practice-shortage-notice"
      className={`p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 space-y-3 ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-5" aria-hidden="true" />
        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
          Số lượng câu hỏi trong ngân hàng không đủ theo yêu cầu (Shortage UX)
        </h4>
      </div>

      <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
        Bạn yêu cầu <strong>{shortage.requested} câu</strong> từ kho "
        <span className="font-semibold">{shortage.pool}</span>" cấp độ {shortage.level},
        nhưng hiện tại hệ thống chỉ tìm thấy <strong>{shortage.available} câu</strong> đạt tiêu chuẩn.
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {shortage.available > 0 && onProceedWithAvailable && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onProceedWithAvailable}
            data-testid="shortage-proceed-btn"
          >
            Luyện tập với {shortage.available} câu hiện có
          </Button>
        )}
        {onAdjustFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdjustFilters}
            data-testid="shortage-adjust-btn"
          >
            Mở rộng phạm vi tìm kiếm (Chọn thêm kỹ năng/kho)
          </Button>
        )}
      </div>
    </div>
  );
}
