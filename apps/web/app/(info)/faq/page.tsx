'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@jlpt/ui/components/card';
import { Input } from '@jlpt/ui/components/input';
import { Badge } from '@jlpt/ui/components/badge';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { Spinner } from '@jlpt/ui/components/spinner';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { ExamHero } from '../../../features/library';
import { useI18n } from '../../../lib/i18n';

interface FaqItem {
  id: string;
  category: 'account' | 'exams' | 'technical' | 'payment';
  categoryLabel: string;
  question: string;
  answer: string;
}

const DEFAULT_FAQ_LIST: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'exams',
    categoryLabel: 'Kỳ thi & Đề thi',
    question: 'Cấu trúc đề thi trên nền tảng JLPT Online có chuẩn như thi thật không?',
    answer: 'Có. Đề thi trên hệ thống được xây dựng và chuẩn hóa chính xác theo phân bổ thời gian, số lượng câu hỏi và cơ chế tính điểm của Hiệp hội Hỗ trợ Giáo dục Quốc tế Nhật Bản (JEES) và Quỹ Giao lưu Quốc tế Nhật Bản (Japan Foundation).',
  },
  {
    id: 'faq-2',
    category: 'exams',
    categoryLabel: 'Kỳ thi & Đề thi',
    question: 'Tôi có thể làm thử bài thi mà không cần đăng ký tài khoản không?',
    answer: 'Có. Nền tảng cho phép làm thử miễn phí (Guest Trial) với các đề mẫu chuẩn từ N5 đến N1 để bạn làm quen với giao diện phòng thi trước khi quyết định tạo tài khoản.',
  },
  {
    id: 'faq-3',
    category: 'technical',
    categoryLabel: 'Kỹ thuật & Phòng thi',
    question: 'Khi gặp sự cố mất kết nối mạng trong lúc thi, bài thi của tôi có bị mất không?',
    answer: 'Không. Hệ thống phòng thi tích hợp công nghệ đồng bộ liên tục (Continuous Sync) và lưu trữ cục bộ (Offline Local Storage). Khi kết nối mạng phục hồi, câu trả lời của bạn sẽ tự động gửi lên máy chủ mà không làm gián đoạn thời gian làm bài.',
  },
  {
    id: 'faq-4',
    category: 'technical',
    categoryLabel: 'Kỹ thuật & Phòng thi',
    question: 'Làm thế nào để nghe lại audio phần thi nghe hiểu?',
    answer: 'Trong chế độ thi thật (Real Exam), audio sẽ phát tự động một lần theo đúng quy chế thi quốc tế. Trong chế độ luyện tập (Practice Mode), bạn có thể tua lại, tạm dừng và theo dõi transcript cùng dẫn chứng câu hỏi.',
  },
  {
    id: 'faq-5',
    category: 'payment',
    categoryLabel: 'Thanh toán & Gói thành viên',
    question: 'Chính sách hoàn tiền của JLPT Online như thế nào?',
    answer: 'Học viên có quyền yêu cầu hoàn tiền trong vòng 7 ngày kể từ thời điểm đăng ký gói thành viên nếu chưa làm quá 2 bài thi chính thức. Yêu cầu được xử lý trong vòng 3-5 ngày làm việc theo đúng cam kết minh bạch tài chính.',
  },
  {
    id: 'faq-6',
    category: 'account',
    categoryLabel: 'Tài khoản & Bảo mật',
    question: 'Tôi có thể đăng nhập trên nhiều thiết bị cùng lúc không?',
    answer: 'Để đảm bảo tính công bằng và bảo mật tài khoản, mỗi tài khoản được giới hạn số phiên đăng nhập đồng thời. Bạn có thể quản lý và đăng xuất các phiên đăng nhập lạ trong mục Cài đặt tài khoản.',
  },
];

