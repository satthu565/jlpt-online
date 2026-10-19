import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminAuthProvider, type StaffUser } from '../lib/auth-context';
import JlptSchedulesPage from '../app/exams/schedules/page';
import ScoreConversionTablesPage, { resolveScoringSectionSkills } from '../app/exams/scoring/page';
import { AdminApiClient } from '../lib/api-client';

describe('P05: Quản trị lịch thi JLPT và bảng quy đổi điểm', () => {
  const adminUser: StaffUser = {
    id: 'usr_admin_p05',
    email: 'publisher@jlpt.local',
    name: 'Admin P05',
    role: 'admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const editorUser: StaffUser = {
    id: 'usr_editor_p05',
    email: 'editor@jlpt.local',
    name: 'Editor P05',
    role: 'editor',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const studentUser: StaffUser = {
    id: 'usr_student_p05',
    email: 'student@jlpt.local',
    name: 'Student P05',
    role: 'student' as unknown as StaffUser['role'],
    twoFactorEnabled: false,
    twoFactorStatus: 'setup_required',
  };

  const renderWithAuth = (ui: React.ReactElement, user: StaffUser = adminUser) => {
    return renderToStaticMarkup(
      <AdminAuthProvider initialUser={user} initialToken="mock-token-xyz">
        {ui}
      </AdminAuthProvider>,
    );
  };

  describe('JLPT Schedules Management Page (Quản lý lịch thi JLPT)', () => {
    it('hiển thị đầy đủ tiêu đề, mô tả và các bộ lọc trạng thái', () => {
      const html = renderWithAuth(<JlptSchedulesPage />);

      expect(html).toContain('Quản lý Lịch thi JLPT tại Việt Nam');
      expect(html).toContain('data-testid="filter-all"');
      expect(html).toContain('data-testid="filter-draft"');
      expect(html).toContain('data-testid="filter-published"');
      expect(html).toContain('data-testid="filter-archived"');
    });

    it('Admin thấy nút thêm kỳ thi mới và nút gửi nhắc nhở toàn hệ thống', () => {
      const html = renderWithAuth(<JlptSchedulesPage />, adminUser);

      expect(html).toContain('data-testid="btn-add-schedule"');
      expect(html).toContain('data-testid="btn-trigger-all-reminders"');
    });

    it('Editor xem được danh sách nhưng không thấy nút thêm kỳ thi quản trị', () => {
      const html = renderWithAuth(<JlptSchedulesPage />, editorUser);

      expect(html).toContain('Quản lý Lịch thi JLPT tại Việt Nam');
      expect(html).not.toContain('data-testid="btn-add-schedule"');
      expect(html).not.toContain('data-testid="btn-trigger-all-reminders"');
    });

    it('Học viên không có quyền truy cập trang lịch thi quản trị (403 Forbidden)', () => {
      const html = renderWithAuth(<JlptSchedulesPage />, studentUser);

      expect(html).toContain('Từ chối truy cập (403 Forbidden)');
      expect(html).toContain('data-testid="guard-non-staff"');
      expect(html).not.toContain('data-testid="page-title"');
    });
  });

  describe('Score Conversion Tables Page (Bảng quy đổi điểm chuẩn hóa JLPT)', () => {
    it('hiển thị tiêu đề, thông điệp bất biến dữ liệu lịch sử và các bộ lọc cấp độ N1–N5', () => {
      const html = renderWithAuth(<ScoreConversionTablesPage />);

      expect(html).toContain('Bảng quy đổi điểm chuẩn hóa JLPT');
      expect(html).toContain('data-testid="immutable-notice"');
      expect(html).toContain('Lưu ý bất biến');
      expect(html).toContain('data-testid="filter-level-n1"');
      expect(html).toContain('data-testid="filter-level-n5"');
    });

    it('Bảo toàn lịch sử: Cảnh báo bất biến ghi rõ kết quả bài thi cũ giữ nguyên phiên bản đã dùng', () => {
      const html = renderWithAuth(<ScoreConversionTablesPage />);

      expect(html).toContain('Điểm số của các lượt thi đã nộp trước đây sẽ giữ nguyên phiên bản quy đổi đã dùng');
    });

    it('Học viên không có quyền truy cập trang quản trị bảng quy đổi điểm', () => {
      const html = renderWithAuth(<ScoreConversionTablesPage />, studentUser);

      expect(html).toContain('Từ chối truy cập (403 Forbidden)');
      expect(html).toContain('data-testid="guard-non-staff"');
      expect(html).not.toContain('data-testid="page-title"');
    });

    it('Bảo toàn cấu trúc kỹ năng (skills) của từng section cho mọi cấp độ N1–N5', () => {
      // N1-N3: language section only has kanji, vocabulary, grammar (NOT reading)
      const n1LangSkills = resolveScoringSectionSkills('language', undefined, ['kanji', 'vocabulary', 'grammar']);
      expect(n1LangSkills).toEqual(['kanji', 'vocabulary', 'grammar']);
      expect(n1LangSkills).not.toContain('reading');

      // N1-N3: reading section only has reading
      const n1ReadingSkills = resolveScoringSectionSkills('reading', undefined, ['reading']);
      expect(n1ReadingSkills).toEqual(['reading']);
      expect(n1ReadingSkills).not.toContain('listening');

      // N1-N5: listening section only has listening
      const listeningSkills = resolveScoringSectionSkills('listening', undefined, ['listening']);
      expect(listeningSkills).toEqual(['listening']);

      // N4-N5: language_reading combines all 4 skills
      const n5LangReadingSkills = resolveScoringSectionSkills('language_reading', ['kanji', 'vocabulary', 'grammar', 'reading'], undefined);
      expect(n5LangReadingSkills).toEqual(['kanji', 'vocabulary', 'grammar', 'reading']);

      // Fallback heuristics when skills array is empty: does NOT blindly assign reading to language section
      expect(resolveScoringSectionSkills('language')).toEqual(['kanji', 'vocabulary', 'grammar']);
      expect(resolveScoringSectionSkills('reading')).toEqual(['reading']);
      expect(resolveScoringSectionSkills('listening')).toEqual(['listening']);
    });
  });

  describe('AdminApiClient: JLPT Schedules API endpoints and permissions', () => {
    let mockFetch: typeof fetch;

    beforeEach(() => {
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, items: [] }),
        text: async () => JSON.stringify({ success: true, items: [] }),
      });
    });

    it('Editor can list schedules but cannot call publish or delete', async () => {
      const client = new AdminApiClient({
        fetchFn: mockFetch,
        user: editorUser,
        token: 'editor-token',
      });

      // Allowed for editor
      const listRes = await client.listJlptSchedules();
      expect(listRes).toBeDefined();

      // Forbidden for editor (mutations require admin)
      await expect(client.publishJlptSchedule('sched-01')).rejects.toThrow();
      await expect(client.deleteJlptSchedule('sched-01')).rejects.toThrow();
      await expect(client.createJlptSchedule({})).rejects.toThrow();
    });

    it('Admin can call create, publish, unpublish, delete and remind schedules', async () => {
      const client = new AdminApiClient({
        fetchFn: mockFetch,
        user: adminUser,
        token: 'admin-token',
      });

      await client.createJlptSchedule({
        title: 'Kỳ thi JLPT Tháng 12/2026',
        examDate: '2026-12-06',
        registrationDeadline: '2026-09-15T23:59:59.000Z',
        officialUrl: 'https://jlpt.vn',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/jlpt-schedules'),
        expect.objectContaining({ method: 'POST' }),
      );

      await client.publishJlptSchedule('sched-dec2026');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/jlpt-schedules/sched-dec2026/publish'),
        expect.objectContaining({ method: 'POST' }),
      );

      await client.unpublishJlptSchedule('sched-dec2026');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/jlpt-schedules/sched-dec2026/unpublish'),
        expect.objectContaining({ method: 'POST' }),
      );

      await client.deleteJlptSchedule('sched-dec2026');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/jlpt-schedules/sched-dec2026'),
        expect.objectContaining({ method: 'DELETE' }),
      );

      await client.remindJlptRegistration('sched-dec2026');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/jlpt-schedules/sched-dec2026/remind-registration'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
