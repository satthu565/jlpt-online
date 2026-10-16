'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';

export default function MediaPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/media" requiredRoles={['editor', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title">Thư viện phương tiện (Media Library)</h1>
        <p>Quản lý tệp âm thanh nghe hiểu MP3/M4A và hình ảnh đề thi WebP/PNG.</p>
      </div>
    </AdminGuard>
  );
}
