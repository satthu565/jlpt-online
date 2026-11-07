'use client';

import React, { memo } from 'react';
import { Calendar, Clock, FileText, ArrowRight, Star } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@jlpt/ui/components/tooltip';
import type { Level } from '@jlpt/schema';
import type { ExamWithUserStatus } from '../features/library/types';

export interface ExamSessionGroup {
  key: string;
  year: number;
  session: string;
  examsByLevel: Partial<Record<Level, ExamWithUserStatus>>;
}

interface HomeSessionCardProps {
  session: ExamSessionGroup;
  activeLevel: Level;
  isFavorite: boolean;
  isFavPending: boolean;
  takeExamLabel: string;
  onSelectLevel: (groupKey: string, level: Level) => void;
  onToggleFavorite: (examId: string) => void;
}

// Memoised so that changing one card's level or favourite does not re-render every other card.
export const HomeSessionCard = memo(function HomeSessionCard({
  session,
  activeLevel,
  isFavorite,
  isFavPending,
  takeExamLabel,
  onSelectLevel,
  onToggleFavorite,
}: HomeSessionCardProps): React.JSX.Element {
  const groupKey = session.key;
  const targetExam = session.examsByLevel[activeLevel] || Object.values(session.examsByLevel)[0];
  const examUrl = targetExam ? `/phong-thi?examId=${targetExam.id}` : `/de-thi`;

  return (
        <Card
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div>
            {/* Top Row: Năm thi | Kỳ thi & Document Icon */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                {/* Năm thi */}
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    <Calendar
                      className="size-3.5 text-slate-400 dark:text-slate-500"
                      aria-hidden="true"
                    />
                    <span>Năm thi</span>
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                    {session.year}
                  </span>
                </div>

                {/* Vertical Divider */}
                <div
                  className="h-10 w-px bg-slate-200 dark:bg-slate-700"
                  aria-hidden="true"
                />

                {/* Kỳ thi */}
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    <Clock
                      className="size-3.5 text-slate-400 dark:text-slate-500"
                      aria-hidden="true"
                    />
                    <span>Kỳ thi</span>
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                    Tháng {session.session}
                  </span>
                </div>
              </div>

              {/* Document Icon */}
              <FileText
                className="size-5 text-slate-400 shrink-0 mt-1"
                aria-hidden="true"
              />
            </div>

            {/* Horizontal Divider */}
            <div className="my-4 border-b border-slate-100 dark:border-slate-800" />

            {/* Chọn cấp độ */}
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
                Chọn cấp độ
              </span>
              <div
                className="flex items-center gap-2"
                role="group"
                aria-label={`Cấp độ đề thi năm ${session.year}`}
              >
                {(['N1', 'N2', 'N3', 'N4', 'N5'] as Level[]).map((lvl) => {
                  const examForLevel = session.examsByLevel[lvl];
                  const isAvailable = Boolean(examForLevel);
                  const isSelected = activeLevel === lvl;

                  return (
                    <Button
                      key={lvl}
                      type="button"
                      size="sm"
                      disabled={!isAvailable}
                      variant="ghost"
                      onClick={() => isAvailable && onSelectLevel(groupKey, lvl)}
                      aria-pressed={isSelected}
                      className={`flex-1 h-10 min-h-0 p-0 text-xs font-bold rounded-xl transition-all border-2 flex items-center justify-center ${
                        isAvailable
                          ? `badge-level-${lvl.toLowerCase()} cursor-pointer ${
                              isSelected
                                ? 'border-current font-black shadow-xs'
                                : 'border-transparent opacity-85 hover:opacity-100'
                            }`
                          : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {lvl}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Action Row: Favorite Button + "Làm bài ngay →" */}
          <div className="flex items-center gap-2.5 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            {/* Favorite Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!targetExam || isFavPending}
                  onClick={() => targetExam && onToggleFavorite(targetExam.id)}
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? 'Bỏ lưu đề yêu thích' : 'Lưu vào đề yêu thích'}
                  className={`size-10 min-h-0 p-0 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                    isFavorite
                      ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-500 hover:bg-amber-100'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:border-amber-300 dark:hover:border-amber-600'
                  }`}
                >
                  <Star
                    className={`size-4 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`}
                    aria-hidden="true"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isFavorite ? 'Bỏ lưu đề yêu thích' : 'Lưu vào đề yêu thích'}
              </TooltipContent>
            </Tooltip>

            {/* Take Exam Now Action Button */}
            <Button
              asChild
              variant="primary"
              size="sm"
              className="flex-1"
            >
              <a
                href={examUrl}
                className="no-underline flex items-center justify-center gap-2"
              >
                <span>{takeExamLabel}</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          </div>

          {/* 5. QUICK SUB-ACTIONS: Luyện tự do & Luyện kỹ năng */}
          <div className="flex items-center justify-between text-[11px] pt-2.5 mt-2.5 border-t border-dashed border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="link" size="sm">
                  <a
                    href={
                      targetExam
                        ? `/phong-thi?examId=${targetExam.id}&mode=practice`
                        : '/luyen-tap'
                    }
                    aria-label="Luyện tập tự do không tính giờ nghiêm ngặt"
                  >
                    <span>🎯 Luyện tự do</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Luyện tập tự do không tính giờ nghiêm ngặt
              </TooltipContent>
            </Tooltip>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="link" size="sm">
                  <a
                    href="/luyen-tap"
                    aria-label="Luyện đề trộn hoặc từng kỹ năng Từ vựng, Nghe, Đọc"
                  >
                    <span>⚡ Đề trộn &amp; Kỹ năng</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Luyện đề trộn hoặc từng kỹ năng Từ vựng, Nghe, Đọc
              </TooltipContent>
            </Tooltip>
          </div>
        </Card>
  );
});
