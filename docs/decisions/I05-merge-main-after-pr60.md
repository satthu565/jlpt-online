# Quyết định kỹ thuật I05: Giải quyết xung đột và tích hợp nhánh main sau PR #60 (I09/I11/I12)

- **Mã công việc:** `I05` (Assignment: `I05-25`)
- **Người thực hiện:** Worker `W3` (Giao diện học viên)
- **Nhánh làm việc:** `task/I05`
- **Base SHA:** `dd56415ee6abe4dc301bc6320ee3937e81dda4c8`
- **Head SHA:** `50a7ca47fdfeeaed81a07bf1f661188d54cb97f3`
- **Ngày thực hiện:** 2026-10-18

---

## 1. Bối cảnh xung đột (Merge Conflict)

Sau khi các PR gần nhất (bao gồm PR #60, I11, I12) được merge vào nhánh `main`, nhánh `task/I05` khi rebase/merge với `origin/main` phát sinh xung đột nội dung trên tệp:
- `tests/playwright/integration.spec.ts`: Xung đột ở phần khai báo import đầu file (`type Page` từ `@playwright/test`) và ở cuối file khi nhánh `main` bổ sung thêm các suite kiểm thử E2E cho I11 (`No 500 errors from hardcoded IDs in vocab, grammar, discussions`) và I09 (`Real Staff Authentication & Admin Portal API Integration Suite`).

Đồng thời, nhánh `main` cũng đã cập nhật `tests/integration/mock-ui-baseline.json` để loại bỏ các route admin đã được xử lý ở I09.

---

## 2. Phương án giải quyết kỹ thuật

### 2.1. Tích hợp E2E Integration Test (`tests/playwright/integration.spec.ts`)
- Hợp nhất gọn gàng các import ở đầu file: gom `import { test, expect, type Page } from '@playwright/test';` cùng với `node:fs`, `node:path` và các fixture `MailpitClient`, `SEEDED_STAFF_ACCOUNTS`, `generateTotp`, `authenticateStaffAccount`.
- Giữ nguyên toàn bộ suite I05 (luồng học viên đăng ký qua Mailpit, xác minh, làm trọn đề demo N5 đã xuất bản và xem điểm trên staging CI, khách làm thử đề guest_trial, kiểm tra responsive 390px và 1366px, tri-locale vi/ja/en) và tích hợp liền mạch với các suite mới từ `main`: I06, I11, I09, I03.

### 2.2. Kiểm tra Mock UI Baseline (`tests/integration/mock-ui-baseline.json`)
- Tự động merge chuẩn xác giữa I05 và main: giữ lại 9 mục baseline còn lại của admin và test fixture.
- Tất cả các trang học viên trong phạm vi I05 (`/de-thi`, `/phong-thi`, `/ket-qua`, `/lich-su`) hoàn toàn kết nối API thật và không có vi phạm mới.

---

## 3. Kết quả xác minh trên staging và các cổng chất lượng

1. `pnpm check:no-mock-ui`: ĐẠT (9 vi phạm kiểm soát trong baseline, 0 vi phạm mới).
2. `pnpm test:web`: ĐẠT (18 test files, 243 tests pass).
3. `sudo -n /usr/local/bin/jlpt-stage-test check`: ĐẠT (34 passed, 4 skipped trên staging full stack Web + Admin + API + Postgres + Redis + Mailpit trong 397s).
4. `pnpm install --frozen-lockfile`: ĐẠT.
5. `pnpm lint`: ĐẠT (13 packages pass).
6. `pnpm typecheck`: ĐẠT (20 packages pass).
7. `pnpm test`: ĐẠT (41 test files, 551 tests pass trong monorepo).
8. `pnpm build`: ĐẠT (Toàn bộ package và apps web, admin biên dịch thành công).
