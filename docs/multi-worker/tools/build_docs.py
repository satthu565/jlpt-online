"""Build the self-contained six-worker planning package from local source text.

No service calls, installations, credentials, or original-file edits.
"""
from pathlib import Path
import json
import re
import hashlib
from collections import Counter
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from apply_manual_input_revision import revise

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'nguon'
DATE = '15/10/2026'
VERSION = '2.2'
PENDING = {}

def write(name, value):
    # Buffered: nothing touches disk until flush(), so a failed build leaves no half-written package.
    if name.endswith('.md'):
        value = readable_markdown(value)
    PENDING[name] = value.strip() + '\n'

def flush():
    for name, value in PENDING.items():
        target = ROOT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(value, encoding='utf-8')

def readable_markdown(value):
    parts = re.split(r'(```.*?```)', value, flags=re.S)
    for i in range(0, len(parts), 2):
        p = parts[i]
        p = re.sub(r'(?<=\d)(?=(?:tính|mã|ngày|giờ|tuần|worker|phiên|nhóm|phân|tài|chế|đề|feature|task|browser|prefix|gói|điều|cổng|bản|lần|mẫu|câu|yêu|đầu|lựa|ô|file))', ' ', p)
        p = re.sub(r'\b(ngày|giờ|tuần|nhóm|task|worker|lệnh|có|đủ|bộ|trong|thứ|sau|đến|trước|gồm|cùng|lịch|trên|dưới|hơn|khoảng|và|cần|bằng|nhận|của|các|từ|mỗi|tục)(?=\d)', r'\1 ', p, flags=re.I)
        p = re.sub(r',(?=[A-Za-zÀ-ỹ])', ', ', p)
        p = re.sub(r';(?=[A-Za-zÀ-ỹ])', '; ', p)
        p = p.replace('chưađạt','chưa đạt').replace('khôngtồn tại','không tồn tại')
        p = p.replace('giờ24','giờ 24').replace('day1','day 1')
        parts[i] = p
    return ''.join(parts)

def dump(name, value):
    write(name, json.dumps(value, ensure_ascii=False, indent=2))

features = []
for line in (SOURCE / 'DANH_MUC_TINH_NANG_GOC.md').read_text(encoding='utf-8').splitlines():
    m = re.match(r'^\| ([A-Z]+-\d+) \| (.*?) \| (P[012]) \|$', line)
    if m:
        features.append(dict(id=m[1], title=m[2], priority=m[3]))
feature_by_id = {f['id']: f for f in features}
assert len(features) == len(feature_by_id) == 375

def codes(expr):
    result = []
    for token in expr.split():
        if ':' in token:
            prefix, numbers = token.split(':')
            for part in numbers.split(','):
                ends = part.split('-')
                for n in range(int(ends[0]), int(ends[-1]) + 1):
                    result.append(f'{prefix}-{n:02}')
        else:
            result.append(token)
    assert all(c in feature_by_id for c in result), result
    return result

EXTERNAL_FEATURES = set(codes('PDF:6-16,18'))
EXECUTION_TITLES = {
 'PDF-01': 'Nhập một gói dữ liệu chuẩn; PDF gốc tùy chọn để đối chiếu',
 'PDF-02': 'Nhập nhiều gói dữ liệu chuẩn theo lô',
 'PDF-03': 'Nhận đáp án trong correctOption của JSON, không đọc file đáp án',
 'PDF-04': 'Nhận audio và timeline đã được chuẩn bị trong gói nhập',
 'PDF-17': 'Kiểm tra liên kết nhóm câu với audio và timeline do agent cung cấp',
 'PDF-19': 'Đối chiếu JSON với PDF nguồn tùy chọn, không trích xuất',
 'PDF-21': 'Hiển thị vấn đề chưa xác minh do agent ghi trong issues',
 'REPORT-10': 'Thống kê kết quả duyệt gói dữ liệu nhập',
 'REPORT-11': 'Thống kê lỗi dữ liệu nhập, câu hỏi và audio; không có chỉ số nhận dạng PDF',
}

def feature_record(f):
    t=by_id[feature_task[f['id']]]
    external=f['id'] in EXTERNAL_FEATURES
    return {**f,'taskId':t['id'],'owner':t['owner'],'targetDay':t['day'],
      'executionTitle': EXECUTION_TITLES.get(f['id'],f['title']) if not external else 'Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này',
      'executionMode':'EXTERNAL_PREPARATION' if external else 'APPLICATION',
      'deliveryOwner':'PROJECT_OWNER' if external else t['owner'],
      'status':'EXTERNAL_INPUT_REQUIRED' if external else 'TODO',
      'testIds':[] if external else [f"feature/{f['id']}"],
      'externalRequirementIds':[f"data-preparation/{f['id']}"] if external else [],
      'evidence':[],'codeVerified':False,'providerVerified':False,'productionVerified':False}

TASKS = []
OWNERS = {
    'W1': ('Hợp đồng dữ liệu và logic thi', ['package.json', 'packages/schema/', 'packages/exam-engine/', 'packages/media-token/', 'packages/srs/', 'packages/api-client/', 'contracts/', 'fixtures/contracts/', 'apps/api/src/db/', 'docs/decisions/']),
    'W2': ('API tài khoản nội dung và thi', ['package.json', 'apps/api/package.json', 'apps/api/src/common/', 'apps/api/src/modules/auth/', 'apps/api/src/modules/user/', 'apps/api/src/modules/exam/', 'apps/api/src/modules/attempt/', 'apps/api/src/modules/question-bank/', 'apps/api/src/modules/import/', 'apps/api/src/modules/media/', 'apps/api/src/modules/review/', 'apps/api/src/modules/storage/', 'apps/api/src/modules/license/', 'apps/api/src/modules/blueprint/', 'apps/api/src/modules/audit/', 'apps/api/src/modules/notification/', 'apps/api/src/modules/community/', 'apps/api/src/modules/classroom/', 'apps/api/src/modules/scoring/', 'apps/api/src/modules/outbox/', 'apps/api/src/modules/email/', 'apps/api/src/modules/admin/', 'apps/api/src/modules/turnstile/', 'apps/api/src/main.ts', 'apps/api/src/app.module.ts', 'docs/decisions/']),
    'W3': ('Giao diện học viên', ['package.json', 'apps/web/', 'packages/ui/', 'docs/decisions/']),
    'W4': ('Quản trị báo cáo và thương mại', ['package.json', 'apps/admin/', 'apps/api/src/modules/payment/', 'apps/api/src/modules/entitlement/', 'apps/api/src/modules/reporting/', 'apps/api/src/modules/cms/', 'apps/api/src/modules/experiment/', 'docs/decisions/']),
    'W5': ('Chuẩn nhập liệu dữ liệu và học thông minh', ['package.json', 'tools/import-data/', 'packages/content-tools/', 'apps/api/src/modules/ai/', 'apps/api/src/modules/vocab/', 'apps/api/src/modules/stats/', 'apps/api/src/modules/planner/', 'apps/api/src/modules/gamification/', 'apps/api/src/modules/learning/', 'fixtures/imports/', 'docs/import-format/', 'docs/decisions/']),
    'W6': ('Hạ tầng CI và kiểm chứng', ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'turbo.json', '.gitignore', '.gitattributes', '.nvmrc', '.npmrc', '.editorconfig', 'README.md', 'infra/', '.github/', 'tests/', 'packages/config/', 'apps/media-worker/', 'docs/runbooks/', 'docs/release/', 'docs/decisions/']),
}

# Every exclusiveResources name a task may use. The coordinator refuses unknown names.
LOCKS = {
    'repo-root': 'File cấu hình gốc của monorepo',
    'dependency-lock': 'pnpm-lock.yaml và package manifests; worker gửi yêu cầu thêm thư viện, coordinator gộp thành bước ngắn có khóa',
    'schema-contract': 'packages/schema, contracts/, api-client sinh tự động',
    'db-migration': 'Migration journal và schema DB',
    'engine-contract': 'API công khai của packages/exam-engine',
    'ui-contract': 'Component và token dùng chung trong packages/ui',
    'ci-workflow': '.github/workflows',
    'staging-deploy': 'Môi trường staging dùng chung',
    'heavy-load': 'Cửa sổ chạy load test riêng',
    'api-hardening': 'Đợt sửa bảo mật chạm nhiều module API',
}

# startPrerequisites block assignment. acceptancePrerequisites never block assignment or the
# dependency graph: the task codes and tests against sandbox/fixtures, and only the related
# PROVIDER_VERIFIED/acceptance stays BLOCKED_EXTERNAL until the owner supplies the input.
EXTERNAL_IDS = ['repo-ci','coding-vps','coding-accounts','coordinator-runtime','hosting','google-oauth','email',
 'jlpt-blueprints','sample-rights','prepared-import-data','ai-provider','dictionary','tts-provider','r2','cloudflare',
 'payment-provider','billing-policy','privacy-policy','ai-budget','device-test']

def task(id, owner, day, hours, title, deps, scope, outputs, acceptance, checks,
         feature_expr='', contracts='', resources='', external='', kind='implementation', start='', grants=''):
    # '@roots' expands to the owner's allowedRoots, for verification tasks that may touch any owned path.
    outputs = outputs.replace('@roots', '|'.join(OWNERS[owner][1]))
    TASKS.append(dict(id=id, owner=owner, day=day, notBeforeHour=(day-1)*24,
        targetByHour=day*24, estimatedWorkerHours=hours, title=title,
        dependencies=deps.split(), featureIds=codes(feature_expr) if feature_expr else [],
        scope=scope, outputs=outputs.split('|'), acceptance=acceptance.split('|'),
        checks=checks.split('|'), contracts=contracts.split() if contracts else [],
        exclusiveResources=resources.split() if resources else [],
        startPrerequisites=start.split() if start else [], acceptancePrerequisites=external.split() if external else [],
        temporaryGrants=grants.split() if grants else [],
        kind=kind, status='TODO', reviewRequired=True, evidence=[],
        originalTaskRefs=[]))

