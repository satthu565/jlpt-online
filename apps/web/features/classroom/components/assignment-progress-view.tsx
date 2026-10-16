'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Alert } from '@jlpt/ui';
import type { AssignmentAnalytics, AssignmentSubmission } from '../types';
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
      <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <CardTitle>{t('classroom.analytics.title')}</CardTitle>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            ID: {analytics.assignmentId}
          </span>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕ {t('common.buttons.close')}
          </Button>
        )}
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {supplementFeedback && (
          <Alert variant="info" onClose={() => setSupplementFeedback(null)}>
            {supplementFeedback}
          </Alert>
        )}

        {/* Analytics Summary Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
          }}
        >
          <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: 'var(--bg-muted)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
              {t('classroom.analytics.submissionRate')}
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {analytics.submissionRate}%
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              ({analytics.submissionCount}/{analytics.totalLearners})
            </span>
          </div>

          <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: 'var(--bg-muted)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
              {t('classroom.analytics.averageScore')}
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {analytics.averageScore}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              / 180
            </span>
          </div>

          <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: 'var(--bg-muted)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
              {t('classroom.analytics.passRate')}
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>
              {analytics.passRate}%
            </span>
          </div>

          <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: 'var(--bg-muted)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
              {t('classroom.analytics.scoreRange')}
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
              {analytics.lowestScore} - {analytics.highestScore}
            </span>
          </div>
        </div>

        {/* Action: Create Supplement for Failing Learners */}
        {failingLearnerIds.length > 0 && onSupplement && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              ⚠️ {t('classroom.analytics.failingNotice', { count: String(failingLearnerIds.length) })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateSupplement}
              loading={supplementing}
              data-testid="create-supplement-button"
            >
              📝 {t('classroom.analytics.createSupplement')}
            </Button>
          </div>
        )}

        {/* Submissions Table */}
        <div>
          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
            {t('classroom.analytics.submissionsList')}
          </h4>

          {analytics.submissions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('classroom.analytics.noSubmissionsYet')}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>{t('classroom.analytics.learner')}</th>
                    <th style={{ padding: '0.5rem' }}>{t('classroom.analytics.score')}</th>
                    <th style={{ padding: '0.5rem' }}>{t('classroom.analytics.result')}</th>
                    <th style={{ padding: '0.5rem' }}>{t('classroom.analytics.submittedAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.submissions.map((sub) => (
                    <tr
                      key={sub.attemptId}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      data-testid={`submission-row-${sub.learnerId}`}
                    >
                      <td style={{ padding: '0.5rem' }}>
                        <div>{sub.learnerName || sub.learnerEmail || sub.learnerId}</div>
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                        {sub.score !== undefined ? `${sub.score}/180` : '-'}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <Badge variant={sub.passed ? 'success' : 'error'}>
                          {sub.passed ? t('classroom.analytics.passed') : t('classroom.analytics.failed')}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
