import { describe, it, expect, beforeEach } from 'vitest';
import type { Role } from '@jlpt/schema';
import type { StaffUser } from '../lib/auth-context';
import type { AdminManagedUser } from '../features/users/types';
import {
  UserManager,
  UserServiceError,
} from '../features/users/user-service';
import {
  AuditLogService,
  AuditServiceError,
} from '../features/users/audit-service';
import {
  AdminApiClient,
  AdminClientGuardError,
} from '../lib/api-client';

const adminOperator: StaffUser = {
  id: 'usr_admin_01',
  email: 'admin@jlpt.local',
  name: 'Admin Boss',
  role: 'admin',
  twoFactorEnabled: true,
  twoFactorStatus: 'verified',
};

const editorOperator: StaffUser = {
  id: 'usr_editor_01',
  email: 'editor@jlpt.local',
  name: 'Content Editor',
  role: 'editor',
  twoFactorEnabled: true,
  twoFactorStatus: 'verified',
};

const reviewerOperator: StaffUser = {
  id: 'usr_reviewer_01',
  email: 'reviewer@jlpt.local',
  name: 'Quality Reviewer',
  role: 'reviewer',
  twoFactorEnabled: true,
  twoFactorStatus: 'verified',
};

const studentUser: StaffUser = {
  id: 'usr_student_01',
  email: 'student@example.com',
  name: 'Student Learner',
  role: 'student' as Role,
  twoFactorEnabled: false,
  twoFactorStatus: 'setup_required',
};

