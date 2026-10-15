# Dữ liệu demo tự soạn

Bộ dữ liệu này dùng để chạy thử sản phẩm từ đầu đến cuối trước khi có dữ liệu thật: nhập gói, duyệt, xuất bản, làm bài, xem kết quả và lời giải. Toàn bộ nội dung do dự án tự soạn (`provenance: self_authored`). Đây **không phải đề JLPT thật**; số câu, thời gian và thang điểm của blueprint là synthetic.

| File | Nội dung |
|---|---|
| `demo-n5-1.zip` | Gói nhập v2 hoàn chỉnh: 29 câu N5 (từ vựng 12, ngữ pháp và đọc 10, nghe 7), mỗi câu có lời giải tiếng Việt, 7 file audio thật |
| `demo-n5-1.import.json` | Bản đọc được của `import.json` trong ZIP, để xem diff |
| `blueprints/synthetic-n5-demo-v1.json` | Blueprint synthetic khớp đề demo, theo dạng A6 trong [HOP_DONG_KY_THUAT.md](../HOP_DONG_KY_THUAT.md), thêm `id` để `blueprintRef` trỏ tới và `note` ghi rõ không phải số liệu chính thức |
| `audio/` | Audio nghe dạng WAV (giọng đọc Windows Haruka) và kịch bản SSML |

## Dùng trong sản phẩm

- C05: `pnpm import:validate -- docs/multi-worker/demo-data/demo-n5-1.zip` phải đạt READY.
- C01: blueprint synthetic trong `blueprints/` phải qua validator blueprint.
- B01: `pnpm demo:seed` nạp blueprint và gói demo vào DB dev qua đúng luồng import → duyệt → publish, chạy lại không tạo trùng.

Dữ liệu thật của chủ dự án sau này đi đúng luồng đó qua admin, không thay đổi code. Đề demo vẫn ở dạng `practice` và có thể gỡ xuất bản.

## Tạo lại

Chạy từ thư mục `Multi-worker` trên Windows (cần giọng Microsoft Haruka):

```powershell
py tools/build_demo_data.py --scripts
powershell -ExecutionPolicy Bypass -File tools/tts_demo_audio.ps1
py tools/build_demo_data.py
py tools/validate_import.py demo-data/demo-n5-1.zip
```

Nội dung câu hỏi nằm trong `tools/build_demo_data.py`. Sửa nội dung thì tăng `revision` của gói.
