import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// App Pages
import LevelIntroductionPage, { generateStaticParams as generateLevelParams } from '../app/(seo)/[level]/page';
import LevelExamsPage, { generateStaticParams as generateLevelExamsParams } from '../app/(seo)/[level]/de-thi/page';
import SessionExamsPage, { generateStaticParams as generateSessionParams } from '../app/(seo)/[level]/de-thi/[session]/page';
import VocabCorpusPage from '../app/(corpus)/tu-vung/page';
import GrammarCorpusPage from '../app/(corpus)/ngu-phap/page';
import VocabFrequencyStatsPage from '../app/(corpus)/thong-ke-tu-vung/page';
import FaqPage from '../app/(info)/faq/page';
import ContactPage from '../app/(info)/lien-he/page';
import SupportCenterPage from '../app/(info)/ho-tro/page';
import TermsOfServicePage from '../app/(info)/dieu-khoan/page';
import PrivacyPolicyPage from '../app/(info)/chinh-sach/page';
import AboutPage from '../app/(info)/gioi-thieu/page';
import ShareResultPage from '../app/(share)/chia-se/ket-qua/[id]/page';

// Sitemap & Robots
import sitemap from '../app/sitemap';
import robots from '../app/robots';

// Consent & Attribution Helpers
import { setConsentStatus, getConsentStatus, hasAnalyticsConsent } from '../lib/consent';
import { captureTrafficAttribution, getStoredAttribution } from '../lib/attribution';

const renderClean = (element: React.JSX.Element): string =>
  renderToString(element)
    .replace(/<!--.*?-->/g, '')
    .replace(/&amp;/g, '&');

