'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import type { AuditLogEntry } from '../../features/users/types';
import { AuditLogService } from '../../features/users/audit-service';
import { AuditLogTimeline } from '../../features/users/user-components';

const INITIAL_LOGS: AuditLogEntry[] = [
  {
    id: 'aud_sample_1',
    operatorId: 'u_admin_1',
    operatorEmail: 'admin@jlpt.local',
    action: 'role_change',
    targetResource: 'users',
    targetId: 'u_editor_1',
    details: { previousRole: 'student', newRole: 'editor' },
    timestamp: '2026-01-05T08:30:00Z',
  },
  {
    id: 'aud_sample_2',
    operatorId: 'u_admin_1',
    operatorEmail: 'admin@jlpt.local',
    action: 'exam_publish',
    targetResource: 'exams',
    targetId: 'ex_N1_2026',
    details: { version: 1, kind: 'original', level: 'N1' },
    timestamp: '2026-01-10T14:15:00Z',
  },
];

export default function AuditLogsPage(): React.JSX.Element {
  const { user } = useAdminAuth();
  const [auditService] = useState(() => new AuditLogService(INITIAL_LOGS));

  const logs = user ? auditService.listLogs(user) : [];

  return (
    <AdminGuard pathname="/audit-logs" requiredRoles={['admin']}>
      <div style={{ padding: '2rem' }} className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            Nhật ký kiểm toán hệ thống (Audit Logs - ADM-14)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ghi nhận toàn bộ thao tác phân quyền, xuất bản đề thi và thay đổi cấu hình với đầy đủ dấu vết an toàn.
          </p>
        </div>

        <AuditLogTimeline logs={logs} />
      </div>
    </AdminGuard>
  );
}