# Day 1. Foundation is split into early deliveries so all six lanes can start.
task('F01','W6',1,3,'Repo và bộ kiểm tra tối thiểu','',
 'Khởi tạo toàn bộ app/package V1–V4, Node/pnpm lock, lệnh kiểm tra; chưa phát triển tính năng.',
 'package.json|pnpm-workspace.yaml|turbo.json|packages/config/|.github/workflows/ci.yml',
 'Fresh clone cài được bằng frozen lockfile|Mỗi app có health và một test smoke|CI chạy lint typecheck test build; không có dịch vụ tự đọc PDF|Cài sẵn và khóa phiên bản các thư viện lõi đã biết (Zod, Better Auth, Drizzle, FSRS, S3 SDK, Playwright, k6) để giảm số lần đổi lockfile về sau',
 'pnpm install --frozen-lockfile|pnpm lint|pnpm typecheck|pnpm test|pnpm build',resources='repo-root dependency-lock ci-workflow',start='repo-ci coding-vps coding-accounts',grants='apps/ packages/')
task('F02','W1',1,4,'Chốt hợp đồng V1–V4 và fixture dùng chung','F01',
 'Zod DTO, OpenAPI, JSON Schema, events; cả API admin, payment, lớp học và học tập. Không chỉ thiết kế lượt thi.',
 'packages/schema/|packages/api-client/|contracts/openapi.yaml|contracts/events.schema.json|fixtures/contracts/',
 'DTO công khai tách DTO đáp án|Mọi endpoint trong API_V1_V4.md có schema và ví dụ lỗi|Client sinh tự động không sai khác khi chạy lại',
 'pnpm contracts:check|pnpm contracts:generate|pnpm test:contracts',contracts='API EVENTS DB',resources='schema-contract repo-root',grants='package.json pnpm-workspace.yaml')
task('F03','W2',1,5,'Nền API xác thực phân quyền và email','F02',
 'Better Auth, Google OAuth, email password, xác minh, reset, session và tenant guards; không tự xây crypto.',
 'apps/api/src/common/|apps/api/src/modules/auth/|apps/api/src/modules/user/|apps/api/src/modules/email/',
 'Đăng ký xác minh đăng nhập đăng xuất và reset một lần chạy thật trên Mailpit|OAuth callback kiểm tra state và redirect allowlist|Endpoint thiếu quyền mặc định bị từ chối; log che PII',
 'pnpm test:auth|pnpm test:authorization', 'ACC:1-5,7,10,12 NOTI:1-2 SYS:6-7',contracts='API DB',external='google-oauth email')
task('F04','W3',1,6,'Design system i18n layout và giao diện tài khoản','F02',
 'Web mobile-first, UI chung, route public tĩnh, auth client mock theo contract; i18n vi ja en và theme.',
 'apps/web/app/|apps/web/messages/|packages/ui/',
 'Ba locale có đủ key và fallback rõ|Keyboard focus và screen-reader labels hoạt động|Đăng ký đăng nhập reset xác minh nối API trong F03 trước DONE',
 'pnpm test:web|pnpm test:i18n|pnpm test:a11y', 'ACC:14 EXAM:26 SYS:1,14',contracts='API',resources='ui-contract')
task('F05','W4',1,5,'Khung admin và đăng nhập nhân sự','F02',
 'Admin navigation theo role, TOTP enrollment, recovery codes và lớp API client admin; mock chỉ dùng khi phát triển.',
 'apps/admin/|apps/admin/messages/',
 'Editor reviewer admin thấy đúng menu|TOTP bắt buộc ở cả server và UI khi tích hợp N02|Thử gọi trực tiếp API không vượt được UI guard',
 'pnpm test:admin|pnpm test:admin-auth',contracts='API')
task('F06','W5',1,6,'Chuẩn dữ liệu nhập và hướng dẫn chuẩn bị dữ liệu thủ công','F01',
 'Chốt import v2, schema, gói mẫu, hướng dẫn chủ dự án; chỉ nhận dữ liệu đã chuẩn hóa, không tích hợp agent, parser hoặc model đọc PDF.',
 'tools/import-data/|packages/content-tools/|docs/import-format/|fixtures/imports/',
 'Schema và ví dụ có ruby bảng hình sao đáp án audio timeline|Chỗ không chắc có issue blocking, không tự đoán|Chủ dự án tự chuẩn bị dữ liệu rồi upload; hệ thống không gọi hoặc điều khiển agent',
 'pnpm test:import-contracts|pnpm import:validate -- fixtures/imports/ready',
 'PDF:6-16,18',kind='data-contract')
task('F07','W6',1,3,'Kiểm chứng coordinator trên VPS, dev services từng worker và CI tích hợp','F01',
 'Coordinator được xây và kiểm thử ở ngày 0 trong repo riêng jlpt-coordinator (DAC_TA_RUNNER.md), không phải task code của worker. F07 chỉ dựng dev services tách riêng từng worker, CI tích hợp và chạy kiểm tra trên VPS trước khi bật giao việc tự động.',
 'infra/dev/|.github/workflows/integration.yml',
 'Coordinator đã qua đủ 12 tình huống kiểm thử trong DAC_TA_RUNNER.md trước khi bật giao việc tự động|workers check xác nhận đăng nhập CLI, quyền repo, cổng, giới hạn build/E2E và bị chặn khi đọc secret của worker khác|DB, Redis, queue, storage và cổng của từng worker tách riêng|Khi chưa đạt: giao task thủ công cùng định dạng assignment và log',
 'coordinator workers check|coordinator run --dry-run|pnpm infra:dev:check',resources='ci-workflow',start='coordinator-runtime')
task('F08','W1',1,5,'Schema database và migration toàn bộ miền','F02',
 'Dựng core DB và migrations mở rộng cho toàn bộ module; schema đầu tiên đủ FK/tenant/outbox; agent chuẩn bị dữ liệu không được cấp quyền DB.',
 'apps/api/src/db/|packages/schema/fixtures/',
 'Migrate fresh seeded rollback-code compatibility pass|Có dữ liệu tự soạn N1–N5, gắn nhãn synthetic|Blueprint thi thật chỉ kích hoạt khi có nguồn chính thức và xác nhận',
 'pnpm db:migrate:test|pnpm db:seed:test|pnpm test:db',contracts='DB EVENTS',resources='db-migration schema-contract')

# Day 2. Core exam/content and external infrastructure.
task('C01','W1',2,6,'Logic thời gian chấm điểm phiếu timeline và token','F08',
 'Hàm thuần, section lock, late sync, reference scoring, WebCrypto token và validate blueprint.',
 'packages/exam-engine/|packages/media-token/',
 'Biên deadline grace late window có test|Score đúng nhưng luôn ghi tham khảo|Phiếu sai số lựa chọn bị từ chối|Coverage exam-engine >=90%|Validate listening timeline đúng dạng import v2 (audioStartMs/audioEndMs)|Blueprint chính thức chỉ kích hoạt khi jlpt-blueprints được xác nhận; trước đó chỉ blueprint synthetic|Blueprint synthetic trong docs/multi-worker/demo-data/blueprints/ hợp lệ với validator blueprint và dùng được cho đề demo',
 'pnpm test:exam-engine|pnpm test:media-token|pnpm test:coverage', 'SCORE:1-6,13 SYS:4,16',contracts='API DB',resources='engine-contract',external='jlpt-blueprints')
task('C02','W2',2,6,'Lưu trữ media nguồn license và câu hỏi có phiên bản','F03 F08',
 'Storage local/R2, magic bytes range limits, immutable content versions, full CRUD question groups và license enforcement.',
 'apps/api/src/modules/storage/|apps/api/src/modules/media/|apps/api/src/modules/question-bank/|apps/api/src/modules/license/',
 'Upload giả đuôi và zip-slip/bomb bị từ chối|Sửa nội dung approved tạo phiên bản mới|Nguồn chưa cấp quyền không xuất bản hoặc trộn|Import trùng checksum idempotent',
 'pnpm test:content|pnpm test:upload|pnpm test:storage', 'QB:1-7,11,13-17 ADM:5-6,19',contracts='API DB',external='r2')
task('C03','W3',2,6,'Phòng thi khung câu hỏi đồng hồ và đồng bộ local','F04 F08',
 'RichText, IndexedDB outbox, autosave theo batch và lease; dùng contract fixtures đến khi API sẵn.',
 'apps/web/features/exam/|packages/ui/rich-text/',
 'Renders ruby underline star table và ảnh không XSS|Debounce 3 giây max10s một request đang chờ|IndexedDB ghi trước gửi; chưa ACK không báo đã lưu|API giả không đủ điều kiện nghiệm thu cuối',
 'pnpm test:exam-ui|pnpm test:sync|pnpm test:rich-text', 'EXAM:1-4,6-8,10-17,19,21-22',contracts='API')
task('C04','W4',2,6,'Admin ngân hàng câu hỏi editor RichText và blueprint','F05 F08',
 'Editor đủ thao tác theo đoạn, đáp án riêng, filter/search, source/license, preview, blueprint versions và users.',
 'apps/admin/features/content/|apps/admin/features/users/',
 'Tạo sửa ruby star bài đọc bảng nghe và xem trước|Không sửa đè published version|Admin sửa role còn editor không thể tự nâng quyền',
 'pnpm test:admin-content|pnpm test:admin-users', 'ADM:2-4,8',contracts='API')
task('C05','W5',2,6,'Validator gói nhập kiểm tra dữ liệu và đóng gói','F06 F08',
 'Validate JSON Schema, đáp án, nhóm đọc/nghe, references, media/checksums, archive paths, issues và idempotency; không phân tích PDF hoặc gọi AI sửa ngầm.',
 'tools/import-data/|packages/content-tools/',
 'Lỗi schema checksum đáp án timeline hoặc thiếu file có path cụ thể|Draft có vấn đề vẫn lưu nháp nhưng bị chặn publish|Ready đủ media và không issue blocking|Nhập lại packageId/revision/content hash không tạo trùng; sửa nội dung có revision mới|Gói demo docs/multi-worker/demo-data/demo-n5-1.zip đạt READY',
 'pnpm test:import-contracts|pnpm test:import-validation|pnpm import:validate -- fixtures/imports/ready', 'PDF:21-23,27',contracts='API DB',external='sample-rights')
