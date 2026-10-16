# Quyết định kỹ thuật V03: Tự động biên dịch artifacts Next.js phục vụ kiểm tra Bundle Budgets & Prerender trên checkout sạch

- **Worker:** W3 (Giao diện học viên)
- **Task ID:** V03
- **Assignment ID:** V03-5
- **Ngày:** 6
- **Trạng thái:** ACCEPTED
- **Tính năng liên quan:** SEO-01, SEO-02, SEO-03, SEO-04, SEO-06, SEO-07, SEO-08, SEO-10, SEO-11, SYS-02, SYS-17

---

## 1. Bối cảnh & Nguyên nhân lỗi lượt trước

Trong quy trình cổng kiểm tra chung của Coordinator trên một bản checkout sạch hoàn toàn:
1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`

Lệnh `pnpm test` chạy trước lệnh `pnpm build`. Do cấu hình monorepo Turborepo:
```json
"test": {
  "dependsOn": ["^build"]
}
```
Lệnh `test` của `@jlpt/web` chỉ phụ thuộc vào `^build` (các packages nội bộ: `@jlpt/ui`, `@jlpt/schema`, `@jlpt/exam-engine`), mà không phụ thuộc vào chính `@jlpt/web#build`.

Do đó, khi `vitest run tests/` thực thi trong `pnpm test`, thư mục `apps/web/.next` chưa chứa `prerender-manifest.json` và `static/chunks` (chỉ có thể được sinh ra qua `next build`). Điều này dẫn tới 2 assertion kiểm tra bundle budget và static prerender routes trong `apps/web/tests/performance.test.tsx` bị `AssertionError: expected false to be true` do file chưa tồn tại trên đĩa.

## 2. Giải pháp kỹ thuật

Thay vì làm yếu test bằng cách bỏ qua assertion (`if (fs.existsSync)`), `tests/performance.test.tsx` áp dụng hook `beforeAll` tự động:
1. Kiểm tra sự tồn tại của `prerender-manifest.json` và thư mục `static/chunks`.
2. Nếu các artifact này chưa có (trường hợp chạy `pnpm test` trên checkout sạch trước khi có lệnh build toàn cục), hook sẽ chủ động gọi `execSync('pnpm run build')` để sinh toàn bộ artifact sản phẩm thật của Next.js (SSG pages, static manifest, JS chunks).
3. Đặt timeout 60 giây cho hook để đảm bảo quá trình biên dịch Turbopack (~4-7 giây) hoàn tất một cách an toàn và tin cậy.
4. Giữ nguyên toàn bộ các assertion kiểm tra nghiêm ngặt:
   - `expect(fs.existsSync(prerenderManifestPath)).toBe(true);`
   - Xác thực đầy đủ các static routes công khai: `/n1` đến `/n5`, `/n1/de-thi`, `/tu-vung`, `/ngu-phap`, `/thong-ke-tu-vung`, `/faq`, `/dieu-khoan`, `/chinh-sach`.
   - `expect(fs.existsSync(staticChunksDir)).toBe(true);`
   - Xác thực từng file JS chunk không vượt quá ngân sách bundle (< 350KB uncompressed / < 150KB gzip).

## 3. Kết quả nghiệm thu

1. Cả 5 cổng kiểm tra chung đều hoàn thành với exit code 0:
   - `pnpm install --frozen-lockfile` (exit 0)
   - `pnpm lint` (exit 0)
   - `pnpm typecheck` (exit 0)
   - `pnpm test` (exit 0 - 184/184 tests passed across 14 test files)
   - `pnpm build` (exit 0)
2. Cả 4 lệnh kiểm tra chuyên biệt của task V03 đều đạt 100%:
   - `pnpm test:e2e:web-all` (exit 0)
   - `pnpm test:seo` (exit 0)
   - `pnpm test:performance` (exit 0)
   - `pnpm test:i18n` (exit 0)
