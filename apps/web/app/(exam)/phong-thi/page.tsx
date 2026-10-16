'use client';

import React, { useState } from 'react';
import type { PublicExamSnapshot, AttemptMode } from '@jlpt/schema';
import {
  SAMPLE_N5_EXAM_SNAPSHOT,
  ExamPicker,
  InstructionsModal,
  ExamRoom,
  createExamStorage,
  ExamApiClient,
} from '../../../features/exam';

export default function ExamRoomPage(): React.JSX.Element {
  const [selectedExam, setSelectedExam] = useState<PublicExamSnapshot | null>(null);
  const [selectedMode, setSelectedMode] = useState<AttemptMode>('real');
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [examResult, setExamResult] = useState<unknown | null>(null);

  const availableExams: PublicExamSnapshot[] = [SAMPLE_N5_EXAM_SNAPSHOT];

  // Storage and API Client instances
  const storage = React.useMemo(() => createExamStorage(), []);
  const apiClient = React.useMemo(() => new ExamApiClient(), []);

  const handleSelectExam = (exam: PublicExamSnapshot, mode: AttemptMode) => {
    setSelectedExam(exam);
    setSelectedMode(mode);
    setIsInstructionsOpen(true);
  };

  const handleConfirmStart = () => {
    setIsInstructionsOpen(false);
    setIsExamStarted(true);
  };

  const handleFinish = (result?: unknown) => {
    setExamResult(result || { status: 'submitted' });
    setIsExamStarted(false);
  };

  const handleExit = () => {
    setIsExamStarted(false);
    setSelectedExam(null);
    setExamResult(null);
  };

  // If exam has been completed / submitted
  if (examResult) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Nộp bài thi thành công!
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Bài làm của bạn đã được ghi nhận an toàn trên máy chủ. Kết quả chấm điểm đang được xử lý.
          </p>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={handleExit}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
            >
              Trở về danh sách đề thi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If currently taking the exam
  if (isExamStarted && selectedExam) {
    return (
      <ExamRoom
        snapshot={selectedExam}
        attemptId="00000000-0000-4000-8000-000000000099"
        lease="00000000-0000-4000-8000-000000000088"
        mode={selectedMode}
        serverNow={new Date().toISOString()}
        storage={storage}
        apiClient={apiClient}
        onFinish={handleFinish}
        onExit={handleExit}
      />
    );
  }

  // Default: Exam picker page
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Phòng thi trực tuyến JLPT
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Lựa chọn đề thi và chế độ làm bài chuẩn theo kỳ thi năng lực tiếng Nhật quốc tế.
        </p>
      </div>

      <ExamPicker
        exams={availableExams}
        onSelectExam={handleSelectExam}
      />

      {selectedExam && (
        <InstructionsModal
          isOpen={isInstructionsOpen}
          onClose={() => setIsInstructionsOpen(false)}
          onConfirmStart={handleConfirmStart}
          snapshot={selectedExam}
          mode={selectedMode}
        />
      )}
    </div>
  );
}
