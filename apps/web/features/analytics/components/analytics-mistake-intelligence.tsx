'use client';

import React, { useState, useMemo } from 'react';
import type { AttemptRecord, QuestionAttemptRecord } from '../types';
import type { Level } from '@jlpt/schema';
import { BrainCircuit, ArrowRight } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { HeroSelect } from '@jlpt/ui/components/hero-select';

export interface IntelligenceItem {
  id: string;
  name: string;
  value: number;
  unit: string;
  category?: string;
  why: string;
  example?: string;
  chosen?: string;
  correct?: string;
  hint?: string;
}

export interface ConfusedPair {
  kind: 'grammar' | 'vocab' | 'kanji';
  a: string;
  b: string;
  n: number;
  ex: string;
  selected: string;
  correct: string;
  diff: string;
  tip: string;
}

const REASONS: IntelligenceItem[] = [
  {
    id: 'r1',
    name: 'Nhầm kiến thức gần nghĩa',
    value: 42,
    unit: 'lượt',
    why: 'Nhận ra hai mẫu/từ quen thuộc nhưng chọn sai ngữ cảnh.',
    example: '毎日、日本語を話す（　）しています。',
    chosen: 'ことに',
    correct: 'ように',
    hint: '～ようにする nhấn mạnh cố gắng tạo thói quen; ～ことにする nhấn mạnh tự quyết định.',
  },
  {
    id: 'r2',
    name: 'Không nhớ kiến thức',
    value: 30,
    unit: 'lượt',
    why: 'Đã gặp trước đây nhưng không nhớ cách đọc hoặc cấu trúc.',
    example: '仕事を続けます。「続けます」の読みは？',
    chosen: 'つきけます',
    correct: 'つづけます',
    hint: 'Ôn ngắt quãng và làm câu mới, không chỉ xem lại đáp án.',
  },
  {
    id: 'r3',
    name: 'Hiểu sai ngữ cảnh',
    value: 24,
    unit: 'lượt',
    why: 'Hiểu từng từ nhưng bỏ lỡ quan hệ giữa các câu.',
    example: '雨が降った。（　）、試合は行われた。',
    chosen: 'だから',
    correct: 'しかし',
    hint: 'Hai mệnh đề trái ngược nhau nên cần しかし.',
  },
  {
    id: 'r4',
    name: 'Thiếu thời gian',
    value: 16,
    unit: 'lượt',
    why: 'Mất quá nhiều thời gian đọc và chọn đáp án.',
    example: 'Đọc hiểu dài: câu cuối yêu cầu rút ra kết luận.',
    chosen: 'Không kịp trả lời',
    correct: 'Đọc ý chính trước khi chọn',
    hint: 'Tập quét câu hỏi, tìm từ nối và giới hạn thời gian theo dạng.',
  },
  {
    id: 'r5',
    name: 'Bỏ sót từ khóa',
    value: 8,
    unit: 'lượt',
    why: 'Không để ý từ phủ định hoặc câu chuyển ý.',
    example: '日本語が嫌いな（　）が、漢字は難しい。',
    chosen: 'わけがない',
    correct: 'わけではない',
    hint: 'Đánh dấu phạm vi phủ định và đọc đủ vế sau.',
  },
];

const COVERAGE: IntelligenceItem[] = [
  {
    id: 'c1',
    name: '～ようにする',
    value: 38,
    unit: 'câu',
    why: 'Ý nghĩa thói quen/cố gắng, gặp trong lựa chọn ngữ pháp và văn cảnh.',
    example: '健康のために、毎日歩くようにしています。',
    hint: 'Học phân biệt với ～ことにする và ～ようになる.',
  },
  {
    id: 'c2',
    name: '～ことになる',
    value: 34,
    unit: 'câu',
    why: 'Kết quả được quyết định, xuất hiện trong câu ngữ pháp và đọc hiểu.',
    example: '会議は来週行うことになりました。',
    hint: 'So sánh với ～ことにする (tự quyết định).',
  },
  {
    id: 'c3',
    name: '～ために',
    value: 29,
    unit: 'câu',
    why: 'Mục đích hoặc nguyên nhân; cần hiểu chủ ngữ, kết quả và động từ.',
    example: '合格するために、毎日勉強しています。',
    hint: 'Phân biệt ～ために và ～ように theo mục tiêu/khả năng điều khiển.',
  },
  {
    id: 'c4',
    name: '～ばかり',
    value: 25,
    unit: 'câu',
    why: 'Ý nghĩa chỉ toàn/vừa mới phụ thuộc mẫu câu.',
    example: '弟はゲームをしてばかりいる。',
    hint: 'Học theo cụm thay vì ghi nhớ một nghĩa cố định.',
  },
  {
    id: 'c5',
    name: '～わけではない',
    value: 21,
    unit: 'câu',
    why: 'Phủ định một phần, thường gắn bẫy sắc thái.',
    example: '嫌いなわけではありません。',
    hint: 'So sánh với ～わけがない và các kiểu phủ định mạnh.',
  },
];

