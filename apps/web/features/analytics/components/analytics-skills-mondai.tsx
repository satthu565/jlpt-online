'use client';

import React from 'react';
import { Lightbulb, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';

export interface MondaiTypeItem {
  label: string;
  accuracy: number | null;
  totalQuestions: number;
  blank?: number;
}

export interface SkillCategoryItem {
  key: string;
  name: string;
  accuracy: number | null;
  total?: number;
  blank?: number;
  color: string;
  types: MondaiTypeItem[];
}

export interface AnalyticsSkillsMondaiProps {
  skills?: SkillCategoryItem[];
  onOpenStudyModal: (mode: string, param?: string) => void;
}

export function AnalyticsSkillsMondai({
  skills = [],
  onOpenStudyModal,
}: AnalyticsSkillsMondaiProps): React.JSX.Element {
  const ranked = skills
    .filter((sk): sk is SkillCategoryItem & { accuracy: number } => sk.accuracy !== null)
    .sort((x, y) => x.accuracy - y.accuracy);
  // No claim when several skills are tied for the lowest accuracy
  const weakestSkill = ranked.length > 0 && ranked[1]?.accuracy !== ranked[0]!.accuracy ? ranked[0] : undefined;
  const weakestBlankShare =
    weakestSkill && weakestSkill.total ? Math.round(((weakestSkill.blank ?? 0) / weakestSkill.total) * 100) : 0;

  const scrollToSkill = (skillKey: string) => {
    const el = document.getElementById(`skill-mondai-${skillKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Section 11: Hiệu suất theo kỹ năng */}
      <Card id="skills" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Hiệu suất theo kỹ năng
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Tỷ lệ trả lời đúng · Nhấp vào một kỹ năng để xem chi tiết các dạng câu bên dưới
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenStudyModal('skills')}
            className="size-8 p-0 text-slate-400 hover:text-slate-600"
            aria-label="Xem phân tích chuyên sâu"
          >
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-2">
          {skills.map((s) => (
            <div
              key={s.key}
              role="button"
              tabIndex={0}
              onClick={() => scrollToSkill(s.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  scrollToSkill(s.key);
                }
              }}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-colors space-y-2"
            >
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                <strong className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {s.accuracy === null ? '—' : `${s.accuracy}%`}
                </strong>
              </div>
              {s.total ? (
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Đã gặp {s.total} câu · bỏ trống {s.blank ?? 0}
                </p>
              ) : null}
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                {/* ui-allow-style: dynamic skill accuracy percentage */}
                <div
                  className={`h-full ${s.color} rounded-full`}
                  style={{ width: `${s.accuracy ?? 0}%` }} /* ui-allow-style: dynamic skill accuracy percentage */
                />
              </div>
            </div>
          ))}
        </div>

        {weakestSkill && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <Lightbulb className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              {weakestSkill.name} là kỹ năng có tỷ lệ đúng thấp nhất ({weakestSkill.accuracy}%)
              {weakestBlankShare >= 20 ? `, trong đó ${weakestBlankShare}% số câu bị bỏ trống.` : '.'}
            </span>
          </div>
        )}
      </Card>

      {/* Section 12: Phân tích dạng câu hỏi (Tất cả hiển thị trên 1 trang) */}
      <Card id="question-types" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Phân tích dạng câu hỏi
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Tất cả 4 kỹ năng và tất cả dạng câu trên cùng một trang · Không cần chuyển tab
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenStudyModal('skills')}
            className="text-xs font-bold shrink-0"
          >
            Xem tất cả
            <ArrowRight className="size-3.5 inline ml-1.5" aria-hidden="true" />
          </Button>
        </div>

        <div className="space-y-6">
          {skills.map((skill) => (
            <div key={skill.key} id={`skill-mondai-${skill.key}`} className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  {skill.name}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {skill.accuracy === null ? 'Chưa có dữ liệu' : `${skill.accuracy}% đúng trung bình`}
                </span>
              </div>

              <div className="space-y-2">
                {skill.types.map((type, idx) => {
                  const isLow = type.accuracy !== null && type.accuracy < 55;
                  const isHigh = type.accuracy !== null && type.accuracy > 80;
                  const barColor = isLow
                    ? 'bg-amber-500'
                    : isHigh
                      ? 'bg-emerald-500'
                      : 'bg-indigo-500';

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-3 items-center py-2 border-b border-slate-50 dark:border-slate-800/40 text-xs"
                    >
                      <div className="col-span-5 sm:col-span-5 min-w-0">
                        <strong className="block font-bold text-slate-800 dark:text-slate-200 truncate">
                          {type.label}
                        </strong>
                        {type.totalQuestions > 0 && (
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                            {type.totalQuestions} câu · bỏ trống {type.blank ?? 0}
                          </span>
                        )}
                      </div>
                      <div className="col-span-4 sm:col-span-5 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        {/* ui-allow-style: dynamic mondai accuracy bar */}
                        <div
                          className={`h-full ${barColor} rounded-full`}
                          style={{ width: `${type.accuracy ?? 0}%` }} /* ui-allow-style: dynamic mondai accuracy bar */
                        />
                      </div>
                      <span className="col-span-1 text-right font-extrabold text-slate-700 dark:text-slate-300 text-xs">
                        {type.accuracy === null ? '—' : `${type.accuracy}%`}
                      </span>
                      <div className="col-span-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenStudyModal('type', type.label)}
                          className="h-7 px-2.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                        >
                          Luyện
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
