# Quyết định kiến trúc H03: Màn hình "Duyệt Hán Việt" cho từ vựng

## Bối cảnh

Sau khi H01 hoàn thiện việc lưu trữ âm Hán Việt theo từng từ trong từ điển (gồm các mức độ tin cậy `high`, `review`, `kun` và nguồn `rule`, `override`, `manual`), task H03 triển khai giao diện quản trị trong Admin Portal để biên tập viên, kiểm duyệt viên và ban quản trị có thể duyệt, chỉnh sửa tại chỗ và xác nhận đúng các từ vựng cần xem lại.

## Các quyết định kỹ thuật

1. **Định tuyến & Điều hướng**:
   - Màn hình chính đặt tại route `/lexicon/hanviet` (`apps/admin/app/lexicon/hanviet/page.tsx`).
   - Tạo route alias `/hanviet` (`apps/admin/app/hanviet/page.tsx`) tái sử dụng trực tiếp component trang để đảm bảo tương thích mọi đường dẫn truy cập.
   - Thêm mục menu "Duyệt Hán Việt" (khóa dịch `nav.hanviet`) vào nhóm "Nội dung & Biên tập" (`authoring`) trong `apps/admin/lib/navigation.ts`.
   - Quyền truy cập: `admin`, `editor`, `reviewer`. Các vai trò khác (như `student`, `moderator`, `billing_admin`) hoặc khách chưa đăng nhập bị chặn bởi `AdminGuard` (401 chuyển hướng đăng nhập hoặc 403 báo thiếu quyền).

2. **Giao diện & UI Primitives**:
   - Sử dụng 100% component chuẩn từ `@jlpt/ui`: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `Button`, `Input`, `Select`, `Badge`, `Alert`, `Skeleton`.
   - Tuyệt đối không dùng thẻ HTML nguyên bản `<button>`, `<input>`, `<select>`, `<textarea>` (đạt `check:ui-primitives`).
   - Không sử dụng `style={{}}` inline style. Định kiểu toàn bộ bằng utility classes của Tailwind CSS.
   - Bố cục đáp ứng hoàn toàn trên viewports di động (390px) và máy tính (1366px), không gây tràn chiều ngang toàn trang (`overflow-x: hidden`, bảng nằm trong scroll container của `Table`).

3. **Bộ lọc & Danh sách duyệt**:
   - Mặc định mở bộ lọc "Cần xem lại" (`confidence=review`), sắp theo số báo sai giảm dần thông qua API backend `GET /api/v1/admin/lexicon/hanviet`.
   - Cung cấp tùy chọn lọc: Cần xem lại (`review`), Âm Kun (`kun`), Độ tin cậy cao (`high`), Tất cả.
   - Ô tìm kiếm hỗ trợ tra cứu theo từ vựng hoặc cách đọc kana hoặc âm Hán Việt (`q`).

4. **Sửa tại chỗ (In-place Editing) & Xác nhận đúng**:
   - Bấm vào ô Hán Việt hoặc nút "Sửa" để chuyển dòng sang chế độ chỉnh sửa với `Input`.
   - Nút "Lưu": gọi `PATCH /api/v1/admin/lexicon/:id/hanviet` với `{ hanViet }`. Khi thành công, cập nhật ngay dòng hiện tại (độ tin cậy chuyển sang `high`, nguồn đổi thành `manual` / "Người sửa").
   - Nút "Xác nhận đúng": gọi `PATCH /api/v1/admin/lexicon/:id/hanviet` với nguyên âm Hán Việt hiện tại, chuyển độ tin cậy sang `high`.
   - Xử lý lỗi: khi API lỗi (ví dụ 400 hoặc lỗi mạng), hiển thị `Alert` thông báo lỗi rõ ràng và BẢO LƯU nguyên vẹn chuỗi người dùng đang nhập trong ô Input, không làm mất dữ liệu.

5. **Đa ngôn ngữ (Tri-locale i18n)**:
   - Toàn bộ nhãn, tiêu đề, thông báo, cột và trạng thái được khai báo đầy đủ trong 3 file từ điển:
     - Tiếng Việt: `apps/admin/messages/vi.json`
     - Tiếng Nhật: `apps/admin/messages/ja.json`
     - Tiếng Anh: `apps/admin/messages/en.json`
   - Đảm bảo không để lộ key dịch thô (như `hanvietReview.title`) trên bất kỳ ngôn ngữ nào.
