'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  QuestionDiscussions,
  AchievementShareCard,
  defaultCommunityClient,
  type DiscussionComment,
  type AchievementShareData,
} from '../../../features/community';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Card, CardContent } from '@jlpt/ui/components/card';
import { Input } from '@jlpt/ui/components/input';
import { PageHeader } from '@jlpt/ui/components/page-header';
import { EmptyState } from '@jlpt/ui/components/empty-state';
import { Search } from 'lucide-react';
import Link from 'next/link';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function DiscussionsPage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();

  const [questionId, setQuestionId] = useState<string>('');
  const [inputQuestionId, setInputQuestionId] = useState<string>('');
  const [availableQuestions, setAvailableQuestions] = useState<
    Array<{ id: string; stem?: string | null; level?: string | null }>
  >([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [achievement] = useState<AchievementShareData | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Check URL params on mount or fetch available discussable questions from user's completed exams
  useEffect(() => {
    let active = true;
    let initialQ = '';

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('questionId');
      if (q && UUID_REGEX.test(q)) {
        initialQ = q;
        setQuestionId(q);
        setInputQuestionId(q);
      }
    }

    if (user) {
      defaultCommunityClient
        .getDiscussableQuestions()
        .then((res) => {
          if (!active) return;
          const items = res.items || [];
          setAvailableQuestions(items);
          if (!initialQ && items.length > 0 && items[0]?.id) {
            setQuestionId(items[0].id);
            setInputQuestionId(items[0].id);
          }
        })
        .catch(() => {
          // If unauthenticated or error, ignore
        });
    }

    return () => {
      active = false;
    };
  }, [user]);

  const loadDiscussions = useCallback(async (qId: string) => {
    if (!qId || !UUID_REGEX.test(qId)) return;
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const res = await defaultCommunityClient.getQuestionDiscussions(qId);
      setIsCompleted(res.allowed !== false);
      setComments(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('UNAUTHENTICATED') ||
        msg.includes('Yêu cầu đăng nhập')
      ) {
        setIsUnauthorized(true);
        setIsCompleted(false);
        setComments([]);
      } else {
        setError(msg || t('common.status.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (questionId && UUID_REGEX.test(questionId)) {
      loadDiscussions(questionId);
    }
  }, [questionId, loadDiscussions]);

  const handlePostComment = async (content: string, parentId?: string) => {
    setError(null);
    try {
      const created = await defaultCommunityClient.postQuestionComment(
        questionId,
        content,
        parentId,
      );
      setComments((prev) => [created, ...prev]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể đăng bình luận.');
      throw err;
    }
  };

  const handleReportComment = async (
    commentId: string,
    reason: 'spam' | 'spoiler' | 'harassment' | 'wrong_answer' | 'other',
    details?: string,
  ) => {
    try {
      await defaultCommunityClient.reportComment(commentId, reason, details);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, isReported: true } : c)),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể báo cáo bình luận.');
    }
  };

  const handleShareAchievement = async () => {
    if (!achievement) return;
    try {
      await defaultCommunityClient.createAchievementShare({
        type: achievement.type,
        title: achievement.title,
        badge: achievement.badge,
        level: achievement.level,
        achievedAt: achievement.achievedAt,
        userName: achievement.userName,
      });
      setShareNotice('Đã chia sẻ thành tích lên cộng đồng học viên JLPT Online!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể chia sẻ thành tích.');
    }
  };

  const handleSelectQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputQuestionId.trim();
    if (!trimmed) {
      setError('Vui lòng nhập mã câu hỏi.');
      return;
    }
    if (!UUID_REGEX.test(trimmed)) {
      setError('Mã câu hỏi phải đúng định dạng UUID hợp lệ (ví dụ: 0192f000-0000-7000-8000-000000000001).');
      return;
    }
    setError(null);
    setQuestionId(trimmed);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 w-full">
      <PageHeader
        title={t('community.discussions.pageTitle')}
        description={t('community.discussions.pageSubtitle')}
        className="mb-8"
      />

      {(!user || isUnauthorized) && (
        <Alert variant="warning" className="mb-6">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span>{t('community.discussions.authRequired')}</span>
            <Link href="/dang-nhap?redirect=/thao-luan">
              <Button size="sm" variant="primary">{t('community.discussions.signInButton')}</Button>
            </Link>
          </div>
        </Alert>
      )}

      {error && !isUnauthorized && (
        <Alert variant="error" onClose={() => setError(null)} className="mb-6">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => questionId && loadDiscussions(questionId)}>
              {t('common.buttons.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {shareNotice && (
        <Alert variant="success" onClose={() => setShareNotice(null)} className="mb-6">
          {shareNotice}
        </Alert>
      )}

      {/* Question Selector Card */}
      <Card className="mb-8">
        <CardContent className="p-5">
          <form onSubmit={handleSelectQuestion} className="flex gap-3 items-center flex-wrap">
            <span className="font-semibold text-sm flex items-center gap-1.5 text-[var(--text-primary)]">
              <Search className="size-4 text-[var(--color-primary)]" />
              Mã câu hỏi cần thảo luận:
            </span>
            <div className="flex-1 min-w-[180px]">
              <Input
                placeholder="Nhập mã câu hỏi (UUID)..."
                value={inputQuestionId}
                onChange={(e) => setInputQuestionId(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Xem thảo luận
            </Button>
          </form>

          {availableQuestions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <span className="text-sm font-semibold text-[var(--text-secondary)]">
                Câu hỏi từ các bài thi đã làm của bạn:
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableQuestions.map((q, idx) => (
                  <Button
                    key={q.id}
                    type="button"
                    variant={questionId === q.id ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setQuestionId(q.id);
                      setInputQuestionId(q.id);
                    }}
                  >
                    Câu {idx + 1} {q.level ? `(${q.level})` : ''}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievement Share Banner */}
      {achievement && (
        <div className="mb-8">
          <AchievementShareCard
            data={achievement}
            onCopyLink={handleShareAchievement}
          />
        </div>
      )}

      {loading && (
        <EmptyState
          variant="loading"
          title={t('common.status.loading')}
          description="Đang tải thảo luận..."
          minHeight="sm"
          className="mb-8"
        />
      )}

      {/* Question Discussions View */}
      <QuestionDiscussions
        questionId={questionId}
        isCompleted={isCompleted}
        comments={comments}
        onAddComment={handlePostComment}
        onReportComment={handleReportComment}
      />
    </div>
  );
}
