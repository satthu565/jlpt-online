'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

export interface UseCountdownTimerOptions {
  deadline: string | null;
  serverNow: string;
  clientStartedAt?: number;
  onExpire?: () => void;
  enabled?: boolean;
}

export interface CountdownTimerResult {
  remainingMs: number;
  remainingSec: number;
  formattedTime: string;
  isWarning5Min: boolean;
  isCritical1Min: boolean;
  isExpired: boolean;
}

export function formatSecondsToTime(totalSec: number): string {
  const safeSec = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = safeSec % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function useCountdownTimer({
  deadline,
  serverNow,
  onExpire,
  enabled = true,
}: UseCountdownTimerOptions): CountdownTimerResult {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const hasExpiredRef = useRef(false);
  // Retain the offset between ticks; recomputing it cancels elapsed time.
  const anchor = useMemo(() => ({ server: Date.parse(serverNow), client: Date.now() }), [serverNow]);

  const calculateRemaining = (): number => {
    if (!deadline || !enabled) return 0;
    return Math.max(0, Date.parse(deadline) - (anchor.server + Date.now() - anchor.client));
  };

  const [remainingMs, setRemainingMs] = useState<number>(() => calculateRemaining());

  useEffect(() => {
    if (!deadline || !enabled) return;

    hasExpiredRef.current = false;
    const update = () => {
      const ms = calculateRemaining();
      setRemainingMs(ms);

      if (ms <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline, serverNow, enabled]);

  const remainingSec = Math.ceil(remainingMs / 1000);
  const isWarning5Min = remainingSec > 0 && remainingSec <= 300; // <= 5 minutes
  const isCritical1Min = remainingSec > 0 && remainingSec <= 60; // <= 1 minute
  const isExpired = remainingSec <= 0 && Boolean(deadline);

  return {
    remainingMs,
    remainingSec,
    formattedTime: formatSecondsToTime(remainingSec),
    isWarning5Min,
    isCritical1Min,
    isExpired,
  };
}
