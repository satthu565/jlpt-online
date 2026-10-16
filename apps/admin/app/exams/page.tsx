'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import type { Blueprint } from '@jlpt/schema';
import type { AdminExam } from '../../features/content/types';
import { createTextSegment } from '../../features/content/types';
import { ExamManager } from '../../features/content/exam-manager';

const SAMPLE_BP: Blueprint = {
  id: 'bp_N1',
  level: 'N1',
  version: 1,
  kind: 'official',
  status: 'active',
  effectiveFrom: '2026-01-01',
  sourceRef: [{ url: 'https://www.jlpt.jp/official.html', accessedAt: '2026-01-01T00:00:00Z' }],
  sections: [
    {
      code: 'language_knowledge',
      title: 'Kiến thức ngôn ngữ',
      durationSec: 6600,
      mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 1 }],
    },
  ],
  scoring: {
    method: 'linear_reference',
    rounding: 'round',
    scoringSections: [
      { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['kanji'], maxScaled: 60, minPass: 19 },
    ],
    totalMax: 60,
    totalPass: 30,
  },
};

const SAMPLE_EXAM: AdminExam = {
  id: 'ex_N1_2026',
  slug: 'jlpt-n1-2026-07',
  level: 'N1',
  title: 'Đề thi chính thức JLPT N1 - Kỳ 07/2026',
  kind: 'original',
  description: 'Đề thi chuẩn JLPT N1 theo blueprint chính thức.',
  blueprintId: 'bp_N1',
  blueprintVersion: 1,
  sourceRefs: ['https://www.jlpt.jp'],
  sections: [
    {
      code: 'language_knowledge',
      title: 'Kiến thức ngôn ngữ',
      durationSec: 6600,
      orderIndex: 1,
      items: [
        {
          id: 'item_1',
          examId: 'ex_N1_2026',
          sectionCode: 'language_knowledge',
          groupVersionId: 'grp_1_v1',
          groupId: 'grp_1',
          orderIndex: 1,
          group: {
            id: 'grp_1',
            version: 1,
            level: 'N1',
            sectionCode: 'language_knowledge',
            mondaiType: 'kanji_reading',
            skill: 'kanji',
            instructions: [createTextSegment('Chọn cách đọc đúng.')],
            passage: null,
            mediaIds: [],
            questions: [
              {
                number: '1',
                stem: [createTextSegment('漢字の読み方')],
                options: [
                  { label: '1', content: [createTextSegment('かんじ')] },
                  { label: '2', content: [createTextSegment('かんち')] },
                  { label: '3', content: [createTextSegment('がんじ')] },
                  { label: '4', content: [createTextSegment('はんじ')] },
                ],
                correctOption: 1,
              },
            ],
            sourceRef: 'https://www.jlpt.jp',
            status: 'approved',
            lastEditedBy: 'author_1',
            authorId: 'author_1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      ],
    },
  ],
  totalQuestions: 1,
  status: 'draft',
  publishedVersion: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function ExamsPage(): React.JSX.Element {
  const { user } = useAdminAuth();
  const [manager] = useState(() => new ExamManager([SAMPLE_EXAM]));
  const [exams, setExams] = useState<AdminExam[]>(() => manager.listExams());
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePublish = (examId: string) => {
    if (!user) return;
    setErrorMsg(null);
    setMessage(null);
    try {
      const res = manager.publishExam(examId, SAMPLE_BP, user);
      setExams(manager.listExams());
      setMessage(
        `Đã xuất bản đề thi '${res.exam.title}' thành công (Phiên bản xuất bản v${res.exam.publishedVersion})! Đã sinh snapshot công khai không lộ đáp án và lưu answer key bảo mật riêng biệt.`,
      );
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleAttemptOverwrite = (examId: string) => {
    if (!user) return;
    setErrorMsg(null);
    setMessage(null);
    try {
      // Trying to edit a published exam in-place
      manager.updateExam(examId, { title: 'Tên mới' }, user);
      setExams(manager.listExams());
    } catch (err: unknown) {
      setErrorMsg(`Chặn sửa đè thành công: ${(err as Error).message}`);
    }
  };

  return (
    <AdminGuard pathname="/exams" requiredRoles={['editor', 'reviewer', 'admin']}>
      <div style={{ padding: '2rem' }} className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            Quản lý bộ đề thi (Exam Management)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ghép đề theo blueprint, kiểm duyệt tính hợp lệ và xuất bản bất biến (Acceptance 2: Không sửa đè published version).
          </p>
        </div>

        {message && (
          <div data-testid="exam-success-message" className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
            {message}
          </div>
        )}

        {errorMsg && (
          <div data-testid="exam-error-message" className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
            {errorMsg}
          </div>
        )}

        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Tên đề thi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Cấp độ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Loại đề</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Trạng thái</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Version xuất bản</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider text-xs">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {exams.map((ex) => (
                <tr key={ex.id} data-testid={`exam-row-${ex.id}`}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{ex.title}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{ex.level}</td>
                  <td className="px-4 py-3 text-xs">{ex.kind}</td>
                  <td className="px-4 py-3">
                    <span
                      data-testid={`exam-status-${ex.id}`}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        ex.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {ex.status === 'published' ? 'Đã xuất bản' : 'Bản thảo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {ex.publishedVersion ? `v${ex.publishedVersion}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {ex.status !== 'published' && user?.role === 'admin' && (
                      <button
                        type="button"
                        data-testid={`btn-publish-${ex.id}`}
                        onClick={() => handlePublish(ex.id)}
                        className="px-2.5 py-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700 rounded font-medium"
                      >
                        Xuất bản đề
                      </button>
                    )}
                    {ex.status === 'published' && (
                      <button
                        type="button"
                        data-testid={`btn-attempt-overwrite-${ex.id}`}
                        onClick={() => handleAttemptOverwrite(ex.id)}
                        className="px-2.5 py-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300 rounded font-medium"
                        title="Thử sửa đè đề đã xuất bản để kiểm chứng quy tắc bất biến"
                      >
                        Thử sửa đè (Test bất biến)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
