"""Keep non-generated planning prose aligned with owner-prepared import v2.

Idempotent documentation migration. Never changes archived sources or software
outside this planning directory. Invoked by build_docs.py on regeneration.
"""
def revise(root):
    changes={
      'README.md':[
        ('[prompt cho agent đọc PDF](prompts/CHUAN_BI_DU_LIEU_PDF.md)','[checklist chuẩn bị dữ liệu thủ công](HUONG_DAN_CHUAN_BI_DU_LIEU.md)'),
        ('Agent của chủ dự án đọc PDF bên ngoài, trả gói dữ liệu chuẩn','Bạn tự chuẩn bị gói dữ liệu chuẩn rồi tải lên'),
        ('code375 tính năng đã chạy','363yêu cầu ứng dụng đã chạy'),
      ],
      'AGENTS.md':[
        ('Agent do chủ dự án chọn đọc PDF bên ngoài và cung cấp import v2.','Bạn tự chuẩn bị import v2 rồi tải lên;không tích hợp agent đọc PDF vào hệ thống.'),
      ],
      'KE_HOACH_7_NGAY.md':[
        ('Mục tiêu: code đủ 375 tính năng','Mục tiêu: code đủ363yêu cầu ứng dụng hiện hành;12yêu cầu đọc PDF do chủ dự án chuẩn bị bên ngoài,không phải task xây phần mềm. Nghiệm thu phạm vi ứng dụng'),
        ('không tự cắt OCR, thanh toán','không tự cắt các yêu cầu còn trong phạm vi như thanh toán'),
        ('W5 OCR học AI','W5 Dữ liệu và học AI'),
        ('F06 OCR spike gold adapters','F06 chuẩn dữ liệu và mẫu bàn giao'),
        ('C05 OCR đầy đủ','C05 validator gói nhập'),
        ('V05 OCR AI thật gold learning','V05 dữ liệu nhập và AI học tập'),
        ('R05 chốt OCR AI học','R05 chốt dữ liệu nhập AI học'),
        ('OCR provider trial','gói import v2 hợp lệ và nháp lỗi'),
        ('Upload PDF→OCR→edit→review→publish→thi→score→review','Bạn chuẩn bị gói→upload→validate→edit→review→publish→thi→score→review'),
        ('375 mã có delivery path/test spec, mọi module có code/UI/API thật','363yêu cầu ứng dụng có delivery path/test spec;12yêu cầu chuẩn bị dữ liệu được theo dõi riêng'),
        ('375feature evidence','363yêu cầu ứng dụng có evidence và12đầu vào ngoài báo riêng'),
        ('375 feature evidence','363yêu cầu ứng dụng có evidence;12đầu vào thủ công báo riêng'),
        ('Nghiệm thu phạm vi ứng dụng và nghiệm thu trên candidate','Nghiệm thu trên candidate'),
        ('OCR/AI, dictionary/TTS','gói dữ liệu chuẩn,AI học tập,dictionary/TTS'),
        ('W5 spike độc lập sau F01.','W5 chuẩn bị hợp đồng và gói mẫu sau F01,không thực hiện đọc PDF tự động.'),
      ],
      'PHAN_CONG_6_WORKER.md':[
        ('W5|OCR/NLP/dictionary','W5|Chuẩn dữ liệu nhập/NLP/dictionary'),
        ('Artifacts OCR và API học tập','Validator import v2 và API học tập'),
      ],
      'DE_XUAT_KY_THUAT.md':[
        ('Việc code đầy đủ 375 tính năng','Việc code phạm vi hiện hành363yêu cầu ứng dụng'),
      ],
      'DAC_TA_RUNNER.md':[
        ('DONE của task không tự đặt375 feature DONE nếu evidence thiếu.','DONE của task không tự đặt feature DONE khi thiếu evidence;363yêu cầu ứng dụng và12đầu vào chuẩn bị thủ công được báo riêng.'),
        ('OCR/AI','AI học tập'),
      ],
      'VAN_HANH_VPS_WORKER.md':[
        ('Python/uv choOCR; compiler/library/ffmpeg/clamscan/browser deps theo lockfile.','không cài dịch vụ/thư viện đọc PDF tự động; công cụ validate local dùng Python chuẩn,app dùng TypeScript. Codec/malware/browser deps theo lockfile.'),
      ],
      'KIEM_THU_VA_CHAT_LUONG.md':[
        ('Một test có thể cover nhiều feature khi assertions kiểm từng behavior; một feature có thể cần nhiềutest.375mapping tồn tại không đủ để đủ 375pass. Missing test, empty suite, skip, only, provider placeholder và lệnhkhông tồn tại làm verifier fail. Baseline mọi evidence rỗng và statusTODO.',
         'Một test có thể cover nhiều yêu cầu khi assertions kiểm từng hành vi. Ma trận375mã nguồn không tương đương363yêu cầu ứng dụng đã pass;12mã chuẩn bị thủ công không có test ứng dụng giả. Missing/empty/skipped tests,provider placeholder hoặc thiếu lệnh làm verifier fail. Baseline yêu cầu ứng dụngTODO,đầu vào thủ côngEXTERNAL_INPUT_REQUIRED và evidence rỗng.'),
        ('# Kiểm thử và bằng chứng nghiệm thu375 tính năng','# Kiểm thử363yêu cầu ứng dụng và kiểm tra dữ liệu bàn giao'),
        ('OCR artifacts/provider adapters','gói import v2/provider học tập adapters'),
        ('đủ 375 feature references','đủ363feature ứng dụng references;12đầu vào ngoài không giả làm test ứng dụng'),
        ('OCR/AI/dictionary','AI học tập/dictionary'),
        ('Text/scan/batch/answers/audio/ruby/star/table, image, confidence, source-page, side-by-side, version, JSON/CSV, reimport','Gói chuẩn,batch,answers/audio/ruby/star/table,image,issues,source-page tham chiếu,version,JSON/CSV,reimport;không test chức năng tự trích PDF'),
        ('OCR/errors/mix','import-data/errors/mix'),
        ('W6 kiểm `features.json`↔test metadata↔assertions/report↔commit;','W6 kiểm363yêu cầu APPLICATION trong `features.json`↔test metadata↔assertions/report↔commit;12yêu cầu EXTERNAL_PREPARATION không thuộc code coverage;'),
        ('R06 chạy trên một release candidate immutable, tổng hợp PASS/FAIL/BLOCKED từngfeature','R06 chạy trên một release candidate immutable,tổng hợp PASS/FAIL/BLOCKED từng yêu cầu ứng dụng,báo riêng12đầu vào chuẩn bị bên ngoài'),
      ],
      'QUYET_DINH_VA_DICH_VU.md':[
        ('|ocr-provider|Document AI hoặc provider operator chọn, processor/region/key/budget|Chủ dự án/W5|F06/C05|Actual OCR request+cost+output validated|','|prepared-import-data|Chủ dự án tự chuẩn bị import v2,đáp án,ảnh/audio;không tích hợp agent|Chủ dự án|Trước nghiệm thu N04/V05|Gói vượt validator,còn cần người xác minh nội dung|'),
        ('Provider API key/model/budget dùng cho OCR recognition và learning AI','Provider API key/model/budget chỉ dùng cho AI học tập trong sản phẩm'),
        ('|F06/A05|Actual request/failure/metering','|A05|Actual request/failure/metering'),
        ('|D5|OCR/dictionary/TTS/LLM provider, region/budget/data processing rights|','|D5|Định dạng import v2 do chủ dự án cung cấp;dictionary/TTS/LLM chỉ cho học tập|'),
        ('Toàn bộ 375 tính năng target ngày 7','363yêu cầu ứng dụng target ngày7;12yêu cầu chuẩn bị dữ liệu ngoài không tính code'),
        ('Không đổi yêu cầu sản phẩm thành import JSON thủ công để thay OCR,','Theo chỉ thị hiện hành,chỉ nhận gói chuẩn do chủ dự án tự chuẩn bị;không tích hợp tác vụ đọc PDF.'),
      ],
      'RUI_RO_VA_DIEU_KIEN_7_NGAY.md':[
        ('Toàn bộ 375 tính năng từ V1–V4','Phạm vi V1–V4 hiện hành gồm363yêu cầu ứng dụng và12yêu cầu chuẩn bị dữ liệu bên ngoài'),
        ('đặc biệt OCR/AI/payment/dictionary/rights và blueprint','đặc biệt gói dữ liệu chuẩn,AI học tập/payment/dictionary/rights và blueprint'),
        ('|AI/OCR kém chất lượng|Gold accuracy/edit-time không đạt|Sửa prompt/parser/provider adapter trong scope, người biên tập duyệt; không cam kết OCR100%|','|Dữ liệu chuẩn bị sai hoặc thiếu|Thiếu đáp án,hình,audio,timeline hoặc người duyệt phát hiện sai|Trả lỗi có JSON path,giữ draft,bạn sửa gói và tăng revision;không gọi model sửa ngầm|'),
        ('cuối ngày 7chưa đủ 375 feature','cuối ngày7chưa đủ363yêu cầu ứng dụng'),
        ('cost OCR/AI/hosting','cost AI học tập/hosting và thời gian chuẩn bị dữ liệu thủ công'),
      ],
      'API_V1_V4.md':[
        ('## Admin nội dung và OCR','## Admin nội dung và nhập gói dữ liệu chuẩn'),
        ('|`POST /imports`|multipart PDFs[], answers[], audio[], metadata, kind|202 AsyncJob; batch files riêng checksum; source rights|','|`POST /imports`|multipart packages[] là ZIP import v2 theo CHUAN_DU_LIEU_NHAP.md|202 AsyncJob validate/import;PDF đơn lẻ không khởi động trích xuất;source rights và content hash|'),
        ('Progress/errors/confidence, không raw provider credentials','Progress/schema errors/issues;không tác vụ nhận dạng hoặc provider trích xuất'),
        ('DraftVersion, sourcePage, confidence; PDF preview access checked','DraftVersion,sourcePages,issues;PDF tham chiếu tùy chọn chỉ để người duyệt xem'),
        ('OCR artifacts/provider adapters','gói import v2/provider học tập adapters'),
        ('`POST /internal/ocr-jobs/:id/artifacts` signed callback nonce/job attempt+schemaVersion/hash manifest, không public browser session. ','Không có endpoint nội bộ giao việc hoặc nhận kết quả đọc PDF từ agent. '),
        ('Worker relay chỉ gửi scope URLs, không DB/Redis credentials.','Callback provider học tập chỉ dùng khi cần;không có relay/callback chuẩn bị dữ liệu PDF.'),
      ],
      'DU_LIEU_VA_SU_KIEN.md':[
        ('OCR artifacts','gói nhập chuẩn'),
        ('Media/import W2|','Media/import W2|'),
        ('import_job_attempts, import_artifacts','import_job_attempts, import_artifacts'),
        ('stale callback attempt fenced','validation/import attempt fenced;không callback nhận dạng PDF'),
        ('|content.import.requested|import API W2|OCR executor bridge|Job attempt fencing và scoped URLs; retry không import trùng|','|content.import.requested|import API W2|Validator/import worker nội bộ|Gói đã do chủ dự án upload;không gọi agent,không đọc PDF;retry không import trùng|'),
        ('|content.import.completed/failed|artifact validation W2|admin status/reporting|Callback signature, artifact checksum, schemaVersion|','|content.import.completed/failed|schema/file/semantic validation W2|admin status/reporting|Content hash,revision,transaction status và schemaVersion;không callback agent|'),
      ],
    }
    for name,replacements in changes.items():
        file=root/name
        if not file.exists():continue
        value=file.read_text(encoding='utf-8')
        for old,new in replacements:value=value.replace(old,new)
        file.write_text(value,encoding='utf-8')
    # Clarify ownership consistently, while keeping the 375 source titles intact.
    for file in root.rglob('*.md'):
        if 'nguon' in file.relative_to(root).parts or file.name=='MA_TRAN_TINH_NANG.md':continue
        value=file.read_text(encoding='utf-8')
        for old,new in [('Agent ngoài','Chủ dự án'),('agent ngoài','người chuẩn bị dữ liệu'),
                        ('agent bên ngoài','người chuẩn bị dữ liệu'),('Agent bên ngoài','Chủ dự án')]:
            value=value.replace(old,new)
        file.write_text(value,encoding='utf-8')
