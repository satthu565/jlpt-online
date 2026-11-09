'use client';

import React, { useState } from 'react';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { HeroSelect } from '@jlpt/ui/components/hero-select';

const KIND_OPTIONS = [
  { value: 'grammar', label: 'Ngữ pháp' },
  { value: 'kanji', label: 'Kanji' },
  { value: 'vocab', label: 'Từ vựng' },
  { value: 'question', label: 'Dạng câu hỏi' },
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

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
const HEAT_COLORS = ['#edf2fa', '#d0e2f8', '#91bfed', '#5b91df', '#3055b5'];

export function AnalyticsYearTrends(): React.JSX.Element {
  const [kind, setKind] = useState<string>('grammar');

  const rows = KNOWLEDGE_BANK[kind] || KNOWLEDGE_BANK.grammar!;
  const data = YEAR_DATA[kind] || YEAR_DATA.grammar!;

  const top = rows
    .map((r, i) => ({
      name: r[0],
      sum: data[i]!.reduce((a, b) => a + b, 0),
      years: data[i]!.filter((x) => x > 0).length,
    }))
    .sort((a, b) => b.years - a.years || b.sum - a.sum)[0]!;

  return (
    <Card id="year-trends" className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
            03 · Quy luật & xu hướng đề theo năm
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Heatmap năm × kiến thức: phân biệt mức độ xuất hiện giữa các năm, không suy luận chắc chắn đề tương lai
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
          2020–2025 · xu hướng
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-36">
          <HeroSelect
            aria-label="Chọn loại kiến thức"
            value={kind}
            onChange={setKind}
            options={KIND_OPTIONS}
            size="sm"
          />
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Ô hiển thị số lượt xuất hiện trong năm
        </span>
      </div>

      {/* Heatmap Table */}
      <div className="overflow-x-auto pb-2">
        <table className="w-full min-w-[560px] text-center text-xs border-separate border-spacing-1.5" aria-label="Heatmap tần suất kiến thức theo năm">
          <thead>
            <tr className="text-slate-400 dark:text-slate-500 text-[11px]">
              <th className="text-left font-bold p-2 min-w-[145px]">Kiến thức</th>
              {YEARS.map((y) => (
                <th key={y} className="font-bold p-2">{y}</th>
              ))}
              <th className="font-bold p-2">Số năm</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const rowData = data[i]!;
              const activeYears = rowData.filter((x) => x > 0).length;
              return (
                <tr key={i}>
                  <td className="text-left font-bold text-slate-800 dark:text-slate-200 p-2">
                    {r[0]}
                  </td>
                  {rowData.map((val, j) => {
                    const bg = HEAT_COLORS[Math.min(val, HEAT_COLORS.length - 1)]!;
                    const isDark = val >= 3;
                    return (
                      <td
                        key={j}
                        className="rounded-lg p-2 font-extrabold text-xs transition-transform hover:scale-105"
                        // ui-allow-style: dynamic heatmap background & text color
                        style={{
                          backgroundColor: bg,
                          color: isDark ? '#ffffff' : '#315071',
                        }}
                        title={`${r[0]} năm ${2020 + j}: ${val} lượt`}
                      >
                        {val}
                      </td>
                    );
                  })}
                  <td className="p-2 font-bold text-slate-700 dark:text-slate-300">
                    {activeYears}/6
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Scale Legend */}
      <div className="flex justify-end items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mt-2">
        <span>Ít xuất hiện</span>
        {HEAT_COLORS.map((c, idx) => (
          <span key={idx} className="size-3.5 rounded" style={{ backgroundColor: c }} /> /* ui-allow-style */
        ))}
        <span>Nhiều xuất hiện</span>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong className="text-slate-800 dark:text-slate-200 block mb-1">
            Kiến thức lặp lại nhiều năm: {top.name}
          </strong>
          Gắn nhãn trong {top.years}/6 năm của kho dữ liệu đề thi.
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong className="text-slate-800 dark:text-slate-200 block mb-1">
            Đọc xu hướng đúng cách
          </strong>
          Đếm số kỳ thi có xuất hiện bên cạnh số lượt; không suy luận rằng tần suất cao đảm bảo sẽ xuất hiện ở kỳ thi tới.
        </div>
      </div>
    </Card>
  );
}
