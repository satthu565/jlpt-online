'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { ExamListView } from '../../features/exam';
import type { StaffOperator, AdminExam } from '../../features/exam/types';
import { createTextSegment } from '../../features/content/types';

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

  const currentOperator: StaffOperator = {
    id: user?.id || 'admin_01',
    email: user?.email || 'admin@jlpt.local',
    role: user?.role || 'admin',
    name: user?.name || 'Administrator',
  };

  return (
    <AdminGuard pathname="/exams" requiredRoles={['editor', 'reviewer', 'admin']}>
      <ExamListView initialExams={[SAMPLE_EXAM]} currentOperator={currentOperator} />
    </AdminGuard>
  );
}
