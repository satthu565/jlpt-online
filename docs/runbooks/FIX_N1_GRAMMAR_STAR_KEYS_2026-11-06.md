# Sửa dấu ★, khóa đáp án và lời giải phần Ngữ pháp N1 — 06/11/2026

Script: `apps/api/src/scripts/fix-n1-grammar-star-keys.ts` (dùng lại cơ chế của `fix-confirmed-answer-keys.ts`, thêm khả năng đổi vị trí ★ trong đề).

## Cách rà soát

Xuất toàn bộ 609 câu Ngữ pháp của 31 đề N1 (`grammar_form` 310, `sentence_composition` 155, `text_grammar` 144) từ DB, tự giải từng câu rồi đối chiếu với khóa. Các câu nghi vấn được đối chiếu thêm với PDF đề gốc và bảng đáp án trong `/srv/jlpt-extract/de-goc/N1`.

Kiểm tra cấu trúc không phát hiện lỗi: đủ 4 đáp án, không trùng, khóa 1–4, lời giải ghi cùng số đáp án với khóa, mỗi câu 「★」 có đúng 1 dấu ★ và 3 ô trống. Các đoạn văn điền chỗ trống khớp với PDF gốc nên không sửa.

## Phạm vi (13 câu, 7 đề)

| Câu | Vấn đề | Xử lý |
|---|---|---|
| `n1-2012-07` Q36 | Khóa 2, nhưng ★ in ở ô 3 và trật tự đúng 4-2-3-1 cho ô ★ = 3 | khóa 2 → **3** |
| `n1-2013-12` Q36 | Khóa 1, nhưng trật tự đúng 3-1-4-2 và ★ ở ô 3 cho ô ★ = 4 (đã xem PDF đề gốc) | khóa 1 → **4** |
| `n1-2023-07` Q39 | Khóa 3, nhưng trật tự đúng 1-3-2-4 và ★ ở ô 3 (đã xem PDF đề gốc) cho ô ★ = 2 | khóa 3 → **2** |
| `n1-2023-07` Q41 | 「たいそうな小説であってもだ」 không thành câu; câu sau 「わが子は〜親の情である」 cần vế phủ định | khóa 1 → **2** (小説でもあるまい) |
| `n1-2023-07` Q43 | Câu sau nói tác giả không nỡ sửa văn cũ, nên 「否定できなくなる」 mới đúng; lời dịch cũ cũng sai | khóa 1 → **3** |
| `n1-2016-12` Q36–Q40 | PDF in ★ ở ô 2 cho cả 5 câu, nhưng bảng đáp án chỉ khớp trật tự ngữ pháp khi ★ ở ô 3 (câu 37–39) | đặt ★ ở ô **3** cho cả 5 câu; khóa Q36 2 → **3**, Q40 2 → **4**, Q37–Q39 giữ nguyên |
| `n1-2015-07` Q36 | Bản in đặt ★ ở ô 2, DB đặt ở ô 3; khóa 3 đúng với bản in | chuyển ★ về ô **2**, giữ khóa 3 |
| `n1-2011-12` Q39 | Lời giải ghi trật tự sai (4-1-3-2, thành 「避けようもののない」) | viết lại lời giải, trật tự đúng 2-4-3-1; khóa 3 giữ nguyên |
| `n1-2022-07` Q40 | Lời giải ghi 「コンサートで」 thay vì 「コンテストで」 | viết lại lời giải; khóa 4 giữ nguyên |

Q41 và Q43 của `n1-2023-07` là hai chỗ dựa trên phán đoán ngữ pháp/mạch văn, không có bản đề chính thức để xác nhận. Nếu chủ dự án muốn giữ khóa gốc, đổi lại bằng một lần chạy script tương tự.

Mọi câu trên đều có lời giải mới (kèm ghi chú vì sao khóa nguồn bị sửa) với `humanReviewed: true` và `correctionId`.

## Bảo toàn lịch sử và dữ liệu

- Không ghi đè hàng cũ: mỗi nhóm câu hỏi được sao chép sang phiên bản `approved` mới (`question_versions`, `answer_options`, `correct_answers`, `explanation_versions`).
- Ghi `content_reviews` (editor và reviewer khác nhau) và `operator_actions`.
- Xuất bản lại 7 đề (`publishExam`) để đồng bộ `exam_answer_keys` và `exams.published_version`.
- `--apply` yêu cầu `N1_GRAMMAR_FIX_BACKUP` trỏ tới file sao lưu hợp lệ (tối thiểu 1 MiB).

## Chạy

```bash
pnpm --filter "@jlpt/api..." build
node apps/api/dist/src/scripts/fix-n1-grammar-star-keys.js              # dry-run

N1_GRAMMAR_FIX_BACKUP=/duong-dan/backup.dump \
  node apps/api/dist/src/scripts/fix-n1-grammar-star-keys.js --apply
```

Dry-run chạy lại sau khi áp dụng phải báo `pending: 0`.

## Đã chạy trên staging (06/11/2026)

| Bước | Kết quả |
|---|---|
| Sao lưu | `/home/jlpt/backups/n1-grammar-star-keys-before-20261106T100102Z.dump` (42.180.379 byte) |
| Áp dụng | 12 nhóm câu hỏi được tạo phiên bản mới, 7 đề xuất bản lại; script tự kiểm tra `fixesVerified: 13` |
| Dry-run sau đó | `pending: 0` |
| Xuất lại 609 câu Ngữ pháp | chỉ 13 câu trên thay đổi, 596 câu còn lại giữ nguyên |
| Trang thật | `n1-2016-12` Q36 và Q37 hiển thị ★ ở ô thứ ba |

## Việc không làm

- Không sửa các lỗi chữ có sẵn trong nguồn (ví dụ 2021-12 Q37 thiếu 「を」 ở 「主人公」, Q40 「深刻している」, 2015-12 đoạn văn có câu 「育ち続けるのだそうだ」): đã đối chiếu với PDF, bản gốc in đúng như vậy.
- Lời giải tiếng Việt của 596 câu còn lại chỉ được kiểm tra khớp số đáp án, chưa đọc từng câu.
