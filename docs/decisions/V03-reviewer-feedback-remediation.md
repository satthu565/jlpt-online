# Quyết định kỹ thuật V03: Khắc phục các phát hiện review W4 (V03-4)

- **Worker:** W3 (Giao diện học viên)
- **Task ID:** V03
- **Assignment ID:** V03-4
- **Ngày:** 6
- **Trạng thái:** ACCEPTED
- **Tính năng liên quan:** SEO-01, SEO-02, SEO-03, SEO-04, SEO-06, SEO-07, SEO-08, SEO-10, SEO-11, SYS-02, SYS-17

---

## 1. Bối cảnh & Yêu cầu từ Reviewer W4

Trong lượt review trước, Reviewer W4 đã phát hiện 6 điểm P1 và 2 điểm P2 cần khắc phục:
1. `package.json:51`: Lệnh `pnpm test:performance` thất bại trên checkout sạch vì thiếu bước build đầy đủ monorepo dependencies và web trước khi chạy test.
2. `apps/web/tests/performance.test.tsx:208`: Test prerender manifest và chunk sizes bị bọc trong `if (fs.existsSync(...))` không có assertion bắt buộc, có nguy cơ bỏ qua kiểm thử âm thầm.
3. `apps/web/features/results/components/pdf-score-export-button.tsx:75`: Component tải phiếu điểm tạo Blob HTML đuôi `.html` thay vì xuất file PDF chuẩn `application/pdf` có watermark.
4. `apps/web/app/(info)/lien-he/page.tsx:54`: Khối catch tự ý gán `setSuccess(true)`, che giấu lỗi mạng/API và giả mạo thành công.
5. `apps/web/features/corpus/components/vocab-explorer.tsx:125`: Khi API lưu vào sổ tay bị lỗi, khối catch vẫn hiển thị thông báo đã thêm thành công.
6. `apps/web/features/gamification/components/gamification-dashboard.tsx:159`: Khối catch tự tăng `currentStreak` và đánh dấu `joined: true` khi API thất bại.
7. `apps/web/app/nav-shell.tsx:20`: Các mục điều hướng và footer bị hardcode tiếng Việt.
8. `apps/web/app/page.tsx:138`: Nút CTA `Khám phá {level}` bị hardcode tiếng Việt.

---

## 2. Giải pháp thực hiện chi tiết

### 2.1. Chuẩn hóa lệnh nghiệm thu `test:performance` và xóa bỏ weakened test
- Cập nhật script `test:performance` trong `package.json`:
  ```json
  "test:performance": "pnpm --filter @jlpt/schema build && pnpm --filter @jlpt/exam-engine build && pnpm --filter @jlpt/ui build && pnpm --filter @jlpt/web build && pnpm --filter @jlpt/web test:performance"
  ```
- Trong `apps/web/tests/performance.test.tsx`, thay thế các khối `if (fs.existsSync(...))` bằng các assertion bắt buộc:
  - `expect(fs.existsSync(prerenderManifestPath)).toBe(true);`
  - `expect(fs.existsSync(staticChunksDir)).toBe(true);`
  - `expect(files.length).toBeGreaterThan(0);`
  - Đảm bảo nếu `.next` chưa được build hoặc thiếu file manifest, test sẽ lập tức báo lỗi chính xác thay vì pass âm thầm.

### 2.2. Xuất phiếu điểm PDF chuẩn với @jlpt/exam-engine & Dấu bản quyền (SYS-17)
- Thay thế hoàn toàn mã tạo file `.html` trong `PdfScoreExportButton` bằng hàm `generateScoreReportPdf` từ `@jlpt/exam-engine`.
- Dữ liệu xuất phiếu điểm bao gồm thông tin thí sinh, điểm chuẩn, điểm các phân môn, trạng thái Đỗ/Chưa đạt, cùng chữ ký số băm SHA-256 và Watermark bản quyền.
- File tải về có MIME type chuẩn `application/pdf`, tên file định dạng `jlpt-score-report-<attemptId>.pdf`.
- Thêm unit test trong `performance.test.tsx` xác thực byte stream bắt đầu bằng `%PDF-1.4`, chứa nhãn `VERIFICATION HASH` và `checksumSha256`.

### 2.3. Loại bỏ hành vi giả mạo thành công khi API gặp lỗi
- **Form liên hệ (`lien-he/page.tsx`):**
  - Trong khối catch, gọi `setErrorMessage(t('seo.contact.errorNotice'))` và giữ nguyên `success: false`.
  - Hiển thị thông báo lỗi rõ ràng qua `<Alert variant="error">`.
- **Khám phá từ vựng (`vocab-explorer.tsx`) & Thống kê tần suất (`frequency-stats-view.tsx`):**
  - Thêm state `saveErrorNotice` và `studyListError`.
  - Khi lưu sổ tay thất bại, hiển thị thông báo lỗi `t('seo.corpus.saveFailed')`, không tự gán thông báo thành công.
- **Bảng tương tác gamification (`gamification-dashboard.tsx`):**
  - Thêm state `operationError`.
  - Khi API điểm danh, tham gia thử thách hoặc bật/tắt bảng xếp hạng thất bại: không tự tăng số ngày streak, không đổi trạng thái `joined`, và hiển thị lỗi qua `operationError`.

### 2.4. Bản địa hóa toàn diện (i18n) cho Navigation Shell và Trang chủ
- Bổ sung đầy đủ khóa dịch cho cả 3 ngôn ngữ (`vi.json`, `en.json`, `ja.json`):
  - `common.nav.vocabulary`: "Từ vựng" / "Vocabulary" / "語彙"
  - `common.nav.grammar`: "Ngữ pháp" / "Grammar" / "文法"
  - `common.footer.levels`: "Cấp độ N1–N5" / "Levels N1–N5" / "レベル N1–N5"
  - `common.footer.vocabAndGrammar`: "Từ vựng & Ngữ pháp" / "Vocabulary & Grammar" / "語彙・文法"
  - `common.footer.vocabStats`: "Thống kê từ vựng" / "Vocabulary Statistics" / "語彙統計"
  - `common.footer.technicalSupport`: "Hỗ trợ kỹ thuật" / "Technical Support" / "テクニカルサポート"
  - `home.exploreLevel`: "Khám phá {level}" / "Explore {level}" / "{level} を確認する"
  - Các khóa thông báo lỗi: `seo.watermark.exportError`, `seo.corpus.saveFailed`, `seo.gamification.checkInError`, `seo.gamification.joinChallengeError`, `seo.gamification.optInError`.
- Toàn bộ nội dung tiếng Nhật tuân thủ chuẩn Unicode NFC (`normalize('NFC')`).
