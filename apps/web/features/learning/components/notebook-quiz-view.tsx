'use client';

import { ArrowLeft, ArrowRight, Check, CircleHelp, RotateCcw, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Chip, Modal, ProgressBar } from '@jlpt/ui/components/exam-controls';
import { HeroSelect } from '@jlpt/ui/components/hero-select';
import { Alert } from '@jlpt/ui/components/alert';
import { Spinner } from '@jlpt/ui/components/spinner';
import { useI18n } from '../../../lib/i18n';
import { defaultLearningClient, type LearningClient } from '../services/learning-client';
import {
  advancePractice, answerPractice, buildPracticePool,
  newPracticeSession, practiceScore, retryPractice, visiblePracticeTags,
  type PracticeQuestion, type PracticeSettings,
} from '../services/notebook-practice';
import {
  emptyPracticeState, practiceStorageKey, restorePracticeState, type PracticeState,
} from '../services/notebook-practice-storage';
import type { NotebookItem } from '../types';

export interface NotebookQuizViewProps {
  userId: string;
  onExit?: () => void;
  client?: LearningClient;
}

export function NotebookQuizView({
  userId, onExit, client = defaultLearningClient,
}: NotebookQuizViewProps): React.JSX.Element {
  const { t } = useI18n();
  const label = (key: string, params?: Record<string, string | number>) => t('notebook.practice.' + key, params);
  const [state, setState] = useState<PracticeState>(emptyPracticeState);
  const stateRef = useRef(state);
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<NotebookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [view, setView] = useState<'setup' | 'session'>('setup');
  const [replaceSettings, setReplaceSettings] = useState<PracticeSettings | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let restored = emptyPracticeState();
    try {
      const result = restorePracticeState(localStorage.getItem(practiceStorageKey(userId)));
      restored = result.state;
      setRecovered(result.recovered);
    } catch { setStorageError(true); }
    stateRef.current = restored;
    setState(restored);
    readyRef.current = true;
    setReady(true);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    client.getAllNotebookItems().then(data => {
      if (!cancelled) setItems(data);
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [client, userId, loadAttempt]);

  const persist = (next: PracticeState) => {
    stateRef.current = next;
    setState(next);
    if (!readyRef.current) return;
    try {
      localStorage.setItem(practiceStorageKey(userId), JSON.stringify(next));
      setStorageError(false);
    } catch { setStorageError(true); }
  };
  const pool = useMemo(() => buildPracticePool(items, state.settings), [items, state.settings]);
  const tags = useMemo(() => [...new Set(items.flatMap(visiblePracticeTags))].sort(), [items]);
  const session = state.session;
  const current = session?.questions[session.cursor];
  const answered = !!session && session.answers.length > session.cursor;
  const finished = !!session && session.cursor >= session.questions.length;
  const progress = session ? session.answers.length : 0;
  const selection = answered ? session?.answers[session.cursor] : session?.selection;
  const correct = answered && selection === current?.correctOptionIndex;

  useEffect(() => {
    if (view !== 'session') return;
    const target = answered ? feedbackRef.current : questionRef.current;
    target?.focus({ preventScroll: true });
    if (target) {
      const bounds = target.getBoundingClientRect();
      if (bounds.top < 80 || bounds.bottom > window.innerHeight) target.scrollIntoView({ block: 'nearest' });
    }
  }, [view, session?.id, session?.cursor, answered]);

  const changeSetting = (key: keyof PracticeSettings, value: string) => {
    const settings = { ...stateRef.current.settings, [key]: key === 'count' ? Number(value) : value } as PracticeSettings;
    // Grammar readings are not a coherent question format.
    if (key === 'kind' && value === 'grammar') settings.mode = 'meaning';
    persist({ ...stateRef.current, settings });
  };
  const begin = (settings: PracticeSettings) => {
    const questions = buildPracticePool(items, settings).slice(0, settings.count);
    if (!questions.length) return;
    persist({ ...stateRef.current, settings, session: newPracticeSession(questions) });
    setReplaceSettings(null);
    setShowAll(false);
    setView('session');
  };
  const requestStart = (quick: boolean) => {
    const settings = { ...stateRef.current.settings, count: quick ? 10 : stateRef.current.settings.count } as PracticeSettings;
    const active = stateRef.current.session;
    if (active && active.cursor < active.questions.length) setReplaceSettings(settings);
    else begin(settings);
  };
  const select = (index: number) => {
    const active = stateRef.current.session;
    if (!active || active.answers.length > active.cursor) return;
    persist({ ...stateRef.current, session: { ...active, selection: index } });
  };
  const check = (skip: boolean) => {
    const active = stateRef.current.session;
    if (!active || (!skip && active.selection === null)) return;
    persist({ ...stateRef.current, session: answerPractice(active, skip ? -1 : active.selection!) });
  };
  const next = () => {
    const active = stateRef.current.session;
    if (!active) return;
    persist({ ...stateRef.current, session: advancePractice(active) });
  };
  const retry = () => {
    const active = stateRef.current.session;
    const round = active ? retryPractice(active) : null;
    if (round) {
      persist({ ...stateRef.current, session: round });
      setShowAll(false);
      setView('session');
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (view !== 'session' || finished || replaceSettings || !current || !session
      || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const target = event.target as HTMLElement;
    // Native buttons keep Enter/Space behavior; never submit twice or hijack navigation.
    if (target.closest('input, textarea, [role="combobox"], [role="dialog"], a, [contenteditable="true"]')) return;
    if (/^[1-4]$/.test(event.key) && !answered) {
      const index = Number(event.key) - 1;
      if (index < current.options.length) { event.preventDefault(); select(index); }
    } else if (event.key === 'Enter' && (!target.closest('button') || target.closest('[data-testid^="quiz-option-"]'))) {
      event.preventDefault();
      if (answered) next(); else check(false);
    }
  };
  const results = session?.questions.map((question, index) => ({
    question, selected: session.answers[index] ?? -1, correct: session.answers[index] === question.correctOptionIndex,
  })) ?? [];
  const wrong = results.filter(result => !result.correct);
  const first = session?.initial;
  const filterCount = [state.settings.level, state.settings.tag, state.settings.mastery].filter(value => value !== 'all').length;
  const titleFor = (question: PracticeQuestion) => label(question.mode === 'reading' ? 'readingPrompt' : 'meaningPrompt');
  const explanation = (question: PracticeQuestion, chosen: number) => <>
    <p className="font-semibold break-words" lang="ja">{question.term}{question.reading ? ' · ' + question.reading : ''}</p>
    <p className="mt-1 break-words">{question.meaning}</p>
    {chosen >= 0 && chosen !== question.correctOptionIndex && <p className="mt-3 text-sm break-words">
      {label('confusion', { answer: question.options[chosen]!, term: question.optionTerms[chosen]! })}
    </p>}
    {question.example && <blockquote className="mt-3 border-s-2 border-[var(--border)] ps-3 text-sm whitespace-pre-wrap break-words">{question.example}</blockquote>}
    {question.notes && <p className="mt-3 text-sm whitespace-pre-wrap break-words">{label('yourNote')}: {question.notes}</p>}
  </>;

  return <section className="mx-auto flex w-full max-w-3xl flex-col gap-5" aria-label={label('title')}
    data-testid="notebook-quiz-view" onKeyDownCapture={onKeyDown}>
    {storageError && <Alert variant="warning">{label('storageWarning')}</Alert>}
    {recovered && <Alert variant="warning">{label('recovered')}</Alert>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">{label('title')}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{label('subtitle')}</p></div>
      <Button variant="ghost" size="sm" onPress={() => {
        if (view === 'session') setView('setup'); else onExit?.();
      }}><ArrowLeft size={16} aria-hidden="true" />{label(view === 'session' ? 'chooseLesson' : 'backNotebook')}</Button>
    </div>

    {!ready ? <div role="status"><Spinner />{t('common.status.loading')}</div>
      : view === 'setup' ? <>
        {session && <Card><Card.Content className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-semibold">{label(finished ? 'lastRound' : 'unfinished')}</h3>
            <p className="mt-1 text-sm">{label('savedProgress', { done: session.answers.length, total: session.questions.length })}</p></div>
          <Button variant="primary" data-testid="quiz-resume" onPress={() => setView('session')}>
            {label(finished ? 'viewResults' : 'resume')}
          </Button>
        </Card.Content></Card>}
        {loadError && <Alert variant="error"><div className="flex flex-wrap items-center justify-between gap-3">
          <span>{label('loadError')}</span><Button variant="secondary" onPress={() => setLoadAttempt(value => value + 1)}>{t('common.buttons.retry')}</Button>
        </div></Alert>}
        <Card><Card.Content className="flex flex-col gap-5">
          <Button variant="primary" disabled={loading || loadError || !pool.length} onPress={() => requestStart(true)} data-testid="quiz-quick-start">
            {label('quickStart')}<ArrowRight size={16} aria-hidden="true" />
          </Button>
          <div><h3 className="text-lg font-semibold">{label('setupTitle')}</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{label('setupHint')}</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <HeroSelect label={label('kind')} value={state.settings.kind} onChange={value => changeSetting('kind', value)}
              options={['all', 'vocab', 'grammar', 'kanji'].map(value => ({
                value, label: value === 'all' ? label('allKinds') : t('notebook.kinds.' + value),
              }))} />
            <HeroSelect label={label('mode')} value={state.settings.mode} onChange={value => changeSetting('mode', value)}
              options={[{ value: 'meaning', label: label('meaningMode') },
                { value: 'reading', label: label('readingMode'), disabled: state.settings.kind === 'grammar' }]} />
            <HeroSelect label={label('count')} value={String(state.settings.count)} onChange={value => changeSetting('count', value)}
              options={[5, 10, 20].map(value => ({ value: String(value), label: label('questionCount', { count: value }) }))} />
          </div>
          <Button variant="ghost" onPress={() => setShowFilters(value => !value)} aria-expanded={showFilters} aria-controls="quiz-extra-filters" data-testid="quiz-extra-filters-toggle">
            {label('extraFilters', { count: filterCount })}
          </Button>
          {showFilters && <div id="quiz-extra-filters" className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
            <HeroSelect label={label('level')} value={state.settings.level} onChange={value => changeSetting('level', value)}
              options={['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map(value => ({ value, label: value === 'all' ? label('allLevels') : value }))} />
            <HeroSelect label={label('mastery')} value={state.settings.mastery} onChange={value => changeSetting('mastery', value)}
              options={['all', 'unmastered', 'mastered'].map(value => ({ value, label: label(value + 'Mastery') }))} />
            <HeroSelect label={label('tag')} value={state.settings.tag} onChange={value => changeSetting('tag', value)}
              options={[{ value: 'all', label: label('allTags') }, ...tags.map(value => ({ value, label: value }))]} />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{label('levelHint')}</p>
          </div>}
          {loading ? <div role="status" className="flex items-center gap-3"><Spinner size="sm" />{label('loading')}</div>
            : !loadError && <>
              <p role="status" data-testid="quiz-available">{label('available', { count: pool.length })}</p>
              {pool.length === 0 ? <Alert variant="info">{label(items.length ? 'noMatches' : 'empty')}</Alert>
                : pool.length < state.settings.count && <Alert variant="info">
                  {label('shortage', { available: pool.length, requested: state.settings.count })}
                </Alert>}
            </>}
          <p className="text-sm text-[var(--text-secondary)]">{label('qualityHint')}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" disabled={loading || loadError || !pool.length} onPress={() => requestStart(false)} data-testid="quiz-start">
              {label('start')}<ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </Card.Content></Card>
      </> : session && current ? <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{label('progress', { current: session.cursor + 1, total: session.questions.length })}</span>
          <div className="flex gap-2"><Chip size="sm" variant="tertiary">{t('notebook.kinds.' + current.kind)}</Chip>
            {session.round === 'retry' && <Chip size="sm" variant="tertiary">{label('retryRound')}</Chip>}</div>
        </div>
        <ProgressBar value={progress} maxValue={session.questions.length} aria-label={label('answeredProgress', { done: progress, total: session.questions.length })}>
          <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
        </ProgressBar>
        <Card><Card.Content className="flex flex-col gap-5">
          <div key={session.id + ':' + session.cursor} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
            <p className="text-center text-sm text-[var(--text-secondary)]">{titleFor(current)}</p>
            <h3 ref={questionRef} tabIndex={-1} lang="ja" className="mt-4 break-words text-center text-4xl font-semibold leading-relaxed outline-none sm:text-5xl" data-testid="quiz-term">{current.term}</h3>
          </div>
          <div className="grid gap-3" role="group" aria-label={label('answers')}>
            {current.options.map((option, index) => <Button key={index}
              variant={!answered && selection === index ? 'primary' : 'secondary'}
              onPress={() => select(index)} aria-pressed={selection === index}
              aria-disabled={answered} data-testid={'quiz-option-' + index}
              className="h-auto min-h-14 w-full justify-start whitespace-normal px-4 py-3 text-left">
              <span className="shrink-0 font-semibold">{String.fromCharCode(65 + index)}.</span>
              <span className="min-w-0 flex-1 break-words">{option}</span>
              {answered && index === current.correctOptionIndex && <Check aria-label={label('rightAnswer')} size={20} className="shrink-0" />}
              {answered && index === selection && !correct && <X aria-label={label('yourWrongAnswer')} size={20} className="shrink-0" />}
            </Button>)}
          </div>
          {answered && <div ref={feedbackRef} tabIndex={-1} className="outline-none" data-testid="quiz-feedback" aria-live="polite">
            <Alert variant={correct ? 'success' : 'info'}>
              <h4 className="mb-3 font-semibold">{label(correct ? 'correct' : selection === -1 ? 'learnTogether' : 'incorrect')}</h4>
              <p className="mb-3">{label('rightAnswer')}: {current.options[current.correctOptionIndex]}</p>
              {explanation(current, selection ?? -1)}
            </Alert>
          </div>}
          <div className="flex flex-wrap justify-between gap-3">
            {!answered ? <>
              <Button variant="ghost" onPress={() => check(true)} data-testid="quiz-dont-know"><CircleHelp size={16} aria-hidden="true" />{label('dontKnow')}</Button>
              <Button variant="primary" disabled={selection === null} onPress={() => check(false)} data-testid="quiz-check">{label('check')}</Button>
            </> : <Button variant="primary" onPress={next} data-testid="quiz-next-button">
              {label(session.cursor + 1 < session.questions.length ? 'next' : 'viewResults')}<ArrowRight size={16} aria-hidden="true" />
            </Button>}
          </div>
        </Card.Content></Card>
        <p className="text-sm text-[var(--text-secondary)]">{label('keyboard')}</p>
      </> : session && finished ? <>
        <Card data-testid="quiz-results-card"><Card.Content className="flex flex-col gap-5">
          <h3 className="text-xl font-semibold">{label(session.round === 'retry' ? 'retryCompleted' : 'completed')}</h3>
          <p className="text-3xl font-semibold" data-testid="quiz-score">{label('score', {
            score: practiceScore(session.questions, session.answers), total: session.questions.length,
          })}</p>
          {first && <p data-testid="quiz-initial-score">{label('initialScore', {
            score: practiceScore(first.questions, first.answers), total: first.questions.length,
          })}</p>}
          <p className="text-sm text-[var(--text-secondary)]">{label('scoreHint')}</p>
          <div className="flex flex-wrap gap-3">
            {wrong.length > 0 && <Button variant="primary" onPress={retry} data-testid="quiz-retry-wrong">
              <RotateCcw size={16} aria-hidden="true" />{label('retryWrong', { count: wrong.length })}
            </Button>}
            <Button variant={wrong.length ? 'secondary' : 'primary'} onPress={() => setView('setup')} data-testid="quiz-new-lesson">{label('chooseLesson')}</Button>
          </div>
          {!wrong.length && <Alert variant="success">{label('allCorrect')}</Alert>}
          <Button variant="ghost" onPress={() => setShowAll(value => !value)} aria-expanded={showAll} aria-controls="quiz-result-details">
            {label(showAll ? 'showWrong' : 'showAll')}
          </Button>
        </Card.Content></Card>
        <div id="quiz-result-details" className="flex flex-col gap-4">
          {(showAll ? results : wrong).map(result => <Card key={result.question.id}><Card.Content className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xl font-semibold" lang="ja">{result.question.term}</h4>
              <Chip size="sm" variant="tertiary">{label(result.correct ? 'correct' : result.selected < 0 ? 'notRemembered' : 'needsPractice')}</Chip>
            </div>
            <p>{label('yourAnswer')}: {result.selected < 0 ? label('dontKnow') : result.question.options[result.selected]}</p>
            <p>{label('rightAnswer')}: {result.question.options[result.question.correctOptionIndex]}</p>
            {explanation(result.question, result.selected)}
          </Card.Content></Card>)}
        </div>
      </> : null}

    {ready && <p className="text-xs text-[var(--text-secondary)]" role="status">{label(storageError ? 'memoryOnly' : 'savedHint')}</p>}
    <Modal isOpen={replaceSettings !== null} title={label('replaceTitle')} closeLabel={t('common.buttons.cancel')}
      onClose={() => setReplaceSettings(null)} footer={<>
        <Button variant="secondary" onPress={() => setReplaceSettings(null)}>{t('common.buttons.cancel')}</Button>
        <Button variant="primary" onPress={() => { if (replaceSettings) begin(replaceSettings); }} data-testid="quiz-confirm-replace">{label('replaceConfirm')}</Button>
      </>}>
      <p>{label('replaceBody')}</p>
    </Modal>
  </section>;
}
