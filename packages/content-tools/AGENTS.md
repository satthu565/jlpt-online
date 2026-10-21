# packages/content-tools: hướng dẫn cho agent

Gồm: kiểm tra gói nhập đề, NLP tiếng Nhật (tách từ, lemma, ngữ pháp, kanji), Hán Việt và xuất dataset. Đọc `AGENTS.md` ở gốc repo trước.

## Cấu trúc

```
src/
  validator.ts, schema.ts, blueprint-validator.ts   kiểm tra gói nhập (định dạng: docs/import-format)
  zip.ts, snapshot.ts, idempotency.ts               đóng gói, ảnh chụp đề
  export/                                           xuất dataset
  nlp/
    tokenizer.ts, lemmatizer.ts, tagger.ts          tách từ, đưa về dạng gốc
    grammar-analyzer.ts, kanji-analyzer.ts          phân tích ngữ pháp, kanji
    hanviet.ts                                      computeHanViet(term, reading)
    hanviet-tables.ts                               bảng Hán Việt đã đóng gói (SINH RA, không sửa tay)
    hanviet-data.json                               âm theo chữ (dữ liệu cũ, dùng làm dự phòng)
tests/
```

## Hán Việt 4 lớp

Chi tiết ở [docs/decisions/H01-hanviet-word-level.md](../../docs/decisions/H01-hanviet-word-level.md).

1. **Âm theo âm On:** `tools/import-data/data/hanviet-onyomi.tsv`, kèm `hanviet-primary.tsv` (mỗi chữ một âm chính).
2. **Ngoại lệ theo từ:** `hanviet-word-overrides.tsv` (社長 XÃ TRƯỞNG / 長期 TRƯỜNG KỲ).
3. **Thuật toán** `computeHanViet`: ngoại lệ → tách theo âm On → âm chính (kun) → để trống. Không đoán.
4. **Lưu vào database:** cột `lexical_entries.han_viet*`. Giá trị biên tập viên sửa tay (`manual`) không bị ghi đè.

Sửa dữ liệu Hán Việt:

1. sửa file TSV;
2. chạy `node tools/import-data/bin/pack-hanviet.mjs` để sinh lại `hanviet-tables.ts`;
3. chạy `node tools/import-data/bin/check-hanviet-onyomi.mjs`;
4. chạy test.

Quy ước:

- Hán Việt viết HOA, chuẩn NFC, dấu theo kiểu HÒA, THỦY.
- Kokuji (込, 峠) để trống.
- Từ không có chữ Hán thì không có Hán Việt và không đưa vào danh sách duyệt.

## Lệnh

```bash
pnpm --filter @jlpt/content-tools test     # gồm golden 417 từ Hán Việt
pnpm test:nlp
pnpm test:import-validation
```

## Lưu ý

- Không export trùng tên giữa các file trong `src/nlp`, vì `index.ts` gom bằng `export *`.
- Chữ Nhật giữ NFC. Không dùng NFKC lên nội dung gốc.
