'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { PublicExamSnapshot, AttemptMode } from '@jlpt/schema';
import { ExamPicker, type ExamPickerExam } from '../../../features/exam/components/exam-picker';
import { createExamStorage } from '../../../features/exam/storage/indexeddb';
import { ExamApiClient, ExamApiError } from '../../../features/exam/api/exam-api';
import { Card, Alert, Button } from '@jlpt/ui';

const ExamRoom = dynamic(
  () => import('../../../features/exam/components/exam-room').then((m) => m.ExamRoom),
  {
    ssr: false,
    loading: () => (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Đang chuẩn bị phòng thi...
        </h2>
        <p className="text-sm text-slate-500">
          Vui lòng đợi trong giây lát. Hệ thống đang tải nội dung bài thi.
        </p>
      </div>
    ),
  },
);

const InstructionsModal = dynamic(
  () => import('../../../features/exam/components/modals/instructions-modal').then((m) => m.InstructionsModal),
  { ssr: false },
);

export default function ExamRoomPage(): React.JSX.Element {
  const [availableExams, setAvailableExams] = useState<ExamPickerExam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingAttempt, setLoadingAttempt] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Đang khởi tạo bài thi...');

  const [selectedExam, setSelectedExam] = useState<ExamPickerExam | null>(null);
  const [selectedMode, setSelectedMode] = useState<AttemptMode>('real');
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [examResult, setExamResult] = useState<unknown | null>(null);

  // Active attempt state
  const [activeSnapshot, setActiveSnapshot] = useState<PublicExamSnapshot | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string>('');
  const [activeLease, setActiveLease] = useState<string>('');
  const [activeServerNow, setActiveServerNow] = useState<string>(new Date().toISOString());
  const [initialSectionIndex, setInitialSectionIndex] = useState(0);
  const [initialAnswers, setInitialAnswers] = useState<number[] | undefined>(undefined);
  const [initialFlags, setInitialFlags] = useState<number[] | undefined>(undefined);

  // Error state
  const [errorInfo, setErrorInfo] = useState<{
    code?: string;
    message: string;
    requiresAuth?: boolean;
    redirectUrl?: string;
  } | null>(null);

  // Storage and API Client instances
  const storage = React.useMemo(() => createExamStorage(), []);
  const apiClient = React.useMemo(() => new ExamApiClient(), []);

  // 1. Fetch available exams on mount
  const loadAvailableExams = async () => {
    try {
      setLoadingExams(true);
      setErrorInfo(null);
      const res = await apiClient.getExams();
      setAvailableExams(res.items);
      return res.items;
    } catch (err: unknown) {
      const msg = err instanceof ExamApiError ? err.message : 'Không thể tải danh sách đề thi. Vui lòng thử lại sau.';
      setErrorInfo({
        message: msg,
      });
      return [];
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    loadAvailableExams().then((exams) => {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const examIdParam = searchParams.get('examId');
        const attemptIdParam = searchParams.get('attemptId');
        const modeParam = searchParams.get('mode') as AttemptMode | null;

        if (modeParam === 'real' || modeParam === 'practice') {
          setSelectedMode(modeParam);
        }

        if (attemptIdParam) {
          handleResumeAttempt(attemptIdParam);
        } else if (examIdParam && exams.length > 0) {
          const found = exams.find((e) => e.id === examIdParam || (e as { examId?: string }).examId === examIdParam || e.slug === examIdParam);
          if (found) {
            setSelectedExam(found);
            setIsInstructionsOpen(true);
          }
        }
      }
    });
  }, []);

  // Handle resume attempt if attemptId is provided
  const handleResumeAttempt = async (attemptId: string) => {
    try {
      setLoadingAttempt(true);
      setLoadingMessage('Đang khôi phục phiên làm bài thi...');
      setErrorInfo(null);

      const resumeRes = await apiClient.resumeAttempt(attemptId);
      const snapshot = await apiClient.fetchSnapshot(resumeRes.snapshotUrl);

      setActiveSnapshot(snapshot);
      setActiveAttemptId(attemptId);
      setActiveLease(resumeRes.lease);
      setActiveServerNow(resumeRes.serverNow);
      setInitialSectionIndex(resumeRes.currentSection ?? 0);
      setInitialAnswers(resumeRes.answers);
      setInitialFlags(resumeRes.flags);
      setIsExamStarted(true);
    } catch (err: unknown) {
      if (err instanceof ExamApiError) {
        if (err.status === 409 && (err.code === 'ATTEMPT_ALREADY_SUBMITTED' || err.code === 'ATTEMPT_NOT_SUBMITTED')) {
          window.location.href = `/ket-qua/${attemptId}`;
          return;
        }
        if (err.status === 401 || err.status === 403) {
          setErrorInfo({
            code: err.code,
            message: 'Bạn không có quyền truy cập vào lượt thi này. Vui lòng đăng nhập tài khoản sở hữu.',
            requiresAuth: true,
            redirectUrl: `/dang-nhap?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
          });
          return;
        }
      }
      setErrorInfo({
        message: err instanceof Error ? err.message : 'Không thể khôi phục bài thi. Vui lòng chọn đề khác.',
      });
    } finally {
      setLoadingAttempt(false);
    }
  };

  const handleSelectExam = (exam: ExamPickerExam, mode: AttemptMode) => {
    setSelectedExam(exam);
    setSelectedMode(mode);
    setIsInstructionsOpen(true);
  };

  // Start attempt through real API
  const handleConfirmStart = async () => {
    if (!selectedExam) return;
    setIsInstructionsOpen(false);

    const targetExamId = selectedExam.id || selectedExam.examId;
    if (!targetExamId) {
      setErrorInfo({ message: 'Không xác định được mã đề thi hợp lệ.' });
      return;
    }

    try {
      setLoadingAttempt(true);
      setLoadingMessage('Đang khởi tạo lượt thi và chuẩn bị đề...');
      setErrorInfo(null);

      let initRes;
      try {
        initRes = await apiClient.initAttempt({
          examId: targetExamId,
          mode: selectedMode,
        });
      } catch (err: unknown) {
        if (err instanceof ExamApiError) {
          // Negative check: guest trying to take non-guest trial exam (Acceptance 2)
          if (err.status === 401 || err.code === 'AUTH_REQUIRED') {
            setErrorInfo({
              code: 'AUTH_REQUIRED',
              message: 'Đề thi này yêu cầu đăng nhập tài khoản học viên. Khách chỉ được làm thử đề demo guest_trial.',
              requiresAuth: true,
              redirectUrl: `/dang-nhap?redirect=${encodeURIComponent(`/phong-thi?examId=${targetExamId}&mode=${selectedMode}`)}`,
            });
            return;
          }

          // Negative check: unverified email account (Acceptance 1)
          if (err.status === 403 && (err.code === 'EMAIL_NOT_VERIFIED' || err.message.includes('xác minh'))) {
            setErrorInfo({
              code: 'EMAIL_NOT_VERIFIED',
              message: 'Tài khoản của bạn chưa xác minh email. Vui lòng kiểm tra hòm thư Mailpit để kích hoạt trước khi thi.',
            });
            return;
          }

          // Already open attempt conflict -> resume it
          if (err.status === 409 && err.code === 'ATTEMPT_ALREADY_OPEN') {
            const conflictAttemptId = (err.details as { attemptId?: string } | undefined)?.attemptId;
            if (conflictAttemptId) {
              await handleResumeAttempt(conflictAttemptId);
              return;
            }
          }
        }
        throw err;
      }

      // Fetch verified snapshot
      setLoadingMessage('Đang tải nội dung đề thi bảo mật...');
      const snapshot = await apiClient.fetchSnapshot(initRes.snapshotUrl);

      setActiveSnapshot(snapshot);
      setActiveAttemptId(initRes.attemptId);
      setActiveLease(initRes.lease);
      setActiveServerNow(initRes.serverNow);
      setInitialSectionIndex(initRes.currentSection ?? 0);
      setInitialAnswers(undefined);
      setInitialFlags(undefined);
      setIsExamStarted(true);
    } catch (err: unknown) {
      setErrorInfo({
        message: err instanceof Error ? err.message : 'Có lỗi xảy ra khi bắt đầu làm bài thi.',
      });
    } finally {
      setLoadingAttempt(false);
    }
  };

  const handleFinish = (result?: unknown) => {
    setExamResult(result || { status: 'submitted' });
    setIsExamStarted(false);
  };

  const handleExit = () => {
    setIsExamStarted(false);
    setSelectedExam(null);
    setActiveSnapshot(null);
    setExamResult(null);
    setErrorInfo(null);
  };

  // If loading attempt or snapshot
  if (loadingAttempt) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {loadingMessage}
        </h2>
        <p className="text-sm text-slate-500">
          Vui lòng đợi trong giây lát. Hệ thống đang đồng bộ dữ liệu với máy chủ.
        </p>
      </div>
    );
  }

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
              href={`/ket-qua/${activeAttemptId}`}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
            >
              Xem lại bài làm &amp; Bảng điểm (Review)
            </a>
            <Button
              type="button"
              variant="secondary"
              onClick={handleExit}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all"
            >
              Trở về danh sách đề thi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error Card (401/403/Other)
  if (errorInfo) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <Card className="p-8 border border-slate-200 dark:border-slate-800 text-center">
          <div className="text-4xl mb-3" role="img" aria-label="Lỗi phòng thi">
            {errorInfo.requiresAuth ? '🔒' : '⚠️'}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {errorInfo.requiresAuth ? 'Yêu cầu đăng nhập' : 'Không thể bắt đầu làm bài'}
          </h2>
          <Alert variant={errorInfo.requiresAuth ? 'info' : 'error'} className="mb-6 text-left">
            {errorInfo.message}
          </Alert>

          <div className="flex justify-center gap-3">
            {errorInfo.requiresAuth ? (
              <a href={errorInfo.redirectUrl || '/dang-nhap'}>
                <Button variant="primary" size="md">
                  Đăng nhập tài khoản
                </Button>
              </a>
            ) : (
              <Button variant="primary" size="md" onClick={loadAvailableExams}>
                Thử lại
              </Button>
            )}
            <Button variant="secondary" size="md" onClick={() => setErrorInfo(null)}>
              Trở về danh sách đề
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If currently taking the exam
  if (isExamStarted && activeSnapshot && activeAttemptId && activeLease) {
    return (
      <ExamRoom
        snapshot={activeSnapshot}
        attemptId={activeAttemptId}
        lease={activeLease}
        mode={selectedMode}
        serverNow={activeServerNow}
        initialSectionIndex={initialSectionIndex}
        initialAnswers={initialAnswers}
        initialFlags={initialFlags}
        storage={storage}
        apiClient={apiClient}
        onFinish={handleFinish}
        onExit={handleExit}
      />
    );
  }

  // Default: Exam picker page
  return (
    <div className="max-w-5xl mx-auto py-8 px-4" data-testid="exam-room-page">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Phòng thi trực tuyến JLPT
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Lựa chọn đề thi từ N1 đến N5 và chế độ làm bài chuẩn theo kỳ thi năng lực tiếng Nhật quốc tế.
        </p>
      </div>

      {loadingExams ? (
        <div className="py-16 text-center text-slate-500">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          Đang tải danh sách đề thi đã xuất bản...
        </div>
      ) : availableExams.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
          Hiện tại chưa có đề thi nào sẵn sàng trong phòng thi.
        </div>
      ) : (
        <ExamPicker
          exams={availableExams}
          onSelectExam={handleSelectExam}
        />
      )}

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
