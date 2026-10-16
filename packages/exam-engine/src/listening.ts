import type { ListeningTimelineItem } from '@jlpt/schema';
import type {
  ListeningPlaybackPosition,
  ListeningTimelineValidationResult,
} from './types.js';

/**
 * Validates a listening timeline against the import v2 and snapshot specification (Acceptance 5)
 *
 * Rules:
 * - Must be a non-empty array of timeline items.
 * - Each item must contain groupId, mediaKey, startMs, endMs, audioStartMs, audioEndMs, gapAfterMs.
 * - Invariant: endMs - startMs === audioEndMs - audioStartMs.
 * - Monotonic timeline: item[i].startMs must be >= (i === 0 ? 0 : item[i - 1].endMs + item[i - 1].gapAfterMs).
 * - Section duration check: timeline duration must not exceed section duration in milliseconds.
 */
export function validateListeningTimeline(
  timeline: ListeningTimelineItem[] | null | undefined,
  sectionDurationSec?: number,
): ListeningTimelineValidationResult {
  const errors: string[] = [];

  if (!timeline || !Array.isArray(timeline)) {
    return { valid: false, errors: ['Listening timeline phải là một mảng đoạn audio.'] };
  }

  if (timeline.length === 0) {
    return { valid: false, errors: ['Listening timeline không được rỗng cho phần thi nghe.'] };
  }

  let previousEndWithGap = 0;

  for (let i = 0; i < timeline.length; i++) {
    const item = timeline[i];
    if (!item) continue;

    const prefix = `Đoạn timeline ${i + 1} (${item.groupId || 'không có groupId'}):`;

    if (!item.groupId || typeof item.groupId !== 'string') {
      errors.push(`${prefix} groupId không hợp lệ.`);
    }

    if (!item.mediaKey || typeof item.mediaKey !== 'string') {
      errors.push(`${prefix} mediaKey không hợp lệ.`);
    }

    if (
      !Number.isInteger(item.startMs) ||
      !Number.isInteger(item.endMs) ||
      !Number.isInteger(item.audioStartMs) ||
      !Number.isInteger(item.audioEndMs) ||
      !Number.isInteger(item.gapAfterMs)
    ) {
      errors.push(`${prefix} Mọi mốc thời gian (startMs, endMs, audioStartMs, audioEndMs, gapAfterMs) phải là số nguyên.`);
      continue;
    }

    if (item.startMs < 0 || item.audioStartMs < 0 || item.gapAfterMs < 0) {
      errors.push(`${prefix} Các giá trị startMs, audioStartMs và gapAfterMs không được âm.`);
    }

    if (item.endMs < item.startMs) {
      errors.push(`${prefix} endMs (${item.endMs}) không được nhỏ hơn startMs (${item.startMs}).`);
    }

    if (item.audioEndMs < item.audioStartMs) {
      errors.push(`${prefix} audioEndMs (${item.audioEndMs}) không được nhỏ hơn audioStartMs (${item.audioStartMs}).`);
    }

    // Crucial import v2 invariance:
    const timelineDuration = item.endMs - item.startMs;
    const audioDuration = item.audioEndMs - item.audioStartMs;
    if (timelineDuration !== audioDuration) {
      errors.push(
        `${prefix} Sai lệch độ dài audio: endMs - startMs (${timelineDuration}ms) phải bằng audioEndMs - audioStartMs (${audioDuration}ms).`,
      );
    }

    // Continuity / monotonicity check:
    if (item.startMs < previousEndWithGap) {
      errors.push(
        `${prefix} startMs (${item.startMs}ms) bắt đầu trước khi đoạn trước kết thúc tính cả gap (${previousEndWithGap}ms).`,
      );
    }

    previousEndWithGap = item.endMs + item.gapAfterMs;
  }

  if (sectionDurationSec !== undefined && sectionDurationSec > 0) {
    const maxSectionMs = sectionDurationSec * 1000;
    const lastItem = timeline[timeline.length - 1];
    if (lastItem && lastItem.endMs > maxSectionMs) {
      errors.push(
        `Tổng thời lượng nghe (${lastItem.endMs}ms) vượt quá thời gian quy định của phần thi (${maxSectionMs}ms).`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Maps server elapsed time in listening section to playback state (SYS-04 & AUDIO-01/04)
 */
export function getListeningPlaybackPosition(
  timeline: ListeningTimelineItem[],
  elapsedMs: number,
): ListeningPlaybackPosition {
  if (!timeline || timeline.length === 0) {
    return {
      status: 'finished',
      itemIndex: -1,
      mediaKey: null,
      groupId: null,
      audioOffsetMs: 0,
    };
  }

  if (elapsedMs < 0) {
    return {
      status: 'before_start',
      itemIndex: -1,
      mediaKey: null,
      groupId: null,
      audioOffsetMs: 0,
    };
  }

  for (let i = 0; i < timeline.length; i++) {
    const item = timeline[i]!;

    if (elapsedMs < item.startMs) {
      // In gap before this item
      return {
        status: 'gap',
        itemIndex: i - 1,
        mediaKey: null,
        groupId: i > 0 ? (timeline[i - 1]?.groupId ?? null) : null,
        audioOffsetMs: 0,
        remainingMsInGap: item.startMs - elapsedMs,
      };
    }

    if (elapsedMs >= item.startMs && elapsedMs < item.endMs) {
      const offsetWithinSegment = elapsedMs - item.startMs;
      return {
        status: 'playing',
        itemIndex: i,
        mediaKey: item.mediaKey,
        groupId: item.groupId,
        audioOffsetMs: item.audioStartMs + offsetWithinSegment,
        remainingMsInItem: item.endMs - elapsedMs,
      };
    }

    const gapEnd = item.endMs + item.gapAfterMs;
    if (elapsedMs >= item.endMs && elapsedMs < gapEnd) {
      return {
        status: 'gap',
        itemIndex: i,
        mediaKey: null,
        groupId: item.groupId,
        audioOffsetMs: 0,
        remainingMsInGap: gapEnd - elapsedMs,
      };
    }
  }

  return {
    status: 'finished',
    itemIndex: timeline.length - 1,
    mediaKey: null,
    groupId: null,
    audioOffsetMs: 0,
  };
}