task('C06','W6',2,6,'Staging production profiles CDN backup và release','F01 F08',
 'Compose full small/large, R2/media Worker, Cloudflare Tunnel, WAL-G, GHCR deploy rollback; secrets qua operator. Chưa có hosting: staging tạm dựng bằng docker compose (profile small) trong GitHub Actions; cùng script deploy lên staging thật khi có hosting.',
 'infra/|apps/media-worker/|.github/workflows/',
 'Workflow staging tạm trong GitHub Actions dựng compose profile small từ image build một lần, chạy smoke và xanh trên PR|Staging độc lập dữ liệu worker|Signed media check trước cache; Range206 đúng|Backup PITR khôi phục trên staging tạm có RPO/RTO đo trong log CI|Không build trên production|Lệnh cần Docker (deploy, restore) chạy trong CI, không chạy trên VPS coding vì worker không có Docker',
 'pnpm test:media-edge|pnpm infra:check', 'SYS:8-9,11,15 ADM:20',contracts='API',resources='ci-workflow staging-deploy',external='cloudflare r2 hosting')

# Day 3. Close the first vertical slice and implement learning engines.
task('N01','W1',3,5,'Thuật toán luyện và trộn tất cả chế độ','C01 C02',
 'Seeded generator Random Balanced Weakness Unseen Challenge Revision Custom, source ratios và immutable GeneratedExam.',
 'packages/exam-engine/mix/|packages/exam-engine/practice/',
 '1000 property cases giữ nhóm, đúng level, không trùng, đủ tài nguyên và license|Cùng seed/config/engineVersion ra cùng đề|Thiếu pool trả shortage; không âm thầm sai tỷ lệ',
 'pnpm test:mix:property|pnpm test:practice-engine', 'MIX:1-10,12,18-19 PRA:1-9,14-16',contracts='API DB',resources='engine-contract')
task('N02','W2',3,7,'API thi thật bảo mật và job nền','C01 C02',
 'Attempt create section/save/submit/resume/review, lease, outbox, verified-email, RBAC TOTP Turnstile rate-limit audit, media access; guest trial cookie, Turnstile/rate limits và attach guest attempts khi đăng ký.',
 'apps/api/src/modules/attempt/|apps/api/src/modules/scoring/|apps/api/src/modules/outbox/|apps/api/src/common/',
 'Seq2 trước1 trùng seq hai tab và submit/job race đúng|ACK chỉ sau commit DB|Answer key không xuất hiện trước nộp|TOTP Origin CSRF rate-limit audit có negative tests|Guest chỉ làm đề guestTrial, attach history không chiếm attempt người khác',
 'pnpm test:attempts|pnpm test:authorization|pnpm test:no-answer-leak|pnpm test:jobs', 'EXAM:9,18,20 SYS:3,5,12-13,18,20 ADM:14',contracts='API DB EVENTS')
task('N03','W3',3,6,'Hoàn tất thi nghe khôi phục kết quả và public library','C03 N02',
 'Nối API thật; audio cache timeline speaker gate seek restriction, results review history và public listing đầy đủ filters.',
 'apps/web/features/exam/|apps/web/features/results/|apps/web/app/',
 'Full exam N1–N5 với fixtures phù hợp|Reload audio sai số<=2s; mất mạng không mất phiếu|Public HTML không PII; nhận lỗi lease rõ|Có history persisted và review authorization',
 'pnpm test:e2e:exam|pnpm test:e2e:library', 'AUDIO:1-7,10 EXAM:5,23-25 LIB:1-8,15 SCORE:7-11 STAT:1',contracts='API')
task('N04','W4',3,6,'Nhập gói chuẩn đối chiếu duyệt xuất bản và audit admin','C04 C02 C05',
 'Upload một hoặc nhiều gói chuẩn có JSON đáp án ảnh audio; PDF gốc tùy chọn chỉ để đối chiếu thủ công, không trích xuất tự động; timeline editor, two-person review và publish.',
 'apps/admin/features/import/|apps/admin/features/review/|apps/admin/features/exam/',
 'Upload import v2 chạy validator và tạo draft; PDF đơn lẻ không khởi động đọc file|Editor không tự duyệt|Publish version mới, takedown giữ version cũ|JSON/CSV import/export roundtrip và source page tùy chọn mở đúng',
 'pnpm test:e2e:import-publish|pnpm test:content-review', 'PDF:1-5,17,19-20,24-26,28-30 ADM:7',contracts='API EVENTS',external='sample-rights prepared-import-data jlpt-blueprints')
task('N05','W5',3,6,'NLP từ điển tagging và dữ liệu thống kê','C05 C02',
 'Tokenizer/NLP trên RichText và JSON đã duyệt, dictionary adapter, grammar tags, normalize base form and deduplicate corpus; không đọc PDF.',
 'packages/content-tools/nlp/|apps/api/src/modules/vocab/',
 'Từ xuất hiện trong đề khác từ được hỏi trực tiếp|Frequency theo kỳ level skill nguồn và role câu|Có dataset version size source date|Dictionary license và attribution đầy đủ',
 'pnpm test:nlp|pnpm test:vocab-data', 'DATA:1-10,19-23 QB:9',contracts='API DB EVENTS',external='dictionary sample-rights')
task('N06','W6',3,6,'Tích hợp nội dung tới thi và kiểm thử lỗi nền','C06 N02 N03 N04',
 'Triển khai vertical slice trên staging tạm trong CI (staging thật khi có hosting); test không lộ đáp án, isolation, recovery migration và load baseline.',
 'tests/integration/|tests/e2e/',
 'Gói demo docs/multi-worker/demo-data: validate->review->publish->thi->review chạy thật trên staging tạm trong CI|Cross-tenant/IDOR negative matrix pass|Ghi actual load metrics; không suy ra sức chịu khi chưa đo',
 'pnpm test:e2e:core|pnpm test:security|pnpm test:load:baseline',contracts='API',resources='staging-deploy heavy-load',external='hosting')

# Day 4. Learning, SRS, planner, commerce.
task('L01','W1',4,6,'SRS độ khó dedupe và hợp đồng learning','N01 N05',
 'FSRS via pinned lib, question similarity, empirical difficulty, confidence/cold start and progress models.',
 'packages/srs/|packages/exam-engine/difficulty/|packages/schema/learning/',
 'Lịch SRS khớp reference vectors; timezone midnight đúng|Difficulty đủ mẫu mới có kết luận|Báo xác suất đỗ là ước lượng chưa được hiệu chỉnh nếu thiếu dữ liệu|Tag grammar/vocab luyện được',
 'pnpm test:srs|pnpm test:difficulty|pnpm test:dedupe', 'QB:10,12,19-20 MIX:11 SCORE:14 STAT:9,12-14',contracts='API DB',resources='schema-contract engine-contract')
task('L02','W2',4,6,'API luyện trộn giải thích và thông báo','N02 N01',
 'Practice/mix CRUD/check, immutable generation, question reports/explanations moderation, notification prefs and scheduled delivery.',
 'apps/api/src/modules/exam/|apps/api/src/modules/review/|apps/api/src/modules/notification/',
 'Check chỉ trả câu đã trả lời ở practice; không mở answer key thi thật|Chia sẻ đề không vượt license và owner scope|Thông báo opt-out quiet hours idempotent|Qbank tracks generated-exam usage',
 'pnpm test:practice-api|pnpm test:explanations|pnpm test:notifications', 'PRA:10-13,17 MIX:13-17 QB:8,18 EXPL:1-10,12-13 NOTI:3-10 AUDIO:8-9',contracts='API DB EVENTS')
task('L03','W3',4,7,'Giao diện luyện trộn chữa bài và dashboard','N03 L02 N05',
 'Tất cả generator modes, luyện filters, shortage UX, explain approved, bookmark, transcript sync, analytics and library personalization.',
 'apps/web/features/practice/|apps/web/features/mix/|apps/web/features/analytics/|apps/web/features/explanations/',
 'Mỗi chế độ generator có E2E|Nguồn/licensed transcript chỉ hiện theo quyền|Dashboard dữ liệu tính tay đúng, không trộn câu quen với câu mới|Favorite best-score attempts next recommendation có đủ UI',
 'pnpm test:e2e:learning|pnpm test:analytics', 'LIB:9-14 STAT:2-8,10-11 SCORE:15',contracts='API')
task('L04','W4',4,7,'Payment entitlements coupons refunds và admin thương mại','C04 N02 F08',
 'Một adapter payment thật theo lựa chọn operator, sandbox + live mode, subscriptions, refunds, coupons atomically reserved và billing UI.',
 'apps/api/src/modules/payment/|apps/api/src/modules/entitlement/|apps/admin/features/billing/',
 'Webhook chữ ký sai bị từ chối; lặp/out-of-order không cấp quyền sai|Hoàn tiền hủy gia hạn đổi gói và tenant plans có state machine|Quota AI reserve/settle/refund nguyên tử|Không coi mock là live verified',
 'pnpm test:payments|pnpm test:entitlements|pnpm test:payment-provider', 'PAY:1-12 ADM:15-16',contracts='API DB EVENTS',external='payment-provider billing-policy')
task('L05','W5',4,7,'Notebook SRS learning APIs và planner','N05 L01 N02',
 'Lookup vocab kanji grammar, notebook sync, flashcard, quizzes, CSV/TTS; planner30/60/90 weak-skill adjustments and aggregate stats.',
 'apps/api/src/modules/learning/|apps/api/src/modules/planner/|apps/api/src/modules/stats/',
 'Cross-device review duplicate không nhân đôi lịch|Timezone goal dates và missed-session replanning có deterministic tests|No-data readiness không bịa kết quả|CSV formula injection neutralized; TTS license kiểm tra',
 'pnpm test:learning|pnpm test:planner|pnpm test:analytics-data', 'VOC:1-18 PLAN:1-12',contracts='API DB EVENTS',external='dictionary tts-provider')
task('L06','W6',4,6,'Kiểm thử learning commerce và outbox reliability','N06 L02 L04 L05',
 'Tích hợp APIs learning vào staging, replay events, provider network fail, concurrency limits và account quota simulator.',
 'tests/integration/learning/|tests/integration/billing/',
 'Replay events không double-charge/double-count|Payment signature/retry tamper cases pass|Diễn tập pause/checkpoint/resume của coordinator trên một task thật không mất patch; bằng chứng lấy từ coordinator',
 'pnpm test:integration:learning|pnpm test:integration:billing',resources='staging-deploy')

