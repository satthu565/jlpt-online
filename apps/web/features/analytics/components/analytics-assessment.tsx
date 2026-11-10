'use client';

import { buildPracticeHref, SECTION_SKILLS } from '../practice-link';
import React from 'react';
import Link from 'next/link';
import {
  Info,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { Level } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';

export interface SectionScoreItem {
  name: string;
  code?: string;
  score: number;
  maxScore: number;
  minCutoff: number;
}

export interface AnalyticsAssessmentProps {
  level: Level;
  totalScore: number;
  thresholdScore: number;
  sections: SectionScoreItem[];
  weakestSectionName?: string;
  weakestAccuracy?: number | null;
  wrongQuestionsCount?: number;
  /** Share (0-100) of answered questions left blank; drives the first priority when high. */
  blankRate?: number | null;
  /** Whether at least one exam was submitted, so the section scores are meaningful. */
  hasSubmitted?: boolean;
  onOpenInfoModal: () => void;
  onOpenStudyModal: (mode: string) => void;
}

export function AnalyticsAssessment({
  level,
  totalScore,
  thresholdScore,
  sections,
  weakestSectionName,
  weakestAccuracy = null,
  wrongQuestionsCount = 0,
  blankRate = null,
  hasSubmitted = false,
  onOpenInfoModal,
  onOpenStudyModal,
}: AnalyticsAssessmentProps): React.JSX.Element {
  const isPassing =
    totalScore > 0 &&
    totalScore >= thresholdScore &&
    sections.every((s) => s.score >= s.minCutoff);

  // Calculate donut dash
  const circumference = 2 * Math.PI * 74; // ~465
  const strokeDash = Math.min(circumference, (totalScore / 180) * circumference);

  // Find risk section (smallest distance to minimum cutoff)
  const sortedByMargin = [...sections].sort(
    (a, b) => a.score - a.minCutoff - (b.score - b.minCutoff),
  );
  const riskiest: SectionScoreItem = sortedByMargin[0] || {
    name: 'Kiến thức ngôn ngữ',
    code: 'language',
    score: 0,
    maxScore: 60,
    minCutoff: 19,
  };
  const marginToMin = riskiest.score - riskiest.minCutoff;

  const plan = (() => {
    if (blankRate !== null && blankRate >= 20) {
      return {
        title: `Giảm câu bỏ trống (${blankRate}% số câu)`,
        body: 'JLPT không trừ điểm câu sai, nên bỏ trống luôn thiệt hơn đoán. Hãy luyện làm kịp giờ và luôn chọn một đáp án cho mỗi câu.',
        action: 'Luyện làm đúng giờ',
        href: buildPracticeHref({ level, pool: 'unseen', count: 20, label: 'Luyện làm đúng giờ, không bỏ trống' }),
      };
    }
    if (hasSubmitted) {
      const gap = Math.abs(marginToMin);
      return {
        title: `Chinh phục ${riskiest.name}`,
        body:
          marginToMin >= 0
            ? `Phần này đang cao hơn điểm liệt ${gap} điểm (${riskiest.score}/${riskiest.minCutoff} tối thiểu), là phần sát ngưỡng nhất. Duy trì và tăng thêm điểm dự phòng.`
            : `Phần này đang thấp hơn điểm liệt ${gap} điểm (${riskiest.score} so với tối thiểu ${riskiest.minCutoff}). Bạn sẽ trượt nếu không nâng phần này, dù tổng điểm đủ.`,
        action: 'Bắt đầu luyện ngay',
        href: buildPracticeHref({
          level,
          pool: 'wrong',
          skills: riskiest.code ? SECTION_SKILLS[riskiest.code] : undefined,
          count: 15,
          label: riskiest.name,
        }),
      };
    }
    if (weakestAccuracy !== null && weakestAccuracy !== undefined && weakestSectionName) {
      return {
        title: `Chinh phục ${weakestSectionName}`,
        body: `Bạn đạt ${weakestAccuracy}% ở kỹ năng này. Luyện tập chuyên sâu để củng cố kỹ năng và tăng điểm số.`,
        action: 'Bắt đầu luyện ngay',
        href: '/luyen-tap',
      };
    }
    return {
      title: 'Thử sức với đề thi thử JLPT',
      body: 'Làm một bài thi hoàn chỉnh để hệ thống tự động phát hiện lỗ hổng kiến thức và cá nhân hóa lộ trình ôn tập.',
      action: 'Khám phá kho đề thi',
      href: '/de-thi',
    };
  })();

  const totalProgressPercent = Math.min(100, Math.round((totalScore / 180) * 100));

  return (
    <section id="assessment" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Left Card: Đánh giá mức độ sẵn sàng thi */}
      <Card className="lg:col-span-7 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Đánh giá mức độ sẵn sàng thi
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Dựa trên các đề thi thử đã hoàn thành lần đầu
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenInfoModal}
              className="size-8 p-0 rounded-lg text-slate-400 hover:text-slate-600"
              aria-label="Giải thích cách đánh giá"
            >
              <Info className="size-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Donut & Summary Meta */}
          <div className="flex flex-col sm:flex-row items-center gap-6 my-4">
            {/* SVG Donut */}
            <div className="relative size-36 sm:size-40 shrink-0">
              <svg viewBox="0 0 180 180" className="size-full -rotate-90">
                <circle
                  cx="90"
                  cy="90"
                  r="74"
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="13"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="74"
                  fill="none"
                  stroke="currentColor"
                  className={totalScore === 0 ? 'text-slate-300 dark:text-slate-700' : isPassing ? 'text-indigo-600' : 'text-amber-500'}
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray={`${strokeDash.toFixed(1)} ${circumference.toFixed(1)}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  {totalScore > 0 ? totalScore : '--'}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">/ 180 điểm</span>
              </div>
            </div>

            {/* Assessment Meta */}
            <div className="flex-1 min-w-0 space-y-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                  totalScore === 0
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    : isPassing
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                }`}
              >
                {totalScore === 0 ? (
                  <>
                    <Info className="size-3.5" aria-hidden="true" />
                    Chưa có kết quả nộp bài
                  </>
                ) : isPassing ? (
                  <>
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    Đạt mục tiêu JLPT {level}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-3.5" aria-hidden="true" />
                    Cần cải thiện thêm
                  </>
                )}
              </span>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {totalScore === 0
                  ? 'Chưa có kết quả làm đề'
                  : isPassing
                  ? 'Đang tiến gần mục tiêu đỗ!'
                  : 'Cần củng cố thêm kiến thức'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {totalScore === 0
                  ? 'Hãy hoàn thành và nộp một bài thi thử để hệ thống đánh giá mức độ sẵn sàng thi của bạn.'
                  : isPassing
                  ? 'Điểm thi thử vượt ngưỡng tổng và an toàn ở các phần thi. Tiếp tục duy trì phong độ.'
                  : 'Điểm tham khảo chưa đạt một hoặc nhiều điều kiện. Hãy ưu tiên phần yếu nhất.'}
              </p>

              <div className="pt-1">
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  {/* ui-allow-style: dynamic assessment total score percentage */}
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${totalProgressPercent}%` }} /* ui-allow-style: dynamic assessment total score percentage */
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                  Ngưỡng điểm tổng {level}: {thresholdScore}/180
                </p>
              </div>
            </div>
          </div>

          {/* Score breakdown per section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 mt-3 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Điểm theo phần thi</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Điểm thực tế / Tối đa</span>
            </div>

            {sections.map((sec, idx) => {
              const secPct = Math.min(100, Math.round((sec.score / sec.maxScore) * 100));
              const isCloseToCutoff = totalScore > 0 && sec.score - sec.minCutoff < 12;
              return (
                <div key={idx} className="grid grid-cols-12 gap-2.5 items-center text-xs">
                  <span className="col-span-5 text-slate-600 dark:text-slate-400 truncate">
                    {sec.name}
                  </span>
                  <div className="col-span-5 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    {/* ui-allow-style: dynamic section score percentage */}
                    <div
                      className={`h-full rounded-full ${
                        totalScore === 0 ? 'bg-slate-200 dark:bg-slate-700' : isCloseToCutoff ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${secPct}%` }} /* ui-allow-style: dynamic section score percentage */
                    />
                  </div>
                  <span className="col-span-2 text-right font-bold text-slate-800 dark:text-slate-200">
                    {totalScore > 0 ? sec.score : '--'}/{sec.maxScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk Alert */}
        <div className="mt-4 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <Lightbulb className="size-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
          <span>
            {totalScore === 0 ? (
              <span>
                <strong>Gợi ý:</strong> Hãy hoàn thành và nộp 1 đề thi thử đầy đủ để hệ thống ghi nhận điểm số từng phần thi và kiểm tra ngưỡng an toàn chống điểm liệt.
              </span>
            ) : (
              <span>
                <strong>{riskiest.name}</strong> là phần cần ưu tiên: điểm dự phòng so với ngưỡng tối thiểu ({marginToMin >= 0 ? `+${marginToMin}` : marginToMin} điểm). Nên ưu tiên luyện thêm.
              </span>
            )}
          </span>
        </div>
      </Card>

      {/* Right Card: Kế hoạch dành cho bạn ✨ */}
      <Card className="lg:col-span-5 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Kế hoạch dành cho bạn ✨
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Ưu tiên từ những điểm yếu gần đây
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
              CÁ NHÂN HÓA
            </Badge>
          </div>

          {/* Highlight Plan 1: one criterion, shared with the left card */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-950/40 dark:to-slate-900 mb-4">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 mb-2">
              🔥 ƯU TIÊN SỐ 1
            </span>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{plan.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 mb-3">{plan.body}</p>
            <Link href={plan.href}>
              <Button size="sm" variant="primary" className="w-full justify-center">
                {plan.action}
                <ArrowRight className="size-3.5 inline ml-1.5" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          {/* Action List Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <RefreshCw className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {wrongQuestionsCount > 0
                      ? `Ôn lại ${wrongQuestionsCount} câu sai hoặc bỏ trống`
                      : 'Chưa có câu sai cần ôn lại'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {wrongQuestionsCount > 0
                      ? 'Từ các bài đã nộp'
                      : 'Các câu sai sẽ tự động lưu vào đây sau khi nộp bài'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenStudyModal('review')}
                disabled={wrongQuestionsCount === 0}
                className="size-8 p-0 text-slate-400 hover:text-slate-600 disabled:opacity-40"
                aria-label="Ôn lại câu sai"
              >
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Thử sức với đề thi mới
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">JLPT {level} · Kỳ thi chính thức</p>
                </div>
              </div>
              <Link href="/de-thi">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-slate-400 hover:text-slate-600"
                  aria-label="Thử sức với đề thi mới"
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenStudyModal('roadmap')}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold"
          >
            Xem lộ trình học của tôi
            <ArrowRight className="size-3.5 inline ml-1" aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </section>
  );
}
