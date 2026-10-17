'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { BackupService, BackupManagerView } from '../../../features/backup';
import { AuditLogService } from '../../../features/users/audit-service';

export default function BackupSettingsPage(): React.JSX.Element {
  const { user } = useAdminAuth();
  const [backupService] = useState(() => {
    const audit = new AuditLogService();
    return new BackupService(audit);
  });

  return (
    <AdminGuard pathname="/settings/backup" requiredRoles={['admin']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            Sao lưu &amp; Phục hồi Hệ thống (ADM-20 / SYS-08)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản trị các tác vụ sao lưu WAL-G, xuất gói dữ liệu kiểm toán và diễn tập phục hồi PITR.
          </p>
        </div>

        <BackupManagerView backupService={backupService} currentUser={user} />
      </div>
    </AdminGuard>
  );
}
