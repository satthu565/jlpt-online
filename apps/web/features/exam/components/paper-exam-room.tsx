'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AttemptMode, PublicExamSnapshot } from '@jlpt/schema';
import { BookOpen, Flag, Keyboard, Settings2 } from 'lucide-react';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Switch } from '@jlpt/ui/components/switch';
import { Modal } from '@jlpt/ui/components/modal';
import { FuriganaToggle, useFurigana } from '@jlpt/ui/components/furigana-toggle';
import { useI18n } from '../../../lib/i18n';
import { usePaperWorkspace } from '../hooks/use-paper-workspace';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';
import { flattenExamQuestions } from '../utils/flatten-questions';
import { answeredIn, groupBookletQuestions, isListeningSection, mediaUrl, nextReviewQuestion, richTextContent } from '../utils/booklet';
import { ExamSyncEngine } from '../sync/sync-engine';
import type { ExamStorageAdapter } from '../storage/indexeddb';
import type { ExamApiClient } from '../api/exam-api';
import type { FlatQuestionItem, SyncState } from '../types';
import { PaperBooklet } from './paper-booklet';
import { PaperAnswerSheet } from './paper-answer-sheet';
import { PaperReviewModal } from './paper-review-modal';
import { PaperPassage } from './paper-content';
import { ExamClock } from './exam-clock';
import { ExamProgressBar } from './exam-progress-bar';
import { SyncStatusIndicator } from './sync-status-indicator';
import { AudioPlayer } from './audio-player';
import { LeaseConflictModal } from './modals/lease-conflict-modal';
import { SpeakerTestModal } from './modals/speaker-test-modal';
import { ShortcutsHelpModal } from './modals/shortcuts-help-modal';
import { evaluatePacing } from '../pacing';
import { SelectionLookupPopover, useSelectLookup, useSelectLookupSetting } from '../../corpus';
import './paper-exam.css';

export interface ExamRoomProps {
  snapshot: PublicExamSnapshot;
  attemptId: string;
  lease: string;
  mode: AttemptMode;
  serverNow: string;
  initialSectionIndex?: number;
  initialAnswers?: number[];
  initialFlags?: number[];
  initialSeq?: number;
  initialLastAckedSeq?: number;
  initialDeadlines?: Record<number, string>;
  sectionStartedAt?: string;
  serverOffsetMs?: number;
  initialZenMode?: boolean;
  initialConflictModalOpen?: boolean;
  storage: ExamStorageAdapter;
  apiClient: ExamApiClient;
  onFinish?: (result?: unknown) => void;
  onExit?: () => void;
  className?: string;
}

