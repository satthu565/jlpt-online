'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Check, Copy, Sparkles, Star } from 'lucide-react';
import { Button, Card, Chip } from '@jlpt/ui/components/exam-controls';
import { defaultLearningClient } from '../../learning';
import type { GrammarItem, JlptLevel } from '../data/grammar-dictionary';
import type { SelectionLookupContext } from './selection-lookup-popover';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';

export interface SelectionGrammarPanelProps {
  queryText: string;
  patterns: GrammarItem[];
  context?: SelectionLookupContext;
}

const LEVEL_COLOR_MAP: Record<JlptLevel, 'default' | 'success' | 'warning' | 'danger' | 'accent'> = {
  N5: 'accent',
  N4: 'success',
  N3: 'warning',
  N2: 'accent',
  N1: 'danger',
};

export function SelectionGrammarPanel({
  queryText,
  patterns,
  context,
}: SelectionGrammarPanelProps): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Record<string, string>>({}); // pattern.id -> notebookItemId
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedExample, setCopiedExample] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{ id: string; message: string; tone: 'success' | 'error' } | null>(null);

  // Check saved state for each grammar pattern in user's notebook
  useEffect(() => {
    let active = true;
    if (!user || patterns.length === 0) {
      setSavedIds({});
      return;
    }

    Promise.all(
      patterns.map(async (p) => {
        try {
          const res = await defaultLearningClient.getNotebookItems({
            kind: 'grammar',
            search: p.cleanPattern,
            limit: 20,
          });
          const match = res.items.find((item) =>
            item.term.includes(p.cleanPattern) || p.pattern.includes(item.term)
          );
          return { patternId: p.id, notebookId: match?.id ?? null };
        } catch {
          return { patternId: p.id, notebookId: null };
        }
      }),
    ).then((results) => {
      if (!active) return;
      const nextMap: Record<string, string> = {};
      for (const r of results) {
        if (r.notebookId) {
          nextMap[r.patternId] = r.notebookId;
        }
      }
      setSavedIds(nextMap);
    });

    return () => {
      active = false;
    };
  }, [user, patterns]);

  const handleToggleSave = useCallback(
    async (pattern: GrammarItem) => {
      if (!user) {
        setFeedbackNotice({
          id: pattern.id,
          message: 'Vui lòng đăng nhập để lưu ngữ pháp vào sổ tay',
          tone: 'error',
        });
        return;
      }

      const existingNotebookId = savedIds[pattern.id];
      setSavingId(pattern.id);

      if (existingNotebookId) {
        // Delete from notebook
        try {
          await defaultLearningClient.deleteNotebookItem(existingNotebookId);
          setSavedIds((prev) => {
            const next = { ...prev };
            delete next[pattern.id];
            return next;
          });
          setFeedbackNotice({
            id: pattern.id,
            message: 'Đã bỏ lưu ngữ pháp',
            tone: 'success',
          });
        } catch {
          setFeedbackNotice({
            id: pattern.id,
            message: 'Không thể bỏ lưu, vui lòng thử lại',
            tone: 'error',
          });
        } finally {
          setSavingId(null);
        }
      } else {
        // Create in notebook
        try {
          const tags: string[] = ['grammar', `level:${pattern.level.toLowerCase()}`];
          if (context?.examTitle) tags.push(`#source_exam:${context.examTitle}`);
          if (context?.questionNumber !== undefined) tags.push(`#source_qnum:${context.questionNumber}`);
          if (context?.questionId) tags.push(`#source_qid:${context.questionId}`);
          if (context?.sentence) tags.push(`#source_sentence:${context.sentence}`);

          const created = await defaultLearningClient.createNotebookItem({
            kind: 'grammar',
            term: pattern.pattern,
            reading: pattern.cleanPattern,
            meaning: pattern.meaning,
            notes: pattern.formation,
            examples: pattern.examples,
            tags,
            sourceExam: context?.examTitle,
            sourceQnum: context?.questionNumber,
            sourceQid: context?.questionId,
            sourceSentence: context?.sentence,
          });

          setSavedIds((prev) => ({
            ...prev,
            [pattern.id]: created.id,
          }));
          setFeedbackNotice({
            id: pattern.id,
            message: 'Đã lưu ngữ pháp vào sổ tay',
            tone: 'success',
          });
        } catch {
          setFeedbackNotice({
            id: pattern.id,
            message: 'Không thể lưu ngữ pháp, vui lòng thử lại',
            tone: 'error',
          });
        } finally {
          setSavingId(null);
        }
      }
    },
    [user, savedIds, context],
  );

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedExample(text);
      setTimeout(() => setCopiedExample(null), 2000);
    } catch {
      // Ignore clipboard failure in restricted iframe/browser
    }
  }, []);

  if (patterns.length === 0) {
    return (
      <div className="space-y-3 py-6 text-center text-[var(--text-muted)]" data-testid="grammar-empty-state">
        <BookOpen className="mx-auto size-9 opacity-40" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Không tìm thấy mẫu ngữ pháp
          </p>
          <p className="mt-1 text-xs">
            Đoạn bôi đen &ldquo;{queryText}&rdquo; chưa khớp với mẫu ngữ pháp JLPT nào trong kho dữ liệu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="selection-grammar-panel">
      {patterns.map((item) => {
        const isSaved = Boolean(savedIds[item.id]);
        const isSaving = savingId === item.id;
        const notice = feedbackNotice?.id === item.id ? feedbackNotice : null;

        return (
          <Card
            key={item.id}
            className="rounded-xl border border-[var(--color-primary-light)] bg-[var(--surface)] p-3 shadow-xs"
            data-testid={`grammar-pattern-card-${item.id}`}
          >
            {/* Header: Level Chip + Pattern Title + Save Button */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip
                    color={LEVEL_COLOR_MAP[item.level] ?? 'primary'}
                    variant="secondary"
                    size="sm"
                    className="font-bold text-xs"
                  >
                    {item.level}
                  </Chip>
                  <h4 className="font-japanese text-base font-bold text-[var(--text-primary)]">
                    {item.pattern}
                  </h4>
                </div>
              </div>

              {/* Save to Notebook Button */}
              <Button
                size="sm"
                variant={isSaved ? 'secondary' : 'outline'}
                className={
                  isSaved
                    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 shrink-0 text-xs'
                    : 'shrink-0 text-xs'
                }
                isDisabled={isSaving}
                onPress={() => void handleToggleSave(item)}
                data-testid={`grammar-save-btn-${item.id}`}
                aria-pressed={isSaved}
              >
                <Star
                  className="size-4"
                  fill={isSaved ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
                {isSaved ? 'Đã lưu' : 'Lưu ngữ pháp'}
              </Button>
            </div>

            {/* Notification alert */}
            {notice && (
              <div
                className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  notice.tone === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
                role="status"
              >
                {notice.message}
              </div>
            )}

            {/* Meaning Section */}
            <div className="mt-2.5 rounded-lg bg-[var(--color-primary-light)]/40 p-2 text-xs leading-relaxed text-[var(--text-primary)]">
              <span className="font-semibold text-[var(--color-primary)]">Ý nghĩa: </span>
              {item.meaning}
            </div>

            {/* Formation Section */}
            <div className="mt-2 text-xs leading-relaxed">
              <span className="font-semibold text-[var(--text-muted)]">Cấu trúc: </span>
              <code className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">
                {item.formation}
              </code>
            </div>

            {/* Examples Section */}
            {item.examples.length > 0 && (
              <div className="mt-2.5 space-y-1.5 border-t border-[var(--border)] pt-2 text-xs">
                <span className="font-semibold text-[var(--text-muted)]">Ví dụ minh họa:</span>
                <ul className="space-y-1 pl-1">
                  {item.examples.map((ex, i) => (
                    <li
                      key={i}
                      className="group flex items-start justify-between gap-1 rounded px-1.5 py-0.5 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <span className="font-japanese text-xs leading-relaxed text-[var(--text-primary)]">
                        • {ex}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyText(ex)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Sao chép ví dụ"
                        aria-label="Sao chép ví dụ"
                      >
                        {copiedExample === ex ? (
                          <Check className="size-3 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Copy className="size-3" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
