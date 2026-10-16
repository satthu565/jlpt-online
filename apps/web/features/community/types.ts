export type EventStatus =
  | 'UPCOMING'
  | 'LOBBY_OPEN'
  | 'IN_PROGRESS'
  | 'ENDED'
  | 'RESULTS_EMBARGOED'
  | 'RESULTS_RELEASED';

export interface ExamEvent {
  id: string;
  examId: string;
  title: string;
  level: string;
  opensAt: string;
  startsAt: string;
  endsAt: string;
  resultReleaseAt: string;
  capacity: number;
  registeredCount?: number;
  status: EventStatus;
  userRegistered?: boolean;
}

export interface EventLobbyInfo {
  event: ExamEvent;
  serverTime: string;
  startsInSeconds: number;
  isRegistered: boolean;
  participantCount: number;
  canStart: boolean;
  attemptId?: string;
  isEmbargoed: boolean;
}

export interface LeaderboardRank {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  timeSpentSeconds: number;
  submittedAt: string;
}

export interface DiscussionComment {
  id: string;
  questionId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  parentId?: string;
  isModerator?: boolean;
  replies?: DiscussionComment[];
}

export interface AchievementShareData {
  type: 'jlpt_pass' | 'streak_milestone' | 'high_score' | 'speed_master';
  title: string;
  badge: string;
  score?: number;
  level?: string;
  streakDays?: number;
  achievedAt: string;
  userName?: string;
  shareUrl?: string;
}
