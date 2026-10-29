'use client';

import React from 'react';
import { Modal } from '@jlpt/ui/components/exam-controls';
import { Button } from '@jlpt/ui/components/exam-controls';

export interface LeaseConflictModalProps {
  isOpen: boolean;
  onGoHome: () => void;
}

export function LeaseConflictModal({
  isOpen,
  onGoHome,
}: LeaseConflictModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Phiên thi bị xung đột"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="primary" onClick={onGoHome}>
            Quay về trang chủ
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-3 text-red-600 font-bold text-base">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Bài thi đang được mở ở nơi khác</span>
        </div>
        <p className="leading-relaxed">
          Hệ thống phát hiện bài thi này đã được mở hoặc tiếp tục trên một thiết bị / trình duyệt khác (mã lỗi <code>LEASE_INVALID</code>).
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Để đảm bảo tính trung thực của kỳ thi, mỗi bài làm chỉ được thao tác tại một cửa sổ duy nhất. Mọi thay đổi chưa được đồng bộ từ cửa sổ này đã dừng lại.
        </p>
      </div>
    </Modal>
  );
}
