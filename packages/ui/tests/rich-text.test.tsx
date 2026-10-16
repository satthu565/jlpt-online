import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { RichText, RichBlock } from '@jlpt/schema';
import {
  RichTextView,
  RichBlockView,
  RichTableView,
  PassageView,
  sanitizeUrl,
} from '../src/rich-text/index.js';

describe('RichText Rendering & XSS Protection (Acceptance 1 & EXAM-10)', () => {
  it('renders ruby text with correct ruby and rt elements', () => {
    const segments: RichText = [
      { t: 'text', text: 'あそこに' },
      { t: 'ruby', text: '犬', rt: 'いぬ' },
      { t: 'text', text: 'がいます。' },
    ];

    const html = renderToString(<RichTextView segments={segments} />);
    expect(html).toContain('<ruby');
    expect(html).toContain('犬');
    expect(html).toContain('<rt');
    expect(html).toContain('いぬ');
    expect(html).toContain('あそこに');
    expect(html).toContain('がいます。');
  });

  it('renders underline with plain text and nested children (recursive)', () => {
    // Underline with text
    const textUnderline: RichText = [
      { t: 'text', text: 'この' },
      { t: 'underline', text: '本' },
      { t: 'text', text: 'を読みます。' },
    ];
    const htmlText = renderToString(<RichTextView segments={textUnderline} />);
    expect(htmlText).toContain('<u');
    expect(htmlText).toContain('本</u>');

    // Underline with children (ruby inside underline)
    const nestedUnderline: RichText = [
      { t: 'text', text: 'この' },
      {
        t: 'underline',
        children: [
          { t: 'ruby', text: '地図', rt: 'ちず' },
        ],
      },
      { t: 'text', text: 'を見てください。' },
    ];
    const htmlNested = renderToString(<RichTextView segments={nestedUnderline} />);
    expect(htmlNested).toContain('<u');
    expect(htmlNested).toContain('<ruby');
    expect(htmlNested).toContain('地図');
    expect(htmlNested).toContain('ちず');
    expect(htmlNested).toContain('</u>');
  });

  it('renders star symbol with accessible role and label', () => {
    const starSegments: RichText = [
      { t: 'text', text: 'わたしは ' },
      { t: 'blank' },
      { t: 'blank' },
      { t: 'star' },
      { t: 'blank' },
      { t: 'text', text: ' です。' },
    ];

    const html = renderToString(
      <RichTextView segments={starSegments} starAriaLabel="Vị trí dấu sao" blankAriaLabel="Ô trống điền từ" />,
    );
    expect(html).toContain('★');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Vị trí dấu sao"');
    expect(html).toContain('role="textbox"');
    expect(html).toContain('aria-label="Ô trống điền từ"');
  });

  it('renders rich tables with multiple rows and rich text cells', () => {
    const tableRows: RichText[][] = [
      [
        [{ t: 'text', text: '曜日' }],
        [{ t: 'text', text: '開店時間' }],
      ],
      [
        [{ t: 'text', text: '月曜日' }],
        [{ t: 'text', text: '9:00' }],
      ],
      [
        [{ t: 'ruby', text: '火曜日', rt: 'かようび' }],
        [{ t: 'underline', text: '10:00' }],
      ],
    ];

    const html = renderToString(<RichTableView rows={tableRows} tableAriaLabel="Lịch mở cửa" />);
    expect(html).toContain('<table');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Lịch mở cửa"');
    expect(html).toContain('曜日');
    expect(html).toContain('開店時間');
    expect(html).toContain('月曜日');
    expect(html).toContain('9:00');
    expect(html).toContain('かようび');
    expect(html).toContain('10:00');
  });

  it('renders passage blocks including paragraph, image, and table', () => {
    const passage: RichBlock[] = [
      {
        type: 'paragraph',
        content: [
          { t: 'text', text: '次の文章を読んで、後の問いに答えなさい。' },
        ],
      },
      {
        type: 'table',
        rows: [
          [
            [{ t: 'text', text: '項目' }],
            [{ t: 'text', text: '料金' }],
          ],
          [
            [{ t: 'text', text: '大人' }],
            [{ t: 'text', text: '1,000円' }],
          ],
        ],
      },
      {
        type: 'image',
        mediaKey: 'media/poster.png',
        alt: 'Áp phích thông báo',
        width: 400,
        height: 300,
      },
    ];

    const html = renderToString(<PassageView passage={passage} />);
    expect(html).toContain('jlpt-passage-card');
    expect(html).toContain('次の文章を読んで');
    expect(html).toContain('<table');
    expect(html).toContain('大人');
    expect(html).toContain('1,000円');
    expect(html).toContain('<img');
    expect(html).toContain('src="/media/poster.png"');
    expect(html).toContain('alt="Áp phích thông báo"');
    expect(html).toContain('width="400"');
    expect(html).toContain('height="300"');

    // Individual RichBlockView check
    const paragraphHtml = renderToString(
      <RichBlockView block={{ type: 'paragraph', content: [{ t: 'text', text: 'Đoạn văn mẫu' }] }} />,
    );
    expect(paragraphHtml).toContain('Đoạn văn mẫu');
  });

  it('prevents XSS: blocks javascript: and vbscript: URIs in images', () => {
    // javascript: URL
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('JAVASCRIPT:alert(document.cookie)')).toBe('');
    expect(sanitizeUrl('  javascript:void(0)  ')).toBe('');
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
    expect(sanitizeUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe('');

    // Obfuscated with whitespace or control characters
    expect(sanitizeUrl('jav\tascript:alert(1)')).toBe('');
    expect(sanitizeUrl('java\0script:alert(1)')).toBe('');

    // Safe URLs
    expect(sanitizeUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
    expect(sanitizeUrl('/media/test.png')).toBe('/media/test.png');
    expect(sanitizeUrl('media/test.png')).toBe('media/test.png');
    expect(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');

    // Rendering component with dangerous image URL does not render the img src
    const dangerousImageSegment: RichText = [
      {
        t: 'image',
        url: 'javascript:alert("pwned")',
        alt: 'Malicious image',
      },
    ];

    const html = renderToString(<RichTextView segments={dangerousImageSegment} />);
    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('<img');
  });

  it('prevents HTML/script injection in text content (escaped by React)', () => {
    const maliciousTextSegment: RichText = [
      {
        t: 'text',
        text: '<script>alert("xss")</script><img src="x" onerror="alert(1)">',
      },
    ];

    const html = renderToString(<RichTextView segments={maliciousTextSegment} />);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert');
    expect(html).toContain('&lt;img src=');
  });
});
