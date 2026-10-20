'use client';

import React from 'react';
import { Modal } from '@jlpt/ui/components/modal';
import { Button } from '@jlpt/ui/components/button';

export interface EarlySubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  isSubmitting?: boolean;
}

export function EarlySubmitModal({
  isOpen,
  onClose,
  onConfirmSubmit,
  totalQuestions,
  answeredCount,
  unansweredCount,
  flaggedCount,
  isSubmitting = false,
}: EarlySubmitModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận nộp bài thi"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Tiếp tục làm bài
          </Button>
          <Button
            variant="danger"
            onClick={onConfirmSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            data-testid="modal-confirm-submit-btn"
          >
            Xác nhận nộp bài
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <p>
          Bạn có chắc chắn muốn nộp bài thi ngay bây giờ? Sau khi nộp bài, bạn sẽ không thể thay đổi đáp án.
        </p>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {answeredCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">Đã trả lời</div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {unansweredCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">Chưa làm</div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {flaggedCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">Đang đánh dấu</div>
          </div>
        </div>

        {/* Strong warning if unanswered questions exist */}
        {unansweredCount > 0 && (
          <div
            role="alert"
            className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 flex items-start gap-2"
          >
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs leading-relaxed">
              <strong>Chú ý:</strong> Bạn vẫn còn <strong>{unansweredCount} câu hỏi chưa làm</strong> trên tổng số {totalQuestions} câu. Các câu chưa làm sẽ không được tính điểm.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
