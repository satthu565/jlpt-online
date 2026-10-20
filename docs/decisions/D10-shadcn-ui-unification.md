# Quyết định kỹ thuật D10: Chuẩn hóa giao diện Web theo shadcn/ui cho Tài khoản, Gói học, Lớp học, Cộng đồng

- **Mã task**: D10
- **Mã phân công**: D10-1
- **Phụ trách**: W3 (Giao diện học viên)
- **Ngày**: 2026-10-20
- **Nhánh**: `task/D10`
- **Khóa tài nguyên**: Không
- **Phụ thuộc**: D02, D07 (Đã merge)

---

## 1. Bối cảnh và Mục tiêu

Theo kế hoạch triển khai Ngày 9 (`KE_HOACH_TRIEN_KHAI.md` mục D10) và chỉ thị kiến trúc:
1. **Chuẩn hóa toàn diện theo shadcn/ui**:
   - Sử dụng bảng màu trung tính (`neutral/slate`), các thành phần cốt lõi của `@jlpt/ui` (`Card`, `Tabs`, `Select`, `Dialog`, `Table`, `Badge`, `Skeleton`, `PageHeader`, `EmptyState`).
   - Khoảng cách và cỡ chữ tuân thủ chặt chẽ thang đo Tailwind CSS (`text-xs`, `text-sm`, `p-4`, `p-6`, `gap-3`, `gap-6`...).
   - Tuyệt đối dùng icon vector chuẩn từ `lucide-react`, không dùng emoji làm biểu tượng giao diện.
2. **Loại bỏ triệt để `style={{}}` viết tay**:
   - Loại bỏ 346 trường hợp viết inline style viết tay trong toàn bộ phạm vi task.
   - Chỉ cho phép giá trị tính lúc chạy (như tỷ lệ phần trăm thanh tiến độ đóng góp nguồn đề) kèm chú thích `ui-allow-style`.
3. **Thống nhất thành phần trạng thái chung**:
   - Sử dụng `PageHeader` (`@jlpt/ui/components/page-header`) cho tiêu đề trang.
   - Sử dụng `EmptyState` (`@jlpt/ui/components/empty-state`) cho trạng thái đang tải (loading), dữ liệu trống (empty) và lỗi (error).
   - Nhập khẩu thành phần `@jlpt/ui` theo từng tệp riêng biệt (`@jlpt/ui/components/button`, `@jlpt/ui/components/table`...), không qua barrel import.
4. **Bảo toàn hợp đồng chức năng**:
   - Không đổi hành vi route, logic ứng dụng, `data-testid`, API request/response.
   - Chụp ảnh kiểm chứng trước/sau (before/after) ở cả hai độ phân giải 390px (mobile) và 1366px (desktop).

---

## 2. Chi tiết thực hiện

### 2.1. Bổ sung Primitive Table vào `@jlpt/ui`
- Tạo mới `packages/ui/src/components/table.tsx` theo chuẩn shadcn/ui gồm các thành phần:
  - `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`.
  - Hỗ trợ đầy đủ ngữ nghĩa HTML table tiêu chuẩn, responsive overflow container (`relative w-full overflow-auto`), tokens màu nền và viền đồng bộ với design system.
  - Xuất bản trong `packages/ui/src/index.tsx` và build bundle thành công (`pnpm --filter @jlpt/ui build`).

### 2.2. Xóa bỏ toàn bộ inline styles và chuyển đổi sang `@jlpt/ui`

#### Nhóm Tài khoản & Cài đặt (`apps/web/app/(account)/`, `apps/web/features/account/`)
- `apps/web/app/(account)/tai-khoan/page.tsx`: Xóa 35 inline styles, áp dụng `PageHeader`, `EmptyState`, Lucide icons.
- `apps/web/app/(account)/lich-su/page.tsx`: Loại bỏ emoji, tích hợp `PageHeader`, `EmptyState`.
- `apps/web/features/account/notification-settings.tsx`: Xóa 21 inline styles, chuyển đổi sang Tailwind switch and toggles.
- `apps/web/features/account/privacy-settings.tsx`: Xóa 12 inline styles, dùng Lucide icons.

#### Nhóm Gói học & Thanh toán (`apps/web/app/(billing)/`, `apps/web/features/billing/`)
- `apps/web/app/(billing)/goi-thanh-vien/page.tsx`: Xóa 13 inline styles, tích hợp `PageHeader`, `EmptyState`.
- `apps/web/features/billing/components/pricing-table.tsx`: Xóa 20 inline styles, dùng Lucide `Check`.
- `apps/web/features/billing/components/checkout-card.tsx`: Xóa 14 inline styles, dùng Lucide `Lock`.
- `apps/web/features/billing/components/coupon-input.tsx`: Xóa 6 inline styles, dùng Lucide `Tag`, `X`.
- `apps/web/features/billing/components/subscription-status-card.tsx`: Xóa 7 inline styles, dùng Lucide icons.
- `apps/web/features/billing/components/transaction-history-card.tsx`: Xóa 20 inline styles, chuyển sang `@jlpt/ui/components/table`.

