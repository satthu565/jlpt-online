'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Search,
  RefreshCw,
  Info,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { HeroSelect } from '@jlpt/ui/components/hero-select';

export interface MistakeRecord {
  term: string;
  meaning: string;
  wrong: number;
  total: number;
  streak: number;
  last: string;
  source: string;
  reason: string;
  prompt: string;
  selected: string;
  correct: string;
  explain: string;
}

const DEFAULT_MISTAKES: Record<string, MistakeRecord[]> = {
  grammar: [
    {
      term: '～ようにする',
      meaning: 'Cố gắng thực hiện / tạo thói quen',
      wrong: 7,
      total: 10,
      streak: 3,
      last: '08/11/2026',
      source: 'N3 · 12/2024 · Câu 23',
      reason: 'Nhầm với ～ようになる (thay đổi trạng thái)',
      prompt: '毎日、日本語のニュースを読む（　）。',
      selected: 'ようになる',
      correct: 'ようにしている',
      explain: '～ようにしている diễn tả sự cố gắng duy trì một thói quen. ～ようになる nói về khả năng hoặc trạng thái đã thay đổi.',
    },
    {
      term: '～ことになる',
      meaning: 'Được quyết định / kết quả được sắp đặt',
      wrong: 6,
      total: 9,
      streak: 2,
      last: '05/11/2026',
      source: 'N3 · 07/2024 · Câu 27',
      reason: 'Nhầm ～ことにする (tự quyết định)',
      prompt: '会議は来週行う（　）。',
      selected: 'ことにした',
      correct: 'ことになった',
      explain: '～ことになった phù hợp khi việc tổ chức họp được quyết định bởi hoàn cảnh hoặc tổ chức, thay vì một quyết định cá nhân.',
    },
    {
      term: '～わけではない',
      meaning: 'Không hẳn là / không có nghĩa là',
      wrong: 5,
      total: 8,
      streak: 2,
      last: '02/11/2026',
      source: 'N3 · 12/2023 · Câu 25',
      reason: 'Bỏ sót ý phủ định một phần',
      prompt: '日本語が嫌いな（　）が、漢字は難しい。',
      selected: 'わけがない',
      correct: 'わけではない',
      explain: '～わけではない phủ định một phần nhận định. ～わけがない nghĩa là không thể nào, sắc thái mạnh hơn.',
    },
    {
      term: '～ばかり',
      meaning: 'Chỉ toàn / vừa mới (tùy cấu trúc)',
      wrong: 4,
      total: 9,
      streak: 1,
      last: '30/10/2026',
      source: 'N3 · 07/2022 · Câu 24',
      reason: 'Chưa phân biệt các cách dùng',
      prompt: '弟はゲームをして（　）いる。',
      selected: 'だけ',
      correct: 'ばかり',
      explain: '～てばかりいる dùng để nói một hành động được thực hiện quá nhiều, thường có sắc thái phê bình.',
    },
  ],
  vocab: [
    {
      term: '確認（かくにん）',
      meaning: 'Xác nhận, kiểm tra lại',
      wrong: 6,
      total: 8,
      streak: 3,
      last: '08/11/2026',
      source: 'N3 · 12/2024 · Câu 14',
      reason: 'Nhầm nghĩa với 相談',
      prompt: '予定をもう一度（　）してください。',
      selected: '相談',
      correct: '確認',
      explain: '確認 là kiểm tra/xác nhận thông tin; 相談 là bàn bạc, xin tư vấn.',
    },
    {
      term: '影響（えいきょう）',
      meaning: 'Ảnh hưởng, tác động',
      wrong: 5,
      total: 7,
      streak: 2,
      last: '05/11/2026',
      source: 'N3 · 07/2024 · Câu 13',
      reason: 'Không nhớ cách dùng 影響を与える',
      prompt: '天気は試合の結果に大きな（　）を与えた。',
      selected: '経験',
      correct: '影響',
      explain: '影響を与える là cụm quen thuộc mang nghĩa gây ảnh hưởng đến một điều gì.',
    },
    {
      term: '変更（へんこう）',
      meaning: 'Thay đổi (kế hoạch, lịch trình)',
      wrong: 4,
      total: 6,
      streak: 1,
      last: '02/11/2026',
      source: 'N3 · 12/2023 · Câu 12',
      reason: 'Nhầm với 交換',
      prompt: '会議の時間が（　）されました。',
      selected: '交換',
      correct: '変更',
      explain: '変更 là thay đổi nội dung, kế hoạch, thời gian; 交換 là trao đổi/thay thế qua lại.',
    },
    {
      term: '経験（けいけん）',
      meaning: 'Kinh nghiệm, trải nghiệm',
      wrong: 3,
      total: 8,
      streak: 0,
      last: '30/10/2026',
      source: 'N3 · 07/2022 · Câu 11',
      reason: 'Nhầm giữa 経験 và 実験',
      prompt: '海外で働いた（　）があります。',
      selected: '実験',
      correct: '経験',
      explain: '経験 dùng cho trải nghiệm của người; 実験 là thí nghiệm.',
    },
  ],
  kanji: [
    {
      term: '続（ゾク・つづく）',
      meaning: 'Tiếp tục · 続ける / 続く',
      wrong: 8,
      total: 11,
      streak: 4,
      last: '08/11/2026',
      source: 'N3 · 12/2024 · Câu 2',
      reason: 'Nhầm cách đọc âm On và Kun',
      prompt: '仕事を続けます。→「続けます」の読み方は？',
      selected: 'つきけます',
      correct: 'つづけます',
      explain: '続ける đọc là つづける (ngoại động từ). 続く đọc là つづく (nội động từ).',
    },
    {
      term: '調（チョウ・しらべる）',
      meaning: 'Điều tra, tra cứu · 調べる',
      wrong: 6,
      total: 9,
      streak: 2,
      last: '05/11/2026',
      source: 'N3 · 07/2024 · Câu 3',
      reason: 'Chưa nhớ âm Kun của 調べる',
      prompt: '意味を調べてください。→「調べて」の読み方は？',
      selected: 'ならべて',
      correct: 'しらべて',
      explain: '調べる là しらべる. 並べる là ならべる (xếp thành hàng), dễ nhầm về mặt chữ và âm.',
    },
    {
      term: '決（ケツ・きめる）',
      meaning: 'Quyết định · 決める / 決まる',
      wrong: 5,
      total: 10,
      streak: 1,
      last: '02/11/2026',
      source: 'N3 · 12/2023 · Câu 1',
      reason: 'Nhầm nội động từ / ngoại động từ',
      prompt: '予定が決まりました。→「決まりました」の読み方は？',
      selected: 'きめりました',
      correct: 'きまりました',
      explain: '決まる đọc là きまる (được quyết định); 決める đọc là きめる (quyết định).',
    },
    {
      term: '変（ヘン・かわる）',
      meaning: 'Thay đổi · 変わる / 変える',
      wrong: 3,
      total: 8,
      streak: 0,
      last: '30/10/2026',
      source: 'N3 · 07/2022 · Câu 4',
      reason: 'Chưa phân biệt 変わる và 変える',
      prompt: '色が変わりました。→「変わりました」の読み方は？',
      selected: 'かえりました',
      correct: 'かわりました',
      explain: '変わる (かわる) là tự thay đổi; 変える (かえる) là thay đổi thứ gì.',
    },
  ],
  question: [
    {
      term: 'Sắp xếp câu · 文の組み立て',
      meaning: 'Trật tự thành phần và liên kết ngữ pháp',
      wrong: 19,
      total: 35,
      streak: 3,
      last: '08/11/2026',
      source: 'N3 · 12/2024 · Câu 32',
      reason: 'Không xác định được vị trí cụm bổ nghĩa',
      prompt: '私が / 昨日 / 買った / 本は / 面白いです。 → Sắp xếp thành câu tự nhiên.',
      selected: '昨日 私が 本は 買った 面白いです',
      correct: '私が昨日買った本は面白いです',
      explain: 'Cụm 私が昨日買った bổ nghĩa trực tiếp cho 本. Chủ đề toàn câu là 本は.',
    },
    {
      term: 'Đọc hiểu đoạn dài · 長文',
      meaning: 'Đọc tìm luận điểm và suy luận',
      wrong: 16,
      total: 25,
      streak: 4,
      last: '08/11/2026',
      source: 'N3 · 12/2024 · Câu 51',
      reason: 'Bỏ qua câu chuyển ý しかし',
      prompt: 'Tác giả nêu ưu điểm của học trực tuyến, sau đó viết しかし và nêu hạn chế. Kết luận phù hợp nhất là?',
      selected: 'Học trực tuyến luôn hiệu quả hơn',
      correct: 'Cần cân nhắc cả lợi ích và hạn chế',
      explain: 'Từ nối しかし đưa ra ý tương phản; kết luận chỉ dựa vào phần đầu sẽ thiếu ý tác giả.',
    },
    {
      term: 'Ngữ pháp trong đoạn · 文章の文法',
      meaning: 'Liên kết câu trong văn cảnh',
      wrong: 12,
      total: 28,
      streak: 2,
      last: '05/11/2026',
      source: 'N3 · 07/2024 · Câu 39',
      reason: 'Chọn từ nối mà không xét ý trước/sau',
      prompt: '雨が降っていました。（　）、試合は予定通り行われました。',
      selected: 'だから',
      correct: 'しかし',
      explain: 'Hai vế có quan hệ trái ngược: trời mưa nhưng trận đấu vẫn diễn ra; しかし phù hợp.',
    },
    {
      term: 'Nghe hiểu điểm chính · ポイント理解',
      meaning: 'Nhận diện hành động hoặc thông tin chính',
      wrong: 10,
      total: 26,
      streak: 2,
      last: '02/11/2026',
      source: 'N3 · 12/2023 · Nghe câu 8',
      reason: 'Chọn chi tiết nghe được thay vì kết luận cuối',
      prompt: 'Người nói ban đầu định đi tàu, sau đổi sang xe buýt. Cuối cùng họ sẽ đi bằng gì?',
      selected: 'Tàu điện',
      correct: 'Xe buýt',
      explain: 'Trong bài nghe cần ưu tiên quyết định cuối cùng, đặc biệt sau từ chuyển ý.',
    },
  ],
};

