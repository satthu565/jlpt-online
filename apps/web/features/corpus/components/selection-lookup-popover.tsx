'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Alert, Button, Card, Chip, Popover as HeroPopover, Separator, Skeleton, Tabs } from '@jlpt/ui/components/exam-controls';
import type { SelectionLookupState } from '../hooks/use-select-lookup';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { defaultLearningClient } from '../../learning';
import { SelectionKanjiPanel } from './selection-kanji-panel';
import { SelectionGrammarPanel } from './selection-grammar-panel';
import { findMatchingGrammarPatterns, isPrimaryGrammarPattern } from '../data/grammar-dictionary';
import { selectedKanji } from '../utils/selected-kanji';
import { CorpusClient } from '../services/corpus-client';
import type { DictionaryMeaningSectionDto } from '../types';

export interface SelectionLookupContext {
  questionId?: string;
  examId?: string;
  examTitle?: string;
  questionNumber?: number | string;
  sentence?: string;
  options?: { orderIndex: number; text: string }[];
  correctOptionIndex?: number;
  explanationText?: string;
}

export interface SelectionLookupPopoverProps {
  state: SelectionLookupState;
  openInNewTab?: boolean;
  context?: SelectionLookupContext;
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
  const Icon = tone === 'success' ? CircleCheck : tone === 'danger' ? BookmarkX : tone === 'error' ? CircleAlert : Info;
  return (
    <HeroPopover isOpen={active} onOpenChange={(open) => !open && onClose()}>
      <HeroPopover.Trigger className={`min-w-0 ${className}`}>{children}</HeroPopover.Trigger>
      <HeroPopover.Content
        placement="top"
        offset={8}
        isNonModal
        className="z-[100] w-max max-w-none"
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
          <h3 className="m-0 flex items-center gap-1.5 text-sm font-bold leading-tight">
            <BookOpen className="size-4" aria-hidden="true" />
            {t('dictionary.commonMeaningTitle')}
          </h3>
          <p className="m-0 text-base font-extrabold leading-snug" data-testid="lookup-meaning-summary">{summary}</p>
        </section>
      )}
      {meanings.length > 0 && (
        <section className="pt-2" data-testid="lookup-meaning-list-section">
          <h3 className="m-0 text-sm font-bold leading-tight">{t('dictionary.meaningDetailsTitle')}</h3>
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
        <section className="pt-2" data-testid="lookup-meaning-explanation-section">
          <h3 className="m-0 text-sm font-bold leading-tight">{t('dictionary.explanationTitle')}</h3>
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

export function SelectionLookupPopover({ state, openInNewTab = true, context }: SelectionLookupPopoverProps): React.JSX.Element | null {
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
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  const grammarPatterns = React.useMemo(() => findMatchingGrammarPatterns(queryText), [queryText]);
  const kanjiList = React.useMemo(() => selectedKanji(queryText), [queryText]);

  const defaultTab = React.useMemo(() => {
    if (grammarPatterns.length > 0 && (isPrimaryGrammarPattern(queryText) || status === 'not-found')) {
      return 'grammar';
    }
    return 'vocabulary';
  }, [grammarPatterns.length, queryText, status]);

  const [activeTab, setActiveTab] = useState<string>('vocabulary');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, queryText]);

  // The popup opens from the selected text, so the (invisible) Popover.Trigger is laid over the selection rect.
  // Placed in the ref callback because inline style props are not allowed here.
  const setAnchor = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || !virtualRect) return;
      element.style.left = `${virtualRect.left}px`;
      element.style.top = `${virtualRect.top}px`;
      element.style.width = `${virtualRect.width}px`;
      element.style.height = `${virtualRect.height}px`;
    },
    [virtualRect],
  );

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
      const tagsToAdd: string[] = [];
      const examplesToAdd: string[] = [];
      if (context?.examTitle) tagsToAdd.push(`source_exam:${context.examTitle}`);
      if (context?.questionNumber) tagsToAdd.push(`source_qnum:${context.questionNumber}`);
      if (context?.questionId) tagsToAdd.push(`source_qid:${context.questionId}`);
      if (context?.sentence) {
        tagsToAdd.push(`source_sentence:${context.sentence}`);
        const refSuffix = context.examTitle ? ` (Đề thi ${context.examTitle}${context.questionNumber ? ` - Câu ${context.questionNumber}` : ''})` : '';
        examplesToAdd.push(`${context.sentence}${refSuffix}`);
      }
      if (context?.options && context.options.length > 0) {
        context.options.forEach((opt) => {
          tagsToAdd.push(`source_opt_${opt.orderIndex}:${opt.text}`);
        });
      }
      if (context?.correctOptionIndex) {
        tagsToAdd.push(`source_answer:${context.correctOptionIndex}`);
      }
      if (context?.explanationText) {
        tagsToAdd.push(`source_expl:${context.explanationText}`);
      }

      await defaultLearningClient.createNotebookItem({
        kind: 'vocab',
        term: result.entry,
        reading: result.readings?.[0] || undefined,
        meaning: result.meanings?.[0] || '',
        hanViet: result.hanViet || undefined,
        partOfSpeech: result.partOfSpeech,
        tags: tagsToAdd.length > 0 ? tagsToAdd : undefined,
        examples: examplesToAdd.length > 0 ? examplesToAdd : undefined,
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
    <HeroPopover isOpen={isOpen} onOpenChange={(open) => !open && close()}>
      {/* Keep tab focus inside a fixed layer so it cannot scroll the document
          and trigger React Aria's close-on-scroll for this non-modal popover. */}
      <div ref={setPortalContainer} className="pointer-events-none fixed inset-0 z-50" />
      <HeroPopover.Trigger ref={setAnchor} aria-hidden="true" tabIndex={-1} className="pointer-events-none invisible fixed" data-testid="selection-lookup-anchor" />
      <HeroPopover.Content isNonModal UNSTABLE_portalContainer={portalContainer ?? undefined} className="pointer-events-auto" data-testid="selection-lookup-popover" data-select-lookup-popover="true">
        <HeroPopover.Arrow>
          <svg width="18" height="18" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M0 0C5.48483 8 6.5 8 12 0Z" />
          </svg>
        </HeroPopover.Arrow>
        <HeroPopover.Dialog aria-label={t('dictionary.lookupTabs')}>
          <div className="w-[30rem] max-w-[calc(100vw-4rem)]">
            <Tabs key={`${queryText}-${defaultTab}`} selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key))}>
              <div className="mb-2 flex items-start justify-between gap-1.5">
                <Tabs.ListContainer className="min-w-0 flex-1">
                  <Tabs.List aria-label={t('dictionary.lookupTabs')}>
                    <Tabs.Tab id="vocabulary" className="text-sm">
                      {t('dictionary.vocabularyTab')}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="grammar" className="text-sm" data-testid="lookup-grammar-tab">
                      {t('dictionary.grammarTab')} ({grammarPatterns.length})
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="kanji" className="text-sm">
                      {t('dictionary.kanjiTab')} ({kanjiList.length})
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
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-36 w-full" />
                  </div>
                )}

                {status === 'not-found' && (
                  <Card data-testid="lookup-not-found">
                    <Card.Content className="space-y-2 py-8 text-center">
                      <p className="m-0 font-semibold">{t('dictionary.notFoundInDict')}</p>
                      <p className="m-0 font-japanese text-sm">&quot;{queryText}&quot;</p>
                    </Card.Content>
                  </Card>
                )}

                {status === 'error' && (
                  <div data-testid="lookup-error" className="space-y-3">
                    <Alert status="danger" role="alert">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{error || t('dictionary.networkError')}</Alert.Description>
                      </Alert.Content>
                    </Alert>
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
                          <span data-testid="lookup-matched-form" className="font-japanese text-sm">
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
                        <div data-testid="lookup-readings" className="font-japanese text-base font-bold">
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
                      <Card data-testid="lookup-meanings">
                        <Card.Content>
                          {hasStructuredMeaningSections ? (
                            <StructuredMeaningContent sections={meaningSections} />
                          ) : (
                            <>
                              <Card.Title className="m-0 flex items-center gap-1.5 text-sm font-bold leading-tight">
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

                    <Card data-testid="lookup-examples">
                      <Card.Content>
                        <Card.Title className="m-0 flex items-center gap-1.5 text-sm font-bold leading-tight">
                          <MessageCircle className="size-4" aria-hidden="true" />
                          {t('dictionary.popupExamplesTitle')}
                        </Card.Title>
                        {result.examples && result.examples.length > 0 ? (
                          <ul className="m-0 list-none space-y-2 p-0">
                            {result.examples.slice(0, 2).map((example, index) => (
                              <li key={`${example}-${index}`} className="space-y-2">
                                {index > 0 && <Separator />}
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
                          <p className="m-0 text-sm">{t('dictionary.noPopupExamples')}</p>
                        )}
                      </Card.Content>
                    </Card>

                    <div className="sticky bottom-0 z-10 grid grid-cols-4 gap-1 bg-overlay py-1.5">
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

              <Tabs.Panel id="grammar" className="max-h-96 overflow-y-auto pr-1">
                <SelectionGrammarPanel
                  queryText={queryText}
                  patterns={grammarPatterns}
                  context={context}
                />
              </Tabs.Panel>

              <Tabs.Panel id="kanji" className="max-h-96 overflow-y-auto pr-1">
                <SelectionKanjiPanel text={queryText} breakdown={status === 'success' ? result?.hanVietPerKanji : undefined} />
              </Tabs.Panel>
            </Tabs>
          </div>
        </HeroPopover.Dialog>
      </HeroPopover.Content>
    </HeroPopover>
  );
}
