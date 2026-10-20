'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { useI18n } from '../lib/i18n';

export default function HomePage(): React.JSX.Element {
  const { t } = useI18n();

  const levels: Array<{ id: string; level: string; color: 'danger' | 'warning' | 'primary' | 'info' | 'neutral'; descKey: string }> = [
    { id: 'n1', level: 'N1', color: 'danger', descKey: 'home.levelCards.n1' },
    { id: 'n2', level: 'N2', color: 'warning', descKey: 'home.levelCards.n2' },
    { id: 'n3', level: 'N3', color: 'primary', descKey: 'home.levelCards.n3' },
    { id: 'n4', level: 'N4', color: 'info', descKey: 'home.levelCards.n4' },
    { id: 'n5', level: 'N5', color: 'neutral', descKey: 'home.levelCards.n5' },
  ];

  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'JLPT Online',
    url: 'https://jlpt.vn',
    description: 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn quốc tế từ N5 đến N1.',
  };

  return (
    <div>
      <JsonLd id="homepage-website-schema" data={websiteStructuredData} />
      {/* Hero Section */}
      <section
        style={{
          padding: '4rem 1rem',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '800px' }}>
          <Badge variant="primary" size="md" style={{ marginBottom: '1rem' }}>
            JLPT Online V1–V4
          </Badge>
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
              margin: '0 0 1.25rem 0',
            }}
          >
            {t('home.heroTitle')}
          </h1>
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: '0 0 2rem 0',
            }}
          >
            {t('home.heroSubtitle')}
          </p>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <a href="/dang-ky" style={{ textDecoration: 'none' }}>
              <Button size="lg" variant="primary">
                {t('home.startFreeTrial')}
              </Button>
            </a>
            <a href="/de-thi" style={{ textDecoration: 'none' }}>
              <Button size="lg" variant="outline">
                {t('home.viewLibrary')}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Levels Grid (SYS-01 Responsive) */}
      <section
        id="levels"
        style={{
          padding: '4rem 1rem',
          backgroundColor: 'var(--bg-page)',
        }}
      >
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontSize: '1.875rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem 0',
              }}
            >
              {t('home.levelsTitle')}
            </h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1.0625rem',
                margin: 0,
              }}
            >
              {t('home.levelsSubtitle')}
            </p>
          </div>

          <div className="responsive-grid-5">
            {levels.map(({ id, level, color, descKey }) => (
              <Card key={id} elevated style={{ display: 'flex', flexDirection: 'column' }}>
                <CardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge variant={color} size="md">
                      {level}
                    </Badge>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      JLPT
                    </span>
                  </div>
                  <CardTitle as="h3" style={{ marginTop: '0.5rem' }}>
                    {t('home.levelHeading', { level })}
                  </CardTitle>
                </CardHeader>
                <CardContent style={{ flex: 1 }}>
                  <p style={{ margin: 0 }}>{t(descKey)}</p>
                </CardContent>
                <CardFooter style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
                  <a href={`/${id}`} style={{ textDecoration: 'none', width: '100%' }}>
                    <Button variant="primary" size="sm" style={{ width: '100%' }}>
                      {t('home.exploreLevel', { level })}
                    </Button>
                  </a>
                  <a href={`/${id}/de-thi`} style={{ textDecoration: 'none', width: '100%' }}>
                    <Button variant="outline" size="sm" style={{ width: '100%' }}>
                      {t('home.viewLevelExams', { level })}
                    </Button>
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section
        style={{
          padding: '4rem 1rem',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
            }}
          >
            <Card>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏱️</div>
              <CardTitle as="h3" style={{ marginBottom: '0.5rem' }}>
                {t('home.features.examEngineTitle')}
              </CardTitle>
              <CardContent>
                <p style={{ margin: 0 }}>{t('home.features.examEngine')}</p>
              </CardContent>
            </Card>

            <Card>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🧠</div>
              <CardTitle as="h3" style={{ marginBottom: '0.5rem' }}>
                {t('home.features.smartSRSTitle')}
              </CardTitle>
              <CardContent>
                <p style={{ margin: 0 }}>{t('home.features.smartSRS')}</p>
              </CardContent>
            </Card>

            <Card>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
              <CardTitle as="h3" style={{ marginBottom: '0.5rem' }}>
                {t('home.features.analyticsTitle')}
              </CardTitle>
              <CardContent>
                <p style={{ margin: 0 }}>{t('home.features.analytics')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
