import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Providers } from '../app/providers';

// 13 Pages in Scope
import NotebookPage from '../app/(learning)/so-tay/page';
import PlannerPage from '../app/(planner)/ke-hoach/page';
import PracticePage from '../app/(practice)/luyen-tap/page';
import AnalyticsPage from '../app/(analytics)/thong-ke/page';
import VocabCorpusPage from '../app/(corpus)/tu-vung/page';
import GrammarCorpusPage from '../app/(corpus)/ngu-phap/page';
import VocabFrequencyStatsPage from '../app/(corpus)/thong-ke-tu-vung/page';
import ClassroomPage from '../app/(classroom)/lop-hoc/page';
import ExamEventPage from '../app/(community)/su-kien/page';
import DiscussionsPage from '../app/(community)/thao-luan/page';
import MembershipPage from '../app/(billing)/goi-thanh-vien/page';
import AccountPage from '../app/(account)/tai-khoan/page';
import FaqPage from '../app/(info)/faq/page';

const h = React.createElement;

describe('I06: 13 Learner Pages Real Integration & Accessibility Suite', () => {
  const pages = [
    { name: 'so-tay', Component: NotebookPage },
    { name: 'ke-hoach', Component: PlannerPage },
    { name: 'luyen-tap', Component: PracticePage },
    { name: 'thong-ke', Component: AnalyticsPage },
    { name: 'tu-vung', Component: VocabCorpusPage },
    { name: 'ngu-phap', Component: GrammarCorpusPage },
    { name: 'thong-ke-tu-vung', Component: VocabFrequencyStatsPage },
    { name: 'lop-hoc', Component: ClassroomPage },
    { name: 'su-kien', Component: ExamEventPage },
    { name: 'thao-luan', Component: DiscussionsPage },
    { name: 'goi-thanh-vien', Component: MembershipPage },
    { name: 'tai-khoan', Component: AccountPage },
    { name: 'faq', Component: FaqPage },
  ];

  it('renders all 13 pages without throwing runtime errors', () => {
    for (const { Component } of pages) {
      expect(() => {
        renderToString(h(Providers, null, h(Component)));
      }).not.toThrow();
    }
  });

  it('ensures no raw translation keys leak on any of the 13 pages (Acceptance 5)', () => {
    // Specifically test that keys like account.profile.title do not appear literally
    const keyPatterns = [
      /account\.profile\.\w+/,
      /billing\.pricing\.\w+/,
      /notebook\.page\.\w+/,
      /planner\.page\.\w+/,
      /classroom\.page\.\w+/,
      /community\.event\.\w+/,
      /seo\.faq\.\w+/,
    ];

    for (const { name, Component } of pages) {
      const html = renderToString(h(Providers, null, h(Component)));
      for (const pattern of keyPatterns) {
        const m = html.match(pattern);
        if (m) {
          console.error(`Page ${name} leaked key: ${m[0]}`);
        }
        expect(html).not.toMatch(pattern);
      }
    }
  });

  it('verifies responsive container wrapping without fixed horizontal overflow constraints', () => {
    for (const { Component } of pages) {
      const html = renderToString(h(Providers, null, h(Component)));
      // All pages must have responsive max-w constraint or responsive flex/grid wrappers
      const hasResponsiveContainer =
        html.includes('max-w-') ||
        html.includes('container') ||
        html.includes('w-full') ||
        html.includes('flex flex-col');
      expect(hasResponsiveContainer).toBe(true);
    }
  });

  it('verifies auth guard / unauthenticated notice links for protected pages', () => {
    // AnalyticsPage when unauthenticated shows login CTA
    const analyticsHtml = renderToString(h(Providers, null, h(AnalyticsPage)));
    expect(analyticsHtml).toContain('/dang-nhap?redirect=/thong-ke');

    // AccountPage includes link to login when unauthenticated
    const accountHtml = renderToString(h(Providers, null, h(AccountPage)));
    expect(accountHtml).toContain('/dang-nhap?redirect=/tai-khoan');

    // NotebookPage includes link to login when unauthenticated
    const notebookHtml = renderToString(h(Providers, null, h(NotebookPage)));
    expect(notebookHtml).toContain('/dang-nhap?redirect=/so-tay');

    // ClassroomPage includes link to login when unauthenticated
    const classroomHtml = renderToString(h(Providers, null, h(ClassroomPage)));
    expect(classroomHtml).toContain('/dang-nhap?redirect=/lop-hoc');

    // ExamEventPage includes link to login when unauthenticated
    const eventHtml = renderToString(h(Providers, null, h(ExamEventPage)));
    expect(eventHtml).toContain('/dang-nhap?redirect=/su-kien');

    // DiscussionsPage includes link to login when unauthenticated
    const discussionHtml = renderToString(h(Providers, null, h(DiscussionsPage)));
    expect(discussionHtml).toContain('/dang-nhap?redirect=/thao-luan');
  });

  it('verifies public corpus and info pages render structured data JSON-LD', () => {
    const vocabHtml = renderToString(h(Providers, null, h(VocabCorpusPage)));
    expect(vocabHtml).toContain('application/ld+json');
    expect(vocabHtml).toContain('"@type":"LearningResource"');

    const grammarHtml = renderToString(h(Providers, null, h(GrammarCorpusPage)));
    expect(grammarHtml).toContain('application/ld+json');

    const statsHtml = renderToString(h(Providers, null, h(VocabFrequencyStatsPage)));
    expect(statsHtml).toContain('application/ld+json');

    const faqHtml = renderToString(h(Providers, null, h(FaqPage)));
    expect(faqHtml).toContain('application/ld+json');
    expect(faqHtml).toContain('"@type":"FAQPage"');
  });
});
