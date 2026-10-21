'use client';

import { Check, Download, Lightbulb, NotebookPen, Search, Trash2, Volume2 } from 'lucide-react';
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
import { FEATURES } from '../../../lib/features';

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
    <div className="notebook-container flex flex-col gap-6">
      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between p-5 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-subtle)]">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="min-w-[220px] flex-[1_1_200px]">
            <Input
              id="notebook-search"
              aria-label={t('notebook.filters.searchLabel')}
              placeholder={t('notebook.filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-[140px]">
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

          <div className="w-[160px]">
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

        <div className="flex gap-3 items-center">
          <Button
            variant="outline"
            onClick={() => onExportCsv(filterKind === 'all' ? undefined : (filterKind as NotebookItemKind))}
            aria-label={t('notebook.actions.exportCsv')}
            data-testid="export-csv-button"
          >
            <Download className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('notebook.actions.exportCsv')}
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
      <div className="flex justify-between items-center">
        <p className="m-0 text-[var(--text-secondary)] text-[0.9375rem]">
          {t('notebook.countSummary', { count: String(filteredItems.length), total: String(totalCount) })}
        </p>
      </div>

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <NotebookPen className="mx-auto mb-4 size-10" aria-hidden="true" />
            <h3 className="mt-0 mx-0 mb-2 text-[var(--text-primary)]">
              {t('notebook.empty.title')}
            </h3>
            <p className="text-[var(--text-secondary)] mt-0 mx-0 mb-6">
              {t('notebook.empty.description')}
            </p>
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              + {t('notebook.actions.addItem')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} data-testid={`notebook-item-${item.id}`}>
            <CardHeader className="flex justify-between items-start">
              <div>
                <div className="flex gap-2 items-center mb-1">
                  <Badge variant={kindBadgeVariant(item.kind)}>
                    {t(`notebook.kinds.${item.kind}`)}
                  </Badge>
                  {item.mastered && (
                    <Badge variant="success"><Check className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('notebook.status.mastered')}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl mt-1 mx-0 mb-0">
                    {item.term}
                  </CardTitle>
                  {item.hanViet && (
                    <span className="text-xs font-semibold py-[2px] px-[6px] rounded-[4px] bg-[rgba(245,158,11,0.15)] text-[#b45309] inline-block"
                      data-testid="notebook-item-hanviet"
                    >
                      {item.hanViet}
                    </span>
                  )}
                  {item.reading && (
                    <span className="text-sm text-[var(--text-muted)]">
                      [{item.reading}]
                    </span>
                  )}
                </div>
              </div>

              {FEATURES.tts && onPlayTts && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPlayTts(item.term)}
                  aria-label={t('notebook.actions.playAudio', { term: item.term })}
                  title={t('notebook.actions.playAudio', { term: item.term })}
                >
                  <Volume2 className="size-4" aria-hidden="true" />
                </Button>
              )}
            </CardHeader>

            <CardContent>
              <p className="mt-0 mx-0 mb-3 font-medium text-[var(--text-primary)]">
                {item.meaning}
              </p>

              {item.notes && (
                <p className="text-sm text-[var(--text-secondary)] mt-0 mx-0 mb-3 italic">
                  <Lightbulb className="inline size-4 align-[-2px]" aria-hidden="true" /> {item.notes}
                </p>
              )}

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {item.tags.map((tag) => (
                    <span className="text-xs py-[2px] px-[6px] rounded-[4px] bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                      key={tag}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex gap-2">
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
                    <Search className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('notebook.actions.viewExamples')}
                  </Button>
                </div>

                <Button className="text-[var(--color-error)]"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteItem(item.id)}
                  aria-label={t('notebook.actions.deleteItem', { term: item.term })}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
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
          <form className="flex flex-col gap-4" onSubmit={handleCreateSubmit}>
            {formError && (
              <Alert variant="error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <div>
              <label className="block mb-1 font-semibold" htmlFor="modal-kind-select">
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
              <label className="block mb-1 font-semibold" htmlFor="modal-term-input">
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
              <label className="block mb-1 font-semibold" htmlFor="modal-reading-input">
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
              <label className="block mb-1 font-semibold" htmlFor="modal-meaning-input">
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
              <label className="block mb-1 font-semibold" htmlFor="modal-notes-input">
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
              <label className="block mb-1 font-semibold" htmlFor="modal-tags-input">
                {t('notebook.form.tags')}
              </label>
              <Input
                id="modal-tags-input"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder={t('notebook.form.tagsPlaceholder')}
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
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
            <p className="text-[var(--text-secondary)] mb-5">
              {t('notebook.examples.subtitle', { term: activeItemForExamples.term })}
            </p>

            {examplesLoading && (
              <p className="text-center p-6 text-[var(--text-muted)]">
                {t('common.status.loading')}
              </p>
            )}

            {!examplesLoading && examplesList.length === 0 && (
              <Alert variant="info">
                {t('notebook.examples.noExamplesFound')}
              </Alert>
            )}

            {!examplesLoading && examplesList.length > 0 && (
              <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto">
                {examplesList.map((eg, idx) => (
                  <div className="p-4 rounded-[6px] bg-[var(--bg-muted)] border border-[var(--border-subtle)]"
                    key={eg.questionId || idx}
                  >
                    <div className="flex gap-2 mb-2">
                      <Badge variant="primary">{eg.level}</Badge>
                      <Badge variant="secondary">{eg.skill}</Badge>
                    </div>
                    {eg.passage && (
                      <p className="text-sm text-[var(--text-muted)] mb-2">
                        {eg.passage}
                      </p>
                    )}
                    <p className="m-0 font-medium">
                      {eg.stem}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
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
