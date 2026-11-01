import { describe, expect, it } from 'vitest';
import { toDisplayText } from '../features/explanations/rich-text';

describe('toDisplayText', () => {
  it('giữ nguyên chuỗi', () => {
    expect(toDisplayText('Đáp án 1 đúng')).toBe('Đáp án 1 đúng');
  });
  it('đổi mảng RichText về chuỗi', () => {
    expect(toDisplayText([{ t: 'text', text: 'Đáp án đúng: ' }, { t: 'text', text: 'まって' }])).toBe(
      'Đáp án đúng: まって',
    );
  });
  it('xử lý xuống dòng và đoạn lồng nhau', () => {
    expect(toDisplayText([{ t: 'text', text: 'a' }, { t: 'br' }, { t: 'text', text: 'b' }])).toBe('a\nb');
    expect(toDisplayText([{ t: 'underline', children: [{ t: 'text', text: 'x' }] }])).toBe('x');
  });
  it('không bao giờ trả về object', () => {
    expect(toDisplayText(null)).toBe('');
    expect(toDisplayText({ foo: 1 })).toBe('');
  });
});
