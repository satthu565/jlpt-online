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

type KanjiItem = {
  id: string;
  kanji: string;
  hanViet: string;
  hanVietByOnyomi: Array<{ onyomi: string; hanViet: string }>;
  onyomi: string[];
  kunyomi: string[];
  meanings: string[];
  strokeCount: number | null;
  level: string | null;
  meaningVi: string;
  levels: string[];
  edited?: boolean;
};
const PAGE_SIZE = 60;
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

/** 楽: "NHẠC (ガク) · LẠC (ラク)"; one reading per character shows just the reading. */
function hanVietLabel(it: KanjiItem): string {
  const distinct = [...new Set(it.hanVietByOnyomi.map((x) => x.hanViet))];
  if (distinct.length <= 1) return it.hanViet || distinct[0] || '';
  return distinct
    .map((hv) => `${hv} (${it.hanVietByOnyomi.filter((x) => x.hanViet === hv).map((x) => x.onyomi).join('・')})`)
    .join(' · ');
}

export default function KanjiPage(): React.JSX.Element {
  const { locale, user } = useAdminAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: KanjiItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<KanjiItem | null>(null);
  const [mainHv, setMainHv] = useState('');
  const [byOn, setByOn] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listKanjiEntries({ q: submitted, level, page, pageSize: PAGE_SIZE });
      setData({ total: res.total, items: res.items });
    } catch (err: unknown) {
      setError((err as Error)?.message || t('kanji.error', locale));
    } finally {
      setLoading(false);
    }
  }, [submitted, level, page, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (it: KanjiItem) => {
    setEditing(it);
    setMainHv(it.hanViet);
    setByOn(Object.fromEntries(it.onyomi.map((on) => [on, it.hanVietByOnyomi.find((x) => x.onyomi === on)?.hanViet ?? ''])));
    setEditError(null);
    setNotice(null);
  };

  const applyResult = (res: { kanji: string; hanViet: string; hanVietByOnyomi: KanjiItem['hanVietByOnyomi']; edited: boolean }) =>
    setData((d) =>
      d
        ? {
            ...d,
            items: d.items.map((x) =>
              x.kanji === res.kanji ? { ...x, hanViet: res.hanViet, hanVietByOnyomi: res.hanVietByOnyomi, edited: res.edited } : x,
            ),
          }
        : d,
    );

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await apiClient.updateKanjiHanViet(editing.kanji, { hanViet: mainHv, hanVietByOnyomi: byOn });
      applyResult(res);
      setNotice(t('kanji.saved', locale).replace('{kanji}', res.kanji).replace('{hanViet}', res.hanViet || '—'));
      setEditing(null);
    } catch (err: unknown) {
      setEditError((err as Error)?.message || t('kanji.error', locale));
    } finally {
      setSaving(false);
    }
  };

  const resetEdit = async (it: KanjiItem) => {
    setSaving(true);
    setEditError(null);
    try {
      const res = await apiClient.resetKanjiHanViet(it.kanji);
      applyResult(res);
      setNotice(t('kanji.resetDone', locale).replace('{kanji}', res.kanji).replace('{hanViet}', res.hanViet || '—'));
      setEditing(null);
    } catch (err: unknown) {
      setEditError((err as Error)?.message || t('kanji.error', locale));
    } finally {
      setSaving(false);
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const levelOptions = [
    { value: '', label: t('kanji.levelAll', locale) },
    ...LEVELS.map((l) => ({ value: l, label: l })),
    { value: 'none', label: t('kanji.levelNone', locale) },
  ];

  return (
    <AdminGuard pathname="/kanji" requiredRoles={['admin', 'editor', 'reviewer']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden font-sans">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('kanji.title', locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('kanji.subtitle', locale)}</p>
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
              data-testid="kanji-search"
              placeholder={t('kanji.searchPlaceholder', locale)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            data-testid="kanji-level"
            aria-label={t('kanji.level', locale)}
            value={level}
            onChange={(e) => {
              setPage(1);
              setLevel(e.target.value);
            }}
            options={levelOptions}
          />
          <Button type="submit" data-testid="kanji-search-btn">
            {t('kanji.search', locale)}
          </Button>
        </form>

        {data && (
          <p className="text-sm text-gray-600" data-testid="kanji-total">
            {t('kanji.total', locale)}: {data.total.toLocaleString('vi-VN')}
          </p>
        )}

        {notice && (
          <Alert variant="success" data-testid="kanji-notice">
            {notice}
          </Alert>
        )}

        {editing && (
          <div data-testid="kanji-edit-panel" className="rounded-xl border border-blue-300 bg-blue-50 p-4 space-y-3 dark:bg-slate-800">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {t('kanji.editTitle', locale).replace('{kanji}', editing.kanji)}
            </h2>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('kanji.mainHanViet', locale)}
              <Input data-testid="kanji-edit-main" value={mainHv} onChange={(e) => setMainHv(e.target.value)} />
            </label>
            {editing.onyomi.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('kanji.byOnyomi', locale)}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {editing.onyomi.map((on) => (
                    <label key={on} className="flex items-center gap-2 text-sm">
                      <span className="font-japanese w-20 shrink-0">{on}</span>
                      <Input
                        data-testid={`kanji-edit-on-${on}`}
                        value={byOn[on] ?? ''}
                        onChange={(e) => setByOn((m) => ({ ...m, [on]: e.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-600 dark:text-gray-300">{t('kanji.editHint', locale)}</p>
            {editError && <Alert variant="error">{editError}</Alert>}
            <div className="flex flex-wrap gap-2">
              <Button data-testid="kanji-edit-save" disabled={saving} onClick={() => void saveEdit()}>
                {saving ? t('kanji.saving', locale) : t('kanji.save', locale)}
              </Button>
              {editing.edited && (
                <Button data-testid="kanji-edit-reset" variant="outline" disabled={saving} onClick={() => void resetEdit(editing)}>
                  {t('kanji.reset', locale)}
                </Button>
              )}
              <Button variant="secondary" disabled={saving} onClick={() => setEditing(null)}>
                {t('kanji.cancel', locale)}
              </Button>
            </div>
          </div>
        )}

        {error ? (
          <Alert variant="error">
            {error}{' '}
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              {t('kanji.retry', locale)}
            </Button>
          </Alert>
        ) : loading ? (
          <div className="space-y-2" data-testid="kanji-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm text-gray-500" data-testid="kanji-empty">
            {data && data.total === 0 && !submitted && !level ? t('kanji.emptyDb', locale) : t('kanji.empty', locale)}
          </p>
        ) : (
          <Table data-testid="kanji-table">
            <TableHeader>
              <TableRow>
                <TableHead>{t('kanji.colKanji', locale)}</TableHead>
                <TableHead>{t('kanji.colHanViet', locale)}</TableHead>
                <TableHead>{t('kanji.colOnyomi', locale)}</TableHead>
                <TableHead>{t('kanji.colKunyomi', locale)}</TableHead>
                <TableHead>{t('kanji.colMeaningVi', locale)}</TableHead>
                <TableHead>{t('kanji.colMeaning', locale)}</TableHead>
                <TableHead>{t('kanji.colStrokes', locale)}</TableHead>
                <TableHead>{t('kanji.colLevel', locale)}</TableHead>
                {canEdit && <TableHead>{t('kanji.colActions', locale)}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((it) => (
                <TableRow key={it.id} data-testid="kanji-row">
                  <TableCell className="font-japanese text-2xl font-semibold">{it.kanji}</TableCell>
                  <TableCell className="font-semibold">
                    {hanVietLabel(it)}
                    {it.edited && (
                      <span data-testid="kanji-edited-badge" className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                        {t('kanji.edited', locale)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-japanese">{it.onyomi.join('、')}</TableCell>
                  <TableCell className="font-japanese">{it.kunyomi.join('、')}</TableCell>
                  <TableCell className="max-w-xs">{it.meaningVi}</TableCell>
                  <TableCell className="max-w-xs">{it.meanings.join(', ')}</TableCell>
                  <TableCell>{it.strokeCount ?? ''}</TableCell>
                  <TableCell>{it.levels.length > 1 ? it.levels.join(', ') : (it.level ?? '')}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button size="sm" variant="outline" data-testid={`kanji-edit-btn-${it.kanji}`} onClick={() => openEdit(it)}>
                        {t('kanji.edit', locale)}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} data-testid="kanji-prev">
            {t('kanji.prev', locale)}
          </Button>
          <span className="text-sm text-gray-600">
            {t('kanji.page', locale)} {page} / {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)} data-testid="kanji-next">
            {t('kanji.next', locale)}
          </Button>
        </div>

        <p className="text-xs text-gray-500">{t('kanji.attribution', locale)}</p>
      </div>
    </AdminGuard>
  );
}
