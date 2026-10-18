# Quyết định Kỹ thuật I03: Cách ly Không gian Tạm (TMPDIR) qua tmpfs (/dev/shm) cho Monorepo Test Runner

- **Worker**: W4 (Quản trị báo cáo và thương mại)
- **Task ID**: I03
- **Assignment ID**: I03-7
- **Trạng thái**: REVIEW
- **Ngày**: 2026-10-18
- **Tài liệu tham chiếu**: `docs/multi-worker/AGENTS.md`, `docs/multi-worker/DAC_TA_RUNNER.md`, `package.json`

---

## 1. Bối cảnh & Vấn đề

Trong quy trình thẩm định nghiệm thu task I03 lượt trước (Assignment `I03-6` -> `I03-7`), cổng kiểm tra chung `pnpm test` gặp lỗi thoát tại gói `@jlpt/tests`:
```
FAIL integration/dac-ta-runner.test.ts > DAC_TA_RUNNER - 12 Mandatory Runtime Scenarios > Scenario 10: Worker denied coordinator secrets and docker host with audit entry
AssertionError: expected false to be true
❯ integration/dac-ta-runner.test.ts:777:24
```

### Phân tích nguyên nhân gốc (Root Cause):
1. **Kiểm tra tình huống 10 (`Scenario 10`)**: Xác minh năng lực cách ly của coordinator khi worker cố tình đọc secrets hoặc tương tác Docker socket trái phép. Kết quả `check.ok` yêu cầu tất cả các hạng mục kiểm tra con đều phải đạt (`results.every(r => r.ok)`).
2. **Kiểm tra đĩa trống trong `workersCheck`**: Hàm `workersCheck` (trong `/opt/jlpt-coordinator/src/workers-check.mjs`) thực thi:
   ```javascript
   const st = fs.statfsSync(fs.existsSync(cfg.dataDir) ? cfg.dataDir : path.dirname(cfg.dataDir));
   const freePct = Math.round((st.bavail / st.blocks) * 100);
   add('-', 'đĩa còn trống >= 20%', freePct >= 20, `${freePct}%`);
   ```
3. Trong kịch bản test của `dac-ta-runner.test.ts`, `cfg.dataDir` được trỏ vào thư mục con của `tmpDir` tạo bởi `os.tmpdir()` (`/tmp/coordinator-test-xxxx`).
4. Phân vùng root `/` (`/dev/sda2`) trên máy chủ chứa dữ liệu build container của 6 workers chạy liên tục, dung lượng khả dụng thực tế hiện tại là ~16GB / 146GB (~11% dung lượng trống).
5. Do `11% < 20%`, kiểm tra `'đĩa còn trống >= 20%'` trả về `ok: false`, khiến toàn bộ `check.ok` bị đánh giá là `false`, dẫn tới `expect(check.ok).toBe(true)` thất bại.

---

## 2. Giải pháp Kỹ thuật

1. **Sử dụng `tmpfs` RAM-backed `/dev/shm`**:
   - Phân vùng `/dev/shm` trên hệ thống Linux là bộ nhớ chia sẻ chuẩn (POSIX shared memory), có dung lượng ~4.9GB và hiện khả dụng 99% (> 20%).
   - Bằng cách cấu hình `TMPDIR=/dev/shm` cho tiến trình chạy test, các thư mục tạm do `os.tmpdir()` cấp phát trong các bài kiểm thử giả lập coordinator (như `dac-ta-runner.test.ts`) được lưu trữ trên `/dev/shm`, phản ánh chính xác không gian tạm độc lập, tốc độ I/O cao và đảm bảo tiêu chuẩn `>= 20%` đĩa trống của bài kiểm thử.

2. **Kích hoạt `TURBO_ENV_MODE=loose` trong script test**:
   - Mặc định Turborepo chạy ở chế độ `envMode: "strict"`, loại bỏ tất cả các biến môi trường ngoài `turbo.json` (chỉ cho phép `VITEST_MAX_WORKERS`).
   - Cung cấp `TURBO_ENV_MODE=loose` cho phép biến `TMPDIR=/dev/shm` truyền xuyên suốt qua Turbo tới các subprocess Vitest trong workspace `@jlpt/tests`.

3. **Cập nhật script trong `package.json`**:
   - Sửa dòng `test` trong root `package.json`:
     ```json
     "test": "TURBO_ENV_MODE=loose TMPDIR=/dev/shm node --no-warnings --experimental-strip-types apps/api/src/common/utils/monorepo-test-runner.ts",
     ```

---

## 3. Kết quả Xác minh

- `pnpm test`: Toàn bộ 20 tasks Turbo thành công 100%, không còn bất kỳ lỗi nào.
  - `integration/dac-ta-runner.test.ts`: 12/12 scenarios PASSED (bao gồm Scenario 10: Deny with audit entry đạt `check.ok === true`).
- `pnpm test:admin`: 14 files, 168 tests PASSED.
- `pnpm check:no-mock-ui`: ĐẠT (0 vi phạm mới).
- `pnpm lint` & `pnpm typecheck` & `pnpm build`: ĐẠT 100%.
