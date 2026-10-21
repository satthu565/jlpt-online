'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DictionaryLookupResultDto } from '../types';
import { CorpusClient } from '../services/corpus-client';

export const JAPANESE_CHAR_REGEX = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/;
export const SELECT_LOOKUP_STORAGE_KEY = 'jlpt_select_lookup';

/**
 * Hook to manage the global "Tra từ khi bôi đen" user setting.
 * Stores preference in localStorage under 'jlpt_select_lookup' (default: true).
 * Strictly avoids React Hydration Error #418 by only reading localStorage in useEffect.
 */
export function useSelectLookupSetting(): [boolean, (val: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SELECT_LOOKUP_STORAGE_KEY);
      if (stored !== null) {
        setEnabled(stored === 'true');
      }
    } catch {
      // Storage access disabled or unavailable
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === SELECT_LOOKUP_STORAGE_KEY && e.newValue !== null) {
        setEnabled(e.newValue === 'true');
      }
    };

    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      if (typeof custom.detail === 'boolean') {
        setEnabled(custom.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('jlpt_select_lookup_change', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('jlpt_select_lookup_change', handleCustomEvent);
    };
  }, []);

  const updateSetting = useCallback((newVal: boolean) => {
    setEnabled(newVal);
    try {
      localStorage.setItem(SELECT_LOOKUP_STORAGE_KEY, String(newVal));
      window.dispatchEvent(new CustomEvent('jlpt_select_lookup_change', { detail: newVal }));
    } catch {
      // Storage write error
    }
  }, []);

  return [enabled, updateSetting];
}

export interface UseSelectLookupOptions {
  enabled?: boolean;
  questionIndex?: number;
  containerSelector?: string;
}

export interface SelectionLookupState {
  isOpen: boolean;
  queryText: string;
  matchedText?: string;
  virtualRect: DOMRect | null;
  status: 'idle' | 'loading' | 'success' | 'not-found' | 'error';
  result: DictionaryLookupResultDto | null;
  error: string | null;
  close: () => void;
  retry: () => void;
}

/**
 * Strips <rt> and <rp> tags from the selected DOM fragment so furigana does not
 * pollute the lookup text (e.g. <ruby>学生<rt>がくせい</rt></ruby> -> 学生).
 */
export function extractCleanSelectionText(range: Range): string {
  const fragment = range.cloneContents();
  const rtElements = fragment.querySelectorAll('rt, rp');
  rtElements.forEach((el) => el.remove());
  return (fragment.textContent || '').trim();
}

/**
 * Validates if the selected range is eligible for dictionary lookup:
 * 1. Must be inside allowed question/passage/explanation areas
 * 2. Must NOT be inside toolbar, timer, palette, or the lookup popover itself
 * 3. Cleaned text must be 1-20 characters long and contain at least one Japanese character
 */
export function getEligibleSelection(selection: Selection): { text: string; rect: DOMRect } | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const element = container.nodeType === 1
    ? (container as HTMLElement)
    : container.parentElement;

  if (!element) return null;

  // Must not be in excluded / ignored areas (toolbar, timer, palette, popover)
  if (
    element.closest(
      '[role="toolbar"], .jlpt-exam-toolbar, .jlpt-exam-clock, .jlpt-question-palette, [data-select-lookup-popover="true"], [data-select-lookup-ignore="true"]',
    )
  ) {
    return null;
  }

  // Must be in allowed text areas
  const isInsideAllowedArea = Boolean(
    element.closest(
      '[data-select-lookup-area="true"], .jlpt-question-card, .jlpt-passage-view, .jlpt-explanation-view, .jlpt-review-question-card, .jlpt-practice-area',
    ),
  );

  if (!isInsideAllowedArea) {
    return null;
  }

  const cleanText = extractCleanSelectionText(range);
  if (cleanText.length < 1 || cleanText.length > 20 || !JAPANESE_CHAR_REGEX.test(cleanText)) {
    return null;
  }

  let rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    const elRect = element.getBoundingClientRect();
    rect = elRect.width > 0 || elRect.height > 0 ? elRect : new DOMRect(100, 100, 50, 20);
  }

  return { text: cleanText, rect };
}

