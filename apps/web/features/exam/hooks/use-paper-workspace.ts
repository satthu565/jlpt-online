'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JapaneseFontSize } from '../components/exam-toolbar';

export interface TextMark { start: number; end: number }
export interface PaperWorkspace {
  currentQuestionId?: string;
  readingQuestionId?: string;
  readingOffset?: number;
  fontSize: JapaneseFontSize;
  font: 'mincho' | 'gothic';
  notes: Record<string, string>;
  marks: Record<string, TextMark[]>;
}
const emptyWorkspace = (): PaperWorkspace => ({ fontSize: 'base', font: 'mincho', notes: {}, marks: {} });

export function usePaperWorkspace(attemptId: string, examId: string, version: number) {
  const key = `jlpt-paper:${attemptId}:${examId}:${version}`;
  const [workspace, setWorkspace] = useState<PaperWorkspace>(emptyWorkspace);
  const [ready, setReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && typeof saved === 'object') {
        const value = saved as Partial<PaperWorkspace>;
        setWorkspace({
          fontSize: ['sm', 'base', 'lg', 'xl'].includes(value.fontSize ?? '') ? value.fontSize! : 'base',
          font: value.font === 'gothic' ? 'gothic' : 'mincho',
          notes: Object.fromEntries(Object.entries(value.notes ?? {}).filter(([, text]) => typeof text === 'string')),
          marks: Object.fromEntries(Object.entries(value.marks ?? {}).filter(([, marks]) => Array.isArray(marks)).map(([id, marks]) => [id, marks.filter((mark) => Number.isInteger(mark?.start) && Number.isInteger(mark?.end) && mark.start >= 0 && mark.end > mark.start)])),
          currentQuestionId: typeof value.currentQuestionId === 'string' ? value.currentQuestionId : undefined,
          readingQuestionId: typeof value.readingQuestionId === 'string' ? value.readingQuestionId : undefined,
          readingOffset: typeof value.readingOffset === 'number' ? value.readingOffset : 0,
        });
      }
    } catch { setSaveFailed(true); }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    const save = () => {
      try { localStorage.setItem(key, JSON.stringify(workspaceRef.current)); setSaveFailed(false); }
      catch { setSaveFailed(true); }
    };
    const timer = setTimeout(save, 200);
    window.addEventListener('pagehide', save);
    return () => { clearTimeout(timer); window.removeEventListener('pagehide', save); };
  }, [workspace, key, ready]);

  const update = useCallback((patch: Partial<PaperWorkspace>) => setWorkspace((previous) => ({ ...previous, ...patch })), []);
  const setNote = useCallback((id: string, text: string) => setWorkspace((previous) => ({ ...previous, notes: { ...previous.notes, [id]: text.slice(0, 10000) } })), []);
  const mark = useCallback((id: string, range: TextMark) => setWorkspace((previous) => ({ ...previous, marks: { ...previous.marks, [id]: [...(previous.marks[id] ?? []), range] } })), []);
  const clearMarks = useCallback((id: string) => setWorkspace((previous) => ({ ...previous, marks: { ...previous.marks, [id]: [] } })), []);
  const clear = useCallback(() => { try { localStorage.removeItem(key); } catch { /* Attempt data is separate. */ } }, [key]);
  return { workspace, ready, saveFailed, update, setNote, mark, clearMarks, clear };
}
