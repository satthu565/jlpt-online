import React from 'react';
import type { RichTextSegment } from '@jlpt/schema';

export interface RichTextViewProps {
  segments: RichTextSegment[];
  className?: string;
  style?: React.CSSProperties;
  blankAriaLabel?: string;
  starAriaLabel?: string;
  imageAlt?: string;
  showFurigana?: boolean;
}

/**
 * Normalizes rich text segments for clean rendering:
 * - Collapses excessive fullwidth space chains (>= 3) in reading passages.
 * - Normalizes pure whitespace between blanks and stars (Mondai 7) so standard component margins govern spacing.
 * - Detects and cleans up surrounding parentheses around blanks to prevent double-parentheses like `（ (   ) ）`.
 */
function preprocessSegments(segments: RichTextSegment[]): {
  normalized: RichTextSegment[];
  blanksWithOuterParens: Set<number>;
} {
  const blanksWithOuterParens = new Set<number>();
  if (!Array.isArray(segments) || segments.length === 0) {
    return { normalized: [], blanksWithOuterParens };
  }

  // Pass 1: Clone segments and collapse excessive fullwidth space chains (>= 3)
  const segs: RichTextSegment[] = segments.map((s) => {
    if (s.t === 'text') {
      return { ...s, text: s.text.replace(/\u3000{3,}/g, '\u3000\u3000') };
    }
    return { ...s };
  });

  // Pass 2: Clean up pure whitespace or edge whitespace around blanks & stars (Mondai 7 spacing)
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    if (s.t === 'text') {
      const prev = i > 0 ? segs[i - 1]!.t : null;
      const next = i < segs.length - 1 ? segs[i + 1]!.t : null;

      // Pure whitespace between blank/star (e.g. Mondai 7) -> collapse so margins govern spacing
      if (/^[\s\u3000]+$/.test(s.text)) {
        if ((prev === 'blank' || prev === 'star') && (next === 'blank' || next === 'star')) {
          s.text = '';
        }
      }

      // Trailing whitespace right before blank or star
      if (next === 'blank' || next === 'star') {
        s.text = s.text.replace(/[\s\u3000]+$/, '');
      }

      // Leading whitespace right after blank or star
      if (prev === 'blank' || prev === 'star') {
        s.text = s.text.replace(/^[\s\u3000]+/, '');
      }
    }
  }

  // Pass 3: Detect and normalize outer parentheses around blanks
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    if (s.t === 'blank') {
      const prev = i > 0 ? segs[i - 1] : null;
      const next = i < segs.length - 1 ? segs[i + 1] : null;

      const prevTxt = prev && prev.t === 'text' ? prev.text : '';
      const nextTxt = next && next.t === 'text' ? next.text : '';

      const hasPrevParen = /[（(][\s\u3000]*$/.test(prevTxt);
      const hasNextParen = /^[\s\u3000]*[）)]/.test(nextTxt);

      if (hasPrevParen && hasNextParen) {
        blanksWithOuterParens.add(i);
        if (prev && prev.t === 'text') {
          prev.text = prev.text.replace(/([（(])[\s\u3000]+$/, '$1');
        }
        if (next && next.t === 'text') {
          next.text = next.text.replace(/^[\s\u3000]+([）)])/, '$1');
        }
      }
    }
  }

  return { normalized: segs, blanksWithOuterParens };
}

/**
 * Sanitizes URLs to prevent XSS attacks (e.g. javascript:, vbscript:, data:text/html)
 */
export function sanitizeUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  // Strip control characters (< 32, 127, and 128-159) and whitespace
  const normalized = Array.from(trimmed)
    .filter((c) => {
      const code = c.charCodeAt(0);
      return (code >= 32 && code !== 127) || code > 159;
    })
    .join('')
    .replace(/\s+/g, '')
    .toLowerCase();

  // Block dangerous schemes
  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/html') ||
    normalized.startsWith('data:application/javascript')
  ) {
    return '';
  }

  // Safe schemes: http, https, relative paths, media paths, or safe data image URIs
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('//') ||
    normalized.startsWith('/') ||
    normalized.startsWith('./') ||
    normalized.startsWith('media/') ||
    normalized.startsWith('data:image/')
  ) {
    return trimmed;
  }

  // If path doesn't have a recognized scheme, treat as relative path
  if (!normalized.includes(':')) {
    return trimmed;
  }

  return '';
}

