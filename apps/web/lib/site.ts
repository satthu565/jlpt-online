/**
 * Thông tin nhận diện của website: tên thương hiệu và địa chỉ gốc.
 * Mọi nơi cần tên hiển thị hoặc URL tuyệt đối (canonical, Open Graph, sitemap, robots, JSON-LD)
 * phải dùng file này, không viết cứng tên miền.
 *
 * Địa chỉ gốc lấy từ biến NEXT_PUBLIC_SITE_URL lúc build; chưa đặt thì dùng tên miền dự kiến.
 * Khi chạy ở địa chỉ khác (ví dụ xem thử trong mạng LAN) hãy đặt biến này để canonical không trỏ sai.
 */
export const SITE_NAME = 'Gokakuya.com';

export const SITE_URL: string = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gokakuya.com').replace(
  /\/+$/,
  '',
);

/** Ghép đường dẫn tuyệt đối từ địa chỉ gốc. `absoluteUrl('/de-thi')` -> `https://gokakuya.com/de-thi`. */
export function absoluteUrl(path = ''): string {
  if (!path || path === '/') return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Đường dẫn theo ngôn ngữ: vi không có tiền tố, ja và en có tiền tố `/ja`, `/en`. */
export function localizedUrl(locale: 'vi' | 'ja' | 'en', path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return absoluteUrl(locale === 'vi' ? clean : `/${locale}${clean === '/' ? '' : clean}`);
}
