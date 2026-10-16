# Quyết định kỹ thuật L06: Kiểm thử Learning Commerce và Outbox Reliability

- **Task:** L06
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Assignment ID:** L06-1
- **Trạng thái:** Hoàn tất triển khai (REVIEW)
- **Base SHA:** `2c04c144ef92949f2aa7e88a2397cb36536c5bf4`
- **Allowed Paths:** `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `.gitignore`, `.gitattributes`, `.nvmrc`, `.npmrc`, `.editorconfig`, `README.md`, `infra/`, `.github/`, `tests/`, `packages/config/`, `apps/media-worker/`, `docs/runbooks/`, `docs/release/`, `docs/decisions/`
- **Resource Locks:** `staging-deploy`
- **Bàn giao:**
  - `tests/integration/learning/`:
    - `learning-staging-integration.test.ts` (15 tests)
    - `outbox-replay-no-double-count.test.ts` (7 tests)
    - `quota-simulator-concurrency.test.ts` (4 tests)
    - `coordinator-drill.test.ts` (5 tests)
  - `tests/integration/billing/`:
    - `signature-tamper.test.ts` (14 tests)
    - `outbox-replay-double-charge.test.ts` (9 tests)
    - `concurrency-and-failover.test.ts` (3 tests)
- **Lệnh kiểm tra bắt buộc:**
  - `pnpm test:integration:learning` (31 tests pass)
  - `pnpm test:integration:billing` (26 tests pass)

---

## 1. Bối cảnh và Tiêu chí Nghiệm thu

Theo task card L06 và quy tắc `AGENTS.md`:
1. **Nghiệm thu 1: Replay events không double-charge/double-count**
   - Phía Billing: Webhook nộp lại nhiều lần cho cùng một giao dịch (hoặc cùng một sự kiện `payment.captured`) không được ghi nhận tiền hai lần, không cộng dồn thời hạn gói gia hạn (idempotent extension), không hoàn tiền vượt quá số tiền ban đầu.
   - Phía Learning: Hoàn thành buổi học (Study Session Completion) và nộp kết quả ôn tập thẻ (SRS Flashcard Review) nộp lại nhiều lần cùng `clientEventId` / `clientReviewId` không được làm tăng chuỗi ngày liên tục (streak) nhiều lần, không làm sai lệch bước lặp (`intervalDays`, `repetitions`, `easeFactor`), và không sinh thêm bản ghi dư thừa.
   - Phía Outbox: Bộ chuyển tiếp Outbox (`relayOutbox`) và Downstream Consumer xử lý các gói tin trùng lặp một cách tất định và loại trừ trùng lặp (deduplication) đúng chuẩn.

2. **Nghiệm thu 2: Payment signature/retry tamper cases pass**
   - Xác thực chữ ký HMAC-SHA256 theo chuẩn PayOS với thuật toán sắp xếp thứ tự tham số từ điển theo chuẩn A-Z.
   - Phát hiện và từ chối mọi nỗ lực can thiệp (tampering) đối với chữ ký, số tiền (`amount`), mã đơn hàng (`orderCode`), đơn vị tiền tệ (`currency`), hoặc giả mạo trạng thái giao dịch (`status: 'PAID'`).
   - Phòng chống tấn công phân tích độ lệch thời gian (timing attacks) bằng so sánh an toàn thời gian thực `crypto.timingSafeEqual`.
   - Xử lý các tình huống cổng thanh toán trả về phản hồi lỗi, timeout, hoặc chữ ký rỗng/không hợp lệ.

3. **Nghiệm thu 3: Diễn tập pause/checkpoint/resume của coordinator trên một task thật không mất patch; bằng chứng lấy từ coordinator**
   - Thực hiện diễn tập thực tế cơ chế `checkpoint(task, worker, reason)`, `prepareBranch`, và `commitLeftovers` của coordinator trực tiếp từ mã nguồn `/opt/jlpt-coordinator/src/`.
   - Giả lập worker đang có các thay đổi chưa hoàn tất: tệp đã theo dõi bị sửa (`package.json`), tệp đã stage (`git add`), và tệp chưa theo dõi mới (`sample.test.ts`).
   - Kiểm tra mã băm SHA256 trước khi pause và sau khi resume khớp chính xác 100% từng byte (zero patch loss).
   - Kiểm chứng lịch sử git thực tế của kho lưu trữ: audit các commit checkpoint có thật của các worker trước đó (`5c897ed chore(checkpoint): V03...`, `dea46e9 chore(checkpoint): N06...`, `5e5901a chore(checkpoint): A03...`, `aa411e8 chore(checkpoint): V01...`) và chứng minh các commit này được tiếp nối bởi commit merge tính năng thành công mà không thất thoát công việc.

4. **Phạm vi mô phỏng: Account Quota Simulator & Concurrency Limits**
   - Mô phỏng tài khoản Miễn phí (Free) vs Trả phí (Premium): Feature-gating cho thi thử không giới hạn, tải đề ngoại tuyến, và hạn mức sử dụng AI.
   - Thử nghiệm 10 luồng đồng thời tranh chấp hạn mức AI (250 tokens/request trên ngân sách 1,000 tokens): đúng 4 luồng thành công, 6 luồng bị chặn bởi mã lỗi HTTP 429 Too Many Requests, tuyệt đối không bị thâm hụt (zero token overdraw).
   - Cơ chế quyết toán (settle) vào sổ cái `usage_ledger` khi thành công và hoàn trả (refund) giải phóng ngân sách khi gọi AI provider thất bại (failover).

---

## 2. Giải pháp Kỹ thuật và Cấu trúc Bộ Kiểm thử

### 2.1. Bộ kiểm thử Billing Commerce (`tests/integration/billing/`)

1. **`signature-tamper.test.ts` (14 tests):**
   - Kiểm tra việc sinh và xác thực chữ ký HMAC-SHA256 với bảng băm bí mật `checksumKey`.
   - Thuật toán sắp xếp khóa tham số từ điển theo thứ tự bảng chữ cái (`key1=value1&key2=value2...`).
   - Kiểm tra 7 ca can thiệp dữ liệu: sửa chữ ký, đổi số tiền (ví dụ 199,000 thành 1,000), sửa `orderCode`, đổi mã tiền tệ (VND sang USD), sửa trạng thái giao dịch.
   - Từ chối trường hợp thiếu header hoặc payload không có chữ ký.
   - So sánh chuỗi an toàn thời gian qua `timingSafeEqual`.
   - Xử lý các nhà cung cấp không hỗ trợ (`unsupported_provider`).

2. **`outbox-replay-double-charge.test.ts` (9 tests):**
   - Vòng đời thanh toán từ `createCheckoutSession` -> sinh đơn hàng -> webhook thanh toán -> kích hoạt gói thuê bao (`subscriptions`) -> ghi nhận quyền lợi (`entitlementGrants`) -> phát sự kiện `payment.captured` vào Outbox.
   - Replay webhook thành công 5 lần liên tiếp:
     - Số tiền đơn hàng giữ nguyên `paid`.
     - Thời hạn thuê bao (`currentPeriodEnd`) không bị cộng dồn lần 2, lần 3.
     - Quyền lợi không bị nhân bản.
   - Tình huống lỗi mạng gây out-of-order delivery: Webhook báo FAILED đến trễ sau khi đơn hàng đã PAID thì trạng thái PAID được bảo toàn, không bị ghi đè thành FAILED.
   - Trừ tiền / Hoàn tiền từng phần và toàn phần: kiểm tra máy trạng thái hoàn tiền, tính toán `maxRefundable = totalAmount - totalRefunded`, từ chối hoàn tiền vượt hạn mức, chặn hoàn tiền khi đã hoàn đủ 100%.

3. **`concurrency-and-failover.test.ts` (3 tests):**
   - Kiểm tra atomic coupon reservation: 10 yêu cầu sử dụng coupon giới hạn 1 lượt dùng gửi lên đồng thời (`Promise.all`). Đúng 1 yêu cầu chiến thắng, 9 yêu cầu bị từ chối với thông báo hết lượt.
   - 10 luồng gửi webhook đồng thời cho cùng 1 đơn hàng: DB transaction row locking xử lý tuần tự an toàn, chuyển trạng thái đúng 1 lần.
   - Giả lập lỗi nhà cung cấp cổng thanh toán (`FaultyPaymentProvider`): mô phỏng timeout và lỗi mạng khi gọi API gateway, trả về mã lỗi và trạng thái `failed` mà không gây treo ứng dụng.

### 2.2. Bộ kiểm thử Learning & Outbox Reliability (`tests/integration/learning/`)

1. **`learning-staging-integration.test.ts` (15 tests):**
   - Tích hợp toàn diện các API Learning: Sổ tay cá nhân (CRUD Notebook items, tags, isolation giữa các học viên), sinh Flashcard theo template (`term_to_meaning`), thuật toán SRS (Spaced Repetition) với xếp hạng `good` và căn chỉnh chu kỳ ôn tập theo nửa đêm, sinh bài kiểm tra trắc nghiệm 4 đáp án (Quiz generator) yêu cầu tối thiểu 2 mục, xuất sổ tay ra file CSV với cơ chế làm sạch formula injection (`=`, `+`, `-`, `@`), tổng hợp giọng đọc TTS có gắn giấy phép bản quyền `Open-Voice-License-1.0`, và tích hợp kế hoạch học tập cá nhân (Planner).

2. **`outbox-replay-no-double-count.test.ts` (7 tests):**
   - Replay xác nhận hoàn thành buổi học (`completeStudySession`):
     - Gửi lần đầu với `clientEventId`: trả về `isIdempotentReplay: false`, tính toán `streak: 1`.
     - Replay 5 lần liên tiếp với cùng `clientEventId`: trả về `isIdempotentReplay: true`, `streak` giữ nguyên là 1, số lượng bản ghi trong bảng `study_session_completions` không bị nhân đôi.
   - Replay ôn tập thẻ Flashcard SRS (`processReview`):
     - Gửi lần đầu: cập nhật schedule (`repetitions: 1`, `intervalDays: 1`, `easeFactor: 250`).
     - Replay 5 lần liên tiếp với cùng `clientReviewId`: trả về `isIdempotentReplay: true`, `repetitions` giữ nguyên là 1 (không tăng lên 6), bản ghi trong bảng `card_reviews` không bị nhân bản.
   - Relay Outbox không phát lặp: phát sự kiện `study.session.completed`, gọi `relayOutbox` cập nhật `publishedAt`. Gọi lại `relayOutbox` lần hai trả về 0 bản ghi (tính idempotent của outbox-relay).
   - Bộ khử trùng lặp phía người tiêu dùng downstream: mô phỏng nhận 10 sự kiện trùng lặp của cùng một `eventId`, cơ chế dedup cache chỉ xử lý đúng 1 lần, ngăn chặn nhân đôi số phút học tập và thẻ từ vựng đã ôn.

3. **`quota-simulator-concurrency.test.ts` (4 tests):**
   - Kiểm tra phân tầng gói: Tài khoản Free bị chặn thi không giới hạn và tải đề ngoại tuyến (`FEATURE_GATED`), được cấp 5 lượt AI hàng ngày; Tài khoản Premium mở toàn bộ quyền.
   - Tranh chấp đồng thời 10 luồng giữ chỗ token (250 tokens/request trên ngân sách 1,000 tokens): đúng 4 luồng thành công, 6 luồng bị chặn bởi lỗi 429. Tổng lượng token giữ chỗ trong cơ sở dữ liệu đạt chính xác 1,000 tokens, không vượt quá hạn mức.
   - Quy trình quyết toán (settle) vào `usage_ledger` kèm phát sự kiện outbox `ai.request.settled`.
   - Quy trình hoàn trả (refund) giải phóng token khi gọi AI provider timeout, phát sự kiện outbox `ai.request.cancelled`, cho phép các yêu cầu kế tiếp sử dụng lại hạn mức vừa giải phóng.

4. **`coordinator-drill.test.ts` (5 tests):**
   - Diễn tập thực tế: tạo bare mirror repo và clone của worker W6.
   - Tạo các thay đổi dở dang: sửa tệp đã theo dõi, stage tệp tài liệu, thêm tệp kiểm thử mới chưa theo dõi.
   - Lưu mã băm SHA256 của từng tệp trước khi pause.
   - Kích hoạt coordinator `gitHelper.commitLeftovers` tạo commit `chore(checkpoint): L06 hết quota phiên làm việc`, lưu bản ghi checkpoint vào cơ sở dữ liệu SQLite của coordinator store và nhật ký sự kiện.
   - Khôi phục phiên làm việc (`prepareBranch`): kiểm tra toàn bộ tệp được phục hồi nguyên vẹn với mã băm SHA256 khớp 100% từng byte (zero patch loss).
   - Audit lịch sử git của repo: xác thực sự tồn tại của các commit checkpoint thực tế của các worker trước đó (`V03`, `N06`, `A03`, `V01`) tuân thủ chuẩn Conventional Commits `chore(checkpoint): <taskId> <reason>`.
   - Chứng minh tất cả các task sau checkpoint đều được resume và merge thành công vào `origin/main` (`feat(N06)`, `feat(V03)`, `feat(A03)`, `feat(V01)`).

---

## 3. Cập nhật Cấu hình và Tối ưu Hạ tầng

1. **Cập nhật `tests/package.json` và `package.json` gốc:**
   - Bổ sung scripts chạy kiểm thử tích hợp chuyên biệt:
     - `pnpm test:integration:learning`
     - `pnpm test:integration:billing`
   - Ghim dependency `drizzle-orm: 0.45.4` vào `tests/package.json` devDependencies để đảm bảo biên dịch TypeScript nghiêm ngặt (`tsc --noEmit`) trong toàn bộ workspace.
2. **Cập nhật `tests/vitest.config.ts`:**
   - Cấu hình `fileParallelism: false` cho bộ chạy kiểm thử tích hợp nhằm loại trừ xung đột tranh chấp cổng kết nối (port collision) hoặc xung đột vòng đời tiến trình con giữa các tệp kiểm thử tích hợp.
3. **Cải tiến `tests/fixtures/test-server.ts`:**
   - Sử dụng cấp phát cổng tạm thời ngẫu nhiên do hệ điều hành quản lý (`net.createServer().listen(0)`) thay cho việc thử cổng cố định 4092, giúp các tiến trình kiểm thử độc lập không bao giờ gặp lỗi `EADDRINUSE`.
4. **Cập nhật `tests/fixtures/server-runner.mjs`:**
   - Tích hợp tự động các module NestJS cần thiết cho môi trường staging: `PaymentModule`, `EntitlementModule`, `LearningModule`, `PlannerModule`.
   - Khởi tạo seed ban đầu cho các gói thanh toán (`paymentService.ensureInitialPlans()`).
   - Cung cấp tài khoản quản trị thanh toán `billingAdmin` (`tok_billing_admin_demo`) trong `seed-sessions.sql`.

---

## 4. Kết quả Thực thi và Kiểm chứng Cổng Chung

Toàn bộ các cổng kiểm tra bắt buộc đã được chạy trên bản clone hiện tại và đạt 100%:

| Cổng kiểm tra | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| **Learning Integration** | `pnpm test:integration:learning` | **PASSED (31/31 tests)** | 10.50s |
| **Billing Integration** | `pnpm test:integration:billing` | **PASSED (26/26 tests)** | 9.76s |
| **Frozen Lockfile** | `pnpm install --frozen-lockfile` | **PASSED** | 38ms |
| **Linter** | `pnpm lint` | **PASSED (0 errors, 0 warnings)** | 1.30s |
| **Typecheck** | `pnpm typecheck` | **PASSED (19/19 packages)** | 6.30s |
| **Workspace Tests** | `pnpm test` | **PASSED (34/34 files, 452 tests)** | 3m 07s |
| **Monorepo Build** | `pnpm build` | **PASSED (12/12 packages)** | 5.51s |
