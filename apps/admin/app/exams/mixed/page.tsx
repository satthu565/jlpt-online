'use client';

import React, { useState, useEffect } from 'react';
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
            <h1 className="text-2xl font-bold text-gray-900">
              {t('content.mixedExams.title', locale)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('content.mixedExams.subtitle', locale)}
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-create-mixed-exam"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700 transition-colors shadow-xs self-start"
          >
            {t('content.mixedExams.createBtn', locale)}
          </button>
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
          <span className="text-sm font-semibold text-gray-700 mr-2">Cấp độ:</span>
          {['all', 'N1', 'N2', 'N3', 'N4', 'N5'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              data-testid={`filter-level-${lvl}`}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                selectedLevel === lvl
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {lvl === 'all' ? 'Tất cả' : lvl}
            </button>
          ))}
        </div>

        {/* Exam Cards */}
        {!isLoading && filtered.length === 0 ? (
          <div
            data-testid="mixed-empty"
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400"
          >
            <p className="mb-4">{t('content.mixedExams.empty', locale)}</p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700"
            >
              Tạo đề trộn đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((exam) => (
              <div
                key={exam.id}
                data-testid={`mixed-exam-card-${exam.id}`}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                      {exam.level}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                      {exam.mode === 'random'
                        ? 'Trộn ngẫu nhiên'
                        : exam.mode === 'weak_points'
                          ? 'Tập trung điểm yếu'
                          : 'Theo từng mondai'}
                    </span>
                    <span className="text-xs text-gray-400">| Seed: {exam.seed}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{exam.title}</h3>
                  <div className="mt-1 text-xs text-gray-500 space-x-3">
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
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium"
                  >
                    {t('content.mixedExams.viewDetail', locale)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg space-y-4">
              <h3 data-testid="create-modal-title" className="text-lg font-bold text-gray-900">
                Khởi tạo Đề thi Trộn Mới
              </h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tiêu đề đề thi:
                </label>
                <input
                  data-testid="input-mixed-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Đề Trộn Tổng Hợp N3 Tháng 10"
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cấp độ:</label>
                  <select
                    data-testid="select-mixed-level"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as 'N1' | 'N2' | 'N3' | 'N4' | 'N5')}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="N1">N1</option>
                    <option value="N2">N2</option>
                    <option value="N3">N3</option>
                    <option value="N4">N4</option>
                    <option value="N5">N5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Chế độ trộn:</label>
                  <select
                    data-testid="select-mixed-mode"
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as 'random' | 'weak_points' | 'by_mondai')}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="random">Ngẫu nhiên chuẩn</option>
                    <option value="weak_points">Tập trung điểm yếu</option>
                    <option value="by_mondai">Theo mondai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Số lượng câu hỏi:</label>
                <input
                  data-testid="input-mixed-count"
                  type="number"
                  value={newCount}
                  onChange={(e) => setNewCount(Number(e.target.value))}
                  min={10}
                  max={100}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  data-testid="btn-cancel-create-mixed"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 border border-gray-300 rounded text-sm font-medium hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  data-testid="btn-submit-create-mixed"
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                >
                  Tạo đề
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
