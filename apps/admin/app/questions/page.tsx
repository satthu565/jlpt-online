'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api-client';
import { t } from '../../lib/i18n';
import type { RichBlock, RichText } from '@jlpt/schema';
import { createTextSegment } from '../../features/content/types';
import type { AdminQuestionGroup } from '../../features/content/types';
import {
  PassageBlocksEditor,
  RichTextSegmentEditor,
} from '../../features/content/richtext-editor';
import { QuestionGroupPreview } from '../../features/content/preview';
import { QuestionBankManager } from '../../features/content/question-bank';

export default function QuestionsPage(): React.JSX.Element {
  const { user, locale } = useAdminAuth();
  const [manager] = useState(() => new QuestionBankManager([]));
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [currentGroup, setCurrentGroup] = useState<AdminQuestionGroup | null>(null);
  const [_groupsList, setGroupsList] = useState<AdminQuestionGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    apiClient
      .listQuestionGroups()
      .then((res: unknown) => {
        if (!mounted) return;
        const data = res as { items?: AdminQuestionGroup[] } | AdminQuestionGroup[];
        const items = Array.isArray(data) ? data : data?.items || [];
        if (items.length > 0) {
          setGroupsList(items);
          setCurrentGroup(items[0] || null);
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setErrorAlert((err as Error)?.message || 'Không thể tải danh sách câu hỏi từ API.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateNewDraft = () => {
    const newGroup: AdminQuestionGroup = {
      id: `grp_${Date.now()}`,
      version: 1,
      level: 'N1',
      sectionCode: 'language_knowledge',
      mondaiType: 'kanji_reading',
      skill: 'reading',
      title: 'Nhóm câu hỏi mới',
      instructions: [createTextSegment('Chọn đáp án đúng.')],
      passage: [],
      mediaIds: [],
      questions: [
        {
          number: '1',
          stem: [createTextSegment('Câu hỏi mẫu số 1')],
          options: [
            { label: '1', content: [createTextSegment('Phương án 1')] },
            { label: '2', content: [createTextSegment('Phương án 2')] },
            { label: '3', content: [createTextSegment('Phương án 3')] },
            { label: '4', content: [createTextSegment('Phương án 4')] },
          ],
          correctOption: 1,
          explanation: [createTextSegment('Giải thích chi tiết cho câu hỏi.')],
        },
      ],
      sourceRef: 'manual_draft',
      sourcePage: 1,
      status: 'draft',
      lastEditedBy: user?.id || 'staff_1',
      authorId: user?.id || 'staff_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentGroup(newGroup);
  };

  const handleUpdateStem = (newStem: RichText) => {
    if (!currentGroup) return;
    const updatedQuestions = [...currentGroup.questions];
    if (updatedQuestions[0]) {
      updatedQuestions[0] = { ...updatedQuestions[0], stem: newStem };
      setCurrentGroup({ ...currentGroup, questions: updatedQuestions });
    }
  };

  const handleUpdatePassage = (newBlocks: RichBlock[]) => {
    if (!currentGroup) return;
    setCurrentGroup({ ...currentGroup, passage: newBlocks });
  };

  const handleSaveDraft = async () => {
    if (!currentGroup || !user) return;
    setErrorAlert(null);
    setMessage(null);
    try {
      await apiClient
        .updateQuestionGroup(currentGroup.id, {
          instructions: currentGroup.instructions,
          passage: currentGroup.passage,
          questions: currentGroup.questions,
        })
        .catch(() => {
          // Fallback to local manager if offline/mock
          manager.updateGroup(
            currentGroup.id,
            {
              instructions: currentGroup.instructions,
              passage: currentGroup.passage,
              questions: currentGroup.questions,
            },
            user,
          );
        });
      setMessage(`Đã lưu bản thảo v${currentGroup.version} thành công!`);
    } catch (err: unknown) {
      setErrorAlert((err as Error).message);
    }
  };

  return (
    <AdminGuard pathname="/questions" requiredRoles={['editor', 'admin']}>
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <div className="border-b border-gray-200 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
              {t('content.questions.title', locale)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('content.questions.subtitle', locale)}
            </p>
          </div>
          {!currentGroup && !isLoading && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              data-testid="btn-create-group"
              onClick={handleCreateNewDraft}
              className="self-start"
            >
              + Tạo nhóm câu hỏi mới
            </Button>
          )}
        </div>

        {isLoading && (
          <div
            data-testid="questions-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
          >
            {t('common.loading', locale)}
          </div>
        )}

        {errorAlert && (
          <div
            data-testid="questions-error-alert"
            className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm"
          >
            <strong className="font-semibold">Lỗi: </strong>
            {errorAlert}
          </div>
        )}

        {message && (
          <div
            data-testid="save-message"
            className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm"
          >
            {message}
          </div>
        )}

        {!isLoading && !currentGroup && (
          <div
            data-testid="questions-empty"
            className="border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-lg p-12 text-center text-gray-500"
          >
            <p className="mb-4">{t('content.questions.empty', locale)}</p>
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateNewDraft}
            >
              Tạo nhóm câu hỏi đầu tiên
            </Button>
          </div>
        )}

        {currentGroup && (
          <>
            <div className="flex space-x-2 border-b border-gray-200 dark:border-slate-800 pb-2">
              <Button
                type="button"
                variant={activeTab === 'editor' ? 'primary' : 'secondary'}
                size="sm"
                data-testid="btn-view-editor"
                onClick={() => setActiveTab('editor')}
              >
                {t('content.questions.editorTab', locale)}
              </Button>
              <Button
                type="button"
                variant={activeTab === 'preview' ? 'primary' : 'secondary'}
                size="sm"
                data-testid="btn-view-preview"
                onClick={() => setActiveTab('preview')}
              >
                {t('content.questions.previewTab', locale)}
              </Button>
            </div>

            {activeTab === 'editor' ? (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-5 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xs space-y-4">
                  <h2 className="text-base font-bold text-gray-800 dark:text-slate-100">
                    {t('content.questions.stemTitle', locale)}
                  </h2>
                  <RichTextSegmentEditor
                    value={currentGroup.questions[0]?.stem ?? []}
                    onChange={handleUpdateStem}
                    label="Đề bài câu hỏi số 1"
                  />
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xs space-y-4">
                  <h2 className="text-base font-bold text-gray-800 dark:text-slate-100">
                    {t('content.questions.passageTitle', locale)}
                  </h2>
                  <PassageBlocksEditor
                    blocks={currentGroup.passage ?? []}
                    onChange={handleUpdatePassage}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    data-testid="btn-save-group"
                    onClick={handleSaveDraft}
                  >
                    {t('content.questions.saveBtn', locale)}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {t('content.questions.previewPrompt', locale)}
                  </span>
                </div>
                <QuestionGroupPreview group={currentGroup} showCorrectAnswers={true} />
              </div>
            )}
          </>
        )}
      </div>
    </AdminGuard>
  );
}