# Day 5. Complete all advanced modules, no deferral.
task('A01','W1',5,6,'Hợp đồng lớp thi sự kiện community AI và privacy','L01 L04',
 'Review expanded schema migration, tenant isolation, AI generation labels, consent/delete and experiment event schemas.',
 'packages/schema/|apps/api/src/db/|packages/api-client/',
 'Tenant-scoped composite constraints|Delete/export không phá nghĩa vụ retention chưa được phê duyệt|Public events không chứa answers hay PII|No schema drift',
 'pnpm contracts:check|pnpm test:db|pnpm test:contracts',contracts='API DB EVENTS',resources='schema-contract db-migration')
task('A02','W2',5,8,'Lớp học thi sự kiện cộng đồng và quản lý tài khoản','L02 A01',
 'Teacher onboarding org membership invites assignments classroom analytics exports, event schedule/result release, discussions/report moderation; privacy account flows.',
 'apps/api/src/modules/classroom/|apps/api/src/modules/community/|apps/api/src/modules/user/',
 'Teacher A không đọc học viên org B|Invite expired/revoked/single-use đúng policy|Event chưa kết thúc không lộ answer kể cả early submit/review|Discussion chỉ sau completion và moderation|Account export/delete avatar/session đầy đủ',
 'pnpm test:classrooms|pnpm test:events|pnpm test:community|pnpm test:privacy', 'TEA:1-13 GAME:6-9 ACC:6,8-9,11,13 SYS:19',contracts='API DB EVENTS',external='privacy-policy')
task('A03','W3',5,8,'UI notebook planner classroom community và gói thành viên','L03 L05 L04 A02',
 'Hoàn thành web learning, flashcards planner teacher portal event lobby discussions sharing exports checkout/account settings; không để nút giả.',
 'apps/web/features/learning/|apps/web/features/planner/|apps/web/features/classroom/|apps/web/features/community/|apps/web/features/billing/',
 'SRS/mobile review sync và notification settings có E2E|Teacher giao đề xem progress/export và cohort privacy|Coupon checkout refund status hiển thị đúng backend|i18n/a11y full routes',
 'pnpm test:e2e:advanced|pnpm test:e2e:checkout|pnpm test:a11y',contracts='API')
task('A04','W4',5,7,'Admin đầy đủ CMS báo cáo và thử nghiệm UI','L04 A01 N04',
 'Admin explanations tags vocab reports AI moderation teacher org settings; blog/landing plans; consented product analytics experiment assignment.',
 'apps/admin/|apps/api/src/modules/reporting/|apps/api/src/modules/cms/|apps/api/src/modules/experiment/',
 'Mọi mục ADM có UI và API thật|Reporting doanh thu/funnel/cohort khớp seeded dataset|Markdown sanitized; experiment sticky assignment không lộ PII|D7/D30 reports hiển thị insufficient-data thay số thật giả',
 'pnpm test:admin-full|pnpm test:reporting|pnpm test:cms|pnpm test:experiments', 'ADM:1,9-13,17-18 REPORT:1-15 SEO:5,9,12',contracts='API DB EVENTS')
task('A05','W5',5,8,'AI học tập câu sinh và gamification thống kê public','L05 A01 L04',
 'AI actions all14 via paid adapter, streaming moderated scoped retrieval, weekly summaries, generated questions two-person review; streak achievements leaderboard challenge; dataset API/export recommendations.',
 'apps/api/src/modules/ai/|apps/api/src/modules/gamification/|apps/api/src/modules/vocab/',
 'Không nhận model-provided tool permission hoặc raw secret|AI bị chặn trong active real exam và event embargo|Token/cost budget atomic, failures refund reservation|Generated label và approval mandatory|Streak timezone anti-replay, voluntary separate leaderboards|Corpus provenance và CSV/XLSX roundtrip',
 'pnpm test:ai|pnpm test:gamification|pnpm test:dataset-export', 'AI:1-14 EXPL:11 GAME:1-5,10 DATA:11-18,24-26',contracts='API DB EVENTS',external='ai-provider ai-budget')
task('A06','W6',6,6,'Tích hợp toàn bộ module và kiểm tra phạm vi hiện hành','L06 A02 A03 A04 A05',
 'Dựng staging đủ mọi route, worker background, providers, coverage by feature; generated smoke list không thay test thật.',
 'tests/e2e/full/',
 '363yêu cầu ứng dụng có test reference;12yêu cầu chuẩn bị bên ngoài không tính vào code coverage|Không còn UI placeholder hoặc endpoint stub được tính DONE|Review và CI gắn đúng headSHA/baseSHA',
 'pnpm test:e2e:full|pnpm features:verify|pnpm test:contracts',resources='staging-deploy')

# Day 6. Finish secondary interfaces, then full validation and recovery.
task('V01','W1',6,6,'Race tests thuật toán dữ liệu export và schema hardening','A01 A05',
 'Repair race/isolation/serialization, exports PDF/XLSX, privacy migration; audit all engine contracts.',
 '@roots',
 'Score report PDF có text Nhật và không chứa dữ liệu người khác|Property suites và SRS/difficulty pass|Migrations concurrent không chạy hai lần',
 'pnpm test:engines:all|pnpm test:exports|pnpm test:db', 'SCORE:12',contracts='API DB',resources='db-migration engine-contract schema-contract')
task('V02','W2',6,6,'API security payment classroom event incident fixes','A02 A05',
 'Independent negative tests từ W6, auth roles tenant entitlements event embargo and data retention requests.',
 '@roots',
 'Mọi endpoint có ownership/tenant/entitlement tests|Unsafe upload path và expired URL fail|Rate-limit không dùng chung namespace staging/worker',
 'pnpm test:security|pnpm test:api:all',contracts='API',resources='api-hardening')
task('V03','W3',6,7,'UI AI thống kê SEO media và exports hoàn chỉnh','A03 A05 A04 V01',
 'AI chat học tập generation labels, gamification, corpus pages, PDF download/export, consent-aware analytics full SEO pages, transcript evidence và share links.',
 'apps/web/|packages/ui/',
 'Không có nút chức năng chưa nối API|Public pages static không chứa PII, JSON-LD sitemap hreflang đúng|Âm thanh TTS có fallback thông báo lỗi, không giả provider thành công|Core Web Vitals instrumentation và bundle budgets',
 'pnpm test:e2e:web-all|pnpm test:seo|pnpm test:performance|pnpm test:i18n', 'SEO:1-4,6-8,10-11 SYS:2,17',contracts='API')
task('V04','W4',6,6,'Admin reconciliation vận hành và chứng từ provider','A04 A06',
 'Đối soát payment refund, cost/corpus reports, full admin flows, backup restore UI chỉ gọi operator job được phép.',
 'apps/admin/|apps/api/src/modules/reporting/',
 'Webhook/live readiness có bằng chứng riêng sandbox|Admin backup không giữ raw secrets trong browser|Mọi action audit có actor và tenant|Report CSV escaping và revenue rounding đúng',
 'pnpm test:e2e:admin-all|pnpm test:reconciliation',contracts='API',external='payment-provider')
task('V05','W5',6,6,'Đối chiếu dữ liệu nhập AI thật và học tập E2E','A05 A06',
 'Kiểm thử gói do agent ngoài chuẩn bị, dữ liệu thiếu và sửa revision; actual learning AI/dictionary/TTS tests, statistical cold start và learning workflows.',
 'tools/import-data/|packages/content-tools/|apps/api/src/modules/ai/|apps/api/src/modules/learning/',
 'Gói chuẩn giữ đúng ruby bảng sao audio đáp án qua import và snapshot không lộ đáp án|Provider học tập chưa có credential phải BLOCKED_EXTERNAL|Sinh câu qua moderation đến làm bài|Data tests phân biệt observed và synthetic',
 'pnpm test:import-validation|pnpm test:providers:live|pnpm test:learning:all',external='prepared-import-data ai-provider dictionary tts-provider sample-rights')
task('V06','W6',6,8,'Full regression load accessibility security và restore','A06 V02 V03 V04 V05',
 'Chromium WebKit Firefox; device operator, k6 stepped load, ZAP/CodeQL/deps, backup restore cold deploy rollback.',
 'tests/|infra/',
 'Record target and observed capacity separately|RPO<=5min RTO<=1h có timestamps từ job restore trong CI|No P0/P1 accepted silently|Load generator tách khỏi target; không đo sức chịu bằng VPS đang build',
 'pnpm test:e2e:all-browsers|pnpm test:security|pnpm test:load|pnpm test:a11y', 'SYS:10',resources='staging-deploy heavy-load',external='device-test hosting')

# Day 7. Feature fixes remain in scope; no silent cuts if the target is missed.
for owner, name, paths, checks, deps in [
 ('W1','Chốt hợp đồng logic và migration','@roots','pnpm test:engines:all|pnpm contracts:check|pnpm test:db','V01 V06'),
 ('W2','Sửa lỗi API và xác nhận dữ liệu quyền','@roots','pnpm test:api:all|pnpm test:security','V02 V06'),
 ('W3','Sửa lỗi web và kiểm tra thiết bị thật','apps/web/|packages/ui/','pnpm test:e2e:web-all|pnpm test:a11y','V03 V06'),
 ('W4','Chốt admin payment và báo cáo','apps/admin/|apps/api/src/modules/payment/','pnpm test:e2e:admin-all|pnpm test:payments','V04 V06'),
 ('W5','Chốt dữ liệu nhập AI learning và dữ liệu','tools/import-data/|packages/content-tools/|apps/api/src/modules/ai/','pnpm test:import-validation|pnpm test:learning:all','V05 V06'),
]:
    task('R0'+owner[-1],owner,7,5,name,deps,
     'Sửa mọi lỗi nghiệm thu thuộc363yêu cầu ứng dụng hiện hành;12yêu cầu chuẩn bị dữ liệu thủ công báo riêng, không dựng lại chức năng đọc PDF.',
     paths,
     'Review chéo trên đúng commit|Không còn P0/P1 cho code acceptance|Feature evidence truy ngược được tới commit và lệnh',checks,kind='verification',
     external='device-test' if owner=='W3' else '')
