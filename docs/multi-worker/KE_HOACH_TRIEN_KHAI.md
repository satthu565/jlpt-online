# Kế hoạch triển khai toàn bộ V1 V2 V3 V4 bằng sáu worker

Phiên bản 2.2 ngày 15/10/2026. Giữ V1–V4 và lịch 6 worker/7 ngày, thay riêng phần nhập nội dung:363 yêu cầu ứng dụng và 12 yêu cầu chuẩn bị dữ liệu do bạn tự thực hiện. Không tích hợp agent, OCR, parser PDF hoặc model trích xuất trong sản phẩm. Không dùng chỉ thị đọc PDF cũ ở nguon/. Đây là kế hoạch, chưa phải bằng chứng thực thi.

## Cách thực thi

Đọc [quy tắc](AGENTS.md), [lịch 7 ngày](KE_HOACH_7_NGAY.md), [hợp đồng](HOP_DONG_KY_THUAT.md) và [API](API_V1_V4.md). tasks.json là graph giao việc duy nhất; nguyên bản T1.x ở nguồn chỉ giúp truy vết chi tiết. Một task có thể chạy thiết kế/mock trước khi API sẵn, nhưng chỉ DONE sau kiểm tra tích hợp API thật. Không thay đổi dependencies lúc chạy để vượt gate.

## Nguyên tắc nghiệm thu

363 yêu cầu ứng dụng có test ID trong features.json;12 yêu cầu người chuẩn bị dữ liệu có externalRequirementId thay test ứng dụng. Test ID ban đầu là yêu cầu cần viết, chưa phải test tồn tại. Mỗi task bổ sung testFiles/evidence trước REVIEW. Lệnh kiểm tra dưới đây cần tạo ở F01 và task liên quan; thiếu lệnh phải FAIL. Không coi gói vượt validator là nội dung/đáp án đã được xác minh bởi con người.

## Điều phối

Mỗi worker chỉ thực hiện một task ghi tại một thời điểm. Task đủ dependencies mới được cấp; coordinator ưu tiên task mở khóa đường dài nhất rồi tới deadline. Bộ tài liệu dùng reviewer chéo trong sáu worker, không giả định có worker thứ 7. Build/E2E/review dùng semaphore toàn cục. Task blocked không được tự coi là DONE.

Điều kiện ngoài có hai loại. **Chặn bắt đầu**: coordinator chưa giao task khi thiếu. **Chặn nghiệm thu**: task vẫn được giao, code và test bằng sandbox/fixtures; chỉ PROVIDER_VERIFIED hoặc nghiệm thu của tính năng liên quan giữ BLOCKED_EXTERNAL tới khi chủ dự án cung cấp. Bằng chứng (lệnh, exit code, report) lưu ở kho evidence của coordinator/CI, không commit vào repo sản phẩm.

## Ngày 1


<a id="f01"></a>

### F01 Repo và bộ kiểm tra tối thiểu

- Worker: **W6**. Ngày mục tiêu: 1. Ước lượng chưa đo: 3 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: không. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Khởi tạo toàn bộ app/package V1–V4, Node/pnpm lock, lệnh kiểm tra; chưa phát triển tính năng.
- Bàn giao: package.json; pnpm-workspace.yaml; turbo.json; packages/config/; .github/workflows/ci.yml.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: repo-root, dependency-lock, ci-workflow.
- Điều kiện ngoài chặn bắt đầu: repo-ci, coding-vps, coding-accounts.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: apps/, packages/.
- Nghiệm thu:
  - Fresh clone cài được bằng frozen lockfile.
  - Mỗi app có health và một test smoke.
  - CI chạy lint typecheck test build; không có dịch vụ tự đọc PDF.
  - Cài sẵn và khóa phiên bản các thư viện lõi đã biết (Zod, Better Auth, Drizzle, FSRS, S3 SDK, Playwright, k6) để giảm số lần đổi lockfile về sau.
- Lệnh cần cung cấp và chạy:
  - `pnpm install --frozen-lockfile`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="f02"></a>

### F02 Chốt hợp đồng V1–V4 và fixture dùng chung

- Worker: **W1**. Ngày mục tiêu: 1. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Zod DTO, OpenAPI, JSON Schema, events; cả API admin, payment, lớp học và học tập. Không chỉ thiết kế lượt thi.
- Bàn giao: packages/schema/; packages/api-client/; contracts/openapi.yaml; contracts/events.schema.json; fixtures/contracts/.
- Hợp đồng: API, EVENTS, DB.
- Khóa tài nguyên: schema-contract, repo-root.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: package.json, pnpm-workspace.yaml.
- Nghiệm thu:
  - DTO công khai tách DTO đáp án.
  - Mọi endpoint trong API_V1_V4.md có schema và ví dụ lỗi.
  - Client sinh tự động không sai khác khi chạy lại.
- Lệnh cần cung cấp và chạy:
  - `pnpm contracts:check`
  - `pnpm contracts:generate`
  - `pnpm test:contracts`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="f03"></a>

### F03 Nền API xác thực phân quyền và email

- Worker: **W2**. Ngày mục tiêu: 1. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F02, F08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-07, ACC-10, ACC-12, NOTI-01, NOTI-02, SYS-06, SYS-07.
- Phạm vi: Better Auth, Google OAuth, email password, xác minh, reset, session và tenant guards; không tự xây crypto.
- Bàn giao: apps/api/src/common/; apps/api/src/modules/auth/; apps/api/src/modules/user/; apps/api/src/modules/email/.
- Hợp đồng: API, DB.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): google-oauth, email.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Đăng ký xác minh đăng nhập đăng xuất và reset một lần chạy thật trên Mailpit.
  - OAuth callback kiểm tra state và redirect allowlist.
  - Endpoint thiếu quyền mặc định bị từ chối; log che PII.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:auth`
  - `pnpm test:authorization`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="f04"></a>

### F04 Design system i18n layout và giao diện tài khoản

- Worker: **W3**. Ngày mục tiêu: 1. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F02, F03. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: ACC-14, EXAM-26, SYS-01, SYS-14.
- Phạm vi: Web mobile-first, UI chung, route public tĩnh, auth client mock theo contract; i18n vi ja en và theme.
- Bàn giao: apps/web/app/; apps/web/messages/; packages/ui/.
- Hợp đồng: API.
- Khóa tài nguyên: ui-contract.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Ba locale có đủ key và fallback rõ.
  - Keyboard focus và screen-reader labels hoạt động.
  - Đăng ký đăng nhập reset xác minh nối API trong F03 trước DONE.
  - F03 là dependency nghiệm thu tích hợp, không chặn thiết kế/mock ban đầu.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:web`
  - `pnpm test:i18n`
  - `pnpm test:a11y`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="f05"></a>

### F05 Khung admin và đăng nhập nhân sự

- Worker: **W4**. Ngày mục tiêu: 1. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F02, F03. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Admin navigation theo role, TOTP enrollment, recovery codes và lớp API client admin; mock chỉ dùng khi phát triển.
- Bàn giao: apps/admin/; apps/admin/messages/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Editor reviewer admin thấy đúng menu.
  - TOTP bắt buộc ở cả server và UI khi tích hợp N02.
  - Thử gọi trực tiếp API không vượt được UI guard.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:admin`
  - `pnpm test:admin-auth`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="f06"></a>

### F06 Chuẩn dữ liệu nhập và hướng dẫn chuẩn bị dữ liệu thủ công

- Worker: **W5**. Ngày mục tiêu: 1. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: PDF-06, PDF-07, PDF-08, PDF-09, PDF-10, PDF-11, PDF-12, PDF-13, PDF-14, PDF-15, PDF-16, PDF-18.
- Phạm vi: Chốt import v2, schema, gói mẫu, hướng dẫn chủ dự án; chỉ nhận dữ liệu đã chuẩn hóa, không tích hợp agent, parser hoặc model đọc PDF.
- Bàn giao: tools/import-data/; packages/content-tools/; docs/import-format/; fixtures/imports/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Schema và ví dụ có ruby bảng hình sao đáp án audio timeline.
  - Chỗ không chắc có issue blocking, không tự đoán.
  - Chủ dự án tự chuẩn bị dữ liệu rồi upload; hệ thống không gọi hoặc điều khiển agent.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:import-contracts`
  - `pnpm import:validate -- fixtures/imports/ready`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="f07"></a>

### F07 Kiểm chứng coordinator trên VPS, dev services từng worker và CI tích hợp

- Worker: **W6**. Ngày mục tiêu: 1. Ước lượng chưa đo: 3 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Coordinator được xây và kiểm thử ở ngày 0 trong repo riêng jlpt-coordinator (DAC_TA_RUNNER.md), không phải task code của worker. F07 chỉ dựng dev services tách riêng từng worker, CI tích hợp và chạy kiểm tra trên VPS trước khi bật giao việc tự động.
- Bàn giao: infra/dev/; .github/workflows/integration.yml.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: ci-workflow.
- Điều kiện ngoài chặn bắt đầu: coordinator-runtime.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Coordinator đã qua đủ 12 tình huống kiểm thử trong DAC_TA_RUNNER.md trước khi bật giao việc tự động.
  - workers check xác nhận đăng nhập CLI, quyền repo, cổng, giới hạn build/E2E và bị chặn khi đọc secret của worker khác.
  - DB, Redis, queue, storage và cổng của từng worker tách riêng.
  - Khi chưa đạt: giao task thủ công cùng định dạng assignment và log.
- Lệnh cần cung cấp và chạy:
  - `coordinator workers check`
  - `coordinator run --dry-run`
  - `pnpm infra:dev:check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="f08"></a>

### F08 Schema database và migration toàn bộ miền

- Worker: **W1**. Ngày mục tiêu: 1. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F02. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Dựng core DB và migrations mở rộng cho toàn bộ module; schema đầu tiên đủ FK/tenant/outbox; agent chuẩn bị dữ liệu không được cấp quyền DB.
- Bàn giao: apps/api/src/db/; packages/schema/fixtures/.
- Hợp đồng: DB, EVENTS.
- Khóa tài nguyên: db-migration, schema-contract.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Migrate fresh seeded rollback-code compatibility pass.
  - Có dữ liệu tự soạn N1–N5, gắn nhãn synthetic.
  - Blueprint thi thật chỉ kích hoạt khi có nguồn chính thức và xác nhận.
- Lệnh cần cung cấp và chạy:
  - `pnpm db:migrate:test`
  - `pnpm db:seed:test`
  - `pnpm test:db`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

## Ngày 2


<a id="c01"></a>

### C01 Logic thời gian chấm điểm phiếu timeline và token

- Worker: **W1**. Ngày mục tiêu: 2. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, SCORE-13, SYS-04, SYS-16.
- Phạm vi: Hàm thuần, section lock, late sync, reference scoring, WebCrypto token và validate blueprint.
- Bàn giao: packages/exam-engine/; packages/media-token/.
- Hợp đồng: API, DB.
- Khóa tài nguyên: engine-contract.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): jlpt-blueprints.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Biên deadline grace late window có test.
  - Score đúng nhưng luôn ghi tham khảo.
  - Phiếu sai số lựa chọn bị từ chối.
  - Coverage exam-engine >=90%.
  - Validate listening timeline đúng dạng import v2 (audioStartMs/audioEndMs).
  - Blueprint chính thức chỉ kích hoạt khi jlpt-blueprints được xác nhận; trước đó chỉ blueprint synthetic.
  - Blueprint synthetic trong docs/multi-worker/demo-data/blueprints/ hợp lệ với validator blueprint và dùng được cho đề demo.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:exam-engine`
  - `pnpm test:media-token`
  - `pnpm test:coverage`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="c02"></a>

### C02 Lưu trữ media nguồn license và câu hỏi có phiên bản

