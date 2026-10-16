import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { MarkdownSanitizer } from './sanitizer.js';
import type {
  ArticleDto,
  CreateArticleDto,
  CreateFaqItemDto,
  CreateLandingPageDto,
  FaqItemDto,
  LandingPageDto,
  UpdateArticleDto,
} from './cms.types.js';

@Injectable()
export class CmsService {
  constructor(
    @Optional()
    @Inject(DB_CLIENT)
    private readonly dbClient: DbClientInstance,
  ) {}

  /**
   * Sanitizes markdown text using pure TypeScript MarkdownSanitizer.
   */
  sanitizeContent(markdown: string): string {
    return MarkdownSanitizer.sanitize(markdown);
  }

  /**
   * ADM-13: Tạo bài viết mới kèm phiên bản 1 (Markdown được sanitize tự động).
   */
  async createArticle(dto: CreateArticleDto): Promise<ArticleDto> {
    const db = this.dbClient.db;
    const articleId = generateUuidV7();
    const cleanMarkdown = MarkdownSanitizer.sanitize(dto.markdown);
    const now = new Date();
    const locale = dto.locale ?? 'vi';
    const status = dto.status ?? 'draft';

    await db.insert(schema.articles).values({
      id: articleId,
      slug: dto.slug,
      locale,
      status,
      publishedAt: status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    const payload = {
      markdown: cleanMarkdown,
      summary: dto.summary,
      tags: dto.tags,
      seoTitle: dto.seoTitle,
      seoDescription: dto.seoDescription,
      coverImage: dto.coverImage,
    };

    await db.insert(schema.articleVersions).values({
      articleId,
      version: 1,
      title: dto.title,
      content: payload,
      authorId: dto.authorId,
      createdAt: now,
    });

    return {
      id: articleId,
      slug: dto.slug,
      locale,
      status,
      currentVersion: 1,
      title: dto.title,
      content: payload,
      authorId: dto.authorId,
      publishedAt: status === 'published' ? now.toISOString() : null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  /**
   * ADM-13: Cập nhật bài viết và tạo phiên bản mới (version increment).
   */
  async updateArticle(id: string, dto: UpdateArticleDto): Promise<ArticleDto> {
    const db = this.dbClient.db;
    const existing = (await db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.id, id))
      .limit(1)) as Array<{
      id: string;
      slug: string;
      locale: string;
      status: string;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;

    const article = existing[0];
    if (!article) {
      throw new NotFoundException(`Không tìm thấy bài viết với id: ${id}`);
    }

    const versions = (await db
      .select()
      .from(schema.articleVersions)
      .where(eq(schema.articleVersions.articleId, id))
      .orderBy(desc(schema.articleVersions.version))
      .limit(1)) as Array<{
      articleId: string;
      version: number;
      title: string;
      content: unknown;
      authorId: string;
      createdAt: Date;
    }>;

    const latestVer = versions[0];
    const nextVersion = (latestVer?.version ?? 0) + 1;
    const now = new Date();

    const prevContent =
      latestVer?.content && typeof latestVer.content === 'object'
        ? (latestVer.content as Record<string, unknown>)
        : {};

    const cleanMarkdown = dto.markdown
      ? MarkdownSanitizer.sanitize(dto.markdown)
      : typeof prevContent['markdown'] === 'string'
        ? prevContent['markdown']
        : '';

    const newPayload = {
      markdown: cleanMarkdown,
      summary: dto.summary ?? (prevContent['summary'] as string | undefined),
      tags: dto.tags ?? (prevContent['tags'] as string[] | undefined),
      seoTitle: dto.seoTitle ?? (prevContent['seoTitle'] as string | undefined),
      seoDescription: dto.seoDescription ?? (prevContent['seoDescription'] as string | undefined),
      coverImage: dto.coverImage ?? (prevContent['coverImage'] as string | undefined),
    };

    const newTitle = dto.title ?? latestVer?.title ?? 'Tiêu đề bài viết';

    await db.insert(schema.articleVersions).values({
      articleId: id,
      version: nextVersion,
      title: newTitle,
      content: newPayload,
      authorId: dto.authorId,
      createdAt: now,
    });

    const newStatus = (dto.status ?? article.status) as 'draft' | 'review' | 'published' | 'archived';
    const publishedAt =
      newStatus === 'published' && !article.publishedAt ? now : article.publishedAt;

    await db
      .update(schema.articles)
      .set({
        status: newStatus,
        publishedAt,
        updatedAt: now,
      })
      .where(eq(schema.articles.id, id));

    return {
      id,
      slug: article.slug,
      locale: article.locale,
      status: newStatus,
      currentVersion: nextVersion,
      title: newTitle,
      content: newPayload,
      authorId: dto.authorId,
      publishedAt: publishedAt ? publishedAt.toISOString() : null,
      createdAt: article.createdAt.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  /**
   * ADM-13: Lấy danh sách bài viết quản trị.
   */
  async listArticles(locale?: string): Promise<ArticleDto[]> {
    const db = this.dbClient.db;
    const rows = (await db.select().from(schema.articles)) as Array<{
      id: string;
      slug: string;
      locale: string;
      status: string;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;

    const filtered = locale ? rows.filter((r) => r.locale === locale) : rows;
    const results: ArticleDto[] = [];

    for (const art of filtered) {
      const vers = (await db
        .select()
        .from(schema.articleVersions)
        .where(eq(schema.articleVersions.articleId, art.id))
        .orderBy(desc(schema.articleVersions.version))
        .limit(1)) as Array<{
        articleId: string;
        version: number;
        title: string;
        content: unknown;
        authorId: string;
        createdAt: Date;
      }>;

      const latest = vers[0];
      const content =
        latest?.content && typeof latest.content === 'object'
          ? (latest.content as Record<string, unknown>)
          : {};

      results.push({
        id: art.id,
        slug: art.slug,
        locale: art.locale,
        status: art.status as ArticleDto['status'],
        currentVersion: latest?.version ?? 1,
        title: latest?.title ?? 'Không có tiêu đề',
        content: {
          markdown: typeof content['markdown'] === 'string' ? content['markdown'] : '',
          summary: typeof content['summary'] === 'string' ? content['summary'] : undefined,
          tags: Array.isArray(content['tags']) ? (content['tags'] as string[]) : undefined,
          seoTitle: typeof content['seoTitle'] === 'string' ? content['seoTitle'] : undefined,
          seoDescription:
            typeof content['seoDescription'] === 'string' ? content['seoDescription'] : undefined,
          coverImage: typeof content['coverImage'] === 'string' ? content['coverImage'] : undefined,
        },
        authorId: latest?.authorId ?? 'system',
        publishedAt: art.publishedAt ? art.publishedAt.toISOString() : null,
        createdAt: art.createdAt.toISOString(),
        updatedAt: art.updatedAt.toISOString(),
      });
    }

    return results;
  }

  /**
   * Lấy bài viết theo slug (cho người học & khách vãng lai).
   */
  async getArticleBySlug(slug: string, locale = 'vi'): Promise<ArticleDto> {
    const db = this.dbClient.db;
    const rows = (await db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.slug, slug))
      .limit(1)) as Array<{
      id: string;
      slug: string;
      locale: string;
      status: string;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;

    const article = rows[0];
    if (!article) {
      throw new NotFoundException(`Không tìm thấy bài viết với slug: ${slug}`);
    }

    const vers = (await db
      .select()
      .from(schema.articleVersions)
      .where(eq(schema.articleVersions.articleId, article.id))
      .orderBy(desc(schema.articleVersions.version))
      .limit(1)) as Array<{
      articleId: string;
      version: number;
      title: string;
      content: unknown;
      authorId: string;
      createdAt: Date;
    }>;

    const latest = vers[0];
    const content =
      latest?.content && typeof latest.content === 'object'
        ? (latest.content as Record<string, unknown>)
        : {};

    return {
      id: article.id,
      slug: article.slug,
      locale: article.locale,
      status: article.status as ArticleDto['status'],
      currentVersion: latest?.version ?? 1,
      title: latest?.title ?? 'Không có tiêu đề',
      content: {
        markdown: typeof content['markdown'] === 'string' ? content['markdown'] : '',
        summary: typeof content['summary'] === 'string' ? content['summary'] : undefined,
        tags: Array.isArray(content['tags']) ? (content['tags'] as string[]) : undefined,
        seoTitle: typeof content['seoTitle'] === 'string' ? content['seoTitle'] : undefined,
        seoDescription:
          typeof content['seoDescription'] === 'string' ? content['seoDescription'] : undefined,
        coverImage: typeof content['coverImage'] === 'string' ? content['coverImage'] : undefined,
      },
      authorId: latest?.authorId ?? 'system',
      publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
    };
  }

  /**
   * Tạo hoặc cập nhật Landing Page.
   */
  async upsertLandingPage(dto: CreateLandingPageDto): Promise<LandingPageDto> {
    const db = this.dbClient.db;
    const now = new Date();
    const locale = dto.locale ?? 'vi';

    const existing = (await db
      .select()
      .from(schema.landingPages)
      .where(eq(schema.landingPages.slug, dto.slug))
      .limit(1)) as Array<{
      id: string;
      slug: string;
      locale: string;
      title: string;
      content: unknown;
      publishedVersion: number | null;
      updatedAt: Date;
    }>;

    if (existing.length > 0 && existing[0]) {
      const page = existing[0];
      const nextVer = (page.publishedVersion ?? 1) + 1;
      await db
        .update(schema.landingPages)
        .set({
          title: dto.title,
          content: dto.content,
          publishedVersion: nextVer,
          updatedAt: now,
        })
        .where(eq(schema.landingPages.id, page.id));

      return {
        id: page.id,
        slug: page.slug,
        locale: page.locale,
        title: dto.title,
        content: dto.content,
        publishedVersion: nextVer,
        updatedAt: now.toISOString(),
      };
    }

    const id = generateUuidV7();
    await db.insert(schema.landingPages).values({
      id,
      slug: dto.slug,
      locale,
      title: dto.title,
      content: dto.content,
      publishedVersion: 1,
      updatedAt: now,
    });

    return {
      id,
      slug: dto.slug,
      locale,
      title: dto.title,
      content: dto.content,
      publishedVersion: 1,
      updatedAt: now.toISOString(),
    };
  }

  /**
   * Lấy Landing Page theo slug.
   */
  async getLandingPageBySlug(slug: string): Promise<LandingPageDto> {
    const db = this.dbClient.db;
    const rows = (await db
      .select()
      .from(schema.landingPages)
      .where(eq(schema.landingPages.slug, slug))
      .limit(1)) as Array<{
      id: string;
      slug: string;
      locale: string;
      title: string;
      content: unknown;
      publishedVersion: number | null;
      updatedAt: Date;
    }>;

    const page = rows[0];
    if (!page) {
      throw new NotFoundException(`Không tìm thấy Landing Page với slug: ${slug}`);
    }

    return {
      id: page.id,
      slug: page.slug,
      locale: page.locale,
      title: page.title,
      content: page.content as LandingPageDto['content'],
      publishedVersion: page.publishedVersion,
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  /**
   * Quản lý FAQ: Tạo câu hỏi thường gặp.
   */
  async createFaqItem(dto: CreateFaqItemDto): Promise<FaqItemDto> {
    const db = this.dbClient.db;
    const id = generateUuidV7();
    const cleanAnswer = MarkdownSanitizer.sanitize(dto.answer);
    const orderIndex = dto.orderIndex ?? 0;
    const locale = dto.locale ?? 'vi';

    await db.insert(schema.faqItems).values({
      id,
      category: dto.category,
      question: dto.question,
      answer: cleanAnswer,
      orderIndex,
      locale,
    });

    return {
      id,
      category: dto.category,
      question: dto.question,
      answer: cleanAnswer,
      orderIndex,
      locale,
    };
  }

  /**
   * Lấy danh sách câu hỏi thường gặp theo chuyên mục và locale.
   */
  async listFaqItems(category?: string, locale = 'vi'): Promise<FaqItemDto[]> {
    const db = this.dbClient.db;
    const rows = (await db.select().from(schema.faqItems)) as Array<{
      id: string;
      category: string;
      question: string;
      answer: string;
      orderIndex: number;
      locale: string;
    }>;

    return rows
      .filter((r) => r.locale === locale && (!category || r.category === category))
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((r) => ({
        id: r.id,
        category: r.category,
        question: r.question,
        answer: r.answer,
        orderIndex: r.orderIndex,
        locale: r.locale,
      }));
  }

  /**
   * Khởi tạo và gieo mầm dữ liệu CMS chuẩn SEO:
   * - SEO-05: Blog hướng dẫn thi JLPT N1-N5 (huong-dan-thi-jlpt-toan-dien)
   * - SEO-09: Trang giới thiệu gói thành viên (pricing-plans)
   * - SEO-12: Trang đích chiến dịch ôn thi 60 ngày bứt phá (on-thi-60-ngay)
   */
  async ensureSeededContent(adminUserId: string): Promise<void> {
    const db = this.dbClient.db;

    // 1. SEO-05: Blog hướng dẫn thi JLPT
    const existingArticle = (await db
      .select({ id: schema.articles.id })
      .from(schema.articles)
      .where(eq(schema.articles.slug, 'huong-dan-thi-jlpt-toan-dien'))
      .limit(1)) as Array<{ id: string }>;

    if (existingArticle.length === 0) {
      const guideMarkdown = `# Hướng Dẫn Toàn Diện Về Kỳ Thi JLPT N1 - N5

Kỳ thi Năng lực Tiếng Nhật (**JLPT - Japanese Language Proficiency Test**) là kỳ thi tiêu chuẩn quốc tế uy tín nhất đánh giá năng lực ngôn ngữ của người học tiếng Nhật trên toàn cầu.

## 1. Cấu Trúc Các Cấp Độ (N1 đến N5)

| Cấp Độ | Mức Độ | Trọng Tâm Kiến Thức | Thời Gian Làm Bài |
| :--- | :--- | :--- | :--- |
| **N5** | Sơ cấp 1 | 800 từ vựng, 100 chữ Kanji cơ bản | 105 phút |
| **N4** | Sơ cấp 2 | 1,500 từ vựng, 300 chữ Kanji, hội thoại hàng ngày | 115 phút |
| **N3** | Trung cấp | 3,750 từ vựng, 650 chữ Kanji, tin tức thường nhật | 140 phút |
| **N2** | Trung - Cao cấp | 6,000 từ vựng, 1,000 chữ Kanji, báo chí kinh tế | 155 phút |
| **N1** | Cao cấp | 10,000 từ vựng, 2,000 chữ Kanji, bài luận học thuật | 170 phút |

## 2. Quy Định Điểm Đỗ và Điểm Liệt

Mỗi bài thi JLPT có thang điểm tối đa là **180 điểm**, chia làm 3 phần kiến thức chính:
- **Kiến thức ngôn ngữ** (Chữ Hán, Từ vựng, Ngữ pháp): Tối đa 60 điểm (Điểm liệt: dưới 19 điểm).
- **Đọc hiểu**: Tối đa 60 điểm (Điểm liệt: dưới 19 điểm).
- **Nghe hiểu**: Tối đa 60 điểm (Điểm liệt: dưới 19 điểm).

> [!IMPORTANT]
> Thí sinh chỉ đỗ khi vừa đạt tổng điểm chuẩn vừa **không bị điểm liệt ở bất kỳ phần thi nào**.

## 3. Lời Khuyên và Chiến Lược Làm Bài Thực Chiến

1. **Phân bổ thời gian khoa học**: Không dành quá 1.5 phút cho một câu hỏi từ vựng/ngữ pháp ngắn.
2. **Kỹ năng làm bài Nghe**: Đọc trước đáp án và câu hỏi trong thời gian nghỉ giữa các mondai.
3. **Thực hành trên đề thi chuẩn**: Luyện tập với hệ thống thi mô phỏng để quen với áp lực thời gian thực tế.
`;

      await this.createArticle({
        slug: 'huong-dan-thi-jlpt-toan-dien',
        locale: 'vi',
        title: 'Hướng dẫn thi JLPT N1-N5 toàn diện: Cấu trúc đề thi, thang điểm và chiến lược',
        markdown: guideMarkdown,
        summary:
          'Cẩm nang chi tiết nhất về kỳ thi năng lực tiếng Nhật JLPT: cấu trúc từng cấp độ, cách tính điểm liệt và lộ trình ôn luyện đạt điểm cao.',
        tags: ['JLPT', 'Kỳ thi JLPT', 'N1', 'N2', 'N3', 'N4', 'N5', 'Kinh nghiệm thi'],
        seoTitle: 'Hướng dẫn thi JLPT N1-N5 toàn diện: Cấu trúc đề thi và chiến lược',
        seoDescription:
          'Tổng hợp chi tiết cấu trúc đề thi JLPT N1, N2, N3, N4, N5, thang điểm đỗ, điểm liệt và kinh nghiệm ôn luyện hiệu quả.',
        authorId: adminUserId,
        status: 'published',
      });
    }

    // 2. SEO-09: Trang giới thiệu gói thành viên (pricing-plans)
    await this.upsertLandingPage({
      slug: 'pricing-plans',
      locale: 'vi',
      title: 'Bảng giá và Gói dịch vụ JLPT Online',
      content: {
        hero: {
          title: 'Chọn Gói Học Tập Phù Hợp Cho Mục Tiêu JLPT Của Bạn',
          subtitle:
            'Trải nghiệm hệ thống thi thử mô phỏng 100% thời gian thực, ngân hàng đề chuẩn hóa và giải thích chi tiết từng câu hỏi.',
          ctaText: 'Đăng Ký Học Ngay',
          ctaLink: '/auth/register',
        },
        features: [
          {
            title: 'Ngân hàng đề chuẩn quốc tế',
            description: 'Toàn bộ đề thi chuẩn hóa từ N5 đến N1 được kiểm định chất lượng nghiêm ngặt.',
            icon: 'book-open',
          },
          {
            title: 'Mô phỏng phòng thi thật',
            description: 'Đồng hồ đếm ngược server-side, bảo mật đáp án tuyệt đối và chấm điểm tức thì.',
            icon: 'clock',
          },
          {
            title: 'Trợ lý AI giải thích thông minh',
            description: 'Phân tích vì sao chọn đúng/sai, dịch nghĩa ngữ cảnh và gợi ý từ vựng liên quan.',
            icon: 'sparkles',
          },
        ],
        plans: [
          {
            id: 'free',
            name: 'Gói Miễn Phí (Free)',
            price: 0,
            currency: 'VND',
            benefits: [
              '1 bài thi thử mỗi ngày',
              'Truy cập thư viện từ vựng cơ bản',
              'Xem điểm số tổng quan sau khi nộp bài',
            ],
            highlighted: false,
          },
          {
            id: 'premium_3m',
            name: 'Gói 3 Tháng Bứt Phá',
            price: 299000,
            currency: 'VND',
            benefits: [
              'Không giới hạn lượt làm đề thi thật và đề luyện tập',
              'Giải thích chi tiết 100% câu hỏi kèm bản dịch tiếng Việt',
              'Tính năng trộn đề thông minh theo điểm yếu cá nhân',
              'Báo cáo phân tích kỹ năng và dự đoán điểm thi chính xác',
            ],
            highlighted: true,
          },
          {
            id: 'premium_1y',
            name: 'Gói 1 Năm VIP',
            price: 799000,
            currency: 'VND',
            benefits: [
              'Toàn bộ quyền lợi của gói Premium',
              'Truy cập khoá học chuyên đề N1-N2 nâng cao',
              'Hỗ trợ hỏi đáp 1-1 với giáo viên JLPT người Nhật',
              'Cam kết hoàn tiền 100% nếu thi trượt',
            ],
            highlighted: false,
          },
        ],
        seoMeta: {
          title: 'Bảng giá gói thành viên JLPT Online: Học thử miễn phí, nâng cấp linh hoạt',
          description:
            'Xem bảng giá chi tiết các gói ôn thi JLPT N1-N5 chất lượng cao, ưu đãi giảm giá đến 40% cho học viên mới.',
          keywords: ['bảng giá jlpt', 'gói học tiếng nhật', 'luyện thi jlpt online'],
        },
      },
    });

    // 3. SEO-12: Trang đích chiến dịch ôn thi 60 ngày (on-thi-60-ngay)
    await this.upsertLandingPage({
      slug: 'on-thi-60-ngay',
      locale: 'vi',
      title: 'Chiến Dịch 60 Ngày Bứt Phá JLPT - Về Đích Điểm Cao',
      content: {
        hero: {
          title: 'Chiến Dịch 60 Ngày Bứt Phá JLPT: Lộ Trình Vàng Chinh Phục Điểm Đỗ',
          subtitle:
            'Chương trình huấn luyện đặc biệt kết hợp phương pháp lặp lại ngắt quãng (SRS) và luyện đề thi thật mỗi ngày.',
          ctaText: 'Tham Gia Chiến Dịch Ngay',
          ctaLink: '/campaigns/60-days',
        },
        features: [
          {
            title: 'Lộ trình 4 giai đoạn rõ ràng',
            description: 'Giai đoạn 1: Nền tảng (1-15); Giai đoạn 2: Tăng tốc (16-35); Giai đoạn 3: Thực chiến (36-50); Giai đoạn 4: Về đích (51-60).',
          },
          {
            title: 'Ghi nhớ từ vựng với SRS Flashcards',
            description: 'Học thông minh 30 từ mới mỗi ngày, tự động nhắc ôn lại đúng thời điểm vàng trước khi quên.',
          },
          {
            title: 'Thử thách Streak & Bảng vàng vinh danh',
            description: 'Duy trì chuỗi ngày học liên tục, nhận huy hiệu động lực và quà tặng sách ôn thi độc quyền.',
          },
        ],
        faq: [
          {
            question: 'Chiến dịch 60 ngày dành cho cấp độ nào?',
            answer: 'Chương trình được thiết kế riêng biệt cho cả 5 cấp độ từ N5, N4, N3, N2 đến N1.',
          },
          {
            question: 'Mỗi ngày tôi cần dành bao nhiêu thời gian?',
            answer: 'Chỉ cần từ 45 đến 60 phút mỗi ngày vào khung giờ học tập thuận tiện nhất cho bạn.',
          },
        ],
        seoMeta: {
          title: 'Chiến dịch ôn thi JLPT 60 ngày bứt phá: Lộ trình tăng điểm thần tốc',
          description:
            'Tham gia chiến dịch 60 ngày ôn thi JLPT với lộ trình hàng ngày từ vựng, ngữ pháp, đọc hiểu và giải đề thi thật.',
          keywords: ['ôn thi jlpt 60 ngày', 'lộ trình jlpt', 'bứt phá điểm jlpt'],
        },
      },
    });
  }
}
