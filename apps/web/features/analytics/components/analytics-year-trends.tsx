'use client';

import React, { useState } from 'react';
import { MONDAI_LABELS } from './analytics-error-analysis';
import type { BankLevelStats, DifficultyData, LevelContent } from '../bank';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { HeroSelect } from '@jlpt/ui/components/hero-select';
import type { Level } from '@jlpt/schema';

export interface AnalyticsYearTrendsProps {
  level?: Level;
  bank?: BankLevelStats;
  content?: LevelContent;
  /** Community accuracy per exam year and skill (only cells with enough learners). */
  difficulty?: DifficultyData;
}

const KIND_OPTIONS = [
  { value: 'question', label: 'Dạng câu hỏi (số câu mỗi đề)' },
  { value: 'grammar', label: 'Ngữ pháp được kiểm tra' },
  { value: 'vocab', label: 'Từ vựng được kiểm tra' },
  { value: 'kanji', label: 'Chữ Hán được kiểm tra' },
  { value: 'difficulty', label: 'Độ khó theo năm (cộng đồng)' },
];

const WINDOW_OPTIONS = [
  { value: '2020', label: '2020 – 2025' },
  { value: '2014', label: '2014 – 2019' },
  { value: '2010', label: '2010 – 2013' },
];

const WINDOW_YEARS: Record<string, number[]> = {
  '2020': [2020, 2021, 2022, 2023, 2024, 2025],
  '2014': [2014, 2015, 2016, 2017, 2018, 2019],
  '2010': [2010, 2011, 2012, 2013],
};

const SKILL_ROWS: Array<{ key: 'vocab' | 'grammar' | 'reading' | 'listening'; label: string }> = [
  { key: 'vocab', label: 'Từ vựng & Chữ Hán' },
  { key: 'grammar', label: 'Ngữ pháp' },
  { key: 'reading', label: 'Đọc hiểu' },
  { key: 'listening', label: 'Nghe hiểu' },
];

const HEAT_COLORS = ['#edf2fa', '#d0e2f8', '#91bfed', '#5b91df', '#3055b5'];
const MAX_ROWS = 6;

interface Grid {
  rows: string[];
  data: Array<Array<number | null>>;
  unit: string;
}

