import React from 'react';
import { Modal } from '@jlpt/ui/components/exam-controls';
import { Button } from '@jlpt/ui/components/exam-controls';

export interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelpModal({
  isOpen,
  onClose,
}: ShortcutsHelpModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '1, 2, 3, 4', desc: 'Chọn phương án trả lời 1, 2, 3 hoặc 4' },
    { key: 'F', desc: 'Đánh dấu / Hủy đánh dấu câu cần xem lại (Flag)' },
    { key: '← hoặc J', desc: 'Chuyển về câu hỏi trước đó' },
    { key: '→ hoặc K', desc: 'Chuyển sang câu hỏi kế tiếp' },
    { key: 'Z', desc: 'Bật / Tắt chế độ tối giản tập trung (Zen Mode)' },
    { key: '?', desc: 'Mở bảng hướng dẫn phím tắt này' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phím tắt phòng thi"
    >
      <div className="space-y-4 text-slate-800 dark:text-slate-200">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Sử dụng phím tắt giúp bạn làm bài thi nhanh hơn và không cần dùng chuột liên tục:
        </p>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 text-xs bg-white dark:bg-slate-900"
            >
              <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-slate-100 shadow-xs">
                {s.key}
              </kbd>
              <span className="text-right text-slate-700 dark:text-slate-300">
                {s.desc}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3">
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Đã hiểu
          </Button>
        </div>
      </div>
    </Modal>
  );
}
