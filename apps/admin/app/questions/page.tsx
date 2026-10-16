'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import type { RichBlock, RichText } from '@jlpt/schema';
import {
  createParagraphBlock,
  createRubySegment,
  createStarSegment,
  createTableBlock,
  createTextSegment,
  createUnderlineSegment,
} from '../../features/content/types';
import type { AdminQuestionGroup } from '../../features/content/types';
import {
  PassageBlocksEditor,
  RichTextSegmentEditor,
} from '../../features/content/richtext-editor';
import { QuestionGroupPreview } from '../../features/content/preview';
import { QuestionBankManager } from '../../features/content/question-bank';

const INITIAL_STEM: RichText = [
  createTextSegment('山田さんは'),
  createRubySegment('毎日', 'まいにち'),
  createTextSegment('日本語を'),
  createUnderlineSegment('勉強'),
  createTextSegment('して'),
  createStarSegment(),
  createTextSegment('います。'),
];

const INITIAL_PASSAGE: RichBlock[] = [
  createParagraphBlock([
    createTextSegment('これはJLPT N1 bài đọc mẫu với đoạn chữ, '),
    createRubySegment('漢字', 'かんじ'),
    createTextSegment(' và bảng biểu bên dưới:'),
  ]),
  createTableBlock([
    [[createTextSegment('Cột 1')], [createTextSegment('Cột 2')]],
    [[createTextSegment('Dữ liệu A')], [createTextSegment('Dữ liệu B')]],
  ]),
];

const SAMPLE_GROUP: AdminQuestionGroup = {
  id: 'grp_sample_01',
  version: 1,
  level: 'N1',
  sectionCode: 'language_knowledge',
  mondaiType: 'kanji_reading',
  skill: 'reading',
  title: 'Mondai 1: Cách đọc chữ Hán',
  instructions: [createTextSegment('Chọn cách đọc đúng cho từ được gạch chân.')],
  passage: INITIAL_PASSAGE,
  audioMediaKey: 'audio/n1_sample.mp3',
  mediaIds: ['audio/n1_sample.mp3'],
  questions: [
    {
      tempId: 'q1',
      number: '1',
      stem: INITIAL_STEM,
      options: [
        { label: '1', content: [createTextSegment('べんきょう')] },
        { label: '2', content: [createTextSegment('べんきょ')] },
        { label: '3', content: [createTextSegment('はんきょう')] },
        { label: '4', content: [createTextSegment('べんぎょう')] },
      ],
      correctOption: 1,
      explanation: [createTextSegment('Từ 勉強 đọc là べんきょう (benkyou).')],
    },
  ],
  sourceRef: 'https://www.jlpt.jp/sample.html',
  status: 'draft',
  lastEditedBy: 'staff_1',
  authorId: 'staff_1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function QuestionsPage(): React.JSX.Element {
  const { user } = useAdminAuth();
  const [manager] = useState(() => new QuestionBankManager([SAMPLE_GROUP]));
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [currentGroup, setCurrentGroup] = useState<AdminQuestionGroup>(SAMPLE_GROUP);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpdateStem = (newStem: RichText) => {
    const updatedQuestions = [...currentGroup.questions];
    if (updatedQuestions[0]) {
      updatedQuestions[0] = { ...updatedQuestions[0], stem: newStem };
      setCurrentGroup({ ...currentGroup, questions: updatedQuestions });
    }
  };

  const handleUpdatePassage = (newBlocks: RichBlock[]) => {
    setCurrentGroup({ ...currentGroup, passage: newBlocks });
  };

  const handleSaveDraft = () => {
    if (!user) return;
    try {
      const res = manager.updateGroup(
        currentGroup.id,
        {
          instructions: currentGroup.instructions,
          passage: currentGroup.passage,
          questions: currentGroup.questions,
        },
        user,
      );
      setCurrentGroup(res.group);
      setMessage(
        res.isNewVersion
          ? `Đã tạo phiên bản mới v${res.group.version} (nhóm đã approved không bị sửa đè)!`
          : `Đã lưu bản thảo v${res.group.version} thành công!`,
      );
    } catch (err: unknown) {
      setMessage((err as Error).message);
    }
  };

  return (
    <AdminGuard pathname="/questions" requiredRoles={['editor', 'admin']}>
      <div style={{ padding: '2rem' }} className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            Ngân hàng câu hỏi (Question Bank Editor)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Soạn thảo RichText (ruby, star ★, đoạn văn, bảng, nghe) và xem trước với phòng thi thật.
          </p>
        </div>

        {message && (
          <div data-testid="save-message" className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded text-sm">
            {message}
          </div>
        )}

        <div className="flex space-x-2 border-b pb-2">
          <button
            type="button"
            data-testid="btn-view-editor"
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 text-sm font-semibold rounded-t ${
              activeTab === 'editor' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Trình soạn thảo RichText
          </button>
          <button
            type="button"
            data-testid="btn-view-preview"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-semibold rounded-t ${
              activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Xem trước (Phòng thi)
          </button>
        </div>

        {activeTab === 'editor' ? (
          <div className="space-y-6">
            <div className="bg-white p-4 border rounded-lg shadow-xs space-y-4">
              <h2 className="text-base font-bold text-gray-800">1. Soạn thảo đề bài (Ruby, Star ★, Gạch chân)</h2>
              <RichTextSegmentEditor
                value={currentGroup.questions[0]?.stem ?? []}
                onChange={handleUpdateStem}
                label="Đề bài câu hỏi số 1"
              />
            </div>

            <div className="bg-white p-4 border rounded-lg shadow-xs space-y-4">
              <h2 className="text-base font-bold text-gray-800">2. Soạn thảo bài đọc (Đoạn văn & Bảng biểu)</h2>
              <PassageBlocksEditor
                blocks={currentGroup.passage ?? []}
                onChange={handleUpdatePassage}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                data-testid="btn-save-group"
                onClick={handleSaveDraft}
                className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
              >
                Lưu nhóm câu hỏi
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Giao diện phòng thi thật của thí sinh:</span>
            </div>
            <QuestionGroupPreview group={currentGroup} showCorrectAnswers={true} />
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
