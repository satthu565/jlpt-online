# Quyết định kỹ thuật: F02 Chốt hợp đồng V1–V4 và fixture dùng chung

## Bối cảnh và mục tiêu

Task F02 do worker W1 thực hiện nhằm chốt toàn bộ hợp đồng dữ liệu, DTO, OpenAPI, Event Schema, Database contracts và fixture dùng chung cho toàn bộ phạm vi V1–V4 của hệ thống thi JLPT Online.

Các mục tiêu và tiêu chí nghiệm thu chính:
1. **DTO công khai tách DTO đáp án**: Đảm bảo cấu trúc đề thi công khai (`PublicExamSnapshotSchema`, `PublicQuestionSchema`, `PublicOptionSchema`) dùng `.strict()`, tuyệt đối không chứa các trường đáp án (`correctOption`, `answerKey`, `explanation`, `isCorrect`), ngăn chặn nguy cơ rò rỉ đáp án ra client hoặc các mô hình AI trong lúc làm bài. DTO chứa đáp án (`ExamAnswerKeySchema`, `StaffQuestionSchema`, `StaffExplanationSchema`, `ReviewAttemptResponseSchema`) được tách biệt hoàn toàn, chỉ phục vụ server nội bộ hoặc staff có quyền.
2. **Mọi endpoint trong API_V1_V4.md có schema và ví dụ lỗi**: Mọi endpoint từ V1 đến V4 đều được định nghĩa tường minh trong `contracts/openapi.yaml`, có schema request/response và chuẩn lỗi chung `{ error: { code, message, details, requestId } }` với ví dụ cụ thể cho toàn bộ danh mục mã lỗi chuẩn.
3. **Client sinh tự động không sai khác khi chạy lại**: API Client trong `packages/api-client` được sinh tự động từ hợp đồng OpenAPI một cách hoàn toàn tất định (deterministic), đảm bảo khi chạy lại lệnh `pnpm contracts:generate` không sinh ra bất kỳ sai khác nào (0 git diff).

## Các quyết định kiến trúc

### 1. Phân tách DTO công khai và DTO đáp án
- `PublicExamSnapshotSchema`: Chứa toàn bộ nội dung hiển thị cho thí sinh (câu hỏi, đoạn văn, hình ảnh, timeline audio nghe). Sử dụng `strict()` của Zod để loại trừ bất kỳ trường không hợp lệ nào. Kiểm thử tự động sẽ ném lỗi nếu phát hiện các trường nhạy cảm như `correctOption`, `answer`, `explanation`.
- `ExamAnswerKeySchema`: Lưu riêng ở bảng `exam_answer_keys` và chỉ server đọc để chấm bài.
- `ReviewAttemptResponseSchema`: Chỉ được trả về sau khi bài thi đã nộp VÀ sự kiện thi (nếu là thi đồng loạt) đã hết thời gian embargo kết quả.

### 2. Chuẩn hóa lỗi API (Error Envelope)
Tất cả endpoint tuân thủ cấu trúc envelope thống nhất:
```json
{
  "error": {
    "code": "LEASE_INVALID",
    "message": "Bài thi đang được mở ở nơi khác.",
    "details": {},
    "requestId": "req_01J..."
  }
}
```
Bao phủ 29 mã lỗi theo hợp đồng A9 và `API_V1_V4.md`. Mọi mã lỗi đều có fixture mẫu tương ứng trong `fixtures/contracts/errors.json`.

### 3. Chuẩn hóa Event Envelope và Topics
Mọi event đẩy vào Outbox và message broker tuân thủ cấu trúc:
```json
{
  "eventId": "uuid",
  "schemaVersion": 1,
  "topic": "attempt.submitted",
  "occurredAt": "UTC ISO8601",
  "actorId": "uuid-or-system",
  "tenantId": null,
  "aggregateId": "uuid",
  "aggregateVersion": 1,
  "correlationId": "request-id",
  "payload": {}
}
```
Hợp đồng JSON Schema được lưu tại `contracts/events.schema.json` hỗ trợ 23 topics nghiệp vụ chuẩn.

### 4. Cơ chế sinh Client và kiểm tra Drift
- `pnpm contracts:generate`: Đọc `contracts/openapi.yaml`, sinh typed API client vào `packages/api-client/src/index.ts` và export các kiểu dữ liệu, hàm gọi API đầy đủ cho từng endpoint.
- `pnpm contracts:check`: Kiểm tra tính toàn vẹn của OpenAPI YAML, Event JSON Schema, validate toàn bộ fixtures, và kiểm tra tính nhất quán (drift check) của generated client.
- `pnpm test:contracts`: Chạy bộ kiểm thử kiểm chứng tính hợp lệ của hợp đồng và sự phân tách DTO.

### 5. Drizzle ORM Database Contracts
Triển khai tại `apps/api/src/db/schema.ts` định nghĩa các bảng dữ liệu lõi theo hợp đồng A10 (`exam_versions`, `exam_answer_keys`, `exam_attempts`, `attempt_answer_sheets`, `attempt_events`, `user_answers`, `outbox`) và các bảng mở rộng V2-V4.
