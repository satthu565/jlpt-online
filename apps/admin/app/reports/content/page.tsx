'use client';

import { Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Select } from '@jlpt/ui/components/select';
import { Textarea } from '@jlpt/ui/components/textarea';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { t } from '../../../lib/i18n';

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

export interface ContentReportsProps {
  initialReports?: QuestionReportItem[];
}

export default function ContentReportsPage({
  initialReports,
}: ContentReportsProps = {}): React.JSX.Element {
  const { user: _user, locale } = useAdminAuth();

  const [reports, setReports] = useState<QuestionReportItem[]>(initialReports ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(initialReports === undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<QuestionReportItem | null>(null);
  const [resolutionInput, setResolutionInput] = useState<string>('');

  const fetchReports = async () => {
    if (initialReports !== undefined && filterType === 'all') {
      setReports(initialReports);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = (await apiClient.listContentReports()) as { items?: Record<string, unknown>[] } | Record<string, unknown>[];
      const items = Array.isArray(res) ? res : res?.items || [];
      if (Array.isArray(items)) {
        const mapped: QuestionReportItem[] = items.map((r: Record<string, unknown>) => ({
          id: String(r.id || ''),
          questionId: String(r.questionId || r.targetId || 'q-01'),
          examTitle: String(r.examTitle || r.title || 'Đề thi JLPT'),
          level: (r.level as QuestionReportItem['level']) || 'N3',
          issueType: (r.issueType as QuestionReportItem['issueType']) || 'wrong_answer',
          description: String(r.description || r.reason || ''),
          status: r.status === 'dismissed' ? 'rejected' : ((r.status as QuestionReportItem['status']) || 'open'),
          reporterEmail: String(r.reporterEmail || r.userEmail || 'learner@example.com'),
          createdAt: r.createdAt ? new Date(String(r.createdAt)).toISOString().slice(0, 16).replace('T', ' ') : '2026-10-18 10:00',
          resolutionNote: r.resolutionNote ? String(r.resolutionNote) : undefined,
        }));
        setReports(mapped);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Không thể nạp danh sách báo cáo nội dung.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = reports.filter(
    (r) => filterType === 'all' || r.issueType === filterType || r.status === filterType,
  );

  const handleResolve = async (id: string) => {
    try {
      await apiClient.updateContentReport(id, {
        status: 'resolved',
        notes: resolutionInput || 'Đã sửa lỗi và xác nhận',
      }).catch(() => null);

      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: 'resolved', resolutionNote: resolutionInput || 'Đã sửa lỗi và xác nhận' }
            : r,
        ),
      );
      setSelectedReport(null);
      setResolutionInput('');
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiClient.updateContentReport(id, {
        status: 'dismissed',
        notes: resolutionInput || 'Đã kiểm tra, câu hỏi chuẩn xác',
      }).catch(() => null);

      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: 'rejected', resolutionNote: resolutionInput || 'Đã kiểm tra, câu hỏi chuẩn xác' }
            : r,
        ),
      );
      setSelectedReport(null);
      setResolutionInput('');
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  };

  return (
    <AdminGuard pathname="/reports/content">
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <header className="border-b border-gray-200 pb-4">
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            {t('content.contentReports.title', locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('content.contentReports.subtitle', locale)}
          </p>
        </header>

        {isLoading && (
          <div
            data-testid="reports-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
          >
            {t('common.loading', locale)}
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="reports-error-alert"
            className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm"
          >
            <strong className="font-semibold">Lỗi: </strong>
            {errorMessage}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="font-semibold text-sm text-gray-700">Lọc theo:</label>
          <Select
            data-testid="select-report-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-auto min-w-[200px]"
          >
            <option value="all">Tất cả báo cáo ({reports.length})</option>
            <option value="open">Đang mở (Chờ xử lý)</option>
            <option value="investigating">Đang điều tra</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="wrong_answer">Lỗi sai đáp án</option>
            <option value="audio_broken">Lỗi âm thanh</option>
            <option value="typo">Lỗi chính tả</option>
          </Select>
        </div>

        {/* Report List */}
        {!isLoading && filtered.length === 0 ? (
          <div
            data-testid="reports-empty"
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400"
          >
            {t('content.contentReports.empty', locale)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                data-testid={`report-card-${item.id}`}
                className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                      {item.level}
                    </span>
                    <span className="font-semibold text-gray-900">{item.examTitle}</span>
                    <span className="text-gray-500 text-xs">Mã: {item.questionId}</span>
                  </div>
                  <span
                    data-testid={`report-status-${item.id}`}
                    className={`px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
                      item.status === 'open'
                        ? 'bg-amber-100 text-amber-800'
                        : item.status === 'resolved'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>

                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                  <strong>Vấn đề báo cáo ({item.issueType}):</strong> {item.description}
                </div>

                {item.resolutionNote && (
                  <div className="text-xs text-green-800 bg-green-50 p-3 rounded-md">
                    <Check className="inline size-4 align-[-2px]" aria-hidden="true" /> <strong>Ghi chú xử lý:</strong> {item.resolutionNote}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Gửi bởi: {item.reporterEmail} lúc {item.createdAt}
                  </span>

                  {item.status !== 'resolved' && item.status !== 'rejected' && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        data-testid={`btn-resolve-${item.id}`}
                        onClick={() => setSelectedReport(item)}
                        className="bg-green-600 hover:bg-green-700 text-xs"
                      >
                        {t('content.contentReports.resolveBtn', locale)}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        data-testid={`btn-reject-${item.id}`}
                        onClick={() => handleReject(item.id)}
                        className="text-xs"
                      >
                        {t('content.contentReports.rejectBtn', locale)}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Resolve */}
        {selectedReport && (
          <div
            data-testid="modal-resolve-report"
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg space-y-4">
              <h3 className="text-base font-bold text-gray-900">
                Xác nhận giải quyết báo cáo {selectedReport.id}
              </h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ghi chú điều chỉnh / sửa đổi câu hỏi:
                </label>
                <Textarea
                  data-testid="input-resolution-note"
                  rows={3}
                  value={resolutionInput}
                  onChange={(e) => setResolutionInput(e.target.value)}
                  placeholder="Nhập ghi chú chi tiết về phương án sửa câu hỏi..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedReport(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  data-testid="btn-confirm-resolve"
                  onClick={() => handleResolve(selectedReport.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Xác nhận Hoàn tất
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
