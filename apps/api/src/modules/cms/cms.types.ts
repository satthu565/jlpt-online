export type ArticleStatus = 'draft' | 'review' | 'published' | 'archived';

export interface ArticleContentPayload {
  markdown: string;
  summary?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  coverImage?: string;
}

export interface ArticleDto {
  id: string;
  slug: string;
  locale: string;
  status: ArticleStatus;
  currentVersion: number;
  title: string;
  content: ArticleContentPayload;
  authorId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleDto {
  slug: string;
  locale?: string;
  title: string;
  markdown: string;
  summary?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  coverImage?: string;
  authorId: string;
  status?: ArticleStatus;
}

export interface UpdateArticleDto {
  title?: string;
  markdown?: string;
  summary?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  coverImage?: string;
  status?: ArticleStatus;
  authorId: string;
}

export interface LandingPageContentPayload {
  hero: {
    title: string;
    subtitle: string;
    ctaText?: string;
    ctaLink?: string;
    bannerUrl?: string;
  };
  features?: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  plans?: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    benefits: string[];
    highlighted?: boolean;
  }>;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  seoMeta?: {
    title: string;
    description: string;
    keywords?: string[];
  };
}

export interface LandingPageDto {
  id: string;
  slug: string;
  locale: string;
  title: string;
  content: LandingPageContentPayload;
  publishedVersion: number | null;
  updatedAt: string;
}

export interface CreateLandingPageDto {
  slug: string;
  locale?: string;
  title: string;
  content: LandingPageContentPayload;
}

export interface FaqItemDto {
  id: string;
  category: string;
  question: string;
  answer: string;
  orderIndex: number;
  locale: string;
}

export interface CreateFaqItemDto {
  category: string;
  question: string;
  answer: string;
  orderIndex?: number;
  locale?: string;
}

export interface SiteContentVersionDto {
  id: string;
  pageKey: string;
  version: number;
  payload: Record<string, unknown>;
  publishedAt: string | null;
}
