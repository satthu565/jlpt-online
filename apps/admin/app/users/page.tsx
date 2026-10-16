'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import type { AdminManagedUser } from '../../features/users/types';
import { UserManager } from '../../features/users/user-service';
import { UserListTable } from '../../features/users/user-components';

const SAMPLE_USERS: AdminManagedUser[] = [
  {
    id: 'u_admin_1',
    email: 'admin@jlpt.local',
    name: 'Quản trị viên Hệ thống',
    role: 'admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
    targetLevel: 'N1',
    blockedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u_editor_1',
    email: 'editor@jlpt.local',
    name: 'Biên tập viên Đề',
    role: 'editor',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
    targetLevel: 'N2',
    blockedAt: null,
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'u_reviewer_1',
    email: 'reviewer@jlpt.local',
    name: 'Người duyệt Đề thi',
    role: 'reviewer',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
    targetLevel: 'N1',
    blockedAt: null,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'u_student_1',
    email: 'student@example.com',
    name: 'Học viên Nguyễn Văn A',
    role: 'student',
    twoFactorEnabled: false,
    twoFactorStatus: 'setup_required',
    targetLevel: 'N3',
    blockedAt: null,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

export default function UsersPage(): React.JSX.Element {
  const { user } = useAdminAuth();
  const [userManager] = useState(() => new UserManager(SAMPLE_USERS));

  return (
    <AdminGuard pathname="/users" requiredRoles={['admin']}>
      <div style={{ padding: '2rem' }} className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            Quản lý người dùng và phân quyền (Users & RBAC)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý tài khoản, thay đổi vai trò (Admin sửa role) và ngăn chặn biên tập viên tự nâng quyền.
          </p>
        </div>

        {user && (
          <UserListTable
            currentUser={user}
            userManager={userManager}
          />
        )}
      </div>
    </AdminGuard>
  );
}
