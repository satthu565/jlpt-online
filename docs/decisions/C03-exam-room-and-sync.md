# Quyết định kỹ thuật C03: Phòng thi, khung câu hỏi, đồng hồ và đồng bộ local

- **Task:** C03
- **Worker:** W3 (Giao diện học viên)
- **Trạng thái:** REVIEW
- **Ngày:** 2026-10-16
- **Branch:** `task/C03`
- **Base SHA:** `446102312e04118d57efed43dd77cde696e51281`
- **Dependencies:** F04, F08
- **Feature IDs:** `EXAM-01`, `EXAM-02`, `EXAM-03`, `EXAM-04`, `EXAM-06`, `EXAM-07`, `EXAM-08`, `EXAM-10`, `EXAM-11`, `EXAM-12`, `EXAM-13`, `EXAM-14`, `EXAM-15`, `EXAM-16`, `EXAM-17`, `EXAM-19`, `EXAM-21`, `EXAM-22`
- **Acceptance Criteria:**
  1. Renders ruby underline star table và ảnh không XSS.
  2. Debounce 3 giây max 10s một request đang chờ.
  3. IndexedDB ghi trước gửi; chưa ACK không báo đã lưu.
  4. API giả không đủ điều kiện nghiệm thu cuối (dùng schema validation và typed contract từ `@jlpt/schema`).

---

## 1. Bối cảnh và mục tiêu

Task C03 triển khai toàn bộ giao diện và cơ chế vận hành phòng thi trực tuyến cho học viên theo quy chuẩn JLPT Nhật Bản:
- **EXAM-01 & EXAM-02:** Chọn đề thi theo cấp độ (N1–N5) và chọn chế độ thi (Thi thật tiêu chuẩn bấm giờ nghiêm ngặt hoặc Luyện tập tự do).
- **EXAM-03, EXAM-04, EXAM-06:** Hiển thị hướng dẫn làm bài, cấu trúc thời gian từng phần thi (Từ vựng/Chữ Hán, Ngữ pháp/Đọc hiểu, Nghe hiểu) và cảnh báo quy tắc khóa phần thi không được quay lại.
- **EXAM-07 & EXAM-08:** Bắt đầu thi, đồng bộ lệch thời gian máy chủ (server time offset), đồng hồ đếm ngược với trạng thái cảnh báo 5 phút (vàng) và 1 phút (đỏ nguy cấp).
- **EXAM-10 & EXAM-11:** Hiển thị nội dung câu hỏi và lựa chọn với RichText (hỗ trợ furigana ruby, gạch chân underline, ký hiệu sao star câu ghép câu, bảng biểu table, bài đọc passage). Cho phép chọn, chuyển đổi hoặc hủy chọn đáp án.
- **EXAM-12, EXAM-13, EXAM-14, EXAM-15, EXAM-16:** Điều hướng câu hỏi (trước/sau), danh sách câu hỏi dạng phiếu trả lời (palette), đánh dấu xem lại (flag), phân biệt trực quan trạng thái câu hỏi (đã làm, chưa làm, đánh dấu, đang chọn), hiển thị tiến độ hoàn thành dạng thanh progress bar.
- **EXAM-17:** Cơ chế tự động lưu đáp án (autosave) ngoại tuyến với IndexedDB write-ahead outbox, debounce 3 giây, max wait 10 giây, tối đa 1 request đang gửi (in-flight), chỉ báo trạng thái lưu khi nhận được ACK hợp lệ từ máy chủ.
- **EXAM-19:** Xác nhận trước khi nộp bài sớm, thống kê số lượng câu chưa làm và câu có gắn cờ.
- **EXAM-21:** Phòng chống lộ đáp án: giao diện phòng thi chỉ nhận `PublicExamSnapshot` tuyệt đối không chứa `correctOptionIndex` hay giải thích đáp án.
- **EXAM-22:** Khóa phần thi vĩnh viễn sau khi chuyển sang phần tiếp theo hoặc hết giờ, vô hiệu hóa khả năng sửa đáp án của phần đã qua.

---

## 2. Các quyết định kỹ thuật chính

