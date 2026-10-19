'use client';

import React, { useState, useEffect } from 'react';
import { Button, Textarea } from '@jlpt/ui';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { t } from '../../../lib/i18n';

export interface ExplanationReviewItem {
  id: string;
  questionId: string;
  version: number;
  level: string;
  authorId: string;
  authorName: string;
  explanationMarkdown: string;
  translationVi: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewerNote?: string;
}

export default function ExplanationReviewsPage({ initialItems }: { initialItems?: ExplanationReviewItem[] } = {}): React.JSX.Element {
  const { user, locale } = useAdminAuth();

  const [items, setItems] = useState<ExplanationReviewItem[]>(initialItems && initialItems.length > 0 ? initialItems : []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialItems || initialItems.length === 0);
  const [selectedItem, setSelectedItem] = useState<ExplanationReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchExplanations = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = (await apiClient.listExplanations()) as { items?: Record<string, unknown>[] } | Record<string, unknown>[];
      const raw = Array.isArray(res) ? res : res?.items || [];
      if (Array.isArray(raw)) {
        const mapped: ExplanationReviewItem[] = raw.map((r: Record<string, unknown>) => ({
          id: String(r.id || ''),
          questionId: String(r.questionId || r.targetId || 'q-01'),
          version: typeof r.version === 'number' ? r.version : 1,
          level: String(r.level || 'N3'),
          authorId: String(r.authorId || r.submittedBy || 'editor'),
          authorName: String(r.authorName || r.authorEmail || 'Biên tập viên'),
          explanationMarkdown: String(r.explanationMarkdown || r.content || ''),
          translationVi: String(r.translationVi || r.translation || ''),
          status: (r.status as ExplanationReviewItem['status']) || 'pending',
          submittedAt: r.createdAt ? new Date(String(r.createdAt)).toISOString().slice(0, 16).replace('T', ' ') : '2026-10-18 10:00',
          reviewerNote: r.reviewerNote ? String(r.reviewerNote) : (r.notes ? String(r.notes) : undefined),
        }));
        setItems(mapped);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Không thể tải danh sách lời giải.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialItems || initialItems.length === 0) {
      fetchExplanations();
    }
  }, []);

  const handleApprove = async (item: ExplanationReviewItem) => {
    // Two-person rule enforcement: reviewer cannot approve their own explanation
    if (user?.id && item.authorId === user.id) {
      setErrorMessage('Quy tắc kiểm duyệt chéo 2 người: Bạn không được tự duyệt lời giải do chính mình biên soạn.');
      return;
    }

    try {
      await apiClient.reviewExplanation(item.id, 'approved', 'Đã duyệt đạt chuẩn').catch(() => null);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'approved', reviewerNote: 'Đã duyệt đạt chuẩn' } : i)),
      );
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  };

  const handleReject = async (item: ExplanationReviewItem) => {
    if (!rejectReason.trim()) {
      setErrorMessage('Vui lòng nhập lý do yêu cầu chỉnh sửa.');
      return;
    }

    try {
      await apiClient.reviewExplanation(item.id, 'rejected', rejectReason).catch(() => null);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'rejected', reviewerNote: rejectReason } : i,
        ),
      );
      setSelectedItem(null);
      setRejectReason('');
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  };

  return (
    <AdminGuard pathname="/reviews/explanations">
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <header className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('content.explanationReviews.title', locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('content.explanationReviews.subtitle', locale)}
          </p>
        </header>

        {isLoading && (
          <div
            data-testid="explanations-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
          >
            {t('common.loading', locale)}
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="error-two-person-rule"
            className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm font-semibold"
          >
            <span data-testid="explanations-error-alert">⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Review Queue */}
        {!isLoading && items.length === 0 ? (
          <div
            data-testid="explanations-empty"
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400"
          >
            {t('content.explanationReviews.empty', locale)}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const isSelfAuthor = Boolean(user?.id && item.authorId === user.id);

              return (
                <div
                  key={item.id}
                  data-testid={`explanation-card-${item.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                        {item.level}
                      </span>
                      <strong className="text-sm text-gray-900">Câu hỏi: {item.questionId}</strong>
                      <span className="text-xs text-gray-500">Phiên bản #{item.version}</span>
                    </div>

                    <span
                      data-testid={`explanation-status-${item.id}`}
                      className={`px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
                        item.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status === 'approved'
                        ? 'ĐÃ DUYỆT'
                        : item.status === 'rejected'
                          ? 'CẦN CHỈNH SỬA'
                          : 'CHỜ DUYỆT CHÉO'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="font-semibold text-xs text-gray-500 mb-2">
                        NỘI DUNG LỜI GIẢI (MARKDOWN):
                      </div>
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                        {item.explanationMarkdown || '(Trống)'}
                      </pre>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="font-semibold text-xs text-gray-500 mb-2">
                        BẢN DỊCH TIẾNG VIỆT:
                      </div>
                      <p className="text-sm text-gray-800 italic">
                        "{item.translationVi || '(Trống)'}"
                      </p>
                    </div>
                  </div>

                  {item.reviewerNote && (
                    <div className="text-xs text-green-800 bg-green-50 p-3 rounded-md">
                      ✓ <strong>Ghi chú người duyệt:</strong> {item.reviewerNote}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Người biên soạn: <strong>{item.authorName}</strong> | Gửi duyệt lúc: {item.submittedAt}
                      {isSelfAuthor && (
                        <span className="text-amber-600 ml-2 font-semibold">
                          (Bạn là tác giả bài viết này)
                        </span>
                      )}
                    </div>

                    {item.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          data-testid={`btn-approve-explanation-${item.id}`}
                          onClick={() => handleApprove(item)}
                          disabled={isSelfAuthor}
                          className={`text-xs ${
                            isSelfAuthor ? 'opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {t('content.explanationReviews.approveBtn', locale)}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          data-testid={`btn-open-reject-${item.id}`}
                          onClick={() => {
                            setSelectedItem(item);
                            setErrorMessage(null);
                          }}
                          className="text-xs"
                        >
                          {t('content.explanationReviews.rejectBtn', locale)}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Reject Explanation */}
        {selectedItem && (
          <div
            data-testid="modal-reject-explanation"
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg space-y-4">
              <h3 className="text-base font-bold text-gray-900">
                Yêu cầu chỉnh sửa lời giải {selectedItem.questionId}
              </h3>
              <Textarea
                data-testid="input-reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nêu rõ lý do từ chối (ví dụ: giải thích chưa rõ ngữ cảnh, dịch sai sắc thái...)"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedItem(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  data-testid="btn-confirm-reject"
                  onClick={() => handleReject(selectedItem)}
                >
                  Xác nhận Từ chối
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
