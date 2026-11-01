/**
 * Lời giải từ API được lưu dạng văn bản có cấu trúc (RichText: [{ t: 'text', text }, ...]).
 * Hàm này đổi mọi dạng (chuỗi, mảng đoạn, khối lồng nhau) về chuỗi hiển thị an toàn,
 * để giao diện không bao giờ render object trực tiếp (React error #31).
 */
export function toDisplayText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((item) => toDisplayText(item)).join('');
  if (typeof value === 'object') {
    const node = value as Record<string, unknown>;
    if (node.t === 'br') return '\n';
    if (typeof node.text === 'string') return node.text;
    if (Array.isArray(node.children)) {
      const inner = toDisplayText(node.children);
      const isInline = node.t === 'underline' || node.t === 'emphasis' || node.t === 'ruby';
      return isInline ? inner : `${inner}\n`;
    }
  }
  return '';
}
