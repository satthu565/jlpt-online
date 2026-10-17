import type { StaffUser } from '../../lib/auth-context';
import type { AuditActionType, AuditLogEntry } from './types';

export class AuditServiceError extends Error {
  constructor(message: string, public readonly code: 'FORBIDDEN' | 'INVALID_DATA') {
    super(message);
    this.name = 'AuditServiceError';
  }
}

/**
 * Audit Log Service (ADM-02, ADM-03)
 * Records and retrieves administrator and staff actions for accountability.
 */
export class AuditLogService {
  private logs: AuditLogEntry[] = [];

  constructor(initialLogs: AuditLogEntry[] = []) {
    this.logs = [...initialLogs];
  }

  /**
   * Record a new administrative action in audit log.
   */
  public recordAction(
    operator: { id: string; email?: string; role: string; tenantId?: string },
    action: AuditActionType,
    targetResource: string,
    targetId: string,
    details: Record<string, unknown> = {},
  ): AuditLogEntry {
    const tenantId = operator.tenantId || (details['tenantId'] as string) || 'global';
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      operatorId: operator.id,
      operatorEmail: operator.email,
      operatorRole: operator.role,
      tenantId,
      action,
      targetResource,
      targetId,
      details: {
        ...details,
        operatorRole: operator.role,
        tenantId,
      },
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(entry);
    return entry;
  }

  /**
   * List audit logs with role check:
   * Only Admin can view system audit logs!
   */
  public listLogs(
    operator: StaffUser,
    filters?: {
      action?: AuditActionType;
      targetResource?: string;
      operatorId?: string;
      tenantId?: string;
    },
  ): AuditLogEntry[] {
    if (operator.role !== 'admin') {
      throw new AuditServiceError('Chỉ quản trị viên (Admin) mới có quyền truy cập nhật ký kiểm toán.', 'FORBIDDEN');
    }

    return this.logs.filter((log) => {
      if (filters?.action && log.action !== filters.action) return false;
      if (filters?.targetResource && log.targetResource !== filters.targetResource) return false;
      if (filters?.operatorId && log.operatorId !== filters.operatorId) return false;
      if (filters?.tenantId && log.tenantId !== filters.tenantId) return false;
      return true;
    });
  }

  /**
   * Get raw logs for internal service inspection / testing.
   */
  public getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }
}
