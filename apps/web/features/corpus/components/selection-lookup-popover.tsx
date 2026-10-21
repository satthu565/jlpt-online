'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Popover, PopoverAnchor, PopoverContent } from '@jlpt/ui/components/popover';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Skeleton } from '@jlpt/ui/components/skeleton';
import { Alert } from '@jlpt/ui/components/alert';
import type { SelectionLookupState } from '../hooks/use-select-lookup';
import { useI18n } from '../../../lib/i18n';

export interface SelectionLookupPopoverProps {
  state: SelectionLookupState;
  openInNewTab?: boolean;
}

export function SelectionLookupPopover({
  state,
  openInNewTab = true,
}: SelectionLookupPopoverProps): React.JSX.Element | null {
  const { t } = useI18n();
  const {
    isOpen,
    queryText,
    matchedText,
    virtualRect,
    status,
    result,
    error,
    close,
    retry,
  } = state;

  const virtualAnchorRef = useRef<{ getBoundingClientRect: () => DOMRect }>({
    getBoundingClientRect: () => virtualRect || new DOMRect(0, 0, 0, 0),
  });

  useEffect(() => {
    if (virtualRect) {
      virtualAnchorRef.current = {
        getBoundingClientRect: () => virtualRect,
      };
    }
  }, [virtualRect]);

  if (!isOpen && status === 'idle') {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && close()}>
      <PopoverAnchor virtualRef={virtualAnchorRef} />
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={12}
        onOpenAutoFocus={(e) => {
          // Do not steal focus from document or alter exam inputs
          e.preventDefault();
        }}
        onKeyDown={(e) => {
          // Stop propagation so typing or shortcuts in popover do not trigger exam key handlers (1-4, F)
          e.stopPropagation();
        }}
        className="w-80 max-w-[calc(100vw-2rem)] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 text-slate-900 dark:text-slate-100"
        data-testid="selection-lookup-popover"
        data-select-lookup-popover="true"
      >
        {/* Loading State: Skeleton */}
        {status === 'loading' && (
          <div data-testid="lookup-loading-skeleton" className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-40" />
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
            <div className="pt-2 flex justify-between items-center">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        )}

        {/* Not Found State */}
        {status === 'not-found' && (
          <div data-testid="lookup-not-found" className="text-center py-2 space-y-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dictionary.notFoundInDict')}
            </p>
            <p className="text-xs text-slate-400 font-japanese break-all">
              &quot;{queryText}&quot;
            </p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div data-testid="lookup-error" className="space-y-2 py-1">
            <Alert variant="error" className="text-xs p-2.5">
              {error || t('dictionary.networkError')}
            </Alert>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={retry}
              className="w-full text-xs h-8"
              data-testid="lookup-retry-btn"
            >
              {t('dictionary.retry')}
            </Button>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && result && (
          <div data-testid="lookup-result" className="space-y-3">
            {/* 1. Headword & Matched Form */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h4
                  data-testid="lookup-entry"
                  className="text-2xl font-bold font-japanese text-slate-900 dark:text-slate-100 leading-tight"
                >
                  {result.entry}
                </h4>
                {matchedText && matchedText !== result.entry && (
                  <span
                    data-testid="lookup-matched-form"
                    className="text-xs text-slate-500 dark:text-slate-400 font-japanese"
                  >
                    ({matchedText} → {result.entry})
                  </span>
                )}
              </div>

              {/* Readings (Hiragana) */}
              {result.readings && result.readings.length > 0 && (
                <div
                  data-testid="lookup-readings"
                  className="text-sm font-japanese font-medium text-blue-600 dark:text-blue-400"
                >
                  【{result.readings.join('、')}】
                </div>
              )}
            </div>

            {/* 2. Han-Viet & POS Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {result.hanViet && (
                <span
                  data-testid="lookup-hanviet"
                  className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                >
                  {result.hanVietConfidence === 'kun'
                    ? `${t('dictionary.hanvietKun')} ${result.hanViet}`
                    : result.hanViet}
                </span>
              )}
              {result.hanVietConfidence === 'review' && (
                <Badge variant="warning" size="sm" data-testid="lookup-hanviet-review">
                  {t('dictionary.hanvietReview')}
                </Badge>
              )}
              {result.posLabels && result.posLabels.length > 0 ? (
                result.posLabels.map((lbl, idx) => (
                  <span
                    key={idx}
                    data-testid="lookup-pos-label"
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                  >
                    {lbl}
                  </span>
                ))
              ) : result.partOfSpeech ? (
                <span
                  data-testid="lookup-pos-label"
                  className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                >
                  {result.partOfSpeech}
                </span>
              ) : null}
            </div>

            {/* 3. Meanings (Up to 3) */}
            {result.meanings && result.meanings.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t('dictionary.meaningsTitle')}
                </div>
                <ol
                  data-testid="lookup-meanings"
                  className="list-decimal list-inside text-xs text-slate-700 dark:text-slate-300 space-y-0.5"
                >
                  {result.meanings.slice(0, 3).map((m, idx) => (
                    <li key={idx} className="leading-snug">
                      {m}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 4. Action button & EDRDG source */}
            <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
              {openInNewTab ? (
                <Button
                  asChild
                  size="sm"
                  variant="primary"
                  data-testid="lookup-details-btn"
                  className="text-xs h-8 px-3"
                >
                  <a
                    href={`/tu-vung/${encodeURIComponent(result.entry)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('dictionary.viewDetails')}
                  </a>
                </Button>
              ) : (
                <Button
                  asChild
                  size="sm"
                  variant="primary"
                  data-testid="lookup-details-btn"
                  className="text-xs h-8 px-3"
                >
                  <Link href={`/tu-vung/${encodeURIComponent(result.entry)}`}>
                    {t('dictionary.viewDetails')}
                  </Link>
                </Button>
              )}
              <span
                data-testid="lookup-edrdg-source"
                className="text-[10px] text-slate-400 dark:text-slate-500"
              >
                {t('dictionary.edrdgSource')}
              </span>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
