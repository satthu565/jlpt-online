'use client';

import { AlarmClock, AlertTriangle, BadgeCheck, Bell, BellOff, CalendarDays, MapPin } from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Spinner } from '@jlpt/ui/components/spinner';
import { useI18n } from '../../../lib/i18n';

export interface JlptLocation {
  city: string;
  venue?: string;
  name?: string;
  address?: string;
  website?: string;
  link?: string;
}

export interface JlptScheduleItem {
  id: string;
  title: string;
  examDate: string;
  registrationDeadline: string;
  registrationOpensAt: string | null;
  locations: JlptLocation[];
  officialUrl: string | null;
  levels: string[];
  status: 'draft' | 'published' | 'archived';
  notes: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const LEVEL_OPTIONS = ['ALL', 'N1', 'N2', 'N3', 'N4', 'N5'];

export default function ExamSchedulePage(): React.JSX.Element {
  const { t } = useI18n();

  const [schedules, setSchedules] = useState<JlptScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(false);
  const [reminderStatusMessage, setReminderStatusMessage] = useState<string | null>(null);

  // Initialize reminder setting from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jlpt_schedule_reminders_enabled');
        if (saved === 'true') {
          setRemindersEnabled(true);
        }
      } catch {
        // Ignore storage error
      }
    }
  }, []);

  const fetchSchedules = useCallback(async (level?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = level && level !== 'ALL' ? `?level=${encodeURIComponent(level)}` : '';
      const endpoint = `/api/v1/jlpt-schedules${query}`;
      const res = await fetch(endpoint, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`${t('schedules.errorTitle')} (HTTP ${res.status})`);
      }

      const data = await res.json();
      setSchedules(Array.isArray(data.items) ? data.items : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('schedules.errorTitle');
      setError(msg);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSchedules(selectedLevel);
  }, [fetchSchedules, selectedLevel]);

  const handleToggleReminder = () => {
    const nextState = !remindersEnabled;
    setRemindersEnabled(nextState);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jlpt_schedule_reminders_enabled', String(nextState));
      } catch {
        // Ignore storage error
      }
    }
    const msg = nextState ? t('schedules.reminderEnabled') : t('schedules.reminderDisabled');
    setReminderStatusMessage(msg);
    setTimeout(() => {
      setReminderStatusMessage(null);
    }, 4000);
  };

  const filteredSchedules = useMemo(() => {
    if (selectedLevel === 'ALL') return schedules;
    return schedules.filter((s) => s.levels.includes(selectedLevel));
  }, [schedules, selectedLevel]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      data-testid="schedule-page-container"
      className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1
            data-testid="schedule-page-title"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            {t('schedules.title')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
            {t('schedules.subtitle')}
          </p>
        </div>

        {/* Reminder notification toggle action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Button
            type="button"
            variant={remindersEnabled ? 'primary' : 'outline'}
            size="sm"
            onClick={handleToggleReminder}
            data-testid="schedule-reminder-toggle"
            aria-pressed={remindersEnabled}
            className="flex items-center gap-2 text-xs font-semibold"
          >
            {remindersEnabled ? <Bell className="size-4" aria-hidden="true" /> : <BellOff className="size-4" aria-hidden="true" />}
            <span>{t('schedules.reminderToggle')}</span>
          </Button>
        </div>
      </div>

      {reminderStatusMessage && (
        <Alert
          variant="success"
          data-testid="schedule-reminder-status"
          className="text-xs"
        >
          {reminderStatusMessage}
        </Alert>
      )}

      {/* Level Filter Bar */}
      <div
        data-testid="schedule-level-filter"
        className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800"
      >
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-2">
          {t('schedules.filterLevel')}:
        </span>
        {LEVEL_OPTIONS.map((lvl) => (
          <Button
            key={lvl}
            type="button"
            size="sm"
            variant={selectedLevel === lvl ? 'primary' : 'ghost'}
            onClick={() => setSelectedLevel(lvl)}
            data-testid={`level-filter-${lvl}`}
            className="text-xs font-bold px-3 py-1 min-h-[32px] h-8"
          >
            {lvl === 'ALL' ? t('schedules.allLevels') : lvl}
          </Button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div
          data-testid="schedule-loading"
          className="flex flex-col items-center justify-center py-16 space-y-4"
        >
          <Spinner size="lg" aria-label={t('schedules.loading')} />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('schedules.loading')}</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card
          data-testid="schedule-error"
          className="p-8 text-center border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20"
        >
          <AlertTriangle className="mx-auto mb-3 size-10 text-[var(--color-danger)]" aria-hidden="true" />
          <h2 className="text-lg font-bold text-rose-800 dark:text-rose-300 mb-2">
            {t('schedules.errorTitle')}
          </h2>
          <p className="text-sm text-rose-700 dark:text-rose-400 mb-6">{error}</p>
          <Button
            type="button"
            variant="primary"
            onClick={() => fetchSchedules(selectedLevel)}
            data-testid="schedule-retry-btn"
          >
            {t('common.buttons.retry')}
          </Button>
        </Card>
      )}

      {/* Empty state: Published data is empty */}
      {!loading && !error && filteredSchedules.length === 0 && (
        <Card
          data-testid="schedule-empty-state"
          className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 space-y-4"
        >
          <CalendarDays className="mx-auto size-12 text-[var(--text-muted)]" aria-hidden="true" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {t('schedules.empty')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {t('schedules.emptyDescription')}
          </p>
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleReminder}
              className="text-xs font-semibold"
            >
              <Bell className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('schedules.reminderToggle')}
            </Button>
          </div>
        </Card>
      )}

      {/* Populated state: List of official JLPT schedules */}
      {!loading && !error && filteredSchedules.length > 0 && (
        <div data-testid="schedule-list" className="space-y-6">
          {filteredSchedules.map((schedule) => (
            <Card
              key={schedule.id}
              data-testid={`schedule-card-${schedule.id}`}
              className="p-6 md:p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl space-y-6 transition-all hover:shadow-md"
            >
              {/* Header: Title and Levels */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2
                    data-testid="schedule-title"
                    className="text-xl font-bold text-slate-900 dark:text-slate-100"
                  >
                    {schedule.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2" data-testid="schedule-levels">
                    <span className="text-xs text-slate-500 font-medium">
                      {t('schedules.levels')}:
                    </span>
                    {schedule.levels.map((lvl) => (
                      <Badge key={lvl} variant="primary" className="text-xs font-mono font-bold">
                        {lvl}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Trạng thái đợt thi
                  </span>
                  <Badge variant="success" className="text-xs font-semibold">
                    <BadgeCheck className="inline size-3.5 align-[-2px]" aria-hidden="true" /> Chính thức
                  </Badge>
                </div>
              </div>

              {/* Key Dates Grid: Exam Date & Registration Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 block mb-1">
                    <CalendarDays className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('schedules.examDate')}
                  </span>
                  <strong
                    data-testid="schedule-exam-date"
                    className="text-xl sm:text-2xl font-bold text-blue-950 dark:text-blue-100 font-mono"
                  >
                    {formatDate(schedule.examDate)}
                  </strong>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 block mb-1">
                    <AlarmClock className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('schedules.registrationDeadline')}
                  </span>
                  <strong
                    data-testid="schedule-registration-deadline"
                    className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-100 font-mono"
                  >
                    {formatDateTime(schedule.registrationDeadline)}
                  </strong>
                  {schedule.registrationOpensAt && (
                    <span className="text-xs text-amber-800 dark:text-amber-400 block mt-0.5">
                      (Mở cổng: {formatDateTime(schedule.registrationOpensAt)})
                    </span>
                  )}
                </div>
              </div>

              {/* Exam Locations in Vietnam */}
              {schedule.locations && schedule.locations.length > 0 && (
                <div className="space-y-3" data-testid="schedule-locations">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden="true" /> {t('schedules.locations')}:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {schedule.locations.map((loc, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                          <span>{loc.city}</span>
                          {(loc.website || loc.link) && (
                            <a
                              href={loc.website || loc.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Trang điểm thi ↗
                            </a>
                          )}
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          {loc.venue || loc.name}
                        </p>
                        {loc.address && (
                          <p className="text-slate-500 dark:text-slate-400">
                            {loc.address}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes from organizer */}
              {schedule.notes && (
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1.5">
                    ℹ️ {t('schedules.notes')}:
                  </span>
                  <span>{schedule.notes}</span>
                </div>
              )}

              {/* Official Link */}
              {schedule.officialUrl && (
                <div className="pt-2 flex justify-end">
                  <a
                    href={schedule.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="schedule-official-link"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs"
                  >
                    <span>{t('schedules.officialLink')}</span>
                    <span>↗</span>
                  </a>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
