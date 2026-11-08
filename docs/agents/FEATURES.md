# Tính năng theo trạng thái

## Exam images inside choices (2026-11-07)

The question flattener keeps images already embedded in passages, stems or answer choices out of the separate group-illustration list, so each image renders once in its intended position. Standalone illustrations, audio references, option order and published content remain intact. Regression coverage includes nested image segments, relative API paths and later questions in a shared group.

Cập nhật lần cuối: 01/11/2026. **Agent xong một tính năng thì sửa file này trong cùng PR.**

Ký hiệu: ✅ đang chạy · 🙈 đã code nhưng đang ẩn · ⏳ code xong, chờ dịch vụ ngoài · 🚧 đang làm · 📋 dự kiến.

## Hiệu đính nội dung đề

- N3 文法・読解, rà soát 07/11/2026: bộ hiệu đính có kế hoạch chạy thử cho 30 mục / 17 đề; phục hồi ô trống/phương án, sửa chữ và lời giải, ba khóa đáp án có căn cứ ghép câu. Công cụ `tools/content/n3-language-reading-review/`; tạo phiên bản mới, bảo toàn lịch sử, chỉ áp dụng sau CI xanh và sao lưu.

- N1 7/2011, đợt bổ sung 06/11: hiệu đính Q104 `検収` → `研修` trong lựa chọn, transcript và lời giải; đồng bộ nghĩa “đào tạo tài xế”, giữ khóa đáp án. Công cụ: `tools/content/n1-2011-07-followup/`.

- N1 7/2011: bộ sửa có kiểm tra dữ liệu gốc cho Q34, Q47, Q73, Q76, Q80 và Q89; đồng bộ trích dẫn/lời giải, giữ khóa đáp án và lịch sử phiên bản. Công cụ: `tools/content/n1-2011-07/`.

## ✅ Đang chạy

### Học viên (`apps/web`)

