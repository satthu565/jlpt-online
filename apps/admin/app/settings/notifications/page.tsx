'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Textarea } from '@jlpt/ui';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { t } from '../../../lib/i18n';

export interface NotificationTemplate {
  id: string;
  key: string;
  name: string;
  channel: 'email' | 'in_app' | 'push';
  subject: string;
  bodyTemplate: string;
  isActive: boolean;
  variables: string[];
}

export interface NotificationsSettingsPageProps {
  initialTemplates?: NotificationTemplate[];
}

export default function NotificationsSettingsPage({
  initialTemplates = [],
}: NotificationsSettingsPageProps = {}): React.JSX.Element {
  const { token, locale } = useAdminAuth();

  const [templates, setTemplates] = useState<NotificationTemplate[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(
    () => initialTemplates[0] || null,
  );
  const [testEmail, setTestEmail] = useState('editor@jlpt.local');
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/notifications/templates', {
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

      const data = (await res.json()) as { items?: NotificationTemplate[] };
      const items = Array.isArray(data.items) ? data.items : [];
      setTemplates(items);
      if (items.length > 0 && !selectedTemplate) {
        setSelectedTemplate(items[0]!);
      }
    } catch {
      setError(t('common.error', locale));
    } finally {
      setIsLoading(false);
    }
  }, [token, locale, selectedTemplate]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleSave = async (tpl: NotificationTemplate) => {
    setError(null);
    setSendSuccess(null);
    try {
      const res = await fetch(`/api/v1/admin/notifications/templates/${encodeURIComponent(tpl.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify(tpl),
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

      setTemplates((prev) => prev.map((tItem) => (tItem.id === tpl.id ? tpl : tItem)));
      setSendSuccess(`Đã cập nhật mẫu "${tpl.name}" thành công.`);
      setTimeout(() => setSendSuccess(null), 3500);
    } catch {
      setError(t('common.error', locale));
    }
  };

  const handleTestSend = async () => {
    if (!selectedTemplate) return;
    setError(null);
    setSendSuccess(null);
    try {
      const res = await fetch('/api/v1/admin/notifications/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Host: 'admin.jlpt.local',
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          recipient: testEmail,
        }),
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

      setSendSuccess(`Đã gửi email thử nghiệm mẫu "${selectedTemplate.name}" tới ${testEmail}.`);
      setTimeout(() => setSendSuccess(null), 4000);
    } catch {
      setError(t('common.error', locale));
    }
  };

  return (
    <AdminGuard pathname="/settings/notifications" requiredRoles={['admin', 'editor', 'billing_admin']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            Cấu hình Thông báo &amp; Email Tự động (ADM-18)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý mẫu thông báo transactional (OTP, nhắc học tập SRS, kết quả thi, biên lai thanh toán).
          </p>
        </div>

        {sendSuccess && (
          <div
            role="status"
            data-testid="notification-success-alert"
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm"
          >
            ✓ {sendSuccess}
          </div>
        )}

        {error && (
          <div
            role="alert"
            data-testid="notifications-error-alert"
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void fetchTemplates()}
            >
              {t('common.retry', locale)}
            </Button>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            data-testid="notifications-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>{t('common.loading', locale)}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List templates */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Danh sách mẫu</h2>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <div data-testid="notifications-empty" className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-center text-xs text-gray-400 italic">
                  {t('common.empty', locale)}
                </div>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    data-testid={`tpl-item-${tpl.id}`}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      selectedTemplate?.id === tpl.id
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-sm font-semibold text-gray-900 dark:text-slate-100">{tpl.name}</strong>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                          tpl.channel === 'email'
                            ? 'bg-blue-100 text-blue-800'
                            : tpl.channel === 'push'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {tpl.channel}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">Mã: {tpl.key}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Template detail editor */}
          {selectedTemplate && (
            <div
              data-testid="template-editor-panel"
              className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 space-y-4 shadow-xs"
            >
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                Chỉnh sửa mẫu: {selectedTemplate.name}
              </h2>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Tiêu đề thông báo / Subject:
                </label>
                <Input
                  data-testid="input-tpl-subject"
                  type="text"
                  value={selectedTemplate.subject}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Nội dung mẫu (hỗ trợ biến chèn động):
                </label>
                <Textarea
                  data-testid="input-tpl-body"
                  rows={6}
                  value={selectedTemplate.bodyTemplate}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, bodyTemplate: e.target.value })
                  }
                  className="w-full font-mono text-xs"
                />
              </div>

              <div>
                <span className="text-xs text-gray-500">
                  Biến có thể sử dụng:{' '}
                  {selectedTemplate.variables?.map((v) => (
                    <code
                      key={v}
                      className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-slate-300 mr-1.5 font-mono text-xs"
                    >
                      {`{{${v}}}`}
                    </code>
                  ))}
                </span>
              </div>

              {/* Test send */}
              <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-lg flex flex-wrap gap-2 items-center">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Nhập email kiểm thử..."
                  className="flex-1 min-w-[200px]"
                />
                <Button
                  data-testid="btn-test-send"
                  variant="secondary"
                  size="sm"
                  onClick={handleTestSend}
                >
                  Gửi thử nghiệm
                </Button>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  data-testid="btn-save-notification-tpl"
                  variant="primary"
                  onClick={() => void handleSave(selectedTemplate)}
                >
                  Lưu cấu hình
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
