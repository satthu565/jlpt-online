'use client';

import React from 'react';
import type { EvidenceRange } from '../types';

export interface TranscriptViewProps {
  transcript: string | null;
  evidenceRanges?: EvidenceRange[];
  isLicensed?: boolean;
  hasLicensePermission?: boolean;
  sourceLabel?: string | null;
  licenseLabel?: string | null;
  currentTimeMs?: number;
  onSeek?: (timeMs: number) => void;
  className?: string;
}

export function TranscriptView({
  transcript,
  evidenceRanges = [],
  isLicensed = false,
  hasLicensePermission = false,
  sourceLabel,
  licenseLabel,
  currentTimeMs,
  onSeek,
  className = '',
}: TranscriptViewProps): React.JSX.Element {
  // Acceptance Criteria 2: Nguồn/licensed transcript chỉ hiện theo quyền
  // If the transcript requires a license and the learner does not have permission, NEVER show content
  const isRestricted = isLicensed && !hasLicensePermission;

  if (isRestricted) {
    return (
      <div
        data-testid="transcript-restricted-notice"
        className={`p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2 ${className}`}
      >
        <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
          <span aria-hidden="true">🔒</span>
          <span>Transcript âm thanh có bản quyền bảo hộ</span>
        </div>
        <p className="leading-relaxed">
          Nội dung toàn văn transcript phần nghe hiểu này được bảo hộ theo hợp đồng bản quyền nội dung.
          Tài khoản của bạn hiện chưa được cấp quyền xem transcript cho tài liệu này.
        </p>
        {(sourceLabel || licenseLabel) && (
          <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5">
            {sourceLabel && <div>Nguồn tài liệu: <strong>{sourceLabel}</strong></div>}
            {licenseLabel && <div>Bản quyền: <strong>{licenseLabel}</strong></div>}
          </div>
        )}
      </div>
    );
  }

  if (!transcript) {
    return (
      <div
        data-testid="transcript-empty"
        className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs text-slate-500 text-center ${className}`}
      >
        Không có transcript cho phần nghe này.
      </div>
    );
  }

  return (
    <div
      data-testid="transcript-container"
      className={`p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/30 dark:bg-slate-900/60 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-blue-100 dark:border-slate-800 pb-2">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
          <span>🎧</span> Transcript & Dẫn chứng nghe hiểu
        </h4>
        {licenseLabel && (
          <span
            data-testid="transcript-license-label"
            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium"
          >
            Đã cấp phép: {licenseLabel}
          </span>
        )}
      </div>

      {/* Transcript Text */}
      <div
        data-testid="transcript-content"
        className="font-japanese text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line p-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
      >
        {transcript}
      </div>

      {/* Evidence Ranges (AUDIO-08, AUDIO-09) */}
      {evidenceRanges.length > 0 && (
        <div className="space-y-2 pt-1" data-testid="evidence-ranges-list">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block uppercase tracking-wider">
            Đoạn dẫn chứng mấu chốt (Evidence Ranges):
          </span>
          <div className="space-y-1.5">
            {evidenceRanges.map((range, idx) => {
              const isCurrent =
                currentTimeMs !== undefined &&
                range.startMs !== undefined &&
                range.endMs !== undefined &&
                currentTimeMs >= range.startMs &&
                currentTimeMs <= range.endMs;

              return (
                <div
                  key={idx}
                  data-testid="evidence-range-item"
                  onClick={() => range.startMs !== undefined && onSeek?.(range.startMs)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-100/70 dark:bg-blue-950/60 text-blue-950 dark:text-blue-200 font-medium ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      Dẫn chứng #{idx + 1}
                      {range.startMs !== undefined && range.endMs !== undefined
                        ? ` (${Math.floor(range.startMs / 1000)}s - ${Math.ceil(range.endMs / 1000)}s)`
                        : ''}
                    </span>
                    {onSeek && range.startMs !== undefined && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 underline">
                        Phát từ đoạn này ▶
                      </span>
                    )}
                  </div>
                  {range.quote && (
                    <blockquote className="italic font-japanese border-l-2 border-blue-400 pl-2 my-1 text-slate-800 dark:text-slate-200">
                      "{range.quote}"
                    </blockquote>
                  )}
                  {range.explanation && (
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      {range.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attribution Footer */}
      {sourceLabel && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
          Nguồn bản quyền: {sourceLabel}
        </div>
      )}
    </div>
  );
}
