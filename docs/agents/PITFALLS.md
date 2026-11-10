# Các bẫy đã gặp

## Option image assets are also included in group media dependencies

Symptom: four source-glyph choices appear above a question and again inside its four options. Cause: publication correctly lists option-image assets in group.media for delivery, while the booklet also treats every group image as a standalone illustration. Correct approach: collect image references already rendered in passages, stems and options across the whole group and filter only those from the display illustration list. Preserve all rich content, independent illustrations, audio and the underlying snapshot/manifest.

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

## Sửa nội dung hàng loạt qua API

| Triệu chứng | Nguyên nhân | Cách đúng |
|---|---|---|
| Script đọc hàng trăm nhóm bị `429 RATE_LIMITED` | Guard mặc định giới hạn 120 request/phút theo IP | Giãn tối thiểu khoảng 650 ms/request và đọc `details.retryAfterSec` để chờ đúng cửa sổ; không tắt guard. |
| API bắt đầu trả `403` TOTP hết hạn giữa một batch dài | Script tái sử dụng mã TOTP sáu số quá 30 giây | Giữ secret trong env bảo vệ và tạo mã TOTP mới cho từng request; không ghi secret/token vào log hoặc dòng lệnh. |
| Hậu kiểm báo chuỗi cũ vẫn còn dù sửa thành công | Chuỗi cũ là tiền tố của chuỗi mới, ví dụ `いつの間に` trong `いつの間にか` | Xác minh chuỗi đích trong đúng trường dữ liệu và precondition/hash trước khi sửa; không tìm chuỗi cũ trên toàn response. |
| Export hàng loạt qua pipeline chỉ xử lý slug đầu tiên | `docker exec -i` trong script con đọc luôn stdin của vòng `while` | Dùng process substitution cho danh sách và chuyển stdin của script con từ `/dev/null`. |
| Popup tra từ khi bôi đen (`Popover` HeroUI) mặc định là modal: lớp nền chặn bấm, phần còn lại của trang bị `aria-hidden`, không bấm được đáp án hay "Nộp bài" khi popup mở; E2E H06 hỏng (`getByRole`/`click` hết giờ, `afterEach` không nộp được bài) | Hành vi mặc định của react-aria khi không có `isNonModal` | Đặt `isNonModal` trên `Popover.Content` (không đổi giao diện hay animation). Đã kiểm tra: bấm Nộp bài được, Escape, bấm ra ngoài và nút X vẫn đóng. Không đặt `if (!isOpen) return null` trước `Popover`: sẽ mất animation đóng. |
| `Popover.Content` / `Popover.Dialog` của HeroUI hiện trong suốt, không nền, không bóng, không bo góc | Hai component này lấy lớp kiểu từ `Popover` (root) qua context; dùng riêng lẻ thì `slots` rỗng | Luôn bọc trong `<HeroPopover isOpen={...}>` (root không cần trigger). Có `triggerRef` riêng thì truyền vào `Content`. |
| Bản xem thử :3210 vẫn chạy mã cũ dù đã push và build "thành công" | Build lúc đĩa `/` đầy làm hỏng cache turbo; `.next` còn chunk cũ lẫn chunk mới | `df -h /` trước khi dựng; xóa `/home/jlpt/preview-3210/apps/web/.next` rồi chạy `TURBO_FORCE=true tools/ops/preview-branch.sh <nhánh>`; kiểm tra bằng cách đọc lớp CSS thật trên trang. |

## Sự kiện bôi đen và popup không modal

| Triệu chứng | Nguyên nhân | Cách đúng |
|---|---|---|
| Đổi tab làm popup biến mất hoặc bấm ngoài không đóng popup HeroUI `isNonModal` | Hook coi vùng chọn thu gọn là yêu cầu đóng; `mouseup` trong popup tiếp tục xử lý vùng chọn cũ, còn popup không modal không bảo đảm đóng khi bấm vùng không nhận focus | Bỏ đóng chỉ vì selection thu gọn; bỏ qua `mouseup` trong popup/thông báo con và hủy debounce; xử lý `pointerdown` ngoài bằng `close()` mà không chặn cú bấm phòng thi. |

| Popup HeroUI không modal đóng khi đổi tab; stack kết thúc ở `useCloseOnScroll`, trang tự nhảy xuống | Portal tuyệt đối trong body cho phép trình duyệt cuộn trang khi focus tab/nội dung popup thay đổi | Đặt riêng popup vào portal phủ viewport có `position: fixed`, lớp cha `pointer-events-none`, nội dung `pointer-events-auto`; giữ animation HeroUI và đóng khi người dùng cuộn trang thật. |

| Áp dụng transcript N1 báo replaceIn is not defined | Hàm thay thế chỉ được khai báo ở dry-run, chưa có trong apply | Khai báo phép thay thế đệ quy trong apply; kiểm tra bản transcript và các bản sao nội dung sau duyệt. |
| Kết luận câu nghe bị thiếu vì chỉ có nhãn 選択肢 | Một số phần nghe chủ ý không in nội dung lựa chọn trên đề giấy | Đọc hướng dẫn của phần trong PDF và script/audio; kiểm tra đúng 3 lựa chọn cho 即時応答, 4 cho các phần còn lại trước khi kết luận mất dữ liệu. |

