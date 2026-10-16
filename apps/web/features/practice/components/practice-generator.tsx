'use client';

import React, { useState } from 'react';
import type { Level, Skill, PracticePool } from '@jlpt/schema';
import type { PracticeFilterState, PracticeShortageInfo } from '../types';
import { INITIAL_PRACTICE_CONFIG } from '../types';
import { PracticeShortageNotice } from './practice-shortage-notice';
import { Button } from '@jlpt/ui';

export interface PracticeGeneratorProps {
  onGenerate: (config: PracticeFilterState) => Promise<void> | void;
  isGenerating?: boolean;
  shortage?: PracticeShortageInfo | null;
  onProceedWithShortage?: () => void;
  className?: string;
}

export function PracticeGenerator({
  onGenerate,
  isGenerating = false,
  shortage = null,
  onProceedWithShortage,
  className = '',
}: PracticeGeneratorProps): React.JSX.Element {
  const [config, setConfig] = useState<PracticeFilterState>(INITIAL_PRACTICE_CONFIG);

  const levels: Level[] = ['N1', 'N2', 'N3', 'N4', 'N5'];

  const pools: Array<{ id: PracticePool; label: string; desc: string; icon: string }> = [
    { id: 'unseen', label: 'Câu chưa làm', desc: 'Ưu tiên những câu hỏi bạn chưa từng gặp', icon: '✨' },
    { id: 'wrong', label: 'Câu đã làm sai', desc: 'Ôn lại các câu trả lời sai từ các bài thi trước', icon: '❌' },
    { id: 'marked', label: 'Câu đã lưu', desc: 'Luyện tập các câu bạn đã gắn cờ / đánh dấu nhớ', icon: '🔖' },
    { id: 'random', label: 'Ngẫu nhiên', desc: 'Trích xuất ngẫu nhiên từ toàn bộ kho đề', icon: '🎲' },
    { id: 'tagged', label: 'Theo chủ đề', desc: 'Luyện sâu các chủ đề ngữ pháp & từ vựng mục tiêu', icon: '🏷️' },
    { id: 'difficulty', label: 'Theo độ khó', desc: 'Thử thách với các câu hỏi phân hóa cao', icon: '⚡' },
  ];

  const skills: Array<{ id: Skill; label: string }> = [
    { id: 'kanji', label: 'Chữ Hán (Kanji)' },
    { id: 'vocabulary', label: 'Từ vựng (Vocab)' },
    { id: 'grammar', label: 'Ngữ pháp (Grammar)' },
    { id: 'reading', label: 'Đọc hiểu (Reading)' },
    { id: 'listening', label: 'Nghe hiểu (Listening)' },
  ];

  const toggleSkill = (skill: Skill) => {
    setConfig((prev) => {
      const exists = prev.skills.includes(skill);
      const nextSkills = exists
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return {
        ...prev,
        skills: nextSkills.length > 0 ? nextSkills : [skill], // Keep at least one
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(config);
  };

  return (
    <div
      data-testid="practice-generator-form"
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 ${className}`}
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Thiết lập chế độ luyện tập chuyên đề (PRA-10)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Chọn nguồn câu hỏi, kỹ năng và số lượng câu để tạo đề luyện tập tức thì có giải thích chi tiết.
        </p>
      </div>

      {shortage && (
        <PracticeShortageNotice
          shortage={shortage}
          onProceedWithAvailable={onProceedWithShortage}
          onAdjustFilters={() => {
            // Expand skills or switch pool
            setConfig((prev) => ({
              ...prev,
              skills: ['kanji', 'vocabulary', 'grammar', 'reading', 'listening'],
            }));
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Generator Pool Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Nguồn trích xuất câu hỏi (Practice Pool)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pools.map((p) => {
              const isSelected = config.pool === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`practice-pool-${p.id}`}
                  onClick={() => setConfig({ ...config, pool: p.id })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{p.icon}</span>
                    <strong className="text-xs font-bold">{p.label}</strong>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {p.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Level Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Cấp độ JLPT mục tiêu
          </label>
          <div className="flex flex-wrap gap-2">
            {levels.map((lvl) => {
              const isSelected = config.level === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  data-testid={`practice-level-${lvl}`}
                  onClick={() => setConfig({ ...config, level: lvl })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Skills Filter */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Kỹ năng cần luyện tập
          </label>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => {
              const isSelected = config.skills.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  data-testid={`practice-skill-${s.id}`}
                  onClick={() => toggleSkill(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Question Count and Time Limit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label
              htmlFor="practice-count-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Số lượng câu hỏi: <strong>{config.questionCount} câu</strong>
            </label>
            <input
              id="practice-count-input"
              type="range"
              min={5}
              max={30}
              step={5}
              value={config.questionCount}
              onChange={(e) =>
                setConfig({ ...config, questionCount: Number.parseInt(e.target.value, 10) })
              }
              data-testid="practice-question-count-slider"
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>5 câu</span>
              <span>15 câu</span>
              <span>30 câu</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="practice-time-select"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Giới hạn thời gian (tùy chọn)
            </label>
            <select
              id="practice-time-select"
              value={config.timeLimitSec || 0}
              onChange={(e) =>
                setConfig({
                  ...config,
                  timeLimitSec: Number.parseInt(e.target.value, 10) || undefined,
                })
              }
              data-testid="practice-time-limit-select"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={0}>Không giới hạn thời gian (Tự do ôn luyện)</option>
              <option value={600}>10 phút (Áp lực thời gian nhẹ)</option>
              <option value={1200}>20 phút (Chuẩn thi)</option>
              <option value={1800}>30 phút (Tập trung cao)</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isGenerating}
            data-testid="generate-practice-btn"
          >
            {isGenerating ? 'Đang trích xuất câu hỏi...' : '🚀 Bắt đầu luyện tập ngay'}
          </Button>
        </div>
      </form>
    </div>
  );
}