export function AnalyticsYearTrends({ level = 'N3', bank, content, difficulty }: AnalyticsYearTrendsProps): React.JSX.Element {
  const [kind, setKind] = useState<string>('question');
  const [windowKey, setWindowKey] = useState<string>('2020');
  const years = WINDOW_YEARS[windowKey] ?? WINDOW_YEARS['2020']!;

  const examsByYear = content?.examsByYear ?? bank?.examsByYear ?? {};
  const examsOf = (y: number): number => examsByYear[String(y)] ?? 0;

  let grid: Grid = { rows: [], data: [], unit: 'câu' };
  let note = '';

  if (kind === 'question' && bank) {
    const top = bank.mondai.slice(0, MAX_ROWS);
    grid = {
      rows: top.map((m) => MONDAI_LABELS[m.type] || m.type),
      // per exam, so a year with one sitting is comparable to a year with two
      data: top.map((m) =>
        years.map((y) => (examsOf(y) > 0 ? Math.round(((bank.mondaiByYear[m.type]?.[String(y)] ?? 0) / examsOf(y)) * 10) / 10 : null)),
      ),
      unit: 'câu/đề',
    };
    note = 'Mỗi ô là số câu của dạng đó trong MỘT đề (đã chia theo số đề của năm), nên các năm so sánh được với nhau.';
  } else if ((kind === 'grammar' || kind === 'vocab' || kind === 'kanji') && content) {
    // keep only knowledge actually tested in the chosen years, so no row is all zeros
    const items = content[kind]
      .filter((it) => it.firstLevel === level && years.some((y) => (it.years[String(y)] ?? 0) > 0))
      .slice(0, MAX_ROWS);
    grid = {
      rows: items.map((it) => it.term),
      data: items.map((it) => years.map((y) => (examsOf(y) > 0 ? (it.years[String(y)] ?? 0) : null))),
      unit: 'câu',
    };
    note = `Chỉ hiện kiến thức mới ở ${level} (chưa xuất hiện ở cấp thấp hơn), xếp theo số đề có kiến thức đó. Ô là số câu hỏi kiểm tra kiến thức trong năm; "–" nghĩa là năm đó không có đề trong kho.`;
  } else if (kind === 'difficulty') {
    const byYear = difficulty?.levels?.[level] ?? {};
    grid = {
      rows: SKILL_ROWS.map((r) => r.label),
      data: SKILL_ROWS.map((r) =>
        years.map((y) => {
          const cell = byYear[String(y)]?.[r.key];
          return cell && cell.n > 0 ? Math.round((cell.correct / cell.n) * 100) : null;
        }),
      ),
      unit: '% đúng',
    };
    const hasAny = grid.data.some((row) => row.some((v) => v !== null));
    note = hasAny
      ? 'Tỷ lệ đúng của tất cả người học theo năm của đề. Chỉ hiện ô có đủ người làm để không lộ dữ liệu cá nhân.'
      : `Chưa đủ dữ liệu cộng đồng: hiện có ${difficulty?.users ?? 0} người đã nộp bài, cần ít nhất ${difficulty?.minUsers ?? 5} người cho cùng một đề/năm. Số liệu sẽ tự xuất hiện khi đủ.`;
  }

  const values = grid.data.flat().filter((v): v is number => v !== null);
  const maxVal = Math.max(1, ...values);
  const live = grid.rows.length > 0;

  const top = grid.rows
    .map((name, i) => ({
      name,
      sum: grid.data[i]?.reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0,
      active: grid.data[i]?.filter((x) => x !== null && x > 0).length ?? 0,
    }))
    .sort((a, b) => b.active - a.active || b.sum - a.sum)[0];

  return (
    <Card id="year-trends" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
            03 · Quy luật & xu hướng đề theo năm {level}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Heatmap năm × kiến thức, tính từ các đề thi chính thức trong kho đề
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
          Đếm từ DB
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="w-64">
          <HeroSelect aria-label="Chọn loại kiến thức" value={kind} onChange={setKind} options={KIND_OPTIONS} size="sm" />
        </div>
        <div className="w-36">
          <HeroSelect aria-label="Chọn giai đoạn" value={windowKey} onChange={setWindowKey} options={WINDOW_OPTIONS} size="sm" />
        </div>
      </div>
      {note && <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 leading-relaxed">{note}</p>}

      {!live && (
        <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          {kind === 'difficulty' ? '' : 'Đang tải số liệu…'}
        </p>
      )}

      {live && (
        <div className="overflow-x-auto pb-2">
          <table
            className="w-full min-w-[560px] text-center text-xs border-separate border-spacing-1.5"
            aria-label="Heatmap kiến thức theo năm"
          >
            <thead>
              <tr className="text-slate-400 dark:text-slate-500 text-[11px]">
                <th className="text-left font-bold p-2 min-w-[155px]">Kiến thức trọng tâm</th>
                {years.map((y) => (
                  <th key={y} className="font-bold p-2">
                    {y}
                    <span className="block text-[9px] font-normal">{examsOf(y)} đề</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((rowName, i) => {
                const rowData = grid.data[i] ?? [];
                return (
                  <tr key={`${kind}-${i}`}>
                    <td
                      className="text-left font-bold text-slate-800 dark:text-slate-200 p-2 truncate max-w-[200px]"
                      title={rowName}
                      lang={kind === 'difficulty' || kind === 'question' ? undefined : 'ja'}
                    >
                      {rowName}
                    </td>
                    {rowData.map((val, j) => {
                      if (val === null) {
                        return (
                          <td key={j} className="rounded-lg p-2 text-slate-300 dark:text-slate-600" title="Không có dữ liệu">
                            –
                          </td>
                        );
                      }
                      const intensity =
                        val === 0
                          ? 0
                          : Math.min(HEAT_COLORS.length - 1, Math.max(1, Math.round((val / maxVal) * (HEAT_COLORS.length - 1))));
                      return (
                        <td
                          key={j}
                          className="rounded-lg p-2 font-extrabold text-xs transition-transform hover:scale-105"
                          style={{ backgroundColor: HEAT_COLORS[intensity]!, color: intensity >= 3 ? '#ffffff' : '#315071' }} /* ui-allow-style: dynamic heatmap background & text color */
                          title={`${rowName} năm ${years[j]}: ${val} ${grid.unit}`}
                        >
                          {val}
                          {kind === 'difficulty' ? '%' : ''}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {live && (
        <div className="flex justify-end items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mt-2">
          <span>Ít</span>
          {HEAT_COLORS.map((c, idx) => (
            <span key={idx} className="size-3.5 rounded" style={{ backgroundColor: c }} /> /* ui-allow-style */
          ))}
          <span>Nhiều</span>
        </div>
      )}

      {live && top && kind !== 'difficulty' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong className="text-slate-800 dark:text-slate-200 block mb-1" lang="ja">
              Lặp lại nhiều nhất: {top.name}
            </strong>
            Có mặt ở {top.active}/{years.length} năm trong giai đoạn này.
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong className="text-slate-800 dark:text-slate-200 block mb-1">Đọc xu hướng đúng cách</strong>
            {kind === 'question'
              ? 'Cấu trúc đề JLPT gần như cố định, nên số câu mỗi dạng ổn định qua các năm là bình thường. Xu hướng thật nằm ở kiến thức được hỏi.'
              : 'Mỗi kiến thức chỉ được hỏi vài lần trong cả kho; hãy dùng bảng này để thấy kiến thức nào lặp lại, không phải để dự đoán đề.'}
          </div>
        </div>
      )}
    </Card>
  );
}