- Worker: **W2**. Ngày mục tiêu: 2. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F03, F08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: QB-01, QB-02, QB-03, QB-04, QB-05, QB-06, QB-07, QB-11, QB-13, QB-14, QB-15, QB-16, QB-17, ADM-05, ADM-06, ADM-19.
- Phạm vi: Storage local/R2, magic bytes range limits, immutable content versions, full CRUD question groups và license enforcement.
- Bàn giao: apps/api/src/modules/storage/; apps/api/src/modules/media/; apps/api/src/modules/question-bank/; apps/api/src/modules/license/.
- Hợp đồng: API, DB.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): r2.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Upload giả đuôi và zip-slip/bomb bị từ chối.
  - Sửa nội dung approved tạo phiên bản mới.
  - Nguồn chưa cấp quyền không xuất bản hoặc trộn.
  - Import trùng checksum idempotent.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:content`
  - `pnpm test:upload`
  - `pnpm test:storage`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="c03"></a>

### C03 Phòng thi khung câu hỏi đồng hồ và đồng bộ local

- Worker: **W3**. Ngày mục tiêu: 2. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F04, F08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: EXAM-01, EXAM-02, EXAM-03, EXAM-04, EXAM-06, EXAM-07, EXAM-08, EXAM-10, EXAM-11, EXAM-12, EXAM-13, EXAM-14, EXAM-15, EXAM-16, EXAM-17, EXAM-19, EXAM-21, EXAM-22.
- Phạm vi: RichText, IndexedDB outbox, autosave theo batch và lease; dùng contract fixtures đến khi API sẵn.
- Bàn giao: apps/web/features/exam/; packages/ui/rich-text/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Renders ruby underline star table và ảnh không XSS.
  - Debounce 3 giây max10s một request đang chờ.
  - IndexedDB ghi trước gửi; chưa ACK không báo đã lưu.
  - API giả không đủ điều kiện nghiệm thu cuối.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:exam-ui`
  - `pnpm test:sync`
  - `pnpm test:rich-text`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="c04"></a>

### C04 Admin ngân hàng câu hỏi editor RichText và blueprint

- Worker: **W4**. Ngày mục tiêu: 2. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F05, F08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: ADM-02, ADM-03, ADM-04, ADM-08.
- Phạm vi: Editor đủ thao tác theo đoạn, đáp án riêng, filter/search, source/license, preview, blueprint versions và users.
- Bàn giao: apps/admin/features/content/; apps/admin/features/users/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Tạo sửa ruby star bài đọc bảng nghe và xem trước.
  - Không sửa đè published version.
  - Admin sửa role còn editor không thể tự nâng quyền.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:admin-content`
  - `pnpm test:admin-users`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="c05"></a>

### C05 Validator gói nhập kiểm tra dữ liệu và đóng gói

- Worker: **W5**. Ngày mục tiêu: 2. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F06, F08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: PDF-21, PDF-22, PDF-23, PDF-27.
- Phạm vi: Validate JSON Schema, đáp án, nhóm đọc/nghe, references, media/checksums, archive paths, issues và idempotency; không phân tích PDF hoặc gọi AI sửa ngầm.
- Bàn giao: tools/import-data/; packages/content-tools/.
- Hợp đồng: API, DB.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): sample-rights.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Lỗi schema checksum đáp án timeline hoặc thiếu file có path cụ thể.
  - Draft có vấn đề vẫn lưu nháp nhưng bị chặn publish.
  - Ready đủ media và không issue blocking.
  - Nhập lại packageId/revision/content hash không tạo trùng; sửa nội dung có revision mới.
  - Gói demo docs/multi-worker/demo-data/demo-n5-1.zip đạt READY.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:import-contracts`
  - `pnpm test:import-validation`
  - `pnpm import:validate -- fixtures/imports/ready`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="c06"></a>

### C06 Staging production profiles CDN backup và release

- Worker: **W6**. Ngày mục tiêu: 2. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: F01, F08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: SYS-08, SYS-09, SYS-11, SYS-15, ADM-20.
- Phạm vi: Compose full small/large, R2/media Worker, Cloudflare Tunnel, WAL-G, GHCR deploy rollback; secrets qua operator. Chưa có hosting: staging tạm dựng bằng docker compose (profile small) trong GitHub Actions; cùng script deploy lên staging thật khi có hosting.
- Bàn giao: infra/; apps/media-worker/; .github/workflows/.
- Hợp đồng: API.
- Khóa tài nguyên: ci-workflow, staging-deploy.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): cloudflare, r2, hosting.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Workflow staging tạm trong GitHub Actions dựng compose profile small từ image build một lần, chạy smoke và xanh trên PR.
  - Staging độc lập dữ liệu worker.
  - Signed media check trước cache; Range206 đúng.
  - Backup PITR khôi phục trên staging tạm có RPO/RTO đo trong log CI.
  - Không build trên production.
  - Lệnh cần Docker (deploy, restore) chạy trong CI, không chạy trên VPS coding vì worker không có Docker.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:media-edge`
  - `pnpm infra:check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

## Ngày 3


<a id="n01"></a>

### N01 Thuật toán luyện và trộn tất cả chế độ

- Worker: **W1**. Ngày mục tiêu: 3. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: C01, C02. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: MIX-01, MIX-02, MIX-03, MIX-04, MIX-05, MIX-06, MIX-07, MIX-08, MIX-09, MIX-10, MIX-12, MIX-18, MIX-19, PRA-01, PRA-02, PRA-03, PRA-04, PRA-05, PRA-06, PRA-07, PRA-08, PRA-09, PRA-14, PRA-15, PRA-16.
- Phạm vi: Seeded generator Random Balanced Weakness Unseen Challenge Revision Custom, source ratios và immutable GeneratedExam.
- Bàn giao: packages/exam-engine/mix/; packages/exam-engine/practice/.
- Hợp đồng: API, DB.
- Khóa tài nguyên: engine-contract.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - 1000 property cases giữ nhóm, đúng level, không trùng, đủ tài nguyên và license.
  - Cùng seed/config/engineVersion ra cùng đề.
  - Thiếu pool trả shortage; không âm thầm sai tỷ lệ.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:mix:property`
  - `pnpm test:practice-engine`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="n02"></a>

### N02 API thi thật bảo mật và job nền

- Worker: **W2**. Ngày mục tiêu: 3. Ước lượng chưa đo: 7 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: C01, C02. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: EXAM-09, EXAM-18, EXAM-20, SYS-03, SYS-05, SYS-12, SYS-13, SYS-18, SYS-20, ADM-14.
- Phạm vi: Attempt create section/save/submit/resume/review, lease, outbox, verified-email, RBAC TOTP Turnstile rate-limit audit, media access; guest trial cookie, Turnstile/rate limits và attach guest attempts khi đăng ký.
- Bàn giao: apps/api/src/modules/attempt/; apps/api/src/modules/scoring/; apps/api/src/modules/outbox/; apps/api/src/common/.
- Hợp đồng: API, DB, EVENTS.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Seq2 trước 1 trùng seq hai tab và submit/job race đúng.
  - ACK chỉ sau commit DB.
  - Answer key không xuất hiện trước nộp.
  - TOTP Origin CSRF rate-limit audit có negative tests.
  - Guest chỉ làm đề guestTrial, attach history không chiếm attempt người khác.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:attempts`
  - `pnpm test:authorization`
  - `pnpm test:no-answer-leak`
  - `pnpm test:jobs`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="n03"></a>

### N03 Hoàn tất thi nghe khôi phục kết quả và public library

- Worker: **W3**. Ngày mục tiêu: 3. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: C03, N02, F03. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, AUDIO-05, AUDIO-06, AUDIO-07, AUDIO-10, EXAM-05, EXAM-23, EXAM-24, EXAM-25, LIB-01, LIB-02, LIB-03, LIB-04, LIB-05, LIB-06, LIB-07, LIB-08, LIB-15, SCORE-07, SCORE-08, SCORE-09, SCORE-10, SCORE-11, STAT-01.
- Phạm vi: Nối API thật; audio cache timeline speaker gate seek restriction, results review history và public listing đầy đủ filters.
- Bàn giao: apps/web/features/exam/; apps/web/features/results/; apps/web/app/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Full exam N1–N5 với fixtures phù hợp.
  - Reload audio sai số<=2s; mất mạng không mất phiếu.
  - Public HTML không PII; nhận lỗi lease rõ.
  - Có history persisted và review authorization.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:exam`
  - `pnpm test:e2e:library`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="n04"></a>

### N04 Nhập gói chuẩn đối chiếu duyệt xuất bản và audit admin

- Worker: **W4**. Ngày mục tiêu: 3. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: C04, C02, C05, B01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-17, PDF-19, PDF-20, PDF-24, PDF-25, PDF-26, PDF-28, PDF-29, PDF-30, ADM-07.
- Phạm vi: Upload một hoặc nhiều gói chuẩn có JSON đáp án ảnh audio; PDF gốc tùy chọn chỉ để đối chiếu thủ công, không trích xuất tự động; timeline editor, two-person review và publish.
- Bàn giao: apps/admin/features/import/; apps/admin/features/review/; apps/admin/features/exam/.
- Hợp đồng: API, EVENTS.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): sample-rights, prepared-import-data, jlpt-blueprints.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Upload import v2 chạy validator và tạo draft; PDF đơn lẻ không khởi động đọc file.
  - Editor không tự duyệt.
  - Publish version mới, takedown giữ version cũ.
  - JSON/CSV import/export roundtrip và source page tùy chọn mở đúng.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:import-publish`
  - `pnpm test:content-review`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="n05"></a>

### N05 NLP từ điển tagging và dữ liệu thống kê

- Worker: **W5**. Ngày mục tiêu: 3. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: C05, C02. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, DATA-19, DATA-20, DATA-21, DATA-22, DATA-23, QB-09.
- Phạm vi: Tokenizer/NLP trên RichText và JSON đã duyệt, dictionary adapter, grammar tags, normalize base form and deduplicate corpus; không đọc PDF.
- Bàn giao: packages/content-tools/nlp/; apps/api/src/modules/vocab/.
- Hợp đồng: API, DB, EVENTS.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): dictionary, sample-rights.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Từ xuất hiện trong đề khác từ được hỏi trực tiếp.
  - Frequency theo kỳ level skill nguồn và role câu.
  - Có dataset version size source date.
  - Dictionary license và attribution đầy đủ.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:nlp`
  - `pnpm test:vocab-data`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="n06"></a>

### N06 Tích hợp nội dung tới thi và kiểm thử lỗi nền

- Worker: **W6**. Ngày mục tiêu: 3. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: C06, N02, N03, N04. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Triển khai vertical slice trên staging tạm trong CI (staging thật khi có hosting); test không lộ đáp án, isolation, recovery migration và load baseline.
- Bàn giao: tests/integration/; tests/e2e/.
- Hợp đồng: API.
- Khóa tài nguyên: staging-deploy, heavy-load.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): hosting.
- Quyền ghi tạm ngoài thư mục của worker: apps/api/src/modules/exam/, apps/api/src/modules/review/, apps/api/src/modules/import/.
- Nghiệm thu:
  - Gói demo docs/multi-worker/demo-data: validate->review->publish->thi->review chạy thật trên staging tạm trong CI.
  - Cross-tenant/IDOR negative matrix pass.
  - Ghi actual load metrics; không suy ra sức chịu khi chưa đo.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:core`
  - `pnpm test:security`
  - `pnpm test:load:baseline`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="b01"></a>

### B01 API nhập gói chuẩn duyệt ghép đề và xuất bản

- Worker: **W2**. Ngày mục tiêu: 3. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: C02, C01, C05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Upload import v2 ZIP->quarantine->schema/checksum/semantic validation->draft, admin review và immutable publishing; không executor đọc PDF và không callback trích xuất.
- Bàn giao: apps/api/src/modules/import/; apps/api/src/modules/review/; apps/api/src/modules/exam/.
- Hợp đồng: API, EVENTS.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Validate trước import DB; transaction rollback không để dữ liệu dở.
  - PackageId/revision/content hash chống trùng và nhận diện conflict.
  - Editor!=reviewer; create version và outbox transaction consistent.
  - Lệnh pnpm demo:seed nạp blueprint synthetic và gói trong docs/multi-worker/demo-data/ vào DB dev qua đúng luồng import→duyệt→publish (tài khoản editor/reviewer seed khác nhau), chạy lại không tạo trùng.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:import-jobs`
  - `pnpm test:publish`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

## Ngày 4


<a id="l01"></a>

### L01 SRS độ khó dedupe và hợp đồng learning

- Worker: **W1**. Ngày mục tiêu: 4. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: N01, N05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: QB-10, QB-12, QB-19, QB-20, MIX-11, SCORE-14, STAT-09, STAT-12, STAT-13, STAT-14.
- Phạm vi: FSRS via pinned lib, question similarity, empirical difficulty, confidence/cold start and progress models.
- Bàn giao: packages/srs/; packages/exam-engine/difficulty/; packages/schema/learning/.
- Hợp đồng: API, DB.
- Khóa tài nguyên: schema-contract, engine-contract.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Lịch SRS khớp reference vectors; timezone midnight đúng.
  - Difficulty đủ mẫu mới có kết luận.
  - Báo xác suất đỗ là ước lượng chưa được hiệu chỉnh nếu thiếu dữ liệu.
  - Tag grammar/vocab luyện được.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:srs`
  - `pnpm test:difficulty`
  - `pnpm test:dedupe`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="l02"></a>

