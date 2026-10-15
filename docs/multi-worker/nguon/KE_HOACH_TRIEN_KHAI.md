# Kế hoạch triển khai — JLPT Online

> **Dành cho:** mọi agent AI hoặc lập trình viên tham gia xây dựng hệ thống, kể cả agent chưa từng xem dự án.
> **Phiên bản:** 1.0 — 13/10/2026.
> **Tài liệu đi kèm:** `DE_XUAT_KY_THUAT.md` (kiến trúc, lý do, quy tắc kỹ thuật — bản 1.3) và `Bao_cao_day_du_tinh_nang_JLPT_Online.docx` (danh sách tính năng; các mã như `EXAM-08` lấy từ tài liệu này).
> **Cách đọc nhanh:** mỗi phiên làm việc đọc **Phần A**, sau đó chỉ đọc **task được giao** và các mục ghi trong dòng "Đọc thêm" của task.

---

## Mục lục

- Phần A. Quy tắc bắt buộc cho agent
- Phần B. Tổng quan lộ trình, lịch, ngân sách, chuẩn bị
- Phần C. Giai đoạn 1 — V1 MVP (Phase 1.0 → 1.9)
- Phần D. Giai đoạn 2 — V2: luyện tập thông minh & trộn đề
- Phần E. Giai đoạn 3 — V3: cá nhân hóa & thương mại hóa
- Phần F. Giai đoạn 4 — V4: giáo viên, thi đồng loạt, mở rộng
- Phụ lục A. Hợp đồng kỹ thuật (cấu trúc repo, biến môi trường, định dạng JSON, API, DB, token, Compose, Tunnel)
- Phụ lục B. Vận hành server (dựng server, deploy, backup/khôi phục, nâng/hạ gói theo mùa)
- Phụ lục C. Bảng theo dõi tiến độ

---

## Phần A. Quy tắc bắt buộc cho agent

### A1. Đọc gì trước khi làm

1. Phần A (mỗi phiên làm việc đều đọc lại).
2. Phần B, mục B1–B3 (đọc một lần để hiểu bức tranh chung).
3. Đúng task được giao trong Phần C/D/E/F.
4. Các mục ghi trong dòng **"Đọc thêm"** của task (trong `DE_XUAT_KY_THUAT.md` hoặc Phụ lục A/B).
5. Phụ lục C để biết task nào đã xong, task nào đang có người làm.

### A2. Thứ tự ưu tiên khi tài liệu mâu thuẫn

1. Chỉ thị trực tiếp của chủ dự án.
2. Phụ lục A (hợp đồng kỹ thuật): tên, kiểu dữ liệu, endpoint, định dạng JSON.
3. Nội dung task trong file này.
4. `DE_XUAT_KY_THUAT.md` (nguyên tắc và lý do).
5. Tài liệu tính năng (`.docx`).

Mâu thuẫn ở mức **chi tiết** thì làm theo thứ tự trên và ghi lại trong PR. Mâu thuẫn ở mức **nguyên tắc** (ví dụ một task yêu cầu điều mà mục 15 của `DE_XUAT_KY_THUAT.md` cấm) thì **dừng và hỏi**.

### A3. Quy trình làm một task

1. Mở Phụ lục C: task phải ở trạng thái `TODO`, và mọi task ghi trong dòng "Phụ thuộc" phải ở trạng thái `DONE`.
2. Đổi trạng thái task sang `DOING`, ghi tên agent và ngày.
3. Tạo nhánh tên ASCII theo mẫu `t<mã task>-<mo-ta-ngan>`, ví dụ `t1.5.3-sheet-endpoint`.
4. Đọc các mục ở dòng "Đọc thêm".
5. Với phần logic: viết test trước, dựa trên mục "Kiểm tra" của task.
6. Code đúng phạm vi "Làm". Không làm những gì nằm trong "Không làm" hoặc thuộc task khác.
7. Chạy toàn bộ lệnh ở mục "Kiểm tra" của task; tất cả phải pass.
8. Chạy `pnpm lint && pnpm typecheck && pnpm test` ở gốc repo (từ Phase 1.1 trở đi).
9. Commit theo quy ước A6, mở PR với mô tả theo mẫu A7.
10. Cập nhật Phụ lục C sang `REVIEW`, kèm link PR và ghi chú các điểm lệch so với kế hoạch.

Task chỉ chuyển sang `DONE` khi chủ dự án (hoặc người duyệt được chỉ định) merge PR.

### A4. Khi nào phải DỪNG và hỏi chủ dự án

- Task có nhãn **[CHỦ DỰ ÁN]**: việc cần tài khoản, tiền, quyết định pháp lý. Agent chỉ được chuẩn bị hướng dẫn, không tự làm.
- Cần một quyết định D1–D8 (mục 1.3 của `DE_XUAT_KY_THUAT.md`) mà chưa được chốt.
- Phát sinh chi phí: dịch vụ trả phí, nâng gói, mua license.
- Muốn đổi kiến trúc, thêm thư viện lớn (framework, ORM, auth, UI kit) hoặc đổi hợp đồng ở Phụ lục A.
- Thao tác trên production: xóa dữ liệu, migration có thể làm mất dữ liệu, resize server, đổi DNS, xoay secrets.
- Không tìm được nguồn chính thức cho số liệu JLPT (số câu, thời gian, cách tính điểm).
- Nghi ngờ vấn đề bản quyền nội dung đề.
- Cùng một lỗi đã thử sửa 2 lần không được: ghi lỗi, lệnh đã chạy và log vào cột ghi chú của Phụ lục C, rồi dừng.

### A5. Những điều không bao giờ làm

- Không bịa: số liệu JLPT, API của thư viện (đọc tài liệu đúng phiên bản đã cài), kết quả test (luôn dán output thật).
- Không xóa, tắt hay `skip` test để cho pass; không hạ ngưỡng coverage, Lighthouse hay budget dung lượng JS.
- Không commit secrets, file `.env`, dữ liệu người dùng, PDF hoặc audio đề thi có bản quyền vào repo. Dữ liệu mẫu có bản quyền để ngoài repo (thư mục `../jlpt-samples/` hoặc theo hướng dẫn của chủ dự án).
- Không thêm endpoint thiếu guard phân quyền; không tắt kiểm tra quyền "tạm thời".
- Không đưa đáp án đúng vào snapshot đề hoặc vào bất kỳ response nào trước khi nộp bài.
- Không build image trên server production; không SSH vào production nếu task không yêu cầu.
- Không sửa nội dung file kế hoạch này, trừ Phụ lục C và mục "C0. Đề xuất chỉnh kế hoạch", khi chưa được chủ dự án đồng ý.
- Mọi điều trong mục 15 của `DE_XUAT_KY_THUAT.md`.

### A6. Quy ước code và commit

- TypeScript `strict`; ESLint + Prettier theo cấu hình chung ở `packages/config`. Không dùng `any`; trường hợp bắt buộc thì kèm comment giải thích.
- Tên file `kebab-case.ts`; class `PascalCase`; hàm, biến `camelCase`; hằng `UPPER_SNAKE_CASE`.
- DB: bảng và cột `snake_case`, tên bảng số nhiều (`exam_attempts`). JSON của API: `camelCase`.
- Identifier, tên nhánh, subject của commit: ASCII, tiếng Anh. Comment trong code: tiếng Anh, ngắn gọn. Tài liệu trong `docs/`: tiếng Việt.
- Chuỗi giao diện: tiếng Việt, đặt trong `messages/vi.json` (next-intl), key ASCII. Plural ICU chỉ dùng nhánh `other`.
- Unicode: lưu và xuất chuỗi ở dạng NFC.
- Commit theo Conventional Commits, ví dụ `feat(attempt): add sheet save endpoint`. Body có thể viết tiếng Việt; dòng cuối body ghi `Task: T1.5.3`.
- Mỗi PR chỉ chứa một task (hoặc một phần đã được tách của task).

### A7. Mẫu mô tả PR

```
## Task
T1.5.3 — <tên task>

## Đã làm
- ...

## Kiểm tra
<dán output thật của các lệnh trong mục "Kiểm tra">

## Lệch so với kế hoạch
Không có / <mô tả + lý do>

## Ảnh chụp màn hình (nếu có giao diện)
```

### A8. Definition of Done chung cho mọi task

- Các lệnh ở mục "Kiểm tra" của task pass; output thật được dán vào PR.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` pass ở gốc repo; CI xanh.
- Logic mới có test; coverage của `packages/exam-engine` không dưới 90%.
- Endpoint mới có guard phân quyền và có test cho trường hợp bị từ chối (401/403).
- Không lộ đáp án; không log mật khẩu, token, dữ liệu cá nhân.
- Migration (nếu có) chạy được trên DB trống và trên DB đã có dữ liệu seed; tương thích ngược với code của bản trước.
- Chuỗi giao diện mới nằm trong `messages/vi.json`.
- Phụ lục C đã được cập nhật.

### A9. Cách đọc một task

```
#### T1.x.y — Tên task   [AGENT] hoặc [CHỦ DỰ ÁN]
- Phụ thuộc:     task phải xong trước
- Mã tính năng:  mã trong tài liệu .docx
- Đọc thêm:      mục cần đọc trước khi làm
- Làm:           phạm vi công việc
- Không làm:     những gì nằm ngoài phạm vi
- Kiểm tra:      tiêu chí nghiệm thu; chưa đạt hết thì task chưa xong
```

### A10. Khi task quá lớn

Nếu ước lượng một task cần hơn 1 ngày làm việc hoặc thay đổi hơn khoảng 500 dòng code, tách thành `T1.x.y-a`, `T1.x.y-b`… Ghi các phần đã tách vào Phụ lục C **trước** khi làm, mỗi phần có mục "Kiểm tra" riêng.

---

## Phần B. Tổng quan lộ trình

### B1. Giai đoạn và phase

| Giai đoạn | Mục tiêu | Phase |
|---|---|---|
| **1 — V1 MVP** | Người dùng chọn đề và làm trọn một bài thi online ổn định, chính xác; admin nhập, duyệt, xuất bản đề | 1.0 Chuẩn bị & kiểm chứng rủi ro · 1.1 Nền tảng repo, CI, Docker · 1.2 Lõi dữ liệu · 1.3 Tài khoản & bảo mật · 1.4 Ngân hàng câu hỏi & admin · 1.5 Phòng thi & chấm điểm · 1.6 Trang public & SEO · 1.7 Nhập PDF/OCR · 1.8 Server production & vận hành · 1.9 Kiểm thử tổng thể & ra mắt |
| **2 — V2 Core** | Lợi thế cạnh tranh: luyện theo kỹ năng, trộn đề, giải thích đáp án, phân tích năng lực, thống kê từ vựng | 2.1 → 2.7 (Phần D) |
| **3 — V3 Growth** | Gắn bó và thương mại hóa: SRS, thông báo, Premium, SEO nội dung, lộ trình học, AI | 3.1 → 3.7 (Phần E) |
| **4 — V4 Scale** | Nền tảng cho trung tâm: giáo viên, thi đồng loạt, gamification, mở rộng hạ tầng | 4.1 → 4.7 (Phần F) |

Giai đoạn 1 được viết tới mức task. Giai đoạn 2–4 được viết tới mức phase và danh sách task; trước khi bắt đầu mỗi phase của giai đoạn 2–4, agent viết chi tiết từng task theo mẫu A9 vào mục "C0. Đề xuất chỉnh kế hoạch" và chờ chủ dự án duyệt.

### B2. Phụ thuộc giữa các phase (Giai đoạn 1)

```
1.0 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 ──────────→ 1.9
                          │                          ▲
                          └──→ 1.7 (cần 1.4; chạy song song với 1.5–1.6)
                    1.8 (bắt đầu được sau 1.3; phải xong trước 1.9)