export function ExamRoom({ snapshot, attemptId, lease, mode, serverNow: initialServerNow,
  initialSectionIndex = 0, initialAnswers, initialFlags, initialSeq = 0, initialLastAckedSeq = 0,
  initialDeadlines = {}, sectionStartedAt, serverOffsetMs, initialZenMode = false,
  initialConflictModalOpen = false, storage, apiClient, onFinish, onExit, className = '' }: ExamRoomProps): React.JSX.Element {
  const { t } = useI18n();
  const [answers, setAnswers] = useState(() => initialAnswers ? [...initialAnswers] : Array<number>(snapshot.totalQuestions).fill(0));
  const [flags, setFlags] = useState(() => initialFlags ? [...initialFlags] : Array<number>(snapshot.totalQuestions).fill(0));
  const answersRef = useRef(answers);
  const flagsRef = useRef(flags);
  const [sectionIndex, setSectionIndex] = useState(initialSectionIndex);
  const [serverSectionIndex, setServerSectionIndex] = useState(initialSectionIndex);
  const [deadlines, setDeadlines] = useState(initialDeadlines);
  const [clock, setClock] = useState(() => {
    const offset = serverOffsetMs ?? Date.parse(initialServerNow) - Date.now();
    return { serverNow: new Date(Date.now() + offset).toISOString(), offset };
  });
  const [startedAt, setStartedAt] = useState(() => sectionStartedAt ?? (initialDeadlines[initialSectionIndex] ? new Date(Date.parse(initialDeadlines[initialSectionIndex]!) - snapshot.sections[initialSectionIndex]!.durationSec * 1000).toISOString() : initialServerNow));
  const [activeIndex, setActiveIndex] = useState(snapshot.sections[initialSectionIndex]?.questionRange[0] ?? 0);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [syncState, setSyncState] = useState<SyncState>('saved');
  const [conflict, setConflict] = useState(initialConflictModalOpen);
  const [review, setReview] = useState<'section' | 'final' | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [passage, setPassage] = useState<FlatQuestionItem | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [speakerOpen, setSpeakerOpen] = useState(false);
  const [compact, setCompact] = useState(initialZenMode);
  const [pacingOpen, setPacingOpen] = useState(false);
  const [pacingNow, setPacingNow] = useState(Date.now);
  const [autoFollow, setAutoFollow] = useState(false);
  const engine = useRef<ExamSyncEngine | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const finishPayload = useRef<Parameters<ExamApiClient['submitAttempt']>[1] | null>(null);
  const mounted = useRef(true);
  const times = useRef(Array<number>(snapshot.totalQuestions).fill(0));
  const activeTime = useRef({ index: activeIndex, at: Date.now() });
  const workspace = usePaperWorkspace(attemptId, snapshot.examId, snapshot.version);
  const restored = useRef(false);
  const syncContext = useRef({ mode, currentSection: sectionIndex, sectionDeadlines: deadlines });
  syncContext.current = { mode, currentSection: sectionIndex, sectionDeadlines: deadlines };
  const [showFurigana] = useFurigana();
  const [lookupEnabled, setLookupEnabled] = useSelectLookupSetting();
  const lookup = useSelectLookup({ enabled: mode === 'practice' && lookupEnabled, questionIndex: activeIndex });
  const flat = useMemo(() => flattenExamQuestions(snapshot, mode === 'real' ? Array.from({ length: sectionIndex }, (_, index) => index) : []), [snapshot, sectionIndex, mode]);
  const questions = useMemo(() => flat.filter((question) => question.sectionIndex === sectionIndex), [flat, sectionIndex]);
  const groups = useMemo(() => groupBookletQuestions(questions), [questions]);
  const section = snapshot.sections[sectionIndex];
  const deadline = mode === 'real' ? deadlines[sectionIndex] ?? null : null;
  const isLastSection = sectionIndex === snapshot.sections.length - 1;
  const readOnly = busy || expired || conflict || (mode === 'real' && !deadline);
  const active = flat[activeIndex];
  const answered = answeredIn(questions, answers);
  const restoreScroll = useCallback((questionId: string, offset = 0, focus = false) => {
    requestAnimationFrame(() => {
      const target = document.getElementById(`paper-question-${questionId}`);
      if (!target) return;
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 90;
      window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - headerHeight - 16 - offset, behavior: 'instant' });
      if (focus) target.querySelector<HTMLElement>('button:not([disabled])')?.focus({ preventScroll: true });
    });
  }, []);
  const activate = useCallback((index: number) => {
    const question = flat[index];
    if (!question || question.sectionIndex !== sectionIndex) return;
    setActiveIndex(index);
    workspace.update({ currentQuestionId: question.questionId });
  }, [flat, sectionIndex, workspace.update]);
  const jump = useCallback((index: number) => {
    const question = flat[index];
    if (!question || question.sectionIndex !== sectionIndex) return;
    activate(index);
    setSheetOpen(false);
    setPassage(null);
    setReview(null);
    setTimeout(() => restoreScroll(question.questionId, 0, true), 0);
  }, [flat, sectionIndex, activate, restoreScroll]);

  useEffect(() => {
    mounted.current = true;
    const current = new ExamSyncEngine({ attemptId, examId: snapshot.examId, lease,
      initialAnswers: answersRef.current, initialFlags: flagsRef.current, initialSeq, initialLastAckedSeq,
      storage, apiClient, getContext: () => syncContext.current, onSyncStateChange: (state) => { if (mounted.current) setSyncState(state); },
      onLeaseConflict: () => { if (mounted.current) setConflict(true); },
    });
    engine.current = current;
    const online = () => { void current.retry(); };
    window.addEventListener('online', online);
    if (initialSeq > initialLastAckedSeq) void current.flush();
    return () => { mounted.current = false; current.stop(); window.removeEventListener('online', online); };
  }, [attemptId, snapshot.examId, lease, initialSeq, initialLastAckedSeq, storage, apiClient]);

  useEffect(() => {
    if (!pacingOpen) return;
    const timer = setInterval(() => setPacingNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pacingOpen]);

  useEffect(() => {
    const now = Date.now();
    times.current[activeTime.current.index] = (times.current[activeTime.current.index] ?? 0) + now - activeTime.current.at;
    activeTime.current = { index: activeIndex, at: now };
  }, [activeIndex]);

  useEffect(() => {
    const header = headerRef.current;
    const root = rootRef.current;
    if (!header || !root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => root.style.setProperty('--paper-header-height', `${header.getBoundingClientRect().height}px`));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!workspace.ready || restored.current) return;
    restored.current = true;
    const found = questions.find((question) => question.questionId === workspace.workspace.currentQuestionId);
    if (found) setActiveIndex(found.globalIndex);
    const reading = questions.find((question) => question.questionId === workspace.workspace.readingQuestionId) ?? found;
    if (reading) restoreScroll(reading.questionId, workspace.workspace.readingOffset ?? 0);
  }, [workspace.ready, workspace.workspace, questions, restoreScroll]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const savePosition = () => {
      const nodes = rootRef.current?.querySelectorAll<HTMLElement>('[data-question-index]');
      if (!nodes) return;
      const top = (headerRef.current?.getBoundingClientRect().height ?? 90) + 16;
      const target = Array.from(nodes).find((node) => node.getBoundingClientRect().bottom > top);
      if (!target) return;
      const question = flat[Number(target.dataset.questionIndex)];
      if (question) workspace.update({ readingQuestionId: question.questionId, readingOffset: target.getBoundingClientRect().top - top });
    };
    const scroll = () => { clearTimeout(timer); timer = setTimeout(savePosition, 150); };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('pagehide', savePosition);
    return () => { clearTimeout(timer); window.removeEventListener('scroll', scroll); window.removeEventListener('pagehide', savePosition); };
  }, [flat, workspace.update]);

  const changeAnswer = (index: number, value: number) => {
    const question = flat[index];
    if (readOnly || (deadline && Date.now() + clock.offset >= Date.parse(deadline)) || !question || question.isLocked || question.sectionIndex !== sectionIndex || value < 0 || value > question.options.length) return;
    activate(index);
    if (answersRef.current[index] === value) return;
    const next = [...answersRef.current]; next[index] = value;
    answersRef.current = next; setAnswers(next);
    void engine.current?.recordAnswerChange(index, value).catch(() => { setSyncState('local_error'); setError(t('paperExam.localSaveError')); });
  };
  const toggleFlag = (index: number) => {
    const question = flat[index];
    if (readOnly || (deadline && Date.now() + clock.offset >= Date.parse(deadline)) || !question || question.isLocked || question.sectionIndex !== sectionIndex) return;
    activate(index);
    const next = [...flagsRef.current]; next[index] = next[index] ? 0 : 1;
    flagsRef.current = next; setFlags(next);
    void engine.current?.recordFlagChange(index, Boolean(next[index])).catch(() => { setSyncState('local_error'); setError(t('paperExam.localSaveError')); });
  };
  const reviewNext = (filter: 'blank' | 'flagged', direction = 1) => {
    const found = nextReviewQuestion(questions, activeIndex, answersRef.current, flagsRef.current, filter, direction);
    if (found) { setNotice(''); jump(found.globalIndex); }
    else setNotice(t(filter === 'blank' ? 'paperExam.noBlank' : 'paperExam.noFlags'));
  };
  const prepareReview = () => { setError(null); setReview(isLastSection ? 'final' : 'section'); };
  const transition = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const details = await apiClient.getAttempt(attemptId);
      if (details.status === 'submitted') { engine.current?.stop(); onFinish?.({ result: details.result }); return; }
      // A lost response must not make Retry start yet another section.
      let response;
      if (details.currentSection !== null && details.currentSection > sectionIndex && details.deadline) {
        const index = mode === 'practice' ? Math.min(details.currentSection, sectionIndex + 1) : details.currentSection;
        response = { sectionIndex: index, deadline: details.deadline, serverNow: details.serverNow, startedAt: new Date(Date.parse(details.deadline) - (snapshot.sections[index]?.durationSec ?? 0) * 1000).toISOString() };
      } else {
        await engine.current?.drain();
        response = await apiClient.nextSection(attemptId, { lease });
      }
      setSectionIndex(response.sectionIndex);
      setServerSectionIndex(Math.max(details.currentSection ?? 0, response.sectionIndex));
      setDeadlines((previous) => ({ ...previous, [response.sectionIndex]: response.deadline }));
      setStartedAt(response.startedAt);
      setClock({ serverNow: response.serverNow, offset: Date.parse(response.serverNow) - Date.now() });
      setExpired(false); setReview(null); setSpeakerOpen(false);
      const next = snapshot.sections[response.sectionIndex];
      setActiveIndex(next?.questionRange[0] ?? 0);
      requestAnimationFrame(() => rootRef.current?.scrollIntoView());
    } catch (cause) { setError(cause instanceof Error && !cause.message.startsWith('SYNC_') ? cause.message : t('paperExam.transitionError')); setReview('section'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const submit = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      // The submit endpoint accepts the complete final sheet, even when a separate
      // sheet sync was lost. It remains the server's decision which changes are valid.
      try { await engine.current?.drain(); } catch { if (engine.current?.getSyncState() === 'conflict') throw new Error(t('paperExam.submitError')); }
      if (!finishPayload.current) {
        const timeSpentMs = [...times.current];
        timeSpentMs[activeTime.current.index] = (timeSpentMs[activeTime.current.index] ?? 0) + Date.now() - activeTime.current.at;
        finishPayload.current = { lease, seq: (engine.current?.getCurrentSeq() ?? initialSeq) + 1, answers: [...answersRef.current], flags: [...flagsRef.current], timeSpentMs };
      }
      const result = await apiClient.submitAttempt(attemptId, finishPayload.current);
      engine.current?.stop();
      await storage.clearAttempt(attemptId).catch(() => {});
      workspace.clear(); setReview(null); onFinish?.(result);
    } catch (cause) { setError(cause instanceof Error && !cause.message.startsWith('SYNC_') ? cause.message : t('paperExam.submitError')); setReview('final'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const finish = () => {
    if (isLastSection) { void submit(); return; }
    const next = snapshot.sections[sectionIndex + 1];
    if (mode === 'real' && isListeningSection(next) && !next?.listeningTimeline?.length) { setError(t('paperExam.missingAudio')); return; }
    if (next?.listeningTimeline?.length) setSpeakerOpen(true);
    else void transition();
  };
  const expire = () => {
    if (mode !== 'real') return;
    setExpired(true);
    setReview(isLastSection ? 'final' : 'section');
    if (isLastSection) void submit();
    else finish();
  };
  const sheetProps = { questions, answers, flags, currentIndex: activeIndex, disabled: readOnly, onJump: jump, onAnswer: changeAnswer, onFlag: toggleFlag, onReview: reviewNext };
  const overlay = Boolean(review || sheetOpen || passage || helpOpen || speakerOpen || conflict);
  useKeyboardShortcuts({ onSelectOption: (value) => changeAnswer(activeIndex, value), onToggleFlag: () => toggleFlag(activeIndex), onPrev: () => { if (activeIndex > (questions[0]?.globalIndex ?? 0)) jump(activeIndex - 1); }, onNext: () => { if (activeIndex < (questions[questions.length - 1]?.globalIndex ?? 0)) jump(activeIndex + 1); }, onToggleZen: () => setCompact((previous) => !previous), onOpenHelp: () => setHelpOpen(true), isEnabled: !overlay && !readOnly });
  const resizeFont = (patch: Parameters<typeof workspace.update>[0]) => {
    const reading = workspace.workspace.readingQuestionId ?? active?.questionId;
    const target = reading ? document.getElementById(`paper-question-${reading}`) : null;
    const offset = target ? target.getBoundingClientRect().top - (headerRef.current?.getBoundingClientRect().height ?? 90) - 16 : 0;
    workspace.update(patch);
    if (reading) restoreScroll(reading, offset);
  };
  const pacing = pacingOpen ? evaluatePacing({ level: snapshot.level, sectionCode: section?.code ?? '', currentQuestionIndex: activeIndex - (section?.questionRange[0] ?? 0) + 1, elapsedSec: Math.max(0, (pacingNow + clock.offset - Date.parse(startedAt)) / 1000), totalDurationSec: section?.durationSec }) : null;

  return <div ref={rootRef} className={`jlpt-exam-room paper-exam paper-font-${workspace.workspace.font} paper-size-${workspace.workspace.fontSize} ${compact ? 'jlpt-zen-mode' : ''} ${className}`} data-testid="exam-room" data-mode={mode}>
    <header ref={headerRef} className="paper-session-header"><div className="paper-session-title"><h1>{snapshot.title}</h1><span>{section?.title} · {t(mode === 'real' ? 'paperExam.realMode' : 'paperExam.practiceMode')}</span></div><div className="paper-session-controls"><ExamClock deadline={deadline} serverNow={clock.serverNow} onExpire={expire} /><Button size="sm" variant="primary" data-testid={isLastSection ? "submit-exam-btn" : "finish-section-btn"} disabled={busy} onClick={prepareReview}>{t(isLastSection ? 'paperExam.submit' : 'paperExam.submitSection')}</Button>{!isLastSection && <Button size="sm" variant="ghost" data-testid="submit-exam-btn" disabled={busy} onClick={() => { setError(null); setReview('final'); }}>{t('paperExam.submit')}</Button>}</div><div className="paper-header-progress"><ExamProgressBar answeredCount={answered} totalQuestions={questions.length} /></div><div className="paper-header-sync"><SyncStatusIndicator syncState={syncState} onRetry={() => { setError(null); void engine.current?.retry(); }} /></div></header>
    <nav className="paper-section-nav" aria-label={t('paperExam.sectionNavigation')}>{snapshot.sections.map((candidate, index) => <Button key={candidate.code} variant={index === sectionIndex ? 'primary' : 'ghost'} size="sm" disabled={busy || (mode === 'real' ? index !== sectionIndex : index > serverSectionIndex)} aria-current={index === sectionIndex ? 'step' : undefined} onClick={() => { if (index !== sectionIndex) { setSectionIndex(index); setActiveIndex(candidate.questionRange[0]); setExpired(false); } }}>{candidate.title}</Button>)}</nav><div className="paper-toolbar"><Button size="sm" variant="ghost" onClick={() => setSettings((previous) => !previous)} aria-expanded={settings}><Settings2 className="size-4" aria-hidden="true" />{t('paperExam.displaySettings')}</Button><Button size="sm" variant="ghost" onClick={() => setHelpOpen(true)}><Keyboard className="size-4" aria-hidden="true" />{t('paperExam.shortcuts')}</Button><Button size="sm" variant="ghost" onClick={() => setPacingOpen((previous) => !previous)} aria-expanded={pacingOpen}>{t('paperExam.pacing')}</Button><span className="paper-local-hint">{t('paperExam.localNotes')}</span></div>
    {settings && <div className="paper-settings"><div className="paper-font-controls" role="group" aria-label={t('paperExam.fontSize')}>{(['sm', 'base', 'lg', 'xl'] as const).map((size, index) => <Button key={size} size="sm" variant={workspace.workspace.fontSize === size ? 'primary' : 'ghost'} aria-pressed={workspace.workspace.fontSize === size} aria-label={t('paperExam.fontSizeStep', { number: index + 1 })} onClick={() => resizeFont({ fontSize: size })}>{['A−', 'A', 'A+', 'A++'][index]}</Button>)}</div><Button size="sm" variant="outline" onClick={() => resizeFont({ font: workspace.workspace.font === 'mincho' ? 'gothic' : 'mincho' })}>{t(workspace.workspace.font === 'mincho' ? 'paperExam.mincho' : 'paperExam.gothic')}</Button><Button size="sm" variant="ghost" onClick={() => setCompact((previous) => !previous)} aria-pressed={compact}>{t('paperExam.compact')}</Button>{mode === 'practice' && <><FuriganaToggle size="sm" /><label className="flex items-center gap-2 text-xs"><Switch data-testid="select-lookup-switch" checked={lookupEnabled} onCheckedChange={setLookupEnabled} aria-label={t('dictionary.selectLookupLabel')} />{t('dictionary.selectLookupLabel')}</label><Button size="sm" variant="ghost" aria-pressed={autoFollow} onClick={() => setAutoFollow((previous) => !previous)}>{t('paperExam.followAudio')}</Button></>}<label className="paper-width-control">{t('paperExam.bookletWidth')}<Input type="range" min={58} max={80} defaultValue={72} aria-label={t('paperExam.bookletWidth')} onChange={(event) => rootRef.current?.style.setProperty('--paper-booklet-share', `${event.target.value}%`)} /></label></div>}
    {pacing && <p data-testid={mode === 'practice' ? 'pacing-warning' : 'discreet-pacing-milestone'} className="paper-message">{pacing.message}</p>}
    {(notice || error || workspace.saveFailed) && <div className="paper-message" role={error || workspace.saveFailed ? 'alert' : 'status'}>{error ?? (workspace.saveFailed ? t('paperExam.notesSaveError') : notice)}</div>}
    {mode === 'real' && !deadline && <p className="paper-message" role="alert">{t('paperExam.missingDeadline')}</p>}
    {expired && <p className="paper-message" role="status">{t('paperExam.expired')} <Button size="sm" onClick={prepareReview}>{t('paperExam.review')}</Button></p>}
    {isListeningSection(section) && !section?.listeningTimeline?.length && <p className="paper-message" role="alert">{t('paperExam.missingAudio')}</p>}
    {section?.listeningTimeline?.length ? <div className="paper-audio"><AudioPlayer timeline={section.listeningTimeline} sectionStartedAt={startedAt} serverOffsetMs={clock.offset || serverOffsetMs} mode={mode} activeGroupId={active?.groupId} isLocked={expired || conflict || speakerOpen} onItemChange={mode === 'practice' && autoFollow ? (_index, groupId) => { const found = questions.find((question) => question.groupId === groupId); if (found) jump(found.globalIndex); } : undefined} /></div> : null}
    <div className="paper-layout"><div className="paper-main"><nav className="paper-group-nav" aria-label={t('paperExam.groupNavigation')}>{groups.map((group, index) => <Button key={group.id} size="sm" variant="ghost" onClick={() => jump(group.questions[0]!.globalIndex)}>{richTextContent(group.instructions).match(/問題\s*[0-9０-９一二三四五六七八九十]+/)?.[0] ?? t('paperExam.group', { number: index + 1 })}</Button>)}</nav><PaperBooklet questions={questions} title={section?.title ?? snapshot.title} answers={answers} flags={flags} currentIndex={activeIndex} workspace={workspace.workspace} showFurigana={mode === 'real' || showFurigana} lookupEnabled={mode === 'practice' && lookupEnabled} disabled={readOnly} onActivate={activate} onAnswer={changeAnswer} onFlag={toggleFlag} onNote={workspace.setNote} onMark={workspace.mark} onClearMarks={workspace.clearMarks} onOpenPassage={(question) => { setSheetOpen(false); setPassage(question); }} /><div className="paper-bottom-nav"><Button variant="outline" onClick={() => reviewNext('blank')}>{t('paperExam.nextBlank')}</Button><Button variant="primary" onClick={prepareReview} disabled={busy}>{t('paperExam.review')}</Button></div></div><div className="paper-sticky-sheet"><PaperAnswerSheet {...sheetProps} /></div></div>
    <div className="paper-mobile-bar"><span>{t('paperExam.answeredCount', { done: answered, total: questions.length })}</span><Button variant="outline" size="sm" onClick={() => reviewNext('flagged')} aria-label={t('paperExam.reviewFlags')}><Flag className="size-4" aria-hidden="true" />{questions.filter((question) => flags[question.globalIndex]).length}</Button><Button size="sm" variant="primary" onClick={() => { setPassage(null); setSheetOpen(true); }}><BookOpen className="size-4" aria-hidden="true" />{t('paperExam.sheet')}</Button></div>
    <Modal isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title={t('paperExam.sheet')} closeLabel={t('paperExam.close')} className="paper-bottom-sheet"><PaperAnswerSheet {...sheetProps} /></Modal>
    <Modal isOpen={Boolean(passage)} onClose={() => setPassage(null)} title={t('paperExam.readPassage')} closeLabel={t('paperExam.close')} className="paper-bottom-sheet paper-reading-sheet"><div data-mode={mode} className={`paper-exam paper-font-${workspace.workspace.font} paper-size-${workspace.workspace.fontSize}`}>{passage?.passage && <PaperPassage id={passage.groupId} blocks={passage.passage} marks={workspace.workspace.marks} onMark={workspace.mark} onClear={workspace.clearMarks} showFurigana={mode === 'real' || showFurigana} disabled={readOnly} />}</div></Modal>
    <PaperReviewModal currentSectionIndex={sectionIndex} open={Boolean(review)} onClose={() => { if (!busy) { setReview(null); if (!expired) finishPayload.current = null; } }} onConfirm={review === 'final' ? () => { void submit(); } : finish} onJump={jump} questions={review === 'final' ? flat : questions} answers={answers} flags={flags} busy={busy} expired={expired} final={review === 'final'} sectionTitle={review === 'final' ? snapshot.title : section?.title ?? ''} error={error} />
    <LeaseConflictModal isOpen={conflict} onGoHome={() => onExit?.()} />
    <SpeakerTestModal isOpen={speakerOpen} isLoading={busy} mediaSrc={snapshot.sections[sectionIndex + 1]?.listeningTimeline?.[0]?.mediaKey ? mediaUrl(snapshot.sections[sectionIndex + 1]!.listeningTimeline![0]!.mediaKey) : undefined} onClose={() => setSpeakerOpen(false)} onConfirm={() => { void transition(); }} />
    <ShortcutsHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    {mode === 'practice' && <SelectionLookupPopover state={lookup} openInNewTab />}
  </div>;
}
