# Các bẫy đã gặp

## Audit bị chặn bởi dependency bắc cầu của Wrangler

- **Triệu chứng:** `pnpm audit --audit-level=high` làm CI đỏ dù ứng dụng không nhập `undici` trực tiếp.
- **Nguyên nhân:** phiên bản `miniflare` do Wrangler khóa kéo một bản `undici` có cảnh báo bảo mật mức cao, trong khi Wrangler mới nhất vẫn chưa nâng dependency này.
- **Cách đúng:** dùng `pnpm-workspace.yaml` để override đúng dải phiên bản lỗi lên bản vá tối thiểu; chạy lại `pnpm install --lockfile-only` và `pnpm audit --audit-level=high`. Bỏ override khi upstream đã kéo bản an toàn.

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
| CI đỏ ở bước "Check generated agent docs" | Đổi route, bảng, menu hoặc cờ mà không sinh lại tài liệu | Chạy `pnpm docs:map` rồi commit `docs/agents/*.generated.md`. Gộp main có xung đột trong file này thì chạy lại lệnh, không sửa tay. |
| Nhập gói đề trả 413 | Gói có audio nặng hơn giới hạn tải lên (trước đây 50 MB) | Mặc định nay là 150 MB; tăng `IMPORT_MAX_BYTES` và giới hạn body của proxy (nginx `client_max_body_size`) nếu gói lớn hơn |
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
| Nhập gói N2 báo "dạng mondai không có trong cấu trúc blueprint" | Agent trích xuất gắn `comprehension_long` cho 読解 問題12/13 | N2: 問題12 (văn bản A/B) = `integrated_reading`, 問題13 = `thematic`, 問題14 = `info_retrieval` |
| Nhập lại gói đề vừa xóa thì API trả "idempotent", đề không được tạo lại | `import_jobs` cũ vẫn trỏ tới đề đã xóa, nên gói bị coi là đã nhập | Từ PR này, xóa đề sẽ đánh dấu các job đó `exam_deleted`. Với dữ liệu cũ thì tăng `revision` của gói |
| Nhập gói báo "audio chưa được group khai báo" | Mỗi nhóm câu nghe phải khai báo audio của mình trong `mediaKeys`, `listeningTimeline` không tự gán | Thêm `mediaKey` của timeline vào `mediaKeys` của nhóm tương ứng |
| Nhập gói báo "thiếu tệp import.json ở thư mục gốc" hoặc "file chưa khai báo: BAO_CAO.md" | ZIP đóng gói cả thư mục cha, hoặc đóng gói kèm file báo cáo | Trong ZIP chỉ có `import.json`, `media/`, `sources/` ở thư mục gốc |
| Ký tự lạ U+F9xx/FAxx không khớp chữ thường | Ký tự tương thích CJK | Giữ nguyên ký tự gốc trong dữ liệu. Không chuẩn hóa NFKC. |

## Coordinator và vận hành

| Triệu chứng | Nguyên nhân | Cách đúng |
|---|---|---|
| Hủy task trên coordinator mà worker vẫn chạy | `coordinator cancel` không dừng phiên đang chạy | Dừng tiến trình theo PID. Không dùng `pkill -f` với chuỗi có thể khớp cả lệnh ssh. |
| Task phụ thuộc vào task đã hủy không bao giờ chạy | Coordinator chỉ coi `DONE` là xong | Bỏ task đã hủy khỏi `dependencies` trong `build_docs.py`. |
| `catalog_invalid` sau khi sửa plan | Đầu ra của task nằm ngoài thư mục được phép | Thêm `grants=` cho task. |
| Coordinator không đồng bộ main trong một giờ | Vòng lặp treo | `systemctl restart jlpt-coordinator`. Dịch vụ tự khôi phục phiên. |
| `scp` lên `/tmp` của máy ảo báo "Permission denied" | File cùng tên đã thuộc user khác | Dùng tên file mới. |
# Bổ sung khi làm mới phòng thi ngày 24/10/2026