```

- Nếu chỉ có một agent làm tuần tự: 1.0 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9.
- Nếu có hai agent: agent thứ hai nhận 1.7 sau khi 1.4 xong, rồi nhận 1.8.

### B3. Lịch đề xuất (D8, chờ chủ dự án xác nhận)

Mùa thi tháng 12/2026 không kịp cho một bản V1 đầy đủ. Lịch dưới đây đặt **beta kín trong mùa vắng** và **ra mắt trước mùa thi tháng 7/2027**.

| Phase | Thời lượng | Khoảng thời gian (bắt đầu 19/10/2026) |
|---|---|---|
| 1.0 | 2 tuần | 19/10 – 30/10/2026 |
| 1.1 | 1 tuần | 02/11 – 06/11/2026 |
| 1.2 | 2 tuần | 09/11 – 20/11/2026 |
| 1.3 | 2 tuần | 23/11 – 04/12/2026 |
| 1.4 | 3 tuần | 07/12 – 25/12/2026 |
| 1.5 | 5 tuần | 28/12/2026 – 29/01/2027 |
| 1.6 | 3 tuần (gồm nghỉ Tết, khoảng 06/02/2027) | 01/02 – 19/02/2027 |
| 1.7 | 4 tuần | song song 1.5–1.6 nếu có agent thứ hai; nếu không thì 22/02 – 19/03/2027 |
| 1.8 | 2 tuần | song song từ 04/01/2027, xong trước khi bắt đầu 1.9 |
| 1.9 | 5 tuần (beta kín trong đó) | 22/02 – 02/04/2027 (hoặc 22/03 – 30/04/2027 nếu làm tuần tự) |
| **Ra mắt công khai** | | đầu tháng 4/2027, muộn nhất đầu tháng 5/2027 |
| Nâng gói cho mùa thi tháng 7/2027 | | 01/06/2027 (Phụ lục B4) |

Giai đoạn 2 bắt đầu sau khi V1 chạy ổn định khoảng 2 tuần; nên hoàn thành phần lớn trước mùa thi tháng 12/2027.

### B4. Ngân sách vận hành dự kiến

| Khoản | Chi phí |
|---|---|
| Linode Shared 4 GB (mùa vắng) / Dedicated 8 GB G6 (mùa thi) | $24 / $72 mỗi tháng |
| Linode Backup | khoảng $5/tháng (tăng theo gói) |
| Cloudflare Free (CDN, Tunnel, Turnstile, Access ≤ 50 người, Workers 100.000 request/ngày) | $0 (Pro $20–25/tháng khi ra mắt nếu ngân sách cho phép) |
| R2 (10 GB đầu miễn phí, không phí egress) | $0 tới vài USD/tháng |
| Resend, Sentry, UptimeRobot/Better Stack, GitHub (gói miễn phí) | $0 |
| Tên miền | khoảng $10–15/năm |
| Google Document AI (OCR) | khoảng $1,5/1.000 trang |
| LLM nhận diện cấu trúc đề | theo nhà cung cấp; ghi chi phí thực tế trong báo cáo Phase 1.0 |
| Server tạm theo giờ (k6, thử khôi phục backup) | vài cent mỗi lần |
| **Tổng** | khoảng $30/tháng lúc vắng, $80/tháng mùa thi; cả năm khoảng $450–500 (chưa gồm OCR/LLM) |

### B5. Chuẩn bị máy lập trình

- Windows 11 với **WSL2 (Ubuntu 24.04)**. Đặt repo trong ổ của WSL (ví dụ `~/code/jlpt`), không đặt trong `/mnt/c` hay `/mnt/d`, để Docker và Node chạy nhanh.
- Docker Desktop dùng backend WSL2.
- Node.js bản LTS (ghi trong `.nvmrc`, mặc định Node 24), cài qua `fnm` hoặc `nvm`; bật `corepack` để dùng pnpm.
- Python 3.12 và `uv` (cho `apps/ocr-worker`); `uv` tự cài đúng bản Python.
- Git, VS Code (extension ESLint, Prettier, Tailwind CSS).
- RAM khuyến nghị từ 16 GB.

### B6. Tài khoản cần có (chủ dự án tạo trong Phase 1.0)

GitHub (repo private), Cloudflare (gắn tên miền), Linode, Google Cloud (Document AI), nhà cung cấp LLM có khả năng đọc ảnh, Resend, Sentry, UptimeRobot hoặc Better Stack, trình quản lý mật khẩu (ví dụ Bitwarden) để lưu toàn bộ secrets.

---

## Phần C. Giai đoạn 1 — V1 MVP

### C0. Đề xuất chỉnh kế hoạch

Agent ghi đề xuất vào đây (ngày, người đề xuất, nội dung, lý do). Chỉ áp dụng sau khi chủ dự án ghi "Đồng ý" bên cạnh.

| Ngày | Người đề xuất | Đề xuất | Lý do | Chủ dự án |
|---|---|---|---|---|
| | | | | |

---

### Phase 1.0 — Chuẩn bị & kiểm chứng rủi ro (2 tuần)

**Mục tiêu:** có tài khoản, quyết định, dữ liệu mẫu; trả lời được hai câu hỏi rủi ro nhất: OCR có dùng được với PDF thật không, và luồng thi có chịu được sự cố không.

#### T1.0.1 — Tạo tài khoản và tên miền   [CHỦ DỰ ÁN]
- Phụ thuộc: không.
- Làm: tạo các tài khoản ở mục B6; mua tên miền và chuyển DNS về Cloudflare; tạo repo GitHub private; bật 2FA cho mọi tài khoản; lưu toàn bộ thông tin đăng nhập trong trình quản lý mật khẩu.
- Kiểm tra: file `docs/accounts.md` liệt kê tên dịch vụ và email chủ sở hữu (không ghi mật khẩu, không ghi key); mọi tài khoản đã bật 2FA.

#### T1.0.2 — Chốt các quyết định D1–D8   [CHỦ DỰ ÁN]
- Phụ thuộc: không.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 1.3.
- Làm: hỏi luật sư về D1; chốt D2–D8. Agent tạo sẵn mẫu `docs/decisions/_template.md` (bối cảnh, quyết định, ngày, người quyết định, hệ quả); chủ dự án điền mỗi quyết định vào một file `docs/decisions/D1.md` … `D8.md`.
- Kiểm tra: đủ 8 file. Nếu D1 chưa có ý kiến pháp lý, file `D1.md` ghi rõ "chưa có — chặn ra mắt production".

#### T1.0.3 — Chuẩn bị dữ liệu mẫu   [CHỦ DỰ ÁN]
- Phụ thuộc: không.
- Làm: gom 3–5 bộ đề thật (mỗi bộ gồm PDF đề, file đáp án, audio nghe). Trong đó phải có ít nhất 1 PDF scan, 1 PDF có lớp chữ, câu có furigana, câu sắp xếp ★, bài đọc có bảng hoặc ảnh. Đặt ngoài repo, ở `../jlpt-samples/<mã-bộ>/`. Ghi nguồn và tình trạng bản quyền từng bộ vào `docs/samples.md`.
- Kiểm tra: `docs/samples.md` đủ thông tin; thư mục mẫu tồn tại ngoài repo; không có file mẫu nào trong repo.

#### T1.0.4 — Thu thập cấu trúc đề chính thức N1–N5   [AGENT]
- Phụ thuộc: không.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 10.2; Phụ lục A6.
- Làm: từ trang chính thức của JLPT (jlpt.jp), ghi cho từng cấp độ: các phần thi và thời gian từng phần; các dạng 問題 và số câu của từng dạng (ghi rõ nếu nguồn chỉ công bố số "dự kiến"); cách tính điểm (các phần điểm, thang điểm, điểm đỗ tổng, điểm liệt từng phần); thời điểm áp dụng. Mỗi con số kèm URL nguồn và ngày truy cập. Chỗ không tìm được nguồn chính thức: ghi `CHƯA XÁC NHẬN`, **không tự điền**.
- Output: `docs/jlpt-blueprints.md` (bảng dễ đọc) và `docs/jlpt-blueprints.json` (đúng cấu trúc Phụ lục A6).
- Không làm: không lấy số liệu từ blog, diễn đàn hay trí nhớ.
- Kiểm tra: mọi con số có nguồn; chủ dự án đánh dấu "đã xác nhận" ở đầu file `docs/jlpt-blueprints.md`.

#### T1.0.5 — Spike OCR với dữ liệu thật   [AGENT]
- Phụ thuộc: T1.0.3.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 11 (định dạng nội dung), 12; Phụ lục A4, A7.
- Làm (code tạm trong `spikes/ocr/`, không dùng lại cho production):
  1. PDF có lớp chữ: trích chữ kèm vị trí bằng `pdfplumber`. PDF scan: render trang bằng `pypdfium2` ở 300 DPI rồi OCR bằng Google Document AI.
  2. Gửi ảnh trang + text cho LLM có khả năng đọc ảnh, yêu cầu trả JSON theo định dạng ở Phụ lục A4 và A7.
  3. Sửa tay 1 đề thành bản chuẩn (gold). So kết quả tự động với bản chuẩn: tỷ lệ câu đúng hoàn toàn, tỷ lệ lựa chọn đúng, cách xử lý furigana, gạch chân, ★, bảng/ảnh; thời gian biên tập để sửa một đề thành đúng; chi phí OCR + LLM cho mỗi đề.
  4. Nếu có thể, thử 2 nhà cung cấp LLM và so sánh.
- Output: `docs/spikes/ocr-report.md` gồm bảng số liệu, ví dụ lỗi điển hình, khuyến nghị D5 và nhà cung cấp LLM, đề xuất chỉnh định dạng ở Phụ lục A4/A7 (nếu có).
- Không làm: không commit file đề mẫu; không commit API key.
- Kiểm tra: báo cáo có số liệu cho mọi đề mẫu; chủ dự án chốt D5 sau khi đọc.

#### T1.0.6 — Spike luồng phòng thi   [AGENT]
- Phụ thuộc: không.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 8.
- Làm (code tạm trong `spikes/exam-flow/`):
  1. Server Node tối giản (Fastify + PostgreSQL trong Docker): tạo attempt, cấp lease, `PUT sheet` có `seq`, `submit`, job đóng bài quá hạn.
  2. Trang HTML/JS tối giản: lưu IndexedDB trước khi gửi, debounce 3 giây, tối đa 1 request đang chờ, `fetch` với `keepalive` khi rời trang, phát audio từ Cache Storage qua blob URL, tính lại vị trí audio khi tải lại trang.
  3. Thử từng tình huống và ghi kết quả: mất mạng 30 giây (DevTools → Offline); request đến sai thứ tự (server thêm độ trễ ngẫu nhiên); mở 2 tab; tải lại trang khi đang nghe; nộp bài đúng lúc job đóng bài chạy; iPhone thật (Safari) và Android thật (Chrome).
- Output: `docs/spikes/exam-flow-report.md`: tình huống → kết quả → vấn đề → đề xuất chỉnh mục 8 của `DE_XUAT_KY_THUAT.md`.
- Kiểm tra: mọi tình huống ở bước 3 có kết quả ghi lại, kể cả trên thiết bị thật.

#### T1.0.7 — Họp chốt Phase 1.0   [CHỦ DỰ ÁN]
- Phụ thuộc: T1.0.4, T1.0.5, T1.0.6.
- Làm: đọc 2 báo cáo spike; quyết định tiếp tục, chỉnh định dạng, chỉnh luồng thi hay đổi D5. Ghi vào `docs/decisions/phase-1.0.md`. Các thay đổi được duyệt phải cập nhật vào `DE_XUAT_KY_THUAT.md` và Phụ lục A trước khi sang Phase 1.1.
- Kiểm tra: có file quyết định; tài liệu đã cập nhật theo quyết định.

**Cổng ra Phase 1.0:** D5 và cấu trúc đề chính thức đã được xác nhận; hai báo cáo spike được duyệt; tài liệu đã chỉnh theo kết luận.

---

### Phase 1.1 — Nền tảng repo, CI, Docker (1 tuần)

**Mục tiêu:** repo chạy được `install → lint → typecheck → test → build` ở máy lập trình và trên CI; dịch vụ dev chạy bằng Docker.

#### T1.1.1 — Khởi tạo monorepo   [AGENT]
- Phụ thuộc: T1.0.7.
- Đọc thêm: Phụ lục A1, A2.
- Làm: tạo cấu trúc thư mục theo Phụ lục A1; `package.json` gốc (`private: true`, `packageManager: "pnpm@<bản ổn định>"`); `pnpm-workspace.yaml` (`apps/*`, `packages/*`); `turbo.json` (task `build`, `lint`, `typecheck`, `test`, `dev`); `.nvmrc`; `.editorconfig`; `.gitignore` (gồm `node_modules`, `.env*` trừ `.env.example`, `.data/`, `dist`, `.next`, `coverage`); `.gitattributes` với `* text=auto eol=lf`; `README.md` hướng dẫn chạy dev.
- Kiểm tra: `pnpm install` thành công; `pnpm turbo run build` chạy không lỗi.

#### T1.1.2 — Cấu hình chung TypeScript, ESLint, Prettier   [AGENT]
- Phụ thuộc: T1.1.1.
- Làm: trong `packages/config`: `tsconfig.base.json` (`strict: true`, `noUncheckedIndexedAccess: true`), ESLint flat config (typescript-eslint), Prettier config. Mọi app/package kế thừa từ đây.
- Kiểm tra: `pnpm lint` và `pnpm typecheck` chạy trên toàn repo và pass.

#### T1.1.3 — Khung các app và package   [AGENT]
- Phụ thuộc: T1.1.2.
- Đọc thêm: Phụ lục A1.
- Làm:
  - `apps/web`, `apps/admin`: Next.js (App Router, TypeScript, Tailwind CSS), `output: "standalone"`; route `app/healthz/route.ts` trả 200 `ok`.
  - `apps/api`: NestJS dùng Fastify adapter, global prefix `api/v1`, `GET /api/v1/health` trả `{"status":"ok"}`.
  - `apps/media-worker`: Cloudflare Worker (wrangler), tạm trả 404 cho mọi request.
  - `apps/ocr-worker`: dự án Python quản lý bằng `uv`, có lệnh `jlpt-ocr --version`.
  - `packages/schema`, `packages/exam-engine`, `packages/media-token`, `packages/ui`, `packages/api-client`: mỗi package có `src/index.ts`, build bằng `tsup`, test bằng Vitest (1 test mẫu).
- Kiểm tra: `pnpm dev` chạy web ở cổng 3000, admin 3001, api 4000; ba health endpoint trả 200; `uv run jlpt-ocr --version` in phiên bản.

#### T1.1.4 — Docker Compose cho dev   [AGENT]
- Phụ thuộc: T1.1.3.
- Đọc thêm: Phụ lục A3, A12.
- Làm: `infra/postgres/Dockerfile` (PostgreSQL 17 + pg_bigm build từ source, ghim phiên bản; WAL-G thêm ở T1.8.6); `infra/compose/compose.dev.yml` gồm `postgres`, `redis-core` (`noeviction`, `appendonly yes`), `redis-cache` (`allkeys-lru`, `maxmemory 64mb`), `mailpit`; mọi cổng bind `127.0.0.1`. File `.env.example` theo Phụ lục A3 với giá trị dev.
- Kiểm tra:
  - `docker compose -f infra/compose/compose.dev.yml up -d` → mọi service `healthy`.
  - `CREATE EXTENSION pg_bigm;` chạy thành công trong `psql`.
  - `redis-cli CONFIG GET maxmemory-policy` trả `noeviction` ở `redis-core` và `allkeys-lru` ở `redis-cache`.

#### T1.1.5 — Công cụ test   [AGENT]
- Phụ thuộc: T1.1.3.
- Làm: Vitest (coverage v8) cho mọi package/app TypeScript; Playwright trong `apps/web/e2e` (Chromium, WebKit, Firefox); pytest cho `apps/ocr-worker`. Script gốc: `pnpm test`, `pnpm test:coverage`, `pnpm test:e2e`.
- Kiểm tra: mỗi loại có ít nhất 1 test pass; `pnpm test:e2e` mở trang chủ web và kiểm tra tiêu đề trên cả 3 trình duyệt.

#### T1.1.6 — CI trên GitHub Actions   [AGENT]
- Phụ thuộc: T1.1.4, T1.1.5.
- Làm: `.github/workflows/ci.yml` chạy khi có PR và khi push lên `main`: cài đặt (cache pnpm), lint, typecheck, unit test + coverage, build, test Python (`uv`). Job E2E dùng service container PostgreSQL và Redis của GitHub Actions (bật từ Phase 1.3).
- Kiểm tra: một PR mẫu chạy CI xanh; tổng thời gian CI dưới 15 phút.
- **[CHỦ DỰ ÁN]:** bật branch protection cho `main` (bắt buộc CI xanh và 1 review).

#### T1.1.7 — Dockerfile cho web, admin, api   [AGENT]
- Phụ thuộc: T1.1.3.
- Làm: Dockerfile multi-stage cho từng app, chạy bằng user không phải root, có `HEALTHCHECK`, nền tảng `linux/amd64`. CI thêm job build image (chưa push).
- Kiểm tra: build được 3 image; chạy image `api` với env dev thì `/api/v1/health` trả 200; mỗi image dưới 300 MB.

#### T1.1.8 — Tài liệu đóng góp   [AGENT]
- Phụ thuộc: T1.1.6.
- Làm: `CONTRIBUTING.md` (tóm tắt A3, A6, A8); `.github/pull_request_template.md` theo A7.
- Kiểm tra: tạo PR mới thì mẫu mô tả tự hiện.

**Cổng ra Phase 1.1:** `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass ở máy lập trình và trên CI; dịch vụ dev chạy bằng Docker.

---

### Phase 1.2 — Lõi dữ liệu: schema, exam-engine, DB (2 tuần)

**Mục tiêu:** định dạng dữ liệu, logic thi và database được chốt và có test, trước khi xây tính năng.

#### T1.2.1 — Schema RichText và RichBlock   [AGENT]
- Phụ thuộc: T1.1.8.
- Đọc thêm: Phụ lục A4.
- Làm: trong `packages/schema/src/rich-text.ts`: schema Zod cho `Segment`, `RichText`, `RichBlock`; hàm `normalizeRichText()` (chuẩn hóa NFC, gộp các đoạn `text` liền nhau); hàm `toPlainText()` (bỏ cách đọc ruby, dùng cho tìm kiếm).
- Kiểm tra: test cho mọi ví dụ ở Phụ lục A4 (hợp lệ) và ít nhất 5 trường hợp không hợp lệ (thiếu `rt`, `text` chứa ký tự xuống dòng, loại đoạn lạ…).

#### T1.2.2 — Schema blueprint   [AGENT]
- Phụ thuộc: T1.2.1, T1.0.4.
- Đọc thêm: Phụ lục A6; `docs/jlpt-blueprints.json`.
- Làm: schema Zod của blueprint; chuyển dữ liệu đã xác nhận ở T1.0.4 thành `packages/schema/fixtures/blueprints/n1.json` … `n5.json`.
- Kiểm tra: mọi fixture qua validate; test báo lỗi khi tổng số câu của dạng 問題 không khớp với khai báo phần thi.

#### T1.2.3 — Schema snapshot đề, manifest, gói nhập đề   [AGENT]
- Phụ thuộc: T1.2.1.
- Đọc thêm: Phụ lục A5, A7.
- Làm: schema Zod cho `ExamSnapshot`, `MediaManifest`, `ImportPackage`. Script `pnpm --filter @jlpt/schema export-json-schema` xuất JSON Schema (dùng `z.toJSONSchema()` của Zod 4) ra `packages/schema/json-schema/*.json`; các file này được commit để `ocr-worker` dùng.
- Kiểm tra: ví dụ ở Phụ lục A5, A7 qua validate; snapshot có trường đáp án (ví dụ `correct`, `answer`) thì bị **từ chối** (schema dùng `strict()`).

#### T1.2.4 — DTO của API lượt thi và định dạng lỗi   [AGENT]
- Phụ thuộc: T1.2.3.
- Đọc thêm: Phụ lục A8, A9.
- Làm: schema Zod cho request/response của mọi endpoint ở Phụ lục A8 (phần lượt thi và thư viện đề) và định dạng lỗi chuẩn ở A9.
- Kiểm tra: test cho từng DTO với ví dụ hợp lệ và không hợp lệ.

#### T1.2.5 — exam-engine: quy tắc thời gian   [AGENT]
- Phụ thuộc: T1.1.8.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 8.2 (quy tắc 7, 8), 8.3.
- Làm: các hàm thuần `computeSectionDeadline(startedAt, durationSec)`, `isAcceptingWrites({ mode, deadline, now, graceSec })`, `isLateSyncAllowed({ deadline, receivedAt, windowSec })`, `computeClockOffset(serverNow, clientNow)`.
- Kiểm tra: test dạng bảng, gồm các mốc biên: đúng deadline, deadline + grace, deadline + grace + 1 ms, chế độ luyện tập luôn nhận ghi.

#### T1.2.6 — exam-engine: chấm điểm   [AGENT]
- Phụ thuộc: T1.2.2.
- Đọc thêm: Phụ lục A6 (phần `scoring`), A10 (`exam_answer_keys`).
- Làm: `score({ answers, answerKey, scoring })` trả về: số câu đúng/sai/bỏ trống, tỷ lệ chính xác; kết quả theo phần thi, theo kỹ năng, theo dạng 問題; điểm thô và **điểm quy đổi tham khảo** của từng phần điểm (quy đổi tuyến tính, làm tròn theo cấu hình); `estimatePass()` (đạt điểm tổng và không phần nào dưới điểm liệt).
- Kiểm tra: test các trường hợp: đúng hết, bỏ trống hết, hỗn hợp, làm tròn ở biên, tổng điểm đạt nhưng trượt điểm liệt một phần.

#### T1.2.7 — exam-engine: kiểm tra và gộp phiếu trả lời   [AGENT]
- Phụ thuộc: T1.2.3.
- Làm: `validateSheet(answers, snapshotMeta)` (độ dài đúng bằng tổng số câu; mỗi giá trị từ 0 tới số lựa chọn của câu đó); `mergeSheet(stored, incoming, lockedRanges)` (giữ nguyên đáp án đã lưu trong các phần đã khóa).
- Kiểm tra: test cho câu 3 lựa chọn và 4 lựa chọn, phiếu sai độ dài, giá trị ngoài khoảng, phần đã khóa bị client gửi khác đi.

#### T1.2.8 — exam-engine: vị trí trên timeline phần nghe   [AGENT]
- Phụ thuộc: T1.2.3.
- Đọc thêm: Phụ lục A5 (`listeningTimeline`).
- Làm: `listeningPosition(timeline, sectionStartedAt, now)` trả `{ state: "playing" | "gap" | "ended", segmentIndex, offsetMs }`.
- Kiểm tra: test ở đầu đoạn, giữa đoạn, trong khoảng nghỉ, đúng mốc chuyển đoạn, sau khi hết timeline.

#### T1.2.9 — exam-engine: kiểm tra đề theo blueprint   [AGENT]
- Phụ thuộc: T1.2.2.
- Làm: `validateBlueprint(examStructure, blueprint)` trả danh sách vi phạm `{ code, message, sectionCode, mondaiType, expected, actual }` (sai thứ tự phần, thiếu/thừa câu của một dạng, sai thời gian).
- Kiểm tra: đề đúng cấu trúc trả danh sách rỗng; mỗi loại vi phạm có ít nhất 1 test.

#### T1.2.10 — Schema DB, migration, seed   [AGENT]
- Phụ thuộc: T1.2.4, T1.1.4.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 11; Phụ lục A10.
- Làm: Drizzle ORM trong `apps/api/src/db/`: schema cho mọi bảng V1, migration, script `pnpm --filter api db:migrate`, `db:seed`. Seed dev gồm: các role, blueprint từ fixture, 1 tài khoản admin dev, 1 đề mẫu N5 tự soạn (khoảng 6 câu, có 1 câu ★, 1 câu furigana, 1 nhóm nghe). Audio mẫu là file tự tạo (âm sine, vài giây), **không dùng audio có bản quyền**.
- Kiểm tra: `db:migrate` chạy trên DB trống; chạy lại lần 2 không lỗi; `db:seed` tạo đủ dữ liệu.

#### T1.2.11 — Test ràng buộc DB và tạo partition   [AGENT]
- Phụ thuộc: T1.2.10.
- Làm: test (Vitest + PostgreSQL thật từ Docker) cho: CHECK `user_id`/`guest_id`; khóa ngoại attempt → `exam_versions`; mỗi user chỉ có 1 attempt đang mở cho mỗi đề; unique `(attempt_month, attempt_id, seq)`. Script `pnpm --filter api db:partitions` tạo partition `attempt_events` cho tháng hiện tại và 2 tháng kế tiếp (chạy được nhiều lần).
- Kiểm tra: mọi test ràng buộc pass; chạy `db:partitions` 2 lần liên tiếp không lỗi.

**Cổng ra Phase 1.2:** coverage `packages/exam-engine` ≥ 90%; migration và seed chạy trên DB trống; JSON Schema đã xuất và commit.

---

### Phase 1.3 — Tài khoản & bảo mật nền (2 tuần)

**Mục tiêu:** đăng ký, đăng nhập, phân quyền, 2FA cho nhân sự, rate limit, audit log, header bảo mật đều chạy và có test.

#### T1.3.1 — Nền của API   [AGENT]
- Phụ thuộc: T1.2.11.
- Đọc thêm: Phụ lục A3, A9; `DE_XUAT_KY_THUAT.md` mục 9.
- Làm: module cấu hình đọc env và validate bằng Zod (thiếu biến thì dừng khởi động); logging bằng pino, che (redact) các trường `password`, `token`, `cookie`, `authorization`, `email`; exception filter trả lỗi theo Phụ lục A9; request id; `GET /api/v1/health` kiểm tra PostgreSQL và cả hai Redis. Lấy IP người dùng từ header `CF-Connecting-IP` khi request đến từ `127.0.0.1` (tức là qua Tunnel), ngược lại dùng IP kết nối.
- Kiểm tra: test thiếu env thì app không khởi động; test lỗi trả đúng định dạng A9; log không chứa trường bị che; health trả lỗi 503 khi tắt Redis.

#### T1.3.2 — Xác thực bằng Better Auth   [AGENT]
- Phụ thuộc: T1.3.1.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 9 (Mật khẩu, Session, Xác thực bổ sung); tài liệu chính thức của Better Auth (đúng phiên bản cài).
- Làm: tích hợp Better Auth vào NestJS (Fastify) tại `/api/v1/auth/*`: đăng ký email/mật khẩu, đăng nhập, đăng xuất, xác minh email bắt buộc trước khi làm bài, quên/đặt lại mật khẩu (link dùng 1 lần, hết hạn sau 30 phút), danh sách và thu hồi session. Băm mật khẩu bằng Argon2id. Kiểm tra mật khẩu đã bị lộ qua HIBP (k-anonymity). Cookie phiên tên `__Host-session`, `HttpOnly; Secure; SameSite=Lax; Path=/`, không có `Domain`. Quên mật khẩu luôn trả cùng một thông báo.
- Không làm: không tự viết hệ thống auth từ đầu. Nếu không tích hợp được Better Auth với Fastify → dừng và báo cáo (A4).
- Kiểm tra: test luồng đăng ký → xác minh → đăng nhập → đăng xuất; header `Set-Cookie` đúng các thuộc tính trên; đặt lại mật khẩu thì các session cũ bị thu hồi; email không tồn tại và email tồn tại nhận cùng response.

#### T1.3.3 — Gửi email   [AGENT]
- Phụ thuộc: T1.3.1.
- Mã tính năng: NOTI-01, NOTI-02.
- Làm: interface `EmailSender` với 2 bản: `ResendEmailSender` (production) và `SmtpEmailSender` (dev, gửi tới Mailpit). Mẫu email tiếng Việt: xác minh tài khoản, đặt lại mật khẩu (có bản HTML và bản text).
- Kiểm tra: ở dev, email xác minh hiện trong Mailpit (`http://127.0.0.1:8025`); test render mẫu email có đủ link.

#### T1.3.4 — Phân quyền RBAC + kiểm tra theo tài nguyên   [AGENT]
- Phụ thuộc: T1.3.2.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 9 (Phân quyền).
- Làm: role `admin`, `editor`, `reviewer`, `teacher`, `student`. Guard toàn cục **mặc định từ chối**; endpoint công khai phải gắn decorator `@Public()`. Dùng CASL cho kiểm tra theo tài nguyên (ví dụ chỉ chủ attempt được đọc attempt).
- Kiểm tra: test endpoint không có decorator nào thì trả 401; học viên A đọc attempt của học viên B → 403 (hoặc 404); role thiếu quyền → 403.

#### T1.3.5 — 2FA cho nhân sự và khóa route admin   [AGENT]
- Phụ thuộc: T1.3.4.
- Làm: bật plugin TOTP của Better Auth (passkey làm thêm nếu dễ). Role `admin`, `editor`, `reviewer` bắt buộc đã bật 2FA mới được gọi `/api/v1/admin/*`. Route admin chỉ nhận request có header `Host` bằng `ADMIN_HOST`.
- Kiểm tra: tài khoản editor chưa bật 2FA gọi route admin → 403 với mã `TWO_FACTOR_REQUIRED`; gọi route admin với `Host` của trang học viên → 404.

#### T1.3.6 — Rate limit và Turnstile   [AGENT]
- Phụ thuộc: T1.3.2.
- Làm: rate limiter trên Redis `core` theo IP và theo user, cấu hình theo nhóm route (auth: 10 request/phút/IP; tạo attempt: 20 lần/giờ/user; lưu phiếu: 30 request/phút/attempt). Service kiểm tra Turnstile (secret từ env; ở dev dùng key thử nghiệm của Cloudflare). Áp dụng Turnstile cho đăng ký, đăng nhập, quên mật khẩu và khi khách bắt đầu làm thử.
- Kiểm tra: test vượt giới hạn trả 429 với mã `RATE_LIMITED` và header `Retry-After`; thiếu hoặc sai token Turnstile → 400 `TURNSTILE_FAILED`.

#### T1.3.7 — Audit log   [AGENT]
- Phụ thuộc: T1.3.4.
- Mã tính năng: ADM-14.
- Làm: interceptor ghi `audit_logs` cho mọi request ghi (POST/PUT/PATCH/DELETE) vào `/api/v1/admin/*`: người thực hiện, hành động, thực thể, id, diff (không chứa secrets), IP, thời gian.
- Kiểm tra: test một thao tác admin tạo đúng 1 dòng audit; diff không chứa trường nhạy cảm.

#### T1.3.8 — Hồ sơ người dùng cơ bản   [AGENT]
- Phụ thuộc: T1.3.4.
- Mã tính năng: ACC-07, ACC-10.
- Làm: `GET /api/v1/me` (tên, email, cấp độ đang ôn, số đề đã hoàn thành), `PATCH /api/v1/me` (đổi tên, cấp độ đang ôn N1–N5).
- Kiểm tra: test đọc/sửa của chính mình; không sửa được trường `role` qua endpoint này.

#### T1.3.9 — Giao diện tài khoản trên web   [AGENT]
- Phụ thuộc: T1.3.2, T1.3.3.
- Làm: cài next-intl với `messages/vi.json`; trang đăng ký, đăng nhập, xác minh email, quên mật khẩu, đặt lại mật khẩu, trang tài khoản (cấp độ đang ôn); widget Turnstile. Mọi chuỗi giao diện nằm trong `messages/vi.json`.
- Kiểm tra: Playwright: đăng ký → mở email trong Mailpit → xác minh → đăng nhập → đổi cấp độ → đăng xuất.

#### T1.3.10 — Đăng nhập admin và thiết lập 2FA   [AGENT]
- Phụ thuộc: T1.3.5.
- Làm: trang đăng nhập của `apps/admin`; lần đầu đăng nhập với role nhân sự thì bắt buộc thiết lập TOTP (hiện mã QR, xác nhận mã 6 số, hiện mã khôi phục 1 lần).
- Kiểm tra: Playwright: tài khoản editor mới đăng nhập → bị chuyển tới thiết lập 2FA → hoàn tất → vào được trang chủ admin.

#### T1.3.11 — Header bảo mật   [AGENT]
- Phụ thuộc: T1.3.9.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 9 (CSP).
- Làm: web và admin: trang động dùng CSP có nonce; trang tĩnh dùng CSP không nonce (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, chỉ cho phép script từ chính site và `challenges.cloudflare.com` cho Turnstile). Thêm `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. API: request ghi phải có `Content-Type: application/json` (trừ upload) và header `Origin` khớp host.
- Kiểm tra: test header trên 1 trang tĩnh và 1 trang động; request ghi có `Origin` lạ → 403.

#### T1.3.12 — Bật E2E trong CI   [AGENT]
- Phụ thuộc: T1.3.9, T1.3.10.
- Làm: job E2E trong CI dựng PostgreSQL, 2 Redis, Mailpit bằng service container; chạy migrate + seed rồi chạy Playwright.
- Kiểm tra: CI xanh với các test E2E của T1.3.9 và T1.3.10.

**Cổng ra Phase 1.3:** toàn bộ test auth, phân quyền, rate limit pass; E2E chạy trong CI.

---

### Phase 1.4 — Ngân hàng câu hỏi, admin, xuất bản đề (3 tuần)

**Mục tiêu:** biên tập viên nhập đề (từ file JSON), sửa, gửi duyệt; người duyệt duyệt; admin xuất bản thành `ExamVersion` bất biến.

#### T1.4.1 — Lưu trữ file   [AGENT]
- Phụ thuộc: T1.3.12.
- Đọc thêm: Phụ lục A3 (biến R2), A1.
- Làm: interface `ObjectStorage` (`put`, `get` có hỗ trợ range, `head`, `delete`) với 2 bản: `LocalFsStorage` (dev/test, ghi vào `.data/storage/`) và `R2Storage` (S3 API của R2). Chọn bản theo env `STORAGE_DRIVER`.
- Kiểm tra: cùng một bộ test chạy cho `LocalFsStorage`; `R2Storage` có test tích hợp chỉ chạy khi có biến môi trường R2.

#### T1.4.2 — Module media   [AGENT]
- Phụ thuộc: T1.4.1.
- Làm: `POST /api/v1/admin/media` (multipart, stream thẳng vào storage): kiểm tra magic bytes + MIME; giới hạn: audio MP3/M4A ≤ 100 MB, ảnh WebP/PNG/JPEG/AVIF ≤ 5 MB, PDF ≤ 100 MB. Key theo nội dung: `media/{sha256}.{ext}`; file trùng thì dùng lại bản ghi cũ. Đọc độ dài audio bằng thư viện `music-metadata`. `GET /api/v1/admin/media/:id` để xem trước trong admin.
- Kiểm tra: file đổi đuôi giả (ví dụ `.mp3` nhưng nội dung là `.exe`) bị từ chối; tải cùng file 2 lần chỉ tạo 1 bản ghi; độ dài audio đúng sai số ±1 giây.

#### T1.4.3 — Nguồn đề và bản quyền   [AGENT]
- Phụ thuộc: T1.3.12.
- Mã tính năng: QB-16, QB-17, LIB-15.
- Làm: CRUD `exam_sources` và `content_licenses` (API + trang admin).
- Kiểm tra: không xóa được license đang được câu hỏi tham chiếu; audit log ghi đủ.

#### T1.4.4 — API ngân hàng câu hỏi   [AGENT]
- Phụ thuộc: T1.4.2, T1.4.3.
- Mã tính năng: QB-01…07, QB-11, QB-13.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 10.5, 11.
- Làm: CRUD nhóm câu, câu hỏi, lựa chọn, đáp án đúng; validate nội dung bằng schema RichText; cột `search_text` sinh từ `toPlainText()` + index pg_bigm; tìm kiếm và lọc theo cấp độ, dạng 問題, nguồn, trạng thái, từ khóa (tiếng Việt không dấu dùng `unaccent`). Quy tắc phiên bản: nhóm ở trạng thái `draft`/`rejected` sửa trực tiếp; nhóm `approved` khi sửa thì tạo version mới ở trạng thái `draft`, version cũ giữ nguyên.
- Kiểm tra: test sửa nhóm `approved` tạo version mới; tìm kiếm 2 ký tự kanji ra kết quả; không có endpoint công khai nào trả `correct_answers`.

#### T1.4.5 — Component hiển thị RichText   [AGENT]
- Phụ thuộc: T1.2.1.
- Làm: trong `packages/ui`: `RichTextView` và `RichBlockView` render đúng mọi loại đoạn ở Phụ lục A4 (`<ruby>…<rt>…</rt></ruby>`, gạch chân, ô trống, ô trống có ★, xuống dòng, ảnh qua hàm `resolveMediaUrl` truyền vào). Không dùng `dangerouslySetInnerHTML`.
- Kiểm tra: test (Testing Library) cho từng loại đoạn; nội dung chứa `<script>` hiển thị dạng chữ, không chạy.

#### T1.4.6 — Giao diện biên tập câu hỏi   [AGENT]
- Phụ thuộc: T1.4.4, T1.4.5, T1.3.10.
- Làm: khung admin (menu theo role); danh sách nhóm câu có bộ lọc; trình biên tập nhóm: hướng dẫn, đoạn văn, media, các câu hỏi (đề bài, lựa chọn, đáp án đúng). Trình soạn RichText theo từng đoạn (thêm đoạn chữ, ruby, gạch chân, ô trống, ô ★, ảnh); xem trước bằng đúng component của phòng thi.
- Kiểm tra: Playwright: tạo một nhóm gồm 1 câu có ruby và 1 câu ★, lưu, mở lại thấy đúng nội dung; ảnh chụp màn hình phần xem trước đính kèm PR.

#### T1.4.7 — Quy trình kiểm duyệt   [AGENT]
- Phụ thuộc: T1.4.6.
- Mã tính năng: QB-13.
- Làm: trạng thái `draft → in_review → approved | rejected`, thêm `hidden` để tạm ẩn. Người duyệt **không được** là người sửa cuối cùng của nhóm đó (kiểm tra ở server). Bình luận khi từ chối. Trang hàng chờ duyệt cho role `reviewer`.
- Kiểm tra: test editor tự duyệt nội dung của mình → 403; mỗi chuyển trạng thái ghi `content_reviews` và audit log.

#### T1.4.8 — Quản lý blueprint   [AGENT]
- Phụ thuộc: T1.4.6.
- Mã tính năng: ADM-08.
- Làm: xem, tạo phiên bản mới, kích hoạt blueprint (không sửa đè phiên bản đã dùng); trường `source_ref` bắt buộc.
- Kiểm tra: sửa blueprint tạo version mới; đề đã xuất bản vẫn tham chiếu version cũ.

#### T1.4.9 — Ghép đề   [AGENT]
- Phụ thuộc: T1.4.7, T1.4.8, T1.2.9.
- Mã tính năng: ADM-04, LIB-05.
- Làm: tạo đề (`kind`: `original` hoặc `practice`, chọn blueprint, nguồn); phần thi sinh theo blueprint; thêm nhóm câu `approved` vào từng phần theo thứ tự; hiện danh sách vi phạm từ `validateBlueprint()`.
- Kiểm tra: đề thiếu câu hiện đúng vi phạm; thêm nhóm chưa `approved` bị chặn.

#### T1.4.10 — Nhập đề từ gói JSON   [AGENT]
- Phụ thuộc: T1.4.4, T1.2.3.
- Mã tính năng: PDF-01, PDF-03, PDF-04, PDF-05, PDF-27 (cơ bản).
- Đọc thêm: Phụ lục A7.
- Làm: trang admin tải lên gói `.zip` (gồm `import.json` + thư mục `media/`) và PDF gốc. Server validate theo schema, kiểm tra checksum từng file media, tạo `import_jobs` và các nhóm câu ở trạng thái `draft`. Tải lại cùng một gói (cùng checksum) không tạo bản ghi trùng.
- Kiểm tra: nhập gói mẫu tạo đúng số nhóm/câu; gói sai schema bị từ chối kèm danh sách lỗi dễ hiểu; nhập lại gói cũ không tạo trùng.

#### T1.4.11 — Xuất bản đề   [AGENT]
- Phụ thuộc: T1.4.9.
- Mã tính năng: ADM-07, ADM-19.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 8.2 (quy tắc 1), 10.5; Phụ lục A5, A10.
- Làm: `POST /api/v1/admin/exams/:id/publish`: kiểm tra `validateBlueprint()` (đề `original` phải không có vi phạm), mọi nhóm `approved`, mọi câu có đáp án, license cho phép; trong 1 transaction tạo `exam_versions` + `exam_answer_keys`; ghi `snapshot.json` và `manifest.json` vào storage; gọi revalidate của web (T1.6.8) và purge Cloudflare (nếu có cấu hình). Gỡ đề (takedown): ẩn đề khỏi thư viện, không xóa các version.
- Kiểm tra: snapshot sinh ra qua validate của `ExamSnapshot` và **không chứa** đáp án (test quét toàn bộ JSON); xuất bản lần 2 tạo version 2, version 1 giữ nguyên.

#### T1.4.12 — Người dùng, audit log, tổng quan admin   [AGENT]
- Phụ thuộc: T1.3.7.
- Mã tính năng: ADM-01, ADM-02, ADM-03, ADM-14.
- Làm: trang danh sách người dùng (tìm kiếm, đổi role, khóa tài khoản); trang xem audit log có bộ lọc; trang tổng quan (số đề, số câu theo trạng thái, số người dùng, số lượt thi trong ngày).
- Kiểm tra: chỉ `admin` đổi được role; mọi thao tác hiện trong audit log.

**Cổng ra Phase 1.4:** biên tập viên nhập gói JSON mẫu, sửa, gửi duyệt; người duyệt duyệt; admin xuất bản; snapshot trong storage hợp lệ và không có đáp án.

---

### Phase 1.5 — Phòng thi & chấm điểm (5 tuần)

**Mục tiêu:** học viên làm trọn một bài thi thật hoặc luyện tập trên máy tính và điện thoại, không mất đáp án trong mọi tình huống ở mục 8.3 của `DE_XUAT_KY_THUAT.md`.

**Đọc thêm cho cả phase:** `DE_XUAT_KY_THUAT.md` mục 8 (toàn bộ); Phụ lục A5, A8, A9, A10, A11.

#### T1.5.1 — Package media-token   [AGENT]
- Phụ thuộc: T1.4.11.
- Làm: `packages/media-token`: `signMediaToken()` và `verifyMediaToken()` theo Phụ lục A11, chỉ dùng WebCrypto (chạy được cả trên Node lẫn Cloudflare Worker).
- Kiểm tra: test token hợp lệ, hết hạn, sửa 1 ký tự payload, sai secret, sai `examId`/`version`.

#### T1.5.2 — Tạo lượt thi   [AGENT]
- Phụ thuộc: T1.5.1.
- Làm: `POST /api/v1/attempts` theo Phụ lục A8: chọn version mới nhất đã xuất bản; mỗi user chỉ có 1 attempt đang mở cho mỗi đề (nếu đã có → 409 `ATTEMPT_ALREADY_OPEN` kèm `attemptId`); tạo lease, `mediaToken`, `snapshotUrl`; tạo dòng `attempt_answer_sheets` rỗng.
- Kiểm tra: test tạo thành công; tạo lần 2 → 409 kèm `attemptId`; email chưa xác minh → 403 `EMAIL_NOT_VERIFIED`.

#### T1.5.3 — Bắt đầu và chuyển phần thi   [AGENT]
- Phụ thuộc: T1.5.2.
- Làm: `POST /api/v1/attempts/:id/sections/next` theo Phụ lục A8 và bảng 8.3: phần đầu tiên hoặc khóa phần hiện tại rồi bắt đầu phần kế; deadline tính bằng `computeSectionDeadline()`; cập nhật `section_times`, `current_section`, `current_deadline`; ghi sự kiện vào `attempt_events`.
- Kiểm tra: test lease sai → 409 `LEASE_INVALID`; hết phần → 409 `NO_MORE_SECTIONS`; deadline đúng theo thời lượng của phần.

#### T1.5.4 — Lưu phiếu trả lời   [AGENT]
- Phụ thuộc: T1.5.3, T1.2.7.
- Làm: `PUT /api/v1/attempts/:id/sheet` đúng các quy tắc 3–9 của mục 8.2: kiểm tra lease, trạng thái, deadline + grace (chế độ thi thật), cửa sổ nhận phiếu muộn; validate phiếu; trong 1 transaction: INSERT `changes` vào `attempt_events` (`ON CONFLICT DO NOTHING`), UPDATE phiếu chỉ khi `seq > last_seq` (dùng `mergeSheet()` để giữ phần đã khóa). Chỉ trả 200 sau khi commit.
- Kiểm tra (test tích hợp với PostgreSQL thật):
  - lô `seq=2` đến trước `seq=1` → phiếu cuối là của lô 2; nhật ký có cả 2 lô;
  - gửi trùng `seq` → 200, không ghi trùng;
  - sau `deadline + grace` ở chế độ thi thật → 422 `DEADLINE_PASSED` (trừ trường hợp nhận phiếu muộn);
  - phần đã khóa không bị thay đổi;
  - phiếu sai độ dài → 400 `VALIDATION_ERROR`.

#### T1.5.5 — Nộp bài và chấm điểm   [AGENT]
- Phụ thuộc: T1.5.4, T1.2.6.
- Làm: `POST /api/v1/attempts/:id/submit`: `SELECT … FOR UPDATE` dòng attempt; nếu đã nộp → trả kết quả cũ; lưu phiếu cuối nếu `seq` mới hơn; chấm bằng `score()` với answer key của đúng `ExamVersion` (cache trong bộ nhớ theo `(examId, version)`); lưu `result`, `status = submitted`, `submitted_by`; ghi event `attempt.submitted` vào `outbox` trong cùng transaction.
- Kiểm tra: gọi submit 2 lần đồng thời → chỉ chấm 1 lần, cả 2 response giống nhau; kết quả khớp tính tay với đề mẫu; trong response không có answer key của câu nào khác ngoài những gì trang kết quả cần (Phụ lục A8).

#### T1.5.6 — Vào lại bài, token media, xem lại, lịch sử   [AGENT]
- Phụ thuộc: T1.5.5.
- Mã tính năng: EXAM-18, SCORE-07, SCORE-08, STAT-01.
- Làm: `POST /attempts/:id/resume` (cấp lease mới, vô hiệu lease cũ, ghi sự kiện), `POST /attempts/:id/media-token`, `GET /attempts/:id`, `GET /attempts/:id/review` (chỉ sau khi nộp, chỉ chủ attempt), `GET /me/attempts` (phân trang theo cursor).
- Kiểm tra: sau `resume`, request mang lease cũ → 409; `review` trước khi nộp → 409 `ATTEMPT_NOT_SUBMITTED`; người khác gọi `review` → 404.

#### T1.5.7 — Job nền của worker   [AGENT]
- Phụ thuộc: T1.5.5.
- Đọc thêm: Phụ lục A14.
- Làm: chạy `api` ở chế độ `worker` (cùng image, khác lệnh). Các job theo Phụ lục A14: chuyển `outbox` sang BullMQ; đóng attempt quá hạn (sau cửa sổ nhận phiếu muộn) bằng **cùng hàm khóa + chấm** với submit; đóng bài bỏ dở quá 24 giờ giữa hai phần; tạo partition tháng kế tiếp; tách `user_answers` sau khi nộp; cập nhật số đề đã hoàn thành của user.
- Kiểm tra: test client submit cùng lúc với job đóng bài → chỉ 1 kết quả; job chạy lại nhiều lần không tạo dữ liệu trùng.

#### T1.5.8 — Cổng media (Cloudflare Worker) và bản dev   [AGENT]
- Phụ thuộc: T1.5.1.
- Đọc thêm: Phụ lục A11, A13.
- Làm: `apps/media-worker`: kiểm tra token; đọc `manifest.json` của version (cache trong Worker); chỉ trả file có trong manifest; hỗ trợ header `Range` (trả 206); `Content-Type` đúng; cache ở edge với cache key **bỏ tham số `t`**; lỗi trả `Cache-Control: no-store`. Trong `apps/api`, route dev `/dev-media/*` dùng đúng logic đó (chỉ bật khi `NODE_ENV=development`).
- Kiểm tra: test (`@cloudflare/vitest-pool-workers`): token sai → 403; file ngoài manifest → 403; request `Range: bytes=0-99` → 206 với đúng 100 byte; hai request khác token cùng file dùng chung cache.

#### T1.5.9 — Lớp dữ liệu phía client của phòng thi   [AGENT]
- Phụ thuộc: T1.5.6.
- Làm: trong `apps/web`: store Zustand; lưu IndexedDB bằng Dexie; bộ đồng bộ theo quy tắc 6 của mục 8.2 (debounce 3 giây, tối đa 10 giây, 1 request đang chờ, gửi khi chuyển phần, khi `visibilitychange`, `fetch` với `keepalive` khi `pagehide`); đánh dấu "chưa đồng bộ" tới khi có 200; xử lý 409 `LEASE_INVALID`; tính `offset` đồng hồ.
- Kiểm tra: unit test với fake timer: 5 thay đổi trong 2 giây chỉ tạo 1 request; khi request đang chờ thì thay đổi mới được gộp vào lần sau; mất mạng thì dữ liệu vẫn nằm trong IndexedDB và được gửi lại khi có mạng.

#### T1.5.10 — Giao diện phòng thi   [AGENT]
- Phụ thuộc: T1.5.9, T1.4.5.
- Mã tính năng: EXAM-01…04, EXAM-06…17, EXAM-19…22.
- Làm: route `/thi/[attemptId]` (client component, lazy-load, `noindex`): màn hình chọn chế độ và hướng dẫn; hiển thị câu hỏi bằng `RichTextView`; chọn/đổi/bỏ đáp án; câu trước/sau; bảng phiếu trả lời; đánh dấu xem lại; phân biệt câu đã làm/chưa làm/đã đánh dấu; thanh tiến độ; đồng hồ đếm ngược theo deadline server; xác nhận trước khi nộp sớm; chuyển phần và khóa phần; tự nộp khi hết thời gian; hộp thoại khi bài thi đang mở ở nơi khác; báo trạng thái mất mạng.
- Kiểm tra: Playwright làm trọn đề mẫu ở chế độ thi thật; ảnh chụp màn hình desktop và mobile (390×844) đính kèm PR; route này không có trong bundle của trang chủ (kiểm tra output của `next build`).

#### T1.5.11 — Phần nghe hiểu   [AGENT]
- Phụ thuộc: T1.5.10, T1.2.8.
- Mã tính năng: AUDIO-01…04, AUDIO-10, EXAM-05.
- Làm: tải trước audio vào Cache Storage trong lúc làm các phần trước (hiện tiến độ tải); nút "Bắt đầu phần nghe" chỉ bật khi đã tải đủ, kiêm bước kiểm tra loa; phát liên tục theo `listeningTimeline` bằng blob URL; chế độ thi thật ẩn thanh tua và chặn seek; tải lại trang thì phát tiếp tại vị trí `listeningPosition()`; lỗi phát: thử lại tại vị trí đồng bộ, vẫn lỗi thì cho kết thúc phần nghe và gắn cờ `interrupted`.
- Kiểm tra: Playwright: tải lại trang giữa phần nghe → audio tiếp tục đúng vị trí (sai số ≤ 2 giây); thử thủ công trên iPhone thật và Android thật, ghi kết quả vào `docs/testing/exam-room-devices.md`.

#### T1.5.12 — Kết quả, xem lại, lịch sử   [AGENT]
- Phụ thuộc: T1.5.6.
- Mã tính năng: SCORE-01…04, SCORE-06…08, SCORE-11, STAT-01, ACC-10.
- Làm: trang kết quả (đúng/sai/bỏ trống, tỷ lệ chính xác, theo phần thi và kỹ năng, thời gian làm bài, điểm quy đổi **có ghi rõ "tham khảo, không phải điểm JLPT chính thức"**); trang xem lại từng câu với đáp án đúng; trang lịch sử làm bài; banner "Tiếp tục làm bài" trên trang chủ khi có bài đang mở.
- Kiểm tra: Playwright: nộp đề mẫu → kết quả khớp đáp án đã biết; lịch sử hiện lượt thi vừa làm.

#### T1.5.13 — Khách làm thử   [AGENT]
- Phụ thuộc: T1.5.5, T1.3.6.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 8.2 (quy tắc 14); quyết định D4.
- Làm: chỉ với đề có cờ `guest_trial`: cookie `__Host-guest` (UUID), bắt buộc Turnstile, tối đa 3 lượt/ngày/IP; khi khách đăng nhập hoặc đăng ký thì gắn các attempt của `guest_id` vào tài khoản.
- Kiểm tra: khách làm đề không có cờ → 401; sau khi đăng ký, lịch sử có lượt làm thử.

#### T1.5.14 — Bộ test kịch bản phòng thi   [AGENT]
- Phụ thuộc: T1.5.7, T1.5.11.
- Làm: test tích hợp API và Playwright E2E cho các tình huống: request đến sai thứ tự, gửi trùng, mất mạng 30 giây (`context.setOffline`), mất mạng đúng lúc hết thời gian (nhận phiếu muộn), mở 2 tab, tải lại trang giữa bài và giữa phần nghe, hết thời gian một phần (dùng `page.clock`), nộp bài trùng lúc worker đóng bài. Thêm test "không lộ đáp án": quét mọi response của API học viên và snapshot trong một lượt thi trước khi nộp, không được có answer key.
- Kiểm tra: toàn bộ kịch bản pass trong CI.

**Cổng ra Phase 1.5:** mọi kịch bản ở T1.5.14 pass; làm trọn đề mẫu trên iPhone, Android và desktop; không có đáp án trong dữ liệu gửi tới client trước khi nộp.

---

### Phase 1.6 — Trang public & SEO (3 tuần)

**Mục tiêu:** trang chủ, trang cấp độ, thư viện đề và trang giới thiệu đề là HTML tĩnh, nhanh, chuẩn SEO; người dùng bắt đầu làm bài từ đây.

**Đọc thêm cho cả phase:** `DE_XUAT_KY_THUAT.md` mục 7 (toàn bộ).

#### T1.6.1 — Layout, design system, font   [AGENT]
- Phụ thuộc: T1.5.12.
- Làm: preset Tailwind trong `packages/config` (màu, cỡ chữ, khoảng cách); layout chung (header, footer, menu mobile); font giao diện có subset `vietnamese`; Noto Sans JP qua `next/font/google`, **không preload**, chỉ áp dụng cho class dùng ở vùng chữ Nhật.
- Kiểm tra: chữ tiếng Việt có dấu chồng (ề, ộ, ữ) hiển thị đúng; tab Network không tải font Nhật ở trang không có chữ Nhật.

#### T1.6.2 — Trang chủ   [AGENT]
- Phụ thuộc: T1.6.1.
- Làm: trang chủ tĩnh: giới thiệu ngắn, lối vào 5 cấp độ, đề nổi bật. Banner "Tiếp tục làm bài" (T1.5.12) tải phía client sau khi trang hiển thị.
- Kiểm tra: `next build` đánh dấu route `/` là tĩnh; HTML không chứa dữ liệu cá nhân.

#### T1.6.3 — Trang cấp độ và danh sách đề   [AGENT]
- Phụ thuộc: T1.6.1.
- Mã tính năng: LIB-01…07, LIB-15, SEO-01, SEO-02.
- Làm: `/n1` … `/n5` (giới thiệu cấp độ), `/n3/de-thi` (danh sách đề của cấp), `/n3/de-thi/2021-12` (theo năm và kỳ). Dữ liệu lấy từ `GET /api/v1/exams` lúc build/ISR qua `API_INTERNAL_URL`. Bộ lọc năm, kỳ, loại đề (gốc/luyện tập/trộn) và ô tìm kiếm lọc phía client trên danh sách tĩnh. Mỗi đề hiện số câu, thời gian, các phần thi, nhãn loại đề, nguồn và bản quyền.
- Kiểm tra: các route này là tĩnh trong output `next build`; lọc không gây request mới tới API.

#### T1.6.4 — Trang giới thiệu đề và nút bắt đầu   [AGENT]
- Phụ thuộc: T1.6.3.
- Làm: `/de-thi/[slug]` (SSG/ISR): thông tin đề, cấu trúc phần thi, nút "Bắt đầu" (client component): chưa đăng nhập thì chuyển tới đăng nhập (hoặc làm thử nếu đề có `guest_trial`), rồi chọn chế độ → `POST /api/v1/attempts` → chuyển tới `/thi/[attemptId]`. Nếu nhận 409 `ATTEMPT_ALREADY_OPEN` thì hỏi "Tiếp tục bài đang làm?".
- Kiểm tra: Playwright: từ trang chủ → cấp N5 → đề mẫu → bắt đầu → vào phòng thi.

#### T1.6.5 — Trạng thái cá nhân trên thư viện đề   [AGENT]
- Phụ thuộc: T1.6.3.
- Mã tính năng: LIB-08.
- Làm: `GET /api/v1/me/exam-status?level=N3` trả trạng thái từng đề (chưa làm, đang làm, đã hoàn thành); client gọi sau khi trang hiển thị và gắn nhãn lên danh sách.
- Kiểm tra: HTML trả từ server giống hệt nhau cho người đã đăng nhập và người chưa đăng nhập; nhãn trạng thái chỉ xuất hiện sau khi tải phía client.

#### T1.6.6 — Trang hỗ trợ và pháp lý   [AGENT]
- Phụ thuộc: T1.6.1.
- Mã tính năng: SEO-10, SYS-13.
- Làm: FAQ, liên hệ, hỗ trợ, chính sách quyền riêng tư, điều khoản sử dụng (nội dung do chủ dự án cung cấp; agent dựng khung với chỗ trống ghi rõ "CẦN NỘI DUNG"); banner đồng ý cookie (chỉ tải analytics sau khi đồng ý, nếu analytics dùng cookie).
- Kiểm tra: các trang tĩnh; banner nhớ lựa chọn.

#### T1.6.7 — SEO kỹ thuật   [AGENT]
- Phụ thuộc: T1.6.4.
- Mã tính năng: SEO-06, SEO-07, SEO-08.
- Làm: metadata và Open Graph mọi trang public; `sitemap.xml` sinh từ danh sách đề đã xuất bản; `robots.txt` chặn `/thi/`, `/tai-khoan/`, `/api/`; JSON-LD (`Course`, `FAQPage`, `BreadcrumbList`); `canonical`; `noindex` cho mọi trang ứng dụng.
- Kiểm tra: sitemap hợp lệ (validator XML); JSON-LD qua công cụ Rich Results Test của Google (dán kết quả vào PR).

#### T1.6.8 — Revalidate khi xuất bản   [AGENT]
- Phụ thuộc: T1.6.3, T1.4.11.
- Làm: route `POST /api/revalidate` trong `apps/web` (secret trong header, so sánh an toàn theo thời gian) để revalidate theo tag/path; `apps/api` gọi route này sau khi xuất bản hoặc gỡ đề, rồi gọi API purge của Cloudflare theo danh sách URL (nếu có `CLOUDFLARE_API_TOKEN`).
- Kiểm tra: xuất bản đề mới → trang danh sách hiện đề đó mà không cần build lại; gọi không có secret → 401.

#### T1.6.9 — Ngân sách hiệu năng trong CI   [AGENT]
- Phụ thuộc: T1.6.7.
- Làm: Lighthouse CI (mobile) cho `/`, `/n3`, `/n3/de-thi`, `/de-thi/[slug mẫu]` với ngưỡng ở mục 2 của `DE_XUAT_KY_THUAT.md`; script đọc output `next build` và **fail CI** nếu một route public trở thành động hoặc JS tải lần đầu vượt 150 KB (gzip). Đo dữ liệu thực bằng Cloudflare Web Analytics (chủ dự án bật trong dashboard, không cần code).
- Kiểm tra: CI chạy Lighthouse và script kiểm tra route; cố ý thêm `cookies()` vào trang chủ thì CI fail.

**Cổng ra Phase 1.6:** ngưỡng Lighthouse pass; route public đều tĩnh; luồng từ trang chủ tới phòng thi chạy được.

---

### Phase 1.7 — Nhập PDF/OCR (4 tuần, có thể song song với 1.5–1.6)

**Mục tiêu:** biên tập viên chạy CLI trên máy mình để biến bộ PDF đề + đáp án + audio thành gói nhập đề; xem lại và sửa trên admin cạnh PDF gốc.

**Đọc thêm cho cả phase:** `DE_XUAT_KY_THUAT.md` mục 12; Phụ lục A4, A7; `docs/spikes/ocr-report.md`.

#### T1.7.1 — Khung CLI   [AGENT]
- Phụ thuộc: T1.2.3, T1.0.7.
- Làm: `apps/ocr-worker` có các lệnh `jlpt-ocr extract`, `jlpt-ocr validate`, `jlpt-ocr pack`; đọc key từ env; thư mục cache `.cache/` lưu kết quả OCR/LLM theo hash của trang để chạy lại không tốn tiền; log rõ từng bước.
- Kiểm tra: `uv run jlpt-ocr --help` liệt kê đủ lệnh; pytest cho phần đọc cấu hình.

#### T1.7.2 — Phân tích PDF   [AGENT]
- Phụ thuộc: T1.7.1.
- Mã tính năng: PDF-06, PDF-07.
- Làm: phát hiện từng trang có lớp chữ hay là ảnh scan; render trang 300 DPI bằng `pypdfium2`; trích chữ kèm vị trí bằng `pdfplumber`.
- Kiểm tra: với các đề mẫu, phân loại trang đúng 100%; test với 1 PDF nhỏ tự tạo (không có bản quyền) commit trong `apps/ocr-worker/tests/fixtures/`.

#### T1.7.3 — OCR trang scan   [AGENT]
- Phụ thuộc: T1.7.2.
- Mã tính năng: PDF-08, PDF-09.
- Làm: interface `OcrProvider`, bản `DocumentAiOcr` (Google Document AI); có cache; chỉ OCR những trang không có lớp chữ.
- Kiểm tra: chạy lại lần 2 không gọi API (đọc từ cache); test với provider giả.

#### T1.7.4 — Nhận diện cấu trúc bằng LLM   [AGENT]
- Phụ thuộc: T1.7.3.
- Mã tính năng: PDF-10…13, PDF-18.
- Làm: interface `LlmProvider` (bản thật theo kết luận spike + bản giả cho test); prompt được version hóa trong `apps/ocr-worker/prompts/`; output validate theo JSON Schema xuất từ `packages/schema`; nếu không hợp lệ thì gửi lại kèm lỗi, tối đa 2 lần; mỗi câu có điểm tin cậy 0–1.
- Kiểm tra: test với provider giả trả JSON sai → CLI thử lại rồi báo lỗi rõ ràng; với 1 đề mẫu, output qua validate.

#### T1.7.5 — Xử lý đặc thù tiếng Nhật   [AGENT]
- Phụ thuộc: T1.7.4.
- Mã tính năng: PDF-09, PDF-15.
- Làm: chuẩn hóa NFC; nhận diện furigana (chữ nhỏ phía trên chữ gốc) thành đoạn `ruby`; gạch chân, ô trống, ô ★; giữ nguyên ký tự toàn độ rộng; kiểm tra sau xử lý (số lựa chọn 3–4, số thứ tự câu liên tục).
- Kiểm tra: trên các đề mẫu, đếm và ghi số câu ruby/★ nhận đúng vào báo cáo T1.7.13.

#### T1.7.6 — Ghép file đáp án   [AGENT]
- Phụ thuộc: T1.7.4.
- Mã tính năng: PDF-16.
- Làm: đọc file đáp án (PDF, ảnh hoặc CSV) → bảng số câu → đáp án; ghép vào câu hỏi; báo câu thiếu đáp án hoặc đáp án thừa.
- Kiểm tra: test với file đáp án CSV tự tạo; báo đúng khi thiếu 1 đáp án.

#### T1.7.7 — Audio và timeline phần nghe   [AGENT]
- Phụ thuộc: T1.7.4.
- Mã tính năng: PDF-17.
- Làm: nhận 1 hoặc nhiều file audio; đọc file CSV mốc thời gian nếu có; nếu không có, đề xuất mốc bằng phát hiện khoảng lặng (`ffmpeg silencedetect`); chuyển audio về MP3 mono 64–96 kbps; sinh `listeningTimeline` để biên tập viên chỉnh trên admin.
- Kiểm tra: test với audio sine tự tạo có các khoảng lặng biết trước → mốc đề xuất đúng sai số ≤ 0,5 giây.

#### T1.7.8 — Cắt ảnh minh họa   [AGENT]
- Phụ thuộc: T1.7.4.
- Mã tính năng: PDF-14.
- Làm: cắt hình và bảng theo khung do LLM/OCR trả về; xuất WebP; đặt tên theo sha256.
- Kiểm tra: ảnh xuất ra mở được, kích thước đúng khung.

#### T1.7.9 — Báo cáo kiểm tra   [AGENT]
- Phụ thuộc: T1.7.6, T1.7.7.
- Mã tính năng: PDF-22, PDF-23.
- Làm: kiểm tra thiếu câu, trùng câu, thiếu đáp án, tổng số câu so với blueprint; xuất `report.json` và `report.md` dễ đọc.
- Kiểm tra: đề thiếu 1 câu thì báo cáo nêu đúng số câu bị thiếu.

#### T1.7.10 — Đóng gói và quét virus   [AGENT]
- Phụ thuộc: T1.7.9.
- Đọc thêm: Phụ lục A7.
- Làm: `jlpt-ocr pack` tạo `.zip` theo Phụ lục A7; trước khi xử lý, quét file đầu vào bằng `clamscan` (bắt buộc; chỉ bỏ qua khi truyền rõ cờ `--skip-av`, và cờ này được ghi vào `import.json`).
- Kiểm tra: gói tạo ra qua `jlpt-ocr validate`; thiếu `clamscan` thì CLI dừng với hướng dẫn cài đặt.

#### T1.7.11 — Màn hình đối chiếu trên admin   [AGENT]
- Phụ thuộc: T1.4.10, T1.7.10.
- Mã tính năng: PDF-19, PDF-20, PDF-21, PDF-24, PDF-28.
- Làm: bên trái là PDF gốc (pdf.js), bên phải là trình biên tập nhóm câu; bấm vào câu thì PDF nhảy tới trang nguồn; tô màu câu có độ tin cậy thấp; trình chỉnh timeline phần nghe (nghe thử, kéo mốc bắt đầu/kết thúc); nút xem trước trên giao diện phòng thi; trạng thái của import job.
- Kiểm tra: Playwright: mở import mẫu, sửa 1 câu, chỉnh 1 mốc audio, gửi duyệt.

#### T1.7.12 — Lưu PDF gốc và trang nguồn   [AGENT]
- Phụ thuộc: T1.7.11.
- Mã tính năng: PDF-26.
- Làm: PDF gốc lưu ở `imports/{sha256}.pdf`; mỗi câu lưu `source_page`.
- Kiểm tra: từ một câu bất kỳ mở được đúng trang PDF gốc.

#### T1.7.13 — Đánh giá độ chính xác   [AGENT]
- Phụ thuộc: T1.7.12.
- Làm: chạy toàn bộ quy trình trên các đề mẫu; so với bản chuẩn; ghi `docs/ocr-accuracy.md` (tỷ lệ đúng, thời gian biên tập mỗi đề, chi phí mỗi đề).
- Kiểm tra: đạt mục tiêu đã chốt ở T1.0.7 (mặc định: biên tập một đề không quá 60 phút).

**Cổng ra Phase 1.7:** 3 đề thật đi trọn đường: CLI → gói → admin → duyệt → xuất bản → làm bài.

---

### Phase 1.8 — Server production & vận hành (2 tuần)

**Mục tiêu:** dịch vụ chạy trên server Linode qua Cloudflare, không mở cổng nào ra Internet; deploy, rollback, backup, khôi phục đã diễn tập.

**Đọc thêm cho cả phase:** `DE_XUAT_KY_THUAT.md` mục 9, 13.1; Phụ lục A12, A13 và toàn bộ Phụ lục B.

#### T1.8.1 — Tạo server   [CHỦ DỰ ÁN]
- Phụ thuộc: T1.3.12.
- Làm: tạo Linode vùng Singapore, gói Shared CPU 4 GB, Ubuntu 24.04 LTS; bật Linode Backup; thêm SSH public key; tạo Cloud Firewall: tạm thời chỉ mở cổng 22 cho IP hiện tại của chủ dự án, chặn mọi cổng khác.
- Kiểm tra: SSH vào được bằng key; dịch vụ Backup đang bật.

#### T1.8.2 — Script dựng server   [AGENT]
- Phụ thuộc: T1.8.1.
- Đọc thêm: Phụ lục B1.
- Làm: `infra/server/bootstrap.sh` chạy được nhiều lần (idempotent) theo B1. Chạy thử trên một server tạm trước khi chạy trên server thật.
- Kiểm tra: sau khi chạy: đăng nhập bằng mật khẩu bị từ chối; root không SSH được; `docker compose version` chạy; swap 2 GB đang bật; `/etc/docker/daemon.json` có log rotation.

#### T1.8.3 — Cấu hình Cloudflare   [CHỦ DỰ ÁN + AGENT]
- Phụ thuộc: T1.0.1.
- Làm (agent viết hướng dẫn từng bước trong `docs/runbooks/cloudflare-setup.md`, chủ dự án thực hiện): SSL/TLS chế độ Full (strict); Always Use HTTPS; HSTS; Free Managed Ruleset; Bot Fight Mode; 1 rule rate limiting cho `/api/v1/auth/*`; Cache Rules: cho phép cache các đường dẫn public, bypass `/api/*`, `/thi/*`, `/tai-khoan/*` và toàn bộ `admin.example.com`; tắt Rocket Loader; bật Web Analytics.
- Kiểm tra: header `cf-cache-status: HIT` ở trang chủ sau lần tải thứ 2; `BYPASS` hoặc `DYNAMIC` ở `/api/v1/health`.

#### T1.8.4 — Cloudflare Tunnel và SSH qua Tunnel   [AGENT]
- Phụ thuộc: T1.8.2, T1.8.3.
- Đọc thêm: Phụ lục A13.
- Làm: cài `cloudflared` từ repo chính thức; tạo tunnel quản lý bằng file cấu hình (`infra/cloudflared/config.yml`, không commit file credentials); chạy dạng systemd; tạo bản ghi DNS cho các hostname; SSH qua `ssh.example.com` (Cloudflare Access, T1.8.5). Khi SSH qua Tunnel đã chạy: **xóa rule cổng 22** khỏi Linode Cloud Firewall.
- Kiểm tra: quét cổng server từ ngoài (`nmap -Pn <IP>`) không thấy cổng nào mở; truy cập domain vẫn được; SSH qua `cloudflared access ssh` được.

#### T1.8.5 — Cloudflare Access   [CHỦ DỰ ÁN]
- Phụ thuộc: T1.8.4.
- Làm: tạo ứng dụng Access cho `admin.example.com` và `ssh.example.com`; policy chỉ cho các email nhân sự; đăng nhập bằng mã một lần qua email.
- Kiểm tra: email không có trong danh sách không vào được admin.

#### T1.8.6 — Image PostgreSQL production   [AGENT]
- Phụ thuộc: T1.1.4.
- Đọc thêm: Phụ lục A12, B3.
- Làm: hoàn thiện `infra/postgres/Dockerfile`: thêm binary WAL-G (ghim phiên bản, kiểm tra checksum khi tải); file cấu hình `postgresql.small.conf` và `postgresql.large.conf` theo A12; `archive_mode = on`, `archive_command` dùng WAL-G, `archive_timeout = 300`.
- Kiểm tra: chạy image ở máy lập trình với một bucket thử: tạo dữ liệu → sau 5 phút thấy WAL trên bucket; `wal-g backup-list` có bản backup.

#### T1.8.7 — R2 và triển khai media Worker   [AGENT]
- Phụ thuộc: T1.5.8, T1.8.3.
- Làm: tạo bucket `jlpt-media`, `jlpt-imports`, `jlpt-backups`; tạo API token riêng cho từng mục đích (api chỉ ghi `jlpt-media`/`jlpt-imports`; WAL-G chỉ ghi `jlpt-backups`); deploy `apps/media-worker` bằng wrangler với binding R2 và secret `MEDIA_TOKEN_SECRET`; route `media.example.com/*`.
- Kiểm tra: tải snapshot của đề mẫu qua `media.example.com` bằng token hợp lệ → 200; không có token → 403; lần tải thứ 2 có `cf-cache-status: HIT`.

#### T1.8.8 — Email và Turnstile production   [CHỦ DỰ ÁN + AGENT]
- Phụ thuộc: T1.8.3.
- Làm: xác minh domain trên Resend (bản ghi SPF, DKIM, DMARC trên Cloudflare); tạo widget Turnstile cho domain thật.
- Kiểm tra: email xác minh gửi tới Gmail không vào thư rác; header email có `dkim=pass`.

#### T1.8.9 — Docker Compose production   [AGENT]
- Phụ thuộc: T1.8.6.
- Đọc thêm: Phụ lục A3, A12.
- Làm: `infra/compose/compose.prod.yml`; `infra/compose/profiles/small.env` và `large.env`; `infra/compose/.env.production.example` (không có giá trị thật); healthcheck và `restart: unless-stopped` cho mọi service; cổng chỉ bind `127.0.0.1`; tag image lấy từ biến `IMAGE_TAG`.
- Kiểm tra: chạy được trên server tạm với profile `small`; `free -h` cho thấy tổng RAM dùng dưới 3,2 GB khi không tải.

#### T1.8.10 — Backup và thử khôi phục   [AGENT]
- Phụ thuộc: T1.8.9.
- Đọc thêm: Phụ lục B3.
- Làm: systemd timer chạy `wal-g backup-push` hằng ngày lúc 03:00 (giờ Việt Nam) và `wal-g delete retain FULL 7 --confirm` hằng tuần; script kiểm tra độ mới của backup. Thử khôi phục lần đầu trên một server Linode tạm theo B3; ghi kết quả.
- Kiểm tra: file `docs/runbooks/restore-test-<ngày>.md` ghi thời gian khôi phục (RTO ≤ 1 giờ) và lượng dữ liệu mất (RPO ≤ 5 phút).

#### T1.8.11 — Phát hành và deploy   [AGENT]
- Phụ thuộc: T1.8.9.
- Đọc thêm: Phụ lục B2.
- Làm: workflow `.github/workflows/release.yml` chạy khi có tag `v*`: build và push image `linux/amd64` lên GHCR (`ghcr.io/<owner>/jlpt-web`, `jlpt-admin`, `jlpt-api`, tag là phiên bản). Script `infra/server/deploy.sh` và `infra/server/switch-profile.sh` theo B2, B4.
- Kiểm tra: diễn tập trên server tạm: deploy `v0.1.0` → deploy `v0.1.1` → rollback về `v0.1.0`; script từ chối deploy khi có bài thi thật đang mở (trừ khi dùng `--force`).

#### T1.8.12 — Giám sát và cảnh báo   [AGENT]
- Phụ thuộc: T1.8.11.
- Làm: Sentry cho web, admin, api (gắn tên release); UptimeRobot hoặc Better Stack kiểm tra `https://example.com/api/v1/health` và trang chủ mỗi 1–5 phút; cảnh báo Linode (CPU > 90% trong 5 phút, I/O đĩa, băng thông); script kiểm tra hằng ngày (ổ đĩa > 80%, backup cũ hơn 26 giờ) gửi email cho chủ dự án.
- Kiểm tra: tắt container `api` trên server tạm → nhận cảnh báo trong 5 phút.

#### T1.8.13 — Runbook   [AGENT]
- Phụ thuộc: T1.8.10, T1.8.11.
- Làm: viết `docs/runbooks/` dựa trên Phụ lục B: deploy, rollback, khôi phục, nâng/hạ gói theo mùa, sự cố (server không phản hồi, đầy ổ đĩa, PostgreSQL lỗi, Tunnel lỗi, media Worker lỗi), xoay secrets, thu hồi quyền của nhân sự nghỉ việc.
- Kiểm tra: người không viết runbook làm theo runbook deploy và rollback trên server tạm thành công.

**Cổng ra Phase 1.8:** truy cập được qua domain; không cổng nào của server mở ra Internet; deploy và rollback đã diễn tập; thử khôi phục đạt RPO ≤ 5 phút, RTO ≤ 1 giờ.

---

### Phase 1.9 — Kiểm thử tổng thể & ra mắt (5 tuần)

**Mục tiêu:** đủ nội dung, đo được sức chịu tải thật, rà soát bảo mật, beta kín, ra mắt công khai.

#### T1.9.1 — Nội dung ra mắt   [CHỦ DỰ ÁN]
- Phụ thuộc: T1.7.13, T1.8.13.
- Làm: nhập và xuất bản tối thiểu 2 đề cho mỗi cấp độ, chỉ dùng nguồn có license phù hợp (D3); chọn đề cho khách làm thử.
- Kiểm tra: thư viện đề hiện đủ đề ở cả 5 cấp độ.

#### T1.9.2 — Load test bằng k6   [AGENT]
- Phụ thuộc: T1.8.13.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 8.4.
- Làm: kịch bản trong `tests/load/`: (1) bắt đầu đồng loạt, (2) lưu phiếu đều đặn, (3) nộp đồng loạt lúc hết thời gian, (4) tải snapshot và audio qua CDN. Chạy từ một server Linode tạm vào ban đêm, dùng đề và tài khoản thử nghiệm; tạm thêm rule WAF bỏ qua kiểm tra cho IP của máy chạy k6, xong thì xóa. Chạy với profile `small` (gói 4 GB), sau đó thử nâng gói 8 GB theo Phụ lục B4 và chạy lại với profile `large`.
- Kiểm tra: `docs/load-test-<ngày>.md` ghi số người thi cùng lúc tối đa của mỗi gói mà vẫn đạt p95 lưu phiếu < 300 ms, p95 nộp bài < 1 giây và lỗi < 0,1%; cập nhật con số vào Phụ lục B4; xóa dữ liệu thử nghiệm sau khi chạy.

#### T1.9.3 — Rà soát bảo mật   [AGENT]
- Phụ thuộc: T1.8.13.
- Làm: `pnpm audit` và Dependabot không còn lỗ hổng mức high/critical; CodeQL trong CI; quét OWASP ZAP baseline vào domain; checklist OWASP ASVS L2 cho auth, session, phân quyền trong `docs/security-checklist.md`; thử thủ công: IDOR, sửa token media, gọi route admin từ host học viên, CSP, upload file giả.
- Kiểm tra: checklist đầy đủ, mọi mục `FAIL` đã được sửa hoặc được chủ dự án chấp nhận rủi ro bằng văn bản.

#### T1.9.4 — Thử trên nhiều thiết bị   [AGENT + CHỦ DỰ ÁN]
- Phụ thuộc: T1.9.1.
- Làm: làm trọn 1 đề trên: iPhone (Safari, 2 bản iOS gần nhất), Android (Chrome), Windows (Chrome, Edge), macOS (Safari), Firefox. Ghi vào `docs/testing/device-matrix.md`.
- Kiểm tra: không còn lỗi mức P0/P1 trên thiết bị nào.

#### T1.9.5 — Pháp lý   [CHỦ DỰ ÁN]
- Phụ thuộc: T1.0.2.
- Làm: giải quyết D1; luật sư duyệt chính sách quyền riêng tư và điều khoản; lập hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài nếu lưu dữ liệu ngoài Việt Nam.
- Kiểm tra: file `docs/decisions/D1.md` ghi kết luận cuối cùng; trang pháp lý không còn chỗ "CẦN NỘI DUNG".

#### T1.9.6 — Beta kín   [CHỦ DỰ ÁN + AGENT]
- Phụ thuộc: T1.9.2, T1.9.3, T1.9.4.
- Làm: mời 20–50 người dùng; form góp ý; theo dõi Sentry hằng ngày; ghi lỗi vào GitHub Issues với nhãn P0 (sửa ngay), P1 (sửa trước khi ra mắt), P2 (để sau).
- Kiểm tra: không còn issue P0/P1 đang mở.

#### T1.9.7 — Ra mắt công khai   [CHỦ DỰ ÁN]
- Phụ thuộc: T1.9.5, T1.9.6.
- Làm: kiểm tra lần cuối: backup gần nhất < 24 giờ; runbook sẵn sàng; giám sát đang chạy; quyết định có nâng Cloudflare lên gói Pro không. Ra mắt; tuần đầu theo dõi hằng ngày.
- Kiểm tra: đạt tiêu chí cổng ra Giai đoạn 1 bên dưới.

**Cổng ra Giai đoạn 1:** người dùng thật làm bài ổn định trong 2 tuần liên tục; không mất đáp án; độ sẵn sàng ≥ 99,5%; không còn lỗi P0/P1; số liệu chịu tải của từng gói đã đo và ghi vào Phụ lục B4.

---

## Phần D. Giai đoạn 2 — V2: luyện tập thông minh & trộn đề

**Cổng vào:** Giai đoạn 1 đạt cổng ra.
**Cách làm:** trước khi bắt đầu mỗi phase, agent viết chi tiết từng task theo mẫu A9 (có "Phụ thuộc", "Làm", "Không làm", "Kiểm tra") vào mục C0 và chờ chủ dự án duyệt. Danh sách dưới đây là phạm vi và tiêu chí bắt buộc của từng phase.
**Mục tiêu thời gian:** xong phần lớn trước mùa thi tháng 12/2027.

### Phase 2.1 — Luyện tập theo kỹ năng và dạng 問題

- Mã tính năng: PRA-01…14, PRA-17, EXAM-23…25, AUDIO-05…07.
- Task:
  - T2.1.1 Lịch sử theo từng câu của mỗi người dùng (câu đã gặp, đã sai, đã đánh dấu), tính từ `user_answers`.
  - T2.1.2 Tạo bài luyện tùy chỉnh (`Exam.kind = custom`) theo bộ lọc: kỹ năng, dạng 問題, cấp độ, số câu 10/20/30/50, nguồn câu (chỉ câu sai, câu chưa gặp, câu đã đánh dấu, ngẫu nhiên từ nhiều đề). Bài luyện cũng sinh `ExamVersion` và snapshot như đề thường; đơn vị chọn là `QuestionGroup`.
  - T2.1.3 Endpoint `POST /attempts/:id/check` của chế độ luyện tập: chỉ trả đáp án và giải thích của **một câu đã trả lời**.
  - T2.1.4 Giao diện luyện tập: không giới hạn thời gian hoặc tự chọn thời gian, xem đáp án ngay sau mỗi câu, tiếp tục bài dở.
  - T2.1.5 Tiện ích phòng thi: phóng to/thu nhỏ chữ tiếng Nhật, phím tắt, giao diện tối giản.
  - T2.1.6 Audio ở chế độ luyện tập: phát lại, tốc độ 0,75x / 1x / 1,25x; phát audio từng câu sau khi nộp.
- Cổng ra: tạo bài luyện 20 câu chỉ gồm câu đã sai trong dưới 2 giây; test chứng minh không lộ đáp án của câu chưa trả lời.

### Phase 2.2 — Trộn đề nhiều năm

- Mã tính năng: MIX-01…16, QB-12, ADM-11.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 10.3 (6 quy tắc trộn đề).
- Task:
  - T2.2.1 `generateMixedExam()` trong `exam-engine`: đầu vào là cấu hình (cấp độ, các kỳ thi nguồn, tỷ lệ, chế độ Random / Balanced / Weakness / Unseen / Challenge / Revision / Custom) và `seed`; đầu ra là danh sách nhóm câu và cảnh báo thiếu dữ liệu. Property-based test bằng `fast-check`: không trùng câu, đúng cấp độ, giữ nguyên nhóm, số câu khớp blueprint, cùng seed + cấu hình + `engine_version` thì ra cùng kết quả.
  - T2.2.2 Phát hiện câu trùng hoặc gần trùng giữa các nguồn (so độ giống của `search_text`), biên tập viên xác nhận.
  - T2.2.3 API tạo đề trộn: lưu `generated_exams`, tạo `Exam.kind = mixed` và `ExamVersion`; chỉ gắn nhãn "mô phỏng đúng cấu trúc JLPT" khi qua `validateBlueprint()`, còn lại ghi "đề luyện tập tùy chỉnh".
  - T2.2.4 Giao diện cấu hình trộn đề, xem trước cấu trúc, nút "Tạo đề mới", lịch sử đề đã trộn, làm lại đề cũ, hiện nguồn câu trong kết quả nếu license cho phép.
  - T2.2.5 Trang admin quản lý đề trộn.
- Cổng ra: property test pass với 1.000 lần chạy ngẫu nhiên; tái tạo một đề từ seed + cấu hình + `engine_version` cho kết quả giống hệt.

### Phase 2.3 — Giải thích & chữa bài

- Mã tính năng: EXPL-01…08, EXPL-10, EXPL-12, EXPL-13, QB-08, QB-09, ADM-09, ADM-10.
- Task:
  - T2.3.1 Bảng `question_explanations` có phiên bản, ngôn ngữ, trạng thái duyệt.
  - T2.3.2 Trình soạn giải thích trên admin: vì sao đáp án đúng, vì sao từng lựa chọn sai, dịch câu, từ vựng, mẫu ngữ pháp, dịch bài đọc, transcript bài nghe (chỉ khi license cho phép).
  - T2.3.3 Gắn thẻ từ vựng, kanji, mẫu ngữ pháp cho câu hỏi.
  - T2.3.4 Hiện giải thích ở trang xem lại và sau mỗi câu luyện tập; lưu câu vào danh sách ôn lại.
  - T2.3.5 Người dùng báo lỗi câu hỏi/giải thích; admin có hàng chờ xử lý.
- Cổng ra: giải thích chỉ hiện khi đã `approved`; báo lỗi đi trọn quy trình gửi → xử lý → phản hồi.

### Phase 2.4 — Phân tích năng lực

- Mã tính năng: STAT-02…08, STAT-10, STAT-11, SCORE-05, SCORE-09, SCORE-10, SCORE-13, SCORE-15.
- Task:
  - T2.4.1 Bảng tổng hợp do worker cập nhật sau mỗi lần nộp: theo người dùng × kỹ năng × dạng 問題 × tháng.
  - T2.4.2 Dashboard học viên: điểm theo thời gian, độ chính xác theo kỹ năng và dạng câu, câu sai nhiều lần, thời gian ôn tập, so sánh theo tháng, tiến độ so với mục tiêu, gợi ý kỹ năng nên học tiếp.
  - T2.4.3 Mở rộng trang kết quả: theo dạng 問題, lọc đúng/sai/bỏ trống, so với lần làm trước, mức đạt mục tiêu, thời gian trung bình mỗi câu và mỗi phần (từ `time_spent_ms`).
  - T2.4.4 Hiệu năng: truy vấn dashboard p95 dưới 300 ms; chỉ khi không đạt mới cân nhắc materialized view hoặc tách DB.
- Cổng ra: số liệu dashboard khớp với bộ dữ liệu kiểm thử tính tay.

### Phase 2.5 — Thống kê từ vựng, kanji, ngữ pháp từ dữ liệu đề

- Mã tính năng: DATA-01…12, DATA-15, DATA-16, DATA-19…23, DATA-25, SEO-03, SEO-04.
- Task:
  - T2.5.1 Pipeline NLP trong `apps/ocr-worker` (chạy trên máy biên tập viên hoặc server tạm theo giờ): SudachiPy tách từ toàn bộ câu đã duyệt → bảng `vocab_occurrences` (từ gốc, vị trí: đề bài, lựa chọn hay bài đọc; có phải từ được hỏi trực tiếp; đề, năm, kỳ, cấp độ).
  - T2.5.2 Thống kê: tần suất, số đề khác nhau có chứa từ, theo cấp độ/năm/kỳ/kỹ năng, xếp hạng; kanji; mẫu ngữ pháp (danh sách mẫu do biên tập viên quản lý, nhận diện bằng quy tắc hoặc LLM rồi duyệt).
  - T2.5.3 Trang public (ISR + `dynamicParams`): trang từ vựng, kanji, mẫu ngữ pháp, "từ thường gặp" theo cấp độ. Mỗi trang **ghi rõ quy mô và nguồn dữ liệu, ngày cập nhật**; không khẳng định từ đó sẽ xuất hiện trong kỳ thi sau.
  - T2.5.4 Liên kết từ thống kê sang bài luyện tương ứng và (chuẩn bị cho V3) sang sổ tay cá nhân.
- Cổng ra: số liệu có ghi tập dữ liệu và ngày cập nhật; các trang mới đạt ngưỡng Lighthouse.

### Phase 2.6 — Tài khoản và thư viện đề mức P1

- Mã tính năng: ACC-03, ACC-06, ACC-08, ACC-09, ACC-11, ACC-12, ACC-13, LIB-09…13.
- Phạm vi: đăng nhập Google, ảnh đại diện, mục tiêu kỳ thi và điểm, thời gian đã học, quản lý thiết bị đăng nhập, xuất dữ liệu cá nhân và yêu cầu xóa tài khoản (theo pháp lý), điểm cao nhất, số lần làm, đề yêu thích, lọc đề chưa làm / chưa đạt mục tiêu.
- Cổng ra: xuất dữ liệu ra file JSON đầy đủ; xóa tài khoản xóa hoặc ẩn danh hóa dữ liệu đúng chính sách đã được luật sư duyệt.

### Phase 2.7 — Hạ tầng theo số đo

- Trước mùa thi tháng 12/2027: xem số liệu giám sát và chạy lại k6; quyết định một trong ba hướng: giữ 1 server (nâng lên Dedicated 16 GB nếu cần), tách PostgreSQL sang server thứ hai, hoặc chuẩn bị chuyển sang AWS (mục 13.2 của `DE_XUAT_KY_THUAT.md`).
- Cổng ra: quyết định được ghi trong `docs/decisions/`; nếu đổi hạ tầng thì đã diễn tập trên server tạm.

---

## Phần E. Giai đoạn 3 — V3: cá nhân hóa & thương mại hóa

**Cổng vào:** Giai đoạn 2 đạt cổng ra của các phase 2.1–2.5. **Cách làm:** như Phần D.

### Phase 3.1 — Sổ tay và SRS
- Mã tính năng: VOC-01…14, VOC-17, VOC-18.
- Phạm vi: bấm vào từ tiếng Nhật khi chữa bài để tra nghĩa; lưu từ, kanji, mẫu ngữ pháp; flashcard tự động; ôn tập lặp lại ngắt quãng (thuật toán FSRS, đặt trong package thuần `packages/srs` có unit test); trắc nghiệm từ đã lưu; học từ bằng ví dụ lấy từ ngân hàng câu hỏi; đồng bộ giữa thiết bị.
- Cổng ra: lịch ôn của thuật toán khớp các ví dụ tham chiếu của thư viện FSRS.

### Phase 3.2 — Thông báo
- Mã tính năng: NOTI-03, NOTI-04, NOTI-05, NOTI-09, NOTI-10.
- Phạm vi: email và web push; nhắc bài luyện dang dở, đề mới, từ đến hạn ôn; trang cài đặt bật/tắt từng loại.
- Cổng ra: tắt một loại thông báo thì không còn nhận loại đó; có giới hạn tần suất gửi.

### Phase 3.3 — Gói Premium và thanh toán
- Mã tính năng: PAY-01…06, PAY-08, PAY-09, PAY-12, ADM-15, ADM-16, SEO-09.
- Phạm vi: service `entitlements` quyết định quyền theo gói; tích hợp PayOS hoặc VNPay (xác minh chữ ký webhook, xử lý idempotent theo mã giao dịch); quản lý gói, gia hạn, nâng cấp, hủy, hoàn tiền; lịch sử giao dịch; báo cáo doanh thu; trang giá.
- [CHỦ DỰ ÁN]: đăng ký với cổng thanh toán; hỏi kế toán về hóa đơn điện tử; chỉ bán nội dung có license thương mại (D3).
- Cổng ra: chạy thật ổn định 1 tháng; không mất giao dịch nào khi webhook gửi lặp hoặc gửi trễ (có test).

### Phase 3.4 — SEO nội dung và blog
- Mã tính năng: SEO-01, SEO-05, SEO-11, SEO-12, ADM-13.
- Phạm vi: CMS bài viết (Markdown được sanitize), trang đích chiến dịch ôn thi 60 ngày, đo nguồn truy cập.

### Phase 3.5 — Lộ trình ôn thi cá nhân hóa
- Mã tính năng: PLAN-01…12.
- Phạm vi: chọn kỳ thi mục tiêu, đếm ngược, thời gian học mỗi ngày, lộ trình 30/60/90 ngày, lịch làm đề, phân bổ theo kỹ năng yếu, đề xuất bài hôm nay, tự điều chỉnh khi bỏ lỡ, giai đoạn tổng ôn, đánh giá mức sẵn sàng.

### Phase 3.6 — AI hỗ trợ học
- Mã tính năng: AI-01…08, AI-10…14, EXPL-11.
- Phạm vi: mọi lời gọi LLM đi qua module `ai` và adapter `LlmProvider`; giới hạn số lượt theo gói; ghi chi phí từng lần gọi; gắn nhãn "nội dung do AI tạo"; kiểm duyệt nội dung trước khi công khai; **không dùng AI để chấm điểm**.
- Cổng ra: chi phí AI mỗi tháng nằm trong ngân sách chủ dự án đặt; có cơ chế tắt nhanh tính năng AI khi vượt ngân sách.

### Phase 3.7 — Báo cáo vận hành
- Mã tính năng: REPORT-01…13, ADM-17.
- Phạm vi: người dùng mới, DAU/MAU, lượt bắt đầu/hoàn thành, tỷ lệ bỏ dở, cấp độ và đề phổ biến, tỷ lệ quay lại, phễu đăng ký, thống kê OCR và lỗi câu hỏi, chuyển đổi Free → Premium.

**Cổng ra Giai đoạn 3:** thanh toán chạy ổn định; số liệu vận hành đầy đủ; chi phí AI trong ngân sách.

---

## Phần F. Giai đoạn 4 — V4: giáo viên, thi đồng loạt, mở rộng

**Cổng vào:** Giai đoạn 3 đạt cổng ra. **Cách làm:** như Phần D.

### Phase 4.1 — Giáo viên và lớp học
- Mã tính năng: TEA-01…13, PAY-10.
- Phạm vi: tài khoản giáo viên, tạo lớp, mời học viên bằng mã/link, giao đề có sẵn hoặc đề trộn riêng, hạn nộp, theo dõi ai đã nộp, điểm và phân tích từng học viên, lỗi chung của lớp, giao bài bổ sung, xuất bảng điểm, nhiều lớp/trung tâm, phân quyền truy cập dữ liệu học viên.

### Phase 4.2 — Thi thử đồng loạt
- Mã tính năng: GAME-06, NOTI-08.
- Phạm vi: tạo sự kiện thi, phòng chờ và cho vào lệch nhau vài giây, khoảng nhận phiếu muộn bằng 0, chỉ công bố đáp án sau khi sự kiện kết thúc, thông báo kết quả.
- Hạ tầng: trước mỗi sự kiện, nâng gói hoặc thêm máy và chạy k6 với số người dự kiến × 1,5.

### Phase 4.3 — Gamification và cộng đồng
- Mã tính năng: GAME-01…05, GAME-07…10.
- Phạm vi: streak, huy hiệu, bảng xếp hạng tự nguyện **tách theo cấp độ, loại bài và điều kiện thi** (không xếp chung luyện tự do với thi mô phỏng), thử thách 7/30/60 ngày, chia sẻ thành tích, thảo luận sau khi làm bài, báo cáo nội dung xấu.

### Phase 4.4 — AI sinh câu luyện mới có kiểm duyệt
- Mã tính năng: AI-09.
- Phạm vi: câu sinh ra có `origin = ai_generated`, nhãn rõ trên giao diện, duyệt 2 bước như câu thường, không bao giờ trình bày như câu thi thật.

### Phase 4.5 — Độ khó và chất lượng câu hỏi
- Mã tính năng: QB-19, QB-20, PRA-15, MIX-18, MIX-19, SCORE-14, STAT-09, STAT-12…14.
- Phạm vi: độ khó thực tế từ lịch sử làm bài, kiểm định chất lượng theo tỷ lệ chọn đáp án, luyện và trộn đề theo độ khó, hạn chế câu đã gặp quá nhiều, ước lượng khả năng đạt, phân biệt tiến bộ thật với tiến bộ do làm lại câu quen.

### Phase 4.6 — Mở rộng hạ tầng
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 13.2.
- Phạm vi: chỉ làm khi số đo yêu cầu: chuyển PostgreSQL sang dịch vụ managed, nhiều máy chạy ứng dụng (bật cache handler dùng chung cho Next.js), deploy không downtime. Chuyển dữ liệu trong mùa vắng, có kế hoạch rollback và đã diễn tập trên server tạm.

### Phase 4.7 — Các tính năng mở rộng khác
- Mã tính năng: ACC-14, EXAM-26, SCORE-12, VOC-15, VOC-16, DATA-13, DATA-14, DATA-17, DATA-18, DATA-24, DATA-26, AUDIO-08, AUDIO-09, EXPL-09, MIX-17.
- Phạm vi: giao diện tiếng Nhật/Anh, chế độ sáng/tối, báo cáo kết quả PDF, xuất CSV/Excel, phát âm từ vựng, so sánh xu hướng qua các năm, transcript đồng bộ với audio, chỉ ra chi tiết dẫn tới đáp án, chia sẻ đề trộn bằng link; app mobile dùng lại `packages/api-client` và `packages/exam-engine`.

---

## Phụ lục A. Hợp đồng kỹ thuật

Các mục dưới đây là **hợp đồng**: tên, đường dẫn, kiểu dữ liệu và định dạng phải theo đúng. Muốn đổi thì đề xuất ở C0 và chờ duyệt.

### A1. Cấu trúc repo

```
/
├─ apps/
│  ├─ web/            @jlpt/web    Next.js: trang public, học viên, phòng thi (cổng 3000)
│  │  ├─ app/                       route (App Router)
│  │  ├─ messages/vi.json           chuỗi giao diện
│  │  └─ e2e/                       Playwright
│  ├─ admin/          @jlpt/admin  Next.js: CMS (cổng 3001)
│  ├─ api/            @jlpt/api    NestJS + Fastify (cổng 4000), APP_MODE=api | worker
│  │  └─ src/
│  │     ├─ main.ts                 khởi động theo APP_MODE
│  │     ├─ db/                     schema Drizzle, migrations, seed
│  │     ├─ common/                 config, logging, errors, guards, rate-limit
│  │     └─ modules/                auth, user, exam, blueprint, attempt, scoring,
│  │                                question-bank, media, import, review, license,
│  │                                admin, audit, outbox, storage, email, turnstile
│  ├─ media-worker/   @jlpt/media-worker  Cloudflare Worker
│  └─ ocr-worker/     Python CLI `jlpt-ocr` (uv)
├─ packages/
│  ├─ schema/         @jlpt/schema       Zod schema, type, fixtures, json-schema/
│  ├─ exam-engine/    @jlpt/exam-engine  logic thuần
│  ├─ media-token/    @jlpt/media-token  ký/kiểm tra token (WebCrypto)
│  ├─ ui/             @jlpt/ui           component dùng chung (RichTextView…)
│  ├─ api-client/     @jlpt/api-client   client sinh từ OpenAPI
│  └─ config/         @jlpt/config       tsconfig, eslint, prettier, tailwind preset
├─ infra/
│  ├─ compose/        compose.dev.yml, compose.prod.yml, profiles/{small,large}.env,
│  │                  .env.production.example
│  ├─ postgres/       Dockerfile, postgresql.small.conf, postgresql.large.conf
│  ├─ cloudflared/    config.yml (không chứa credentials)
│  └─ server/         bootstrap.sh, deploy.sh, switch-profile.sh, daily-check.sh, systemd/
├─ tests/load/        kịch bản k6
├─ spikes/            code thử nghiệm của Phase 1.0 (không dùng cho production)
├─ docs/              decisions/, runbooks/, spikes/, testing/, jlpt-blueprints.{md,json},
│                     samples.md, accounts.md
├─ DE_XUAT_KY_THUAT.md
└─ KE_HOACH_TRIEN_KHAI.md
```

Trong tài liệu này, `pnpm --filter api` là cách viết tắt của `pnpm --filter @jlpt/api` (pnpm cho phép bỏ scope khi tên không trùng).

### A2. Giá trị enum và mã chuẩn

| Trường | Giá trị |
|---|---|
| `level` | `N1`, `N2`, `N3`, `N4`, `N5` |
| `session` | `7`, `12` |
| `Exam.kind` | `original`, `practice`, `mixed`, `custom` |
| `Question.origin` | `official_past_exam`, `self_authored`, `ai_generated` |
| `review_status` | `draft`, `in_review`, `approved`, `rejected`, `hidden` |
| `attempt.mode` | `real`, `practice` |
| `attempt.status` | `in_progress`, `submitted` |
| `attempt.submitted_by` | `user`, `auto_client`, `system` |
| `attempt.result_flags` | `late_sync`, `interrupted` |
| `skill` | `kanji`, `vocabulary`, `grammar`, `reading`, `listening` |
| `attempt_events.type` | `answers`, `section_start`, `section_lock`, `submit`, `resume`, `offline`, `online`, `audio_error`, `late_sync` |
| `role` | `admin`, `editor`, `reviewer`, `teacher`, `student` |

**Mã phần thi (`section.code`)** — đề xuất, phải đối chiếu với kết quả T1.0.4:
- N1, N2: `language_reading` (言語知識（文字・語彙・文法）・読解), `listening` (聴解).
- N3, N4, N5: `language_vocab` (言語知識（文字・語彙）), `language_grammar_reading` (言語知識（文法）・読解), `listening` (聴解).

**Mã dạng 問題 (`mondai_type`)** — danh sách từ vựng dùng chung; cấp độ nào có dạng nào, bao nhiêu câu **lấy từ T1.0.4**, không suy ra từ bảng này:

| Mã | Tên | Mã | Tên |
|---|---|---|---|
| `kanji_reading` | 漢字読み | `comprehension_mid` | 内容理解（中文） |
| `orthography` | 表記 | `comprehension_long` | 内容理解（長文） |
| `word_formation` | 語形成 | `integrated_reading` | 統合理解 |
| `contextual` | 文脈規定 | `thematic` | 主張理解 |
| `paraphrase` | 言い換え類義 | `info_retrieval` | 情報検索 |
| `usage` | 用法 | `task_based` | 課題理解 |
| `grammar_form` | 文法形式の判断 | `point` | ポイント理解 |
| `sentence_composition` | 文の組み立て | `summary` | 概要理解 |
| `text_grammar` | 文章の文法 | `utterance` | 発話表現 |
| `comprehension_short` | 内容理解（短文） | `quick_response` | 即時応答 |
| | | `integrated_listening` | 統合理解（聴解） |

### A3. Biến môi trường

| Biến | Dùng ở | Ví dụ dev | Ghi chú |
|---|---|---|---|
| `NODE_ENV` | mọi app | `development` | |
| `APP_MODE` | api | `api` | `api` hoặc `worker` |
| `API_WORKERS` | api | `1` | số process API (profile small = 1, large = 3) |
| `DATABASE_URL` | api | `postgres://jlpt:jlpt@127.0.0.1:5432/jlpt` | |
| `REDIS_CORE_URL` | api | `redis://127.0.0.1:6379` | `noeviction` |
| `REDIS_CACHE_URL` | api, web | `redis://127.0.0.1:6380` | `allkeys-lru` |
| `PUBLIC_HOST` | api, web | `localhost:3000` | production: `example.com` |
| `ADMIN_HOST` | api, admin | `localhost:3001` | production: `admin.example.com` |
| `MEDIA_BASE_URL` | api | `http://localhost:4000/dev-media` | production: `https://media.example.com` |
| `API_INTERNAL_URL` | web, admin | `http://127.0.0.1:4000` | web gọi API khi build/ISR; production: `http://api:4000` |
| `WEB_INTERNAL_URL` | api | `http://127.0.0.1:3000` | api gọi revalidate của web; production: `http://web:3000` |
| `AUTH_SECRET` | api | chuỗi ngẫu nhiên ≥ 32 byte | secret của Better Auth |
| `MEDIA_TOKEN_SECRET` | api, media-worker | chuỗi ngẫu nhiên ≥ 32 byte | dùng chung với Worker |
| `REVALIDATE_SECRET` | api, web | chuỗi ngẫu nhiên | |
| `STORAGE_DRIVER` | api | `local` | `local` hoặc `r2` |
| `STORAGE_LOCAL_DIR` | api | `.data/storage` | |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | api | (trống) | chỉ khi `STORAGE_DRIVER=r2` |
| `R2_BUCKET_MEDIA`, `R2_BUCKET_IMPORTS` | api | `jlpt-media`, `jlpt-imports` | |
| `EMAIL_DRIVER` | api | `smtp` | `smtp` (Mailpit) hoặc `resend` |
| `SMTP_URL` | api | `smtp://127.0.0.1:1025` | |
| `RESEND_API_KEY`, `EMAIL_FROM` | api | (trống), `no-reply@localhost` | |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | web, api | khóa thử nghiệm của Cloudflare | lấy khóa thử nghiệm trong tài liệu Turnstile |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` | api | (trống) | để purge cache; không có thì bỏ qua |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | mọi app | (trống) | |
| `EXAM_GRACE_SEC` | api | `10` | |
| `LATE_SYNC_WINDOW_SEC` | api | `600` | |
| `BETWEEN_SECTIONS_MAX_HOURS` | api | `24` | |
| `WALG_S3_PREFIX`, `AWS_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=auto`, `AWS_S3_FORCE_PATH_STYLE=true` | postgres (production) | | WAL-G đẩy lên bucket `jlpt-backups` của R2 |
| `GOOGLE_APPLICATION_CREDENTIALS`, `DOCUMENT_AI_PROCESSOR`, `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` | ocr-worker (máy biên tập viên) | | không đưa lên server |

### A4. Định dạng nội dung tiếng Nhật (RichText)

```ts
type Segment =
  | { t: "text"; text: string }                    // không chứa ký tự xuống dòng
  | { t: "ruby"; text: string; rt: string }         // chữ gốc + cách đọc (furigana)
  | { t: "underline"; children: Segment[] }         // phần được hỏi, gạch chân
  | { t: "emphasis"; children: Segment[] }          // in đậm, nếu đề gốc có
  | { t: "blank"; label?: string }                  // ô trống （　）
  | { t: "star" }                                   // ô trống mang dấu ★ (câu sắp xếp)
  | { t: "br" }                                     // xuống dòng
  | { t: "image"; mediaKey: string; alt: string; width: number; height: number };

type RichText = Segment[];

type RichBlock =                                     // dùng cho đoạn văn đọc hiểu
  | { type: "paragraph"; content: RichText }
  | { type: "image"; mediaKey: string; alt: string; width: number; height: number }
  | { type: "table"; rows: RichText[][] };
```

Quy tắc: `underline` và `emphasis` không lồng nhau quá 1 cấp; `ruby.text` và `ruby.rt` không rỗng; chuỗi ở dạng NFC; không có HTML trong bất kỳ trường nào.

Ví dụ:

```json
// Câu đọc kanji: この「地図」を見てください。
[{"t":"text","text":"この"},{"t":"underline","children":[{"t":"text","text":"地図"}]},{"t":"text","text":"を見てください。"}]

// Furigana
[{"t":"ruby","text":"漢字","rt":"かんじ"},{"t":"text","text":"を勉強します。"}]

// Câu sắp xếp ★: あの店の ＿ ＿ ★ ＿ おいしい。
[{"t":"text","text":"あの店の"},{"t":"blank"},{"t":"blank"},{"t":"star"},{"t":"blank"},{"t":"text","text":"おいしい。"}]
```

### A5. Snapshot đề, manifest, đường dẫn lưu trữ

Đường dẫn trong storage:
- `exams/{examId}/v{version}/snapshot.json`
- `exams/{examId}/v{version}/manifest.json`
- `media/{sha256}.{ext}` (file media, bất biến)
- `imports/{sha256}.pdf` (PDF gốc)

Ví dụ snapshot (**các con số chỉ là ví dụ**, không phải số liệu JLPT):

```json
{
  "schemaVersion": 1,
  "examId": "0192f0c0-0000-7000-8000-000000000001",
  "version": 1,
  "level": "N5",
  "title": "Đề luyện N5 – mẫu",
  "kind": "practice",
  "totalQuestions": 6,
  "sections": [
    {
      "index": 0,
      "code": "language_vocab",
      "title": "言語知識（文字・語彙）",
      "durationSec": 600,
      "questionRange": [0, 1],
      "groups": [
        {
          "groupId": "0192f0c0-0000-7000-8000-0000000000a1",
          "mondaiType": "kanji_reading",
          "instructions": [{"t":"text","text":"＿＿＿のことばはどうよみますか。"}],
          "passage": null,
          "media": [],
          "questions": [
            {
              "index": 0,
              "questionId": "0192f0c0-0000-7000-8000-0000000000b1",
              "number": "1",
              "stem": [{"t":"text","text":"この"},{"t":"underline","children":[{"t":"text","text":"地図"}]},{"t":"text","text":"を見てください。"}],
              "options": [
                {"label":"1","content":[{"t":"text","text":"ちず"}]},
                {"label":"2","content":[{"t":"text","text":"ちと"}]},
                {"label":"3","content":[{"t":"text","text":"じず"}]},
                {"label":"4","content":[{"t":"text","text":"じと"}]}
              ]
            }
          ]
        }
      ],
      "listeningTimeline": null
    },
    {
      "index": 2,
      "code": "listening",
      "title": "聴解",
      "durationSec": 900,
      "questionRange": [4, 5],
      "groups": [],
      "listeningTimeline": [
        {"mediaKey":"media/9f2c….mp3","startMs":0,"endMs":42000,"gapAfterMs":8000,"groupId":"0192f0c0-0000-7000-8000-0000000000a9"}
      ]
    }
  ]
}
```

Quy tắc snapshot:
- Schema dùng `strict()`: **không được có** trường đáp án (`correct`, `answer`, `answerKey`, `explanation`…).
- `index` của câu chạy liên tục từ 0 tới `totalQuestions − 1` theo thứ tự trong đề; `questionRange` gồm cả hai đầu.
- Mỗi câu có 3 hoặc 4 lựa chọn; giá trị trong phiếu trả lời: `0` = bỏ trống, `1…n` = lựa chọn thứ n.
- Mọi `mediaKey` phải có trong manifest.

Manifest:

```json
{ "examId": "0192f0c0-0000-7000-8000-000000000001", "version": 1,
  "media": ["media/9f2c….mp3", "media/ab12….webp"] }
```

### A6. Blueprint

```json
{
  "level": "N3",
  "version": 1,
  "effectiveFrom": "YYYY-MM",
  "sourceRef": [{ "url": "https://www.jlpt.jp/...", "accessedAt": "YYYY-MM-DD" }],
  "sections": [
    {
      "code": "language_vocab",
      "title": "言語知識（文字・語彙）",
      "durationSec": 0,
      "mondai": [
        { "type": "kanji_reading", "skill": "kanji", "questionCount": 0 }
      ]
    }
  ],
  "scoring": {
    "method": "linear_reference",
    "rounding": "round",
    "scoringSections": [
      { "code": "language", "label": "言語知識（文字・語彙・文法）", "skills": ["kanji", "vocabulary", "grammar"], "maxScaled": 0, "minPass": 0 }
    ],
    "totalMax": 0,
    "totalPass": 0
  }
}
```

- **Mọi số 0 là chỗ phải điền từ nguồn chính thức (T1.0.4).** Không được để 0 khi đưa vào seed; validate từ chối giá trị 0.
- Phần điểm (`scoringSections`) có thể khác phần thi (`sections`); điểm được tính theo `skills` của từng câu.
- `linear_reference`: điểm quy đổi = làm tròn(điểm thô / điểm thô tối đa × `maxScaled`). Đây là cách quy đổi tham khảo, giao diện phải ghi rõ.

### A7. Gói nhập đề

```
<ten-goi>.zip
├─ import.json
├─ media/          file đặt tên theo sha256 (ảnh WebP, audio MP3)
└─ report.md       báo cáo kiểm tra của CLI (tùy chọn)
```

```json
{
  "formatVersion": 1,
  "source": { "level": "N3", "year": 2021, "session": 12, "name": "…", "licenseRef": "…" },
  "sourcePdfSha256": "…",
  "tool": { "name": "jlpt-ocr", "version": "0.1.0", "avScan": "clamscan" },
  "groups": [
    {
      "tempId": "g1",
      "sectionCode": "language_vocab",
      "mondaiType": "kanji_reading",
      "orderInSource": 1,
      "instructions": [{"t":"text","text":"…"}],
      "passage": null,
      "media": [{ "sha256": "…", "file": "media/….webp", "role": "image" }],
      "sourcePage": 2,
      "questions": [
        {
          "number": "1",
          "skill": "kanji",
          "stem": [{"t":"text","text":"…"}],
          "options": [{"label":"1","content":[{"t":"text","text":"…"}]}],
          "correctOption": 3,
          "confidence": 0.93,
          "sourcePage": 2
        }
      ]
    }
  ],
  "listening": [
    { "groupTempId": "g10", "file": "media/….mp3", "sha256": "…", "startMs": 0, "endMs": 42000, "gapAfterMs": 8000 }
  ]
}
```

- Gói **có chứa đáp án đúng**, nên chỉ được tải lên qua admin và không bao giờ được phục vụ công khai.
- `tool.avScan` là `clamscan` hoặc `skipped` (khi dùng cờ `--skip-av`).

### A8. API V1

Tiền tố chung `/api/v1`. Request và response là JSON (`camelCase`), trừ upload dùng multipart. Mọi endpoint mặc định cần đăng nhập, trừ endpoint ghi `Public`.

**Thư viện đề và tài khoản**

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `GET /health` | Public | `{ "status": "ok", "db": "ok", "redisCore": "ok", "redisCache": "ok", "version": "…" }` |
| `GET /exams?level=&year=&session=&kind=` | Public | `{ "items": ExamSummary[] }` |
| `GET /exams/:slug` | Public | `ExamSummary` + `description` |
| `GET /me` / `PATCH /me` | Học viên | đọc/sửa `name`, `targetLevel`; trả thêm `completedExams` |
| `GET /me/exam-status?level=` | Học viên | `{ "items": [{ "examId", "status": "not_started" \| "in_progress" \| "completed", "attempts" }] }` |
| `GET /me/attempts?cursor=` | Học viên | `{ "items": AttemptSummary[], "nextCursor": string \| null }` |
| `/auth/*` | Public | các route của Better Auth |

`ExamSummary`: `{ id, slug, level, title, kind, year, session, totalQuestions, sections: [{ title, durationSec }], sourceLabel, licenseLabel, guestTrial, publishedVersion }`.

**Lượt thi** (chủ attempt; khách làm thử dùng cookie `__Host-guest`)

| Endpoint | Request | Response 2xx |
|---|---|---|
| `POST /attempts` | `{ examId, mode: "real" \| "practice" }` | 201 `{ attemptId, lease, serverNow, snapshotUrl, mediaToken, mediaTokenExp, status: "in_progress", currentSection: null }` |
| `POST /attempts/:id/sections/next` | `{ lease }` | `{ sectionIndex, startedAt, deadline, serverNow }` |
| `PUT /attempts/:id/sheet` | `{ lease, seq, answers: number[], flags: number[], timeSpentMs?: number[], changes: [{ i, v, at }] }` | `{ lastSeq, serverNow }` |
| `POST /attempts/:id/submit` | `{ lease, seq, answers, flags, timeSpentMs? }` | `{ result: Result }` (gọi lại trả đúng kết quả cũ) |
| `POST /attempts/:id/resume` | `{}` | `{ lease, lastSeq, answers, flags, status, currentSection, deadline, serverNow, snapshotUrl, mediaToken, mediaTokenExp }` |
| `POST /attempts/:id/media-token` | `{}` | `{ mediaToken, mediaTokenExp }` |
| `GET /attempts/:id` | | `{ status, mode, currentSection, deadline, serverNow, result? }` |
| `GET /attempts/:id/review` | | chỉ sau khi nộp: `{ snapshotUrl, mediaToken, answers, flags, correct: number[], result }` |
| `POST /attempts/:id/check` (V2) | `{ lease, index }` | chế độ luyện tập: `{ index, correct, explanation? }` cho câu đã trả lời |

- `changes[].i` là vị trí câu, `v` là giá trị mới (0…4), `at` là thời điểm theo giờ server ước tính (`Date.now() + offset`, mili giây).
- `deadline`, `serverNow`, `startedAt`: chuỗi ISO 8601 UTC.

`Result`:

```json
{
  "totals": { "correct": 0, "wrong": 0, "blank": 0, "total": 0 },
  "accuracy": 0,
  "durationSec": 0,
  "bySection": [{ "code": "…", "correct": 0, "total": 0 }],
  "bySkill": [{ "skill": "kanji", "correct": 0, "total": 0 }],
  "scoring": {
    "method": "linear_reference",
    "sections": [{ "code": "…", "label": "…", "raw": 0, "rawMax": 0, "scaled": 0, "maxScaled": 0, "minPass": 0, "passed": true }],
    "total": 0, "totalMax": 0, "totalPass": 0, "passEstimate": true
  },
  "flags": []
}
```

**Admin** (`/api/v1/admin/*`): chỉ trên `ADMIN_HOST`, role nhân sự đã bật 2FA, mọi thao tác ghi có audit log. Tài nguyên: `media`, `sources`, `licenses`, `groups`, `questions`, `reviews`, `blueprints`, `exams` (kèm `items`, `publish`, `unpublish`), `imports`, `users`, `audit-logs`, `dashboard`. Quy ước: `GET /x?cursor=&limit=&<bộ lọc>`, `POST /x`, `GET /x/:id`, `PATCH /x/:id`, `DELETE /x/:id` (xóa mềm), hành động riêng `POST /x/:id/<hanh-dong>`.

**Nội bộ:** `apps/web` có `POST /api/revalidate` (header `x-revalidate-secret`), body `{ tags?: string[], paths?: string[] }`.

### A9. Định dạng lỗi chuẩn

```json
{ "error": { "code": "LEASE_INVALID", "message": "Bài thi đang được mở ở nơi khác.", "details": {} } }
```

| Mã | HTTP | Khi nào |
|---|---|---|
| `VALIDATION_ERROR` | 400 | dữ liệu sai schema (`details` liệt kê trường lỗi) |
| `TURNSTILE_FAILED` | 400 | thiếu hoặc sai token Turnstile |
| `UNAUTHENTICATED` | 401 | chưa đăng nhập |
| `EMAIL_NOT_VERIFIED` | 403 | chưa xác minh email |
| `FORBIDDEN` | 403 | không đủ quyền |
| `TWO_FACTOR_REQUIRED` | 403 | nhân sự chưa bật 2FA |
| `NOT_FOUND` | 404 | không tồn tại hoặc không được phép biết là tồn tại |
| `ATTEMPT_ALREADY_OPEN` | 409 | đã có bài đang mở cho đề này (`details.attemptId`) |
| `LEASE_INVALID` | 409 | bài đang mở ở tab/thiết bị khác |
| `ATTEMPT_CLOSED` | 409 | bài đã nộp hoặc đã bị đóng |
| `ATTEMPT_NOT_SUBMITTED` | 409 | xem lại khi chưa nộp |
| `SECTION_NOT_STARTED` | 409 | lưu phiếu khi chưa bắt đầu phần nào |
| `NO_MORE_SECTIONS` | 409 | không còn phần thi tiếp theo |
| `DEADLINE_PASSED` | 422 | quá deadline + grace ở chế độ thi thật |
| `RATE_LIMITED` | 429 | vượt giới hạn (có header `Retry-After`) |
| `INTERNAL_ERROR` | 500 | lỗi không lường trước (không lộ chi tiết) |
| `SERVICE_UNAVAILABLE` | 503 | DB/Redis không sẵn sàng |

`message` là tiếng Việt, hiển thị được cho người dùng. Client quyết định hành vi theo `code`, không theo `message`.

### A10. Bảng DB cho phần đề thi và lượt thi

Quy ước chung: khóa chính `id uuid` (UUIDv7, sinh trong app); `created_at`, `updated_at` kiểu `timestamptz`, mặc định `now()`; enum lưu `text` + `CHECK`; bảng nội dung có `deleted_at` (xóa mềm). Các bảng khác theo mục 11 của `DE_XUAT_KY_THUAT.md`.

```sql
exam_versions (
  exam_id            uuid  NOT NULL REFERENCES exams(id),
  version            int   NOT NULL,
  snapshot_key       text  NOT NULL,
  manifest_key       text  NOT NULL,
  blueprint_id       uuid  NOT NULL,
  blueprint_version  int   NOT NULL,
  scoring            jsonb NOT NULL,
  total_questions    int   NOT NULL,
  published_at       timestamptz NOT NULL,
  published_by       uuid  NOT NULL REFERENCES users(id),
  PRIMARY KEY (exam_id, version)
)

exam_answer_keys (                       -- chỉ server đọc
  exam_id         uuid NOT NULL,
  version         int  NOT NULL,
  keys            smallint[] NOT NULL,    -- đáp án theo vị trí câu, giá trị 1..4
  skills          text[]     NOT NULL,    -- kỹ năng theo vị trí câu
  mondai_types    text[]     NOT NULL,
  section_ranges  jsonb      NOT NULL,    -- [[0,34],[35,66],[67,104]]
  PRIMARY KEY (exam_id, version),
  FOREIGN KEY (exam_id, version) REFERENCES exam_versions(exam_id, version)
)

exam_attempts (
  id               uuid PRIMARY KEY,
  user_id          uuid NULL REFERENCES users(id),
  guest_id         uuid NULL,
  exam_id          uuid NOT NULL,
  exam_version     int  NOT NULL,
  mode             text NOT NULL CHECK (mode IN ('real','practice')),
  status           text NOT NULL CHECK (status IN ('in_progress','submitted')),
  submitted_by     text NULL CHECK (submitted_by IN ('user','auto_client','system')),
  current_section  smallint NULL,          -- NULL = chưa bắt đầu phần nào
  current_deadline timestamptz NULL,       -- để worker tìm bài quá hạn nhanh
  section_times    jsonb NOT NULL DEFAULT '[]',  -- [{index, startedAt, deadline, lockedAt}]
  lease_id         uuid NOT NULL,
  result_flags     text[] NOT NULL DEFAULT '{}',
  attempt_month    date NOT NULL,          -- ngày đầu tháng của started_at
  started_at       timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  submitted_at     timestamptz NULL,
  result           jsonb NULL,
  CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL),
  FOREIGN KEY (exam_id, exam_version) REFERENCES exam_versions(exam_id, version)
)
-- 1 bài đang mở cho mỗi user và đề:
CREATE UNIQUE INDEX ON exam_attempts (user_id, exam_id) WHERE status = 'in_progress' AND user_id IS NOT NULL;
CREATE INDEX ON exam_attempts (current_deadline) WHERE status = 'in_progress';

attempt_answer_sheets (
  attempt_id     uuid PRIMARY KEY REFERENCES exam_attempts(id),
  answers        smallint[] NOT NULL,
  flags          smallint[] NOT NULL DEFAULT '{}',
  time_spent_ms  integer[] NULL,           -- dùng cho SCORE-15 (V2)
  last_seq       integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now()
) WITH (fillfactor = 70);

attempt_events (                          -- append-only, chia partition theo tháng
  id             uuid NOT NULL,
  attempt_month  date NOT NULL,
  attempt_id     uuid NOT NULL,
  seq            integer NULL,             -- chỉ có với type = 'answers'
  type           text NOT NULL,
  payload        jsonb NOT NULL DEFAULT '{}',
  at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_month, id),
  UNIQUE (attempt_month, attempt_id, seq)
) PARTITION BY RANGE (attempt_month);

user_answers (                            -- worker tạo sau khi nộp
  attempt_id      uuid NOT NULL REFERENCES exam_attempts(id),
  question_index  smallint NOT NULL,
  question_id     uuid NOT NULL,
  option_value    smallint NOT NULL,        -- 0 = bỏ trống
  is_correct      boolean NOT NULL,
  flagged         boolean NOT NULL,
  PRIMARY KEY (attempt_id, question_index)
)

outbox (
  id            uuid PRIMARY KEY,
  topic         text NOT NULL,
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz NULL
)
CREATE INDEX ON outbox (created_at) WHERE published_at IS NULL;
```

### A11. mediaToken

- Dạng `<payload>.<sig>`: `payload` = base64url của JSON `{ "a": attemptId, "e": examId, "v": version, "k": "attempt" | "review", "exp": <unix giây> }`; `sig` = base64url(HMAC-SHA256(`MEDIA_TOKEN_SECRET`, chuỗi payload)).
- Kiểm tra: so sánh chữ ký theo thời gian hằng định; `exp` còn hạn; với snapshot thì `e`, `v` phải khớp đường dẫn; với media thì file phải có trong manifest của `(e, v)`.
- Hạn dùng: `attempt` = tổng thời gian các phần + 30 phút (client xin token mới qua `POST /attempts/:id/media-token` khi còn dưới 10 phút); `review` = 2 giờ.
- URL:
  - `https://media.example.com/exams/{examId}/v{version}/snapshot.json?t=<token>`
  - `https://media.example.com/m/{sha256}.{ext}?t=<token>` (Worker đọc object `media/{sha256}.{ext}`)
- Cache: cache key là URL **không có** tham số `t`. Header gửi trình duyệt: media `Cache-Control: private, max-age=86400, immutable`; snapshot `private, max-age=3600`; lỗi `no-store`.

### A12. Docker Compose production và profile theo gói

Trong production, các container gọi nhau qua mạng Docker (`postgres:5432`, `redis-core:6379`, `redis-cache:6379`, `api:4000`, `web:3000`). Chỉ `web`, `admin`, `api` publish cổng, và chỉ ra `127.0.0.1` cho `cloudflared`. `DATABASE_URL`, `REDIS_*_URL` dùng tên service; `API_INTERNAL_URL=http://api:4000`; api gọi revalidate qua `WEB_INTERNAL_URL=http://web:3000`.

| Service | Image | Cổng | small (Shared 4 GB) | large (Dedicated 8 GB) |
|---|---|---|---|---|
| `web` | `ghcr.io/<owner>/jlpt-web:${IMAGE_TAG}` | `127.0.0.1:3000` | `mem_limit: 448m`, `--max-old-space-size=320` | `1g`, `768` |
| `admin` | `ghcr.io/<owner>/jlpt-admin:${IMAGE_TAG}` | `127.0.0.1:3001` | `320m`, `256` | `512m`, `384` |
| `api` | `ghcr.io/<owner>/jlpt-api:${IMAGE_TAG}`, `APP_MODE=api` | `127.0.0.1:4000` | `512m`, `API_WORKERS=1`, `384` | `1280m`, `API_WORKERS=3`, `384` mỗi process |
| `worker` | cùng image api, `APP_MODE=worker` | không | `320m`, `256` | `512m`, `384` |
| `postgres` | `jlpt-postgres` (build từ `infra/postgres`) | không publish | `1024m` | `2560m` |
| `redis-core` | Redis/Valkey (ghim phiên bản) | không | `160m`, `maxmemory 128mb` | `320m`, `256mb` |
| `redis-cache` | Redis/Valkey (ghim phiên bản) | không | `96m`, `maxmemory 64mb` | `320m`, `256mb` |

Lệnh Redis: `redis-core`: `--maxmemory-policy noeviction --appendonly yes --appendfsync everysec`; `redis-cache`: `--maxmemory-policy allkeys-lru --save "" --appendonly no`.

Cấu hình PostgreSQL:

| Tham số | small | large |
|---|---|---|
| `max_connections` | 60 | 100 |
| `shared_buffers` | 256MB | 768MB |
| `effective_cache_size` | 768MB | 2GB |
| `work_mem` | 4MB | 8MB |
| `maintenance_work_mem` | 64MB | 256MB |
| `random_page_cost` | 1.1 | 1.1 |
| `archive_mode` / `archive_command` / `archive_timeout` | `on` / `wal-g wal-push %p` / `300` | như small |

Các con số trên là điểm khởi đầu; T1.9.2 đo thực tế rồi điều chỉnh.

### A13. Cấu hình cloudflared

`infra/cloudflared/config.yml` (file credentials nằm trên server, không commit):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: example.com
    path: ^/api/v1/admin(/.*)?$
    service: http_status:404
  - hostname: example.com
    path: ^/api/.*
    service: http://127.0.0.1:4000
  - hostname: example.com
    service: http://127.0.0.1:3000
  - hostname: admin.example.com
    path: ^/api/.*
    service: http://127.0.0.1:4000
  - hostname: admin.example.com
    service: http://127.0.0.1:3001
  - hostname: ssh.example.com
    service: ssh://127.0.0.1:22
  - service: http_status:404
```

- Thứ tự rule có ý nghĩa: rule chặn `/api/v1/admin` phải đứng trước rule `/api/`.
- `www.example.com` chuyển hướng về `example.com` bằng Redirect Rule của Cloudflare.
- `cloudflared` chạy dạng systemd trên host (không chạy trong Docker), vì cần truy cập `127.0.0.1:22` cho SSH.

### A14. Job nền

| Job | Lịch chạy | Việc làm |
|---|---|---|
| `outbox-relay` | mỗi 2 giây | đẩy các dòng `outbox` chưa gửi vào BullMQ, đánh dấu `published_at` |
| `close-expired-attempts` | mỗi phút | đóng bài đã qua `current_deadline` + cửa sổ nhận phiếu muộn, dùng cùng hàm khóa + chấm với submit |
| `abandon-between-sections` | mỗi 15 phút | đóng bài chờ giữa hai phần quá `BETWEEN_SECTIONS_MAX_HOURS` |
| `ensure-partitions` | hằng ngày 01:00 (giờ VN) | tạo partition `attempt_events` cho 2 tháng tới |
| `normalize-user-answers` | khi có `attempt.submitted` | ghi `user_answers` |
| `update-user-stats` | khi có `attempt.submitted` | cập nhật số đề đã hoàn thành và trạng thái đề của user |

Mọi job phải idempotent: chạy lại không tạo dữ liệu trùng.

---

## Phụ lục B. Vận hành server

### B1. Dựng server (`infra/server/bootstrap.sh`)

Script chạy được nhiều lần (idempotent), theo thứ tự:

1. `apt update && apt -y full-upgrade`; cài `unattended-upgrades`, `fail2ban`, `ca-certificates`, `curl`, `gnupg`, `jq`.
2. Tạo user `deploy` (có sudo, thuộc nhóm `docker`), chép SSH public key. File `/etc/ssh/sshd_config.d/99-hardening.conf`: `PermitRootLogin no`, `PasswordAuthentication no`, `KbdInteractiveAuthentication no`; khởi động lại sshd.
3. Swap 2 GB: `/swapfile` (quyền 600), thêm vào `/etc/fstab`; `vm.swappiness=10`.
4. Múi giờ hệ thống UTC; bật đồng bộ thời gian (`timedatectl` phải báo `System clock synchronized: yes`). **Đồng hồ thi dựa vào giờ server, nên đồng bộ thời gian là bắt buộc.**
5. Docker Engine + Compose plugin từ repo chính thức của Docker; `/etc/docker/daemon.json`: `{"log-driver":"json-file","log-opts":{"max-size":"20m","max-file":"5"},"live-restore":true}`.
6. Thư mục `/opt/jlpt/` (chủ sở hữu `deploy`): `compose.prod.yml`, `profiles/`, `.env` (quyền 600), `RELEASES`, các script.
7. `docker login ghcr.io` bằng token chỉ có quyền đọc package, token chỉ lưu trên server và trong trình quản lý mật khẩu.
8. Cài `cloudflared` (T1.8.4) và các systemd timer cho backup, kiểm tra hằng ngày (T1.8.10, T1.8.12).

### B2. Deploy và rollback (`infra/server/deploy.sh <tag> [--force]`)

1. Kiểm tra tag tồn tại trên GHCR (`docker manifest inspect`).
2. Đếm bài thi thật đang mở (`docker compose exec -T api node dist/cli.js attempts:count-open --mode real`). Lớn hơn 0 và không có `--force` → dừng, in số lượng.
3. Ghi tag đang chạy vào `/opt/jlpt/RELEASES` để rollback.
4. `IMAGE_TAG=<tag> docker compose pull`.
5. Migration: `IMAGE_TAG=<tag> docker compose run --rm api node dist/cli.js db:migrate`. Vì migration theo kiểu expand → contract, code của bản cũ vẫn chạy được trên schema mới nếu phải rollback.
6. `IMAGE_TAG=<tag> docker compose up -d --remove-orphans`.
7. Chờ tối đa 120 giây cho mọi service `healthy`; gọi `curl -fsS http://127.0.0.1:4000/api/v1/health` và `http://127.0.0.1:3000/healthz`.
8. Lỗi → tự rollback: `IMAGE_TAG=<tag cũ> docker compose up -d`, thoát với mã 1.
9. Thành công → ghi `IMAGE_TAG=<tag>` vào `/opt/jlpt/.env`, cập nhật `RELEASES`, xóa image cũ (giữ 3 bản gần nhất).

Rollback thủ công: `deploy.sh <tag cũ> --force`. Không chạy migration ngược bằng tay. Bản nào có migration phá vỡ tương thích ngược thì không được phát hành. Không build image trên server.

### B3. Backup và khôi phục

| Lớp | Cách làm | Mục đích |
|---|---|---|
| 1 | `archive_command` của PostgreSQL đẩy WAL lên R2 bằng WAL-G; `archive_timeout = 300` | khôi phục về thời điểm bất kỳ, RPO ≤ 5 phút |
| 2 | base backup hằng ngày lúc 03:00 giờ Việt Nam (`docker compose exec -T postgres wal-g backup-push "$PGDATA"`); hằng tuần `wal-g delete retain FULL 7 --confirm` | điểm khởi đầu để khôi phục |
| 3 | Linode Backup (snapshot cả máy hằng ngày) | khôi phục nhanh toàn bộ server |
| 4 | bản sao `.env` trong trình quản lý mật khẩu | dựng lại server mới |

**Khôi phục** (diễn tập hằng tháng trên server tạm; dùng y hệt khi có sự cố thật):

1. Tạo một Linode tạm cùng vùng (tính theo giờ), chạy `bootstrap.sh`.
2. Chép `compose.prod.yml`, profile, `.env` (lấy từ trình quản lý mật khẩu).
3. **Khi diễn tập:** đặt `archive_mode = off` (hoặc dùng `WALG_S3_PREFIX` khác) trên server tạm để không ghi WAL lạ vào backup của production.
4. Tạo volume trống; chạy container postgres một lần với lệnh `wal-g backup-fetch "$PGDATA" LATEST`.
5. Tạo file `recovery.signal`; đặt `restore_command = 'wal-g wal-fetch %f %p'` (thêm `recovery_target_time` nếu cần khôi phục về một thời điểm cụ thể).
6. Khởi động postgres, chờ log `database system is ready to accept connections`; kiểm tra số dòng các bảng chính và thời điểm của bản ghi `attempt_events` mới nhất (đo RPO).
7. Chạy các service còn lại, kiểm tra health. Với sự cố thật: chuyển Tunnel sang server mới (cài `cloudflared` với credentials của tunnel cũ, hoặc tạo tunnel mới rồi đổi DNS).
8. Ghi thời gian từng bước (đo RTO) vào `docs/runbooks/restore-test-<ngày>.md`; xóa server tạm sau khi diễn tập.

### B4. Nâng/hạ gói theo mùa thi

JLPT ở Việt Nam thi vào đầu tháng 7 và đầu tháng 12. Lịch mặc định (chủ dự án điều chỉnh theo số liệu thật):

| Việc | Thời điểm |
|---|---|
| Nâng gói + chạy k6 cho kỳ tháng 7 | khoảng 01/06 |
| Hạ gói sau kỳ tháng 7 | khoảng 15/07 |
| Nâng gói + chạy k6 cho kỳ tháng 12 | khoảng 15/10 |
| Hạ gói sau kỳ tháng 12 | khoảng 15/12 |

**Nâng gói** (Shared 4 GB → Dedicated 8 GB G6):

1. Chọn giờ ít người dùng (01:00–04:00 giờ Việt Nam).
2. Xác nhận không có bài thi thật đang mở (lệnh đếm ở B2, bước 2).
3. Backup thủ công: `wal-g backup-push` + Linode Backup → "Take Snapshot".
4. Cloud Manager → Linode → **Resize** → chọn **Dedicated 8 GB thế hệ G6** (gói có giá theo tháng, không chọn G8) → **bỏ chọn "Auto Resize Disk"** → chọn **warm resize** → nhập label để xác nhận.
5. Khi máy chạy lại: `./switch-profile.sh large`.
6. Kiểm tra: health, `free -h`, `docker stats`, trang chủ, làm thử 1 bài.
7. Đêm hôm sau chạy k6 (như T1.9.2), ghi vào bảng sức chịu bên dưới.

**Hạ gói** (Dedicated 8 GB → Shared 4 GB):

1. Làm bước 1–3 như khi nâng gói.
2. **Trước khi resize:** `./switch-profile.sh small`, kiểm tra hệ thống chạy ổn với cấu hình RAM nhỏ.
3. Kiểm tra ổ đĩa: Cloud Manager → Storage → tổng dung lượng các disk ≤ 80 GB (81920 MB). Nếu lỡ mở rộng ổ trước đó: tắt máy, resize disk chính về 81920 trừ dung lượng swap disk (ví dụ 81920 − 512 = 81408 MB). Chỉ làm được khi dữ liệu đang dùng (`df -h`) nhỏ hơn mức đó; kiểm tra thêm `df -i`.
4. Resize → **Shared 4 GB** → warm resize (lỗi thì chuyển sang cold resize).
5. Kiểm tra như bước 6 của phần nâng gói.

**Lưu ý về tiền:** Linode tính theo giờ, có mức trần theo tháng; nâng rồi hạ trong cùng một tháng thì hóa đơn có nhiều dòng và tổng có thể vượt giá tháng của một gói; tắt máy vẫn bị tính tiền; giá Linode Backup thay đổi theo gói; giá có thể khác theo vùng, xem trong Cloud Manager trước khi chọn.

**Bảng sức chịu** (điền sau T1.9.2 và sau mỗi lần nâng gói):

| Gói | Profile | Số người thi cùng lúc tối đa (p95 lưu phiếu < 300 ms, lỗi < 0,1%) | Ngày đo |
|---|---|---|---|
| Shared 4 GB | small | chưa đo | |
| Dedicated 8 GB G6 | large | chưa đo | |

### B5. Sự cố thường gặp

| Triệu chứng | Kiểm tra | Xử lý |
|---|---|---|
| Không vào được trang | trạng thái Cloudflare; `systemctl status cloudflared`; `docker compose ps` | khởi động lại service lỗi; server không phản hồi → khôi phục theo B3 |
| API trả 503 | `/api/v1/health` cho biết DB hay Redis nào lỗi | `docker compose logs <service>`, khởi động lại |
| Đầy ổ đĩa | `df -h`; `docker system df` | xóa image cũ, log; kiểm tra WAL có bị tồn do archive lỗi không |
| Archive WAL lỗi | log PostgreSQL có `archive command failed` | kiểm tra key R2 và mạng; WAL tồn sẽ làm đầy ổ, phải xử lý trong ngày |
| Không tải được đề/audio | lỗi trả về từ `media.example.com`; `wrangler tail` | secret của Worker phải khớp `MEDIA_TOKEN_SECRET`; manifest có trên R2 |
| Hết RAM | `dmesg \| grep -i oom`; `docker stats` | kiểm tra đúng profile; nâng gói nếu đang mùa thi |
| Đồng hồ server lệch | `timedatectl` | bật lại đồng bộ thời gian ngay |

---

## Phụ lục C. Bảng theo dõi tiến độ

Trạng thái: `TODO` (chưa làm), `DOING` (đang làm), `REVIEW` (chờ duyệt PR), `DONE` (đã merge), `BLOCKED` (bị chặn, ghi lý do).

| Mã | Task | Vai trò | Trạng thái | Người làm | Ngày | PR | Ghi chú |
|---|---|---|---|---|---|---|---|
| T1.0.1 | Tạo tài khoản và tên miền | CHỦ DỰ ÁN | TODO | | | | |
| T1.0.2 | Chốt D1–D8 | CHỦ DỰ ÁN | TODO | | | | |
| T1.0.3 | Dữ liệu mẫu | CHỦ DỰ ÁN | TODO | | | | |
| T1.0.4 | Cấu trúc đề chính thức N1–N5 | AGENT | TODO | | | | |
| T1.0.5 | Spike OCR | AGENT | TODO | | | | |
| T1.0.6 | Spike luồng phòng thi | AGENT | TODO | | | | |
| T1.0.7 | Họp chốt Phase 1.0 | CHỦ DỰ ÁN | TODO | | | | |
| T1.1.1 | Khởi tạo monorepo | AGENT | TODO | | | | |
| T1.1.2 | TypeScript, ESLint, Prettier | AGENT | TODO | | | | |
| T1.1.3 | Khung các app và package | AGENT | TODO | | | | |
| T1.1.4 | Docker Compose dev | AGENT | TODO | | | | |
| T1.1.5 | Công cụ test | AGENT | TODO | | | | |
| T1.1.6 | CI GitHub Actions | AGENT | TODO | | | | |
| T1.1.7 | Dockerfile web/admin/api | AGENT | TODO | | | | |
| T1.1.8 | Tài liệu đóng góp | AGENT | TODO | | | | |
| T1.2.1 | Schema RichText | AGENT | TODO | | | | |
| T1.2.2 | Schema blueprint | AGENT | TODO | | | | |
| T1.2.3 | Schema snapshot, manifest, gói nhập | AGENT | TODO | | | | |
| T1.2.4 | DTO lượt thi, định dạng lỗi | AGENT | TODO | | | | |
| T1.2.5 | exam-engine: thời gian | AGENT | TODO | | | | |
| T1.2.6 | exam-engine: chấm điểm | AGENT | TODO | | | | |
| T1.2.7 | exam-engine: phiếu trả lời | AGENT | TODO | | | | |
| T1.2.8 | exam-engine: timeline phần nghe | AGENT | TODO | | | | |
| T1.2.9 | exam-engine: kiểm tra blueprint | AGENT | TODO | | | | |
| T1.2.10 | Schema DB, migration, seed | AGENT | TODO | | | | |
| T1.2.11 | Test ràng buộc DB, partition | AGENT | TODO | | | | |
| T1.3.1 | Nền của API | AGENT | TODO | | | | |
| T1.3.2 | Better Auth | AGENT | TODO | | | | |
| T1.3.3 | Gửi email | AGENT | TODO | | | | |
| T1.3.4 | RBAC + kiểm tra theo tài nguyên | AGENT | TODO | | | | |
| T1.3.5 | 2FA nhân sự, khóa route admin | AGENT | TODO | | | | |
| T1.3.6 | Rate limit, Turnstile | AGENT | TODO | | | | |
| T1.3.7 | Audit log | AGENT | TODO | | | | |
| T1.3.8 | Hồ sơ người dùng | AGENT | TODO | | | | |
| T1.3.9 | Giao diện tài khoản | AGENT | TODO | | | | |
| T1.3.10 | Đăng nhập admin, 2FA | AGENT | TODO | | | | |
| T1.3.11 | Header bảo mật | AGENT | TODO | | | | |
| T1.3.12 | E2E trong CI | AGENT | TODO | | | | |
| T1.4.1 | Lưu trữ file | AGENT | TODO | | | | |
| T1.4.2 | Module media | AGENT | TODO | | | | |
| T1.4.3 | Nguồn đề, bản quyền | AGENT | TODO | | | | |
| T1.4.4 | API ngân hàng câu hỏi | AGENT | TODO | | | | |
| T1.4.5 | RichTextView | AGENT | TODO | | | | |
| T1.4.6 | Giao diện biên tập | AGENT | TODO | | | | |
| T1.4.7 | Kiểm duyệt | AGENT | TODO | | | | |
| T1.4.8 | Quản lý blueprint | AGENT | TODO | | | | |
| T1.4.9 | Ghép đề | AGENT | TODO | | | | |
| T1.4.10 | Nhập gói JSON | AGENT | TODO | | | | |
| T1.4.11 | Xuất bản đề | AGENT | TODO | | | | |
| T1.4.12 | Người dùng, audit log, tổng quan | AGENT | TODO | | | | |
| T1.5.1 | media-token | AGENT | TODO | | | | |
| T1.5.2 | Tạo lượt thi | AGENT | TODO | | | | |
| T1.5.3 | Bắt đầu/chuyển phần | AGENT | TODO | | | | |
| T1.5.4 | Lưu phiếu | AGENT | TODO | | | | |
| T1.5.5 | Nộp bài, chấm điểm | AGENT | TODO | | | | |
| T1.5.6 | Vào lại, token, xem lại, lịch sử | AGENT | TODO | | | | |
| T1.5.7 | Job nền | AGENT | TODO | | | | |
| T1.5.8 | Cổng media | AGENT | TODO | | | | |
| T1.5.9 | Lớp dữ liệu client | AGENT | TODO | | | | |
| T1.5.10 | Giao diện phòng thi | AGENT | TODO | | | | |
| T1.5.11 | Phần nghe hiểu | AGENT | TODO | | | | |
| T1.5.12 | Kết quả, xem lại, lịch sử | AGENT | TODO | | | | |
| T1.5.13 | Khách làm thử | AGENT | TODO | | | | |
| T1.5.14 | Bộ test kịch bản phòng thi | AGENT | TODO | | | | |
| T1.6.1 | Layout, font | AGENT | TODO | | | | |
| T1.6.2 | Trang chủ | AGENT | TODO | | | | |
| T1.6.3 | Trang cấp độ, danh sách đề | AGENT | TODO | | | | |
| T1.6.4 | Trang giới thiệu đề | AGENT | TODO | | | | |
| T1.6.5 | Trạng thái cá nhân | AGENT | TODO | | | | |
| T1.6.6 | Trang hỗ trợ, pháp lý | AGENT | TODO | | | | |
| T1.6.7 | SEO kỹ thuật | AGENT | TODO | | | | |
| T1.6.8 | Revalidate khi xuất bản | AGENT | TODO | | | | |
| T1.6.9 | Ngân sách hiệu năng trong CI | AGENT | TODO | | | | |
| T1.7.1 | Khung CLI | AGENT | TODO | | | | |
| T1.7.2 | Phân tích PDF | AGENT | TODO | | | | |
| T1.7.3 | OCR trang scan | AGENT | TODO | | | | |
| T1.7.4 | Nhận diện cấu trúc bằng LLM | AGENT | TODO | | | | |
| T1.7.5 | Đặc thù tiếng Nhật | AGENT | TODO | | | | |
| T1.7.6 | Ghép đáp án | AGENT | TODO | | | | |
| T1.7.7 | Audio, timeline | AGENT | TODO | | | | |
| T1.7.8 | Cắt ảnh | AGENT | TODO | | | | |
| T1.7.9 | Báo cáo kiểm tra | AGENT | TODO | | | | |
| T1.7.10 | Đóng gói, quét virus | AGENT | TODO | | | | |
| T1.7.11 | Màn hình đối chiếu | AGENT | TODO | | | | |
| T1.7.12 | Lưu PDF gốc | AGENT | TODO | | | | |
| T1.7.13 | Đánh giá độ chính xác | AGENT | TODO | | | | |
| T1.8.1 | Tạo server | CHỦ DỰ ÁN | TODO | | | | |
| T1.8.2 | Script dựng server | AGENT | TODO | | | | |
| T1.8.3 | Cấu hình Cloudflare | CHỦ DỰ ÁN + AGENT | TODO | | | | |
| T1.8.4 | Tunnel, SSH qua Tunnel | AGENT | TODO | | | | |
| T1.8.5 | Cloudflare Access | CHỦ DỰ ÁN | TODO | | | | |
| T1.8.6 | Image PostgreSQL production | AGENT | TODO | | | | |
| T1.8.7 | R2, media Worker | AGENT | TODO | | | | |
| T1.8.8 | Email, Turnstile production | CHỦ DỰ ÁN + AGENT | TODO | | | | |
| T1.8.9 | Compose production | AGENT | TODO | | | | |
| T1.8.10 | Backup, thử khôi phục | AGENT | TODO | | | | |
| T1.8.11 | Phát hành, deploy | AGENT | TODO | | | | |
| T1.8.12 | Giám sát, cảnh báo | AGENT | TODO | | | | |
| T1.8.13 | Runbook | AGENT | TODO | | | | |
| T1.9.1 | Nội dung ra mắt | CHỦ DỰ ÁN | TODO | | | | |
| T1.9.2 | Load test k6 | AGENT | TODO | | | | |
| T1.9.3 | Rà soát bảo mật | AGENT | TODO | | | | |
| T1.9.4 | Thử trên thiết bị | AGENT + CHỦ DỰ ÁN | TODO | | | | |
| T1.9.5 | Pháp lý | CHỦ DỰ ÁN | TODO | | | | |
| T1.9.6 | Beta kín | CHỦ DỰ ÁN + AGENT | TODO | | | | |
| T1.9.7 | Ra mắt công khai | CHỦ DỰ ÁN | TODO | | | | |
| P2.1–P2.7 | Giai đoạn 2 (viết chi tiết task trước khi làm) | AGENT | TODO | | | | |
| P3.1–P3.7 | Giai đoạn 3 | AGENT | TODO | | | | |
| P4.1–P4.7 | Giai đoạn 4 | AGENT | TODO | | | | |
