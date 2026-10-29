'use client';

import React from 'react';
import { Button, Chip } from '@jlpt/ui/components/exam-controls';
import type { SyncState } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface SyncStatusIndicatorProps {
  syncState: SyncState;
  onRetry?: () => void;
  className?: string;
}

export function SyncStatusIndicator({
  syncState,
  onRetry,
  className = '',
}: SyncStatusIndicatorProps): React.JSX.Element {
  const { t } = useI18n();
  switch (syncState) {
    case 'closed':
      return <Chip color="warning" variant="soft" role="status">{t('paperExam.attemptClosedShort')}</Chip>;
    case 'local_error':
      return <div role="alert" className={`flex items-center gap-2 text-xs text-red-700 dark:text-red-300 ${className}`}><span>{t('paperExam.localWriteError')}</span>{onRetry && <Button size="sm" variant="outline" onClick={onRetry}>{t('paperExam.retry')}</Button>}</div>;
    case 'saved':
      return (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 ${className}`}
        >
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span>Đã lưu</span>
        </div>
      );

    case 'saving':
      return (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 ${className}`}
        >
          <svg className="w-3.5 h-3.5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Đang lưu...</span>
        </div>
      );

    case 'offline_saved':
      return (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 ${className}`}
        >
          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          <span>Lưu local (Chưa đồng bộ)</span>
        </div>
      );

    case 'error':
      return (
        <div
          role="status"
          aria-live="assertive"
          className={`inline-flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800 ${className}`}
        >
          <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
          </svg>
          <span>Lỗi đồng bộ (đã lưu local)</span>
          {onRetry && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onRetry}
              className="underline text-rose-800 dark:text-rose-300 hover:text-rose-900 ml-1 p-0 h-auto min-h-0 text-xs"
            >
              Thử lại
            </Button>
          )}
        </div>
      );

    case 'conflict':
      return (
        <div
          role="alert"
          className={`inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2.5 py-1 rounded-full border border-red-300 dark:border-red-700 ${className}`}
        >
          <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Xung đột lease (Mở ở nơi khác)</span>
        </div>
      );

    default:
      return <div className={className} />;
  }
}
