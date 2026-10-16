# Quyết định kỹ thuật: Khắc phục phản hồi Reviewer F02 (Lượt F02-4)

## Bối cảnh

Trong đợt review task F02, Reviewer W4 đã chỉ ra các điểm cần hoàn thiện:
1. **[P1] Thiếu error responses và requestBody schemas trong OpenAPI**: 78 operations thiếu định nghĩa mã lỗi 4xx/5xx kèm ví dụ lỗi; 18 admin write endpoints khai báo `{ type: 'object' }` trống rỗng.
2. **[P1] Thiếu ràng buộc thời gian trong Zod DTO**: `EventCreateSchema` chưa cài đặt `opensAt <= startsAt < endsAt <= resultReleaseAt`; `AssignmentCreateSchema` chưa kiểm tra `opensAtUTC < dueAtUTC` và yêu cầu ít nhất một trong hai (`examId` hoặc `mixConfig`).
3. **[P2] Mã lỗi sai ở endpoint explanations**: `GET /api/v1/attempts/{id}/explanations/{index}` trả về `VERSION_CONFLICT` thay vì `RESULTS_EMBARGOED`.
4. **[P2] Schema Zod bị thiếu**: `ReviewAttemptResponseSchema`, `ActorContextSchema`, `ResourceVersionSchema`, `SourceRightsSchema` chưa được khai báo và export trong `@jlpt/schema`.
5. **[P2] Phạm vi allowedPaths**: Ghi nhận phê duyệt bổ sung phạm vi (temporary grant log) của Coordinator trong task card F02-4 cho các thư mục `apps/api/src/db/`, `packages/exam-engine/`, `packages/media-token/`, `packages/srs/`.

## Các giải pháp đã triển khai

### 1. Bổ sung schema tường minh cho 18 Admin Write Endpoints
Đã tạo và gắn schema tường minh vào `openApiComponents.schemas`:
- `SourceCreateInput` & `SourceUpdateInput`: định nghĩa `name`, `level`, `year`, `session`, `origin`, `licenseId`, `sourceUrl`.
- `LicenseCreateInput` & `LicenseUpdateInput`: định nghĩa các quyền `SourceRights` kết hợp `evidenceRef`, `legalApproval`.
- `GroupDraft` & `GroupDraftUpdate`: cấu trúc câu hỏi kèm đáp án và giải thích cho staff (`RichText`, `options`, `correctOption`, `tags`, `rights`).
- `BlueprintCreateInput`: cấu trúc blueprint gồm `level`, `version`, `sourceRef`, `sections`, `scoring`.
- `ExamCreateInput` & `ExamSetItemsInput`: định nghĩa tạo đề thi và thứ tự các câu hỏi trong đề thi.
- `ExplanationDraft` & `ExplanationDraftUpdate`: bản thảo giải thích chi tiết câu hỏi (`correctReason`, `wrongReasonsByOption`, `translation`, `language`, `origin`, `humanReviewed`).
- `ContentReportResolveInput`: xử lý báo cáo sự cố câu hỏi (`status`, `resolution`, `moderatorNotes`).
- `CommunityReportResolveInput`: xử lý vi phạm bình luận (`status`, `action`, `reason`).
- `UserAdminUpdateInput`: phân quyền và khóa tài khoản (`roles`, `isBlocked`, `blockReason`, `scopes`).
- `AdminPlanCreateInput`: cấu hình gói dịch vụ (`name`, `code`, `term`, `priceMinor`, `currency`, `entitlements`, `maxUses`).
- `AdminCouponCreateInput`: mã giảm giá (`code`, `discountPercent`, `discountMinor`, `maxUses`, `expiresAt`, `scope`).
- `AdminExperimentCreateInput`: thử nghiệm A/B testing (`name`, `hypothesis`, `targetMetric`, `eligibleCohorts`, `variants`, `startAt`, `endAt`).

### 2. Chuẩn hóa Error Responses và Examples cho 78 Operations
Tất cả 78 operations đã được bổ sung đầy đủ các response lỗi và examples:
- **Admin routes**: Chuẩn hóa bộ lỗi quản trị gồm:
  - `401 UNAUTHENTICATED`: Yêu cầu đăng nhập quản trị viên.
  - `403 FORBIDDEN / TWO_FACTOR_REQUIRED`: Chứa cả 2 ví dụ phân quyền và xác thực 2 bước 2FA theo `API_V1_V4.md`.
  - `404 NOT_FOUND`: Cho tất cả các route truy xuất theo ID hoặc tài nguyên đích.
  - `409 VERSION_CONFLICT`: Cho các thao tác cập nhật bản ghi có version hoặc optimistic locking.
  - `422 VALIDATION_ERROR`: Cho tất cả các thao tác nhận requestBody hoặc query parameters.
- **Corpus / Plans / Events / Gamification / CMS / Analytics**: Bổ sung `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `404 NOT_FOUND`, `500 INTERNAL_ERROR` theo đúng ngữ cảnh nghiệp vụ.

### 3. Ràng buộc thời gian và điều kiện bài tập (Zod Refinements)
- `EventCreateSchema`: Thêm `.refine()` kiểm tra chặt chẽ:
  `new Date(data.opensAt) <= new Date(data.startsAt) && new Date(data.startsAt) < new Date(data.endsAt) && new Date(data.endsAt) <= new Date(data.resultReleaseAt)`.
- `AssignmentCreateSchema`: Thêm `.refine()` kiểm tra:
  `Boolean(data.examId || data.mixConfig)` và `new Date(data.opensAtUTC) < new Date(data.dueAtUTC)`.

### 4. Sửa mã lỗi 409 endpoint getQuestionExplanation
- Đổi HTTP 409 của `GET /api/v1/attempts/{id}/explanations/{index}` từ `VERSION_CONFLICT` sang `RESULTS_EMBARGOED` với thông điệp: "Kết quả chưa được công bố." đồng nhất với endpoint `getAttemptReview`.

### 5. Khai báo và export Zod Schemas còn thiếu
- `ReviewAttemptResponseSchema`: Khai báo trong `packages/schema/src/attempts.ts` và export ra `@jlpt/schema`.
- `ActorContextSchema`, `ResourceVersionSchema`, `SourceRightsSchema`: Khai báo trong `packages/schema/src/api-contracts.ts` và export ra `@jlpt/schema`.

### 6. Ghi nhận phê duyệt phạm vi allowedPaths
Coordinator đã phê duyệt bổ sung phạm vi (temporary grant log) trong assignment F02-4 bao gồm các đường dẫn:
- `apps/api/src/db/` (Hợp đồng DB Drizzle ORM A10 phục vụ đồng bộ schema với API contracts)
- `packages/exam-engine/`, `packages/media-token/`, `packages/srs/` (Các package logic thi lõi phụ thuộc contracts).

### 7. Tích hợp kiểm tra tự động vào CI (`contracts:check`)
Đã bổ sung mục kiểm tra số 9 vào `packages/schema/src/contracts/check-all.ts`:
- Duyệt qua toàn bộ endpointsData trong spec OpenAPI để kiểm tra:
  1. Không có bất kỳ operation nào thiếu mã lỗi 4xx/5xx.
  2. Không có bất kỳ operation nào có requestBody dạng `{ type: 'object' }` trống rỗng.
Lệnh `pnpm contracts:check` tự động verify tiêu chí này với 0 lỗi.
