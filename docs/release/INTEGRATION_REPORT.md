# Báo Cáo Nghiệm Thu Tích Hợp Toàn Bộ Và Khóa Chặn Dữ Liệu Giả (Task I07)

> **Mã công việc:** I07 — Nghiệm thu tích hợp toàn bộ và khóa chặn dữ liệu giả  
> **Worker thực hiện:** W6 (Hạ tầng CI và kiểm chứng)  
> **Ngày thực hiện:** Ngày 8 (2026-10-19)  
> **Trạng thái:** HOÀN TẤT KIỂM CHỨNG (CODE_VERIFIED / PASS)  
> **Cổng chất lượng:** `check:no-mock-ui`, `test:e2e:integration`, staging multi-browser verification

---

## 1. Tóm Tắt Nghiệm Thu

Hệ thống JLPT Online đã hoàn thành việc tích hợp toàn diện trên toàn bộ các ứng dụng (`apps/web`, `apps/admin`, `apps/api`, `apps/media-worker`, Postgres, Redis, Mailpit). Toàn bộ dữ liệu mẫu, mock data tạm thời và ngoại lệ trong baseline phát triển đã được dọn sạch hoàn toàn, đưa `tests/integration/mock-ui-baseline.json` về trạng thái rỗng `[]` và biến cổng kiểm tra `check:no-mock-ui` thành rào chắn bắt buộc vĩnh viễn trong quy trình CI.

### Các Tiêu Chí Nghiệm Thu Đạt Được

| STT | Tiêu chí nghiệm thu | Kết quả | Bằng chứng |
|:---:|:---|:---:|:---|
| 1 | `tests/integration/mock-ui-baseline.json` rỗng; CI fail nếu có dữ liệu giả mới | **ĐẠT** | Baseline = `[]`; `pnpm check:no-mock-ui` quét 0 vi phạm; vi phạm mới hoặc baseline khác rỗng gây exit code 1. |
| 2 | E2E đăng nhập học viên và nhân sự rồi đi qua mọi trang web/admin, fail nếu bất kỳ request API nào trả 5xx hoặc trang hiện key dịch thô | **ĐẠT** | Duyệt qua 29 trang web và 30 trang admin (tổng cộng 59 trang); 0 lỗi 5xx; 0 key dịch thô; 0 lỗi tràn ngang màn hình. |
| 3 | E2E: học viên đăng ký -> làm đề -> xem điểm; editor nhập -> reviewer duyệt -> xuất bản; admin xem người dùng và audit; tất cả trên staging thật | **ĐẠT** | Quy trình xuyên suốt hoạt động với dịch vụ thật: Mailpit bắt email xác nhận, thi thật ghi điểm thật, nguyên tắc 4 mắt (Editor != Reviewer != Admin), Audit log lưu vết giao dịch. |
| 4 | `docs/release/INTEGRATION_REPORT.md` liệt kê từng trang và bằng chứng E2E | **ĐẠT** | Bảng chi tiết toàn bộ 59 trang được thống kê bên dưới kèm đường dẫn artifact screenshot. |

---

## 2. Khóa Chặn Dữ Liệu Giả (Zero Mock UI & Empty Baseline)

Theo quy định kiến trúc của dự án JLPT Online:
1. **Không cho phép mock trong UI production**: Các thành phần giao diện không được chứa mảng mẫu viết cứng (`SAMPLE_*`, `MOCK_*`), biến mẫu `ALL_SAMPLE`, `ALL_SAMPLE_EXAMS`, hoặc chế độ xác thực giả `mode: 'mock'`.
2. **Khóa baseline vĩnh viễn**: `tests/integration/mock-ui-baseline.json` được xác lập giá trị rỗng `[]`. Cổng `runNoMockUiCheck()` trong `tests/integration/check-no-mock-ui.ts` kiểm tra nghiêm ngặt `baselineCount === 0`. Bất kỳ thay đổi nào đưa mã mẫu vào baseline hoặc sinh vi phạm mới ngoài baseline đều lập tức kích hoạt exit code 1 làm trượt CI.
3. **Cổng kiểm tra CI**: Lệnh `pnpm check:no-mock-ui` được tích hợp trong `.github/workflows/ci.yml` ở bước xác minh trước khi đóng gói sản phẩm.

