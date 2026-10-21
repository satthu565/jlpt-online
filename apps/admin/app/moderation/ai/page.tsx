'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { t } from '../../../lib/i18n';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';

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

        <div className="overflow-x-auto w-full">
          <Table className="text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Mã yêu cầu</TableHead>
                <TableHead>Tác vụ</TableHead>
                <TableHead>Nhà cung cấp / Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Chi phí ước tính</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} data-testid="ai-empty" className="text-center">
                    {t('content.aiModeration.empty', locale)}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} data-testid={`ai-log-row-${item.id}`}>
                    <TableCell className="font-mono">{item.id}</TableCell>
                    <TableCell className="font-semibold">{item.actionType}</TableCell>
                    <TableCell>
                      {item.provider} / {item.model}
                    </TableCell>
                    <TableCell>
                      {item.promptTokens} in / {item.completionTokens} out
                    </TableCell>
                    <TableCell className="font-semibold">
                      {item.costVnd} đ
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          item.flaggedUnsafe
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {item.flaggedUnsafe ? 'CẢNH BÁO' : 'AN TOÀN'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminGuard>
  );
}
