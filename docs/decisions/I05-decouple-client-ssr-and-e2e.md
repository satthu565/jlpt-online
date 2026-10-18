# Quyết định kỹ thuật I05: Tách biệt triệt để SSR Client Component khỏi Engine/Schema CLI và Mở rộng Playwright E2E Staging

- **Mã công việc:** `I05` (Assignment: `I05-12`)
- **Người thực hiện:** Worker `W3` (Giao diện học viên)
- **Nhánh làm việc:** `task/I05`
- **Base SHA:** `dd56415ee6abe4dc301bc6320ee3937e81dda4c8`
- **Ngày thực hiện:** 2026-10-17

---

## 1. Bối cảnh và Thách thức kỹ thuật

### 1.1. Lỗi Docker Image Build trong CI Staging
Trong CI workflow `Staging Verification & PITR Drill`, bước `Build staging container images once` (`infra/docker/web.Dockerfile`) bị fail với mã lỗi exit code 1 khi chạy lệnh:
```bash
RUN pnpm --filter @jlpt/schema build && pnpm --filter "./packages/*" build && pnpm --filter @jlpt/web build
```

Quá trình truy vết (trace) Turbopack SSR analysis cho thấy:
1. Các client components trong `apps/web/features/exam/` (`audio-player.tsx`, `use-countdown-timer.ts`) đã import các hàm tiện ích (`computeClientRemainingMs`, `getListeningPlaybackPosition`) từ `@jlpt/exam-engine`.
2. Gói `@jlpt/exam-engine` phụ thuộc vào `@jlpt/schema`, mà `@jlpt/schema` có chứa các file CLI/script code sử dụng `path.resolve(process.cwd())` và các Node.js built-ins.
3. Khi Next.js / Turbopack phân tích tĩnh client components trong quá trình prerender/SSR standalone build, chuỗi trace đã kéo theo toàn bộ schema và script, dẫn đến memory explosion / failed build trong môi trường Docker container cô lập.
4. Tương tự, `apps/web/features/exam/index.ts` re-export toàn bộ mock/sample fixtures, và `apps/web/app/(account)/lich-su/page.tsx` import từ barrel re-export `@/features/results`, kéo theo nhiều dependency không cần thiết vào SSR bundle.

### 1.2. Yêu cầu Nghiệm thu I05 cho E2E Integration
Theo tiêu chí nghiệm thu của I05:
- Học viên đăng ký qua Mailpit, xác minh qua link/mã token trong hòm thư, làm trọn đề demo N5 đã xuất bản (`demo-n5-1`) và xem điểm trên staging CI.
- Khách làm thử được đề `guest_trial`, đề khác yêu cầu đăng nhập (401/AUTH_REQUIRED).
- E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm `page.route`, mock fetch hay dữ liệu giả ở tầng trình duyệt.
- Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ.
- E2E chụp màn hình mỗi trang trong phạm vi ở 390px (mobile) và 1366px (desktop), kiểm tra không cuộn ngang (`scrollWidth <= innerWidth`).
- Kiểm tra cả ba locale `vi`, `ja`, `en`, không hiển thị key dịch thô (như `account.profile.title`).

---

## 2. Giải pháp Kiến trúc và Triển khai

### 2.1. Tách biệt Pure Functions cho Client Exam Hooks
1. Tạo module tính toán thuần (pure utility) cho Client UI:
   - `apps/web/features/exam/utils/timing.ts`: Triển khai độc lập `computeClientRemainingMs`, `computeServerOffset`, và `toEpochMs`. Sử dụng kiểu dữ liệu nguyên thủy, không phụ thuộc vào `@jlpt/exam-engine` hay Node CLI modules.
   - `apps/web/features/exam/utils/listening.ts`: Triển khai độc lập `getListeningPlaybackPosition`.
2. Cập nhật `apps/web/features/exam/hooks/use-countdown-timer.ts` và `apps/web/features/exam/components/audio-player.tsx` để import trực tiếp từ các file utility nội bộ của `apps/web`.
3. Làm sạch barrel re-exports:
   - Trong `apps/web/features/exam/index.ts`: Bỏ re-export fixture samples `export * from './fixtures/exam-fixtures'`.
   - Trong `apps/web/app/(account)/lich-su/page.tsx`: Import cụ thể component `HistoryView` và types từ `features/results/components/history-view` và `features/results/types`, tránh đi qua barrel export.

### 2.2. Hoàn thiện Suite Playwright E2E Staging Thật (`tests/playwright/integration.spec.ts`)
Bổ sung test suite chi tiết `Real Staging User Journey & Exam Flow (I05)`:
1. **Luồng người dùng đầy đủ (Full Student Registration & Exam Lifecycle):**
   - Đăng ký tài khoản học viên mới với email động `@example.com` trên `/dang-ky`.
   - Gọi trực tiếp Mailpit API (`http://127.0.0.1:8025/api/v2/messages`) để đọc email kích hoạt và trích xuất token xác thực.
   - Gọi API verify email để kích hoạt tài khoản.
   - Đăng nhập qua `/dang-nhap` với credentials thật.
   - Vào phòng thi `/phong-thi?examId=demo-n5-1` của đề thi demo N5 đã xuất bản.
   - Kiểm tra load snapshot bài thi từ API thật.
   - Trả lời các câu hỏi trắc nghiệm trên UI (tương tác radio buttons thật).
   - Bấm nộp bài sớm, xác nhận modal confirm submission.
   - Tự động chuyển hướng đến `/ket-qua/[attemptId]`, xác minh báo cáo điểm và tỷ lệ đạt/trượt được hiển thị từ API thật.
2. **Khách làm thử đề guest_trial:**
   - Không đăng nhập, truy cập `/phong-thi?examId=demo-n5-1`.
   - Bắt đầu lượt thi khách thành công (API trả về `guestSessionToken`).
   - Ngược lại, khi khách cố gắng làm đề khác không hỗ trợ khách (hoặc không có token), hệ thống từ chối hoặc chuyển hướng đăng nhập.
3. **Bảo vệ quyền truy cập và chuyển hướng 401:**
   - Truy cập `/lich-su` khi chưa đăng nhập: giao diện hiển thị thông báo yêu cầu đăng nhập hoặc tự động chuyển hướng đến `/dang-nhap`.
4. **Kiểm tra Multi-Viewport, Không Cuộn Ngang, và i18n:**
   - Duyệt qua các trang `/de-thi`, `/phong-thi?examId=demo-n5-1`, `/lich-su`, `/tai-khoan`.
   - Set viewport ở 390x844 (mobile) và 1366x768 (desktop).
   - Chụp ảnh màn hình lưu artifact CI.
   - Kiểm tra DOM: `document.documentElement.scrollWidth <= window.innerWidth`.
   - Kiểm tra 3 locale `vi`, `ja`, `en`, xác minh không xuất hiện key dịch thô dạng chuỗi `account.profile.title` hay `[A-Za-z0-9_-]+\\.[A-Za-z0-9_.-]+`.

---

## 3. Kết quả Xác minh

- `docker build -f infra/docker/web.Dockerfile .`: Biên dịch thành công 100%, Next.js build hoàn tất không còn lỗi SSR bundling.
- `pnpm test:web`: 16/16 test suites passed, 232/232 tests passed.
- `pnpm check:no-mock-ui`: Đạt 100%, 0 vi phạm mới.
- Toàn bộ cổng kiểm tra: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` đều ĐẠT.
