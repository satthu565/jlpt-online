'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import type { Role } from '@jlpt/schema';
import type { AdminManagedUser } from '../../features/users/types';
import { UserManager } from '../../features/users/user-service';
import { UserListTable } from '../../features/users/user-components';
import { t } from '../../lib/i18n';

export default function UsersPage(): React.JSX.Element {
  const { user, token, locale } = useAdminAuth();
  const [userManager] = useState(() => new UserManager([]));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setRefreshKey] = useState(0);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/users', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setError(t('auth.forbidden', locale));
        } else {
          setError(t('common.error', locale));
        }
        setIsLoading(false);
        return;
      }

      const data = (await res.json()) as { items?: AdminManagedUser[] };
      if (Array.isArray(data.items)) {
        userManager.setUsers(data.items);
        setRefreshKey((k) => k + 1);
      }
    } catch {
      setError(t('common.error', locale));
    } finally {
      setIsLoading(false);
    }
  }, [token, locale, userManager]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleRoleChanged = async (userId: string, newRole: Role) => {
    try {
      if (!token) {
        setError(t('auth.unauthenticated', locale));
        await fetchUsers();
        return;
      }
      const res = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify({ roles: [newRole] }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setError(t('auth.forbidden', locale));
        } else {
          setError(t('common.error', locale));
        }
        await fetchUsers();
        return;
      }
      setError(null);
    } catch {
      setError(t('common.error', locale));
      await fetchUsers();
    }
  };

  const handleStatusChanged = async (userId: string, isBlocked: boolean) => {
    try {
      if (!token) {
        setError(t('auth.unauthenticated', locale));
        await fetchUsers();
        return;
      }
      const res = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify({ isBlocked, blockReason: isBlocked ? 'Khóa bởi quản trị viên' : undefined }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError(t('auth.unauthenticated', locale));
        } else if (res.status === 403) {
          setError(t('auth.forbidden', locale));
        } else {
          setError(t('common.error', locale));
        }
        await fetchUsers();
        return;
      }
      setError(null);
    } catch {
      setError(t('common.error', locale));
      await fetchUsers();
    }
  };

  return (
    <AdminGuard pathname="/users" requiredRoles={['admin']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            Quản lý người dùng và phân quyền (Users &amp; RBAC)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý tài khoản, thay đổi vai trò (Admin sửa role) và ngăn chặn biên tập viên tự nâng quyền.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="users-error-alert"
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={() => void fetchUsers()}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
            >
              {t('common.retry', locale)}
            </button>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            data-testid="users-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        {user && (
          <UserListTable
            currentUser={user}
            userManager={userManager}
            onRoleChanged={handleRoleChanged}
            onStatusChanged={handleStatusChanged}
          />
        )}
      </div>
    </AdminGuard>
  );
}
