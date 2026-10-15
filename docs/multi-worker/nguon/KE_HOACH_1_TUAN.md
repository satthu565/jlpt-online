# Kế hoạch 1 tuần — JLPT Online (V1 lõi)

> **Dành cho:** agent (Agent A, Agent B) chạy trong Antigravity hoặc dưới `agent-runner` trên VPS, và chủ dự án.
> **Phiên bản:** 1.2 — 15/10/2026. Bản 1.2: thêm mục 2.9 (chế độ tự động hoàn toàn). Bản 1.1: thêm mục 2.8 (chế độ chạy tự động bằng `agent-runner`).
> **Phạm vi:** rút Giai đoạn 1 của `KE_HOACH_TRIEN_KHAI.md` (khoảng 30 tuần) xuống **7 ngày**, chỉ giữ luồng lõi: nhập đề → duyệt → xuất bản → làm bài → chấm điểm → xem lại. Các phần khác của V1 được dời (mục 3, mục 7).
> **Quan hệ với tài liệu khác:** file này thay lịch, phạm vi và quy trình làm việc của Giai đoạn 1 trong tuần này. Phụ lục A của `KE_HOACH_TRIEN_KHAI.md` (hợp đồng kỹ thuật), mục 8 và mục 15 của `DE_XUAT_KY_THUAT.md` vẫn áp dụng, **trừ các điểm ghi ở mục 3**.
> **Cách đọc nhanh:** mỗi phiên làm việc đọc mục 1–4, sau đó chỉ đọc phần của ngày hôm đó trong mục 5.

---

## Mục lục

1. Mục tiêu tuần
2. Quy tắc cho agent trong tuần
3. Thay đổi so với kế hoạch gốc
4. Ghi chú kỹ thuật dễ vướng
5. Lịch 7 ngày (Ngày 0 → Ngày 7)
6. Cổng ra mắt: trước khi mở cho người dùng thật
7. Sau tuần 1
- Phụ lục 1. Thiết lập Antigravity và prompt mẫu
- Phụ lục 2. Nhật ký tiến độ

---

## 1. Mục tiêu tuần

### 1.1. Cổng ra tuần (kết quả sau 7 ngày)

1. **Luồng nội dung:** editor tải gói nhập đề `.zip` (Phụ lục A7) lên admin → hệ thống tạo các nhóm câu `draft` và một đề nháp → reviewer (khác người nhập) duyệt → admin xuất bản → đề hiện trong thư viện mà không cần build lại.
2. **Luồng làm bài:** học viên đăng ký → xác minh email → đăng nhập → chọn đề → làm ở chế độ thi thật (đồng hồ theo deadline do server cấp, tự lưu theo lô, khóa phần, phần nghe phát theo timeline) → nộp → xem kết quả có ghi "điểm quy đổi tham khảo" → xem lại từng câu.
3. **Không mất đáp án, không lộ đáp án:** các kịch bản ở mục 8.2–8.3 của `DE_XUAT_KY_THUAT.md` có test tự động và pass trong CI (danh sách ở Ngày 4 và Ngày 6).
4. **Chạy trên server thật** qua Cloudflare Tunnel, không mở cổng web nào ra Internet; deploy và rollback bằng script; backup hằng ngày. Khi D1 chưa có ý kiến pháp lý, cả site nằm sau Cloudflare Access (chỉ nhóm thử vào được) và chỉ chứa dữ liệu giả hoặc đề tự soạn.
5. Chủ dự án làm trọn 1 đề, gồm phần nghe, trên 1 iPhone (Safari) và 1 điện thoại Android (Chrome) mà không gặp lỗi P0/P1.

### 1.2. Việc không rút ngắn được bằng agent

| Việc | Lý do | Hệ quả trong tuần |
|---|---|---|
| D1: nơi lưu dữ liệu người dùng; duyệt chính sách quyền riêng tư và điều khoản | Cần luật sư | Site nằm sau Cloudflare Access, chưa mở cho người dùng thật |
| D3: quyền sử dụng đề thi | Cần thỏa thuận với chủ sở hữu nội dung | Chỉ đăng đề tự soạn hoặc đề đã có văn bản cho phép |
| Beta kín và tiêu chí "người dùng thật làm bài ổn định 2 tuần liên tục" | Cần thời gian thực | Làm sau tuần 1 (mục 6) |

### 1.3. Giả định

- **Hai agent chạy song song** trong Antigravity: Agent A (lõi, API, hạ tầng) và Agent B (giao diện, kiểm thử E2E), mỗi agent một workspace riêng (mục 2.3). Nếu chỉ chạy một agent, phạm vi này cần khoảng 10–12 ngày; muốn giữ 7 ngày thì cắt theo mục 2.6 ngay từ Ngày 3.
- Chủ dự án dành khoảng 1–2 giờ mỗi ngày (duyệt Implementation Plan buổi sáng, merge PR buổi trưa và tối, làm phần việc của mình trong lịch) và khoảng 3 giờ ở Ngày 6.
- Ngày 1 là ngày chủ dự án ra lệnh bắt đầu; các ngày được đánh số, không gắn với ngày lịch.

---

## 2. Quy tắc cho agent trong tuần

Phần A của `KE_HOACH_TRIEN_KHAI.md` vẫn áp dụng; mục này thay thế Phần A ở những điểm mâu thuẫn.

### 2.1. Thứ tự ưu tiên khi tài liệu mâu thuẫn

1. Chỉ thị trực tiếp của chủ dự án.
2. File này, kể cả các thay đổi ở mục 3.
3. Phụ lục A của `KE_HOACH_TRIEN_KHAI.md`.
4. Task gốc trong `KE_HOACH_TRIEN_KHAI.md`. Việc ghi "theo task gốc" nghĩa là phạm vi "Làm", "Không làm" và "Kiểm tra" lấy nguyên từ task đó, trừ phần được ghi khác ngay tại việc đó hoặc ở mục 3.
5. `DE_XUAT_KY_THUAT.md`.
6. Tài liệu tính năng `.docx`.

### 2.2. Nhịp làm việc mỗi ngày

1. **Đầu ngày:** cập nhật nhánh từ `main`; đọc mục 1–4 và phần của ngày; tạo Implementation Plan (artifact của Antigravity) gồm các việc theo đúng thứ tự trong file, test sẽ viết và lệnh kiểm tra; chờ chủ dự án duyệt.
2. **Từng việc:** với phần logic, viết test trước → code → chạy kiểm tra của việc → commit → đánh dấu `[x]` cho việc đó trong file này (cùng commit).
3. **Giữa ngày:** mở PR sớm cho phần mà agent kia đang chờ (ghi rõ ở từng ngày).
4. **Cuối ngày:** chạy các lệnh ở "Cổng cuối ngày"; mở PR theo mẫu A7, dán output thật; ghi một dòng vào Phụ lục 2 (tuần này dùng Phụ lục 2 thay cho Phụ lục C của kế hoạch gốc); tạo Walkthrough (artifact) gồm việc đã xong, việc chưa xong, điểm lệch kế hoạch, việc cần chủ dự án và ảnh chụp màn hình nếu có giao diện.

Cổng cuối ngày nào cũng gồm: `pnpm lint && pnpm typecheck && pnpm test` pass ở gốc repo và CI xanh.

### 2.3. Hai agent song song

- Agent A làm trong thư mục repo chính; Agent B làm trong một git worktree (ví dụ `D:\code\jlpt-b`). Mỗi thư mục là một workspace riêng trong Agent Manager. Hai agent không bao giờ làm chung một thư mục.
- **Thư mục mỗi agent được sửa** ghi ở đầu phần việc của agent trong từng ngày. Cần sửa thư mục của agent kia, hoặc file ở gốc repo, thì ghi yêu cầu vào Walkthrough để agent kia làm.
- `packages/schema` là hợp đồng giữa hai agent và thuộc Agent A. Agent B cần đổi DTO hoặc schema thì ghi yêu cầu, không tự sửa.
- Thêm dependency chỉ trong `package.json` của package mình đang sở hữu. Xung đột `pnpm-lock.yaml` khi cập nhật từ `main`: lấy bản của `main` rồi chạy lại `pnpm install`.
- Hai agent dùng chung các container của `compose.dev.yml` nhưng tách dữ liệu và cổng:

  | | Agent A | Agent B |
  |---|---|---|
  | Database PostgreSQL | `jlpt` | `jlpt_b` |
  | Redis | DB `0` | DB `1` |
  | Cổng web / admin / api | 3000 / 3001 / 4000 | 3100 / 3101 / 4100 |

