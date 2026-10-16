'use client';

import React, { useState } from 'react';
import {
  QuestionDiscussions,
  AchievementShareCard,
  defaultCommunityClient,
  type DiscussionComment,
  type AchievementShareData,
} from '../../../features/community';
import { useI18n } from '../../../lib/i18n';

const SAMPLE_COMMENTS: DiscussionComment[] = [
  {
    id: 'c-1',
    questionId: 'q-sample-1',
    userId: 'u-sensei',
    userName: 'Tanaka Sensei',
    content: 'Lưu ý với mẫu「〜を皮切りに」: chỉ dùng cho các sự kiện mở đầu mang tính tích cực hoặc quy mô lớn.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    isModerator: true,
  },
  {
    id: 'c-2',
    questionId: 'q-sample-1',
    userId: 'u-learner',
    userName: 'Quốc Việt',
    content: 'Em cảm ơn thầy! Lúc đầu em bị nhầm với cấu ngữ 〜をはじめとする.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    parentId: 'c-1',
  },
];

const SAMPLE_ACHIEVEMENT: AchievementShareData = {
  type: 'jlpt_pass',
  title: 'Chúc mừng bạn đã đạt mục tiêu JLPT N3!',
  badge: 'JLPT N3 Certified',
  level: 'N3',
  score: 142,
  streakDays: 14,
  achievedAt: new Date().toISOString(),
  userName: 'Học viên JLPT Online',
};

export default function DiscussionsPage(): React.JSX.Element {
  const { t } = useI18n();

  const [isCompleted, setIsCompleted] = useState(true);
  const [comments, setComments] = useState<DiscussionComment[]>(SAMPLE_COMMENTS);

  const handleAddComment = async (content: string, parentId?: string) => {
    try {
      const created = await defaultCommunityClient.postQuestionComment('q-sample-1', content, parentId);
      setComments((prev) => [...prev, created]);
    } catch {
      const mock: DiscussionComment = {
        id: `c-${Date.now()}`,
        questionId: 'q-sample-1',
        userId: 'u-me',
        userName: 'Tôi',
        content,
        createdAt: new Date().toISOString(),
        parentId,
      };
      setComments((prev) => [...prev, mock]);
    }
  };

  const handleReportComment = async (
    commentId: string,
    reason: 'spam' | 'spoiler' | 'harassment' | 'wrong_answer' | 'other',
    details?: string,
  ) => {
    try {
      await defaultCommunityClient.reportComment(commentId, reason, details);
    } catch {
      // Mock report
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
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

      {/* Completion Gating Toggle (For Testing / Demo) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => setIsCompleted(e.target.checked)}
            data-testid="toggle-completion-gating"
          />
          <span>{t('community.discussions.simulateAttempted')}</span>
        </label>
      </div>

      <QuestionDiscussions
        questionId="q-sample-1"
        isCompleted={isCompleted}
        comments={comments}
        onAddComment={handleAddComment}
        onReportComment={handleReportComment}
      />

      <AchievementShareCard data={SAMPLE_ACHIEVEMENT} />
    </div>
  );
}
