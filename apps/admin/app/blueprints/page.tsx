'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';

export default function BlueprintsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/blueprints" requiredRoles={['editor', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title">Bản thiết kế đề thi (Blueprints)</h1>
        <p>Quy chuẩn cấu trúc các phần thi N1–N5 theo chuẩn JLPT chính thức.</p>
      </div>
    </AdminGuard>
  );
}
