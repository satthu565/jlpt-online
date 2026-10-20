'use client';

import React from 'react';
import { Modal } from '@jlpt/ui/components/modal';
import { Button } from '@jlpt/ui/components/button';

export interface SectionTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentSectionTitle: string;
  nextSectionTitle: string;
  unansweredInSection?: number;
  isLoading?: boolean;
}

export function SectionTransitionModal({
  isOpen,
  onClose,
  onConfirm,
  currentSectionTitle,
  nextSectionTitle,
  unansweredInSection = 0,
  isLoading = false,
}: SectionTransitionModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chuyển sang phần thi kế tiếp"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Quay lại kiểm tra
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isLoading}
            disabled={isLoading}
          >
            Xác nhận chuyển phần
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <p>
          Bạn sắp chuyển từ phần <strong>{currentSectionTitle}</strong> sang phần <strong>{nextSectionTitle}</strong>.
        </p>

        {unansweredInSection > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-xs">
            Trong phần thi này, bạn vẫn còn <strong>{unansweredInSection} câu chưa làm</strong>.
          </div>
        )}

        <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900">
          <div className="flex items-start gap-2.5 text-red-900 dark:text-red-200 font-bold mb-1">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2" />
              <circle cx="12" cy="16" r="1" strokeWidth="2" />
              <path d="M8 11V7a4 4 0 018 0v4" strokeWidth="2" />
            </svg>
            <span>Quy chế khóa phần thi</span>
          </div>
          <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
            Theo quy chế thi chuẩn JLPT: Ngay sau khi xác nhận chuyển phần, phần thi <strong>{currentSectionTitle}</strong> sẽ <strong>BỊ KHÓA VĨNH VIỄN</strong>. Bạn sẽ không thể quay lại xem lại đề hoặc sửa đổi đáp án của phần này.
          </p>
        </div>
      </div>
    </Modal>
  );
}