- Content repair verifies a newly saved explanation and reports a hash mismatch although its canonical content is correct → `ExplanationDraftSchema` strips imported legacy fields such as `blocks`, `translationVi` and `explanationMarkdown` → parse the planned explanation with the same schema before saving, then compare the full canonical result. Preserve old versions instead of writing around the API.
- Công cụ hiệu đính N1 dừng trước khi ghi với `admin !== publisher` → publisher là tên tác vụ/tài khoản, API xuất bản yêu cầu vai trò `admin` → kiểm tra tài khoản publisher có role admin; giữ editor/reviewer và TOTP riêng.

- Numbered grammar blanks appear indistinguishable → RichTextView ignored blank.label → render the escaped label, reuse surrounding parentheses, and include the label in the accessible name.

- Lời giải hiện chuỗi `[{'t': 'text', ...}]` → công cụ nhập đã chuyển rich text thành chuỗi Python thay vì lấy văn bản → đọc nội dung các node và lưu câu tiếng Nhật đúng trong lời giải phiên bản mới; đồng bộ cả explanation được duyệt, giữ lịch sử.

## Recollected answer sheets can be published as if they were full exam booklets

Symptom: N4 December 2022 has standalone terms, abbreviated context, several plausible choices, and a drafting instruction visible in an explanation. Cause: its original import report says `DRAFT_ONLY` and `source-missing-original-exam-booklet`, but the reconstructed package was subsequently published. Correct approach: check the importer report and source inventory, never claim invented distractors are restored official wording, and respect the owner’s instruction to leave this exam unchanged pending the original booklet. Preserve published history through new versions. See `tools/content/n4-kanji-vocab-review/README.md`.

## A passage-only legacy version can leave the editor group API with null question versions

Symptom: an approved group v2 returns null for every question.version even though the exam still has published questions. Cause observed in N4 July 2023: the group has v2 but its three questions only have v1; getGroup loads questions at the exact group version. Correct approach: detect the mismatch before planning a group PATCH, preserve all existing question identities and history, and do not silently drop null questions or rebuild them from an incomplete source. This audit leaves that source-incomplete group unchanged and records it for a separate recovery.

## Source answer lists and incomplete N5 scans (2026-11-07)

A printed answer index can disagree with both the scanned question and Japanese grammar (December 2012 きょうしつでは、ぼうしをぬいでください), and an explanation can retain an obsolete index after the key was fixed (July 2024 カメラがほしい). Check actual choices, grammar and published key together; a justified key correction requires a new exam version with historical keys preserved. Scan files can omit an entire page: December 2012 shows five text-grammar blanks but only two choices, while July 2023 ends before reading. Record the exact missing ranges; never fill them or a broken four-piece star task from answer recollection alone.
## Unicode variants can erase the visual distinction in a kanji-shape question

Symptom: N5 2010–2011 Q15 options 2 and 4 look identical despite different strings (半 plus a variation selector versus 半). Cause: a scan-only malformed glyph was approximated with Unicode, whose variation selector may be ignored by the font; rare CJK characters can also differ from the intended handwritten stroke error. Correct approach: crop each original option from its own source PDF, preserve order and key, validate hashes and view all final crops. Do not invent a new kanji distractor or count string inequality as proof of visible inequality. The N5 kanji/vocabulary audit uses eight exact crops for the two affected questions.

- Câu sắp xếp có lời giải trông hợp lý nhưng khóa sai → mặc định ngôi sao luôn ở ô thứ ba hoặc chép thứ tự từ bản có lựa chọn khác → giải lại bằng đúng bốn lựa chọn hiện tại, đọc vị trí `star` thực tế và ảnh nguồn; giữ vị trí sao, công khai hiệu đính khóa ở phiên bản mới khi cần.
- Câu ngữ pháp dạng a/b thiếu một nửa câu → gộp hai ô của cùng một câu hỏi thành một blank rồi bỏ luôn chữ dùng chung → giữ nhãn riêng như `19-a`, `19-b` cùng phần chữ ở giữa; đối chiếu cả đoạn văn và các phương án.

- N3 reorder false positives: sentence fragments must be rearranged before judging them. July 2011 Q53 forms 1-4-3-2 with original options; December 2014 Q50 uses a relative clause followed by N no koto wo. Replacing an option without reconstructing the full sentence can introduce an error. Preserve valid source wording and correct only an inaccurate explanation.

- React 19 cảnh báo `__button_group_child` khi đặt thẻ `<span>` hay `<div>` trong HeroUI `ButtonGroup` → HeroUI clone và truyền thuộc tính này xuống mọi con trực tiếp → dùng container bọc ngoài với `role="group"` hoặc chỉ chứa `Button` trực tiếp trong `ButtonGroup`.
- Sổ tay luôn báo không có ví dụ → request corpus trả 403 khi tài khoản còn lượt thi thật và giao diện nuốt lỗi → đọc error envelope của API, hiện lý do và cho thử lại; chỉ hiện không có kết quả sau request thành công. Chủ dự án yêu cầu bỏ chặn tra cứu trong lượt thi thật ngày 08/11/2026; không khôi phục quy tắc này.

