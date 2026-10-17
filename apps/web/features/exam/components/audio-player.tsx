'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ListeningTimelineItem, AttemptMode } from '@jlpt/schema';
import { getListeningPlaybackPosition } from '@jlpt/exam-engine';
import { Button, Badge, Alert } from '@jlpt/ui';

export interface AudioPlayerProps {
  timeline: ListeningTimelineItem[] | null;
  sectionStartedAt?: string | null;
  serverOffsetMs?: number;
  mode: AttemptMode; // 'real' | 'practice'
  activeGroupId?: string | null;
  isLocked?: boolean;
  onItemChange?: (itemIndex: number, groupId: string | null) => void;
  onError?: (err: Error) => void;
  initialErrorMessage?: string | null;
  className?: string;
}

export type PlaybackRate = 0.75 | 1.0 | 1.25;

/**
 * Synchronizes audio element playback position if drifted beyond threshold (Acceptance 2, AUDIO-01/04)
 */
export function syncAudioDrift(
  audio: { currentTime: number },
  expectedSec: number,
  thresholdSec = 2.0,
): { synced: boolean; drift: number } {
  const drift = Math.abs(audio.currentTime - expectedSec);
  if (drift > thresholdSec) {
    audio.currentTime = expectedSec;
    return { synced: true, drift };
  }
  return { synced: false, drift };
}

export interface SyncVisibilityDocument {
  visibilityState?: DocumentVisibilityState | string;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

/**
 * Attaches a visibilitychange listener to document that invokes syncFn when document becomes visible.
 * Useful for mobile wake-up / tab return re-synchronization (Acceptance 2, AUDIO-04).
 * Returns a cleanup function that removes the event listener.
 */
export function setupVisibilitySync(
  syncFn: () => void,
  doc?: SyncVisibilityDocument,
): () => void {
  const targetDoc =
    doc ??
    (typeof document !== 'undefined'
      ? (document as unknown as SyncVisibilityDocument)
      : undefined);

  if (!targetDoc || typeof targetDoc.addEventListener !== 'function') return () => {};

  const handleVisibilityChange = () => {
    if (targetDoc.visibilityState === 'visible') {
      syncFn();
    }
  };

  targetDoc.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    if (typeof targetDoc.removeEventListener === 'function') {
      targetDoc.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}

export function AudioPlayer({
  timeline,
  sectionStartedAt,
  serverOffsetMs = 0,
  mode,
  activeGroupId,
  isLocked = false,
  onItemChange,
  onError,
  initialErrorMessage,
  className = '',
}: AudioPlayerProps): React.JSX.Element | null {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const initialIndex = (() => {
    if (activeGroupId && timeline && timeline.length > 0) {
      const idx = timeline.findIndex((t) => t.groupId === activeGroupId);
      if (idx >= 0) return idx;
    }
    return timeline && timeline.length > 0 ? 0 : -1;
  })();

  // Status state
  const [playbackStatus, setPlaybackStatus] = useState<
    'before_start' | 'playing' | 'gap' | 'finished' | 'error' | 'paused'
  >(initialErrorMessage ? 'error' : 'before_start');
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(initialIndex);
  const [currentMediaKey, setCurrentMediaKey] = useState<string | null>(
    initialIndex >= 0 && timeline && timeline[initialIndex] ? timeline[initialIndex].mediaKey : null,
  );
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1.0);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage ?? null);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Reference to prevent unnecessary state triggers
  const lastItemIndexRef = useRef<number>(initialIndex);

  // Calculate elapsed ms in section
  const computeElapsedMs = useCallback((): number => {
    if (!sectionStartedAt) return 0;
    const now = Date.now() + serverOffsetMs;
    const started = new Date(sectionStartedAt).getTime();
    return Math.max(0, now - started);
  }, [sectionStartedAt, serverOffsetMs]);

