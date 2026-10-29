'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BookmarkX,
  BookCopy,
  BookOpen,
  CircleAlert,
  CircleCheck,
  Copy,
  Info,
  Languages,
  MessageCircle,
  NotebookTabs,
  Search,
  Star,
  Volume2,
  X,
} from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@jlpt/ui/components/popover';
import { Alert } from '@jlpt/ui/components/alert';
import { Skeleton } from '@jlpt/ui/components/skeleton';
import { Button, Card, Chip, Popover as HeroPopover, Tabs } from '@jlpt/ui/components/exam-controls';
import type { SelectionLookupState } from '../hooks/use-select-lookup';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { defaultLearningClient } from '../../learning';
import { SelectionKanjiPanel } from './selection-kanji-panel';
import { selectedKanji } from '../utils/selected-kanji';
import { CorpusClient } from '../services/corpus-client';
import type { DictionaryMeaningSectionDto } from '../types';

export interface SelectionLookupPopoverProps {
  state: SelectionLookupState;
  openInNewTab?: boolean;
}

export function getVisibleLookupMeanings(meanings: string[] | undefined): string[] {
  return meanings ?? [];
}

export function findSavedNotebookTerm<T extends { term: string }>(items: T[], entry: string): T | undefined {
  const normalizedEntry = entry.normalize('NFC');
  return items.find((item) => item.term.normalize('NFC') === normalizedEntry);
}

export function findSavedNotebookTerms<T extends { term: string }>(items: T[], entry: string): T[] {
  const normalizedEntry = entry.normalize('NFC');
  return items.filter((item) => item.term.normalize('NFC') === normalizedEntry);
}

export function hasSavedNotebookTerm(items: Array<{ term: string }>, entry: string): boolean {
  return Boolean(findSavedNotebookTerm(items, entry));
}

type NoticeTarget = 'pronunciation' | 'save' | 'synonyms' | 'antonyms' | 'otherExamples';
type NoticeTone = 'success' | 'info' | 'error' | 'danger';

