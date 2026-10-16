import type { AttemptMode, ResultFlag } from '@jlpt/schema';
import type { TimingEvaluation } from './types.js';

export const DEFAULT_EXAM_GRACE_SEC = 10;
export const DEFAULT_LATE_SYNC_WINDOW_SEC = 600; // 10 minutes
export const DEFAULT_BETWEEN_SECTIONS_MAX_HOURS = 24;

function toEpochMs(input: Date | string | number): number {
  if (typeof input === 'number') return input;
  if (typeof input === 'string') return new Date(input).getTime();
  return input.getTime();
}

/**
 * Calculates section deadline given startedAt and duration in seconds (SYS-04)
 */
export function computeSectionDeadline(
  startedAt: Date | string | number,
  durationSec: number,
): Date {
  const startMs = toEpochMs(startedAt);
  return new Date(startMs + durationSec * 1000);
}

/**
 * Computes offset between server time and client time in milliseconds (SYS-04)
 * offset = serverNow - clientNow
 */
export function computeServerOffset(
  serverNow: Date | string | number,
  clientNow: Date | string | number,
): number {
  return toEpochMs(serverNow) - toEpochMs(clientNow);
}

/**
 * Computes remaining time on client side given deadline and client clock offset (SYS-04)
 */
export function computeClientRemainingMs(
  deadline: Date | string | number,
  serverNow: Date | string | number,
  clientNow: Date | string | number,
): number {
  const deadlineMs = toEpochMs(deadline);
  const offset = computeServerOffset(serverNow, clientNow);
  const estimatedServerNow = toEpochMs(clientNow) + offset;
  return Math.max(0, deadlineMs - estimatedServerNow);
}

/**
 * Calculates actual time spent in seconds (SCORE-06)
 */
export function computeActualTimeSpentSec(
  startedAt: Date | string | number,
  endedAt: Date | string | number = Date.now(),
): number {
  const diffMs = toEpochMs(endedAt) - toEpochMs(startedAt);
  return Math.max(0, Math.round(diffMs / 1000));
}

/**
 * Backward compatibility: simple check whether an exam is expired without grace
 */
export function isExamExpired(
  startedAt: Date | string | number,
  durationMinutes: number,
  now: Date | string | number = new Date(),
): boolean {
  const deadline = new Date(toEpochMs(startedAt) + durationMinutes * 60 * 1000);
  return toEpochMs(now) > deadline.getTime();
}

/**
 * Evaluates submission and sheet update timing against section deadline (Acceptance 1 & SYS-04)
 *
 * Rules:
 * - In 'practice' mode: deadline is advisory. Submissions are never rejected for deadline,
 *   no late_sync flag is applied.
 * - In 'real' mode:
 *   1. delayMs <= 0: ON_TIME, allowed, no flags.
 *   2. 0 < delayMs <= graceSec: GRACE_PERIOD, allowed, no flags (within network transmission grace).
 *   3. graceSec < delayMs <= (graceSec + lateSyncWindowSec): LATE_SYNC, allowed, marked with 'late_sync' flag.
 *   4. delayMs > (graceSec + lateSyncWindowSec): EXPIRED, rejected with DEADLINE_PASSED reason.
 */
export function evaluateSubmissionTiming(params: {
  now: Date | string | number;
  deadline: Date | string | number;
  mode: AttemptMode;
  graceSec?: number;
  lateSyncWindowSec?: number;
}): TimingEvaluation {
  const graceSec = params.graceSec ?? DEFAULT_EXAM_GRACE_SEC;
  const lateSyncWindowSec = params.lateSyncWindowSec ?? DEFAULT_LATE_SYNC_WINDOW_SEC;

  const nowMs = toEpochMs(params.now);
  const deadlineMs = toEpochMs(params.deadline);
  const delayMs = nowMs - deadlineMs;

  if (params.mode === 'practice') {
    return {
      status: 'PRACTICE_OPEN',
      isAllowed: true,
      flags: [],
      delayMs: Math.max(0, delayMs),
      graceRemainingMs: 0,
      lateSyncRemainingMs: 0,
    };
  }

  const graceMs = graceSec * 1000;
  const lateWindowMs = lateSyncWindowSec * 1000;
  const totalWindowMs = graceMs + lateWindowMs;

  if (delayMs <= 0) {
    return {
      status: 'ON_TIME',
      isAllowed: true,
      flags: [],
      delayMs,
      graceRemainingMs: graceMs - delayMs,
      lateSyncRemainingMs: totalWindowMs - delayMs,
    };
  }

  if (delayMs <= graceMs) {
    return {
      status: 'GRACE_PERIOD',
      isAllowed: true,
      flags: [],
      delayMs,
      graceRemainingMs: graceMs - delayMs,
      lateSyncRemainingMs: totalWindowMs - delayMs,
    };
  }

  if (delayMs <= totalWindowMs) {
    const flags: ResultFlag[] = ['late_sync'];
    return {
      status: 'LATE_SYNC',
      isAllowed: true,
      flags,
      delayMs,
      graceRemainingMs: 0,
      lateSyncRemainingMs: totalWindowMs - delayMs,
    };
  }

  return {
    status: 'EXPIRED',
    isAllowed: false,
    flags: ['late_sync'],
    delayMs,
    graceRemainingMs: 0,
    lateSyncRemainingMs: 0,
    reason: 'DEADLINE_PASSED',
  };
}

/**
 * Checks if an attempt has been abandoned beyond maximum allowed pause time between sections
 */
export function isAttemptAbandoned(
  lastActivityAt: Date | string | number,
  now: Date | string | number = Date.now(),
  maxHours: number = DEFAULT_BETWEEN_SECTIONS_MAX_HOURS,
): boolean {
  const diffMs = toEpochMs(now) - toEpochMs(lastActivityAt);
  return diffMs > maxHours * 3600 * 1000;
}

/**
 * Enforces section locking (EXAM-22).
 * In 'real' mode, answers outside currentSectionRange are locked and preserved from existingAnswers.
 * In 'practice' mode, changes to all questions are permitted.
 */
export function applySectionLocking(params: {
  existingAnswers: number[];
  incomingAnswers: number[];
  currentSectionRange: [number, number];
  mode: AttemptMode;
}): number[] {
  const { existingAnswers, incomingAnswers, currentSectionRange, mode } = params;

  if (mode === 'practice') {
    return [...incomingAnswers];
  }

  const [startIdx, endIdx] = currentSectionRange;
  const maxLen = Math.max(existingAnswers.length, incomingAnswers.length);
  const result: number[] = new Array(maxLen).fill(0);

  for (let i = 0; i < maxLen; i++) {
    if (i >= startIdx && i <= endIdx) {
      result[i] = incomingAnswers[i] ?? 0;
    } else {
      result[i] = existingAnswers[i] ?? 0;
    }
  }

  return result;
}
