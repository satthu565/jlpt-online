'use client';

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
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { Alert, Button, Spinner } from '@jlpt/ui';
import Link from 'next/link';

export default function NotebookPage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'notebook' | 'srs' | 'quiz'>('notebook');
  const [items, setItems] = useState<NotebookItem[]>([]);
  const [dueCards, setDueCards] = useState<DueFlashcard[]>([]);
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

    try {
      const dueRes = await defaultLearningClient.getDueCards();
      setDueCards(dueRes.items || []);
    } catch {
      setDueCards([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadNotebookData();
  }, [loadNotebookData]);

  const handleAddItem = async (input: CreateNotebookItemInput) => {
    setError(null);
    try {
      const created = await defaultLearningClient.createNotebookItem(input);
      setItems((prev) => [created, ...prev]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
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
    setLoading(true);
    setError(null);
    try {
      const quiz = await defaultLearningClient.createNotebookQuiz({ count: 5 });
      setActiveQuiz(quiz);
      setActiveTab('quiz');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể tạo quiz từ sổ tay. Vui lòng thêm từ vựng/ngữ pháp trước.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 w-full">
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

      {(!user || isUnauthorized) && (
        <Alert variant="warning" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>Bạn cần đăng nhập để xem và lưu sổ tay học tập cá nhân.</span>
            <Link href="/dang-nhap?redirect=/so-tay">
              <Button size="sm" variant="primary">Đăng nhập ngay</Button>
            </Link>
          </div>
        </Alert>
      )}

      {error && !isUnauthorized && (
        <Alert variant="error" onClose={() => setError(null)} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadNotebookData}>
              {t('common.buttons.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {/* Navigation Tabs */}
      <div
        role="tablist"
        aria-label={t('notebook.page.tabsAria')}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
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

      {loading && items.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0', alignItems: 'center', gap: '0.75rem' }}>
          <Spinner size="md" />
          <span style={{ color: 'var(--text-secondary)' }}>{t('common.status.loading')}</span>
        </div>
      )}

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
            onFinish={() => {
              loadNotebookData();
              setActiveTab('notebook');
            }}
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
