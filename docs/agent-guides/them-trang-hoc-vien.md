# Thêm trang học viên

Mẫu đang chạy thật: `/tu-vung`. Các file tham khảo:

- `apps/web/app/(corpus)/tu-vung/page.tsx`
- `apps/web/features/corpus/` (components, hooks, `services/corpus-client.ts`)

## 1. Route

Tạo `apps/web/app/(<nhóm>)/<route>/page.tsx`:

- route viết tiếng Việt không dấu, ví dụ `/on-tap`;
- chọn nhóm có sẵn nếu phù hợp: `(learning)`, `(practice)`, `(corpus)`…;
- muốn biết trang nào đã có, xem `docs/agents/PROJECT_MAP.generated.md`.

Trang chỉ nên làm phần khung, phần còn lại để trong `features/`:

```tsx
import type { Metadata } from 'next';
import { OnTapView } from '../../../features/learning';

export const metadata: Metadata = { title: 'Ôn tập - JLPT Online', description: '…' };

export default function Page() {
  return <OnTapView />;
}
```

Web import bằng đường dẫn tương đối (không có alias `@/`), như `app/(corpus)/tu-vung/page.tsx`.

## 2. Logic trong `features/<miền>/`

- `services/<ten>-client.ts`: gọi API qua đường dẫn `/api/v1/...` (Next rewrite sang API).
- `hooks/`: state, loading, lỗi.
- `components/`: giao diện, chỉ dùng `@jlpt/ui`.
- Xuất qua `index.ts` của miền.

Không có API thì làm API trước ([them-api.md](them-api.md)). Không dùng mảng dữ liệu tạm.

## 3. Ba trạng thái và điện thoại

- Có đủ: đang tải (`Skeleton`/`Spinner`), lỗi (`Alert` có nút thử lại), rỗng (`EmptyState`).
- Ở 390 px: không tràn ngang, nút xuống dòng được, chữ không bị cắt.

## 4. Chuỗi, SEO, cờ

- Thêm chuỗi vào đủ `apps/web/messages/vi.json`, `ja.json`, `en.json`. Lấy chuỗi bằng `useI18n()`.
- Trang công khai: đặt `metadata` (title, description). Nếu cần index thì thêm vào sitemap.
- Trang cần ẩn được: thêm cờ vào `apps/web/lib/features.ts`. Xem `apps/web/AGENTS.md`.

## 5. Test

- Vitest trong `apps/web/tests/`: render, kiểm tra chuỗi, trạng thái lỗi.
- E2E luồng chính: thêm `test.describe` vào `tests/playwright/integration.spec.ts`, dùng `data-testid`, chờ bằng `expect(...).toBeVisible()`. E2E tạo dữ liệu gì (lượt thi, sổ tay…) thì dọn trong `afterEach`.

```bash
pnpm test:web
pnpm check:ui-primitives && pnpm check:no-mock-ui
pnpm docs:map
```

Chạy E2E trên staging theo [kiem-tra-truoc-khi-nop.md](kiem-tra-truoc-khi-nop.md).

## 6. Tài liệu

Thêm trang vào `docs/agents/FEATURES.md`.