export default function FaqPage(): React.JSX.Element {
  const { t, locale } = useI18n();
  const [faqs, setFaqs] = useState<FaqItem[]>(DEFAULT_FAQ_LIST);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openIds, setOpenIds] = useState<string[]>(['faq-1']);

  useEffect(() => {
    let active = true;
    const fetchFaqs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/cms/faqs?locale=${encodeURIComponent(locale || 'vi')}`);
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data) && data.length > 0) {
            const mapped: FaqItem[] = data.map((item: Record<string, unknown>) => {
              const cat = String(item['category'] || 'exams');
              let categoryLabel = 'Kỳ thi & Đề thi';
              let normCat: FaqItem['category'] = 'exams';
              if (cat.includes('tech') || cat.includes('phong-thi')) {
                categoryLabel = 'Kỹ thuật & Phòng thi';
                normCat = 'technical';
              } else if (cat.includes('pay') || cat.includes('thanh-toan')) {
                categoryLabel = 'Thanh toán & Gói cước';
                normCat = 'payment';
              } else if (cat.includes('acc') || cat.includes('tai-khoan')) {
                categoryLabel = 'Tài khoản & Bảo mật';
                normCat = 'account';
              }
              return {
                id: String(item['id'] || `faq-${item['orderIndex'] || Math.random()}`),
                category: normCat,
                categoryLabel,
                question: String(item['question'] || ''),
                answer: String(item['answer'] || ''),
              };
            });
            setFaqs(mapped);
          }
        }
      } catch {
        // Fall back to pre-rendered default FAQs
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchFaqs();
    return () => {
      active = false;
    };
  }, [locale]);

  const categories = [
    { id: 'all', label: 'Tất cả chủ đề' },
    { id: 'exams', label: 'Kỳ thi & Đề thi' },
    { id: 'technical', label: 'Kỹ thuật & Phòng thi' },
    { id: 'payment', label: 'Thanh toán & Gói cước' },
    { id: 'account', label: 'Tài khoản' },
  ];

  const filteredFaqs = useMemo(() => {
    return faqs.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchQ = item.question.toLowerCase().includes(q);
        const matchA = item.answer.toLowerCase().includes(q);
        if (!matchQ && !matchA) return false;
      }
      return true;
    });
  }, [faqs, searchQuery, selectedCategory]);

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Schema.org FAQPage Structured Data (SEO-07)
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://jlpt.vn' },
      { '@type': 'ListItem', position: 2, name: 'Hỏi đáp (FAQ)', item: 'https://jlpt.vn/faq' },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60" data-testid="faq-page">
      <JsonLd id="faq-page-schema" data={faqStructuredData} />
      <JsonLd id="faq-breadcrumbs-schema" data={breadcrumbStructuredData} />

      <ExamHero
        title={t('seo.faq.title')}
        subtitle={t('seo.faq.subtitle')}
        minimal
        background="gradient"
      />

      <div className="container py-8 space-y-6">
        {/* Breadcrumbs */}
        <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
          <a href="/" className="text-slate-500 no-underline hover:underline">Trang chủ</a> &gt;{' '}
          <span className="text-slate-900 dark:text-slate-100 font-semibold">Câu hỏi thường gặp</span>
        </nav>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="max-w-xl mx-auto">
          <Input
            id="faq-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('seo.faq.searchPlaceholder')}
            data-testid="faq-search-input"
          />
        </div>

        <div className="flex gap-2 justify-center flex-wrap" data-testid="faq-category-filters">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              type="button"
              variant={selectedCategory === cat.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-6">
          <Spinner size="md" aria-label="Đang tải dữ liệu câu hỏi..." />
        </div>
      )}

      {error && (
        <Alert variant="error" className="text-xs">
          {error}
        </Alert>
      )}

      {/* FAQ Accordion List */}
      <div className="space-y-3" data-testid="faq-accordion-list">
        {filteredFaqs.map((faq) => {
          const isOpen = openIds.includes(faq.id);
          return (
            <Card
              key={faq.id}
              data-testid="faq-item"
              className="border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => toggleAccordion(faq.id)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 h-auto font-normal rounded-none whitespace-normal hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2.5">
                  <Badge variant="neutral" size="sm">
                    {faq.categoryLabel}
                  </Badge>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base">
                    {faq.question}
                  </span>
                </div>
                <span className="text-slate-400 text-sm font-bold">
                  {isOpen ? '▲' : '▼'}
                </span>
              </Button>

              {isOpen && (
                <div className="p-5 pt-0 text-sm leading-relaxed text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30">
                  {faq.answer}
                </div>
              )}
            </Card>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-12 text-center text-slate-500">
            {t('seo.faq.empty')}
          </div>
        )}
      </div>
    </div>
  </div>
);
}
