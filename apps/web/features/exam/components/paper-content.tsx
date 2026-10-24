'use client';

import React, { useRef, useState } from 'react';
import type { RichBlock, RichText } from '@jlpt/schema';
import { Button } from '@jlpt/ui/components/button';
import { Modal } from '@jlpt/ui/components/modal';
import { RichTextView, sanitizeUrl } from '@jlpt/ui/components/rich-text-view';
import { RichTableView } from '@jlpt/ui/components/rich-block-view';
import { useI18n } from '../../../lib/i18n';
import type { TextMark } from '../hooks/use-paper-workspace';
import { mediaUrl } from '../utils/booklet';

interface MarkedTextProps {
  id: string;
  segments: RichText;
  marks: TextMark[];
  onMark: (id: string, mark: TextMark) => void;
  onClear: (id: string) => void;
  showFurigana: boolean;
  disabled?: boolean;
}

function markedSegments(segments: RichText, marks: TextMark[], cursor = { offset: 0 }): React.ReactNode {
  return segments.map((segment, index) => {
    if (segment.t === 'text' || segment.t === 'ruby' || (segment.t === 'underline' && !segment.children)) {
      const text = segment.text ?? '';
      const offset = cursor.offset;
      cursor.offset += text.length;
      const boundaries = new Set([0, text.length]);
      for (const mark of marks) {
        boundaries.add(Math.max(0, Math.min(text.length, mark.start - offset)));
        boundaries.add(Math.max(0, Math.min(text.length, mark.end - offset)));
      }
      const points = [...boundaries].sort((a, b) => a - b);
      const content = points.slice(0, -1).map((start, i) => {
        const end = points[i + 1]!;
        const highlighted = marks.some((mark) => mark.start < offset + end && mark.end > offset + start);
        return highlighted ? <mark key={start}>{text.slice(start, end)}</mark> : <React.Fragment key={start}>{text.slice(start, end)}</React.Fragment>;
      });
      if (segment.t === 'ruby') return <ruby key={index}>{content}<rt>{segment.rt}</rt></ruby>;
      if (segment.t === 'underline') return <u key={index}>{content}</u>;
      return <React.Fragment key={index}>{content}</React.Fragment>;
    }
    if (segment.t === 'underline' || segment.t === 'emphasis') {
      const children = markedSegments(segment.children ?? [], marks, cursor);
      return segment.t === 'underline' ? <u key={index}>{children}</u> : <strong key={index}>{children}</strong>;
    }
    // Non-text segments retain their canonical renderer and do not count toward selection offsets.
    return <span key={index} data-mark-excluded><RichTextView segments={[segment]} /></span>;
  });
}

function textOffset(container: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let count = 0;
  while (walker.nextNode()) {
    const current = walker.currentNode;
    if (current.parentElement?.closest('rt, [data-mark-excluded]')) continue;
    if (current === node) return count + offset;
    count += current.textContent?.length ?? 0;
  }
  // Browser selections can have an element boundary instead of a text node.
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, offset);
  const fragment = range.cloneContents();
  fragment.querySelectorAll('rt, [data-mark-excluded]').forEach((element) => element.remove());
  return fragment.textContent?.length ?? count;
}

export function MarkedText({ id, segments, marks, onMark, onClear, showFurigana, disabled }: MarkedTextProps): React.JSX.Element {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<TextMark | null>(null);
  const capture = () => {
    const selected = window.getSelection();
    const container = ref.current;
    if (!container || !selected?.rangeCount || selected.isCollapsed || disabled) { setSelection(null); return; }
    const range = selected.getRangeAt(0);
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) { setSelection(null); return; }
    const start = textOffset(container, range.startContainer, range.startOffset);
    const end = textOffset(container, range.endContainer, range.endOffset);
    setSelection(end > start ? { start, end } : null);
  };
  return <div className="paper-markable">
    <div ref={ref} data-paper-text={id} className={showFurigana ? '' : 'paper-no-ruby'} onPointerUp={capture} onKeyUp={capture}>
      {markedSegments(segments, marks)}
    </div>
    {!disabled && (selection || marks.length > 0) && <div className="paper-mark-tools" lang={locale}>
      {selection && <Button size="sm" variant="outline" onPointerDown={(event) => event.preventDefault()} onClick={() => { onMark(id, selection); setSelection(null); window.getSelection()?.removeAllRanges(); }}>{t('paperExam.highlight')}</Button>}
      {marks.length > 0 && <Button size="sm" variant="ghost" onClick={() => onClear(id)}>{t('paperExam.clearHighlight')}</Button>}
    </div>}
  </div>;
}

export function PaperImage({ src, alt }: { src: string; alt: string }): React.JSX.Element | null {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const safeSrc = sanitizeUrl(mediaUrl(src));
  if (!safeSrc) return null;
  return <figure className="paper-image">
    <Button variant="ghost" onClick={() => setOpen(true)} aria-label={t('paperExam.enlargeImage')}><img src={safeSrc} alt={alt} loading="lazy" /></Button>
    <Modal isOpen={open} onClose={() => setOpen(false)} title={t('paperExam.enlargeImage')} closeLabel={t('paperExam.close')} className="paper-image-modal"><img src={safeSrc} alt={alt} className="max-w-full h-auto" /></Modal>
  </figure>;
}

export interface PaperPassageProps {
  id: string;
  blocks: RichBlock[];
  marks: Record<string, TextMark[]>;
  onMark: MarkedTextProps['onMark'];
  onClear: MarkedTextProps['onClear'];
  showFurigana: boolean;
  disabled?: boolean;
}

export function PaperPassage({ id, blocks, marks, onMark, onClear, showFurigana, disabled }: PaperPassageProps): React.JSX.Element {
  return <div className="paper-passage" lang="ja">{blocks.map((block, index) => {
    const key = `${id}:${index}`;
    if (block.type === 'paragraph') return <MarkedText key={key} id={key} segments={block.content} marks={marks[key] ?? []} onMark={onMark} onClear={onClear} showFurigana={showFurigana} disabled={disabled} />;
    if (block.type === 'image') return <PaperImage key={key} src={block.mediaKey} alt={block.alt} />;
    return <RichTableView key={key} rows={block.rows} showFurigana={showFurigana} />;
  })}</div>;
}
