'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { t } from '../../../lib/i18n';

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

export interface OrgSettingsPageProps {
  initialApplications?: TeacherApplication[];
}

export default function OrgSettingsPage({
  initialApplications = [],
}: OrgSettingsPageProps = {}): React.JSX.Element {
  const { token, locale } = useAdminAuth();
  const [applications, setApplications] = useState<TeacherApplication[]>(initialApplications);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/teacher-applications', {
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

      const data = (await res.json()) as { items?: TeacherApplication[]; applications?: TeacherApplication[] };
      const items = Array.isArray(data.items) ? data.items : Array.isArray(data.applications) ? data.applications : [];
      setApplications(items);
    } catch {
      setError(t('common.error', locale));
    } finally {
      setIsLoading(false);
    }
  }, [token, locale]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/teacher-applications/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        return;
      }

      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: 'approved' } : app)),
      );
    } catch {
      setError(t('common.error', locale));
    }
  };

  const handleReject = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/teacher-applications/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        return;
      }

      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: 'rejected' } : app)),
      );
    } catch {
      setError(t('common.error', locale));
    }
  };

  return (
    <AdminGuard pathname="/settings/org" requiredRoles={['admin', 'editor']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Cài đặt Tổ chức &amp; Hồ sơ Giáo viên (Teacher / Org)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Xét duyệt hồ sơ ứng tuyển giáo viên giảng dạy, phân quyền quản lý lớp học và thiết lập tổ chức giáo dục đối tác.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            data-testid="org-error-alert"
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={() => void fetchApplications()}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
            >
              {t('common.retry', locale)}
            </button>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            data-testid="org-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">
            Hồ sơ đăng ký tài khoản Giáo viên ({applications.length})
          </h2>

          <div className="grid gap-4">
            {applications.length === 0 ? (
              <div data-testid="org-empty" className="p-8 bg-white border border-gray-200 rounded-xl text-center text-sm text-gray-400 italic">
                {t('common.empty', locale)}
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  data-testid={`teacher-app-${app.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs hover:border-gray-300 transition"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-base text-gray-900 font-bold">{app.applicantName}</strong>
                      <span className="text-xs text-gray-500">({app.email})</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                          app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Tổ chức: <strong>{app.currentOrg}</strong> | Chứng chỉ: <strong>{app.jlptCertificate}</strong> | Kinh nghiệm: {app.yearsOfExperience} năm
                    </div>
                  </div>

                  {app.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        data-testid={`btn-approve-teacher-${app.id}`}
                        onClick={() => void handleApprove(app.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        Duyệt Cấp Quyền
                      </button>
                      <button
                        data-testid={`btn-reject-teacher-${app.id}`}
                        onClick={() => void handleReject(app.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        Từ Chối
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
