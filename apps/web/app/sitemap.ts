import type { MetadataRoute } from 'next';
import { examApiClient } from '../features/exam/api/exam-api';
import { FEATURES } from '../lib/features';
import { SITE_URL, localizedUrl } from '../lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const currentDate = new Date().toISOString();

  // 1. Static public routes (SEO-01, SEO-02, SEO-03, SEO-04, SEO-06, SEO-10)
  const staticRoutes = [
    '',
    '/n1',
    '/n2',
    '/n3',
    '/n4',
    '/n5',
    '/n1/de-thi',
    '/n2/de-thi',
    '/n3/de-thi',
    '/n4/de-thi',
    '/n5/de-thi',
    '/tu-vung',
    '/ngu-phap',
    '/thong-ke-tu-vung',
    '/de-thi',
    '/goi-thanh-vien',
    '/faq',
    '/lien-he',
    '/ho-tro',
    '/dieu-khoan',
    ...(FEATURES.privacyPolicyPage ? ['/chinh-sach'] : []),
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route.startsWith('/n') ? 0.9 : 0.8,
    alternates: {
      languages: {
        vi: localizedUrl('vi', route),
        ja: localizedUrl('ja', route),
        en: localizedUrl('en', route),
      },
    },
  }));

  // 2. Published exam routes (SEO-06)
  try {
    const res = await examApiClient.getExams({ limit: 100 });
    for (const exam of res.items || []) {
      const examPath = `/de-thi/${exam.slug}`;
      entries.push({
        url: `${baseUrl}${examPath}`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: {
          languages: {
            vi: localizedUrl('vi', examPath),
            ja: localizedUrl('ja', examPath),
            en: localizedUrl('en', examPath),
          },
        },
      });
    }
  } catch {
    // Graceful fallback during static build or offline
  }

  return entries;
}
