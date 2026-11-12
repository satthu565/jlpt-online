'use client';

import React, { useState } from 'react';
import { ArrowDownRight, Target } from 'lucide-react';
import type { Level } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { HeroSelect } from '@jlpt/ui/components/hero-select';
import { MONDAI_LABELS } from './analytics-error-analysis';
import type { BankLevelStats, ContentItem, LevelContent } from '../bank';

export interface AnalyticsFrequencyRankingProps {
  level?: Level;
  bank?: BankLevelStats;
  /** What the exams of this level test (words, kanji, grammar), counted from the exam content. */
  content?: LevelContent;
}

const KIND_OPTIONS = [
  { value: 'question', label: 'Dạng câu hỏi (Mondai)' },
  { value: 'kanji', label: 'Chữ Hán được kiểm tra' },
  { value: 'vocab', label: 'Từ vựng được kiểm tra' },
  { value: 'grammar', label: 'Ngữ pháp được kiểm tra' },
];

const SKILL_NAMES: Record<string, string> = {
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  kanji: 'Chữ Hán',
  reading: 'Đọc hiểu',
  listening: 'Nghe hiểu',
};

const MAX_ROWS = 8;

interface Row {
  key: string;
  title: string;
  count: number;
  exams?: number;
  sub: string;
}

function subtitle(kind: string, it: ContentItem): string {
  if (kind === 'kanji') {
    const parts = [it.hanViet, it.meaning].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : `Có trong từ được hỏi: ${it.example?.stem ?? ''}`;
  }
  if (kind === 'vocab') return it.meaning || it.example?.stem || '';
  return it.why || (it.example ? `Ví dụ: ${it.example.stem}${it.example.correct ? ` → ${it.example.correct}` : ''}` : '');
}

