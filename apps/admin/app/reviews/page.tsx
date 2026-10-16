'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { ReviewQueueView } from '../../features/review';
import type { StaffOperator } from '../../features/review/types';

export default function ReviewsPage(): React.JSX.Element {
  const { user } = useAdminAuth();

  const currentOperator: StaffOperator = {
    id: user?.id || 'reviewer-01',
    email: user?.email || 'reviewer@jlpt.local',
    role: user?.role || 'reviewer',
    name: user?.name || 'Reviewer Admin',
  };

  return (
    <AdminGuard pathname="/reviews" requiredRoles={['reviewer', 'admin']}>
      <ReviewQueueView currentOperator={currentOperator} />
    </AdminGuard>
  );
}
