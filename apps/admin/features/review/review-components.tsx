'use client';

import React, { useState } from 'react';
import type { ReviewItem, StaffOperator } from './types';
import { SelfReviewForbiddenError } from './types';
import { ReviewService } from './review-service';
import { richTextToPlainText, createTextSegment } from '../content/types';

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
  const [service] = useState(() => new ReviewService(initialItems));
  const [items, setItems] = useState<ReviewItem[]>(() =>
    initialItems.length > 0 ? initialItems : service.listAllReviews(),
  );
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [isComparingPdf, setIsComparingPdf] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit fields state
  const [editStem, setEditStem] = useState('');
  const [editSourcePage, setEditSourcePage] = useState<number | undefined>(undefined);
  const [editComment, setEditComment] = useState('');

  const refreshItems = () => {
    setItems([...service.listAllReviews()]);
  };

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
      refreshItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handleDecision = (decision: 'approved' | 'rejected') => {
    if (!selectedItem) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = service.reviewDecision(
        selectedItem.targetId,
        selectedItem.version,
        { decision, comment: editComment || (decision === 'approved' ? 'Phê duyệt đạt chuẩn' : '') },
        currentOperator,
      );
      setSelectedItem(updated);
      setSuccessMessage(
        decision === 'approved' ? 'Phê duyệt nội dung thành công!' : 'Đã từ chối nội dung.',
      );
      setIsComparingPdf(false);
      onItemReviewed?.(updated);
      refreshItems();
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
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <h2 data-testid="review-title" style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
          Hàng Đợi Kiểm Duyệt Nội Dung (Two-Person Review)
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Quy trình kiểm duyệt 2 bước độc lập: Biên tập viên soạn/chỉnh sửa, Người duyệt độc lập thẩm tra
          đáp án và đối chiếu PDF gốc.
        </p>
        <div style={{ fontSize: '0.85rem', color: '#475569' }}>
          Đăng nhập hiện tại: <strong>{currentOperator.email}</strong> (Vai trò: <code>{currentOperator.role}</code>)
        </div>
      </div>

      {errorMessage && (
        <div
          data-testid="review-error-alert"
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            color: '#b91c1c',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          <strong>Lỗi kiểm duyệt: </strong>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          data-testid="review-success-alert"
          style={{
            padding: '1rem',
            backgroundColor: '#dcfce7',
            border: '1px solid #22c55e',
            borderRadius: '6px',
            color: '#15803d',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Main Review Table */}
      <table
        data-testid="review-table"
        style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', marginBottom: '2rem' }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Mục kiểm duyệt</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Phiên bản</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Tác giả (Editor)</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Trạng thái</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Trang nguồn PDF</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                Hàng đợi kiểm duyệt hiện tại đang trống.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={`${item.targetId}_v${item.version}`} data-testid={`review-row-${item.targetId}`}>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 500 }}>
                  {item.title}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>v{item.version}</td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{item.lastEditedBy}</td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <span
                    data-testid={`review-status-${item.targetId}`}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor:
                        item.status === 'approved'
                          ? '#dcfce7'
                          : item.status === 'rejected'
                            ? '#fee2e2'
                            : '#fef3c7',
                      color:
                        item.status === 'approved'
                          ? '#166534'
                          : item.status === 'rejected'
                            ? '#991b1b'
                            : '#92400e',
                    }}
                  >
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  {item.sourcePage ? `Trang ${item.sourcePage}` : '—'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <button
                    data-testid={`compare-pdf-btn-${item.targetId}`}
                    onClick={() => handleOpenCompare(item)}
                    style={{
                      marginRight: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Đối chiếu PDF (PDF-19)
                  </button>
                  <button
                    data-testid={`edit-content-btn-${item.targetId}`}
                    onClick={() => handleOpenEdit(item)}
                    style={{
                      marginRight: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Sửa (PDF-20)
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Side-by-Side PDF Comparison (PDF-19) */}
      {isComparingPdf && selectedItem && (
        <div
          data-testid="side-by-side-container"
          style={{
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '1.5rem',
            backgroundColor: '#f8fafc',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e3a8a' }}>
              Đối chiếu Dữ liệu và PDF Gốc bên cạnh (Side-by-side Inspection)
            </h3>
            <button onClick={() => setIsComparingPdf(false)} style={{ padding: '0.2rem 0.5rem' }}>
              Đóng
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Left Column: Data extracted */}
            <div
              data-testid="left-data-pane"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '1rem',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Dữ liệu số hóa (JSON)</h4>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem' }}>
                Tiêu đề: <strong>{selectedItem.title}</strong>
              </div>
              {selectedItem.groupData?.questions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.5rem',
                    marginTop: '0.5rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <strong>Câu {q.number || idx + 1}: </strong>
                    <span>{richTextToPlainText(q.stem)}</span>
                  </div>
                  <div style={{ marginTop: '0.25rem', paddingLeft: '0.75rem' }}>
                    {q.options.map((opt) => (
                      <div key={opt.label}>
                        {opt.label}. {richTextToPlainText(opt.content)}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.25rem', color: '#16a34a', fontWeight: 600 }}>
                    Đáp án chuẩn: Phương án {q.correctOption}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: PDF Source reference & viewer */}
            <div
              data-testid="right-pdf-pane"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '1rem',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Tệp PDF Gốc (Đối chiếu thủ công)</h4>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                Nguồn: <code>{selectedItem.sourceRef || 'de-goc.pdf'}</code>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}>
                Trang tham chiếu:{' '}
                <strong>{selectedItem.sourcePage ? `Trang ${selectedItem.sourcePage}` : 'Chưa gắn'}</strong>
              </div>
              <div
                data-testid="pdf-viewer-frame"
                style={{
                  marginTop: '1rem',
                  height: '240px',
                  border: '1px dashed #94a3b8',
                  borderRadius: '4px',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '0.85rem',
                }}
              >
                [Khu vực hiển thị trang PDF gốc: Trang {selectedItem.sourcePage || 1}]
              </div>
            </div>
          </div>

          {/* Decision panel */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Nhận xét / Lý do thẩm định:
            </label>
            <input
              data-testid="decision-comment-input"
              type="text"
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              placeholder="Nhập ghi chú hoặc lý do nếu từ chối..."
              style={{ width: '60%', padding: '0.4rem', fontSize: '0.85rem', marginRight: '1rem' }}
            />
            <button
              data-testid="approve-btn"
              onClick={() => handleDecision('approved')}
              style={{
                padding: '0.4rem 1rem',
                backgroundColor: '#22c55e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: 'pointer',
                marginRight: '0.5rem',
              }}
            >
              Phê duyệt (Approve)
            </button>
            <button
              data-testid="reject-btn"
              onClick={() => handleDecision('rejected')}
              style={{
                padding: '0.4rem 1rem',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Từ chối (Reject)
            </button>
          </div>
        </div>
      )}

      {/* Editor Edit Modal (PDF-20) */}
      {isEditing && selectedItem && (
        <div
          data-testid="edit-modal"
          style={{
            border: '2px solid #6366f1',
            borderRadius: '8px',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#312e81' }}>
            Biên tập viên Chỉnh sửa Câu hỏi (PDF-20)
          </h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Nội dung câu hỏi (Stem):
            </label>
            <input
              data-testid="edit-stem-input"
              type="text"
              value={editStem}
              onChange={(e) => setEditStem(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Số trang nguồn PDF đối chiếu:
            </label>
            <input
              data-testid="edit-source-page-input"
              type="number"
              value={editSourcePage ?? ''}
              onChange={(e) =>
                setEditSourcePage(e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              style={{ width: '120px', padding: '0.4rem', fontSize: '0.85rem' }}
            />
          </div>
          <button
            data-testid="save-edit-btn"
            onClick={handleSaveEdit}
            style={{
              padding: '0.4rem 1rem',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 600,
              cursor: 'pointer',
              marginRight: '0.5rem',
            }}
          >
            Lưu thay đổi
          </button>
          <button
            onClick={() => setIsEditing(false)}
            style={{ padding: '0.4rem 0.75rem', cursor: 'pointer' }}
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}
