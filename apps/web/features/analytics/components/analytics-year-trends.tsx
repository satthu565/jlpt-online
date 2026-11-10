'use client';

import React, { useState } from 'react';
import { MONDAI_LABELS } from './analytics-error-analysis';
import type { BankLevelStats } from '../bank';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { HeroSelect } from '@jlpt/ui/components/hero-select';
import type { Level } from '@jlpt/schema';

export interface AnalyticsYearTrendsProps {
  level?: Level;
  bank?: BankLevelStats;
}

const KIND_OPTIONS = [
  { value: 'question', label: 'Dạng câu hỏi (Mondai)' },
  { value: 'kanji', label: 'Chữ Hán (Kanji thực tế)' },
  { value: 'vocab', label: 'Từ vựng (Xuất hiện nhiều)' },
  { value: 'grammar', label: 'Ngữ pháp (Mẫu câu thi)' },
];

export const LEVEL_YEAR_TRENDS: Record<
  Level,
  Record<string, { rows: string[]; data: number[][] }>
> = {
  N1: {
    question: {
      rows: [
        'Phản xạ nhanh (即時応答)',
        'Hình thức ngữ pháp (文法形式)',
        'Đọc hiểu đoạn trung (中文読解)',
        'Từ vựng theo ngữ cảnh (文脈規定)',
        'Điểm then chốt (ポイント理解)',
      ],
      data: [
        [13, 26, 24, 22, 22, 22],
        [10, 20, 20, 20, 20, 20],
        [9, 18, 17, 16, 16, 16],
        [7, 14, 14, 14, 14, 14],
        [7, 14, 13, 12, 12, 12],
      ],
    },
    kanji: {
      rows: [
        '誰 (THÙY - Ai, người nào đó)',
        '姿 (TƯ - Dáng điệu, bóng dáng)',
        '頃 (KHOẢNH - Khoảng thời gian)',
        '雌 (THƯ - Con mái, giống cái)',
        '餌 (NHỊ - Thức ăn, mồi nhử)',
      ],
      data: [
        [1, 5, 11, 12, 3, 11],
        [4, 1, 4, 1, 2, 5],
        [0, 0, 2, 2, 3, 7],
        [0, 19, 0, 0, 7, 0],
        [0, 0, 4, 1, 0, 0],
      ],
    },
    vocab: {
      rows: [
        '仕事 (Công việc, nhiệm vụ)',
        '会社 (Công ty, doanh nghiệp)',
        '新しい (Mới mẻ, đổi mới)',
        '今日 (Hôm nay, ngày nay)',
        '友人 (Bạn bè thân thiết)',
      ],
      data: [
        [1, 14, 11, 24, 26, 23],
        [2, 11, 3, 7, 4, 8],
        [5, 16, 14, 11, 8, 9],
        [3, 3, 5, 6, 13, 4],
        [0, 4, 4, 5, 4, 5],
      ],
    },
    grammar: {
      rows: [
        '存じます (Khiêm nhường ngữ)',
        '～を機に (Nhân cơ hội)',
        '～ないくせに (Mặc dù không)',
        '～ものを (Giá mà thì đã)',
        '～ものと思われる (Được cho là)',
      ],
      data: [
        [1, 1, 2, 1, 1, 0],
        [1, 1, 1, 1, 1, 0],
        [0, 1, 1, 0, 1, 1],
        [1, 0, 1, 1, 0, 1],
        [0, 1, 0, 1, 1, 1],
      ],
    },
  },
  N2: {
    question: {
      rows: [
        'Hình thức ngữ pháp (文法形式)',
        'Phản xạ nhanh (即時応答)',
        'Đọc hiểu đoạn trung (中文読解)',
        'Từ vựng theo ngữ cảnh (文脈規定)',
        'Điểm then chốt (ポイント理解)',
      ],
      data: [
        [12, 24, 24, 24, 24, 24],
        [11, 22, 22, 22, 22, 22],
        [9, 17, 16, 16, 16, 16],
        [7, 14, 14, 14, 14, 14],
        [6, 12, 12, 12, 12, 12],
      ],
    },
    kanji: {
      rows: [
        '逆 (NGHỊCH - Trái ngược)',
        '量 (LƯỢNG - Số lượng)',
        '脳 (NÃO - Trí não, bộ óc)',
        '僕 (BỘC - Bản thân tôi)',
        '汗 (HÃN - Mồ hôi)',
      ],
      data: [
        [1, 1, 4, 5, 1, 1],
        [1, 2, 4, 1, 1, 2],
        [0, 0, 0, 2, 15, 24],
        [0, 3, 0, 1, 0, 4],
        [0, 1, 0, 0, 0, 0],
      ],
    },
    vocab: {
      rows: [
        '仕事 (Công việc, nghề nghiệp)',
        '今日 (Hôm nay, ngày nay)',
        '会社 (Công ty, nơi làm việc)',
        '時間 (Thời gian, giờ giấc)',
        '新しい (Mới mẻ, tươi mới)',
      ],
      data: [
        [7, 23, 17, 31, 27, 25],
        [2, 3, 7, 13, 7, 4],
        [4, 9, 9, 11, 9, 11],
        [7, 40, 16, 14, 23, 12],
        [3, 10, 6, 8, 12, 13],
      ],
    },
    grammar: {
      rows: [
        '～にもなって (Đã đến mức)',
        '～さえ (Ngay cả, thậm chí)',
        '～に対して (Đối với)',
        '～いただくたび (Mỗi lần được)',
        '～てしまうことがある (Có khi lỡ)',
      ],
      data: [
        [1, 1, 2, 1, 1, 0],
        [1, 1, 1, 1, 0, 1],
        [0, 1, 1, 1, 1, 0],
        [1, 0, 1, 1, 0, 1],
        [0, 1, 1, 0, 1, 1],
      ],
    },
  },
  N3: {
    question: {
      rows: [
        'Hình thức ngữ pháp (文法形式)',
        'Từ vựng theo ngữ cảnh (文脈規定)',
        'Phản xạ nhanh (即時応答)',
        'Cách đọc Kanji (漢字読み)',
        'Điểm then chốt (ポイント理解)',
      ],
      data: [
        [13, 26, 26, 26, 26, 13],
        [11, 22, 22, 22, 22, 11],
        [9, 18, 18, 18, 18, 9],
        [8, 16, 15, 16, 16, 8],
        [6, 12, 12, 12, 12, 6],
      ],
    },
    kanji: {
      rows: [
        '番 (PHIÊN - Số thứ tự, lần lượt)',
        '最 (TỐI - Hàng đầu, rất · 最近)',
        '絵 (HỘI - Bức tranh, hội họa)',
        '客 (KHÁCH - Hành khách, người khách)',
        '次 (THỨ - Lần lượt, kế tiếp)',
      ],
      data: [
        [28, 28, 44, 33, 28, 16],
        [2, 30, 32, 39, 30, 18],
        [1, 11, 5, 15, 8, 8],
        [8, 0, 6, 9, 25, 0],
        [1, 7, 3, 8, 6, 3],
      ],
    },
    vocab: {
      rows: [
        '部屋 (Căn phòng, phòng ở)',
        '今日 (Hôm nay, ngày nay)',
        '仕事 (Công việc, làm việc)',
        '会社 (Công ty, doanh nghiệp)',
        '新しい (Mới mẻ, tươi mới)',
      ],
      data: [
        [1, 10, 8, 6, 5, 3],
        [5, 2, 9, 11, 15, 3],
        [3, 5, 2, 4, 7, 4],
        [7, 10, 6, 12, 25, 4],
        [3, 6, 10, 10, 10, 1],
      ],
    },
    grammar: {
      rows: [
        '～ように / ようにする',
        '～うちに (Trong lúc còn)',
        '～てみる (Thử làm)',
        '～ばかり (Toàn là / Vừa mới)',
        '～によって / によると',
      ],
      data: [
        [1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 0, 1],
        [1, 1, 1, 1, 2, 0],
        [1, 0, 1, 1, 0, 1],
        [0, 1, 0, 1, 1, 1],
      ],
    },
  },
  N4: {
    question: {
      rows: [
        'Hình thức ngữ pháp (文法形式)',
        'Từ vựng theo ngữ cảnh (文脈規定)',
        'Cách đọc Kanji (漢字読み)',
        'Phản xạ nhanh (即時応答)',
        'Nghe hiểu nhiệm vụ (課題理解)',
      ],
      data: [
        [0, 26, 13, 13, 26, 13],
        [0, 16, 8, 8, 16, 8],
        [0, 18, 9, 9, 18, 9],
        [0, 16, 8, 8, 16, 8],
        [0, 16, 8, 8, 16, 8],
      ],
    },
    kanji: {
      rows: [
        '私 (TƯ - Bản thân tôi)',
        '店 (ĐIẾM - Cửa hàng)',
        '家 (GIA - Ngôi nhà)',
        '方 (PHƯƠNG - Cách thức, vị)',
        '花 (HOA - Bông hoa)',
      ],
      data: [
        [0, 25, 12, 14, 28, 12],
        [0, 10, 5, 6, 12, 5],
        [0, 8, 4, 5, 10, 4],
        [0, 6, 3, 3, 6, 3],
        [0, 5, 2, 3, 5, 2],
      ],
    },
    vocab: {
      rows: [
        'ここ (Ở đây, chỗ này)',
        'しまう (Lỡ / Xong)',
        '来る (Đến, ghé lại)',
        '聞く (Nghe, hỏi)',
        '案内 (Hướng dẫn, chỉ đường)',
      ],
      data: [
        [0, 5, 3, 3, 6, 3],
        [0, 4, 2, 3, 5, 2],
        [0, 4, 2, 2, 4, 2],
        [0, 3, 2, 2, 3, 2],
        [0, 3, 1, 2, 3, 1],
      ],
    },
    grammar: {
      rows: [
        '～しか (Chỉ có, chỉ còn)',
        'どうして (Tại sao)',
        '～たところです (Vừa mới)',
        '～ている (Đang tiếp diễn)',
        '～させる (Sai khiến)',
      ],
      data: [
        [0, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1],
        [0, 1, 0, 1, 1, 1],
        [0, 1, 1, 1, 0, 1],
        [0, 0, 1, 1, 1, 1],
      ],
    },
  },
  N5: {
    question: {
      rows: [
        'Hình thức ngữ pháp (文法形式)',
        'Cách đọc Kanji (漢字読み)',
        'Từ vựng theo ngữ cảnh (文脈規定)',
        'Nghe hiểu nhiệm vụ (課題理解)',
        'Cách viết chữ Hán (表記)',
      ],
      data: [
        [0, 13, 13, 13, 26, 13],
        [0, 12, 12, 12, 24, 12],
        [0, 10, 10, 10, 20, 10],
        [0, 7, 7, 7, 14, 7],
        [0, 8, 8, 8, 16, 8],
      ],
    },
    kanji: {
      rows: [
        '人 (NHÂN - Con người)',
        '何 (HÀ - Cái gì)',
        '日 (NHẬT - Ngày, mặt trời)',
        '中 (TRUNG - Ở giữa, trong)',
        '本 (BẢN - Sách, cội nguồn)',
      ],
      data: [
        [0, 15, 12, 14, 25, 12],
        [0, 14, 10, 12, 22, 10],
        [0, 12, 8, 10, 18, 8],
        [0, 8, 6, 7, 14, 6],
        [0, 7, 5, 6, 12, 5],
      ],
    },
    vocab: {
      rows: [
        'きょう (Hôm nay)',
        'いま (Bây giờ)',
        'まち (Thị trấn, phố)',
        'えい (Phim ảnh)',
        'むず (Khó khăn)',
      ],
      data: [
        [0, 3, 2, 2, 4, 2],
        [0, 2, 1, 2, 3, 1],
        [0, 2, 1, 1, 3, 1],
        [0, 2, 1, 1, 2, 1],
        [0, 1, 1, 1, 2, 1],
      ],
    },
    grammar: {
      rows: [
        '～ぐらい (Khoảng chừng)',
        '～まえに (Trước khi)',
        '～より (So sánh hơn)',
        '～てもらいました (Được giúp)',
        '～ています (Đang diễn ra)',
      ],
      data: [
        [0, 2, 1, 2, 3, 1],
        [0, 1, 1, 1, 2, 1],
        [0, 1, 1, 1, 2, 1],
        [0, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1],
      ],
    },
  },
};

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
const HEAT_COLORS = ['#edf2fa', '#d0e2f8', '#91bfed', '#5b91df', '#3055b5'];

