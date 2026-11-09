'use client';

import { Layers, NotebookPen, PencilLine } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import {
  NotebookView,
  SrsReviewRunner,
  NotebookQuizView,
  defaultLearningClient,
  defaultSrsSyncManager,
  type NotebookItem,
  type DueFlashcard,
  type NotebookQuiz,
  type CreateNotebookItemInput,
  type NotebookItemKind,
} from '../../../features/learning';
import { loadMoreNotebookExamples } from '../../../features/learning/services/notebook-examples';
import { ExamHero } from '../../../features/library';
import { cleanStemText } from '../../../features/corpus';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Spinner } from '@jlpt/ui/components/spinner';
import Link from 'next/link';

export default function NotebookPage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'notebook' | 'srs' | 'quiz'>('notebook');
  const [items, setItems] = useState<NotebookItem[]>([]);
  const [dueCards, setDueCards] = useState<DueFlashcard[]>([]);
  const [srsError, setSrsError] = useState<string | null>(null);
  const [srsLoading, setSrsLoading] = useState(true);
  const [preparingCards, setPreparingCards] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<NotebookQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const loadNotebookData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      const res = await defaultLearningClient.getNotebookItems();
      setItems(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('403') || msg.includes('UNAUTHENTICATED') || msg.includes('Yêu cầu đăng nhập')) {
        setIsUnauthorized(true);
      } else {
        setError(msg || t('common.status.error'));
      }
      setItems([]);
    }

    setSrsLoading(true);
    setSrsError(null);
    try {
      const dueRes = await defaultLearningClient.getDueCards();
      setDueCards(dueRes.items || []);
    } catch (err: unknown) {
      setSrsError(err instanceof Error ? err.message : t('common.status.error'));
      setDueCards([]);
    } finally {
      setSrsLoading(false);
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadNotebookData();
  }, [loadNotebookData]);

  const handlePrepareCards = async () => {
    setPreparingCards(true);
    setSrsError(null);
    try {
      await defaultLearningClient.prepareNotebookCards();
      await loadNotebookData();
    } catch (err: unknown) {
      setSrsError(err instanceof Error ? err.message : t('common.status.error'));
    } finally {
      setPreparingCards(false);
    }
  };

  const handleAddItem = async (input: CreateNotebookItemInput) => {
    setError(null);
    if (!user) {
      if (typeof window !== 'undefined') {
        window.location.assign('/dang-nhap?redirect=/so-tay');
      }
      return;
    }
    try {
      const created = await defaultLearningClient.createNotebookItem(input);
      setItems((prev) => [created, ...prev]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('UNAUTHENTICATED') ||
        msg.includes('Yêu cầu đăng nhập') ||
        msg.includes('Authentication required')
      ) {
        setIsUnauthorized(true);
        if (typeof window !== 'undefined') {
          window.location.assign('/dang-nhap?redirect=/so-tay');
        }
        return;
      }
      setError(msg || 'Không thể tạo mục sổ tay.');
      throw err;
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<NotebookItem>) => {
    setError(null);
    try {
      const updated = await defaultLearningClient.updateNotebookItem(id, updates);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể cập nhật mục sổ tay.');
      throw err;
    }
  };

  const handleDeleteItem = async (id: string) => {
    setError(null);
    try {
      await defaultLearningClient.deleteNotebookItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể xóa mục sổ tay.');
      throw err;
    }
  };

  const handleExportCsv = async (kind?: NotebookItemKind) => {
    try {
      const res = await defaultLearningClient.exportNotebook({ kind });
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `so-tay-jlpt-${kind || 'all'}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể xuất file CSV.');
    }
  };

  const handleStartQuiz = async () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        window.location.assign('/dang-nhap?redirect=/so-tay');
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const quiz = await defaultLearningClient.createNotebookQuiz({ count: 5 });
      setActiveQuiz(quiz);
      setActiveTab('quiz');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('UNAUTHENTICATED') ||
        msg.includes('Yêu cầu đăng nhập') ||
        msg.includes('Authentication required')
      ) {
        setIsUnauthorized(true);
        if (typeof window !== 'undefined') {
          window.location.assign('/dang-nhap?redirect=/so-tay');
        }
        return;
      }
      setError(msg || 'Không thể tạo quiz từ sổ tay. Vui lòng thêm từ vựng/ngữ pháp trước.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60">
      <ExamHero
        title={t('notebook.page.title')}
        subtitle={t('notebook.page.subtitle')}
        minimal
        background="gradient"
      />

      <div className="container py-8 w-full">
        {(!user || isUnauthorized) && (
          <Alert className="mb-6" variant="warning">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span>Bạn cần đăng nhập để xem và lưu sổ tay học tập cá nhân.</span>
            <Link href="/dang-nhap?redirect=/so-tay">
              <Button size="sm" variant="primary">Đăng nhập ngay</Button>
            </Link>
          </div>
        </Alert>
      )}

      {error && !isUnauthorized && (
        <Alert className="mb-6" variant="error" onClose={() => setError(null)}>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadNotebookData}>
              {t('common.buttons.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {/* Navigation Tabs - only for signed in users */}
      {!(!user || isUnauthorized) && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] mb-8"
          role="tablist"
          aria-label={t('notebook.page.tabsAria')}
        >
        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === 'notebook'}
          aria-controls="panel-notebook"
          id="tab-notebook"
          onClick={() => setActiveTab('notebook')}
          className={`-mb-px min-h-11 cursor-pointer rounded-none border-0 border-b-2 bg-transparent px-5 py-3 text-[0.9375rem] font-semibold ${activeTab === 'notebook' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)]'}`}
        >
          <NotebookPen className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('notebook.tabs.notebook')} ({items.length})
        </Button>

        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === 'srs'}
          aria-controls="panel-srs"
          id="tab-srs"
          onClick={() => setActiveTab('srs')}
          className={`-mb-px min-h-11 cursor-pointer rounded-none border-0 border-b-2 bg-transparent px-5 py-3 text-[0.9375rem] font-semibold ${activeTab === 'srs' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)]'}`}
        >
          <Layers className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('notebook.tabs.srsReview')} ({dueCards.length})
        </Button>

        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === 'quiz'}
          aria-controls="panel-quiz"
          id="tab-quiz"
          onClick={() => {
            if (!activeQuiz) handleStartQuiz();
            else setActiveTab('quiz');
          }}
          className={`-mb-px min-h-11 cursor-pointer rounded-none border-0 border-b-2 bg-transparent px-5 py-3 text-[0.9375rem] font-semibold ${activeTab === 'quiz' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)]'}`}
        >
          <PencilLine className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('notebook.tabs.quiz')}
        </Button>
      </div>
      )}

      {!(!user || isUnauthorized) && loading && items.length === 0 && (
        <div className="flex justify-center py-12 px-0 items-center gap-3">
          <Spinner size="md" />
          <span className="text-[var(--text-secondary)]">{t('common.status.loading')}</span>
        </div>
      )}

      {/* Tab Panels */}
      {((!user || isUnauthorized) || activeTab === 'notebook') && (
        <div id="panel-notebook" role="tabpanel" aria-labelledby="tab-notebook">
          <NotebookView
            items={items}
            totalCount={items.length}
            loading={loading}
            isGuest={!user || isUnauthorized}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onExportCsv={handleExportCsv}
            onLoadExamples={async (itemId) => {
              const currentItem = items.find((it) => it.id === itemId);
              const cleanTag = (prefix: string) =>
                currentItem?.tags
                  ?.find((t) => t.replace(/^#+/, '').startsWith(prefix))
                  ?.replace(/^#+/, '')
                  ?.replace(prefix, '');

              const sourceExam = currentItem?.sourceExam || cleanTag('source_exam:');
              const sourceQnum = currentItem?.sourceQnum || cleanTag('source_qnum:');
              const sourceQid = currentItem?.sourceQid || cleanTag('source_qid:');
              const sourceSentence =
                currentItem?.sourceSentence ||
                cleanTag('source_sentence:') ||
                currentItem?.examples?.[0];

              // Extract options from tags if present
              const tagOptions = [];
              for (let i = 1; i <= 4; i++) {
                const optText = cleanTag(`source_opt_${i}:`);
                if (optText) {
                  tagOptions.push({
                    orderIndex: i,
                    text: cleanStemText(optText),
                  });
                }
              }

              const answerVal = cleanTag('source_answer:');
              const tagCorrectIndex = answerVal ? parseInt(answerVal, 10) : undefined;

              const explVal = cleanTag('source_expl:');
              const tagExpl = explVal ? explVal.replace(/\\n/g, '\n') : undefined;

              // If this item has a saved source exam question, ALWAYS display it directly
              if (sourceExam || sourceSentence) {
                let apiEg;
                try {
                  const res = await defaultLearningClient.getQuestionExamples(itemId);
                  apiEg = res.examples?.find((e) => e.isSavedSource || (sourceQid && e.questionId === sourceQid));
                } catch {
                  // Ignore
                }

                return [
                  {
                    questionId: sourceQid || 'saved-source',
                    level: apiEg?.level || 'JLPT',
                    skill: apiEg?.skill || 'vocabulary',
                    stem: cleanStemText(apiEg?.stem || sourceSentence),
                    matchedTerm: currentItem?.term || '',
                    isSavedSource: true,
                    examTitle: sourceExam,
                    questionNumber: sourceQnum,
                    options: (apiEg?.options && apiEg.options.length > 0) ? apiEg.options.map((o) => ({ ...o, text: cleanStemText(o.text) })) : (tagOptions.length > 0 ? tagOptions : undefined),
                    correctOptionIndex: apiEg?.correctOptionIndex ?? tagCorrectIndex,
                    explanationText: apiEg?.explanationText ?? tagExpl,
                  },
                ];
              }

              // Otherwise (item created manually without exam), fetch example questions from API
              try {
                const res = await defaultLearningClient.getQuestionExamples(itemId);
                const list = res.examples || [];
                return list.map((eg) => ({
                  ...eg,
                  stem: cleanStemText(eg.stem),
                  options: eg.options?.map((o) => ({ ...o, text: cleanStemText(o.text) })),
                }));
              } catch {
                return [];
              }
            }}
            onLoadMoreExamples={loadMoreNotebookExamples}
          />
        </div>
      )}

      {user && !isUnauthorized && activeTab === 'srs' && (
        <div id="panel-srs" role="tabpanel" aria-labelledby="tab-srs">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-[var(--text-secondary)]">{t('srs.prepare.description')}</p>
            <Button onClick={handlePrepareCards} loading={preparingCards} disabled={loading || srsLoading}>
              {t('srs.prepare.button')}
            </Button>
          </div>
          {srsError ? (
            <Alert variant="error">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{srsError}</span>
                <Button variant="outline" onClick={loadNotebookData}>{t('common.buttons.retry')}</Button>
              </div>
            </Alert>
          ) : srsLoading || preparingCards ? (
            <div role="status" className="flex items-center justify-center gap-3 py-12">
              <Spinner size="md" />
              <span>{t('common.status.loading')}</span>
            </div>
          ) : dueCards.length === 0 ? (
            <Alert variant="info">{t('srs.empty')}</Alert>
          ) : <SrsReviewRunner
            cards={dueCards}
            syncManager={defaultSrsSyncManager}
            onFinish={() => {
              loadNotebookData();
              setActiveTab('notebook');
            }}
          />}
        </div>
      )}

        {activeTab === 'quiz' && activeQuiz && (
          <div id="panel-quiz" role="tabpanel" aria-labelledby="tab-quiz">
            <NotebookQuizView
              quiz={activeQuiz}
              onRetake={handleStartQuiz}
              onExit={() => setActiveTab('notebook')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
