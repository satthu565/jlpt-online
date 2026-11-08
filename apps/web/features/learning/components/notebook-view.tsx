'use client';

import { Check, ChevronDown, ChevronUp, Download, ExternalLink, Lightbulb, NotebookPen, Search, Trash2, Volume2 } from 'lucide-react';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { HeroSelect } from '@jlpt/ui/components/hero-select';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Modal } from '@jlpt/ui/components/modal';
import { Spinner } from '@jlpt/ui/components/spinner';
import type {
  NotebookItem,
  NotebookItemKind,
  CreateNotebookItemInput,
  QuestionExample,
} from '../types';
import { LearningClientError } from '../services/learning-client';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { FEATURES } from '../../../lib/features';
import { cleanStemText } from '../../corpus';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function HighlightText({
  text,
  highlight,
  alternateHighlights = [],
}: {
  text?: string;
  highlight?: string;
  alternateHighlights?: string[];
}): React.JSX.Element {
  if (!text) return <></>;

  const rawTerms = [highlight, ...alternateHighlights].filter(Boolean) as string[];
  if (rawTerms.length === 0) return <>{text}</>;

  const keywords = new Set<string>();
  for (const raw of rawTerms) {
    const splitted = raw.split(/[/;,（）()]/);
    for (const chunk of splitted) {
      const clean = chunk.replace(/[〜~]/g, '').trim();
      if (clean.length >= 2 || (clean.length === 1 && /[\u4e00-\u9faf]/.test(clean))) {
        keywords.add(clean);
      }
    }
    const fullClean = raw.replace(/[〜~]/g, '').trim();
    if (fullClean.length >= 2) {
      keywords.add(fullClean);
    }
  }

  const keywordList = Array.from(keywords).sort((a, b) => b.length - a.length);
  if (keywordList.length === 0) return <>{text}</>;

  const pattern = keywordList.map(escapeRegExp).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);

  const isMatched = (part: string) =>
    keywordList.some((kw) => kw.toLowerCase() === part.toLowerCase());

  return (
    <>
      {parts.map((part, idx) =>
        isMatched(part) ? (
          <mark
            key={idx}
            className="bg-amber-200 text-amber-950 dark:bg-amber-400 dark:text-amber-950 px-1 py-0.5 rounded font-bold shadow-sm inline-block leading-tight"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export function getUserVisibleTags(tags?: string[]): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.filter((t) => {
    if (typeof t !== 'string') return false;
    const clean = t.replace(/^#+/, '').trim();
    if (!clean) return false;
    return (
      !clean.startsWith('source_') &&
      !clean.startsWith('term:') &&
      !clean.startsWith('reading:') &&
      !clean.startsWith('meaning:') &&
      !clean.startsWith('pos:') &&
      !clean.startsWith('stroke:') &&
      !clean.startsWith('hanviet:') &&
      !clean.startsWith('example:') &&
      !clean.startsWith('explanation:') &&
      !clean.startsWith('level:') &&
      clean !== 'grammar' &&
      clean !== 'vocab' &&
      clean !== 'kanji'
    );
  });
}

export function resolveExamSlug(title?: string, slug?: string): string | undefined {
  if (slug) return slug;
  if (!title) return undefined;
  const trimmed = title.trim();
  const m1 = trimmed.match(/N([1-5])\s+(\d{1,2})[/-](\d{4})/i);
  if (m1 && m1[1] && m1[2] && m1[3]) {
    return `n${m1[1]}-${m1[3]}-${m1[2].padStart(2, '0')}`;
  }
  const m2 = trimmed.match(/N([1-5])\s+(\d{4})[/-](\d{1,2})/i);
  if (m2 && m2[1] && m2[2] && m2[3]) {
    return `n${m2[1]}-${m2[2]}-${m2[3].padStart(2, '0')}`;
  }
  const m3 = trimmed.match(/(\d{4})年(\d{1,2})月.*N([1-5])/i);
  if (m3 && m3[1] && m3[2] && m3[3]) {
    return `n${m3[3]}-${m3[1]}-${m3[2].padStart(2, '0')}`;
  }
  const m4 = trimmed.match(/N([1-5]).*(\d{4})年(\d{1,2})月/i);
  if (m4 && m4[1] && m4[2] && m4[3]) {
    return `n${m4[1]}-${m4[2]}-${m4[3].padStart(2, '0')}`;
  }
  const m5 = trimmed.match(/N([1-5])\s+(\d{4}-\d{4})/i);
  if (m5 && m5[1] && m5[2]) {
    return `n${m5[1]}-${m5[2]}`;
  }
  return undefined;
}

export function getNotebookExamLevel(item: Pick<NotebookItem, 'sourceExam' | 'tags'>): string | undefined {
  const sourceExam = item.sourceExam || item.tags
    .map((tag) => tag.replace(/^#+/, '').trim())
    .find((tag) => tag.startsWith('source_exam:'))
    ?.slice('source_exam:'.length);
  return sourceExam?.match(/(?:^|[^a-z0-9])(N[1-5])(?=$|[^a-z0-9])/i)?.[1]?.toUpperCase();
}

export interface NotebookViewProps {
  items: NotebookItem[];
  totalCount: number;
  loading?: boolean;
  isGuest?: boolean;
  onAddItem: (item: CreateNotebookItemInput) => Promise<void>;
  onUpdateItem: (id: string, updates: Partial<NotebookItem>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onExportCsv: (kind?: NotebookItemKind) => Promise<void>;
  onLoadExamples?: (itemId: string) => Promise<QuestionExample[]>;
  onLoadMoreExamples?: (item: NotebookItem) => Promise<QuestionExample[]>;
  onPlayTts?: (text: string) => Promise<void>;
}

export function NotebookView({
  items,
  totalCount,
  loading = false,
  isGuest = false,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onExportCsv,
  onLoadExamples,
  onLoadMoreExamples,
  onPlayTts,
}: NotebookViewProps): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();

  // Filters
  const [filterKind, setFilterKind] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMastered, setFilterMastered] = useState<string>('all');

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const handleCloseAddModal = React.useCallback(() => {
    setIsAddModalOpen(false);
    setFormError(null);
  }, []);
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreLoaded, setMoreLoaded] = useState(false);
  const [moreMessage, setMoreMessage] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const toggleExpandQuestion = (key: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterKind !== 'all' && item.kind !== filterKind) return false;
    if (filterLevel !== 'all' && getNotebookExamLevel(item) !== filterLevel) return false;
    if (filterMastered === 'mastered' && !item.mastered) return false;
    if (filterMastered === 'learning' && item.mastered) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTerm = item.term.toLowerCase().includes(q);
      const matchReading = item.reading?.toLowerCase().includes(q);
      const matchMeaning = item.meaning.toLowerCase().includes(q);
      const matchTags = getUserVisibleTags(item.tags).some((t) => t.toLowerCase().includes(q));
      if (!matchTerm && !matchReading && !matchMeaning && !matchTags) return false;
    }
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (typeof window !== 'undefined') {
        window.location.assign('/dang-nhap?redirect=/so-tay');
      }
      return;
    }

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
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('UNAUTHENTICATED') ||
        msg.includes('Yêu cầu đăng nhập') ||
        msg.includes('Authentication required')
      ) {
        if (typeof window !== 'undefined') {
          window.location.assign('/dang-nhap?redirect=/so-tay');
        }
        return;
      }
      setFormError(err instanceof Error ? err.message : t('notebook.form.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadMore = async () => {
    if (!activeItemForExamples || !onLoadMoreExamples || loadingMore) return;
    setLoadingMore(true);
    setMoreMessage(null);
    setMoreError(null);
    try {
      const more = await onLoadMoreExamples(activeItemForExamples);
      const existingIds = new Set(examplesList.map((e) => e.questionId));
      const fresh = more.filter((e) => !existingIds.has(e.questionId));
      if (fresh.length > 0) {
        setExamplesList((prev) => [...prev, ...fresh]);
        setMoreMessage(
          t('notebook.examples.moreLoadedCount', { count: fresh.length }) ||
            `Đã tải thêm ${fresh.length} câu hỏi từ các đề thi khác.`,
        );
      } else {
        setMoreMessage(
          t('notebook.examples.noMoreExamples') ||
            'Không tìm thấy thêm câu hỏi nào khác trong ngân hàng đề.',
        );
      }
      setMoreLoaded(true);
    } catch (error) {
      const key = error instanceof LearningClientError
        ? error.status === 403 ? 'accessDenied'
          : error.status === 401 ? 'signInRequired'
          : error.status === 429 ? 'rateLimited'
          : 'loadMoreError'
        : 'loadMoreError';
      setMoreError(t(`notebook.examples.${key}`));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenExamples = async (item: NotebookItem) => {
    setActiveItemForExamples(item);
    setExamplesLoading(true);
    setLoadingMore(false);
    setMoreLoaded(false);
    setMoreMessage(null);
    setMoreError(null);
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
      {/* Controls & Filter Bar - only for signed in users */}
      {!isGuest && (
        <>
          <div className="flex flex-wrap gap-4 items-center justify-between p-5 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-subtle)]">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="min-w-[220px] flex-[1_1_200px]">
            <Input
              id="notebook-search"
              aria-label={t('notebook.filters.searchLabel')}
              placeholder={t('notebook.filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 md:h-9"
            />
          </div>

          <div className="w-[140px]">
            <HeroSelect
              id="notebook-kind-filter"
              aria-label={t('notebook.filters.kindLabel')}
              value={filterKind}
              onChange={(val) => setFilterKind(val)}
              options={[
                { value: 'all', label: t('notebook.filters.allKinds') },
                { value: 'vocab', label: t('notebook.kinds.vocab') },
                { value: 'grammar', label: t('notebook.kinds.grammar') },
                { value: 'kanji', label: t('notebook.kinds.kanji') },
              ]}
            />
          </div>

          <div className="w-[180px]">
            <HeroSelect
              id="notebook-level-filter"
              aria-label={t('notebook.filters.levelLabel')}
              value={filterLevel}
              onChange={setFilterLevel}
              options={[
                { value: 'all', label: t('notebook.filters.allLevels') },
                ...['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => ({ value: level, label: level })),
              ]}
            />
          </div>

          <div className="w-[160px]">
            <HeroSelect
              id="notebook-mastered-filter"
              aria-label={t('notebook.filters.statusLabel')}
              value={filterMastered}
              onChange={(val) => setFilterMastered(val)}
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
        </>
      )}

      {/* Empty State */}
      {(!loading || isGuest) && filteredItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <NotebookPen className="mx-auto mb-4 size-10" aria-hidden="true" />
            <h3 className="mt-0 mx-0 mb-2 text-[var(--text-primary)]">
              {t('notebook.empty.title')}
            </h3>
            <p className="text-[var(--text-secondary)] mt-0 mx-0 mb-6">
              {t('notebook.empty.description')}
            </p>
            <Button
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
              className="self-center"
            >
              + {t('notebook.actions.addItem')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} data-testid={`notebook-item-${item.id}`} className="flex flex-col h-full">
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

            <CardContent className="flex flex-1 flex-col">
              <p className="mt-0 mx-0 mb-3 font-medium text-[var(--text-primary)]">
                {item.meaning}
              </p>

              {item.notes && (
                <p className="text-sm text-[var(--text-secondary)] mt-0 mx-0 mb-3 italic">
                  <Lightbulb className="inline size-4 align-[-2px]" aria-hidden="true" /> {item.notes}
                </p>
              )}

              {(() => {
                const visibleTags = getUserVisibleTags(item.tags);
                if (visibleTags.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {visibleTags.map((tag) => (
                      <span
                        className="text-xs py-[2px] px-[6px] rounded-[4px] bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                        key={tag}
                      >
                        #{tag.replace(/^#+/, '')}
                      </span>
                    ))}
                  </div>
                );
              })()}

              <div className="mt-auto flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
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
          onClose={handleCloseAddModal}
          title={t('notebook.modal.addTitle')}
        >
          <form className="flex flex-col gap-4" onSubmit={handleCreateSubmit}>
            {formError && (
              <Alert variant="error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <div>
              <HeroSelect
                id="modal-kind-select"
                label={t('notebook.form.kind')}
                value={newKind}
                onChange={(val) => setNewKind(val as NotebookItemKind)}
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
          title={
            examplesList.some((e) => e.isSavedSource)
              ? `Câu hỏi đã lưu chứa 「${activeItemForExamples.term}」`
              : t('notebook.examples.title', { term: activeItemForExamples.term })
          }
        >
          <div>
            <p className="text-[var(--text-secondary)] mb-4">
              {examplesList.some((e) => e.isSavedSource)
                ? `Câu hỏi trong đề thi bạn đã gặp và lưu ${
                    activeItemForExamples.kind === 'grammar'
                      ? 'mẫu ngữ pháp'
                      : activeItemForExamples.kind === 'kanji'
                        ? 'chữ Hán'
                        : 'từ vựng'
                  } này vào sổ tay:`
                : t('notebook.examples.subtitle', { term: activeItemForExamples.term })}
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
                {examplesList.map((eg, idx) => {
                  const isSaved = eg.isSavedSource;
                  return (
                    <div
                      className={`p-4 rounded-[8px] border transition-all ${
                        isSaved
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : 'bg-[var(--bg-muted)] border-[var(--border-subtle)]'
                      }`}
                      key={eg.questionId || idx}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        {eg.examTitle && (() => {
                          const examSlug = eg.examSlug || resolveExamSlug(eg.examTitle);
                          if (examSlug) {
                            return (
                              <a
                                href={`/de-thi/${examSlug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center no-underline text-inherit group focus:outline-none"
                                title={t('notebook.examples.openExamHint', { title: eg.examTitle }) || `Mở đề thi ${eg.examTitle} trong tab mới`}
                              >
                                <Badge
                                  variant="primary"
                                  className="inline-flex items-center gap-1 cursor-pointer group-hover:opacity-85 transition-opacity"
                                >
                                  <span>{eg.examTitle}</span>
                                  <ExternalLink className="size-3 opacity-75 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                                </Badge>
                              </a>
                            );
                          }
                          return (
                            <Badge variant="primary">
                              {eg.examTitle}
                            </Badge>
                          );
                        })()}
                        {eg.questionNumber && (
                          <Badge variant="secondary">
                            Câu {eg.questionNumber}
                          </Badge>
                        )}
                        {eg.level && !eg.examTitle && (
                          <Badge variant="primary">{eg.level}</Badge>
                        )}
                        {eg.skill && !eg.examTitle && (
                          <Badge variant="secondary">{eg.skill}</Badge>
                        )}
                      </div>
                      {eg.passage && (
                        <p className="text-sm text-[var(--text-muted)] mb-2">
                          <HighlightText
                            text={eg.passage}
                            highlight={activeItemForExamples.term}
                            alternateHighlights={[activeItemForExamples.reading, eg.matchedTerm].filter(Boolean) as string[]}
                          />
                        </p>
                      )}
                      <p className="m-0 text-base font-japanese text-[var(--text-primary)] leading-relaxed font-medium">
                        <HighlightText
                          text={cleanStemText(eg.stem)}
                          highlight={activeItemForExamples.term}
                          alternateHighlights={[activeItemForExamples.reading, eg.matchedTerm].filter(Boolean) as string[]}
                        />
                      </p>

                      {((eg.options && eg.options.length > 0) || Boolean(eg.explanationText) || Boolean(eg.correctOptionIndex)) && (() => {
                        const qKey = eg.questionId || String(idx);
                        const isExpanded = Boolean(expandedQuestions[qKey]);
                        return (
                          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => toggleExpandQuestion(qKey)}
                                className="text-xs font-medium flex items-center gap-1.5 py-1 px-2.5 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="size-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                                    <span>Thu gọn đáp án & giải thích</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="size-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                                    <span>Xem đáp án & giải thích</span>
                                  </>
                                )}
                              </Button>

                              {isExpanded && eg.correctOptionIndex && (
                                <Badge variant="success">
                                  Đáp án đúng: Câu {eg.correctOptionIndex}
                                </Badge>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="flex flex-col gap-3 mt-1 pt-1 animate-in fade-in duration-200">
                                {/* Options grid */}
                                {eg.options && eg.options.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {eg.options.map((opt) => {
                                      const isCorrect = opt.orderIndex === eg.correctOptionIndex;
                                      return (
                                        <div
                                          key={opt.orderIndex}
                                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-sm transition-all ${
                                            isCorrect
                                              ? 'bg-emerald-50 text-emerald-950 border-emerald-300 font-medium dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700'
                                              : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                                          }`}
                                        >
                                          <span
                                            className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                              isCorrect
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                                            }`}
                                          >
                                            {opt.orderIndex}
                                          </span>
                                          <span className="font-japanese text-base leading-snug">
                                            <HighlightText
                                              text={opt.text}
                                              highlight={activeItemForExamples.term}
                                              alternateHighlights={[activeItemForExamples.reading, eg.matchedTerm].filter(Boolean) as string[]}
                                            />
                                          </span>
                                          {isCorrect && (
                                            <span className="ml-auto text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5 shrink-0">
                                              <Check className="size-3.5" aria-hidden="true" />
                                              Đúng
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Explanation block */}
                                {eg.explanationText && (
                                  <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1.5 leading-relaxed">
                                    <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-1 text-xs">
                                      <Lightbulb className="size-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                                      Giải thích chi tiết:
                                    </div>
                                    <div className="whitespace-pre-line text-xs font-normal text-[var(--text-primary)]">
                                      <HighlightText
                                        text={eg.explanationText}
                                        highlight={activeItemForExamples.term}
                                        alternateHighlights={[activeItemForExamples.reading, eg.matchedTerm].filter(Boolean) as string[]}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}

                {/* Nút xem thêm ví dụ trong các đề khác */}
                {onLoadMoreExamples && (
                  <div className="pt-2 pb-1 flex flex-col items-center">
                    {!moreLoaded && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-semibold py-2 px-4 rounded-lg border-dashed border-[var(--border-subtle)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-[var(--text-secondary)]"
                      >
                        {loadingMore ? (
                          <>
                            <Spinner size="sm" />
                            <span>{t('notebook.examples.loadingMore') || 'Đang tìm trong các đề khác...'}</span>
                          </>
                        ) : (
                          <>
                            <Search className="size-3.5" aria-hidden="true" />
                            <span>{t('notebook.examples.loadMore') || 'Xem thêm ví dụ trong các đề khác'}</span>
                          </>
                        )}
                      </Button>
                    )}
                    {moreError && (
                      <Alert variant="warning" className="mt-2" role="alert">
                        {moreError}
                      </Alert>
                    )}
                    {moreMessage && (
                      <p className="text-xs text-[var(--text-muted)] mt-1.5 text-center">
                        {moreMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => { setActiveItemForExamples(null); setExpandedQuestions({}); setLoadingMore(false); setMoreLoaded(false); setMoreMessage(null); }}>
                {t('common.buttons.close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
