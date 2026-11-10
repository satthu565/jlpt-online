'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { CalendarClock, Library, ArrowRight } from 'lucide-react';
import type { Level } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import type { AttemptRecord } from '../types';
import type { ExamMeta, ScheduleItem } from '../bank';

export interface AnalyticsExamPlanProps {
  level: Level;
  /** Published exams of this level (any year). */
  exams: ExamMeta[];
  /** Every attempt of the learner (any level, any status). */
  attempts: AttemptRecord[];
  schedules: ScheduleItem[];
  thresholdScore: number;
  /** Score of the latest submitted exam at this level, if any. */
  latestScore: number | null;
}

const DAY_MS = 86400000;

function daysUntil(isoDate: string, now: number): number {
  const target = Date.parse(`${isoDate.slice(0, 10)}T00:00:00+07:00`);
  return Math.ceil((target - now) / DAY_MS);
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function AnalyticsExamPlan({
  level,
  exams,
  attempts,
  schedules,
  thresholdScore,
  latestScore,
}: AnalyticsExamPlanProps): React.JSX.Element {
  const now = Date.now();

  const doneIds = useMemo(
    () => new Set(attempts.filter((a) => a.status !== 'in_progress').map((a) => a.examId)),
    [attempts],
  );
  const startedIds = useMemo(
    () => new Set(attempts.filter((a) => a.status === 'in_progress').map((a) => a.examId)),
    [attempts],
  );

  const sorted = useMemo(
    () =>
      [...exams].sort((x, y) => y.year - x.year || Number(y.session) - Number(x.session)),
    [exams],
  );
  const doneCount = sorted.filter((e) => doneIds.has(e.id)).length;
  const nextExam = sorted.find((e) => !doneIds.has(e.id));
  const donePct = sorted.length > 0 ? Math.round((doneCount / sorted.length) * 100) : 0;

  const nextSchedule = useMemo(
    () =>
      schedules
        .filter((s) => s.levels.includes(level) && daysUntil(s.examDate, now) >= 0)
        .sort((x, y) => x.examDate.localeCompare(y.examDate))[0],
    [schedules, level, now],
  );
  const daysLeft = nextSchedule ? daysUntil(nextSchedule.examDate, now) : null;
  const weeksLeft = daysLeft !== null ? Math.max(1, Math.ceil(daysLeft / 7)) : null;
  const gap = latestScore !== null ? Math.max(0, thresholdScore - latestScore) : null;
  const registrationClosed = nextSchedule?.registrationDeadline
    ? Date.parse(nextSchedule.registrationDeadline) < now
    : false;

  return (
    <section id="exam-plan" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      <Card className="lg:col-span-5 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Đếm ngược kỳ thi JLPT {level}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Theo lịch thi đã công bố trong hệ thống
              </p>
            </div>
            <span className="size-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarClock className="size-5" aria-hidden="true" />
            </span>
          </div>

          {nextSchedule && daysLeft !== null ? (
            <div className="space-y-3">
              <div>
                <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {daysLeft}
                  <small className="text-sm font-normal text-slate-400 dark:text-slate-500 ml-1.5">ngày nữa</small>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {nextSchedule.title} · thi ngày {formatDate(nextSchedule.examDate)}
                </p>
              </div>
              {nextSchedule.registrationDeadline && (
                <p
                  className={`text-xs font-semibold ${
                    registrationClosed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {registrationClosed
                    ? `Đã hết hạn đăng ký (${formatDate(nextSchedule.registrationDeadline)}). Hãy xem kỳ thi tiếp theo.`
                    : `Hạn đăng ký: ${formatDate(nextSchedule.registrationDeadline)}`}
                </p>
              )}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {gap === null ? (
                  <>Nộp một đề thi thử {level} để biết bạn cần tăng bao nhiêu điểm trước kỳ thi.</>
                ) : gap === 0 ? (
                  <>Điểm gần nhất ({latestScore}) đã đủ ngưỡng tổng {thresholdScore}. Hãy kiểm tra thêm điểm liệt từng phần.</>
                ) : (
                  <>
                    Điểm gần nhất {latestScore}/{thresholdScore}: cần thêm <strong>{gap} điểm</strong>, khoảng{' '}
                    <strong>{Math.ceil(gap / (weeksLeft ?? 1))} điểm/tuần</strong> trong {weeksLeft} tuần còn lại.
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Chưa có kỳ thi {level} sắp tới trong lịch thi của hệ thống.
            </p>
          )}
        </div>
        <Link href="/lich-thi" className="mt-4">
          <Button variant="outline" size="sm" className="w-full justify-center text-xs font-bold">
            Xem lịch thi JLPT
            <ArrowRight className="size-3.5 inline ml-1.5" aria-hidden="true" />
          </Button>
        </Link>
      </Card>

      <Card className="lg:col-span-7 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Tiến độ kho đề {level}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Đã làm {doneCount}/{sorted.length} đề · mỗi ô là một kỳ thi (tháng/năm)
              </p>
            </div>
            <span className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Library className="size-5" aria-hidden="true" />
            </span>
          </div>

          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
            {/* ui-allow-style: dynamic exam-bank progress percentage */}
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${donePct}%` }} /* ui-allow-style: dynamic exam-bank progress percentage */
            />
          </div>

          {sorted.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Chưa tải được danh sách đề {level}.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sorted.map((e) => {
                const done = doneIds.has(e.id);
                const started = !done && startedIds.has(e.id);
                return (
                  <Link key={e.id} href={`/de-thi/${encodeURIComponent(e.slug)}`} title={e.title}>
                    <Badge
                      variant={done ? 'success' : started ? 'warning' : 'secondary'}
                      className="text-[10px] font-bold cursor-pointer"
                    >
                      {e.session}/{e.year}
                      {done ? ' ✓' : started ? ' …' : ''}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">✓ đã nộp · … đang làm dở · còn lại chưa làm</p>
          {nextExam && (
            <Link href={`/de-thi/${encodeURIComponent(nextExam.slug)}`}>
              <Button variant="primary" size="sm" className="text-xs font-bold">
                Làm đề tiếp theo: {nextExam.session}/{nextExam.year}
                <ArrowRight className="size-3.5 inline ml-1.5" aria-hidden="true" />
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </section>
  );
}