export function AnalyticsFrequencyRanking({ level = 'N3', bank, content }: AnalyticsFrequencyRankingProps): React.JSX.Element {
  const [kind, setKind] = useState<string>('vocab');
  const [year, setYear] = useState<string>('all');
  const [newOnly, setNewOnly] = useState<boolean>(true);

  const examsByYear = content?.examsByYear ?? bank?.examsByYear ?? {};
  const yearOptions = [
    { value: 'all', label: 'Tất cả năm' },
    ...Object.keys(examsByYear)
      .sort((a, b) => Number(b) - Number(a))
      .map((y) => ({ value: y, label: `Năm ${y}` })),
  ];
  const examsInYear = year === 'all' ? (bank?.examsCount ?? 0) : (examsByYear[year] ?? 0);
  const questionsCount = bank?.questionsCount ?? 0;

  let rows: Row[] = [];
  if (kind === 'question' && bank) {
    rows = bank.mondai
      .map((m) => ({
        key: m.type,
        title: MONDAI_LABELS[m.type] || m.type,
        count: year === 'all' ? m.count : (bank.mondaiByYear[m.type]?.[year] ?? 0),
        sub: `${SKILL_NAMES[m.skill] || m.skill} · ${year === 'all' ? `trong kho đề ${level}` : `trong đề thi năm ${year}`}`,
      }))
      .filter((r) => r.count > 0)
      .sort((x, y) => y.count - x.count)
      .slice(0, MAX_ROWS);
  } else if (kind !== 'question' && content) {
    const items = (content[kind as 'vocab' | 'kanji' | 'grammar'] ?? []).filter(
      (it) => !newOnly || it.firstLevel === level,
    );
    rows = items
      .map((it) => ({
        key: it.term,
        title: it.term,
        count: year === 'all' ? it.count : (it.years[year] ?? 0),
        exams: year === 'all' ? it.exams : undefined,
        sub: subtitle(kind, it),
      }))
      .filter((r) => r.count > 0)
      .sort((x, y) => y.count - x.count || (y.exams ?? 0) - (x.exams ?? 0))
      .slice(0, MAX_ROWS);
  }

  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const isItems = kind !== 'question';

  const jumpToMatrix = () => {
    const el = document.getElementById('priority-matrix');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const description =
    kind === 'question'
      ? `Thống kê từ ${questionsCount.toLocaleString()} câu hỏi trong kho ${bank?.examsCount ?? 0} đề thi ${level}`
      : kind === 'kanji'
        ? `Chữ Hán nằm trong từ/đáp án được hỏi ở các đề ${level} (không tính lời dẫn đề)`
        : kind === 'vocab'
          ? `Từ được hỏi trực tiếp (từ gạch chân, đáp án đúng) ở các đề ${level}`
          : `Mẫu ngữ pháp / từ chức năng là đáp án đúng ở các đề ${level}`;

  const footer = !isItems
    ? `Đếm trực tiếp từ ${bank?.examsCount ?? 0} đề thi chính thức JLPT ${level} (${questionsCount.toLocaleString()} câu hỏi) trong cơ sở dữ liệu.`
    : `Đếm trực tiếp từ nội dung các đề ${level} trong cơ sở dữ liệu, chỉ tính phần được kiểm tra (từ gạch chân, đáp án đúng), không tính lời dẫn đề. Mỗi kiến thức thường chỉ xuất hiện vài lần trong cả kho nên xếp theo số đề rồi số câu.${
        newOnly ? ` Đang ẩn kiến thức đã xuất hiện ở cấp thấp hơn ${level}.` : ''
      }`;

  return (
    <section id="frequency" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      <Card className="lg:col-span-7 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Kiến thức xuất hiện nhiều nhất {level} {year !== 'all' ? `· Năm ${year}` : ''}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
              Đếm từ DB
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="w-52">
              <HeroSelect aria-label="Loại kiến thức" value={kind} onChange={setKind} options={KIND_OPTIONS} size="sm" />
            </div>
            <div className="w-36">
              <HeroSelect aria-label="Năm đề thi" value={year} onChange={setYear} options={yearOptions} size="sm" />
            </div>
            {isItems && (
              <Button
                variant={newOnly ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setNewOnly((v) => !v)}
                className="whitespace-nowrap font-medium"
              >
                {newOnly ? `Chỉ kiến thức mới ở ${level}` : 'Gồm cả kiến thức cấp thấp hơn'}
              </Button>
            )}
          </div>

          {rows.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {isItems && !content
                ? 'Đang tải thống kê nội dung đề…'
                : 'Không có kiến thức nào khớp bộ lọc này. Thử bỏ lọc năm hoặc chọn "Gồm cả kiến thức cấp thấp hơn".'}
            </p>
          )}

          <div className="space-y-3">
            {rows.map((r, i) => {
              const fillPct = Math.round((r.count / maxCount) * 100);
              return (
                <div key={`${year}-${kind}-${r.key}`} className="flex items-center gap-3 py-1">
                  <span className="size-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate" lang="ja">
                        {r.title}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                        {r.count.toLocaleString()} câu{r.exams !== undefined ? ` · ${r.exams} đề` : ''}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{r.sub}</p>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                        style={{ width: `${fillPct}%` }} /* ui-allow-style: dynamic frequency ranking bar */
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-4 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed border border-indigo-100/60 dark:border-indigo-900/40">
          {footer}
        </p>
      </Card>

      <Card className="lg:col-span-5 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Kiến thức hay gặp ≠ kiến thức nên học nhất
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Kết nối tần suất với năng lực cá nhân</p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-indigo-950/30 dark:to-slate-800/40 border border-indigo-100 dark:border-indigo-900/50 mb-4">
            <div className="size-9 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm flex items-center justify-center mb-2.5">
              <Target className="size-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Ôn đúng phần có khả năng giúp tăng điểm</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              Kiến thức có tần suất cao nhưng bạn đã làm đúng gần hết có thể ít cấp thiết hơn dạng câu xuất hiện đều mà bạn thường xuyên mắc lỗi.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 text-center border-y border-slate-100 dark:border-slate-800">
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{examsInYear}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {year !== 'all' ? `Đề thi (${year})` : `Đề thi ${level}`}
              </span>
            </div>
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {content ? content[(isItems ? kind : 'vocab') as 'vocab' | 'kanji' | 'grammar'].length : '–'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Mục trong top</span>
            </div>
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{rows.length}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Đang hiển thị</span>
            </div>
          </div>
        </div>

        <Button variant="primary" size="md" onClick={jumpToMatrix} className="w-full justify-center mt-4">
          Xem ma trận ưu tiên
          <ArrowDownRight className="size-4 inline ml-1.5" aria-hidden="true" />
        </Button>
      </Card>
    </section>
  );
}
