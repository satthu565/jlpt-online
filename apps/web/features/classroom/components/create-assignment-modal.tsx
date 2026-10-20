'use client';

import React, { useState } from 'react';
import { Modal } from '@jlpt/ui/components/modal';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';
import { Alert } from '@jlpt/ui/components/alert';
import type { ClassMember, CreateAssignmentInput } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface CreateAssignmentModalProps {
  isOpen: boolean;
  classId: string;
  members: ClassMember[];
  onClose: () => void;
  onSubmit: (input: CreateAssignmentInput) => Promise<void>;
}

export function CreateAssignmentModal({
  isOpen,
  members,
  onClose,
  onSubmit,
}: CreateAssignmentModalProps): React.JSX.Element {
  const { t } = useI18n();

  const [title, setTitle] = useState('');
  const [examId, setExamId] = useState('exam-n3-2023-07');
  const [targetScope, setTargetScope] = useState<'all' | 'custom'>('all');
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([]);
  const [opensAt, setOpensAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLearner = (userId: string) => {
    if (selectedLearnerIds.includes(userId)) {
      setSelectedLearnerIds(selectedLearnerIds.filter((id) => id !== userId));
    } else {
      setSelectedLearnerIds([...selectedLearnerIds, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('classroom.assignment.missingTitle'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        examId: examId.trim() || undefined,
        opensAtUTC: new Date(opensAt).toISOString(),
        dueAtUTC: new Date(dueAt).toISOString(),
        learnerIds: targetScope === 'custom' ? selectedLearnerIds : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('classroom.assignment.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('classroom.assignment.modalTitle')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div>
          <label htmlFor="assign-title-input" className="block mb-1 font-semibold text-sm">
            {t('classroom.assignment.titleLabel')} *
          </label>
          <Input
            id="assign-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('classroom.assignment.titlePlaceholder')}
            required
            data-testid="assign-title-input"
          />
        </div>

        <div>
          <label htmlFor="assign-exam-select" className="block mb-1 font-semibold text-sm">
            {t('classroom.assignment.examLabel')}
          </label>
          <Select
            id="assign-exam-select"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            options={[
              { value: 'exam-n3-2023-07', label: 'JLPT N3 - Tháng 07/2023' },
              { value: 'exam-n2-2023-12', label: 'JLPT N2 - Tháng 12/2023' },
              { value: 'exam-n1-2023-07', label: 'JLPT N1 - Tháng 07/2023' },
              { value: 'mix-weakness-auto', label: 'Đề tự động theo điểm yếu lớp học (Mix)' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="assign-opens-at" className="block mb-1 font-semibold text-sm">
              {t('classroom.assignment.opensAtLabel')}
            </label>
            <Input
              id="assign-opens-at"
              type="datetime-local"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="assign-due-at" className="block mb-1 font-semibold text-sm">
              {t('classroom.assignment.dueAtLabel')}
            </label>
            <Input
              id="assign-due-at"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="assign-scope-select" className="block mb-1 font-semibold text-sm">
            {t('classroom.assignment.targetScope')}
          </label>
          <Select
            id="assign-scope-select"
            value={targetScope}
            onChange={(e) => setTargetScope(e.target.value as 'all' | 'custom')}
            options={[
              { value: 'all', label: t('classroom.assignment.allLearners', { count: String(members.length) }) },
              { value: 'custom', label: t('classroom.assignment.selectedLearnersOnly') },
            ]}
          />
        </div>

        {targetScope === 'custom' && (
          <div className="max-h-44 overflow-y-auto border border-[var(--border-subtle)] rounded-md p-2">
            {members.map((m) => (
              <label
                key={m.userId}
                className="flex items-center gap-2 p-1.5 cursor-pointer hover:bg-[var(--bg-muted)] rounded"
              >
                <Input
                  type="checkbox"
                  checked={selectedLearnerIds.includes(m.userId)}
                  onChange={() => toggleLearner(m.userId)}
                  aria-label={m.name || m.email}
                  className="size-4 min-h-0 cursor-pointer"
                />
                <span className="text-sm">{m.name || m.email}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.buttons.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={submitting} data-testid="submit-assignment-button">
            {t('classroom.assignment.submitButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
