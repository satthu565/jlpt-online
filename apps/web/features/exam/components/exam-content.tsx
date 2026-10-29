'use client';

import React, { useState } from 'react';
import type { RichBlock, RichText } from '@jlpt/schema';
import { Button } from '@jlpt/ui/components/exam-controls';
import { Modal } from '@jlpt/ui/components/exam-controls';
import { RichTextView, sanitizeUrl } from '@jlpt/ui/components/rich-text-view';
import { RichTableView } from '@jlpt/ui/components/rich-block-view';
import { useI18n } from '../../../lib/i18n';
import { mediaUrl } from '../utils/exam-media';
import './exam-content.css';

/** Source formatting stays inside the existing question card and answer controls. */
function sourceSegments(segments: RichText): RichText {
  return segments.map(segment => {
    if (segment.t === 'image' && 'mediaKey' in segment && typeof segment.mediaKey === 'string') return { ...segment, url: mediaUrl(segment.mediaKey) };
    if ((segment.t === 'underline' || segment.t === 'emphasis') && segment.children) return { ...segment, children: sourceSegments(segment.children) };
    return segment;
  });
}

export function ExamText({ segments, showFurigana }: { segments: RichText; showFurigana?: boolean }): React.JSX.Element {
  return <span className="jlpt-exam-source-text" lang="ja"><RichTextView segments={sourceSegments(segments)} showFurigana={showFurigana} /></span>;
}

export function ExamContentImage({ src, alt, width, height }: { src: string; alt: string; width?: number; height?: number }): React.JSX.Element | null {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const safeSrc = sanitizeUrl(mediaUrl(src));
  if (!safeSrc) return null;
  return <figure className="jlpt-exam-source-image">
    <Button variant="ghost" className="jlpt-exam-source-image-trigger" aria-label={t('paperExam.enlargeImage')} onClick={() => setOpen(true)}>
      <img src={safeSrc} alt={alt} width={width} height={height} loading="lazy" />
    </Button>
    <Modal isOpen={open} onClose={() => setOpen(false)} title={t('paperExam.enlargeImage')} closeLabel={t('paperExam.close')}>
      <img className="jlpt-exam-source-image-full" src={safeSrc} alt={alt} />
    </Modal>
  </figure>;
}

export function ExamPassage({ blocks, showFurigana }: { blocks: RichBlock[]; showFurigana?: boolean }): React.JSX.Element {
  return <div className="jlpt-exam-source-passage" lang="ja">{blocks.map((block, index) => {
    if (block.type === 'paragraph') return <div key={index} className="jlpt-exam-source-paragraph"><ExamText segments={block.content} showFurigana={showFurigana} /></div>;
    if (block.type === 'image') return <ExamContentImage key={index} src={block.mediaKey} alt={block.alt} width={block.width} height={block.height} />;
    return <RichTableView key={index} rows={block.rows} showFurigana={showFurigana} />;
  })}</div>;
}
