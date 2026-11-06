# N1 7/2010: Căn chỉnh mốc thời gian phần thi Nghe Mondai 4 (Q91 - Q104)

## Vấn đề
Trong đề thi JLPT N1 7/2010, phần thi Nghe (聴解) Mondai 4 (即時応答, gồm 14 câu hỏi từ Q91 đến Q104) bị lỗi chia mốc thời gian (`listeningTimeline`):
- Mốc kết thúc (`endMs`) của các câu bị cắt sớm từ 10 đến 15 giây, ngay khi vừa phát xong Lựa chọn 1 hoặc Lựa chọn 2.
- Học viên khi làm bài bị mất Lựa chọn 3 (thường là đáp án đúng, ví dụ câu Q91 đáp án 3 bị cắt mất).
- Khi học viên bấm chuyển sang câu tiếp theo, audio lại phát phần đuôi (Lựa chọn 3) của câu trước đó rồi mới tới tiếng chuông và câu mới.

## Bảng đối chiếu mốc thời gian trước và sau khi căn chỉnh

| Câu hỏi | Trước khi sửa | Sau khi sửa | Thời lượng mới | Trạng thái phát âm |
|---|---|---|---|---|
| Q91 (1番) | 2568.4s - 2595.3s (26.9s) | 2568.4s - 2605.0s | 36.6s | Trọn vẹn Option 1, 2, 3 (`じゃあ、来週の木曜日にしましょうか。`) |
| Q92 (2番) | 2595.3s - 2624.9s (29.6s) | 2605.0s - 2635.0s | 30.0s | Trọn vẹn Option 1, 2, 3 (`今呼んでまいります。`) |
| Q93 (3番) | 2624.9s - 2657.6s (32.6s) | 2635.0s - 2668.0s | 33.0s | Trọn vẹn Option 1, 2, 3 (`どうぞ、またおいでください。`) |
| Q94 (4番) | 2657.6s - 2693.5s (36.0s) | 2668.0s - 2702.0s | 34.0s | Trọn vẹn Option 1, 2, 3 (`よし、早速いきましょう。`) |
| Q95 (5番) | 2693.5s - 2728.5s (35.0s) | 2702.0s - 2739.0s | 37.0s | Trọn vẹn Option 1, 2, 3 (`そう?結構上手だと思うけど。`) |
| Q96 (6番) | 2728.5s - 2761.3s (32.8s) | 2739.0s - 2772.0s | 33.0s | Trọn vẹn Option 1, 2, 3 (`では、あとで伝えておきます。`) |
| Q97 (7番) | 2761.3s - 2796.3s (35.0s) | 2772.0s - 2806.0s | 34.0s | Trọn vẹn Option 1, 2, 3 (`んー、これ以上は難しいですね。`) |
| Q98 (8番) | 2796.3s - 2824.6s (28.4s) | 2806.0s - 2838.0s | 32.0s | Trọn vẹn Option 1, 2, 3 (`ダメってことはないよ。`) |
| Q99 (9番) | 2824.6s - 2860.0s (35.4s) | 2838.0s - 2871.0s | 33.0s | Trọn vẹn Option 1, 2, 3 (`早く謝ったほうがいいですよ。`) |
| Q100 (10番) | 2860.0s - 2886.0s (26.0s) | 2871.0s - 2900.0s | 29.0s | Trọn vẹn Option 1, 2, 3 (`適切なアドバイス、ありがとう。`) |
| Q101 (11番) | 2886.0s - 2939.4s (53.5s) | 2900.0s - 2933.0s | 33.0s | Trọn vẹn Option 1, 2, 3 (`捨てるなら、あしたにしたら？`) |
| Q102 (12番) | 2939.4s - 2963.1s (23.7s) | 2933.0s - 2971.0s | 38.0s | Trọn vẹn Option 1, 2, 3 (`そうですね、改めて話し合いましょう。`) |
| Q103 (13番) | 2963.1s - 2994.1s (30.9s) | 2971.0s - 3002.0s | 31.0s | Trọn vẹn Option 1, 2, 3 (`それはありがたいですね。`) |
| Q104 (14番) | 2994.1s - 3081.7s (87.6s) | 3002.0s - 3081.7s | 79.7s | Trọn vẹn Option 1, 2, 3 (`毎日こうだったらいいのにね。`) và chuyển tiếp sang Mondai 5 |

Tất cả 108 khóa đáp án, nội dung chữ tiếng Nhật, lời giải tiếng Việt và cấu trúc đề thi được giữ nguyên vẹn 100%.

## Hướng dẫn chạy

Chỉ chạy trên worktree cách ly tại `jlpt-vm`:

```bash
export N1_TIMELINE_DIR=/tmp/n1-2010-07-timeline-20261106
export N1_TIMELINE_AUTH="/tmp/n1-safe-fix-auth.env"

# 1. Lập plan kiểm tra
node tools/content/n1-2010-07-listening-timeline/repair.mjs plan

# 2. Áp dụng sau khi có sao lưu và commit được kiểm tra
node tools/content/n1-2010-07-listening-timeline/repair.mjs apply

# 3. Xác minh xuất bản
node tools/content/n1-2010-07-listening-timeline/repair.mjs verify
```
