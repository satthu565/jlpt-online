'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';

export interface CmsArticle {
  id: string;
  slug: string;
  title: string;
  version: number;
  status: 'draft' | 'review' | 'published';
  author: string;
  locale: string;
  markdown: string;
  summary: string;
  tags: string[];
  publishedAt: string | null;
}

export default function CmsManagementPage(): React.JSX.Element {
  const { user } = useAdminAuth();

  const [articles, setArticles] = useState<CmsArticle[]>([
    {
      id: 'art-01',
      slug: 'huong-dan-thi-jlpt-toan-dien',
      title: 'Hướng dẫn thi JLPT N1-N5 toàn diện: Cấu trúc đề thi, thang điểm và chiến lược',
      version: 1,
      status: 'published',
      author: 'Admin JLPT',
      locale: 'vi',
      markdown: `# Hướng Dẫn Toàn Diện Về Kỳ Thi JLPT N1 - N5

Kỳ thi Năng lực Tiếng Nhật (JLPT) là kỳ thi quốc tế uy tín đánh giá năng lực ngôn ngữ.
- Cấu trúc đề thi N1-N5
- Thang điểm 180 và điều kiện điểm liệt
- Chiến lược phân bổ thời gian thực chiến`,
      summary: 'Cẩm nang chi tiết nhất về kỳ thi năng lực tiếng Nhật JLPT dành cho mọi cấp độ.',
      tags: ['JLPT', 'N1', 'N2', 'N3', 'Kinh nghiệm thi'],
      publishedAt: '2026-10-15 08:00',
    },
    {
      id: 'art-02',
      slug: 'chien-luoc-on-thi-60-ngay',
      title: 'Chiến lược ôn thi 60 ngày bứt phá điểm số JLPT',
      version: 2,
      status: 'published',
      author: 'Biên tập viên A',
      locale: 'vi',
      markdown: `# 60 Ngày Về Đích Điểm Cao
Áp dụng phương pháp lặp lại ngắt quãng (SRS) cho 1,500 từ vựng cốt lõi.`,
      summary: 'Lộ trình 4 giai đoạn chuẩn hóa giúp học viên tối ưu thời gian ôn thi.',
      tags: ['Lộ trình', 'SRS', 'Ôn thi 60 ngày'],
      publishedAt: '2026-10-14 10:30',
    },
  ]);

  const [activeTab, setActiveTab] = useState<'articles' | 'editor'>('articles');
  const [selectedArticle, setSelectedArticle] = useState<CmsArticle | null>(null);

  // Editor states
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSlug, setEditSlug] = useState<string>('');
  const [editSummary, setEditSummary] = useState<string>('');
  const [editTags, setEditTags] = useState<string>('');
  const [editMarkdown, setEditMarkdown] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'draft' | 'review' | 'published'>('draft');

  const handleEdit = (art: CmsArticle) => {
    setSelectedArticle(art);
    setEditTitle(art.title);
    setEditSlug(art.slug);
    setEditSummary(art.summary);
    setEditTags(art.tags.join(', '));
    setEditMarkdown(art.markdown);
    setEditStatus(art.status);
    setActiveTab('editor');
  };

  const handleCreateNew = () => {
    setSelectedArticle(null);
    setEditTitle('');
    setEditSlug('');
    setEditSummary('');
    setEditTags('');
    setEditMarkdown('# Tiêu đề bài viết mới\n\nNội dung Markdown an toàn...');
    setEditStatus('draft');
    setActiveTab('editor');
  };

  const handleSave = () => {
    if (!editTitle.trim() || !editSlug.trim()) return;

    // Simple sanitization for preview: strip script and iframe tags
    const cleanMarkdown = editMarkdown
      .replace(/<\s*\/?\s*(script|iframe|object|embed)[^>]*>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    const tagsArr = editTags.split(',').map((t) => t.trim()).filter(Boolean);

    if (selectedArticle) {
      setArticles((prev) =>
        prev.map((a) =>
          a.id === selectedArticle.id
            ? {
                ...a,
                title: editTitle,
                slug: editSlug,
                summary: editSummary,
                tags: tagsArr,
                markdown: cleanMarkdown,
                status: editStatus,
                version: a.version + 1,
              }
            : a,
        ),
      );
    } else {
      const newArt: CmsArticle = {
        id: `art-${Date.now().toString().slice(-4)}`,
        title: editTitle,
        slug: editSlug,
        summary: editSummary,
        tags: tagsArr,
        markdown: cleanMarkdown,
        status: editStatus,
        version: 1,
        author: user?.name || user?.email || 'Admin',
        locale: 'vi',
        publishedAt: editStatus === 'published' ? new Date().toISOString() : null,
      };
      setArticles([newArt, ...articles]);
    }

    setActiveTab('articles');
  };

  return (
    <AdminGuard pathname="/cms">
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#111827' }}>
              Quản trị Nội dung CMS & Bài viết (ADM-13)
            </h1>
            <p style={{ margin: 0, color: '#6b7280' }}>
              Soạn thảo bài viết blog chuẩn SEO, trang đích chiến dịch và quản lý phiên bản nội dung.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              data-testid="tab-articles"
              onClick={() => setActiveTab('articles')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: activeTab === 'articles' ? '#2563eb' : '#ffffff',
                color: activeTab === 'articles' ? '#ffffff' : '#374151',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Danh sách bài viết ({articles.length})
            </button>
            <button
              data-testid="btn-create-article"
              onClick={handleCreateNew}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Soạn Bài Viết Mới
            </button>
          </div>
        </header>

        {activeTab === 'articles' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {articles.map((art) => (
              <div
                key={art.id}
                data-testid={`cms-article-card-${art.id}`}
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '1.1rem', color: '#111827' }}>{art.title}</strong>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: art.status === 'published' ? '#d1fae5' : '#fef3c7',
                        color: art.status === 'published' ? '#065f46' : '#92400e',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {art.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>v{art.version}</span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem', color: '#4b5563', fontSize: '0.9rem' }}>{art.summary}</p>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    Slug: <code>/{art.slug}</code> | Tác giả: {art.author} | Thẻ: {art.tags.join(', ')}
                  </div>
                </div>

                <div>
                  <button
                    data-testid={`btn-edit-article-${art.id}`}
                    onClick={() => handleEdit(art)}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Chỉnh sửa & Xem trước
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'editor' && (
          <div
            data-testid="cms-editor-container"
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '1.5rem',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.25rem' }}>
              {selectedArticle ? `Chỉnh sửa bài viết: ${selectedArticle.title}` : 'Soạn bài viết mới'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Tiêu đề bài viết:</label>
                <input
                  data-testid="input-article-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Nhập tiêu đề hấp dẫn..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Slug (Đường dẫn tĩnh):</label>
                <input
                  data-testid="input-article-slug"
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  placeholder="vi-du-duong-dan-bai-viet"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Tóm tắt bài viết (Meta Description):</label>
                <input
                  type="text"
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Mô tả ngắn gọn hiển thị trên kết quả tìm kiếm..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Trạng thái:</label>
                <select
                  data-testid="select-article-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                >
                  <option value="draft">Bản nháp (Draft)</option>
                  <option value="review">Chờ duyệt (Review)</option>
                  <option value="published">Xuất bản (Published)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Thẻ từ khóa (cách nhau bằng dấu phẩy):</label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="JLPT, N3, Ngữ pháp, Ôn thi..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              />
            </div>

            {/* Split Screen Markdown Editor & Sanitized Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Nội dung Markdown:</label>
                <textarea
                  data-testid="textarea-markdown"
                  rows={14}
                  value={editMarkdown}
                  onChange={(e) => setEditMarkdown(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Xem trước (Đã làm sạch XSS):</label>
                <div
                  data-testid="markdown-preview"
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    padding: '0.75rem',
                    background: '#f9fafb',
                    height: '270px',
                    overflowY: 'auto',
                    fontSize: '0.9rem',
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {editMarkdown.replace(/<\s*\/?\s*(script|iframe|object|embed)[^>]*>/gi, '')}
                  </pre>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('articles')}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#ffffff', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                data-testid="btn-save-article"
                onClick={handleSave}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Lưu & Cập nhật Phiên bản
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
