import type { MetadataRoute } from 'next';
import { absoluteUrl } from '../lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/phong-thi/', '/tai-khoan/', '/lich-su/', '/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
