# Quyết định kỹ thuật I05: Chuyển đổi import exam-engine sang dynamic import trong PDF export button

- **Mã công việc:** `I05` (Assignment: `I05-10`)
- **Người thực hiện:** Worker `W3` (Giao diện học viên)
- **Nhánh làm việc:** `task/I05`
- **Base SHA:** `dd56415ee6abe4dc301bc6320ee3937e81dda4c8`
- **Ngày thực hiện:** 2026-10-17

---

## 1. Vấn đề phát hiện trong CI (Staging Verification & PITR Drill)

Trong bước build container image staging (`docker build -f infra/docker/web.Dockerfile .`), lệnh biên dịch Next.js:
```bash
RUN pnpm --filter @jlpt/schema build && pnpm --filter "./packages/*" build && pnpm --filter @jlpt/web build
```
bị fail ở cuối quá trình SSR analysis / tracing với lỗi:
```
#16 213.1     ./apps/web/features/results/components/review-view.tsx [Client Component SSR]
#16 213.1     ./apps/web/app/(results)/ket-qua/[id]/page.tsx [Client Component SSR]
#16 213.1     ./apps/web/app/(results)/ket-qua/[id]/page.tsx [Server Component]
#16 213.2 [ELIFECYCLE] Command failed with exit code 1.
```

### Nguyên nhân gốc rễ
1. `PdfScoreExportButton` trong `apps/web/features/results/components/pdf-score-export-button.tsx` thực hiện import tĩnh ở đầu tệp:
   ```typescript
   import { generateScoreReportPdf } from '@jlpt/exam-engine';
   ```
2. Component này được nhúng trực tiếp vào `ReviewView` (`apps/web/features/results/components/review-view.tsx`), và `ReviewView` được render bởi trang kết quả bài thi `/ket-qua/[id]` (`apps/web/app/(results)/ket-qua/[id]/page.tsx`).
3. Khi Next.js Turbopack thực hiện Server Component SSR analysis cho trang `/ket-qua/[id]`, gói `@jlpt/exam-engine` và toàn bộ các module phụ thuộc của nó (bao gồm các thư viện xử lý xuất file PDF, các hàm kiểm tra isolation, schema runtime, Node.js built-ins) bị kéo vào chuỗi SSR client component trace.
4. Trong môi trường Docker Alpine (musl), quá trình phân tích và trace toàn bộ cây dependency phức tạp này của client component trong lúc prerender/SSR dẫn đến lỗi biên dịch standalone build.

---

## 2. Giải pháp kỹ thuật

1. **Chuyển sang Dynamic Import theo nhu cầu (On-Demand / Lazy Import):**
   - Loại bỏ import tĩnh `generateScoreReportPdf` ở top-level của `PdfScoreExportButton`.
   - Chuyển việc import sang hàm xử lý sự kiện người dùng bấm tải PDF (`handleExportPdf`):
     ```typescript
     const { generateScoreReportPdf } = await import('@jlpt/exam-engine');
     const pdfRes = generateScoreReportPdf({ ... });
     ```
2. **Lợi ích:**
   - **Tách biệt hoàn toàn khỏi SSR bundle:** Khi render `/ket-qua/[id]` trên server hoặc client ban đầu, `@jlpt/exam-engine` không bị nạp vào chuỗi SSR hay chunk JavaScript ban đầu của trang.
   - **Tối ưu hóa hiệu năng & kích thước bundle:** Mã nguồn tạo PDF (vốn nặng và chứa logic xuất file) chỉ được tải về trình duyệt khi người dùng thực sự có nhu cầu bấm nút "Tải PDF".
   - **Bảo toàn đầy đủ tính năng & quy tắc bảo mật:** Mọi logic về đóng dấu watermark số (SHA-256), multi-tenant isolation guard (`assertScoreReportIsolation`), chữ tiếng Nhật chuẩn NFC và xuất file PDF tải về vẫn hoạt động chính xác 100%.

---

## 3. Kết quả xác minh

1. `pnpm --filter @jlpt/web build`: Biên dịch thành công 100%, không còn trace `review-view.tsx` và `ket-qua/[id]/page.tsx` trong SSR warning trace.
2. `pnpm test:web`: 16/16 test files passed, 232/232 tests passed (bao gồm cả performance, e2e unit, i18n, a11y, exam-ui).
3. `pnpm check:no-mock-ui`: Đạt 100%, không phát hiện bất kỳ vi phạm hay mock UI mới nào ngoài baseline đã kiểm soát.
4. Toàn bộ các cổng chung:
   - `pnpm install --frozen-lockfile`: ĐẠT.
   - `pnpm lint`: ĐẠT.
   - `pnpm typecheck`: ĐẠT.
   - `pnpm test`: ĐẠT (521/521 tests passed trong toàn bộ monorepo).
   - `pnpm build`: ĐẠT (12/12 packages/apps build thành công).
