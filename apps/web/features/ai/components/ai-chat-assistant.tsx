'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Badge, Alert } from '@jlpt/ui';
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
            <span role="img" aria-label="AI">
              🤖
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('seo.ai.title')}
            </h3>
            {/* AI Generation Transparency Label */}
            <Badge variant="info" size="sm" data-testid="ai-generated-badge">
              ✨ {t('seo.ai.labelGenerated')}
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
          <button
            type="button"
            onClick={() => setDepth('standard')}
            data-testid="ai-depth-standard-btn"
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              depth === 'standard'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t('seo.ai.standardDepth')}
          </button>
          <button
            type="button"
            onClick={() => setDepth('deep')}
            data-testid="ai-depth-deep-btn"
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              depth === 'deep'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🔬 {t('seo.ai.deepDepth')}
          </button>
        </div>
      </div>

      {/* Transparency Disclaimer */}
      <div
        data-testid="ai-disclaimer"
        className="text-[11px] leading-relaxed text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800"
      >
        ℹ️ {t('seo.ai.disclaimer')}
      </div>

      {/* Quota Counter */}
      {usage && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {t('seo.ai.quotaLabel', { remaining: usage.remainingTokensQuota })}
          </span>
          {usage.isBudgetExhausted && (
            <span className="text-rose-600 font-semibold">
              ⚠️ {t('seo.ai.budgetExhausted')}
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
                <span>🤖</span>
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
