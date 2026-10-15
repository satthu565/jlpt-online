# JLPT Online toàn bộ tính năng trong bảy ngày với sáu worker

Phiên bản 2.2 ngày 15/10/2026. Giữ V1–V4 với6 worker trong 7 ngày, thay luồng nhập nội dung theo yêu cầu mới: **không xây OCR hoặc parser PDF**. Bạn tự chuẩn bị gói dữ liệu chuẩn rồi tải lên; hệ thống chỉ validate, nhập nháp, cho người duyệt và xuất bản. Thi thật, trộn đề, SRS, AI học tập, thanh toán, giáo viên và cộng đồng vẫn trong phạm vi.

Giữ375 mã nguồn để truy vết: **363 yêu cầu ứng dụng và 12 yêu cầu chuẩn bị dữ liệu bên ngoài**. Một số mã nhập PDF đổi thành nhập gói chuẩn; nội dung gốc và hành vi mới được ghi riêng trong matrix. Không coi trích xuất bên ngoài là chức năng phần mềm đã hoàn thành.

## Chuẩn dữ liệu cần bàn giao

Đọc [hướng dẫn nhập dữ liệu](CHUAN_DU_LIEU_NHAP.md), dùng [checklist chuẩn bị dữ liệu thủ công](HUONG_DAN_CHUAN_BI_DU_LIEU.md), đối chiếu [JSON mẫu đầy đủ](examples/import-v2-ready/import.json) và [gói ZIP mẫu](examples/import-v2-ready.zip). Bộ kiểm tra local không gọi mạng/model, không đọc PDF:

```powershell
python tools/validate_import.py examples/import-v2-ready.zip
```

Trên Windows, nếu `python` chỉ mở Microsoft Store thì dùng `py` cho mọi lệnh Python trong bộ tài liệu này.

ZIP chứa `import.json` (câu hỏi, lựa chọn, đáp án, phần thi), ảnh/audio thật trong `media/` và PDF nguồn tùy chọn trong `sources/`. Chỗ agent không xác định được phải ghi `issues`, để dữ liệu chưa biết là null và giữ nháp; không tự điền cho đủ. Gói hợp lệ vẫn cần người xác minh nội dung, quyền sử dụng và blueprint trước publish.

Đây là bộ tài liệu để bắt đầu triển khai, chưa phải ứng dụng hay runner đã hoàn thành. Lịch 7 ngày là mục tiêu rất gấp, có giả định tài nguyên/provider và ước lượng chưa đo; không phải cam kết tiến độ. Khi chưa đủ chức năng hoặc bằng chứng, kết quả phải ghi chưa đạt, giữ nguyên scope.

## Đọc theo thứ tự

| Tài liệu | Mục đích |
|---|---|
| [AGENTS.md](AGENTS.md) | Quy tắc chung và thứ tự ưu tiên |
| [PHAM_VI_VA_NGHIEM_THU.md](PHAM_VI_VA_NGHIEM_THU.md) | Định nghĩa đầy đủ và ba lớp nghiệm thu |
| [KE_HOACH_7_NGAY.md](KE_HOACH_7_NGAY.md) | Lịch bàn giao theo ngày và worker |
| [PHAN_CONG_6_WORKER.md](PHAN_CONG_6_WORKER.md) | Quyền sở hữu code và reviewer |
| [KE_HOACH_TRIEN_KHAI.md](KE_HOACH_TRIEN_KHAI.md) | Các gói việc có deps, artifact, test và tiêu chí |
| [MA_TRAN_TINH_NANG.md](MA_TRAN_TINH_NANG.md) |375 mã nguồn với phạm vi363 yêu cầu ứng dụng và 12 đầu vào ngoài |
| [CHUAN_DU_LIEU_NHAP.md](CHUAN_DU_LIEU_NHAP.md) |Định dạng import v2 và cách chuẩn bị dữ liệu từ PDF |
| [DE_XUAT_KY_THUAT.md](DE_XUAT_KY_THUAT.md) | Kiến trúc đầy đủ V1–V4 |
| [HOP_DONG_KY_THUAT.md](HOP_DONG_KY_THUAT.md) | RichText, snapshot, blueprint, token và quy tắc nền |
| [API_V1_V4.md](API_V1_V4.md) | API đầy đủ và kết nối các miền |
| [DU_LIEU_VA_SU_KIEN.md](DU_LIEU_VA_SU_KIEN.md) | Bảng dữ liệu, events, quyền và versioning |
| [DAC_TA_RUNNER.md](DAC_TA_RUNNER.md) | Đặc tả điều phối sáu worker, chưa phải runtime |
| [VAN_HANH_VPS_WORKER.md](VAN_HANH_VPS_WORKER.md) | Chuẩn bị VPS, tài khoản riêng, tài nguyên |
| [KIEM_THU_VA_CHAT_LUONG.md](KIEM_THU_VA_CHAT_LUONG.md) | Tiêu chí test và quản lý bằng chứng |
| [QUYET_DINH_VA_DICH_VU.md](QUYET_DINH_VA_DICH_VU.md) | Việc operator cần chuẩn bị, chi phí và provider |
| [RUNBOOK_PRODUCTION.md](RUNBOOK_PRODUCTION.md) | Deploy, rollback, backup, restore |
| [RUI_RO_VA_DIEU_KIEN_7_NGAY.md](RUI_RO_VA_DIEU_KIEN_7_NGAY.md) | Điều kiện để lịch có cơ hội đạt và cách báo trễ |
| [TIEN_DO.md](TIEN_DO.md) | Baseline TODO, không tự đánh dấu hoàn tất |
| [TRUY_VET_TASK_V1.md](TRUY_VET_TASK_V1.md) | Giữ chi tiết V1 gốc không mất yêu cầu |
| [prompts](prompts) | Prompt dùng cho từng worker và reviewer |

