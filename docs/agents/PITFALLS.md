# Các bẫy đã gặp

Mỗi bẫy ghi theo dạng triệu chứng → nguyên nhân → cách đúng. **Gặp bẫy mới thì thêm một dòng vào đây trong cùng PR.**

## Code và test

| Triệu chứng | Nguyên nhân | Cách đúng |
|---|---|---|
| Diff phình to, cả file đổi sang nháy kép (#118) | Chạy `prettier --write` (hoặc `pnpm format`) trong khi repo không có cấu hình prettier | Không chạy prettier trên file có sẵn. Giữ nháy đơn như code xung quanh. |
| CI đỏ "expected 8 to be 7" (#119) | Thêm migration mà quên sửa số đếm cứng trong `db.test.ts` | Sửa mọi `toBe(N)` và thêm `toContain('00NN_….sql')`. Xem [DATABASE.md](DATABASE.md). |
| Hai nhánh cùng dùng một số migration | Chọn số mà không xem các PR đang mở | Kiểm tra PR mở trước khi chọn số. Khi rebase thì đổi tên file, sửa `_journal.json` và test đếm. |
| Một export biến mất khỏi gói | Hai file cùng `export` một tên, rồi bị gom lại qua `export *` | Không export trùng tên, nhất là trong `packages/*/src/nlp`. |
| Test i18n đỏ | Thêm key vào chỉ một trong ba file messages | Luôn thêm đủ vi, ja và en. |
| CI đỏ `check:ui-primitives` | Dùng thẻ thô `<button>`, `<input>`, `<select>`, `<textarea>` hoặc `style={{}}` | Dùng component `@jlpt/ui`. |
| CI đỏ `check:no-mock-ui` | Có mảng dữ liệu viết cứng, `ALL_SAMPLE_*` hoặc đăng nhập giả trong code chạy thật | Gọi API thật. Dữ liệu mẫu chỉ được nằm trong test hoặc seed. |
| Subquery đếm sai, luôn ra 0 | Trong `select` của Drizzle, `${table.id}` không kèm tên bảng | Viết rõ `"lexical_entries"."id"` trong `sql\`\``. |
| API báo "Body cannot be empty when content-type is set to 'application/json'" | POST/PUT/PATCH không có body nhưng vẫn đặt `Content-Type: application/json` | Bỏ header, hoặc gửi `{}`. |
| CodeQL báo lỗi mức cao trong test | Regex kiểu `/<!--.*?-->/g` để lọc HTML | Dùng chuỗi cố định với `split/join`, không dùng regex lọc HTML. |
| Test đỏ trên Windows (`python3`, đường dẫn `d:`) | Môi trường Windows | Chạy lại trên Linux (máy ảo hoặc CI). |
| `pnpm test:admin` ở gốc lỗi "setup-i18n" | Script ở gốc trỏ sai file setup | Dùng `pnpm --filter @jlpt/admin test`. |

## E2E (Playwright)

| Triệu chứng | Nguyên nhân | Cách đúng |
|---|---|---|
| "Mã TOTP đã được sử dụng" khi chạy song song | Nhiều trình duyệt dùng chung tài khoản nhân sự | Dùng fixture `tests/playwright/fixtures/staff-auth.fixture.ts`. Không tắt kiểm tra chống dùng lại mã. |
| Lỗi strict mode, locator khớp nhiều phần tử | Selector chung chung hoặc ghép kiểu `a, b` | Dùng `data-testid` cụ thể hoặc `.first()`. |
| Test core sau E2E thấy `sectionIndex` sai (#126) | E2E để lại lượt thi đang mở của học viên mẫu | Trong `afterEach`, nộp bài hoặc dọn trạng thái đã tạo. |
| Test qua ở máy nhưng trượt trên CI | Chờ bằng thời gian cứng, hoặc phụ thuộc kích thước màn hình | Chờ bằng `expect(...).toBeVisible()`, không dùng `waitForTimeout`. |
| E2E "qua" mà tính năng hỏng | Bọc bước nghiệm thu trong `if (isVisible)` hoặc try/catch | Để E2E thất bại khi bước đó không làm được. |
| `window.confirm` tự bị hủy | Playwright tự đóng dialog | Dùng modal của `@jlpt/ui`, hoặc bắt sự kiện `dialog` trong test. |
| Trang tràn ngang trên điện thoại mà đo không ra | `html` và `body` đặt `overflow-x: hidden` | Đo cả `body.scrollWidth`, và chụp màn hình ở 390 px. |

## Dữ liệu tiếng Nhật

| Triệu chứng | Nguyên nhân | Cách đúng |
|---|---|---|
| Từ toàn kana bị đưa vào danh sách duyệt Hán Việt (#121) | Không tách riêng trường hợp "không có chữ Hán" | Không gán độ tin cậy cho từ không có chữ Hán. |
| Chữ Nhật tự tạo (込, 峠) mang "âm Hán Việt" là nghĩa tiếng Việt | Đoán âm | Kokuji để trống, không đoán. |
| Âm Hán Việt sai ở chữ nhiều âm (重要 → TRÙNG YÊU) | Bảng chỉ giữ một âm cho mỗi chữ | Dùng Hán Việt 4 lớp (ngoại lệ theo từ trước). Xem `packages/content-tools/AGENTS.md`. |
| Ký tự lạ U+F9xx/FAxx không khớp chữ thường | Ký tự tương thích CJK | Giữ nguyên ký tự gốc trong dữ liệu. Không chuẩn hóa NFKC. |

## Coordinator và vận hành

| Triệu chứng | Nguyên nhân | Cách đúng |
|---|---|---|
| Hủy task trên coordinator mà worker vẫn chạy | `coordinator cancel` không dừng phiên đang chạy | Dừng tiến trình theo PID. Không dùng `pkill -f` với chuỗi có thể khớp cả lệnh ssh. |
| Task phụ thuộc vào task đã hủy không bao giờ chạy | Coordinator chỉ coi `DONE` là xong | Bỏ task đã hủy khỏi `dependencies` trong `build_docs.py`. |
| `catalog_invalid` sau khi sửa plan | Đầu ra của task nằm ngoài thư mục được phép | Thêm `grants=` cho task. |
| Coordinator không đồng bộ main trong một giờ | Vòng lặp treo | `systemctl restart jlpt-coordinator`. Dịch vụ tự khôi phục phiên. |
| `scp` lên `/tmp` của máy ảo báo "Permission denied" | File cùng tên đã thuộc user khác | Dùng tên file mới. |
