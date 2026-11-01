import { describe, expect, it } from 'vitest';
import { SITE_NAME, SITE_URL, absoluteUrl, localizedUrl } from '../lib/site';

describe('site', () => {
  it('có tên thương hiệu và địa chỉ gốc không dư dấu gạch chéo cuối', () => {
    expect(SITE_NAME).toBe('Gokakuya.com');
    expect(SITE_URL.endsWith('/')).toBe(false);
  });
  it('ghép đường dẫn tuyệt đối', () => {
    expect(absoluteUrl()).toBe(SITE_URL);
    expect(absoluteUrl('/')).toBe(SITE_URL);
    expect(absoluteUrl('/de-thi')).toBe(`${SITE_URL}/de-thi`);
    expect(absoluteUrl('de-thi')).toBe(`${SITE_URL}/de-thi`);
  });
  it('đường dẫn theo ngôn ngữ', () => {
    expect(localizedUrl('vi', '/ngu-phap')).toBe(`${SITE_URL}/ngu-phap`);
    expect(localizedUrl('ja', '/ngu-phap')).toBe(`${SITE_URL}/ja/ngu-phap`);
    expect(localizedUrl('en', '/')).toBe(`${SITE_URL}/en`);
  });
});
