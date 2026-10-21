# Tính năng ẩn trong giai đoạn đầu

**Quyết định:** chủ dự án, ngày 21/10/2026.

Ba phần dưới đây đã code xong nhưng chưa triển khai ở giai đoạn này. Chúng được ẩn bằng cờ tính năng, **code vẫn giữ nguyên**. Mặc định cả ba đều tắt.

| Cờ (`apps/web/lib/features.ts`) | Biến lúc build | Phần bị ẩn khi tắt |
|---|---|---|
| `privacyPolicyPage` | `NEXT_PUBLIC_FEATURE_PRIVACY_POLICY` | `/chinh-sach` và `/chinh-sach-bao-mat` trả 404; link "Chính sách" ở footer và mục trong sitemap bị bỏ |
| `tts` | `NEXT_PUBLIC_FEATURE_TTS` | Nút đọc thành tiếng ở `/tu-vung`, `/ngu-phap`, flashcard và sổ tay |
| `aiExplanation` | `NEXT_PUBLIC_FEATURE_AI_EXPLANATION` | Trợ lý AI giải thích đáp án ở trang xem lại kết quả `/ket-qua/...` |

API, admin (gồm trang "Kiểm duyệt AI") và dữ liệu không thay đổi; chỉ phần học viên nhìn thấy bị ẩn.

## Mở lại một tính năng

Đặt biến của tính năng đó bằng `1` khi build web. Next.js gắn giá trị vào lúc build, nên đổi biến xong phải build lại.

- **Docker:** `infra/docker/web.Dockerfile` đã có sẵn `ARG`. Ví dụ:
  ```bash
  docker build -f infra/docker/web.Dockerfile --build-arg NEXT_PUBLIC_FEATURE_TTS=1 .
  ```
- **Build tay:**
  ```bash
  NEXT_PUBLIC_FEATURE_TTS=1 pnpm --filter @jlpt/web build
  ```
- **Compose:** thêm biến vào `build.args` của service web.

Điều kiện trước khi mở lại:

- **Chính sách:** chủ dự án đã điền và duyệt `Thi JLPT/thong_tin_du_an/CHINH_SACH_QUYEN_RIENG_TU.md`, và nội dung đó đã được đưa vào `app/(info)/chinh-sach/privacy-policy-content.tsx`.
- **TTS:** đã có nhà cung cấp TTS. Nếu chưa có, nút đang chạy chế độ thử (sandbox).
- **AI:** đã có nhà cung cấp AI và ngân sách AI.

## Kiểm thử

- **`apps/web/tests/feature-flags.test.tsx`:** kiểm tra mặc định cả ba cờ tắt, trang chính sách trả 404 và sitemap không có `/chinh-sach`.
- **E2E:**
  - `tests/playwright/integration.spec.ts` chỉ duyệt trang chính sách khi `NEXT_PUBLIC_FEATURE_PRIVACY_POLICY=1`.
  - `tests/integration/capture-design-perf.ts` cũng vậy.
- **Khi mở lại:** bỏ điều kiện tương ứng trong test nếu muốn luôn kiểm tra.