#### Nhóm Lớp học (`apps/web/app/(classroom)/`, `apps/web/features/classroom/`)
- `apps/web/app/(classroom)/lop-hoc/page.tsx`: Xóa 19 inline styles, tích hợp `PageHeader`, `EmptyState`, Lucide `KeyRound`, `School`.
- `apps/web/features/classroom/components/classroom-dashboard.tsx`: Xóa 28 inline styles, chuyển bảng học viên sang `@jlpt/ui/components/table`.
- `apps/web/features/classroom/components/assignment-progress-view.tsx`: Xóa 34 inline styles, chuyển bảng tiến độ sang `@jlpt/ui/components/table`.
- `apps/web/features/classroom/components/cohort-privacy-badge.tsx`: Xóa inline style, dùng Lucide `Lock`.
- `apps/web/features/classroom/components/create-assignment-modal.tsx`: Xóa 11 inline styles.
- `apps/web/features/classroom/components/grade-export-modal.tsx`: Xóa 11 inline styles.

#### Nhóm Cộng đồng & Thảo luận (`apps/web/app/(community)/`, `apps/web/features/community/`)
- `apps/web/app/(community)/thao-luan/page.tsx`: Xóa 19 inline styles, tích hợp `PageHeader`, `EmptyState`, Lucide `Search`.
- `apps/web/app/(community)/su-kien/page.tsx`: Xóa 13 inline styles, tích hợp `PageHeader`, `EmptyState`, Lucide `Trophy`.
- `apps/web/features/community/components/achievement-share-card.tsx`: Xóa 9 inline styles, dùng Lucide icons.
- `apps/web/features/community/components/exam-event-lobby.tsx`: Xóa 26 inline styles, chuyển bảng xếp hạng sang `@jlpt/ui/components/table`, dùng Lucide `Medal`.
- `apps/web/features/community/components/question-discussions.tsx`: Xóa 24 inline styles, tích hợp `EmptyState`, Lucide icons.

#### Nhóm Chia sẻ kết quả & Đề thi (`apps/web/app/(share)/`)
- `apps/web/app/(share)/chia-se/ket-qua/[id]/page.tsx`: Xóa inline style, dùng Lucide icons.
- `apps/web/app/(share)/shared-exams/[token]/page.tsx`: Tích hợp `PageHeader`, `EmptyState`, Lucide icons.

#### Nhóm Lời giải & Dẫn chứng (`apps/web/features/explanations/`)
- `apps/web/features/explanations/components/explanation-view.tsx`: Thay emoji bằng Lucide `Check`, `Flag`, `Lightbulb`, `BookOpen`, `Languages`.
- `apps/web/features/explanations/components/question-report-modal.tsx`: Dùng Lucide `CheckCircle2`.
- `apps/web/features/explanations/components/transcript-view.tsx`: Thay emoji bằng Lucide `Lock`, `Headphones`, `Play`.
- `apps/web/features/explanations/components/question-bookmark-button.tsx`: Thay emoji bằng Lucide `Bookmark`, `BookmarkCheck`.

#### Nhóm Huy hiệu & Gamification (`apps/web/features/gamification/`)
- `apps/web/features/gamification/components/gamification-dashboard.tsx`: Xóa inline style `style={{ fontSize: '2.5rem' }}`, thay toàn bộ emoji bằng Lucide `Flame`, `Check`, `Pin`, `Trophy`, `Medal`, `Share2`, `Target`, `BarChart2`.

#### Nhóm Trợ lý AI (`apps/web/features/ai/`)
- `apps/web/features/ai/components/ai-chat-assistant.tsx`: Thay toàn bộ emoji bằng Lucide `Bot`, `Sparkles`, `Search`, `Info`, `AlertTriangle`.

#### Nhóm Sinh đề trộn (`apps/web/features/mix/`)
- `apps/web/features/mix/components/generated-exam-card.tsx`: Thêm chú thích `/* ui-allow-style: runtime computed progress bar percentage */` cho giá trị width động, thay emoji bằng Lucide `Check`, `Share2`, `RefreshCw`.
- `apps/web/features/mix/components/mix-generator.tsx`: Thay emoji 7 chế độ sinh đề và các nút bấm bằng Lucide `Dices`, `Scale`, `Target`, `Sparkles`, `Flame`, `RotateCcw`, `Sliders`, `Rocket`.
- `apps/web/features/mix/components/mix-shortage-notice.tsx`: Dùng Lucide `AlertTriangle`.
- `apps/web/features/mix/components/quick-mix-card.tsx`: Dùng Lucide `Zap`.

---

## 3. Kết quả nghiệm thu

1. **Inline style audit**:
   - Tổng số inline style viết tay trong phạm vi D10: **0**.
   - Giá trị duy nhất tính lúc chạy là thanh tiến độ được chú thích hợp lệ: `/* ui-allow-style: runtime computed progress bar percentage */`.
2. **Primitive & Mock audits**:
   - `pnpm check:ui-primitives`: ĐẠT (exitCode 0, apps/web giữ vững 0 vi phạm).
   - `pnpm check:no-mock-ui`: ĐẠT (exitCode 0, 0 vi phạm mới).
3. **Tests & Build gates**:
   - `pnpm test:web`: 21 test files, 267 tests PASSED (exitCode 0).
   - `pnpm typecheck`: 20 packages PASSED (exitCode 0).
   - `pnpm lint`: 13 packages PASSED (exitCode 0).
   - `sudo -n /usr/local/bin/jlpt-stage-test check`: ĐẠT (PASS sau 1149s).
4. **Bộ ảnh đối sánh Trước / Sau (390px & 1366px)**:
   - Toàn bộ 14 ảnh before và 14 ảnh after đã được chụp và lưu tại `docs/release/screenshots/`.
   - Bảng tổng hợp đối sánh chi tiết tại `docs/release/D10-ui-screenshots.md`.
