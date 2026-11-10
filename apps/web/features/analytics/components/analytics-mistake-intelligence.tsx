'use client';

import { MONDAI_LABELS } from './analytics-error-analysis';
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

export interface AnalyticsMistakeIntelligenceProps {
  attempts?: AttemptRecord[];
  questionAttempts?: QuestionAttemptRecord[];
  level?: Level;
  realSkillStatsByLevel?: Record<string, Record<string, { wrong: number; total: number }>>;
  realCoverageByLevel?: Record<string, IntelligenceItem[]>;
  realPairsByLevel?: Record<string, ConfusedPair[]>;
  realMasteryByLevel?: Record<string, MasterySummary>;
  realMondaiStatsByLevel?: Record<string, Record<string, { wrong: number; total: number }>>;
  onOpenDetailModal: (title: string, content: React.ReactNode) => void;
}

export interface MasteryItem {
  name: string;
  status: string;
  seen: number;
  right: number;
  newRight: number;
  why: string;
  tip: string;
}

export interface MasterySummary {
  unlearned: number;
  encountered: number;
  unstable: number;
  mastered: number;
  items: MasteryItem[];
}

export function AnalyticsMistakeIntelligence({
  attempts: _attempts = [],
  questionAttempts = [],
  level = 'N3',
  realSkillStatsByLevel,
  realCoverageByLevel,
  realPairsByLevel,
  realMasteryByLevel,
  realMondaiStatsByLevel,
  onOpenDetailModal,
}: AnalyticsMistakeIntelligenceProps): React.JSX.Element {
  const [pairFilter, setPairFilter] = useState<string>('all');

  const dynamicReasons = useMemo<IntelligenceItem[]>(() => {
    const targetLvl = level || 'N3';
    const lvlStats = realSkillStatsByLevel?.[targetLvl];
    if (!lvlStats) return [];

    const rows: Array<[string, string, number]> = [
      ['r-grammar', 'Ngữ pháp', lvlStats.grammar?.wrong ?? 0],
      ['r-vocab', 'Từ vựng', lvlStats.vocabulary?.wrong ?? 0],
      ['r-kanji', 'Chữ Hán', lvlStats.kanji?.wrong ?? 0],
      ['r-reading', 'Đọc hiểu', lvlStats.reading?.wrong ?? 0],
      ['r-listening', 'Nghe hiểu', lvlStats.listening?.wrong ?? 0],
    ];
    return rows
      .filter(([, , wrong]) => wrong > 0)
      .map(([id, name, wrong]) => {
        const total = lvlStats[id === 'r-vocab' ? 'vocabulary' : id.replace('r-', '')]?.total ?? 0;
        return {
          id,
          name,
          value: wrong,
          unit: 'lượt',
          why: `Bạn đã trả lời sai ${wrong}/${total} câu ${name.toLowerCase()} ở cấp độ ${targetLvl}.`,
          hint: 'Xem lại các câu sai trong bộ sưu tập lỗi sai để biết cụ thể kiến thức bị nhầm.',
        };
      })
      .sort((x, y) => y.value - x.value);
  }, [realSkillStatsByLevel, level]);

  const maxReasonValue = useMemo(() => {
    return Math.max(...dynamicReasons.map((r) => r.value), 1);
  }, [dynamicReasons]);

  const totalLevelWrong = useMemo(() => {
    return dynamicReasons.reduce((acc, r) => acc + r.value, 0);
  }, [dynamicReasons]);

  const currentCoverage = useMemo<IntelligenceItem[]>(() => {
    const targetLvl = level || 'N3';
    return realCoverageByLevel?.[targetLvl] ?? [];
  }, [realCoverageByLevel, level]);

  const maxCoverageValue = useMemo(() => {
    return Math.max(...currentCoverage.map((c) => c.value), 1);
  }, [currentCoverage]);

  const currentPairs = useMemo<ConfusedPair[]>(() => {
    const targetLvl = level || 'N3';
    return realPairsByLevel?.[targetLvl] ?? [];
  }, [realPairsByLevel, level]);

  const filteredPairs = useMemo(() => {
    if (pairFilter === 'all') return currentPairs;
    return currentPairs.filter((p) => p.kind === pairFilter);
  }, [currentPairs, pairFilter]);

  const realMastery = realMasteryByLevel?.[level || 'N3'];
  const hasMastery = Boolean(realMastery);
  const currentMastery: MasterySummary = realMastery ?? {
    unlearned: 0,
    encountered: 0,
    unstable: 0,
    mastered: 0,
    items: [],
  };
  const fmtMastery = (n: number): string => (hasMastery ? Number(n).toLocaleString('vi-VN') : '—');

  const handleOpenItem = (item: IntelligenceItem) => {
    onOpenDetailModal(
      item.name,
      <div className="space-y-3 text-xs leading-relaxed">
        <p>
          <strong>{item.value} {item.unit}</strong> trong dữ liệu ghi nhận.
        </p>
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Chi tiết:</h4>
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

  const topKnowledgePriority = useMemo(() => {
    const topPair = currentPairs && currentPairs.length > 0 ? currentPairs[0] : null;
    if (topPair) {
      const kindLabel = topPair.kind === 'grammar' ? 'Ngữ pháp' : topPair.kind === 'kanji' ? 'Kanji' : 'Từ vựng';
      return {
        title: `Ưu tiên 1 · Phân biệt ${topPair.a} ↔ ${topPair.b}`,
        description: `${topPair.n} lượt nhầm lẫn · Nhóm ${kindLabel} cấp độ ${level} · ${topPair.diff || topPair.tip}`,
        onClick: () => handleOpenPair(topPair),
      };
    }
    const topMastery = currentMastery.items && currentMastery.items.length > 0 ? currentMastery.items[0] : null;
    if (topMastery) {
      return {
        title: `Ưu tiên 1 · Củng cố ${topMastery.name}`,
        description: `Đã làm ${topMastery.seen} lần trong các đề thi ${level} · ${topMastery.why} · ${topMastery.tip}`,
        onClick: () => {
          onOpenDetailModal(
            topMastery.name,
            <div className="space-y-3 text-xs leading-relaxed">
              <p>
                Đã làm trong đề thi: <strong>{topMastery.seen} lần</strong>. Trạng thái: <strong>{topMastery.status}</strong>.
              </p>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Nội dung / Dịch nghĩa:</h4>
                <p className="text-slate-600 dark:text-slate-400">{topMastery.why}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Chiến thuật làm bài:</h4>
                <p className="text-slate-600 dark:text-slate-400">{topMastery.tip}</p>
              </div>
            </div>,
          );
        },
      };
    }
    return {
      title: 'Ưu tiên 1 · Củng cố kiến thức ngữ pháp & từ vựng',
      description: `Rà soát các mẫu câu hay nhầm lẫn trong các đề thi ${level}.`,
      onClick: () => {},
    };
  }, [currentPairs, currentMastery, level]);

  const topWeakMondaiPriority = useMemo(() => {
    const stats = realMondaiStatsByLevel?.[level || 'N3'] ?? {};
    const worst = Object.entries(stats)
      .filter(([, v]) => v.total >= 5 && v.wrong > 0)
      .sort((x, y) => y[1].wrong / y[1].total - x[1].wrong / x[1].total)[0];
    if (worst) {
      const [type, v] = worst;
      const label = MONDAI_LABELS[type] || type;
      const pct = Math.round((v.wrong / v.total) * 100);
      return {
        title: `Ưu tiên 2 · Luyện dạng "${label}"`,
        description: `Bạn sai ${v.wrong}/${v.total} câu (${pct}%) ở dạng này ở cấp độ ${level}.`,
        onClick: () => {
          onOpenDetailModal(
            label,
            <div className="space-y-3 text-xs leading-relaxed">
              <p>
                Đã làm <strong>{v.total} câu</strong>, sai <strong>{v.wrong} câu</strong> ({pct}%) ở cấp độ {level}.
              </p>
            </div>,
          );
        },
      };
    }
    return {
      title: 'Ưu tiên 2 · Chưa đủ dữ liệu',
      description: `Cần thêm bài đã nộp ở cấp độ ${level} để xác định dạng câu nên luyện trước.`,
      onClick: () => {},
    };
  }, [realMondaiStatsByLevel, level, onOpenDetailModal]);

  return (
    <div id="mistake-intelligence" className="scroll-mt-20 space-y-6 mb-6">
      {/* Intro Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">
            MISTAKE INTELLIGENCE · 04 GÓC NHÌN
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1 mb-1.5">
            Hiểu sâu lỗi sai để cải thiện điểm JLPT
          </h2>
          <p className="text-xs text-indigo-100/80 max-w-2xl leading-relaxed">
            Không chỉ biết mình sai gì: kỹ năng sai nhiều, kiến thức xuất hiện nhiều trong đề, những cặp dễ nhầm và độ thành thạo.
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
                  06 · Tôi sai nhiều ở kỹ năng nào?
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Số lượt sai theo kỹ năng, tính từ các bài đã nộp
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                KỸ NĂNG
              </Badge>
            </div>

            {dynamicReasons.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">Chưa có dữ liệu từ các bài đã nộp ở cấp độ {level}.</p>
            )}
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
            Tổng hợp từ các bài đã nộp ở cấp độ {level} ({totalLevelWrong} lượt sai). Hệ thống chưa ghi nhận lý do sai do người học chọn.
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

            {currentCoverage.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">Chưa có dữ liệu từ các bài đã nộp ở cấp độ {level}.</p>
            )}
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

            {filteredPairs.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">Chưa có dữ liệu từ các bài đã nộp ở cấp độ {level}.</p>
            )}
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
            Mỗi cặp là đáp án đúng ↔ phương án bạn đã chọn sai trong các bài đã nộp ở cấp độ {level}.
          </p>
        </Card>

        {/* Panel 09: Đã học nhưng chưa thành thạo */}
        <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  09 · Đã học nhưng chưa thành thạo
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
                [fmtMastery(currentMastery.unlearned), 'Chưa học'],
                [fmtMastery(currentMastery.encountered), 'Đã gặp'],
                [fmtMastery(currentMastery.unstable), 'Chưa ổn định'],
                [fmtMastery(currentMastery.mastered), 'Thành thạo'],
              ].map(([count, label], i) => (
                <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <strong className="block text-base font-extrabold text-slate-800 dark:text-slate-200">{count}</strong>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {currentMastery.items.map((m, idx) => (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onOpenDetailModal(
                      m.name,
                      <div className="space-y-3 text-xs leading-relaxed">
                        <p>
                          Đã làm trong đề thi: <strong>{m.seen} lần</strong> (Đúng: <strong>{m.right}/{m.seen}</strong>). Trạng thái: <strong>{m.status}</strong>.
                        </p>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Nội dung / Dịch nghĩa:</h4>
                          <p className="text-slate-600 dark:text-slate-400">{m.why}</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Chiến thuật làm bài & ghi nhớ:</h4>
                          <p className="text-slate-600 dark:text-slate-400">{m.tip}</p>
                        </div>
                      </div>
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenDetailModal(
                        m.name,
                        <div className="space-y-3 text-xs leading-relaxed">
                          <p>
                            Đã làm trong đề thi: <strong>{m.seen} lần</strong> (Đúng: <strong>{m.right}/{m.seen}</strong>). Trạng thái: <strong>{m.status}</strong>.
                          </p>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Nội dung / Dịch nghĩa:</h4>
                            <p className="text-slate-600 dark:text-slate-400">{m.why}</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Chiến thuật làm bài & ghi nhớ:</h4>
                            <p className="text-slate-600 dark:text-slate-400">{m.tip}</p>
                          </div>
                        </div>
                      );
                    }
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <strong className="block text-slate-900 dark:text-slate-100 truncate" lang="ja">{m.name}</strong>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Đã gặp {m.seen} lần · Đúng {m.right}/{m.seen} lần
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    m.status === 'Thành thạo'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : m.status === 'Đang hình thành'
                      ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border border-slate-100 dark:border-slate-800">
            {hasMastery ? `Tính từ các bài đã nộp ở cấp độ ${level} (${fmtMastery(currentMastery.encountered)} câu đã gặp).` : `Chưa có bài đã nộp ở cấp độ ${level}.`}
          </p>
        </Card>

      </div>

      {/* 12 · Kết hợp các góc nhìn thành kế hoạch hành động (Wide Card) */}
      <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            10 · ĐỀ XUẤT CÁ NHÂN HÓA TỔNG HỢP
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
            Kết hợp các góc nhìn thành kế hoạch hành động ({level})
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Dựa trên các cặp dễ nhầm, kiến thức chưa vững và dạng câu có tỷ lệ sai cao
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/30 dark:to-slate-900 flex flex-col justify-between">
            <div>
              <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                {topKnowledgePriority.title}
              </strong>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {topKnowledgePriority.description}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={topKnowledgePriority.onClick}
              className="mt-3 self-start text-xs font-bold"
            >
              Xem kế hoạch →
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/30 dark:to-slate-900 flex flex-col justify-between">
            <div>
              <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                {topWeakMondaiPriority.title}
              </strong>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {topWeakMondaiPriority.description}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={topWeakMondaiPriority.onClick}
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