### L02 API luyện trộn giải thích và thông báo

- Worker: **W2**. Ngày mục tiêu: 4. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: N02, N01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: PRA-10, PRA-11, PRA-12, PRA-13, PRA-17, MIX-13, MIX-14, MIX-15, MIX-16, MIX-17, QB-08, QB-18, EXPL-01, EXPL-02, EXPL-03, EXPL-04, EXPL-05, EXPL-06, EXPL-07, EXPL-08, EXPL-09, EXPL-10, EXPL-12, EXPL-13, NOTI-03, NOTI-04, NOTI-05, NOTI-06, NOTI-07, NOTI-08, NOTI-09, NOTI-10, AUDIO-08, AUDIO-09.
- Phạm vi: Practice/mix CRUD/check, immutable generation, question reports/explanations moderation, notification prefs and scheduled delivery.
- Bàn giao: apps/api/src/modules/exam/; apps/api/src/modules/review/; apps/api/src/modules/notification/.
- Hợp đồng: API, DB, EVENTS.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Check chỉ trả câu đã trả lời ở practice; không mở answer key thi thật.
  - Chia sẻ đề không vượt license và owner scope.
  - Thông báo opt-out quiet hours idempotent.
  - Qbank tracks generated-exam usage.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:practice-api`
  - `pnpm test:explanations`
  - `pnpm test:notifications`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="l03"></a>

### L03 Giao diện luyện trộn chữa bài và dashboard

- Worker: **W3**. Ngày mục tiêu: 4. Ước lượng chưa đo: 7 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: N03, L02, N05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: LIB-09, LIB-10, LIB-11, LIB-12, LIB-13, LIB-14, STAT-02, STAT-03, STAT-04, STAT-05, STAT-06, STAT-07, STAT-08, STAT-10, STAT-11, SCORE-15.
- Phạm vi: Tất cả generator modes, luyện filters, shortage UX, explain approved, bookmark, transcript sync, analytics and library personalization.
- Bàn giao: apps/web/features/practice/; apps/web/features/mix/; apps/web/features/analytics/; apps/web/features/explanations/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Mỗi chế độ generator có E2E.
  - Nguồn/licensed transcript chỉ hiện theo quyền.
  - Dashboard dữ liệu tính tay đúng, không trộn câu quen với câu mới.
  - Favorite best-score attempts next recommendation có đủ UI.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:learning`
  - `pnpm test:analytics`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="l04"></a>

### L04 Payment entitlements coupons refunds và admin thương mại

- Worker: **W4**. Ngày mục tiêu: 4. Ước lượng chưa đo: 7 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: C04, N02, F08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08, PAY-09, PAY-10, PAY-11, PAY-12, ADM-15, ADM-16.
- Phạm vi: Một adapter payment thật theo lựa chọn operator, sandbox + live mode, subscriptions, refunds, coupons atomically reserved và billing UI.
- Bàn giao: apps/api/src/modules/payment/; apps/api/src/modules/entitlement/; apps/admin/features/billing/.
- Hợp đồng: API, DB, EVENTS.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): payment-provider, billing-policy.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Webhook chữ ký sai bị từ chối; lặp/out-of-order không cấp quyền sai.
  - Hoàn tiền hủy gia hạn đổi gói và tenant plans có state machine.
  - Quota AI reserve/settle/refund nguyên tử.
  - Không coi mock là live verified.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:payments`
  - `pnpm test:entitlements`
  - `pnpm test:payment-provider`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="l05"></a>

### L05 Notebook SRS learning APIs và planner

- Worker: **W5**. Ngày mục tiêu: 4. Ước lượng chưa đo: 7 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: N05, L01, N02. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: VOC-01, VOC-02, VOC-03, VOC-04, VOC-05, VOC-06, VOC-07, VOC-08, VOC-09, VOC-10, VOC-11, VOC-12, VOC-13, VOC-14, VOC-15, VOC-16, VOC-17, VOC-18, PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, PLAN-09, PLAN-10, PLAN-11, PLAN-12.
- Phạm vi: Lookup vocab kanji grammar, notebook sync, flashcard, quizzes, CSV/TTS; planner30/60/90 weak-skill adjustments and aggregate stats.
- Bàn giao: apps/api/src/modules/learning/; apps/api/src/modules/planner/; apps/api/src/modules/stats/.
- Hợp đồng: API, DB, EVENTS.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): dictionary, tts-provider.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Cross-device review duplicate không nhân đôi lịch.
  - Timezone goal dates và missed-session replanning có deterministic tests.
  - No-data readiness không bịa kết quả.
  - CSV formula injection neutralized; TTS license kiểm tra.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:learning`
  - `pnpm test:planner`
  - `pnpm test:analytics-data`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="l06"></a>

### L06 Kiểm thử learning commerce và outbox reliability

- Worker: **W6**. Ngày mục tiêu: 4. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: N06, L02, L04, L05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Tích hợp APIs learning vào staging, replay events, provider network fail, concurrency limits và account quota simulator.
- Bàn giao: tests/integration/learning/; tests/integration/billing/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Replay events không double-charge/double-count.
  - Payment signature/retry tamper cases pass.
  - Diễn tập pause/checkpoint/resume của coordinator trên task thật không mất patch: bằng chứng do người vận hành xuất từ coordinator ở docs/release/coordinator-drill-evidence.md; test của task không đọc lịch sử git hay trạng thái coordinator (worker không truy cập được coordinator).
- Lệnh cần cung cấp và chạy:
  - `pnpm test:integration:learning`
  - `pnpm test:integration:billing`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

## Ngày 5


<a id="a01"></a>

### A01 Hợp đồng lớp thi sự kiện community AI và privacy

- Worker: **W1**. Ngày mục tiêu: 5. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: L01, L04. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Review expanded schema migration, tenant isolation, AI generation labels, consent/delete and experiment event schemas.
- Bàn giao: packages/schema/; apps/api/src/db/; packages/api-client/.
- Hợp đồng: API, DB, EVENTS.
- Khóa tài nguyên: schema-contract, db-migration.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Tenant-scoped composite constraints.
  - Delete/export không phá nghĩa vụ retention chưa được phê duyệt.
  - Public events không chứa answers hay PII.
  - No schema drift.
- Lệnh cần cung cấp và chạy:
  - `pnpm contracts:check`
  - `pnpm test:db`
  - `pnpm test:contracts`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="a02"></a>

### A02 Lớp học thi sự kiện cộng đồng và quản lý tài khoản

- Worker: **W2**. Ngày mục tiêu: 5. Ước lượng chưa đo: 8 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: L02, A01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: TEA-01, TEA-02, TEA-03, TEA-04, TEA-05, TEA-06, TEA-07, TEA-08, TEA-09, TEA-10, TEA-11, TEA-12, TEA-13, GAME-06, GAME-07, GAME-08, GAME-09, ACC-06, ACC-08, ACC-09, ACC-11, ACC-13, SYS-19.
- Phạm vi: Teacher onboarding org membership invites assignments classroom analytics exports, event schedule/result release, discussions/report moderation; privacy account flows.
- Bàn giao: apps/api/src/modules/classroom/; apps/api/src/modules/community/; apps/api/src/modules/user/.
- Hợp đồng: API, DB, EVENTS.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): privacy-policy.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Teacher A không đọc học viên org B.
  - Invite expired/revoked/single-use đúng policy.
  - Event chưa kết thúc không lộ answer kể cả early submit/review.
  - Discussion chỉ sau completion và moderation.
  - Account export/delete avatar/session đầy đủ.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:classrooms`
  - `pnpm test:events`
  - `pnpm test:community`
  - `pnpm test:privacy`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="a03"></a>

### A03 UI notebook planner classroom community và gói thành viên

- Worker: **W3**. Ngày mục tiêu: 5. Ước lượng chưa đo: 8 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: L03, L05, L04, A02. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Hoàn thành web learning, flashcards planner teacher portal event lobby discussions sharing exports checkout/account settings; không để nút giả.
- Bàn giao: apps/web/features/learning/; apps/web/features/planner/; apps/web/features/classroom/; apps/web/features/community/; apps/web/features/billing/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - SRS/mobile review sync và notification settings có E2E.
  - Teacher giao đề xem progress/export và cohort privacy.
  - Coupon checkout refund status hiển thị đúng backend.
  - i18n/a11y full routes.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:advanced`
  - `pnpm test:e2e:checkout`
  - `pnpm test:a11y`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="a04"></a>

### A04 Admin đầy đủ CMS báo cáo và thử nghiệm UI

- Worker: **W4**. Ngày mục tiêu: 5. Ước lượng chưa đo: 7 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: L04, A01, N04. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: ADM-01, ADM-09, ADM-10, ADM-11, ADM-12, ADM-13, ADM-17, ADM-18, REPORT-01, REPORT-02, REPORT-03, REPORT-04, REPORT-05, REPORT-06, REPORT-07, REPORT-08, REPORT-09, REPORT-10, REPORT-11, REPORT-12, REPORT-13, REPORT-14, REPORT-15, SEO-05, SEO-09, SEO-12.
- Phạm vi: Admin explanations tags vocab reports AI moderation teacher org settings; blog/landing plans; consented product analytics experiment assignment.
- Bàn giao: apps/admin/; apps/api/src/modules/reporting/; apps/api/src/modules/cms/; apps/api/src/modules/experiment/.
- Hợp đồng: API, DB, EVENTS.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Mọi mục ADM có UI và API thật.
  - Reporting doanh thu/funnel/cohort khớp seeded dataset.
  - Markdown sanitized; experiment sticky assignment không lộ PII.
  - D7/D30 reports hiển thị insufficient-data thay số thật giả.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:admin-full`
  - `pnpm test:reporting`
  - `pnpm test:cms`
  - `pnpm test:experiments`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="a05"></a>

### A05 AI học tập câu sinh và gamification thống kê public

- Worker: **W5**. Ngày mục tiêu: 5. Ước lượng chưa đo: 8 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: L05, A01, L04. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08, AI-09, AI-10, AI-11, AI-12, AI-13, AI-14, EXPL-11, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-10, DATA-11, DATA-12, DATA-13, DATA-14, DATA-15, DATA-16, DATA-17, DATA-18, DATA-24, DATA-25, DATA-26.
- Phạm vi: AI actions all14 via paid adapter, streaming moderated scoped retrieval, weekly summaries, generated questions two-person review; streak achievements leaderboard challenge; dataset API/export recommendations.
- Bàn giao: apps/api/src/modules/ai/; apps/api/src/modules/gamification/; apps/api/src/modules/vocab/.
- Hợp đồng: API, DB, EVENTS.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): ai-provider, ai-budget.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Không nhận model-provided tool permission hoặc raw secret.
  - AI bị chặn trong active real exam và event embargo.
  - Token/cost budget atomic, failures refund reservation.
  - Generated label và approval mandatory.
  - Streak timezone anti-replay, voluntary separate leaderboards.
  - Corpus provenance và CSV/XLSX roundtrip.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:ai`
  - `pnpm test:gamification`
  - `pnpm test:dataset-export`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

## Ngày 6


<a id="a06"></a>

### A06 Tích hợp toàn bộ module và kiểm tra phạm vi hiện hành

