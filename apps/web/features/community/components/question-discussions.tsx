'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Modal } from '@jlpt/ui/components/modal';
import { Alert } from '@jlpt/ui/components/alert';
import { Select } from '@jlpt/ui/components/select';
import type { DiscussionComment } from '../types';
import { useI18n } from '../../../lib/i18n';

export type CommentReportReason = 'spam' | 'spoiler' | 'harassment' | 'wrong_answer' | 'other';

export interface QuestionDiscussionsProps {
  questionId: string;
  isCompleted: boolean;
  comments: DiscussionComment[];
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onReportComment: (commentId: string, reason: CommentReportReason, details?: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

export function QuestionDiscussions({
  questionId: _questionId,
  isCompleted,
  comments,
  onAddComment,
  onReportComment,
  onDeleteComment,
}: QuestionDiscussionsProps): React.JSX.Element {
  const { t } = useI18n();

  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<CommentReportReason>('spoiler');
  const [reportDetail, setReportDetail] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Anti-leak completion gating
  if (!isCompleted) {
    return (
      <Card data-testid="discussion-gated-card">
        <CardContent style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            {t('community.discussions.gatedTitle')}
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
            {t('community.discussions.gatedDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(commentText.trim());
      setCommentText('');
      setFeedback(t('community.discussions.postedSuccess'));
    } catch {
      setFeedback(t('community.discussions.postedError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!reportingCommentId) return;
    try {
      await onReportComment(reportingCommentId, reportReason, reportDetail);
      setReportingCommentId(null);
      setReportDetail('');
      setFeedback(t('community.discussions.reportSuccess'));
    } catch {
      setFeedback(t('community.discussions.reportError'));
    }
  };

  return (
    <Card data-testid="question-discussions-view">
      <CardHeader>
        <CardTitle style={{ fontSize: '1.25rem' }}>
          💬 {t('community.discussions.title', { count: String(comments.length) })}
        </CardTitle>
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {feedback && (
          <Alert variant="info" onClose={() => setFeedback(null)}>
            {feedback}
          </Alert>
        )}

        {/* Add Comment Box */}
        <form onSubmit={handlePost} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <Input
              id="discussion-comment-input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('community.discussions.inputPlaceholder')}
              aria-label={t('community.discussions.inputPlaceholder')}
              required
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            data-testid="post-comment-button"
          >
            {t('community.discussions.submitButton')}
          </Button>
        </form>

        {/* Comments List */}
        {comments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
            {t('community.discussions.noCommentsYet')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {comments.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '1rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
                data-testid={`comment-item-${c.id}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.userName}</span>
                    {c.isModerator && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-primary)',
                          color: '#fff',
                        }}
                      >
                        {t('community.discussions.moderatorBadge')}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  {c.content}
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReportingCommentId(c.id)}
                    aria-label={t('community.discussions.reportButton')}
                    data-testid={`report-comment-${c.id}`}
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                  >
                    🚩 {t('community.discussions.reportButton')}
                  </Button>

                  {onDeleteComment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteComment(c.id)}
                      aria-label={t('common.buttons.delete')}
                      style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}
                    >
                      🗑️
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Report Modal */}
        {reportingCommentId && (
          <Modal
            isOpen={Boolean(reportingCommentId)}
            onClose={() => setReportingCommentId(null)}
            title={t('community.discussions.reportModalTitle')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="report-reason-select" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                  {t('community.discussions.reportReasonLabel')}
                </label>
                <Select
                  id="report-reason-select"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as CommentReportReason)}
                  options={[
                    { value: 'spoiler', label: t('community.discussions.reasonSpoiler') },
                    { value: 'wrong_answer', label: t('community.discussions.reasonWrongAnswer') },
                    { value: 'spam', label: t('community.discussions.reasonSpam') },
                    { value: 'harassment', label: t('community.discussions.reasonHarassment') },
                    { value: 'other', label: t('community.discussions.reasonOther') },
                  ]}
                />
              </div>

              <div>
                <label htmlFor="report-detail-input" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                  {t('community.discussions.reportDetailLabel')}
                </label>
                <Input
                  id="report-detail-input"
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder={t('community.discussions.reportDetailPlaceholder')}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="outline" onClick={() => setReportingCommentId(null)}>
                  {t('common.buttons.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleReport}
                  data-testid="submit-report-button"
                >
                  {t('community.discussions.submitReport')}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </CardContent>
    </Card>
  );
}
