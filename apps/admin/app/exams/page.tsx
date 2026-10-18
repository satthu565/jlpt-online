'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { ExamListView } from '../../features/exam';
import type { StaffOperator } from '../../features/exam/types';

export default function ExamsPage(): React.JSX.Element {
  const { user } = useAdminAuth();

  const currentOperator: StaffOperator = {
    id: user?.id || 'admin_01',
    email: user?.email || 'admin@jlpt.local',
    role: user?.role || 'admin',
    name: user?.name || 'Administrator',
  };

  return (
    <AdminGuard pathname="/exams" requiredRoles={['editor', 'reviewer', 'admin']}>
      <ExamListView initialExams={[]} currentOperator={currentOperator} />
    </AdminGuard>
  );
}
