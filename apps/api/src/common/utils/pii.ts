const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /api[_-]?key/i,
  /credential/i,
];

const EMAIL_REGEX = /([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g;
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9._\-~+/]+=*/gi;

/**
 * Masks an email address for safe logging.
 * Example: "john.doe@example.com" -> "j***@example.com"
 */
export function maskEmail(email: string): string {
  return email.replace(EMAIL_REGEX, '$1***@$2');
}

/**
 * Masks PII and secrets in any arbitrary string.
 */
export function maskPiiString(content: string): string {
  let masked = content.replace(BEARER_REGEX, 'Bearer [REDACTED]');
  masked = maskEmail(masked);
  // Redact token/password/secret values in URL query strings (e.g. ?token=abc -> ?token=[REDACTED])
  masked = masked.replace(/([?&](?:token|password|secret|code)=)[^&\s"'#]+/gi, '$1[REDACTED]');
  return masked;
}

/**
 * Recursively masks sensitive fields in an object or array.
 */
export function maskPii<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return maskPiiString(data) as unknown as T;
  }

  // Binary payloads (ZIP uploads, media) carry no maskable fields. Walking them with Object.entries
  // creates one entry per byte: a 33 MB package grew the API past 2.7 GB and crashed it.
  if (Buffer.isBuffer(data) || ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskPii(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitive) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = maskPii(value);
      } else if (typeof value === 'string') {
        result[key] = maskPiiString(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return data;
}