- Worker: **W6**. Ngày mục tiêu: 6. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: A02, A03, A04, A05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Dựng staging đủ mọi route, worker background, providers, coverage by feature; generated smoke list không thay test thật.
- Bàn giao: tests/e2e/full/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - 363 yêu cầu ứng dụng có test reference;12 yêu cầu chuẩn bị bên ngoài không tính vào code coverage.
  - Không còn UI placeholder hoặc endpoint stub được tính DONE.
  - Review và CI gắn đúng headSHA/baseSHA.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:full`
  - `pnpm features:verify`
  - `pnpm test:contracts`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="v01"></a>

### V01 Race tests thuật toán dữ liệu export và schema hardening

- Worker: **W1**. Ngày mục tiêu: 6. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: A01, A05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: SCORE-12.
- Phạm vi: Repair race/isolation/serialization, exports PDF/XLSX, privacy migration; audit all engine contracts.
- Bàn giao: package.json; packages/schema/; packages/exam-engine/; packages/media-token/; packages/srs/; packages/api-client/; contracts/; fixtures/contracts/; apps/api/src/db/; docs/decisions/.
- Hợp đồng: API, DB.
- Khóa tài nguyên: db-migration, engine-contract, schema-contract.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Score report PDF có text Nhật và không chứa dữ liệu người khác.
  - Property suites và SRS/difficulty pass.
  - Migrations concurrent không chạy hai lần.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:engines:all`
  - `pnpm test:exports`
  - `pnpm test:db`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="v02"></a>

### V02 API security payment classroom event incident fixes

- Worker: **W2**. Ngày mục tiêu: 6. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: A02, A05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Independent negative tests từ W6, auth roles tenant entitlements event embargo and data retention requests.
- Bàn giao: package.json; apps/api/package.json; apps/api/src/common/; apps/api/src/modules/auth/; apps/api/src/modules/user/; apps/api/src/modules/exam/; apps/api/src/modules/attempt/; apps/api/src/modules/question-bank/; apps/api/src/modules/import/; apps/api/src/modules/media/; apps/api/src/modules/review/; apps/api/src/modules/storage/; apps/api/src/modules/license/; apps/api/src/modules/blueprint/; apps/api/src/modules/audit/; apps/api/src/modules/notification/; apps/api/src/modules/community/; apps/api/src/modules/classroom/; apps/api/src/modules/scoring/; apps/api/src/modules/outbox/; apps/api/src/modules/email/; apps/api/src/modules/admin/; apps/api/src/modules/turnstile/; apps/api/src/main.ts; apps/api/src/app.module.ts; docs/decisions/.
- Hợp đồng: API.
- Khóa tài nguyên: api-hardening.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Mọi endpoint có ownership/tenant/entitlement tests.
  - Unsafe upload path và expired URL fail.
  - Rate-limit không dùng chung namespace staging/worker.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:security`
  - `pnpm test:api:all`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="v03"></a>

### V03 UI AI thống kê SEO media và exports hoàn chỉnh

- Worker: **W3**. Ngày mục tiêu: 6. Ước lượng chưa đo: 7 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: A03, A05, A04, V01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: SEO-01, SEO-02, SEO-03, SEO-04, SEO-06, SEO-07, SEO-08, SEO-10, SEO-11, SYS-02, SYS-17.
- Phạm vi: AI chat học tập generation labels, gamification, corpus pages, PDF download/export, consent-aware analytics full SEO pages, transcript evidence và share links.
- Bàn giao: apps/web/; packages/ui/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Không có nút chức năng chưa nối API.
  - Public pages static không chứa PII, JSON-LD sitemap hreflang đúng.
  - Âm thanh TTS có fallback thông báo lỗi, không giả provider thành công.
  - Core Web Vitals instrumentation và bundle budgets.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:web-all`
  - `pnpm test:seo`
  - `pnpm test:performance`
  - `pnpm test:i18n`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="v04"></a>

### V04 Admin reconciliation vận hành và chứng từ provider

- Worker: **W4**. Ngày mục tiêu: 6. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: A04. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Đối soát payment refund, cost/corpus reports, full admin flows, backup restore UI chỉ gọi operator job được phép.
- Bàn giao: apps/admin/; apps/api/src/modules/reporting/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): payment-provider.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Webhook/live readiness có bằng chứng riêng sandbox.
  - Admin backup không giữ raw secrets trong browser.
  - Mọi action audit có actor và tenant.
  - Report CSV escaping và revenue rounding đúng.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:admin-all`
  - `pnpm test:reconciliation`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="v05"></a>

### V05 Đối chiếu dữ liệu nhập AI thật và học tập E2E

- Worker: **W5**. Ngày mục tiêu: 6. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: A05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Kiểm thử gói do người chuẩn bị dữ liệu chuẩn bị, dữ liệu thiếu và sửa revision; actual learning AI/dictionary/TTS tests, statistical cold start và learning workflows.
- Bàn giao: tools/import-data/; packages/content-tools/; apps/api/src/modules/ai/; apps/api/src/modules/learning/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): prepared-import-data, ai-provider, dictionary, tts-provider, sample-rights.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Gói chuẩn giữ đúng ruby bảng sao audio đáp án qua import và snapshot không lộ đáp án.
  - Provider học tập chưa có credential phải BLOCKED_EXTERNAL.
  - Sinh câu qua moderation đến làm bài.
  - Data tests phân biệt observed và synthetic.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:import-validation`
  - `pnpm test:providers:live`
  - `pnpm test:learning:all`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="v06"></a>

### V06 Full regression load accessibility security và restore

- Worker: **W6**. Ngày mục tiêu: 6. Ước lượng chưa đo: 8 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: L06, A06, V02, V03, V04, V05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: SYS-10.
- Phạm vi: Chromium WebKit Firefox; device operator, k6 stepped load, ZAP/CodeQL/deps, backup restore cold deploy rollback.
- Bàn giao: tests/; infra/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: staging-deploy, heavy-load.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): device-test, hosting.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Record target and observed capacity separately.
  - RPO<=5min RTO<=1h có timestamps từ job restore trong CI.
  - No P0/P1 accepted silently.
  - Load generator tách khỏi target; không đo sức chịu bằng VPS đang build.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:all-browsers`
  - `pnpm test:security`
  - `pnpm test:load`
  - `pnpm test:a11y`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

## Ngày 7


<a id="r01"></a>

### R01 Chốt hợp đồng logic và migration

- Worker: **W1**. Ngày mục tiêu: 7. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: V01, V06. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Sửa mọi lỗi nghiệm thu thuộc363 yêu cầu ứng dụng hiện hành;12 yêu cầu chuẩn bị dữ liệu thủ công báo riêng, không dựng lại chức năng đọc PDF.
- Bàn giao: package.json; packages/schema/; packages/exam-engine/; packages/media-token/; packages/srs/; packages/api-client/; contracts/; fixtures/contracts/; apps/api/src/db/; docs/decisions/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Review chéo trên đúng commit.
  - Không còn P0/P1 cho code acceptance.
  - Feature evidence truy ngược được tới commit và lệnh.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:engines:all`
  - `pnpm contracts:check`
  - `pnpm test:db`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="r02"></a>

### R02 Sửa lỗi API và xác nhận dữ liệu quyền

- Worker: **W2**. Ngày mục tiêu: 7. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: V02, V06. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Sửa mọi lỗi nghiệm thu thuộc363 yêu cầu ứng dụng hiện hành;12 yêu cầu chuẩn bị dữ liệu thủ công báo riêng, không dựng lại chức năng đọc PDF.
- Bàn giao: package.json; apps/api/package.json; apps/api/src/common/; apps/api/src/modules/auth/; apps/api/src/modules/user/; apps/api/src/modules/exam/; apps/api/src/modules/attempt/; apps/api/src/modules/question-bank/; apps/api/src/modules/import/; apps/api/src/modules/media/; apps/api/src/modules/review/; apps/api/src/modules/storage/; apps/api/src/modules/license/; apps/api/src/modules/blueprint/; apps/api/src/modules/audit/; apps/api/src/modules/notification/; apps/api/src/modules/community/; apps/api/src/modules/classroom/; apps/api/src/modules/scoring/; apps/api/src/modules/outbox/; apps/api/src/modules/email/; apps/api/src/modules/admin/; apps/api/src/modules/turnstile/; apps/api/src/main.ts; apps/api/src/app.module.ts; docs/decisions/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Review chéo trên đúng commit.
  - Không còn P0/P1 cho code acceptance.
  - Feature evidence truy ngược được tới commit và lệnh.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:api:all`
  - `pnpm test:security`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="r03"></a>

### R03 Sửa lỗi web và kiểm tra thiết bị thật

- Worker: **W3**. Ngày mục tiêu: 7. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: V03, V06. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Sửa mọi lỗi nghiệm thu thuộc363 yêu cầu ứng dụng hiện hành;12 yêu cầu chuẩn bị dữ liệu thủ công báo riêng, không dựng lại chức năng đọc PDF.
- Bàn giao: apps/web/; packages/ui/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): device-test.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Review chéo trên đúng commit.
  - Không còn P0/P1 cho code acceptance.
  - Feature evidence truy ngược được tới commit và lệnh.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:web-all`
  - `pnpm test:a11y`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="r04"></a>

### R04 Chốt admin payment và báo cáo

- Worker: **W4**. Ngày mục tiêu: 7. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: V04, V06. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Sửa mọi lỗi nghiệm thu thuộc363 yêu cầu ứng dụng hiện hành;12 yêu cầu chuẩn bị dữ liệu thủ công báo riêng, không dựng lại chức năng đọc PDF.
- Bàn giao: apps/admin/; apps/api/src/modules/payment/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Review chéo trên đúng commit.
  - Không còn P0/P1 cho code acceptance.
  - Feature evidence truy ngược được tới commit và lệnh.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:admin-all`
  - `pnpm test:payments`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="r05"></a>

### R05 Chốt dữ liệu nhập AI learning và dữ liệu

- Worker: **W5**. Ngày mục tiêu: 7. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: V05, V06. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Sửa mọi lỗi nghiệm thu thuộc363 yêu cầu ứng dụng hiện hành;12 yêu cầu chuẩn bị dữ liệu thủ công báo riêng, không dựng lại chức năng đọc PDF.
- Bàn giao: tools/import-data/; packages/content-tools/; apps/api/src/modules/ai/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Review chéo trên đúng commit.
  - Không còn P0/P1 cho code acceptance.
  - Feature evidence truy ngược được tới commit và lệnh.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:import-validation`
  - `pnpm test:learning:all`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="r06"></a>

### R06 Nghiệm thu phạm vi hiện hành và bàn giao toàn bộ

- Worker: **W6**. Ngày mục tiêu: 7. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: R01, R02, R03, R04, R05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Chạy final release candidate, đối chiếu matrix, ghi separate code/provider/release acceptance; owner quyết định production.
- Bàn giao: docs/release/BAO_CAO_NGAY_7.md; docs/release/feature-evidence.json; docs/release/release-decision.md; docs/runbooks/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: staging-deploy.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): hosting.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - 363 yêu cầu ứng dụng chỉ DONE khi đủ evidence;12 yêu cầu chuẩn bị bên ngoài báo riêng.
  - Thiếu yêu cầu trong phạm vi hiện hành => TARGET_NOT_MET.
  - Chưa beta14 ngày/payment30 ngày không ghi đạt.
  - Runbooks deploy rollback restore handover tái hiện được.
- Lệnh cần cung cấp và chạy:
  - `pnpm features:verify`
  - `pnpm test:release`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

## Ngày 8


<a id="i00"></a>

### I00 Hạ tầng kiểm thử tích hợp giao diện với API thật

- Worker: **W6**. Ngày mục tiêu: 8. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: R06. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Staging CI chạy web và admin build với NEXT_PUBLIC_API_URL=/api/v1 sau reverse proxy cùng origin (giống bản demo trên jlpt-vm), thêm Mailpit; bộ Playwright E2E tích hợp dùng chung; lệnh pnpm check:no-mock-ui quét apps/web và apps/admin tìm dữ liệu viết cứng/mock và so với baseline. Baseline ban đầu liệt kê đúng các route đang vi phạm; CI fail khi xuất hiện vi phạm mới ngoài baseline.
- Bàn giao: infra/; .github/; tests/; package.json; docs/runbooks/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: ci-workflow, staging-deploy.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Staging CI dựng web, admin, API, Postgres, Redis, Mailpit; web và admin gọi API qua /api/v1 cùng origin.
  - pnpm test:e2e:integration chạy Playwright thật trên staging CI; có fixture đăng ký qua Mailpit và tài khoản staff seed có mật khẩu và TOTP.
  - pnpm check:no-mock-ui phát hiện được mảng mẫu, ALL_SAMPLE, đăng nhập giả; baseline tests/integration/mock-ui-baseline.json liệt kê từng route vi phạm hiện có.
  - Runbook docs/runbooks/demo-environment.md mô tả dựng bản demo đầy đủ bằng compose.
