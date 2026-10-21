'use client';

import React, { useState } from 'react';
import type { Level, AttemptMode } from '@jlpt/schema';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';

export type ExamPickerExam = {
  id?: string;
  examId?: string;
  slug?: string;
  title: string;
  level: Level;
  kind: string;
  totalQuestions: number;
  sections: Array<{ title: string; durationSec: number; code?: string; questionRange?: [number, number] }>;
  guestTrial?: boolean;
};

export interface ExamPickerProps {
  exams: ExamPickerExam[];
  onSelectExam: (exam: ExamPickerExam, mode: AttemptMode) => void;
  className?: string;
  loading?: boolean;
}

export function ExamPicker({
  exams,
  onSelectExam,
  className = '',
  loading = false,
}: ExamPickerProps): React.JSX.Element {
  const [selectedLevel, setSelectedLevel] = useState<Level | 'ALL'>('ALL');
  const [selectedMode, setSelectedMode] = useState<AttemptMode>('real');

  const levels: Array<Level | 'ALL'> = ['ALL', 'N1', 'N2', 'N3', 'N4', 'N5'];

  const filteredExams = exams.filter((ex) => {
    // An exam with no questions (for example an empty generated mix) cannot be taken.
    if (!(ex.totalQuestions > 0)) return false;
    if (selectedLevel === 'ALL') return true;
    return ex.level === selectedLevel;
  });

  return (
    <div className={`jlpt-exam-picker space-y-6 ${className}`}>
      {/* EXAM-02: Mode Selector */}
      <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-5">
        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
          1. Chọn chế độ làm bài thi
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="radiogroup" aria-label="Chế độ thi">
          <div
            role="radio"
            aria-checked={selectedMode === 'real'}
            tabIndex={0}
            onClick={() => setSelectedMode('real')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
              selectedMode === 'real'
                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full border-2 ${selectedMode === 'real' ? 'border-blue-600 bg-blue-600' : 'border-slate-400'}`} />
                Thi thật (Chuẩn JLPT)
              </span>
              <Badge variant="primary">Khuyên dùng</Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-5">
              Giới hạn thời gian nghiêm ngặt theo quy chuẩn từng phần thi. Tự động nộp bài khi hết giờ. Không xem giải thích hay đáp án khi đang thi. Kết quả tính vào thống kê chính thức.
            </p>
          </div>

          <div
            role="radio"
            aria-checked={selectedMode === 'practice'}
            tabIndex={0}
            onClick={() => setSelectedMode('practice')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
              selectedMode === 'practice'
                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full border-2 ${selectedMode === 'practice' ? 'border-blue-600 bg-blue-600' : 'border-slate-400'}`} />
                Luyện tập tự do
              </span>
              <Badge variant="neutral">Linh hoạt</Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-5">
              Thời gian linh hoạt, không áp lực. Thích hợp để rèn luyện kỹ năng hoặc làm bài từng phần mà không ảnh hưởng tới chỉ số xếp hạng chính thức.
            </p>
          </div>
        </div>
      </div>

      {/* EXAM-01: Level filter and Exam Selection */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
            2. Chọn đề thi từ danh sách
          </label>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {levels.map((lvl) => (
              <Button
                key={lvl}
                type="button"
                size="sm"
                variant={selectedLevel === lvl ? 'primary' : 'ghost'}
                onClick={() => setSelectedLevel(lvl)}
                aria-pressed={selectedLevel === lvl}
                className="px-3 py-1 text-xs font-semibold min-h-[36px]"
              >
                {lvl === 'ALL' ? 'Tất cả' : lvl}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-6 flex flex-col justify-between min-h-[160px] animate-pulse space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <div className="h-5 w-12 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="h-9 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] text-center py-12 text-slate-500">
            Không tìm thấy đề thi phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredExams.map((exam) => {
              const totalSec = exam.sections.reduce((acc, s) => acc + s.durationSec, 0);
              const totalMinutes = Math.round(totalSec / 60);

              const examKey = exam.id || exam.examId || exam.slug || `exam-${exam.level}`;
              return (
                <div
                  key={examKey}
                  className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] jlpt-card text-slate-900 dark:text-slate-100 p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono">
                          {exam.level}
                        </span>
                        {exam.guestTrial && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Làm thử miễn phí
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 capitalize">
                        {exam.kind === 'original' ? 'Đề chuẩn' : exam.kind === 'mixed' ? 'Đề trộn' : 'Đề thử nghiệm'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                      {exam.title}
                    </h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-4">
                      <span>Tổng số: <strong>{exam.totalQuestions} câu</strong></span>
                      <span>Thời gian: <strong>{totalMinutes} phút</strong></span>
                      <span>Phần thi: <strong>{exam.sections.length} phần</strong></span>
                    </div>

                    {/* Section breakdown */}
                    <div className="space-y-1 mb-4 text-xs text-slate-600 dark:text-slate-400">
                      {exam.sections.map((s, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{s.title}</span>
                          <span className="font-mono">{Math.round(s.durationSec / 60)} phút</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => onSelectExam(exam, selectedMode)}
                    className="w-full"
                    data-testid="exam-card-start-btn"
                  >
                    Bắt đầu làm bài
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
