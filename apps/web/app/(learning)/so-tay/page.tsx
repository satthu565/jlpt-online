'use client';

import React, { useState, useEffect } from 'react';
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
import { useI18n } from '../../../lib/i18n';

// Sample fallback items for demonstration/offline
const SAMPLE_NOTEBOOK_ITEMS: NotebookItem[] = [
  {
    id: 'item-1',
    userId: 'user-demo',
    kind: 'vocab',
    term: '躊躇',
    reading: 'ちゅうちょ',
    meaning: 'Sự do dự, ngập ngừng, chần chừ',
    notes: 'Thường đi với 躊躇なく (không chút do dự)',
    mastered: false,
    tags: ['N1', 'Từ vựng hay gặp'],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-2',
    userId: 'user-demo',
    kind: 'grammar',
    term: '〜を皮切りに',
    reading: '〜をかわきりに',
    meaning: 'Khởi đầu với..., mở màn bằng...',
    notes: 'Diễn tả một chuỗi sự kiện tương tự diễn ra liên tiếp sau đó',
    mastered: true,
    tags: ['N2', 'Ngữ pháp'],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-3',
    userId: 'user-demo',
    kind: 'kanji',
    term: '曖昧',
    reading: 'あいまい',
    meaning: 'Mơ hồ, mập mờ, không rõ ràng',
    notes: 'Bộ Nhật kết hợp Ái / Muội',
    mastered: false,
    tags: ['N3', 'Hán tự'],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SAMPLE_DUE_CARDS: DueFlashcard[] = [
  {
    cardId: 'card-1',
    notebookItemId: 'item-1',
    front: { term: '躊躇', reading: 'ちゅうちょ', prompt: '躊躇' },
    back: { meaning: 'Sự do dự, ngập ngừng, chần chừ', examples: ['躊躇なく決断する (Quyết định không chút do dự)'] },
    dueAt: new Date().toISOString(),
    intervalDays: 1,
    repetitions: 1,
    state: 'review',
    kind: 'vocab',
  },
  {
    cardId: 'card-2',
    notebookItemId: 'item-2',
    front: { term: '〜を皮切りに', reading: '〜をかわきりに', prompt: '〜を皮切りに' },
    back: { meaning: 'Khởi đầu với..., mở màn bằng...', examples: ['東京公演を皮切りに全国ツアーが始まる'] },
    dueAt: new Date().toISOString(),
    intervalDays: 3,
    repetitions: 2,
    state: 'review',
    kind: 'grammar',
  },
];

export default function NotebookPage(): React.JSX.Element {
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'notebook' | 'srs' | 'quiz'>('notebook');
  const [items, setItems] = useState<NotebookItem[]>(SAMPLE_NOTEBOOK_ITEMS);
  const [dueCards, setDueCards] = useState<DueFlashcard[]>(SAMPLE_DUE_CARDS);
  const [activeQuiz, setActiveQuiz] = useState<NotebookQuiz | null>(null);
  const [loading, setLoading] = useState(false);

  const loadNotebookData = async () => {
    setLoading(true);
    try {
      const res = await defaultLearningClient.getNotebookItems();
      if (res.items && res.items.length > 0) {
        setItems(res.items);
      }
    } catch {
      // Use fallback
    }

    try {
      const dueRes = await defaultLearningClient.getDueCards();
      if (dueRes.items && dueRes.items.length > 0) {
        setDueCards(dueRes.items);
      }
    } catch {
      // Use fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotebookData();
  }, []);

  const handleAddItem = async (input: CreateNotebookItemInput) => {
    try {
      const created = await defaultLearningClient.createNotebookItem(input);
      setItems((prev) => [created, ...prev]);
    } catch {
      // Offline fallback
      const mockCreated: NotebookItem = {
        id: `mock-${Date.now()}`,
        userId: 'demo',
        kind: input.kind,
        term: input.term,
        reading: input.reading,
        meaning: input.meaning,
        notes: input.notes,
        mastered: false,
        tags: input.tags || [],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) => [mockCreated, ...prev]);
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<NotebookItem>) => {
    try {
      await defaultLearningClient.updateNotebookItem(id, updates);
    } catch {
      // Update local state
    }
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await defaultLearningClient.deleteNotebookItem(id);
    } catch {
      // Delete from local state
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
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
    } catch {
      // Fallback CSV export
      const rows = [
        ['Kind', 'Term', 'Reading', 'Meaning', 'Tags'].join(','),
        ...items
          .filter((i) => !kind || i.kind === kind)
          .map((i) => `"${i.kind}","${i.term}","${i.reading || ''}","${i.meaning}","${i.tags.join(';')}"`),
      ];
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `so-tay-jlpt-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleStartQuiz = async () => {
    try {
      const quiz = await defaultLearningClient.createNotebookQuiz({ count: 5 });
      setActiveQuiz(quiz);
      setActiveTab('quiz');
    } catch {
      // Generate sample quiz from items
      const sampleQ = items.slice(0, 4).map((item, idx) => ({
        id: `q-${item.id}`,
        stem: `Nghĩa đúng của từ/mẫu「${item.term}」là gì?`,
        options: [
          item.meaning,
          'Ý nghĩa đánh lạc hướng A',
          'Ý nghĩa đánh lạc hướng B',
          'Ý nghĩa đánh lạc hướng C',
        ].sort(() => Math.random() - 0.5),
        correctOptionIndex: 0,
        kind: item.kind,
        notebookItemId: item.id,
        explanation: `${item.term} [${item.reading || ''}]: ${item.meaning}`,
      }));

      // Adjust correct index
      sampleQ.forEach((q) => {
        const correctIdx = q.options.indexOf(items.find((i) => i.id === q.notebookItemId)?.meaning || '');
        q.correctOptionIndex = correctIdx >= 0 ? correctIdx : 0;
      });

      setActiveQuiz({
        quizId: `quiz-${Date.now()}`,
        questions: sampleQ,
        totalQuestions: sampleQ.length,
        createdAt: new Date().toISOString(),
      });
      setActiveTab('quiz');
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          {t('notebook.page.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t('notebook.page.subtitle')}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div
        role="tablist"
        aria-label={t('notebook.page.tabsAria')}
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notebook'}
          aria-controls="panel-notebook"
          id="tab-notebook"
          onClick={() => setActiveTab('notebook')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'notebook' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'notebook' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
          }}
        >
          📓 {t('notebook.tabs.notebook')} ({items.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'srs'}
          aria-controls="panel-srs"
          id="tab-srs"
          onClick={() => setActiveTab('srs')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'srs' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'srs' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
          }}
        >
          🗂️ {t('notebook.tabs.srsReview')} ({dueCards.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'quiz'}
          aria-controls="panel-quiz"
          id="tab-quiz"
          onClick={() => {
            if (!activeQuiz) handleStartQuiz();
            else setActiveTab('quiz');
          }}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'quiz' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'quiz' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
          }}
        >
          ⚡ {t('notebook.tabs.quiz')}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'notebook' && (
        <div id="panel-notebook" role="tabpanel" aria-labelledby="tab-notebook">
          <NotebookView
            items={items}
            totalCount={items.length}
            loading={loading}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onExportCsv={handleExportCsv}
            onLoadExamples={async (itemId) => {
              try {
                const res = await defaultLearningClient.getQuestionExamples(itemId);
                return res.examples || [];
              } catch {
                return [];
              }
            }}
          />
        </div>
      )}

      {activeTab === 'srs' && (
        <div id="panel-srs" role="tabpanel" aria-labelledby="tab-srs">
          <SrsReviewRunner
            cards={dueCards}
            syncManager={defaultSrsSyncManager}
            onFinish={() => setActiveTab('notebook')}
          />
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
  );
}
