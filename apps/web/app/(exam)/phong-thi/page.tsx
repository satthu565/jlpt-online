'use client';

import React, { useState, useEffect } from 'react';
import type { PublicExamSnapshot, AttemptMode } from '@jlpt/schema';
import {
  ALL_SAMPLE_EXAMS,
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
  const [currentAttemptId, setCurrentAttemptId] = useState<string>('0192f000-5000-7000-8000-000000000001');

  const availableExams: PublicExamSnapshot[] = ALL_SAMPLE_EXAMS;

  // Storage and API Client instances
  const storage = React.useMemo(() => createExamStorage(), []);
  const apiClient = React.useMemo(() => new ExamApiClient(), []);

  // Preselect exam and mode from URL query parameters if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const examIdParam = searchParams.get('examId');
      const attemptIdParam = searchParams.get('attemptId');
      const modeParam = searchParams.get('mode') as AttemptMode | null;

      if (attemptIdParam) {
        setCurrentAttemptId(attemptIdParam);
      }

      if (modeParam === 'real' || modeParam === 'practice') {
        setSelectedMode(modeParam);
      }

      if (examIdParam) {
        const found = availableExams.find((e) => e.examId === examIdParam);
        if (found) {
          setSelectedExam(found);
          setIsInstructionsOpen(true);
        }
      }
    }
  }, [availableExams]);

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
            Bài làm của bạn đã được ghi nhận an toàn trên máy chủ và chấm điểm theo thang chuẩn JLPT.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={`/ket-qua/${currentAttemptId}`}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
            >
              Xem lại bài làm &amp; Bảng điểm (Review)
            </a>
            <button
              type="button"
              onClick={handleExit}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 shadow-sm transition-all"
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
        attemptId={currentAttemptId}
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
          Lựa chọn đề thi từ N1 đến N5 và chế độ làm bài chuẩn theo kỳ thi năng lực tiếng Nhật quốc tế.
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