### 2.1. Kết xuất RichText & Phòng ngừa XSS (Acceptance 1 & EXAM-10)
- **Vị trí bàn giao:** `packages/ui/src/components/rich-text-view.tsx`, `packages/ui/src/components/rich-block-view.tsx`, và export tại sub-path `packages/ui/rich-text/index.ts` lẫn `@jlpt/ui`.
- **Cơ chế kết xuất RichText:**
  - Hỗ trợ đầy đủ định dạng AST phân cấp theo `@jlpt/schema`: text thông thường, `ruby` (`<ruby>` kèm `<rt>`), `underline` (`<u>`), `star` (ký hiệu ngôi sao ★ với `role="img"` và `aria-label="Vị trí dấu sao"`), `blank` (`[ __ ]` với nhãn trợ năng), và `table` (dạng bảng lưới tiêu chuẩn ngữ nghĩa `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`).
  - Hỗ trợ đệ quy (recursive rendering) cho các khối lồng nhau (ví dụ: gạch chân chứa furigana hoặc từ ghép).
- **Phòng chống XSS toàn diện:**
  - Kết xuất hoàn toàn bằng React JSX thuần, không sử dụng `dangerouslySetInnerHTML`, loại trừ nguy cơ tấn công Script Injection / HTML Tag Injection.
  - Hàm `sanitizeUrl`: kiểm tra nghiêm ngặt đường dẫn ảnh, chỉ cho phép các giao thức an toàn (`http:`, `https:`, đường dẫn tương đối bắt đầu bằng `/`).
  - Chặn triệt để và xóa bỏ các URI độc hại dạng `javascript:`, `vbscript:`, hoặc `data:` scripts.

### 2.2. Ghi trước vào IndexedDB & Đồng bộ Outbox (Acceptance 2, 3 & EXAM-17)
- **Vị trí bàn giao:** `apps/web/features/exam/storage/indexeddb.ts`, `apps/web/features/exam/sync/sync-engine.ts`.
- **Nguyên lý Write-Ahead Outbox:**
  - Mọi thao tác chọn/đổi đáp án của học viên đều được ghi ngay lập tức vào IndexedDB (`StoredAttempt` và hàng đợi `OutboxEntry`) trước khi gửi qua mạng.
  - Trạng thái đồng bộ gồm 4 bước rõ ràng: `idle` (sẵn sàng), `saving` (đang lưu), `saved` (đã lưu an toàn), `offline` (mất kết nối, đã lưu cục bộ), `error` (lỗi đồng bộ).
  - **Quy tắc bất biến:** Ứng dụng TUYỆT ĐỐI KHÔNG hiển thị trạng thái "Đã lưu" (`saved`) khi chưa nhận được gói tin ACK (`AnswerSheetAckSchema`) có `clientSeq` tương ứng từ API máy chủ.
- **Chiến lược Debounce 3s và Max Wait 10s:**
  - Khi học viên thao tác, bộ đếm debounce 3.000ms được kích hoạt để gom các thay đổi liên tục.
  - Đồng thời, một mốc thời gian tối đa (max wait 10.000ms) được thiết lập từ thao tác đầu tiên. Ngay cả khi học viên click liên tục làm reset debounce timer, hệ thống vẫn cưỡng chế gửi bản ghi đồng bộ sau tối đa 10s.
- **Tối đa một request in-flight:**
  - Khóa `inFlight` đảm bảo không bao giờ có 2 request đồng bộ đáp án chạy song song.
  - Nếu có thao tác mới trong lúc một request đang gửi, hệ thống đánh dấu `hasPendingChanges = true` và tự động kích hoạt đợt gửi tiếp theo ngay sau khi request trước nhận ACK thành công.
- **Xử lý xung đột Lease (Acceptance 4):**
  - Khi máy chủ trả về mã lỗi `LEASE_INVALID` (409 Conflict - do tài khoản đăng nhập và làm bài ở tab/thiết bị khác), `ExamSyncEngine` lập tức dừng vòng lặp đồng bộ và hiển thị Modal cảnh báo xung đột phiên (`LeaseConflictModal`), ngăn chặn ghi đè dữ liệu sai lệch.

### 2.3. Khung điều khiển phòng thi & Đồng hồ đếm ngược (EXAM-01..08, EXAM-11..16, EXAM-19, EXAM-22)
- **Vị trí bàn giao:** `apps/web/features/exam/components/`, `apps/web/features/exam/hooks/use-countdown-timer.ts`, `apps/web/app/(exam)/phong-thi/page.tsx`.
- **Đồng hồ đếm ngược:**
  - Sử dụng hàm tính toán chính xác `computeClientRemainingMs` từ `@jlpt/exam-engine`, tự động bù trừ độ trễ đồng hồ máy chủ (`serverOffsetMs`).
  - Giao diện có 3 trạng thái màu sắc: Bình thường (xanh lá/xám đậm), Cảnh báo 5 phút (vàng nhạt viền vàng nổi bật), và Khẩn cấp 1 phút (đỏ đậm nhấp nháy, thu hút sự chú ý của thí sinh).
  - Tự động khóa bài và kích hoạt nộp khi hết giờ (`deadline` chạm 0).
