/**
 * Listening Playback Position Utilities
 * Pure functions for calculating audio playback segment, gap, and offset from timeline.
 * Self-contained in web app to avoid pulling heavy engine packages into Client SSR bundle.
 */

import type { ListeningTimelineItem } from '@jlpt/schema';

export interface ListeningPlaybackPosition {
  status: 'before_start' | 'playing' | 'gap' | 'finished';
  itemIndex: number;
  mediaKey: string | null;
  groupId: string | null;
  audioOffsetMs: number;
  remainingMsInItem?: number;
  remainingMsInGap?: number;
}

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
    groupId: timeline[timeline.length - 1]?.groupId ?? null,
    audioOffsetMs: 0,
  };
}
