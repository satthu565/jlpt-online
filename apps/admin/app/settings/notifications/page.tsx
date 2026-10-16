'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';

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

export default function NotificationsSettingsPage(): React.JSX.Element {
  const { user: _user } = useAdminAuth();

  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      id: 'tpl-1',
      key: 'welcome_email',
      name: 'Email Chào Mừng Thành Viên Mới',
      channel: 'email',
      subject: 'Chào mừng {{userName}} gia nhập nền tảng luyện thi JLPT Online!',
      bodyTemplate: 'Xin chào {{userName}},\n\nCảm ơn bạn đã đăng ký tài khoản. Hãy bắt đầu bài thi thử đầu tiên để xác định trình độ của mình ngay hôm nay nhé!\n\nTrân trọng,\nĐội ngũ JLPT Online',
      isActive: true,
      variables: ['userName', 'loginUrl'],
    },
    {
      id: 'tpl-2',
      key: 'exam_result',
      name: 'Thông Báo Kết Quả Bài Thi',
      channel: 'in_app',
      subject: 'Kết quả bài thi {{examTitle}}: {{score}}/180 điểm ({{resultStatus}})',
      bodyTemplate: 'Chúc mừng bạn đã hoàn thành bài thi {{examTitle}} với số điểm {{score}}/180. Nhấn vào đây để xem phân tích chi tiết từng mondai.',
      isActive: true,
      variables: ['examTitle', 'score', 'resultStatus'],
    },
    {
      id: 'tpl-3',
      key: 'streak_reminder',
      name: 'Nhắc Nhở Duy Trì Chuỗi Học Tập (Streak)',
      channel: 'push',
      subject: 'Đừng để mất chuỗi {{streakDays}} ngày học tập!',
      bodyTemplate: 'Chỉ còn 3 tiếng nữa là hết ngày. Dành 15 phút ôn tập 30 thẻ flashcards để bảo vệ ngọn lửa streak của bạn nhé!',
      isActive: true,
      variables: ['userName', 'streakDays'],
    },
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(templates[0] ?? null);
  const [testEmail, setTestEmail] = useState<string>('tester@jlpt.local');
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const handleSave = (updated: NotificationTemplate) => {
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
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
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#111827' }}>
            Cấu hình Thông báo & Email Tự động (ADM-18)
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Quản trị các mẫu email giao dịch, thông báo trong ứng dụng (In-app) và đẩy di động (Push Notifications).
          </p>
        </header>

        {sendSuccess && (
          <div
            data-testid="alert-notification-success"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: '#d1fae5',
              border: '1px solid #10b981',
              color: '#065f46',
              marginBottom: '1.5rem',
              fontWeight: 600,
            }}
          >
            ✓ {sendSuccess}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          {/* Template List */}
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>
              Danh sách mẫu thông báo ({templates.length})
            </h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  data-testid={`tpl-item-${tpl.id}`}
                  onClick={() => setSelectedTemplate(tpl)}
                  style={{
                    background: selectedTemplate?.id === tpl.id ? '#eff6ff' : '#ffffff',
                    border: selectedTemplate?.id === tpl.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{tpl.name}</strong>
                    <span
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: tpl.channel === 'email' ? '#dbeafe' : tpl.channel === 'push' ? '#fef3c7' : '#e0e7ff',
                        color: tpl.channel === 'email' ? '#1e40af' : tpl.channel === 'push' ? '#92400e' : '#3730a3',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {tpl.channel.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Mã: {tpl.key}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Template Editor */}
          {selectedTemplate && (
            <div
              data-testid="template-editor-panel"
              style={{
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.25rem' }}>
                Chỉnh sửa mẫu: {selectedTemplate.name}
              </h2>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Tiêu đề thông báo / Subject:
                </label>
                <input
                  data-testid="input-tpl-subject"
                  type="text"
                  value={selectedTemplate.subject}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })
                  }
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Nội dung mẫu (hỗ trợ biến chèn động):
                </label>
                <textarea
                  data-testid="input-tpl-body"
                  rows={8}
                  value={selectedTemplate.bodyTemplate}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, bodyTemplate: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Biến có thể sử dụng:{' '}
                  {selectedTemplate.variables.map((v) => (
                    <code key={v} style={{ background: '#f3f4f6', padding: '0.15rem 0.35rem', borderRadius: '4px', marginRight: '0.35rem' }}>
                      {`{{${v}}}`}
                    </code>
                  ))}
                </span>
              </div>

              {/* Test send */}
              <div
                style={{
                  background: '#f9fafb',
                  padding: '1rem',
                  borderRadius: '6px',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                }}
              >
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Nhập email kiểm thử..."
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', flex: 1 }}
                />
                <button
                  data-testid="btn-test-send"
                  onClick={handleTestSend}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    background: '#4b5563',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Gửi thử nghiệm
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  data-testid="btn-save-notification-tpl"
                  onClick={() => handleSave(selectedTemplate)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
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