- **Thanh phiếu câu hỏi (Palette) & Điều hướng:**
  - Liệt kê toàn bộ câu hỏi theo số thứ tự của đề thi, hiển thị trực quan 4 trạng thái:
    - Đã trả lời: Nền xanh lá có viền đậm.
    - Đang làm (active): Viền xanh dương nổi bật.
    - Đánh dấu xem lại (flagged): Biểu tượng cờ cam.
    - Chưa làm: Nền trung tính.
  - Hỗ trợ phím tắt và nút bấm trợ năng chuyển câu trước / sau mượt mà.
- **Khóa phần thi vĩnh viễn (EXAM-22):**
  - Khi người dùng chủ động bấm "Chuyển sang phần tiếp theo" hoặc phần hiện tại hết giờ, hệ thống mở `SectionTransitionModal` giải thích rõ quy định JLPT: Phần thi đã qua sẽ bị khóa vĩnh viễn và không thể sửa lại đáp án.
  - Khi đã chuyển phần, các câu hỏi thuộc phần cũ hiển thị trạng thái `disabled` và bị cấm chỉnh sửa.
- **Bảo mật đề thi & Zero Answer Leak (EXAM-21):**
  - Mô hình dữ liệu client sử dụng `PublicExamSnapshot` theo hợp đồng F02. Toàn bộ `correctOptionIndex`, `explanation` và `scoreWeights` đều bị loại trừ khỏi dữ liệu giao diện.

### 2.4. Tương thích môi trường đóng gói Next.js Turbopack
- Next.js 16 sử dụng Turbopack mặc định khi build client bundle.
- `@jlpt/schema` có chứa các công cụ phát sinh mã CLI (`contracts/generate-all.ts`) phụ thuộc vào các module hệ thống của Node.js (`fs`, `path`, `module`).
- Giải pháp: Thiết lập `turbopack.resolveAlias` trong `apps/web/next.config.mjs` để định tuyến các import Node builtins sang các file stub an toàn (`apps/web/lib/stubs/`), đồng thời map `@jlpt/exam-engine` sang bản phân phối `dist/index.js`.
- Bằng cách này, `pnpm-lock.yaml` được giữ nguyên vẹn 100% không bị thay đổi, tuân thủ nghiêm ngặt nguyên tắc khóa tài nguyên của dự án.

---

## 3. Bằng chứng kiểm thử và Nghiệm thu

Tất cả các lệnh kiểm tra theo yêu cầu nghiệm thu đều chạy thành công với exit code 0:
1. `pnpm test:exam-ui`: 16/16 tests passed.
   - Kiểm tra đầy đủ: `EXAM-01`, `EXAM-02`, `EXAM-03`, `EXAM-04`, `EXAM-06`, `EXAM-07`, `EXAM-08`, `EXAM-10`, `EXAM-11`, `EXAM-12`, `EXAM-13`, `EXAM-14`, `EXAM-15`, `EXAM-16`, `EXAM-19`, `EXAM-21`, `EXAM-22`.
2. `pnpm test:sync`: 5/5 tests passed.
   - Chứng minh: Debounce 3s, Max wait 10s, 1 request in-flight, ghi IndexedDB trước gửi, không báo đã lưu khi chưa có ACK, xử lý xung đột Lease 409.
3. `pnpm test:rich-text`: 7/7 tests passed.
   - Chứng minh: Ruby furigana, underline, star marker, rich table, passage blocks, và lọc sạch XSS độc hại.
4. `pnpm test:web`: 46/46 tests passed (toàn bộ 6 test suite của ứng dụng web).
5. `pnpm test:a11y`: 20/20 tests passed (13 tests `@jlpt/ui` + 7 tests `@jlpt/web`).
6. `pnpm --filter @jlpt/ui lint && pnpm --filter @jlpt/web lint`: 0 lỗi, 0 cảnh báo.
7. `pnpm --filter @jlpt/web build`: Build thành công, tạo static pages và route `/phong-thi` tối ưu.
