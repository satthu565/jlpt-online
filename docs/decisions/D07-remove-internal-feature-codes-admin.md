# Quyết định kỹ thuật D07: Admin - Bỏ mã tính năng nội bộ khỏi giao diện

- **Mã task**: D07
- **Phụ trách**: W4 (Quản trị báo cáo và thương mại)
- **Ngày**: 2026-10-20
- **Nhánh**: `task/D07`
- **Khóa tài nguyên**: Theo quyền sở hữu worker W4
- **Phụ thuộc**: `D03` (Admin dùng thống nhất `@jlpt/ui`)

---

## 1. Bối cảnh và yêu cầu

Theo kế hoạch triển khai Ngày 9 (`KE_HOACH_TRIEN_KHAI.md` mục D07):
- **Bỏ mã tính năng nội bộ**: Loại bỏ toàn bộ các mã dạng `(ADM-01)`, `(ADM-09)`, `(ADM-10)`, `(ADM-11)`, `(ADM-12)`, `(ADM-13)`, `(ADM-17)`, `(ADM-18)`, `(PDF-30)`, v.v. khỏi tiêu đề trang, nhãn giao diện, và chuỗi bản dịch trên 3 ngôn ngữ (`vi`, `ja`, `en`). Mã tính năng chỉ được phép xuất hiện trong `data-testid`, chú thích mã nguồn (`comments`), hoặc file kiểm thử (`tests`).
- **Thẻ chức năng Dashboard**: Sử dụng thành phần `Card` của `@jlpt/ui` và `Link` (`next/link`), căn chỉnh hiệu ứng hover chỉ gạch chân tiêu đề liên kết, không gạch chân toàn bộ khối văn bản mô tả.
- **Cập nhật Test suite**: Chuyển các câu lệnh assert trong kiểm thử đơn vị và E2E từ so khớp chuỗi chứa mã sang kiểm tra `data-testid` tương ứng (`data-testid="page-title"`).
- **Tích hợp kiểm tra tự động**: Bổ sung cổng kiểm tra vào lệnh `pnpm check:no-mock-ui`: tự động phát hiện và chặn nếu chuỗi dịch (JSON) hoặc JSX text chứa mẫu `\([A-Z]{2,5}-\d{2,3}\)`.
- **Tiêu chuẩn nghiệm thu**:
  1. Không trang quản trị nào hiện mã dạng `(ADM-01)` ở cả 3 ngôn ngữ `vi`, `ja`, `en`.
  2. Bố cục đáp ứng hoàn hảo trên thiết bị di động (390px) và màn hình máy tính (1366px), không cuộn ngang (`scrollWidth <= clientWidth + 1`).
  3. Tất cả các cổng kiểm thử và kiểm tra chất lượng staging CI (`pnpm test:admin`, `pnpm check:no-mock-ui`, `sudo -n /usr/local/bin/jlpt-stage-test check`) đạt 100%.

---

## 2. Chi tiết triển khai

### 2.1. Loại bỏ mã tính năng nội bộ khỏi chuỗi dịch (i18n)
Đã chuẩn hóa toàn bộ file ngôn ngữ:
- `apps/admin/messages/vi.json`
- `apps/admin/messages/ja.json`
- `apps/admin/messages/en.json`

Cụ thể:
- `reports.hubTitle`: Bỏ `(ADM-17)`
- `contentReports.title`: Bỏ `(ADM-09)`
- `content.mixedExams.title`: Bỏ `(ADM-11)`
- `content.explanationReviews.title`: Bỏ `(ADM-10)`
- `content.vocab.title`: Bỏ `(ADM-12)`
- `content.cms.title`: Bỏ `(ADM-13)`
- `content.questions.csvToolTitle`: Bỏ `(PDF-30)`
- Tiêu đề Dashboard trong `apps/admin/app/page.tsx`: Bỏ `(ADM-01)`

### 2.2. Chuẩn hóa thẻ chức năng Dashboard (`apps/admin/app/page.tsx`)
Thay thế thẻ `<a>` bao trọn bằng thành phần `<Card>` của `@jlpt/ui`:
- Tiêu đề được bọc bằng `<Link>` từ `next/link` với class `hover:underline`.
- Nút mũi tên điều hướng là link độc lập.
- Đoạn văn bản mô tả nằm trong thẻ `<p>` độc lập, loại bỏ hiện tượng gạch chân toàn bộ chữ khi hover chuột.

### 2.3. Bổ sung `data-testid="page-title"` thống nhất
Bổ sung thuộc tính `data-testid="page-title"` cho tiêu đề `<h1>` của các trang quản trị:
- `apps/admin/app/page.tsx`
- `apps/admin/app/reviews/explanations/page.tsx`
- `apps/admin/app/exams/mixed/page.tsx`
- `apps/admin/app/vocab/page.tsx`
- `apps/admin/app/cms/page.tsx`
- `apps/admin/app/moderation/ai/page.tsx`
- `apps/admin/app/settings/org/page.tsx`

### 2.4. Cập nhật kiểm thử sang `data-testid`
- `apps/admin/tests/admin-full.test.tsx`: Cập nhật các trường hợp kiểm thử ADM-01, ADM-09, ADM-10, ADM-11, ADM-12, ADM-13, ADM-17, ADM-18 sang kiểm tra `data-testid="page-title"`.
- `apps/admin/tests/i09-real-auth-api.test.tsx`: Cập nhật assert tiêu đề Dashboard sang `data-testid="page-title"` và chuỗi tiêu đề không chứa `(ADM-01)`.

### 2.5. Tích hợp kiểm tra tự động `check:no-mock-ui`
Tạo script `apps/admin/scripts/check-no-internal-codes.ts` và gắn vào chuỗi lệnh `check:no-mock-ui` trong `package.json`:
- Quét toàn bộ chuỗi dịch trong `apps/admin/messages/`.
- Quét mã nguồn giao diện trong `apps/admin/app/`, `apps/admin/features/`, `apps/admin/components/`.
- Cho phép mã tính năng trong `data-testid`, chú thích (`//`, `/*`, `{/* */}`) và các file test (`*.test.*`, `*.spec.*`).
- Bổ sung bộ kiểm thử đơn vị `apps/admin/tests/check-no-internal-codes.test.ts` (4/4 tests passed).

---

## 3. Kết quả nghiệm thu

1. **`pnpm test:admin`**:
   - 19/19 test files đạt (215 tests passed 100%).
2. **`pnpm check:no-mock-ui`**:
   - Quét dữ liệu mẫu mock UI: 0 vi phạm mới.
   - Quét mã tính năng nội bộ: 0 vi phạm (100% sạch).
3. **Cổng kiểm tra chất lượng chung**:
   - `pnpm lint`: Đạt (0 errors).
   - `pnpm typecheck`: Đạt (0 errors).
   - `pnpm test`: Đạt (100% test toàn monorepo passed).
   - `pnpm build`: Đạt (FULL TURBO, 12 packages build thành công).
