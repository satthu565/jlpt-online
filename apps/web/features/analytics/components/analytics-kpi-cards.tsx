'use client';

import React from 'react';
import { GraduationCap, Files, Target, Clock3, CircleSlash } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';

export interface AnalyticsKpiCardsProps {
  avgScore: number | null;
  completedExams: number;
  inProgressExams?: number;
  accuracyRate: number | null;
  totalStudyHours: number;
  streakDays?: number;
  scoreChange?: number | null;
  examChange?: number | null;
  accuracyChange?: number | null;
  /** Real answered / correct / blank counts of the current level; when absent the score-based figure is shown. */
  answerStats?: { total: number; correct: number; blank: number } | null;
}

export function AnalyticsKpiCards({
  avgScore,
  completedExams,
  inProgressExams = 0,
  accuracyRate,
  totalStudyHours,
  streakDays = 0,
  scoreChange,
  examChange,
  accuracyChange,
  answerStats,
}: AnalyticsKpiCardsProps): React.JSX.Element {
  const hasAnswers = Boolean(answerStats && answerStats.total > 0);
  const correctPct = hasAnswers ? Math.round((answerStats!.correct / answerStats!.total) * 100) : null;
  const blankPct = hasAnswers ? Math.round((answerStats!.blank / answerStats!.total) * 100) : null;
  const chosenWrong = hasAnswers ? answerStats!.total - answerStats!.correct - answerStats!.blank : 0;
  const shownAccuracy = hasAnswers ? correctPct : accuracyRate;

  return (
    <section id="overview" className={`scroll-mt-20 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 ${hasAnswers ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
      {/* 1. Điểm thi thử trung bình */}
      <Card className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Điểm thi thử trung bình</span>
          <span className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <GraduationCap className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="my-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {avgScore !== null ? (
            <>
              {avgScore}
              <small className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">/ 180</small>
            </>
          ) : (
            <>
              <span className="text-slate-300 dark:text-slate-600">--</span>
              <small className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">/ 180</small>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          {scoreChange !== undefined && scoreChange !== null ? (
            <>
              <span className={`font-bold ${scoreChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {scoreChange >= 0 ? `↗ +${scoreChange}` : `↘ ${scoreChange}`} điểm
              </span>
              <span>so với đề trước</span>
            </>
          ) : (
            <span>{completedExams === 0 ? 'Chưa nộp bài thi nào' : 'Lượt thi đầu tiên'}</span>
          )}
        </div>
      </Card>

      {/* 2. Đề thi đã hoàn thành */}
      <Card className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Đề thi đã hoàn thành</span>
          <span className="size-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Files className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="my-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {completedExams}
          <small className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">đề</small>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          {inProgressExams > 0 ? (
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              ⚡ {inProgressExams} đề đang làm dở
            </span>
          ) : completedExams > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Đã hoàn thành {completedExams} đề
            </span>
          ) : (
            <span>Chưa có đề nộp</span>
          )}
        </div>
      </Card>

      {/* 3. Tỷ lệ trả lời đúng */}
      <Card className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{hasAnswers ? 'Tỷ lệ câu đúng' : 'Điểm đạt (điểm / 180)'}</span>
          <span className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Target className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="my-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {shownAccuracy !== null ? (
            <>
              {shownAccuracy}
              <small className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">%</small>
            </>
          ) : (
            <>
              <span className="text-slate-300 dark:text-slate-600">--</span>
              <small className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">%</small>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          {hasAnswers ? (
            <span>
              {answerStats!.correct}/{answerStats!.total} câu đúng · chọn sai {chosenWrong}
            </span>
          ) : accuracyChange !== undefined && accuracyChange !== null ? (
            <>
              <span className={`font-bold ${accuracyChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {accuracyChange >= 0 ? `↗ +${accuracyChange}` : `↘ ${accuracyChange}`}%
              </span>
              <span>so với đề trước</span>
            </>
          ) : (
            <span>{completedExams === 0 ? 'Cần nộp đề để chấm' : 'Tính trên các đề đã nộp'}</span>
          )}
        </div>
      </Card>

      {/* 3b. Tỷ lệ bỏ trống */}
      {hasAnswers && (
        <Card className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Tỷ lệ bỏ trống</span>
            <span className="size-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <CircleSlash className="size-4" aria-hidden="true" />
            </span>
          </div>
          <div className="my-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {blankPct}
            <small className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">%</small>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <span className={blankPct! >= 10 ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>
              {answerStats!.blank}/{answerStats!.total} câu bỏ trống
            </span>
            {blankPct! >= 10 && <span>· JLPT không trừ điểm câu sai</span>}
          </div>
        </Card>
      )}

      {/* 4. Tổng thời gian học */}
      <Card className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Thời gian làm đề</span>
          <span className="size-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock3 className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="my-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {totalStudyHours.toFixed(1)}
          <small className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">giờ</small>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <span className={`font-medium ${streakDays > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {streakDays > 0 ? `🔥 ${streakDays} ngày` : '0 ngày'}
          </span>
          <span>chuỗi học liên tiếp</span>
        </div>
      </Card>
    </section>
  );
}
