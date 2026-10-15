import React from 'react';
import type { RichTextSegment } from '@jlpt/schema';

export interface RichTextViewProps {
  segments: RichTextSegment[];
  className?: string;
}

export function RichTextView({ segments, className }: RichTextViewProps): React.JSX.Element {
  return (
    <div className={className}>
      {segments.map((seg, idx) => {
        switch (seg.t) {
          case 'text':
            return <span key={idx}>{seg.text}</span>;
          case 'ruby':
            return (
              <ruby key={idx}>
                {seg.text}
                <rt>{seg.rt}</rt>
              </ruby>
            );
          case 'underline':
            return <u key={idx}>{seg.text}</u>;
          case 'blank':
            return <span key={idx} className="inline-block border-b-2 border-current min-w-8 text-center">( )</span>;
          case 'star':
            return <span key={idx} className="font-bold text-amber-500">★</span>;
          case 'br':
            return <br key={idx} />;
          case 'image':
            return <img key={idx} src={seg.url} alt="media" className="inline max-h-48" />;
        }
      })}
    </div>
  );
}
