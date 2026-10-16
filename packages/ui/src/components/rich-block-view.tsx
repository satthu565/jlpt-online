import React from 'react';
import type { RichBlock, RichText } from '@jlpt/schema';
import { RichTextView, sanitizeUrl } from './rich-text-view.js';

export interface RichTableViewProps {
  rows: RichText[][];
  className?: string;
  tableAriaLabel?: string;
}

export function RichTableView({
  rows,
  className = '',
  tableAriaLabel = 'Bảng dữ liệu câu hỏi',
}: RichTableViewProps): React.JSX.Element {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <div className="jlpt-table-empty" />;
  }

  return (
    <div
      className={`jlpt-rich-table-container overflow-x-auto my-3 ${className}`}
      role="region"
      aria-label={tableAriaLabel}
      tabIndex={0}
    >
      <table
        className="jlpt-rich-table border-collapse w-full text-left"
        style={{
          border: '1px solid var(--border-neutral, #cbd5e1)',
          borderRadius: '4px',
        }}
      >
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className="jlpt-table-row"
              style={{
                borderBottom: '1px solid var(--border-neutral, #cbd5e1)',
                backgroundColor: rIdx % 2 === 0 ? 'transparent' : 'var(--bg-subtle, rgba(0, 0, 0, 0.02))',
              }}
            >
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className="jlpt-table-cell"
                  style={{
                    borderRight: '1px solid var(--border-neutral, #cbd5e1)',
                    padding: '0.5rem 0.75rem',
                    verticalAlign: 'top',
                  }}
                >
                  <RichTextView segments={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface RichBlockViewProps {
  block: RichBlock;
  className?: string;
}

export function RichBlockView({ block, className = '' }: RichBlockViewProps): React.JSX.Element | null {
  if (!block || !block.type) return null;

  switch (block.type) {
    case 'paragraph':
      return (
        <div className={`jlpt-rich-paragraph my-2 leading-relaxed ${className}`}>
          <RichTextView segments={block.content} />
        </div>
      );

    case 'table':
      return <RichTableView rows={block.rows} className={className} />;

    case 'image': {
      const rawUrl = 'url' in block && block.url ? (block as { url?: string }).url : block.mediaKey ? `/${block.mediaKey}` : '';
      const safeSrc = sanitizeUrl(rawUrl);
      if (!safeSrc) return null;

      return (
        <figure className={`jlpt-rich-figure my-3 text-center ${className}`}>
          <img
            src={safeSrc}
            alt={block.alt}
            width={block.width}
            height={block.height}
            loading="lazy"
            className="jlpt-rich-img inline-block max-w-full rounded shadow-sm"
            style={{
              maxHeight: '20rem',
              objectFit: 'contain',
            }}
          />
          {block.alt && (
            <figcaption
              className="text-xs mt-1"
              style={{ color: 'var(--text-secondary, #64748b)' }}
            >
              {block.alt}
            </figcaption>
          )}
        </figure>
      );
    }

    default:
      return null;
  }
}

export interface PassageViewProps {
  passage?: RichBlock[] | null;
  className?: string;
  passageAriaLabel?: string;
}

export function PassageView({
  passage,
  className = '',
  passageAriaLabel = 'Bài đọc / Dữ liệu tham chiếu',
}: PassageViewProps): React.JSX.Element | null {
  if (!passage || !Array.isArray(passage) || passage.length === 0) {
    return null;
  }

  return (
    <div
      className={`jlpt-passage-card rounded-lg p-4 my-4 font-japanese ${className}`}
      role="region"
      aria-label={passageAriaLabel}
      style={{
        backgroundColor: 'var(--bg-secondary, #f8fafc)',
        border: '1px solid var(--border-neutral, #e2e8f0)',
      }}
    >
      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary, #64748b)' }}>
        Bài đọc &amp; Tài liệu
      </div>
      {passage.map((block, idx) => (
        <RichBlockView key={idx} block={block} />
      ))}
    </div>
  );
}
