'use client';

import { Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { PublicExamSnapshot, AttemptMode } from '@jlpt/schema';
import { ExamPicker, type ExamPickerExam } from '../../../features/exam/components/exam-picker';
import type { ExamStorageAdapter } from '../../../features/exam/storage/indexeddb';
import type { ExamApiClient } from '../../../features/exam/api/exam-api';

const ExamRoom = dynamic(
  () => import('../../../features/exam/components/exam-room').then((m) => m.ExamRoom),
  {
    ssr: false,
    loading: () => (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <Loader2 className="mx-auto mb-4 size-10 animate-spin" aria-hidden="true" />
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

const ExamResultView = dynamic(
  () => import('./phong-thi-feedback').then((m) => m.ExamResultView),
  { ssr: false },
);

const ExamErrorCard = dynamic(
  () => import('./phong-thi-feedback').then((m) => m.ExamErrorCard),
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
  const [storage, setStorage] = useState<ExamStorageAdapter | null>(null);
  const apiClientRef = React.useRef<ExamApiClient | null>(null);

  const getApiClient = async () => {
    if (apiClientRef.current) return apiClientRef.current;
    const { ExamApiClient } = await import('../../../features/exam/api/exam-api');
    const client = new ExamApiClient();
    apiClientRef.current = client;
    return client;
  };

  // 1. Fetch available exams on mount
  const loadAvailableExams = async () => {
    try {
      setLoadingExams(true);
      setErrorInfo(null);
      const res = await fetch('/api/v1/exams').then((r) => r.json());
      const items = res.items || [];
      setAvailableExams(items);
      return items;
    } catch {
      setErrorInfo({
        message: 'Không thể tải danh sách đề thi. Vui lòng thử lại sau.',
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
          const found = exams.find((e: ExamPickerExam) => e.id === examIdParam || (e as { examId?: string }).examId === examIdParam || e.slug === examIdParam);
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

      const apiClient = await getApiClient();
      const resumeRes = await apiClient.resumeAttempt(attemptId);
      const snapshot = await apiClient.fetchSnapshot(resumeRes.snapshotUrl);

      setActiveSnapshot(snapshot);
      setActiveAttemptId(attemptId);
      setActiveLease(resumeRes.lease);
      setActiveServerNow(resumeRes.serverNow);
      setInitialSectionIndex(resumeRes.currentSection ?? 0);
      setInitialAnswers(resumeRes.answers);
      setInitialFlags(resumeRes.flags);
      const { createExamStorage } = await import('../../../features/exam/storage/indexeddb');
      setStorage(createExamStorage());
      setIsExamStarted(true);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; code?: string; message?: string } | undefined;
      if (apiErr && typeof apiErr === 'object' && apiErr.status) {
        if (apiErr.status === 409 && (apiErr.code === 'ATTEMPT_ALREADY_SUBMITTED' || apiErr.code === 'ATTEMPT_NOT_SUBMITTED')) {
          window.location.href = `/ket-qua/${attemptId}`;
          return;
        }
        if (apiErr.status === 401 || apiErr.status === 403) {
          setErrorInfo({
            code: apiErr.code,
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
        const apiClient = await getApiClient();
        initRes = await apiClient.initAttempt({
          examId: targetExamId,
          mode: selectedMode,
        });
      } catch (err: unknown) {
        const apiErr = err as { status?: number; code?: string; message?: string; details?: { attemptId?: string } } | undefined;
        if (apiErr && typeof apiErr === 'object' && apiErr.status) {
          // Negative check: guest trying to take non-guest trial exam (Acceptance 2)
          if (apiErr.status === 401 || apiErr.code === 'AUTH_REQUIRED') {
            setErrorInfo({
              code: 'AUTH_REQUIRED',
              message: 'Đề thi này yêu cầu đăng nhập tài khoản học viên. Khách chỉ được làm thử đề demo guest_trial.',
              requiresAuth: true,
              redirectUrl: `/dang-nhap?redirect=${encodeURIComponent(`/phong-thi?examId=${targetExamId}&mode=${selectedMode}`)}`,
            });
            return;
          }

          // Negative check: unverified email account (Acceptance 1)
          if (apiErr.status === 403 && (apiErr.code === 'EMAIL_NOT_VERIFIED' || apiErr.message?.includes('xác minh'))) {
            setErrorInfo({
              code: 'EMAIL_NOT_VERIFIED',
              message: 'Tài khoản của bạn chưa xác minh email. Vui lòng kiểm tra hòm thư Mailpit để kích hoạt trước khi thi.',
            });
            return;
          }

          // Already open attempt conflict -> resume it
          if (apiErr.status === 409 && apiErr.code === 'ATTEMPT_ALREADY_OPEN') {
            const conflictAttemptId = (apiErr.details as { attemptId?: string } | undefined)?.attemptId;
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
      const apiClient = await getApiClient();
      const snapshot = await apiClient.fetchSnapshot(initRes.snapshotUrl);

      setActiveSnapshot(snapshot);
      setActiveAttemptId(initRes.attemptId);
      setActiveLease(initRes.lease);
      setActiveServerNow(initRes.serverNow);
      setInitialSectionIndex(initRes.currentSection ?? 0);
      setInitialAnswers(undefined);
      setInitialFlags(undefined);
      const { createExamStorage } = await import('../../../features/exam/storage/indexeddb');
      setStorage(createExamStorage());
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
        <Loader2 className="mx-auto mb-4 size-10 animate-spin" aria-hidden="true" />
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
    return <ExamResultView activeAttemptId={activeAttemptId} onExit={handleExit} />;
  }

  // Error Card (401/403/Other)
  if (errorInfo) {
    return (
      <ExamErrorCard
        errorInfo={errorInfo}
        onRetry={loadAvailableExams}
        onDismiss={() => setErrorInfo(null)}
      />
    );
  }

  // If currently taking the exam
  if (isExamStarted && activeSnapshot && activeAttemptId && activeLease && storage && apiClientRef.current) {
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
        apiClient={apiClientRef.current}
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

      <ExamPicker
        exams={availableExams}
        loading={loadingExams}
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
