import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  // Timing
  computeSectionDeadline,
  computeServerOffset,
  computeClientRemainingMs,
  computeActualTimeSpentSec,
  evaluateSubmissionTiming,
  isAttemptAbandoned,
  applySectionLocking,
  isExamExpired,
  // Scoring
  REFERENCE_SCORING_DISCLAIMER,
  calculateRawScore,
  getPassingScore,
  calculateMondaiStats,
  calculateTargetEvaluation,
  calculateStandardExamResult,
  // Sheet Validator
  validateAnswerSheet,
  assertValidAnswerSheet,
  validateAnswerChoice,
  // Listening
  validateListeningTimeline,
  getListeningPlaybackPosition,
  // Blueprint
  validateBlueprint,
  assertValidBlueprint,
  canActivateBlueprint,
  // Mixing
  verifyMixedExamConformity,
  filterEligiblePoolGroups,
  type CandidateExamStructure,
} from '../src/index.js';
import type {
  ExamAnswerKey,
  Blueprint,
  BlueprintScoring,
  ListeningTimelineItem,
} from '@jlpt/schema';

function getDemoBlueprintPath(): string {
  const candidates = [
    path.resolve(import.meta.dirname ?? '.', '../../../docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json'),
    path.resolve(process.cwd(), 'docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json'),
    path.resolve(process.cwd(), '../../docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]!;
}

describe('@jlpt/exam-engine comprehensive suite', () => {
  describe('Timing & Deadlines (SYS-04 & Acceptance 1)', () => {
    const startedAt = new Date('2026-10-16T10:00:00.000Z');
    const durationSec = 1800; // 30 minutes
    const deadline = computeSectionDeadline(startedAt, durationSec); // 10:30:00.000Z

    it('computes section deadline correctly', () => {
      expect(deadline.toISOString()).toBe('2026-10-16T10:30:00.000Z');
    });

    it('computes server offset and client remaining time', () => {
      const serverNow = new Date('2026-10-16T10:15:00.000Z');
      const clientNow = new Date('2026-10-16T10:14:58.000Z'); // 2 seconds behind
      const offset = computeServerOffset(serverNow, clientNow);
      expect(offset).toBe(2000);

      const remainingMs = computeClientRemainingMs(deadline, serverNow, clientNow);
      expect(remainingMs).toBe(15 * 60 * 1000); // 15 minutes remaining
    });

    it('computes actual time spent in seconds', () => {
      const endedAt = new Date('2026-10-16T10:25:30.000Z');
      const spent = computeActualTimeSpentSec(startedAt, endedAt);
      expect(spent).toBe(1530); // 25 min 30 sec

      // If endedAt is before startedAt, clamps to 0
      expect(computeActualTimeSpentSec(endedAt, startedAt)).toBe(0);
    });

    it('evaluates practice mode timing as always open and advisory', () => {
      const lateTime = new Date('2026-10-16T12:00:00.000Z'); // 1.5 hours after deadline
      const evalPractice = evaluateSubmissionTiming({
        now: lateTime,
        deadline,
        mode: 'practice',
      });

      expect(evalPractice.status).toBe('PRACTICE_OPEN');
      expect(evalPractice.isAllowed).toBe(true);
      expect(evalPractice.flags).toEqual([]);
      expect(evalPractice.delayMs).toBe(90 * 60 * 1000);
    });

    describe('Boundary tests: deadline, grace period, and late sync window in real mode', () => {
      const graceSec = 10;
      const lateSyncWindowSec = 600; // 10 minutes
      const deadlineMs = deadline.getTime();

      it('exactly on deadline: ON_TIME, allowed, no flags', () => {
        const res = evaluateSubmissionTiming({
          now: new Date(deadlineMs),
          deadline,
          mode: 'real',
          graceSec,
          lateSyncWindowSec,
        });

        expect(res.status).toBe('ON_TIME');
        expect(res.isAllowed).toBe(true);
        expect(res.flags).toEqual([]);
        expect(res.delayMs).toBe(0);
        expect(res.graceRemainingMs).toBe(10000);
        expect(res.lateSyncRemainingMs).toBe(610000);
      });

      it('before deadline: ON_TIME, allowed, no flags', () => {
        const res = evaluateSubmissionTiming({
          now: new Date(deadlineMs - 5000),
          deadline,
          mode: 'real',
          graceSec,
          lateSyncWindowSec,
        });

        expect(res.status).toBe('ON_TIME');
        expect(res.isAllowed).toBe(true);
        expect(res.flags).toEqual([]);
        expect(res.delayMs).toBe(-5000);
      });

      it('within grace period (boundary: deadline + graceSec): GRACE_PERIOD, allowed, no flags', () => {
        // 5s after deadline
        const res1 = evaluateSubmissionTiming({
          now: new Date(deadlineMs + 5000),
          deadline,
          mode: 'real',
          graceSec,
          lateSyncWindowSec,
        });
        expect(res1.status).toBe('GRACE_PERIOD');
        expect(res1.isAllowed).toBe(true);
        expect(res1.flags).toEqual([]);

        // exactly deadline + graceSec (10,000ms)
        const res2 = evaluateSubmissionTiming({
          now: new Date(deadlineMs + 10000),
          deadline,
          mode: 'real',
          graceSec,
          lateSyncWindowSec,
        });
        expect(res2.status).toBe('GRACE_PERIOD');
        expect(res2.isAllowed).toBe(true);
        expect(res2.flags).toEqual([]);
        expect(res2.graceRemainingMs).toBe(0);
      });

      it('crossing grace period boundary (deadline + graceSec + 1ms): LATE_SYNC, allowed, with late_sync flag', () => {
        const res = evaluateSubmissionTiming({
          now: new Date(deadlineMs + 10001),
          deadline,
          mode: 'real',
          graceSec,
          lateSyncWindowSec,
        });

        expect(res.status).toBe('LATE_SYNC');
        expect(res.isAllowed).toBe(true);
        expect(res.flags).toContain('late_sync');
        expect(res.graceRemainingMs).toBe(0);
        expect(res.lateSyncRemainingMs).toBe(599999);
      });

      it('deep within late sync window (5 minutes past deadline): LATE_SYNC, allowed, with late_sync flag', () => {
        const res = evaluateSubmissionTiming({
          now: new Date(deadlineMs + 300000),
          deadline,
          mode: 'real',
          graceSec,
          lateSyncWindowSec,
        });

        expect(res.status).toBe('LATE_SYNC');
        expect(res.isAllowed).toBe(true);
        expect(res.flags).toContain('late_sync');
      });

      it('exactly at end of late sync window (deadline + grace + lateWindow): LATE_SYNC, allowed', () => {
        const totalWindowMs = (graceSec + lateSyncWindowSec) * 1000; // 610,000ms
        const res = evaluateSubmissionTiming({
          now: new Date(deadlineMs + totalWindowMs),
          deadline,
          mode: 'real',
          graceSec,
          lateSyncWindowSec,
        });

        expect(res.status).toBe('LATE_SYNC');
        expect(res.isAllowed).toBe(true);
        expect(res.flags).toContain('late_sync');
        expect(res.lateSyncRemainingMs).toBe(0);
      });

      it('1ms past late sync window: EXPIRED, isAllowed=false, DEADLINE_PASSED', () => {
        const totalWindowMs = (graceSec + lateSyncWindowSec) * 1000;
        const res = evaluateSubmissionTiming({
          now: new Date(deadlineMs + totalWindowMs + 1),
          deadline,
          mode: 'real',
          graceSec,
          lateSyncWindowSec,
        });

        expect(res.status).toBe('EXPIRED');
        expect(res.isAllowed).toBe(false);
        expect(res.reason).toBe('DEADLINE_PASSED');
      });

      it('far past window: EXPIRED, isAllowed=false', () => {
        const res = evaluateSubmissionTiming({
          now: new Date(deadlineMs + 3600000), // 1 hour late
          deadline,
          mode: 'real',
          graceSec,
          lateSyncWindowSec,
        });

        expect(res.status).toBe('EXPIRED');
        expect(res.isAllowed).toBe(false);
        expect(res.reason).toBe('DEADLINE_PASSED');
      });
    });

    it('detects abandoned attempts (> 24 hours between sections)', () => {
      const activeAt = new Date('2026-10-15T10:00:00.000Z');
      const within24h = new Date('2026-10-16T09:00:00.000Z');
      const after24h = new Date('2026-10-16T11:00:00.000Z');

      expect(isAttemptAbandoned(activeAt, within24h)).toBe(false);
      expect(isAttemptAbandoned(activeAt, after24h)).toBe(true);
    });

    it('enforces section locking in real mode and allows in practice mode (EXAM-22)', () => {
      const existingAnswers = [1, 2, 3, 4, 1, 2];
      const incomingAnswers = [9, 9, 2, 3, 9, 9]; // User trying to edit section 0 and 2
      const section1Range: [number, number] = [2, 3]; // Only questions index 2..3 are active

      const lockedReal = applySectionLocking({
        existingAnswers,
        incomingAnswers,
        currentSectionRange: section1Range,
        mode: 'real',
      });
      // Section 0 (indices 0, 1) preserved from existingAnswers: [1, 2]
      // Section 1 (indices 2, 3) taken from incomingAnswers: [2, 3]
      // Section 2 (indices 4, 5) preserved from existingAnswers: [1, 2]
      expect(lockedReal).toEqual([1, 2, 2, 3, 1, 2]);

      const practiceResult = applySectionLocking({
        existingAnswers,
        incomingAnswers,
        currentSectionRange: section1Range,
        mode: 'practice',
      });
      expect(practiceResult).toEqual(incomingAnswers);
    });

    it('checks legacy isExamExpired', () => {
      const started = new Date('2026-10-15T10:00:00Z');
      expect(isExamExpired(started, 60, new Date('2026-10-15T10:30:00Z'))).toBe(false);
      expect(isExamExpired(started, 60, new Date('2026-10-15T11:01:00Z'))).toBe(true);
    });
  });

  describe('Answer Sheet Validation (Acceptance 3)', () => {
    it('accepts valid answer sheet matching option counts', () => {
      // 4 questions: q1 has 4 choices, q2 has 3 choices, q3 has 4 choices, q4 has 3 choices
      const answers = [1, 3, 0, 2]; // q3 is blank (0)
      const res = validateAnswerSheet(answers, {
        totalQuestions: 4,
        optionCounts: [4, 3, 4, 3],
      });

      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(() => assertValidAnswerSheet(answers, { totalQuestions: 4, optionCounts: [4, 3, 4, 3] })).not.toThrow();
    });

    it('rejects answer sheet with choice exceeding per-question option count (Acceptance 3)', () => {
      // q2 only has 3 choices, but candidate selected 4
      const answers = [1, 4, 2, 1];
      const res = validateAnswerSheet(answers, {
        totalQuestions: 4,
        optionCounts: [4, 3, 4, 4],
      });

      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Câu 2') && e.includes('vượt quá số phương án'))).toBe(true);
      expect(() => assertValidAnswerSheet(answers, { totalQuestions: 4, optionCounts: [4, 3, 4, 4] })).toThrowError(
        /Phiếu trả lời không hợp lệ/,
      );
    });

    it('rejects option values > 4 or negative values', () => {
      const answers = [1, 5, -1, 2];
      const res = validateAnswerSheet(answers, {
        totalQuestions: 4,
      });

      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Câu 2') && e.includes('vượt quá'))).toBe(true);
      expect(res.errors.some((e) => e.includes('Câu 3') && e.includes('không được âm'))).toBe(true);
    });

    it('rejects non-integer values or NaN', () => {
      const answers = [1, 2.5, 3, 4];
      const res = validateAnswerSheet(answers, { totalQuestions: 4 });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('phải là số nguyên'))).toBe(true);
    });

    it('rejects answer sheet with mismatched length', () => {
      const answers = [1, 2, 3];
      const res = validateAnswerSheet(answers, { totalQuestions: 4 });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('không khớp'))).toBe(true);
    });

    it('validates single choice with validateAnswerChoice', () => {
      expect(validateAnswerChoice(0, 4)).toBe(true);
      expect(validateAnswerChoice(3, 3)).toBe(true);
      expect(validateAnswerChoice(4, 3)).toBe(false);
      expect(validateAnswerChoice(-1, 4)).toBe(false);
      expect(validateAnswerChoice(2.5, 4)).toBe(false);
    });
  });

  describe('Scoring & Reference Estimation (SCORE-01..06, SCORE-13 & Acceptance 2)', () => {
    const answerKey: ExamAnswerKey = {
      examId: '0192f0c0-0000-7000-8000-000000000001',
      version: 1,
      keys: [1, 2, 3, 4, 1, 2, 3, 4],
      skills: ['kanji', 'kanji', 'vocabulary', 'vocabulary', 'reading', 'reading', 'listening', 'listening'],
      mondaiTypes: [
        'kanji_reading',
        'kanji_reading',
        'orthography',
        'contextual',
        'comprehension_short',
        'comprehension_short',
        'task_based',
        'point',
      ],
      sectionRanges: [
        [0, 3], // Language vocab
        [4, 5], // Reading
        [6, 7], // Listening
      ],
    };

    const scoring: BlueprintScoring = {
      method: 'linear_reference',
      rounding: 'round',
      scoringSections: [
        {
          code: 'language_reading',
          label: '言語知識・読解',
          skills: ['kanji', 'vocabulary', 'reading'],
          maxScaled: 120,
          minPass: 38,
        },
        {
          code: 'listening',
          label: '聴解',
          skills: ['listening'],
          maxScaled: 60,
          minPass: 19,
        },
      ],
      totalMax: 180,
      totalPass: 90,
    };

    it('calculates raw score accurately', () => {
      const res = calculateRawScore({ q1: 1, q2: 2, q3: 1 }, { q1: 1, q2: 2, q3: 3 });
      expect(res.correctCount).toBe(2);
      expect(res.totalQuestions).toBe(3);
      expect(res.scorePercentage).toBe(67);

      expect(calculateRawScore({}, {})).toEqual({ correctCount: 0, totalQuestions: 0, scorePercentage: 0 });
    });

    it('returns passing scores for all JLPT levels', () => {
      expect(getPassingScore('N1')).toBe(100);
      expect(getPassingScore('N2')).toBe(90);
      expect(getPassingScore('N3')).toBe(95);
      expect(getPassingScore('N4')).toBe(90);
      expect(getPassingScore('N5')).toBe(80);
    });

    it('calculates mondai breakdown statistics (SCORE-05)', () => {
      const userAnswers = [1, 2, 3, 0, 1, 0, 3, 1]; // q4 blank, q6 blank, q8 wrong
      const stats = calculateMondaiStats(userAnswers, answerKey);

      expect(stats.length).toBeGreaterThan(0);
      const kanjiStats = stats.find((s) => s.mondaiType === 'kanji_reading');
      expect(kanjiStats).toBeDefined();
      expect(kanjiStats?.correct).toBe(2);
      expect(kanjiStats?.total).toBe(2);
      expect(kanjiStats?.accuracy).toBe(100);

      const readingStats = stats.find((s) => s.mondaiType === 'comprehension_short');
      expect(readingStats).toBeDefined();
      expect(readingStats?.correct).toBe(1);
      expect(readingStats?.blank).toBe(1);
      expect(readingStats?.total).toBe(2);
      expect(readingStats?.accuracy).toBe(50);
    });

    it('evaluates practice target score achievement (SCORE-13)', () => {
      // Target 100, achieved 120
      const eval1 = calculateTargetEvaluation(120, 100, 90);
      expect(eval1.reached).toBe(true);
      expect(eval1.margin).toBe(20);
      expect(eval1.percentageOfTarget).toBe(120);
      expect(eval1.passedStandard).toBe(true);

      // Target 110, achieved 85
      const eval2 = calculateTargetEvaluation(85, 110, 90);
      expect(eval2.reached).toBe(false);
      expect(eval2.margin).toBe(-25);
      expect(eval2.percentageOfTarget).toBe(77);
      expect(eval2.passedStandard).toBe(false);
    });

    it('calculates full standard exam result with reference disclaimer (Acceptance 2)', () => {
      // User gets 5/6 language/reading correct, and 1/2 listening correct
      const userAnswers = [1, 2, 3, 4, 1, 0, 3, 0]; // 6 correct, 2 blank
      const result = calculateStandardExamResult(userAnswers, answerKey, scoring, {
        durationSec: 1500,
        targetScore: 100,
      });

      // SCORE-01, 02, 03
      expect(result.totals.correct).toBe(6);
      expect(result.totals.wrong).toBe(0);
      expect(result.totals.blank).toBe(2);
      expect(result.totals.total).toBe(8);
      expect(result.accuracy).toBe(75);

      // SCORE-06
      expect(result.durationSec).toBe(1500);

      // SCORE-04 (bySkill)
      expect(result.bySkill).toHaveLength(4); // kanji, vocabulary, reading, listening

      // SCORE-05 (byMondai)
      expect(result.byMondai).toBeDefined();
      expect(result.byMondai?.length).toBe(6);

      // SCORE-13 (targetEvaluation)
      expect(result.targetEvaluation).toBeDefined();
      expect(result.targetEvaluation?.targetScore).toBe(100);

      // Acceptance 2: Always linear_reference scoring with explicit disclaimer
      expect(result.scoring.method).toBe('linear_reference');
      expect(result.scoring.disclaimer).toBe(REFERENCE_SCORING_DISCLAIMER);
      expect(result.scoring.disclaimer).toContain('Điểm quy đổi chỉ mang tính chất tham khảo');

      // Section scaling:
      // Language: 5/6 * 120 = 100
      // Listening: 1/2 * 60 = 30
      // Total: 130 >= 90 (totalPass) and both >= minPass (38, 19) -> passEstimate = true
      expect(result.scoring.sections[0]?.scaled).toBe(100);
      expect(result.scoring.sections[0]?.passed).toBe(true);
      expect(result.scoring.sections[1]?.scaled).toBe(30);
      expect(result.scoring.sections[1]?.passed).toBe(true);
      expect(result.scoring.total).toBe(130);
      expect(result.scoring.passEstimate).toBe(true);
    });
  });

  describe('Listening Timeline Validation & Playback Position (Acceptance 5)', () => {
    const validTimeline: ListeningTimelineItem[] = [
      {
        groupId: '0192f0c0-0000-7000-8000-0000000000a1',
        mediaKey: 'media/track1.mp3',
        startMs: 0,
        endMs: 30000,
        audioStartMs: 0,
        audioEndMs: 30000,
        gapAfterMs: 5000,
      },
      {
        groupId: '0192f0c0-0000-7000-8000-0000000000a2',
        mediaKey: 'media/track2.mp3',
        startMs: 35000, // 30000 + 5000 gap
        endMs: 65000,
        audioStartMs: 10000,
        audioEndMs: 40000, // 40000 - 10000 = 30000 === 65000 - 35000
        gapAfterMs: 8000,
      },
    ];

    it('validates a compliant import v2 listening timeline successfully', () => {
      const res = validateListeningTimeline(validTimeline, 120);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('rejects timeline with audio duration invariance violation (Acceptance 5)', () => {
      const invalidTimeline: ListeningTimelineItem[] = [
        {
          groupId: '0192f0c0-0000-7000-8000-0000000000a1',
          mediaKey: 'media/track1.mp3',
          startMs: 0,
          endMs: 30000, // 30,000ms
          audioStartMs: 0,
          audioEndMs: 25000, // 25,000ms !== 30,000ms!
          gapAfterMs: 5000,
        },
      ];

      const res = validateListeningTimeline(invalidTimeline);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Sai lệch độ dài audio'))).toBe(true);
    });

    it('rejects timeline with non-monotonic or overlapping items', () => {
      const overlappingTimeline: ListeningTimelineItem[] = [
        {
          groupId: '0192f0c0-0000-7000-8000-0000000000a1',
          mediaKey: 'media/track1.mp3',
          startMs: 0,
          endMs: 30000,
          audioStartMs: 0,
          audioEndMs: 30000,
          gapAfterMs: 5000,
        },
        {
          groupId: '0192f0c0-0000-7000-8000-0000000000a2',
          mediaKey: 'media/track2.mp3',
          startMs: 32000, // should start >= 35000 (30000 + 5000)!
          endMs: 62000,
          audioStartMs: 0,
          audioEndMs: 30000,
          gapAfterMs: 0,
        },
      ];

      const res = validateListeningTimeline(overlappingTimeline);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('bắt đầu trước khi đoạn trước kết thúc'))).toBe(true);
    });

    it('rejects timeline exceeding section duration', () => {
      const res = validateListeningTimeline(validTimeline, 50); // section is 50s = 50,000ms, but last item ends at 65,000ms
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('vượt quá thời gian quy định'))).toBe(true);
    });

    it('resolves listening playback position correctly across timeline', () => {
      // Before start
      expect(getListeningPlaybackPosition(validTimeline, -100).status).toBe('before_start');

      // In track 1 at 15s (startMs=0, endMs=30000, audioStartMs=0)
      const pos1 = getListeningPlaybackPosition(validTimeline, 15000);
      expect(pos1.status).toBe('playing');
      expect(pos1.itemIndex).toBe(0);
      expect(pos1.mediaKey).toBe('media/track1.mp3');
      expect(pos1.audioOffsetMs).toBe(15000);
      expect(pos1.remainingMsInItem).toBe(15000);

      // In gap between track 1 and track 2 at 32s (track 1 ends at 30s, gap is 5s to 35s)
      const gapPos = getListeningPlaybackPosition(validTimeline, 32000);
      expect(gapPos.status).toBe('gap');
      expect(gapPos.remainingMsInGap).toBe(3000);

      // In track 2 at 45s (startMs=35000, audioStartMs=10000)
      // audioOffset = 10000 + (45000 - 35000) = 20000
      const pos2 = getListeningPlaybackPosition(validTimeline, 45000);
      expect(pos2.status).toBe('playing');
      expect(pos2.itemIndex).toBe(1);
      expect(pos2.mediaKey).toBe('media/track2.mp3');
      expect(pos2.audioOffsetMs).toBe(20000);

      // In gap after track 2 at 68s (ends at 65s, gap is 8s to 73s)
      const gapPos2 = getListeningPlaybackPosition(validTimeline, 68000);
      expect(gapPos2.status).toBe('gap');

      // Finished after timeline
      const finishedPos = getListeningPlaybackPosition(validTimeline, 80000);
      expect(finishedPos.status).toBe('finished');
    });
  });

  describe('Blueprint Validation & Activation (Acceptance 6 & 7)', () => {
    it('validates demo synthetic blueprint from docs/multi-worker/demo-data/blueprints/ (Acceptance 7)', () => {
      const demoBlueprintPath = getDemoBlueprintPath();
      expect(fs.existsSync(demoBlueprintPath)).toBe(true);

      const rawJson = fs.readFileSync(demoBlueprintPath, 'utf-8');
      const demoBlueprint = JSON.parse(rawJson) as Blueprint;

      const valResult = validateBlueprint(demoBlueprint);
      expect(valResult.valid).toBe(true);
      expect(valResult.errors).toEqual([]);
      expect(valResult.isOfficial).toBe(false);
      expect(valResult.canActivate).toBe(true);
      expect(valResult.totalDurationSec).toBe(600 + 900 + 203);
      expect(valResult.totalQuestions).toBe(29); // 12 vocab + 10 grammar/reading + 7 listening

      // Can be activated immediately
      const activation = canActivateBlueprint(demoBlueprint);
      expect(activation.canActivate).toBe(true);
    });

    it('blocks official blueprint activation when jlpt-blueprints is missing (Acceptance 6)', () => {
      const officialDraft: Blueprint = {
        level: 'N1',
        version: 1,
        kind: 'official',
        isOfficial: true,
        effectiveFrom: '2026-10',
        sourceRef: [{ url: 'https://www.jlpt.jp/guideline.html', accessedAt: '2026-10-15' }],
        sections: [
          {
            code: 'language_reading',
            title: '言語知識・読解',
            durationSec: 6600,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 6 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            {
              code: 'language',
              label: '言語知識',
              skills: ['kanji'],
              maxScaled: 180,
              minPass: 50,
            },
          ],
          totalMax: 180,
          totalPass: 100,
        },
      };

      const valResult = validateBlueprint(officialDraft);
      expect(valResult.valid).toBe(true);
      expect(valResult.isOfficial).toBe(true);

      // Blocked when jlpt-blueprints is MISSING
      const blockedActivation = canActivateBlueprint(officialDraft, { 'jlpt-blueprints': 'MISSING' });
      expect(blockedActivation.canActivate).toBe(false);
      expect(blockedActivation.reason).toContain('jlpt-blueprints');

      // Unblocked when confirmed
      const allowedActivation = canActivateBlueprint(officialDraft, { 'jlpt-blueprints': 'CONFIRMED' });
      expect(allowedActivation.canActivate).toBe(true);
    });

    it('rejects official blueprint with missing sourceRef or non-official domain', () => {
      const invalidOfficial: Blueprint = {
        level: 'N2',
        version: 1,
        kind: 'official',
        effectiveFrom: '2026-10',
        sourceRef: [{ url: 'https://random-site.com/test', accessedAt: '2026-10-15' }], // not jlpt.jp
        sections: [
          {
            code: 'language',
            title: '言語知識',
            durationSec: 3600,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 5 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 'language', label: '言語知識', skills: ['kanji'], maxScaled: 180, minPass: 50 },
          ],
          totalMax: 180,
          totalPass: 90,
        },
      };

      const valResult = validateBlueprint(invalidOfficial);
      expect(valResult.valid).toBe(false);
      expect(valResult.errors.some((e) => e.includes('nguồn tham chiếu từ jlpt.jp'))).toBe(true);
    });

    it('rejects blueprints with zero question count or invalid totalMax', () => {
      const brokenBlueprint = {
        level: 'N5',
        version: 1,
        effectiveFrom: '2026-10',
        sourceRef: [],
        sections: [
          {
            code: 'sec1',
            title: 'Section 1',
            durationSec: 0, // invalid <= 0
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 0 }], // invalid <= 0
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 's1', label: 'S1', skills: ['kanji'], maxScaled: 100, minPass: 30 },
          ],
          totalMax: 180, // mismatch: sum of maxScaled is 100 != 180
          totalPass: 80,
        },
      };

      const valResult = validateBlueprint(brokenBlueprint);
      expect(valResult.valid).toBe(false);
      expect(valResult.errors.length).toBeGreaterThan(0);
      expect(() => assertValidBlueprint(brokenBlueprint)).toThrow();
    });
  });

  describe('Exam Mixing Rules Verification (SYS-16)', () => {
    const demoBlueprintPath = getDemoBlueprintPath();
    const demoBlueprint = JSON.parse(fs.readFileSync(demoBlueprintPath, 'utf-8')) as Blueprint;

    it('verifies conforming mixed exam against blueprint', () => {
      const conformingCandidate = {
        level: demoBlueprint.level,
        sections: demoBlueprint.sections.map((sec) => ({
          code: sec.code,
          mondai: sec.mondai.map((mon) => ({
            type: mon.type,
            skill: mon.skill,
            questionCount: mon.questionCount,
            selectedGroupIds: ['grp-01', 'grp-02'],
          })),
        })),
      };

      const res = verifyMixedExamConformity(demoBlueprint, conformingCandidate);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('rejects candidate with wrong level or mismatched mondai type / counts', () => {
      const nonConformingCandidate = {
        level: 'N4' as const, // Rule 1 violation
        sections: [
          {
            code: demoBlueprint.sections[0]!.code,
            mondai: [
              {
                type: 'contextual' as const, // Rule 2 violation (blueprint expects kanji_reading first)
                skill: 'vocabulary' as const,
                questionCount: 99, // Rule 4 violation
                selectedGroupIds: [],
              },
            ],
          },
        ],
      };

      const res = verifyMixedExamConformity(demoBlueprint, nonConformingCandidate);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('cấp độ'))).toBe(true);
      expect(res.errors.some((e) => e.includes('Số lượng phần thi'))).toBe(true);
    });

    it('filters candidate pool groups according to Rule 5 (approved, answerKeys, media)', () => {
      const candidates = [
        {
          groupId: 'g1',
          level: 'N5' as const,
          mondaiType: 'kanji_reading' as const,
          skill: 'kanji' as const,
          questionCount: 4,
          isApproved: true,
          hasMedia: true,
          hasAnswerKeys: true,
        },
        {
          groupId: 'g2',
          level: 'N5' as const,
          mondaiType: 'kanji_reading' as const,
          skill: 'kanji' as const,
          questionCount: 4,
          isApproved: false, // unapproved
          hasMedia: true,
          hasAnswerKeys: true,
        },
        {
          groupId: 'g3',
          level: 'N4' as const, // different level
          mondaiType: 'kanji_reading' as const,
          skill: 'kanji' as const,
          questionCount: 4,
          isApproved: true,
          hasMedia: true,
          hasAnswerKeys: true,
        },
      ];

      const eligible = filterEligiblePoolGroups(candidates, 'N5');
      expect(eligible).toHaveLength(1);
      expect(eligible[0]?.groupId).toBe('g1');
    });
  });

  describe('Edge cases, branches and boundary validation for >95% coverage', () => {
    const demoBlueprintPath = getDemoBlueprintPath();
    const demoBlueprint = JSON.parse(fs.readFileSync(demoBlueprintPath, 'utf-8')) as Blueprint;

    it('covers timing toEpochMs branches with string and number', () => {
      const nowMs = 1700000000000;
      expect(computeSectionDeadline(nowMs, 100).getTime()).toBe(nowMs + 100000);
      expect(computeSectionDeadline('2026-10-16T10:00:00.000Z', 100).getTime()).toBe(
        new Date('2026-10-16T10:00:00.000Z').getTime() + 100000,
      );
    });

    it('covers sheet validator non-array input', () => {
      // @ts-expect-error non-array testing
      const res = validateAnswerSheet(null, { totalQuestions: 5 });
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('phải là một mảng');
    });

    it('covers listening timeline invalid structure branches', () => {
      // null / undefined timeline
      expect(validateListeningTimeline(null).valid).toBe(false);
      expect(validateListeningTimeline([]).valid).toBe(false);

      // missing groupId or mediaKey
      const badItems = [
        {
          groupId: '',
          mediaKey: '',
          startMs: 0,
          endMs: 1000,
          audioStartMs: 0,
          audioEndMs: 1000,
          gapAfterMs: 0,
        },
      ] as unknown as ListeningTimelineItem[];
      const resBad = validateListeningTimeline(badItems);
      expect(resBad.valid).toBe(false);

      // non-integer numbers
      const nonInt = [
        {
          groupId: 'g1',
          mediaKey: 'm1',
          startMs: 0.5,
          endMs: 1000,
          audioStartMs: 0,
          audioEndMs: 1000,
          gapAfterMs: 0,
        },
      ] as unknown as ListeningTimelineItem[];
      expect(validateListeningTimeline(nonInt).valid).toBe(false);

      // negative numbers
      const neg = [
        {
          groupId: 'g1',
          mediaKey: 'm1',
          startMs: -10,
          endMs: 1000,
          audioStartMs: -5,
          audioEndMs: 1000,
          gapAfterMs: -1,
        },
      ] as unknown as ListeningTimelineItem[];
      expect(validateListeningTimeline(neg).valid).toBe(false);

      // endMs < startMs or audioEndMs < audioStartMs
      const inverted = [
        {
          groupId: 'g1',
          mediaKey: 'm1',
          startMs: 2000,
          endMs: 1000,
          audioStartMs: 2000,
          audioEndMs: 1000,
          gapAfterMs: 0,
        },
      ] as unknown as ListeningTimelineItem[];
      expect(validateListeningTimeline(inverted).valid).toBe(false);

      // playback position with empty timeline
      expect(getListeningPlaybackPosition([], 50).status).toBe('finished');

      // timeline starting with delay > 0 and elapsedMs before item 0
      const delayedStart: ListeningTimelineItem[] = [
        {
          groupId: 'g1',
          mediaKey: 'm1',
          startMs: 5000,
          endMs: 10000,
          audioStartMs: 0,
          audioEndMs: 5000,
          gapAfterMs: 0,
        },
      ];
      const gapBefore = getListeningPlaybackPosition(delayedStart, 2000);
      expect(gapBefore.status).toBe('gap');
      expect(gapBefore.remainingMsInGap).toBe(3000);
    });

    it('covers blueprint validation error branches', () => {
      // non-blueprint object
      expect(validateBlueprint({ foo: 'bar' }).valid).toBe(false);

      // blueprint with empty sections
      const emptySecBp = {
        level: 'N5',
        version: 1,
        effectiveFrom: '2026-10',
        sourceRef: [],
        sections: [],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [{ code: 's1', label: 'S1', skills: ['kanji'], maxScaled: 180, minPass: 80 }],
          totalMax: 180,
          totalPass: 80,
        },
      };
      expect(validateBlueprint(emptySecBp).valid).toBe(false);

      // section with empty mondai
      const emptyMondaiBp = {
        level: 'N5',
        version: 1,
        effectiveFrom: '2026-10',
        sourceRef: [],
        sections: [
          {
            code: 's1',
            title: 'S1',
            durationSec: 1000,
            mondai: [],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [{ code: 's1', label: 'S1', skills: ['kanji'], maxScaled: 180, minPass: 80 }],
          totalMax: 180,
          totalPass: 80,
        },
      };
      expect(validateBlueprint(emptyMondaiBp).valid).toBe(false);

      // scoring section with maxScaled <= 0 or totalPass > totalMax
      const invalidScoringBp = {
        level: 'N5',
        version: 1,
        effectiveFrom: '2026-10',
        sourceRef: [],
        sections: [
          {
            code: 's1',
            title: 'S1',
            durationSec: 1000,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 4 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [{ code: 's1', label: 'S1', skills: ['kanji'], maxScaled: 0, minPass: 10 }],
          totalMax: 180,
          totalPass: 200,
        },
      };
      expect(validateBlueprint(invalidScoringBp).valid).toBe(false);

      // section with durationSec <= 0 and mondai with questionCount <= 0
      const invalidCountsBp = {
        level: 'N5',
        version: 1,
        effectiveFrom: '2026-10',
        sourceRef: [],
        sections: [
          {
            code: 's1',
            title: 'S1',
            durationSec: -5,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: -1 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [{ code: 's1', label: 'S1', skills: ['kanji'], maxScaled: 0, minPass: 10 }],
          totalMax: 180,
          totalPass: 80,
        },
      };
      const invResult = validateBlueprint(invalidCountsBp);
      expect(invResult.valid).toBe(false);
      expect(invResult.errors.some((e) => e.includes('durationSec'))).toBe(true);
      expect(invResult.errors.some((e) => e.includes('questionCount'))).toBe(true);
      expect(invResult.errors.some((e) => e.includes('maxScaled'))).toBe(true);

      // sumMaxScaled !== totalMax and totalPass > totalMax with valid Zod types
      const mismatchSumBp: Blueprint = {
        level: 'N5',
        version: 1,
        effectiveFrom: '2026-10',
        sourceRef: [],
        sections: [
          {
            code: 's1',
            title: 'S1',
            durationSec: 1000,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 2 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 's1', label: 'S1', skills: ['kanji'], maxScaled: 100, minPass: 30 },
          ],
          totalMax: 180, // sum is 100 != 180
          totalPass: 190, // totalPass > totalMax
        },
      };
      const mismatchRes = validateBlueprint(mismatchSumBp);
      expect(mismatchRes.valid).toBe(false);
      expect(mismatchRes.errors.some((e) => e.includes('không khớp với tổng maxScaled'))).toBe(true);
      expect(mismatchRes.errors.some((e) => e.includes('không được vượt quá điểm tối đa'))).toBe(true);

      // Official blueprint with empty sourceRef []
      const emptySourceOfficial: Blueprint = {
        level: 'N1',
        version: 1,
        kind: 'official',
        effectiveFrom: '2026-10',
        sourceRef: [],
        sections: [
          {
            code: 's1',
            title: 'S1',
            durationSec: 1000,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 2 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 's1', label: 'S1', skills: ['kanji'], maxScaled: 180, minPass: 50 },
          ],
          totalMax: 180,
          totalPass: 100,
        },
      };
      const emptySourceRes = validateBlueprint(emptySourceOfficial);
      expect(emptySourceRes.valid).toBe(false);
      expect(emptySourceRes.errors.some((e) => e.includes('bắt buộc phải có nguồn tham chiếu'))).toBe(true);

      // assertValidBlueprint success
      const validBp = assertValidBlueprint(demoBlueprint);
      expect(validBp).toBeDefined();

      // skill used in section but missing in scoringSections produces warning
      const unmappedSkillBp: Blueprint = {
        level: 'N5',
        version: 1,
        effectiveFrom: '2026-10',
        sourceRef: [],
        sections: [
          {
            code: 's1',
            title: 'S1',
            durationSec: 1000,
            mondai: [
              { type: 'kanji_reading', skill: 'kanji', questionCount: 2 },
              { type: 'comprehension_short', skill: 'reading', questionCount: 2 },
            ],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 'kanji_sec', label: 'Kanji', skills: ['kanji'], maxScaled: 180, minPass: 80 },
          ],
          totalMax: 180,
          totalPass: 80,
        },
      };
      const warnResult = validateBlueprint(unmappedSkillBp);
      expect(warnResult.warnings.length).toBeGreaterThan(0);
      expect(warnResult.warnings[0]).toContain('reading');
    });

    it('covers exam mixing candidate mismatch branches', () => {
      const bp = demoBlueprint;

      // Section code mismatch
      const wrongCodeCand: CandidateExamStructure = {
        level: bp.level,
        sections: [
          {
            code: 'totally_wrong_code',
            mondai: [],
          },
          {
            code: bp.sections[1]!.code,
            mondai: [],
          },
          {
            code: bp.sections[2]!.code,
            mondai: [],
          },
        ],
      };
      const resCode = verifyMixedExamConformity(bp, wrongCodeCand);
      expect(resCode.valid).toBe(false);
      expect(resCode.errors.some((e) => e.includes('Mã phần thi'))).toBe(true);

      // Section mondai count mismatch
      const wrongMondaiCount: CandidateExamStructure = {
        level: bp.level,
        sections: bp.sections.map((sec, idx) => ({
          code: sec.code,
          mondai:
            idx === 0
              ? []
              : sec.mondai.map((m) => ({
                  type: m.type,
                  skill: m.skill,
                  questionCount: m.questionCount,
                  selectedGroupIds: ['grp1'],
                })),
        })),
      };
      const resMondaiCount = verifyMixedExamConformity(bp, wrongMondaiCount);
      expect(resMondaiCount.valid).toBe(false);
      expect(resMondaiCount.errors.some((e) => e.includes('Số dạng 問題'))).toBe(true);

      // Mondai type mismatch
      const wrongTypeCand = {
        level: bp.level,
        sections: bp.sections.map((sec) => ({
          code: sec.code,
          mondai: sec.mondai.map((m) => ({
            type: 'comprehension_long' as const, // wrong type
            skill: m.skill,
            questionCount: m.questionCount,
            selectedGroupIds: ['grp1'],
          })),
        })),
      };
      const resType = verifyMixedExamConformity(bp, wrongTypeCand);
      expect(resType.valid).toBe(false);
      expect(resType.errors.some((e) => e.includes('Dạng 問題'))).toBe(true);

      // Mondai question count mismatch
      const wrongQCount = {
        level: bp.level,
        sections: bp.sections.map((sec) => ({
          code: sec.code,
          mondai: sec.mondai.map((m) => ({
            type: m.type,
            skill: m.skill,
            questionCount: m.questionCount + 5, // mismatch
            selectedGroupIds: ['grp1'],
          })),
        })),
      };
      const resQCount = verifyMixedExamConformity(bp, wrongQCount);
      expect(resQCount.valid).toBe(false);
      expect(resQCount.errors.some((e) => e.includes('Số câu hỏi'))).toBe(true);
    });

    it('covers scoring with unrepresented skills', () => {
      // answerKey has no questions for a scoring section
      const emptySectionKey: ExamAnswerKey = {
        examId: '0192f0c0-0000-7000-8000-000000000001',
        version: 1,
        keys: [1, 2],
        skills: ['kanji', 'kanji'],
        mondaiTypes: ['kanji_reading', 'kanji_reading'],
        sectionRanges: [[0, 1]],
      };
      const scoringWithListening: BlueprintScoring = {
        method: 'linear_reference',
        rounding: 'round',
        scoringSections: [
          { code: 'k', label: 'Kanji', skills: ['kanji'], maxScaled: 120, minPass: 38 },
          { code: 'l', label: 'Listening', skills: ['listening'], maxScaled: 60, minPass: 19 }, // 0 questions
        ],
        totalMax: 180,
        totalPass: 80,
      };

      const res = calculateStandardExamResult([1, 2], emptySectionKey, scoringWithListening);
      expect(res.scoring.sections[1]?.rawMax).toBe(0);
      expect(res.scoring.sections[1]?.scaled).toBe(0);
    });
  });
});
