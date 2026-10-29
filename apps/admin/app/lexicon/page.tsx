'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';
import { Skeleton } from '@jlpt/ui/components/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api-client';
import { t } from '../../lib/i18n';
import type { LexiconItem } from '../../features/lexicon/types';
import { VietnameseMeaningPreview } from '../../features/lexicon/vietnamese-meaning-preview';
import { VietnameseMeaningsEditor } from '../../features/lexicon/vietnamese-meanings-editor';

const PAGE_SIZE = 50;
const POS_OPTIONS = [
  { value: '', label: '' }, // label filled with t('lexicon.posAll') at render
  { value: 'n', label: 'Danh từ (n)' },
  { value: 'v1', label: 'Động từ nhóm 2 (v1)' },
  { value: 'v5', label: 'Động từ nhóm 1 (v5)' },
  { value: 'vs', label: 'Danh động từ (vs)' },
  { value: 'adj-i', label: 'Tính từ đuôi い (adj-i)' },
  { value: 'adj-na', label: 'Tính từ đuôi な (adj-na)' },
  { value: 'adv', label: 'Phó từ (adv)' },
];

export default function LexiconPage(): React.JSX.Element {
  const { locale, user } = useAdminAuth();
  const [editing, setEditing] = useState<LexiconItem | null>(null);
  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [pos, setPos] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: LexiconItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listLexiconEntries({ q: submitted, pos, page, pageSize: PAGE_SIZE });
      setData({ total: res.total, items: res.items });
    } catch (err: unknown) {
      setError((err as Error)?.message || t('lexicon.error', locale));
    } finally {
      setLoading(false);
    }
  }, [submitted, pos, page, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <AdminGuard pathname="/lexicon" requiredRoles={['admin', 'editor', 'reviewer']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden font-sans">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('lexicon.title', locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('lexicon.subtitle', locale)}</p>
        </div>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSubmitted(query.trim());
          }}
        >
          <div className="min-w-0 flex-1">
            <Input
              data-testid="lexicon-search"
              placeholder={t('lexicon.searchPlaceholder', locale)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            data-testid="lexicon-pos"
            aria-label={t('lexicon.pos', locale)}
            value={pos}
            onChange={(e) => {
              setPage(1);
              setPos(e.target.value);
            }}
            options={POS_OPTIONS.map((o) => (o.value ? o : { ...o, label: t('lexicon.posAll', locale) }))}
          />
          <Button type="submit" data-testid="lexicon-search-btn">
            {t('lexicon.search', locale)}
          </Button>
        </form>

        {data && (
          <p className="text-sm text-gray-600" data-testid="lexicon-total">
            {t('lexicon.total', locale)}: {data.total.toLocaleString('vi-VN')}
          </p>
        )}

        {editing && <VietnameseMeaningsEditor key={editing.id} item={editing} locale={locale} onCancel={() => setEditing(null)} onSaved={result => {
          setData(previous => previous ? { ...previous, items: previous.items.map(item => item.id === editing.id ? { ...item, ...result } : item) } : previous);
          setEditing(null);
        }} />}

        {error ? (
          <Alert variant="error">
            {error}{' '}
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              {t('lexicon.retry', locale)}
            </Button>
          </Alert>
        ) : loading ? (
          <div className="space-y-2" data-testid="lexicon-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm text-gray-500" data-testid="lexicon-empty">
            {data && data.total === 0 && !submitted && !pos ? t('lexicon.emptyDb', locale) : t('lexicon.empty', locale)}
          </p>
        ) : (
          <Table data-testid="lexicon-table">
            <TableHeader>
              <TableRow>
                <TableHead>{t('lexicon.colTerm', locale)}</TableHead>
                <TableHead>{t('lexicon.colReading', locale)}</TableHead>
                <TableHead>{t('lexicon.colHanViet', locale)}</TableHead>
                <TableHead>{t('lexicon.colPos', locale)}</TableHead>
                <TableHead>{t('lexicon.colMeaning', locale)}</TableHead>
                <TableHead>{t('lexicon.colMeaningVi', locale)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((it) => (
                <TableRow key={it.id} data-testid="lexicon-row" data-entry-id={it.id}>
                  <TableCell className="font-japanese text-base font-semibold">{it.term}</TableCell>
                  <TableCell className="font-japanese">{it.readings.join('、')}</TableCell>
                  <TableCell>{it.hanViet}</TableCell>
                  <TableCell className="font-mono text-xs">{it.partOfSpeech}</TableCell>
                  <TableCell className="max-w-md">{it.meanings.join(' / ')}</TableCell>
                  <TableCell className="min-w-48 max-w-md" data-testid="lexicon-vi-cell">
                    <VietnameseMeaningPreview senses={it.meaningSenses} fallback={it.meaningsVi} locale={locale} />
                    {canEdit && <Button size="sm" variant="secondary" onClick={() => setEditing(it)} aria-label={`${t('lexicon.editVi', locale)}: ${it.term}`}>
                      {t('lexicon.editVi', locale)}
                    </Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} data-testid="lexicon-prev">
            {t('lexicon.prev', locale)}
          </Button>
          <span className="text-sm text-gray-600">
            {t('lexicon.page', locale)} {page} / {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)} data-testid="lexicon-next">
            {t('lexicon.next', locale)}
          </Button>
        </div>

        <p className="text-xs text-gray-500">{t('lexicon.attribution', locale)}</p>
      </div>
    </AdminGuard>
  );
}
