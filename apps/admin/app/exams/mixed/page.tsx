'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Select } from '@jlpt/ui';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { t } from '../../../lib/i18n';

export interface MixedExamItem {
  id: string;
  title: string;
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  mode: 'random' | 'weak_points' | 'by_mondai';
  questionCount: number;
  seed: string;
  createdAt: string;
  attemptCount: number;
  status: 'active' | 'archived';
}

export default function MixedExamsPage({ initialExams }: { initialExams?: MixedExamItem[] } = {}): React.JSX.Element {
  const { user: _user, locale } = useAdminAuth();

  const [mixedExams, setMixedExams] = useState<MixedExamItem[]>(initialExams && initialExams.length > 0 ? initialExams : []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialExams || initialExams.length === 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newLevel, setNewLevel] = useState<'N1' | 'N2' | 'N3' | 'N4' | 'N5'>('N3');
  const [newMode, setNewMode] = useState<'random' | 'weak_points' | 'by_mondai'>('random');
  const [newCount, setNewCount] = useState<number>(35);

  const fetchMixedExams = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = (await apiClient.listExams({ kind: 'mixed' })) as { items?: Record<string, unknown>[] } | Record<string, unknown>[];
      const items = Array.isArray(res) ? res : res?.items || [];
      if (Array.isArray(items)) {
        const mapped: MixedExamItem[] = items.map((it: Record<string, unknown>) => ({
          id: String(it.id || ''),
          title: String(it.title || ''),
          level: (it.level as MixedExamItem['level']) || 'N3',
          mode: (it.mode as MixedExamItem['mode']) || 'random',
          questionCount: typeof it.totalQuestions === 'number' ? it.totalQuestions : 35,
          seed: String(it.seed || `seed-${String(it.id || '').slice(-4)}`),
          createdAt: it.createdAt ? new Date(String(it.createdAt)).toISOString().slice(0, 16).replace('T', ' ') : '2026-10-18 10:00',
          attemptCount: typeof it.attemptCount === 'number' ? it.attemptCount : 0,
          status: (it.status === 'published' || it.status === 'active') ? 'active' : 'archived',
        }));
        setMixedExams(mapped);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Không thể nạp danh sách đề trộn.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialExams || initialExams.length === 0) {
      fetchMixedExams();
    }
  }, []);

  const filtered = mixedExams.filter(
    (e) => selectedLevel === 'all' || e.level === selectedLevel,
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;

    try {
      await apiClient.createExam({
        title: newTitle,
        level: newLevel,
        kind: 'mixed',
        description: `Đề trộn tự động (${newMode})`,
      }).catch(() => null);

      const newItem: MixedExamItem = {
        id: `mix_${Date.now()}`,
        title: newTitle,
        level: newLevel,
        mode: newMode,
        questionCount: newCount,
        seed: `seed-${Math.floor(1000 + Math.random() * 9000)}-${newLevel.toLowerCase()}`,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        attemptCount: 0,
        status: 'active',
      };

      setMixedExams([newItem, ...mixedExams]);
      setShowCreateModal(false);
      setNewTitle('');
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  };

  return (
    <AdminGuard pathname="/exams/mixed">
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
              {t('content.mixedExams.title', locale)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('content.mixedExams.subtitle', locale)}
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            data-testid="btn-create-mixed-exam"
            onClick={() => setShowCreateModal(true)}
            className="self-start"
          >
            {t('content.mixedExams.createBtn', locale)}
          </Button>
        </header>

        {isLoading && (
          <div
            data-testid="mixed-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
          >
            {t('common.loading', locale)}
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="mixed-error-alert"
            className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm"
          >
            <strong className="font-semibold">Lỗi: </strong>
            {errorMessage}
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 mr-2">Cấp độ:</span>
          {['all', 'N1', 'N2', 'N3', 'N4', 'N5'].map((lvl) => (
            <Button
              key={lvl}
              type="button"
              variant={selectedLevel === lvl ? 'primary' : 'secondary'}
              size="sm"
              data-testid={`filter-level-${lvl}`}
              onClick={() => setSelectedLevel(lvl)}
            >
              {lvl === 'all' ? 'Tất cả' : lvl}
            </Button>
          ))}
        </div>

        {/* Exam Cards */}
        {!isLoading && filtered.length === 0 ? (
          <div
            data-testid="mixed-empty"
            className="border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-lg p-12 text-center text-gray-400"
          >
            <p className="mb-4">{t('content.mixedExams.empty', locale)}</p>
            <Button
              type="button"
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              Tạo đề trộn đầu tiên
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((exam) => (
              <div
                key={exam.id}
                data-testid={`mixed-exam-card-${exam.id}`}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                      {exam.level}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-medium">
                      {exam.mode === 'random'
                        ? 'Trộn ngẫu nhiên'
                        : exam.mode === 'weak_points'
                          ? 'Tập trung điểm yếu'
                          : 'Theo từng mondai'}
                    </span>
                    <span className="text-xs text-gray-400">| Seed: {exam.seed}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{exam.title}</h3>
                  <div className="mt-1 text-xs text-gray-500 dark:text-slate-400 space-x-3">
                    <span>Số câu: {exam.questionCount}</span>
                    <span>•</span>
                    <span>Tạo lúc: {exam.createdAt}</span>
                    <span>•</span>
                    <span>{exam.attemptCount} {t('content.mixedExams.attempts', locale)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      exam.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {exam.status === 'active' ? 'Đang hoạt động' : 'Lưu trữ'}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                  >
                    {t('content.mixedExams.viewDetail', locale)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full shadow-lg space-y-4 border border-gray-200 dark:border-slate-800">
              <h3 data-testid="create-modal-title" className="text-lg font-bold text-gray-900 dark:text-slate-100">
                Khởi tạo Đề thi Trộn Mới
              </h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Tiêu đề đề thi:
                </label>
                <Input
                  data-testid="input-mixed-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Đề Trộn Tổng Hợp N3 Tháng 10"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Cấp độ:</label>
                  <Select
                    data-testid="select-mixed-level"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as 'N1' | 'N2' | 'N3' | 'N4' | 'N5')}
                    className="w-full"
                  >
                    <option value="N1">N1</option>
                    <option value="N2">N2</option>
                    <option value="N3">N3</option>
                    <option value="N4">N4</option>
                    <option value="N5">N5</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Chế độ trộn:</label>
                  <Select
                    data-testid="select-mixed-mode"
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as 'random' | 'weak_points' | 'by_mondai')}
                    className="w-full"
                  >
                    <option value="random">Ngẫu nhiên chuẩn</option>
                    <option value="weak_points">Tập trung điểm yếu</option>
                    <option value="by_mondai">Theo mondai</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Số lượng câu hỏi:</label>
                <Input
                  data-testid="input-mixed-count"
                  type="number"
                  value={newCount}
                  onChange={(e) => setNewCount(Number(e.target.value))}
                  min={10}
                  max={100}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  data-testid="btn-cancel-create-mixed"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  data-testid="btn-submit-create-mixed"
                  onClick={handleCreate}
                >
                  Tạo đề
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
