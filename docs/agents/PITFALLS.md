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
| Nhập revision mới có thêm/bớt câu nhưng số lượng và thứ tự đề không đổi | Importer chỉ thêm version nội dung; `exams` và `exam_items` cũ không được cập nhật, ID item theo vị trí còn va chạm | Với gói ready revision cao hơn, cập nhật metadata và xây lại toàn bộ `exam_items` trong transaction; giữ nguyên `publishedVersion` và snapshot cũ. Gói draft không được thay cấu trúc đề đang xuất bản. |
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

## Cấu hình API cho bản xem thử LAN

Triệu chứng: tạo lượt làm bằng request không có Origin được, nhưng trình duyệt qua IP LAN bị CSRF từ chối. Nguyên nhân: bản build đang chạy có rewrite API về 127.0.0.1:4000; một lệnh build khác trong cùng checkout có thể ghi lại routes-manifest với cấu hình mặc định. Cách đúng: hoàn tất các lệnh kiểm tra có build trước, sau đó build bản preview với API_INTERNAL_URL phù hợp; truyền cấu hình tương ứng khi khởi động và kiểm tra cả request ghi từ Origin LAN. Không bỏ OriginGuard để xử lý lỗi proxy.

## Quy trình sửa và triển khai trên jlpt-vm

| Triệu chứng | Nguyên nhân | Cách đúng |
|---|---|---|
| Code đang chạy ở :3000 không có trong git, lệch `main` hơn 150 file | Sửa trong thư mục copy (`meaning-sections-…`, `paper-…`) rồi cho service trỏ vào đó | Chỉ sửa trong worktree git, xem thử bằng :3210, deploy từ `main`. Xem [DEV_WORKFLOW.md](DEV_WORKFLOW.md). |
| PR tự merge dù chủ dự án chưa xem | `auto-merge.yml` bật lại auto-merge sau mỗi lần push | `gh pr merge <số> --disable-auto` sau mỗi lần push, rồi kiểm tra `autoMergeRequest` là null. |
| `git push` bị từ chối "refusing to allow an OAuth App to create or update workflow … without `workflow` scope" | Token `gh` trên VM không có scope `workflow` | Không tự xin thêm quyền. Báo chủ dự án, hoặc làm cách khác (ví dụ in log chẩn đoán trong test thay vì sửa workflow). |
| Playwright treo đến hết timeout của test, chỉ thấy lỗi ở bước cuối (`finally`) | Click và `expect` không có timeout riêng; bước chờ một phần tử đã đổi tên hoặc bị bỏ cứ chờ mãi | Đặt `test.use({ actionTimeout: 20000 })`. Chạy thử test ngay trên VM (`pnpm exec playwright test integration.spec.ts -g "<tên>" --project=chromium`, trỏ `PLAYWRIGHT_BASE_URL` vào :3210) thay vì đợi vòng CI 30 phút. |
| `locator.isVisible({ timeout })` trả false ngay dù phần tử hiện sau đó | `isVisible` bỏ qua timeout | Dùng `locator.waitFor({ state: visible, timeout })`. |
| Mở `/phong-thi?attemptId=…` hoặc tải lại trang thì kịch bản không thấy câu hỏi | Trang hỏi "Tiếp tục bài làm tại cửa sổ này?" trước khi vào phòng thi | Bấm `confirm-resume-attempt` (helper `confirmResumeIfShown` trong `tests/playwright/exam-content-journey.ts`), kể cả sau `page.reload()`. |
| Thao tác ghi (tạo lượt thi, nộp bài) trên một cổng xem thử bị 403 "Origin không khớp host" | Cổng đó chạy Next trực tiếp, API nhận Host `127.0.0.1:4000` | Đặt nginx phía trước và giữ `proxy_set_header Host $http_host` cho `/api/` (như :3000 và :3210). |
| `pkill -f "<mẫu>"` trong lệnh `ssh jlpt-vm …` làm đứt phiên | Mẫu khớp cả dòng lệnh của chính phiên ssh | Dừng theo PID (`ss -ltnp "sport = :<cổng>"` để tìm PID) hoặc `systemctl stop`. |
| `jlpt-preview-update` ghi "API BUILD FAILED", `claude-stage-check` lỗi ở `pnpm install` | Trong lúc `docker build`, container không phân giải được DNS (`getaddrinfo EAI_AGAIN registry.npmjs.org`), dù máy chủ vào mạng bình thường | Dựng với `docker build --network=host` (script `tools/ops/vm/build-api-image.sh`). Chưa sửa timer và `claude-stage-check` để dùng cờ này. |