  // Synchronize playback position based on timeline (Acceptance 2 & AUDIO-01/04)
  const syncWithTimeline = useCallback(() => {
    if (!timeline || timeline.length === 0 || isLocked) return;

    const elapsedMs = computeElapsedMs();
    const position = getListeningPlaybackPosition(timeline, elapsedMs);

    if (position.status === 'finished') {
      setPlaybackStatus('finished');
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      return;
    }

    if (position.status === 'gap') {
      setPlaybackStatus('gap');
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      return;
    }

    if (position.status === 'before_start') {
      setPlaybackStatus('before_start');
      return;
    }

    if (position.status === 'playing' && position.itemIndex >= 0) {
      const item = timeline[position.itemIndex];
      if (!item) return;

      if (position.itemIndex !== lastItemIndexRef.current) {
        lastItemIndexRef.current = position.itemIndex;
        setCurrentItemIndex(position.itemIndex);
        setCurrentMediaKey(position.mediaKey);

        if (onItemChange) {
          onItemChange(position.itemIndex, position.groupId);
        }
      }

      setPlaybackStatus('playing');

      // Audio sync check: if audio element drifted more than 2 seconds, re-sync (Acceptance 2)
      if (audioRef.current) {
        const expectedSec = position.audioOffsetMs / 1000;
        syncAudioDrift(audioRef.current, expectedSec, 2.0);

        if (audioRef.current.paused && mode === 'real') {
          audioRef.current.play().catch(() => {
            // Autoplay prevention catch
          });
        }
      }
    }
  }, [timeline, isLocked, computeElapsedMs, onItemChange, mode]);

  // Periodic timeline check and mobile device wake-up / visibilitychange resync in real exam mode
  useEffect(() => {
    if (mode !== 'real' || !timeline || timeline.length === 0 || isLocked) return;

    syncWithTimeline();
    const timer = setInterval(() => {
      syncWithTimeline();
    }, 1000);

    const cleanupVisibility = typeof document !== 'undefined'
      ? setupVisibilitySync(syncWithTimeline, document)
      : () => {};

    return () => {
      clearInterval(timer);
      cleanupVisibility();
    };
  }, [mode, timeline, isLocked, syncWithTimeline, retryCount]);

  // Handle speed rate change (AUDIO-06: only practice mode)
  const handleRateChange = (rate: PlaybackRate) => {
    if (mode === 'real') return; // AUDIO-04: strict seek/rate restriction in real mode
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Handle replay in practice mode (AUDIO-05)
  const handleReplay = () => {
    if (mode === 'real') return; // Seek restriction in real mode
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setPlaybackStatus('playing');
    }
  };

