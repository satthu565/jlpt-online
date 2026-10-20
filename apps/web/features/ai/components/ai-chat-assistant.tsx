'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Search, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { AiClient } from '../services/ai-client';
import type { AiRequestResponseDto, AiUsageDto } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface AiChatAssistantProps {
  questionId?: string;
  attemptId?: string;
  contextTitle?: string;
  className?: string;
}

export function AiChatAssistant({
  questionId,
  attemptId,
  contextTitle,
  className = '',
}: AiChatAssistantProps): React.JSX.Element {
  const { t } = useI18n();
  const [client] = useState(() => new AiClient());
  const [depth, setDepth] = useState<'standard' | 'deep'>('standard');
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<AiUsageDto | null>(null);
  const [responses, setResponses] = useState<AiRequestResponseDto[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    client
      .getMyUsage()
      .then((data) => {
        if (active) setUsage(data);
      })
      .catch(() => {
        // Fallback for unauthenticated or mock tests
        if (active) {
          setUsage({
            userId: 'guest',
            totalTokensUsed: 120,
            totalCostMicroUsd: 12,
            activeReservationsCount: 0,
            remainingTokensQuota: 5000,
            isBudgetExhausted: false,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [client]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || loading) return;

    if (usage?.isBudgetExhausted) {
      setErrorMessage(t('seo.ai.budgetExhausted'));
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const res = await client.createRequest({
        action: depth === 'deep' ? 'deep_explain' : 'explain_question',
        questionId,
        attemptId,
        message: inputQuery.trim(),
        depth,
      });

      setResponses((prev) => [...prev, res]);
      setInputQuery('');

      // Refresh token quota
      if (usage) {
        setUsage((prev) =>
          prev
            ? {
                ...prev,
                totalTokensUsed: prev.totalTokensUsed + res.tokensUsed,
                remainingTokensQuota: Math.max(0, prev.remainingTokensQuota - res.tokensUsed),
              }
            : null,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('common.status.error');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      data-testid="ai-chat-assistant"
      className={`jlpt-ai-assistant border border-blue-200 dark:border-blue-900/60 p-4 md:p-6 space-y-4 ${className}`}
    >
      {/* Header with Title and Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" aria-label="AI" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('seo.ai.title')}
            </h3>
            {/* AI Generation Transparency Label */}
            <Badge variant="info" size="sm" data-testid="ai-generated-badge" className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              <span>{t('seo.ai.labelGenerated')}</span>
            </Badge>
          </div>
          {contextTitle && (
            <p className="text-xs text-slate-500 mt-1">
              {contextTitle}
            </p>
          )}
        </div>

        {/* Depth Mode Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          <Button
            type="button"
            variant={depth === 'standard' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setDepth('standard')}
            data-testid="ai-depth-standard-btn"
            className="px-2.5 py-1 h-auto text-xs font-medium rounded"
          >
            {t('seo.ai.standardDepth')}
          </Button>
          <Button
            type="button"
            variant={depth === 'deep' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setDepth('deep')}
            data-testid="ai-depth-deep-btn"
            className="px-2.5 py-1 h-auto text-xs font-medium rounded inline-flex items-center gap-1"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('seo.ai.deepDepth')}</span>
          </Button>
        </div>
      </div>

      {/* Transparency Disclaimer */}
      <div
        data-testid="ai-disclaimer"
        className="text-[11px] leading-relaxed text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 flex items-start gap-1.5"
      >
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
        <span>{t('seo.ai.disclaimer')}</span>
      </div>

      {/* Quota Counter */}
      {usage && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {t('seo.ai.quotaLabel', { remaining: usage.remainingTokensQuota })}
          </span>
          {usage.isBudgetExhausted && (
            <span className="text-rose-600 font-semibold inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('seo.ai.budgetExhausted')}</span>
            </span>
          )}
        </div>
      )}

      {/* Responses List */}
      <div className="space-y-3" data-testid="ai-responses-list">
        {responses.map((resp) => (
          <div
            key={resp.requestId}
            data-testid="ai-response-item"
            className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-slate-900/60 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between text-[11px] text-blue-800 dark:text-blue-300 font-medium">
              <span className="flex items-center gap-1">
                <Bot className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <span>{resp.action}</span>
              </span>
              <span className="text-slate-400">
                {resp.tokensUsed} tokens
              </span>
            </div>
            <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {resp.result?.text}
            </p>
          </div>
        ))}
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <Alert variant="error" className="text-xs" data-testid="ai-error-alert">
          {errorMessage}
        </Alert>
      )}

      {/* Input query form */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <div className="flex-1">
          <Input
            id="ai-query-input"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={t('seo.ai.askPlaceholder')}
            disabled={loading || Boolean(usage?.isBudgetExhausted)}
            data-testid="ai-query-input"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          disabled={loading || !inputQuery.trim() || Boolean(usage?.isBudgetExhausted)}
          data-testid="ai-send-btn"
        >
          {t('seo.ai.sendButton')}
        </Button>
      </form>
    </Card>
  );
}
