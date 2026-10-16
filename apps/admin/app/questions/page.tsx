'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';

export default function QuestionsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/questions" requiredRoles={['editor', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title">Ngân hàng câu hỏi (Question Bank)</h1>
        <p>Quản lý các nhóm câu hỏi (問題), soạn thảo nội dung RichText, gắn tag và gửi duyệt.</p>
      </div>
    </AdminGuard>
  );
}