task('R06','W6',7,6,'Nghiệm thu phạm vi hiện hành và bàn giao toàn bộ','R01 R02 R03 R04 R05',
 'Chạy final release candidate, đối chiếu matrix, ghi separate code/provider/release acceptance; owner quyết định production.',
 'docs/release/BAO_CAO_NGAY_7.md|docs/release/feature-evidence.json|docs/release/release-decision.md|docs/runbooks/',
 '363yêu cầu ứng dụng chỉ DONE khi đủ evidence;12yêu cầu chuẩn bị bên ngoài báo riêng|Thiếu yêu cầu trong phạm vi hiện hành => TARGET_NOT_MET|Chưa beta14ngày/payment30ngày không ghi đạt|Runbooks deploy rollback restore handover tái hiện được',
 'pnpm features:verify|pnpm test:release',resources='staging-deploy',kind='verification',external='hosting')

# Supplemental tasks ensure capabilities that cross work-package boundaries are explicit.
task('B01','W2',3,4,'API nhập gói chuẩn duyệt ghép đề và xuất bản','C02 C01 C05',
 'Upload import v2 ZIP->quarantine->schema/checksum/semantic validation->draft, admin review và immutable publishing; không executor đọc PDF và không callback trích xuất.',
 'apps/api/src/modules/import/|apps/api/src/modules/review/|apps/api/src/modules/exam/',
 'Validate trước import DB; transaction rollback không để dữ liệu dở|PackageId/revision/content hash chống trùng và nhận diện conflict|Editor!=reviewer; create version và outbox transaction consistent|Lệnh pnpm demo:seed nạp blueprint synthetic và gói trong docs/multi-worker/demo-data/ vào DB dev qua đúng luồng import→duyệt→publish (tài khoản editor/reviewer seed khác nhau), chạy lại không tạo trùng',
 'pnpm test:import-jobs|pnpm test:publish',contracts='API EVENTS')
# Make UI/vertical-slice dependency on the actual backend explicit.
next(t for t in TASKS if t['id']=='N04')['dependencies'].append('B01')
next(t for t in TASKS if t['id']=='F03')['dependencies'].append('F08')
next(t for t in TASKS if t['id']=='F04')['dependencies'].append('F03')
next(t for t in TASKS if t['id']=='F05')['dependencies'].append('F03')
next(t for t in TASKS if t['id']=='N03')['dependencies'].append('F03')
next(t for t in TASKS if t['id']=='F04')['acceptance'].append('F03 là dependency nghiệm thu tích hợp, không chặn thiết kế/mock ban đầu')

# Map every feature exactly once to a primary delivery task; other tasks may integrate it.
feature_task = {}
for t in TASKS:
    for code in t['featureIds']:
        assert code not in feature_task, ('duplicate', code)
        feature_task[code] = t['id']
missing = sorted(set(feature_by_id) - set(feature_task))
assert not missing, ('unmapped source features', missing)
by_id = {t['id']:t for t in TASKS}

# Original task IDs are retained as traceable detail, not as a second scheduler.
old_plan = (SOURCE/'KE_HOACH_TRIEN_KHAI.md').read_text(encoding='utf-8-sig')
original_tasks=[]
for m in re.finditer(r'^#### (T1\.\d+\.\d+) — (.+?)\s+\[(.+?)\]\s*\n(.*?)(?=^#### |^### |^\*\*Cổng ra|\Z)',old_plan,re.M|re.S):
    original_tasks.append(dict(id=m[1],title=m[2].strip(),role=m[3],body=m[4].strip()))
original_owner_groups={
 '0': ['F02','F06','F08'], '1':['F01','F07','C06'],
 '2':['F02','F08','C01'], '3':['F03','N02','F04','F05'],
 '4':['C02','C04','B01','N04'], '5':['C01','N02','C03','N03','N06'],
 '6':['F04','N03','V03'], '7':['F06','C05','N04','N05','V05'],
 '8':['C06','V06','R06'], '9':['V06','R06']}
for old in original_tasks:
    old['executionTasks'] = original_owner_groups[old['id'].split('.')[1]]
    for tid in old['executionTasks']:
        by_id[tid]['originalTaskRefs'].append(old['id'])

dump('tasks.json', {'schemaVersion':1,'scope':'ALL_V1_V4','targetDays':7,'startMode':'relative-day',
     'featureSourceCount':len(features),'inputMode':'PREPARED_IMPORT_V2_NO_OCR',
     'applicationFeatureCount':len(features)-len(EXTERNAL_FEATURES),'externalPreparationCount':len(EXTERNAL_FEATURES),'estimatesAreUnverified':True,
     'stateAuthority':'one-coordinator','coordinator':'repo riêng jlpt-coordinator, xây và kiểm thử ở ngày 0',
     'locks':LOCKS,
     'prerequisiteSemantics':{'startPrerequisites':'Chặn giao task cho tới khi điều kiện ngoài sẵn sàng',
       'acceptancePrerequisites':'Không chặn giao task hay dependency; task code và test bằng sandbox/fixtures, chỉ PROVIDER_VERIFIED/nghiệm thu liên quan giữ BLOCKED_EXTERNAL'},
     'evidencePolicy':'Bằng chứng lưu ở kho evidence của coordinator/CI, gắn headSHA/baseSHA; worker không commit bằng chứng vào repo sản phẩm',
     'workerIds':list(OWNERS),'tasks':TASKS})

dump('features.json', {'schemaVersion':1,'scope':'ALL_V1_V4','inputMode':'PREPARED_IMPORT_V2_NO_OCR',
 'source':'nguon/DANH_MUC_TINH_NANG_GOC.md','applicationFeatureCount':363,'externalPreparationCount':12,
 'features':[feature_record(f) for f in features]})

rows=['# Ma trận 375 tính năng trong tuần','',
 'Giữ375mã nguồn để truy vết. Theo chỉ thị mới,363yêu cầu nằm trong ứng dụng (một số đổi thành nhập gói chuẩn);12yêu cầu đọc/trích xuất PDF chuyển sang agent bên ngoài. Không xây dịch vụ nhận dạng PDF và không tính12mã bên ngoài vào tỷ lệ code hoàn tất. [Chuẩn dữ liệu](CHUAN_DU_LIEU_NHAP.md) là hợp đồng đầu vào.',
 '', '| Mã | Tính năng theo nguồn | Hành vi hiện hành | Phạm vi | Ưu tiên | Task hỗ trợ | Worker | Ngày | Kiểm tra hoặc đầu vào | Trạng thái |',
 '|---|---|---|---|---|---|---|---|---|---|']
for f in features:
    t=by_id[feature_task[f['id']]]
    rec=feature_record(f)
    requirement=', '.join(rec['testIds']+rec['externalRequirementIds'])
    rows.append(f"| {f['id']} | {f['title']} | {rec['executionTitle']} | {rec['executionMode']} | {f['priority']} | [{t['id']}](KE_HOACH_TRIEN_KHAI.md#{t['id'].lower()}) | {t['owner']} | {t['day']} | {requirement} | {rec['status']} |")
write('MA_TRAN_TINH_NANG.md','\n'.join(rows))

cards=['# Kế hoạch triển khai toàn bộ V1 V2 V3 V4 bằng sáu worker','',
 f'Phiên bản {VERSION} ngày {DATE}. Giữ V1–V4 và lịch6worker/7ngày, thay riêng phần nhập nội dung:363yêu cầu ứng dụng và12yêu cầu chuẩn bị dữ liệu do bạn tự thực hiện. Không tích hợp agent, OCR, parser PDF hoặc model trích xuất trong sản phẩm. Không dùng chỉ thị đọc PDF cũ ở nguon/. Đây là kế hoạch, chưa phải bằng chứng thực thi.',
 '', '## Cách thực thi','',
 'Đọc [quy tắc](AGENTS.md), [lịch7ngày](KE_HOACH_7_NGAY.md), [hợp đồng](HOP_DONG_KY_THUAT.md) và [API](API_V1_V4.md). tasks.json là graph giao việc duy nhất; nguyên bản T1.x ở nguồn chỉ giúp truy vết chi tiết. Một task có thể chạy thiết kế/mock trước khi API sẵn, nhưng chỉ DONE sau kiểm tra tích hợp API thật. Không thay đổi dependencies lúc chạy để vượt gate.',
 '', '## Nguyên tắc nghiệm thu','',
 '363yêu cầu ứng dụng có test ID trong features.json;12yêu cầu agent ngoài có externalRequirementId thay test ứng dụng. Test ID ban đầu là yêu cầu cần viết, chưa phải test tồn tại. Mỗi task bổ sung testFiles/evidence trước REVIEW. Lệnh kiểm tra dưới đây cần tạo ở F01 và task liên quan; thiếu lệnh phải FAIL. Không coi gói vượt validator là nội dung/đáp án đã được xác minh bởi con người.',
 '', '## Điều phối','',
 'Mỗi worker chỉ thực hiện một task ghi tại một thời điểm. Task đủ dependencies mới được cấp; coordinator ưu tiên task mở khóa đường dài nhất rồi tới deadline. Bộ tài liệu dùng reviewer chéo trong sáu worker, không giả định có worker thứ7. Build/E2E/review dùng semaphore toàn cục. Task blocked không được tự coi là DONE.',
 '', 'Điều kiện ngoài có hai loại. **Chặn bắt đầu**: coordinator chưa giao task khi thiếu. **Chặn nghiệm thu**: task vẫn được giao, code và test bằng sandbox/fixtures; chỉ PROVIDER_VERIFIED hoặc nghiệm thu của tính năng liên quan giữ BLOCKED_EXTERNAL tới khi chủ dự án cung cấp. Bằng chứng (lệnh, exit code, report) lưu ở kho evidence của coordinator/CI, không commit vào repo sản phẩm.']
