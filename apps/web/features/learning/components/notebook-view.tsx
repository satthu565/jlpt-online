'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Modal } from '@jlpt/ui/components/modal';
import type {
  NotebookItem,
  NotebookItemKind,
  CreateNotebookItemInput,
  QuestionExample,
} from '../types';
import { useI18n } from '../../../lib/i18n';

export interface NotebookViewProps {
  items: NotebookItem[];
  totalCount: number;
  loading?: boolean;
  onAddItem: (item: CreateNotebookItemInput) => Promise<void>;
  onUpdateItem: (id: string, updates: Partial<NotebookItem>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onExportCsv: (kind?: NotebookItemKind) => Promise<void>;
  onLoadExamples?: (itemId: string) => Promise<QuestionExample[]>;
  onPlayTts?: (text: string) => Promise<void>;
}

export function NotebookView({
  items,
  totalCount,
  loading = false,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onExportCsv,
  onLoadExamples,
  onPlayTts,
}: NotebookViewProps): React.JSX.Element {
  const { t } = useI18n();

  // Filters
  const [filterKind, setFilterKind] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMastered, setFilterMastered] = useState<string>('all');

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newKind, setNewKind] = useState<NotebookItemKind>('vocab');
  const [newTerm, setNewTerm] = useState('');
  const [newReading, setNewReading] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newTags, setNewTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Question Examples Modal
  const [activeItemForExamples, setActiveItemForExamples] = useState<NotebookItem | null>(null);
  const [examplesList, setExamplesList] = useState<QuestionExample[]>([]);
  const [examplesLoading, setExamplesLoading] = useState(false);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterKind !== 'all' && item.kind !== filterKind) return false;
    if (filterMastered === 'mastered' && !item.mastered) return false;
    if (filterMastered === 'learning' && item.mastered) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTerm = item.term.toLowerCase().includes(q);
      const matchReading = item.reading?.toLowerCase().includes(q);
      const matchMeaning = item.meaning.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTerm && !matchReading && !matchMeaning && !matchTags) return false;
    }
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newMeaning.trim()) {
      setFormError(t('notebook.form.requiredFields'));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onAddItem({
        kind: newKind,
        term: newTerm.trim(),
        reading: newReading.trim() || undefined,
        meaning: newMeaning.trim(),
        notes: newNotes.trim() || undefined,
        tags: newTags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setIsAddModalOpen(false);
      setNewTerm('');
      setNewReading('');
      setNewMeaning('');
      setNewNotes('');
      setNewTags('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t('notebook.form.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenExamples = async (item: NotebookItem) => {
    setActiveItemForExamples(item);
    setExamplesLoading(true);
    try {
      if (onLoadExamples) {
        const data = await onLoadExamples(item.id);
        setExamplesList(data);
      } else {
        setExamplesList([]);
      }
    } catch {
      setExamplesList([]);
    } finally {
      setExamplesLoading(false);
    }
  };

  const kindBadgeVariant = (kind: NotebookItemKind) => {
    switch (kind) {
      case 'vocab':
        return 'primary';
      case 'grammar':
        return 'secondary';
      case 'kanji':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <div className="notebook-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Controls & Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
          <div style={{ minWidth: '220px', flex: '1 1 200px' }}>
            <Input
              id="notebook-search"
              aria-label={t('notebook.filters.searchLabel')}
              placeholder={t('notebook.filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ width: '140px' }}>
            <Select
              id="notebook-kind-filter"
              aria-label={t('notebook.filters.kindLabel')}
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              options={[
                { value: 'all', label: t('notebook.filters.allKinds') },
                { value: 'vocab', label: t('notebook.kinds.vocab') },
                { value: 'grammar', label: t('notebook.kinds.grammar') },
                { value: 'kanji', label: t('notebook.kinds.kanji') },
              ]}
            />
          </div>

          <div style={{ width: '160px' }}>
            <Select
              id="notebook-mastered-filter"
              aria-label={t('notebook.filters.statusLabel')}
              value={filterMastered}
              onChange={(e) => setFilterMastered(e.target.value)}
              options={[
                { value: 'all', label: t('notebook.filters.allStatus') },
                { value: 'learning', label: t('notebook.status.learning') },
                { value: 'mastered', label: t('notebook.status.mastered') },
              ]}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button
            variant="outline"
            onClick={() => onExportCsv(filterKind === 'all' ? undefined : (filterKind as NotebookItemKind))}
            aria-label={t('notebook.actions.exportCsv')}
            data-testid="export-csv-button"
          >
            📥 {t('notebook.actions.exportCsv')}
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            aria-label={t('notebook.actions.addItem')}
            data-testid="add-item-button"
          >
            + {t('notebook.actions.addItem')}
          </Button>
        </div>
      </div>

      {/* Items Count Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          {t('notebook.countSummary', { count: String(filteredItems.length), total: String(totalCount) })}
        </p>
      </div>

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <Card>
          <CardContent style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📓</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              {t('notebook.empty.title')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>
              {t('notebook.empty.description')}
            </p>
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              + {t('notebook.actions.addItem')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filteredItems.map((item) => (
          <Card key={item.id} data-testid={`notebook-item-${item.id}`}>
            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <Badge variant={kindBadgeVariant(item.kind)}>
                    {t(`notebook.kinds.${item.kind}`)}
                  </Badge>
                  {item.mastered && (
                    <Badge variant="success">✓ {t('notebook.status.mastered')}</Badge>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <CardTitle style={{ fontSize: '1.25rem', margin: '0.25rem 0 0 0' }}>
                    {item.term}
                  </CardTitle>
                  {item.hanViet && (
                    <span
                      data-testid="notebook-item-hanviet"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        color: '#b45309',
                        display: 'inline-block',
                      }}
                    >
                      {item.hanViet}
                    </span>
                  )}
                  {item.reading && (
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      [{item.reading}]
                    </span>
                  )}
                </div>
              </div>

              {onPlayTts && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPlayTts(item.term)}
                  aria-label={t('notebook.actions.playAudio', { term: item.term })}
                  title={t('notebook.actions.playAudio', { term: item.term })}
                >
                  🔊
                </Button>
              )}
            </CardHeader>

            <CardContent>
              <p style={{ margin: '0 0 0.75rem 0', fontWeight: 500, color: 'var(--text-primary)' }}>
                {item.meaning}
              </p>

              {item.notes && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', fontStyle: 'italic' }}>
                  💡 {item.notes}
                </p>
              )}

              {item.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '1rem' }}>
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-muted)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdateItem(item.id, { mastered: !item.mastered })}
                    aria-label={item.mastered ? t('notebook.actions.markUnmastered') : t('notebook.actions.markMastered')}
                  >
                    {item.mastered ? t('notebook.actions.markUnmastered') : t('notebook.actions.markMastered')}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenExamples(item)}
                    aria-label={t('notebook.actions.viewExamples')}
                  >
                    🔍 {t('notebook.actions.viewExamples')}
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteItem(item.id)}
                  aria-label={t('notebook.actions.deleteItem', { term: item.term })}
                  style={{ color: 'var(--color-error)' }}
                >
                  🗑️
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={t('notebook.modal.addTitle')}
        >
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {formError && (
              <Alert variant="error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <div>
              <label htmlFor="modal-kind-select" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                {t('notebook.form.kind')}
              </label>
              <Select
                id="modal-kind-select"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as NotebookItemKind)}
                options={[
                  { value: 'vocab', label: t('notebook.kinds.vocab') },
                  { value: 'grammar', label: t('notebook.kinds.grammar') },
                  { value: 'kanji', label: t('notebook.kinds.kanji') },
                ]}
              />
            </div>

            <div>
              <label htmlFor="modal-term-input" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                {t('notebook.form.term')} *
              </label>
              <Input
                id="modal-term-input"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder={t('notebook.form.termPlaceholder')}
                required
              />
            </div>

            <div>
              <label htmlFor="modal-reading-input" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                {t('notebook.form.reading')}
              </label>
              <Input
                id="modal-reading-input"
                value={newReading}
                onChange={(e) => setNewReading(e.target.value)}
                placeholder={t('notebook.form.readingPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="modal-meaning-input" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                {t('notebook.form.meaning')} *
              </label>
              <Input
                id="modal-meaning-input"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                placeholder={t('notebook.form.meaningPlaceholder')}
                required
              />
            </div>

            <div>
              <label htmlFor="modal-notes-input" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                {t('notebook.form.notes')}
              </label>
              <Input
                id="modal-notes-input"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder={t('notebook.form.notesPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="modal-tags-input" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                {t('notebook.form.tags')}
              </label>
              <Input
                id="modal-tags-input"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder={t('notebook.form.tagsPlaceholder')}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                {t('common.buttons.cancel')}
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {t('notebook.form.submitButton')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Question Examples Modal */}
      {activeItemForExamples && (
        <Modal
          isOpen={Boolean(activeItemForExamples)}
          onClose={() => setActiveItemForExamples(null)}
          title={t('notebook.examples.title', { term: activeItemForExamples.term })}
        >
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {t('notebook.examples.subtitle', { term: activeItemForExamples.term })}
            </p>

            {examplesLoading && (
              <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                {t('common.status.loading')}
              </p>
            )}

            {!examplesLoading && examplesList.length === 0 && (
              <Alert variant="info">
                {t('notebook.examples.noExamplesFound')}
              </Alert>
            )}

            {!examplesLoading && examplesList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                {examplesList.map((eg, idx) => (
                  <div
                    key={eg.questionId || idx}
                    style={{
                      padding: '1rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Badge variant="primary">{eg.level}</Badge>
                      <Badge variant="secondary">{eg.skill}</Badge>
                    </div>
                    {eg.passage && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        {eg.passage}
                      </p>
                    )}
                    <p style={{ margin: 0, fontWeight: 500 }}>
                      {eg.stem}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <Button variant="outline" onClick={() => setActiveItemForExamples(null)}>
                {t('common.buttons.close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
