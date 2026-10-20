'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@jlpt/ui/components/table';
import { EmptyState } from '@jlpt/ui/components/empty-state';
import { X, AlertTriangle, FileText } from 'lucide-react';
import type { AssignmentAnalytics } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface AssignmentProgressViewProps {
  analytics: AssignmentAnalytics;
  onSupplement?: (learnerIds: string[]) => Promise<void>;
  onClose?: () => void;
}

export function AssignmentProgressView({
  analytics,
  onSupplement,
  onClose,
}: AssignmentProgressViewProps): React.JSX.Element {
  const { t } = useI18n();

  const [supplementing, setSupplementing] = useState(false);
  const [supplementFeedback, setSupplementFeedback] = useState<string | null>(null);

  // Learners who failed or haven't submitted
  const failingLearnerIds = analytics.submissions
    .filter((s) => s.passed === false)
    .map((s) => s.learnerId);

  const handleCreateSupplement = async () => {
    if (!onSupplement || failingLearnerIds.length === 0) return;
    setSupplementing(true);
    setSupplementFeedback(null);
    try {
      await onSupplement(failingLearnerIds);
      setSupplementFeedback(t('classroom.assignment.supplementSuccess', { count: String(failingLearnerIds.length) }));
    } catch {
      setSupplementFeedback(t('classroom.assignment.supplementError'));
    } finally {
      setSupplementing(false);
    }
  };

  return (
    <Card data-testid="assignment-progress-view">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>{t('classroom.analytics.title')}</CardTitle>
          <span className="text-sm text-[var(--text-muted)]">
            ID: {analytics.assignmentId}
          </span>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="flex items-center gap-1">
            <X className="size-4" />
            <span>{t('common.buttons.close')}</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {supplementFeedback && (
          <Alert variant="info" onClose={() => setSupplementFeedback(null)}>
            {supplementFeedback}
          </Alert>
        )}

        {/* Analytics Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[var(--bg-muted)] text-center">
            <span className="text-xs text-[var(--text-muted)] block">
              {t('classroom.analytics.submissionRate')}
            </span>
            <span className="text-2xl font-extrabold text-[var(--color-primary)]">
              {analytics.submissionRate}%
            </span>
            <span className="text-xs text-[var(--text-secondary)] block">
              ({analytics.submissionCount}/{analytics.totalLearners})
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bg-muted)] text-center">
            <span className="text-xs text-[var(--text-muted)] block">
              {t('classroom.analytics.averageScore')}
            </span>
            <span className="text-2xl font-extrabold text-[var(--color-primary)]">
              {analytics.averageScore}
            </span>
            <span className="text-xs text-[var(--text-secondary)] block">
              / 180
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bg-muted)] text-center">
            <span className="text-xs text-[var(--text-muted)] block">
              {t('classroom.analytics.passRate')}
            </span>
            <span className="text-2xl font-extrabold text-[var(--color-success,#16a34a)]">
              {analytics.passRate}%
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bg-muted)] text-center">
            <span className="text-xs text-[var(--text-muted)] block">
              {t('classroom.analytics.scoreRange')}
            </span>
            <span className="text-2xl font-extrabold text-[var(--text-secondary)]">
              {analytics.lowestScore} - {analytics.highestScore}
            </span>
          </div>
        </div>

        {/* Action: Create Supplement for Failing Learners */}
        {failingLearnerIds.length > 0 && onSupplement && (
          <div className="flex justify-between items-center p-3 sm:px-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <span className="text-sm text-[var(--text-primary)] flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-500 shrink-0" />
              {t('classroom.analytics.failingNotice', { count: String(failingLearnerIds.length) })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateSupplement}
              loading={supplementing}
              data-testid="create-supplement-button"
              className="flex items-center gap-1.5"
            >
              <FileText className="size-3.5" />
              <span>{t('classroom.analytics.createSupplement')}</span>
            </Button>
          </div>
        )}

        {/* Submissions Table */}
        <div>
          <h4 className="m-0 mb-3 text-[var(--text-primary)] text-base font-semibold">
            {t('classroom.analytics.submissionsList')}
          </h4>

          {analytics.submissions.length === 0 ? (
            <EmptyState
              variant="empty"
              title={t('classroom.analytics.noSubmissionsYet')}
              minHeight="sm"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('classroom.analytics.learner')}</TableHead>
                  <TableHead>{t('classroom.analytics.score')}</TableHead>
                  <TableHead>{t('classroom.analytics.result')}</TableHead>
                  <TableHead>{t('classroom.analytics.submittedAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.submissions.map((sub) => (
                  <TableRow
                    key={sub.attemptId}
                    data-testid={`submission-row-${sub.learnerId}`}
                  >
                    <TableCell>
                      <div>{sub.learnerName || sub.learnerEmail || sub.learnerId}</div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {sub.score !== undefined ? `${sub.score}/180` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.passed ? 'success' : 'error'}>
                        {sub.passed ? t('classroom.analytics.passed') : t('classroom.analytics.failed')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)]">
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
