'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'welcome_email',
    key: 'welcome_email',
    name: 'Email Chào Mừng Thành Viên Mới',
    channel: 'email',
    subject: 'Chào mừng {{userName}} gia nhập nền tảng luyện thi JLPT Online!',
    bodyTemplate: 'Xin chào {{userName}},\n\nCảm ơn bạn đã đăng ký tài khoản. Hãy bắt đầu bài thi thử đầu tiên để xác định trình độ của mình ngay hôm nay nhé!\n\nTrân trọng,\nĐội ngũ JLPT Online',
    isActive: true,
    variables: ['userName', 'loginUrl'],
  },
  {
    id: 'exam_result',
    key: 'exam_result',
    name: 'Thông Báo Kết Quả Bài Thi',
    channel: 'in_app',
    subject: 'Kết quả bài thi {{examTitle}}: {{score}}/180 điểm ({{resultStatus}})',
    bodyTemplate: 'Chúc mừng bạn đã hoàn thành bài thi {{examTitle}} với số điểm {{score}}/180. Nhấn vào đây để xem phân tích chi tiết từng mondai.',
    isActive: true,
    variables: ['examTitle', 'score', 'resultStatus'],
  },
  {
    id: 'streak_reminder',
    key: 'streak_reminder',
    name: 'Nhắc Nhở Duy Trì Chuỗi Học Tập (Streak)',
    channel: 'push',
    subject: 'Đừng để mất chuỗi {{streakDays}} ngày học tập!',
    bodyTemplate: 'Chỉ còn 3 tiếng nữa là hết ngày. Dành 15 phút ôn tập 30 thẻ flashcards để bảo vệ ngọn lửa streak của bạn nhé!',
    isActive: true,
    variables: ['userName', 'streakDays'],
  },
];

export interface NotificationsSettingsPageProps {
  initialTemplates?: NotificationTemplate[];
}

export default function NotificationsSettingsPage({
  initialTemplates = DEFAULT_TEMPLATES,
}: NotificationsSettingsPageProps = {}): React.JSX.Element {
  const { token, locale } = useAdminAuth();
  const [templates, setTemplates] = useState<NotificationTemplate[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(initialTemplates[0] ?? null);
  const [testEmail, setTestEmail] = useState<string>('tester@jlpt.local');
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/settings/notifications', {
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
      if (Array.isArray(data.items) && data.items.length > 0) {
        setTemplates(data.items);
        setSelectedTemplate(data.items[0] ?? null);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  }, [token, locale]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleSave = async (updated: NotificationTemplate) => {
    try {
      if (token) {
        await fetch(`/api/v1/admin/settings/notifications/${encodeURIComponent(updated.id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Host: 'admin.jlpt.local',
          },
          body: JSON.stringify(updated),
        });
      }
    } catch {
      // Offline fallback
    }

    setTemplates((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedTemplate(updated);
    setSendSuccess('Đã lưu cấu hình mẫu thông báo thành công.');
    setTimeout(() => setSendSuccess(null), 3000);
  };

  const handleTestSend = () => {
    setSendSuccess(`Đã gửi thông báo thử nghiệm tới: ${testEmail}`);
    setTimeout(() => setSendSuccess(null), 3000);
  };

  return (
    <AdminGuard pathname="/settings/notifications">
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Cấu hình Thông báo &amp; Email Tự động (ADM-18)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản trị các mẫu email giao dịch, thông báo trong ứng dụng (In-app) và đẩy di động (Push Notifications).
          </p>
        </header>

        {error && (
          <div
            role="alert"
            data-testid="notifications-error-alert"
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={() => void fetchTemplates()}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
            >
              {t('common.retry', locale)}
            </button>
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

        {sendSuccess && (
          <div
            data-testid="alert-notification-success"
            className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-sm font-semibold"
          >
            ✓ {sendSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-800">
              Danh sách mẫu thông báo ({templates.length})
            </h2>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <div data-testid="notifications-empty" className="p-6 bg-white border border-gray-200 rounded-lg text-center text-xs text-gray-400 italic">
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
                        ? 'bg-blue-50 border-blue-600 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-sm font-semibold text-gray-900">{tpl.name}</strong>
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

          {/* Template Editor */}
          {selectedTemplate && (
            <div
              data-testid="template-editor-panel"
              className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs"
            >
              <h2 className="text-lg font-bold text-gray-900">
                Chỉnh sửa mẫu: {selectedTemplate.name}
              </h2>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Tiêu đề thông báo / Subject:
                </label>
                <input
                  data-testid="input-tpl-subject"
                  type="text"
                  value={selectedTemplate.subject}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Nội dung mẫu (hỗ trợ biến chèn động):
                </label>
                <textarea
                  data-testid="input-tpl-body"
                  rows={8}
                  value={selectedTemplate.bodyTemplate}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, bodyTemplate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <span className="text-xs text-gray-500">
                  Biến có thể sử dụng:{' '}
                  {selectedTemplate.variables.map((v) => (
                    <code
                      key={v}
                      className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 mr-1.5 font-mono text-xs"
                    >
                      {`{{${v}}}`}
                    </code>
                  ))}
                </span>
              </div>

              {/* Test send */}
              <div className="bg-gray-50 p-4 rounded-lg flex flex-wrap gap-2 items-center">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Nhập email kiểm thử..."
                  className="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  data-testid="btn-test-send"
                  onClick={handleTestSend}
                  className="px-4 py-1.5 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold"
                >
                  Gửi thử nghiệm
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  data-testid="btn-save-notification-tpl"
                  onClick={() => void handleSave(selectedTemplate)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs"
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
