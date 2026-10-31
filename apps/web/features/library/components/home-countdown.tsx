'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@jlpt/ui/components/card';
import { ChevronRight } from 'lucide-react';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
}

function getNextJlptTime(): CountdownTime {
  const now = new Date();
  const currentYear = now.getFullYear();

  const getFirstSunday = (year: number, monthIndex: number) => {
    const d = new Date(year, monthIndex, 1);
    const day = d.getDay();
    const offset = (7 - day) % 7;
    d.setDate(1 + offset);
    d.setHours(9, 0, 0, 0); // 9:00 AM exam start
    return d;
  };

  let targetDate = getFirstSunday(currentYear, 6); // July
  let label = `Tháng 7/${currentYear}`;

  if (now.getTime() > targetDate.getTime()) {
    targetDate = getFirstSunday(currentYear, 11); // December
    label = `Tháng 12/${currentYear}`;
  }

  if (now.getTime() > targetDate.getTime()) {
    targetDate = getFirstSunday(currentYear + 1, 6); // Next July
    label = `Tháng 7/${currentYear + 1}`;
  }

  const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  return { days, hours, minutes, seconds, label };
}

function AnimatedCountdownUnit({
  value,
  label,
  isAccent = false,
  mounted = true,
}: {
  value: number;
  label: string;
  isAccent?: boolean;
  mounted?: boolean;
}): React.JSX.Element {
  const digits = String(value).padStart(2, '0').split('');
  const textClass = isAccent
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-slate-900 dark:text-slate-100';

  return (
    <div
      className={`p-2 sm:p-2.5 rounded-xl border shadow-2xs overflow-hidden transition-colors ${
        isAccent
          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/60'
          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80'
      }`}
    >
      <div className="relative h-8 sm:h-9 overflow-hidden flex items-center justify-center">
        <div
          suppressHydrationWarning
          className="flex items-center justify-center font-mono text-2xl sm:text-3xl font-black tracking-tight leading-none"
        >
          {digits.map((digit, idx) => (
            <span
              key={mounted ? `${idx}-${digit}` : `${idx}-initial`}
              suppressHydrationWarning
              className={`inline-block ${mounted ? 'animate-digit-flip' : ''} ${textClass}`}
            >
              {digit}
            </span>
          ))}
        </div>
      </div>
      <span
        className={`block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-1.5 ${
          isAccent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function HomeCountdown(): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  const [countdownTime, setCountdownTime] = useState<CountdownTime>(() => getNextJlptTime());

  useEffect(() => {
    // Delay interval start to allow initial paint and hydration to complete without timer interruptions
    let intervalId: NodeJS.Timeout | null = null;
    const timeoutId = setTimeout(() => {
      setMounted(true);
      setCountdownTime(getNextJlptTime());
      intervalId = setInterval(() => {
        setCountdownTime(getNextJlptTime());
      }, 1000);
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="w-full lg:w-auto shrink-0 flex justify-center lg:justify-end">
      <Card className="w-full sm:w-auto min-w-[320px] sm:min-w-[380px] p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-blue-200/80 dark:border-slate-800 shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
            <span className="flex size-2 rounded-full bg-blue-600 animate-pulse" aria-hidden="true" />
            ĐẾM NGƯỢC KỲ THI JLPT {countdownTime.label}
          </span>
          <a
            href="/lich-thi"
            className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-0.5"
          >
            <span>Lịch thi</span>
            <ChevronRight className="size-3" aria-hidden="true" />
          </a>
        </div>

        {/* 4 Digital Timer Blocks with Animated Digit Transitions */}
        <div className="grid grid-cols-4 gap-2 sm:gap-2.5 text-center">
          <AnimatedCountdownUnit value={countdownTime.days} label="Ngày" mounted={mounted} />
          <AnimatedCountdownUnit value={countdownTime.hours} label="Giờ" mounted={mounted} />
          <AnimatedCountdownUnit value={countdownTime.minutes} label="Phút" mounted={mounted} />
          <AnimatedCountdownUnit value={countdownTime.seconds} label="Giây" isAccent mounted={mounted} />
        </div>

        {/* Motivating footer */}
        <p className="mt-3 text-[11px] text-center text-slate-500 dark:text-slate-400 font-medium">
          💡 Thời gian không chờ đợi, luyện đề ngay hôm nay để bứt phá điểm số!
        </p>
      </Card>
    </div>
  );
}
