# Quyết Định Kỹ Thuật (I07): Xử Lý Hộp Thoại Xác Nhận Trong Quy Trình Xuất Bản Đề Thi E2E (I07-AC3) & Ổn Định Điều Hướng Phòng Thi

> **Mã công việc:** I07 — Nghiệm thu tích hợp toàn bộ và khóa chặn dữ liệu giả  
> **Người thực hiện:** W6 (Hạ tầng CI và kiểm chứng)  
> **Ngày quyết định:** 2026-10-20  
> **Trạng thái:** ĐÃ ÁP DỤNG (APPLIED)

---

## 1. Ngữ Cảnh & Vấn Đề

Tại lượt chạy CI trên GitHub (bước `Staging Verification & PITR Drill - Run Playwright Real API Integration Suite (I00)`), test suite I07 ghi nhận 54 test PASS và 1 test FAIL:
```
[chromium] › tests/playwright/integration.spec.ts:3662:3 › Platform Full Scope Integration & Zero Mock Gate Suite (I07) › I07-AC3: E2E Full vertical slice: Student registers -> takes exam -> sees score; Editor imports -> Reviewer approves -> Admin publishes; Admin inspects Users & Audit logs on staging
```

Khi phân tích lịch sử thay đổi:
1. **Hộp thoại xác nhận xuất bản**:
   - PR #95 (commit `fe67aa3`) đã hợp nhất tính năng "Admin 'Duyệt & xuất bản' cả đề bằng một thao tác" (`approve-and-publish`), thay thế nút "Xuất bản" thành "Duyệt & xuất bản".
   - Thao tác này kích hoạt hộp thoại xác nhận gốc trình duyệt (`window.confirm`) trước khi gửi request:
     ```typescript
     if (
       typeof window !== 'undefined' &&
       typeof window.confirm === 'function' &&
       !window.confirm(`Duyệt toàn bộ câu hỏi và xuất bản "${exam.title}"? Thao tác được ghi vào nhật ký kiểm toán.`)
     ) {
       return;
     }
     ```
   - Mặc định trong Playwright, mọi hộp thoại trình duyệt (`dialog`) đều bị tự động hủy bỏ (dismiss / cancel) nếu không có listener đăng ký xử lý. Khi bị hủy, `window.confirm` trả về `false`, hàm `handlePublish` lập tức thoát mà không gửi request API và không hiển thị thông báo trạng thái `[data-testid="status-alert"]`.
   - Trong test I03 (dòng 1540), PR #95 đã bổ sung:
     ```typescript
     adminPage.once('dialog', (dialog) => void dialog.accept());
     ```
     tuy nhiên test I07-AC3 (dòng 3867) chưa được cập nhật bộ lắng nghe tương ứng, dẫn tới việc test chờ thông báo `status-alert` bị timeout và trượt trên CI staging.

2. **Đồng bộ hóa mở phòng thi trên thiết bị di động (Mobile Safari)**:
   - Các kịch bản mở phòng thi (`/phong-thi?examId=demo-n5-1`) trước đó đặt thời gian chờ `modalBtn.waitFor({ state: 'visible', timeout: 5000 })` quá ngắn so với độ trễ hydration trên viewports di động (Mobile Safari), dẫn đến việc rơi vào khối `catch` và tìm `exam-card-start-btn` vốn không tồn tại trên trang phòng thi độc lập.

---

## 2. Quyết Định

1. Bổ sung handler `adminPage.once('dialog', (dialog) => void dialog.accept())` ngay trước thao tác `publishBtn.click()` trong kịch bản `I07-AC3` tại `tests/playwright/integration.spec.ts`.
   ```typescript
   const publishBtn = demoExamRow.locator('button[data-testid^="publish-exam-btn-"]').first();
   await expect(publishBtn).toBeVisible({ timeout: 15000 });
   // "Duyệt & xuất bản" asks for confirmation; Playwright dismisses dialogs unless told otherwise.
   adminPage.once('dialog', (dialog) => void dialog.accept());
   await publishBtn.click();
   await expect(adminPage.locator('[data-testid="status-alert"]').first()).toBeVisible({ timeout: 15000 });
   ```

2. Chuẩn hóa cơ chế điều hướng phòng thi tại các bước (I05, P04, I07): sử dụng `waitUntil: 'domcontentloaded'`, tăng timeout kiểm tra nút bắt đầu phòng thi lên 10000ms và bọc kiểm tra `cardBtn` bằng `isVisible().catch(() => false)` an toàn không ném lỗi unhandled locator timeout.

---

## 3. Tác Động & Kiểm Chứng

- **Tính toàn vẹn của test**: Kịch bản E2E kiểm chứng đúng hành vi người dùng thật trên môi trường staging — chấp nhận xác nhận duyệt & xuất bản, gọi API thật `POST /api/v1/admin/exams/:id/approve-and-publish`, nhận thông báo thành công và ghi log kiểm toán.
- **Phạm vi tác động**: Chỉ điều chỉnh tệp `tests/playwright/integration.spec.ts` và bổ sung tài liệu quyết định thuộc danh mục `allowedPaths` của W6.
- **Tiêu chuẩn chất lượng**:
  - Không phá vỡ bất kỳ quy tắc nào trong `AGENTS.md`.
  - Toàn bộ suite I07-AC1, I07-AC2 (59 trang web & admin), I07-AC3 đều đạt PASS 100% trên staging thật.
