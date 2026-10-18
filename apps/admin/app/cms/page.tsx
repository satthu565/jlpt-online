'use client';

import React, { useState, useEffect } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api-client';
import { t } from '../../lib/i18n';

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

export interface CmsManagementProps {
  initialArticles?: CmsArticle[];
}

export default function CmsManagementPage({
  initialArticles = [],
}: CmsManagementProps = {}): React.JSX.Element {
  const { user, locale } = useAdminAuth();

  const [articles, setArticles] = useState<CmsArticle[]>(initialArticles);
  const [isLoading, setIsLoading] = useState<boolean>(initialArticles.length === 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'articles' | 'editor'>('articles');
  const [selectedArticle, setSelectedArticle] = useState<CmsArticle | null>(null);

  // Editor states
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSlug, setEditSlug] = useState<string>('');
  const [editSummary, setEditSummary] = useState<string>('');
  const [editTags, setEditTags] = useState<string>('');
  const [editMarkdown, setEditMarkdown] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'draft' | 'review' | 'published'>('draft');

  const fetchArticles = async () => {
    if (initialArticles.length > 0) {
      setArticles(initialArticles);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = (await apiClient.listArticles(locale)) as { items?: (Partial<CmsArticle> & Record<string, unknown>)[] } | (Partial<CmsArticle> & Record<string, unknown>)[];
      const items = Array.isArray(res) ? res : res?.items || [];
      if (Array.isArray(items)) {
        const mapped: CmsArticle[] = items.map((a: Partial<CmsArticle> & Record<string, unknown>) => ({
          id: String(a.id || ''),
          slug: String(a.slug || ''),
          title: String(a.title || ''),
          version: typeof a.version === 'number' ? a.version : 1,
          status: (a.status as CmsArticle['status']) || 'draft',
          author: String(a.author || 'Admin'),
          locale: (a.locale as 'vi' | 'ja' | 'en') || locale || 'vi',
          markdown: String(a.markdown || a.content || ''),
          summary: String(a.summary || ''),
          tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
          publishedAt: a.publishedAt ? String(a.publishedAt) : null,
        }));
        setArticles(mapped);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Không thể tải danh sách bài viết.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [locale]);

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

  const handleSave = async () => {
    if (!editTitle.trim() || !editSlug.trim()) return;

    // Simple sanitization for preview: strip script and iframe tags
    const cleanMarkdown = editMarkdown
      .replace(/<\s*\/?\s*(script|iframe|object|embed)[^>]*>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    const tagsArr = editTags.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      if (selectedArticle) {
        await apiClient.updateArticle(selectedArticle.id, {
          title: editTitle,
          slug: editSlug,
          summary: editSummary,
          tags: tagsArr,
          markdown: cleanMarkdown,
          status: editStatus,
        }).catch(() => null);

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
        const payload = {
          title: editTitle,
          slug: editSlug,
          summary: editSummary,
          tags: tagsArr,
          markdown: cleanMarkdown,
          status: editStatus,
          locale: locale || 'vi',
        };
        const created = (await apiClient.createArticle(payload).catch(() => null)) as { id?: string } | null;

        const newArt: CmsArticle = {
          id: created?.id || `art_${Date.now()}`,
          title: editTitle,
          slug: editSlug,
          summary: editSummary,
          tags: tagsArr,
          markdown: cleanMarkdown,
          status: editStatus,
          version: 1,
          author: user?.name || user?.email || 'Admin',
          locale: locale || 'vi',
          publishedAt: editStatus === 'published' ? new Date().toISOString() : null,
        };
        setArticles([newArt, ...articles]);
      }
      setActiveTab('articles');
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  };

  return (
    <AdminGuard pathname="/cms">
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('content.cms.title', locale)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('content.cms.subtitle', locale)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              data-testid="tab-articles"
              onClick={() => setActiveTab('articles')}
              className={`px-4 py-2 rounded-md text-xs font-semibold border transition-colors ${
                activeTab === 'articles'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('content.cms.listTab', locale)} ({articles.length})
            </button>
            <button
              type="button"
              data-testid="btn-create-article"
              onClick={handleCreateNew}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700 transition-colors shadow-xs"
            >
              {t('content.cms.newArticleBtn', locale)}
            </button>
          </div>
        </header>

        {isLoading && (
          <div
            data-testid="cms-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
          >
            {t('common.loading', locale)}
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="cms-error-alert"
            className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm"
          >
            <strong className="font-semibold">Lỗi: </strong>
            {errorMessage}
          </div>
        )}

        {activeTab === 'articles' && (
          <div>
            {!isLoading && articles.length === 0 ? (
              <div
                data-testid="cms-empty"
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400"
              >
                <p className="mb-4">{t('content.cms.empty', locale)}</p>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700"
                >
                  Tạo bài viết đầu tiên
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {articles.map((art) => (
                  <div
                    key={art.id}
                    data-testid={`cms-article-card-${art.id}`}
                    className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <strong className="text-base font-bold text-gray-900">{art.title}</strong>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            art.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {art.status === 'published' ? 'Đã xuất bản' : 'Bản thảo'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">v{art.version}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{art.summary || 'Không có mô tả tóm tắt.'}</p>
                      <div className="text-xs text-gray-400 flex flex-wrap gap-2 items-center">
                        <span>Đường dẫn: <code>/{art.slug}</code></span>
                        <span>•</span>
                        <span>Tác giả: {art.author}</span>
                        {art.tags.length > 0 && (
                          <>
                            <span>•</span>
                            <span>Thẻ: {art.tags.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <button
                        type="button"
                        data-testid={`btn-edit-article-${art.id}`}
                        onClick={() => handleEdit(art)}
                        className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs font-medium hover:bg-blue-100"
                      >
                        {t('content.cms.editBtn', locale)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
              {selectedArticle ? `Chỉnh sửa: ${selectedArticle.title}` : 'Soạn bài viết mới'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tiêu đề bài viết:
                </label>
                <input
                  data-testid="input-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Tiêu đề chuẩn SEO..."
                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Slug (Đường dẫn thân thiện):
                </label>
                <input
                  data-testid="input-slug"
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  placeholder="huong-dan-thi-jlpt-n1..."
                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tóm tắt ngắn (Meta Description):
              </label>
              <textarea
                data-testid="input-summary"
                rows={2}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Tóm tắt hiển thị trên công cụ tìm kiếm và thẻ chia sẻ..."
                className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Thẻ (Tags, phân cách bằng dấu phẩy):
                </label>
                <input
                  data-testid="input-tags"
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="JLPT, N1, Đề thi, Ngữ pháp"
                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Trạng thái xuất bản:
                </label>
                <select
                  data-testid="select-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as CmsArticle['status'])}
                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                >
                  <option value="draft">Bản thảo (Draft)</option>
                  <option value="review">Chờ duyệt (Review)</option>
                  <option value="published">Xuất bản công khai (Published)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nội dung Markdown:
                </label>
                <textarea
                  data-testid="textarea-markdown"
                  rows={12}
                  value={editMarkdown}
                  onChange={(e) => setEditMarkdown(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded font-mono text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Xem trước nội dung (XSS Sanitized):
                </label>
                <div
                  data-testid="markdown-preview"
                  className="w-full h-[250px] md:h-[268px] overflow-y-auto p-3 border border-gray-200 rounded bg-gray-50 text-xs text-gray-800 whitespace-pre-wrap font-sans"
                >
                  {editMarkdown
                    .replace(/<\s*\/?\s*(script|iframe|object|embed)[^>]*>/gi, '')
                    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('articles')}
                className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                data-testid="btn-save-article"
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700"
              >
                {t('content.cms.saveBtn', locale)}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
