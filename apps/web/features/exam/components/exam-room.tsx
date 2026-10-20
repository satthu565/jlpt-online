'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { PublicExamSnapshot, AttemptMode } from '@jlpt/schema';
import { flattenExamQuestions } from '../utils/flatten-questions';
import { ExamSyncEngine } from '../sync/sync-engine';
import type { ExamStorageAdapter } from '../storage/indexeddb';
import type { ExamApiClient } from '../api/exam-api';
import type { SyncState, FlatQuestionItem } from '../types';

import { ExamClock } from './exam-clock';
import { SectionHeader } from './section-header';
import { QuestionView } from './question-view';
import { QuestionNavigation } from './question-navigation';
import { QuestionPalette } from './question-palette';
import { ExamProgressBar } from './exam-progress-bar';
import { SyncStatusIndicator } from './sync-status-indicator';
import { AudioPlayer } from './audio-player';
import { ExamToolbar, type JapaneseFontSize } from './exam-toolbar';

import { EarlySubmitModal } from './modals/early-submit-modal';
import { SectionTransitionModal } from './modals/section-transition-modal';
import { LeaseConflictModal } from './modals/lease-conflict-modal';
import { SpeakerTestModal } from './modals/speaker-test-modal';
import { ShortcutsHelpModal } from './modals/shortcuts-help-modal';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';
import { Button, useFurigana } from '@jlpt/ui';
import { evaluatePacing } from '../pacing';

