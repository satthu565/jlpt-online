# Quyết định Kỹ thuật: Đồng bộ origin/main và hoàn thiện TOTP Cross-Process trong E2E

- **Mã Task**: I04
- **Assignment ID**: I04-15
- **Người thực hiện**: W4 (Quản trị báo cáo và thương mại)
- **Thời gian**: 2026-10-18

## 1. Bối cảnh và Xung đột sau lượt 4
- Sau khi task I03 được merge vào `origin/main` (commit `fb90d11`), nhánh `task/I04` bị phân kỳ (diverged) và xung đột khi merge.
- Các xung đột tập trung ở:
  1. `apps/admin/app/reports/content/page.tsx`: I03 triển khai báo cáo nội dung kết nối API và i18n theo cấu trúc `content.contentReports.*`.
  2. `apps/admin/lib/api-client.ts`: I03 chuẩn hóa Fastify body handling (không gửi Content-Type khi body là undefined). Phía I04 trước đó fallback `{}` gây xung đột.
  3. `apps/admin/messages/{vi,ja,en}.json`: I03 bổ sung khối `"content": { ... }` trong khi I04 bổ sung `"commercial"`, `"reports"`, `"experiments"`, `"contentReports"`.
  4. `tests/integration/mock-ui-baseline.json`: Cả I03 và I04 đều loại bỏ các route vi phạm mảng mẫu thuộc phạm vi từng task.
  5. `tests/playwright/fixtures/staff-auth.fixture.ts` và `tests/playwright/integration.spec.ts`: I03 triển khai cơ chế đồng bộ hóa TOTP qua file `/tmp/jlpt-totp-step-${sanitizeKey}.txt` và helper `handleTotpVerification`.

## 2. Giải pháp giải quyết xung đột và hoàn thiện
- **Nội dung i18n**: Giữ toàn bộ từ điển thương mại, báo cáo, thử nghiệm của I04 đồng thời tích hợp trọn vẹn khối `content` từ I03, đảm bảo đầy đủ cả 3 ngôn ngữ (`vi`, `ja`, `en`).
- **mock-ui-baseline.json**: Xóa sạch toàn bộ các route admin đã được giải phóng khỏi mock data, chỉ giữ lại fixtures của app `web`.
- **Đồng bộ TOTP và E2E**:
  - Giữ nguyên `tests/playwright/fixtures/staff-auth.fixture.ts` từ `origin/main` với `getSynchronizedTotp` và `handleTotpVerification`.
  - Cập nhật cả `loginAsAdmin` lẫn `loginAsAdminI04` trong `tests/playwright/integration.spec.ts` dùng chung `handleTotpVerification`, tự động phát hiện mã bị dùng lại và chuyển sang step kế tiếp an toàn mà không xung đột giữa Chromium và Mobile Safari.
  - Sử dụng `.first()` cho selector `[data-testid^="experiment-card-"], [data-testid="experiments-empty"]` tránh strict mode violation.
- **Tuân thủ Fastify Content-Type**: Thống nhất dùng cơ chế của `origin/main` trong `AdminApiClient.request`.
