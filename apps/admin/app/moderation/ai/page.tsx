'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@jlpt/ui';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { t } from '../../../lib/i18n';

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
  const { user: _user, locale } = useAdminAuth();

  const [logs, setLogs] = useState<AiModerationLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterFlagged, setFilterFlagged] = useState<boolean>(false);

  const fetchAiLogs = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = (await apiClient.getContentReport('ai').catch(() => null)) as { items?: Record<string, unknown>[] } | Record<string, unknown>[] | null;
      const items = Array.isArray(res) ? res : res?.items || [];
      if (Array.isArray(items)) {
        const mapped: AiModerationLog[] = items.map((it: Record<string, unknown>) => ({
          id: String(it.id || ''),
          actionType: (it.actionType as AiModerationLog['actionType']) || 'explain_generation',
          provider: (it.provider as AiModerationLog['provider']) || 'gemini',
          model: String(it.model || 'gemini-1.5-flash'),
          flaggedUnsafe: Boolean(it.flaggedUnsafe),
          promptTokens: typeof it.promptTokens === 'number' ? it.promptTokens : 0,
          completionTokens: typeof it.completionTokens === 'number' ? it.completionTokens : 0,
          costVnd: typeof it.costVnd === 'number' ? it.costVnd : 0,
          createdAt: it.createdAt ? new Date(String(it.createdAt)).toISOString().slice(0, 16).replace('T', ' ') : '2026-10-18 10:00',
          reviewStatus: (it.reviewStatus as AiModerationLog['reviewStatus']) || (it.flaggedUnsafe ? 'flagged' : 'auto_passed'),
        }));
        setLogs(mapped);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Không thể nạp nhật ký kiểm duyệt AI.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAiLogs();
  }, []);

  const filtered = logs.filter((l) => !filterFlagged || l.flaggedUnsafe);

  const handleApprove = async (id: string) => {
    try {
      await apiClient.reviewAiContent(id, 'approved', 'Biên tập viên bỏ cảnh báo an toàn').catch(() => null);
      setLogs((prev) =>
        prev.map((l) => (l.id === id ? { ...l, reviewStatus: 'reviewed', flaggedUnsafe: false } : l)),
      );
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  };

  return (
    <AdminGuard pathname="/moderation/ai">
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <header className="border-b border-gray-200 pb-4">
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            {t('content.aiModeration.title', locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('content.aiModeration.subtitle', locale)}
          </p>
        </header>

        {isLoading && (
          <div
            data-testid="ai-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
          >
            {t('common.loading', locale)}
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="ai-error-alert"
            className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm"
          >
            <strong className="font-semibold">Lỗi: </strong>
            {errorMessage}
          </div>
        )}

        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700 dark:text-slate-300">
            <Input
              data-testid="checkbox-filter-flagged"
              type="checkbox"
              checked={filterFlagged}
              onChange={(e) => setFilterFlagged(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 min-h-0"
            />
            {t('content.aiModeration.filterLabel', locale)} ({logs.filter((l) => l.flaggedUnsafe).length})
          </label>
        </div>

        <div className="overflow-x-auto w-full border border-gray-200 dark:border-slate-800 rounded-lg shadow-xs bg-white dark:bg-slate-900">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300">
                <th className="p-3">Mã yêu cầu</th>
                <th className="p-3">Tác vụ</th>
                <th className="p-3">Nhà cung cấp / Model</th>
                <th className="p-3">Tokens</th>
                <th className="p-3">Chi phí ước tính</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} data-testid="ai-empty" className="p-8 text-center text-gray-400">
                    {t('content.aiModeration.empty', locale)}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} data-testid={`ai-log-row-${item.id}`} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono text-xs">{item.id}</td>
                    <td className="p-3 font-semibold text-gray-900 dark:text-slate-100">{item.actionType}</td>
                    <td className="p-3 text-xs text-gray-600 dark:text-slate-400">
                      {item.provider} / {item.model}
                    </td>
                    <td className="p-3 text-xs text-gray-600 dark:text-slate-400">
                      {item.promptTokens} in / {item.completionTokens} out
                    </td>
                    <td className="p-3 font-semibold text-emerald-600">
                      {item.costVnd} đ
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          item.flaggedUnsafe
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {item.flaggedUnsafe ? 'CẢNH BÁO' : 'AN TOÀN'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {item.flaggedUnsafe && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          data-testid={`btn-approve-ai-${item.id}`}
                          onClick={() => handleApprove(item.id)}
                        >
                          {t('content.aiModeration.unflagBtn', locale)}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
