# Quyết định kiến trúc I10: Bỏ tự tạo tài khoản nhân sự khi API khởi động & Hardening Seed Script

## Bối cảnh và Động lực

Trong kiến trúc trước đây, `AuthService` kích hoạt hook vòng đời `onModuleInit` của NestJS để tự động kiểm tra và chèn 5 tài khoản nhân sự (`publisher@jlpt.local`, `billing.admin@jlpt.local`, `editor@jlpt.local`, `reviewer@jlpt.local`, `admin@jlpt.local`) kèm mật khẩu mặc định `Admin123456!` và khóa bí mật TOTP cố định `JBSWY3DPEHPK3PXP` mỗi khi `NODE_ENV !== 'production'`.

Hành vi này tạo ra rủi ro bảo mật nghiêm trọng (cửa hậu tiềm tàng - potential backdoor):
1. **Thiếu biến môi trường hoặc cấu hình sai trên máy chủ thực tế:** Nếu máy chủ production khởi động mà thiếu biến `NODE_ENV=production` (hoặc cấu hình nhầm), API sẽ tự tạo các tài khoản nhân sự toàn quyền với mật khẩu và secret TOTP đã biết trước.
2. **Vi phạm nguyên tắc phân tách môi trường:** Mã nguồn ứng dụng chạy thật (runtime application code) không được phép tự ý sửa đổi cơ sở dữ liệu hoặc nạp dữ liệu kiểm thử khi khởi động.
3. **Mật khẩu và secret TOTP bị viết cứng trong mã nguồn production:** Sự hiện diện của `Admin123456!` và `JBSWY3DPEHPK3PXP` trong `auth.service.ts` vi phạm các tiêu chuẩn bảo mật OWASP ASVS và quy tắc kiểm toán mã nguồn.

---

## Chi tiết Triển khai và Quyết định Thiết kế

### 1. Gỡ bỏ hoàn toàn logic tạo tài khoản khỏi `AuthService` và Vòng đời Khởi động API

- **Bỏ `OnModuleInit`:** Loại bỏ interface `OnModuleInit` và hook `onModuleInit()` khỏi class `AuthService`.
- **Gỡ bỏ các hàm gieo mầm dữ liệu:** Xóa bỏ hoàn toàn phương thức `ensureStaffAccountsSeeded()` và `seedStaffTotp()` khỏi `AuthService`.
- **Khởi động an toàn (Safe Bootstrap):** API khi khởi động với bất kỳ giá trị `NODE_ENV` nào (kể cả `undefined`, `development`, `staging`, `production`, `test`) không thực hiện bất kỳ thao tác tạo mới hoặc cập nhật nào trên các bảng `users`, `accounts`, `user_profiles`, hay `sessions`.
- **Hardening `isDemoToken`:** Trong phương thức `getSession`, điều kiện bypass session cho các token demo cố định (`tok_admin_demo`, v.v.) được thắt chặt: chỉ cho phép khi môi trường không phải production (`APP_ENV !== 'production' && !(NODE_ENV === 'production' && APP_ENV !== 'staging' && APP_ENV !== 'demo')`). Điều này cho phép môi trường Staging/Demo (`APP_ENV=staging`, dù chạy container `NODE_ENV=production`) hoạt động bình thường, trong khi loại trừ triệt để môi trường production thực tế.

### 2. Cách ly Dữ liệu Kiểm thử vào Script Seed Độc lập (`demo-seed.ts`)

- **Chuyển giao trách nhiệm gieo mầm:** Tài khoản nhân sự phục vụ staging và demo chỉ được tạo khi chạy script seed thủ công hoặc qua tiến trình khởi tạo staging (`apps/api/src/modules/import/demo-seed.ts` hoặc `tests/fixtures/seed-sessions.sql`).
- **Bổ sung đủ 5 tài khoản nhân sự trong `demo-seed.ts`:**
  - `0192f000-0000-7000-8000-0000000000b1`: `publisher@jlpt.local` (`admin`)
  - `0192f000-0000-7000-8000-0000000000b2`: `billing.admin@jlpt.local` (`billing_admin`)
  - `0192f000-0000-7000-8000-0000000000e1`: `editor@jlpt.local` (`editor`)
  - `0192f000-0000-7000-8000-0000000000d1`: `reviewer@jlpt.local` (`reviewer`)
  - `0192f000-0000-7000-8000-000000000001`: `admin@jlpt.local` (`admin`)
- **Tạo đầy đủ bản ghi xác thực trong `demo-seed.ts`:**
  - Bản ghi người dùng trong `schema.users`.
  - Bản ghi thông tin xác thực mật khẩu trong `schema.accounts` (hash của mật khẩu staging).
  - Hồ sơ 2FA TOTP trong `schema.userProfiles` với secret `JBSWY3DPEHPK3PXP`.
  - Bản ghi xác thực phiên demo trong `schema.verifications` nếu có phiên demo.