const PAIRS: ConfusedPair[] = [
  {
    kind: 'grammar',
    a: '～ようにする',
    b: '～ことにする',
    n: 12,
    ex: '健康のために、毎朝走る（　）しています。',
    selected: 'ことに',
    correct: 'ように',
    diff: 'ようにする: cố gắng tạo thói quen. ことにする: tự quyết định thực hiện.',
    tip: 'Tìm ý nghĩa thói quen đang duy trì hay quyết định tại một thời điểm.',
  },
  {
    kind: 'grammar',
    a: '～そうだ',
    b: '～ようだ',
    n: 9,
    ex: '空が暗い。雨が降り（　）。',
    selected: 'ようだ',
    correct: 'そうだ',
    diff: 'そうだ biểu thị suy đoán trực tiếp từ dấu hiệu giác quan. ようだ diễn đạt suy luận dựa trên căn cứ.',
    tip: 'Xét cấu trúc kết hợp với động từ và ngữ cảnh quan sát.',
  },
  {
    kind: 'grammar',
    a: '～ために',
    b: '～ように',
    n: 8,
    ex: '日本語が話せる（　）、練習しています。',
    selected: 'ために',
    correct: 'ように',
    diff: 'ように thường gắn mục tiêu về khả năng/trạng thái; ために thường gắn hành động chủ đích.',
    tip: 'Xét động từ khả năng và chủ thể hành động.',
  },
  {
    kind: 'vocab',
    a: '確認（かくにん）',
    b: '確信（かくしん）',
    n: 6,
    ex: '予約の時間をもう一度（　）してください。',
    selected: '確信',
    correct: '確認',
    diff: '確認 là xác nhận, kiểm tra thông tin; 確信 là tin chắc, vững tin.',
    tip: 'Nhớ cụm 予定を確認する và ～と確信する.',
  },
  {
    kind: 'vocab',
    a: '変更（へんこう）',
    b: '交換（こうかん）',
    n: 5,
    ex: '会議の時間が（　）になりました。',
    selected: '交換',
    correct: '変更',
    diff: '変更 là thay đổi kế hoạch; 交換 là trao đổi hoặc đổi qua lại.',
    tip: 'Ghi nhớ với danh từ đi kèm (時間を変更する).',
  },
  {
    kind: 'kanji',
    a: '続ける（つづける）',
    b: '続く（つづく）',
    n: 4,
    ex: '先生は説明を（　）。',
    selected: '続く',
    correct: '続ける',
    diff: '続ける là ngoại động từ; 続く là nội động từ.',
    tip: 'Tìm xem chủ thể tác động lên đối tượng hay sự việc tự tiếp diễn.',
  },
];

