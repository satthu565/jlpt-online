'use client';

import React from 'react';
import { Modal } from '@jlpt/ui/components/modal';
import { Button } from '@jlpt/ui/components/button';

export type InstructionSnapshot = {
  title: string;
  level: string;
  totalQuestions: number;
  sections: Array<{
    title: string;
    durationSec: number;
    code?: string;
    questionRange?: [number, number];
  }>;
};

export interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStart: () => void;
  snapshot: InstructionSnapshot;
  mode: 'real' | 'practice';
}

export function InstructionsModal({
  isOpen,
  onClose,
  onConfirmStart,
  snapshot,
  mode,
}: InstructionsModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hướng dẫn làm bài thi JLPT"
      className="max-w-2xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="primary" onClick={onConfirmStart} data-testid="modal-start-exam-btn">
            Bắt đầu làm bài
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900">
          <h3 className="font-bold text-base text-blue-900 dark:text-blue-100 mb-1">
            {snapshot.title}
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-xs">
            Cấp độ: <span className="font-bold">{snapshot.level}</span> | Tổng số câu: <span className="font-bold">{snapshot.totalQuestions} câu</span> | Chế độ: <span className="font-bold">{mode === 'real' ? 'Thi thật' : 'Luyện tập'}</span>
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2">1. Quy định thời gian từng phần</h4>
          <ul className="list-disc pl-5 space-y-1">
            {snapshot.sections.map((sec, idx) => (
              <li key={sec.code || sec.title || idx}>
                <span className="font-semibold">{sec.title}</span>: {Math.round(sec.durationSec / 60)} phút{sec.questionRange ? ` (${sec.questionRange[1] - sec.questionRange[0] + 1} câu)` : ''}.
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2">2. Cách chọn và bỏ chọn đáp án</h4>
          <p>
            Nhấp chuột vào phương án 1, 2, 3, hoặc 4 để chọn. Bạn có thể nhấp lại vào phương án đã chọn để bỏ chọn.
          </p>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900">
          <h4 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-1">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            3. Lưu ý quan trọng về chuyển phần và nộp bài
          </h4>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Theo quy chế thi chuẩn JLPT: Khi bạn hoàn thành hoặc chuyển sang phần thi tiếp theo, phần thi trước đó sẽ <strong>BỊ KHÓA HOÀN TOÀN</strong>. Bạn sẽ không thể xem lại hoặc sửa đổi đáp án của phần thi đã khóa.
          </p>
        </div>
      </div>
    </Modal>
  );
}