export function useSelectLookup({
  enabled = true,
  questionIndex,
}: UseSelectLookupOptions = {}): SelectionLookupState {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [virtualRect, setVirtualRect] = useState<DOMRect | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'not-found' | 'error'>('idle');
  const [result, setResult] = useState<DictionaryLookupResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<CorpusClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new CorpusClient();
  }

  const lastLookupRef = useRef<string>('');
  const activeLookupAbortRef = useRef<(() => void) | null>(null);
  const enabledRef = useRef<boolean>(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) {
      setIsOpen(false);
      setStatus('idle');
      if (activeLookupAbortRef.current) {
        activeLookupAbortRef.current();
      }
    }
  }, [enabled]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close when switching question in exam or practice
  useEffect(() => {
    setIsOpen(false);
  }, [questionIndex]);

  const performLookup = useCallback(async (textToLookup: string, rect: DOMRect) => {
    if (!enabledRef.current) return;

    setQueryText(textToLookup);
    setVirtualRect(rect);
    setIsOpen(true);
    setStatus('loading');
    setError(null);
    lastLookupRef.current = textToLookup;

    let isSubscribed = true;
    activeLookupAbortRef.current = () => {
      isSubscribed = false;
    };

    try {
      const data = await clientRef.current!.lookupDictionary(textToLookup);
      if (!isSubscribed || !enabledRef.current) return;
      setResult(data);
      setStatus('success');
    } catch (err: unknown) {
      if (!isSubscribed || !enabledRef.current) return;
      const statusNum = (err as { status?: number })?.status;
      const errMsg = err instanceof Error ? err.message : '';
      if (
        statusNum === 404 ||
        errMsg.toLowerCase().includes('not found') ||
        errMsg.toLowerCase().includes('no dictionary entry')
      ) {
        setStatus('not-found');
      } else {
        setStatus('error');
        setError(errMsg || 'Lỗi kết nối từ điển');
      }
    }
  }, []);

  const retry = useCallback(() => {
    if (queryText && virtualRect && enabledRef.current) {
      performLookup(queryText, virtualRect);
    }
  }, [queryText, virtualRect, performLookup]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let mouseTimeout: ReturnType<typeof setTimeout> | null = null;
    let touchTimeout: ReturnType<typeof setTimeout> | null = null;

    // Mouse selection handler
    const handleMouseUp = () => {
      if (!enabledRef.current) return;
      if (mouseTimeout) clearTimeout(mouseTimeout);
      // Delay slightly so selection object has fully updated in browser
      mouseTimeout = setTimeout(() => {
        if (!enabledRef.current) return;
        const selection = window.getSelection();
        if (!selection) return;
        const eligible = getEligibleSelection(selection);
        if (eligible) {
          performLookup(eligible.text, eligible.rect);
        }
      }, 10);
    };

    // Touch selection handler with 300ms debounce
    const handleSelectionChange = () => {
      if (!enabledRef.current) return;
      if (touchTimeout) clearTimeout(touchTimeout);
      touchTimeout = setTimeout(() => {
        if (!enabledRef.current) return;
        const selection = window.getSelection();
        if (!selection) return;
        const eligible = getEligibleSelection(selection);
        if (eligible) {
          performLookup(eligible.text, eligible.rect);
        }
      }, 300);
    };

    // Escape key closes popover
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (mouseTimeout) clearTimeout(mouseTimeout);
      if (touchTimeout) clearTimeout(touchTimeout);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, performLookup]);

  return {
    isOpen,
    queryText,
    matchedText: result?.matchedText,
    virtualRect,
    status,
    result,
    error,
    close,
    retry,
  };
}
