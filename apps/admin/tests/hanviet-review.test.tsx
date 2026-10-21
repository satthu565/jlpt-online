import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminAuthProvider, type StaffUser } from '../lib/auth-context';
import HanVietReviewPage from '../app/lexicon/hanviet/page';
import HanVietAliasPage from '../app/hanviet/page';
import { apiClient } from '../lib/api-client';
import { loadLocaleMessages } from '../lib/i18n';

describe('Admin Han Viet Review Suite (H03)', () => {
  const adminUser: StaffUser = {
    id: 'usr_admin_01',
    email: 'admin@jlpt.local',
    name: 'Quản trị viên Hệ thống',
    role: 'admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const editorUser: StaffUser = {
    id: 'usr_editor_01',
    email: 'editor@jlpt.local',
    name: 'Biên tập viên',
    role: 'editor',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const reviewerUser: StaffUser = {
    id: 'usr_reviewer_01',
    email: 'reviewer@jlpt.local',
    name: 'Kiểm duyệt viên',
    role: 'reviewer',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const moderatorUser: StaffUser = {
    id: 'usr_mod_01',
    email: 'mod@jlpt.local',
    name: 'Điều hành viên',
    role: 'moderator',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const renderWithAuth = (
    ui: React.ReactElement,
    user: StaffUser | null = adminUser,
    locale: 'vi' | 'ja' | 'en' = 'vi',
  ) => {
    return renderToStaticMarkup(
      <AdminAuthProvider
        initialUser={user ?? undefined}
        initialToken={user ? 'mock-token' : undefined}
        initialLocale={locale}
        initialLoading={false}
      >
        {ui}
      </AdminAuthProvider>,
    );
  };

  describe('1. Role-based Access & Guard', () => {
    it('Admin can access /lexicon/hanviet and alias page', () => {
      const html1 = renderWithAuth(<HanVietReviewPage />, adminUser);
      expect(html1).toContain('data-testid="page-title"');
      expect(html1).toContain('Duyệt Hán Việt');

      const html2 = renderWithAuth(<HanVietAliasPage />, adminUser);
      expect(html2).toContain('data-testid="page-title"');
    });

    it('Editor can access /lexicon/hanviet', () => {
      const html = renderWithAuth(<HanVietReviewPage />, editorUser);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Duyệt Hán Việt');
      expect(html).toContain('data-testid="hanviet-search"');
      expect(html).toContain('data-testid="hanviet-confidence"');
    });

    it('Reviewer can access /lexicon/hanviet', () => {
      const html = renderWithAuth(<HanVietReviewPage />, reviewerUser);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Duyệt Hán Việt');
    });

    it('Moderator lacks required role and receives guard-forbidden', () => {
      const html = renderWithAuth(<HanVietReviewPage />, moderatorUser);
      expect(html).toContain('data-testid="guard-forbidden"');
      expect(html).not.toContain('data-testid="hanviet-table"');
    });

    it('Unauthenticated visitor is blocked and directed to login', () => {
      const html = renderWithAuth(<HanVietReviewPage />, null);
      expect(html).toContain('data-testid="guard-unauthenticated"');
      expect(html).toContain('/login');
    });
  });

  describe('2. Filter & Component Controls', () => {
    it('Renders search input, confidence select, search button, and pagination buttons', () => {
      const html = renderWithAuth(<HanVietReviewPage />, editorUser);
      expect(html).toContain('data-testid="hanviet-search"');
      expect(html).toContain('data-testid="hanviet-confidence"');
      expect(html).toContain('data-testid="hanviet-search-btn"');
      expect(html).toContain('data-testid="hanviet-prev"');
      expect(html).toContain('data-testid="hanviet-next"');

      // Default confidence filter options present
      expect(html).toContain('Cần xem lại');
      expect(html).toContain('Âm Kun');
      expect(html).toContain('Độ tin cậy cao');
    });
  });

  describe('3. Tri-locale i18n & No Raw Translation Keys', () => {
    it('Renders correctly in Vietnamese (vi)', () => {
      const html = renderWithAuth(<HanVietReviewPage />, editorUser, 'vi');
      expect(html).toContain('Duyệt Hán Việt');
      expect(html).not.toMatch(/hanvietReview\.[a-zA-Z]+/);
    });

    it('Renders correctly in Japanese (ja)', async () => {
      await loadLocaleMessages('ja');
      const html = renderWithAuth(<HanVietReviewPage />, editorUser, 'ja');
      expect(html).toContain('漢越音審査');
      expect(html).not.toMatch(/hanvietReview\.[a-zA-Z]+/);
    });

    it('Renders correctly in English (en)', async () => {
      await loadLocaleMessages('en');
      const html = renderWithAuth(<HanVietReviewPage />, editorUser, 'en');
      expect(html).toContain('Sino-Vietnamese Review');
      expect(html).not.toMatch(/hanvietReview\.[a-zA-Z]+/);
    });
  });

  describe('4. API Client Integration', () => {
    it('listHanVietReview delegates to apiClient.request with role and query parameters', async () => {
      const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce({
        total: 1,
        page: 1,
        pageSize: 50,
        items: [
          {
            id: 'entry-01',
            term: '要約',
            reading: 'ようやく',
            meaning: 'summary',
            hanViet: 'YẾU ƯỚC',
            confidence: 'high',
            source: 'manual',
            perKanji: [
              { kanji: '要', onyomi: 'ヨウ', hanViet: 'YẾU' },
              { kanji: '約', onyomi: 'ヤク', hanViet: 'ƯỚC' },
            ],
            reportCount: 0,
            updatedAt: null,
          },
        ],
      });

      const res = await apiClient.listHanVietReview({ confidence: 'review', q: '要約', page: 1 });
      expect(requestSpy).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/api/v1/admin/lexicon/hanviet?confidence=review&q=%E8%A6%81%E7%B4%84'),
        expect.objectContaining({ requiredRoles: ['admin', 'editor', 'reviewer'] }),
      );
      expect(res.items).toHaveLength(1);
      expect(res.items[0]?.hanViet).toBe('YẾU ƯỚC');

      requestSpy.mockRestore();
    });

    it('updateHanVietEntry delegates PATCH to /api/v1/admin/lexicon/:id/hanviet', async () => {
      const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce({
        id: 'entry-01',
        term: '要約',
        hanViet: 'YẾU ƯỚC',
        confidence: 'high',
        source: 'manual',
      });

      const res = await apiClient.updateHanVietEntry('entry-01', 'YẾU ƯỚC');
      expect(requestSpy).toHaveBeenCalledWith(
        'PATCH',
        '/api/v1/admin/lexicon/entry-01/hanviet',
        expect.objectContaining({
          requiredRoles: ['admin', 'editor', 'reviewer'],
          body: { hanViet: 'YẾU ƯỚC' },
        }),
      );
      expect(res.confidence).toBe('high');
      expect(res.source).toBe('manual');

      requestSpy.mockRestore();
    });
  });
});