for day in range(1,8):
    cards += ['',f'## Ngày {day}','']
    for t in [x for x in TASKS if x['day']==day]:
        cards += ['',f"<a id=\"{t['id'].lower()}\"></a>",'',f"### {t['id']} {t['title']}",'',
         f"- Worker: **{t['owner']}**. Ngày mục tiêu: {day}. Ước lượng chưa đo: {t['estimatedWorkerHours']} giờ worker; không gồm mọi vòng sửa/review.",
         f"- Phụ thuộc: {', '.join(t['dependencies']) or 'không'}. Task chỉ DONE khi dependencies đã merge và nghiệm thu liên quan đầy đủ.",
         f"- Tính năng chính: {', '.join(t['featureIds']) or 'nền tảng hoặc tích hợp, hỗ trợ toàn bộ phạm vi'}.",
         f"- Phạm vi: {t['scope']}",
         '- Bàn giao: '+ '; '.join(t['outputs'])+'.',
         '- Hợp đồng: '+(', '.join(t['contracts']) or 'quy tắc chung')+'.',
         '- Khóa tài nguyên: '+(', '.join(t['exclusiveResources']) or 'theo đường dẫn task và quyền sở hữu worker')+'.',
         '- Điều kiện ngoài chặn bắt đầu: '+(', '.join(t['startPrerequisites']) or 'không')+'.',
         '- Điều kiện ngoài chặn nghiệm thu (không chặn giao việc): '+(', '.join(t['acceptancePrerequisites']) or 'không')+'.',
         '- Quyền ghi tạm ngoài thư mục của worker: '+(', '.join(t['temporaryGrants']) or 'không')+'.',
         '- Nghiệm thu:']
        cards += [f'  - {a}.' for a in t['acceptance']]
        cards += ['- Lệnh cần cung cấp và chạy:']+[f'  - `{c}`' for c in t['checks']]
        cards += ['- Ngoài phạm vi: không đổi hợp đồng chung, sửa file worker khác hoặc nâng chi phí nếu chưa có quyết định. Không bỏ tính năng được giao.',
                  '- Bằng chứng bắt buộc: commitSHA/baseSHA, đường dẫn test, command, exitCode, timestamp, artifact/report và kết quả từng feature.']
write('KE_HOACH_TRIEN_KHAI.md','\n'.join(cards))

details=['# Truy vết task V1 gốc sang kế hoạch sáu worker','',
 'Giữ toàn bộ chi tiết Làm/Không làm/Kiểm tra của V1 để không mất yêu cầu. Phụ thuộc và lịch trong đoạn trích dưới đây là lịch gốc, không dùng để giao việc. Graph hiện hành là tasks.json. Mâu thuẫn được xử lý theo AGENTS.md. Các task chủ dự án trở thành điều kiện ngoài, không biến thành quyền tự động cho worker.', '']
for old in original_tasks:
    replaced = old['id']=='T1.0.5' or old['id'].startswith('T1.7.')
    body = ('ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Agent ngoài chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.' if replaced else old['body'])
    if not replaced:
        body = body.replace('apps/ocr-worker','tools/import-data').replace('ocr-worker','bộ nhập dữ liệu chuẩn')
        body = re.sub(r'^.*(?:pytest|uv run|jlpt-ocr|Document AI|test Python).*$', 'Yêu cầu cũ về Python/đọc PDF không áp dụng; dùng kiểm tra nhập liệu TypeScript và schema hiện hành.', body, flags=re.M)
    details += [f"## {old['id']} {old['title']}",'',
                'Task thực thi liên quan: '+', '.join(old['executionTasks'])+'. Vai trò gốc: '+old['role']+'.','',body,'']
write('TRUY_VET_TASK_V1.md','\n'.join(details))

# Keep the original concrete technical contract and operational runbook in this package.
A1_TREE = '''### A1. Cấu trúc repo

Đây là repo sản phẩm. Tên trong ngoặc là worker sở hữu theo `config/workers.example.json`.

```
/
├─ apps/
│  ├─ web/            @jlpt/web    Next.js: public, học viên, phòng thi, giáo viên (cổng 3000) (W3)
│  │  ├─ app/                       route (App Router)
│  │  ├─ features/                  exam, results, practice, mix, analytics, explanations,
│  │  │                             learning, planner, classroom, community, billing
│  │  ├─ messages/{vi,ja,en}.json   chuỗi giao diện
│  │  └─ e2e/                       Playwright
│  ├─ admin/          @jlpt/admin  Next.js: CMS, nhập gói, duyệt, billing, báo cáo (cổng 3001) (W4)
│  │  └─ features/                  content, users, import, review, exam, billing
│  ├─ api/            @jlpt/api    NestJS + Fastify (cổng 4000), APP_MODE=api | worker
│  │  └─ src/
│  │     ├─ main.ts, app.module.ts  khởi động theo APP_MODE, đăng ký module (W2)
│  │     ├─ db/                     schema Drizzle, migrations, seed (W1)
│  │     ├─ common/                 config, logging, errors, guards, rate-limit (W2)
│  │     └─ modules/                W2: auth, user, exam, blueprint, attempt, scoring, question-bank,
│  │                                media, import, review, license, admin, audit, outbox, storage,
│  │                                email, turnstile, notification, classroom, community
│  │                                W4: payment, entitlement, reporting, cms, experiment
│  │                                W5: ai, vocab, stats, planner, gamification, learning
│  └─ media-worker/   @jlpt/media-worker  Cloudflare Worker (W6)
├─ packages/
│  ├─ schema/         @jlpt/schema        Zod schema, type, fixtures, json-schema/ (W1)
│  ├─ exam-engine/    @jlpt/exam-engine   logic thuần: thi, chấm, mix, practice, difficulty (W1)
│  ├─ media-token/    @jlpt/media-token   ký/kiểm tra token (WebCrypto) (W1)
│  ├─ srs/            @jlpt/srs           adapter FSRS ghim phiên bản (W1)
│  ├─ api-client/     @jlpt/api-client    client sinh từ OpenAPI, không sửa tay (W1)
│  ├─ content-tools/  @jlpt/content-tools validator import v2, NLP trên JSON đã duyệt (W5)
│  ├─ ui/             @jlpt/ui            component dùng chung (RichTextView…) (W3)
│  └─ config/         @jlpt/config        tsconfig, eslint, prettier, tailwind preset (W6)
├─ tools/import-data/ CLI kiểm tra và đóng gói import v2 (W5)
├─ contracts/         openapi.yaml, events.schema.json (W1)
├─ fixtures/
│  ├─ contracts/      ví dụ hợp lệ và lỗi theo contract (W1)
│  └─ imports/        gói import v2 mẫu ready/draft (W5)
├─ infra/
│  ├─ compose/        compose.dev.yml, compose.prod.yml, profiles/{small,large}.env,
│  │                  .env.production.example
│  ├─ dev/            dev services tách riêng từng worker (W6)
│  ├─ postgres/       Dockerfile, postgresql.small.conf, postgresql.large.conf
│  ├─ cloudflared/    config.yml (không chứa credentials)
│  └─ server/         bootstrap.sh, deploy.sh, switch-profile.sh, daily-check.sh, systemd/
├─ tests/             integration/, e2e/, load/ (k6): test độc lập của W6
├─ docs/
│  ├─ decisions/      <taskId>-<slug>.md, mỗi task một file (mọi worker)
│  ├─ import-format/  hướng dẫn import v2 (W5)
│  ├─ runbooks/, release/   (W6)
│  └─ multi-worker/   bản sao bộ tài liệu kế hoạch này
├─ .github/workflows/ ci.yml, release.yml, integration.yml (W6)
├─ package.json, pnpm-workspace.yaml, pnpm-lock.yaml, turbo.json (W6)
└─ .gitignore, .gitattributes, .nvmrc, .npmrc, .editorconfig, README.md (W6)
```

Coordinator điều phối sáu worker nằm ở repo riêng `jlpt-coordinator`, không nằm trong repo sản phẩm.

Trong tài liệu này, `pnpm --filter api` là cách viết tắt của `pnpm --filter @jlpt/api` (pnpm cho phép bỏ scope khi tên không trùng).

'''
CONTRACT_FIXES = [
 ('Muốn đổi thì đề xuất ở C0 và chờ duyệt.',
  'Muốn đổi thì mở contract PR kèm danh sách worker bị ảnh hưởng (AGENTS.md) và chờ duyệt.'),
 ('| `Question.origin` | `official_past_exam`, `self_authored`, `ai_generated` |',
  '| `Question.origin` | `official_past_exam`, `self_authored`, `third_party`, `ai_generated` (ba giá trị đầu nhận nguyên từ `source.provenance` của import v2) |'),
 ('| `role` | `admin`, `editor`, `reviewer`, `teacher`, `student` |',
  '| `role` (toàn hệ thống) | `admin`, `editor`, `reviewer`, `moderator`, `billing_admin`, `student` |\n| `org_role` (theo tổ chức, lưu ở `org_memberships`) | `org_manager`, `teacher` |\n\n`operator` là người vận hành hạ tầng (coordinator, server, backup), không phải tài khoản trong ứng dụng. Nhân sự (`admin`, `editor`, `reviewer`, `moderator`, `billing_admin`) bắt buộc 2FA và chỉ vào qua `ADMIN_HOST`.'),
 ('đề xuất, phải đối chiếu với kết quả T1.0.4:', 'đề xuất, phải đối chiếu với blueprint chính thức (điều kiện ngoài `jlpt-blueprints`, dùng ở C01):'),
 ('bao nhiêu câu **lấy từ T1.0.4**', 'bao nhiêu câu **lấy từ blueprint chính thức (`jlpt-blueprints`)**'),
 ('- `imports/{sha256}.pdf` (PDF gốc)',
  '- `imports/{packageId}/r{revision}/{sha256}.zip` (gói import v2 nguyên bản, riêng tư, chỉ staff)\n- `sources/{sha256}.pdf` (PDF nguồn tùy chọn trong gói, riêng tư, chỉ để người duyệt đối chiếu)'),
 ('{"mediaKey":"media/9f2c….mp3","startMs":0,"endMs":42000,"gapAfterMs":8000,"groupId":"0192f0c0-0000-7000-8000-0000000000a9"}',
  '{"groupId":"0192f0c0-0000-7000-8000-0000000000a9","mediaKey":"media/9f2c….mp3","startMs":0,"endMs":42000,"audioStartMs":0,"audioEndMs":42000,"gapAfterMs":8000}'),
 ('- Mọi `mediaKey` phải có trong manifest.',
  '- Mọi `mediaKey` phải có trong manifest.\n- Mỗi đoạn `listeningTimeline` dùng đúng các trường của import v2: `groupId`, `mediaKey`, `startMs`, `endMs`, `audioStartMs`, `audioEndMs`, `gapAfterMs`, đơn vị mili giây. `startMs`/`endMs` là mốc trên đồng hồ phần nghe, `audioStartMs`/`audioEndMs` là đoạn cần phát trong file; `endMs − startMs = audioEndMs − audioStartMs`. Import, admin API, exam-engine và snapshot dùng chung dạng này.'),
 ('**Mọi số 0 là chỗ phải điền từ nguồn chính thức (T1.0.4).**', '**Mọi số 0 là chỗ phải điền từ nguồn chính thức (điều kiện ngoài `jlpt-blueprints`).**'),
 ('{ "error": { "code": "LEASE_INVALID", "message": "Bài thi đang được mở ở nơi khác.", "details": {} } }',
  '{ "error": { "code": "LEASE_INVALID", "message": "Bài thi đang được mở ở nơi khác.", "details": {}, "requestId": "req_01J…" } }'),
 ('`message` là tiếng Việt, hiển thị được cho người dùng.',
  '`message` theo ngôn ngữ của người dùng (vi/ja/en, mặc định vi), hiển thị được cho người dùng. `requestId` dùng để tra log.'),
 ('Các bảng khác theo mục 11 của `DE_XUAT_KY_THUAT.md`.', 'Các bảng khác theo [DU_LIEU_VA_SU_KIEN.md](DU_LIEU_VA_SU_KIEN.md).'),
 ('Các con số trên là điểm khởi đầu; T1.9.2 đo thực tế rồi điều chỉnh.', 'Các con số trên là điểm khởi đầu; V06 đo thực tế rồi điều chỉnh.'),
]
OPS_FIXES = [
 ('8. Cài `cloudflared` (T1.8.4) và các systemd timer cho backup, kiểm tra hằng ngày (T1.8.10, T1.8.12).',
  '8. Cài `cloudflared` và các systemd timer cho backup, kiểm tra hằng ngày (C06).'),
 ('7. Đêm hôm sau chạy k6 (như T1.9.2), ghi vào bảng sức chịu bên dưới.', '7. Đêm hôm sau chạy k6 (như V06), ghi vào bảng sức chịu bên dưới.'),
 ('**Bảng sức chịu** (điền sau T1.9.2 và sau mỗi lần nâng gói):', '**Bảng sức chịu** (điền sau V06 và sau mỗi lần nâng gói):'),
]
contract=old_plan.split('## Phụ lục A. Hợp đồng kỹ thuật',1)[1].split('## Phụ lục B. Vận hành server',1)[0]
contract = re.sub(r'### A7\. Gói nhập đề.*?(?=### A8\.)', '''### A7. Gói nhập đề phiên bản 2

Hợp đồng hiện hành: [CHUAN_DU_LIEU_NHAP.md](CHUAN_DU_LIEU_NHAP.md), [schema import v2](schemas/import-v2.schema.json) và [gói mẫu](examples/import-v2-ready/import.json). Agent ngoài chuẩn bị import.json, media và nguồn tùy chọn; server không đọc PDF/ảnh để suy ra câu hỏi hoặc đáp án. Phiên bản1 ở nguồn là lịch sử, không nhận ngầm qua endpointv2. Gói chứa đáp án nên chỉ staff được tải lên/xem, snapshot public phải bỏ đáp án.

''', contract, flags=re.S)
contract = re.sub(r'^.*(?:ocr-worker/|jlpt-ocr|GOOGLE_APPLICATION_CREDENTIALS).*\n', '', contract, flags=re.M)
contract = contract.replace('ocr-worker','công cụ chuẩn bị dữ liệu bên ngoài')
contract = re.sub(r'### A1\. Cấu trúc repo.*?(?=### A2\.)', lambda m: A1_TREE, contract, count=1, flags=re.S)
for old, new in CONTRACT_FIXES:
    assert contract.count(old) == 1, ('contract text not found', old)
    contract = contract.replace(old, new)
