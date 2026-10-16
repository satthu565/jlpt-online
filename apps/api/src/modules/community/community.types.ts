export interface ShareAchievementDto {
  achievementId: string;
}

export interface PostDiscussionCommentDto {
  content: string;
  title?: string;
}

export interface ReportCommentDto {
  reason: string;
}

export interface ResolveCommunityReportDto {
  status: 'pending' | 'in_review' | 'resolved' | 'dismissed';
  action: 'none' | 'hide_comment' | 'warn_user' | 'ban_user';
  reason: string;
}
