'use client';

import React, { useState } from 'react';
import { Target, ArrowDownRight } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { HeroSelect } from '@jlpt/ui/components/hero-select';

const KIND_OPTIONS = [
  { value: 'grammar', label: 'Ngữ pháp' },
  { value: 'kanji', label: 'Kanji' },
  { value: 'vocab', label: 'Từ vựng' },
  { value: 'question', label: 'Dạng câu hỏi' },
];

const YEAR_OPTIONS = [
  { value: 'all', label: 'Tất cả năm' },
  { value: '2025', label: 'Năm 2025' },
  { value: '2024', label: 'Năm 2024' },
  { value: '2023', label: 'Năm 2023' },
  { value: '2022', label: 'Năm 2022' },
  { value: '2021', label: 'Năm 2021' },
  { value: '2020', label: 'Năm 2020' },
];

const KNOWLEDGE_BANK: Record<string, [string, number, string][]> = {
  grammar: [
    ['～ようにする', 32, 'Thói quen / chủ ý'],
    ['～ことになる', 28, 'Quyết định / kết quả'],
    ['～ばかり', 25, 'Mức độ / giới hạn'],
    ['～ために', 22, 'Mục đích / nguyên nhân'],
    ['～わけではない', 19, 'Phủ định một phần'],
  ],
  kanji: [
    ['決', 29, 'Quyết định'],
    ['続', 27, 'Tiếp tục'],
    ['変', 24, 'Thay đổi'],
    ['調', 21, 'Điều tra / điều chỉnh'],
    ['選', 18, 'Lựa chọn'],
  ],
  vocab: [
    ['確認', 33, 'Xác nhận'],
    ['予定', 30, 'Dự định'],
    ['連絡', 27, 'Liên lạc'],
    ['経験', 23, 'Kinh nghiệm'],
    ['準備', 20, 'Chuẩn bị'],
  ],
  question: [
    ['Đọc hiểu đoạn dài', 37, 'Đọc hiểu'],
    ['Từ vựng theo ngữ cảnh', 34, 'Từ vựng'],
    ['Sắp xếp câu', 31, 'Ngữ pháp'],
    ['Hiểu ý chính', 28, 'Nghe hiểu'],
    ['Tìm kiếm thông tin', 24, 'Đọc hiểu'],
  ],
};

const YEAR_DATA: Record<string, number[][]> = {
  grammar: [
    [3, 4, 2, 4, 3, 4],
    [2, 3, 1, 4, 2, 3],
    [1, 2, 3, 1, 3, 2],
    [4, 2, 4, 3, 3, 4],
    [0, 1, 2, 1, 3, 2],
  ],
  kanji: [
    [4, 3, 4, 2, 4, 3],
    [3, 2, 4, 3, 2, 3],
    [2, 4, 2, 3, 2, 3],
    [2, 3, 1, 3, 3, 2],
    [1, 2, 2, 2, 3, 2],
  ],
  vocab: [
    [4, 3, 4, 3, 4, 3],
    [3, 4, 3, 4, 2, 3],
    [2, 3, 2, 3, 4, 3],
    [2, 2, 3, 3, 2, 3],
    [1, 2, 3, 2, 2, 2],
  ],
  question: [
    [4, 4, 3, 4, 4, 4],
    [3, 4, 3, 3, 4, 3],
    [3, 3, 4, 3, 3, 3],
    [2, 3, 3, 2, 3, 3],
    [2, 2, 3, 3, 2, 3],
  ],
};

export function AnalyticsFrequencyRanking(): React.JSX.Element {
  const [kind, setKind] = useState<string>('grammar');
  const [year, setYear] = useState<string>('all');

  const rows = KNOWLEDGE_BANK[kind] || KNOWLEDGE_BANK.grammar!;
  const series = YEAR_DATA[kind] || YEAR_DATA.grammar!;
  const yearIdx = year === 'all' ? -1 : Number(year) - 2020;

  const counts = rows.map((r, i) => (year === 'all' ? r[1] : series[i]![yearIdx] ?? r[1]));
  const maxCount = Math.max(1, ...counts);

  const jumpToMatrix = () => {
    const el = document.getElementById('priority-matrix');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="frequency" className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Left: Ranked List */}
      <Card className="lg:col-span-7 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                02 · Kiến thức xuất hiện nhiều nhất
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Xếp hạng theo số lần được gắn nhãn trong kho đề
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">
              Top kiến thức
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="w-36">
              <HeroSelect
                aria-label="Loại kiến thức"
                value={kind}
                onChange={setKind}
                options={KIND_OPTIONS}
                size="sm"
              />
            </div>
            <div className="w-36">
              <HeroSelect
                aria-label="Năm đề thi"
                value={year}
                onChange={setYear}
                options={YEAR_OPTIONS}
                size="sm"
              />
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {rows.map((r, i) => {
              const count = counts[i]!;
              const fillPct = Math.round((count / maxCount) * 100);
              return (
                <div key={i} className="flex items-center gap-3 py-1">
                  <span className="size-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{r[0]}</span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                        {count} lượt
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{r[2]}</p>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                      {/* ui-allow-style: dynamic frequency ranking bar */}
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
          Dữ liệu {year === 'all' ? 'toàn bộ các năm' : `năm ${year}`} · chỉ tính lượt gắn nhãn trong kho đề. Một kiến thức có thể xuất hiện nhiều lần trong cùng một kỳ thi.
        </p>
      </Card>

      {/* Right: Info Feature */}
      <Card className="lg:col-span-5 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Kiến thức hay gặp ≠ kiến thức nên học nhất
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Kết nối tần suất với năng lực cá nhân
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-indigo-950/30 dark:to-slate-800/40 border border-indigo-100 dark:border-indigo-900/50 mb-4">
            <div className="size-9 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm flex items-center justify-center mb-2.5">
              <Target className="size-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Ôn đúng phần có khả năng giúp tăng điểm
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              Kiến thức có tần suất cao nhưng bạn đã làm đúng 95% có thể ít cấp thiết hơn dạng câu xuất hiện đều và bạn thường xuyên mắc lỗi.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 text-center border-y border-slate-100 dark:border-slate-800">
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">6</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Kỳ thi minh họa</span>
            </div>
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">4</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Nhóm nội dung</span>
            </div>
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">5</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Kiến thức top</span>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={jumpToMatrix}
          className="w-full justify-center mt-4"
        >
          Xem ma trận ưu tiên
          <ArrowDownRight className="size-4 inline ml-1.5" aria-hidden="true" />
        </Button>
      </Card>
    </section>
  );
}
