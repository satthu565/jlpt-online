'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from '@jlpt/ui/components/alert';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';
import { Skeleton } from '@jlpt/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@jlpt/ui/components/table';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import {
  apiClient,
  type HanVietReviewItem,
  type HanVietReviewList,
} from '../../../lib/api-client';
import { t } from '../../../lib/i18n';
import { cn } from '@jlpt/ui/utils';

const PAGE_SIZE = 50;

export default function HanVietReviewPage(): React.JSX.Element {
  const { user, locale } = useAdminAuth();
  const canEdit = !!user && ['admin', 'editor', 'reviewer'].includes(user.role);

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  // Default filter: "Cần xem lại" (review) as required by specification
  const [confidence, setConfidence] = useState('review');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HanVietReviewList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // In-place editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listHanVietReview({
        confidence: confidence || undefined,
        q: submittedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(res);
    } catch (err: unknown) {
      setError((err as Error)?.message || t('hanvietReview.error', locale));
    } finally {
      setLoading(false);
    }
  }, [confidence, submittedSearch, page, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStartEdit = (it: HanVietReviewItem) => {
    if (!canEdit) return;
    setEditingId(it.id);
    setEditValues((prev) => ({
      ...prev,
      [it.id]: prev[it.id] ?? it.hanViet ?? '',
    }));
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSaveError(null);
  };

  const handleSave = async (id: string) => {
    if (!canEdit) return;
    const valueToSave = (editValues[id] ?? '').trim();
    if (!valueToSave) {
      setSaveError(t('hanvietReview.error', locale));
      return;
    }

    setSavingId(id);
    setSaveError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiClient.updateHanVietEntry(id, valueToSave);
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((row) => {
            if (row.id !== id) return row;
            return {
              ...row,
              hanViet: updated.hanViet,
              confidence: 'high',
              source: 'manual',
            };
          }),
        };
      });
      setEditingId(null);
      setSuccessMsg(t('hanvietReview.saveSuccess', locale));
    } catch (err: unknown) {
      // Keep editValues[id] so the user's typed data is NOT lost on error
      setSaveError((err as Error)?.message || t('hanvietReview.error', locale));
    } finally {
      setSavingId(null);
    }
  };

  const handleConfirmCorrect = async (it: HanVietReviewItem) => {
    if (!canEdit) return;
    setSavingId(it.id);
    setSaveError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiClient.updateHanVietEntry(it.id, it.hanViet);
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((row) => {
            if (row.id !== it.id) return row;
            return {
              ...row,
              hanViet: updated.hanViet,
              confidence: 'high',
              source: 'manual',
            };
          }),
        };
      });
      setSuccessMsg(t('hanvietReview.saveSuccess', locale));
    } catch (err: unknown) {
      setSaveError((err as Error)?.message || t('hanvietReview.error', locale));
    } finally {
      setSavingId(null);
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const getConfidenceBadge = (conf: string) => {
    switch (conf) {
      case 'high':
        return <Badge variant="success">{t('hanvietReview.confidenceHigh', locale)}</Badge>;
      case 'review':
        return <Badge variant="warning">{t('hanvietReview.confidenceReview', locale)}</Badge>;
      case 'kun':
        return <Badge variant="neutral">{t('hanvietReview.confidenceKun', locale)}</Badge>;
      default:
        return <Badge variant="default">{conf}</Badge>;
    }
  };

  const getSourceBadge = (src: string) => {
    switch (src) {
      case 'manual':
        return <Badge variant="success">{t('hanvietReview.sourceManual', locale)}</Badge>;
      case 'override':
        return <Badge variant="primary">{t('hanvietReview.sourceOverride', locale)}</Badge>;
      case 'rule':
        return <Badge variant="secondary">{t('hanvietReview.sourceRule', locale)}</Badge>;
      default:
        return <Badge variant="neutral">{src}</Badge>;
    }
  };

  return (
    <AdminGuard pathname="/lexicon/hanviet" requiredRoles={['admin', 'editor', 'reviewer']}>
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden font-sans">
        <div>
          <h1
            data-testid="page-title"
            className="text-2xl font-bold text-gray-900 dark:text-gray-100"
          >
            {t('hanvietReview.title', locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('hanvietReview.subtitle', locale)}
          </p>
        </div>

        {error && (
          <Alert variant="error" data-testid="hanviet-error">
            {error}{' '}
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              {t('hanvietReview.retry', locale)}
            </Button>
          </Alert>
        )}

        {saveError && (
          <Alert
            variant="error"
            data-testid="hanviet-save-error"
            onClose={() => setSaveError(null)}
          >
            {saveError}
          </Alert>
        )}

        {successMsg && (
          <Alert
            variant="success"
            data-testid="hanviet-success"
            onClose={() => setSuccessMsg(null)}
          >
            {successMsg}
          </Alert>
        )}

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSubmittedSearch(search.trim());
          }}
        >
          <div className="min-w-0 flex-1 min-w-[200px]">
            <Input
              data-testid="hanviet-search"
              placeholder={t('hanvietReview.searchPlaceholder', locale)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              data-testid="hanviet-confidence"
              aria-label={t('hanvietReview.confidence', locale)}
              value={confidence}
              onChange={(e) => {
                setPage(1);
                setConfidence(e.target.value);
              }}
              options={[
                { value: 'review', label: t('hanvietReview.confidenceReview', locale) },
                { value: 'kun', label: t('hanvietReview.confidenceKun', locale) },
                { value: 'high', label: t('hanvietReview.confidenceHigh', locale) },
                { value: '', label: t('hanvietReview.confidenceAll', locale) },
              ]}
            />
          </div>
          <Button type="submit" data-testid="hanviet-search-btn">
            {t('hanvietReview.search', locale)}
          </Button>
        </form>

        {data && (
          <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="hanviet-total">
            {t('hanvietReview.total', locale)}:{' '}
            {data.total.toLocaleString(
              locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN',
            )}
          </p>
        )}

        {loading ? (
          <div className="space-y-2" data-testid="hanviet-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center" data-testid="hanviet-empty">
            {t('hanvietReview.empty', locale)}
          </p>
        ) : (
          <Table data-testid="hanviet-table">
            <TableHeader>
              <TableRow>
                <TableHead>{t('hanvietReview.colTerm', locale)}</TableHead>
                <TableHead>{t('hanvietReview.colReading', locale)}</TableHead>
                <TableHead>{t('hanvietReview.colMeaning', locale)}</TableHead>
                <TableHead>{t('hanvietReview.colHanViet', locale)}</TableHead>
                <TableHead>{t('hanvietReview.colPerKanji', locale)}</TableHead>
                <TableHead>{t('hanvietReview.colConfidence', locale)}</TableHead>
                <TableHead>{t('hanvietReview.colSource', locale)}</TableHead>
                <TableHead className="text-center">{t('hanvietReview.colReports', locale)}</TableHead>
                <TableHead>{t('hanvietReview.colActions', locale)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((it) => {
                const isEditing = editingId === it.id;
                const isSaving = savingId === it.id;

                return (
                  <TableRow key={it.id} data-testid="hanviet-row">
                    <TableCell
                      className="font-japanese text-base font-semibold"
                      data-testid={`cell-term-${it.id}`}
                    >
                      {it.term}
                    </TableCell>
                    <TableCell
                      className="font-japanese"
                      data-testid={`cell-reading-${it.id}`}
                    >
                      {it.reading}
                    </TableCell>
                    <TableCell
                      className="max-w-xs text-sm text-gray-600 dark:text-gray-300 truncate"
                      title={it.meaning}
                    >
                      {it.meaning || '—'}
                    </TableCell>
                    <TableCell
                      className="min-w-[140px]"
                      data-testid={`cell-hanviet-${it.id}`}
                    >
                      {isEditing ? (
                        <Input
                          data-testid={`input-hanviet-${it.id}`}
                          value={editValues[it.id] ?? it.hanViet}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditValues((prev) => ({ ...prev, [it.id]: val }));
                          }}
                          disabled={isSaving}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleSave(it.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className={cn(
                            'font-medium inline-block py-1 px-1.5 rounded',
                            canEdit
                              ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400'
                              : 'text-gray-900 dark:text-gray-100',
                          )}
                          onClick={() => {
                            if (canEdit) handleStartEdit(it);
                          }}
                          title={canEdit ? t('hanvietReview.edit', locale) : undefined}
                        >
                          {it.hanViet || '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {it.perKanji && it.perKanji.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {it.perKanji.map((k, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-[11px]"
                            >
                              {k.kanji} - {k.onyomi || '—'} - {k.hanViet || '—'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`cell-confidence-${it.id}`}>
                      {getConfidenceBadge(it.confidence)}
                    </TableCell>
                    <TableCell data-testid={`cell-source-${it.id}`}>
                      {getSourceBadge(it.source)}
                    </TableCell>
                    <TableCell className="text-center" data-testid={`cell-reports-${it.id}`}>
                      {it.reportCount > 0 ? (
                        <Badge variant="destructive">{it.reportCount}</Badge>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {canEdit ? (
                          isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => void handleSave(it.id)}
                                disabled={isSaving}
                                data-testid={`btn-save-${it.id}`}
                              >
                                {isSaving
                                  ? t('hanvietReview.saving', locale)
                                  : t('hanvietReview.save', locale)}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                data-testid={`btn-cancel-${it.id}`}
                              >
                                {t('hanvietReview.cancel', locale)}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleStartEdit(it)}
                                data-testid={`btn-edit-${it.id}`}
                              >
                                {t('hanvietReview.edit', locale)}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleConfirmCorrect(it)}
                                disabled={isSaving}
                                data-testid={`btn-confirm-${it.id}`}
                              >
                                {t('hanvietReview.confirmCorrect', locale)}
                              </Button>
                            </>
                          )
                        ) : (
                          <span
                            className="text-xs text-gray-400"
                            data-testid={`no-permission-${it.id}`}
                          >
                            {t('hanvietReview.noPermission', locale)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            data-testid="hanviet-prev"
          >
            {t('hanvietReview.prev', locale)}
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('hanvietReview.page', locale)} {page} / {pages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => p + 1)}
            data-testid="hanviet-next"
          >
            {t('hanvietReview.next', locale)}
          </Button>
        </div>
      </div>
    </AdminGuard>
  );
}