## Catalog và công cụ

- `tasks.json`: graph thực thi hiện hành, scope `ALL_V1_V4`; một coordinator quản lý.
- `features.json`:375 mã nguồn, executionMode và hành vi hiện hành; phần trích xuất bên ngoài không có test ứng dụng giả.
- `config/workers.example.json`: cấu hình mẫu cho coordinator mới (thư mục được phép sửa của từng worker, danh sách khóa tài nguyên); không tương thích với runner A/B cũ.
- `config/evidence.example.json`: mẫu bằng chứng chưa có kết quả.
- `tools/build_docs.py`: tạo lại catalog/matrix/task cards và phần hợp đồng giữ từ nguồn.
- `tools/validate_plan.py`: kiểm tra coverage, IDs, dependencies, DAG, links, cấu hình và mô phỏng thời gian theo giả định.
- `KIEM_TRA_TAI_LIEU.json`: kết quả kiểm tra tĩnh; không chứng minh 363 yêu cầu ứng dụng đã chạy.

Chạy từ thư mục `Multi-worker`:

```powershell
python tools/build_docs.py
python tools/validate_plan.py
```

Không chạy `agent-runner/runner.mjs` cũ với catalog này. Coordinator mới nằm ở repo riêng `jlpt-coordinator`, được xây và kiểm thử ở **ngày 0** theo [DAC_TA_RUNNER.md](DAC_TA_RUNNER.md), trước khi đếm 7 ngày; F07 chỉ kiểm chứng nó trên VPS rồi mới bật giao việc tự động. Mã nguồn coordinator hiện ở thư mục `coordinator/` cạnh `Multi-worker/` (sẽ đưa lên repo `jlpt-coordinator`): đã qua 12 tình huống kiểm thử của DAC_TA_RUNNER.md trên máy dev, còn phải kiểm chứng trên VPS thật. Trong lúc chờ, có thể giao việc thủ công bằng prompts; vẫn phải tuân thủ dependencies và một task/worker.

## Bản nguồn và quyền ưu tiên

`nguon/` giữ Word/PDF gốc, bản trích375 tính năng và ba kế hoạch cũ. Các lịch 30 tuần, phạm vi rút gọn và cách vận hành hai agent trong nguồn không còn là chỉ thị thực thi cho thư mục này. Giữ file nguồn để truy vết, không để worker đọc nhầm làm kế hoạch hiện hành.

Nếu copy bộ tài liệu vào repo sản phẩm, đặt trong `docs/multi-worker/`, đặt bản sao AGENTS.md phù hợp ở repo root và cấu hình coordinator trỏ đúng catalog. Đường dẫn `apps/`, `packages/`, `infra/` trong task luôn tính từ repo sản phẩm, không từ thư mục tài liệu.

## Bắt đầu

0. Ngày 0: xây và kiểm thử coordinator (`coordinator-runtime`). Nếu chưa xong, ngày 1 vẫn bắt đầu được với giao việc thủ công.
1. Ngày 1 bắt đầu khi đủ các điều kiện **chặn bắt đầu** của F01 trong [QUYET_DINH_VA_DICH_VU.md](QUYET_DINH_VA_DICH_VU.md): repo/CI (`repo-ci`), VPS coding (`coding-vps`) và sáu phiên CLI được phép dùng (`coding-accounts`). Các điều kiện khác (OAuth, email, blueprint chính thức, dữ liệu đề, quyền sử dụng, provider) chỉ **chặn nghiệm thu**: task vẫn chạy bằng sandbox/fixtures, chủ dự án bổ sung dần trước mốc nghiệm thu ghi trong bảng.
2. Giao F01 cho W6; W1–W5 đọc hợp đồng, chuẩn bị fixture/gold/spec nhưng chưa sửa code chưa có nền.
3. F01 merge thì F02 và F06 có thể bắt đầu; F02 bàn giao sớm từng contract để mở web/admin/API. W6 tiếp tục F07 (kiểm chứng coordinator, dev services, CI tích hợp).
4. Theo graph, không giữ tất cả worker chờ hết một ngày nếu task đã đủ deps. Daily gates là điểm kiểm tra, không thay dependency đúng.
5. Ngày 7 báo cáo feature coverage, trạng thái code/provider/production, lỗi, chi phí và điều kiện còn thiếu. Không tự xuất bản production từ một báo cáo CI xanh.
