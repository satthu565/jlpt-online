import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getApiBaseUrl, stopApiServer, AUTH_TOKENS } from '../../fixtures/test-server.ts';

describe('Learning APIs Staging Integration (L05/VOC-01..18, Planner, Staging Integration)', () => {
  let baseUrl: string;
  let createdItemId: string;
  let secondItemId: string;

  beforeAll(async () => {
    baseUrl = await getApiBaseUrl();
  }, 60000);

  afterAll(() => {
    stopApiServer();
  });

  describe('1. Quản lý Sổ tay Cá nhân (Notebook Items CRUD & Tenant Isolation)', () => {
    it('tạo mới một mục từ vựng trong sổ tay với đầy đủ thông tin (POST /api/v1/me/notebook-items)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/notebook-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          term: '勉強',
          reading: 'べんきょう',
          meaning: 'Học tập',
          kind: 'vocab',
          jlptLevel: 'N5',
          tags: ['n5', 'verb', 'basic'],
          notes: 'Thường dùng với する',
        }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as { id: string; term: string; reading: string; meaning: string };
      expect(data.id).toBeDefined();
      expect(data.term).toBe('勉強');
      expect(data.reading).toBe('べんきょう');
      expect(data.meaning).toBe('Học tập');
      createdItemId = data.id;

      // Create a second item for multi-item features like Quiz
      const res2 = await fetch(`${baseUrl}/api/v1/me/notebook-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          term: '学校',
          reading: 'がっこう',
          meaning: 'Trường học',
          kind: 'vocab',
          jlptLevel: 'N5',
          tags: ['n5', 'noun', 'basic'],
        }),
      });
      expect(res2.status).toBe(201);
      const data2 = (await res2.json()) as { id: string };
      secondItemId = data2.id;
    });

    it('truy vấn danh sách từ vựng có bộ lọc tag và trạng thái (GET /api/v1/me/notebook-items)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/notebook-items?tag=basic`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { items: Array<{ id: string; term: string }>; total: number };
      expect(data.items.length).toBeGreaterThanOrEqual(1);
      const found = data.items.find((item) => item.id === createdItemId);
      expect(found).toBeDefined();
    });

    it('lấy chi tiết một mục trong sổ tay (GET /api/v1/me/notebook-items/:id)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/notebook-items/${createdItemId}`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { id: string; term: string; meaning: string };
      expect(data.id).toBe(createdItemId);
      expect(data.term).toBe('勉強');
      expect(data.meaning).toBe('Học tập');
    });

    it('cập nhật ghi chú và đánh dấu đã thành thạo (PATCH /api/v1/me/notebook-items/:id)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/notebook-items/${createdItemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          tags: ['n5', 'verb', 'mastered_tag'],
          mastered: true,
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { mastered: boolean; tags: string[] };
      expect(data.mastered).toBe(true);
      expect(data.tags).toContain('mastered_tag');
    });

    it('học viên khác không thể xem hoặc sửa sổ tay của học viên này (IDOR / Tenant Isolation)', async () => {
      // otherStudent tries to get createdItemId
      const resOther = await fetch(`${baseUrl}/api/v1/me/notebook-items/${createdItemId}`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
        },
      });
      // Should return 404 Not Found to prevent IDOR enumeration
      expect([403, 404]).toContain(resOther.status);

      // otherStudent tries to delete createdItemId
      const resDeleteOther = await fetch(`${baseUrl}/api/v1/me/notebook-items/${createdItemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
        },
      });
      expect([403, 404]).toContain(resDeleteOther.status);
    });
  });

  describe('2. Sinh Flashcard & Chu trình Ôn tập Lặp lại Ngắt quãng (SRS Review)', () => {
    let cardId: string;

    it('sinh thẻ flashcard tự động từ mục sổ tay (POST /api/v1/me/notebook-items/:id/cards)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/notebook-items/${createdItemId}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          template: 'term_to_meaning',
        }),
      });

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as { id: string; notebookItemId: string; front: unknown; back: unknown };
      cardId = data.id;
      expect(cardId).toBeDefined();
      expect(data.notebookItemId).toBe(createdItemId);
    });

    it('truy vấn danh sách thẻ đến hạn ôn tập (GET /api/v1/me/srs/due)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/srs/due?timezone=Asia/Ho_Chi_Minh&limit=50`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { items?: unknown[]; cards?: unknown[] };
      expect(Array.isArray(data.items || data.cards)).toBe(true);
    });

    it('nộp kết quả ôn tập flashcard với xếp hạng đánh giá (POST /api/v1/me/srs/reviews)', async () => {
      if (!cardId) return;

      const res = await fetch(`${baseUrl}/api/v1/me/srs/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          cardId,
          clientReviewId: '0192f000-0000-7000-8000-000000000099',
          rating: 3, // 'good'
          timezone: 'Asia/Ho_Chi_Minh',
        }),
      });

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as { nextDueAt?: string; intervalDays?: number };
      expect(data.nextDueAt).toBeDefined();
      expect(data.intervalDays).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Trắc nghiệm Sổ tay (Notebook Quiz) & Xuất dữ liệu CSV An toàn', () => {
    it('sinh bộ câu hỏi trắc nghiệm nhanh từ sổ tay (POST /api/v1/me/notebook-quizzes)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/notebook-quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          count: 2,
          kind: 'vocab',
        }),
      });

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as { questions?: unknown[]; totalQuestions?: number };
      expect(data.questions).toBeDefined();
      expect(Array.isArray(data.questions)).toBe(true);
    });

    it('xuất sổ tay ra CSV và trung hòa mã độc công thức (Formula Injection Neutralization) (POST /api/v1/me/notebook-exports)', async () => {
      // First, create an item containing formula injection payloads: =cmd|' /C calc'!A0
      await fetch(`${baseUrl}/api/v1/me/notebook-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          term: '=1+1',
          reading: '+formula',
          meaning: '-malicious_cmd',
          kind: 'vocab',
          jlptLevel: 'N5',
          notes: '@sum(A1:A10)',
        }),
      });

      const res = await fetch(`${baseUrl}/api/v1/me/notebook-exports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          kind: 'vocab',
        }),
      });

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as { data?: string; csv?: string };
      const csvText = data.data || data.csv || '';
      expect(csvText).toBeDefined();

      // Formula injection symbols (=, +, -, @) must be escaped/neutralized with a prepended single quote (')
      // or sanitized so that no raw executable formula begins a cell
      expect(csvText).not.toMatch(/^=[0-9]/m);
      expect(csvText).not.toMatch(/^@sum/m);
    });
  });

  describe('4. Phát âm TTS & Bản quyền Dữ liệu (License Verification)', () => {
    it('truy vấn thông tin bản quyền và nguồn dữ liệu phát âm TTS (GET /api/v1/tts/license)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/tts/license`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { license?: string; provider?: string };
      expect(data).toBeDefined();
    });

    it('tổng hợp âm thanh phát âm cho từ tiếng Nhật (POST /api/v1/tts)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          text: 'こんにちは',
          locale: 'ja-JP',
        }),
      });

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as { audioUrl?: string; audioBase64?: string; mimeType?: string };
      expect(data.audioUrl || data.audioBase64 || data.mimeType).toBeDefined();
    });
  });

  describe('5. Kế hoạch Học tập Cá nhân (Planner Integration)', () => {
    it('tạo kế hoạch học tập mới với mục tiêu JLPT N3 (POST /api/v1/me/study-plans)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/study-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          targetLevel: 'N3',
          targetDate: '2026-12-06',
          dailyMinutes: 45,
          focusSkills: ['vocabulary', 'grammar', 'reading'],
        }),
      });

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as { id?: string; targetLevel?: string };
      expect(data.id || data.targetLevel === 'N3').toBeTruthy();
    });

    it('lấy phiên học tập được lên lịch cho ngày hôm nay (GET /api/v1/me/study-sessions/today)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/study-sessions/today`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
      });

      expect([200, 204]).toContain(res.status);
      if (res.status === 200) {
        const data = (await res.json()) as { tasks?: unknown[]; sessions?: unknown[] };
        expect(data).toBeDefined();
      }
    });
  });

  describe('6. Dọn dẹp Dữ liệu Sau Kiểm thử (DELETE /api/v1/me/notebook-items/:id)', () => {
    it('xóa mục sổ tay đã tạo và xác nhận không còn tồn tại (HTTP 200/204)', async () => {
      const deleteRes = await fetch(`${baseUrl}/api/v1/me/notebook-items/${createdItemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
      });
      expect([200, 204]).toContain(deleteRes.status);

      // Verify item is gone
      const getRes = await fetch(`${baseUrl}/api/v1/me/notebook-items/${createdItemId}`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
      });
      expect(getRes.status).toBe(404);

      if (secondItemId) {
        await fetch(`${baseUrl}/api/v1/me/notebook-items/${secondItemId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
        });
      }
    });
  });
});