describe('SEO & Public Pages Suite (SEO-01, 02, 03, 04, 06, 07, 08, 10, 11)', () => {
  // =========================================================================
  // 1. SEO-01: Trang giới thiệu cho từng cấp độ N1–N5
  // =========================================================================
  describe('SEO-01: Trang giới thiệu cấp độ N1–N5', () => {
    it('generates static params for all 5 JLPT levels (n1 to n5)', () => {
      const params = generateLevelParams();
      expect(params).toEqual([
        { level: 'n1' },
        { level: 'n2' },
        { level: 'n3' },
        { level: 'n4' },
        { level: 'n5' },
      ]);
    });

    it('renders N1 level page with benchmarks, passing criteria, and NO PII', async () => {
      const page = await LevelIntroductionPage({ params: Promise.resolve({ level: 'n1' }) });
      const html = renderClean(page);

      // Level title & criteria
      expect(html).toContain('JLPT N1');
      expect(html).toContain('100 / 180');
      expect(html).toContain('10,000');
      expect(html).toContain('2,000');
      expect(html).toContain('900 - 1200');

      // Structured data Course (SEO-07)
      expect(html).toContain('application/ld+json');
      expect(html).toContain('"@type":"Course"');
      expect(html).toContain('"educationalCredentialAwarded":"JLPT N1 Certificate"');

      // Action links
      expect(html).toContain('href="/n1/de-thi"');
      expect(html).toContain('href="/luyen-tap?level=N1"');

      // Zero PII leakage
      expect(html).not.toContain('@example.com');
      expect(html).not.toContain('password');
      expect(html).not.toContain('user-token');
    });

    it('renders N3 level page with section breakdown and time limits', async () => {
      const page = await LevelIntroductionPage({ params: Promise.resolve({ level: 'n3' }) });
      const html = renderClean(page);

      expect(html).toContain('JLPT N3');
      expect(html).toContain('95 / 180');
      expect(html).toContain('Kiến thức ngôn ngữ (Từ vựng)');
      expect(html).toContain('30 phút');
      expect(html).toContain('70 phút');
      expect(html).toContain('40 phút');
      expect(html).toContain('href="/n3/de-thi"');
    });

    it('renders N5 level page with beginner requirements', async () => {
      const page = await LevelIntroductionPage({ params: Promise.resolve({ level: 'n5' }) });
      const html = renderClean(page);

      expect(html).toContain('JLPT N5');
      expect(html).toContain('80 / 180');
      expect(html).toContain('800');
      expect(html).toContain('100');
    });
  });

  // =========================================================================
  // 2. SEO-02: Trang danh sách đề theo năm và kỳ
  // =========================================================================
  describe('SEO-02: Danh sách đề theo cấp độ, năm và kỳ', () => {
    it('generates static params for all levels in /[level]/de-thi', () => {
      const params = generateLevelExamsParams();
      expect(params.map((p) => p.level)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);
    });

    it('renders level exams page with preloaded exams and NO PII', async () => {
      const page = await LevelExamsPage({ params: Promise.resolve({ level: 'n3' }) });
      const html = renderClean(page);

      expect(html).toContain('Danh sách đề thi JLPT N3 theo năm và kỳ');
      expect(html).toContain('Đề thi N3');
      // Contains exam card
      expect(html).toContain('jlpt-n3-chuan-so-1');
      // Zero PII in static server HTML
      expect(html).not.toContain('accessToken');
      expect(html).not.toContain('candidateEmail');
    });

    it('renders specific session page for e.g. /n1/de-thi/2023-12', async () => {
      const sessionParams = generateSessionParams();
      expect(sessionParams.some((p) => p.level === 'n1' && p.session === '2023-12')).toBe(true);

      const page = await SessionExamsPage({
        params: Promise.resolve({ level: 'n1', session: '2023-12' }),
      });
      const html = renderClean(page);

      expect(html).toContain('Đề thi JLPT N1 - Kỳ thi 2023-12');
      expect(html).toContain('jlpt-n1-2023-12');
      expect(html).toContain('Japan Foundation &amp; JEES');
    });
  });

  // =========================================================================
  // 3. SEO-03: Trang giới thiệu từ vựng và mẫu ngữ pháp
  // =========================================================================
  describe('SEO-03: Trang từ vựng và mẫu ngữ pháp', () => {
    it('renders vocabulary corpus page with terms, level filters, and JSON-LD', () => {
      const html = renderClean(<VocabCorpusPage />);
      expect(html).toContain('Thư viện Từ vựng JLPT N1–N5');
      expect(html).toContain('application/ld+json');
      expect(html).toContain('"@type":"LearningResource"');
      expect(html).toContain('曖昧');
      expect(html).toContain('あいまい');
      expect(html).toContain('Mơ hồ, không rõ ràng');
      expect(html).toContain('data-testid="vocab-search-input"');
      expect(html).toContain('data-testid="level-tabs"');
    });

    it('renders grammar pattern page with formation, examples, and practice link', () => {
      const html = renderClean(<GrammarCorpusPage />);
      expect(html).toContain('Thư viện Mẫu Ngữ pháp JLPT N1–N5');
      expect(html).toContain('〜わけにはいかない');
      expect(html).toContain('Cấu trúc kết hợp:');
      expect(html).toContain('data-testid="practice-pattern-btn"');
      expect(html).toContain('/luyen-tap?patternId=');
    });
  });

  // =========================================================================
  // 4. SEO-04: Trang thống kê từ thường gặp & Xu hướng
  // =========================================================================
  describe('SEO-04: Thống kê từ thường gặp & Xu hướng', () => {
    it('renders frequency stats page with ranking table, level comparison, and CSV export link', () => {
      const html = renderClean(<VocabFrequencyStatsPage />);
      expect(html).toContain('Thống kê Từ thường gặp &amp; Phân tích Xu hướng đề thi JLPT');
      expect(html).toContain('data-testid="frequency-table"');
      expect(html).toContain('data-testid="create-study-list-btn"');
      expect(html).toContain('data-testid="export-csv-btn"');
      expect(html).toContain('data-testid="export-excel-btn"');
      expect(html).toContain('/api/v1/datasets/jlpt-official/export?format=csv');
      expect(html).toContain('data-testid="cross-level-list"');
      expect(html).toContain('data-testid="yearly-trends-list"');
    });
  });

  // =========================================================================
  // 5. SEO-06: Sitemap và robots.txt
  // =========================================================================
  describe('SEO-06: Sitemap & Metadata robots.txt', () => {
    it('generates complete sitemap with all public pages, priorities, and hreflang alternates', () => {
      const entries = sitemap();
      expect(entries.length).toBeGreaterThan(20);

      const urls = entries.map((e) => e.url);
      expect(urls).toContain('https://jlpt.vn');
      expect(urls).toContain('https://jlpt.vn/n1');
      expect(urls).toContain('https://jlpt.vn/n3');
      expect(urls).toContain('https://jlpt.vn/n3/de-thi');
      expect(urls).toContain('https://jlpt.vn/tu-vung');
      expect(urls).toContain('https://jlpt.vn/ngu-phap');
      expect(urls).toContain('https://jlpt.vn/thong-ke-tu-vung');
      expect(urls).toContain('https://jlpt.vn/faq');
      expect(urls).toContain('https://jlpt.vn/lien-he');
      expect(urls).toContain('https://jlpt.vn/dieu-khoan');
      expect(urls).toContain('https://jlpt.vn/chinh-sach');

      // Verify hreflang alternates (vi, ja, en)
      const homeEntry = entries.find((e) => e.url === 'https://jlpt.vn');
      expect(homeEntry?.alternates?.languages?.vi).toBe('https://jlpt.vn');
      expect(homeEntry?.alternates?.languages?.ja).toBe('https://jlpt.vn/ja');
      expect(homeEntry?.alternates?.languages?.en).toBe('https://jlpt.vn/en');

      // Verify exam slugs exist in sitemap
      expect(urls.some((u) => u.includes('/de-thi/jlpt-n1-2023-12'))).toBe(true);
    });

    it('generates robots.txt disallowing private routes and referencing sitemap', () => {
      const config = robots();
      expect(config.sitemap).toBe('https://jlpt.vn/sitemap.xml');
      const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
      expect(rules?.allow).toBe('/');
      expect(rules?.disallow).toEqual(['/phong-thi/', '/tai-khoan/', '/lich-su/', '/api/']);
    });
  });

  // =========================================================================
  // 6. SEO-07: Structured Data JSON-LD
  // =========================================================================
  describe('SEO-07: Structured Data JSON-LD', () => {
    it('renders valid FAQPage JSON-LD schema on /faq', () => {
      const html = renderClean(<FaqPage />);
      expect(html).toContain('application/ld+json');
      expect(html).toContain('"@type":"FAQPage"');
      expect(html).toContain('"name":"Cấu trúc đề thi trên nền tảng JLPT Online có chuẩn như thi thật không?"');
      expect(html).toContain('"acceptedAnswer"');
    });

    it('renders BreadcrumbList JSON-LD on all info pages', () => {
      const contactHtml = renderClean(<ContactPage />);
      expect(contactHtml).toContain('"@type":"BreadcrumbList"');
      expect(contactHtml).toContain('"name":"Liên hệ"');

      const termsHtml = renderClean(<TermsOfServicePage />);
      expect(termsHtml).toContain('"@type":"BreadcrumbList"');
      expect(termsHtml).toContain('"name":"Điều khoản dịch vụ"');
    });
  });

  // =========================================================================
  // 7. SEO-08: Open Graph & Public Share Links
  // =========================================================================
  describe('SEO-08: Open Graph & Public Share Links', () => {
    it('renders public share page with certificate layout and NO private PII', async () => {
      const page = await ShareResultPage({ params: Promise.resolve({ id: 'att-share-999' }) });
      const html = renderClean(page);

      expect(html).toContain('Bảng Điểm Đánh Giá Năng Lực JLPT');
      expect(html).toContain('att-share-999');
      expect(html).toContain('ĐỖ (PASS)');
      expect(html).toContain('data-testid="security-watermark"');
      expect(html).toContain('data-testid="share-start-exam-btn"');

      // Zero private candidate PII
      expect(html).not.toContain('user@');
      expect(html).not.toContain('phone');
    });
  });

  // =========================================================================
  // 8. SEO-10: Trang liên hệ, hỗ trợ, FAQ, điều khoản, chính sách
  // =========================================================================
  describe('SEO-10: Trang liên hệ, hỗ trợ, FAQ, điều khoản, chính sách', () => {
    it('renders Contact page with honeypot bot defense and submit handler', () => {
      const html = renderClean(<ContactPage />);
      expect(html).toContain('Liên hệ &amp; Hỗ trợ học viên');
      expect(html).toContain('data-testid="contact-form"');
      expect(html).toContain('name="website_hp"'); // Honeypot
      expect(html).toContain('data-testid="contact-name-input"');
      expect(html).toContain('data-testid="contact-email-input"');
      expect(html).toContain('data-testid="contact-submit-btn"');
    });

    it('renders Support center with audio hardware test tool and operational badge', () => {
      const html = renderClean(<SupportCenterPage />);
      expect(html).toContain('Trung tâm Hỗ trợ kỹ thuật &amp; Hướng dẫn thi');
      expect(html).toContain('data-testid="test-audio-btn"');
      expect(html).toContain('Hoạt động bình thường');
      expect(html).toContain('Operational 99.98%');
    });

    it('renders Terms of Service with copyright and anti-scraping notice', () => {
      const html = renderClean(<TermsOfServicePage />);
      expect(html).toContain('Điều khoản Dịch vụ &amp; Quy chế Phòng thi JLPT Online');
      expect(html).toContain('Quyền sở hữu trí tuệ &amp; Bản quyền nội dung');
      expect(html).toContain('chống rò rỉ đáp án');
    });

    it('renders Privacy Policy with cookie consent disclosures', () => {
      const html = renderClean(<PrivacyPolicyPage />);
      expect(html).toContain('Chính sách Quyền riêng tư &amp; Bảo vệ Dữ liệu Học viên');
      expect(html).toContain('Chính sách Cookie &amp; Quyền từ chối');
      expect(html).toContain('GDPR / APPI');
    });

    it('renders About page with platform background', () => {
      const html = renderClean(<AboutPage />);
      expect(html).toContain('Về Nền tảng Luyện thi Tiếng Nhật Trực tuyến JLPT Online');
      expect(html).toContain('JLPT Online V1–V4');
    });
  });

  // =========================================================================
  // 9. SEO-11: Công cụ đo lường nguồn truy cập và Cookie Consent
  // =========================================================================
  describe('SEO-11: Consent-Aware Traffic Attribution', () => {
    beforeEach(() => {
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    });

    afterEach(() => {
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    });

    it('manages cookie consent status properly', () => {
      expect(getConsentStatus()).toBe('undetermined');
      expect(hasAnalyticsConsent()).toBe(false);

      setConsentStatus('necessary');
      expect(getConsentStatus()).toBe('necessary');
      expect(hasAnalyticsConsent()).toBe(false);

      setConsentStatus('all');
      expect(getConsentStatus()).toBe('all');
      expect(hasAnalyticsConsent()).toBe(true);
    });

    it('blocks traffic attribution when consent is denied or undetermined', () => {
      setConsentStatus('necessary');
      const attr = captureTrafficAttribution();
      expect(attr).toBeNull();
      expect(getStoredAttribution()).toBeNull();
    });
  });
});