write('HOP_DONG_KY_THUAT.md', '''# Hợp đồng kỹ thuật toàn bộ sản phẩm

Phần A1–A14 dưới đây giữ chi tiết V1 gốc. [API_V1_V4.md](API_V1_V4.md), [DU_LIEU_VA_SU_KIEN.md](DU_LIEU_VA_SU_KIEN.md) và [DE_XUAT_KY_THUAT.md](DE_XUAT_KY_THUAT.md) bổ sung các miền V2–V4. Nếu mâu thuẫn, hợp đồng mở rộng được duyệt trong F02 là chuẩn; schema executable và fixtures phải cập nhật cùng PR. Không có ngoại lệ giản lược của kế hoạch một tuần cũ.

Không công bố số phiên bản SDK, giá dịch vụ hoặc kết luận pháp lý trong tài liệu này như thông tin đã xác minh hiện tại. F01 khóa version tương thích; chủ dự án xác nhận dịch vụ và pháp lý trước production.
''' + contract + '''
## A15 Các quy tắc bổ sung bắt buộc

- events có eventId, schemaVersion, occurredAtUTC, actorId, tenantId khi liên quan; consumers idempotent.
- exam kind custom/mixed vẫn sinh immutable snapshot, answer key server-only và source attribution theo license.
- mock endpoints chỉ trong test/dev, không route từ production và không tính bằng chứng tích hợp.
- mọi tập hợp trả cursor/limit; limit mặc định20, tối đa100; timestamps UTC; money integer minor units + currency, không float.
- authenticated write kiểm tra session, tenant/owner, entitlement và Origin/CSRF; session cookies Secure HttpOnly SameSite, proxy trust list cụ thể.
- teacher tenant authorization và enrollment kiểm tra trên server; không dùng tenantId từ body làm nguồn tin cậy.
- JSON/CSV/XLSX/PDF exports có access check, chống formula injection, signed URL hết hạn; xóa dữ liệu theo retention đã duyệt.
- Feature AI dùng provider credentials riêng được operator cấp, metering atomic và moderation. Không dùng AI chấm điểm bài thi.
- kết quả event thi đồng loạt chưa công bố không được truy cập qua review/check/transcript/export/AI/CDN dù người dùng đã nộp.
- dictionary/audio/TTS có nguồn license; nội dung AI phải ai_generated, chưa duyệt không vào ngân hàng dùng công khai.
- coding worker không phải APP_MODE=worker hay API_WORKERS; ba khái niệm cấu hình độc lập.
''')
ops=old_plan.split('## Phụ lục B. Vận hành server',1)[1].split('## Phụ lục C.',1)[0]
for old, new in OPS_FIXES:
    assert ops.count(old) == 1, ('runbook text not found', old)
    ops = ops.replace(old, new)
write('RUNBOOK_PRODUCTION.md', '''# Vận hành triển khai và khôi phục production

Giữ quy trình cụ thể từ kế hoạch gốc dưới đây, áp dụng thêm quy tắc ở đầu file này. Đây là runbook mẫu phải được W6 diễn tập và cập nhật bằng version đã chọn và kết quả thật; chưa có server được tạo/deploy bởi việc viết tài liệu.

## Điều kiện bổ sung của phạm vi đầy đủ

1. Production tách VPS coding. Giới hạn4/8GB ở nguồn là điểm bắt đầu tham khảo, chưa được chứng minh đủ cho363yêu cầu ứng dụng. Profile phải qua load test; không có dịch vụ tự đọc PDF; AI học tập không đặt cùng process thi.
2. Giá/gói/vùng và trình tự resize phải đối chiếu nhà cung cấp lúc thao tác; không tự mua/nâng gói. D1/D3 và quyền operator vẫn là gate.
3. Release immutable theo tag và digest; contract/migration compatibility, payment webhook idempotency, SRS/planner jobs và event-result embargo có release checks.
4. Người vận hành xác nhận payment live, email, OAuth, push, R2, AI học tập, dữ liệu nhập, ngân sách, legal content và data retention trước release. Chỉ bản sandbox không đủ LIVE_VERIFIED.
5. Backup phải bao phủ DB, object manifest/content versions, cấu hình và provider reconciliation metadata; secret backup trong password manager. Dữ liệu AI và analytics áp dụng retention riêng.
6. Demo/staging chứa synthetic/approved samples; tách bucket/prefix, payment webhook secret, domain cookie, Redis/queue và WALG prefix. Restore drill không ghi WAL vào backup production.
7. Tạm khóa scheduler học/thông báo/payment outbox khi restore drill để tránh gửi thật hoặc thu tiền lại. Khi phục hồi production, reconcile provider trước mở lại webhook consumers.
8. Một deploy lock và một migration lock; không deploy trong active real exam hoặc event window. Emergency override cần operator ghi lý do và kế hoạch xử lý bài thi.
9. Mục tiêu ngày7 là candidate đủ phạm vi ứng dụng hiện hành;12yêu cầu chuẩn bị dữ liệu được quản lý bên ngoài và không tính là code. Release công khai là quyết định riêng có checklist; beta14ngày, ổn định payment30ngày chưa thể được chứng minh trong7ngày.
10. Nhà cung cấp hosting chưa được chốt (điều kiện ngoài `hosting` trong QUYET_DINH_VA_DICH_VU.md). Các bước B1–B4 bên dưới giữ ví dụ Linode của kế hoạch gốc. Nếu chọn nhà cung cấp khác, W6 viết lại lớp snapshot máy ở B3 và quy trình nâng/hạ gói ở B4 theo tài liệu của nhà cung cấp đó, rồi diễn tập lại.

## Quy trình nền từ kế hoạch V1
''' + ops)

counts = Counter(f['id'].split('-')[0] for f in features)
dump('config/workers.example.json',{
 'schemaVersion':1,'scope':'ALL_V1_V4','workerCount':6,'coordinatorInstances':1,
 'coordinator':{'repo':'jlpt-coordinator (repo riêng, không nằm trong repo sản phẩm)','builtBefore':'day 0','spec':'DAC_TA_RUNNER.md'},
 'locks':LOCKS,
 'cli':'gemini','authMode':'native-per-worker-login','credentialsEmbedded':False,
 'limits':{'activeWork':6,'activeReviews':1,'heavyBuilds':2,'browserSuites':1,'loadRuns':1},
 'taskCatalog':'../tasks.json','inputMode':'PREPARED_IMPORT_V2_NO_OCR','stateStore':'SQLite WAL (implementation required)',
 'productionAccess':False,'quotaPolicy':'pause-only-affected-worker; checkpoint; never silently rotate identity',
 'workers':[{'id':w,'role':role,'linuxUser':f'jlpt-{w.lower()}',
  'repo':f'/srv/jlpt-workers/{w.lower()}/repo','home':f'/home/jlpt-{w.lower()}',
  'nativeLogin':'operator-required','allowedRoots':paths,
  'database':f'jlpt_{w.lower()}','redisCoreNamespace':f'jlpt:{w.lower()}:core:',
  'redisCacheNamespace':f'jlpt:{w.lower()}:cache:', 'bullmqPrefix':f'jlpt-{w.lower()}',
  'storageRoot':f'/srv/jlpt-workers/{w.lower()}/data',
  'ports':{'web':3000+int(w[-1])*100,'admin':3001+int(w[-1])*100,'api':4000+int(w[-1])*100},
  'canReadOtherWorkerCredentials':False,'canReadCoordinatorSecrets':False}
 for w,(role,paths) in OWNERS.items()]})

