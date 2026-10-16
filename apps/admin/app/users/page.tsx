'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';

export default function UsersPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/users" requiredRoles={['admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title">Quản lý người dùng (Users)</h1>
        <p>Danh sách người dùng, thiết lập vai trò, phân quyền nhân sự và khóa tài khoản.</p>
      </div>
    </AdminGuard>
  );
}
