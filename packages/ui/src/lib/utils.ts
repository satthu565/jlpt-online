import { clsx, type ClassValue } from 'clsx';

/**
 * Lightweight class name merger that resolves conflicting Tailwind utility classes
 * without the heavy footprint of tailwind-merge (~32KB raw / ~10KB gzip).
 */
export function cn(...inputs: ClassValue[]): string {
  const raw = clsx(inputs);
  if (!raw) return '';
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return raw;

  const seen = new Set<string>();
  const result: string[] = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (!token) continue;
    const lastColon = token.lastIndexOf(':');
    const modifier = lastColon === -1 ? '' : token.slice(0, lastColon + 1);
    const body = lastColon === -1 ? token : token.slice(lastColon + 1);

    if (/^(?:flex|inline-flex|block|inline-block|inline|grid|inline-grid|hidden)$/.test(body)) {
      const key = `${modifier}display`;
      if (!seen.has(key)) {
        seen.add(key);
        result.unshift(token);
      }
      continue;
    }
    if (/^flex-(?:col|row)/.test(body)) {
      const key = `${modifier}flex-direction`;
      if (!seen.has(key)) {
        seen.add(key);
        result.unshift(token);
      }
      continue;
    }
    if (/^flex-(?:wrap|nowrap)/.test(body)) {
      const key = `${modifier}flex-wrap`;
      if (!seen.has(key)) {
        seen.add(key);
        result.unshift(token);
      }
      continue;
    }

    const match = body.match(
      /^((?:min-|max-)?(?:w|h)|(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)|bg|text|font|leading|tracking|rounded|border|shadow|opacity|gap|z|items|justify|content|self|place|col|row|order|overflow|cursor|select|outline|ring|transition|duration|ease|animate)-/
    );
    const key = match ? `${modifier}${match[1]}` : `${modifier}${body}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.unshift(token);
    }
  }

  return result.join(' ');
}