dump('config/evidence.example.json',{
 'featureId':'PAY-04','taskId':'L04','status':'TODO','codeVerified':False,'providerVerified':False,'productionVerified':False,
 'commitSha':None,'baseSha':None,'testFiles':[],
 'runs':[], 'externalBlockers':['payment-provider'],
 'note':'Schema example only. Populate with actual commands exit codes report artifacts and provider environment; do not mark pass from this template.'})

write('TIEN_DO.md', '# Theo dõi tiến độ\n\nChưa bắt đầu triển khai sản phẩm.363yêu cầu ứng dụng hiệnTODO;12yêu cầu trích xuất chuyển agent bên ngoài, trạng tháiEXTERNAL_INPUT_REQUIRED. Giữ375mã nguồn để truy vết, không tính phần bên ngoài là code đã xong.\n\n'
 'Nguồn trạng thái thực tế: SQLite của coordinator sau khi được xây ở ngày 0 (repo jlpt-coordinator) và kiểm chứng ở F07. Trước đó tasks.json và features.json là baseline kế hoạch. Không tự ghi DONE vào file catalog bằng cách đánh dấu checkbox. Báo cáo phải được sinh từ event/task/evidence.\n\n'
 '| Nhóm | Số mã nguồn | Trạng thái |\n|---|---|---|\n'+ '\n'.join(f'| {g} | {n} | '+('APPLICATION + EXTERNAL_PREPARATION' if g=='PDF' else 'TODO')+' |' for g,n in counts.items()))

for w, (role, paths) in OWNERS.items():
    mine = [t['id'] for t in TASKS if t['owner'] == w]
    write(f'prompts/{w}.md', f'''# Prompt cho {w} {role}

Bạn là {w} trong sáu coding worker của dự án JLPT Online. Đọc ../AGENTS.md, ../PHAN_CONG_6_WORKER.md, ../PHAM_VI_VA_NGHIEM_THU.md và task coordinator cấp. Các đường dẫn ở prompt là đường dẫn bộ tài liệu; paths code tính từ repo sản phẩm. Không dùng kế hoạch giản lược trong nguon làm scope.

Task thường được giao: {', '.join(mine)}. Không tự nhận tất cả cùng lúc. Phạm vi chuyên môn mặc định: {', '.join(paths)}. Quyền ghi cuối cùng là allowedPaths trong assignment; nhiệm vụ cần ngoài phạm vi phải owner bàn giao/được coordinator cấp quyền tạm có log.

## Đầu vào phải có

taskId, assignmentId, branch, head/baseSHA, workerId, allowedPaths, resourceLocks, contractVersion, featureIds, acceptance, checks và externalStatus. Thiếu assignment/deps thì báo điều phối, không tự sửa file chung để lấy việc.

## Thực hiện

Đọc nội dung task trong ../KE_HOACH_TRIEN_KHAI.md và contract liên quan. Viết test theo từng feature được giao; không dùng mock/placeholder làm evidence hoàn tất. Triển khai đủ UI/API/data/jobs cần thiết, negative permissions và trạng thái lỗi. Chạy checks thật, lưu output/artifact. Thường xuyên commit và checkpoint trước quota/timeout. Không push/merge, không lấy credential của worker khác, không production access.

Mỗi thay đổi contract/DB/root/lockfile phải theo owner và locks. Đừng tự ghi DONE ở matrix/checklist. External chưa đủ: làm phần độc lập, ghi BLOCKED_EXTERNAL và externalId; không âm thầm bỏ chức năng đó.

## Kết thúc

Trước khi báo REVIEW, tự review như reviewer độc lập: đọc lại toàn bộ `git diff origin/main...HEAD` theo mức lỗi trong ../prompts/REVIEW.md và sửa mọi lỗi P0/P1 bạn tìm thấy: kiểm tra quyền dựa trên dữ liệu client gửi lên (header Host, query, state), lộ đáp án/lời giải, thiếu một tiêu chí nghiệm thu, test không chứng minh hành vi, lệch hợp đồng API/schema, thao tác nhiều bảng thiếu transaction, sửa ngoài phạm vi. Mỗi vòng reviewer trả về tốn khoảng 15 phút của cả dự án.

Trả JSON theo AGENTS.md, kèm diff summary, testFiles, actual runs, artifact paths, head/baseSHA, feature coverage và blockers. REVIEW chỉ là yêu cầu người khác kiểm tra; không tự đặt ACCEPTED. Nếu được cấp task review, dừng ghi task hiện tại và dùng prompt REVIEW.md, tính trong quota của chính bạn.
''')

write('prompts/REVIEW.md', '''# Prompt review độc lập

Bạn là reviewer trong cùng sáu worker, khác tác giả. Chỉ đọc diff của assignment và hợp đồng/features/evidence tương ứng trên đúng headSHA/baseSHA. Không sửa code, không push, không đọc secrets, không gọi provider tính phí chỉ để kiểm tra khi chưa có quyền.

Ưu tiên: answer/explanation/AI/export leakage và event embargo; transaction/lease/seq/deadline; tenant/owner/entitlement; payment replay/refund/quota math; migration/immutable versions; provider mock disguised as real; incomplete feature path; tests weakened/skipped/empty; out-of-scope edits.

Với mỗi feature giao, kiểm hành vi và assertions, không chỉ tên test hoặc screenshot. Nếu không đủ bằng chứng trả UNCLEAR hoặc BLOCKED, không APPROVE. Contract/base/head đổi làm verdict cũ không hợp lệ.

Mức lỗi:
- P0: lộ đáp án/lời giải trước quyền xem, lỗ hổng bảo mật hoặc quyền, mất/hỏng dữ liệu, sai chấm điểm hoặc sai tiền.
- P1: thiếu một tiêu chí nghiệm thu, hợp đồng/API/schema sai tài liệu, test không chứng minh được hành vi hoặc bị làm yếu, mock giả làm tích hợp thật, sửa ngoài phạm vi task.
- P2: chất lượng không làm sai hành vi: đặt tên, cấu hình lint/cảnh báo, tối ưu, tài liệu, chi tiết có thể làm ở task sau.

Chỉ trả CHANGES khi có ít nhất một lỗi P0 hoặc P1. Chỉ có P2 thì trả APPROVE và vẫn liệt kê các lỗi P2 trong findings; coordinator chuyển chúng thành việc tồn đọng giao kèm task kế tiếp của cùng vai trò. Không hạ P0/P1 xuống P2 để cho qua.

Trả JSON: taskId, headSha, baseSha, reviewerWorkerId, verdict APPROVE/CHANGES/UNCLEAR/BLOCKED, findings[{path,line,severity,reason,requiredFix}], reviewedFeatureIds, evidenceReviewed. Chỉ nêu lỗi có bằng chứng và ảnh hưởng cụ thể. Coordinator quyết định merge sau CI/integration, không tự coi review là release authorization.
''')

write('prompts/BAO_CAO_NGAY.md', '''# Mẫu báo cáo cuối ngày

Ngày tương đối và khoảng UTC; catalog hash; RC/headSHA; task DONE/REVIEW/BLOCKED; feature CODE_VERIFIED/PROVIDER_VERIFIED/ACCEPTED trên363yêu cầu ứng dụng,12đầu vào thủ công báo riêng; code/provider/production acceptance riêng. Liệt kê actual test commands, exit codes, reports và defects P0/P1.

Ghi critical path, actual/estimate, forecast tới168giờ, quota từng worker, CPU/RAM/CI wait, cost theo provider và external blockers/owner. Task trễ vẫn cùng scope, không tự cắt. Chưa có dữ liệu thực thì ghi chưa đo, không lấy synthetic làm observed.

Ngày7 bổ sung bảng363yêu cầu ứng dụng và12đầu vào bên ngoài, phần thiếu, quyết định TARGET_MET/TARGET_NOT_MET; quyết định production riêng, pending observation14/30ngày và hướng dẫn deploy/rollback/restore. Không tính tác vụ đọc PDF bên ngoài thành code hoặc dùng bằng chứng kế hoạch làm kết quả thực thi.
''')

for t in TASKS:
    for e in t['startPrerequisites']+t['acceptancePrerequisites']:
        assert e in EXTERNAL_IDS, (t['id'], e)
    for r in t['exclusiveResources']:
        assert r in LOCKS, (t['id'], r)
dump('external-prerequisites.json', {'schemaVersion':2,'items':[
 {'id':e,'owner':'project-owner','status':'PENDING','evidence':[],
  'blocksStart':[t['id'] for t in TASKS if e in t['startPrerequisites']],
  'blocksAcceptance':[t['id'] for t in TASKS if e in t['acceptancePrerequisites']],
  'affectedTasks':[t['id'] for t in TASKS if e in t['startPrerequisites']+t['acceptancePrerequisites']],
  'definition':'QUYET_DINH_VA_DICH_VU.md'} for e in EXTERNAL_IDS]})

source_manifest=[]
for p in sorted(SOURCE.iterdir()):
    if p.is_file() and p.name != 'MANIFEST.json':
        source_manifest.append({'path':p.relative_to(ROOT).as_posix(),
          'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,
          'authority':'reference only; current execution rules are in the parent planning package'})
dump('nguon/MANIFEST.json',{'snapshotDate':DATE,'files':source_manifest})

flush()
revise(ROOT)

print(json.dumps({'features':len(features),'workPackages':len(TASKS),'originalV1Tasks':len(original_tasks),'featurePrefixes':len(counts),'sourceSubsystems':22},ensure_ascii=False))
