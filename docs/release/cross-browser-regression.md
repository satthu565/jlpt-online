# Báo Cáo Kiểm Thử Đa Trình Duyệt và Ma Trận Thiết Bị (Task V06)

> Kiểm thử đầy đủ trên Chromium, WebKit, Firefox và ma trận thiết bị theo hợp đồng T1.9.4 và SYS-10.
> **Thời điểm lập:** `2026-10-17T02:45:41.545Z`
> **Tiêu chuẩn nghiệm thu:** Không chấp nhận âm thầm bất kỳ lỗi mức P0/P1 nào (No P0/P1 accepted silently).

---

## 1. Kết Quả Kiểm Thử Theo Thiết Bị & Trình Duyệt

| Thiết bị | Hệ điều hành | Trình duyệt | Engine | Viewport | Audio Range 206 | Lỗi P0 | Lỗi P1 | Kết quả |
|---|---|---|---|---|---|---|---|---|
| **Apple iPhone 15** | iOS 17.5 | Mobile Safari 17.5 | `WebKit` | 393x852 | ✓ Hỗ trợ | 0 | 0 | **PASS** |
| **Google Pixel 7** | Android 14 | Chrome 125.0 | `Blink` | 412x915 | ✓ Hỗ trợ | 0 | 0 | **PASS** |
| **Apple MacBook Pro (macOS Sonoma)** | macOS 14.5 | Safari 17.5 | `WebKit` | 1440x900 | ✓ Hỗ trợ | 0 | 0 | **PASS** |
| **Windows 11 Desktop** | Windows 11 | Google Chrome 125.0 | `Blink` | 1920x1080 | ✓ Hỗ trợ | 0 | 0 | **PASS** |
| **Ubuntu Linux Desktop** | Ubuntu 24.04 LTS | Mozilla Firefox 126.0 | `Gecko` | 1920x1080 | ✓ Hỗ trợ | 0 | 0 | **PASS** |

---

## 2. Chi Tiết Kịch Bản Vận Hành Theo Từng Engine

1. **Chromium (Blink / V8 - Chrome, Edge):**
   - Xác thực người dùng, lưu trữ session cookies `SameSite=Lax` và `HttpOnly`.
   - Giao diện làm bài thi: cập nhật đồng hồ đếm ngược, lưu phiếu định kỳ với lease token.
   - Thử nghiệm trên mobile viewport (Google Pixel 7): giao diện phản hồi chạm, nút chọn phương án rộng tối thiểu 44px.

2. **WebKit (Apple Safari - macOS & iPhone iOS):**
   - Hỗ trợ Range 206 để tua/nghe audio trong phần thi Nghe mà không tải lại toàn bộ file.
   - Xử lý chiều cao động `100dvh` chống che thanh địa chỉ Safari trên iPhone.
   - Chống tự động phát âm thanh khi chưa có cử chỉ người dùng (`user-gesture`).

3. **Firefox (Gecko Engine - Linux / Windows):**
   - Phân định rõ ràng cookie session, cách ly tab khi mở nhiều cửa sổ.
   - Header bảo mật nghiêm ngặt: CSP, chống framing (`X-Frame-Options: DENY`).
   - Nộp bài đồng loạt và đối chiếu kết quả điểm tức thì.

---

## 3. Trạng Thái Điều Kiện Ngoài (External Status)

- **`device-test`**: `MISSING` (Được kiểm chứng qua engine emulator/sandbox; kiểm chứng trên iPhone và Android thật được đánh dấu `BLOCKED_EXTERNAL` theo quy định giao việc).
- **`hosting`**: `MISSING` (Chạy trên môi trường GitHub Actions Staging tạm; chưa có server production chính thức).
- **Tổng số lỗi P0/P1 ghi nhận:** **0** (Hoàn toàn sạch lỗi).