export interface ExamRoomProps {
  snapshot: PublicExamSnapshot;
  attemptId: string;
  lease: string;
  mode: AttemptMode;
  serverNow: string;
  initialSectionIndex?: number;
  initialAnswers?: number[];
  initialFlags?: number[];
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

export function ExamRoom({
  snapshot,
  attemptId,
  lease,
  mode,
  serverNow: initialServerNow,
  initialSectionIndex = 0,
  initialAnswers,
  initialFlags,
  initialDeadlines,
  sectionStartedAt: initialSectionStartedAt,
  serverOffsetMs = 0,
  initialZenMode = false,
  initialConflictModalOpen = false,
  storage,
  apiClient,
  onFinish,
  onExit,
  className = '',
}: ExamRoomProps): React.JSX.Element {
  const totalQuestions = snapshot.totalQuestions;

  // Answers & Flags state
  const [answers, setAnswers] = useState<number[]>(() => {
    return initialAnswers ? [...initialAnswers] : new Array(totalQuestions).fill(0);
  });
  const [flags, setFlags] = useState<number[]>(() => {
    return initialFlags ? [...initialFlags] : new Array(totalQuestions).fill(0);
  });

  // Current section and current question
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(initialSectionIndex);
  const [lockedSections, setLockedSections] = useState<number[]>(() => {
    const locked: number[] = [];
    for (let i = 0; i < initialSectionIndex; i++) {
      locked.push(i);
    }
    return locked;
  });

  // Deadlines and section started timestamps per section
  const [deadlines, setDeadlines] = useState<Record<number, string>>(() => {
    if (initialDeadlines) return { ...initialDeadlines };
    if (mode === 'real') {
      const secDuration = snapshot.sections[initialSectionIndex]?.durationSec ?? 3600;
      const initialDeadline = new Date(Date.now() + secDuration * 1000).toISOString();
      return { [initialSectionIndex]: initialDeadline };
    }
    return {};
  });

  const [sectionStartTimes, setSectionStartTimes] = useState<Record<number, string>>(() => {
    const initialTime = initialSectionStartedAt || new Date().toISOString();
    return { [initialSectionIndex]: initialTime };
  });

  const [serverNow, setServerNow] = useState<string>(initialServerNow);

  // Ergonomics states: Japanese font size (EXAM-23) & Zen mode (EXAM-25)
  const [fontSize, setFontSize] = useState<JapaneseFontSize>('base');
  const [isZenMode, setIsZenMode] = useState<boolean>(initialZenMode);

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(initialConflictModalOpen);
  const [isSpeakerTestOpen, setIsSpeakerTestOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>('saved');

  // Flattened questions
  const flatQuestions: FlatQuestionItem[] = useMemo(() => {
    return flattenExamQuestions(snapshot, lockedSections);
  }, [snapshot, lockedSections]);

  // Current question index in flat array
  const currentSection = snapshot.sections[currentSectionIndex];
  const firstQuestionOfSection = currentSection ? currentSection.questionRange[0] : 0;
  const lastQuestionOfSection = currentSection ? currentSection.questionRange[1] : totalQuestions - 1;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(firstQuestionOfSection);

  // Furigana toggle preference (P04)
  const [showFurigana] = useFurigana();

  // Time tracking per question in milliseconds (P04)
  const questionTimesRef = useRef<number[]>(new Array(totalQuestions).fill(0));
  const lastActiveTimeRef = useRef<number>(Date.now());
  const activeQIdxRef = useRef<number>(currentQuestionIndex);

  // Update time spent when active question changes
  useEffect(() => {
    const now = Date.now();
    const prevIdx = activeQIdxRef.current;
    if (prevIdx >= 0 && prevIdx < totalQuestions) {
      const elapsed = now - lastActiveTimeRef.current;
      questionTimesRef.current[prevIdx] = (questionTimesRef.current[prevIdx] || 0) + elapsed;
    }
    lastActiveTimeRef.current = now;
    activeQIdxRef.current = currentQuestionIndex;
  }, [currentQuestionIndex, totalQuestions]);

  // Periodic tick for real-time pacing evaluation
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const pacingEvaluation = useMemo(() => {
    try {
      const secStartStr = sectionStartTimes[currentSectionIndex] || initialServerNow;
      const secStartTime = new Date(secStartStr).getTime();
      const elapsedSec = Math.max(0, Math.floor((nowTick - secStartTime) / 1000));
      const qInSection = Math.max(1, currentQuestionIndex - firstQuestionOfSection + 1);
      const secCode = currentSection?.code || currentSection?.title || 'vocab';
      const secDuration = currentSection?.durationSec;

      return evaluatePacing({
        level: snapshot.level,
        sectionCode: secCode,
        currentQuestionIndex: qInSection,
        elapsedSec,
        totalDurationSec: secDuration,
      });
    } catch {
      return null;
    }
  }, [
    snapshot.level,
    currentSectionIndex,
    sectionStartTimes,
    initialServerNow,
    nowTick,
    currentQuestionIndex,
    firstQuestionOfSection,
    currentSection,
  ]);

  // Sync Engine Ref
  const engineRef = useRef<ExamSyncEngine | null>(null);

  useEffect(() => {
    const engine = new ExamSyncEngine({
      attemptId,
      examId: snapshot.examId,
      lease,
      initialAnswers: answers,
      initialFlags: flags,
      storage,
      apiClient,
      debounceMs: 3000,
      maxWaitMs: 10000,
      onSyncStateChange: (state) => {
        setSyncState(state);
      },
      onLeaseConflict: () => {
        setIsConflictModalOpen(true);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, [attemptId, lease, snapshot.examId, storage, apiClient]);

  // Options click handler
  const handleSelectOption = async (optionValue: number) => {
    const question = flatQuestions[currentQuestionIndex];
    if (!question || question.isLocked) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionValue;
    setAnswers(newAnswers);

    if (engineRef.current) {
      await engineRef.current.recordAnswerChange(currentQuestionIndex, optionValue);
    }
  };

  // Flag toggle handler
  const handleToggleFlag = async () => {
    const question = flatQuestions[currentQuestionIndex];
    if (!question || question.isLocked) return;

    const newFlags = [...flags];
    const newFlagged = !flags[currentQuestionIndex];
    newFlags[currentQuestionIndex] = newFlagged ? 1 : 0;
    setFlags(newFlags);

    if (engineRef.current) {
      await engineRef.current.recordFlagChange(currentQuestionIndex, newFlagged);
    }
  };

  // Question navigation handlers
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > firstQuestionOfSection) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < lastQuestionOfSection) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleJumpToQuestion = (globalIdx: number) => {
    const targetQ = flatQuestions[globalIdx];
    if (targetQ && !targetQ.isLocked) {
      setCurrentQuestionIndex(globalIdx);
    }
  };

  // Keyboard shortcuts integration (EXAM-24)
  useKeyboardShortcuts({
    onSelectOption: (val) => handleSelectOption(val),
    onToggleFlag: () => handleToggleFlag(),
    onPrev: () => handlePrevQuestion(),
    onNext: () => handleNextQuestion(),
    onToggleZen: () => setIsZenMode((prev) => !prev),
    onOpenHelp: () => setIsShortcutsHelpOpen(true),
    isEnabled: !isSubmitModalOpen && !isTransitionModalOpen && !isConflictModalOpen && !isSpeakerTestOpen,
  });

  // Section transition handler (EXAM-06, EXAM-22)
  const handleConfirmSectionTransition = async () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    try {
      if (engineRef.current) {
        await engineRef.current.flush();
      }

      const res = await apiClient.nextSection(attemptId, { lease });

      setLockedSections((prev) => [...prev, currentSectionIndex]);

      const nextIdx = res.sectionIndex;
      setCurrentSectionIndex(nextIdx);
      setDeadlines((prev) => ({ ...prev, [nextIdx]: res.deadline }));
      setSectionStartTimes((prev) => ({ ...prev, [nextIdx]: res.startedAt }));
      setServerNow(res.serverNow);

      const nextSectionMeta = snapshot.sections[nextIdx];
      if (nextSectionMeta) {
        setCurrentQuestionIndex(nextSectionMeta.questionRange[0]);
        // If transitioning to listening section, prompt speaker test (EXAM-05)
        if (nextSectionMeta.listeningTimeline && nextSectionMeta.listeningTimeline.length > 0) {
          setIsSpeakerTestOpen(true);
        }
      }

      setIsTransitionModalOpen(false);
    } catch (err) {
      console.error('Lỗi khi chuyển phần thi:', err);
    } finally {
      setIsTransitioning(false);
    }
  };

  // Final submission handler (EXAM-19)
  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (engineRef.current) {
        await engineRef.current.flush();
      }

      // Flush current active question time
      const now = Date.now();
      const prevIdx = activeQIdxRef.current;
      if (prevIdx >= 0 && prevIdx < totalQuestions) {
        const elapsed = now - lastActiveTimeRef.current;
        questionTimesRef.current[prevIdx] = (questionTimesRef.current[prevIdx] || 0) + elapsed;
      }
      const finalTimeSpentMs = [...questionTimesRef.current];

      const res = await apiClient.submitAttempt(attemptId, {
        lease,
        seq: (engineRef.current?.getCurrentSeq() ?? 0) + 1,
        answers,
        flags,
        timeSpentMs: finalTimeSpentMs,
      });

      await storage.clearAttempt(attemptId);

      setIsSubmitModalOpen(false);
      if (onFinish) {
        onFinish(res);
      }
    } catch (err) {
      console.error('Lỗi khi nộp bài thi:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Countdown timer expiration handler (EXAM-08)
  const handleTimerExpire = () => {
    if (mode !== 'real') return;
    const isLastSec = currentSectionIndex >= snapshot.sections.length - 1;
    if (isLastSec) {
      handleConfirmSubmit();
    } else {
      setIsTransitionModalOpen(true);
    }
  };

  const answeredCount = answers.filter((a) => a > 0).length;
  const unansweredCount = totalQuestions - answeredCount;
  const flaggedCount = flags.filter((f) => f === 1).length;

  const currentQ = flatQuestions[currentQuestionIndex];
  const isFirstInSection = currentQuestionIndex <= firstQuestionOfSection;
  const isLastInSection = currentQuestionIndex >= lastQuestionOfSection;
  const isLastSection = currentSectionIndex >= snapshot.sections.length - 1;

  const currentDeadline = deadlines[currentSectionIndex] || null;
  const currentSectionStartTime = sectionStartTimes[currentSectionIndex] || null;
  const hasListening = Boolean(currentSection?.listeningTimeline && currentSection.listeningTimeline.length > 0);

  return (
    <div
      data-testid="exam-room"
      className={`jlpt-exam-room min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col ${
        isZenMode ? 'jlpt-zen-mode' : ''
      } ${className}`}
    >
      {/* Top sticky bar: Exam title, Clock, Sync status, Submit button */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
              {snapshot.title}
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono">
              {snapshot.level}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {mode === 'real' && pacingEvaluation?.currentMilestone && (
              <div
                data-testid="discreet-pacing-milestone"
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                title="Mốc tiến độ chuẩn JLPT"
              >
                <span>🎯 Mốc {pacingEvaluation.currentMilestone.label || `Câu ${firstQuestionOfSection + pacingEvaluation.currentMilestone.targetQuestionIndex}`} ({Math.round(pacingEvaluation.currentMilestone.targetElapsedSec / 60)}p)</span>
              </div>
            )}

            <SyncStatusIndicator
              syncState={syncState}
              onRetry={() => engineRef.current?.flush()}
            />

            <ExamClock
              deadline={currentDeadline}
              serverNow={serverNow}
              onExpire={handleTimerExpire}
            />

            <Button
              type="button"
              size="sm"
              variant="success"
              onClick={() => setIsSubmitModalOpen(true)}
              aria-label="Nộp bài thi"
              data-testid="submit-exam-btn"
              className="px-4 py-1.5 text-xs font-bold"
            >
              Nộp bài
            </Button>
          </div>
        </div>
      </header>

      {/* Section tabs header (hidden in Zen mode if compact) */}
      {!isZenMode && (
        <SectionHeader
          sections={snapshot.sections}
          currentSectionIndex={currentSectionIndex}
          lockedSections={lockedSections}
          onSelectSection={(idx) => {
            if (!lockedSections.includes(idx)) {
              setCurrentSectionIndex(idx);
              const secMeta = snapshot.sections[idx];
              if (secMeta) {
                setCurrentQuestionIndex(secMeta.questionRange[0]);
              }
            }
          }}
        />
      )}

      {/* Exam Toolbar: Font scale (EXAM-23), Zen toggle (EXAM-25), Speaker test (EXAM-05), Shortcuts (EXAM-24) */}
      <div className="max-w-7xl w-full mx-auto px-4 pt-3">
        <ExamToolbar
          fontSize={fontSize}
          onFontSizeChange={(size) => setFontSize(size)}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode((prev) => !prev)}
          onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
          onOpenSpeakerTest={() => setIsSpeakerTestOpen(true)}
          hasListeningTimeline={hasListening}
        />
      </div>

      {/* Listening Section Audio Player (AUDIO-01..06, AUDIO-10, Acceptance 2) */}
      {hasListening && (
        <div className="max-w-7xl w-full mx-auto px-4 pt-3">
          <AudioPlayer
            timeline={currentSection?.listeningTimeline || null}
            sectionStartedAt={currentSectionStartTime}
            serverOffsetMs={serverOffsetMs}
            mode={mode}
            activeGroupId={currentQ?.groupId || null}
            isLocked={lockedSections.includes(currentSectionIndex)}
            onItemChange={(itemIdx, grpId) => {
              // Automatically navigate to group if appropriate
              if (grpId) {
                const qIdx = flatQuestions.findIndex((q) => q.groupId === grpId);
                if (qIdx >= 0) {
                  setCurrentQuestionIndex(qIdx);
                }
              }
            }}
          />
        </div>
      )}

      {/* Main exam content area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Question view + Navigation */}
        <div className={`${isZenMode ? 'lg:col-span-12' : 'lg:col-span-8'} flex flex-col justify-between`}>
          <div>
            {/* Pacing Warning in Practice Mode (P04) */}
            {mode === 'practice' && pacingEvaluation && (pacingEvaluation.paceStatus === 'BEHIND' || pacingEvaluation.paceStatus === 'CRITICAL') && (
              <div
                data-testid="pacing-warning"
                className="mb-4 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 shadow-xs"
                role="alert"
              >
                <span className="text-base" aria-hidden="true">⏱️</span>
                <span className="flex-1">{pacingEvaluation.message}</span>
              </div>
            )}

            {currentQ ? (
              <QuestionView
                question={currentQ}
                selectedOption={answers[currentQuestionIndex] || 0}
                isFlagged={Boolean(flags[currentQuestionIndex])}
                onSelectOption={handleSelectOption}
                onToggleFlag={handleToggleFlag}
                fontSize={fontSize}
                showKeyboardHints={true}
                showFurigana={showFurigana}
              />
            ) : (
              <div className="p-8 text-center text-slate-500">Đang tải câu hỏi...</div>
            )}
          </div>

          <QuestionNavigation
            currentIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            isFirstInSection={isFirstInSection}
            isLastInSection={isLastInSection}
            isLastSection={isLastSection}
            onPrev={handlePrevQuestion}
            onNext={handleNextQuestion}
            onRequestNextSection={() => setIsTransitionModalOpen(true)}
            onRequestSubmit={() => setIsSubmitModalOpen(true)}
          />
        </div>

        {/* Right column: Progress bar & Answer sheet palette (Hidden in Zen Mode to prevent distraction) */}
        {!isZenMode && (
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <ExamProgressBar
                answeredCount={answeredCount}
                totalQuestions={totalQuestions}
              />
            </div>

            <QuestionPalette
              questions={flatQuestions}
              currentIndex={currentQuestionIndex}
              answers={answers}
              flags={flags}
              onSelectQuestion={handleJumpToQuestion}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <EarlySubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirmSubmit={handleConfirmSubmit}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        flaggedCount={flaggedCount}
        isSubmitting={isSubmitting}
      />

      <SectionTransitionModal
        isOpen={isTransitionModalOpen}
        onClose={() => setIsTransitionModalOpen(false)}
        onConfirm={handleConfirmSectionTransition}
        currentSectionTitle={currentSection?.title || 'Phần thi hiện tại'}
        nextSectionTitle={snapshot.sections[currentSectionIndex + 1]?.title || 'Phần thi tiếp theo'}
        isLoading={isTransitioning}
      />

      <LeaseConflictModal
        isOpen={isConflictModalOpen}
        onGoHome={() => {
          setIsConflictModalOpen(false);
          if (onExit) onExit();
        }}
      />

      <SpeakerTestModal
        isOpen={isSpeakerTestOpen}
        onClose={() => setIsSpeakerTestOpen(false)}
        onConfirm={() => setIsSpeakerTestOpen(false)}
      />

      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
    </div>
  );
}