```bash
$ pnpm check:no-mock-ui
===============================================================
 [check:no-mock-ui] Quét apps/web và apps/admin tìm dữ liệu giả
 Tiêu chuẩn: Không dùng mảng mẫu, ALL_SAMPLE, đăng nhập giả
 Nghiệm thu I07: mock-ui-baseline.json phải rỗng tuyệt đối
===============================================================

Tổng số tệp/route phát hiện vi phạm: 0
 - Vi phạm đã ghi nhận trong baseline: 0
 - Vi phạm mới ngoài baseline (LỖI CI): 0
 - Số lượng mục trong baseline: 0

✅ mock-ui-baseline.json hoàn toàn rỗng và không có dữ liệu giả mới.
Toàn bộ giao diện đã kết nối backend thật. Kiểm tra check:no-mock-ui ĐẠT.
```

---

## 3. Danh Mục Kiểm Tra Từng Trang Của Ứng Dụng Học Viên (Web Portal - 29 Trang)

Toàn bộ các trang dưới đây đã được crawler Playwright truy cập sau khi học viên đăng nhập thật (`student.verified@jlpt.local`). Trong suốt quá trình duyệt, bộ lắng nghe mạng `page.on('response')` giám sát toàn bộ các lời gọi HTTP/API nhằm đảm bảo không có bất kỳ phản hồi 5xx nào và nội dung trang không chứa key dịch thô (unparsed i18n keys).

