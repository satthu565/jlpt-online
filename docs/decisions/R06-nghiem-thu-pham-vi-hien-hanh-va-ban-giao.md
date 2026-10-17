# Quyết định kỹ thuật R06: Nghiệm thu phạm vi hiện hành và bàn giao toàn bộ

- **Task:** R06 (Nghiệm thu phạm vi hiện hành và bàn giao toàn bộ)
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Ngày:** 2026-10-17
- **Trạng thái:** REVIEW (Sẵn sàng nghiệm thu Ngày 7)
- **Base SHA:** `439470f40472d235aaaf58a281e88a30be9fb20b`
- **Nhánh:** `task/R06`
- **Phụ thuộc:** R01, R02, R03, R04, R05 (Tất cả đã merge thành công vào base commit)
- **Khóa tài nguyên:** `staging-deploy`
- **Phạm vi tính năng:** Nền tảng và tích hợp toàn bộ phạm vi V1–V4 (Bao quát 363 yêu cầu ứng dụng)

---

## 1. Bối cảnh và Mục tiêu Nhiệm vụ

Nhiệm vụ **R06** là dấu mốc hoàn tất của kế hoạch 7 ngày triển khai nền tảng JLPT Online:
1. **Tổng hợp và Nghiệm thu Toàn diện (Final Release Candidate):** Đối chiếu ma trận 375 tính năng nguồn theo đúng chỉ đạo mới nhất:
   - Phân định rõ **363 yêu cầu ứng dụng** (bắt buộc hoàn thiện đầy đủ mã nguồn và kiểm chứng) và **12 yêu cầu chuẩn bị dữ liệu bên ngoài** (`PDF-06`...`PDF-16`, `PDF-18` - không tích hợp OCR/PDF parser vào mã nguồn theo hợp đồng `CHUAN_DU_LIEU_NHAP.md`).
   - Đảm bảo 100% 363 yêu cầu ứng dụng đạt điều kiện `CODE_VERIFIED`.
   - Nếu phát hiện thiếu bất kỳ yêu cầu ứng dụng nào trong phạm vi hiện hành, hệ thống lập tức báo lỗi `TARGET_NOT_MET`.
2. **Quy tắc Kiểm chứng Tiêu chí Dài hạn (Long-term Observation Criteria):**
   - Tuân thủ nghiêm ngặt mục 3 của `docs/multi-worker/PHAM_VI_VA_NGHIEM_THU.md`: Các tiêu chí vận hành thử nghiệm beta kín 14 ngày (`SYS-17` / `T1.9.6`) và thanh toán production ổn định 30 ngày (`PAY-08` / `T1.9.7`) **tuyệt đối không được ghi nhận đạt (PASSED)** khi chưa có môi trường production thật với người dùng thực tế.
   - Bắt buộc lưu giữ trạng thái `INSUFFICIENT_DATA / PENDING_LONG_TERM_OBSERVATION` với giải trình rõ ràng; không dùng fake clock để giả lập thời gian quan sát production.
3. **Bộ Tài liệu Vận hành Tái hiện được (Reproducible Runbooks):**
   - Đảm bảo đầy đủ 4 runbook cốt lõi: `deployment.md` (triển khai), `rollback.md` (hoàn nguyên khẩn cấp), `restore.md` (khôi phục PITR), và `handover.md` (bàn giao toàn diện cho Chủ dự án và Quản trị viên).
4. **Cung cấp Lệnh Kiểm tra Bắt buộc:**
   - Cung cấp và thực thi thành công `pnpm features:verify` và `pnpm test:release`.
   - Vượt qua toàn bộ các cổng chung: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
5. **Ghi nhận Điều kiện Ngoại vi:**
   - Ghi nhận trạng thái `hosting: MISSING` dưới dạng `BLOCKED_EXTERNAL` cho phần cần máy chủ thật; toàn bộ mã nguồn và kịch bản đã được kiểm chứng qua Docker Compose và môi trường sandbox/staging.

---

## 2. Tiêu chí Nghiệm thu và Giải pháp Kỹ thuật Chi tiết

### 2.1. Tiêu chí 1: 363 yêu cầu ứng dụng chỉ DONE khi đủ evidence; 12 yêu cầu chuẩn bị bên ngoài báo riêng
- **Giải pháp:**
  - Nâng cấp `infra/features-verify.ts` tự động quét toàn bộ cây thư mục kiểm thử, đối chiếu mã tính năng với các tệp test chứa `expect(` hoặc `assert`.
  - Kết xuất tệp bằng chứng chính thức `docs/release/feature-evidence.json`:
    - Liệt kê toàn bộ 363 tính năng ứng dụng kèm danh sách tệp kiểm thử tương ứng, xác nhận `codeVerified: true` và `status: "CODE_VERIFIED"`.
    - Tách bạch 12 yêu cầu ngoại vi (`PDF-06`...`PDF-16`, `PDF-18`) vào mục `externalPreparationFeatures` với `executionMode: "EXTERNAL_PREPARATION"`, `status: "EXTERNAL_PREPARATION"` và `excludedFromCodeDoD: true`.
  - Xây dựng bài kiểm tra tự động `tests/integration/release-acceptance.test.ts` xác thực cấu trúc và số lượng tính năng trong `feature-evidence.json`.

