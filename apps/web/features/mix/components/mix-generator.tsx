'use client';

import React, { useState } from 'react';
import { Dices, Scale, Target, Sparkles, Flame, RotateCcw, Sliders, Rocket } from 'lucide-react';
import type { Level, MixMode } from '@jlpt/schema';
import type { MixFormState, MixShortageInfo } from '../types';
import { INITIAL_MIX_CONFIG } from '../types';
import { MixShortageNotice } from './mix-shortage-notice';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';

export interface MixGeneratorProps {
  onGenerate: (config: MixFormState) => Promise<void> | void;
  isGenerating?: boolean;
  shortage?: MixShortageInfo | null;
  onProceedWithShortage?: () => void;
  className?: string;
}

export function MixGenerator({
  onGenerate,
  isGenerating = false,
  shortage = null,
  onProceedWithShortage,
  className = '',
}: MixGeneratorProps): React.JSX.Element {
  const [config, setConfig] = useState<MixFormState>(INITIAL_MIX_CONFIG);

  const levels: Level[] = ['N1', 'N2', 'N3', 'N4', 'N5'];

  // All 7 generator modes (Acceptance 1)
  const modes: Array<{ id: MixMode; label: string; desc: string; icon: React.ReactNode }> = [
    {
      id: 'Random',
      label: 'Ngẫu nhiên (Random)',
      desc: 'Trộn ngẫu nhiên câu hỏi theo đúng tỷ lệ các phần thi',
      icon: <Dices className="h-4 w-4 text-blue-500" aria-hidden="true" />,
    },
    {
      id: 'Balanced',
      label: 'Cân bằng (Balanced)',
      desc: 'Phân bổ đồng đều giữa các kỳ thi quá khứ và ngân hàng',
      icon: <Scale className="h-4 w-4 text-emerald-500" aria-hidden="true" />,
    },
    {
      id: 'Weakness',
      label: 'Điểm yếu (Weakness)',
      desc: 'Tập trung vào các kỹ năng và dạng câu bạn thường làm sai',
      icon: <Target className="h-4 w-4 text-rose-500" aria-hidden="true" />,
    },
    {
      id: 'Unseen',
      label: 'Câu mới (Unseen)',
      desc: 'Tuyệt đối chỉ lấy các câu bạn chưa từng làm để tránh lạm phát điểm',
      icon: <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />,
    },
    {
      id: 'Challenge',
      label: 'Thử thách (Challenge)',
      desc: 'Ưu tiên các câu hỏi có độ khó cao để bứt phá mục tiêu điểm số',
      icon: <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />,
    },
    {
      id: 'Revision',
      label: 'Ôn tập (Revision)',
      desc: 'Tổng hợp các câu hỏi cần ôn lại định kỳ theo chu kỳ trí nhớ',
      icon: <RotateCcw className="h-4 w-4 text-indigo-500" aria-hidden="true" />,
    },
    {
      id: 'Custom',
      label: 'Tùy chỉnh (Custom)',
      desc: 'Tự do tùy chỉnh tỷ lệ phần trăm từng nguồn và các dạng bài',
      icon: <Sliders className="h-4 w-4 text-slate-500" aria-hidden="true" />,
    },
  ];

  const availableSources = [
    { id: '2023-12', label: 'Đề thi chính thức 12/2023' },
    { id: '2024-07', label: 'Đề thi chính thức 07/2024' },
    { id: 'bank_official', label: 'Ngân hàng đề thi chuẩn JLPT Online' },
  ];

  const handleRandomizeSeed = () => {
    setConfig({
      ...config,
      seed: Math.floor(Math.random() * 1000000),
    });
  };

  const handleToggleSource = (sourceId: string) => {
    const exists = config.sourceSessions.includes(sourceId);
    let nextSources: string[];
    if (exists) {
      nextSources = config.sourceSessions.filter((s) => s !== sourceId);
      if (nextSources.length === 0) nextSources = [sourceId];
    } else {
      nextSources = [...config.sourceSessions, sourceId];
    }

    const equalWeight = Number((1 / nextSources.length).toFixed(2));
    const nextWeights: Record<string, number> = {};
    nextSources.forEach((s) => {
      nextWeights[s] = equalWeight;
    });

    setConfig({
      ...config,
      sourceSessions: nextSources,
      sourceWeights: nextWeights,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(config);
  };

  return (
    <div
      data-testid="mix-generator-form"
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 ${className}`}
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Công cụ sinh đề trộn thông minh (Mix Generator)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Tạo bộ đề thi chuẩn format với 7 chế độ thuật toán, đảm bảo tính bất biến của đề thi theo seed.
        </p>
      </div>

      {shortage && (
        <MixShortageNotice
          shortage={shortage}
          onProceedWithAvailable={onProceedWithShortage}
          onAutoBalance={() => {
            // Rebalance weights
            const equalWeight = Number((1 / config.sourceSessions.length).toFixed(2));
            const balancedWeights: Record<string, number> = {};
            config.sourceSessions.forEach((s) => {
              balancedWeights[s] = equalWeight;
            });
            setConfig((prev) => ({ ...prev, sourceWeights: balancedWeights, mode: 'Balanced' }));
          }}
          onIncludeMoreSources={() => {
            const allSrcs = availableSources.map((s) => s.id);
            const equalWeight = Number((1 / allSrcs.length).toFixed(2));
            const allWeights: Record<string, number> = {};
            allSrcs.forEach((s) => {
              allWeights[s] = equalWeight;
            });
            setConfig((prev) => ({ ...prev, sourceSessions: allSrcs, sourceWeights: allWeights }));
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Mode Selector (All 7 modes) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Chế độ trộn đề (Generator Mode - 7 Chế độ)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {modes.map((m) => {
              const isSelected = config.mode === m.id;
              return (
                <Button
                  key={m.id}
                  type="button"
                  variant="outline"
                  data-testid={`mix-mode-${m.id}`}
                  onClick={() => setConfig({ ...config, mode: m.id })}
                  className={`p-3.5 h-auto min-h-[64px] rounded-xl border text-left flex-col items-start justify-start whitespace-normal transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="shrink-0">{m.icon}</span>
                    <strong className="text-xs font-bold">{m.label}</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {m.desc}
                  </p>
                </Button>
              );
            })}
          </div>
        </div>

        {/* 2. Level Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Cấp độ JLPT
          </label>
          <div className="flex flex-wrap gap-2">
            {levels.map((lvl) => {
              const isSelected = config.level === lvl;
              return (
                <Button
                  key={lvl}
                  type="button"
                  size="sm"
                  variant={isSelected ? 'primary' : 'secondary'}
                  data-testid={`mix-level-${lvl}`}
                  onClick={() => setConfig({ ...config, level: lvl })}
                  className="px-4 py-2 text-xs font-bold"
                >
                  {lvl}
                </Button>
              );
            })}
          </div>
        </div>

        {/* 3. Source Selection & Ratios */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Nguồn đề trích xuất
          </label>
          <div className="space-y-2">
            {availableSources.map((src) => {
              const isChecked = config.sourceSessions.includes(src.id);
              return (
                <div
                  key={src.id}
                  className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <Input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSource(src.id)}
                      data-testid={`mix-source-checkbox-${src.id}`}
                      className="h-4 w-4 min-h-0 cursor-pointer rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{src.label}</span>
                  </label>

                  {isChecked && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 text-[11px]">Tỷ lệ:</span>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.sourceWeights[src.id] ?? 0.33}
                        onChange={(e) => {
                          const val = Number.parseFloat(e.target.value) || 0;
                          setConfig({
                            ...config,
                            sourceWeights: {
                              ...config.sourceWeights,
                              [src.id]: val,
                            },
                          });
                        }}
                        data-testid={`mix-source-weight-${src.id}`}
                        className="w-20 px-2 py-1 text-right font-mono min-h-[36px]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Seed and Blueprint Control */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label
              htmlFor="mix-seed-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Hạt giống cố định (Deterministic Seed):
            </label>
            <div className="flex gap-2">
              <Input
                id="mix-seed-input"
                type="number"
                value={config.seed ?? 42}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    seed: Number.parseInt(e.target.value, 10) || 0,
                  })
                }
                data-testid="mix-seed-input"
                className="w-full text-xs font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRandomizeSeed}
                data-testid="mix-random-seed-btn"
                className="inline-flex items-center gap-1.5"
              >
                <Dices className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Random</span>
              </Button>
            </div>
          </div>

          <div>
            <label
              htmlFor="mix-blueprint-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Phiên bản Blueprint cấu trúc đề:
            </label>
            <Input
              id="mix-blueprint-input"
              type="number"
              readOnly
              value={config.blueprintVersion}
              data-testid="mix-blueprint-version-input"
              className="w-full text-xs font-mono bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full inline-flex items-center justify-center gap-2"
            loading={isGenerating}
            data-testid="generate-mix-btn"
          >
            {isGenerating ? (
              <span>Đang chạy thuật toán trộn đề...</span>
            ) : (
              <>
                <Rocket className="h-4 w-4" aria-hidden="true" />
                <span>Tạo đề thi trộn ({config.mode})</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