  // Handle play / pause toggle in practice mode
  const handleTogglePlayPause = () => {
    if (mode === 'real') return; // Candidate cannot pause during real exam
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
      setPlaybackStatus('playing');
    } else {
      audioRef.current.pause();
      setPlaybackStatus('paused');
    }
  };

  // Audio loading error handler (AUDIO-10)
  const handleAudioError = () => {
    const errorText = 'Không thể tải tệp âm thanh. Vui lòng kiểm tra kết nối mạng.';
    setErrorMessage(errorText);
    setPlaybackStatus('error');
    if (onError) {
      onError(new Error(errorText));
    }
  };

  // Retry loading audio (AUDIO-10)
  const handleRetry = () => {
    setErrorMessage(null);
    setRetryCount((prev) => prev + 1);
    if (audioRef.current) {
      audioRef.current.load();
      if (mode === 'real') {
        syncWithTimeline();
      }
    }
  };

  // Time update tracking
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTimeSec(audioRef.current.currentTime);
      setDurationSec(audioRef.current.duration || 0);
    }
  };

  if (!timeline || timeline.length === 0) {
    return null;
  }

  const currentItem = currentItemIndex >= 0 ? timeline[currentItemIndex] : null;
  const totalItems = timeline.length;
  const audioSrc = currentMediaKey ? `/${currentMediaKey}` : (currentItem?.mediaKey ? `/${currentItem.mediaKey}` : '');

  return (
    <section
      className={`jlpt-audio-player bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm ${className}`}
      role="region"
      aria-label="Khung phát âm thanh bài thi nghe"
    >
      {/* Top row: Status, Section info, and Mode badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="Biểu tượng tai nghe">
            🎧
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Âm thanh phần thi nghe
          </span>
          {mode === 'real' ? (
            <Badge variant="danger" size="sm">
              Thi thật: Khóa tua / phát lại
            </Badge>
          ) : (
            <Badge variant="info" size="sm">
              Luyện tập: Tùy chỉnh tốc độ &amp; phát lại
            </Badge>
          )}
        </div>

        {/* Playback status indicator */}
        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
          {playbackStatus === 'playing' && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Đang phát
            </span>
          )}
          {playbackStatus === 'gap' && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Khoảng nghỉ chuyển câu...
            </span>
          )}
          {playbackStatus === 'before_start' && (
            <span className="text-slate-500">Chuẩn bị phát...</span>
          )}
          {playbackStatus === 'finished' && (
            <span className="text-slate-500 font-medium">Đã kết thúc bài nghe</span>
          )}
          {playbackStatus === 'error' && (
            <span className="text-red-500 font-medium">Lỗi âm thanh</span>
          )}
        </div>
      </div>

      {/* Error state (AUDIO-10) */}
      {errorMessage && (
        <Alert variant="error" className="mb-3">
          <div className="flex items-center justify-between gap-2">
            <span>{errorMessage}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              aria-label="Thử tải lại âm thanh"
            >
              🔄 Thử lại
            </Button>
          </div>
        </Alert>
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        onTimeUpdate={handleTimeUpdate}
        onError={handleAudioError}
        preload="auto"
        aria-label="Tệp âm thanh bài nghe"
      />

      {/* Audio playback progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>
            Đoạn {currentItemIndex >= 0 ? currentItemIndex + 1 : 1} / {totalItems}
            {currentItem?.groupId && activeGroupId === currentItem.groupId && (
              <span className="ml-1 text-blue-600 dark:text-blue-400 font-semibold">
                (Đang làm câu này)
              </span>
            )}
          </span>
          <span className="font-mono">
            {formatTime(currentTimeSec)} / {formatTime(durationSec)}
          </span>
        </div>

        {/* Progress bar: in real mode seek is disabled (AUDIO-04) */}
        <div
          className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative"
          role="progressbar"
          aria-valuenow={durationSec > 0 ? Math.round((currentTimeSec / durationSec) * 100) : 0}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-blue-600 transition-all duration-300 rounded-full"
            style={{
              width: `${durationSec > 0 ? (currentTimeSec / durationSec) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        {mode === 'practice' ? (
          /* Practice mode controls (AUDIO-05, AUDIO-06) */
          <>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTogglePlayPause}
                aria-label={playbackStatus === 'playing' ? 'Tạm dừng bài nghe' : 'Phát tiếp bài nghe'}
              >
                {playbackStatus === 'playing' ? '⏸ Tạm dừng' : '▶ Tiếp tục'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReplay}
                aria-label="Phát lại đoạn hiện tại"
              >
                ↺ Phát lại đoạn này
              </Button>
            </div>

            {/* Speed selector (AUDIO-06) */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 mr-1">Tốc độ:</span>
              {([0.75, 1.0, 1.25] as const).map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleRateChange(rate)}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-all ${
                    playbackRate === rate
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                  aria-label={`Tốc độ phát ${rate}x`}
                  aria-pressed={playbackRate === rate}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Real exam mode notice (AUDIO-04) */
          <div className="text-xs text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5">
            <span>🔒</span>
            Âm thanh phát theo trình tự chuẩn kỳ thi. Bạn không thể tua hay phát lại.
          </div>
        )}
      </div>
    </section>
  );
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export interface QuestionAudioPlayerProps {
  mediaKey?: string | null;
  label?: string;
  className?: string;
}

/**
 * Single question audio player for post-submission review (AUDIO-07)
 */
export function QuestionAudioPlayer({
  mediaKey,
  label = 'Nghe lại đoạn audio câu này',
  className = '',
}: QuestionAudioPlayerProps): React.JSX.Element | null {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!mediaKey) return null;

  const handleToggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <audio
        ref={audioRef}
        src={`/${mediaKey}`}
        onEnded={() => setIsPlaying(false)}
        preload="none"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleToggle}
        aria-label={label}
        className="text-xs font-medium"
      >
        {isPlaying ? '⏹ Dừng nghe' : `▶ ${label}`}
      </Button>
    </div>
  );
}