- Giữ khung cũ nhưng vô tình trả về làm từng câu → hiểu “chỉ nâng cấp nội dung” là giữ luôn component câu hỏi đơn → theo ảnh khoanh đỏ, giữ header/tab/toolbar/footer và thay toàn bộ workspace ở giữa bằng cuốn đề nhiều câu + phiếu tô; cần test đồng thời khung cũ và nhiều câu.
- Test phòng thi đôi lúc không tìm thấy demo-n5-1 trên một trình duyệt → I03 ở trình duyệt khác đang tạm gỡ xuất bản đề chung để kiểm tra publish → poll API đọc với thời hạn rõ ràng để chờ đề trở lại; không xuất bản hộ, không thay dữ liệu, không bỏ qua test.

- Đồng hồ đứng ở thời gian ban đầu → tính lại độ lệch từ cùng một `serverNow` ở mỗi tick khiến thời gian trôi bị triệt tiêu → chụp mốc client và server khi nhận phản hồi, sau đó trừ thời gian đã trôi tại client.
- Đồng hồ và phiếu không bám khi cuộn → `overflow-x: hidden` trên tổ tiên tạo vùng cuộn khác với viewport → trong phiên thi dùng `overflow-x: clip` và kiểm tra thực tế cả header lẫn phiếu sau khi cuộn.
- Nhiều thao tác nhanh có outbox trùng seq hoặc sai snapshot → đọc lại seq và answers sau một lần await ghi storage → chụp snapshot cùng seq trước await và tuần tự hóa ghi.
- Khách tạo được lượt nhưng không lưu hoặc mở lại được → mỗi request không có guest cookie bị gán ID khách mới → tạo guest identity ổn định trước request của luồng làm bài.
- Sau resume, bài vừa sửa bị máy chủ bỏ qua hoặc đồng hồ bị đặt lại → không truyền `lastSeq` và deadline từ phản hồi resume vào phòng thi → giữ mốc server và chỉ phục hồi phần chưa ACK trên phần đang được phép làm.
- Có số 0 lẻ trước câu không có đoạn đọc → dùng `array.length && <Component />` trong JSX → chuyển điều kiện độ dài thành boolean trước khi render.

## HeroUI React trong phòng thi

- Component hiện ra nhưng thiếu giao diện hoặc modal không thấy → chỉ import một phần `@heroui/styles` → import CSS chính thức tương ứng với từng component trong `apps/web/app/globals.css`, không dựng lại giao diện bằng CSS riêng.
- TypeScript báo HeroUI không export component có thật → khai báo thư viện có đường dẫn không kèm extension khi chạy NodeNext → package UI dùng `module: ESNext` và `moduleResolution: Bundler` phù hợp tsup/Next.
- Playwright không click được radio → input native được ẩn để dùng control có nhãn → click `.radio__content` hiển thị rồi xác minh input bằng `toBeChecked()`. Không ép click hoặc sửa kiểu dáng thư viện để test qua.
- Safari không mở ghi nháp khi quay lại câu khác trong luyện tập → cập nhật câu đang chọn ở pointerdown làm cảnh báo nhịp xuất hiện, đẩy nút xuống trước pointerup và hủy press → kích hoạt câu sau click; chỉ cập nhật từ focus khi dùng bàn phím (`:focus-visible`). Dùng `onPress` cho thao tác HeroUI; xác minh bằng WebKit thật.
- Bấm Esc đóng khung tra từ nhưng khung mở lại ngay → tác vụ debounce selectionchange 300ms vẫn chạy sau tác vụ mouseup 10ms → hủy cả hai tác vụ khi đóng hoặc đổi câu; kiểm tra khung vẫn đóng sau thời hạn debounce.

## Cấu hình API cho bản xem thử LAN

Triệu chứng: tạo lượt làm bằng request không có Origin được, nhưng trình duyệt qua IP LAN bị CSRF từ chối. Nguyên nhân: bản build đang chạy có rewrite API về 127.0.0.1:4000; một lệnh build khác trong cùng checkout có thể ghi lại routes-manifest với cấu hình mặc định. Cách đúng: hoàn tất các lệnh kiểm tra có build trước, sau đó build bản preview với API_INTERNAL_URL phù hợp; truyền cấu hình tương ứng khi khởi động và kiểm tra cả request ghi từ Origin LAN. Không bỏ OriginGuard để xử lý lỗi proxy.