- Bấm nguồn sổ tay bị dừng ở lịch sử dù chỉ có một lượt đúng đề → API lịch sử bỏ qua cursor, giao diện gộp trùng cùng ID thành nhiều lượt → phân trang theo startedAt/id, kiểm tra cursor thuộc người dùng và loại trùng theo ID ở client; kiểm tra bằng phản hồi lặp lại trang đầu.

### Download release trong image PostgreSQL

Triệu chứng: CI staging dừng ở `gzip: stdin: not in gzip format`, file WAL-G chỉ 92 byte; CodeQL cùng thời điểm lỗi tải HTTP 504. Nguyên nhân: `curl -L` vẫn trả thành công khi máy chủ trả lỗi HTTP, khiến trang lỗi bị chuyển sang tar. Cách đúng: tải release bằng `curl --fail --retry --retry-all-errors` kèm thời hạn kết nối/tải; giữ nguyên phiên bản đã ghim và không bỏ qua cổng staging.

## SRS báo đã ôn xong dù sổ tay có mục

Triệu chứng: tab SRS có 0 thẻ hoặc hiện hoàn thành ngay → lưu notebook item không tạo card/schedule; UI từng không gọi endpoint tạo thẻ, đồng thời nuốt lỗi tải due cards → cho người dùng chủ động tạo thẻ qua POST notebook-items/:id/cards (idempotent, giữ lịch thẻ cũ), phân trang danh sách và hiển thị lỗi tải riêng. Flashcard cũ có thể dùng front.kanji hoặc front.pattern, không chỉ front.term.

## SRS: hoàn tác và ôn lại trong buổi

- Hoàn tác sau khi đã gửi review sẽ không khôi phục được schedule chỉ bằng cách xóa UI → giữ đánh giá nháp trước khi người học bấm Lưu; ID review không đổi khi retry, chốt trước khi gửi và khôi phục checkpoint từ hàng đợi nếu bị ngắt. Không gửi rating ngược để giả hoàn tác.
- Quên có lượt ôn lại trong 10 phút là hàng đợi luyện trong buổi, khác lịch nhiều ngày trên API; không báo hoàn tất nếu còn thẻ chờ. Thời gian nút đánh giá là dự kiến vì API cũ không trả easeFactor.
- crypto.randomUUID không có trên HTTP IP LAN → dùng crypto.getRandomValues cho ID đánh giá. Các bản nháp và hàng đợi mới phải tách theo userId.

- SRS POST review lỗi 500 ở SELECT card_reviews → client_review_id là UUID nhưng client cũ tạo rev-* → tạo UUID v4 bằng getRandomValues; với queue cũ giữ ID local để đối chiếu checkpoint, lưu serverReviewId UUID bền vững trước khi gửi. Không xóa lượt chưa đồng bộ hay đổi UUID sau mỗi retry.

- Reset SRS bằng cách ghi đè schedule trên cùng card ID → review offline cũ có thể ghi đè lịch vừa reset → retire card cũ (status reset), tạo card/schedule mới, giữ lịch sử cũ và lọc active khi generate/review. Reset bắt buộc chọn ID đã xác nhận, xác thực ownership, row lock và transaction; retry danh sách đã retire trả alreadyReset. Không thử reset trên database chung khi chưa có sao lưu/đồng ý.

### Notebook practice: stale rounds and misleading distractors

- Triệu chứng: bấm Làm lại vẫn hiện kết quả cũ → component nhận quiz mới nhưng giữ state theo index/score → tạo session ID mới và thay toàn bộ trạng thái lượt, giữ riêng điểm lượt đầu khi luyện lại lỗi sai.
- Triệu chứng: chỉ luyện được các mục đầu hoặc đáp án nhiễu không liên quan → list mặc định phân trang 100 mục, API quiz cũ có fallback và trộn loại → tải đủ notebook, lọc phạm vi câu được hỏi, lấy phương án thật cùng loại; chặn vòng lặp nếu trang không tiến triển, báo thiếu dữ liệu thay vì bịa phương án.
- HeroSelect v3 có accessible name ghép giá trị hiện tại với label ở button trigger; Playwright nên tìm button theo label không exact hoặc dùng combobox khi có, rồi chọn option theo tên chính xác.

- Xem thử cổng mới: GET chạy nhưng đăng nhập POST trả CSRF 403 → chuyển thẳng vào Next rewrite làm mất Host gốc ở API → dùng proxy nginx giữ Host cho /api/v1, không tắt OriginGuard. Cấu hình xem thử Luyện tập ở tools/ops/vm/notebook-practice-preview.conf (loopback 13222 → web 13221/API 4000; Windows 3211 → 13222 theo yêu cầu chủ dự án).
