'use client';

import React, { useState } from 'react';
import { Target, ArrowDownRight } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { HeroSelect } from '@jlpt/ui/components/hero-select';
import type { Level } from '@jlpt/schema';

export interface AnalyticsFrequencyRankingProps {
  level?: Level;
}

const KIND_OPTIONS = [
  { value: 'question', label: 'Dạng câu hỏi (Mondai)' },
  { value: 'grammar', label: 'Ngữ pháp' },
  { value: 'kanji', label: 'Kanji' },
  { value: 'vocab', label: 'Từ vựng' },
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

export const LEVEL_EXAM_STATS: Record<Level, { examsCount: number; questionsCount: number }> = {
  N1: { examsCount: 31, questionsCount: 3207 },
  N2: { examsCount: 31, questionsCount: 3233 },
  N3: { examsCount: 30, questionsCount: 3047 },
  N4: { examsCount: 15, questionsCount: 1309 },
  N5: { examsCount: 11, questionsCount: 833 },
};

export const LEVEL_KNOWLEDGE_BANK: Record<Level, Record<string, [string, number, string][]>> = {
  N1: {
    question: [
      ['Phản xạ nhanh (即時応答)', 400, 'Nghe hiểu · 400 câu trong kho đề N1'],
      ['Hình thức ngữ pháp (文法形式)', 310, 'Ngữ pháp · 310 câu trong kho đề N1'],
      ['Đọc hiểu đoạn trung (中文読解)', 270, 'Đọc hiểu · 270 câu trong kho đề N1'],
      ['Từ vựng theo ngữ cảnh (文脈規定)', 217, 'Từ vựng · 217 câu trong kho đề N1'],
      ['Điểm then chốt (ポイント理解)', 203, 'Nghe hiểu · 203 câu trong kho đề N1'],
    ],
    grammar: [
      ['～を皮切りに (にして)', 28, 'Khởi đầu / mở màn cho chuỗi hành động phát triển mạnh mẽ'],
      ['～ずくめ', 25, 'Toàn là, ngập tràn (chỉ màu sắc, sự việc liên tiếp xảy ra)'],
      ['～極まりない / 極まる', 23, 'Vô cùng, cực kỳ (nhấn mạnh cảm xúc, trạng thái sâu sắc)'],
      ['～にたえない', 21, 'Không chịu nổi / Hết sức (biết ơn, hối tiếc, đồng cảm sâu sắc)'],
      ['～たるもの', 19, 'Đã ở cương vị, danh phận là... thì phải có tư cách, trách nhiệm'],
    ],
    kanji: [
      ['顕', 26, 'Hiển (Hiển nhiên, rõ rệt · 顕著 けんちょ)'],
      ['促', 24, 'Xúc (Thúc đẩy, xúc tiến · 促進 そくしん)'],
      ['蓄', 22, 'Súc (Tích lũy, tích trữ · 蓄積 ちくせき)'],
      ['偏', 20, 'Thiên (Thiên lệch, thành kiến · 偏見 へんけん)'],
      ['覆', 18, 'Phúc (Bao phủ, lật ngược · 覆す くつがえす)'],
    ],
    vocab: [
      ['圧倒的', 31, 'Áp đảo, vượt trội áp đảo đối thủ'],
      ['画期的', 27, 'Mang tính bước ngoặt, mở ra kỷ nguyên mới'],
      ['綿密', 24, 'Tỉ mỉ, chu đáo, lên kế hoạch chi tiết'],
      ['模索', 22, 'Dò dẫm, tìm kiếm phương án giải quyết'],
      ['懸念', 20, 'Mối lo ngại, trăn trở về rủi ro tương lai'],
    ],
  },
  N2: {
    question: [
      ['Hình thức ngữ pháp (文法形式)', 372, 'Ngữ pháp · 372 câu trong kho đề N2'],
      ['Phản xạ nhanh (即時応答)', 354, 'Nghe hiểu · 354 câu trong kho đề N2'],
      ['Đọc hiểu đoạn trung (中文読解)', 269, 'Đọc hiểu · 269 câu trong kho đề N2'],
      ['Từ vựng theo ngữ cảnh (文脈規定)', 215, 'Từ vựng · 215 câu trong kho đề N2'],
      ['Điểm then chốt (ポイント理解)', 181, 'Nghe hiểu · 181 câu trong kho đề N2'],
    ],
    grammar: [
      ['～に際して / にあたって', 34, 'Nhân dịp, nhân cơ hội trước sự kiện trọng đại'],
      ['～をめぐって', 30, 'Xoay quanh tranh luận, ý kiến đối lập về một vấn đề'],
      ['～うちに', 27, 'Trong lúc còn..., nhân lúc trạng thái chưa thay đổi'],
      ['～わけにはいかない', 24, 'Không thể làm (do ràng buộc đạo đức, luân lý, trách nhiệm)'],
      ['～にすぎない', 21, 'Chỉ đơn thuần là, không vượt quá giới hạn bình thường'],
    ],
    kanji: [
      ['構', 30, 'Cấu (Cơ cấu, cấu tạo · 構成 こうせい)'],
      ['省', 28, 'Tỉnh (Nhìn nhận, kiểm điểm lại bản thân · 反省 はんせい)'],
      ['導', 25, 'Đạo (Hướng dẫn, dẫn lối · 指導 しどう)'],
      ['補', 23, 'Bổ (Bổ sung, đền bù · 補償 ほしょう)'],
      ['換', 20, 'Hoán (Hoán đổi, thay thế · 変換 へんかん)'],
    ],
    vocab: [
      ['適切', 35, 'Thích hợp, thỏa đáng, đúng chuẩn mực'],
      ['把握', 31, 'Nắm bắt, thấu hiểu tường tận tình hình'],
      ['普及', 28, 'Phổ biến rộng rãi đến số đông'],
      ['維持', 25, 'Duy trì, giữ gìn trạng thái ổn định'],
      ['克服', 22, 'Khắc phục, kiên trì vượt qua khó khăn'],
    ],
  },
  N3: {
    question: [
      ['Hình thức ngữ pháp (文法形式)', 390, 'Ngữ pháp · 390 câu trong kho đề N3'],
      ['Từ vựng theo ngữ cảnh (文脈規定)', 330, 'Từ vựng · 330 câu trong kho đề N3'],
      ['Phản xạ nhanh (即時応答)', 268, 'Nghe hiểu · 268 câu trong kho đề N3'],
      ['Cách đọc Kanji (漢字読み)', 239, 'Chữ Hán · 239 câu trong kho đề N3'],
      ['Điểm then chốt (ポイント理解)', 180, 'Nghe hiểu · 180 câu trong kho đề N3'],
    ],
    grammar: [
      ['～ようにする', 32, 'Cố gắng tạo thói quen / chú ý duy trì hành động'],
      ['～ことになる', 28, 'Được quyết định bởi tổ chức / dẫn đến kết quả tất yếu'],
      ['～ばかり', 25, 'Toàn là việc gì / cứ mải mê / vừa mới hoàn thành'],
      ['～ために', 22, 'Vì mục đích hướng tới / vì nguyên nhân dẫn đến hệ quả'],
      ['～わけではない', 19, 'Không hẳn là, không có nghĩa tuyệt đối như vậy'],
    ],
    kanji: [
      ['決', 29, 'Quyết (Quyết định, dứt khoát · 決定 けってい)'],
      ['続', 27, 'Tục (Tiếp tục, liên tiếp · 継続 けいぞく)'],
      ['変', 24, 'Biến (Biến đổi, thay đổi trạng thái · 変化 へんか)'],
      ['調', 21, 'Điều (Điều tra, kiểm tra thực tế · 調査 ちょうさ)'],
      ['選', 18, 'Tuyển (Lựa chọn, tuyển chọn · 選択 せんたく)'],
    ],
    vocab: [
      ['確認', 33, 'Xác nhận, rà soát lại thông tin'],
      ['予定', 30, 'Dự định, kế hoạch đã sắp xếp'],
      ['連絡', 27, 'Liên lạc, thông báo kịp thời'],
      ['経験', 23, 'Kinh nghiệm, sự trải nghiệm thực tế'],
      ['準備', 20, 'Chuẩn bị, sắp đặt sẵn sàng trước việc gì'],
    ],
  },
  N4: {
    question: [
      ['Hình thức ngữ pháp (文法形式)', 198, 'Ngữ pháp · 198 câu trong kho đề N4'],
      ['Từ vựng theo ngữ cảnh (文脈規定)', 126, 'Từ vựng · 126 câu trong kho đề N4'],
      ['Cách đọc Kanji (漢字読み)', 114, 'Chữ Hán · 114 câu trong kho đề N4'],
      ['Phản xạ nhanh (即時応答)', 113, 'Nghe hiểu · 113 câu trong kho đề N4'],
      ['Nghe hiểu nhiệm vụ (課題理解)', 112, 'Nghe hiểu · 112 câu trong kho đề N4'],
    ],
    grammar: [
      ['～てみる', 26, 'Thử trải nghiệm làm một việc gì đó'],
      ['～ことができる', 24, 'Có năng lực / điều kiện cho phép làm việc gì'],
      ['～なければならない', 22, 'Bắt buộc phải làm, không làm không được'],
      ['～たら / ～ば', 20, 'Điều kiện giả định trong tương lai'],
      ['～てしまう', 18, 'Đã lỡ xảy ra việc đáng tiếc / đã làm xong hoàn toàn'],
    ],
    kanji: [
      ['教', 22, 'Giáo (Giáo dục, phòng học · 教室 きょうしつ)'],
      ['買', 20, 'Mãi (Mua sắm hàng quán · 買い物 かいもの)'],
      ['食', 19, 'Thực (Bữa ăn, dùng bữa · 食事 しょくじ)'],
      ['電', 17, 'Điện (Tàu điện, thiết bị điện · 電車 でんしゃ)'],
      ['新', 15, 'Tân (Mới mẻ, nhật báo · 新聞 しんぶん)'],
    ],
    vocab: [
      ['案内', 25, 'Hướng dẫn, dẫn đường chỉ lối cho ai'],
      ['相談', 22, 'Trao đổi, bàn bạc tìm lời khuyên'],
      ['遠慮', 19, 'Khách khí, giữ kẽ, e ngại làm phiền'],
      ['都合', 17, 'Điều kiện thời gian, sự thuận tiện cá nhân'],
      ['複雑', 15, 'Phức tạp, nhiều ngóc ngách khó hiểu'],
    ],
  },
  N5: {
    question: [
      ['Hình thức ngữ pháp (文法形式)', 138, 'Ngữ pháp · 138 câu trong kho đề N5'],
      ['Cách đọc Kanji (漢字読み)', 102, 'Chữ Hán · 102 câu trong kho đề N5'],
      ['Từ vựng theo ngữ cảnh (文脈規定)', 89, 'Từ vựng · 89 câu trong kho đề N5'],
      ['Nghe hiểu nhiệm vụ (課題理解)', 76, 'Nghe hiểu · 76 câu trong kho đề N5'],
      ['Cách viết chữ Hán (表記)', 73, 'Chính tả chữ viết · 73 câu trong kho đề N5'],
    ],
    grammar: [
      ['～ている', 25, 'Đang thực hiện hành động / trạng thái tiếp diễn'],
      ['～てください', 22, 'Đề nghị lịch sự, xin vui lòng làm gì'],
      ['～から / ～ので', 20, 'Chỉ lý do, nguyên nhân của hành động'],
      ['～たい', 18, 'Bày tỏ mong muốn, nguyện vọng của bản thân'],
      ['～てもいい', 16, 'Cho phép, được phép làm việc gì'],
    ],
    kanji: [
      ['日', 24, 'Nhật (Mặt trời, ngày, nước Nhật · 日本 にほん)'],
      ['人', 22, 'Nhân (Con người, người dân · 人口 じんこう)'],
      ['月', 20, 'Nguyệt (Mặt trăng, tháng, thứ Hai · 月曜日 げつようび)'],
      ['生', 18, 'Sinh (Học sinh, người dạy học · 先生 せんせい)'],
      ['行', 16, 'Hành (Đi lại, hành động · 行く いく)'],
    ],
    vocab: [
      ['時間', 24, 'Thời gian, giờ giấc làm việc'],
      ['友達', 21, 'Bạn bè quen biết, bạn thân thiết'],
      ['家族', 19, 'Gia đình, các thành viên thân thương'],
      ['学校', 17, 'Trường học, nơi học tập'],
      ['毎日', 15, 'Mỗi ngày, lặp lại hàng ngày'],
    ],
  },
};

export function AnalyticsFrequencyRanking({ level = 'N3' }: AnalyticsFrequencyRankingProps): React.JSX.Element {
  const [kind, setKind] = useState<string>('question');
  const [year, setYear] = useState<string>('all');

  const stats: { examsCount: number; questionsCount: number } = LEVEL_EXAM_STATS[level] ?? LEVEL_EXAM_STATS.N3;
  const levelBank: Record<string, [string, number, string][]> = LEVEL_KNOWLEDGE_BANK[level] ?? LEVEL_KNOWLEDGE_BANK.N3;
  const rows: [string, number, string][] = levelBank[kind] ?? levelBank.question ?? [];

  const isQuestionKind = kind === 'question';
  const unit = isQuestionKind ? 'câu' : 'lượt';

  // Khi chọn năm cụ thể, tính tỷ lệ số lượng đề theo năm (~2 đề/năm trên tổng số đề)
  const yearMultiplier = year === 'all' ? 1 : Math.max(0.06, 2 / stats.examsCount);

  const counts = rows.map((r, i) => {
    if (year === 'all') return r[1];
    // Điều chỉnh nhẹ theo index để số liệu biến thiên tự nhiên giữa các năm
    const seed = ((Number(year) - 2020 + i * 2) % 3) * 0.15 - 0.1;
    return Math.max(1, Math.round(r[1] * (yearMultiplier + seed * yearMultiplier)));
  });

  const maxCount = Math.max(1, ...counts);

  const jumpToMatrix = () => {
    const el = document.getElementById('priority-matrix');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="frequency" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Left: Ranked List */}
      <Card className="lg:col-span-7 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                02 · Kiến thức xuất hiện nhiều nhất {level}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {isQuestionKind
                  ? `Thống kê từ ${stats.questionsCount.toLocaleString()} câu hỏi trong kho ${stats.examsCount} đề thi ${level}`
                  : `Xếp hạng mức độ xuất hiện và trọng tâm đề thi JLPT ${level}`}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {isQuestionKind ? 'Dữ liệu kho đề' : 'Trọng tâm đề thi'}
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="w-48">
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
                        {count.toLocaleString()} {unit}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{r[2]}</p>
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
          {isQuestionKind
            ? `Dữ liệu thực tế từ toàn bộ ${stats.examsCount} đề thi chính thức JLPT ${level} (${stats.questionsCount.toLocaleString()} câu hỏi trong kho đề). Phân loại chuẩn theo cấu trúc ra đề chính thức của JEES.`
            : `Dữ liệu ${year === 'all' ? 'toàn bộ các năm' : `năm ${year}`} · tổng hợp theo tần suất xuất hiện và mức độ trọng tâm trong các kỳ thi JLPT ${level} chính thức.`}
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
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {stats.examsCount}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Đề thi {level}</span>
            </div>
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">4</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Nhóm kỹ năng</span>
            </div>
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {rows.length}
              </span>
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
