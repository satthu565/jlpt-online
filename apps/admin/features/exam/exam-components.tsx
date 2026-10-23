'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Checkbox } from '@jlpt/ui/components/checkbox';
import { Input } from '@jlpt/ui/components/input';
import type { PublicExamSnapshot } from '@jlpt/schema';
import type { AdminExam, StaffOperator, PublishedVersionRecord } from './types';
import { richTextToPlainText } from '../content/types';
import { apiClient } from '../../lib/api-client';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';

export interface ExamListViewProps {
  initialExams?: AdminExam[];
  currentOperator: StaffOperator;
  onExamPublished?: (exam: AdminExam) => void;
}

const STATUS_LABEL: Record<string, string> = {
  published: 'Đã xuất bản',
  draft: 'Chưa xuất bản',
  takedown: 'Đã gỡ',
  archived: 'Lưu trữ',
};

export function ExamListView({
  initialExams = [],
  currentOperator,
  onExamPublished,
}: ExamListViewProps): React.JSX.Element {
  const { locale } = useAdminAuth();
  const [exams, setExams] = useState<AdminExam[]>(initialExams);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [previewSnapshot, setPreviewSnapshot] = useState<PublicExamSnapshot | null>(null);
  const [historyExamId, setHistoryExamId] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<PublishedVersionRecord[]>([]);

  const [takedownExamId, setTakedownExamId] = useState<string | null>(null);
  const [takedownReason, setTakedownReason] = useState<string>('');

  const [deleteExam, setDeleteExam] = useState<AdminExam | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  // The confirm boxes render below a long exam table; bring them into view when they open.
  const confirmBoxRef = useRef<HTMLDivElement | null>(null);
  // Đề 0 câu (thường do test hoặc đề trộn rỗng tạo ra) ẩn mặc định để bảng dễ đọc.
  const [showEmptyExams, setShowEmptyExams] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = (await apiClient.listExams()) as { items?: AdminExam[] } | AdminExam[];
      const raw = Array.isArray(res) ? res : res?.items || [];
      // API trả publishedVersion nhưng không trả status; suy ra để cột trạng thái không trống.
      const items = raw.map((e) => ({
        ...e,
        status: e.status ?? (e.publishedVersion ? 'published' : 'draft'),
      })) as AdminExam[];
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

  useEffect(() => {
    if (deleteExam || takedownExamId) {
      confirmBoxRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [deleteExam, takedownExamId]);

  const handlePreview = async (exam: AdminExam) => {
    try {
      const snapshot = await apiClient.getExamPreview(exam.id);
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
      if (
        typeof window !== 'undefined' &&
        typeof window.confirm === 'function' &&
        !window.confirm(`Duyệt toàn bộ câu hỏi và xuất bản "${exam.title}"? Thao tác được ghi vào nhật ký kiểm toán.`)
      ) {
        return;
      }
      const res = await apiClient.approveAndPublishExam(exam.id);
      const approvedNote = res.approvedGroups > 0 ? ` Đã duyệt ${res.approvedGroups} nhóm câu.` : '';
      setStatusMessage(
        `Xuất bản thành công! Đề thi đạt phiên bản v${res.version ?? (exam.publishedVersion ? exam.publishedVersion + 1 : 1)}.${approvedNote} Snapshot không lộ đáp án.`,
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
      await apiClient.unpublishExam(takedownExamId, takedownReason || 'Admin unpublish');
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

  const handleOpenDelete = (exam: AdminExam) => {
    setDeleteExam(exam);
    setDeleteConfirm('');
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteExam || deleteConfirm.trim() !== deleteExam.slug) return;
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      const res = await apiClient.deleteExam(deleteExam.id, deleteConfirm.trim());
      setStatusMessage(
        t('content.exams.deleteDone', locale)
          .replace('{title}', deleteExam.title)
          .replace('{attempts}', String(res.deletedAttempts)),
      );
      setDeleteExam(null);
      await fetchExams();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewHistory = async (exam: AdminExam) => {
    try {
      // Published versions come from exam_versions via the API (takedowns are not stored per version).
      const detail = (await apiClient.getExam(exam.id)) as {
        versions?: Array<{ version: number; publishedAt: string; publishedBy: string }>;
      };
      const history = (detail.versions ?? []).map((v) => ({
        version: v.version,
        publishedAt: new Date(v.publishedAt).toLocaleString('vi-VN'),
        publishedBy: v.publishedBy,
        takedownAt: null,
        takedownReason: null,
      })) as unknown as PublishedVersionRecord[];
      setVersionHistory(history);
      setHistoryExamId(exam.id);
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
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

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <Checkbox
          data-testid="show-empty-exams"
          checked={showEmptyExams}
          onCheckedChange={(v) => setShowEmptyExams(v === true)}
        />
        Hiện cả đề 0 câu
      </label>

      {/* Exam Table */}
      <div className="overflow-x-auto w-full mb-6">
        <Table data-testid="exam-table" className="text-left">
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề đề thi</TableHead>
              <TableHead>Cấp độ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Phiên bản</TableHead>
              <TableHead>Số câu hỏi</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && exams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} data-testid="exams-empty" className="text-center">
                  {t('content.exams.empty', locale)}
                </TableCell>
              </TableRow>
            ) : (
              exams.filter((exam) => showEmptyExams || (exam.totalQuestions ?? 0) > 0).map((exam) => (
                <TableRow key={exam.id} data-testid={`exam-row-${exam.id}`}>
                  <TableCell className="font-medium">{exam.title}</TableCell>
                  <TableCell>{exam.level}</TableCell>
                  <TableCell>
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
                      {STATUS_LABEL[exam.status as string] ?? exam.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {exam.publishedVersion ? `v${exam.publishedVersion}` : 'Chưa có'}
                  </TableCell>
                  <TableCell>{exam.totalQuestions}</TableCell>
                  <TableCell className="space-x-2">
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
                        Duyệt &amp; xuất bản
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
                    {currentOperator.role === 'admin' && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        data-testid={`delete-exam-btn-${exam.id}`}
                        onClick={() => handleOpenDelete(exam)}
                      >
                        {t('content.exams.deleteBtn', locale)}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Exam Preview on Test Interface Simulation */}
      {previewSnapshot && (
        <div
          data-testid="exam-preview-modal"
          className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] border-blue-500 p-6 mb-6"
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
          ref={confirmBoxRef}
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

      {/* Delete Modal */}
      {deleteExam && (
        <div ref={confirmBoxRef} data-testid="delete-exam-modal" className="border-2 border-red-500 rounded-lg p-6 bg-red-50 mb-6">
          <h3 className="text-base font-bold text-red-900 mb-2">
            {t('content.exams.deleteTitle', locale).replace('{title}', deleteExam.title)}
          </h3>
          <p className="text-xs text-red-700 mb-4">{t('content.exams.deleteWarning', locale)}</p>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              {t('content.exams.deleteConfirmLabel', locale)} <code>{deleteExam.slug}</code>
            </label>
            <Input
              data-testid="delete-exam-confirm-input"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteExam.slug}
              className="w-full"
            />
          </div>
          <div className="space-x-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-testid="confirm-delete-exam-btn"
              disabled={isDeleting || deleteConfirm.trim() !== deleteExam.slug}
              onClick={handleConfirmDelete}
            >
              {t('content.exams.deleteConfirmBtn', locale)}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setDeleteExam(null)}>
              {t('content.exams.deleteCancel', locale)}
            </Button>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyExamId && (
        <div
          data-testid="version-history-modal"
          className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-6 mb-6"
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
              <Table className="text-left">
                <TableHeader>
                  <TableRow>
                    <TableHead>Phiên bản</TableHead>
                    <TableHead>Thời điểm xuất bản</TableHead>
                    <TableHead>Người xuất bản</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Lý do gỡ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versionHistory.map((ver) => (
                    <TableRow key={ver.version} data-testid={`version-row-${ver.version}`}>
                      <TableCell className="font-semibold">v{ver.version}</TableCell>
                      <TableCell>{ver.publishedAt}</TableCell>
                      <TableCell>{ver.publishedBy}</TableCell>
                      <TableCell>
                        {ver.takedownAt ? (
                          <span className="text-red-600 font-semibold">Đã gỡ ({ver.takedownAt})</span>
                        ) : (
                          <span className="text-green-600 font-semibold">Đang hiệu lực</span>
                        )}
                      </TableCell>
                      <TableCell>{ver.takedownReason || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
