'use client';

import React from 'react';
import type { FlatQuestionItem } from '../../exam/types';
import { Card, Badge } from '@jlpt/ui';

export interface PacingAnalysisWidgetProps {
  timeSpentMs?: number[];
  questions: FlatQuestionItem[];
  level?: string;
  className?: string;
}

export interface QuestionPacingStat {
  globalIndex: number;
  questionNumber: number | string;
  mondaiType?: string;
  timeSpentMs: number;
  timeSpentSec: number;
  recommendedSec: number;
  diffSec: number; // positive = took longer than benchmark
  isSlow: boolean;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} giây`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m} phút ${s} giây` : `${m} phút`;
}

export function PacingAnalysisWidget({
  timeSpentMs,
  questions,
  level = 'N5',
  className = '',
}: PacingAnalysisWidgetProps): React.JSX.Element | null {
  if (!timeSpentMs || timeSpentMs.length === 0) {
    return null;
  }

  // Calculate statistics for each question
  const pacingStats: QuestionPacingStat[] = questions
    .map((q, idx) => {
      const ms = timeSpentMs[idx] ?? 0;
      const sec = Math.round(ms / 1000);
      // Default benchmark ~ 45s for vocab/kanji, 60s for grammar, 150s for reading, 50s for listening
      let recommendedSec = 50;
      const mondai = q.mondaiType || '';
      if (/reading|comprehension|doc/i.test(mondai)) {
        recommendedSec = 150;
      } else if (/grammar|sentence/i.test(mondai)) {
        recommendedSec = 60;
      } else if (/kanji|vocab/i.test(mondai)) {
        recommendedSec = 40;
      }

      const diffSec = sec - recommendedSec;
      return {
        globalIndex: idx,
        questionNumber: q.number,
        mondaiType: q.mondaiType,
        timeSpentMs: ms,
        timeSpentSec: sec,
        recommendedSec,
        diffSec,
        isSlow: diffSec > 15 || sec > 90,
      };
    })
    .filter((s) => s.timeSpentMs > 0);

  if (pacingStats.length === 0) {
    return null;
  }

  // Sort by time spent descending to get the most time-consuming questions
  const slowestQuestions = [...pacingStats].sort((a, b) => b.timeSpentSec - a.timeSpentSec).slice(0, 5);

  const totalTimeSec = pacingStats.reduce((sum, s) => sum + s.timeSpentSec, 0);
  const avgTimeSec = Math.round(totalTimeSec / pacingStats.length);

  return (
    <Card
      data-testid="pacing-analysis-widget"
      className={`jlpt-pacing-analysis border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-5 bg-white dark:bg-slate-900 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">⏱️</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Phân tích nhịp làm bài (Pacing Analysis)
            </h3>
            <Badge variant="primary" size="sm">
              {level}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Tổng thời gian: {formatDuration(totalTimeSec)} • Trung bình: {formatDuration(avgTimeSec)} / câu
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
          Top câu hỏi tốn nhiều thời gian nhất:
        </h4>

        <div className="space-y-2.5">
          {slowestQuestions.map((q) => (
            <div
              key={q.globalIndex}
              data-testid={`slow-question-item-${q.questionNumber}`}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold font-mono text-sm px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                  Câu {q.questionNumber}
                </span>
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block">
                    {q.mondaiType ? `Dạng bài: ${q.mondaiType}` : `Câu hỏi #${q.globalIndex + 1}`}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Khuyến nghị: ~{formatDuration(q.recommendedSec)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 block">
                    {formatDuration(q.timeSpentSec)}
                  </span>
                  {q.diffSec > 0 ? (
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      +{formatDuration(q.diffSec)} so với mốc
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Nhanh hơn {formatDuration(Math.abs(q.diffSec))}
                    </span>
                  )}
                </div>

                {q.isSlow && (
                  <Badge variant="warning" size="sm">
                    Tốn thời gian
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
        💡 <strong>Lời khuyên tối ưu tốc độ:</strong> Hãy phân bổ tối đa 40–50 giây cho các câu Từ vựng/Ngữ pháp. Nếu gặp câu khó vượt quá 1.5 phút, hãy đánh dấu gắn cờ 🚩 và chuyển câu kế tiếp để đảm bảo đủ thời gian làm bài Đọc hiểu.
      </div>
    </Card>
  );
}
