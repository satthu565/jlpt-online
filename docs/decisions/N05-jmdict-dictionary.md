# N05: Từ điển JMdict và KANJIDIC2 (EDRDG)

Chủ dự án chọn JMdict ngày 20/10/2026, theo phương án 1 trong `HUONG_DAN_CHUAN_BI_DICH_VU.md`.

## Nguồn và giấy phép

- **Dữ liệu:**
  - JMdict_e (từ vựng: cách đọc, từ loại, nghĩa tiếng Anh).
  - KANJIDIC2 (kanji: âm On/Kun, số nét, nghĩa tiếng Anh, cấp JLPT cũ).
- **Phát hành:** Electronic Dictionary Research and Development Group (EDRDG).
- **Giấy phép:** CC BY-SA 4.0, dùng thương mại được nếu ghi nguồn (https://www.edrdg.org/edrdg/licence.html).
  - Câu ghi nguồn bằng tiếng Anh theo yêu cầu của EDRDG hiển thị ở `/gioi-thieu#nguon-du-lieu`.
  - Trang `/tu-vung` dẫn link tới đó.
- **API:** `GET /dictionary/lookup` trả `license` và `attribution` lấy từ bảng `lexicon_licenses`.

## Phạm vi đã nạp

| | Số lượng (bản 2026-10-20) |
|---|---|
| Mục từ thông dụng (`news1`, `ichi1`, `spec1`, `spec2`, `gai1`) | 22.647 |
| Cách đọc | 27.604 |
| Nghĩa (tiếng Anh, `locale = en`) | 37.190 |
| Kanji có cấp JLPT hoặc thuộc chương trình phổ thông | 2.999 |

- **Nghĩa tiếng Việt:** JMdict không có. Phần này sẽ bổ sung sau vào `entry_meanings` với `locale = vi`.
- **Cấp JLPT của kanji:** KANJIDIC2 dùng thang cũ 4..1.
  - Cũ 4 → N5, cũ 3 → N4, cũ 1 → N1.
  - Cũ 2 trải trên cả N3 và N2 nên để `level = null`, không đoán.

## Nạp hoặc cập nhật

```bash
curl -fLo JMdict_e.gz http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
curl -fLo kanjidic2.xml.gz http://www.edrdg.org/kanjidic/kanjidic2.xml.gz
DATABASE_URL=postgres://... node apps/api/scripts/lexicon/import-lexicon.mjs \
  --jmdict JMdict_e.gz --kanjidic kanjidic2.xml.gz [--all] [--replace]
```

- Chạy lại với cùng ngày phát hành thì không làm gì.
- `--replace` xóa các dòng cũ của nguồn này trước khi nạp lại.
- `--all` nạp toàn bộ JMdict, khoảng 200 nghìn mục.

Tra từ tìm theo mặt chữ trước, rồi theo cách đọc: gõ `よやく` sẽ ra `予約`.