| # | Tuyến đường (Route) | Tên chức năng | Trạng thái API | Key dịch thô | Tràn ngang (Overflow) | Artifact Screenshot |
|:---:|:---|:---|:---:|:---:|:---:|:---|
| 1 | `/` | Trang chủ (Landing page) | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-home.png` |
| 2 | `/dang-nhap` | Đăng nhập học viên | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-dang-nhap.png` |
| 3 | `/dang-ky` | Đăng ký tài khoản | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-dang-ky.png` |
| 4 | `/quen-mat-khau` | Quên mật khẩu | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-quen-mat-khau.png` |
| 5 | `/de-thi` | Thư viện đề thi JLPT | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-de-thi.png` |
| 6 | `/de-thi/demo-n5-1` | Chi tiết đề thi N5 | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-de-thi-detail.png` |
| 7 | `/phong-thi?examId=demo-n5-1` | Phòng thi mô phỏng | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-phong-thi.png` |
| 8 | `/luyen-tap` | Phòng luyện thi linh hoạt | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-luyen-tap.png` |
| 9 | `/tu-vung` | Ngân hàng từ vựng JLPT | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-tu-vung.png` |
| 10 | `/ngu-phap` | Ngân hàng ngữ pháp JLPT | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-ngu-phap.png` |
| 11 | `/thong-ke-tu-vung` | Thống kê phân bố từ vựng | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-thong-ke-tu-vung.png` |
| 12 | `/so-tay` | Sổ tay học tập cá nhân & SRS | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-so-tay.png` |
| 13 | `/ke-hoach` | Kế hoạch ôn thi cá nhân hóa | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-ke-hoach.png` |
| 14 | `/thong-ke` | Bảng phân tích năng lực học viên | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-thong-ke.png` |
| 15 | `/thao-luan` | Diễn đàn thảo luận bài tập | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-thao-luan.png` |
| 16 | `/su-kien` | Thử thách và sự kiện cộng đồng | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-su-kien.png` |
| 17 | `/lop-hoc` | Không gian lớp học trực tuyến | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-lop-hoc.png` |
| 18 | `/goi-thanh-vien` | Bảng giá và nâng cấp tài khoản | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-goi-thanh-vien.png` |
| 19 | `/tai-khoan` | Hồ sơ người dùng và bảo mật | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-tai-khoan.png` |
| 20 | `/lich-su` | Lịch sử làm bài thi và luyện tập | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-lich-su.png` |
| 21 | `/gioi-thieu` | Giới thiệu hệ thống JLPT Online | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-gioi-thieu.png` |
| 22 | `/chinh-sach` | Chính sách điều hành nền tảng | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-chinh-sach.png` |
| 23 | `/chinh-sach-bao-mat` | Cam kết bảo mật dữ liệu riêng tư | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-chinh-sach-bao-mat.png` |
| 24 | `/dieu-khoan` | Điều khoản thỏa thuận sử dụng | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-dieu-khoan.png` |
| 25 | `/faq` | Giải đáp thắc mắc thường gặp | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-faq.png` |
| 26 | `/ho-tro` | Trung tâm hướng dẫn hỗ trợ | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-ho-tro.png` |
| 27 | `/lien-he` | Kênh liên hệ đội ngũ quản trị | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-lien-he.png` |
| 28 | `/n5` | Trang SEO tổng quan cấp độ N5 | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-n5-level.png` |
| 29 | `/n5/de-thi` | Trang SEO danh sách đề thi N5 | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/web-n5-de-thi.png` |

---

## 4. Danh Mục Kiểm Tra Từng Trang Của Cổng Quản Trị (Admin Portal - 30 Trang)

Toàn bộ các trang dưới đây đã được crawler Playwright truy cập sau khi nhân sự đăng nhập thật bằng mật khẩu và xác thực 2FA TOTP RFC 6238 (`publisher@jlpt.local`).

| # | Tuyến đường (Route) | Tên phân hệ quản trị | Trạng thái API | Key dịch thô | Tràn ngang (Overflow) | Artifact Screenshot |
|:---:|:---|:---|:---:|:---:|:---:|:---|
| 1 | `/` | Bảng điều khiển trung tâm (Dashboard) | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-dashboard.png` |
| 2 | `/users` | Quản lý người dùng & phân quyền RBAC | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-users.png` |
| 3 | `/audit-logs` | Nhật ký kiểm toán và vết truy cập | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-audit-logs.png` |
| 4 | `/exams` | Danh mục đề thi và xuất bản | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-exams.png` |
| 5 | `/exams/schedules` | Lịch mở đề thi theo kỳ | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-exams-schedules.png` |
| 6 | `/exams/scoring` | Bảng quy đổi điểm đề thi | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-exams-scoring.png` |
| 7 | `/exams/mixed` | Quản trị và giám sát đề trộn | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-exams-mixed.png` |
| 8 | `/imports` | Nạp và thẩm định gói nội dung | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-imports.png` |
| 9 | `/reviews` | Duyệt nội dung đề thi (Nguyên tắc 4 mắt) | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-reviews.png` |
| 10 | `/reviews/explanations` | Duyệt lời giải chi tiết và ngữ liệu | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-reviews-explanations.png` |
| 11 | `/questions` | Ngân hàng câu hỏi trắc nghiệm | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-questions.png` |
| 12 | `/vocab` | Quản lý kho ngữ liệu từ vựng | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-vocab.png` |
| 13 | `/blueprints` | Quản trị ma trận cấu trúc đề thi | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-blueprints.png` |
| 14 | `/schedules` | Quản lý kỳ thi JLPT chính thức | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-schedules.png` |
| 15 | `/scoring-tables` | Quản lý phiên bản bảng điểm chuẩn | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-scoring-tables.png` |
| 16 | `/reports` | Báo cáo hoạt động học tập tổng hợp | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-reports.png` |
| 17 | `/reports/content` | Báo cáo chất lượng và tỷ lệ sai sót | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-reports-content.png` |
| 18 | `/reports/revenue` | Báo cáo doanh thu & giao dịch thanh toán | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-reports-revenue.png` |
| 19 | `/commercial/plans` | Quản lý cấu hình gói cước thương mại | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-commercial-plans.png` |
| 20 | `/commercial/payments` | Tra cứu và quản lý đơn thanh toán | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-commercial-payments.png` |
| 21 | `/commercial/refunds` | Quy trình phê duyệt hoàn tiền | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-commercial-refunds.png` |
| 22 | `/commercial/reconciliation` | Đối soát giao dịch cổng thanh toán | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-commercial-reconciliation.png` |
| 23 | `/experiments` | Quản trị thử nghiệm A/B tính năng | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-experiments.png` |
| 24 | `/media` | Quản lý tệp đa phương tiện & Token edge | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-media.png` |
| 25 | `/cms` | Quản trị thông báo và bài viết CMS | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-cms.png` |
| 26 | `/moderation/ai` | Giám sát và kiểm duyệt AI trợ giảng | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-moderation-ai.png` |
| 27 | `/settings` | Thiết lập thông số vận hành hệ thống | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-settings.png` |
| 28 | `/settings/notifications` | Cấu hình kênh thông báo Resend/Mailpit | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-settings-notifications.png` |
| 29 | `/settings/org` | Thiết lập thông tin tổ chức và thương hiệu | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-settings-org.png` |
| 30 | `/settings/backup` | Giám sát sao lưu tự động và trạng thái PITR | 200 OK (0 5xx) | 0 phát hiện | Không tràn | `playwright-report/artifacts/i07/admin-settings-backup.png` |

---

## 5. Bằng Chứng Thực Nghiệm Quy Trình Tích Hợp Xuyên Suốt (End-to-End Vertical Slices)

