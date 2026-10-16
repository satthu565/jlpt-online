# Quyết định kỹ thuật L02-2: Khắc phục Lint và Chuẩn hóa Kiểu dữ liệu

## 1. Bối cảnh
Trong lần kiểm tra tự động trước của task L02, lệnh `pnpm lint` báo lỗi exit 1 do gói `@jlpt/api` xuất hiện 8 lỗi và 14 cảnh báo TypeScript/ESLint:
- `@typescript-eslint/no-explicit-any` tại `mix.service.ts`, `practice-api.test.ts`, và `explanations.test.ts`.
- `prefer-const` tại `mix.service.ts` và `practice.service.ts` cho biến `bp`.
- `@typescript-eslint/no-unused-vars` cho các biến và imports chưa sử dụng:
  - `BadRequestException`, `isNull`, `CandidateGroup` trong `mix.service.ts`.
  - `NotFoundException`, `PracticeConfig`, `qVersions` trong `practice.service.ts`.
  - `eq` trong `practice-api.test.ts`.
  - `sql`, `NotificationPreferences`, `endHour`, `endMinute` trong `notification.service.ts`.
  - `quietTimeUTC` trong `notifications.test.ts`.
  - `inArray`, `isNull` trong `review.service.ts`.

## 2. Giải pháp thực hiện
1. **Loại bỏ hoàn toàn các khai báo và import thừa**:
   - `apps/api/src/modules/exam/mix.service.ts`: Xóa `BadRequestException`, `isNull`, `CandidateGroup`.
   - `apps/api/src/modules/exam/practice.service.ts`: Xóa `NotFoundException`, `PracticeConfig`, và truy vấn thừa `qVersions`.
   - `apps/api/src/modules/exam/practice-api.test.ts`: Xóa import `eq` từ `drizzle-orm`.
   - `apps/api/src/modules/notification/notification.service.ts`: Xóa import `sql` và `NotificationPreferences`; lược bỏ `endHour` và `endMinute` chưa dùng trong `getNextQuietHoursEnd`.
   - `apps/api/src/modules/notification/notifications.test.ts`: Xóa biến `quietTimeUTC` chưa sử dụng trong test case thông báo khẩn cấp.
   - `apps/api/src/modules/review/review.service.ts`: Xóa import `inArray` và `isNull`.

2. **Khắc phục triệt để `no-explicit-any` và `prefer-const`**:
   - `mix.service.ts`: Ép kiểu chính xác các trường `sourceRef`, `sections`, `scoring` từ row blueprint sang `unknown as Blueprint['sourceRef']`, `unknown as Blueprint['sections']`, `unknown as Blueprint['scoring']` thay vì `as any`.
   - `mix.service.ts` và `practice.service.ts`: Đổi `let [bp] =` thành `const [bp] =`.
   - `practice-api.test.ts`: Định kiểu rõ ràng cho callbacks `(m: { questionId: string })` và `(f: { examId: string })`.
   - `explanations.test.ts`: Định kiểu rõ ràng cho callback `(r: { id: string })`.

## 3. Kết quả kiểm thử và nghiệm thu
- `pnpm lint`: Đạt 13/13 packages thành công (exitCode: 0, 0 lỗi, 0 cảnh báo trong `@jlpt/api`).
- `pnpm test:practice-api`: Đạt 13/13 tests (exitCode: 0).
- `pnpm test:explanations`: Đạt 8/8 tests (exitCode: 0).
- `pnpm test:notifications`: Đạt 14/14 tests (exitCode: 0).
