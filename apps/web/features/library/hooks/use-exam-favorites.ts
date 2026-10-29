'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { useI18n } from '../../../lib/i18n';
import { ExamApiClient } from '../../exam/api/exam-api';

const EMPTY_FAVORITES: ReadonlySet<string> = new Set();

export function useExamFavorites() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const translate = useRef(t);
  translate.current = t;
  const userId = user?.id ?? null;
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const client = useMemo(() => new ExamApiClient(), []);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ owner: string | null; ids: ReadonlySet<string>; ready: boolean }>({ owner: null, ids: EMPTY_FAVORITES, ready: false });
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const pending = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    pending.current.clear();
    setPendingIds(new Set());
    setError(null);
    if (authLoading) return;
    if (!userId) {
      setState({ owner: null, ids: EMPTY_FAVORITES, ready: true });
      return;
    }
    setState(previous => ({ owner: userId, ids: previous.owner === userId ? previous.ids : EMPTY_FAVORITES, ready: false }));
    client.getFavoriteExams().then(response => {
      if (!cancelled && currentUser.current === userId) setState({ owner: userId, ids: new Set(response.items.map(item => item.examId)), ready: true });
    }).catch(() => {
      if (!cancelled && currentUser.current === userId) setError(translate.current('library.favoriteLoadError'));
    });
    return () => { cancelled = true; };
  }, [authLoading, userId, revision, client]);

  const toggleFavorite = useCallback(async (examId: string) => {
    if (authLoading) return;
    if (!userId) {
      window.location.assign('/dang-nhap');
      return;
    }
    if (state.owner !== userId || !state.ready || pending.current.has(examId)) return;
    const favorite = !state.ids.has(examId);
    pending.current.add(examId);
    setPendingIds(new Set(pending.current));
    setError(null);
    try {
      const response = await client.setExamFavorite(examId, favorite);
      if (currentUser.current !== userId) return;
      setState(previous => {
        if (previous.owner !== userId) return previous;
        const ids = new Set(previous.ids);
        if (response.favorited) ids.add(examId);
        else ids.delete(examId);
        return { ...previous, ids };
      });
    } catch {
      if (currentUser.current === userId) setError(t('library.favoriteSaveError'));
    } finally {
      if (currentUser.current === userId) {
        pending.current.delete(examId);
        setPendingIds(new Set(pending.current));
      }
    }
  }, [authLoading, userId, state, client, t]);

  return {
    ids: state.owner === userId ? state.ids : EMPTY_FAVORITES,
    pendingIds,
    isLoading: authLoading || Boolean(userId && (state.owner !== userId || !state.ready)),
    error,
    reload: () => setRevision(value => value + 1),
    toggleFavorite,
  };
}
