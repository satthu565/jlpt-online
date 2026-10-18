'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { t } from '../../../lib/i18n';

export interface QuestionReportItem {
  id: string;
  questionId: string;
  examTitle?: string;
  level?: string;
  issueType?: string;
  reason?: string;
  description?: string;
  details?: string;
  status: 'open' | 'investigating' | 'resolved' | 'rejected' | 'dismissed' | 'in_review';
  reporterEmail?: string;
  reportedBy?: string;
  createdAt: string;
  resolutionNote?: string;
  notes?: string;
}

const INITIAL_CONTENT_REPORTS: QuestionReportItem[] = [
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
];

export interface ContentReportsPageProps {
  initialReports?: QuestionReportItem[];
}

export default function ContentReportsPage({ initialReports }: ContentReportsPageProps = {}): React.JSX.Element {
  const { token, locale } = useAdminAuth();

  const [reports, setReports] = useState<QuestionReportItem[]>(() => initialReports || INITIAL_CONTENT_REPORTS);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<QuestionReportItem | null>(null);
  const [resolutionInput, setResolutionInput] = useState<string>('');

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/admin/content-reports', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setErrorMsg(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setErrorMsg(t('auth.forbidden', locale));
        } else {
          setErrorMsg(t('common.error', locale));
        }
        return;
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items || data.reports || [];
      if (Array.isArray(items)) {
        setReports(items);
      }
    } catch {
      setErrorMsg(t('common.error', locale));
    } finally {
      setIsLoading(false);
    }
  }, [token, locale]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const filtered = reports.filter((r) => {
    if (filterType === 'all') return true;
    const issue = r.issueType || r.reason;
    const stat = r.status;
    return issue === filterType || stat === filterType;
  });

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/content-reports/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify({
          status: 'resolved',
          notes: resolutionInput || 'Đã sửa lỗi và xác nhận',
        }),
      });

      if (res.ok) {
        setSelectedReport(null);
        setResolutionInput('');
        void fetchReports();
        return;
      }
      setErrorMsg('Lỗi khi cập nhật trạng thái báo cáo.');
    } catch {
      setErrorMsg('Lỗi khi cập nhật trạng thái báo cáo.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/content-reports/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify({
          status: 'dismissed',
          notes: 'Đã kiểm tra, câu hỏi chuẩn xác',
        }),
      });

      if (res.ok) {
        setSelectedReport(null);
        setResolutionInput('');
        void fetchReports();
        return;
      }
      setErrorMsg('Lỗi khi bác bỏ báo cáo.');
    } catch {
      setErrorMsg('Lỗi khi bác bỏ báo cáo.');
    }
  };

  return (
    <AdminGuard pathname="/reports/content">
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            {t('contentReports.title', locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('contentReports.subtitle', locale)}
          </p>
        </header>

        {errorMsg && (
          <div
            role="alert"
            data-testid="content-reports-error-alert"
            className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center justify-between"
          >
            <span>{errorMsg}</span>
            <button
              onClick={() => void fetchReports()}
              className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
            >
              {t('common.retry', locale)}
            </button>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            data-testid="content-reports-loading"
            className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-gray-700">Lọc theo:</label>
          <select
            data-testid="select-report-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-800 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Tất cả báo cáo ({reports.length})</option>
            <option value="open">Đang mở (Chờ xử lý)</option>
            <option value="investigating">Đang điều tra</option>
            <option value="in_review">Đang xem xét</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="wrong_answer">Lỗi sai đáp án</option>
            <option value="audio_broken">Lỗi âm thanh</option>
            <option value="typo">Lỗi chính tả</option>
          </select>
        </div>

        {/* Report List */}
        {filtered.length === 0 && !isLoading && !errorMsg ? (
          <div
            data-testid="content-reports-empty"
            className="p-6 text-center text-gray-500 bg-white rounded-lg border border-gray-200 text-xs"
          >
            {t('contentReports.empty', locale)}
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((item) => {
              const displayStatus = item.status === 'dismissed' ? 'rejected' : item.status;
              const issueDesc = item.description || item.details || item.reason || 'Sự cố câu hỏi';
              const reporter = item.reporterEmail || item.reportedBy || 'Học viên ẩn danh';

              return (
                <div
                  key={item.id}
                  data-testid={`report-card-${item.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 md:p-5 flex flex-col gap-3 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                        {item.level || 'JLPT'}
                      </span>
                      <span className="font-semibold text-gray-900 text-xs">
                        {item.examTitle || 'Bộ đề thi trực tuyến'}
                      </span>
                      <span className="text-gray-500 text-xs">Mã: {item.questionId}</span>
                    </div>
                    <span
                      data-testid={`report-status-${item.id}`}
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                        displayStatus === 'resolved'
                          ? 'bg-green-100 text-green-800'
                          : displayStatus === 'open'
                          ? 'bg-amber-100 text-amber-800'
                          : displayStatus === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {displayStatus}
                    </span>
                  </div>

                  <div className="text-xs text-gray-800 bg-gray-50 p-3 rounded border border-gray-100">
                    <strong>Vấn đề báo cáo ({item.issueType || item.reason || 'content'}):</strong> {issueDesc}
                  </div>

                  {(item.resolutionNote || item.notes) && (
                    <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-100">
                      ✓ <strong>Ghi chú xử lý:</strong> {item.resolutionNote || item.notes}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                    <span className="text-gray-400 text-[11px]">
                      Gửi bởi: {reporter} lúc {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </span>

                    {displayStatus !== 'resolved' && displayStatus !== 'rejected' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          data-testid={`btn-resolve-${item.id}`}
                          onClick={() => setSelectedReport(item)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                        >
                          {t('contentReports.resolve', locale)}
                        </button>
                        <button
                          type="button"
                          data-testid={`btn-reject-${item.id}`}
                          onClick={() => void handleReject(item.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
                        >
                          {t('contentReports.dismiss', locale)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Resolve */}
        {selectedReport && (
          <div
            data-testid="modal-resolve-report"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-base font-bold text-gray-900">
                Xác nhận giải quyết báo cáo {selectedReport.id}
              </h3>
              <label className="block text-xs font-semibold text-gray-700">
                Ghi chú điều chỉnh / sửa đổi câu hỏi:
              </label>
              <textarea
                data-testid="input-resolution-note"
                rows={3}
                value={resolutionInput}
                onChange={(e) => setResolutionInput(e.target.value)}
                placeholder="Nhập ghi chú chi tiết về phương án sửa câu hỏi..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-resolve"
                  onClick={() => void handleResolve(selectedReport.id)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-xs"
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
