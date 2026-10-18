import type { Role } from '@jlpt/schema';
import type { StaffUser } from '../../lib/auth-context';
import type { AdminManagedUser, UserSearchCriteria } from './types';
import { AuditLogService } from './audit-service';

export class UserServiceError extends Error {
  constructor(message: string, public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR') {
    super(message);
    this.name = 'UserServiceError';
  }
}

/**
 * User Management Service (ADM-02, ADM-03, Acceptance 3)
 * Admin modifies roles; editors and reviewers CANNOT edit roles or self-elevate.
 */
export class UserManager {
  private users: Map<string, AdminManagedUser> = new Map();
  public readonly auditService: AuditLogService;

  constructor(initialUsers: AdminManagedUser[] = [], auditService?: AuditLogService) {
    this.auditService = auditService ?? new AuditLogService();
    for (const u of initialUsers) {
      this.users.set(u.id, u);
    }
  }

  public setUsers(newUsers: AdminManagedUser[]): void {
    this.users.clear();
    for (const u of newUsers) {
      this.users.set(u.id, u);
    }
  }

  /**
   * List users with optional filter criteria.
   * Requires staff user.
   */
  public listUsers(operator: StaffUser, criteria: UserSearchCriteria = {}): AdminManagedUser[] {
    if (operator.role !== 'admin' && operator.role !== 'editor' && operator.role !== 'reviewer') {
      throw new UserServiceError('Chỉ tài khoản nhân sự mới có quyền xem danh sách người dùng.', 'FORBIDDEN');
    }

    const results: AdminManagedUser[] = [];

    for (const u of this.users.values()) {
      if (criteria.role && u.role !== criteria.role) continue;

      if (criteria.isBlocked !== undefined) {
        const isBlocked = Boolean(u.blockedAt);
        if (isBlocked !== criteria.isBlocked) continue;
      }

      if (criteria.targetLevel && u.targetLevel !== criteria.targetLevel) continue;

      if (criteria.keyword) {
        const kw = criteria.keyword.toLowerCase().trim();
        const emailMatch = u.email.toLowerCase().includes(kw);
        const nameMatch = u.name.toLowerCase().includes(kw);
        if (!emailMatch && !nameMatch) continue;
      }

      results.push(u);
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get single user by ID.
   */
  public getUser(operator: StaffUser, userId: string): AdminManagedUser | null {
    if (operator.role !== 'admin' && operator.role !== 'editor' && operator.role !== 'reviewer') {
      throw new UserServiceError('Chỉ nhân sự mới có quyền xem chi tiết người dùng.', 'FORBIDDEN');
    }
    return this.users.get(userId) ?? null;
  }

  /**
   * Acceptance 3: "Admin sửa role còn editor không thể tự nâng quyền"
   * Updates user role:
   * - ONLY Admin has permission.
   * - Editors/Reviewers attempting to change role are rejected with 403 FORBIDDEN.
   * - Editors attempting self-elevation (promote self to admin) are strictly rejected with 403 FORBIDDEN.
   * - Generates audit log on success.
   */
  public updateUserRole(
    operator: StaffUser,
    targetUserId: string,
    newRole: Role,
  ): { user: AdminManagedUser; previousRole: Role } {
    // 1. Check for self-elevation attempt by non-admin
    if (operator.id === targetUserId && newRole === 'admin' && operator.role !== 'admin') {
      this.auditService.recordAction(operator, 'role_change', 'users', targetUserId, {
        attemptedRole: newRole,
        outcome: 'blocked_self_elevation',
      });
      throw new UserServiceError('Biên tập viên hoặc nhân sự không thể tự nâng quyền lên Quản trị viên (Admin).', 'FORBIDDEN');
    }

    // 2. Strict RBAC: Only Admin can modify roles
    if (operator.role !== 'admin') {
      this.auditService.recordAction(operator, 'role_change', 'users', targetUserId, {
        attemptedRole: newRole,
        outcome: 'forbidden_non_admin',
      });
      throw new UserServiceError('Chỉ Quản trị viên (Admin) mới có quyền phân vai trò người dùng.', 'FORBIDDEN');
    }

    // 3. Find target user
    const target = this.users.get(targetUserId);
    if (!target) {
      throw new UserServiceError('Không tìm thấy tài khoản người dùng.', 'NOT_FOUND');
    }

    const previousRole = target.role;
    const now = new Date().toISOString();

    const updated: AdminManagedUser = {
      ...target,
      role: newRole,
      updatedAt: now,
    };

    this.users.set(targetUserId, updated);

    // 4. Record audit log
    this.auditService.recordAction(operator, 'role_change', 'users', targetUserId, {
      previousRole,
      newRole,
      userEmail: target.email,
    });

    return { user: updated, previousRole };
  }

  /**
   * Block or unblock a user account.
   * Admin only.
   */
  public setUserBlocked(
    operator: StaffUser,
    targetUserId: string,
    blocked: boolean,
    reason?: string,
  ): AdminManagedUser {
    if (operator.role !== 'admin') {
      throw new UserServiceError('Chỉ Quản trị viên (Admin) mới có quyền khóa hoặc mở khóa tài khoản.', 'FORBIDDEN');
    }

    const target = this.users.get(targetUserId);
    if (!target) {
      throw new UserServiceError('Không tìm thấy người dùng.', 'NOT_FOUND');
    }

    const now = new Date().toISOString();
    const updated: AdminManagedUser = {
      ...target,
      blockedAt: blocked ? now : null,
      blockReason: blocked ? (reason || 'Khóa bởi quản trị viên') : null,
      updatedAt: now,
    };

    this.users.set(targetUserId, updated);

    this.auditService.recordAction(
      operator,
      blocked ? 'user_block' : 'user_unblock',
      'users',
      targetUserId,
      { reason, userEmail: target.email },
    );

    return updated;
  }

  /**
   * Create or register a mock/initial user.
   */
  public addUser(user: AdminManagedUser): void {
    this.users.set(user.id, user);
  }
}