### 2.4. Nhánh, commit, PR, merge

- Nhánh: `d<ngày>-<a|b>-<mo-ta>`, ví dụ `d4-a-attempt-api`. Một ngày có thể có nhiều PR.
- Commit theo A6 của kế hoạch gốc (Conventional Commits, subject tiếng Anh ASCII, dòng cuối body `Task: T1.x.y`).
- Branch protection của `main`: bắt buộc CI xanh; trong tuần này không bắt buộc review trên GitHub.
- Người merge:
  - Agent tự merge khi CI xanh nếu PR chỉ gồm giao diện, test hoặc tài liệu.
  - Chủ dự án merge sau khi đọc Walkthrough nếu PR đụng tới: xác thực, phân quyền, lượt thi, chấm điểm, đáp án, migration, `infra/`, `.github/`.
- Sau mỗi lần `main` thay đổi, agent kia cập nhật nhánh của mình từ `main` trước khi làm tiếp.

### 2.5. Khi bị kẹt

- Các trường hợp ở A4 của kế hoạch gốc: dừng và hỏi, trừ trường hợp đã có phương án dự phòng ở mục 3.2.
- Một lỗi đã sửa 2 lần không được, hoặc mất quá 60 phút: ghi lỗi, lệnh đã chạy và log vào Walkthrough, báo chủ dự án, rồi **chuyển sang việc khác không phụ thuộc** trong ngày. Không đứng chờ.
- Không xử lý lỗi bằng cách tắt hoặc `skip` test, hạ ngưỡng, bỏ guard phân quyền, hay dùng `any` / `@ts-ignore` để qua typecheck.

### 2.6. Thứ tự cắt khi trễ

Mỗi việc có nhãn **[PHẢI]** (thuộc cổng ra tuần) hoặc **[NÊN]** (làm khi còn thời gian). Trễ lịch thì cắt theo thứ tự sau và ghi vào Phụ lục 2:

1. Việc [NÊN] của ngày đang làm (dời sang Ngày 7 hoặc tuần 2).
2. Độ hoàn thiện giao diện (hiệu ứng, màn hình trống, chi tiết responsive), giữ nguyên chức năng.
3. Trang lịch sử làm bài và banner "Tiếp tục làm bài".
4. Deploy lên server: chạy `compose.prod.yml` trên máy local thay thế; deploy thật dời sang tuần 2.

**Không được cắt:** test của các việc [PHẢI] ở Ngày 2 và Ngày 4; test "không lộ đáp án"; quy tắc lưu phiếu (`seq`, lease, deadline do server cấp, chỉ báo đã lưu sau khi commit).

### 2.7. Không bao giờ làm

Giữ nguyên A5 của kế hoạch gốc và mục 15 của `DE_XUAT_KY_THUAT.md`. Những điểm dễ vi phạm khi làm nhanh:

- Đưa đáp án vào snapshot hoặc vào bất kỳ response nào của học viên trước khi nộp.
- Dùng giờ của client để tính thời gian thi; báo "đã lưu" trước khi commit vào PostgreSQL; gửi request lưu cho từng lần bấm.
- Tự điền số liệu JLPT không có nguồn chính thức (chỗ chưa có nguồn ghi `CHƯA XÁC NHẬN`).
- Commit secrets, file `.env`, PDF, audio hoặc nội dung đề có bản quyền. Tài liệu đề để ở `D:\jlpt-samples\`, ngoài repo.
- Thêm endpoint không có guard phân quyền; gọi điểm quy đổi là "điểm JLPT chính thức".
- Build image trên server; chạy lệnh trên server production khi chủ dự án chưa duyệt từng lệnh; đọc hoặc in secrets production.

### 2.8. Chế độ chạy tự động (agent-runner trên VPS)

Khi agent nhận việc từ `agent-runner` (xem `agent-runner/README.md`), các điểm dưới đây thay mục 2.2, 2.4 và Phụ lục 1:

- Mỗi phiên làm đúng một việc do runner giao (danh sách trong `agent-runner/tasks.mjs`). Không có Implementation Plan đầu ngày, không chờ duyệt kế hoạch, không có Walkthrough; báo cáo là tin nhắn cuối của phiên.
- Agent chỉ commit trên nhánh runner đã tạo. Runner push, mở PR, chờ CI, merge theo mục 2.4 và giao lại việc khi kiểm tra chưa đạt. Agent không push, không mở hoặc merge PR, không tạo tag, không gọi `gh`, `ssh`, `scp`, `sudo`.
- Câu hỏi cho chủ dự án: commit phần đã làm, rồi ghi câu hỏi ở tin nhắn cuối trên một dòng bắt đầu bằng `CAN_CHU_DU_AN:`. Runner dừng việc đó và báo chủ dự án.
- Chỉ các việc kiểm tra cổng cuối ngày (`dN-gate-check`) ghi Phụ lục 2. Chủ dự án duyệt cuối ngày bằng lệnh `approve gN` của runner.
- Stack Docker dev dùng chung chạy với project name `jlpt-dev`; không chạy `docker compose down`, không xóa volume của stack này.
- Ảnh chụp và recording giao diện: dùng Playwright (screenshot, trace) thay browser agent, lưu làm artifact của CI, không commit. Đọc trang web (ví dụ jlpt.jp) bằng công cụ đọc web của agent.
- Ngày 6: agent không SSH vào server production. Agent viết script và runbook, rồi kiểm tra trên VPS của agent: shellcheck, `docker compose config`, build image và chạy thử `compose.prod.yml` với project name và cổng riêng, khôi phục thử một bản dump. Chủ dự án chạy script trên server production theo runbook (việc `h6-deploy`); sau đó agent kiểm tra site qua HTTPS.
- Lỗi phát hiện sau Ngày 6 đi qua issue GitHub có nhãn `agent`; mỗi issue là một việc của runner.

### 2.9. Chế độ tự động hoàn toàn

Khi `agent-runner/config.json` có `"fullAuto": true`, chủ dự án chỉ kiểm tra khi mọi việc xong. Các điểm dưới đây bổ sung mục 2.8 và thay mục 2.5 ở chỗ mâu thuẫn:

- **Không dừng để hỏi.** Gặp chỗ cần quyết định: chọn phương án an toàn, đúng kế hoạch (ưu tiên giá trị mặc định đã ghi, không phát sinh chi phí, không đổi hợp đồng ở Phụ lục A nếu tránh được), ghi vào `docs/decisions/tu-quyet.md` (ngày, mã việc, vấn đề, phương án đã chọn, lý do), rồi làm tiếp. Chỉ dùng `CAN_CHU_DU_AN:` khi việc cần tiền, tài khoản hoặc ý kiến pháp lý; khi đó vẫn làm hết phần không phụ thuộc vào câu trả lời.
- **Merge:** runner merge khi CI xanh và review của agent ghi `REVIEW: APPROVE`. Chủ dự án xem lại các PR rủi ro cao trong báo cáo cuối.
- **Số liệu JLPT** (T1.0.4) giữ trạng thái "CHƯA XÁC NHẬN" cho tới khi chủ dự án kiểm tra; blueprint tương ứng ở trạng thái `draft`.
- **Không deploy production.** Điểm 4 và 5 của mục 1.1 chuyển thành việc của chủ dự án sau khi kiểm tra. Thay vào đó có hai việc:
  - **`d6a-demo`: bản demo trên VPS của agent.** Dựng từ `main` bằng `compose.prod.yml` (profile `small`) cộng file `infra/compose/compose.demo.yml`: project name `jlpt-demo`, volume riêng; một reverse proxy (ví dụ Caddy) gom web, admin và `/api` về cùng origin như Cloudflare Tunnel ở production; chỉ bind `127.0.0.1:3200` (trang học viên) và `127.0.0.1:3201` (admin); email gửi vào Mailpit riêng ở `127.0.0.1:8226`. Script `infra/demo/up.sh` dựng lại demo từ đầu: build image tại chỗ, migrate, tạo tài khoản demo (admin, editor, reviewer, học viên) đã xác minh email với mật khẩu ngẫu nhiên lưu ở `~/jlpt-demo/credentials.txt` (không commit), nhập và xuất bản đề `demo-n5`. Dựng xong thì chạy Playwright làm trọn đề trên demo. Ghi cách truy cập vào `docs/demo.md`: lệnh SSH chuyển cổng `ssh -L 3200:127.0.0.1:3200 -L 3201:127.0.0.1:3201 -L 8226:127.0.0.1:8226 root@<IP-VPS>`, các URL, chỗ lấy mật khẩu.
  - **`d7-final-report`: báo cáo tổng kết.** Chạy lại `infra/demo/up.sh` trên `main` mới nhất, rồi viết `docs/BAO_CAO_TUAN_1.md` cho chủ dự án: (1) đối chiếu 5 điểm của mục 1.1, mỗi điểm ghi đạt, chưa đạt hay ngoài phạm vi tự động, kèm bằng chứng (lệnh, kết quả test, PR); (2) kịch bản kiểm tra bản demo trong khoảng 15 phút; (3) tóm tắt `docs/decisions/tu-quyet.md`; (4) việc bị chặn, bỏ qua hoặc chưa xong và lý do, lấy từ báo cáo trạng thái runner đưa vào prompt; (5) số liệu JLPT chờ xác nhận; (6) việc còn lại trước khi mở cho người dùng thật (mục 6) và các bước deploy production theo runbook.

---

## 3. Thay đổi so với kế hoạch gốc

### 3.1. Cắt, đơn giản hóa, dời

Duyệt file này nghĩa là chủ dự án chấp nhận các điểm dưới đây; agent làm theo, không cần đề xuất lại ở mục C0 của kế hoạch gốc.

| # | Kế hoạch gốc | Tuần 1 | Làm đầy đủ khi |
|---|---|---|---|
| 1 | T1.0.5, Phase 1.7 (OCR, `apps/ocr-worker`) | Không làm. Đề vào hệ thống bằng gói JSON theo A7 | Khi số đề cần nhập vượt sức nhập tay; bắt đầu bằng spike T1.0.5 |
| 2 | T1.0.6 (spike phòng thi) | Không làm spike; viết thẳng code thật theo mục 8 và kiểm bằng test kịch bản (Ngày 4, Ngày 6) | — |
| 3 | T1.0.2 (8 file D1–D8) | 1 file `docs/decisions/tuan-1.md` | Cổng ra mắt |
| 4 | Image PostgreSQL riêng có pg_bigm, WAL-G (T1.1.4, T1.8.6); tìm kiếm pg_bigm và `unaccent` (T1.4.4) | Image chính thức `postgres:17` (ghim bản). Admin lọc nhóm câu theo gói nhập, cấp độ, trạng thái; chưa có tìm kiếm theo từ khóa | WAL-G: cổng ra mắt. Tìm kiếm: tuần 2 |
| 5 | R2 và media Worker (T1.5.8, T1.8.7) | `apps/api` phục vụ snapshot và media từ ổ đĩa (`STORAGE_DRIVER=local`) tại `/api/v1/media/exams/{examId}/v{version}/snapshot.json` và `/api/v1/media/m/{sha256}.{ext}`, giữ nguyên logic của A11: token, manifest, `Range`, header cache. `MEDIA_BASE_URL=https://<domain>/api/v1/media` | Trước khi tải tăng: đổi `MEDIA_BASE_URL` sang `media.<domain>`, client không phải sửa |
| 6 | BullMQ và các job `outbox-relay`, `normalize-user-answers`, `update-user-stats` (T1.5.7, A14) | `worker` (cùng image, `APP_MODE=worker`) chỉ chạy `close-expired-attempts`, `abandon-between-sections`, `ensure-partitions`, hẹn giờ trong process, chống chạy trùng bằng khóa của PostgreSQL. Nộp bài vẫn ghi `outbox` trong cùng transaction; chưa có relay (tuần 2 xử lý bù). `completedExams` tính bằng truy vấn | Tuần 2 |
| 7 | Ghép đề (T1.4.9), quản lý blueprint (T1.4.8) | Nhập gói tạo luôn 1 đề nháp: phần thi theo blueprint của cấp độ, nhóm câu xếp theo `sectionCode` và `orderInSource`; `kind` chọn khi tải lên (mặc định `practice`). Blueprint nạp bằng seed, chưa có giao diện | Tuần 2 |
| 8 | Trình soạn RichText theo đoạn (T1.4.6) | Admin sửa nhóm câu bằng ô JSON (validate bằng `@jlpt/schema`, báo lỗi theo trường), xem trước bằng `RichTextView`, chọn đáp án đúng bằng nút chọn | Tuần 2 |
| 9 | Phiên bản nhóm câu (T1.4.4) | Nhóm thuộc đề đang xuất bản thì chỉ đọc; muốn sửa phải gỡ đề trước. Sửa nhóm `approved` đưa nhóm về `draft` và phải duyệt lại; xuất bản lại tạo version mới. Version cũ không đổi vì snapshot và answer key bất biến | Tuần 2 |
| 10 | Nguồn đề và license (T1.4.3) | Bảng theo hợp đồng; license tạo bằng lệnh CLI, nguồn đề tạo từ gói nhập. Seed có license "Tự soạn" cho phép công khai. Admin chỉ xem. Xuất bản vẫn kiểm tra license | Tuần 2 |
| 11 | Người dùng, audit log, tổng quan trên admin (T1.4.12) | Đổi role bằng lệnh CLI `user:role`; chưa có trang | Tuần 2 |
| 12 | Khách làm thử (T1.5.13, D4) | Không làm; cột `guest_id` vẫn tạo theo A10 | Tuần 2 trở đi |
| 13 | CASL (T1.3.4) | Guard mặc định từ chối và `@Public()` giữ nguyên; kiểm tra chủ sở hữu viết trong service | Khi có role `teacher` |
| 14 | 2FA nhân sự (T1.3.5, T1.3.10), Turnstile (T1.3.6), audit log (T1.3.7) | [NÊN]. Thiếu 2FA thì admin vẫn chỉ vào được qua Cloudflare Access và kiểm tra `ADMIN_HOST` | Cổng ra mắt |
| 15 | CSP có nonce (T1.3.11) | Bắt buộc: `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, kiểm tra `Origin` ở API. `script-src` đặt trong `Content-Security-Policy-Report-Only` | Cổng ra mắt |
| 16 | Phase 1.6 | Giữ T1.6.1, T1.6.2, T1.6.4, T1.6.8 (không purge Cloudflare), T1.6.3 rút gọn (`/n1`…`/n5` gộp giới thiệu cấp độ và danh sách đề), khung T1.6.6 (không cần banner cookie khi chưa có analytics dùng cookie), T1.6.7 rút gọn. Bỏ T1.6.5, JSON-LD, trang theo năm và kỳ, T1.6.9 (Lighthouse đo tay ở Ngày 7) | Tuần 2 |
| 17 | Playwright 3 trình duyệt (T1.1.5) | Chỉ Chromium (desktop và 390×844). Safari và thiết bị thật do chủ dự án thử ở Ngày 7 | Cổng ra mắt |
| 18 | `packages/api-client` (OpenAPI) | Không làm; web và admin gọi API bằng hàm `fetch` có kiểu, parse response bằng `@jlpt/schema` | Tuần 2 trở đi |
| 19 | Chuỗi giao diện (A6) | `apps/web` dùng `messages/vi.json`. `apps/admin` được viết chuỗi tiếng Việt trực tiếp trong code và được dùng shadcn/ui | Tuần 2 trở đi |
| 20 | Phase 1.8 | Giữ T1.8.2, T1.8.9 (chỉ profile `small`), T1.8.11, T1.8.4 rút gọn (bỏ rule `ssh.` ở A13; cổng 22 chỉ mở cho IP của chủ dự án), Cloudflare Access cho `admin.<domain>` và cho cả domain chính khi D1 chưa xong, Resend, Turnstile, UptimeRobot, `pg_dump` hằng ngày giữ 7 bản + Linode Backup. Bỏ WAL-G, diễn tập khôi phục trên server tạm, profile `large`, cảnh báo Linode | Cổng ra mắt |
| 21 | Phase 1.9 | Giữ rà soát bảo mật rút gọn, k6 nhỏ trên máy local, thử thiết bị thật. Bỏ k6 trên server, ZAP, CodeQL, beta kín, ra mắt | Cổng ra mắt |

### 3.2. Phương án dự phòng đã duyệt trước

Agent áp dụng ngay khi gặp, ghi vào mục "Lệch so với kế hoạch" của PR, không cần hỏi.

| Tình huống | Dự phòng |
|---|---|
| Tích hợp Better Auth với Fastify adapter của NestJS chưa chạy sau 2 giờ | Chuyển `apps/api` sang Express adapter của NestJS |
| Better Auth không đặt được tên cookie `__Host-session` | Dùng cookie của Better Auth với `HttpOnly; Secure; SameSite=Lax; Path=/`, không có `Domain` |
| jlpt.jp chỉ công bố số câu "dự kiến" (目安) | Vi phạm của `validateBlueprint()` có thêm trường `severity`: lệch so với số câu dự kiến là `warning`; chỉ vi phạm `error` mới chặn xuất bản đề `original` |
| Cache Storage gây lỗi phát audio trên iOS Safari | Tải audio vào bộ nhớ (Blob) rồi phát bằng blob URL; tải lại trang thì tải lại audio |
| Chưa có server hoặc tên miền tới Ngày 6 | Chạy `compose.prod.yml` trên máy local; deploy thật khi có tài khoản |

---

## 4. Ghi chú kỹ thuật dễ vướng

1. **Build không có API.** Image được build trong CI, lúc đó không có API. Trang public không được làm build lỗi: lúc build, hàm lấy dữ liệu trả danh sách rỗng; ở runtime, trang được làm mới bằng ISR (`revalidate`) và bằng `POST /api/revalidate` mà `deploy.sh` gọi sau khi mọi service healthy. Biến `NEXT_PUBLIC_*` bị gắn vào bundle lúc build, nên truyền qua GitHub Actions variables khi build image.
2. **Next.js `standalone` trong monorepo pnpm:** đặt `outputFileTracingRoot` về gốc repo, nếu không image sẽ thiếu package của workspace.
3. **Cùng origin ở dev:** web và admin chuyển `/api/*` sang api bằng `rewrites` của Next.js, để cookie và kiểm tra `Origin` giống production. Kiểm tra `ADMIN_HOST` ở production dùng header `Host` (Tunnel giữ nguyên); ở dev dùng host gốc mà proxy chuyển tiếp (ví dụ `X-Forwarded-Host`) và chỉ tin header này khi `NODE_ENV=development`.
4. **Bảng partition `attempt_events`:** viết migration bằng SQL thuần (Drizzle chưa mô tả được partition); khóa chính và ràng buộc unique phải chứa `attempt_month`; migration tạo sẵn partition của tháng hiện tại và 2 tháng kế tiếp.
5. **Audio trên iOS Safari:** chỉ phát được sau một lần chạm của người dùng, nên nút "Bắt đầu phần nghe" chính là lần chạm đó; dùng MP3 mono; phải thử trên iPhone thật, giả lập không đủ.
6. **Windows:** repo đặt ở đường dẫn không có dấu cách (ví dụ `D:\code\jlpt`); `.gitattributes` có `* text=auto eol=lf` để file `.sh` chạy được trên server Linux; PostgreSQL, Redis, Mailpit chạy trong Docker Desktop, các app chạy bằng `pnpm dev`. Dùng WSL2 theo B5 của kế hoạch gốc nếu Antigravity mở được thư mục trong WSL.
7. **Thời gian:** server và DB dùng UTC; client chỉ dùng `serverNow` để tính offset; test liên quan tới thời gian dùng fake timer hoặc `page.clock`, không `sleep`.

---

## 5. Lịch 7 ngày

### Tổng quan

| Ngày | Agent A | Agent B | Chủ dự án | Kết quả cuối ngày |
|---|---|---|---|---|
| 0 | — | — | Cài đặt, repo, chốt nhanh D1–D8, tên miền, server, Resend | Sẵn sàng bắt đầu |
| 1 | Monorepo, Docker dev, CI | Cấu trúc đề chính thức N1–N5 | Xác nhận số liệu JLPT, bật branch protection | Repo build xanh |
| 2 | Schema, DB, lõi xuất bản, seed | Layout, `RichTextView`, `exam-engine` | Merge PR giữa ngày | Đề mẫu N5 đã xuất bản trong DB |
| 3 | API nền, Better Auth, phân quyền, media token | Lớp dữ liệu và giao diện phòng thi (API giả) | — | Đăng ký, đăng nhập chạy; phòng thi chạy với API giả |
| 4 | API lượt thi, chấm điểm, worker, test kịch bản | Phần nghe, kết quả, nối API thật, giao diện tài khoản | — | Làm trọn đề N5 trên máy local |
| 5 | Nhập gói, duyệt, xuất bản, Docker image | Giao diện admin, trang public | Kiểm tra tên miền, server, Resend | Nhập → duyệt → xuất bản → làm bài |
| 6 | Server, Tunnel, deploy, backup | E2E trong CI, đề mẫu đầy đủ | Cloudflare Access, `.env` production (khoảng 3 giờ) | Chạy trên domain thật |
| 7 | Sửa lỗi, rà soát bảo mật | Sửa lỗi, Lighthouse, thử bằng browser agent | Thử trên điện thoại, nghiệm thu | Đạt cổng ra tuần (mục 1.1) |

### Ngày 0 — Chủ dự án chuẩn bị

| # | Việc | Cần xong trước |
|---|---|---|
| 1 | Cài Git, Docker Desktop, Node.js 24 LTS (bật `corepack` để có pnpm), GitHub CLI; chạy `gh auth login` | Ngày 1 |
| 2 | Tạo repo GitHub private; tạo thư mục repo (ví dụ `D:\code\jlpt`); chép `KE_HOACH_1_TUAN.md`, `KE_HOACH_TRIEN_KHAI.md`, `DE_XUAT_KY_THUAT.md` vào gốc thư mục và nội dung thư mục `thong_tin_du_an/` vào `docs/` | Ngày 1 |
| 3 | Đọc các quyết định mặc định ở dưới; điểm nào khác thì báo cho Agent A trước khi bắt đầu. Agent A ghi `docs/decisions/tuan-1.md` trong commit đầu tiên | Ngày 1 |
| 4 | Thiết lập Antigravity theo Phụ lục 1 | Ngày 1 |
| 5 | Mua tên miền, chuyển DNS về Cloudflare (đổi nameserver có thể mất tới 1 ngày) | Ngày 5 |
| 6 | Tạo Linode Shared 4 GB, vùng Singapore, Ubuntu 24.04, bật Backup, thêm SSH key; Cloud Firewall chỉ mở cổng 22 cho IP của chủ dự án. Nếu D1 buộc lưu dữ liệu trong nước thì thuê VPS đặt tại Việt Nam | Ngày 5 |
| 7 | Tạo tài khoản Resend và thêm domain (xác minh có thể mất vài giờ); tạo widget Turnstile; tạo tài khoản UptimeRobot | Ngày 5 |
| 8 | Chuẩn bị 3 email cho 3 tài khoản nhân sự: admin, editor, reviewer (người nhập và người duyệt phải là 2 tài khoản khác nhau) | Ngày 5 |
| 9 | Quyết định đề nào được đăng (D3); đặt tài liệu đề có quyền dùng ở `D:\jlpt-samples\<mã-bộ>\` | Ngày 6 |

Mặc định cho `docs/decisions/tuan-1.md`:

- **D1:** chưa có ý kiến luật sư → server chỉ chứa dữ liệu giả và đề tự soạn; cả domain nằm sau Cloudflare Access.
- **D2:** tuần 1 chưa đặt mục tiêu số người thi cùng lúc; đo ở cổng ra mắt.
- **D3:** chỉ đăng đề tự soạn và đề đã có văn bản cho phép.
- **D4:** không có khách làm thử trong tuần 1.
- **D5:** không OCR trong tuần 1.
- **D6:** tên miền mua ở việc 5.
- **D7:** theo bảng 8.3 của `DE_XUAT_KY_THUAT.md`.
- **D8:** sau 7 ngày có bản chạy được; ngày mở cho người dùng thật quyết định sau khi qua mục 6.

### Ngày 1 — Nền tảng repo và số liệu JLPT chính thức

**Agent A** — sửa: toàn repo, trừ `docs/` sau commit đầu tiên
- [ ] [PHẢI] `git init`; commit đầu tiên gồm các file tài liệu và `docs/decisions/tuan-1.md` (mặc định ở Ngày 0, cộng các điểm chủ dự án đổi); push lên GitHub; tạo worktree cho Agent B (`git worktree add ../jlpt-b`) và báo chủ dự án mở workspace thứ hai.
- [ ] [PHẢI] T1.1.1 Khởi tạo monorepo — theo task gốc.
- [ ] [PHẢI] T1.1.2 TypeScript, ESLint, Prettier — theo task gốc.
- [ ] [PHẢI] T1.1.3 Khung các app và package — theo task gốc, trừ: không tạo `media-worker`, `ocr-worker`, `api-client`; cổng đọc từ env (`WEB_PORT`, `ADMIN_PORT`, `API_PORT`) để 2 agent chạy song song; `next.config` của web và admin có `rewrites` `/api/*` sang api (ghi chú 3).
- [ ] [PHẢI] T1.1.4 Docker Compose cho dev — theo task gốc, trừ: dùng image `postgres:17` chính thức (không build pg_bigm), container tạo sẵn thêm database `jlpt_b`; `.env.example` bỏ biến R2, WAL-G, OCR; thêm `.env.b.example` cho Agent B (mục 2.3).
- [ ] [PHẢI] T1.1.5 Công cụ test — theo task gốc, trừ: Playwright chỉ Chromium; không có pytest.
- [ ] [PHẢI] T1.1.6 CI trên GitHub Actions — theo task gốc, trừ: không có test Python; job E2E thêm ở Ngày 6.
- [ ] [NÊN] T1.2.1 Schema RichText, để Agent B dùng ngay đầu Ngày 2.

**Agent B** — sửa: `docs/`
- [ ] [PHẢI] T1.0.4 Cấu trúc đề chính thức N1–N5 — theo task gốc. Dùng trình duyệt của Antigravity để đọc jlpt.jp; mỗi con số kèm URL và ngày truy cập. Ghi rõ chỗ nguồn chỉ công bố số câu "dự kiến" (mục 3.2).
- [ ] [NÊN] `docs/ui/exam-room.md`: danh sách màn hình, trạng thái và thông báo của phòng thi (theo mục 8.3 của `DE_XUAT_KY_THUAT.md` và mã lỗi ở A9), kèm chuỗi tiếng Việt dự kiến cho `messages/vi.json`.

**Chủ dự án**
- Bật branch protection cho `main` (bắt buộc CI xanh) sau khi CI chạy lần đầu.
- Đọc `docs/jlpt-blueprints.md` trong PR của Agent B; ghi trong PR những cấp độ đã xác nhận (tối thiểu N5). Agent B ghi "đã xác nhận" ở đầu file cho các cấp độ đó trước khi merge.

**Cổng cuối ngày**
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass ở máy local; CI xanh.
- `docker compose -f infra/compose/compose.dev.yml up -d`: mọi service `healthy`; `CONFIG GET maxmemory-policy` trả `noeviction` ở `redis-core` và `allkeys-lru` ở `redis-cache`.
- Chạy `pnpm dev`: health của web, admin, api trả 200 ở cả bộ cổng của Agent A và Agent B.
- Mọi con số trong `docs/jlpt-blueprints.{md,json}` có nguồn.

### Ngày 2 — Lõi dữ liệu

**Agent A** — sửa: `packages/schema`, `apps/api`, `infra/`
- [ ] [PHẢI] T1.2.1 Schema RichText (nếu chưa xong ở Ngày 1) — theo task gốc. **Mở PR ngay khi xong.**
- [ ] [PHẢI] T1.2.2 Schema blueprint — theo task gốc, cộng trường `severity` (mục 3.2). Cấp độ chưa được chủ dự án xác nhận vẫn có fixture nhưng blueprint ở trạng thái `draft`; đề `original` chỉ dùng blueprint `active`.
- [ ] [PHẢI] T1.2.3 Schema snapshot, manifest, gói nhập — theo task gốc, trừ: không xuất JSON Schema.
- [ ] [PHẢI] T1.2.4 DTO và định dạng lỗi — theo task gốc. **Mở PR giữa ngày gồm T1.2.2–T1.2.4** (Agent B cần cho `exam-engine`).
- [ ] [PHẢI] T1.4.1 `ObjectStorage` và `LocalFsStorage` — theo task gốc, trừ: chưa làm `R2Storage`.
- [ ] [PHẢI] T1.2.10 Schema DB, migration, seed — theo task gốc, với các thay đổi ở mục 3. Bảng người dùng và session theo yêu cầu của Better Auth (tên bảng số nhiều, id UUIDv7) tạo ngay hôm nay để các khóa ngoại tham chiếu được. Seed: role, blueprint, license "Tự soạn", 1 đề N5 tự soạn `kind=practice` (6–10 câu: 1 câu furigana, 1 câu gạch chân, 1 câu ★, 1 nhóm nghe với audio sine tự tạo).
- [ ] [PHẢI] Lõi xuất bản (phần lõi của T1.4.11, chưa có endpoint): tạo snapshot, manifest, answer key; trong 1 transaction tạo `exam_versions` và `exam_answer_keys`; ghi `snapshot.json`, `manifest.json` vào storage. Seed dùng lõi này để xuất bản đề N5. Kiểm tra: snapshot qua validate `ExamSnapshot`; test quét toàn bộ JSON không thấy đáp án; xuất bản lần 2 tạo version 2, version 1 giữ nguyên.
- [ ] [PHẢI] T1.2.11 Test ràng buộc DB và tạo partition — theo task gốc.

**Agent B** — sửa: `apps/web`, `packages/ui`, `packages/exam-engine`
- [ ] [PHẢI] T1.6.1 Layout, design system, font — theo task gốc, cộng: cài next-intl và `messages/vi.json` ngay trong việc này.
- [ ] [PHẢI] T1.4.5 Component hiển thị RichText — theo task gốc (sau khi T1.2.1 được merge).
- [ ] [PHẢI] T1.2.5–T1.2.9 `exam-engine`: quy tắc thời gian, chấm điểm, kiểm tra và gộp phiếu, vị trí trên timeline phần nghe, kiểm tra đề theo blueprint (có `severity`) — theo task gốc (sau khi T1.2.2–T1.2.4 được merge). Coverage ≥ 90%.
- [ ] [NÊN] Khung trang chủ, `/n1`…`/n5`, trang hỗ trợ và pháp lý (dữ liệu giả, chưa gọi API; chỗ thiếu nội dung ghi "CẦN NỘI DUNG").

**Chủ dự án:** merge sớm 2 PR giữa ngày của Agent A.

**Cổng cuối ngày**
- Coverage của `packages/exam-engine` ≥ 90%.
- `db:migrate` chạy 2 lần liên tiếp trên DB trống không lỗi; `db:seed` tạo được đề N5 đã xuất bản; `db:partitions` chạy 2 lần không lỗi.
- Test của `RichTextView` pass, gồm trường hợp nội dung chứa `<script>` hiện dạng chữ.

### Ngày 3 — API nền, tài khoản, phân quyền

**Agent A** — sửa: `apps/api`, `packages/schema`, `packages/media-token`
- [ ] [PHẢI] T1.3.1 Nền của API — theo task gốc.
- [ ] [PHẢI] T1.3.2 Xác thực bằng Better Auth — theo task gốc (dự phòng ở mục 3.2). Seed thêm 3 tài khoản nhân sự dev và 1 học viên dev, đã xác minh email.
- [ ] [PHẢI] T1.3.3 Gửi email — theo task gốc.
- [ ] [PHẢI] T1.3.4 Phân quyền — theo task gốc, trừ: không dùng CASL (mục 3.1). Test chủ sở hữu attempt viết ở Ngày 4.
- [ ] [PHẢI] T1.3.6 phần rate limit — theo task gốc.
- [ ] [PHẢI] T1.3.8 Hồ sơ người dùng cơ bản — theo task gốc.
- [ ] [PHẢI] T1.5.1 Package `media-token` — theo task gốc.
- [ ] [PHẢI] Route media của `apps/api` (mục 3.1, dòng 5), logic như T1.5.8. Kiểm tra: token sai → 403; file ngoài manifest → 403; `Range: bytes=0-99` → 206 với đúng 100 byte; header cache đúng A11.
- [ ] [NÊN] T1.3.6 phần Turnstile (khóa thử nghiệm của Cloudflare ở dev).
- [ ] [NÊN] T1.3.7 Audit log.

**Agent B** — sửa: `apps/web`
- [ ] [PHẢI] T1.5.9 Lớp dữ liệu phía client của phòng thi — theo task gốc. Code gọi API qua interface `AttemptApi`; có bản giả chạy trong bộ nhớ, dùng đúng DTO của `@jlpt/schema`, cho unit test và cho giao diện tới khi API thật sẵn sàng.
- [ ] [PHẢI] T1.5.10 phần 1 (chạy với bản giả và snapshot của đề seed): route `/thi/[attemptId]` (client, lazy-load, `noindex`); màn hình hướng dẫn và chọn chế độ; hiển thị câu bằng `RichTextView`; chọn, đổi, bỏ đáp án; câu trước, câu sau; bảng phiếu; đánh dấu xem lại; thanh tiến độ; đồng hồ đếm ngược theo deadline của server.
- [ ] [NÊN] T1.3.9 Giao diện tài khoản (khi API auth của Agent A đã merge).

**Cổng cuối ngày**
- Test API: đăng ký → email trong Mailpit → xác minh → đăng nhập → đăng xuất; `Set-Cookie` đúng thuộc tính; endpoint không có `@Public()` trả 401; vượt rate limit trả 429 `RATE_LIMITED` kèm `Retry-After`.
- Unit test của bộ đồng bộ pass (theo mục "Kiểm tra" của T1.5.9).
- Ảnh chụp phòng thi với dữ liệu seed ở desktop và 390×844.

### Ngày 4 — Lượt thi, chấm điểm, phần nghe

**Agent A** — sửa: `apps/api`, `packages/schema`
- [ ] [PHẢI] T1.5.2 Tạo lượt thi — theo task gốc.
- [ ] [PHẢI] T1.5.3 Bắt đầu và chuyển phần thi — theo task gốc.
- [ ] [PHẢI] T1.5.4 Lưu phiếu trả lời — theo task gốc, đủ các test tích hợp với PostgreSQL thật. **Mở PR gồm T1.5.2–T1.5.4 ngay khi xong** (Agent B nối API thật).
- [ ] [PHẢI] T1.5.5 Nộp bài và chấm điểm — theo task gốc (ghi `outbox`, chưa có relay).
- [ ] [PHẢI] T1.5.6 Vào lại bài, token media, xem lại, lịch sử — theo task gốc.
- [ ] [PHẢI] T1.5.7 rút gọn (mục 3.1, dòng 6). Kiểm tra: client nộp cùng lúc với job đóng bài → chỉ 1 kết quả; job chạy lại không tạo dữ liệu trùng.
- [ ] [PHẢI] Phần API của T1.5.14: request đến sai thứ tự; gửi trùng `seq`; quá `deadline + grace` ở chế độ thi thật; nhận phiếu muộn trong `LATE_SYNC_WINDOW_SEC`; lease cũ sau `resume` → 409; test "không lộ đáp án" (quét mọi response của API học viên và snapshot trước khi nộp).

**Agent B** — sửa: `apps/web`
- [ ] [PHẢI] T1.5.10 phần 2: chuyển phần và khóa phần; xác nhận trước khi nộp sớm; tự nộp khi hết thời gian; hộp thoại khi bài đang mở ở nơi khác; báo mất mạng và trạng thái chưa đồng bộ.
- [ ] [PHẢI] T1.5.11 Phần nghe hiểu — theo task gốc, trừ: phần thử trên thiết bị thật để Ngày 7.
- [ ] [PHẢI] T1.5.12 phần trang kết quả (ghi "Điểm quy đổi tham khảo, không phải điểm JLPT chính thức") và xem lại từng câu.
- [ ] [PHẢI] Nối phòng thi với API thật khi PR T1.5.2–T1.5.4 được merge; giữ bản giả cho unit test.
- [ ] [PHẢI] T1.3.9 Giao diện tài khoản (nếu chưa xong ở Ngày 3).
- [ ] [NÊN] T1.5.12 phần còn lại: trang lịch sử, banner "Tiếp tục làm bài".

**Cổng cuối ngày**
- Mọi test tích hợp ở trên pass trong CI.
- Trên máy local: học viên dev làm trọn đề N5 ở chế độ thi thật, gồm phần nghe; kết quả khớp đáp án đã biết; có ảnh chụp hoặc recording của browser agent.

### Ngày 5 — Admin, trang public, Docker image

**Agent A** — sửa: `apps/api`, `packages/schema`, `infra/`, `.github/`
- [ ] [PHẢI] T1.3.5 phần khóa route admin: `/api/v1/admin/*` chỉ nhận `Host` bằng `ADMIN_HOST` và role nhân sự. Kiểm tra: gọi với `Host` của trang học viên → 404.
- [ ] [PHẢI] T1.4.2 rút gọn: lưu media từ gói nhập (kiểm tra magic bytes và MIME, giới hạn dung lượng, key `media/{sha256}.{ext}`, file trùng thì dùng lại, đọc độ dài audio bằng `music-metadata`); chưa có endpoint tải media riêng.
- [ ] [PHẢI] T1.4.10 Nhập đề từ gói JSON — theo task gốc, cộng: tạo đề nháp (mục 3.1, dòng 7); `source.licenseRef` phải trỏ tới license có sẵn, nếu không thì báo lỗi.
- [ ] [PHẢI] API nhóm câu tối thiểu: danh sách (lọc theo gói nhập, cấp độ, trạng thái); chi tiết, kèm đáp án đúng (chỉ trong admin); sửa nội dung và đáp án đúng (validate schema); quy tắc chỉ đọc ở mục 3.1, dòng 9.
- [ ] [PHẢI] T1.4.7 Quy trình kiểm duyệt — theo task gốc.
- [ ] [PHẢI] T1.4.11 Xuất bản đề: endpoint xuất bản và gỡ đề dùng lõi của Ngày 2 — theo task gốc, trừ: không purge Cloudflare; đề `original` chỉ bị chặn bởi vi phạm mức `error`.
- [ ] [PHẢI] Lệnh CLI: `user:role <email> <role>`, `license:create`, `attempts:count-open --mode real`.
- [ ] [PHẢI] T1.1.7 Dockerfile cho web, admin, api — theo task gốc (ghi chú 1, 2) — và phần `release.yml` của T1.8.11: tag `v*` → build và push image `linux/amd64` lên GHCR.
- [ ] [NÊN] T1.3.5 phần TOTP và T1.3.10 trang thiết lập 2FA trên admin.

**Agent B** — sửa: `apps/admin`, `apps/web`
- [ ] [PHẢI] Admin: đăng nhập; trang nhập đề (tải `.zip`, chọn `kind`, trạng thái job, danh sách lỗi dễ đọc); danh sách nhóm câu có bộ lọc; chi tiết nhóm câu (xem trước bằng `RichTextView`, ô sửa JSON có validate, chọn đáp án đúng, gửi duyệt); hàng chờ duyệt (duyệt, từ chối kèm bình luận); danh sách đề (vi phạm blueprint, nút xuất bản và gỡ đề).
- [ ] [PHẢI] Web: T1.6.2 Trang chủ; T1.6.3 rút gọn (`/n1`…`/n5` lấy danh sách đề qua `API_INTERNAL_URL`, ghi chú 1); T1.6.4 Trang giới thiệu đề và nút bắt đầu — theo task gốc, trừ phần làm thử; T1.6.8 phía web (`POST /api/revalidate`).
- [ ] [NÊN] T1.6.7 rút gọn: metadata, Open Graph, `sitemap.xml`, `robots.txt` (chặn `/thi/`, `/tai-khoan/`, `/api/`), `canonical`, `noindex` cho trang ứng dụng.

**Chủ dự án:** kiểm tra tên miền đã trỏ về Cloudflare, server đã tạo, Resend đã xác minh domain (Ngày 0, việc 5–7).

**Cổng cuối ngày**
- Trên máy local: editor tải gói nhập mẫu → reviewer duyệt (editor tự duyệt nhận 403) → admin xuất bản → đề hiện ở `/n5` mà không build lại → học viên làm được đề đó.
- Nhập lại cùng gói không tạo bản ghi trùng; gói sai schema bị từ chối kèm danh sách lỗi dễ hiểu.
- CI build được 3 image, mỗi image dưới 300 MB; image `api` chạy với env dev thì health trả 200.
- Output của `next build`: code của `/thi/[attemptId]` không nằm trong bundle của trang chủ.

### Ngày 6 — Lên server và test kịch bản

Trước khi Agent A bắt đầu: chuyển Terminal execution policy của workspace A sang mức hỏi trước mọi lệnh (Phụ lục 1). Agent không đọc, không in secrets production; chủ dự án tự điền `.env` trên server.

**Agent A** (cùng chủ dự án) — sửa: `infra/`, `docs/runbooks/`
- [ ] [PHẢI] `docs/runbooks/tuan-1-deploy.md`: từng bước cho chủ dự án (tạo Tunnel, bản ghi DNS, Cloudflare Access, token GHCR chỉ đọc, `.env` production, GitHub Actions variables) và cho agent.
- [ ] [PHẢI] T1.8.2 Script dựng server — theo task gốc, trừ: chạy thẳng trên server mới (server chưa có dữ liệu thật).
- [ ] [PHẢI] T1.8.9 Docker Compose production — theo task gốc, trừ: chỉ profile `small`; image PostgreSQL chính thức; thêm volume cho storage của api.
- [ ] [PHẢI] T1.8.4 rút gọn (mục 3.1, dòng 20). Kiểm tra: quét cổng từ một IP khác không thấy cổng nào mở; truy cập domain được.
- [ ] [PHẢI] T1.8.11 phần `deploy.sh` theo B2 của kế hoạch gốc, cộng: gọi revalidate sau khi mọi service healthy. Diễn tập: deploy `v0.1.0` → `v0.1.1` → rollback về `v0.1.0`.
- [ ] [PHẢI] Backup: systemd timer chạy `pg_dump` hằng ngày lúc 03:00 giờ Việt Nam, giữ 7 bản; khôi phục thử 1 bản dump vào PostgreSQL trên máy local, đếm số dòng các bảng chính; ghi `docs/runbooks/restore-test-<ngày>.md`.
- [ ] [PHẢI] Chủ dự án làm theo runbook: Cloudflare Access cho `admin.<domain>` (chỉ email nhân sự) và, khi D1 chưa xong, cho cả `<domain>` (chỉ nhóm thử); một Access application riêng với policy Bypass cho đường dẫn `/api/v1/health`; Always Use HTTPS; tắt Rocket Loader; UptimeRobot kiểm tra `/api/v1/health` mỗi 5 phút; key Resend và Turnstile thật trong `.env`.
- [ ] [NÊN] Sentry cho web, admin, api.

**Agent B** — sửa: `apps/web`, `apps/admin`, `.github/workflows/ci.yml` (Agent A không sửa file này trong ngày), `packages/schema/fixtures/imports/`
- [ ] [PHẢI] T1.3.12 Bật E2E trong CI — theo task gốc.
- [ ] [PHẢI] Phần Playwright của T1.5.14: làm trọn đề ở chế độ thi thật; tải lại trang giữa bài và giữa phần nghe (audio tiếp đúng vị trí, sai số ≤ 2 giây); mất mạng 30 giây (`context.setOffline`) rồi có mạng lại, không mất đáp án; mở 2 tab, tab cũ báo bài đang mở ở nơi khác; hết thời gian một phần (`page.clock`); luồng admin nhập → duyệt → xuất bản.
- [ ] [PHẢI] Đề mẫu tự soạn `packages/schema/fixtures/imports/demo-n5/` (gồm `import.json` và `media/`, kèm lệnh đóng gói thành `.zip`): N5, `kind=practice`, khoảng 20 câu, đủ 3 phần, có furigana, gạch chân, ★, bài đọc có bảng, 1–2 nhóm nghe (audio tạo bằng giọng đọc tiếng Nhật có sẵn trên máy nếu có, nếu không thì dùng âm sine). Nội dung tự soạn nên được commit.
- [ ] [NÊN] Chỉnh giao diện phòng thi và trang kết quả ở 390×844.
- [ ] [NÊN] Chỉ khi D3 cho phép: chuyển 1 đề thật trong `D:\jlpt-samples\` thành gói nhập bằng khả năng đọc PDF và ảnh của model, làm **ngoài repo**; câu nào không chắc thì đặt `confidence` thấp; editor đối chiếu từng câu với bản gốc trên admin trước khi gửi duyệt.

**Cổng cuối ngày**
- `https://<domain>` chạy (sau Access khi D1 chưa xong); `https://admin.<domain>` chỉ email nhân sự vào được; `/api/v1/admin/*` trên domain chính trả 404.
- Email xác minh gửi tới Gmail không vào thư rác; header có `dkim=pass`.
- Deploy và rollback đã diễn tập; bản backup đầu tiên đã chạy; khôi phục thử thành công.
- E2E và test kịch bản xanh trong CI.

### Ngày 7 — Hoàn thiện và nghiệm thu

**Agent A**
- [ ] [PHẢI] Sửa lỗi P0/P1 từ Ngày 6 và từ chủ dự án.
- [ ] [PHẢI] Rà soát bảo mật rút gọn, ghi `docs/security-checklist.md` (PASS/FAIL kèm bằng chứng): `pnpm audit` không còn mức high/critical; đọc attempt của người khác → 404; sửa token media → 403; route admin từ host học viên → 404; file đổi đuôi bị từ chối; header bảo mật đúng; log không chứa mật khẩu, token, email; không có answer key trong response học viên trước khi nộp.
- [ ] [PHẢI] Tag và deploy bản cuối tuần lên server.
- [ ] [NÊN] k6 nhỏ trên máy local (`tests/load/`): 200 người dùng ảo lưu phiếu mỗi 10 giây trong 10 phút, rồi nộp đồng loạt; ghi p95 lưu phiếu, p95 nộp bài, tỷ lệ lỗi vào `docs/load-test-local-<ngày>.md`. Chỉ để phát hiện lỗi lớn, không thay T1.9.2.

**Agent B**
- [ ] [PHẢI] Sửa lỗi giao diện P0/P1.
- [ ] [PHẢI] Đo Lighthouse (mobile) cho `/`, `/n5`, `/de-thi/<slug mẫu>`; ghi điểm vào `docs/testing/lighthouse-<ngày>.md`.
- [ ] [PHẢI] Dùng browser agent làm trọn 1 đề trên site thật, lưu recording; tạo `docs/testing/exam-room-devices.md` (bảng thiết bị để chủ dự án điền).
- [ ] [NÊN] Các việc [NÊN] còn dở.

**Chủ dự án**
- Làm trọn 1 đề, gồm phần nghe, trên iPhone (Safari) và Android (Chrome), thử cả tải lại trang và tắt mạng giữa bài; ghi kết quả vào `docs/testing/exam-room-devices.md`.
- Chạy kịch bản ở mục 1.1, đánh dấu đạt hoặc không đạt; chọn việc cho tuần 2.

**Cổng ra tuần:** đạt đủ 5 điểm ở mục 1.1.

---

## 6. Cổng ra mắt: trước khi mở cho người dùng thật

Chỉ gỡ Cloudflare Access khỏi domain chính khi mọi mục dưới đây đã xong:

- [ ] D1 có ý kiến pháp lý; luật sư đã duyệt chính sách quyền riêng tư và điều khoản; trang pháp lý không còn "CẦN NỘI DUNG" (T1.9.5).
- [ ] Mọi đề công khai có license cho phép (D3).
- [ ] 2FA cho nhân sự, Turnstile, audit log (T1.3.5, T1.3.6, T1.3.7, T1.3.10).
- [ ] CSP: `script-src` chuyển từ Report-Only sang bắt buộc sau khi xem báo cáo vi phạm (T1.3.11).
- [ ] WAL-G lên R2 và diễn tập khôi phục đạt RPO ≤ 5 phút, RTO ≤ 1 giờ (T1.8.6, T1.8.10).
- [ ] k6 trên server thật, ghi sức chịu vào Phụ lục B4 của kế hoạch gốc (T1.9.2).
- [ ] Thử trên đủ thiết bị theo T1.9.4.
- [ ] Sentry, cảnh báo và runbook đầy đủ (T1.8.12, T1.8.13).
- [ ] Beta kín 20–50 người, không còn issue P0/P1 (T1.9.6).

---

## 7. Sau tuần 1

- **Tuần 2:** các mục ở mục 6, rồi các phần đã dời ở mục 3.1. Thứ tự gợi ý: ghép đề và quản lý blueprint, trình soạn RichText, trang người dùng và audit log, outbox relay và `user_answers`, tìm kiếm, R2 và media Worker, trạng thái cá nhân trên thư viện đề, JSON-LD, Lighthouse CI.
- **OCR (Phase 1.7):** bắt đầu khi số đề cần nhập vượt sức nhập tay, mở đầu bằng spike T1.0.5.
- **Giai đoạn 2–4:** giữ nguyên Phần D–F của `KE_HOACH_TRIEN_KHAI.md`.

---

## Phụ lục 1. Thiết lập Antigravity và prompt mẫu

### Thiết lập

1. Mở thư mục repo (ví dụ `D:\code\jlpt`) làm workspace của Agent A. Sau khi Agent A tạo worktree ở Ngày 1, mở `D:\code\jlpt-b` làm workspace của Agent B trong Agent Manager.
2. Thêm Rule cho từng workspace (phần Rules trong Customizations của Antigravity) với nội dung ở dưới; đổi `<A|B>` cho đúng agent.
3. Model: dùng model cao cấp trong danh sách của Antigravity, không dùng bản nhỏ hoặc bản tối ưu tốc độ; dùng chế độ Planning, không dùng Fast.
4. Terminal execution policy: Ngày 1–5 và Ngày 7 để agent tự quyết (Auto), không dùng mức tự chạy mọi lệnh (Turbo); thêm vào deny list: `ssh`, `scp`, `git push --force`, `git reset --hard`. Ngày 6, workspace A: chuyển sang mức hỏi trước mọi lệnh (Off) và bỏ `ssh`, `scp` khỏi deny list.
5. Cài extension trình duyệt của Antigravity để agent tự mở trang, chụp màn hình và quay lại thao tác khi kiểm thử giao diện.
6. Hạn mức sử dụng model có thể làm agent dừng giữa ngày. Dùng gói có hạn mức cao; nếu hạn mức tính riêng theo model thì cho 2 agent dùng 2 model khác nhau. Agent dừng giữa chừng thì dùng prompt "Làm tiếp" ở dưới.

### Rule cho workspace

```
- Dự án JLPT Online. Workspace này là Agent <A|B> trong KE_HOACH_1_TUAN.md.
- Trước khi làm việc gì, đọc KE_HOACH_1_TUAN.md mục 1–4 và phần của ngày hiện tại trong mục 5.
- Chỉ sửa các thư mục ghi cho Agent <A|B> trong ngày (mục 2.3).
- Tuân thủ mục 2.7 của KE_HOACH_1_TUAN.md, A5 của KE_HOACH_TRIEN_KHAI.md và mục 15 của DE_XUAT_KY_THUAT.md.
- Kết quả test luôn là output thật. Không tắt hoặc skip test để cho pass.
- Gặp trường hợp ở A4 của KE_HOACH_TRIEN_KHAI.md mà mục 3.2 chưa có dự phòng: dừng và hỏi.
```

### Prompt đầu ngày

```
Hôm nay là Ngày <N> trong KE_HOACH_1_TUAN.md; workspace này là Agent <A|B>.
1. git fetch; tạo nhánh d<N>-<a|b>-<mo-ta> từ origin/main.
2. Đọc mục 1–4, phần Ngày <N> trong mục 5, các task gốc được nhắc tới trong KE_HOACH_TRIEN_KHAI.md và các mục "Đọc thêm" của những task đó.
3. Tạo Implementation Plan: các việc của Agent <A|B> theo đúng thứ tự trong file, test sẽ viết, lệnh kiểm tra. Dừng chờ duyệt.
4. Sau khi được duyệt: làm lần lượt từng việc; mỗi việc xong thì chạy kiểm tra, commit, đánh dấu [x] trong file.
5. Cuối ngày: chạy các lệnh ở "Cổng cuối ngày", mở PR theo mẫu A7 với output thật, ghi Phụ lục 2, tạo Walkthrough.
```

### Prompt làm tiếp (sau khi agent dừng giữa chừng)

```
Tiếp tục Ngày <N>, Agent <A|B> trong KE_HOACH_1_TUAN.md.
Chạy git status và git log -10, đọc các checkbox của ngày và Phụ lục 2 để biết việc đã xong.
Báo lại việc đang dở, rồi làm tiếp từ việc chưa xong đầu tiên.
```

---

## Phụ lục 2. Nhật ký tiến độ

Mỗi agent ghi một dòng vào cuối mỗi ngày.

| Ngày | Agent | Cổng cuối ngày (đạt / chưa đạt) | PR | Đã cắt hoặc dời | Cần chủ dự án |
|---|---|---|---|---|---|
| 1 | A | | | | |
| 1 | B | | | | |
| 2 | A | | | | |
| 2 | B | | | | |
| 3 | A | | | | |
| 3 | B | | | | |
| 4 | A | | | | |
| 4 | B | | | | |
| 5 | A | | | | |
| 5 | B | | | | |
| 6 | A | | | | |
| 6 | B | | | | |
| 7 | A | | | | |
| 7 | B | | | | |