const SORT_OPTIONS = [
  { value: 'errors', label: 'Sai nhiều nhất' },
  { value: 'ratio', label: 'Tỷ lệ sai cao' },
  { value: 'recent', label: 'Sai gần đây' },
];

export interface AnalyticsMistakeLibraryProps {
  onOpenQuestionDetail: (record: MistakeRecord) => void;
  onReviewAll: (count: number) => void;
}

export function AnalyticsMistakeLibrary({
  onOpenQuestionDetail,
  onReviewAll,
}: AnalyticsMistakeLibraryProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string>('grammar');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('errors');

  const allRecords = useMemo(() => Object.values(DEFAULT_MISTAKES).flat(), []);
  const totalErrors = allRecords.reduce((acc, r) => acc + r.wrong, 0);
  const streakCount = allRecords.filter((r) => r.streak >= 2).length;

  const currentRecords = DEFAULT_MISTAKES[activeTab] || [];

  const filteredRecords = useMemo(() => {
    let list = [...currentRecords];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.term.toLowerCase().includes(q) ||
          r.meaning.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'ratio') {
        return b.wrong / b.total - a.wrong / a.total;
      }
      if (sortBy === 'recent') {
        const [d1, m1, y1] = a.last.split('/').map(Number);
        const [d2, m2, y2] = b.last.split('/').map(Number);
        return new Date(y2!, m2! - 1, d2!).getTime() - new Date(y1!, m1! - 1, d1!).getTime();
      }
      return b.wrong - a.wrong;
    });

    return list;
  }, [currentRecords, searchQuery, sortBy]);

  const tabContextLabels: Record<string, string> = {
    grammar: 'Ngữ pháp thường nhầm: kiểm tra mẫu câu, cách dùng và cấu trúc dễ gây nhầm lẫn.',
    vocab: 'Từ vựng thường sai: kiểm tra nghĩa, cách dùng trong ngữ cảnh và các từ gần nghĩa.',
    kanji: 'Kanji thường sai: kiểm tra cách đọc, từ ghép và cách phân biệt các chữ dễ nhầm.',
    question: 'Câu hỏi thường sai: xem câu trả lời cụ thể, bẫy thường gặp và kỹ năng cần cải thiện.',
  };

  return (
    <Card id="mistake-library" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            05 · BỘ SƯU TẬP LỖI SAI CÁ NHÂN
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
            Kiến thức tôi thường làm sai
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Chi tiết từng từ vựng, Kanji, mẫu ngữ pháp và câu hỏi sai trong lịch sử luyện đề
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          Cần ôn lại
        </span>
      </div>

      {/* 4 KPI summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">Kiến thức cần ôn</span>
          <strong className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {allRecords.length}
          </strong>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">mục</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">Lượt trả lời sai</span>
          <strong className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
            {totalErrors}
          </strong>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">lượt</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">Sai liên tiếp ≥ 2</span>
          <strong className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {streakCount}
          </strong>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">mục chú ý</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">Đang hiển thị</span>
          <strong className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
            {filteredRecords.length}
          </strong>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">mục đã lọc</span>
        </div>
      </div>

      {/* Toolbar: Tabs & Search/Sort */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
          {[
            { key: 'grammar', label: 'Ngữ pháp' },
            { key: 'vocab', label: 'Từ vựng' },
            { key: 'kanji', label: 'Kanji' },
            { key: 'question', label: 'Câu hỏi' },
          ].map((t) => {
            const count = DEFAULT_MISTAKES[t.key]?.length ?? 0;
            const isActive = activeTab === t.key;
            return (
              <Button
                key={t.key}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(t.key)}
                className={`text-xs font-bold rounded-lg px-3 py-1.5 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.label} <span className="text-[10px] opacity-70 ml-1">{count}</span>
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-52">
            <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiến thức / nghĩa..."
              className="pl-8 text-xs h-9"
              aria-label="Tìm kiếm kiến thức thường sai"
            />
          </div>
          <div className="w-36">
            <HeroSelect
              aria-label="Sắp xếp danh sách lỗi sai"
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              size="sm"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        {tabContextLabels[activeTab]}
      </p>

      {/* Grid of Mistake Cards */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRecords.map((m, idx) => {
            const ratioPct = Math.round((m.wrong / m.total) * 100);
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-base text-slate-900 dark:text-slate-100 break-words" lang="ja">
                        {m.term}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {m.meaning}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                        {ratioPct}%
                      </span>
                      <small className="block text-[10px] text-slate-400 dark:text-slate-500">tỷ lệ sai</small>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden my-2.5">
                    {/* ui-allow-style: dynamic mistake ratio bar */}
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${ratioPct}%` }} /* ui-allow-style: dynamic mistake ratio bar */
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500">
                    <span>
                      Sai <strong className="text-slate-700 dark:text-slate-300">{m.wrong}/{m.total}</strong> lượt
                    </span>
                    <span>
                      Gần nhất: <strong className="text-slate-700 dark:text-slate-300">{m.last}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.streak > 0
                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {m.streak > 0 ? `↻ Sai liên tiếp ${m.streak} lần` : '✓ Đã có lượt làm đúng'}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenQuestionDetail(m)}
                    className="text-xs font-bold"
                  >
                    Xem câu sai
                    <ArrowRight className="size-3.5 inline ml-1" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 text-xs">
          Không có kiến thức phù hợp từ khóa tìm kiếm. Hãy thử từ khóa khác.
        </div>
      )}

      {/* Bottom Actions & Footnote */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-2 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed max-w-xl">
          <Info className="size-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
          <span>
            Chỉ số từ các lần làm bài. Cùng một kiến thức có thể xuất hiện trong nhiều câu hỏi, và các lần làm lại được phân loại riêng để phản ánh chính xác khả năng vận dụng.
          </span>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onReviewAll(filteredRecords.length)}
          disabled={filteredRecords.length === 0}
          className="whitespace-nowrap font-bold"
        >
          <RefreshCw className="size-3.5 inline mr-1.5" aria-hidden="true" />
          Luyện lại các mục đang lọc
        </Button>
      </div>
    </Card>
  );
}