export function RichTextView({
  segments,
  className = '',
  style = {},
  blankAriaLabel = 'Ô trống điền từ',
  starAriaLabel = 'Vị trí dấu sao',
  imageAlt = 'Minh họa câu hỏi',
  showFurigana = true,
}: RichTextViewProps): React.JSX.Element {
  if (!Array.isArray(segments) || segments.length === 0) {
    return <span className={className} style={style} />;
  }

  const { normalized, blanksWithOuterParens } = preprocessSegments(segments);

  return (
    <span
      className={`jlpt-rich-text font-japanese ${className}`}
      style={{
        lineHeight: 1.8,
        fontSize: '1rem',
        color: 'inherit',
        ...style,
      }}
    >
      {normalized.map((seg, idx) => {
        switch (seg.t) {
          case 'text':
            return <span key={idx}>{seg.text}</span>;

          case 'ruby':
            return (
              <ruby key={idx} className="jlpt-ruby" style={{ rubyPosition: 'over' }}>
                {seg.text}
                <rt
                  className="jlpt-ruby-rt"
                  style={{
                    fontSize: '0.65em',
                    color: 'var(--text-secondary, #475569)',
                    userSelect: 'none',
                    ...(showFurigana === false ? { display: 'none' } : {}),
                  }}
                >
                  {seg.rt}
                </rt>
              </ruby>
            );

          case 'underline':
            return (
              <u
                key={idx}
                className="jlpt-underline"
                style={{ textUnderlineOffset: '4px', textDecorationThickness: '1.5px' }}
              >
                {seg.children && seg.children.length > 0 ? (
                  <RichTextView
                    segments={seg.children}
                    blankAriaLabel={blankAriaLabel}
                    starAriaLabel={starAriaLabel}
                    imageAlt={imageAlt}
                    showFurigana={showFurigana}
                  />
                ) : (
                  seg.text ?? ''
                )}
              </u>
            );

          case 'emphasis':
            return (
              <em key={idx} className="jlpt-emphasis font-bold not-italic">
                {seg.children && seg.children.length > 0 ? (
                  <RichTextView
                    segments={seg.children}
                    blankAriaLabel={blankAriaLabel}
                    starAriaLabel={starAriaLabel}
                    imageAlt={imageAlt}
                    showFurigana={showFurigana}
                  />
                ) : null}
              </em>
            );

          case 'blank': {
            const label = seg.label?.trim();
            const hasOuterParens = blanksWithOuterParens.has(idx);

            let blankContent: React.ReactNode;
            if (hasOuterParens) {
              blankContent = label || <>&nbsp;&nbsp;&nbsp;</>;
            } else {
              blankContent = label || <>( &nbsp; )</>;
            }

            return (
              <span
                key={idx}
                role="textbox"
                aria-label={label ? `${blankAriaLabel} ${label}` : blankAriaLabel}
                className="jlpt-blank"
                style={{
                  display: 'inline-block',
                  borderBottom: '2px solid currentColor',
                  minWidth: label ? '2rem' : '2.5rem',
                  textAlign: 'center',
                  margin: '0 0.25rem',
                  padding: '0 0.25rem',
                }}
              >
                {blankContent}
              </span>
            );
          }

          case 'star':
            return (
              <span
                key={idx}
                role="img"
                aria-label={starAriaLabel}
                className="jlpt-star"
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

          case 'image': {
            const rawUrl = seg.url || (seg.mediaKey ? `/${seg.mediaKey}` : '');
            const safeSrc = sanitizeUrl(rawUrl);
            const altText = seg.alt || imageAlt;

            if (!safeSrc) {
              return null;
            }

            return (
              <img
                key={idx}
                src={safeSrc}
                alt={altText}
                width={seg.width}
                height={seg.height}
                loading="lazy"
                className="jlpt-image"
                style={{
                  display: 'inline-block',
                  maxHeight: '16rem',
                  maxWidth: '100%',
                  borderRadius: '6px',
                  margin: '0.5rem 0',
                }}
              />
            );
          }

          default:
            return null;
        }
      })}
    </span>
  );
}
