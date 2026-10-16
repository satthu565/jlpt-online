'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { ImportManagerView } from '../../features/import';

export default function ImportsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/imports" requiredRoles={['editor', 'admin']}>
      <ImportManagerView />
    </AdminGuard>
  );
}
