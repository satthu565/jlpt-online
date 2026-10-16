'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';

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

export default function ExplanationReviewsPage(): React.JSX.Element {
  const { user } = useAdminAuth();

  const [items, setItems] = useState<ExplanationReviewItem[]>([
    {
      id: 'exp-rev-1',
      questionId: 'q-n3-grammar-15',
      version: 2,
      level: 'N3',
      authorId: 'usr-editor-01',
      authorName: 'Biên tập viên A',
      explanationMarkdown: `**Ngữ pháp**: ~わけにはいかない
**Ý nghĩa**: Không thể (về mặt đạo đức, lý trí, xã hội không cho phép làm điều đó).
**Phân tích các phương án**:
1. ~わけがない: Tuyệt đối không thể (phán đoán logic)
2. ~わけにはいかない: Đáp án chính xác.
3. ~はずがない: Làm sao có thể...
4. ~どころではない: Không phải lúc để...`,
      translationVi: 'Vì ngày mai có cuộc họp quan trọng của công ty nên hôm nay tôi không thể uống rượu say được.',
      status: 'pending',
      submittedAt: '2026-10-15 16:40',
    },
    {
      id: 'exp-rev-2',
      questionId: 'q-n2-vocab-08',
      version: 1,
      level: 'N2',
      authorId: user?.id ?? 'current-user-id', // author is current user to test two-person review rule
      authorName: user?.name || 'Tôi (Người tạo)',
      explanationMarkdown: `**Từ vựng**: 怠る (おこたる)
**Ý nghĩa**: Bỏ bê, lơ là, sao nhãng nhiệm vụ hoặc bổn phận.`,
      translationVi: 'Không được lơ là việc chuẩn bị cho kỳ thi.',
      status: 'pending',
      submittedAt: '2026-10-15 17:15',
    },
    {
      id: 'exp-rev-3',
      questionId: 'q-n1-reading-02',
      version: 3,
      level: 'N1',
      authorId: 'usr-editor-02',
      authorName: 'Biên tập viên B',
      explanationMarkdown: `**Phân tích đoạn văn luận điểm**:
Tác giả muốn nhấn mạnh rằng công nghệ AI chỉ là công cụ hỗ trợ tư duy chứ không thể thay thế tính sáng tạo nguyên bản của con người.`,
      translationVi: 'Sự sáng tạo của con người là điều tối thượng không máy móc nào sao chép được.',
      status: 'approved',
      submittedAt: '2026-10-14 10:20',
      reviewerNote: 'Giải thích rất chặt chẽ, văn phong chuẩn mực.',
    },
  ]);

  const [selectedItem, setSelectedItem] = useState<ExplanationReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApprove = (item: ExplanationReviewItem) => {
    // Two-person rule enforcement: reviewer cannot approve their own explanation
    if (user?.id && item.authorId === user.id) {
      setErrorMessage('Quy tắc kiểm duyệt chéo 2 người: Bạn không được tự duyệt lời giải do chính mình biên soạn.');
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'approved', reviewerNote: 'Đã duyệt đạt chuẩn' } : i)),
    );
    setErrorMessage(null);
  };

  const handleReject = (item: ExplanationReviewItem) => {
    if (!rejectReason.trim()) {
      setErrorMessage('Vui lòng nhập lý do yêu cầu chỉnh sửa.');
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: 'rejected', reviewerNote: rejectReason } : i,
      ),
    );
    setSelectedItem(null);
    setRejectReason('');
    setErrorMessage(null);
  };

  return (
    <AdminGuard pathname="/reviews/explanations">
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#111827' }}>
            Kiểm duyệt Lời giải & Bản dịch (ADM-10)
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Quy tắc kiểm soát chất lượng 2 người: Lời giải và bản dịch tiếng Việt phải được người duyệt độc lập phê duyệt trước khi hiển thị cho người học.
          </p>
        </header>

        {errorMessage && (
          <div
            data-testid="error-two-person-rule"
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: '#fee2e2',
              border: '1px solid #ef4444',
              color: '#991b1b',
              marginBottom: '1.5rem',
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Review Queue */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {items.map((item) => {
            const isSelfAuthor = Boolean(user?.id && item.authorId === user.id);

            return (
              <div
                key={item.id}
                data-testid={`explanation-card-${item.id}`}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      {item.level}
                    </span>
                    <strong style={{ fontSize: '1.05rem', color: '#111827' }}>Câu hỏi: {item.questionId}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Phiên bản #{item.version}</span>
                  </div>

                  <span
                    data-testid={`explanation-status-${item.id}`}
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background:
                        item.status === 'approved'
                          ? '#d1fae5'
                          : item.status === 'rejected'
                            ? '#fee2e2'
                            : '#fef3c7',
                      color:
                        item.status === 'approved'
                          ? '#065f46'
                          : item.status === 'rejected'
                            ? '#991b1b'
                            : '#92400e',
                    }}
                  >
                    {item.status === 'approved'
                      ? 'ĐÃ DUYỆT'
                      : item.status === 'rejected'
                        ? 'CẦN CHỈNH SỬA'
                        : 'CHỜ DUYỆT CHÉO'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                      NỘI DUNG LỜI GIẢI (MARKDOWN):
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem', color: '#1f2937' }}>
                      {item.explanationMarkdown}
                    </pre>
                  </div>

                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                      BẢN DỊCH TIẾNG VIỆT:
                    </div>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#1f2937', fontStyle: 'italic' }}>
                      "{item.translationVi}"
                    </p>
                  </div>
                </div>

                {item.reviewerNote && (
                  <div style={{ fontSize: '0.85rem', color: '#065f46', background: '#ecfdf5', padding: '0.5rem 0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
                    ✓ <strong>Ghi chú người duyệt:</strong> {item.reviewerNote}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    Người biên soạn: <strong>{item.authorName}</strong> | Gửi duyệt lúc: {item.submittedAt}
                    {isSelfAuthor && (
                      <span style={{ color: '#d97706', marginLeft: '0.5rem', fontWeight: 600 }}>
                        (Bạn là tác giả bài viết này)
                      </span>
                    )}
                  </div>

                  {item.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        data-testid={`btn-approve-explanation-${item.id}`}
                        onClick={() => handleApprove(item)}
                        style={{
                          padding: '0.45rem 1rem',
                          borderRadius: '6px',
                          background: isSelfAuthor ? '#9ca3af' : '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: isSelfAuthor ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Phê Duyệt
                      </button>
                      <button
                        data-testid={`btn-open-reject-${item.id}`}
                        onClick={() => {
                          setSelectedItem(item);
                          setErrorMessage(null);
                        }}
                        style={{
                          padding: '0.45rem 1rem',
                          borderRadius: '6px',
                          background: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        Yêu Cầu Sửa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Reject Explanation */}
        {selectedItem && (
          <div
            data-testid="modal-reject-explanation"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
              <h3 style={{ margin: '0 0 1rem' }}>Yêu cầu chỉnh sửa lời giải {selectedItem.questionId}</h3>
              <textarea
                data-testid="input-reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nêu rõ lý do từ chối (ví dụ: giải thích chưa rõ ngữ cảnh, dịch sai sắc thái...)"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#ffffff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  data-testid="btn-confirm-reject"
                  onClick={() => handleReject(selectedItem)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Xác nhận Từ chối
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