| Tính năng | Trang | Code chính |
|---|---|---|
| Thư viện đề, chi tiết đề | `/de-thi`, `/de-thi/[slug]`, `/[level]/de-thi` | `features/library`, module API `exam` |
| Phòng thi có giờ (thi thật và luyện tập), đồng bộ khi mất mạng | `/phong-thi` | `features/exam`, module `attempt` |
| Kết quả, đỗ/trượt theo JLPT, điểm sàn từng phần, phân tích thời gian | `/ket-qua/[id]` | `features/results`, `packages/exam-engine` |
| Luyện tập trộn câu | `/luyen-tap` | `features/practice`, `features/mix` |
| Nghe có audio và hình | trong phòng thi | `features/exam`, module `media` |
| Furigana bật/tắt, Hán Việt theo từng từ | toàn site | `packages/content-tools/src/nlp` |
| Cảnh báo nhịp làm bài | phòng thi | `packages/exam-engine/src/pacing.ts` |
| Bôi đen chữ trong đề để tra từ (H06), popup HeroUI không modal, đổi tab không cuộn trang, bấm ngoài/Escape đóng; tab Kanji liệt kê chữ trong toàn bộ phần bôi đen, bỏ trùng theo thứ tự | phòng thi, luyện tập | `features/corpus/hooks/use-select-lookup.ts`, `components/selection-kanji-panel.tsx` |
| Tra từ, chi tiết từ vựng | `/tu-vung`, `/tu-vung/[term]` | `features/corpus`, module `vocab` |
| Bộ dữ liệu kanji chuẩn: 3.186 chữ, cách dùng và ví dụ (#127) | admin `/kanji` | `data/kanji/kanji_chuan_v1.json`, bảng `kanji_dataset`, `apps/api/scripts/lexicon/import-kanji-dataset.mjs` |
| Ngữ pháp, thống kê từ vựng trong đề | `/ngu-phap`, `/thong-ke-tu-vung` | `features/corpus` |
| Sổ tay, flashcard SRS; lọc mục theo cấp độ đề nguồn N5–N1 kết hợp loại, trạng thái và tìm kiếm | `/so-tay` | `features/learning`, `packages/srs` |
| Kế hoạch học | `/ke-hoach` | `features/planner` |
| Thống kê cá nhân | `/thong-ke` | `features/analytics` |
| Lịch thi JLPT tại Việt Nam, nhắc hạn đăng ký | `/lich-thi` | `apps/api/src/modules/exam/jlpt-schedule.controller.ts` |
| Tài khoản, lịch sử | `/tai-khoan`, `/lich-su` | `features/account` |
| Đăng ký, đăng nhập, xác minh email, quên mật khẩu | `/dang-ky`, `/dang-nhap`… | module `auth` |
| Lớp học, sự kiện thi, thảo luận | `/lop-hoc`, `/su-kien`, `/thao-luan` | `features/classroom`, `features/community` |
| Chia sẻ đề trộn, chia sẻ kết quả | `/chia-se/...` | module `exam` |
| Trang thông tin, FAQ, SEO theo cấp | `/gioi-thieu`, `/faq`, `/[level]`… | module `cms` |

### Quản trị (`apps/admin`)

Ngân hàng câu hỏi `/questions` · blueprint `/blueprints` · media `/media` · nhập đề `/imports` · duyệt `/reviews`, `/reviews/explanations` · đề `/exams` (xuất bản, gỡ, xóa hẳn đề kèm lượt làm bài), `/exams/mixed` · lịch thi `/schedules` · bảng quy đổi `/scoring-tables` · người dùng `/users` · CMS `/cms` · thương mại `/commercial/*` · báo cáo `/reports/*` · thử nghiệm `/experiments` · kiểm duyệt `/moderation/*` · nhật ký `/audit-logs` · cài đặt `/settings/*` · từ điển `/lexicon` · duyệt Hán Việt `/lexicon/hanviet` · Hán Việt `/hanviet` · kanji `/kanji` (sửa âm Hán Việt từng chữ, khôi phục bản gốc) · từ vựng `/vocab`.

Menu và quyền của từng mục khai báo ở `apps/admin/lib/navigation.ts`.

Bảo trì dữ liệu đề: các script `fix-confirmed-answer-keys.ts`, `fix-confirmed-content-issues.ts`, `fix-disputed-n1-answers.ts`, `sync-n1-answer-explanations.ts` và `sync-n2-answer-explanations.ts` trong `apps/api/src/scripts/` tạo phiên bản nội dung mới, qua dấu vết editor/reviewer riêng biệt rồi xuất bản lại đề; không ghi đè dữ liệu của phiên bản đã xuất bản. Script sửa nội dung hỗ trợ `--only=<correction-id>` để chỉ áp dụng đúng mục tiêu đã được phê duyệt, không chạm các sửa đổi khác đang chờ.

- Exam rich text displays numbered blank labels in passages and standalone questions without duplicated surrounding parentheses.

## 🙈 Đang ẩn (bật lại bằng cờ lúc build web)

| Tính năng | Biến | Ghi chú |
|---|---|---|
| Trang chính sách và bảo mật | `NEXT_PUBLIC_FEATURE_PRIVACY_POLICY=1` | Cần chủ dự án duyệt nội dung pháp lý |
| Đọc thành tiếng (TTS) | `NEXT_PUBLIC_FEATURE_TTS=1` | Cần nhà cung cấp TTS |
| AI giải thích đáp án | `NEXT_PUBLIC_FEATURE_AI_EXPLANATION=1` | Cần nhà cung cấp AI và ngân sách |

Cờ khai báo ở `apps/web/lib/features.ts`; chi tiết ở `docs/decisions/feature-flags-phase-1.md`. API và admin không bị ẩn.

## ⏳ Code xong, chờ dịch vụ ngoài

| Task | Chờ gì |
|---|---|
| A02 | Chính sách quyền riêng tư (pháp lý) |
| A05 | Nhà cung cấp AI, ngân sách AI |
| C02 | Cloudflare R2 |
| C06 | Cloudflare, R2, hosting |
| F03 | Google OAuth, dịch vụ email |
| L04, V04 | Cổng thanh toán, chính sách bán gói |
| L05 | Nhà cung cấp TTS |
| V05 | AI và TTS |
| N06, R06 | Hosting production |
| R03, V06 | Thử trên thiết bị thật, hosting |

Chủ dự án cung cấp tài khoản hoặc dịch vụ thì mới nghiệm thu được các task này. Agent không tự đăng ký dịch vụ trả phí.

## 🚧 Đang làm

Ngày 25/10/2026: thao tác của từng câu trong cuốn đề được gom xuống hàng dưới theo thứ tự Tẩy đáp án, Ghi nháp, Đánh dấu xem lại; trạng thái cờ và các nhãn trợ năng giữ nguyên.

| Việc | Trạng thái |
|---|---|
| Cuốn đề HTML và HeroUI React | Theo phương án được duyệt ngày 24/10: giữ khung website, dùng HeroUI gốc trong phòng thi: Tabs, Popover, RadioGroup, Card, ProgressBar, Modal, TextArea. Gộp phiếu và tiến độ; lọc câu trống/có cờ; đáp án dài xếp dọc; mobile mở phiếu cố định. CSS riêng chỉ bố cục và nội dung Nhật. Xem `docs/decisions/paper-exam-room.md`. |
| Sổ tay `docs/agent-guides/`, `pnpm docs:map`, bài kiểm tra đầu vào | PR #129 chờ merge |
| Trích xuất đề N2 từ PDF thành gói nhập (ngoài repo, chạy trên máy ảo) | 3/31 đề xong |

## 📋 Dự kiến

- Bộ chuyển đổi để coordinator giao việc cho Codex.

- Bảo trì nội dung N3 03/11/2026: script `repair-n3-content.ts` sửa 91 trường dữ liệu trong 73 câu của 21 đề, cắt lại 18 ảnh và khôi phục transcript theo nguồn; dry-run mặc định, đối chiếu giá trị trước/sau, bắt buộc backup, tạo phiên bản mới và audit log.

- N3: `deduplicate-n3-images.ts` chuyển 18 hình đã duyệt sang group_media để mỗi câu chỉ hiển thị một ảnh, có kiểm tra passage chỉ chứa ảnh, backup, versioning, audit và khả năng chạy lại.

- Bảo trì OCR N5 đợt 1 (05/11/2026): `repair-n5-ocr-dot1.ts` áp dụng manifest 49 trường/22 câu thuộc 8 đề, tạo phiên bản mới, khôi phục bài đọc và lời giải 7/2025, ảnh đủ bốn ô 7/2024; kiểm tra ID/hash/giá trị trước-sau, bắt buộc backup và giữ nguyên lịch sử. Các mục thiếu nguồn hoặc lỗi bản in được ghi riêng trong báo cáo quyết định.

- Bảo trì N1 7/2010 (05/11/2026): manifest 5 sửa tại Q57, Q85, Q107–Q108; dùng quy trình editor → reviewer → publisher, giữ nguyên khóa đáp án. Bộ công cụ N1 hỗ trợ thư mục phiên chạy riêng qua N1_FIX_WORK_DIR, tránh dùng chung plan/journal giữa các đợt.

- N1 7/2010 v5: prepared exact Q2 underline repair and Q55/Q85 option corrections with matching Q55 explanation quote; answer keys unchanged.

### N1 July 2012 reviewed content repair (2026-11-05)

- Prepared `tools/content/n1-2012-07/`: restore Q33 distractor and reasoning, correct Q51/Q72/Q73/Q75/Q84/Q85/Q90/Q104 and synchronize stale Q80/Q83/Q105 quotations via versioned admin APIs.
- Plan validates seven group revisions and eight explanation revisions; preserve all 106 answer keys and old published snapshots. Apply only after successful CI and a verified backup. Larger-model ASR plus context supports the listening corrections; direct human listening remains unverified.

- N1 July 2012 explanation repair plans are normalized with the API schema before creation and verified exactly; historical explanation versions remain available.

### Hiệu đính N1 7/2018 (06/11/2026)

Công cụ `tools/content/n1-2018-07/` sửa cách ghi cách đọc ở bài chung Q41–Q45 và ba cụm transcript Q103 qua phiên bản mới, duyệt và xuất bản bằng API. Giữ 105 khóa chấm, thứ tự, lựa chọn, media, timeline và các snapshot cũ. Áp dụng sau CI xanh, sao lưu và xác nhận của chủ dự án; không đổi thuật ngữ Q76 khi chưa có bằng chứng audio.

### Hiệu đính N1 7/2019 (06/11/2026)

Công cụ `tools/content/n1-2019-07/` sửa `想像カ` (Q46), `狐独` (Q64–Q67), `ベき` (Q61, Q63), transcript Q83/Q104 và thêm gạch chân cụm được hỏi ở Q50, Q54, Q57 qua phiên bản mới, duyệt và xuất bản bằng API. Giữ 104 khóa chấm (kể cả Q20 và Q90 khác bảng nguồn có chủ đích), thứ tự, media và snapshot cũ. Áp dụng sau CI xanh và sao lưu đã kiểm tra.

Bổ sung N1 7/2019 (06/11/2026): `tools/content/n1-2019-07-followup/` đổi `森田カーヅ` thành `森田カーズ` trong transcript Q83 theo lựa chọn của chủ dự án; không đổi khóa chấm.

## N1 kanji/vocabulary content review (2026-11-06)

`tools/content/n1-kanji-vocab-review/` prepares 75 reviewed question corrections across 18 N1 exams, including rich-text blanks, source transcription/underline errors and synchronized explanations. One adjudicated answer correction: July 2019 Q20 (簡素), 1 -> 4. Three other inconsistent reference-sheet labels retain the answer matching the actual question content. Applying requires owner authorization, exact-commit successful CI, validated backup and the existing editor/reviewer/publisher versioning workflow. No application feature flags or database schema changes.

### Rà soát Chữ Hán và Từ vựng N2 (2026-11-06)

- Công cụ sửa nội dung có ghim phiên bản tại `tools/content/n2-kanji-vocab-review/`: rà 31 đề/964 câu, chuẩn bị sửa 277 câu ở 31 đề; 188 câu chuẩn hóa chỗ trống, 28 lời giải đề 12/2018 bị gắn nhầm nội dung. Giữ nguyên toàn bộ số đáp án.
- Áp dụng qua API tạo phiên bản mới sau CI và sao lưu; có kiểm chứng dữ liệu lịch sử, snapshot và đáp án trước/sau. Trạng thái áp dụng thực tế được ghi trong báo cáo vận hành riêng.

### Rà soát 文字・語彙 N3 (2026-11-07)

- `tools/content/n3-kanji-vocab-review/`: rà 30 đề/1.049 câu, chuẩn bị 207 phiên bản câu hỏi ở 26 đề; gồm 174 câu chuẩn hóa ô trống, 12 câu chỉnh ranh giới gạch chân và 23 lời giải hiệu đính. Giữ nguyên toàn bộ số đáp án.
- Áp dụng qua API editor → reviewer → publisher sau CI và sao lưu đã xác minh. Kiểm chứng toàn bộ snapshot, khóa chấm và lịch sử; trạng thái áp dụng thực tế ghi trong báo cáo vận hành riêng.

## N4 content audit (2026-11-07)

Prepared versioned 文字・語彙 corrections for 20 questions in 9 of 15 imported N4 exams (448 questions reviewed), including 12 explanation revisions. No answer-index changes. The owner deferred all changes to December 2022 until an original booklet is available; its 28 existing questions remain unchanged. See [audit and guarded operation](../../tools/content/n4-kanji-vocab-review/README.md). Actual application status is recorded separately after CI and backup.

## N4 grammar/reading content audit (2026-11-07)

Prepared 22 question and 5 passage revisions in 12 N4 exams, including 16 synchronized explanations and no answer-index changes. Reviewed 435 questions; all 29 December 2022 questions stay unchanged per owner instruction. July 2023's missing fourth option and incomplete source reading group remain deferred. All 61 reviewed star-composition orders are recorded. See [audit and guarded operation](../../tools/content/n4-grammar-reading-review/README.md). Application status is recorded separately after CI and backup.

## N5 grammar/reading content review (2026-11-07)

Versioned repair tooling covers 281 imported questions across 11 N5 exams, preparing 16 question corrections, one passage correction and 13 rationales. Exactly one new-version answer index changes: December 2012 grammar Q6 (overall Q41), には to では. Forty-eight of 49 star questions form complete four-piece sentences; December 2024 Q11 remains source-blocked. Missing six December 2012 and five July 2023 questions are recorded without fabrication. Apply only after exact-commit CI and validated backup, through reviewed/published new versions; preserve old exam keys and history. See tools/content/n5-grammar-reading-review/README.md for source limitations and live-operation status.
## N5 kanji/vocabulary content audit (2026-11-07)

Reviewed 297 文字・語彙 questions across all 11 imported N5 exams. Prepared 14 question revisions in 7 exams, including 8 explanations, 6 underline corrections and exact source-glyph image options for two questions. No key changes. Three ambiguous questions in source-incomplete December 2022/2024 exams remain deferred; their reconstructed stems/options/keys are preserved. See [audit and guarded operation](../../tools/content/n5-kanji-vocab-review/README.md). Live application status is recorded separately after CI and backup.

- Sổ tay: tải thêm ví dụ qua client có xác thực; tra cứu cả khi lượt thi thật đang mở (chỉ thị chủ dự án 08/11/2026); báo rõ khi hết phiên, thiếu quyền, giới hạn tần suất hoặc lỗi tải; cho thử lại, không báo nhầm là không có kết quả.

- Sổ tay: mỗi thẻ đặt tên đề nguồn và số câu ở hàng đầu bằng Chip HeroUI cỡ lớn, có nền và biểu tượng đề thi; từ/mẫu ngữ pháp nổi bật, cách đọc ở dòng riêng bên dưới; hỗ trợ metadata cũ trong tag, không thêm nguồn giả cho mục nhập tay.