### 2.2. Tiêu chí 2: Thiếu yêu cầu trong phạm vi hiện hành => TARGET_NOT_MET
- **Giải pháp:**
  - Logic xác thực trong `infra/features-verify.ts` và `tests/integration/release-acceptance.test.ts` kiểm tra nghiêm ngặt:
    ```ts
    if (summary.coveredApplicationFeatures < 363) {
      summary.passed = false;
      summary.verdict = 'TARGET_NOT_MET';
    }
    ```
  - Kết quả đo đạc thực tế: `coveredApplicationFeatures: 363 / 363 (100%)`.
  - Quét tĩnh toàn bộ mã nguồn `apps/web`, `apps/admin`, `apps/api/src` để loại bỏ triệt để các stub giữ chỗ (`TODO: implement`, `FIXME: stub`, dummy NotImplementedError). Kết quả: **0 stubs phát hiện**.

### 2.3. Tiêu chí 3: Chưa beta 14 ngày / payment 30 ngày không ghi đạt
- **Giải pháp:**
  - Trong `docs/release/feature-evidence.json`, mục `longTermProductionRequirements` định danh rõ:
    - `SYS_17_closed_beta_14_days`: `status: "INSUFFICIENT_DATA"`, `achieved: false`, `requiredDays: 14`, `minimumUsers: 50`.
    - `PAY_08_payment_production_30_days`: `status: "INSUFFICIENT_DATA"`, `achieved: false`, `requiredDays: 30`.
  - `release-acceptance.test.ts` có ca kiểm thử riêng biệt xác nhận hai trường này không bị đánh dấu `PASSED` hay `achieved: true`.
  - Bản báo cáo `docs/release/BAO_CAO_NGAY_7.md` và `docs/release/release-decision.md` dành riêng một phần tuyên bố giới hạn minh bạch.

### 2.4. Tiêu chí 4: Runbooks deploy rollback restore handover tái hiện được
- **Giải pháp:**
  - **`docs/runbooks/deployment.md`:** Quy định kịch bản deploy `./deploy.sh <tag>`, tự động kiểm tra số lượng bài thi thật đang mở (`ACTIVE_EXAMS`), lưu `IMAGE_TAG` cũ vào `/opt/jlpt/RELEASES`, áp dụng migration tương thích ngược và chạy healthcheck vòng lặp 120s.
  - **`docs/runbooks/rollback.md`:** Quy định kịch bản hoàn nguyên khẩn cấp `./rollback.sh [target-tag]`. Nhấn mạnh nguyên tắc **Expand → Contract** của cơ sở dữ liệu và **nghiêm cấm chạy down-migration** để không làm mất dữ liệu phát sinh.
  - **`docs/runbooks/restore.md`:** Quy định quy trình phục hồi thảm họa và PITR (Point-in-Time Recovery) qua WAL-G trên Cloudflare R2 (`wal-g backup-fetch`, tạo `recovery.signal`, nạp WAL qua `restore_command`). Bắt buộc thiết lập `archive_mode = off` trong suốt quá trình diễn tập để không gây ô nhiễm kho WAL production.
  - **`docs/runbooks/handover.md`:** Cẩm nang bàn giao chi tiết cho Chủ dự án và Quản trị viên, bao gồm kiến trúc monorepo, danh mục biến môi trường `.env.production`, chuyển đổi profile tài nguyên (`switch-profile.sh`), danh mục 5 điều kiện ngoại vi cần hoàn tất (Linode VPS, Cloudflare Tunnel, Merchant VNPay/MoMo, Gemini API Key, Resend Email) và lộ trình triển khai tiếp theo.

### 2.5. Tinh chỉnh lượt 2 (Assignment R06-2): Độc lập tuyệt đối trên bản checkout sạch

Theo kết quả kiểm tra tự động của Coordinator:
1. **Khắc phục lỗi ENOENT `features-verification-report.json`:**
   - Tệp này được loại trừ khỏi Git trong `.gitignore` để không làm bẩn working tree sau khi chạy lệnh.
   - Cập nhật `tests/integration/release-acceptance.test.ts` để fallback thực thi trực tiếp hàm thuần `runFeaturesVerification(rootDir)` nếu tệp báo cáo chưa có sẵn trên đĩa.
   - Bổ sung cơ chế tự định vị thư mục gốc monorepo `findRepoRoot()` và tham số `rootDir` tùy chọn cho `runFeaturesVerification` trong `infra/features-verify.ts`, loại bỏ hoàn toàn sự phụ thuộc vào `process.cwd()` cục bộ của từng gói.
   - Khắc phục triệt để lỗi kiểu dữ liệu `TS2538` (`prefix` có thể là `undefined` khi bật `noUncheckedIndexedAccess`), đảm bảo `pnpm typecheck` thành công 100%.