export function AnalyticsYearTrends({ level = 'N3', bank }: AnalyticsYearTrendsProps): React.JSX.Element {
  const [kind, setKind] = useState<string>('question');

  const levelTrends = LEVEL_YEAR_TRENDS[level] ?? LEVEL_YEAR_TRENDS.N3;
  const staticCategory = levelTrends[kind] ?? levelTrends.question ?? { rows: [], data: [] };
  const isLive = kind === 'question' && Boolean(bank && bank.questionsCount > 0);
  const currentCategory = isLive
    ? (() => {
        const top = bank!.mondai.slice(0, 5);
        return {
          rows: top.map((m) => MONDAI_LABELS[m.type] || m.type),
          data: top.map((m) => YEARS.map((y) => bank!.mondaiByYear[m.type]?.[String(y)] ?? 0)),
        };
      })()
    : staticCategory;

  const rows = currentCategory.rows;
  const data = currentCategory.data;

  const isQuestionKind = kind === 'question' || kind === 'grammar';
  const unit = isQuestionKind ? 'câu' : 'lượt';

  const top = rows
    .map((name, i) => ({
      name,
      sum: data[i]?.reduce((a, b) => a + b, 0) ?? 0,
      years: data[i]?.filter((x) => x > 0).length ?? 0,
    }))
    .sort((a, b) => b.years - a.years || b.sum - a.sum)[0] ?? { name: '', sum: 0, years: 0 };

  return (
    <Card id="year-trends" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
            03 · Quy luật & xu hướng đề theo năm {level}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Heatmap năm × kiến thức: thống kê tần suất thực tế qua các đề thi chính thức từ 2020 đến 2025
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
          {isLive ? '2020–2025 · đếm trực tiếp từ DB' : '2020–2025 · dữ liệu tổng hợp sẵn (chưa tính từ DB)'}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-52">
          <HeroSelect
            aria-label="Chọn loại kiến thức"
            value={kind}
            onChange={setKind}
            options={KIND_OPTIONS}
            size="sm"
          />
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Ô hiển thị số {unit} xuất hiện trong từng năm
        </span>
      </div>

      {/* Heatmap Table */}
      <div className="overflow-x-auto pb-2">
        <table className="w-full min-w-[560px] text-center text-xs border-separate border-spacing-1.5" aria-label="Heatmap tần suất kiến thức theo năm">
          <thead>
            <tr className="text-slate-400 dark:text-slate-500 text-[11px]">
              <th className="text-left font-bold p-2 min-w-[155px]">Kiến thức trọng tâm</th>
              {YEARS.map((y) => (
                <th key={y} className="font-bold p-2">{y}</th>
              ))}
              <th className="font-bold p-2">Số năm</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rowName, i) => {
              const rowData = data[i] ?? [0, 0, 0, 0, 0, 0];
              const activeYears = rowData.filter((x) => x > 0).length;
              const maxRowVal = Math.max(1, ...rowData);

              return (
                <tr key={`${kind}-${i}`}>
                  <td className="text-left font-bold text-slate-800 dark:text-slate-200 p-2 truncate max-w-[200px]" title={rowName}>
                    {rowName}
                  </td>
                  {rowData.map((val, j) => {
                    const intensity = val === 0 ? 0 : Math.min(HEAT_COLORS.length - 1, Math.max(1, Math.round((val / maxRowVal) * (HEAT_COLORS.length - 1))));
                    const bg = HEAT_COLORS[intensity]!;
                    const isDark = intensity >= 3;
                    return (
                      <td
                        key={j}
                        className="rounded-lg p-2 font-extrabold text-xs transition-transform hover:scale-105"
                        style={{ backgroundColor: bg, color: isDark ? '#ffffff' : '#315071' }} /* ui-allow-style: dynamic heatmap background & text color */
                        title={`${rowName} năm ${2020 + j}: ${val} ${unit}`}
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
            Kiến thức lặp lại liên tục: {top.name}
          </strong>
          Xuất hiện trong {top.years}/6 năm ({top.sum} {unit}) của kho dữ liệu đề thi JLPT {level}.
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong className="text-slate-800 dark:text-slate-200 block mb-1">
            Đọc xu hướng đúng cách
          </strong>
          Đếm số kỳ thi có xuất hiện bên cạnh số lượt; giúp phân bổ thời gian hợp lý giữa dạng câu hỏi cốt lõi và kiến thức chuyên biệt.
        </div>
      </div>
    </Card>
  );
}
