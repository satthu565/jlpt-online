'use client';

import React, { useState } from 'react';
import { Modal, Button } from '@jlpt/ui';

export interface ShareExamModalProps {
  isOpen: boolean;
  examId: string;
  examTitle?: string;
  initialToken?: string;
  onClose: () => void;
}

export function ShareExamModal({
  isOpen,
  examId,
  examTitle = 'Đề thi trộn',
  initialToken,
  onClose,
}: ShareExamModalProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/+$/, '');

  const handleCreateShareLink = async () => {
    try {
      setLoading(true);
      setError(null);

      let tokenHeader: string | null = null;
      if (typeof window !== 'undefined') {
        tokenHeader = localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tokenHeader) {
        headers['Authorization'] = `Bearer ${tokenHeader}`;
      }

      const res = await fetch(`${baseUrl}/generated-exams/${encodeURIComponent(examId)}/shares`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || `Không thể tạo liên kết chia sẻ (Mã lỗi: ${res.status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ khi tạo liên kết.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && !token && !error) {
      handleCreateShareLink();
    }
  }, [isOpen, examId]);

  const shareToken = token;
  const shareUrl = shareToken
    ? (typeof window !== 'undefined'
        ? `${window.location.origin}/shared-exams/${shareToken}`
        : `https://jlpt.example.com/shared-exams/${shareToken}`)
    : '';

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } else if (shareUrl) {
      setCopied(true);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chia sẻ đề thi "${examTitle}" (MIX-14)`}
      closeLabel="Đóng"
    >
      <div data-testid="share-exam-modal-content" className="space-y-4 text-xs">
        <p className="text-slate-600 dark:text-slate-400">
          Bạn có thể chia sẻ liên kết này cho bạn bè hoặc nhóm học tập để cùng làm chung một bộ đề trộn với cùng cấu trúc seed câu hỏi bất biến.
        </p>

        {loading && (
          <div className="py-4 text-center text-slate-500">Đang tạo liên kết chia sẻ...</div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        {!loading && !error && shareToken && (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="share-link-input"
                className="block font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                Liên kết làm bài:
              </label>
              <div className="flex gap-2">
                <input
                  id="share-link-input"
                  type="text"
                  readOnly
                  value={shareUrl}
                  data-testid="share-url-input"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCopy}
                  data-testid="copy-share-url-btn"
                >
                  {copied ? 'Đã chép!' : 'Sao chép'}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-slate-600 dark:text-slate-400 space-y-1">
              <span className="font-bold text-blue-900 dark:text-blue-300 block">
                Quyền hạn bản quyền & Tính bất biến:
              </span>
              <p className="text-[11px] leading-relaxed">
                Đề thi chia sẻ được cố định theo seed của thuật toán trộn đề. Người nhận có thể vào thi ngay mà không làm thay đổi đề gốc của bạn. Nếu trong đề có câu hỏi thuộc bản quyền hạn chế, người nhận cần đăng nhập tài khoản có thẩm quyền tương ứng.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
