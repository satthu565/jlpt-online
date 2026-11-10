'use client';

import React, { useMemo } from 'react';
import { AlertCircle, ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import type { QuestionAttemptRecord, AttemptRecord } from '../types';
import type { Level } from '@jlpt/schema';

export interface ErrorItem {
  name: string;
  incorrect: number;
  total: number;
  reason: string;
  mondaiType?: string;
}

export const MONDAI_LABELS: Record<string, string> = {
  comprehension_long: 'Đọc hiểu đoạn dài',
  info_retrieval: 'Tìm kiếm thông tin',
  sentence_composition: 'Sắp xếp câu sao',
  summary: 'Nghe hiểu khái quát',
  contextual: 'Từ vựng theo ngữ cảnh',
  grammar_form: 'Hình thức ngữ pháp',
  text_grammar: 'Ngữ pháp đoạn văn',
  comprehension_short: 'Đọc hiểu đoạn ngắn',
  comprehension_mid: 'Đọc hiểu đoạn trung',
  thematic: 'Đọc hiểu chủ đề',
  integrated_reading: 'Đọc hiểu tổng hợp',
  kanji_reading: 'Cách đọc Hán tự',
  orthography: 'Cách viết chữ Hán',
  word_formation: 'Cấu tạo từ',
  paraphrase: 'Từ đồng nghĩa / Cách nói tương đương',
  usage: 'Cách dùng từ trong câu',
  task_based: 'Nghe hiểu nhiệm vụ',
  point: 'Nghe hiểu điểm then chốt',
  utterance: 'Phát ngôn biểu đạt',
  quick_response: 'Phản xạ nhanh',
  integrated_listening: 'Nghe hiểu tích hợp',
};

export const MONDAI_DIAGNOSTIC_REASONS: Record<string, string> = {
  comprehension_long: 'Đọc chậm, bỏ qua từ nối và câu kết luận',
  info_retrieval: 'Không xác định đúng điều kiện trong bảng / thông báo',
  sentence_composition: 'Nhầm quan hệ bổ nghĩa và vị trí trợ từ',
  summary: 'Bỏ lỡ ý chính hoặc ý trái chiều',
  contextual: 'Nhầm các từ có nghĩa gần nhau',
  grammar_form: 'Nhầm cấu trúc tương đương hoặc điều kiện chia động từ',
  text_grammar: 'Mất liên kết mạch văn giữa các đoạn',
  comprehension_short: 'Đọc lướt vội, hiểu sai tiểu tiết câu hỏi',
  comprehension_mid: 'Bị phân vân giữa hai phương án đối lập trong bài',
  thematic: 'Không nắm bắt được quan điểm then chốt của tác giả',
  integrated_reading: 'Khó so sánh điểm tương đồng và dị biệt giữa hai văn bản',
  kanji_reading: 'Nhầm âm On/Kun hoặc trường âm',
  orthography: 'Nhầm bộ thủ hoặc chữ có nét tương tự',
  word_formation: 'Chưa nhớ tiền tố / hậu tố tạo từ ghép',
  paraphrase: 'Chưa nắm chắc từ đồng nghĩa tương đương',
  usage: 'Dùng từ sai văn cảnh hoặc kết hợp từ không tự nhiên',
  task_based: 'Không ghi nhớ hành động ưu tiên cần thực hiện trước',
  point: 'Bị phân tâm bởi thông tin nhiễu trước đáp án',
  utterance: 'Nhầm tình huống giao tiếp và vị thế người nói',
  quick_response: 'Phản xạ chậm hoặc nhầm ngữ điệu, kính ngữ',
  integrated_listening: 'Khó tổng hợp thông tin đa chiều từ nhiều nhân vật',
};

export const SKILL_DIAGNOSTIC_REASONS: Record<string, string> = {
  vocabulary: 'Nhầm sắc thái từ ngữ hoặc cách dùng trong ngữ cảnh',
  kanji: 'Nhầm âm On/Kun hoặc mặt chữ có cấu tạo tương tự',
  grammar: 'Bẫy ngữ pháp tương tự hoặc quy tắc kết hợp câu',
  reading: 'Áp lực thời gian đọc hiểu và bỏ sót từ khóa then chốt',
  listening: 'Bẫy thông tin đảo ngược ở đoạn kết hoặc từ nối đối lập',
};

export const REASON_LABELS: Record<string, string> = {
  grammar_trap: 'Thiếu kiến thức từ / mẫu câu',
  vocab_nuance: 'Hiểu sai ngữ cảnh, phủ định',
  time_pressure: 'Không kịp thời gian',
  kanji_confusion: 'Nhầm lựa chọn gần nghĩa',
  listening_distractor: 'Bẫy thông tin nghe hiểu',
  other: 'Chưa xác định được',
};

export interface AnalyticsErrorAnalysisProps {
  attempts?: AttemptRecord[];
  questionAttempts?: QuestionAttemptRecord[];
  errorTypes?: ErrorItem[];
  errorReasons?: [string, number][];
  level?: Level;
  scopeFirstOnly?: boolean;
  /** Real answered / wrong counts per mondai type of the signed-in user (current level). */
  mondaiStats?: Record<string, { wrong: number; total: number }>;
  onOpenStudyModal: (mode: string, param?: string) => void;
}

export function AnalyticsErrorAnalysis({
  attempts = [],
  questionAttempts = [],
  errorTypes,
  errorReasons,
  level: _level = 'N3',
  scopeFirstOnly = true,
  mondaiStats,
  onOpenStudyModal,
}: AnalyticsErrorAnalysisProps): React.JSX.Element {
  // Check if user has submitted attempts
  const submittedAttempts = useMemo(() => {
    return (attempts || []).filter((a) => a.status === 'submitted' || (a.status === undefined && Boolean(a.submittedAt)));
  }, [attempts]);

  const hasSubmittedAttempts = submittedAttempts.length > 0;
  const hasQuestionAttempts = questionAttempts && questionAttempts.length > 0;
  const hasMondaiStats = Boolean(mondaiStats && Object.values(mondaiStats).some((v) => v.total > 0));
  const hasNoData = !hasQuestionAttempts && !hasSubmittedAttempts && !hasMondaiStats;

  // Filter attempts based on scope (first attempt encounter vs all)
  const relevantAttempts = useMemo(() => {
    if (!hasQuestionAttempts) return [];
    if (scopeFirstOnly) {
      const firstOnly = questionAttempts.filter((q) => q.exposureCount === 0);
      return firstOnly.length > 0 ? firstOnly : questionAttempts;
    }
    return questionAttempts;
  }, [questionAttempts, hasQuestionAttempts, scopeFirstOnly]);

  const allCorrect = hasQuestionAttempts && relevantAttempts.length > 0 && relevantAttempts.every((q) => q.isCorrect);

  // Compute real error types grouped by mondaiType / skill
  const computedErrorTypes = useMemo<ErrorItem[]>(() => {
    if (errorTypes && errorTypes.length > 0) return errorTypes;

    // 1. Direct from question attempts
    if (hasQuestionAttempts && relevantAttempts.length > 0) {
      const map = new Map<string, { name: string; incorrect: number; total: number; reason: string; mondaiType?: string }>();

      relevantAttempts.forEach((q) => {
        const key = q.mondaiType || q.skill;
        if (!key) return;

        const current = map.get(key) || {
          name: MONDAI_LABELS[key] || (q.skill ? `Kỹ năng: ${q.skill}` : key),
          incorrect: 0,
          total: 0,
          reason: MONDAI_DIAGNOSTIC_REASONS[key] || SKILL_DIAGNOSTIC_REASONS[q.skill] || 'Cần củng cố phương pháp giải dạng bài này',
          mondaiType: q.mondaiType,
        };

        current.total += 1;
        if (!q.isCorrect) {
          current.incorrect += 1;
        }
        map.set(key, current);
      });

      const list = Array.from(map.values())
        .filter((item) => item.incorrect > 0)
        .sort((a, b) => {
          if (b.incorrect !== a.incorrect) {
            return b.incorrect - a.incorrect;
          }
          const pctA = a.incorrect / a.total;
          const pctB = b.incorrect / b.total;
          return pctB - pctA;
        })
        .slice(0, 5);

      if (list.length > 0) return list;
    }

    // 2. Real per-mondai counts from the learner's submitted answers
    if (mondaiStats) {
      const items: ErrorItem[] = Object.entries(mondaiStats)
        .filter(([, v]) => v.wrong > 0)
        .map(([key, v]) => ({
          name: MONDAI_LABELS[key] || key,
          total: v.total,
          incorrect: v.wrong,
          reason: MONDAI_DIAGNOSTIC_REASONS[key] || 'Cần củng cố phương pháp giải dạng bài này',
          mondaiType: key,
        }))
        .sort((x, y) => y.incorrect - x.incorrect || y.incorrect / y.total - x.incorrect / x.total)
        .slice(0, 5);
      if (items.length > 0) return items;
    }

    return [];
  }, [hasQuestionAttempts, relevantAttempts, mondaiStats, errorTypes]);

  // Compute real error reasons from question attempts or submitted attempts
  const computedReasons = useMemo<[string, number][]>(() => {
    if (errorReasons && errorReasons.length > 0) return errorReasons;

    // 1. Direct from question attempts
    if (hasQuestionAttempts && relevantAttempts.length > 0) {
      const wrongQuestions = relevantAttempts.filter((q) => !q.isCorrect);
      if (wrongQuestions.length > 0) {
        const counts: Record<string, number> = {};
        wrongQuestions.forEach((q) => {
          const cat = q.errorCategory || 'other';
          counts[cat] = (counts[cat] || 0) + 1;
        });

        const entries = Object.entries(counts).map(([cat, count]) => {
          const label = REASON_LABELS[cat] || cat;
          const pct = Math.round((count / wrongQuestions.length) * 100);
          return [label, pct] as [string, number];
        });

        return entries.sort((a, b) => b[1] - a[1]);
      }
    }

    return [];
  }, [hasQuestionAttempts, relevantAttempts, errorReasons]);

  const maxReasonPct = useMemo(() => {
    if (computedReasons.length === 0) return 100;
    return Math.max(...computedReasons.map(([, p]) => p), 1);
  }, [computedReasons]);

  return (
    <section id="error-analysis" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Left Card: Tôi thường sai ở đâu? */}
      <Card className="lg:col-span-7 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                04 · Tôi thường sai ở đâu?
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Những dạng câu có nhiều lỗi nhất trong bài làm của bạn
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {scopeFirstOnly ? 'Lần làm đầu' : 'Tất cả lần làm'}
            </Badge>
          </div>

          {hasNoData ? (
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3">
              <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <BookOpen className="size-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Chưa có dữ liệu câu sai để phân tích
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Hệ thống sẽ tự động bóc tách các dạng câu hỏi bạn hay mắc lỗi nhất (đọc hiểu, bẫy ngữ pháp, tìm kiếm thông tin...) ngay khi bạn hoàn thành bài thi đầu tiên.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenStudyModal('practice')}
                className="mt-2 text-xs"
              >
                Làm đề thi thử ngay
              </Button>
            </div>
          ) : allCorrect ? (
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3">
              <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Không có câu sai trong các lượt làm bài gần đây
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Tuyệt vời! Toàn bộ câu hỏi bạn đã làm đều trả lời chính xác. Hãy tiếp tục thử sức với các bài thi đầy đủ.
              </p>
            </div>
          ) : (
            <div className="space-y-4 my-2">
              {computedErrorTypes.map((e, i) => {
                const pct = e.total > 0 ? Math.round((e.incorrect / e.total) * 100) : 0;
                const isHigh = pct > 55;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="font-bold text-slate-800 dark:text-slate-200">{e.name}</strong>
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        {pct}% sai · {e.incorrect}/{e.total} câu
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isHigh ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${pct}%` }} /* ui-allow-style: dynamic error rate progress bar */
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{e.reason}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenStudyModal('error', e.name)}
                      className="h-auto p-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                    >
                      Xem nguyên nhân và luyện tập →
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <AlertCircle className="size-3.5 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
          <span>
            Tỷ lệ sai cần được đọc cùng số lượng câu đã làm; không kết luận vội từ một nhóm có quá ít câu.
          </span>
        </div>
      </Card>

      {/* Right Card: Vì sao tôi thường sai? */}
      <Card className="lg:col-span-5 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Vì sao tôi thường sai?
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Phân loại nguyên nhân từ bước xem lại bài làm
            </p>
          </div>

          {computedReasons.length === 0 ? (
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3">
              <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <AlertCircle className="size-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Chưa ghi nhận nguyên nhân câu sai
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Sau khi xem lại lời giải chi tiết của bài làm, bạn có thể tự đánh dấu nguyên nhân (do thiếu kiến thức, bẫy ngữ pháp hay áp lực thời gian) để xây dựng biểu đồ phân loại.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 my-2">
              {computedReasons.map(([name, p], idx) => {
                const widthPct = Math.min(100, Math.round((p / maxReasonPct) * 100));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{p}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full"
                        style={{ width: `${widthPct}%` }} /* ui-allow-style: dynamic reason track width */
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong className="text-slate-800 dark:text-slate-200 block mb-1">
              Gợi ý cách ghi nhận nguyên nhân:
            </strong>
            Sau khi xem lời giải, người học tự chọn lý do sai; hệ thống có thể gợi ý nhưng không khẳng định nguyên nhân chỉ từ đúng/sai thuần túy.
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => onOpenStudyModal('review')}
          className="w-full justify-center mt-4"
          disabled={hasNoData || allCorrect}
        >
          Ôn lại câu sai
          <ArrowRight className="size-4 inline ml-1.5" aria-hidden="true" />
        </Button>
      </Card>
    </section>
  );
}
