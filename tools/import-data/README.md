# Công cụ kiểm tra và đóng gói dữ liệu đề thi Import v2 (`tools/import-data`)

Thư mục này cung cấp các công cụ CLI độc lập để chủ dự án và đội ngũ nhập liệu kiểm tra tính hợp lệ và đóng gói đề thi trước khi tải lên trang quản trị.

---

## 1. Công cụ kiểm tra dữ liệu (`validate.js`)

Kiểm tra toàn diện tính toàn vẹn của thư mục hoặc tệp ZIP theo chuẩn Import v2:
- Kiểm tra cấu trúc schema JSON (`import-v2.schema.json`).
- Kiểm tra chuẩn hóa Unicode NFC và không lồng underline/emphasis.
- Kiểm tra tính đầy đủ và mã băm SHA-256 của các tệp media / PDF nguồn.
- Kiểm tra kích thước hình ảnh và thời lượng âm thanh.
- Kiểm tra tính liên tục của mốc thời gian nghe (`listeningTimeline`).
- Kiểm tra tính hợp lệ của các điểm chưa chắc chắn (`issues`).

### Cách sử dụng:

```bash
# Kiểm tra gói đề đã hoàn chỉnh (Ready for Review)
node tools/import-data/bin/validate.js fixtures/imports/ready

# Hoặc qua pnpm script
pnpm import:validate -- fixtures/imports/ready

# Kiểm tra gói đề đang soạn thảo (Draft Only)
node tools/import-data/bin/validate.js fixtures/imports/draft --mode draft

# Kiểm tra trực tiếp tệp nén ZIP
node tools/import-data/bin/validate.js fixtures/imports/ready.zip
```

---

## 2. Công cụ đóng gói (`pack.js`)

Đóng gói một thư mục đề thi thành tệp ZIP chuẩn, đảm bảo `import.json` nằm ngay tại thư mục gốc của tệp ZIP.

### Cách sử dụng:

```bash
node tools/import-data/bin/pack.js fixtures/imports/ready de-n5-ready.zip
```

---

## 3. Script Python dự phòng (`validate_import.py`)

Có thể chạy trực tiếp bằng Python 3.10+ mà không cần cài đặt thêm bất kỳ thư viện bên thứ ba nào:

```bash
python3 tools/import-data/validate_import.py fixtures/imports/ready
python3 tools/import-data/validate_import.py fixtures/imports/draft --mode draft
```
