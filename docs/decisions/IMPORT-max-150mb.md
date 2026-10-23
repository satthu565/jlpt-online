# Nâng giới hạn tải lên gói nhập đề lên 150 MB

**Ngày:** 23/10/2026.

## Vấn đề

Khi nhập 31 đề N2 vào staging, 4 gói vượt giới hạn mặc định 50 MB của `POST /api/v1/admin/imports`, nên API trả 413. Các gói đó là 12-2019, 7-2017, 7-2021 và 12-2024, nặng 51–81 MB.

Gói đề thật chứa file audio phần nghe (40–55 phút mp3). Vì vậy 50 MB không đủ cho N2. N1 có phần nghe dài hơn nên càng không đủ.

## Quyết định

- `DEFAULT_MAX_IMPORT_BYTES` tăng lên **150 MB**, khai báo trong `apps/api/src/modules/import/fastify-http-config.ts`.
- Biến `IMPORT_MAX_BYTES` vẫn ghi đè được giới hạn này.
- Các route khác vẫn giữ giới hạn 1 MB như trước (xem I18).
- Reverse proxy đặt trước API cũng phải cho phép body lớn tương ứng.
  - Caddy (`infra/compose/Caddyfile`) không giới hạn body nên không cần sửa.
  - nginx trên máy ảo demo đã đặt `client_max_body_size 150m`.
