'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';

export interface AiModerationLog {
  id: string;
  actionType: 'explain_generation' | 'content_translation' | 'question_synthesis';
  provider: 'gemini' | 'openai';
  model: string;
  flaggedUnsafe: boolean;
  promptTokens: number;
  completionTokens: number;
  costVnd: number;
  createdAt: string;
  reviewStatus: 'auto_passed' | 'flagged' | 'reviewed';
}

export default function AiModerationPage(): React.JSX.Element {
  const { user: _user } = useAdminAuth();

  const [logs, setLogs] = useState<AiModerationLog[]>([
    {
      id: 'ai-req-101',
      actionType: 'explain_generation',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      flaggedUnsafe: false,
      promptTokens: 420,
      completionTokens: 280,
      costVnd: 18,
      createdAt: '2026-10-16 11:24',
      reviewStatus: 'auto_passed',
    },
    {
      id: 'ai-req-102',
      actionType: 'question_synthesis',
      provider: 'openai',
      model: 'gpt-4o-mini',
      flaggedUnsafe: true,
      promptTokens: 850,
      completionTokens: 520,
      costVnd: 36,
      createdAt: '2026-10-16 10:15',
      reviewStatus: 'flagged',
    },
  ]);

  const [filterFlagged, setFilterFlagged] = useState<boolean>(false);

  const filtered = logs.filter((l) => !filterFlagged || l.flaggedUnsafe);

  const handleApprove = (id: string) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, reviewStatus: 'reviewed', flaggedUnsafe: false } : l)),
    );
  };

  return (
    <AdminGuard pathname="/moderation/ai">
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#111827' }}>
            Kiểm duyệt Nội dung AI & Giám sát Chi phí
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Theo dõi các yêu cầu sinh lời giải, dịch thuật và tổng hợp đề từ mô hình AI, phát hiện rủi ro và kiểm soát chi phí API.
          </p>
        </header>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                data-testid="checkbox-filter-flagged"
                type="checkbox"
                checked={filterFlagged}
                onChange={(e) => setFilterFlagged(e.target.checked)}
              />
              Chỉ hiển thị yêu cầu bị cảnh báo an toàn ({logs.filter((l) => l.flaggedUnsafe).length})
            </label>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Mã yêu cầu</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Tác vụ</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Nhà cung cấp / Model</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Tokens</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Chi phí ước tính</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} data-testid={`ai-log-row-${item.id}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.id}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{item.actionType}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#4b5563', fontSize: '0.85rem' }}>
                    {item.provider} / {item.model}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                    {item.promptTokens} in / {item.completionTokens} out
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#059669' }}>
                    {item.costVnd} đ
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: item.flaggedUnsafe ? '#fee2e2' : '#d1fae5',
                        color: item.flaggedUnsafe ? '#991b1b' : '#065f46',
                      }}
                    >
                      {item.flaggedUnsafe ? 'CẢNH BÁO' : 'AN TOÀN'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {item.flaggedUnsafe && (
                      <button
                        data-testid={`btn-approve-ai-${item.id}`}
                        onClick={() => handleApprove(item.id)}
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#10b981',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Bỏ cảnh báo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
