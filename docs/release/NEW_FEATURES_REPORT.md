# Nghiệm thu 5 tính năng bổ sung (P06)

Task P06 nghiệm thu NEW-01..05. Claude làm trực tiếp ngày 21/10/2026.

Nguồn bằng chứng:

- **Kiểm tra trên preview** (main `3a6ea54`, `jlpt-vm`) bằng Playwright, tài khoản học viên `hocvien@jlpt.demo` và admin `publisher@jlpt.local`:
  - Ảnh chụp ở 390 và 1366 px trong `docs/release/p06/`.
  - Số liệu DOM trong `docs/release/p06/evidence.json`.
- **E2E trên staging CI** trong `tests/playwright/integration.spec.ts`:
  - Bộ P04: đỗ/trượt, furigana, nhịp làm bài, lịch thi.
  - Bộ P05: admin lịch thi, bảng quy đổi.
  - Bộ P06: Hán Việt và bề rộng trang ở 390 px.

## Kết quả

| Tính năng | Kết quả | Bằng chứng |
|---|---|---|
| **NEW-01:** đỗ/trượt theo JLPT, điểm sàn từng phần | ĐẠT | Đề demo N5: "CHƯA ĐẠT (FAIL)", "Chưa đạt do tổng điểm chưa đủ và có phần dưới điểm sàn". Từng phần có điểm thô, điểm quy đổi và điểm liệt. E2E P04-AC1. |
| **NEW-02:** Hán Việt và furigana | ĐẠT, còn lỗi dữ liệu Hán Việt (mục *Lỗi phát hiện*, ý 1) | Nút "Furigana: TẮT" đặt `html[data-furigana=off]`, tải lại trang vẫn giữ; E2E P04-AC2. API tra từ trả `hanViet` (学生 → HỌC SINH); E2E P06-NEW-02. |
| **NEW-03:** cảnh báo nhịp làm bài | ĐẠT | Chế độ luyện tập, chậm 3 phút so với mốc: "Cảnh báo nhịp chậm nghiêm trọng: Chậm hơn 4 câu…". Trang kết quả có phân tích thời gian từng câu. E2E P04-AC3. |
| **NEW-04:** lịch thi tại Việt Nam, nhắc hạn đăng ký | ĐẠT | `/lich-thi` có bộ lọc cấp độ, nút đăng ký nhắc hạn và trạng thái trống khi chưa có kỳ thi. E2E P04-AC4. |
| **NEW-05:** admin lịch thi và bảng quy đổi | ĐẠT | Admin `/schedules` (Bản nháp, Đã xuất bản, Lưu trữ, Quét và gửi nhắc nhở) và `/scoring-tables` (9 dòng bảng quy đổi). E2E P05-AC1: xuất bản thì trang công khai hiện ngay. E2E P05-AC2: đổi bảng tạo phiên bản mới, kết quả cũ giữ phiên bản cũ. |

Preview chưa có kỳ thi nào được nhập. Chủ dự án nhập lịch thi JLPT 12/2026 thật ở admin `/schedules` thì `/lich-thi` sẽ hiện.

## Lỗi phát hiện và đã sửa trong P06

1. **Trang kết quả bị tràn ngang trên điện thoại.**
   - Ở 390 px, nội dung rộng 589 px và nửa phải các thẻ bị cắt.
   - Cùng lỗi có ở `/thong-ke-tu-vung` (511 px), `/ho-tro` (412 px) và `/lich-thi` (394 px).
   - **Nguyên nhân:**
     - `main#main-content` là flex, nên các khung `max-w-* mx-auto` co theo nội dung rộng nhất thay vì chiếm hết bề ngang.
     - Hàng nút ở trang kết quả không xuống dòng.
   - **Sửa:**
     - `globals.css` cho mọi con trực tiếp của `main` dùng `width: 100%`.
     - Hàng nút xuống dòng; nhãn nút PDF và watermark được xuống dòng.
   - **Lý do D05 không bắt được:** D05 đo `documentElement.scrollWidth`, mà `html` và `body` đặt `overflow-x: hidden` nên giá trị này luôn bằng 390. Nay `capture-design-perf.ts` đo cả `body.scrollWidth`, và E2E P06 chặn ở 5 trang công khai.
2. **Trang kết quả hiện mã nội bộ** "Dạng bài: kanji_reading", "orthography". Nay hiện tên tiếng Việt cho 21 dạng bài (`features/exam/mondai-labels.ts`), có test bảo đảm không dạng nào thiếu tên.
3. **Thanh công cụ phòng thi ở 390 px bị cắt chữ "Phím tắt".** Nhóm nút nay xuống dòng. Nút phím tắt ẩn trên điện thoại vì không có bàn phím. Ký tự ⌨ thay bằng icon lucide.

## Lỗi phát hiện, cần quyết định của chủ dự án

1. **Dữ liệu Hán Việt sai ở chữ có nhiều âm (P02).**
   - `hanviet-data.json` giữ một âm cho mỗi chữ, nhưng chọn sai với khoảng 15% từ thông dụng trong mẫu 56 từ JLPT:

     | Từ | Dữ liệu cho | Âm đúng |
     |---|---|---|
     | 予約 | DƯ YÊU | DỰ ƯỚC |
     | 約束 | YÊU THÚC | ƯỚC THÚC |
     | 重要 | TRÙNG YÊU | TRỌNG YẾU |
     | 必要 | TẤT YÊU | TẤT YẾU |
     | 番号 | PHAN HIỆU | PHIÊN HIỆU |
     | 音楽 | ÂM LẠC | ÂM NHẠC |
     | 部長 | BỘ TRƯỜNG | BỘ TRƯỞNG |
     | 社長 | XÃ TRƯỜNG | XÃ TRƯỞNG |

   - Trường `kVietnamese` của Unihan lẫn âm Nôm (予 = "nhừ"), nên không phải nguồn Hán Việt chuẩn.
   - **Đề xuất:** lập bảng âm Hán Việt chuẩn cho 2.136 chữ thường dụng, cộng ngoại lệ theo từ (重要 TRỌNG, 重複 TRÙNG; 音楽 NHẠC, 楽園 LẠC).
2. **`/tu-vung` trống.**
   - Trang chỉ lọc bộ ngữ liệu JLPT, mà bộ này đang có `totalWords: 0`.
   - Từ điển JMdict đã nạp (22.647 mục) nhưng trang chưa dùng.
   - `corpus-client.lookupDictionary` gửi tham số `q`, trong khi API cần `text`. Hiện chưa trang nào gọi hàm này.
   - **Đề xuất:** ô tìm kiếm ở `/tu-vung` tra thẳng JMdict, kèm Hán Việt.

## Kiểm tra

- `pnpm check:no-mock-ui`: đạt.
- Web: typecheck, lint và 22 file test (269 test) đạt.
- E2E P06 mới:
  - `P06-NEW-02` tra 学生 → HỌC SINH, có giấy phép.
  - Truy vấn rỗng trả 400; tra bằng kana không có Hán Việt.
  - 5 trang công khai không rộng quá 390 px.
- `jlpt-stage-test check-all` chạy qua CI staging của PR này.
