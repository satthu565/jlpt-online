'use client';

import React from 'react';
import { BarChart3, BrainCircuit, Timer, type LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { useI18n } from '../lib/i18n';

const LEVELS: Array<{ id: string; level: string; color: 'danger' | 'warning' | 'primary' | 'info' | 'neutral'; descKey: string }> = [
  { id: 'n1', level: 'N1', color: 'danger', descKey: 'home.levelCards.n1' },
  { id: 'n2', level: 'N2', color: 'warning', descKey: 'home.levelCards.n2' },
  { id: 'n3', level: 'N3', color: 'primary', descKey: 'home.levelCards.n3' },
  { id: 'n4', level: 'N4', color: 'info', descKey: 'home.levelCards.n4' },
  { id: 'n5', level: 'N5', color: 'neutral', descKey: 'home.levelCards.n5' },
];

const FEATURES: Array<{ icon: LucideIcon; titleKey: string; bodyKey: string }> = [
  { icon: Timer, titleKey: 'home.features.examEngineTitle', bodyKey: 'home.features.examEngine' },
  { icon: BrainCircuit, titleKey: 'home.features.smartSRSTitle', bodyKey: 'home.features.smartSRS' },
  { icon: BarChart3, titleKey: 'home.features.analyticsTitle', bodyKey: 'home.features.analytics' },
];

const WEBSITE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'JLPT Online',
  url: 'https://jlpt.vn',
  description: 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn quốc tế từ N5 đến N1.',
};

export default function HomePage(): React.JSX.Element {
  const { t } = useI18n();

  return (
    <div>
      <JsonLd id="homepage-website-schema" data={WEBSITE_STRUCTURED_DATA} />

      <section className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-16 text-center">
        <div className="container mx-auto max-w-3xl">
          <Badge variant="primary" size="md" className="mb-4">
            JLPT Online V1–V4
          </Badge>
          <h1 className="mb-5 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-tight tracking-tight text-[var(--text-primary)]">
            {t('home.heroTitle')}
          </h1>
          <p className="mb-8 text-[clamp(1rem,2vw,1.25rem)] leading-relaxed text-[var(--text-secondary)]">
            {t('home.heroSubtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="primary">
              <a href="/dang-ky" className="no-underline">{t('home.startFreeTrial')}</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="/de-thi" className="no-underline">{t('home.viewLibrary')}</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="levels" className="bg-[var(--bg-page)] px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">{t('home.levelsTitle')}</h2>
            <p className="m-0 text-[1.0625rem] text-[var(--text-secondary)]">{t('home.levelsSubtitle')}</p>
          </div>

          <div className="responsive-grid-5">
            {LEVELS.map(({ id, level, color, descKey }) => (
              <Card key={id} elevated className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={color} size="md">
                      {level}
                    </Badge>
                    <span className="text-[0.8125rem] text-[var(--text-muted)]">JLPT</span>
                  </div>
                  <CardTitle as="h3" className="mt-2">
                    {t('home.levelHeading', { level })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="m-0">{t(descKey)}</p>
                </CardContent>
                <CardFooter className="mt-auto flex w-full flex-col gap-1.5">
                  <Button asChild variant="primary" size="sm" className="w-full">
                    <a href={`/${id}`} className="no-underline">{t('home.exploreLevel', { level })}</a>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <a href={`/${id}/de-thi`} className="no-underline">{t('home.viewLevelExams', { level })}</a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-16">
        <div className="container mx-auto grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8">
          {FEATURES.map(({ icon: Icon, titleKey, bodyKey }) => (
            <Card key={titleKey}>
              <span className="mb-3 flex size-11 items-center justify-center rounded-lg bg-[var(--bg-muted)] text-[var(--color-primary)]" aria-hidden="true">
                <Icon className="size-6" />
              </span>
              <CardTitle as="h3" className="mb-2">
                {t(titleKey)}
              </CardTitle>
              <CardContent>
                <p className="m-0">{t(bodyKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