### 3. Cơ chế Khóa Nghiêm ngặt Môi trường Production cho Seed Script (Fail-Closed Production Guard)

- Ngay đầu hàm `runDemoSeed` trong `apps/api/src/modules/import/demo-seed.ts`:
  ```typescript
  const appEnv = (process.env.APP_ENV || '').trim().toLowerCase();
  if (appEnv === 'production') {
    throw new Error('Script seed staging/demo bị từ chối chạy khi APP_ENV=production');
  }
  ```
- Khi script được thực thi dưới dạng CLI (`node dist/src/modules/import/demo-seed.js`), nếu môi trường là production (`APP_ENV=production`), script lập tức bắt lỗi, xuất cảnh báo bảo mật và kết thúc với mã lỗi `exitCode = 1`. Môi trường Staging (vốn thiết lập `APP_ENV=staging` và `NODE_ENV=production` theo quy chuẩn Docker production build) được phép thực thi seed bình thường.

### 4. Kiểm thử Độc lập và Tự chứa (Self-Contained Test Fixtures)

- Trong suite kiểm thử `auth.test.ts`, các bài test yêu cầu đăng nhập nhân sự (ví dụ: test đăng nhập `publisher@jlpt.local` và thử thách TOTP) tự chuẩn bị fixture tài khoản trong khối `beforeAll` của suite kiểm thử, không phụ thuộc vào `AuthService` hay script seed staging.
- Đảm bảo tính cô lập hoàn toàn giữa mã ứng dụng và mã kiểm thử.

---

## Nghiệm thu và Tiêu chí Đạt chuẩn

1. **API khởi động với mọi `NODE_ENV` không tạo hay sửa tài khoản nào:**
   - Đã xây dựng bài kiểm thử tự động khởi tạo API app qua `createApp().init()` với danh sách `NODE_ENV = [undefined, 'development', 'staging', 'production', 'test']`.
   - Đối chiếu số lượng bản ghi trước và sau khi khởi động trên `users`, `accounts`, `user_profiles`: Tất cả đều giữ nguyên 100%.
   - Kiểm tra bằng reflection: Các thuộc tính `onModuleInit`, `ensureStaffAccountsSeeded`, `seedStaffTotp` trên `AuthService` hoàn toàn `undefined`.

2. **Script seed staging từ chối chạy khi `APP_ENV=production`:**
   - Kiểm thử tự động với `APP_ENV=production` và `APP_ENV=PRODUCTION` (case-insensitive). Cả hai đều bị từ chối với ngoại lệ lỗi bảo vệ môi trường.
   - Kiểm tra tương thích Staging: Khi `APP_ENV=staging` và `NODE_ENV=production`, script cho phép thực thi bình thường mà không bị chặn bởi bộ lọc production.
   - Kiểm tra CLI thực tế trên bản build `apps/api/dist/src/modules/import/demo-seed.js` với `APP_ENV=production` trả về `Exit code: 1`.

3. **Grep mật khẩu/secret mặc định trong `apps/api/src` không còn kết quả:**
   - Quét toàn bộ cây thư mục `apps/api/src` (ngoại trừ file test `*.test.ts` và script `*seed*`):
     - `grep -rn "Admin123456!" apps/api/src/ --exclude="*.test.ts" --exclude="*seed*"` -> 0 kết quả.
     - `grep -rn "JBSWY3DPEHPK3PXP" apps/api/src/ --exclude="*.test.ts" --exclude="*seed*"` -> 0 kết quả.
   - Có bài kiểm thử tự động quét toàn bộ cây file mã nguồn trong `apps/api/src` để ngăn chặn tái phạm (regression).

4. **E2E staff login trên staging vẫn pass:**
   - Pipeline CI staging (`staging.yml`) và máy chủ runner (`server-runner.mjs`) thực thi bước nạp seed (`demo-seed.js` và `seed-sessions.sql`) với `APP_ENV=staging`, đảm bảo các tài khoản nhân sự có đầy đủ mật khẩu và 2FA TOTP secret để phục vụ Playwright E2E suite.

5. **Bảo đảm môi trường thực thi kiểm thử và Runner Hardening:**
   - Cập nhật `monorepo-test-runner.ts` và `security-test-runner.ts` tự động gán `TMPDIR=/dev/shm` (hoặc phân vùng tmpfs khả dụng) cho các tiến trình kiểm thử con.
   - Điều này ngăn chặn tình trạng kiểm tra dung lượng đĩa ảo (ví dụ: yêu cầu >= 20% dung lượng trống của `workersCheck` trong bộ điều phối) bị ảnh hưởng bởi biến động dung lượng phân vùng root host, giúp suite `integration/dac-ta-runner.test.ts` và toàn bộ các cổng kiểm thử monorepo chạy ổn định, tất định.