describe('User Management & RBAC Permissions (C04: ADM-02, ADM-03)', () => {
  let auditService: AuditLogService;
  let userManager: UserManager;

  const initialUsers: AdminManagedUser[] = [
    {
      id: 'usr_admin_01',
      email: 'admin@jlpt.local',
      name: 'Admin Boss',
      role: 'admin',
      twoFactorEnabled: true,
      twoFactorStatus: 'verified',
      targetLevel: 'N1',
      blockedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'usr_editor_01',
      email: 'editor@jlpt.local',
      name: 'Content Editor',
      role: 'editor',
      twoFactorEnabled: true,
      twoFactorStatus: 'verified',
      targetLevel: 'N2',
      blockedAt: null,
      createdAt: '2026-01-05T00:00:00Z',
      updatedAt: '2026-01-05T00:00:00Z',
    },
    {
      id: 'usr_reviewer_01',
      email: 'reviewer@jlpt.local',
      name: 'Quality Reviewer',
      role: 'reviewer',
      twoFactorEnabled: true,
      twoFactorStatus: 'verified',
      targetLevel: 'N1',
      blockedAt: null,
      createdAt: '2026-01-10T00:00:00Z',
      updatedAt: '2026-01-10T00:00:00Z',
    },
    {
      id: 'usr_student_01',
      email: 'student@example.com',
      name: 'Nguyen Van A',
      role: 'student' as Role,
      twoFactorEnabled: false,
      twoFactorStatus: 'setup_required',
      targetLevel: 'N3',
      blockedAt: null,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    auditService = new AuditLogService();
    userManager = new UserManager(initialUsers, auditService);
  });

  describe('ADM-02: Quản lý danh sách người dùng (Tìm kiếm, bộ lọc, chi tiết)', () => {
    it('allows staff to list and search users by keyword (email or name substring)', () => {
      const all = userManager.listUsers(adminOperator);
      expect(all.length).toBe(4);

      // Search by email substring
      const searchEmail = userManager.listUsers(adminOperator, { keyword: 'editor@' });
      expect(searchEmail.length).toBe(1);
      expect(searchEmail[0]!.email).toBe('editor@jlpt.local');

      // Search by name substring
      const searchName = userManager.listUsers(adminOperator, { keyword: 'Nguyen' });
      expect(searchName.length).toBe(1);
      expect(searchName[0]!.name).toBe('Nguyen Van A');
    });

    it('filters users by role and blocked status', () => {
      // Filter by role
      const editors = userManager.listUsers(adminOperator, { role: 'editor' });
      expect(editors.length).toBe(1);
      expect(editors[0]!.id).toBe('usr_editor_01');

      const reviewers = userManager.listUsers(adminOperator, { role: 'reviewer' });
      expect(reviewers.length).toBe(1);
      expect(reviewers[0]!.id).toBe('usr_reviewer_01');

      // Filter by blocked status
      const activeUsers = userManager.listUsers(adminOperator, { isBlocked: false });
      expect(activeUsers.length).toBe(4);

      const blockedUsers = userManager.listUsers(adminOperator, { isBlocked: true });
      expect(blockedUsers.length).toBe(0);
    });

    it('disallows non-staff (students or unauthorized users) from listing users', () => {
      expect(() => {
        userManager.listUsers(studentUser);
      }).toThrow(UserServiceError);

      try {
        userManager.listUsers(studentUser);
      } catch (err: unknown) {
        const e = err as UserServiceError;
        expect(e.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Acceptance 3 & ADM-03: Admin sửa role còn editor không thể tự nâng quyền', () => {
    it('Admin can successfully change a user role and records audit log', () => {
      // Admin promotes student to editor
      const result = userManager.updateUserRole(adminOperator, 'usr_student_01', 'editor');
      expect(result.previousRole).toBe('student');
      expect(result.user.role).toBe('editor');

      // Verify updated user record
      const updated = userManager.getUser(adminOperator, 'usr_student_01');
      expect(updated?.role).toBe('editor');

      // Verify audit log entry was automatically created
      const logs = auditService.listLogs(adminOperator, { action: 'role_change' });
      expect(logs.length).toBe(1);
      expect(logs[0]!.operatorId).toBe(adminOperator.id);
      expect(logs[0]!.targetId).toBe('usr_student_01');
      expect(logs[0]!.details['previousRole']).toBe('student');
      expect(logs[0]!.details['newRole']).toBe('editor');
    });

    it('Editor CANNOT modify any user role (throws 403 Forbidden)', () => {
      // Editor attempts to change student role
      expect(() => {
        userManager.updateUserRole(editorOperator, 'usr_student_01', 'reviewer');
      }).toThrow(UserServiceError);

      try {
        userManager.updateUserRole(editorOperator, 'usr_student_01', 'reviewer');
      } catch (err: unknown) {
        const e = err as UserServiceError;
        expect(e.code).toBe('FORBIDDEN');
        expect(e.message).toContain('Chỉ Quản trị viên (Admin) mới có quyền');
      }
    });

    it('Editor CANNOT self-elevate / self-promote to Admin (strictly blocked with 403 Forbidden)', () => {
      // Editor attempts to promote themselves to admin
      expect(() => {
        userManager.updateUserRole(editorOperator, editorOperator.id, 'admin');
      }).toThrow(UserServiceError);

      try {
        userManager.updateUserRole(editorOperator, editorOperator.id, 'admin');
      } catch (err: unknown) {
        const e = err as UserServiceError;
        expect(e.code).toBe('FORBIDDEN');
        expect(e.message).toContain('không thể tự nâng quyền');
      }

      // Verify role of editor remains strictly 'editor'
      const editorCheck = userManager.getUser(adminOperator, editorOperator.id);
      expect(editorCheck?.role).toBe('editor');

      // Verify security audit logged the blocked self-elevation attempt
      const logs = auditService.listLogs(adminOperator);
      const selfElevationLog = logs.find((l) => l.details['outcome'] === 'blocked_self_elevation');
      expect(selfElevationLog).toBeDefined();
      expect(selfElevationLog?.operatorId).toBe(editorOperator.id);
    });

    it('Reviewer CANNOT modify user roles or self-promote to Admin', () => {
      // Reviewer attempts to promote themselves to admin
      expect(() => {
        userManager.updateUserRole(reviewerOperator, reviewerOperator.id, 'admin');
      }).toThrow(UserServiceError);

      try {
        userManager.updateUserRole(reviewerOperator, reviewerOperator.id, 'admin');
      } catch (err: unknown) {
        const e = err as UserServiceError;
        expect(e.code).toBe('FORBIDDEN');
      }

      // Reviewer attempts to change another user's role
      expect(() => {
        userManager.updateUserRole(reviewerOperator, 'usr_student_01', 'editor');
      }).toThrow(UserServiceError);
    });

    it('AdminApiClient enforces UI Guard preventing editor from calling role update or self-elevation', async () => {
      const client = new AdminApiClient({
        token: 'editor_token',
        user: editorOperator,
        mode: 'mock',
      });

      // 1. Editor trying to self-elevate on client
      await expect(client.updateUserRole(editorOperator.id, 'admin')).rejects.toThrow(AdminClientGuardError);
      try {
        await client.updateUserRole(editorOperator.id, 'admin');
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.code).toBe('FORBIDDEN');
        expect(e.message).toContain('không thể tự nâng quyền');
      }

      // 2. Editor trying to call updateUserRole for another user
      await expect(client.updateUserRole('usr_student_01', 'reviewer')).rejects.toThrow(AdminClientGuardError);
      try {
        await client.updateUserRole('usr_student_01', 'reviewer');
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.code).toBe('FORBIDDEN');
        expect(e.message).toContain('không có thẩm quyền');
      }
    });
  });

  describe('Account Blocking & Audit Log Security', () => {
    it('Admin can block and unblock user accounts, recording audit logs', () => {
      // Admin blocks student account
      const blocked = userManager.setUserBlocked(adminOperator, 'usr_student_01', true, 'Vi phạm quy chế thi');
      expect(blocked.blockedAt).not.toBeNull();
      expect(blocked.blockReason).toBe('Vi phạm quy chế thi');

      // Audit log records block action
      const blockLogs = auditService.listLogs(adminOperator, { action: 'user_block' });
      expect(blockLogs.length).toBe(1);
      expect(blockLogs[0]!.details['reason']).toBe('Vi phạm quy chế thi');

      // Admin unblocks student account
      const unblocked = userManager.setUserBlocked(adminOperator, 'usr_student_01', false);
      expect(unblocked.blockedAt).toBeNull();
      expect(unblocked.blockReason).toBeNull();

      // Audit log records unblock action
      const unblockLogs = auditService.listLogs(adminOperator, { action: 'user_unblock' });
      expect(unblockLogs.length).toBe(1);
    });

    it('Editor CANNOT block user accounts (403 Forbidden)', () => {
      expect(() => {
        userManager.setUserBlocked(editorOperator, 'usr_student_01', true);
      }).toThrow(UserServiceError);

      try {
        userManager.setUserBlocked(editorOperator, 'usr_student_01', true);
      } catch (err: unknown) {
        const e = err as UserServiceError;
        expect(e.code).toBe('FORBIDDEN');
        expect(e.message).toContain('Chỉ Quản trị viên (Admin) mới có quyền');
      }
    });

    it('Only Admin can view system audit logs (Editor and Reviewer are blocked with 403 Forbidden)', () => {
      // Admin can view audit logs
      const logs = auditService.listLogs(adminOperator);
      expect(Array.isArray(logs)).toBe(true);

      // Editor CANNOT view audit logs
      expect(() => {
        auditService.listLogs(editorOperator);
      }).toThrow(AuditServiceError);

      try {
        auditService.listLogs(editorOperator);
      } catch (err: unknown) {
        const e = err as AuditServiceError;
        expect(e.code).toBe('FORBIDDEN');
        expect(e.message).toContain('Chỉ quản trị viên (Admin) mới có quyền truy cập');
      }

      // Reviewer CANNOT view audit logs
      expect(() => {
        auditService.listLogs(reviewerOperator);
      }).toThrow(AuditServiceError);
    });
  });
});