## Giao diện và triển khai (11/2026)

| Triệu chứng | Nguyên nhân | Cách đúng |
|---|---|---|
| Chữ trên nút dạng thẻ `<a>` (ví dụ `bg-blue-600 text-white`) mất màu, chữ navy trên nền navy | Quy tắc màu liên kết viết ngoài `@layer`; CSS ngoài layer luôn thắng CSS trong layer, kể cả class tiện ích Tailwind | Đặt quy tắc mặc định trong `@layer base` (xem `packages/ui/src/styles.css`). Không viết `a { color }` ngoài layer. |
| Trang sập "This page couldn't load", console báo React error #310 | Gọi hook (`useCallback`, `useMemo`...) sau một `return` sớm (đang tải, lỗi, không có dữ liệu) nên số hook đổi giữa hai lần vẽ | Mọi hook phải nằm trước mọi `return` sớm. |
| Trang sập với React error #31 "Objects are not valid as a React child (object with keys {t, text})" | API trả `correctReason`, `wrongReasonsByOption`, `translation` dạng RichText (mảng `{t:'text', text}`), nhưng kiểu TS khai là chuỗi; test API quy định dạng RichText | Hiển thị qua `toDisplayText` (`apps/web/features/explanations/rich-text.ts`). Không đổi API sang chuỗi (test của dự án sẽ đỏ). |
| Khách bắt đầu làm bài báo `Cannot POST /api/v1/guest/attempts` sau khi PR ghép | Web tự cập nhật từ `main` còn API thì không | Triển khai API thủ công, xem [OPERATIONS.md](OPERATIONS.md). |
| Tooltip ngắt giữa chữ ("gia / n") | CSS `.tooltip` của HeroUI đặt `word-break: break-all` | Thêm `break-normal [overflow-wrap:break-word]` cho nội dung tooltip. |
| Tooltip HeroUI làm JS ban đầu của trang chủ tăng 28 KB, vượt trần 200 KB | Nhúng tĩnh `@heroui/react` | Import `@heroui/react/tooltip` và tải muộn bằng `React.lazy` (xem `packages/ui/src/components/tooltip.tsx`). |
| Lighthouse báo LCP mobile trang chủ vượt 3300 ms sau khi gộp thay đổi hero | Khối đếm ngược cập nhật mỗi giây làm vẽ lại cả hero; danh mục đề tải trong bundle chính | Tách đếm ngược thành component riêng, tải muộn danh mục đề, dùng ảnh nền nhỏ cho mobile. Giữ nguyên ngưỡng trong `tests/lighthouse/budgets.ts`. |
| Worker `agy` chết sau chưa đầy 2 phút, file `.exit` rỗng, `.log` trống | Đĩa `/` của VM đầy | `df -h /` trước khi giao việc; dọn `node_modules` của clone cũ và `docker builder prune -af`. |
| Lệnh bash bị hỏi quyền dù đã cho phép `ssh jlpt-vm *` | Cài đặt người dùng có quy tắc `ask` cho `*rm -rf*`, `*schtasks*`, `*DROP TABLE*`; `ask` thắng `allow` | Giữ quy tắc. Xóa từng đường dẫn cụ thể thay vì `rm -rf` trên thư mục chung (đã từng lỡ xóa `~/.cache` làm mất trình duyệt Playwright). |
| Script postgres.js lỗi `The "string" argument must be of type string... Received an Object` khi ghi JSONB | Truyền object helper lồng trực tiếp vào template của transaction trong môi trường runtime hiện tại | Dùng `JSON.stringify(value)` rồi ép `::jsonb`; chạy dry-run, backup và transaction trước khi xuất bản phiên bản đề mới. |
| Popup tra từ khi bôi đen (HeroUI `Popover.Content`, không modal) đóng khi cuộn trang, Escape không đóng khi có thông báo nhỏ, không có `role="alert"` ở lỗi | react-aria đóng popover không modal khi trang cuộn và khi mất focus; Escape trong thông báo con bị chặn `stopPropagation`; `Alert` của HeroUI không tự gắn `role` | Neo vào một phần tử cố định vô hình đặt theo vùng chọn, không truyền `onOpenChange`; tự xử lý Escape (capture) và bấm ra ngoài; thêm `role="alert"` (xem `selection-lookup-popover.tsx`). |
