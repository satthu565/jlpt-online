'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';

export interface QuestionReportItem {
  id: string;
  questionId: string;
  examTitle: string;
  level: string;
  issueType: 'wrong_answer' | 'typo' | 'audio_broken' | 'content_error' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'rejected';
  reporterEmail: string;
  createdAt: string;
  resolutionNote?: string;
}

export default function ContentReportsPage(): React.JSX.Element {
  const { user: _user } = useAdminAuth();

  const [reports, setReports] = useState<QuestionReportItem[]>([
    {
      id: 'rep-01',
      questionId: 'q-n3-kanji-04',
      examTitle: 'JLPT N3 Tháng 12/2023',
      level: 'N3',
      issueType: 'wrong_answer',
      description: 'Đáp án đúng trong hệ thống là câu 2, nhưng theo từ điển Daijirin thì câu 3 mới chính xác.',
      status: 'open',
      reporterEmail: 'student1@example.com',
      createdAt: '2026-10-15 09:30',
    },
    {
      id: 'rep-02',
      questionId: 'q-n2-audio-01',
      examTitle: 'JLPT N2 Đề Luyện Số 1',
      level: 'N2',
      issueType: 'audio_broken',
      description: 'File âm thanh mondai 1 bị rè ở giây thứ 15, không nghe rõ đoạn hội thoại.',
      status: 'investigating',
      reporterEmail: 'learner_n2@example.com',
      createdAt: '2026-10-14 14:10',
    },
    {
      id: 'rep-03',
      questionId: 'q-n1-reading-07',
      examTitle: 'JLPT N1 Đề Thi Thử Tháng 7',
      level: 'N1',
      issueType: 'typo',
      description: 'Chữ Hán 憂慮 bị viết nhầm thành 遠慮 ở dòng thứ 4 của đoạn văn.',
      status: 'resolved',
      reporterEmail: 'n1_expert@example.com',
      createdAt: '2026-10-12 11:20',
      resolutionNote: 'Đã đính chính chữ Hán và phát hành bản sửa đổi câu hỏi.',
    },
  ]);

  const [filterType, setFilterType] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<QuestionReportItem | null>(null);
  const [resolutionInput, setResolutionInput] = useState<string>('');

  const filtered = reports.filter(
    (r) => filterType === 'all' || r.issueType === filterType || r.status === filterType,
  );

  const handleResolve = (id: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'resolved', resolutionNote: resolutionInput || 'Đã sửa lỗi và xác nhận' }
          : r,
      ),
    );
    setSelectedReport(null);
    setResolutionInput('');
  };

  const handleReject = (id: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'rejected', resolutionNote: resolutionInput || 'Đã kiểm tra, câu hỏi chuẩn xác' }
          : r,
      ),
    );
    setSelectedReport(null);
    setResolutionInput('');
  };

  return (
    <AdminGuard pathname="/reports/content">
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#111827' }}>
            Quản lý Báo lỗi Câu hỏi từ Người dùng (ADM-09)
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Kiểm duyệt và xử lý các sự cố nội dung, đáp án và file âm thanh được người học gửi về.
          </p>
        </header>

        {/* Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Lọc theo:</label>
          <select
            data-testid="select-report-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
            }}
          >
            <option value="all">Tất cả báo cáo ({reports.length})</option>
            <option value="open">Đang mở (Chờ xử lý)</option>
            <option value="investigating">Đang điều tra</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="wrong_answer">Lỗi sai đáp án</option>
            <option value="audio_broken">Lỗi âm thanh</option>
            <option value="typo">Lỗi chính tả</option>
          </select>
        </div>

        {/* Report List */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              data-testid={`report-card-${item.id}`}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: '#dbeafe',
                      color: '#1e40af',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}
                  >
                    {item.level}
                  </span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{item.examTitle}</span>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>Mã: {item.questionId}</span>
                </div>
                <span
                  data-testid={`report-status-${item.id}`}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background:
                      item.status === 'open'
                        ? '#fef3c7'
                        : item.status === 'resolved'
                          ? '#d1fae5'
                          : item.status === 'rejected'
                            ? '#fee2e2'
                            : '#e0e7ff',
                    color:
                      item.status === 'open'
                        ? '#92400e'
                        : item.status === 'resolved'
                          ? '#065f46'
                          : item.status === 'rejected'
                            ? '#991b1b'
                            : '#3730a3',
                  }}
                >
                  {item.status.toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: '0.95rem', color: '#374151', background: '#f9fafb', padding: '0.75rem', borderRadius: '6px' }}>
                <strong>Vấn đề báo cáo ({item.issueType}):</strong> {item.description}
              </div>

              {item.resolutionNote && (
                <div style={{ fontSize: '0.85rem', color: '#065f46', background: '#ecfdf5', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                  ✓ <strong>Ghi chú xử lý:</strong> {item.resolutionNote}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  Gửi bởi: {item.reporterEmail} lúc {item.createdAt}
                </span>

                {item.status !== 'resolved' && item.status !== 'rejected' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      data-testid={`btn-resolve-${item.id}`}
                      onClick={() => setSelectedReport(item)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      Duyệt & Giải Quyết
                    </button>
                    <button
                      data-testid={`btn-reject-${item.id}`}
                      onClick={() => handleReject(item.id)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      Bác Bỏ
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Resolve */}
        {selectedReport && (
          <div
            data-testid="modal-resolve-report"
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
              <h3 style={{ margin: '0 0 1rem' }}>Xác nhận giải quyết báo cáo {selectedReport.id}</h3>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Ghi chú điều chỉnh / sửa đổi câu hỏi:
              </label>
              <textarea
                data-testid="input-resolution-note"
                rows={3}
                value={resolutionInput}
                onChange={(e) => setResolutionInput(e.target.value)}
                placeholder="Nhập ghi chú chi tiết về phương án sửa câu hỏi..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={() => setSelectedReport(null)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#ffffff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  data-testid="btn-confirm-resolve"
                  onClick={() => handleResolve(selectedReport.id)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#10b981', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Xác nhận Hoàn tất
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
