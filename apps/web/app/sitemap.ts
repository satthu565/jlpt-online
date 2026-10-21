import type { MetadataRoute } from 'next';
import { examApiClient } from '../features/exam/api/exam-api';
import { FEATURES } from '../lib/features';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://jlpt.vn';
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
        vi: `${baseUrl}${route}`,
        ja: `${baseUrl}/ja${route}`,
        en: `${baseUrl}/en${route}`,
      },
    },
  }));

  // 2. Published exam routes (SEO-06)
  try {
    const res = await examApiClient.getExams({ limit: 100 });
    for (const exam of res.items || []) {
      entries.push({
        url: `${baseUrl}/de-thi/${exam.slug}`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: {
          languages: {
            vi: `${baseUrl}/de-thi/${exam.slug}`,
            ja: `${baseUrl}/ja/de-thi/${exam.slug}`,
            en: `${baseUrl}/en/de-thi/${exam.slug}`,
          },
        },
      });
    }
  } catch {
    // Graceful fallback during static build or offline
  }

  return entries;
}
