import { AlertTriangle } from 'lucide-react';
import React from 'react';
import type { Result } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';

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
    <Card
      data-testid="score-summary-card"
      className={`jlpt-score-summary border border-slate-200 dark:border-slate-800 p-6 md:p-8 ${className}`}
    >
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
            data-testid="score-pass-status"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-extrabold text-lg md:text-xl shadow-xs ${
              isPassed
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
            }`}
          >
            <span role="img" aria-label={isPassed ? 'Đạt' : 'Chưa đạt'}>
              {isPassed ? 'ĐỖ (PASS)' : 'CHƯA ĐẠT (FAIL)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chuẩn đỗ: {passThreshold} / {maxScore} điểm
          </p>
          {(result.scoring as { reason?: string }).reason && (
            <p
              className="text-xs font-semibold mt-1 max-w-xs text-slate-600 dark:text-slate-400"
              data-testid="score-reason"
            >
              {(result.scoring as { reason?: string }).reason === 'PASSED'
                ? 'Đạt chuẩn đỗ JLPT: Tổng điểm đạt yêu cầu và tất cả các phần đều vượt điểm sàn.'
                : (result.scoring as { reason?: string }).reason === 'FAILED_SECTION_FLOOR'
                ? 'Chưa đạt do có phần thi dưới điểm sàn (điểm liệt).'
                : (result.scoring as { reason?: string }).reason === 'FAILED_TOTAL_SCORE'
                ? `Chưa đạt do tổng điểm (${totalScore}) chưa đủ chuẩn đỗ (>= ${passThreshold} điểm).`
                : (result.scoring as { reason?: string }).reason === 'FAILED_TOTAL_AND_SECTION'
                ? 'Chưa đạt do tổng điểm chưa đủ và có phần dưới điểm sàn.'
                : 'Kết quả bài thi theo chuẩn JLPT.'}
            </p>
          )}
        </div>
      </div>

      {/* Main Score Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-slate-200 dark:border-slate-800">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center relative">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-xs text-slate-500">Điểm quy đổi</span>
            {(result.scoring.isEstimated ?? true) && (
              <Badge variant="neutral" size="sm" data-testid="scoring-estimate-label">
                {result.scoring.label || 'ước lượng'}
              </Badge>
            )}
          </div>
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Chi tiết điểm theo phần thi
          </h3>
          {result.scoring.isEstimated && (
            <span className="text-xs text-slate-500 italic">
              * Điểm chuẩn hóa ước lượng theo thang JLPT
            </span>
          )}
        </div>

        {/* Failed sections floor warning alert */}
        {result.scoring.failedSections && result.scoring.failedSections.length > 0 && (
          <div
            data-testid="failed-sections-alert"
            className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200"
          >
            <span className="font-bold"><AlertTriangle className="inline size-4 align-[-2px]" aria-hidden="true" /> Phần thi dưới điểm sàn (điểm liệt):</span> Bài thi có{' '}
            {result.scoring.failedSections.length} phần chưa đạt mức sàn tối thiểu. Dù tổng điểm có thể đạt ngưỡng đỗ, theo quy định chính thức của JLPT, kết quả chung cuộc vẫn tính là Chưa đạt.
          </div>
        )}

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
          {result.scoring.sections.map((sec, idx) => {
            const margin =
              (sec as { margin?: number }).margin ?? (sec.scaled - sec.minPass);
            const isSectionFailed =
              !sec.passed ||
              (result.scoring.failedSections &&
                result.scoring.failedSections.includes(sec.code));

            return (
              <div
                key={idx}
                data-testid="section-scaled-score"
                className={`p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs ${
                  isSectionFailed
                    ? 'bg-rose-50/40 dark:bg-rose-950/20'
                    : 'bg-white dark:bg-slate-900'
                }`}
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
                    <span
                      data-testid={isSectionFailed ? 'failed-section-badge' : 'section-margin-pass'}
                      className={`block text-[11px] font-semibold ${
                        isSectionFailed
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {margin >= 0 ? `+${margin} điểm so với sàn` : `${margin} điểm dưới sàn`}
                    </span>
                  </div>

                  <Badge variant={isSectionFailed ? 'danger' : 'success'} size="sm">
                    {isSectionFailed ? 'Dưới điểm liệt' : 'Đạt'}
                  </Badge>
                </div>
              </div>
            );
          })}
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
                className="surface surface--secondary rounded-2xl p-3 text-center"
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
      <div
        data-testid="scoring-disclaimer"
        className="mt-6 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400"
      >
        <strong>Lưu ý về cách tính điểm:</strong> {result.scoring.disclaimer || 'Điểm số được quy đổi theo công thức tham khảo (linear reference) dựa trên cấu trúc đề thi chính thức JLPT. Điểm thi thực tế có thể chênh lệch do phương pháp chuẩn hóa Item Response Theory của kỳ thi quốc tế.'}
      </div>
    </Card>
  );
}
