'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Modal } from '@jlpt/ui/components/modal';
import { Alert } from '@jlpt/ui/components/alert';
import { Select } from '@jlpt/ui/components/select';
import { EmptyState } from '@jlpt/ui/components/empty-state';
import { Lock, MessageSquare, Flag, Trash2 } from 'lucide-react';
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
        <CardContent className="p-10 text-center">
          <EmptyState
            variant="empty"
            icon={Lock}
            title={t('community.discussions.gatedTitle')}
            description={t('community.discussions.gatedDescription')}
            minHeight="sm"
          />
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
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="size-5 text-[var(--color-primary)]" />
          <span>{t('community.discussions.title', { count: String(comments.length) })}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {feedback && (
          <Alert variant="info" onClose={() => setFeedback(null)}>
            {feedback}
          </Alert>
        )}

        {/* Add Comment Box */}
        <form onSubmit={handlePost} className="flex gap-3">
          <div className="flex-1">
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
          <EmptyState
            variant="empty"
            title={t('community.discussions.noCommentsYet')}
            minHeight="sm"
          />
        ) : (
          <div className="flex flex-col gap-4">
            {comments.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-subtle)]"
                data-testid={`comment-item-${c.id}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{c.userName}</span>
                    {c.isModerator && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-white">
                        {t('community.discussions.moderatorBadge')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="m-0 mb-3 text-sm text-[var(--text-primary)]">
                  {c.content}
                </p>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReportingCommentId(c.id)}
                    aria-label={t('community.discussions.reportButton')}
                    data-testid={`report-comment-${c.id}`}
                    className="text-xs text-[var(--text-muted)] hover:text-amber-500 flex items-center gap-1"
                  >
                    <Flag className="size-3" />
                    <span>{t('community.discussions.reportButton')}</span>
                  </Button>

                  {onDeleteComment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteComment(c.id)}
                      aria-label={t('common.buttons.delete')}
                      className="text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3" />
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
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="report-reason-select" className="block mb-1 font-semibold text-sm">
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
                <label htmlFor="report-detail-input" className="block mb-1 font-semibold text-sm">
                  {t('community.discussions.reportDetailLabel')}
                </label>
                <Input
                  id="report-detail-input"
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder={t('community.discussions.reportDetailPlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
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
