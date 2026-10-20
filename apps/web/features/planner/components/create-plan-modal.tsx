'use client';

import React, { useState } from 'react';
import { Modal } from '@jlpt/ui/components/modal';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';
import { Alert } from '@jlpt/ui/components/alert';
import type { JLPTLevel, JLPTSkill, CreateStudyPlanInput } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateStudyPlanInput) => Promise<void>;
}

export function CreatePlanModal({
  isOpen,
  onClose,
  onSubmit,
}: CreatePlanModalProps): React.JSX.Element {
  const { t } = useI18n();

  const [targetLevel, setTargetLevel] = useState<JLPTLevel>('N3');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  });
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [durationDays, setDurationDays] = useState(60);
  const [focusSkills, setFocusSkills] = useState<JLPTSkill[]>([
    'vocabulary',
    'grammar',
    'reading',
    'listening',
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = (skill: JLPTSkill) => {
    if (focusSkills.includes(skill)) {
      if (focusSkills.length > 1) {
        setFocusSkills(focusSkills.filter((s) => s !== skill));
      }
    } else {
      setFocusSkills([...focusSkills, skill]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate) {
      setError(t('planner.create.missingDate'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        targetLevel,
        targetDate,
        dailyMinutes: Number(dailyMinutes),
        durationDays: Number(durationDays),
        focusSkills,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('planner.create.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('planner.create.title')}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Target Level */}
        <div>
          <label className="block mb-1 font-semibold" htmlFor="plan-target-level">
            {t('planner.create.targetLevel')}
          </label>
          <Select
            id="plan-target-level"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value as JLPTLevel)}
            options={[
              { value: 'N1', label: 'JLPT N1' },
              { value: 'N2', label: 'JLPT N2' },
              { value: 'N3', label: 'JLPT N3' },
              { value: 'N4', label: 'JLPT N4' },
              { value: 'N5', label: 'JLPT N5' },
            ]}
          />
        </div>

        {/* Target Exam Date */}
        <div>
          <label className="block mb-1 font-semibold" htmlFor="plan-target-date">
            {t('planner.create.targetDate')}
          </label>
          <Input
            id="plan-target-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            required
          />
        </div>

        {/* Daily Study Minutes */}
        <div>
          <label className="block mb-1 font-semibold" htmlFor="plan-daily-minutes">
            {t('planner.create.dailyMinutes')}
          </label>
          <Select
            id="plan-daily-minutes"
            value={String(dailyMinutes)}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
            options={[
              { value: '15', label: '15 phút/ngày' },
              { value: '30', label: '30 phút/ngày (Khuyến nghị)' },
              { value: '45', label: '45 phút/ngày' },
              { value: '60', label: '60 phút/ngày' },
              { value: '90', label: '90 phút/ngày' },
            ]}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block mb-1 font-semibold" htmlFor="plan-duration-days">
            {t('planner.create.durationDays')}
          </label>
          <Select
            id="plan-duration-days"
            value={String(durationDays)}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            options={[
              { value: '30', label: '30 ngày (Cấp tốc)' },
              { value: '60', label: '60 ngày (Tiêu chuẩn)' },
              { value: '90', label: '90 ngày (Dài hạn vững chắc)' },
            ]}
          />
        </div>

        {/* Focus Skills */}
        <div>
          <span className="block mb-2 font-semibold">
            {t('planner.create.focusSkills')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(['vocabulary', 'grammar', 'reading', 'listening'] as JLPTSkill[]).map((sk) => {
              const checked = focusSkills.includes(sk);
              return (
                <label
                  key={sk}
                  className={`flex cursor-pointer items-center gap-2 rounded-[6px] border border-[var(--border-subtle)] px-3 py-2 ${checked ? 'bg-[var(--bg-muted)]' : 'bg-transparent'}`}
                >
                  <Input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSkill(sk)}
                    aria-label={t(`planner.skills.${sk}`)}
                    className="h-4 w-4 min-h-0 cursor-pointer"/>
                  <span className="text-sm">{t(`planner.skills.${sk}`)}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.buttons.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={submitting} data-testid="submit-create-plan">
            {t('planner.create.submitButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
