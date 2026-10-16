import React from 'react';
import type { Result } from '@jlpt/schema';
import { Card, Badge } from '@jlpt/ui';

export interface ScoreSummaryCardProps {
  result: Result;
  examTitle: string;
  level: string;
  mode: 'real' | 'practice';
  submittedAt?: string;
  className?: string;
}

export function ScoreSummaryCard({
  result,
  examTitle,
  level,
  mode,
  submittedAt,
  className = '',
}: ScoreSummaryCardProps): React.JSX.Element {
  const isPassed = result.scoring.passEstimate;
  const totalScore = result.scoring.total;
  const maxScore = result.scoring.totalMax;
  const passThreshold = result.scoring.totalPass;

  return (
    <Card className={`jlpt-score-summary border border-slate-200 dark:border-slate-800 p-6 md:p-8 ${className}`}>
      {/* Header: Title, Level, Mode, Submitted Date */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="primary" size="md">
              {level}
            </Badge>
            <span className="text-xs text-slate-500 font-medium">
              Chế độ: {mode === 'real' ? 'Thi thật tiêu chuẩn' : 'Luyện tập tự do'}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {examTitle}
          </h2>
          {submittedAt && (
            <p className="text-xs text-slate-400 mt-0.5">
              Thời gian nộp bài: {new Date(submittedAt).toLocaleString('vi-VN')}
            </p>
          )}
        </div>

        {/* Pass / Fail Status Badge */}
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-extrabold text-lg md:text-xl shadow-xs ${
              isPassed
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
            }`}
          >
            <span role="img" aria-label={isPassed ? 'Đạt' : 'Chưa đạt'}>
              {isPassed ? '🎉 ĐỖ (PASS)' : '⚠️ CHƯA ĐẠT (FAIL)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chuẩn đỗ: {passThreshold} / {maxScore} điểm
          </p>
        </div>
      </div>

      {/* Main Score Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-slate-200 dark:border-slate-800">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
          <span className="block text-xs text-slate-500 mb-1">Điểm quy đổi</span>
          <span className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
            {totalScore}
          </span>
          <span className="text-xs text-slate-400 block mt-0.5">/ {maxScore} điểm</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
          <span className="block text-xs text-slate-500 mb-1">Tỷ lệ chính xác</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {Math.round(result.accuracy)}%
          </span>
          <span className="text-xs text-slate-400 block mt-0.5">
            {result.totals.correct} / {result.totals.total} câu
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
          <span className="block text-xs text-slate-500 mb-1">Số câu sai</span>
          <span className="text-2xl md:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
            {result.totals.wrong}
          </span>
          <span className="text-xs text-slate-400 block mt-0.5">câu cần ôn lại</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
          <span className="block text-xs text-slate-500 mb-1">Câu bỏ trống</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-500 font-mono">
            {result.totals.blank}
          </span>
          <span className="text-xs text-slate-400 block mt-0.5">chưa làm</span>
        </div>
      </div>

      {/* Sections breakdown table */}
      <div className="py-6 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
          Chi tiết điểm theo phần thi
        </h3>
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
          {result.scoring.sections.map((sec, idx) => (
            <div
              key={idx}
              className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  {sec.label}
                </span>
                <span className="text-slate-400">
                  Điểm thô: {sec.raw}/{sec.rawMax} câu đúng
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    {sec.scaled} / {sec.maxScaled} điểm
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Điểm liệt: {sec.minPass} điểm
                  </span>
                </div>

                <Badge variant={sec.passed ? 'success' : 'danger'} size="sm">
                  {sec.passed ? 'Đạt' : 'Dưới điểm liệt'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills breakdown */}
      <div className="pt-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
          Độ chính xác theo kỹ năng
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {result.bySkill.map((sk, idx) => {
            const skillPercent = sk.total > 0 ? Math.round((sk.correct / sk.total) * 100) : 0;
            const skillName = {
              kanji: 'Chữ Hán (Kanji)',
              vocabulary: 'Từ vựng (Vocab)',
              grammar: 'Ngữ pháp (Grammar)',
              reading: 'Đọc hiểu (Reading)',
              listening: 'Nghe hiểu (Listening)',
            }[sk.skill] || sk.skill;

            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center"
              >
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 truncate">
                  {skillName}
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {skillPercent}%
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  {sk.correct}/{sk.total} đúng
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scoring method disclaimer (Hợp đồng A6/A8) */}
      <div className="mt-6 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
        <strong>Lưu ý về cách tính điểm:</strong> {result.scoring.disclaimer || 'Điểm số được quy đổi theo công thức tham khảo (linear reference) dựa trên cấu trúc đề thi chính thức JLPT. Điểm thi thực tế có thể chênh lệch do phương pháp chuẩn hóa Item Response Theory của kỳ thi quốc tế.'}
      </div>
    </Card>
  );
}
