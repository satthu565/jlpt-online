'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Check, Copy, Star } from 'lucide-react';
import { Button, Card, Chip, Separator } from '@jlpt/ui/components/exam-controls';
import { Alert } from '@jlpt/ui/components/alert';
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
      <Card data-testid="grammar-empty-state" className="border-dashed py-6 text-center">
        <Card.Content className="space-y-2">
          <BookOpen className="mx-auto size-9 opacity-40 text-[var(--text-muted)]" aria-hidden="true" />
          <Card.Title className="text-sm font-semibold text-[var(--text-primary)]">
            Không tìm thấy mẫu ngữ pháp
          </Card.Title>
          <Card.Description className="text-xs text-[var(--text-muted)]">
            Đoạn bôi đen &ldquo;{queryText}&rdquo; chưa khớp với mẫu ngữ pháp JLPT nào trong kho dữ liệu.
          </Card.Description>
        </Card.Content>
      </Card>
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
            className="rounded-2xl border border-[var(--color-primary-light)] bg-[var(--surface)] p-3.5 shadow-xs"
            data-testid={`grammar-pattern-card-${item.id}`}
          >
            {/* Header: Chip Level + Title + Save Button */}
            <Card.Header className="flex flex-row items-center justify-between gap-2 p-0 pb-2.5">
              <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                <Chip
                  color={LEVEL_COLOR_MAP[item.level] ?? 'default'}
                  variant="secondary"
                  size="sm"
                  className="font-bold"
                >
                  <Chip.Label>{item.level}</Chip.Label>
                </Chip>
                <Card.Title className="m-0 font-japanese text-base font-bold text-[var(--text-primary)] leading-tight">
                  {item.pattern}
                </Card.Title>
              </div>

              {/* Save to Notebook Button */}
              <Button
                size="sm"
                variant={isSaved ? 'secondary' : 'outline'}
                className={
                  isSaved
                    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 shrink-0 text-xs font-semibold'
                    : 'shrink-0 text-xs font-semibold'
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
            </Card.Header>

            {/* Notification alert */}
            {notice && (
              <div className="mb-2">
                <Alert variant={notice.tone === 'success' ? 'success' : 'error'}>
                  {notice.message}
                </Alert>
              </div>
            )}

            {/* Card Content: Meaning, Formation, Examples */}
            <Card.Content className="space-y-2.5 p-0">
              {/* Meaning Section */}
              <div className="rounded-xl border border-[var(--color-primary-light)]/60 bg-[var(--color-primary-light)]/20 p-2.5 text-xs leading-relaxed text-[var(--text-primary)]">
                <div className="mb-0.5 font-semibold text-[var(--color-primary)]">Ý nghĩa:</div>
                <p className="m-0 font-medium">{item.meaning}</p>
              </div>

              {/* Formation Section */}
              <div className="rounded-xl border border-[var(--border)] bg-black/5 dark:bg-white/5 p-2.5 text-xs leading-relaxed">
                <div className="mb-0.5 font-semibold text-[var(--text-muted)]">Cấu trúc kết hợp:</div>
                <code className="font-mono text-xs font-medium text-[var(--text-primary)]">
                  {item.formation}
                </code>
              </div>

              {/* Separator before examples */}
              {item.examples.length > 0 && (
                <>
                  <Separator className="my-1.5" />

                  {/* Examples Section */}
                  <div className="space-y-1.5 pt-0.5 text-xs">
                    <div className="font-semibold text-[var(--text-muted)]">Ví dụ minh họa:</div>
                    <ul className="space-y-1 pl-0 list-none m-0">
                      {item.examples.map((ex, i) => (
                        <li
                          key={i}
                          className="group flex items-start justify-between gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <span className="font-japanese text-xs leading-relaxed text-[var(--text-primary)]">
                            • {ex}
                          </span>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0"
                            onPress={() => void copyText(ex)}
                            aria-label="Sao chép ví dụ"
                          >
                            {copiedExample === ex ? (
                              <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                            ) : (
                              <Copy className="size-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                            )}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </Card.Content>
          </Card>
        );
      })}
    </div>
  );
}
