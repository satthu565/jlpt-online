'use client';

import { ArrowRight, Flag, NotebookPen, Search } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@jlpt/ui/components/card';
import { Input } from '@jlpt/ui/components/input';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Modal } from '@jlpt/ui/components/modal';
import { Skeleton } from '@jlpt/ui/components/skeleton';
import { Textarea } from '@jlpt/ui/components/textarea';
import { TTSAudioPlayer } from '@jlpt/ui/components/tts-audio-player';
import { Spinner } from '@jlpt/ui/components/spinner';
import { CorpusClient } from '../services/corpus-client';
import type { VocabTermDto, DictionaryLookupResultDto } from '../types';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { FEATURES } from '../../../lib/features';
import { defaultLearningClient } from '../../learning';

export interface VocabExplorerProps {
  initialLevel?: string;
  initialItems?: VocabTermDto[];
  className?: string;
}

export function VocabExplorer({
  initialLevel = 'ALL',
  initialItems,
  className = '',
}: VocabExplorerProps): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();
  const [client] = useState(() => new CorpusClient());

  // 1. Dictionary lookup state (H02)
  const [dictQuery, setDictQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [dictResult, setDictResult] = useState<DictionaryLookupResultDto | null>(null);
  const [dictSearchState, setDictSearchState] = useState<'idle' | 'loading' | 'success' | 'not-found' | 'error'>('idle');
  const [dictError, setDictError] = useState<string | null>(null);
  const [showKanjiBreakdown, setShowKanjiBreakdown] = useState(false);

  // Notebook save state for dictionary lookup item
  const [isSavingNotebook, setIsSavingNotebook] = useState(false);
  const [dictSaveNotice, setDictSaveNotice] = useState<string | null>(null);
  const [dictSaveError, setDictSaveError] = useState<string | null>(null);

  // Han-Viet error report dialog state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuggestion, setReportSuggestion] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // 2. Corpus state
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>(initialLevel);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [items, setItems] = useState<VocabTermDto[]>(() => initialItems || []);

  const [savingTerm, setSavingTerm] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [saveErrorNotice, setSaveErrorNotice] = useState<string | null>(null);

  // Fetch real dataset ID dynamically from API (no hardcoded IDs)
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    client
      .listDatasets()
      .then((res) => {
        if (active) {
          if (res.items && res.items.length > 0) {
            setDatasetId(res.items[0]!.id);
          } else {
            setIsLoading(false);
          }
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách tập ngữ liệu');
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [client]);

  // Fetch vocabulary using the real datasetId
  useEffect(() => {
    if (!datasetId) return;
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    client
      .getVocabulary(datasetId, selectedLevel === 'ALL' ? undefined : selectedLevel)
      .then((data) => {
        if (active) {
          setItems(data || []);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Không thể tải dữ liệu từ vựng');
          setItems([]);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, datasetId, selectedLevel]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedLevel !== 'ALL' && item.level !== selectedLevel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTerm = item.term.toLowerCase().includes(q);
        const matchReading = item.reading.toLowerCase().includes(q);
        const matchMeaning = item.meaning.toLowerCase().includes(q);
        if (!matchTerm && !matchReading && !matchMeaning) return false;
      }
      return true;
    });
  }, [items, selectedLevel, searchQuery]);

  // Dictionary lookup handler
  const handleDictSearch = async (overrideTerm?: string) => {
    const term = (overrideTerm !== undefined ? overrideTerm : dictQuery).trim();
    if (!term) return;
    setSearchedQuery(term);
    setDictSearchState('loading');
    setDictError(null);
    setDictResult(null);
    setShowKanjiBreakdown(false);
    setDictSaveNotice(null);
    setDictSaveError(null);

    try {
      const res = await client.lookupDictionary(term);
      setDictResult(res);
      setDictSearchState('success');
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : String(err);
      if (
        status === 404 ||
        message.includes('404') ||
        message.includes('No dictionary entry') ||
        message.toLowerCase().includes('not found')
      ) {
        setDictSearchState('not-found');
      } else {
        setDictSearchState('error');
        setDictError(message || t('dictionary.networkError'));
      }
    }
  };

  // Save dictionary result to notebook
  const handleSaveDictToNotebook = async () => {
    if (!dictResult) return;
    if (!user) {
      if (typeof window !== 'undefined') {
        window.location.href = '/dang-nhap';
      }
      return;
    }
    setIsSavingNotebook(true);
    setDictSaveNotice(null);
    setDictSaveError(null);
    try {
      await defaultLearningClient.createNotebookItem({
        kind: 'vocab',
        term: dictResult.entry,
        reading: dictResult.readings?.[0] || undefined,
        meaning: dictResult.meanings?.[0] || '',
        hanViet: dictResult.hanViet || undefined,
        partOfSpeech: dictResult.partOfSpeech,
      });
      setDictSaveNotice(t('dictionary.savedToNotebook'));
      setTimeout(() => setDictSaveNotice(null), 4000);
    } catch {
      setDictSaveError(t('dictionary.saveFailed'));
      setTimeout(() => setDictSaveError(null), 4000);
    } finally {
      setIsSavingNotebook(false);
    }
  };

  // Submit Han-Viet report
  const handleSubmitReport = async () => {
    if (!dictResult) return;
    setIsSubmittingReport(true);
    setReportError(null);
    try {
      await client.reportHanViet({
        entry: dictResult.entry,
        reading: dictResult.readings?.[0] || undefined,
        suggestion: reportSuggestion.trim() || undefined,
        note: reportNote.trim() || undefined,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportSuccess(false);
        setReportSuggestion('');
        setReportNote('');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setReportError(msg || t('dictionary.reportFailed'));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Save corpus item to notebook
  const handleSaveCorpusToNotebook = async (item: VocabTermDto) => {
    if (!datasetId) return;
    try {
      setSavingTerm(item.term);
      setSaveSuccessNotice(null);
      setSaveErrorNotice(null);
      await client.addToNotebook(datasetId, item.term, item.reading, item.meaning);
      setSaveSuccessNotice(t('seo.corpus.addedToNotebook'));
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch {
      setSaveErrorNotice(t('seo.corpus.saveFailed') || 'Không thể lưu từ vào sổ tay. Vui lòng thử lại sau.');
      setTimeout(() => setSaveErrorNotice(null), 4000);
    } finally {
      setSavingTerm(null);
    }
  };

  const levels = ['ALL', 'N1', 'N2', 'N3', 'N4', 'N5'];

  return (
    <div
      data-testid="vocab-explorer"
      className={`jlpt-vocab-explorer space-y-8 ${className}`}
    >
      {/* 1. Tra từ điển JMdict / KANJIDIC2 (H02) */}
      <section aria-labelledby="dict-lookup-heading" className="space-y-4" data-testid="dictionary-lookup-section">
        <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-6 space-y-4 border border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="dict-lookup-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('dictionary.title')}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {t('dictionary.subtitle')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1">
              <Input
                id="dict-search-input"
                data-testid="dict-search-input"
                value={dictQuery}
                onChange={(e) => setDictQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleDictSearch();
                  }
                }}
                placeholder={t('dictionary.inputPlaceholder')}
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              data-testid="dict-search-btn"
              loading={dictSearchState === 'loading'}
              onClick={() => handleDictSearch()}
              className="shrink-0"
            >
              <Search className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('dictionary.searchButton')}
            </Button>
          </div>

          {/* Quick example suggestions */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 pt-1">
            <span>{t('dictionary.examplesLabel')}</span>
            {['学生', '勉強', 'よやく'].map((term) => (
              <Button
                key={term}
                type="button"
                variant="secondary"
                size="sm"
                data-testid={`dict-example-${term}`}
                className="text-xs font-japanese font-medium h-7 px-2.5"
                onClick={() => {
                  setDictQuery(term);
                  handleDictSearch(term);
                }}
              >
                {term}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State: Skeleton */}
        {dictSearchState === 'loading' && (
          <Card className="p-6 space-y-4 border border-slate-200 dark:border-slate-800" data-testid="dict-loading-skeleton">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-9 w-36" />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
        )}

        {/* 404 / Not Found State */}
        {dictSearchState === 'not-found' && (
          <div
            data-testid="dict-not-found"
            className="surface surface--default rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-600 dark:text-slate-400 text-sm"
          >
            {t('dictionary.notFound', { query: searchedQuery })}
          </div>
        )}

        {/* Network / 5xx Error State */}
        {dictSearchState === 'error' && (
          <Alert variant="error" className="text-xs" data-testid="dict-error-alert">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <span>{dictError || t('dictionary.networkError')}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDictSearch(searchedQuery || dictQuery)}
              >
                {t('dictionary.retry')}
              </Button>
            </div>
          </Alert>
        )}

        {/* Success Result Card */}
        {dictSearchState === 'success' && dictResult && (
          <Card
            data-testid="dict-result-card"
            className="p-6 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3
                    data-testid="dictionary-entry"
                    className="text-3xl font-extrabold font-japanese text-slate-900 dark:text-slate-100 tracking-tight"
                  >
                    {dictResult.entry}
                  </h3>
                  {dictResult.readings && dictResult.readings.length > 0 && (
                    <div
                      data-testid="dictionary-readings"
                      className="text-lg font-medium font-japanese text-slate-600 dark:text-slate-300"
                    >
                      【{dictResult.readings.join('、')}】
                    </div>
                  )}
                </div>

                {dictResult.hanViet && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span
                      data-testid="dictionary-hanviet"
                      className="text-sm font-bold px-2.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                    >
                      {dictResult.hanVietConfidence === 'kun'
                        ? `${t('dictionary.hanvietKun')} ${dictResult.hanViet}`
                        : dictResult.hanViet}
                    </span>
                    {dictResult.hanVietConfidence === 'review' && (
                      <Badge
                        variant="warning"
                        size="sm"
                        data-testid="hanviet-review-badge"
                      >
                        {t('dictionary.hanvietReview')}
                      </Badge>
                    )}
                    {dictResult.partOfSpeech && (
                      <span
                        data-testid="dictionary-pos"
                        className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                      >
                        {dictResult.partOfSpeech}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: Save to Notebook & Report Han-Viet */}
              <div className="flex items-center gap-2 flex-wrap">
                {!user ? (
                  <>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      data-testid="save-to-notebook-btn"
                    >
                      <Link href="/dang-nhap">
                        <NotebookPen className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('dictionary.saveToNotebook')}
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      data-testid="report-hanviet-btn"
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <Link href="/dang-nhap">
                        <Flag className="inline size-3.5 align-[-2px]" aria-hidden="true" /> {t('dictionary.reportHanviet')}
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid="save-to-notebook-btn"
                      loading={isSavingNotebook}
                      onClick={handleSaveDictToNotebook}
                    >
                      <NotebookPen className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('dictionary.saveToNotebook')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-testid="report-hanviet-btn"
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      onClick={() => {
                        setIsReportModalOpen(true);
                        setReportSuggestion('');
                        setReportNote('');
                        setReportError(null);
                        setReportSuccess(false);
                      }}
                    >
                      <Flag className="inline size-3.5 align-[-2px]" aria-hidden="true" /> {t('dictionary.reportHanviet')}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {dictSaveNotice && (
              <Alert variant="success" className="text-xs" data-testid="notebook-save-success">
                {dictSaveNotice}
              </Alert>
            )}

            {dictSaveError && (
              <Alert variant="error" className="text-xs" data-testid="notebook-save-error">
                {dictSaveError}
              </Alert>
            )}

            {/* Kanji Breakdown Section */}
            {dictResult.hanVietPerKanji && dictResult.hanVietPerKanji.length > 0 && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="toggle-kanji-breakdown-btn"
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-0"
                  onClick={() => setShowKanjiBreakdown(!showKanjiBreakdown)}
                >
                  {showKanjiBreakdown ? t('dictionary.hideKanjiBreakdown') : t('dictionary.kanjiBreakdown')}
                </Button>

                {showKanjiBreakdown && (
                  <div
                    data-testid="kanji-breakdown-container"
                    className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2" data-testid="kanji-breakdown-list">
                      {dictResult.hanVietPerKanji.map((k, idx) => (
                        <div
                          key={idx}
                          data-testid="kanji-breakdown-item"
                          className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800"
                        >
                          <span className="text-xl font-bold font-japanese text-slate-900 dark:text-slate-100">{k.kanji}</span>
                          <div className="flex flex-col text-[11px]">
                            {k.on && (
                              <span className="font-japanese text-slate-500">
                                {t('dictionary.onYomi')}: {k.on}
                              </span>
                            )}
                            <span className="font-semibold text-amber-800 dark:text-amber-300">
                              {k.hanViet}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Meanings */}
            {dictResult.meanings && dictResult.meanings.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {t('dictionary.meaningsTitle')}
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-slate-800 dark:text-slate-200" data-testid="dictionary-meanings">
                  {dictResult.meanings.map((meaning, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {meaning}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Attribution */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500" data-testid="dictionary-attribution">
              {t('dictionary.attribution')} –{' '}
              <a
                href="/gioi-thieu#nguon-du-lieu"
                className="underline hover:text-blue-600 dark:hover:text-blue-400"
              >
                {t('dictionary.attributionLink')}
              </a>.
            </div>
          </Card>
        )}

        {/* Report Han-Viet Modal */}
        <Modal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          title={t('dictionary.reportModalTitle')}
          closeLabel={t('dictionary.cancel')}
        >
          <div className="space-y-4" data-testid="report-hanviet-modal">
            {dictResult && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t('dictionary.reportEntryLabel')}{' '}
                <strong className="font-japanese text-slate-900 dark:text-slate-100">{dictResult.entry}</strong>
                {dictResult.readings?.[0] ? ` (${dictResult.readings[0]})` : ''}
              </p>
            )}

            {reportError && (
              <Alert variant="error" className="text-xs" data-testid="report-error-alert">
                {reportError}
              </Alert>
            )}

            {reportSuccess ? (
              <Alert variant="success" className="text-xs" data-testid="report-hanviet-success">
                {t('dictionary.reportSent')}
              </Alert>
            ) : (
              <>
                <div>
                  <Input
                    id="hanviet-suggestion-input"
                    data-testid="hanviet-suggestion-input"
                    label={t('dictionary.reportSuggestionLabel')}
                    placeholder={t('dictionary.reportSuggestionPlaceholder')}
                    value={reportSuggestion}
                    onChange={(e) => setReportSuggestion(e.target.value)}
                  />
                </div>
                <div>
                  <Textarea
                    id="hanviet-note-input"
                    data-testid="hanviet-note-input"
                    label={t('dictionary.reportNoteLabel')}
                    placeholder={t('dictionary.reportNotePlaceholder')}
                    rows={3}
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsReportModalOpen(false)}
                  >
                    {t('dictionary.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    data-testid="submit-hanviet-report-btn"
                    loading={isSubmittingReport}
                    onClick={handleSubmitReport}
                  >
                    {t('dictionary.sendReport')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      </section>

      {/* 2. Corpus Vocabulary Section */}
      {/* Header controls: Search & Level Tabs */}
      <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] flex flex-col md:flex-row gap-4 justify-between items-center p-4 border border-slate-200 dark:border-slate-800">
        <div className="w-full md:w-96">
          <Input
            id="vocab-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('seo.corpus.searchPlaceholder')}
            data-testid="vocab-search-input"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap" data-testid="level-tabs">
          {levels.map((lvl) => (
            <Button
              key={lvl}
              type="button"
              size="sm"
              variant={selectedLevel === lvl ? 'primary' : 'secondary'}
              onClick={() => setSelectedLevel(lvl)}
              data-testid={`level-tab-${lvl}`}
              className="text-xs font-bold"
            >
              {lvl}
            </Button>
          ))}
        </div>
      </div>

      {saveSuccessNotice && (
        <Alert variant="success" className="text-xs" data-testid="notebook-save-notice">
          {saveSuccessNotice}
        </Alert>
      )}

      {saveErrorNotice && (
        <Alert variant="error" className="text-xs" data-testid="notebook-save-error">
          {saveErrorNotice}
        </Alert>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-6" data-testid="vocab-loading-spinner">
          <Spinner size="md" aria-label="Đang tải dữ liệu từ vựng..." />
        </div>
      )}

      {loadError && (
        <Alert variant="error" className="text-xs" data-testid="vocab-load-error">
          {loadError}
        </Alert>
      )}

      {/* Vocab Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="vocab-cards-grid">
        {filteredItems.map((item) => (
          <Card
            key={item.term}
            data-testid="vocab-term-card"
            className="p-5 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold font-japanese text-slate-900 dark:text-slate-100">
                    {item.term}
                  </h3>
                  {item.hanViet && (
                    <span
                      data-testid="vocab-hanviet"
                      className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    >
                      {item.hanViet}
                    </span>
                  )}
                  <span className="text-xs font-japanese text-slate-500">
                    【{item.reading}】
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                  {item.meaning}
                </p>
                {item.partOfSpeech && (
                  <span className="text-[11px] text-slate-400">
                    {item.partOfSpeech}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant={
                    item.level === 'N1'
                      ? 'danger'
                      : item.level === 'N2'
                        ? 'warning'
                        : item.level === 'N3'
                          ? 'primary'
                          : 'neutral'
                  }
                  size="sm"
                >
                  {item.level}
                </Badge>
                <span className="text-[10px] text-slate-400">
                  Tần suất: {item.frequency} lần
                </span>
              </div>
            </div>

            {/* Example sentence */}
            {item.exampleSentence && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1">
                <p className="font-japanese font-medium text-slate-800 dark:text-slate-200">
                  {item.exampleSentence}
                </p>
                {item.exampleMeaning && (
                  <p className="text-slate-500 text-[11px]">
                    <ArrowRight className="inline size-4 align-[-2px]" aria-hidden="true" /> {item.exampleMeaning}
                  </p>
                )}
              </div>
            )}

            {/* Bottom Actions: TTS & Add to Notebook */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {FEATURES.tts && (
                <TTSAudioPlayer
                  text={item.term}
                  voice="ja-JP-Standard-A"
                  status="SANDBOX"
                  isExternal={false}
                  onFetchAudio={() => client.synthesizePronunciation(item.term)}
                  labels={{
                    play: t('seo.tts.play'),
                    pause: t('seo.tts.pause'),
                    loading: t('seo.tts.loading'),
                    sandboxNotice: t('seo.tts.sandboxNotice'),
                    errorNotice: t('seo.tts.errorNotice'),
                  }}
                />
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={savingTerm === item.term}
                onClick={() => handleSaveCorpusToNotebook(item)}
                data-testid="add-to-notebook-btn"
              >
                <NotebookPen className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('seo.corpus.addToNotebook')}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {items.length > 0 && filteredItems.length === 0 && (
        <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-12 text-center text-slate-500">
          Không tìm thấy từ vựng nào phù hợp.
        </div>
      )}
    </div>
  );
}
