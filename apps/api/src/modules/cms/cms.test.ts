import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { seedDatabase } from '../../db/seed.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { MarkdownSanitizer } from './sanitizer.js';
import { CmsService } from './cms.service.js';
import { CmsController } from './cms.controller.js';

describe('A04 CMS & Markdown Sanitization Suite (ADM-13, SEO-05, SEO-09, SEO-12)', () => {
  let dbClient: DbClientInstance;
  let service: CmsService;
  let controller: CmsController;
  let adminUserId: string;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);
    await seedDatabase(dbClient);

    service = new CmsService(dbClient);
    controller = new CmsController(service);

    adminUserId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: adminUserId,
      email: 'cms_admin@jlpt.local',
      role: 'admin',
      locale: 'vi',
    });
  });

  afterEach(async () => {
    if (dbClient) {
      await dbClient.close();
    }
  });

  describe('Acceptance 3: Markdown Sanitization & XSS Prevention', () => {
    it('Loại bỏ hoàn toàn thẻ script, iframe, object và inline event handlers', () => {
      const malicious = `
# Tiêu đề bài viết
<script>alert("hacked")</script>
<iframe src="http://evil.com"></iframe>
<img src="x" onerror="alert(document.cookie)" />
[Bấm vào đây](javascript:alert("pwned"))
Safe text in paragraph.
`;

      const sanitized = MarkdownSanitizer.sanitize(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).not.toContain('javascript:alert');
      expect(sanitized).toContain('# Tiêu đề bài viết');
      expect(sanitized).toContain('Safe text in paragraph.');
    });

    it('Giữ nguyên định dạng Markdown an toàn (Headings, Tables, Lists, Code, Safe links)', () => {
      const safeMarkdown = `
# Hướng dẫn ôn thi N3
## 1. Cấu trúc đề thi
- Phần 1: Kiến thức ngôn ngữ (Chữ Hán, Từ vựng)
- Phần 2: Đọc hiểu
- Phần 3: Nghe hiểu

| Phần | Thời gian | Điểm tối đa |
| --- | --- | --- |
| Từ vựng | 30p | 60 |

Xem chi tiết tại [Trang chủ](https://jlpt.vn/n3).
\`\`\`js
console.log("Safe code block");
\`\`\`
`;
      const result = MarkdownSanitizer.sanitize(safeMarkdown);
      expect(result).toContain('# Hướng dẫn ôn thi N3');
      expect(result).toContain('## 1. Cấu trúc đề thi');
      expect(result).toContain('| Phần | Thời gian | Điểm tối đa |');
      expect(result).toContain('[Trang chủ](https://jlpt.vn/n3)');
      expect(result).toContain('console.log("Safe code block");');
    });

    it('Hàm isSafe phát hiện nội dung có chứa mã độc', () => {
      expect(MarkdownSanitizer.isSafe('### Nội dung hoàn toàn an toàn')).toBe(true);
      expect(MarkdownSanitizer.isSafe('<script>steal()</script>')).toBe(false);
      expect(MarkdownSanitizer.isSafe('<a href="javascript:void(0)">Click</a>')).toBe(false);
      expect(MarkdownSanitizer.isSafe('<img src="avatar.png" onload="run()" />')).toBe(false);
    });
  });

  describe('ADM-13: Quản lý bài viết và nội dung trang chủ (Articles & Versions)', () => {
    it('Tạo bài viết mới thành công kèm phiên bản 1 và tự động sanitize', async () => {
      const article = await service.createArticle({
        slug: 'meo-lam-bai-thi-doc-hieu',
        title: 'Mẹo làm bài thi Đọc hiểu JLPT',
        markdown: '# Đọc hiểu N2\n<script>badCode()</script>\nNội dung an toàn.',
        summary: 'Các kỹ năng làm bài đọc hiểu nhanh và chính xác.',
        tags: ['doc-hieu', 'N2'],
        authorId: adminUserId,
        status: 'published',
      });

      expect(article.id).toBeDefined();
      expect(article.currentVersion).toBe(1);
      expect(article.status).toBe('published');
      expect(article.content.markdown).not.toContain('<script>');
      expect(article.content.markdown).toContain('Nội dung an toàn.');

      // Truy xuất lại bài viết theo slug
      const fetched = await service.getArticleBySlug('meo-lam-bai-thi-doc-hieu');
      expect(fetched.title).toBe('Mẹo làm bài thi Đọc hiểu JLPT');
      expect(fetched.content.tags).toContain('doc-hieu');
    });

    it('Cập nhật bài viết tạo phiên bản mới (version 2) và lưu trữ lịch sử', async () => {
      const created = await service.createArticle({
        slug: 'kinh-nghiem-nghe-hieu',
        title: 'Kinh nghiệm Nghe hiểu V1',
        markdown: 'Bản thảo ban đầu.',
        authorId: adminUserId,
      });

      const updated = await service.updateArticle(created.id, {
        title: 'Kinh nghiệm Nghe hiểu V2 (Cập nhật)',
        markdown: 'Nội dung cập nhật mới nhất cho kỳ thi tháng 12.',
        status: 'published',
        authorId: adminUserId,
      });

      expect(updated.currentVersion).toBe(2);
      expect(updated.title).toBe('Kinh nghiệm Nghe hiểu V2 (Cập nhật)');
      expect(updated.content.markdown).toBe('Nội dung cập nhật mới nhất cho kỳ thi tháng 12.');
      expect(updated.status).toBe('published');

      const allArticles = await service.listArticles();
      expect(allArticles.length).toBeGreaterThanOrEqual(1);
      const target = allArticles.find((a) => a.id === created.id);
      expect(target?.currentVersion).toBe(2);
    });
  });

  describe('SEO-05, SEO-09 & SEO-12: Gieo mầm nội dung chuẩn SEO', () => {
    beforeEach(async () => {
      await service.ensureSeededContent(adminUserId);
    });

    it('SEO-05: Khởi tạo bài viết Blog hướng dẫn thi JLPT N1-N5 toàn diện', async () => {
      const article = await service.getArticleBySlug('huong-dan-thi-jlpt-toan-dien');
      expect(article).toBeDefined();
      expect(article.status).toBe('published');
      expect(article.content.markdown).toContain('JLPT N1 - N5');
      expect(article.content.markdown).toContain('180 điểm');
      expect(article.content.tags).toContain('JLPT');
      expect(article.content.seoTitle).toContain('Cấu trúc đề thi');
    });

    it('SEO-09: Khởi tạo Landing Page giới thiệu các gói thành viên (pricing-plans)', async () => {
      const landing = await service.getLandingPageBySlug('pricing-plans');
      expect(landing).toBeDefined();
      expect(landing.content.plans?.length).toBeGreaterThanOrEqual(3);

      const freePlan = landing.content.plans?.find((p) => p.id === 'free');
      const premiumPlan = landing.content.plans?.find((p) => p.id === 'premium_3m');

      expect(freePlan?.price).toBe(0);
      expect(premiumPlan?.price).toBe(299000);
      expect(premiumPlan?.highlighted).toBe(true);
      expect(landing.content.features?.length).toBeGreaterThanOrEqual(3);
    });

    it('SEO-12: Khởi tạo Landing Page chiến dịch ôn thi 60 ngày bứt phá (on-thi-60-ngay)', async () => {
      const campaign = await service.getLandingPageBySlug('on-thi-60-ngay');
      expect(campaign).toBeDefined();
      expect(campaign.content.hero.title).toContain('60 Ngày Bứt Phá');
      expect(campaign.content.features?.some((f) => f.title.includes('SRS'))).toBe(true);
      expect(campaign.content.faq?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('FAQ Management (Câu hỏi thường gặp)', () => {
    it('Tạo FAQ item và tự động làm sạch câu trả lời', async () => {
      const faq = await service.createFaqItem({
        category: 'exam_rules',
        question: 'Thi JLPT cần mang những giấy tờ gì?',
        answer: 'Thí sinh cần mang **Phiếu báo danh** và **CCCD/Hộ chiếu gốc**.<script>xss()</script>',
        orderIndex: 1,
      });

      expect(faq.id).toBeDefined();
      expect(faq.answer).not.toContain('<script>');
      expect(faq.answer).toContain('**Phiếu báo danh**');

      const list = await service.listFaqItems('exam_rules');
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0]?.question).toBe('Thi JLPT cần mang những giấy tờ gì?');
    });
  });

  describe('CmsController Guards & Permissions', () => {
    it('Yêu cầu tài khoản nhân sự khi tạo bài viết mới', async () => {
      await expect(
        controller.createArticle(
          {
            slug: 'unauthorized-article',
            title: 'Test',
            markdown: 'Test',
            authorId: 'anonymous',
          },
          undefined, // no user context
        ),
      ).rejects.toThrow();
    });

    it('API sanitize preview trả về chuỗi đã được làm sạch', async () => {
      const preview = await controller.sanitizePreview(
        'Click <a href="javascript:alert(1)">here</a> <script>hack()</script>',
      );
      expect(preview.sanitized).not.toContain('<script>');
      expect(preview.sanitized).not.toContain('javascript:');
    });
  });
});