- Lệnh cần cung cấp và chạy:
  - `pnpm check:no-mock-ui`
  - `pnpm test:e2e:integration -- --list`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i01"></a>

### I01 API bổ sung cho giao diện quản trị và luồng thi thật

- Worker: **W2**. Ngày mục tiêu: 8. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: R06. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Đối chiếu từng trang apps/admin và apps/web với API_V1_V4.md; bổ sung endpoint còn thiếu trong module W2 (admin, auth, user, exam, attempt, question-bank, import, review, media, notification, community, classroom). Sửa các lỗi tích hợp đã thấy trên bản demo: đăng ký trả 500 khi SMTP lỗi (phải gửi qua outbox, đăng ký vẫn thành công); link xác minh email phải trỏ tới trang web có thật; snapshotUrl của lượt thi phải tải được trên staging và bản demo khi chưa có CDN (phục vụ qua API cùng origin, kiểm token).
- Bàn giao: package.json; apps/api/package.json; apps/api/src/common/; apps/api/src/modules/auth/; apps/api/src/modules/user/; apps/api/src/modules/exam/; apps/api/src/modules/attempt/; apps/api/src/modules/question-bank/; apps/api/src/modules/import/; apps/api/src/modules/media/; apps/api/src/modules/review/; apps/api/src/modules/storage/; apps/api/src/modules/license/; apps/api/src/modules/blueprint/; apps/api/src/modules/audit/; apps/api/src/modules/notification/; apps/api/src/modules/community/; apps/api/src/modules/classroom/; apps/api/src/modules/scoring/; apps/api/src/modules/outbox/; apps/api/src/modules/email/; apps/api/src/modules/admin/; apps/api/src/modules/turnstile/; apps/api/src/main.ts; apps/api/src/app.module.ts; docs/decisions/.
- Hợp đồng: API.
- Khóa tài nguyên: api-hardening.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Đăng ký vẫn trả 201 khi SMTP không kết nối được; email gửi lại qua outbox và có test.
  - Link trong email xác minh và đặt lại mật khẩu mở đúng trang web và hoàn tất được.
  - Lượt thi trên staging tải được snapshot, audio Range 206 và nộp bài, không phụ thuộc domain media.jlpt.local.
  - Danh sách endpoint admin cần cho từng trang (users, audit, exams, questions, imports, reviews, blueprints, media, vocab, moderation, notifications, org) có trong API, có phân quyền và test.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:api:all`
  - `pnpm test:security`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i08"></a>

### I08 API xác thực hai bước (TOTP) cho nhân sự

- Worker: **W2**. Ngày mục tiêu: 8. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Bổ sung trong module auth: đăng ký TOTP cho nhân sự (sinh secret lưu mã hóa theo user, trả otpauth URI), xác nhận đăng ký bằng mã 6 số, thử thách TOTP sau khi đăng nhập mật khẩu (session chỉ đánh dấu twoFactorVerified khi mã đúng), mã khôi phục dùng một lần lưu dạng hash, tắt/đặt lại 2FA có audit. Sửa TotpGuard: bỏ secret mặc định viết cứng (JBSWY3DPEHPK3PXP và TOTP_TEST_SECRET ở production), kiểm tra theo secret của chính user và cờ twoFactorVerified của session; route /admin bắt buộc với nhân sự. Seed staging có tài khoản nhân sự với secret biết trước cho E2E.
- Bàn giao: package.json; apps/api/package.json; apps/api/src/common/; apps/api/src/modules/auth/; apps/api/src/modules/user/; apps/api/src/modules/exam/; apps/api/src/modules/attempt/; apps/api/src/modules/question-bank/; apps/api/src/modules/import/; apps/api/src/modules/media/; apps/api/src/modules/review/; apps/api/src/modules/storage/; apps/api/src/modules/license/; apps/api/src/modules/blueprint/; apps/api/src/modules/audit/; apps/api/src/modules/notification/; apps/api/src/modules/community/; apps/api/src/modules/classroom/; apps/api/src/modules/scoring/; apps/api/src/modules/outbox/; apps/api/src/modules/email/; apps/api/src/modules/admin/; apps/api/src/modules/turnstile/; apps/api/src/main.ts; apps/api/src/app.module.ts; docs/decisions/.
- Hợp đồng: API.
- Khóa tài nguyên: api-hardening.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Mã sai, mã cũ, mã khôi phục đã dùng hoặc không tồn tại đều bị API từ chối; lỗi DB không bao giờ cho qua.
  - Không còn secret TOTP mặc định trong code chạy thật.
  - Test API cho đăng ký, thử thách, mã khôi phục, khóa sau nhiều lần sai; E2E đăng nhập nhân sự qua API trên staging.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:auth`
  - `pnpm test:security`
  - `pnpm test:api:all`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i02"></a>

### I02 Đăng nhập nhân sự thật và khung quản trị nối API