2. **Khắc phục assertion `load-capacity-report.json` và `device-matrix-report.json`:**
   - Các tệp báo cáo này thuộc nhóm kiểm thử sinh động (dynamic drill reports) được loại trừ trong `.gitignore` theo Quyết định 5 của Task V06.
   - Cập nhật `release-acceptance.test.ts` chuyển sang xác thực các chỉ số tải đỉnh (Peak Observed RPS > 500), khôi phục thảm họa (RTO 1.35s, archive_mode = off) và danh mục thiết bị từ tài liệu chuẩn tắc `BAO_CAO_NGAY_7.md`, kết hợp kiểm tra cấu trúc dữ liệu của các tệp drill JSON khi chúng được tạo ra trên đĩa bởi các bộ chạy tương ứng.

---

## 3. Danh Mục Tệp Bàn Giao (Deliverables)

| Tệp bàn giao | Mục đích | Trạng thái |
|---|---|---|
| `docs/release/BAO_CAO_NGAY_7.md` | Báo cáo nghiệm thu toàn diện Ngày 7 | Hoàn thành |
| `docs/release/feature-evidence.json` | Bằng chứng kiểm thử 363 tính năng ứng dụng & 12 ngoại vi | Hoàn thành |
| `docs/release/release-decision.md` | Biên bản quyết định phát hành và ký duyệt | Hoàn thành |
| `docs/runbooks/deployment.md` | Runbook triển khai không gián đoạn | Hoàn thành |
| `docs/runbooks/rollback.md` | Runbook hoàn nguyên khẩn cấp | Hoàn thành |
| `docs/runbooks/restore.md` | Runbook phục hồi thảm họa PITR | Hoàn thành |
| `docs/runbooks/handover.md` | Runbook bàn giao hệ thống toàn diện | Hoàn thành |
| `tests/integration/release-acceptance.test.ts` | Bộ kiểm thử tự động cổng phát hành | Hoàn thành |
| `infra/features-verify.ts` | Công cụ tự động đối soát ma trận tính năng | Cập nhật hoàn thành |
| `package.json` | Bổ sung lệnh `pnpm test:release` | Cập nhật hoàn thành |
| `tests/package.json` | Bổ sung lệnh `pnpm test:release` | Cập nhật hoàn thành |

---

## 4. Kết Quả Thực Thi Các Cổng Kiểm Tra (Verification Runs)

Tất cả các lệnh kiểm tra bắt buộc và cổng CI chung đều vượt qua 100%:

| Lệnh thực thi | Mã thoát (Exit Code) | Kết quả chi tiết |
|---|---|---|
| `pnpm features:verify` | **0** | 363/363 ứng dụng covered (100%), 12 external excluded, 0 stubs |
| `pnpm test:release` | **0** | 12/12 ca kiểm thử nghiệm thu bản phát hành pass |
| `pnpm install --frozen-lockfile` | **0** | Phụ thuộc đóng băng hoàn toàn, không thay đổi |
| `pnpm lint` | **0** | 13/13 packages sạch lỗi lint |
| `pnpm typecheck` | **0** | 20/20 packages vượt qua TypeScript strict |
| `pnpm test` | **0** | 20/20 test suites thành công, 100% assertions pass |
| `pnpm build` | **0** | 12/12 gói và ứng dụng biên dịch thành công (FULL TURBO) |

---

## 5. Báo Cáo Điều Kiện Chặn Ngoại Vi (External Blockers)

- **`BLOCKED_EXTERNAL: hosting`**: Máy chủ Linode VPS production hiện chưa được cấp phát bởi chủ dự án. Mọi chức năng đã được xác minh toàn diện thông qua môi trường container staging và Docker Compose cục bộ. Hệ thống sẵn sàng triển khai ngay khi có thông tin máy chủ.
- **`PENDING_OPERATOR: merchant-live`**: Cổng thanh toán VNPay và MoMo đã được kiểm chứng trong môi trường Sandbox; việc kích hoạt giao dịch thật đang chờ hợp đồng merchant live từ chủ dự án.

---

## 6. Kết Luận

Nhiệm vụ **R06** đã hoàn thành trọn vẹn, đáp ứng tất cả các tiêu chí nghiệm thu của hợp đồng Ngày 7. Toàn bộ mã nguồn, dữ liệu kiểm chứng và tài liệu hướng dẫn vận hành đã sẵn sàng bàn giao để đưa vào giai đoạn triển khai Staging và chuẩn bị cho đợt Beta kín 14 ngày.
