/**
 * Strict pure TypeScript Markdown & HTML Sanitizer.
 *
 * Requirements:
 * - Markdown sanitized (Acceptance 3)
 * - Removes raw scripts, iframes, SVGs with handlers, and dangerous handlers
 * - Preserves standard safe Markdown formatting and safe links
 */
export class MarkdownSanitizer {
  private static readonly DANGEROUS_TAG_REGEX =
    /<\s*\/?\s*(script|iframe|object|embed|applet|meta|link|style|form|input|button|base|frame|frameset|svg|math)[^>]*>/gi;

  private static readonly INLINE_EVENT_REGEX = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

  private static readonly DANGEROUS_URI_REGEX =
    /(javascript|vbscript|data\s*:\s*(text\/html|image\/svg\+xml|text\/javascript))\s*:/gi;

  /**
   * Sanitizes markdown text by stripping executable code, unsafe HTML tags, and dangerous protocols.
   */
  static sanitize(markdown: string): string {
    if (!markdown) return '';

    let clean = markdown;

    // 1. Remove dangerous HTML tags
    clean = clean.replace(this.DANGEROUS_TAG_REGEX, '');

    // 2. Remove inline event handlers (e.g. onerror=, onload=, onclick=)
    clean = clean.replace(this.INLINE_EVENT_REGEX, '');

    // 3. Remove dangerous protocols in links and images [text](javascript:...) or <a href="javascript:...">
    clean = clean.replace(this.DANGEROUS_URI_REGEX, 'blocked:');

    // 4. Ensure any remaining raw HTML image tags with inline event handlers are neutralized
    clean = clean.replace(/<img\s+([^>]*)(on\w+)=[^>]*>/gi, '<img $1>');

    // 5. Clean up broken attributes
    clean = clean.replace(/\s+href\s*=\s*["']\s*javascript:[^"']*["']/gi, ' href="blocked:"');

    return clean;
  }

  /**
   * Validates if a text contains disallowed scripts or iframes.
   */
  static isSafe(markdown: string): boolean {
    if (!markdown) return true;
    if (this.DANGEROUS_TAG_REGEX.test(markdown)) return false;
    if (this.INLINE_EVENT_REGEX.test(markdown)) return false;
    if (this.DANGEROUS_URI_REGEX.test(markdown)) return false;
    return true;
  }
}
