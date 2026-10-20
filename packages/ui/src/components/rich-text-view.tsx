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
      {segments.map((seg, idx) => {
        // Handle both 't' (schema) and 'type' (legacy fixtures)
        const type = seg.t || (seg as { type?: string }).type;

        switch (type) {
          case 'text':
            return <span key={idx}>{'text' in seg ? seg.text : ''}</span>;

          case 'ruby': {
            const rubyText = 'text' in seg ? seg.text : '';
            const rtText = 'rt' in seg ? seg.rt : '';
            return (
              <ruby key={idx} className="jlpt-ruby" style={{ rubyPosition: 'over' }}>
                {rubyText}
                <rt
                  className="jlpt-ruby-rt"
                  style={{
                    fontSize: '0.65em',
                    color: 'var(--text-secondary, #475569)',
                    userSelect: 'none',
                    ...(showFurigana === false ? { display: 'none' } : {}),
                  }}
                >
                  {rtText}
                </rt>
              </ruby>
            );
          }

          case 'underline': {
            const underlineText = 'text' in seg ? seg.text : undefined;
            const children = 'children' in seg ? seg.children : undefined;
            return (
              <u
                key={idx}
                className="jlpt-underline"
                style={{ textUnderlineOffset: '4px', textDecorationThickness: '1.5px' }}
              >
                {children && children.length > 0 ? (
                  <RichTextView
                    segments={children}
                    blankAriaLabel={blankAriaLabel}
                    starAriaLabel={starAriaLabel}
                    imageAlt={imageAlt}
                    showFurigana={showFurigana}
                  />
                ) : (
                  underlineText ?? ''
                )}
              </u>
            );
          }

          case 'emphasis': {
            const children = 'children' in seg ? seg.children : undefined;
            return (
              <em key={idx} className="jlpt-emphasis font-bold not-italic">
                {children && children.length > 0 ? (
                  <RichTextView
                    segments={children}
                    blankAriaLabel={blankAriaLabel}
                    starAriaLabel={starAriaLabel}
                    imageAlt={imageAlt}
                    showFurigana={showFurigana}
                  />
                ) : null}
              </em>
            );
          }

          case 'blank':
            return (
              <span
                key={idx}
                role="textbox"
                aria-label={blankAriaLabel}
                className="jlpt-blank"
                style={{
                  display: 'inline-block',
                  borderBottom: '2px solid currentColor',
                  minWidth: '2.5rem',
                  textAlign: 'center',
                  margin: '0 0.25rem',
                  padding: '0 0.25rem',
                }}
              >
                ( &nbsp; )
              </span>
            );

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
            const rawUrl = 'url' in seg && seg.url ? seg.url : 'mediaKey' in seg && seg.mediaKey ? `/${seg.mediaKey}` : '';
            const safeSrc = sanitizeUrl(rawUrl);
            const altText = ('alt' in seg && seg.alt) || imageAlt;
            const width = 'width' in seg ? seg.width : undefined;
            const height = 'height' in seg ? seg.height : undefined;

            if (!safeSrc) {
              return null;
            }

            return (
              <img
                key={idx}
                src={safeSrc}
                alt={altText}
                width={width}
                height={height}
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
