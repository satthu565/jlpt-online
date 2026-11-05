import type { RichTextSegment } from '@jlpt/schema';

export function richTextToPlainText(segments?: RichTextSegment[] | unknown): string {
  if (!segments) return '';
  if (typeof segments === 'string') return segments;
  if (!Array.isArray(segments)) return '';
  let res = '';
  for (const seg of segments) {
    if (!seg) continue;
    if (typeof seg === 'string') {
      res += seg;
      continue;
    }
    const type = seg.t || (seg as { type?: string }).type;
    switch (type) {
      case 'text':
      case 'ruby':
        res += 'text' in seg && typeof seg.text === 'string' ? seg.text : '';
        break;
      case 'underline':
      case 'emphasis':
        if ('children' in seg && Array.isArray(seg.children)) {
          res += richTextToPlainText(seg.children);
        } else if ('text' in seg && typeof seg.text === 'string') {
          res += seg.text;
        }
        break;
      case 'blank':
        res += ' (   ) ';
        break;
      case 'star':
        res += ' ★ ';
        break;
      case 'br':
        res += ' ';
        break;
    }
  }
  return res.replace(/\s+/g, ' ').trim();
}