- Worker: **W4**. Ngày mục tiêu: 8. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I00, I08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Bỏ đăng nhập giả trong apps/admin/lib/auth-context.tsx: đăng nhập email mật khẩu, TOTP enrollment/challenge và recovery codes qua API của I08 (không tự viết xác thực trong module khác, không giữ chế độ offline giả lập); session, đăng xuất, guard theo role từ server. Trang tổng quan, người dùng, audit log, cài đặt (org, thông báo, backup) lấy dữ liệu từ API.
- Bàn giao: apps/admin/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - Sai mật khẩu hoặc sai TOTP bị từ chối bởi API, không chỉ ở UI.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
  - Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền.
  - E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang; class Tailwind phải có tác dụng (PR #53 đã cài Tailwind), không để chữ dính liền hay nội dung dính mép; không hiện key dịch thô (ví dụ account.profile.title trên /tai-khoan), E2E kiểm tra cả ba locale vi ja en.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:admin`
  - `pnpm check:no-mock-ui`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i09"></a>

### I09 Đăng nhập nhân sự thật và khung quản trị nối API (làm lại I02)

- Worker: **W4**. Ngày mục tiêu: 8. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I00, I08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: I02 bị hủy vì còn xác thực giả (confirm2faSetup nhận mọi mã 6 số, session tạo phía client, gọi API khác thay khi 404); phần nối API của các trang người dùng/audit/cài đặt trong nhánh task/I02 có thể tham khảo nhưng phải rà lại. Bỏ đăng nhập giả trong apps/admin/lib/auth-context.tsx: đăng nhập email mật khẩu, TOTP enrollment/challenge và recovery codes qua API của I08 (không tự viết xác thực trong module khác, không giữ chế độ offline giả lập); session, đăng xuất, guard theo role từ server. Trang tổng quan, người dùng, audit log, cài đặt (org, thông báo, backup) lấy dữ liệu từ API.
- Bàn giao: apps/admin/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - Sai mật khẩu hoặc sai TOTP bị từ chối bởi API, không chỉ ở UI.
  - Mọi bước đăng nhập, đăng ký TOTP, thử thách và mã khôi phục gọi API của I08; cấm đường tắt cho test, cấm tạo session phía client, cấm chấp nhận mã khi API 404 hoặc lỗi.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
  - Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền.
  - E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang; class Tailwind phải có tác dụng (PR #53 đã cài Tailwind), không để chữ dính liền hay nội dung dính mép; không hiện key dịch thô (ví dụ account.profile.title trên /tai-khoan), E2E kiểm tra cả ba locale vi ja en.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:admin`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i03"></a>

### I03 Quản trị nội dung nối API: nhập gói, câu hỏi, đề, duyệt, media

- Worker: **W4**. Ngày mục tiêu: 8. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I09. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Các trang imports, questions, exams (kể cả đề trộn), blueprints, reviews (duyệt 4 mắt, giải thích), media, vocab, cms, moderation AI, reports/content gọi API thật; luồng nhập gói demo-data -> duyệt -> xuất bản làm được hoàn toàn qua giao diện quản trị. Lưu ý khi làm lại (lượt 4 trượt staging E2E): (1) nút Xuất bản báo "Body cannot be empty when content-type is set to 'application/json'" vì apps/admin/lib/api-client.ts luôn gửi Content-Type: application/json kể cả khi không có body (publishExam, unpublish, approve...); chỉ đặt Content-Type khi có body, hoặc gửi body {}; kiểm tra mọi lời gọi POST/PUT/PATCH không body. (2) Test đăng nhập nhân sự chạy song song trên nhiều trình duyệt dùng chung tài khoản nên API từ chối mã TOTP đã dùng ("Mã TOTP đã được sử dụng"); trong tests/playwright/fixtures/staff-auth.fixture.ts, khi gặp lỗi này thì chờ sang khung 30 giây kế tiếp rồi thử lại với mã mới (không tắt kiểm tra chống dùng lại mã ở API). (3) Không sửa package.json gốc, không đổi TMPDIR, không sửa file ngoài apps/admin/ và phần được cấp.
- Bàn giao: apps/admin/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - Editor nhập gói docs/multi-worker/demo-data qua giao diện, reviewer khác duyệt, xuất bản; đề hiện ở trang thư viện đề của web.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
  - Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền.
  - E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang; class Tailwind phải có tác dụng (PR #53 đã cài Tailwind), không để chữ dính liền hay nội dung dính mép; không hiện key dịch thô (ví dụ account.profile.title trên /tai-khoan), E2E kiểm tra cả ba locale vi ja en.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:admin`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i04"></a>

### I04 Quản trị thương mại, báo cáo, thử nghiệm nối API

- Worker: **W4**. Ngày mục tiêu: 8. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I09. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Các trang commercial (payments, plans, refunds, reconciliation), reports (tổng quan, doanh thu), experiments gọi API thật; sửa endpoint trong module payment, entitlement, reporting, cms, experiment nếu thiếu. Lưu ý khi làm lại (lượt 4 trượt staging E2E, 34 test đạt, 2 trượt): (1) tests/playwright/integration.spec.ts:877 dùng locator [data-testid^="experiment-card-"], [data-testid="experiments-empty"] khớp nhiều thẻ nên Playwright báo strict mode violation; dùng .first() hoặc kiểm tra số thẻ, không nới lỏng điều kiện kiểm tra dữ liệu thật. (2) Lỗi mã TOTP dùng lại khi đăng nhập nhân sự song song: trong tests/playwright/fixtures/staff-auth.fixture.ts, gặp "Mã TOTP đã được sử dụng" thì chờ sang khung 30 giây kế tiếp rồi thử lại với mã mới (nếu I03 đã sửa trên main thì giữ bản của main). (3) Lỗi 500 ở /api/v1/datasets/jlpt-official/* không thuộc I04 nếu trang quản trị của I04 không gọi; không sửa module ngoài danh sách trên.
- Bàn giao: apps/admin/; apps/api/src/modules/payment/; apps/api/src/modules/entitlement/; apps/api/src/modules/reporting/; apps/api/src/modules/cms/; apps/api/src/modules/experiment/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - Gói, giao dịch sandbox, hoàn tiền và đối soát hiển thị dữ liệu thật từ API.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
  - Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền.
  - E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang; class Tailwind phải có tác dụng (PR #53 đã cài Tailwind), không để chữ dính liền hay nội dung dính mép; không hiện key dịch thô (ví dụ account.profile.title trên /tai-khoan), E2E kiểm tra cả ba locale vi ja en.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:admin`
  - `pnpm test:payments`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i05"></a>

### I05 Web: thư viện đề, phòng thi, kết quả, lịch sử nối API thật

- Worker: **W3**. Ngày mục tiêu: 8. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I00. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Thư viện đề (de-thi, trang SEO theo cấp) và phòng thi lấy đề đã xuất bản từ API, bỏ ALL_SAMPLE_EXAMS; bắt đầu lượt, tải snapshot, lưu tự động, chuyển phần, nộp, xem kết quả, lịch sử, chia sẻ kết quả qua API; khách làm thử đề guest_trial.
- Bàn giao: apps/web/; packages/ui/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - Học viên đăng ký qua Mailpit, xác minh, làm trọn đề demo N5 đã xuất bản và xem điểm trên staging CI.
  - Khách làm thử được đề guest_trial, đề khác yêu cầu đăng nhập.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
  - Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền.
  - E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang; class Tailwind phải có tác dụng (PR #53 đã cài Tailwind), không để chữ dính liền hay nội dung dính mép; không hiện key dịch thô (ví dụ account.profile.title trên /tai-khoan), E2E kiểm tra cả ba locale vi ja en.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:web`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i06"></a>

### I06 Web: học tập, kế hoạch, lớp học, cộng đồng, gói thành viên nối API

- Worker: **W3**. Ngày mục tiêu: 8. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I00. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Các trang so-tay, ke-hoach, luyen-tap, thong-ke, tu-vung/ngu-phap/thong-ke-tu-vung, lop-hoc, su-kien, thao-luan, goi-thanh-vien, tai-khoan, faq gọi API thật (module W5 learning/planner/stats/vocab/gamification/ai, W2 community/classroom, W4 entitlement).
- Bàn giao: apps/web/; packages/ui/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - Mỗi trang trong phạm vi hiển thị dữ liệu của chính học viên đăng nhập, ghi được thay đổi và tải lại vẫn còn.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
  - Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền.
  - E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang; class Tailwind phải có tác dụng (PR #53 đã cài Tailwind), không để chữ dính liền hay nội dung dính mép; không hiện key dịch thô (ví dụ account.profile.title trên /tai-khoan), E2E kiểm tra cả ba locale vi ja en.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:web`
  - `pnpm check:no-mock-ui`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i10"></a>

### I10 Bỏ tự tạo tài khoản nhân sự khi API khởi động

- Worker: **W2**. Ngày mục tiêu: 8. Ước lượng chưa đo: 3 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: AuthService.onModuleInit đang tự tạo 5 tài khoản nhân sự (kể cả admin) với mật khẩu Admin123456! và secret TOTP cố định mỗi khi NODE_ENV khác production: một cửa hậu nếu máy chủ thật cấu hình thiếu biến. Gỡ hẳn việc tạo tài khoản khỏi code chạy thật (onModuleInit, service); tài khoản nhân sự demo chỉ được tạo bởi script seed chạy tay cho staging/demo (demo-seed hoặc tests/fixtures) và script đó từ chối chạy khi APP_ENV=production. Không còn mật khẩu hay secret TOTP viết cứng trong apps/api/src ngoài file test và script seed.
- Bàn giao: package.json; apps/api/package.json; apps/api/src/common/; apps/api/src/modules/auth/; apps/api/src/modules/user/; apps/api/src/modules/exam/; apps/api/src/modules/attempt/; apps/api/src/modules/question-bank/; apps/api/src/modules/import/; apps/api/src/modules/media/; apps/api/src/modules/review/; apps/api/src/modules/storage/; apps/api/src/modules/license/; apps/api/src/modules/blueprint/; apps/api/src/modules/audit/; apps/api/src/modules/notification/; apps/api/src/modules/community/; apps/api/src/modules/classroom/; apps/api/src/modules/scoring/; apps/api/src/modules/outbox/; apps/api/src/modules/email/; apps/api/src/modules/admin/; apps/api/src/modules/turnstile/; apps/api/src/main.ts; apps/api/src/app.module.ts; docs/decisions/.
- Hợp đồng: API.
- Khóa tài nguyên: api-hardening.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - API khởi động với mọi NODE_ENV không tạo hay sửa tài khoản nào; có test kiểm tra.
  - Script seed staging từ chối chạy khi APP_ENV=production.
  - grep mật khẩu/secret mặc định trong apps/api/src (trừ test và seed) không còn kết quả.
  - E2E staff login trên staging vẫn pass vì staging chạy seed.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:auth`
  - `pnpm test:security`
  - `pnpm test:api:all`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i11"></a>

### I11 Sửa lỗi 500 do mã viết cứng ở từ vựng, ngữ pháp, thảo luận

- Worker: **W3**. Ngày mục tiêu: 8. Ước lượng chưa đo: 3 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I06. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Trên bản demo sau I06: /tu-vung và /ngu-phap gọi /api/v1/datasets/jlpt-official/* và /thao-luan gọi /api/v1/questions/q-default-1/discussions, đều trả 500 vì id không phải UUID; /tu-vung vẫn hiện thẻ từ vựng viết sẵn khi API lỗi. Web: lấy id thật từ API (danh sách dataset, câu hỏi thật), bỏ mọi thẻ hoặc id viết cứng. API: kiểm tra định dạng id ở các route có tham số id (pipe/validator chung), id sai định dạng trả 400 hoặc 404, không bao giờ 500.
- Bàn giao: apps/web/; packages/ui/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: apps/api/src/modules/vocab/, apps/api/src/modules/community/, apps/api/src/common/pipes/, tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - Ba trang trên không còn request API trả 5xx khi đăng nhập học viên demo trên staging.
  - Route API nhận id sai định dạng trả 400/404, có test.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:web`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i12"></a>

### I12 Phiên đăng nhập đọc được cookie: không mất đăng nhập khi tải lại trang

- Worker: **W2**. Ngày mục tiêu: 8. Ước lượng chưa đo: 2 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I08. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Đăng nhập đặt cookie auth_token (HttpOnly). Các route /me/* đọc cookie này, nhưng GET /api/v1/auth/session chỉ đọc header Bearer nên trả {"user":null} khi trình duyệt chỉ gửi cookie; web tưởng đã đăng xuất sau mỗi lần tải lại hoặc chuyển trang. Sửa để /auth/session và mọi guard dùng cùng một cách lấy phiên (cookie hoặc Bearer), đăng xuất xóa cookie.
- Bàn giao: package.json; apps/api/package.json; apps/api/src/common/; apps/api/src/modules/auth/; apps/api/src/modules/user/; apps/api/src/modules/exam/; apps/api/src/modules/attempt/; apps/api/src/modules/question-bank/; apps/api/src/modules/import/; apps/api/src/modules/media/; apps/api/src/modules/review/; apps/api/src/modules/storage/; apps/api/src/modules/license/; apps/api/src/modules/blueprint/; apps/api/src/modules/audit/; apps/api/src/modules/notification/; apps/api/src/modules/community/; apps/api/src/modules/classroom/; apps/api/src/modules/scoring/; apps/api/src/modules/outbox/; apps/api/src/modules/email/; apps/api/src/modules/admin/; apps/api/src/modules/turnstile/; apps/api/src/main.ts; apps/api/src/app.module.ts; docs/decisions/.
- Hợp đồng: API.
- Khóa tài nguyên: api-hardening.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, apps/admin/lib/.
- Nghiệm thu:
  - E2E: học viên đăng nhập, tải lại trang, chuyển sang /so-tay và /lop-hoc vẫn ở trạng thái đã đăng nhập; đăng xuất rồi tải lại thì về trạng thái khách.
  - E2E admin: nhân sự đăng nhập bằng mật khẩu và TOTP, tải lại trang hoặc mở thẳng /users vẫn ở trạng thái đã đăng nhập (sau I09, admin gọi /auth/session với Bearer nhận user null và hiện "Phiên làm việc đã hết hạn").
  - Test API: /auth/session trả user khi chỉ có cookie hợp lệ, trả null khi cookie sai hoặc hết hạn.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:auth`
  - `pnpm test:security`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i13"></a>

### I13 Web: trang Luyện tập và Đề trộn nối API thật

- Worker: **W3**. Ngày mục tiêu: 8. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Trang /luyen-tap vẫn import ALL_SAMPLE_EXAMS từ apps/web/features/exam/fixtures (I06 bỏ sót). Nối luyện tập theo kỹ năng, dạng 問題, số câu, câu sai/chưa gặp/đã đánh dấu, độ khó, tiếp tục bài dở (PRA) và tạo, lưu, làm lại, chia sẻ đề trộn (MIX) với API thật; xóa file fixtures khỏi code chạy thật (chỉ giữ trong test nếu cần).
- Bàn giao: apps/web/; packages/ui/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - Học viên tạo bài luyện 10 câu theo bộ lọc, làm, xem đáp án ngay và tiếp tục bài dở trên staging.
  - Học viên tạo đề trộn từ hai kỳ thi, làm và chia sẻ link; người nhận mở được.
  - apps/web không còn import exam-fixtures ngoài thư mục test.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
  - Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền.
  - E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang; class Tailwind phải có tác dụng (PR #53 đã cài Tailwind), không để chữ dính liền hay nội dung dính mép; không hiện key dịch thô (ví dụ account.profile.title trên /tai-khoan), E2E kiểm tra cả ba locale vi ja en.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:web`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i14"></a>

### I14 API: sửa lỗi 500 ở /api/v1/datasets/jlpt-official/*

- Worker: **W5**. Ngày mục tiêu: 8. Ước lượng chưa đo: 2 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Trên staging, GET /api/v1/datasets/jlpt-official/trends, /vocabulary, /grammar, /compare/levels trả 500 ("Failed query: select id, name, version, license_id ..."): bảng hoặc migration của dataset không khớp schema. Trang thống kê tần suất của web (apps/web/features/corpus) gọi các API này. Tìm nguyên nhân (thiếu migration, thiếu cột, thiếu dữ liệu seed), sửa để trả dữ liệu thật hoặc danh sách rỗng hợp lệ khi chưa có dataset; không trả 500.
- Bàn giao: apps/api/src/modules/vocab/; apps/api/src/db/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: apps/api/src/db/, tests/playwright/.
- Nghiệm thu:
  - Trên staging sau khi seed demo, cả 4 API trên trả 200 với dữ liệu thật hoặc rỗng hợp lệ.
  - Test API cho trường hợp chưa có dataset và đã có dataset.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
- Lệnh cần cung cấp và chạy:
  - `pnpm test`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i15"></a>

### I15 Quản trị: phiên hết hạn phải đưa về trang đăng nhập

- Worker: **W4**. Ngày mục tiêu: 8. Ước lượng chưa đo: 2 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I03, I12. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Sau I03, apps/admin/lib/auth-context.tsx không xóa phiên lưu trong trình duyệt khi GET /api/v1/auth/session trả 200 với user = null (phiên hết hạn hoặc đã đăng xuất ở nơi khác), nên giao diện vẫn hiện như đã đăng nhập trong khi mọi API trả 401. Xử lý: user null hoặc API trả 401 thì xóa phiên và đưa về /login kèm thông báo; bỏ móc test window.__setAdminLocale và DEFAULT_AUTH_CONTEXT giả nếu không cần (useAdminAuth ngoài provider phải báo lỗi rõ). Lưu ý khi làm lại (lượt 3 trượt staging, Chromium đạt hết, Mobile Safari trượt 14 test): E2E I15 chờ locator ghép main/page-title/header/h1 kèm .first(), nhưng trên điện thoại phần tử đầu tiên là h1 Hệ thống Quản trị JLPT nằm trong thanh menu đang ẩn, nên toBeVisible thất bại dù trang đã đăng nhập đúng. Dùng getByRole main hoặc heading/data-testid riêng trong main, không dùng selector ghép kèm .first(). Kiểm tra lại các E2E quản trị khác trên Mobile Safari sau khi sửa. Lưu ý lượt chạy lại (PR #75 trượt CI 19/10, main vẫn đạt): admin-nav.tsx thêm "invisible md:visible pointer-events-none" cho thanh menu khi đóng trên điện thoại, nên mọi phần tử trong thanh menu (staff-profile-badge, page-title...) bị ẩn thật; các E2E I03/I04 có sẵn (integration.spec.ts dòng ~1572, ~2008, ~2157, ~2201) dùng locator ghép kèm .first() chọn trúng phần tử ẩn đó và trượt trên Mobile Safari và Mobile Chrome. Bỏ thay đổi invisible/pointer-events đó (không thuộc phạm vi I15), hoặc sửa các locator ghép trong integration.spec.ts sang .filter({ visible: true }).first() hoặc locator trong main. Ba E2E I09 trên Firefox (dòng ~1068, ~1117, ~1162: login-error-alert, waitForURL) cũng trượt: chạy lại với --project=firefox và sửa. CI chạy đủ 5 trình duyệt, còn kiểm tra trên jlpt-vm chỉ chạy 3, nên tự chạy E2E quản trị trên cả Mobile Chrome (Pixel 7) và Firefox trước khi nộp.
- Bàn giao: apps/admin/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - E2E: đăng nhập nhân sự, tải lại trang vẫn đăng nhập.
  - E2E: xóa phiên phía máy chủ (đăng xuất ở tab khác) rồi tải lại hoặc thao tác thì về trang đăng nhập.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:admin`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i16"></a>

### I16 Nhập gói đề ở chế độ nháp (DRAFT_ONLY) qua API và trang quản trị

- Worker: **W2**. Ngày mục tiêu: 8. Ước lượng chưa đo: 3 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I03. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: import.controller.ts không truyền mode nên import.service luôn kiểm tra ở chế độ ready và từ chối gói có issue blocking, trái với docs/import-format/README.md (DRAFT_ONLY được lưu nháp, chặn xuất bản). Cho POST /api/v1/admin/imports nhận mode=draft|ready (multipart field và JSON body), mặc định ready; gói DRAFT_ONLY lưu thành bản nháp kèm danh sách issue, không vào hàng duyệt/xuất bản cho tới khi nạp lại bản ready cùng packageId với revision cao hơn. Trang nhập gói của quản trị có lựa chọn "Nạp bản nháp", hiện trạng thái DRAFT_ONLY và từng issue (mức độ, đường dẫn, lý do). Xuất bản đề từ bản nháp phải bị chặn ở API. Ghi chú của người vận hành (19/10, sau review lần 3): chặn bản nháp cần sửa exam.service.ts và review.service.ts, nên các file này nằm trong phạm vi I16. Sửa gte() trong attempt.service.ts (truy vấn lượt làm bài 24 giờ của khách) cũng giữ lại: đó là lỗi 500 thật khi khách bắt đầu làm bài, cần cho staging đạt. Parser body trong main.ts phải có giới hạn kích thước ngay trong I16: một addContentTypeParser chung với { parseAs: "buffer", bodyLimit } (mặc định 1 MB; route POST /api/v1/admin/imports đặt bodyLimit riêng từ IMPORT_MAX_BYTES, mặc định 50 MB), vượt giới hạn trả 413 (I18 bổ sung test). Validator trang quản trị đếm đủ số câu thiếu đáp án vào blockingIssueCount.
- Bàn giao: apps/api/src/modules/import/; apps/api/src/modules/exam/; apps/api/src/modules/review/; apps/api/src/modules/attempt/attempt.service.ts; apps/api/src/main.ts.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: apps/admin/features/import/, apps/admin/app/imports/, apps/admin/lib/api-client.ts, tests/playwright/.
- Nghiệm thu:
  - Gói fixtures/imports/draft.zip nạp được ở chế độ nháp, trang quản trị hiện issue blocking.
  - Cùng gói ở chế độ ready bị từ chối với thông báo rõ.
  - API chặn duyệt và xuất bản bản nháp (test âm).
  - Nạp lại bản ready cùng packageId, revision cao hơn thì thay bản nháp.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
- Lệnh cần cung cấp và chạy:
  - `pnpm test`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i17"></a>

### I17 Lời giải trong gói nhập đi vào quy trình duyệt và hiện cho học viên

- Worker: **W2**. Ngày mục tiêu: 8. Ước lượng chưa đo: 3 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I16. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: import.service lưu question.explanation ({locale, blocks}) vào question_versions.explanation, nhưng trang xem lại bài của học viên và màn duyệt lời giải chỉ đọc explanation_versions (status approved, content.correctReason/wrongReasonsByOption/translation), nên lời giải trong gói nhập không bao giờ hiện. Khi nhập gói: mỗi câu có explanation tạo một explanation_versions bản nháp (status draft, locale, tác giả = người nhập) và tách các đoạn theo tiền tố: "• Dịch nghĩa:" -> translation; "• Đáp án đúng: [n]" + phần sau -> correctReason; mỗi dòng "- [n] ...: ..." trong đoạn "• Phân tích các phương án còn lại:" -> wrongReasonsByOption[n]; không khớp tiền tố thì giữ toàn bộ blocks và dùng chữ của chúng làm correctReason. Giữ nguyên blocks gốc trong content. Học viên chỉ thấy lời giải sau khi reviewer duyệt (approved) và sau khi nộp bài; không lộ trước quyền xem. Script bài nghe: group.transcript (RichText) trong gói hiện bị importer bỏ qua. Khi nhập, mỗi câu nghe của group có transcript cũng tạo explanation_versions bản nháp (kể cả khi explanation null) với content.transcript = group.transcript, để màn duyệt và trang xem lại bài hiện script theo quy tắc transcriptAllowed của license (AUDIO-08); không trả transcript trong API làm bài.
- Bàn giao: apps/api/src/modules/import/; apps/api/src/modules/review/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/.
- Nghiệm thu:
  - Nhập gói có explanation -> màn duyệt lời giải của quản trị hiện bản nháp với bản dịch, lý do đúng, lý do sai từng phương án.
  - Reviewer duyệt -> trang xem lại bài của học viên hiện đủ lời giải; chưa duyệt thì không hiện.
  - Test âm: không lộ lời giải trước khi nộp bài.
  - Gói có group nghe kèm transcript -> màn duyệt và trang xem lại bài (sau khi nộp, license cho phép) hiện script; API làm bài không trả transcript.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
- Lệnh cần cung cấp và chạy:
  - `pnpm test`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i18"></a>

### I18 API: giới hạn kích thước body cho multipart, zip và octet-stream

- Worker: **W2**. Ngày mục tiêu: 8. Ước lượng chưa đo: 1 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I16. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: I16 thêm vào apps/api/src/main.ts ba addContentTypeParser (multipart/form-data, application/zip, application/octet-stream) tự gom stream vào Buffer. Cách này bỏ qua bodyLimit của Fastify và chạy trước guard đăng nhập, nên ai cũng gửi được body lớn tùy ý vào bất kỳ route POST nào và làm API hết RAM. Sửa: dùng một parser chung với { parseAs: "buffer", bodyLimit } (mặc định 1 MB; riêng POST /api/v1/admin/imports đặt giới hạn ở cấu hình route, lấy từ biến môi trường IMPORT_MAX_BYTES, mặc định 50 MB); vượt giới hạn trả 413. Giữ nguyên hành vi nhập gói của I16.
- Bàn giao: apps/api/src/main.ts; apps/api/src/modules/import/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Test: body 2 MB application/octet-stream vào route không phải nhập gói trả 413 mà không cần đăng nhập.
  - Test: gói vượt IMPORT_MAX_BYTES vào /api/v1/admin/imports trả 413; gói fixtures hợp lệ vẫn nhập được ở chế độ draft và ready.
- Lệnh cần cung cấp và chạy:
  - `pnpm test`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="i07"></a>

### I07 Nghiệm thu tích hợp toàn bộ và khóa chặn dữ liệu giả

- Worker: **W6**. Ngày mục tiêu: 8. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I01, I08, I10, I11, I12, I13, I09, I03, I04, I05, I06, I14, I15. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Chạy E2E tích hợp đầy đủ hai ứng dụng trên staging CI; baseline mock-ui phải rỗng và check:no-mock-ui thành cổng chặn vĩnh viễn trong CI; cập nhật bản demo và báo cáo.
- Bàn giao: tests/; .github/; infra/; docs/release/; docs/runbooks/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: ci-workflow, staging-deploy.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - tests/integration/mock-ui-baseline.json rỗng; CI fail nếu có dữ liệu giả mới.
  - E2E đăng nhập học viên và nhân sự rồi đi qua mọi trang web/admin, fail nếu bất kỳ request API nào trả 5xx hoặc trang hiện key dịch thô.
  - E2E: học viên đăng ký -> làm đề -> xem điểm; editor nhập -> reviewer duyệt -> xuất bản; admin xem người dùng và audit; tất cả trên staging thật.
  - docs/release/INTEGRATION_REPORT.md liệt kê từng trang và bằng chứng E2E.
- Lệnh cần cung cấp và chạy:
  - `pnpm check:no-mock-ui`
  - `pnpm test:e2e:integration`
  - `sudo -n /usr/local/bin/jlpt-stage-test check-all`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

## Ngày 9


<a id="d00"></a>

### D00 Hệ thống thiết kế @jlpt/ui dựng lại trên shadcn/ui

- Worker: **W3**. Ngày mục tiêu: 9. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I00. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Khởi tạo shadcn/ui (components.json, cn, class-variance-authority, tailwind-merge, Radix khi cần) trong packages/ui; dựng lại Button, Input, Textarea, Label, Select, Checkbox, RadioGroup, Switch, Tabs, Dialog, DropdownMenu, Popover, Tooltip, Card, Badge, Alert, Toast, Skeleton theo token màu hiện có, sáng/tối theo class dark. Giữ nguyên tên export và props đang dùng để web/admin không vỡ; bỏ inline style. Thêm lệnh pnpm check:ui-primitives (packages/ui/scripts/) báo thẻ <button>/<input>/<select>/<textarea> gốc trong apps/web và apps/admin, kèm baseline giảm dần.
- Bàn giao: packages/ui/; package.json; docs/decisions/.
- Hợp đồng: API.
- Khóa tài nguyên: ui-contract.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Mỗi thành phần có test hành vi bàn phím, focus và aria; Dialog giữ focus và đóng bằng Esc.
  - Chỉ chép thành phần thật sự dùng; không cài thư viện UI nguyên khối.
  - Bản build web không tăng quá 15 KB JS nén ở trang chủ so với trước đợt.
  - Lighthouse trên staging CI không giảm so với số đo trước đợt (máy tính hiệu năng ≥98, điện thoại ≥70, trợ năng ≥95, SEO 100); ảnh chụp 390px và 1366px của các trang đã đổi lưu làm artifact.
- Lệnh cần cung cấp và chạy:
  - `pnpm --filter @jlpt/ui test`
  - `pnpm check:ui-primitives`
  - `pnpm build`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="d01"></a>

### D01 Cổng hiệu năng Lighthouse trên staging CI

- Worker: **W6**. Ngày mục tiêu: 9. Ước lượng chưa đo: 3 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I00. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Thêm Lighthouse CI chạy trên staging thật cho các trang chính (/, /de-thi, /phong-thi, /n5, /dang-nhap, admin /login), preset điện thoại và máy tính, lưu báo cáo làm artifact; ghi số đo gốc trước đợt vào docs/release/performance-baseline.json; ngân sách: điện thoại LCP < 2,5 s, CLS < 0,1, TBT < 200 ms, JS ban đầu mỗi trang có trần.
- Bàn giao: tests/; .github/; infra/; docs/release/; package.json.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: ci-workflow, staging-deploy.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - pnpm test:lighthouse chạy được trên staging CI và fail khi vượt ngân sách.
  - Số đo gốc lưu kèm commit SHA; không lấy số máy ảo làm số production.
  - Ngân sách ban đầu ở chế độ cảnh báo, D04 chuyển thành chặn.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:lighthouse -- --list`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="d02"></a>

### D02 Web dùng thống nhất @jlpt/ui

- Worker: **W3**. Ngày mục tiêu: 9. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: D00. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Thay toàn bộ <button>/<input>/<select>/<textarea> gốc và class tự chế trong apps/web bằng thành phần @jlpt/ui; đồng bộ khoảng cách, cỡ chữ, trạng thái hover/focus/disabled/loading; thiết kế lại thanh menu máy tính gọn (nhóm mục phụ vào menu "Thêm", chuyển ngôn ngữ/giao diện vào menu tài khoản) để hiện được từ 1280px.
- Bàn giao: apps/web/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Baseline check:ui-primitives của apps/web rỗng.
  - Menu máy tính hiện đủ từ 1280px, không cuộn ngang.
  - Lighthouse trên staging CI không giảm so với số đo trước đợt (máy tính hiệu năng ≥98, điện thoại ≥70, trợ năng ≥95, SEO 100); ảnh chụp 390px và 1366px của các trang đã đổi lưu làm artifact.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:web`
  - `pnpm check:ui-primitives`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="d03"></a>

### D03 Admin dùng thống nhất @jlpt/ui

- Worker: **W4**. Ngày mục tiêu: 9. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: D00. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Thay thẻ gốc và inline style trong apps/admin bằng thành phần @jlpt/ui; bảng, form, bộ lọc, hộp thoại xác nhận dùng chung một kiểu.
- Bàn giao: apps/admin/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Baseline check:ui-primitives của apps/admin rỗng.
  - Admin có chế độ tối hoạt động.
  - Lighthouse trên staging CI không giảm so với số đo trước đợt (máy tính hiệu năng ≥98, điện thoại ≥70, trợ năng ≥95, SEO 100); ảnh chụp 390px và 1366px của các trang đã đổi lưu làm artifact.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:admin`
  - `pnpm check:ui-primitives`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="d04"></a>

### D04 Tối ưu tốc độ web trên điện thoại

- Worker: **W3**. Ngày mục tiêu: 9. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: D01, D02. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Đưa các trang chính đạt ngân sách D01 trên điện thoại: giảm JS tải ban đầu (server component, tách gói, tải muộn phần không cần ngay), font tự host có preload và font-display swap, ảnh next/image đúng kích thước, bỏ request analytics lỗi 404, cache tĩnh.
- Bàn giao: apps/web/; packages/ui/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Lighthouse điện thoại trên staging: LCP < 2,5 s, CLS < 0,1, TBT < 200 ms ở /, /de-thi, /phong-thi, /n5, /dang-nhap.
  - Ngân sách D01 chuyển sang chặn và pass.
  - Không đổi hành vi; E2E tích hợp vẫn pass.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:web`
  - `pnpm build`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="d05"></a>

### D05 Nghiệm thu giao diện thống nhất và hiệu năng

- Worker: **W6**. Ngày mục tiêu: 9. Ước lượng chưa đo: 3 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: D02, D03, D04. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Chạy E2E tích hợp, Lighthouse và chụp toàn bộ trang web/admin ở 390, 1366, 1920px; check:ui-primitives và check:no-mock-ui thành cổng chặn vĩnh viễn; báo cáo trước/sau.
- Bàn giao: tests/; .github/; docs/release/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: ci-workflow, staging-deploy.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - docs/release/DESIGN_PERF_REPORT.md có số đo trước/sau và ảnh từng trang.
  - Không trang nào cuộn ngang hoặc hiện key dịch thô.
  - check:ui-primitives và test:lighthouse chặn trong CI.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:integration`
  - `pnpm test:lighthouse`
  - `pnpm check:ui-primitives`
  - `sudo -n /usr/local/bin/jlpt-stage-test check-all`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

## Ngày 10


<a id="p01"></a>

### P01 Ước lượng điểm quy đổi JLPT, điểm sàn từng phần và nhịp làm bài

- Worker: **W1**. Ngày mục tiêu: 10. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Trong packages/exam-engine: hàm thuần ước lượng điểm quy đổi 0–180 theo từng phần thi của từng cấp N1–N5 (N1–N3: ba phần; N4–N5: hai phần, trong đó phần kiến thức và đọc hiểu gộp điểm), so với điểm đỗ tổng và điểm sàn từng phần, trả kết quả đỗ/trượt và phần dưới sàn. Bảng quy đổi và ngưỡng là dữ liệu cấu hình có phiên bản (không viết cứng trong hàm), mặc định theo mức công bố chính thức của JLPT; mọi kết quả kèm cờ "ước lượng". Thêm mô hình nhịp làm bài: thời gian khuyến nghị cho từng dạng 問題 và mốc tiến độ trong mỗi phần.
- Bàn giao: packages/exam-engine/; packages/schema/; contracts/; docs/decisions/.
- Hợp đồng: API.
- Khóa tài nguyên: engine-contract, schema-contract.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Test cho cả 5 cấp: đỗ khi đủ tổng và đủ sàn; trượt khi đủ tổng nhưng dưới sàn một phần; trượt khi thiếu tổng.
  - Bảng quy đổi có phiên bản, đổi bảng không cần sửa code.
  - Kết quả luôn có nhãn ước lượng; giải thích nguồn ngưỡng trong docs/decisions.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:engines:all`
  - `pnpm contracts:check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="p02"></a>

### P02 Dữ liệu âm Hán Việt cho Kanji

- Worker: **W5**. Ngày mục tiêu: 10. Ước lượng chưa đo: 4 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: I01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Nhập âm Hán Việt cho Kanji từ trường kVietnamese của Unicode Unihan (giấy phép Unicode, ghi nguồn và phiên bản); chuẩn hóa NFC; lưu vào dữ liệu Kanji; API trả hanViet cho Kanji và cho từ vựng (ghép theo từng chữ Hán của từ). Kanji không có dữ liệu thì để trống, không đoán.
- Bàn giao: tools/import-data/; packages/content-tools/; apps/api/src/modules/vocab/; apps/api/src/modules/learning/; docs/decisions/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Script nhập chạy lại không tạo trùng, ghi nguồn và giấy phép.
  - 経済 trả KINH TẾ; chữ không có dữ liệu trả rỗng.
  - API trả hanViet trong tra từ, sổ tay và giải thích; có test.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:import-validation`
  - `pnpm test:learning:all`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="p03"></a>

### P03 API: kết quả đỗ/trượt theo JLPT, lịch thi tại Việt Nam và nhắc hạn đăng ký

- Worker: **W2**. Ngày mục tiêu: 10. Ước lượng chưa đo: 5 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: P01. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Kết quả bài thi và lịch sử trả điểm quy đổi từng phần, đỗ/trượt và phần dưới sàn từ P01; lưu dữ liệu thời gian từng câu để phân tích nhịp. Thêm thực thể lịch thi JLPT tại Việt Nam (kỳ thi, ngày thi, hạn đăng ký, địa điểm Hà Nội/Đà Nẵng/TP.HCM, link đăng ký chính thức) do quản trị nhập; API công khai đọc lịch; thông báo nhắc trước hạn đăng ký và trước ngày thi (bật/tắt theo người dùng). Không seed ngày thi giả: thiếu dữ liệu thì API trả rỗng.
- Bàn giao: package.json; apps/api/package.json; apps/api/src/common/; apps/api/src/modules/auth/; apps/api/src/modules/user/; apps/api/src/modules/exam/; apps/api/src/modules/attempt/; apps/api/src/modules/question-bank/; apps/api/src/modules/import/; apps/api/src/modules/media/; apps/api/src/modules/review/; apps/api/src/modules/storage/; apps/api/src/modules/license/; apps/api/src/modules/blueprint/; apps/api/src/modules/audit/; apps/api/src/modules/notification/; apps/api/src/modules/community/; apps/api/src/modules/classroom/; apps/api/src/modules/scoring/; apps/api/src/modules/outbox/; apps/api/src/modules/email/; apps/api/src/modules/admin/; apps/api/src/modules/turnstile/; apps/api/src/main.ts; apps/api/src/app.module.ts; docs/decisions/.
- Hợp đồng: API, EVENTS, DB.
- Khóa tài nguyên: db-migration.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - Kết quả bài thi demo N5 có điểm từng phần và đỗ/trượt khớp P01.
  - Lịch thi CRUD có phân quyền và audit; trang công khai chỉ thấy bản đã xuất bản.
  - Nhắc hạn đăng ký gửi qua outbox đúng một lần, tôn trọng cài đặt tắt nhắc; có test.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:api:all`
  - `pnpm test:security`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="p04"></a>

### P04 Web: đỗ/trượt theo phần, Hán Việt, bật/tắt furigana, cảnh báo nhịp làm bài, lịch thi

- Worker: **W3**. Ngày mục tiêu: 10. Ước lượng chưa đo: 6 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: P02, P03, D02. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Trang kết quả: điểm quy đổi từng phần, đỗ/trượt, phần dưới sàn, nhãn ước lượng. Hiện âm Hán Việt cạnh Kanji ở tra từ, sổ tay, giải thích. Nút bật/tắt furigana trong luyện tập và chữa bài (nhớ lựa chọn). Phòng thi: chế độ luyện tập cảnh báo khi chậm so với mốc nhịp; chế độ thi thật chỉ hiện mốc tiến độ kín đáo; sau bài có phân tích câu tốn thời gian. Trang lịch thi JLPT tại Việt Nam và cài đặt nhắc hạn đăng ký.
- Bàn giao: apps/web/; packages/ui/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - Học viên làm đề demo N5 thấy điểm từng phần và đỗ/trượt.
  - Tắt furigana thì ẩn trên mọi câu, tải lại vẫn giữ.
  - Cảnh báo nhịp hiện đúng khi chậm hơn mốc trong E2E.
  - Trang lịch thi hiện dữ liệu quản trị nhập, trống khi chưa có.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
  - Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền.
  - E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang; class Tailwind phải có tác dụng (PR #53 đã cài Tailwind), không để chữ dính liền hay nội dung dính mép; không hiện key dịch thô (ví dụ account.profile.title trên /tai-khoan), E2E kiểm tra cả ba locale vi ja en.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:web`
  - `pnpm check:no-mock-ui`
  - `pnpm check:ui-primitives`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="p05"></a>

### P05 Quản trị: lịch thi JLPT và bảng quy đổi điểm

- Worker: **W4**. Ngày mục tiêu: 10. Ước lượng chưa đo: 3 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: P03. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: Trang quản trị nhập và xuất bản lịch thi (ngày thi, hạn đăng ký, địa điểm, link) và xem/cập nhật phiên bản bảng quy đổi điểm, có audit. Dùng thành phần đang có trong @jlpt/ui; D03 sẽ chuyển trang sang bộ thành phần mới, nên không tự viết lại nút/ô nhập riêng.
- Bàn giao: apps/admin/.
- Hợp đồng: API.
- Khóa tài nguyên: theo đường dẫn task và quyền sở hữu worker.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: tests/playwright/, tests/integration/mock-ui-baseline.json.
- Nghiệm thu:
  - Admin nhập kỳ thi tháng 12, xuất bản, trang web công khai hiện ngay.
  - Đổi bảng quy đổi tạo phiên bản mới, kết quả cũ giữ phiên bản đã dùng.
  - Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass.
  - E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
  - Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền.
  - E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang; class Tailwind phải có tác dụng (PR #53 đã cài Tailwind), không để chữ dính liền hay nội dung dính mép; không hiện key dịch thô (ví dụ account.profile.title trên /tai-khoan), E2E kiểm tra cả ba locale vi ja en.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:admin`
  - `pnpm check:no-mock-ui`
  - `sudo -n /usr/local/bin/jlpt-stage-test check`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.

<a id="p06"></a>

### P06 Nghiệm thu 5 tính năng bổ sung

- Worker: **W6**. Ngày mục tiêu: 10. Ước lượng chưa đo: 2 giờ worker; không gồm mọi vòng sửa/review.
- Phụ thuộc: P04, P05, D05. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.
- Tính năng chính: nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi.
- Phạm vi: E2E trên staging cho NEW-01..05, ảnh chụp 390/1366px, cập nhật danh sách tính năng và báo cáo.
- Bàn giao: tests/; docs/release/.
- Hợp đồng: quy tắc chung.
- Khóa tài nguyên: staging-deploy.
- Điều kiện ngoài chặn bắt đầu: không.
- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): không.
- Quyền ghi tạm ngoài thư mục của worker: không.
- Nghiệm thu:
  - E2E: làm đề N5 → đỗ/trượt từng phần; Hán Việt và furigana; cảnh báo nhịp; lịch thi và nhắc hạn đăng ký.
  - docs/release/NEW_FEATURES_REPORT.md có ảnh và bằng chứng từng tính năng.
- Lệnh cần cung cấp và chạy:
  - `pnpm test:e2e:integration`
  - `sudo -n /usr/local/bin/jlpt-stage-test check-all`
- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.
- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.