function ButtonNotice({
  active,
  message,
  tone,
  className = '',
  closeLabel,
  onClose,
  children,
}: {
  active: boolean;
  message: string;
  tone: NoticeTone;
  className?: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const toneClass =
    tone === 'success'
      ? 'border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
      : tone === 'danger'
        ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
        : tone === 'error'
          ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
          : 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200';
  const Icon = tone === 'success' ? CircleCheck : tone === 'danger' ? BookmarkX : tone === 'error' ? CircleAlert : Info;
  return (
    <HeroPopover isOpen={active} onOpenChange={(open) => !open && onClose()}>
      <HeroPopover.Trigger className={`min-w-0 ${className}`}>{children}</HeroPopover.Trigger>
      <HeroPopover.Content
        placement="top"
        offset={8}
        isNonModal
        className={`z-[100] w-max max-w-none rounded-xl p-0 shadow-lg ${toneClass}`}
        data-testid="lookup-action-notice"
      >
        <HeroPopover.Dialog className="p-0">
          <div className="flex items-center gap-1.5 p-1.5" role={tone === 'error' ? 'alert' : 'status'}>
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap text-sm font-semibold">{message}</span>
            <Button isIconOnly size="sm" variant="ghost" aria-label={closeLabel} onPress={onClose}>
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </HeroPopover.Dialog>
      </HeroPopover.Content>
    </HeroPopover>
  );
}

export function StructuredMeaningContent({ sections }: { sections: DictionaryMeaningSectionDto[] }): React.JSX.Element {
  const { t } = useI18n();
  const summary = sections.find((section) => section.summary)?.summary;
  const meanings = sections.flatMap((section) => section.meanings);
  const explanations = sections.flatMap((section) => (section.explanation ? [section.explanation] : []));
  return (
    <div className="space-y-2">
      {summary && (
        <section className="space-y-0.5" data-testid="lookup-meaning-summary-section">
          <h3 className="m-0 flex items-center gap-1.5 text-sm font-bold leading-tight text-[var(--color-primary)]">
            <BookOpen className="size-4" aria-hidden="true" />
            {t('dictionary.commonMeaningTitle')}
          </h3>
          <p className="m-0 text-base font-extrabold leading-snug" data-testid="lookup-meaning-summary">{summary}</p>
        </section>
      )}
      {meanings.length > 0 && (
        <section className="border-t border-[var(--border-subtle)] pt-2" data-testid="lookup-meaning-list-section">
          <h3 className="m-0 text-sm font-bold leading-tight text-[var(--color-primary)]">{t('dictionary.meaningDetailsTitle')}</h3>
          {meanings.length === 1 ? (
            <p className="m-0 mt-0.5 text-sm font-semibold leading-relaxed">{meanings[0]}</p>
          ) : (
            <ol className="m-0 mt-0.5 list-decimal space-y-1 pl-5 text-sm font-semibold">
              {meanings.map((meaning, index) => <li key={`${index}-${meaning}`}>{meaning}</li>)}
            </ol>
          )}
        </section>
      )}
      {explanations.length > 0 && (
        <section className="border-t border-[var(--border-subtle)] pt-2" data-testid="lookup-meaning-explanation-section">
          <h3 className="m-0 text-sm font-bold leading-tight text-[var(--color-primary)]">{t('dictionary.explanationTitle')}</h3>
          <div className="mt-0.5 space-y-1">
            {explanations.map((explanation, index) => (
              <p key={`${index}-${explanation}`} className="m-0 text-sm leading-relaxed" data-testid="lookup-meaning-explanation">{explanation}</p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function SelectionLookupPopover({ state, openInNewTab = true }: SelectionLookupPopoverProps): React.JSX.Element | null {
  const { t } = useI18n();
  const { user } = useAuth();
  const { isOpen, queryText, matchedText, virtualRect, status, result, error, close, retry } = state;
  const [client] = useState(() => new CorpusClient());
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingSaved, setIsCheckingSaved] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [audioText, setAudioText] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    target: NoticeTarget;
    message: string;
    tone: NoticeTone;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const virtualAnchorRef = useRef<{ getBoundingClientRect: () => DOMRect }>({
    getBoundingClientRect: () => virtualRect || new DOMRect(0, 0, 0, 0),
  });

  useEffect(() => {
    if (virtualRect) {
      virtualAnchorRef.current = {
        getBoundingClientRect: () => virtualRect,
      };
    }
  }, [virtualRect]);

  useEffect(() => {
    setIsSaved(false);
    setSavedItemIds([]);
    setActionNotice(null);
  }, [queryText]);

  useEffect(() => {
    if (!actionNotice) return;
    const timeout = window.setTimeout(() => setActionNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [actionNotice]);

  useEffect(() => {
    let active = true;
    setIsSaved(false);
    setSavedItemIds([]);
    if (!user || status !== 'success' || !result?.entry) {
      setIsCheckingSaved(false);
      return () => {
        active = false;
      };
    }

    setIsCheckingSaved(true);
    void defaultLearningClient
      .getNotebookItems({ kind: 'vocab', search: result.entry, limit: 50 })
      .then(({ items }) => {
        if (!active) return;
        const savedItems = findSavedNotebookTerms(items, result.entry);
        setIsSaved(savedItems.length > 0);
        setSavedItemIds(savedItems.map((item) => item.id));
      })
      .catch(() => {
        if (active) {
          setIsSaved(false);
          setSavedItemIds([]);
        }
      })
      .finally(() => {
        if (active) setIsCheckingSaved(false);
      });

    return () => {
      active = false;
    };
  }, [result?.entry, status, user]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  if (!isOpen) {
    return null;
  }

  const playPronunciation = async (text: string) => {
    setAudioText(text);
    try {
      audioRef.current?.pause();
      const response = await client.synthesizePronunciation(text);
      if (!response.audioUrl) throw new Error('Missing audio URL');
      const audio = new Audio(response.audioUrl);
      audioRef.current = audio;
      audio.addEventListener('ended', () => setAudioText(null), { once: true });
      await audio.play();
    } catch {
      setActionNotice({
        target: 'pronunciation',
        message: t('dictionary.pronunciationFailed'),
        tone: 'error',
      });
    } finally {
      setAudioText(null);
    }
  };

  const saveWord = async () => {
    if (!result) return;
    if (!user) {
      window.location.href = '/dang-nhap';
      return;
    }
    setIsSaving(true);
    setActionNotice(null);
    try {
      if (isSaved) {
        let itemIds = savedItemIds;
        if (itemIds.length === 0) {
          const current = await defaultLearningClient.getNotebookItems({
            kind: 'vocab',
            search: result.entry,
            limit: 50,
          });
          itemIds = findSavedNotebookTerms(current.items, result.entry).map((item) => item.id);
        }
        if (itemIds.length === 0) {
          setIsSaved(false);
          setSavedItemIds([]);
          setActionNotice({
            target: 'save',
            message: t('dictionary.removedFromNotebook'),
            tone: 'danger',
          });
          return;
        }
        await Promise.allSettled(itemIds.map((itemId) => defaultLearningClient.deleteNotebookItem(itemId)));
        const refreshed = await defaultLearningClient.getNotebookItems({
          kind: 'vocab',
          search: result.entry,
          limit: 50,
        });
        const remainingItems = findSavedNotebookTerms(refreshed.items, result.entry);
        if (remainingItems.length > 0) {
          setSavedItemIds(remainingItems.map((item) => item.id));
          throw new Error('Notebook item still exists after delete');
        }
        setIsSaved(false);
        setSavedItemIds([]);
        setActionNotice({
          target: 'save',
          message: t('dictionary.removedFromNotebook'),
          tone: 'danger',
        });
        return;
      }
      await defaultLearningClient.createNotebookItem({
        kind: 'vocab',
        term: result.entry,
        reading: result.readings?.[0] || undefined,
        meaning: result.meanings?.[0] || '',
        hanViet: result.hanViet || undefined,
        partOfSpeech: result.partOfSpeech,
      });
      const refreshed = await defaultLearningClient.getNotebookItems({
        kind: 'vocab',
        search: result.entry,
        limit: 50,
      });
      const savedItems = findSavedNotebookTerms(refreshed.items, result.entry);
      if (savedItems.length === 0) throw new Error('Saved notebook item not found after create');
      setIsSaved(true);
      setSavedItemIds(savedItems.map((item) => item.id));
      setActionNotice({
        target: 'save',
        message: t('dictionary.savedToNotebook'),
        tone: 'success',
      });
    } catch {
      setActionNotice({
        target: 'save',
        message: t('dictionary.saveFailed'),
        tone: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyExample = async (example: string) => {
    try {
      await navigator.clipboard.writeText(example);
    } catch {
      // Clipboard access can be unavailable in restricted browser contexts.
    }
  };

  const openDetails = () => {
    if (!result) return;
    const href = `/tu-vung/${encodeURIComponent(result.entry)}`;
    if (openInNewTab) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = href;
    }
  };

  const showDevelopmentNotice = (target: NoticeTarget) => {
    setActionNotice({
      target,
      message: t('dictionary.featureInDevelopment'),
      tone: 'info',
    });
  };

  const meaningSections = result?.meaningSections ?? [];
  const hasStructuredMeaningSections = meaningSections.some((section) => Boolean(section.summary || section.explanation));

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && close()}>
      <PopoverAnchor virtualRef={virtualAnchorRef} />
      <PopoverContent
        side="top"
        align="center"
        sideOffset={12}
        collisionPadding={16}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onKeyDown={(event) => event.stopPropagation()}
        className="z-50 w-[30rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--overlay)] p-2 text-[var(--text-primary)] shadow-[var(--overlay-shadow)]"
        data-testid="selection-lookup-popover"
        data-select-lookup-popover="true"
      >
        <Tabs key={queryText} defaultSelectedKey="vocabulary">
          <div className="mb-2 flex items-start justify-between gap-1.5">
            <Tabs.ListContainer className="min-w-0 flex-1">
              <Tabs.List aria-label={t('dictionary.lookupTabs')}>
                <Tabs.Tab id="vocabulary" className="text-sm">
                  {t('dictionary.vocabularyTab')}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="kanji" className="text-sm">
                  {t('dictionary.kanjiTab')} ({selectedKanji(queryText).length})
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Button isIconOnly variant="ghost" size="sm" aria-label={t('common.buttons.close')} onPress={close} data-testid="lookup-close-btn">
              <X className="size-5" aria-hidden="true" />
            </Button>
          </div>

          <Tabs.Panel id="vocabulary" className="max-h-96 overflow-y-auto pr-1">
            {status === 'loading' && (
              <div data-testid="lookup-loading-skeleton" className="space-y-4">
                <Skeleton className="h-11 w-48" />
                <Skeleton className="h-6 w-60" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
              </div>
            )}

            {status === 'not-found' && (
              <Card data-testid="lookup-not-found">
                <Card.Content className="space-y-2 py-8 text-center">
                  <p className="m-0 font-semibold">{t('dictionary.notFoundInDict')}</p>
                  <p className="m-0 font-japanese text-sm text-[var(--text-muted)]">&quot;{queryText}&quot;</p>
                </Card.Content>
              </Card>
            )}

            {status === 'error' && (
              <div data-testid="lookup-error" className="space-y-3">
                <Alert variant="error">{error || t('dictionary.networkError')}</Alert>
                <Button fullWidth variant="outline" onPress={retry} data-testid="lookup-retry-btn">
                  {t('dictionary.retry')}
                </Button>
              </div>
            )}

            {status === 'success' && result && (
              <div data-testid="lookup-result" className="space-y-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h4 data-testid="lookup-entry" className="m-0 font-japanese text-2xl font-extrabold leading-none tracking-tight">
                      {result.entry}
                    </h4>
                    <ButtonNotice
                      active={actionNotice?.target === 'pronunciation'}
                      message={actionNotice?.message ?? ''}
                      tone={actionNotice?.tone ?? 'info'}
                      closeLabel={t('common.buttons.close')}
                      onClose={() => setActionNotice(null)}
                    >
                      <Button
                        isIconOnly
                        size="sm"
                        variant="primary"
                        aria-label={t('dictionary.playPronunciation')}
                        onPress={() => showDevelopmentNotice('pronunciation')}
                        data-testid="lookup-pronunciation-btn"
                      >
                        <Volume2 className="size-4" aria-hidden="true" />
                      </Button>
                    </ButtonNotice>
                    {matchedText && matchedText !== result.entry && (
                      <span data-testid="lookup-matched-form" className="font-japanese text-sm text-[var(--text-muted)]">
                        ({matchedText} → {result.entry})
                      </span>
                    )}
                    <ButtonNotice
                      active={actionNotice?.target === 'save'}
                      message={actionNotice?.message ?? ''}
                      tone={actionNotice?.tone ?? 'success'}
                      className="ml-auto shrink-0"
                      closeLabel={t('common.buttons.close')}
                      onClose={() => setActionNotice(null)}
                    >
                      <Button
                        size="sm"
                        variant={isSaved ? 'secondary' : 'outline'}
                        className={isSaved ? 'border-[var(--color-warning)] bg-[var(--color-warning-light)] text-[var(--color-warning-text)]' : undefined}
                        onPress={() => void saveWord()}
                        isDisabled={isSaving || isCheckingSaved}
                        aria-pressed={isSaved}
                        data-testid="save-to-notebook-btn"
                        data-saved={isSaved ? 'true' : 'false'}
                      >
                        <Star className="size-5" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
                        {t(isSaved ? 'dictionary.savedWord' : 'dictionary.saveWord')}
                      </Button>
                    </ButtonNotice>
                  </div>
                  {result.readings && result.readings.length > 0 && (
                    <div data-testid="lookup-readings" className="font-japanese text-base font-bold text-blue-600 dark:text-blue-400">
                      【{result.readings.join('、')}】
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {result.hanViet && (
                    <Chip color="warning" variant="secondary" size="sm" data-testid="lookup-hanviet">
                      <Languages className="size-4" aria-hidden="true" />
                      <Chip.Label className="font-bold">
                        {result.hanVietConfidence === 'kun' ? `${t('dictionary.hanvietKun')} ${result.hanViet}` : result.hanViet}
                      </Chip.Label>
                    </Chip>
                  )}
                  {result.posLabels?.map((label) => (
                    <Chip key={label} variant="soft" size="sm" data-testid="lookup-pos-label">
                      {label}
                    </Chip>
                  ))}
                  {!result.posLabels?.length && result.partOfSpeech && (
                    <Chip variant="soft" size="sm" data-testid="lookup-pos-label">
                      {result.partOfSpeech}
                    </Chip>
                  )}
                  {result.level && (
                    <Chip color="success" variant="soft" size="sm" data-testid="lookup-level">
                      {result.level}
                    </Chip>
                  )}
                  {result.hanVietConfidence === 'review' && (
                    <Chip color="warning" variant="soft" size="sm" data-testid="lookup-hanviet-review">
                      {t('dictionary.hanvietReview')}
                    </Chip>
                  )}
                </div>

                {(hasStructuredMeaningSections || getVisibleLookupMeanings(result.meanings).length > 0) && (
                  <Card className="rounded-xl border-0 bg-[var(--color-primary-light)] p-1 shadow-none" data-testid="lookup-meanings">
                    <Card.Content className="gap-2 p-1.5">
                      {hasStructuredMeaningSections ? (
                        <StructuredMeaningContent sections={meaningSections} />
                      ) : (
                        <>
                          <Card.Title className="m-0 flex items-center gap-1.5 text-sm font-bold leading-tight text-[var(--color-primary)]">
                            <BookOpen className="size-4" aria-hidden="true" />
                            {t('dictionary.vietnameseMeaningsTitle')}
                          </Card.Title>
                          {result.meanings.length === 1 ? (
                            <p className="m-0 text-base font-extrabold leading-snug">{result.meanings[0]}</p>
                          ) : (
                            <ol className="m-0 list-decimal space-y-1 pl-5 text-sm font-semibold">
                              {result.meanings.map((meaning) => (
                                <li key={meaning}>{meaning}</li>
                              ))}
                            </ol>
                          )}
                        </>
                      )}
                    </Card.Content>
                  </Card>
                )}

                <Card className="rounded-xl border-0 bg-blue-50 p-1 shadow-none dark:bg-blue-950/30" data-testid="lookup-examples">
                  <Card.Content className="gap-0.5 p-1.5">
                    <Card.Title className="m-0 flex items-center gap-1.5 text-sm font-bold leading-tight text-blue-700 dark:text-blue-300">
                      <MessageCircle className="size-4" aria-hidden="true" />
                      {t('dictionary.popupExamplesTitle')}
                    </Card.Title>
                    {result.examples && result.examples.length > 0 ? (
                      <ul className="m-0 list-none space-y-2 p-0">
                        {result.examples.slice(0, 2).map((example, index) => (
                          <li key={`${example}-${index}`} className="space-y-2">
                            {index > 0 && <div className="h-px bg-[var(--border-subtle)]" aria-hidden="true" />}
                            <div className="flex items-start justify-between gap-2">
                              <p lang="ja" className="m-0 flex-1 font-japanese text-sm leading-relaxed">
                                {example}
                              </p>
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  isIconOnly
                                  variant="outline"
                                  aria-label={t('dictionary.playPronunciation')}
                                  isDisabled={audioText !== null}
                                  onPress={() => void playPronunciation(example)}
                                >
                                  <Volume2 className="size-5" aria-hidden="true" />
                                </Button>
                                <Button isIconOnly variant="outline" aria-label={t('dictionary.copyExample')} onPress={() => void copyExample(example)}>
                                  <Copy className="size-5" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="m-0 text-sm text-[var(--text-muted)]">{t('dictionary.noPopupExamples')}</p>
                    )}
                  </Card.Content>
                </Card>

                <div className="sticky bottom-0 z-10 grid grid-cols-4 gap-1 border-t border-[var(--border-subtle)] bg-[var(--overlay)] py-1.5">
                  <Button
                    fullWidth
                    variant="primary"
                    size="sm"
                    className="min-w-0 px-1 text-[11px] font-semibold"
                    onPress={openDetails}
                    data-testid="lookup-details-btn"
                  >
                    <Search className="size-4 shrink-0" aria-hidden="true" />
                    {t('dictionary.viewDetails')}
                  </Button>
                  <ButtonNotice
                    active={actionNotice?.target === 'synonyms'}
                    message={actionNotice?.message ?? ''}
                    tone={actionNotice?.tone ?? 'info'}
                    className="w-full"
                    closeLabel={t('common.buttons.close')}
                    onClose={() => setActionNotice(null)}
                  >
                    <Button
                      fullWidth
                      variant="secondary"
                      size="sm"
                      className="min-w-0 px-1 text-[11px] font-semibold"
                      onPress={() => showDevelopmentNotice('synonyms')}
                    >
                      <BookCopy className="size-4 shrink-0" aria-hidden="true" />
                      {t('dictionary.synonyms')}
                    </Button>
                  </ButtonNotice>
                  <ButtonNotice
                    active={actionNotice?.target === 'antonyms'}
                    message={actionNotice?.message ?? ''}
                    tone={actionNotice?.tone ?? 'info'}
                    className="w-full"
                    closeLabel={t('common.buttons.close')}
                    onClose={() => setActionNotice(null)}
                  >
                    <Button
                      fullWidth
                      variant="secondary"
                      size="sm"
                      className="min-w-0 px-1 text-[11px] font-semibold"
                      onPress={() => showDevelopmentNotice('antonyms')}
                    >
                      <ArrowLeftRight className="size-4 shrink-0" aria-hidden="true" />
                      {t('dictionary.antonyms')}
                    </Button>
                  </ButtonNotice>
                  <ButtonNotice
                    active={actionNotice?.target === 'otherExamples'}
                    message={actionNotice?.message ?? ''}
                    tone={actionNotice?.tone ?? 'info'}
                    className="w-full"
                    closeLabel={t('common.buttons.close')}
                    onClose={() => setActionNotice(null)}
                  >
                    <Button
                      fullWidth
                      variant="secondary"
                      size="sm"
                      className="min-w-0 px-1 text-[11px] font-semibold"
                      onPress={() => showDevelopmentNotice('otherExamples')}
                    >
                      <NotebookTabs className="size-4 shrink-0" aria-hidden="true" />
                      {t('dictionary.otherExamples')}
                    </Button>
                  </ButtonNotice>
                </div>
              </div>
            )}
          </Tabs.Panel>

          <Tabs.Panel id="kanji" className="max-h-96 overflow-y-auto pr-1">
            <SelectionKanjiPanel text={queryText} breakdown={status === 'success' ? result?.hanVietPerKanji : undefined} />
          </Tabs.Panel>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
