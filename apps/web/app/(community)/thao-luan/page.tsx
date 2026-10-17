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
import { Alert, Button, Card, CardContent, Input, Spinner } from '@jlpt/ui';
import Link from 'next/link';

const DEFAULT_COMMENTS: DiscussionComment[] = [
  {
    id: '0192f000-com0-7000-8000-000000000001',
    questionId: 'q-default-1',
    userId: 'user-default-1',
    userName: 'Nguyễn Văn A',
    content: 'Câu này ngữ pháp 〜わけにはいかない biểu thị sự kiềm chế về mặt đạo đức.',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_ACHIEVEMENT: AchievementShareData = {
  type: 'streak_milestone',
  title: 'Chiến Binh N3 Kiên Cường',
  badge: '🔥 7 Days Streak',
  userName: 'Học viên JLPT',
  level: 'N3',
  achievedAt: new Date().toISOString(),
};

export default function DiscussionsPage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();

  const [questionId, setQuestionId] = useState<string>('q-default-1');
  const [inputQuestionId, setInputQuestionId] = useState<string>('q-default-1');
  const [isCompleted, setIsCompleted] = useState(true);
  const [comments, setComments] = useState<DiscussionComment[]>(DEFAULT_COMMENTS);
  const [achievement] = useState<AchievementShareData | null>(DEFAULT_ACHIEVEMENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Check URL params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('questionId');
      if (q) {
        setQuestionId(q);
        setInputQuestionId(q);
      }
    }
  }, []);

  const loadDiscussions = useCallback(async (qId: string) => {
    if (!qId) return;
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const res = await defaultCommunityClient.getQuestionDiscussions(qId);
      setIsCompleted(res.allowed !== false);
      if (res.items) {
        setComments(res.items);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('403') || msg.includes('UNAUTHENTICATED') || msg.includes('Yêu cầu đăng nhập')) {
        setIsUnauthorized(true);
      } else {
        setError(msg || t('common.status.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDiscussions(questionId);
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
      alert('Đã chia sẻ thành tích lên cộng đồng học viên JLPT Online!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể chia sẻ thành tích.');
    }
  };

  const handleSelectQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuestionId.trim()) {
      setQuestionId(inputQuestionId.trim());
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 w-full">
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          {t('community.discussions.pageTitle')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t('community.discussions.pageSubtitle')}
        </p>
      </div>

      {(!user || isUnauthorized) && (
        <Alert variant="warning" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>Bạn cần đăng nhập để tham gia thảo luận và chia sẻ đáp án với cộng đồng.</span>
            <Link href="/dang-nhap?redirect=/thao-luan">
              <Button size="sm" variant="primary">Đăng nhập ngay</Button>
            </Link>
          </div>
        </Alert>
      )}

      {error && !isUnauthorized && (
        <Alert variant="error" onClose={() => setError(null)} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => loadDiscussions(questionId)}>
              {t('common.buttons.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {/* Question Selector Card */}
      <Card style={{ marginBottom: '2rem' }}>
        <CardContent style={{ padding: '1.25rem' }}>
          <form onSubmit={handleSelectQuestion} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              🔍 Mã câu hỏi cần thảo luận:
            </span>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <Input
                placeholder="Nhập mã câu hỏi (ví dụ: q1, q2)..."
                value={inputQuestionId}
                onChange={(e) => setInputQuestionId(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Xem thảo luận
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Achievement Share Banner */}
      {achievement && (
        <div style={{ marginBottom: '2rem' }}>
          <AchievementShareCard
            data={achievement}
            onCopyLink={handleShareAchievement}
          />
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0', alignItems: 'center', gap: '0.75rem' }}>
          <Spinner size="md" />
          <span style={{ color: 'var(--text-secondary)' }}>{t('common.status.loading')}</span>
        </div>
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
