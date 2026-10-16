'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';

export interface TeacherApplication {
  id: string;
  applicantName: string;
  email: string;
  currentOrg: string;
  jlptCertificate: string;
  yearsOfExperience: number;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
}

export default function OrgSettingsPage(): React.JSX.Element {
  const { user } = useAdminAuth();

  const [applications, setApplications] = useState<TeacherApplication[]>([
    {
      id: 'app-01',
      applicantName: 'Nguyễn Văn Hùng',
      email: 'hung.teacher@jlptcenter.vn',
      currentOrg: 'Trung tâm Tiếng Nhật Sakura',
      jlptCertificate: 'N1 (165/180)',
      yearsOfExperience: 6,
      status: 'pending',
      appliedAt: '2026-10-14 15:30',
    },
    {
      id: 'app-02',
      applicantName: 'Yamada Kenji',
      email: 'kenji.yamada@nihongo.jp',
      currentOrg: 'Tokyo Language Academy',
      jlptCertificate: 'Bản xứ (Native)',
      yearsOfExperience: 10,
      status: 'approved',
      appliedAt: '2026-10-10 09:00',
    },
  ]);

  const handleApprove = (id: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a)),
    );
  };

  const handleReject = (id: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a)),
    );
  };

  return (
    <AdminGuard pathname="/settings/org">
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#111827' }}>
            Cài đặt Tổ chức & Hồ sơ Giáo viên (Teacher / Org)
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Xét duyệt hồ sơ ứng tuyển giáo viên giảng dạy, phân quyền quản lý lớp học và thiết lập tổ chức giáo dục đối tác.
          </p>
        </header>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1rem' }}>
          Hồ sơ đăng ký tài khoản Giáo viên ({applications.length})
        </h2>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {applications.map((app) => (
            <div
              key={app.id}
              data-testid={`teacher-app-${app.id}`}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#111827' }}>{app.applicantName}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>({app.email})</span>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: app.status === 'approved' ? '#d1fae5' : app.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                      color: app.status === 'approved' ? '#065f46' : app.status === 'rejected' ? '#991b1b' : '#92400e',
                    }}
                  >
                    {app.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Tổ chức: <strong>{app.currentOrg}</strong> | Chứng chỉ: <strong>{app.jlptCertificate}</strong> | Kinh nghiệm: {app.yearsOfExperience} năm
                </div>
              </div>

              {app.status === 'pending' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    data-testid={`btn-approve-teacher-${app.id}`}
                    onClick={() => handleApprove(app.id)}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#10b981',
                      color: '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Duyệt Cấp Quyền
                  </button>
                  <button
                    data-testid={`btn-reject-teacher-${app.id}`}
                    onClick={() => handleReject(app.id)}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#ef4444',
                      color: '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Từ Chối
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}
