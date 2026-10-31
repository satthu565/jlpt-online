"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Star,
} from "lucide-react";
import { Card } from "@jlpt/ui/components/card";
import { Button } from "@jlpt/ui/components/button";
import { useAuth } from "../../../lib/auth-context";
import type { ExamWithUserStatus } from "../types";

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
  const digits = String(value).padStart(2, "0").split("");
  const textClass = isAccent
    ? "text-blue-600 dark:text-blue-400"
    : "text-slate-900 dark:text-slate-100";

  return (
    <div
      className={`p-2 sm:p-2.5 rounded-xl border shadow-2xs overflow-hidden transition-colors ${
        isAccent
          ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/60"
          : "bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80"
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
              className={`inline-block ${mounted ? "animate-digit-flip" : ""} ${textClass}`}
            >
              {digit}
            </span>
          ))}
        </div>
      </div>
      <span
        className={`block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-1.5 ${
          isAccent
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function getNextJlptTime() {
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

function HeroCountdownCard(): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  const [countdownTime, setCountdownTime] = useState(() => ({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    label: "",
  }));

  useEffect(() => {
    setMounted(true);
    setCountdownTime(getNextJlptTime());
    const timer = setInterval(() => {
      setCountdownTime(getNextJlptTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full lg:w-auto shrink-0 flex justify-center lg:justify-end">
      <Card className="w-full sm:w-auto min-w-[320px] sm:min-w-[380px] p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-blue-200/80 dark:border-slate-800 shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
            <span
              className="flex size-2 rounded-full bg-blue-600 animate-pulse"
              aria-hidden="true"
            />
            ĐẾM NGƯỢC KỲ THI JLPT{" "}
            {mounted && countdownTime.label ? countdownTime.label : ""}
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
          <AnimatedCountdownUnit
            value={countdownTime.days}
            label="Ngày"
            mounted={mounted}
          />
          <AnimatedCountdownUnit
            value={countdownTime.hours}
            label="Giờ"
            mounted={mounted}
          />
          <AnimatedCountdownUnit
            value={countdownTime.minutes}
            label="Phút"
            mounted={mounted}
          />
          <AnimatedCountdownUnit
            value={countdownTime.seconds}
            label="Giây"
            isAccent
            mounted={mounted}
          />
        </div>

        {/* Motivating footer */}
        <p className="mt-3 text-[11px] text-center text-slate-500 dark:text-slate-400 font-medium">
          💡 Thời gian không chờ đợi, luyện đề ngay hôm nay để bứt phá điểm số!
        </p>
      </Card>
    </div>
  );
}

export interface ExamHeroProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badgeText?: string;
  inProgressExam?: ExamWithUserStatus | null;
  userStats?: {
    completed: number;
    inProgress: number;
  };
  favoritesCount?: number;
  /** Chỉ hiện tiêu đề, mô tả và khối tìm kiếm trên nền hero (bỏ badge, tiến độ, đếm ngược). */
  minimal?: boolean;
  /** photo: ảnh nền trang chủ; gradient: nền gradient thuần CSS (dùng cho /de-thi). */
  background?: "photo" | "gradient";
  children?: React.ReactNode;
  className?: string;
}

export function ExamHero({
  title,
  subtitle,
  badgeText = "Kho đề thi JLPT chính thức 2010 – 2026",
  inProgressExam,
  userStats,
  favoritesCount = 0,
  minimal = false,
  background = "photo",
  children,
  className = "",
}: ExamHeroProps): React.JSX.Element {
  const { user } = useAuth();

  return (
    <section
      className={`relative overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 pt-10 pb-12 px-4 sm:px-6 ${className}`}
    >
      {/* Aesthetic Japanese Study Background Scene (Balanced Left & Right) */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
        {background === "gradient" ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-indigo-50 to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950" />
            <div className="absolute -top-24 -right-24 size-96 rounded-full bg-blue-300/30 dark:bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-32 -left-24 size-96 rounded-full bg-emerald-300/30 dark:bg-emerald-500/10 blur-3xl" />
          </>
        ) : (
          <picture>
            <source
              media="(max-width: 768px)"
              srcSet="/images/hero-jlpt-bg-mobile.webp"
              type="image/webp"
              width={800}
              height={447}
            />
            <img
              src="/images/hero-jlpt-bg.webp"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              width={1376}
              height={768}
              className="w-full h-full object-cover object-center opacity-90 dark:opacity-25"
            />
          </picture>
        )}
        {/* Soft tint overlay so text and card remain crisp and readable */}
        {background !== "gradient" && (
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
      </div>

      <div className="container relative z-10">
        {/* 1. RESUME EXAM BANNER (Nếu có bài đang làm dở) */}
        {!minimal && inProgressExam && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="size-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                  <span>⚡ Tiếp tục bài thi đang làm dở</span>
                  <span className="text-slate-400 font-normal">•</span>
                  <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">
                    {inProgressExam.level}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {inProgressExam.title}
                </div>
              </div>
            </div>
            <Button
              asChild
              variant="primary"
              size="sm"
              className="h-9 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center gap-1.5"
            >
              <a
                href={`/phong-thi?examId=${inProgressExam.id}`}
                className="no-underline flex items-center gap-1.5"
              >
                <span>Tiếp tục làm ngay</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          </div>
        )}

        {/* Top Row: Title, Subtitle, User Progress on Left + Big Live Countdown Card on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-7">
          <div className="max-w-2xl">
            {!minimal && (
              <>
                {/* Badge: Official exam repository */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/90 dark:bg-blue-950/70 border border-blue-200/90 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-3.5 backdrop-blur-xs shadow-2xs">
                  <span
                    className="flex size-2 rounded-full bg-blue-600 animate-pulse"
                    aria-hidden="true"
                  />
                  <span>{badgeText}</span>
                </div>
              </>
            )}

            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.18]">
              {title || (
                <>
                  Luyện đề JLPT
                  <br />
                  <span className="text-blue-600 dark:text-blue-400">
                    Chinh phục tiếng Nhật
                  </span>
                </>
              )}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              {subtitle ||
                "Kho đề thi JLPT các năm được tổng hợp đầy đủ, giúp bạn làm quen với cấu trúc đề thật và nâng cao kỹ năng tiếng Nhật."}
            </p>

            {!minimal && (
              <>
                {/* USER PROGRESS MINI-STRIP */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  {user ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                        <CheckCircle2
                          className="size-3.5 text-emerald-600"
                          aria-hidden="true"
                        />
                        <span>
                          Đã hoàn thành:{" "}
                          <strong>{userStats?.completed ?? 0} đề</strong>
                        </span>
                      </span>
                      {(userStats?.inProgress ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
                          <Clock
                            className="size-3.5 text-amber-600"
                            aria-hidden="true"
                          />
                          <span>
                            Đang làm:{" "}
                            <strong>{userStats?.inProgress ?? 0} đề</strong>
                          </span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                        <Star
                          className="size-3.5 text-amber-500 fill-amber-500"
                          aria-hidden="true"
                        />
                        <span>
                          Đã lưu: <strong>{favoritesCount} đề</strong>
                        </span>
                      </span>
                    </>
                  ) : (
                    <a
                      href="/dang-nhap"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors"
                    >
                      <span>
                        💡 Đăng nhập để lưu tiến độ, điểm thi và đồng bộ đề yêu
                        thích
                      </span>
                      <ChevronRight className="size-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </>
            )}
          </div>

          {!minimal && <HeroCountdownCard />}
        </div>

        {/* Integrated Search Filter Card Slot */}
        {children}
      </div>
    </section>
  );
}
