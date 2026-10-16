import React from 'react';
import type { RichTextSegment } from '@jlpt/schema';

export interface RichTextViewProps {
  segments: RichTextSegment[];
  className?: string;
  style?: React.CSSProperties;
}

export function RichTextView({
  segments,
  className = '',
  style = {},
}: RichTextViewProps): React.JSX.Element {
  return (
    <div
      className={`jlpt-rich-text font-japanese ${className}`}
      style={{
        lineHeight: 1.8,
        fontSize: '1rem',
        color: 'var(--text-primary, #0f172a)',
        ...style,
      }}
    >
      {segments.map((seg, idx) => {
        switch (seg.t) {
          case 'text':
            return <span key={idx}>{seg.text}</span>;
          case 'ruby':
            return (
              <ruby key={idx} style={{ rubyPosition: 'over' }}>
                {seg.text}
                <rt style={{ fontSize: '0.65em', color: 'var(--text-secondary, #475569)' }}>
                  {seg.rt}
                </rt>
              </ruby>
            );
          case 'underline':
            return (
              <u key={idx} style={{ textUnderlineOffset: '4px' }}>
                {seg.text}
              </u>
            );
          case 'blank':
            return (
              <span
                key={idx}
                role="textbox"
                aria-label="Ô trống điền từ"
                style={{
                  display: 'inline-block',
                  borderBottom: '2px solid currentColor',
                  minWidth: '2.5rem',
                  textAlign: 'center',
                  margin: '0 0.25rem',
                  padding: '0 0.25rem',
                }}
              >
                ( )
              </span>
            );
          case 'star':
            return (
              <span
                key={idx}
                role="img"
                aria-label="Vị trí dấu sao"
                style={{
                  fontWeight: 'bold',
                  color: 'var(--color-warning, #d97706)',
                  margin: '0 0.25rem',
                }}
              >
                ★
              </span>
            );
          case 'br':
            return <br key={idx} />;
          case 'image':
            return (
              <img
                key={idx}
                src={seg.url}
                alt="Minh họa câu hỏi"
                style={{
                  display: 'inline-block',
                  maxHeight: '12rem',
                  maxWidth: '100%',
                  borderRadius: '6px',
                  margin: '0.5rem 0',
                }}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
