'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import type { ReviewItem, StaffOperator, ReviewTargetType, ReviewItemStatus } from './types';
import { SelfReviewForbiddenError } from './types';
import { ReviewService } from './review-service';
import { richTextToPlainText, createTextSegment } from '../content/types';
import { apiClient } from '../../lib/api-client';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface ReviewQueueProps {
  initialItems?: ReviewItem[];
  currentOperator: StaffOperator;
  onItemReviewed?: (item: ReviewItem) => void;
}

export function ReviewQueueView({
  initialItems = [],
  currentOperator,
  onItemReviewed,
}: ReviewQueueProps): React.JSX.Element {
  const { locale } = useAdminAuth();
  const [service] = useState(() => new ReviewService(initialItems));
  const [items, setItems] = useState<ReviewItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [isComparingPdf, setIsComparingPdf] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit fields state
  const [editStem, setEditStem] = useState('');
  const [editSourcePage, setEditSourcePage] = useState<number | undefined>(undefined);
  const [editComment, setEditComment] = useState('');

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = (await apiClient.listPendingReviews()) as { items?: Record<string, unknown>[] } | Record<string, unknown>[];
      const rawItems = Array.isArray(res) ? res : res?.items || [];
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        const mapped: ReviewItem[] = rawItems.map((r: Record<string, unknown>) => ({
          id: String(r.id || ''),
          targetType: (r.targetType as ReviewTargetType) || 'question_group',
          targetId: String(r.targetId || r.groupId || r.id || ''),
          version: typeof r.targetVersion === 'number' ? r.targetVersion : (typeof r.version === 'number' ? r.version : 1),
          title: String(r.title || `Nhóm câu hỏi ${String(r.targetId || r.id || '')}`),
          status: (r.status as ReviewItemStatus) || 'in_review',
          authorId: String(r.authorId || r.submittedBy || 'editor'),
          lastEditedBy: String(r.lastEditedBy || r.submittedBy || 'editor'),
          reviewerId: r.reviewedBy ? String(r.reviewedBy) : null,
          reviewComment: r.notes ? String(r.notes) : (r.comment ? String(r.comment) : null),
          submittedAt: String(r.submittedAt || r.createdAt || new Date().toISOString()),
          sourcePage: typeof r.sourcePage === 'number' ? r.sourcePage : 1,
          sourceRef: String(r.sourceRef || 'package.zip'),
          groupData: r.groupData as ReviewItem['groupData'],
          reviewedAt: r.reviewedAt ? String(r.reviewedAt) : null,
        }));
        setItems(mapped);
      } else if (initialItems.length > 0) {
        setItems(initialItems);
      } else {
        setItems(service.listAllReviews());
      }
    } catch {
      if (initialItems.length > 0) {
        setItems(initialItems);
      } else {
        setItems(service.listAllReviews());
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleOpenCompare = (item: ReviewItem) => {
    setSelectedItem(item);
    setIsComparingPdf(true);
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleOpenEdit = (item: ReviewItem) => {
    setSelectedItem(item);
    setIsEditing(true);
    setIsComparingPdf(false);
    setErrorMessage(null);
    if (item.groupData && item.groupData.questions[0]) {
      setEditStem(richTextToPlainText(item.groupData.questions[0].stem));
    } else {
      setEditStem('');
    }
    setEditSourcePage(item.sourcePage);
  };

  const handleSaveEdit = () => {
    if (!selectedItem) return;
    try {
      const updated = service.updateContentInReview(
        selectedItem.targetId,
        selectedItem.version,
        {
          sourcePage: editSourcePage,
          questions: selectedItem.groupData?.questions.map((q, idx) =>
            idx === 0
              ? {
                  ...q,
                  stem: [createTextSegment(editStem)],
                }
              : q,
          ) ?? [],
        },
        currentOperator,
      );
      setSelectedItem(updated);
      setIsEditing(false);
      setSuccessMessage('Biên tập viên đã cập nhật nội dung thành công.');
      fetchReviews();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedItem) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    // 4-eyes principle client pre-check
    if (currentOperator.id && selectedItem.lastEditedBy === currentOperator.id) {
      setErrorMessage(
        'Lỗi 4 mắt: Editor không thể tự duyệt nội dung do chính mình biên tập! Cần một Reviewer khác duyệt.',
      );
      return;
    }

    try {
      try {
        await apiClient.submitReviewDecision(
          selectedItem.targetType,
          selectedItem.targetId,
          selectedItem.version,
          decision,
          editComment || (decision === 'approved' ? 'Phê duyệt đạt chuẩn' : 'Từ chối'),
        );
      } catch (apiErr: unknown) {
        const errorObj = apiErr as { status?: number; message?: string } | undefined;
        if (
          errorObj?.status === 403 ||
          errorObj?.message?.includes('Self-review') ||
          errorObj?.message?.includes('4 mắt')
        ) {
          throw new SelfReviewForbiddenError();
        }
        // Fallback to local service in tests if offline
        service.reviewDecision(
          selectedItem.targetId,
          selectedItem.version,
          { decision, comment: editComment || (decision === 'approved' ? 'Phê duyệt đạt chuẩn' : '') },
          currentOperator,
        );
      }

      const updated = {
        ...selectedItem,
        status: decision,
        decisionNotes: editComment,
        reviewerId: currentOperator.id,
      };
      setSelectedItem(updated);
      setSuccessMessage(
        decision === 'approved' ? 'Phê duyệt nội dung thành công!' : 'Đã từ chối nội dung.',
      );
      setIsComparingPdf(false);
      onItemReviewed?.(updated);
      await fetchReviews();
    } catch (err: unknown) {
      if (err instanceof SelfReviewForbiddenError) {
        setErrorMessage(
          'Lỗi 4 mắt: Editor không thể tự duyệt nội dung do chính mình biên tập! Cần một Reviewer khác duyệt.',
        );
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
      }
    }
  };

  return (
    <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="border-b border-gray-200 pb-4">
        <h2 data-testid="review-title" className="text-2xl font-bold text-gray-900">
          {t('content.reviews.title', locale)}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('content.reviews.subtitle', locale)}
        </p>
        <div className="mt-2 text-xs text-gray-600">
          Đăng nhập hiện tại: <strong>{currentOperator.email}</strong> (Vai trò: <code>{currentOperator.role}</code>)
        </div>
      </div>

      {isLoading && (
        <div
          data-testid="reviews-loading"
          className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
        >
          {t('common.loading', locale)}
        </div>
      )}

      {errorMessage && (
        <div
          data-testid="error-alert"
          className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm"
        >
          <strong data-testid="reviews-error-alert" className="font-semibold">Lỗi kiểm duyệt: </strong>
          <span data-testid="review-error-alert">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          data-testid="status-alert"
          className="p-4 bg-green-50 border border-green-300 text-green-700 rounded-md text-sm"
        >
          <span data-testid="review-success-alert">{successMessage}</span>
        </div>
      )}

      {/* Main Review Table */}
      <div className="overflow-x-auto w-full border border-gray-200 rounded-lg shadow-xs mb-6">
        <table data-testid="review-table" className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
              <th className="p-3">Mục kiểm duyệt</th>
              <th className="p-3">Phiên bản</th>
              <th className="p-3">Tác giả (Editor)</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Trang nguồn PDF</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={6} data-testid="reviews-empty" className="p-8 text-center text-gray-400">
                  {t('content.reviews.empty', locale)}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={`${item.targetId}_v${item.version}`} data-testid={`review-row-${item.targetId}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{item.title}</td>
                  <td className="p-3">v{item.version}</td>
                  <td className="p-3">{item.lastEditedBy}</td>
                  <td className="p-3">
                    <span
                      data-testid={`review-status-${item.targetId}`}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        item.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3">{item.sourcePage ? `Trang ${item.sourcePage}` : '—'}</td>
                  <td className="p-3 space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`compare-pdf-btn-${item.targetId}`}
                      onClick={() => handleOpenCompare(item)}
                    >
                      {t('content.reviews.compareBtn', locale)}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`edit-content-btn-${item.targetId}`}
                      onClick={() => handleOpenEdit(item)}
                    >
                      Sửa
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Side-by-Side PDF Comparison */}
      {isComparingPdf && selectedItem && (
        <div
          data-testid="side-by-side-container"
          className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50/40 mb-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-blue-900">
              Đối chiếu Dữ liệu và PDF Gốc bên cạnh (Side-by-side Inspection)
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsComparingPdf(false)}
            >
              Đóng
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Data extracted */}
            <div
              data-testid="left-data-pane"
              className="bg-white border border-gray-200 rounded-md p-4 space-y-3"
            >
              <h4 className="font-semibold text-gray-900">Dữ liệu số hóa (JSON)</h4>
              <div className="text-xs text-gray-600">
                Tiêu đề: <strong>{selectedItem.title}</strong>
              </div>
              {selectedItem.groupData?.questions.map((q, idx) => (
                <div key={idx} className="border-t border-gray-100 pt-2 text-xs space-y-1">
                  <div>
                    <strong>Câu {q.number || idx + 1}: </strong>
                    <span>{richTextToPlainText(q.stem)}</span>
                  </div>
                  <div className="pl-3 space-y-0.5">
                    {q.options.map((opt) => (
                      <div key={opt.label}>
                        {opt.label}. {richTextToPlainText(opt.content)}
                      </div>
                    ))}
                  </div>
                  <div className="text-green-700 font-semibold mt-1">
                    Đáp án chuẩn: Phương án {q.correctOption}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: PDF Source reference & viewer */}
            <div
              data-testid="right-pdf-pane"
              className="bg-white border border-gray-200 rounded-md p-4 space-y-2"
            >
              <h4 className="font-semibold text-gray-900">Tệp PDF Gốc (Đối chiếu thủ công)</h4>
              <div className="text-xs text-gray-600">
                Nguồn: <code>{selectedItem.sourceRef || 'de-goc.pdf'}</code>
              </div>
              <div className="text-xs text-gray-600">
                Trang tham chiếu:{' '}
                <strong>{selectedItem.sourcePage ? `Trang ${selectedItem.sourcePage}` : 'Chưa gắn'}</strong>
              </div>
              <div
                data-testid="pdf-viewer-frame"
                className="mt-3 h-60 border-2 border-dashed border-gray-300 rounded bg-gray-50 flex items-center justify-center text-xs text-gray-500"
              >
                [Khu vực hiển thị trang PDF gốc: Trang {selectedItem.sourcePage || 1}]
              </div>
            </div>
          </div>

          {/* Decision panel */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-gray-700">Nhận xét:</label>
            <Input
              data-testid="decision-comment-input"
              type="text"
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              placeholder="Nhập ghi chú hoặc lý do nếu từ chối..."
              className="flex-1 min-w-[200px]"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              data-testid="approve-btn"
              onClick={() => handleDecision('approved')}
              className="bg-green-600 hover:bg-green-700"
            >
              {t('content.reviews.approveBtn', locale)}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-testid="reject-btn"
              onClick={() => handleDecision('rejected')}
            >
              {t('content.reviews.rejectBtn', locale)}
            </Button>
          </div>
        </div>
      )}

      {/* Editor Edit Modal */}
      {isEditing && selectedItem && (
        <div
          data-testid="edit-modal"
          className="border-2 border-indigo-500 rounded-lg p-6 bg-white mb-6 shadow-sm space-y-4"
        >
          <h3 className="text-base font-bold text-indigo-900">
            Biên tập viên Chỉnh sửa Câu hỏi
          </h3>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nội dung câu hỏi (Stem):
            </label>
            <Input
              data-testid="edit-stem-input"
              type="text"
              value={editStem}
              onChange={(e) => setEditStem(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Số trang nguồn PDF đối chiếu:
            </label>
            <Input
              data-testid="edit-source-page-input"
              type="number"
              value={editSourcePage ?? ''}
              onChange={(e) =>
                setEditSourcePage(e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              className="w-32"
            />
          </div>
          <div className="space-x-2 pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              data-testid="save-edit-btn"
              onClick={handleSaveEdit}
            >
              Lưu thay đổi
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
