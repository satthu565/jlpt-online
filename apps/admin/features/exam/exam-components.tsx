'use client';

import React, { useState } from 'react';
import type { PublicExamSnapshot } from '@jlpt/schema';
import type { AdminExam, StaffOperator, PublishedVersionRecord } from './types';
import { ExamService } from './exam-service';
import { richTextToPlainText } from '../content/types';

export interface ExamListViewProps {
  initialExams?: AdminExam[];
  currentOperator: StaffOperator;
  onExamPublished?: (exam: AdminExam) => void;
}

export function ExamListView({
  initialExams = [],
  currentOperator,
  onExamPublished,
}: ExamListViewProps): React.JSX.Element {
  const [service] = useState(() => new ExamService(initialExams));
  const [exams, setExams] = useState<AdminExam[]>(() =>
    initialExams.length > 0 ? initialExams : service.listExams(),
  );

  const [previewSnapshot, setPreviewSnapshot] = useState<PublicExamSnapshot | null>(null);
  const [historyExamId, setHistoryExamId] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<PublishedVersionRecord[]>([]);

  const [takedownExamId, setTakedownExamId] = useState<string | null>(null);
  const [takedownReason, setTakedownReason] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshExams = () => {
    setExams([...service.listExams()]);
  };

  const handlePreview = (exam: AdminExam) => {
    try {
      const snapshot = service.getExamPreview(exam.id, exam.publishedVersion ?? undefined);
      setPreviewSnapshot(snapshot);
      setErrorMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handlePublish = (exam: AdminExam) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = service.publishExam(exam.id, currentOperator);
      setStatusMessage(
        `Xuất bản thành công! Đề thi đạt phiên bản v${res.exam.publishedVersion}. Snapshot không lộ đáp án.`,
      );
      onExamPublished?.(res.exam);
      refreshExams();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handleOpenTakedown = (exam: AdminExam) => {
    setTakedownExamId(exam.id);
    setTakedownReason('');
    setErrorMessage(null);
  };

  const handleConfirmTakedown = () => {
    if (!takedownExamId) return;
    setErrorMessage(null);
    try {
      const res = service.takedownExam(takedownExamId, takedownReason, currentOperator);
      setStatusMessage(
        `Đã gỡ đề thi khỏi xuất bản (Takedown v${res.takedownRecord.version}). Phiên bản cũ vẫn được lưu trữ nguyên vẹn trong lịch sử.`,
      );
      setTakedownExamId(null);
      refreshExams();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handleViewHistory = (exam: AdminExam) => {
    const history = service.getVersionHistory(exam.id);
    setVersionHistory(history);
    setHistoryExamId(exam.id);
    setErrorMessage(null);
  };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <h2 data-testid="exam-page-title" style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
          Quản lý & Xuất bản Đề thi (Exam Management)
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Xem trước đề theo giao diện thí sinh, thẩm định blueprint, xuất bản phiên bản mới và gỡ đề
          nhưng bảo tồn toàn bộ lịch sử phiên bản.
        </p>
        <div style={{ fontSize: '0.85rem', color: '#475569' }}>
          Đăng nhập hiện tại: <strong>{currentOperator.email}</strong> (Vai trò: <code>{currentOperator.role}</code>)
        </div>
      </div>

      {errorMessage && (
        <div
          data-testid="exam-error-alert"
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
          <strong>Lỗi thao tác: </strong>
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div
          data-testid="exam-success-alert"
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
          {statusMessage}
        </div>
      )}

      {/* Exams Table */}
      <table
        data-testid="exams-table"
        style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', marginBottom: '2rem' }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Tên đề thi</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Cấp độ</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Trạng thái</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Phiên bản</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Số câu</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {exams.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                Chưa có đề thi nào.
              </td>
            </tr>
          ) : (
            exams.map((exam) => (
              <tr key={exam.id} data-testid={`exam-row-${exam.id}`} style={{ fontSize: '0.85rem' }}>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 500 }}>
                  {exam.title}
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{exam.slug}</div>
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{exam.level}</td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <span
                    data-testid={`exam-status-${exam.id}`}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: exam.status === 'published' ? '#dcfce7' : '#fef3c7',
                      color: exam.status === 'published' ? '#166534' : '#92400e',
                    }}
                  >
                    {exam.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  {exam.publishedVersion ? `v${exam.publishedVersion}` : 'Chưa xuất bản'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  {exam.totalQuestions}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <button
                    data-testid={`preview-exam-btn-${exam.id}`}
                    onClick={() => handlePreview(exam)}
                    style={{
                      marginRight: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Xem trước (PDF-24)
                  </button>
                  {exam.status === 'published' ? (
                    <button
                      data-testid={`takedown-exam-btn-${exam.id}`}
                      onClick={() => handleOpenTakedown(exam)}
                      style={{
                        marginRight: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      Gỡ đề (Takedown)
                    </button>
                  ) : (
                    <button
                      data-testid={`publish-exam-btn-${exam.id}`}
                      onClick={() => handlePublish(exam)}
                      style={{
                        marginRight: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#22c55e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      Xuất bản (ADM-07)
                    </button>
                  )}
                  <button
                    data-testid={`history-exam-btn-${exam.id}`}
                    onClick={() => handleViewHistory(exam)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Lịch sử (PDF-29)
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PDF-24: Exam Preview on Test Interface Simulation */}
      {previewSnapshot && (
        <div
          data-testid="exam-preview-modal"
          style={{
            border: '2px solid #2563eb',
            borderRadius: '8px',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e40af' }}>
                Xem trước Đề thi trên Giao diện làm bài (PDF-24)
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Hiển thị đúng cấu trúc phòng thi của thí sinh: {previewSnapshot.title} (
                {previewSnapshot.level} - Tổng {previewSnapshot.totalQuestions} câu) - Tuyệt đối không lộ
                đáp án!
              </p>
            </div>
            <button onClick={() => setPreviewSnapshot(null)} style={{ padding: '0.25rem 0.5rem' }}>
              Đóng xem trước
            </button>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem' }}>
            {previewSnapshot.sections.map((sec, secIdx) => (
              <div key={sec.code} style={{ marginBottom: '1.5rem' }}>
                <div
                  style={{
                    backgroundColor: '#f1f5f9',
                    padding: '0.5rem 0.75rem',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    borderRadius: '4px',
                    color: '#334155',
                  }}
                >
                  Phần {secIdx + 1}: {sec.title} ({Math.round(sec.durationSec / 60)} phút)
                </div>
                {sec.groups.map((grp) => (
                  <div
                    key={grp.groupId}
                    style={{
                      padding: '0.75rem',
                      borderBottom: '1px dashed #cbd5e1',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem' }}>
                      <em>{richTextToPlainText(grp.instructions)}</em>
                    </div>
                    {grp.questions.map((q) => (
                      <div key={q.questionId} style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        <div>
                          <strong>Câu {q.number}: </strong>
                          <span>{richTextToPlainText(q.stem)}</span>
                        </div>
                        <div style={{ marginTop: '0.25rem', paddingLeft: '1rem' }}>
                          {q.options.map((opt) => (
                            <div key={opt.label} style={{ marginTop: '0.15rem' }}>
                              <label style={{ cursor: 'pointer' }}>
                                <input type="radio" name={`preview_q_${q.questionId}`} disabled />
                                <span style={{ marginLeft: '0.4rem' }}>
                                  {opt.label}. {richTextToPlainText(opt.content)}
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Takedown Modal */}
      {takedownExamId && (
        <div
          data-testid="takedown-modal"
          style={{
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '1.5rem',
            backgroundColor: '#fef2f2',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#991b1b' }}>
            Xác nhận Gỡ Đề thi (Takedown - Giữ version cũ)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
            Hệ thống sẽ chuyển đề thi về trạng thái gỡ xuất bản, đồng thời lưu giữ nguyên vẹn bản ghi phiên
            bản cũ cùng snapshot trong lịch sử.
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Lý do gỡ đề (bắt buộc):
            </label>
            <input
              data-testid="takedown-reason-input"
              type="text"
              value={takedownReason}
              onChange={(e) => setTakedownReason(e.target.value)}
              placeholder="Ví dụ: Đổi nội dung câu 4 theo phản hồi bản quyền..."
              style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}
            />
          </div>
          <button
            data-testid="confirm-takedown-btn"
            onClick={handleConfirmTakedown}
            style={{
              padding: '0.4rem 1rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 600,
              cursor: 'pointer',
              marginRight: '0.5rem',
            }}
          >
            Xác nhận Gỡ Đề
          </button>
          <button onClick={() => setTakedownExamId(null)} style={{ padding: '0.4rem 0.75rem', cursor: 'pointer' }}>
            Hủy
          </button>
        </div>
      )}

      {/* Version History Modal (PDF-29: Takedown giữ version cũ) */}
      {historyExamId && (
        <div
          data-testid="version-history-modal"
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>
              Lịch sử các phiên bản đã xuất bản (Version History - PDF-29)
            </h3>
            <button onClick={() => setHistoryExamId(null)} style={{ padding: '0.2rem 0.5rem' }}>
              Đóng
            </button>
          </div>

          {versionHistory.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Đề thi chưa có phiên bản xuất bản nào.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Phiên bản</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Thời điểm xuất bản</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Người xuất bản</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Trạng thái / Gỡ đề</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Lý do gỡ</th>
                </tr>
              </thead>
              <tbody>
                {versionHistory.map((ver) => (
                  <tr key={ver.version} data-testid={`version-row-${ver.version}`}>
                    <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                      v{ver.version}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>{ver.publishedAt}</td>
                    <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>{ver.publishedBy}</td>
                    <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                      {ver.takedownAt ? (
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>
                          Đã gỡ ({ver.takedownAt})
                        </span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>Đang hiệu lực</span>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                      {ver.takedownReason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