const TRAPS: IntelligenceItem[] = [
  {
    id: 't1',
    name: 'Đáp án gần nghĩa',
    value: 28,
    unit: 'lượt',
    why: 'Hai lựa chọn gần nghĩa nhưng khác cấu trúc hoặc sắc thái.',
    example: '予定をもう一度（　）してください。',
    chosen: '相談',
    correct: '確認',
    hint: 'Đọc kỹ từ đi kèm thay vì chỉ dịch sang tiếng Việt.',
  },
  {
    id: 't2',
    name: 'Phủ định kép / một phần',
    value: 19,
    unit: 'lượt',
    why: 'Đọc thiếu phạm vi của phủ định.',
    example: '嫌いな（　）が、毎日は食べません。',
    chosen: 'わけがない',
    correct: 'わけではない',
    hint: 'Kiểm tra các từ ない・わけ・しかし và câu sau.',
  },
  {
    id: 't3',
    name: 'Thông tin gây nhiễu',
    value: 17,
    unit: 'lượt',
    why: 'Trong nghe/đọc, một chi tiết xuất hiện nhưng không phải đáp án cuối cùng.',
    example: 'Người nói đầu tiên chọn tàu, sau đổi sang xe buýt. Cuối cùng đi gì?',
    chosen: 'Tàu',
    correct: 'Xe buýt',
    hint: 'Tìm quyết định hoặc kết luận sau từ chuyển ý.',
  },
  {
    id: 't4',
    name: 'Đảo thứ tự thông tin',
    value: 13,
    unit: 'lượt',
    why: 'Thông tin xuất hiện không theo trật tự câu hỏi.',
    example: 'Văn bản nói kết luận trước, rồi mới trình bày nguyên nhân.',
    chosen: 'Ý đầu bài',
    correct: 'Kết luận có bằng chứng',
    hint: 'Ghép câu hỏi với từ khóa thay vì dò theo thứ tự xuất hiện.',
  },
  {
    id: 't5',
    name: 'Đáp án đúng một phần',
    value: 11,
    unit: 'lượt',
    why: 'Phương án chỉ khớp một phần văn bản.',
    example: 'Bài đọc nêu cả lợi ích lẫn hạn chế của học online.',
    chosen: 'Học online luôn tốt hơn',
    correct: 'Cần cân nhắc ưu và nhược điểm',
    hint: 'Tìm ý chính bao trùm toàn bộ đoạn.',
  },
];

const MASTERY_ITEMS = [
  {
    name: '～ようにする',
    status: 'Chưa ổn định',
    seen: 10,
    right: 3,
    newRight: 1,
    why: 'Từng làm đúng nhưng sai khi đổi câu và nhầm với ～ことにする.',
    tip: 'Luyện 8 câu mới xen kẽ hai mẫu, ôn lại sau 2 ngày.',
  },
  {
    name: '確認 / 確信',
    status: 'Chưa ổn định',
    seen: 8,
    right: 2,
    newRight: 1,
    why: 'Nhận biết nghĩa từ đơn nhưng sai khi đặt trong câu.',
    tip: 'Ôn kết hợp với các cụm từ đi kèm và kiểm tra sau 3 ngày.',
  },
  {
    name: '続ける / 続く',
    status: 'Chưa ổn định',
    seen: 11,
    right: 3,
    newRight: 1,
    why: 'Chưa vận dụng ổn định phân biệt nội/ngoại động từ.',
    tip: 'Viết cặp câu ví dụ rồi chọn đáp án trong văn cảnh mới.',
  },
  {
    name: '～ばかり',
    status: 'Đang hình thành',
    seen: 9,
    right: 5,
    newRight: 3,
    why: 'Đúng khi nhận biết nhưng chưa đều ở dạng ～てばかりいる.',
    tip: 'Luyện các nghĩa theo cấu trúc và ví dụ ngắn.',
  },
];

const TIMED_ITEMS = [
  {
    name: 'Đọc hiểu đoạn dài',
    min: 94,
    wrong: 16,
    why: 'Đọc lại nhiều lần nhưng vẫn bỏ qua ý chuyển đoạn.',
    tip: 'Luyện đọc câu hỏi trước, xác định luận điểm và giới hạn thời gian từng đoạn.',
  },
  {
    name: 'Sắp xếp câu',
    min: 61,
    wrong: 19,
    why: 'Tốn thời gian thử nhiều tổ hợp sai.',
    tip: 'Xác định cặp từ liên kết và phần bổ nghĩa trước khi sắp xếp.',
  },
  {
    name: 'Ngữ pháp ngữ cảnh',
    min: 43,
    wrong: 12,
    why: 'Mất thời gian so sánh đáp án gần nghĩa.',
    tip: 'Học các cặp dễ nhầm theo ví dụ đối chiếu.',
  },
  {
    name: 'Từ vựng',
    min: 28,
    wrong: 11,
    why: 'Chưa nhớ chính xác sắc thái và kết hợp từ.',
    tip: 'Ôn collocation kèm nghĩa ví dụ.',
  },
  {
    name: 'Kanji',
    min: 17,
    wrong: 9,
    why: 'Chậm khi quyết định âm đọc.',
    tip: 'Ôn theo từ ghép và âm đọc trong câu.',
  },
];