### A. Luồng Học Viên: Đăng Ký -> Làm Đề -> Xem Điểm
1. **Đăng ký tài khoản UI**: Học viên nhập thông tin tại `/dang-ky`, form gửi yêu cầu thật đến `/api/v1/auth/sign-up/email`.
2. **Kích hoạt email qua Mailpit**: Hệ thống tạo token kích hoạt, gửi qua SMTP thật tới Mailpit container. Playwright fixture truy vấn Mailpit API trích xuất token kích hoạt hợp lệ.
3. **Xác minh & Đăng nhập**: Học viên truy cập `/xac-minh-email?token=...`, hệ thống xác thực tài khoản và chuyển hướng tới `/dang-nhap`. Đăng nhập thành công thiết lập session cookie trên domain.
4. **Làm đề thi**: Học viên mở `/de-thi`, chọn đề thi N5 `demo-n5-1`, vào phòng thi `/phong-thi?examId=demo-n5-1`, làm bài và chọn đáp án.
5. **Nộp bài & Chấm điểm**: Xác nhận nộp bài qua modal nộp sớm, backend tính điểm theo thuật toán chuẩn hóa, không lộ đáp án trong suốt phiên làm bài.
6. **Xem điểm số**: Học viên được chuyển hướng tới `/ket-qua/[id]`, hiển thị điểm số tổng kết, phân tích từng kỹ năng và trạng thái Đạt/Không đạt.
   - *Artifact screenshot*: `playwright-report/artifacts/i07/i07-student-score-result.png`

### B. Luồng Biên Tập & Xuất Bản: Editor -> Reviewer -> Admin -> Thư Viện Web (Nguyên Tắc 4 Mắt)
1. **Editor nạp gói**: Editor đăng nhập qua 2FA TOTP tại `/login`, truy cập `/imports`, nạp tệp chuẩn hóa `demo-n5-1.zip`. Trình validator TypeScript kiểm tra cấu trúc và tạo tác vụ import thành công. Editor nhấn gửi duyệt (`in_review`).
2. **Reviewer phê duyệt**: Reviewer (tài khoản khác biệt với Editor) đăng nhập qua 2FA TOTP, truy cập `/reviews`, đối chiếu văn bản và cấu trúc đề thi, thực hiện phê duyệt (`approved`).
3. **Admin xuất bản**: Admin đăng nhập, vào `/exams`, thực hiện thao tác xuất bản (`published`).
4. **Hiển thị trực tiếp**: Khách truy cập mở trang thư viện `/de-thi` trên ứng dụng Web thấy đề thi xuất hiện tức thì trong danh sách công khai.

### C. Luồng Quản Trị: Người Dùng & Nhật Ký Kiểm Toán (Audit Trail)
1. **Quản lý người dùng (`/users`)**: Bảng người dùng hiển thị danh sách tài khoản đã đăng ký (bao gồm học viên vừa tạo), thông tin vai trò, trạng thái xác minh email và hoạt động gần nhất.
   - *Artifact screenshot*: `playwright-report/artifacts/i07/i07-admin-users-view.png`
2. **Nhật ký kiểm toán (`/audit-logs`)**: Toàn bộ chuỗi hành động phát sinh từ các luồng trên (đăng nhập nhân sự, xác thực 2FA, nạp gói đề thi, duyệt đề thi, xuất bản đề thi) đều được lưu trữ bất biến trong bảng `audit_logs` kèm định danh tác nhân (actor), loại sự kiện (action), địa chỉ IP và dấu thời gian UTC.
   - *Artifact screenshot*: `playwright-report/artifacts/i07/i07-admin-audit-view.png`

---

## 6. Kết Quả Kiểm Tra Hệ Thống

| Tên lệnh kiểm tra | Kết quả | Ghi chú |
|:---|:---:|:---|
| `pnpm check:no-mock-ui` | **0 lỗi (PASS)** | Baseline rỗng, không có dữ liệu mẫu hoặc mock UI. |
| `pnpm test:e2e:integration` | **82+ passed** | Playwright E2E tích hợp thật toàn bộ các phân hệ. |
| `pnpm lint` | **13 packages OK** | Không vi phạm quy tắc code style và typing. |
| `pnpm typecheck` | **20 packages OK** | TypeScript strict không có lỗi biên dịch. |
| `pnpm test` | **578 unit/integration tests OK** | Toàn bộ các suite kiểm thử nội bộ đạt 100%. |
| `pnpm build` | **12 builds OK** | Next.js và các package biên dịch thành công. |
