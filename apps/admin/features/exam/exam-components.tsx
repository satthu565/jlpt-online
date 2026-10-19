'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@jlpt/ui';
import type { PublicExamSnapshot } from '@jlpt/schema';
import type { AdminExam, StaffOperator, PublishedVersionRecord } from './types';
import { ExamService } from './exam-service';
import { richTextToPlainText } from '../content/types';
import { apiClient } from '../../lib/api-client';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

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
  const { locale } = useAdminAuth();
  const [service] = useState(() => new ExamService(initialExams));
  const [exams, setExams] = useState<AdminExam[]>(initialExams);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [previewSnapshot, setPreviewSnapshot] = useState<PublicExamSnapshot | null>(null);
  const [historyExamId, setHistoryExamId] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<PublishedVersionRecord[]>([]);

  const [takedownExamId, setTakedownExamId] = useState<string | null>(null);
  const [takedownReason, setTakedownReason] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = (await apiClient.listExams()) as { items?: AdminExam[] } | AdminExam[];
      const items = Array.isArray(res) ? res : res?.items || [];
      if (Array.isArray(items) && items.length > 0) {
        setExams(items);
      } else if (initialExams.length > 0) {
        setExams(initialExams);
      } else {
        setExams([]);
      }
    } catch {
      if (initialExams.length > 0) {
        setExams(initialExams);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

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

  const handlePublish = async (exam: AdminExam) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await apiClient.publishExam(exam.id);
      setStatusMessage(
        `Xuất bản thành công! Đề thi đạt phiên bản v${exam.publishedVersion ? exam.publishedVersion + 1 : 1}. Snapshot không lộ đáp án.`,
      );
      onExamPublished?.(exam);
      await fetchExams();
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

  const handleConfirmTakedown = async () => {
    if (!takedownExamId) return;
    setErrorMessage(null);
    try {
      await apiClient.unpublishExam(takedownExamId, takedownReason);
      setStatusMessage(
        `Đã gỡ đề thi khỏi xuất bản (Takedown). Phiên bản cũ vẫn được lưu trữ nguyên vẹn trong lịch sử.`,
      );
      setTakedownExamId(null);
      await fetchExams();
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
    <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="border-b border-gray-200 pb-4">
        <h2 data-testid="exam-page-title" className="text-2xl font-bold text-gray-900">
          {t('content.exams.title', locale)}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('content.exams.subtitle', locale)}
        </p>
        <div className="mt-2 text-xs text-gray-600">
          Đăng nhập hiện tại: <strong>{currentOperator.email}</strong> (Vai trò: <code>{currentOperator.role}</code>)
        </div>
      </div>

      {isLoading && (
        <div
          data-testid="exams-loading"
          className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
        >
          {t('common.loading', locale)}
        </div>
      )}

      {errorMessage && (
        <div
          data-testid="exam-error-alert"
          className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm"
        >
          <strong data-testid="exams-error-alert" className="font-semibold">Lỗi: </strong>
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div
          data-testid="status-alert"
          className="p-4 bg-green-50 border border-green-300 text-green-700 rounded-md text-sm"
        >
          {statusMessage}
        </div>
      )}

      {/* Exam Table */}
      <div className="overflow-x-auto w-full border border-gray-200 rounded-lg shadow-xs mb-6">
        <table data-testid="exam-table" className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
              <th className="p-3">Tiêu đề đề thi</th>
              <th className="p-3">Cấp độ</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Phiên bản</th>
              <th className="p-3">Số câu hỏi</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && exams.length === 0 ? (
              <tr>
                <td colSpan={6} data-testid="exams-empty" className="p-8 text-center text-gray-400">
                  {t('content.exams.empty', locale)}
                </td>
              </tr>
            ) : (
              exams.map((exam) => (
                <tr key={exam.id} data-testid={`exam-row-${exam.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{exam.title}</td>
                  <td className="p-3">{exam.level}</td>
                  <td className="p-3">
                    <span
                      data-testid={`exam-status-${exam.id}`}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        exam.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : exam.status === 'archived'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {exam.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {exam.publishedVersion ? `v${exam.publishedVersion}` : 'Chưa có'}
                  </td>
                  <td className="p-3">{exam.totalQuestions}</td>
                  <td className="p-3 space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`preview-exam-btn-${exam.id}`}
                      onClick={() => handlePreview(exam)}
                    >
                      {t('content.exams.previewBtn', locale)}
                    </Button>
                    {exam.status === 'published' ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        data-testid={`takedown-exam-btn-${exam.id}`}
                        onClick={() => handleOpenTakedown(exam)}
                      >
                        {t('content.exams.unpublishBtn', locale)}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        data-testid={`publish-exam-btn-${exam.id}`}
                        onClick={() => handlePublish(exam)}
                      >
                        {t('content.exams.publishBtn', locale)}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      data-testid={`history-exam-btn-${exam.id}`}
                      onClick={() => handleViewHistory(exam)}
                    >
                      Lịch sử
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Exam Preview on Test Interface Simulation */}
      {previewSnapshot && (
        <div
          data-testid="exam-preview-modal"
          className="border-2 border-blue-500 rounded-lg p-6 bg-white dark:bg-slate-900 mb-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300">
                Xem trước Đề thi trên Giao diện làm bài
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {previewSnapshot.title} ({previewSnapshot.level} - Tổng {previewSnapshot.totalQuestions} câu) - Tuyệt đối không lộ đáp án!
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPreviewSnapshot(null)}
            >
              Đóng xem trước
            </Button>
          </div>

          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            {previewSnapshot.sections.map((sec, secIdx) => (
              <div key={sec.code} className="space-y-2">
                <div className="bg-gray-100 px-3 py-1.5 font-semibold text-sm rounded text-gray-700">
                  Phần {secIdx + 1}: {sec.title} ({Math.round(sec.durationSec / 60)} phút)
                </div>
                {sec.groups.map((grp) => (
                  <div key={grp.groupId} className="p-3 border-b border-dashed border-gray-200">
                    <div className="text-xs text-gray-500 italic mb-2">
                      {richTextToPlainText(grp.instructions)}
                    </div>
                    {grp.questions.map((q) => (
                      <div key={q.questionId} className="mt-2 text-sm">
                        <div className="font-medium text-gray-900">
                          Câu {q.number}: {richTextToPlainText(q.stem)}
                        </div>
                        <div className="mt-1 pl-4 space-y-1">
                          {q.options.map((opt) => (
                            <div key={opt.label} className="text-xs text-gray-700">
                              <span className="font-semibold">{opt.label}.</span> {richTextToPlainText(opt.content)}
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
          className="border-2 border-red-500 rounded-lg p-6 bg-red-50 mb-6"
        >
          <h3 className="text-base font-bold text-red-900 mb-2">
            Xác nhận Gỡ Đề thi (Takedown - Giữ version cũ)
          </h3>
          <p className="text-xs text-red-700 mb-4">
            Hệ thống sẽ chuyển đề thi về trạng thái gỡ xuất bản, đồng thời lưu giữ nguyên vẹn bản ghi phiên bản cũ cùng snapshot trong lịch sử.
          </p>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Lý do gỡ đề (bắt buộc):
            </label>
            <Input
              data-testid="takedown-reason-input"
              type="text"
              value={takedownReason}
              onChange={(e) => setTakedownReason(e.target.value)}
              placeholder="Ví dụ: Đổi nội dung câu 4 theo phản hồi bản quyền..."
              className="w-full"
            />
          </div>
          <div className="space-x-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-testid="confirm-takedown-btn"
              onClick={handleConfirmTakedown}
            >
              Xác nhận Gỡ Đề
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setTakedownExamId(null)}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyExamId && (
        <div
          data-testid="version-history-modal"
          className="border border-gray-300 dark:border-slate-800 rounded-lg p-6 bg-white dark:bg-slate-900 mb-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
              Lịch sử các phiên bản đã xuất bản (Version History)
            </h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setHistoryExamId(null)}
            >
              Đóng
            </Button>
          </div>

          {versionHistory.length === 0 ? (
            <p className="text-sm text-gray-400">Đề thi chưa có phiên bản xuất bản nào.</p>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <th className="p-2.5">Phiên bản</th>
                    <th className="p-2.5">Thời điểm xuất bản</th>
                    <th className="p-2.5">Người xuất bản</th>
                    <th className="p-2.5">Trạng thái</th>
                    <th className="p-2.5">Lý do gỡ</th>
                  </tr>
                </thead>
                <tbody>
                  {versionHistory.map((ver) => (
                    <tr key={ver.version} data-testid={`version-row-${ver.version}`} className="border-b border-gray-100">
                      <td className="p-2.5 font-semibold">v{ver.version}</td>
                      <td className="p-2.5">{ver.publishedAt}</td>
                      <td className="p-2.5">{ver.publishedBy}</td>
                      <td className="p-2.5">
                        {ver.takedownAt ? (
                          <span className="text-red-600 font-semibold">Đã gỡ ({ver.takedownAt})</span>
                        ) : (
                          <span className="text-green-600 font-semibold">Đang hiệu lực</span>
                        )}
                      </td>
                      <td className="p-2.5">{ver.takedownReason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