export interface AnalyticsMistakeIntelligenceProps {
  attempts?: AttemptRecord[];
  questionAttempts?: QuestionAttemptRecord[];
  level?: Level;
  realSkillStatsByLevel?: Record<string, Record<string, { wrong: number; total: number }>>;
  realCoverageByLevel?: Record<string, IntelligenceItem[]>;
  onOpenDetailModal: (title: string, content: React.ReactNode) => void;
}

export function AnalyticsMistakeIntelligence({
  attempts: _attempts = [],
  questionAttempts = [],
  level = 'N3',
  realSkillStatsByLevel,
  realCoverageByLevel,
  onOpenDetailModal,
}: AnalyticsMistakeIntelligenceProps): React.JSX.Element {
  const [pairFilter, setPairFilter] = useState<string>('all');

  const dynamicReasons = useMemo<IntelligenceItem[]>(() => {
    const targetLvl = level || 'N3';
    const lvlStats = realSkillStatsByLevel?.[targetLvl] || realSkillStatsByLevel?.['all'];

    if (lvlStats) {
      const gWrong = lvlStats.grammar?.wrong ?? 0;
      const rWrong = lvlStats.reading?.wrong ?? 0;
      const vWrong = lvlStats.vocabulary?.wrong ?? 0;
      const kWrong = lvlStats.kanji?.wrong ?? 0;
      const lWrong = lvlStats.listening?.wrong ?? 0;

      return [
        {
          id: 'r1',
          name: 'Nhầm mẫu câu & cấu trúc ngữ pháp',
          value: gWrong,
          unit: 'lượt',
          why: 'Nhận ra hai mẫu quen thuộc nhưng nhầm ngữ cảnh hoặc cách kết hợp động từ.',
          example: '毎日、日本語を話す（　）しています。',
          chosen: 'ことに',
          correct: 'ように',
          hint: '～ようにする nhấn mạnh cố gắng tạo thói quen; ～ことにする nhấn mạnh tự quyết định.',
        },
        {
          id: 'r2',
          name: 'Thiếu thời gian & áp lực đọc hiểu',
          value: rWrong,
          unit: 'lượt',
          why: 'Mất nhiều thời gian đọc tiểu tiết, không kịp nắm luận điểm chính của đoạn.',
          example: 'Đọc hiểu dài: câu cuối yêu cầu rút ra kết luận.',
          chosen: 'Không kịp trả lời',
          correct: 'Đọc ý chính trước khi chọn',
          hint: 'Tập quét câu hỏi, tìm từ nối chuyển ý và giới hạn thời gian theo dạng bài.',
        },
        {
          id: 'r3',
          name: 'Hiểu sai ngữ cảnh từ vựng',
          value: vWrong,
          unit: 'lượt',
          why: 'Hiểu nghĩa từ nhưng nhầm các từ đồng âm hoặc sắc thái kết hợp câu.',
          example: '雨が降った。（　）、試合は行われた。',
          chosen: 'だから',
          correct: 'しかし',
          hint: 'Hai mệnh đề trái ngược nhau nên cần liên từ chỉ sự tương phản.',
        },
        {
          id: 'r4',
          name: 'Chưa nhớ âm đọc & chữ Hán',
          value: kWrong,
          unit: 'lượt',
          why: 'Nhầm âm On/Kun hoặc mặt chữ có cấu tạo bộ thủ tương tự.',
          example: '仕事を続けます。「続けます」の読みは？',
          chosen: 'つきけます',
          correct: 'つづけます',
          hint: 'Ôn ngắt quãng theo từ ghép thường gặp, không chỉ nhớ chữ đứng đơn lẻ.',
        },
        {
          id: 'r5',
          name: 'Bẫy thông tin nghe hiểu',
          value: lWrong,
          unit: 'lượt',
          why: 'Bị phân tâm bởi thông tin nhiễu trước đáp án hoặc quyết định bị đổi ở cuối.',
          example: 'Người nói đổi ý đi xe buýt sau khi tính đi tàu.',
          chosen: 'Tàu điện',
          correct: 'Xe buýt',
          hint: 'Ghi chú quyết định cuối cùng, đặc biệt sau các từ nối chuyển hướng.',
        },
      ];
    }

    if (questionAttempts && questionAttempts.length > 0) {
      const gWrong = questionAttempts.filter((q) => q.skill === 'grammar' && !q.isCorrect).length;
      const rWrong = questionAttempts.filter((q) => q.skill === 'reading' && !q.isCorrect).length;
      const vWrong = questionAttempts.filter((q) => q.skill === 'vocabulary' && !q.isCorrect).length;
      const kWrong = questionAttempts.filter((q) => q.skill === 'kanji' && !q.isCorrect).length;
      const lWrong = questionAttempts.filter((q) => q.skill === 'listening' && !q.isCorrect).length;

      return [
        {
          id: 'r1',
          name: 'Nhầm mẫu câu & cấu trúc ngữ pháp',
          value: gWrong,
          unit: 'lượt',
          why: 'Nhận ra hai mẫu quen thuộc nhưng nhầm ngữ cảnh hoặc cách kết hợp động từ.',
          example: '毎日、日本語を話す（　）しています。',
          chosen: 'ことに',
          correct: 'ように',
          hint: '～ようにする nhấn mạnh cố gắng tạo thói quen; ～ことにする nhấn mạnh tự quyết định.',
        },
        {
          id: 'r2',
          name: 'Thiếu thời gian & áp lực đọc hiểu',
          value: rWrong,
          unit: 'lượt',
          why: 'Mất nhiều thời gian đọc tiểu tiết, không kịp nắm luận điểm chính của đoạn.',
          example: 'Đọc hiểu dài: câu cuối yêu cầu rút ra kết luận.',
          chosen: 'Không kịp trả lời',
          correct: 'Đọc ý chính trước khi chọn',
          hint: 'Tập quét câu hỏi, tìm từ nối chuyển ý và giới hạn thời gian theo dạng bài.',
        },
        {
          id: 'r3',
          name: 'Hiểu sai ngữ cảnh từ vựng',
          value: vWrong,
          unit: 'lượt',
          why: 'Hiểu nghĩa từ nhưng nhầm các từ đồng âm hoặc sắc thái kết hợp câu.',
          example: '雨が降った。（　）、試合は行われた。',
          chosen: 'だから',
          correct: 'しかし',
          hint: 'Hai mệnh đề trái ngược nhau nên cần liên từ chỉ sự tương phản.',
        },
        {
          id: 'r4',
          name: 'Chưa nhớ âm đọc & chữ Hán',
          value: kWrong,
          unit: 'lượt',
          why: 'Nhầm âm On/Kun hoặc mặt chữ có cấu tạo bộ thủ tương tự.',
          example: '仕事を続けます。「続けます」の読みは？',
          chosen: 'つきけます',
          correct: 'つづけます',
          hint: 'Ôn ngắt quãng theo từ ghép thường gặp, không chỉ nhớ chữ đứng đơn lẻ.',
        },
        {
          id: 'r5',
          name: 'Bẫy thông tin nghe hiểu',
          value: lWrong,
          unit: 'lượt',
          why: 'Bị phân tâm bởi thông tin nhiễu trước đáp án hoặc quyết định bị đổi ở cuối.',
          example: 'Người nói đổi ý đi xe buýt sau khi tính đi tàu.',
          chosen: 'Tàu điện',
          correct: 'Xe buýt',
          hint: 'Ghi chú quyết định cuối cùng, đặc biệt sau các từ nối chuyển hướng.',
        },
      ];
    }
    return REASONS;
  }, [realSkillStatsByLevel, level, questionAttempts]);

  const maxReasonValue = useMemo(() => {
    return Math.max(...dynamicReasons.map((r) => r.value), 1);
  }, [dynamicReasons]);

  const totalLevelWrong = useMemo(() => {
    return dynamicReasons.reduce((acc, r) => acc + r.value, 0);
  }, [dynamicReasons]);

  const currentCoverage = useMemo<IntelligenceItem[]>(() => {
    const targetLvl = level || 'N3';
    if (realCoverageByLevel && realCoverageByLevel[targetLvl] && realCoverageByLevel[targetLvl].length > 0) {
      return realCoverageByLevel[targetLvl];
    }
    return COVERAGE;
  }, [realCoverageByLevel, level]);

  const maxCoverageValue = useMemo(() => {
    return Math.max(...currentCoverage.map((c) => c.value), 1);
  }, [currentCoverage]);

  const filteredPairs = PAIRS.filter(
    (p) => pairFilter === 'all' || p.kind === pairFilter,
  );

  const totalLostMinutes = TIMED_ITEMS.reduce((sum, x) => sum + x.min, 0);
  const totalTimedWrongs = TIMED_ITEMS.reduce((sum, x) => sum + x.wrong, 0);

  const handleOpenItem = (item: IntelligenceItem) => {
    onOpenDetailModal(
      item.name,
      <div className="space-y-3 text-xs leading-relaxed">
        <p>
          <strong>{item.value} {item.unit}</strong> trong dữ liệu ghi nhận.
        </p>
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Nguyên nhân / Đặc điểm:</h4>
          <p className="text-slate-600 dark:text-slate-400">{item.why}</p>
        </div>
        {item.example && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
            <strong className="block text-slate-800 dark:text-slate-200">Câu hỏi minh họa:</strong>
            <p className="font-japanese text-sm text-slate-900 dark:text-slate-100">{item.example}</p>
            {item.chosen && (
              <p className="text-rose-600 dark:text-rose-400 font-semibold">
                Đã chọn: {item.chosen}
              </p>
            )}
            {item.correct && (
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Đáp án đúng: {item.correct}
              </p>
            )}
          </div>
        )}
        {item.hint && (
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Cách khắc phục:</h4>
            <p className="text-slate-600 dark:text-slate-400">{item.hint}</p>
          </div>
        )}
      </div>,
    );
  };

  const handleOpenPair = (pair: ConfusedPair) => {
    onOpenDetailModal(
      `${pair.a} ↔ ${pair.b}`,
      <div className="space-y-3 text-xs leading-relaxed">
        <p>
          Đã nhầm <strong>{pair.n} lượt</strong> trong bài luyện.
        </p>
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Phân biệt kiến thức:</h4>
          <p className="text-slate-600 dark:text-slate-400">{pair.diff}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
          <strong className="block text-slate-800 dark:text-slate-200">Câu minh họa:</strong>
          <p className="font-japanese text-sm text-slate-900 dark:text-slate-100">{pair.ex}</p>
          <p>
            Đã chọn: <span className="text-rose-600 dark:text-rose-400 font-bold">{pair.selected}</span> · Đáp án đúng:{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{pair.correct}</span>
          </p>
        </div>
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Mẹo nhận diện:</h4>
          <p className="text-slate-600 dark:text-slate-400">{pair.tip}</p>
        </div>
      </div>,
    );
  };

  return (
    <div id="mistake-intelligence" className="scroll-mt-20 space-y-6 mb-6">
      {/* Intro Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">
            MISTAKE INTELLIGENCE · 06 GÓC NHÌN MỚI
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1 mb-1.5">
            Hiểu sâu lỗi sai để cải thiện điểm JLPT
          </h2>
          <p className="text-xs text-indigo-100/80 max-w-2xl leading-relaxed">
            Không chỉ biết mình sai gì: tìm nguyên nhân, những cặp dễ nhầm, dạng bẫy, độ thành thạo, tác động của kiến thức và thời gian đang mất.
          </p>
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold border border-indigo-400/30 bg-white/10 shrink-0">
          Phân tích đa chiều
        </span>
      </div>

      {/* 6 Panels in Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 06: Vì sao tôi thường trả lời sai? */}
        <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  06 · Vì sao tôi thường trả lời sai?
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Phân tích lượt sai; chọn từng nguyên nhân để xem ví dụ
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                NGUYÊN NHÂN
              </Badge>
            </div>

            <div className="space-y-2">
              {dynamicReasons.map((r) => {
                const pct = Math.min(100, Math.round((r.value / maxReasonValue) * 100));
                return (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenItem(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenItem(r);
                      }
                    }}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs cursor-pointer transition-colors"
                  >
                    <span className="w-40 font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {r.name}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      {/* ui-allow-style: dynamic reason bar width */}
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full"
                        style={{ width: `${pct}%` }} /* ui-allow-style: dynamic reason bar width */
                      />
                    </div>
                    <span className="w-14 text-right font-bold text-slate-600 dark:text-slate-400 text-[11px] shrink-0">
                      {r.value} lượt
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border border-slate-100 dark:border-slate-800">
            Nguyên nhân phân loại từ cơ sở dữ liệu làm bài cấp độ {level} ({totalLevelWrong} câu sai thực tế).
          </p>
        </Card>

        {/* Panel 07: Kiến thức giải được nhiều câu hỏi */}
        <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  07 · Kiến thức giải được nhiều câu hỏi
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Số câu cần đến kiến thức để xác định đáp án
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                ĐỘ PHỦ
              </Badge>
            </div>

            <div className="space-y-2">
              {currentCoverage.map((c) => {
                const pct = Math.min(100, Math.round((c.value / maxCoverageValue) * 100));
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenItem(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenItem(c);
                      }
                    }}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs cursor-pointer transition-colors"
                  >
                    <span className="w-40 font-semibold text-slate-700 dark:text-slate-300 truncate" lang="ja">
                      {c.name}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      {/* ui-allow-style: dynamic coverage bar width */}
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                        style={{ width: `${pct}%` }} /* ui-allow-style: dynamic coverage bar width */
                      />
                    </div>
                    <span className="w-14 text-right font-bold text-slate-600 dark:text-slate-400 text-[11px] shrink-0">
                      {c.value} câu
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border border-slate-100 dark:border-slate-800">
            {currentCoverage[0]?.why ? `Bóc tách từ các đề thi ${level} trong lịch sử luyện thi.` : `Một câu hỏi có thể cần nhiều kiến thức.`} Số câu liên quan thể hiện độ phủ trọng tâm ôn luyện.
          </p>
        </Card>

        {/* Panel 08: Những cặp kiến thức dễ nhầm */}
        <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  08 · Những cặp kiến thức dễ nhầm
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Chọn một cặp để thấy khác biệt về nghĩa và cách dùng
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                DỄ NHẦM
              </Badge>
            </div>

            <div className="w-36 mb-3">
              <HeroSelect
                aria-label="Lọc nhóm cặp dễ nhầm"
                value={pairFilter}
                onChange={setPairFilter}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'grammar', label: 'Ngữ pháp' },
                  { value: 'vocab', label: 'Từ vựng' },
                  { value: 'kanji', label: 'Kanji' },
                ]}
                size="sm"
              />
            </div>

            <div className="space-y-2">
              {filteredPairs.map((pair, idx) => (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenPair(pair)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenPair(pair);
                    }
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-xs cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <strong className="block text-slate-900 dark:text-slate-100 truncate" lang="ja">
                      {pair.a} ↔ {pair.b}
                    </strong>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {pair.kind === 'grammar' ? 'Ngữ pháp' : pair.kind === 'kanji' ? 'Kanji' : 'Từ vựng'} · Bấm để xem cách phân biệt
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 block">
                      {pair.n}
                    </span>
                    <small className="text-[9px] text-slate-400 dark:text-slate-500">lượt nhầm</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border border-slate-100 dark:border-slate-800">
            Dữ liệu đối chiếu các cặp có lựa chọn nhầm lẫn thực tế trong bài thi.
          </p>
        </Card>

        {/* Panel 09: Dạng bẫy khiến tôi mất điểm */}
        <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  09 · Dạng bẫy khiến tôi mất điểm
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Đáp án nhiễu, phủ định và thông tin chuyển ý
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                BẪY ĐỀ THI
              </Badge>
            </div>

            <div className="space-y-2">
              {TRAPS.map((t) => {
                const pct = Math.min(100, Math.round((t.value / 28) * 100));
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenItem(t)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenItem(t);
                      }
                    }}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs cursor-pointer transition-colors"
                  >
                    <span className="w-40 font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {t.name}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      {/* ui-allow-style: dynamic trap bar width */}
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        style={{ width: `${pct}%` }} /* ui-allow-style: dynamic trap bar width */
                      />
                    </div>
                    <span className="w-14 text-right font-bold text-slate-600 dark:text-slate-400 text-[11px] shrink-0">
                      {t.value} lượt
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border border-slate-100 dark:border-slate-800">
            Mở từng dạng bẫy để xem một câu minh họa, cách nhận diện và chiến thuật tránh mắc lại.
          </p>
        </Card>

        {/* Panel 10: Đã học nhưng chưa thành thạo */}
        <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  10 · Đã học nhưng chưa thành thạo
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Phân biệt nhận biết, ghi nhớ và thực sự vận dụng được
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                THÀNH THẠO
              </Badge>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3 text-center">
              {[
                ['45', 'Chưa học'],
                ['80', 'Đã gặp'],
                ['65', 'Chưa ổn định'],
                ['110', 'Thành thạo'],
              ].map(([count, label], i) => (
                <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <strong className="block text-base font-extrabold text-slate-800 dark:text-slate-200">{count}</strong>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {MASTERY_ITEMS.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors"
                >
                  <div>
                    <strong className="block text-slate-900 dark:text-slate-100" lang="ja">{m.name}</strong>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Đã gặp {m.seen} lần · Đúng câu mới {m.newRight} lần
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border border-slate-100 dark:border-slate-800">
            "Chưa ổn định" là kiến thức có ít nhất 2 lần gặp, đã từng đúng nhưng còn sai ở câu mới hoặc sau khi ôn.
          </p>
        </Card>

        {/* Panel 11: Điểm yếu đang mất thời gian nhất */}
        <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  11 · Điểm yếu đang mất thời gian nhất
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Tổng thời gian dành cho câu trả lời sai
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                HIỆU SUẤT
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <strong className="block text-base font-extrabold text-slate-800 dark:text-slate-200">{totalLostMinutes}</strong>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Phút câu sai</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <strong className="block text-base font-extrabold text-slate-800 dark:text-slate-200">{totalTimedWrongs}</strong>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Lượt sai có đo</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <strong className="block text-base font-extrabold text-slate-800 dark:text-slate-200">5.9</strong>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Phút/câu đọc dài</span>
              </div>
            </div>

            <div className="space-y-2">
              {TIMED_ITEMS.map((t, idx) => {
                const pct = Math.min(100, Math.round((t.min / 94) * 100));
                return (
                  <div key={idx} className="flex items-center gap-2.5 p-1.5 text-xs">
                    <span className="w-36 font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {t.name}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      {/* ui-allow-style: dynamic time bar width */}
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        style={{ width: `${pct}%` }} /* ui-allow-style: dynamic trap bar width */
                      />
                    </div>
                    <span className="w-14 text-right font-bold text-slate-600 dark:text-slate-400 text-[11px] shrink-0">
                      {t.min} phút
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border border-slate-100 dark:border-slate-800">
            Tổng thời gian cao có thể do nhiều câu hoặc làm chậm. Xem thêm phút/câu để đánh giá công bằng.
          </p>
        </Card>
      </div>

      {/* 12 · Kết hợp 6 góc nhìn thành kế hoạch hành động (Wide Card) */}
      <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            12 · ĐỀ XUẤT CÁ NHÂN HÓA TỔNG HỢP
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
            Kết hợp 6 góc nhìn thành kế hoạch hành động
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Phát hiện điểm yếu có nhiều câu liên quan, sai do nhầm kiến thức và tiêu tốn nhiều thời gian
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/30 dark:to-slate-900 flex flex-col justify-between">
            <div>
              <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                Ưu tiên 1 · Phân biệt ～ようにする ↔ ～ことにする
              </strong>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                12 lượt nhầm · cùng nhóm ngữ pháp có độ phủ cao · nên học sự khác biệt về thói quen và quyết định rồi luyện câu mới chưa gặp.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenPair(PAIRS[0]!)}
              className="mt-3 self-start text-xs font-bold"
            >
              Xem kế hoạch →
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/30 dark:to-slate-900 flex flex-col justify-between">
            <div>
              <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                Ưu tiên 2 · Đọc hiểu đoạn dài và từ nối chuyển ý
              </strong>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                94 phút dành cho các câu trả lời sai · luyện xác định luận điểm, từ nối しかし và kết luận trong văn bản.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleOpenItem({
                  id: 'p2',
                  name: 'Đọc hiểu đoạn dài',
                  value: 94,
                  unit: 'phút',
                  why: 'Đọc chậm và hay bỏ sót luận điểm chính trong các đoạn văn dài có từ chuyển ý.',
                  hint: 'Tập đọc câu hỏi trước, xác định từ nối tương phản và kết luận.',
                })
              }
              className="mt-3 self-start text-xs font-bold"
            >
              Xem kế hoạch →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
