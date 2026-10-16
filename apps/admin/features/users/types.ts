import type { Level, Role } from '@jlpt/schema';
import type { TwoFactorStatus } from '../../lib/auth-context';

export interface AdminManagedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  twoFactorEnabled: boolean;
  twoFactorStatus: TwoFactorStatus;
  targetLevel?: Level | null;
  blockedAt?: string | null;
  blockReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AuditActionType =
  | 'role_change'
  | 'user_block'
  | 'user_unblock'
  | 'exam_publish'
  | 'exam_unpublish'
  | 'blueprint_activate'
  | 'blueprint_create'
  | 'group_review';

export interface AuditLogEntry {
  id: string;
  operatorId: string;
  operatorEmail?: string;
  action: AuditActionType;
  targetResource: string;
  targetId: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface UserSearchCriteria {
  keyword?: string;
  role?: Role;
  isBlocked?: boolean;
  targetLevel?: Level;
}
