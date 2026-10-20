'use client';

import { AlertTriangle, Info, Lock, X } from 'lucide-react';
import React from 'react';
import { Button } from '@jlpt/ui/components/button';

export interface ExamResultViewProps {
  activeAttemptId: string;
  onExit: () => void;
}

export function ExamResultView({ activeAttemptId, onExit }: ExamResultViewProps): React.JSX.Element {
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
            onClick={onExit}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all"
          >
            Trở về danh sách đề thi
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface ExamErrorCardProps {
  errorInfo: {
    code?: string;
    message: string;
    requiresAuth?: boolean;
    redirectUrl?: string;
  };
  onRetry: () => void;
  onDismiss: () => void;
}

export function ExamErrorCard({ errorInfo, onRetry, onDismiss }: ExamErrorCardProps): React.JSX.Element {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="jlpt-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 shadow-sm text-center">
        <div className="text-4xl mb-3" role="img" aria-label="Lỗi phòng thi">
          {errorInfo.requiresAuth ? <Lock className="mx-auto size-10" aria-hidden="true" /> : <AlertTriangle className="mx-auto size-10" aria-hidden="true" />}
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {errorInfo.requiresAuth ? 'Yêu cầu đăng nhập' : 'Không thể bắt đầu làm bài'}
        </h2>
        <div
          role="alert"
          className={`jlpt-alert relative flex items-start gap-3 p-3.5 rounded-lg text-sm mb-6 text-left border-l-4 ${
            errorInfo.requiresAuth
              ? 'jlpt-alert-info bg-blue-50 dark:bg-blue-950 border-l-blue-600 dark:border-l-blue-400 text-blue-900 dark:text-blue-200'
              : 'jlpt-alert-error bg-red-50 dark:bg-red-950 border-l-red-600 dark:border-l-red-500 text-red-900 dark:text-red-200'
          }`}
        >
          {errorInfo.requiresAuth ? <Info className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
          <div className="flex-1">{errorInfo.message}</div>
        </div>

        <div className="flex justify-center gap-3">
          {errorInfo.requiresAuth ? (
            <a href={errorInfo.redirectUrl || '/dang-nhap'}>
              <Button variant="primary" size="md">
                Đăng nhập tài khoản
              </Button>
            </a>
          ) : (
            <Button variant="primary" size="md" onClick={onRetry}>
              Thử lại
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={onDismiss}>
            Trở về danh sách đề
          </Button>
        </div>
      </div>
    </div>
  );
}
