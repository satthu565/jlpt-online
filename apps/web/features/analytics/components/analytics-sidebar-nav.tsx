'use client';

import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  BookOpenCheck,
  BarChart3,
  CalendarRange,
  ScanSearch,
  BookX,
  BrainCircuit,
  Target,
  TrendingUp,
  ChartBar,
  ListChecks,
  History,
  CalendarDays,
  ChevronsUpDown,
} from 'lucide-react';
import type { Level } from '@jlpt/schema';

export interface AnalyticsSidebarNavProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  targetLevel: Level;
  completedExamsCount: number;
  monthlyTargetCount?: number;
  userName?: string;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'assessment', label: 'Khả năng đỗ', icon: ShieldCheck },
  { id: 'knowledge-map', label: 'Bản đồ kiến thức', icon: BookOpenCheck },
  { id: 'frequency', label: 'Kiến thức hay gặp', icon: BarChart3 },
  { id: 'year-trends', label: 'Xu hướng qua năm', icon: CalendarRange },
  { id: 'error-analysis', label: 'Nguyên nhân sai', icon: ScanSearch },
  { id: 'mistake-library', label: 'Kiến thức thường sai', icon: BookX },
  { id: 'mistake-intelligence', label: 'Phân tích nâng cao', icon: BrainCircuit },
  { id: 'priority-matrix', label: 'Ưu tiên ôn tập', icon: Target },
  { id: 'progress', label: 'Tiến bộ', icon: TrendingUp },
  { id: 'skills', label: 'Phân tích kỹ năng', icon: ChartBar },
  { id: 'question-types', label: 'Dạng câu hỏi', icon: ListChecks },
  { id: 'history', label: 'Lịch sử làm đề', icon: History },
  { id: 'activity', label: 'Hoạt động học tập', icon: CalendarDays },
];

export function AnalyticsSidebarNav({
  activeSection,
  onNavigate,
  targetLevel,
  completedExamsCount,
  monthlyTargetCount = 16,
  userName = 'Học viên',
}: AnalyticsSidebarNavProps): React.JSX.Element {
  const [currentSection, setCurrentSection] = useState(activeSection || 'overview');

  useEffect(() => {
    setCurrentSection(activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((e) => e.isIntersecting);
        if (visibleEntry) {
          setCurrentSection(visibleEntry.target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    NAV_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const progressPercent = Math.min(100, Math.round((completedExamsCount / monthlyTargetCount) * 100));
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'AN';

  const handleClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentSection(id);
    onNavigate(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <aside
      className="w-full lg:w-[238px] shrink-0 lg:sticky lg:top-20 self-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4"
      aria-label="Điều hướng thống kê trên trang"
    >
      {/* Navigation Header */}
      <div className="px-2">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
          <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <BrainCircuit className="size-4" aria-hidden="true" />
          </span>
          <span>jlpt</span>
          <span className="text-indigo-600 dark:text-indigo-400">.compass</span>
        </div>
        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mt-4 mb-2">
          TRÊN TRANG NÀY
        </p>
      </div>

      {/* Nav Link List */}
      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleClick(item.id, e)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Monthly Target Box */}
      <div className="hidden lg:block bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/40 rounded-xl p-3.5 text-xs">
        <div className="flex justify-between items-center mb-1">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">🎯 Mục tiêu tháng này</h4>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">{progressPercent}%</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2.5">
          Hoàn thành {monthlyTargetCount} đề thi thử trước kỳ thi tiếp theo.
        </p>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          {/* ui-allow-style: dynamic monthly progress percentage */}
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }} /* ui-allow-style: dynamic monthly progress percentage */
          />
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
          {completedExamsCount} / {monthlyTargetCount} đề đã hoàn thành
        </p>
      </div>

      {/* User Profile Card */}
      <div className="hidden lg:flex items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="size-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{userName}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">JLPT {targetLevel} · Học viên</p>
        </div>
        <ChevronsUpDown className="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
      </div>
    </aside>
  );
}
