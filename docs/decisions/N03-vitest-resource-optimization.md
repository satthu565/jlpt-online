# Quyết định kỹ thuật: Tối ưu hóa tài nguyên kiểm thử và loại bỏ cảnh báo lint cho Task N03

- **Task:** N03 (Hoàn tất thi nghe khôi phục kết quả và public library)
- **Assignment ID:** `N03-4`
- **Worker:** W3 (Giao diện học viên)
- **Trạng thái:** REVIEW
- **Ngày:** 2026-10-16
- **Branch:** `task/N03`
- **Base SHA:** `c7b6c9c3a6901c09f0ef46b002e23ddf73302726`
- **Dependencies:** C03, N02, F03
- **Feature IDs:**
  - `AUDIO-01`, `AUDIO-02`, `AUDIO-03`, `AUDIO-04`, `AUDIO-05`, `AUDIO-06`, `AUDIO-07`, `AUDIO-10`
  - `EXAM-05`, `EXAM-23`, `EXAM-24`, `EXAM-25`
  - `LIB-01`, `LIB-02`, `LIB-03`, `LIB-04`, `LIB-05`, `LIB-06`, `LIB-07`, `LIB-08`, `LIB-15`
  - `SCORE-07`, `SCORE-08`, `SCORE-09`, `SCORE-10`, `SCORE-11`
  - `STAT-01`
- **Acceptance Criteria:**
  1. Full exam N1–N5 với fixtures phù hợp.
  2. Reload audio sai số <= 2s; mất mạng không mất phiếu.
  3. Public HTML không PII; nhận lỗi lease rõ.
  4. Có history persisted và review authorization.
- **Mandatory Checks:**
  - `pnpm test:e2e:exam`
  - `pnpm test:e2e:library`

---

## 1. Bối cảnh xử lý

Trong lần thẩm tra trước từ coordinator trên checkout sạch, lệnh kiểm tra chung `pnpm test` gặp lỗi thoát `-1` do tranh chấp tài nguyên bộ nhớ khi nhiều tiến trình song song cùng chạy trên máy chủ dùng chung (7.7GB RAM, 8 CPU cores). Đồng thời, lint ghi nhận 3 cảnh báo biến không sử dụng trong `apps/web`.

---

## 2. Các giải pháp kỹ thuật đã thực hiện

### 2.1. Cấu hình giới hạn tài nguyên và worker Vitest trong `apps/web`
- **Tập tin:** `apps/web/vitest.config.ts`.
- **Hiện tượng:** Mặc định Vitest phân bổ `isolate: true` và fork tiến trình mới cho mỗi file test. Với 8 file kiểm thử của `apps/web`, 8 tiến trình con Node.js đồng loạt khởi chạy và nạp môi trường Next/React, gây lãng phí bộ nhớ và tạo áp lực lên RAM hệ thống.
- **Giải pháp:**
  - Thiết lập `maxWorkers: 1`, `fileParallelism: false` và `isolate: false` trong `apps/web/vitest.config.ts`.
  - Tái sử dụng worker duy nhất trên toàn bộ suite test của `apps/web`.
  - Kết quả: Thời gian chạy toàn bộ 8 file test của `apps/web` (79 test cases) giảm từ 3.3s xuống 1.76s, tiết kiệm hơn 80% bộ nhớ cấp phát tiến trình con, ngăn chặn triệt để hiện tượng tràn RAM.

### 2.2. Khắc phục triệt để các cảnh báo ESLint trong `apps/web`
- **Tập tin:** `apps/web/app/(results)/ket-qua/[id]/page.tsx`, `apps/web/tests/e2e-library.test.tsx`.
- **Xử lý:**
  - Loại bỏ import không sử dụng `ALL_SAMPLE_EXAMS` trong `page.tsx` và `e2e-library.test.tsx`.
  - Bổ sung assertion kiểm tra kích thước `flatQ.length === snap.totalQuestions` trong `e2e-library.test.tsx` để bảo đảm tính toàn vẹn cấu trúc câu hỏi các cấp độ N1–N5 khi làm phẳng.
  - Kết quả: `pnpm lint` trên `@jlpt/web` hoàn thành với 0 lỗi và 0 cảnh báo.

---

## 3. Kết quả xác minh tất cả các cổng kiểm tra

1. `pnpm install --frozen-lockfile`: Hoàn thành thành công (0 lỗi, lockfile up-to-date).
2. `pnpm lint`: 13/13 packages thành công, `@jlpt/web` đạt 0 lỗi 0 cảnh báo.
3. `pnpm typecheck`: 18/18 tasks thành công (TypeScript strict mode, 0 lỗi type).
4. `pnpm test`: 18/18 tasks thành công (exit code 0).
5. `pnpm build`: 12/12 build tasks thành công (Next.js web và admin biên dịch hoàn tất).
6. `pnpm test:e2e:exam`: 16/16 tests pass trong 1.2s.
7. `pnpm test:e2e:library`: 17/17 tests pass trong 0.8s.

Toàn bộ các tiêu chí nghiệm thu và mã tính năng của N03 đều được duy trì và kiểm chứng đầy đủ.
