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
    'dependency-lock': 'pnpm-lock.yaml và package manifests; worker sửa package.json trong phạm vi rồi chạy pnpm install, coordinator tự cấp khóa trước bước kiểm tra',
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
 'pnpm test:e2e:core|pnpm test:security|pnpm test:load:baseline',contracts='API',resources='staging-deploy heavy-load',external='hosting',
 grants='apps/api/src/modules/exam/ apps/api/src/modules/review/ apps/api/src/modules/import/')

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
 'Replay events không double-charge/double-count|Payment signature/retry tamper cases pass|Diễn tập pause/checkpoint/resume của coordinator trên task thật không mất patch: bằng chứng do người vận hành xuất từ coordinator ở docs/release/coordinator-drill-evidence.md; test của task không đọc lịch sử git hay trạng thái coordinator (worker không truy cập được coordinator)',
 'pnpm test:integration:learning|pnpm test:integration:billing')

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
task('A06','W6',6,6,'Tích hợp toàn bộ module và kiểm tra phạm vi hiện hành','A02 A03 A04 A05',
 'Dựng staging đủ mọi route, worker background, providers, coverage by feature; generated smoke list không thay test thật.',
 'tests/e2e/full/',
 '363yêu cầu ứng dụng có test reference;12yêu cầu chuẩn bị bên ngoài không tính vào code coverage|Không còn UI placeholder hoặc endpoint stub được tính DONE|Review và CI gắn đúng headSHA/baseSHA',
 'pnpm test:e2e:full|pnpm features:verify|pnpm test:contracts')

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
task('V04','W4',6,6,'Admin reconciliation vận hành và chứng từ provider','A04',
 'Đối soát payment refund, cost/corpus reports, full admin flows, backup restore UI chỉ gọi operator job được phép.',
 'apps/admin/|apps/api/src/modules/reporting/',
 'Webhook/live readiness có bằng chứng riêng sandbox|Admin backup không giữ raw secrets trong browser|Mọi action audit có actor và tenant|Report CSV escaping và revenue rounding đúng',
 'pnpm test:e2e:admin-all|pnpm test:reconciliation',contracts='API',external='payment-provider')
task('V05','W5',6,6,'Đối chiếu dữ liệu nhập AI thật và học tập E2E','A05',
 'Kiểm thử gói do agent ngoài chuẩn bị, dữ liệu thiếu và sửa revision; actual learning AI/dictionary/TTS tests, statistical cold start và learning workflows.',
 'tools/import-data/|packages/content-tools/|apps/api/src/modules/ai/|apps/api/src/modules/learning/',
 'Gói chuẩn giữ đúng ruby bảng sao audio đáp án qua import và snapshot không lộ đáp án|Provider học tập chưa có credential phải BLOCKED_EXTERNAL|Sinh câu qua moderation đến làm bài|Data tests phân biệt observed và synthetic',
 'pnpm test:import-validation|pnpm test:providers:live|pnpm test:learning:all',external='prepared-import-data ai-provider dictionary tts-provider sample-rights')
task('V06','W6',6,8,'Full regression load accessibility security và restore','L06 A06 V02 V03 V04 V05',
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

# Day 8 (added 2026-10-17 after V1 review): the UI was built against mocks and never wired to the
# real API. These tasks wire every page to the API and add the checks that were missing, so
# "mock only while developing" is enforced instead of trusted.
NO_MOCK = ('Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi; '
           'route đã sửa bị xóa khỏi tests/integration/mock-ui-baseline.json và pnpm check:no-mock-ui pass')
REAL_E2E = ('E2E Playwright chạy trên staging thật trong CI (API + Postgres + Redis + Mailpit), đi đúng luồng người dùng qua giao diện; '
            'cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt')
STATES = 'Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền'
LAYOUT = ('E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang; '
          'class Tailwind phải có tác dụng (PR #53 đã cài Tailwind), không để chữ dính liền hay nội dung dính mép; '
          'không hiện key dịch thô (ví dụ account.profile.title trên /tai-khoan), E2E kiểm tra cả ba locale vi ja en')
task('I00','W6',8,4,'Hạ tầng kiểm thử tích hợp giao diện với API thật','R06',
 'Staging CI chạy web và admin build với NEXT_PUBLIC_API_URL=/api/v1 sau reverse proxy cùng origin (giống bản demo trên jlpt-vm), thêm Mailpit; '
 'bộ Playwright E2E tích hợp dùng chung; lệnh pnpm check:no-mock-ui quét apps/web và apps/admin tìm dữ liệu viết cứng/mock và so với baseline. '
 'Baseline ban đầu liệt kê đúng các route đang vi phạm; CI fail khi xuất hiện vi phạm mới ngoài baseline.',
 'infra/|.github/|tests/|package.json|docs/runbooks/',
 'Staging CI dựng web, admin, API, Postgres, Redis, Mailpit; web và admin gọi API qua /api/v1 cùng origin|'
 'pnpm test:e2e:integration chạy Playwright thật trên staging CI; có fixture đăng ký qua Mailpit và tài khoản staff seed có mật khẩu và TOTP|'
 'pnpm check:no-mock-ui phát hiện được mảng mẫu, ALL_SAMPLE, đăng nhập giả; baseline tests/integration/mock-ui-baseline.json liệt kê từng route vi phạm hiện có|'
 'Runbook docs/runbooks/demo-environment.md mô tả dựng bản demo đầy đủ bằng compose',
 'pnpm check:no-mock-ui|pnpm test:e2e:integration -- --list',resources='ci-workflow staging-deploy')
task('I01','W2',8,5,'API bổ sung cho giao diện quản trị và luồng thi thật','R06',
 'Đối chiếu từng trang apps/admin và apps/web với API_V1_V4.md; bổ sung endpoint còn thiếu trong module W2 (admin, auth, user, exam, attempt, question-bank, import, review, media, notification, community, classroom). '
 'Sửa các lỗi tích hợp đã thấy trên bản demo: đăng ký trả 500 khi SMTP lỗi (phải gửi qua outbox, đăng ký vẫn thành công); link xác minh email phải trỏ tới trang web có thật; '
 'snapshotUrl của lượt thi phải tải được trên staging và bản demo khi chưa có CDN (phục vụ qua API cùng origin, kiểm token).',
 '@roots',
 'Đăng ký vẫn trả 201 khi SMTP không kết nối được; email gửi lại qua outbox và có test|'
 'Link trong email xác minh và đặt lại mật khẩu mở đúng trang web và hoàn tất được|'
 'Lượt thi trên staging tải được snapshot, audio Range 206 và nộp bài, không phụ thuộc domain media.jlpt.local|'
 'Danh sách endpoint admin cần cho từng trang (users, audit, exams, questions, imports, reviews, blueprints, media, vocab, moderation, notifications, org) có trong API, có phân quyền và test',
 'pnpm test:api:all|pnpm test:security',contracts='API',resources='api-hardening')
task('I08','W2',8,4,'API xác thực hai bước (TOTP) cho nhân sự','I01',
 'Bổ sung trong module auth: đăng ký TOTP cho nhân sự (sinh secret lưu mã hóa theo user, trả otpauth URI), xác nhận đăng ký bằng mã 6 số, thử thách TOTP sau khi đăng nhập mật khẩu (session chỉ đánh dấu twoFactorVerified khi mã đúng), mã khôi phục dùng một lần lưu dạng hash, tắt/đặt lại 2FA có audit. '
 'Sửa TotpGuard: bỏ secret mặc định viết cứng (JBSWY3DPEHPK3PXP và TOTP_TEST_SECRET ở production), kiểm tra theo secret của chính user và cờ twoFactorVerified của session; route /admin bắt buộc với nhân sự. Seed staging có tài khoản nhân sự với secret biết trước cho E2E.',
 '@roots',
 'Mã sai, mã cũ, mã khôi phục đã dùng hoặc không tồn tại đều bị API từ chối; lỗi DB không bao giờ cho qua|Không còn secret TOTP mặc định trong code chạy thật|Test API cho đăng ký, thử thách, mã khôi phục, khóa sau nhiều lần sai; E2E đăng nhập nhân sự qua API trên staging',
 'pnpm test:auth|pnpm test:security|pnpm test:api:all',contracts='API',resources='api-hardening')
task('I02','W4',8,4,'Đăng nhập nhân sự thật và khung quản trị nối API','I00 I08',
 'Bỏ đăng nhập giả trong apps/admin/lib/auth-context.tsx: đăng nhập email mật khẩu, TOTP enrollment/challenge và recovery codes qua API của I08 (không tự viết xác thực trong module khác, không giữ chế độ offline giả lập); session, đăng xuất, guard theo role từ server. '
 'Trang tổng quan, người dùng, audit log, cài đặt (org, thông báo, backup) lấy dữ liệu từ API.',
 'apps/admin/',
 'Sai mật khẩu hoặc sai TOTP bị từ chối bởi API, không chỉ ở UI|'+NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:admin|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ tests/integration/mock-ui-baseline.json')
task('I09','W4',8,5,'Đăng nhập nhân sự thật và khung quản trị nối API (làm lại I02)','I00 I08',
 'I02 bị hủy vì còn xác thực giả (confirm2faSetup nhận mọi mã 6 số, session tạo phía client, gọi API khác thay khi 404); phần nối API của các trang người dùng/audit/cài đặt trong nhánh task/I02 có thể tham khảo nhưng phải rà lại. '
 'Bỏ đăng nhập giả trong apps/admin/lib/auth-context.tsx: đăng nhập email mật khẩu, TOTP enrollment/challenge và recovery codes qua API của I08 (không tự viết xác thực trong module khác, không giữ chế độ offline giả lập); session, đăng xuất, guard theo role từ server. '
 'Trang tổng quan, người dùng, audit log, cài đặt (org, thông báo, backup) lấy dữ liệu từ API.',
 'apps/admin/',
 'Sai mật khẩu hoặc sai TOTP bị từ chối bởi API, không chỉ ở UI|Mọi bước đăng nhập, đăng ký TOTP, thử thách và mã khôi phục gọi API của I08; cấm đường tắt cho test, cấm tạo session phía client, cấm chấp nhận mã khi API 404 hoặc lỗi|'+NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:admin|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ tests/integration/mock-ui-baseline.json')
task('I03','W4',8,6,'Quản trị nội dung nối API: nhập gói, câu hỏi, đề, duyệt, media','I09',
 'Các trang imports, questions, exams (kể cả đề trộn), blueprints, reviews (duyệt 4 mắt, giải thích), media, vocab, cms, moderation AI, reports/content gọi API thật; '
 'luồng nhập gói demo-data -> duyệt -> xuất bản làm được hoàn toàn qua giao diện quản trị. '
 'Lưu ý khi làm lại (lượt 4 trượt staging E2E): (1) nút Xuất bản báo "Body cannot be empty when content-type is set to \'application/json\'" '
 'vì apps/admin/lib/api-client.ts luôn gửi Content-Type: application/json kể cả khi không có body (publishExam, unpublish, approve...); '
 'chỉ đặt Content-Type khi có body, hoặc gửi body {}; kiểm tra mọi lời gọi POST/PUT/PATCH không body. '
 '(2) Test đăng nhập nhân sự chạy song song trên nhiều trình duyệt dùng chung tài khoản nên API từ chối mã TOTP đã dùng ("Mã TOTP đã được sử dụng"); '
 'trong tests/playwright/fixtures/staff-auth.fixture.ts, khi gặp lỗi này thì chờ sang khung 30 giây kế tiếp rồi thử lại với mã mới (không tắt kiểm tra chống dùng lại mã ở API). '
 '(3) Không sửa package.json gốc, không đổi TMPDIR, không sửa file ngoài apps/admin/ và phần được cấp.',
 'apps/admin/',
 'Editor nhập gói docs/multi-worker/demo-data qua giao diện, reviewer khác duyệt, xuất bản; đề hiện ở trang thư viện đề của web|'+NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:admin|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ tests/integration/mock-ui-baseline.json')
task('I04','W4',8,4,'Quản trị thương mại, báo cáo, thử nghiệm nối API','I09',
 'Các trang commercial (payments, plans, refunds, reconciliation), reports (tổng quan, doanh thu), experiments gọi API thật; sửa endpoint trong module payment, entitlement, reporting, cms, experiment nếu thiếu. '
 'Lưu ý khi làm lại (lượt 4 trượt staging E2E, 34 test đạt, 2 trượt): (1) tests/playwright/integration.spec.ts:877 dùng locator '
 '[data-testid^="experiment-card-"], [data-testid="experiments-empty"] khớp nhiều thẻ nên Playwright báo strict mode violation; dùng .first() '
 'hoặc kiểm tra số thẻ, không nới lỏng điều kiện kiểm tra dữ liệu thật. (2) Lỗi mã TOTP dùng lại khi đăng nhập nhân sự song song: trong '
 'tests/playwright/fixtures/staff-auth.fixture.ts, gặp "Mã TOTP đã được sử dụng" thì chờ sang khung 30 giây kế tiếp rồi thử lại với mã mới '
 '(nếu I03 đã sửa trên main thì giữ bản của main). (3) Lỗi 500 ở /api/v1/datasets/jlpt-official/* không thuộc I04 nếu trang quản trị của I04 không gọi; '
 'không sửa module ngoài danh sách trên.',
 'apps/admin/|apps/api/src/modules/payment/|apps/api/src/modules/entitlement/|apps/api/src/modules/reporting/|apps/api/src/modules/cms/|apps/api/src/modules/experiment/',
 'Gói, giao dịch sandbox, hoàn tiền và đối soát hiển thị dữ liệu thật từ API|'+NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:admin|pnpm test:payments|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ tests/integration/mock-ui-baseline.json')
task('I05','W3',8,6,'Web: thư viện đề, phòng thi, kết quả, lịch sử nối API thật','I00',
 'Thư viện đề (de-thi, trang SEO theo cấp) và phòng thi lấy đề đã xuất bản từ API, bỏ ALL_SAMPLE_EXAMS; bắt đầu lượt, tải snapshot, lưu tự động, chuyển phần, nộp, xem kết quả, lịch sử, chia sẻ kết quả qua API; khách làm thử đề guest_trial.',
 'apps/web/|packages/ui/',
 'Học viên đăng ký qua Mailpit, xác minh, làm trọn đề demo N5 đã xuất bản và xem điểm trên staging CI|Khách làm thử được đề guest_trial, đề khác yêu cầu đăng nhập|'+NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:web|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ tests/integration/mock-ui-baseline.json')
task('I06','W3',8,6,'Web: học tập, kế hoạch, lớp học, cộng đồng, gói thành viên nối API','I00',
 'Các trang so-tay, ke-hoach, luyen-tap, thong-ke, tu-vung/ngu-phap/thong-ke-tu-vung, lop-hoc, su-kien, thao-luan, goi-thanh-vien, tai-khoan, faq gọi API thật (module W5 learning/planner/stats/vocab/gamification/ai, W2 community/classroom, W4 entitlement).',
 'apps/web/|packages/ui/',
 'Mỗi trang trong phạm vi hiển thị dữ liệu của chính học viên đăng nhập, ghi được thay đổi và tải lại vẫn còn|'+NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:web|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ tests/integration/mock-ui-baseline.json')
task('I10','W2',8,3,'Bỏ tự tạo tài khoản nhân sự khi API khởi động','I08',
 'AuthService.onModuleInit đang tự tạo 5 tài khoản nhân sự (kể cả admin) với mật khẩu Admin123456! và secret TOTP cố định mỗi khi NODE_ENV khác production: một cửa hậu nếu máy chủ thật cấu hình thiếu biến. '
 'Gỡ hẳn việc tạo tài khoản khỏi code chạy thật (onModuleInit, service); tài khoản nhân sự demo chỉ được tạo bởi script seed chạy tay cho staging/demo (demo-seed hoặc tests/fixtures) và script đó từ chối chạy khi APP_ENV=production. '
 'Không còn mật khẩu hay secret TOTP viết cứng trong apps/api/src ngoài file test và script seed.',
 '@roots',
 'API khởi động với mọi NODE_ENV không tạo hay sửa tài khoản nào; có test kiểm tra|Script seed staging từ chối chạy khi APP_ENV=production|grep mật khẩu/secret mặc định trong apps/api/src (trừ test và seed) không còn kết quả|E2E staff login trên staging vẫn pass vì staging chạy seed',
 'pnpm test:auth|pnpm test:security|pnpm test:api:all',contracts='API',resources='api-hardening')
task('I11','W3',8,3,'Sửa lỗi 500 do mã viết cứng ở từ vựng, ngữ pháp, thảo luận','I06',
 'Trên bản demo sau I06: /tu-vung và /ngu-phap gọi /api/v1/datasets/jlpt-official/* và /thao-luan gọi /api/v1/questions/q-default-1/discussions, đều trả 500 vì id không phải UUID; /tu-vung vẫn hiện thẻ từ vựng viết sẵn khi API lỗi. '
 'Web: lấy id thật từ API (danh sách dataset, câu hỏi thật), bỏ mọi thẻ hoặc id viết cứng. API: kiểm tra định dạng id ở các route có tham số id (pipe/validator chung), id sai định dạng trả 400 hoặc 404, không bao giờ 500.',
 'apps/web/|packages/ui/',
 'Ba trang trên không còn request API trả 5xx khi đăng nhập học viên demo trên staging|Route API nhận id sai định dạng trả 400/404, có test|'+NO_MOCK+'|'+REAL_E2E,
 'pnpm test:web|pnpm check:no-mock-ui',contracts='API',grants='apps/api/src/modules/vocab/ apps/api/src/modules/community/ apps/api/src/common/pipes/ tests/playwright/ tests/integration/mock-ui-baseline.json')
task('I12','W2',8,2,'Phiên đăng nhập đọc được cookie: không mất đăng nhập khi tải lại trang','I08',
 'Đăng nhập đặt cookie auth_token (HttpOnly). Các route /me/* đọc cookie này, nhưng GET /api/v1/auth/session chỉ đọc header Bearer nên trả {"user":null} khi trình duyệt chỉ gửi cookie; web tưởng đã đăng xuất sau mỗi lần tải lại hoặc chuyển trang. '
 'Sửa để /auth/session và mọi guard dùng cùng một cách lấy phiên (cookie hoặc Bearer), đăng xuất xóa cookie.',
 '@roots',
 'E2E: học viên đăng nhập, tải lại trang, chuyển sang /so-tay và /lop-hoc vẫn ở trạng thái đã đăng nhập; đăng xuất rồi tải lại thì về trạng thái khách|E2E admin: nhân sự đăng nhập bằng mật khẩu và TOTP, tải lại trang hoặc mở thẳng /users vẫn ở trạng thái đã đăng nhập (sau I09, admin gọi /auth/session với Bearer nhận user null và hiện "Phiên làm việc đã hết hạn")|Test API: /auth/session trả user khi chỉ có cookie hợp lệ, trả null khi cookie sai hoặc hết hạn',
 'pnpm test:auth|pnpm test:security',contracts='API',resources='api-hardening',grants='tests/playwright/ apps/admin/lib/')
task('I13','W3',8,4,'Web: trang Luyện tập và Đề trộn nối API thật','I05',
 'Trang /luyen-tap vẫn import ALL_SAMPLE_EXAMS từ apps/web/features/exam/fixtures (I06 bỏ sót). Nối luyện tập theo kỹ năng, dạng 問題, số câu, câu sai/chưa gặp/đã đánh dấu, độ khó, tiếp tục bài dở (PRA) và tạo, lưu, làm lại, chia sẻ đề trộn (MIX) với API thật; xóa file fixtures khỏi code chạy thật (chỉ giữ trong test nếu cần).',
 'apps/web/|packages/ui/',
 'Học viên tạo bài luyện 10 câu theo bộ lọc, làm, xem đáp án ngay và tiếp tục bài dở trên staging|Học viên tạo đề trộn từ hai kỳ thi, làm và chia sẻ link; người nhận mở được|apps/web không còn import exam-fixtures ngoài thư mục test|'+NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:web|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ tests/integration/mock-ui-baseline.json')
# Found on staging logs 2026-10-19 while I03/I04 ran: I07 may only touch tests/ and docs, so fixes go first.
task('I14','W5',8,2,'API: sửa lỗi 500 ở /api/v1/datasets/jlpt-official/*','I01',
 'Trên staging, GET /api/v1/datasets/jlpt-official/trends, /vocabulary, /grammar, /compare/levels trả 500 '
 '("Failed query: select id, name, version, license_id ..."): bảng hoặc migration của dataset không khớp schema. '
 'Trang thống kê tần suất của web (apps/web/features/corpus) gọi các API này. Tìm nguyên nhân (thiếu migration, thiếu cột, thiếu dữ liệu seed), '
 'sửa để trả dữ liệu thật hoặc danh sách rỗng hợp lệ khi chưa có dataset; không trả 500.',
 'apps/api/src/modules/vocab/|apps/api/src/db/',
 'Trên staging sau khi seed demo, cả 4 API trên trả 200 với dữ liệu thật hoặc rỗng hợp lệ|Test API cho trường hợp chưa có dataset và đã có dataset|'+REAL_E2E,
 'pnpm test',contracts='API',grants='apps/api/src/db/ tests/playwright/')
task('I15','W4',8,2,'Quản trị: phiên hết hạn phải đưa về trang đăng nhập','I03 I12',
 'Sau I03, apps/admin/lib/auth-context.tsx không xóa phiên lưu trong trình duyệt khi GET /api/v1/auth/session trả 200 với user = null '
 '(phiên hết hạn hoặc đã đăng xuất ở nơi khác), nên giao diện vẫn hiện như đã đăng nhập trong khi mọi API trả 401. '
 'Xử lý: user null hoặc API trả 401 thì xóa phiên và đưa về /login kèm thông báo; bỏ móc test window.__setAdminLocale và DEFAULT_AUTH_CONTEXT '
 'giả nếu không cần (useAdminAuth ngoài provider phải báo lỗi rõ). '
 'Lưu ý khi làm lại (lượt 3 trượt staging, Chromium đạt hết, Mobile Safari trượt 14 test): E2E I15 chờ locator ghép main/page-title/header/h1 kèm .first(), nhưng trên điện thoại phần tử đầu tiên là h1 Hệ thống Quản trị JLPT nằm trong thanh menu đang ẩn, nên toBeVisible thất bại dù trang đã đăng nhập đúng. Dùng getByRole main hoặc heading/data-testid riêng trong main, không dùng selector ghép kèm .first(). Kiểm tra lại các E2E quản trị khác trên Mobile Safari sau khi sửa. '
 'Lưu ý lượt chạy lại (PR #75 trượt CI 19/10, main vẫn đạt): admin-nav.tsx thêm "invisible md:visible pointer-events-none" cho thanh menu khi đóng trên điện thoại, '
 'nên mọi phần tử trong thanh menu (staff-profile-badge, page-title...) bị ẩn thật; các E2E I03/I04 có sẵn (integration.spec.ts dòng ~1572, ~2008, ~2157, ~2201) dùng locator ghép kèm .first() chọn trúng phần tử ẩn đó và trượt '
 'trên Mobile Safari và Mobile Chrome. Bỏ thay đổi invisible/pointer-events đó (không thuộc phạm vi I15), hoặc sửa các locator ghép trong integration.spec.ts sang .filter({ visible: true }).first() '
 'hoặc locator trong main. Ba E2E I09 trên Firefox (dòng ~1068, ~1117, ~1162: login-error-alert, waitForURL) cũng trượt: chạy lại với --project=firefox và sửa. '
 'CI chạy đủ 5 trình duyệt, còn kiểm tra trên jlpt-vm chỉ chạy 3, nên tự chạy E2E quản trị trên cả Mobile Chrome (Pixel 7) và Firefox trước khi nộp.',
 'apps/admin/',
 'E2E: đăng nhập nhân sự, tải lại trang vẫn đăng nhập|E2E: xóa phiên phía máy chủ (đăng xuất ở tab khác) rồi tải lại hoặc thao tác thì về trang đăng nhập|'+NO_MOCK+'|'+REAL_E2E,
 'pnpm test:admin|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ tests/integration/mock-ui-baseline.json')
# Owner tried a real N3 package (2026-10-19): it validates as DRAFT_ONLY, but POST /imports always uses mode 'ready'.
task('I16','W2',8,3,'Nhập gói đề ở chế độ nháp (DRAFT_ONLY) qua API và trang quản trị','I03',
 'import.controller.ts không truyền mode nên import.service luôn kiểm tra ở chế độ ready và từ chối gói có issue blocking, '
 'trái với docs/import-format/README.md (DRAFT_ONLY được lưu nháp, chặn xuất bản). Cho POST /api/v1/admin/imports nhận mode=draft|ready '
 '(multipart field và JSON body), mặc định ready; gói DRAFT_ONLY lưu thành bản nháp kèm danh sách issue, không vào hàng duyệt/xuất bản cho tới khi '
 'nạp lại bản ready cùng packageId với revision cao hơn. Trang nhập gói của quản trị có lựa chọn "Nạp bản nháp", hiện trạng thái DRAFT_ONLY và từng issue '
 '(mức độ, đường dẫn, lý do). Xuất bản đề từ bản nháp phải bị chặn ở API. '
 'Ghi chú của người vận hành (19/10, sau review lần 3): chặn bản nháp cần sửa exam.service.ts và review.service.ts, nên các file này nằm trong phạm vi I16. '
 'Sửa gte() trong attempt.service.ts (truy vấn lượt làm bài 24 giờ của khách) cũng giữ lại: đó là lỗi 500 thật khi khách bắt đầu làm bài, cần cho staging đạt. '
 'Parser body trong main.ts phải có giới hạn kích thước ngay trong I16: một addContentTypeParser chung với { parseAs: "buffer", bodyLimit } '
 '(mặc định 1 MB; route POST /api/v1/admin/imports đặt bodyLimit riêng từ IMPORT_MAX_BYTES, mặc định 50 MB), vượt giới hạn trả 413 (I18 bổ sung test). '
 'Validator trang quản trị đếm đủ số câu thiếu đáp án vào blockingIssueCount.',
 'apps/api/src/modules/import/|apps/api/src/modules/exam/|apps/api/src/modules/review/|apps/api/src/modules/attempt/attempt.service.ts|apps/api/src/main.ts',
 'Gói fixtures/imports/draft.zip nạp được ở chế độ nháp, trang quản trị hiện issue blocking|Cùng gói ở chế độ ready bị từ chối với thông báo rõ|'
 'API chặn duyệt và xuất bản bản nháp (test âm)|Nạp lại bản ready cùng packageId, revision cao hơn thì thay bản nháp|'+NO_MOCK+'|'+REAL_E2E,
 'pnpm test|pnpm check:no-mock-ui',contracts='API',grants='apps/admin/features/import/ apps/admin/app/imports/ apps/admin/lib/api-client.ts tests/playwright/')
# Owner's extraction project now writes Vietnamese explanations into import packages (2026-10-19).
task('I17','W2',8,3,'Lời giải trong gói nhập đi vào quy trình duyệt và hiện cho học viên','I16',
 'import.service lưu question.explanation ({locale, blocks}) vào question_versions.explanation, nhưng trang xem lại bài của học viên và màn duyệt lời giải '
 'chỉ đọc explanation_versions (status approved, content.correctReason/wrongReasonsByOption/translation), nên lời giải trong gói nhập không bao giờ hiện. '
 'Khi nhập gói: mỗi câu có explanation tạo một explanation_versions bản nháp (status draft, locale, tác giả = người nhập) và tách các đoạn theo tiền tố: '
 '"• Dịch nghĩa:" -> translation; "• Đáp án đúng: [n]" + phần sau -> correctReason; mỗi dòng "- [n] ...: ..." trong đoạn "• Phân tích các phương án còn lại:" '
 '-> wrongReasonsByOption[n]; không khớp tiền tố thì giữ toàn bộ blocks và dùng chữ của chúng làm correctReason. Giữ nguyên blocks gốc trong content. '
 'Học viên chỉ thấy lời giải sau khi reviewer duyệt (approved) và sau khi nộp bài; không lộ trước quyền xem. '
 'Script bài nghe: group.transcript (RichText) trong gói hiện bị importer bỏ qua. Khi nhập, mỗi câu nghe của group có transcript cũng tạo explanation_versions bản nháp '
 '(kể cả khi explanation null) với content.transcript = group.transcript, để màn duyệt và trang xem lại bài hiện script theo quy tắc transcriptAllowed của license (AUDIO-08); '
 'không trả transcript trong API làm bài.',
 'apps/api/src/modules/import/|apps/api/src/modules/review/',
 'Nhập gói có explanation -> màn duyệt lời giải của quản trị hiện bản nháp với bản dịch, lý do đúng, lý do sai từng phương án|'
 'Reviewer duyệt -> trang xem lại bài của học viên hiện đủ lời giải; chưa duyệt thì không hiện|Test âm: không lộ lời giải trước khi nộp bài|'
 'Gói có group nghe kèm transcript -> màn duyệt và trang xem lại bài (sau khi nộp, license cho phép) hiện script; API làm bài không trả transcript|'+NO_MOCK+'|'+REAL_E2E,
 'pnpm test|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/')
# Security review of I16 (PR #74, 2026-10-19): its global body parsers read the whole stream with no size limit.
task('I18','W2',8,1,'API: giới hạn kích thước body cho multipart, zip và octet-stream','I16',
 'I16 thêm vào apps/api/src/main.ts ba addContentTypeParser (multipart/form-data, application/zip, application/octet-stream) tự gom stream vào Buffer. '
 'Cách này bỏ qua bodyLimit của Fastify và chạy trước guard đăng nhập, nên ai cũng gửi được body lớn tùy ý vào bất kỳ route POST nào và làm API hết RAM. '
 'Sửa: dùng một parser chung với { parseAs: "buffer", bodyLimit } (mặc định 1 MB; riêng POST /api/v1/admin/imports đặt giới hạn ở cấu hình route, '
 'lấy từ biến môi trường IMPORT_MAX_BYTES, mặc định 50 MB); vượt giới hạn trả 413. Giữ nguyên hành vi nhập gói của I16.',
 'apps/api/src/main.ts|apps/api/src/modules/import/',
 'Test: body 2 MB application/octet-stream vào route không phải nhập gói trả 413 mà không cần đăng nhập|'
 'Test: gói vượt IMPORT_MAX_BYTES vào /api/v1/admin/imports trả 413; gói fixtures hợp lệ vẫn nhập được ở chế độ draft và ready',
 'pnpm test',contracts='API')
# Owner tried the N3 package on the preview (2026-10-20): every upload got 415 in the container, yet the admin page said "thành công".
task('I19','W2',8,1,'API trong container nhận gói ZIP tải lên (lỗi 415)','I18',
 'Image API (infra/docker/api.Dockerfile) chép đè dist/src/main.js bằng infra/docker/entrypoint.js, nên các addContentTypeParser và hook bodyLimit của apps/api/src/main.ts '
 '(I16, I18) không chạy: trên staging và bản xem thử, POST /api/v1/admin/imports với multipart/form-data hoặc application/zip luôn trả 415 Unsupported Media Type. '
 'Tách phần cấu hình HTTP (parser buffer cho multipart/zip/octet-stream, bodyLimit 1 MB mặc định, IMPORT_MAX_BYTES 50 MB cho route nhập gói) thành một hàm dùng chung, '
 'gọi từ cả main.ts và entrypoint.js; bỏ bodyLimit 50 MB toàn cục của entrypoint. Test chạy trên image thật, không chỉ createApp() của main.ts.',
 'apps/api/src/main.ts|apps/api/src/modules/import/',
 'E2E trên staging (jlpt-stage-test): nhân sự tải fixtures/imports/draft.zip qua multipart ở chế độ draft -> 201, GET /api/v1/admin/imports trả job đó sau khi tải lại trang|'
 'Gói 12 MB vào /api/v1/admin/imports đạt; body 2 MB vào route khác trả 413',
 'pnpm test',contracts='API',grants='infra/docker/ tests/playwright/')
task('I20','W4',8,1,'Trang nhập gói: bỏ nhập giả trong trình duyệt, chỉ hiện kết quả thật từ API','I16',
 'apps/admin/features/import/import-manager.ts tự đọc ZIP, tự kiểm tra và tạo job/mã đề giả (job_${Date.now()}, exam_${Date.now()}) trong bộ nhớ trình duyệt, nên khi API lỗi '
 'trang vẫn báo "Nạp bản nháp thành công" và hiện bảng issue như đã lưu. Trang nhập gói chỉ gọi API: hiện trạng thái tải lên, lỗi API nguyên văn (415/413/400 kèm danh sách lỗi), '
 'và danh sách job lấy lại từ GET /api/v1/admin/imports; không tạo id hay dữ liệu giả ở client. Kiểm tra trước khi tải lên ở client (nếu giữ) chỉ là gợi ý, ghi rõ chưa lưu.',
 'apps/admin/',
 'E2E: API trả lỗi -> trang hiện lỗi, không có thông báo thành công, danh sách không thêm dòng|E2E: tải gói thật -> dòng mới đến từ API và còn sau khi tải lại trang|'+NO_MOCK+'|'+REAL_E2E,
 'pnpm test:admin|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/')
# Owner (2026-10-20): JLPT question counts per 問題 vary by year (jlpt.jp lists them as 目安), so an
# official blueprint must not reject a real past exam that is off by a few questions.
task('I21','W5',8,1,'Blueprint: đề gốc được lệch số câu so với số tham chiếu','I16',
 'validateExamAgainstBlueprint (packages/content-tools/src/blueprint-validator.ts) đang báo lỗi khi tổng số câu hoặc số câu từng mondaiType khác blueprint, nên đề JLPT thật của năm khác '
 '(số câu từng 問題 trên jlpt.jp chỉ là 目安) bị từ chối. Sửa: với exam.kind "original", blueprint chỉ bắt buộc khung đề (đủ section, đúng thứ tự, mondaiType có trong blueprint); '
 'số câu từng mondaiType, tổng số câu và durationSec khác số tham chiếu chỉ là warning có ghi số thực tế và số tham chiếu, không chặn nhập/duyệt/xuất bản. '
 'mondaiType không có trong blueprint hoặc thiếu hẳn một section vẫn là lỗi. Với đề trộn (kind "mixed"), generator vẫn ra đúng số câu tham chiếu. '
 'Điểm quy đổi của đề gốc tính theo số câu thật của đề, không theo questionCount của blueprint. Cập nhật docs/import-format/README.md.',
 'packages/content-tools/',
 'Test: đề N3 có 問題3 10 câu (tham chiếu 11) nhập được, readiness không giảm vì số câu, có warning nêu 10/11|'
 'Test: đề thiếu section listening hoặc có mondaiType lạ vẫn bị lỗi|Test: đề trộn N3 sinh đúng số câu tham chiếu|Test: chấm điểm đề gốc dùng số câu thật',
 'pnpm test',contracts='API',grants='apps/api/src/modules/scoring/ apps/api/src/modules/import/ docs/import-format/')
# Official blueprints for N1–N5 were added on 2026-10-20, including two N4/N5 versions (before and after the
# December 2020 change). Several blueprints per level are now active, so "the active blueprint" is ambiguous.
task('I22','W2',8,1,'Chọn đúng blueprint hiện hành khi một cấp độ có nhiều blueprint','I16',
 'getActiveBlueprintByLevel (blueprint.service.ts) và truy vấn blueprint trong mix.service.ts / practice.service.ts chỉ lọc status active và sắp theo version, '
 'nên khi một cấp có blueprint synthetic demo, blueprint chính thức 2010 (jlpt-n5-2010) và 2020 (jlpt-n5-2020) cùng version 1 thì kết quả không xác định. '
 'Sửa: blueprint hiện hành của một cấp = active, ưu tiên kind official hơn synthetic, rồi effectiveFrom mới nhất, bỏ bản có effectiveTo đã qua '
 '(lưu effectiveTo từ dữ liệu tạo blueprint; thêm cột nếu chưa có, kèm migration). Đề trộn, đề luyện và chấm điểm dùng blueprint hiện hành; '
 'đề gốc vẫn dùng đúng blueprintRef {id, version} ghi trong gói. Trang quản trị bản thiết kế đề hiện rõ bản nào đang là hiện hành của từng cấp.',
 'apps/api/src/modules/blueprint/|apps/api/src/modules/exam/',
 'Test: N5 có synthetic + jlpt-n5-2010 + jlpt-n5-2020 cùng active -> hiện hành là jlpt-n5-2020|Test: đề gốc N5 12/2019 gắn jlpt-n5-2010 vẫn chấm theo bản 2010|Test: đề trộn N5 dùng số câu của bản 2020',
 'pnpm test',contracts='API',grants='apps/api/src/db/ apps/admin/')
task('I07','W6',8,4,'Nghiệm thu tích hợp toàn bộ và khóa chặn dữ liệu giả','I01 I08 I10 I11 I12 I13 I09 I03 I04 I05 I06 I14 I15',
 'Chạy E2E tích hợp đầy đủ hai ứng dụng trên staging CI; baseline mock-ui phải rỗng và check:no-mock-ui thành cổng chặn vĩnh viễn trong CI; cập nhật bản demo và báo cáo. Ghi chú của người vận hành (20/10): lần kiểm tra 1 trượt vì chạy pnpm test:e2e:integration thẳng trên VM (thiếu thư viện WebKit, không có stack staging nên API 500, Mailpit 404); lệnh đó đã bỏ khỏi kiểm tra, E2E chạy qua jlpt-stage-test check-all. Không sửa code để chiều các lỗi môi trường đó; chỉ sửa lỗi E2E thật thấy trong jlpt-stage-test check-all.',
 'tests/|.github/|infra/|docs/release/|docs/runbooks/',
 'tests/integration/mock-ui-baseline.json rỗng; CI fail nếu có dữ liệu giả mới|E2E đăng nhập học viên và nhân sự rồi đi qua mọi trang web/admin, fail nếu bất kỳ request API nào trả 5xx hoặc trang hiện key dịch thô|E2E: học viên đăng ký -> làm đề -> xem điểm; editor nhập -> reviewer duyệt -> xuất bản; admin xem người dùng và audit; tất cả trên staging thật|docs/release/INTEGRATION_REPORT.md liệt kê từng trang và bằng chứng E2E',
 'pnpm check:no-mock-ui',resources='ci-workflow staging-deploy',kind='verification')

# Day 9 (owner request 2026-10-17): one design system on shadcn/ui + Tailwind, and mobile speed.
# D00 (packages/ui only) starts early; D02/D03 rewrite pages after D00, by which time the API-wiring tasks have merged.
NO_REGRESS = ('Lighthouse trên staging CI không giảm so với số đo trước đợt (máy tính hiệu năng ≥98, điện thoại ≥70, trợ năng ≥95, SEO 100); '
              'ảnh chụp 390px và 1366px của các trang đã đổi lưu làm artifact')
# Owner 2026-10-19 "tăng tốc": D00 only touches packages/ui, so it starts now instead of after I07.
task('D00','W3',9,5,'Hệ thống thiết kế @jlpt/ui dựng lại trên shadcn/ui','I00',
 'Khởi tạo shadcn/ui (components.json, cn, class-variance-authority, tailwind-merge, Radix khi cần) trong packages/ui; '
 'dựng lại Button, Input, Textarea, Label, Select, Checkbox, RadioGroup, Switch, Tabs, Dialog, DropdownMenu, Popover, Tooltip, Card, Badge, Alert, Toast, Skeleton theo token màu hiện có, sáng/tối theo class dark. '
 'Giữ nguyên tên export và props đang dùng để web/admin không vỡ; bỏ inline style. Thêm lệnh pnpm check:ui-primitives (packages/ui/scripts/) báo thẻ <button>/<input>/<select>/<textarea> gốc trong apps/web và apps/admin, kèm baseline giảm dần.',
 'packages/ui/|package.json|docs/decisions/',
 'Mỗi thành phần có test hành vi bàn phím, focus và aria; Dialog giữ focus và đóng bằng Esc|Chỉ chép thành phần thật sự dùng; không cài thư viện UI nguyên khối|'
 'Bản build web không tăng quá 15 KB JS nén ở trang chủ so với trước đợt|'+NO_REGRESS,
 'pnpm --filter @jlpt/ui test|pnpm check:ui-primitives|pnpm build',contracts='API',resources='ui-contract')
task('D01','W6',9,3,'Cổng hiệu năng Lighthouse trên staging CI','I00',
 'Thêm Lighthouse CI chạy trên staging thật cho các trang chính (/, /de-thi, /phong-thi, /n5, /dang-nhap, admin /login), preset điện thoại và máy tính, lưu báo cáo làm artifact; '
 'ghi số đo gốc trước đợt vào docs/release/performance-baseline.json; ngân sách: điện thoại LCP < 2,5 s, CLS < 0,1, TBT < 200 ms, JS ban đầu mỗi trang có trần.',
 'tests/|.github/|infra/|docs/release/|package.json',
 'pnpm test:lighthouse chạy được trên staging CI và fail khi vượt ngân sách|Số đo gốc lưu kèm commit SHA; không lấy số máy ảo làm số production|Ngân sách ban đầu ở chế độ cảnh báo, D04 chuyển thành chặn',
 'pnpm test:lighthouse -- --list',resources='ci-workflow staging-deploy')
task('D02','W3',9,6,'Web dùng thống nhất @jlpt/ui','D00',
 'Thay toàn bộ <button>/<input>/<select>/<textarea> gốc và class tự chế trong apps/web bằng thành phần @jlpt/ui; đồng bộ khoảng cách, cỡ chữ, trạng thái hover/focus/disabled/loading; '
 'thiết kế lại thanh menu máy tính gọn (nhóm mục phụ vào menu "Thêm", chuyển ngôn ngữ/giao diện vào menu tài khoản) để hiện được từ 1280px.',
 'apps/web/',
 'Baseline check:ui-primitives của apps/web rỗng|Menu máy tính hiện đủ từ 1280px, không cuộn ngang|'+NO_REGRESS,
 'pnpm test:web|pnpm check:ui-primitives|pnpm check:no-mock-ui',contracts='API')
task('D03','W4',9,4,'Admin dùng thống nhất @jlpt/ui','D00',
 'Thay thẻ gốc và inline style trong apps/admin bằng thành phần @jlpt/ui; bảng, form, bộ lọc, hộp thoại xác nhận dùng chung một kiểu.',
 'apps/admin/',
 'Baseline check:ui-primitives của apps/admin rỗng|Admin có chế độ tối hoạt động|'+NO_REGRESS,
 'pnpm test:admin|pnpm check:ui-primitives|pnpm check:no-mock-ui',contracts='API')
task('D04','W3',9,5,'Tối ưu tốc độ web trên điện thoại','D01 D02',
 'Đưa các trang chính đạt ngân sách D01 trên điện thoại: giảm JS tải ban đầu (server component, tách gói, tải muộn phần không cần ngay), font tự host có preload và font-display swap, ảnh next/image đúng kích thước, bỏ request analytics lỗi 404, cache tĩnh.',
 'apps/web/|packages/ui/',
 'Lighthouse điện thoại trên staging: LCP < 2,5 s, CLS < 0,1, TBT < 200 ms ở /, /de-thi, /phong-thi, /n5, /dang-nhap|Ngân sách D01 chuyển sang chặn và pass|Không đổi hành vi; E2E tích hợp vẫn pass',
 'pnpm test:web|pnpm build',contracts='API')
# Owner review of the preview (2026-10-20): pages show internal feature codes such as "(ADM-01)", "(LIB-06)".
UI_CODES = ('Bỏ mọi mã tính năng nội bộ hiện ra cho người dùng (ví dụ "(ADM-01)", "(LIB-06)", "LIB-14", "(EXAM-03)") khỏi tiêu đề, nhãn, '
 'chuỗi dịch vi/ja/en và thuộc tính hiển thị; mã chỉ được nằm trong data-testid, comment hoặc test. Sửa test đang so khớp chuỗi có mã sang data-testid. '
 'Thêm kiểm tra trong pnpm check:no-mock-ui: fail nếu chuỗi dịch hoặc JSX text chứa mẫu \\([A-Z]{2,5}-\\d{2,3}\\).')
task('D06','W3',9,1,'Web: bỏ mã tính năng nội bộ khỏi giao diện, ẩn đề trộn 0 câu','D04',
 UI_CODES+' Thẻ "Đề xuất tiếp theo" và danh sách đề không hiện đề trộn có 0 câu (ví dụ "Đề trộn N5 (0 câu)"); không đủ câu thì ẩn hoặc hiện trạng thái trống có hướng dẫn.',
 'apps/web/|packages/ui/',
 'Không trang web nào hiện mã dạng (LIB-06) ở vi/ja/en|Không hiện đề trộn 0 câu|'+NO_REGRESS,
 'pnpm test:web|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/')
task('D07','W4',9,1,'Admin: bỏ mã tính năng nội bộ khỏi giao diện','D03',
 UI_CODES+' Thẻ chức năng trên bảng điều khiển dùng thành phần Card/Link của @jlpt/ui, không gạch chân toàn bộ chữ mô tả.',
 'apps/admin/',
 'Không trang quản trị nào hiện mã dạng (ADM-01) ở vi/ja/en|'+NO_REGRESS,
 'pnpm test:admin|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/')
# Owner review (2026-10-20): student pages still look like the old UI. D02 swapped raw controls for
# @jlpt/ui primitives but kept page layouts: 661 inline style={{}} in 53/125 apps/web files, emoji icons,
# native selects. Admin (D03) has none. Restyle apps/web for real, in three disjoint path groups.
SHADCN = ('Giao diện theo đúng phong cách shadcn/ui: nền trung tính, Card/Tabs/Select/Dialog/Table/Badge/Skeleton của @jlpt/ui, khoảng cách và cỡ chữ theo thang Tailwind, '
 'icon lucide-react (không emoji làm icon), trạng thái trống/đang tải/lỗi dùng chung một thành phần. Không còn style={{}} viết tay trong phạm vi task, trừ giá trị tính lúc chạy '
 '(ví dụ width của thanh tiến độ) có comment "ui-allow-style". Không đổi hành vi, route, data-testid, API. Chụp ảnh trước/sau ở 390 và 1366 px cho từng trang trong phạm vi. '
 'Dùng PageHeader (@jlpt/ui/components/page-header), EmptyState (@jlpt/ui/components/empty-state) và icon lucide-react đã có sẵn; import @jlpt/ui theo từng thành phần, không qua barrel.')
task('D08','W3',9,4,'Web: khung trang và các trang chính theo shadcn/ui','D02 D07',
 SHADCN+' Phạm vi: khung trang (header, menu điện thoại, footer, nav-shell), trang chủ, thư viện đề, phòng thi, trang cấp độ/SEO, đăng nhập/đăng ký, trang thông tin. '
 'Thêm lucide-react vào @jlpt/ui, thêm PageHeader và EmptyState dùng chung; mở rộng pnpm check:ui-primitives đếm style={{ trong apps/web theo baseline giảm dần (ratchet). '
 'Tốc độ: trang chủ, trang cấp độ, đăng nhập/đăng ký, thư viện đề và phòng thi dựng nội dung ở máy chủ (Server Component; chỉ phần tương tác là "use client", chữ i18n lấy ở máy chủ theo locale), '
 'để LCP mobile trong Lighthouse giả lập (CPU x4, 150 ms RTT) dưới 2,5 s. Ghi số đo trước/sau vào docs/decisions/. Không thêm JS tải ban đầu quá 180 KB gzip.',
 'apps/web/app/page.tsx|apps/web/app/layout.tsx|apps/web/app/nav-shell.tsx|apps/web/app/globals.css|apps/web/app/(auth)/|apps/web/app/(exam)/|apps/web/app/(info)/|apps/web/app/(library)/|apps/web/app/(seo)/|apps/web/features/exam/|apps/web/features/library/|packages/ui/',
 'Các trang trong phạm vi không còn style={{}} viết tay|Ảnh trước/sau 390/1366px trong docs/release/|check:ui-primitives đếm inline style và chặn tăng|Lighthouse mobile LCP < 2,5 s cho /, /de-thi, /phong-thi, /n5, /dang-nhap|'+NO_REGRESS,
 'pnpm test:web|pnpm check:ui-primitives|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ docs/release/')
task('D09','W3',9,4,'Web: trang học tập, luyện tập, kế hoạch, kết quả theo shadcn/ui','D02 D07',
 SHADCN+' Phạm vi: sổ tay, flashcard/SRS, luyện tập, kế hoạch học, kết quả bài thi, thống kê, kho từ vựng/ngữ pháp.',
 'apps/web/app/(learning)/|apps/web/app/(practice)/|apps/web/app/(planner)/|apps/web/app/(results)/|apps/web/app/(corpus)/|apps/web/app/(analytics)/|apps/web/features/learning/|apps/web/features/practice/|apps/web/features/planner/|apps/web/features/results/|apps/web/features/corpus/|apps/web/features/analytics/',
 'Các trang trong phạm vi không còn style={{}} viết tay|Ảnh trước/sau 390/1366px trong docs/release/|'+NO_REGRESS,
 'pnpm test:web|pnpm check:ui-primitives|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ docs/release/')
task('D10','W3',9,4,'Web: tài khoản, gói học, lớp học, cộng đồng theo shadcn/ui','D02 D07',
 SHADCN+' Phạm vi: tài khoản và cài đặt, gói học/thanh toán, lớp học, cộng đồng/thảo luận, chia sẻ, lời giải, huy hiệu, AI, đề trộn.',
 'apps/web/app/(account)/|apps/web/app/(billing)/|apps/web/app/(classroom)/|apps/web/app/(community)/|apps/web/app/(share)/|apps/web/features/account/|apps/web/features/billing/|apps/web/features/classroom/|apps/web/features/community/|apps/web/features/explanations/|apps/web/features/gamification/|apps/web/features/ai/|apps/web/features/mix/',
 'Các trang trong phạm vi không còn style={{}} viết tay|Ảnh trước/sau 390/1366px trong docs/release/|'+NO_REGRESS,
 'pnpm test:web|pnpm check:ui-primitives|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ docs/release/')
task('D05','W6',9,3,'Nghiệm thu giao diện thống nhất và hiệu năng','D02 D03 D07 D10',
 'Chạy E2E tích hợp, Lighthouse và chụp toàn bộ trang web/admin ở 390, 1366, 1920px; check:ui-primitives và check:no-mock-ui thành cổng chặn vĩnh viễn; báo cáo trước/sau. '
 'E2E tích hợp chạy qua jlpt-stage-test check-all; Lighthouse chạy trong CI staging trên GitHub (không chạy thẳng trên VM). '
 'Bỏ LCP khỏi WARN_ONLY_METRICS trong tests/lighthouse/budgets.ts để LCP chặn trở lại (tạm cảnh báo từ 2026-10-20 chờ D08). '
 'D04, D06, D08, D09, I19, I20, I22 do Claude làm trực tiếp và ghép qua PR (coordinator ghi CANCELLED nên không còn là phụ thuộc); D05 kiểm tra cả phần của D08.',
 'tests/|.github/|docs/release/',
 'docs/release/DESIGN_PERF_REPORT.md có số đo trước/sau và ảnh từng trang|tests/lighthouse/budgets.ts không còn chỉ số chỉ cảnh báo|Không trang nào cuộn ngang, hiện key dịch thô hoặc mã tính năng nội bộ|check:ui-primitives và test:lighthouse chặn trong CI',
 'pnpm check:ui-primitives|pnpm check:no-mock-ui',resources='ci-workflow staging-deploy',kind='verification')

# Day 10 (owner request 2026-10-18): five features a Vietnamese JLPT candidate asks for first.
# NEW-01 scaled score + sectional pass marks, NEW-02 Hán-Việt readings, NEW-03 furigana toggle,
# NEW-04 pacing alerts, NEW-05 JLPT calendar and registration deadlines in Vietnam.
# Backend and data run alongside day 9; UI waits for the day-9 design system (D02/D03).
task('P01','W1',10,4,'Ước lượng điểm quy đổi JLPT, điểm sàn từng phần và nhịp làm bài','I01',
 'Trong packages/exam-engine: hàm thuần ước lượng điểm quy đổi 0–180 theo từng phần thi của từng cấp N1–N5 (N1–N3: ba phần; N4–N5: hai phần, trong đó phần kiến thức và đọc hiểu gộp điểm), so với điểm đỗ tổng và điểm sàn từng phần, trả kết quả đỗ/trượt và phần dưới sàn. '
 'Bảng quy đổi và ngưỡng là dữ liệu cấu hình có phiên bản (không viết cứng trong hàm), mặc định theo mức công bố chính thức của JLPT; mọi kết quả kèm cờ "ước lượng". '
 'Thêm mô hình nhịp làm bài: thời gian khuyến nghị cho từng dạng 問題 và mốc tiến độ trong mỗi phần.',
 'packages/exam-engine/|packages/schema/|contracts/|docs/decisions/',
 'Test cho cả 5 cấp: đỗ khi đủ tổng và đủ sàn; trượt khi đủ tổng nhưng dưới sàn một phần; trượt khi thiếu tổng|Bảng quy đổi có phiên bản, đổi bảng không cần sửa code|Kết quả luôn có nhãn ước lượng; giải thích nguồn ngưỡng trong docs/decisions',
 'pnpm test:engines:all|pnpm contracts:check',contracts='API',resources='engine-contract schema-contract')
task('P02','W5',10,4,'Dữ liệu âm Hán Việt cho Kanji','I01',
 'Nhập âm Hán Việt cho Kanji từ trường kVietnamese của Unicode Unihan (giấy phép Unicode, ghi nguồn và phiên bản); chuẩn hóa NFC; lưu vào dữ liệu Kanji; API trả hanViet cho Kanji và cho từ vựng (ghép theo từng chữ Hán của từ). Kanji không có dữ liệu thì để trống, không đoán.',
 'tools/import-data/|packages/content-tools/|apps/api/src/modules/vocab/|apps/api/src/modules/learning/|docs/decisions/',
 'Script nhập chạy lại không tạo trùng, ghi nguồn và giấy phép|経済 trả KINH TẾ; chữ không có dữ liệu trả rỗng|API trả hanViet trong tra từ, sổ tay và giải thích; có test',
 'pnpm test:import-validation|pnpm test:learning:all',contracts='API')
task('P03','W2',10,5,'API: kết quả đỗ/trượt theo JLPT, lịch thi tại Việt Nam và nhắc hạn đăng ký','P01',
 'Kết quả bài thi và lịch sử trả điểm quy đổi từng phần, đỗ/trượt và phần dưới sàn từ P01; lưu dữ liệu thời gian từng câu để phân tích nhịp. '
 'Thêm thực thể lịch thi JLPT tại Việt Nam (kỳ thi, ngày thi, hạn đăng ký, địa điểm Hà Nội/Đà Nẵng/TP.HCM, link đăng ký chính thức) do quản trị nhập; API công khai đọc lịch; thông báo nhắc trước hạn đăng ký và trước ngày thi (bật/tắt theo người dùng). Không seed ngày thi giả: thiếu dữ liệu thì API trả rỗng.',
 '@roots',
 'Kết quả bài thi demo N5 có điểm từng phần và đỗ/trượt khớp P01|Lịch thi CRUD có phân quyền và audit; trang công khai chỉ thấy bản đã xuất bản|Nhắc hạn đăng ký gửi qua outbox đúng một lần, tôn trọng cài đặt tắt nhắc; có test',
 'pnpm test:api:all|pnpm test:security',contracts='API EVENTS DB',resources='db-migration')
task('P04','W3',10,6,'Web: đỗ/trượt theo phần, Hán Việt, bật/tắt furigana, cảnh báo nhịp làm bài, lịch thi','P02 P03 D02',
 'Trang kết quả: điểm quy đổi từng phần, đỗ/trượt, phần dưới sàn, nhãn ước lượng. '
 'Hiện âm Hán Việt cạnh Kanji ở tra từ, sổ tay, giải thích. Nút bật/tắt furigana trong luyện tập và chữa bài (nhớ lựa chọn). '
 'Phòng thi: chế độ luyện tập cảnh báo khi chậm so với mốc nhịp; chế độ thi thật chỉ hiện mốc tiến độ kín đáo; sau bài có phân tích câu tốn thời gian. '
 'Trang lịch thi JLPT tại Việt Nam và cài đặt nhắc hạn đăng ký.',
 'apps/web/|packages/ui/',
 'Học viên làm đề demo N5 thấy điểm từng phần và đỗ/trượt|Tắt furigana thì ẩn trên mọi câu, tải lại vẫn giữ|Cảnh báo nhịp hiện đúng khi chậm hơn mốc trong E2E|Trang lịch thi hiện dữ liệu quản trị nhập, trống khi chưa có|'+NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:web|pnpm check:no-mock-ui|pnpm check:ui-primitives',contracts='API',grants='tests/playwright/ tests/integration/mock-ui-baseline.json')
# Owner 2026-10-19 "tăng tốc": P05 is a new admin page and its API (P03) is merged, so it starts now; D03 later moves it to @jlpt/ui.
task('P05','W4',10,3,'Quản trị: lịch thi JLPT và bảng quy đổi điểm','P03',
 'Trang quản trị nhập và xuất bản lịch thi (ngày thi, hạn đăng ký, địa điểm, link) và xem/cập nhật phiên bản bảng quy đổi điểm, có audit. '
 'Dùng thành phần đang có trong @jlpt/ui; D03 sẽ chuyển trang sang bộ thành phần mới, nên không tự viết lại nút/ô nhập riêng.',
 'apps/admin/',
 'Admin nhập kỳ thi tháng 12, xuất bản, trang web công khai hiện ngay|Đổi bảng quy đổi tạo phiên bản mới, kết quả cũ giữ phiên bản đã dùng|'+NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:admin|pnpm check:no-mock-ui',contracts='API',grants='tests/playwright/ tests/integration/mock-ui-baseline.json')
task('P06','W6',10,2,'Nghiệm thu 5 tính năng bổ sung','P04 P05',
 'E2E trên staging cho NEW-01..05, ảnh chụp 390/1366px, cập nhật danh sách tính năng và báo cáo. D05 do Claude làm trực tiếp (PR #106, coordinator ghi CANCELLED) nên không còn là phụ thuộc.',
 'tests/|docs/release/',
 'E2E: làm đề N5 → đỗ/trượt từng phần; Hán Việt và furigana; cảnh báo nhịp; lịch thi và nhắc hạn đăng ký|docs/release/NEW_FEATURES_REPORT.md có ảnh và bằng chứng từng tính năng',
 'pnpm check:no-mock-ui',resources='staging-deploy',kind='verification')

# Owner 2026-10-21: P06 found Hán Việt readings wrong for multi-reading kanji and /tu-vung empty. Two follow-up tasks.
task('H01','W5',11,8,'Âm Hán Việt theo từng từ vựng: bảng chữ + âm On, ngoại lệ theo nghĩa, độ tin cậy, lưu cho mọi mục từ điển','',
 'MỤC TIÊU: mỗi từ vựng có âm Hán Việt đúng theo nghĩa của từ, kèm độ tin cậy; từ chưa chắc thì đánh dấu để người duyệt (H03) thay vì hiện âm sai. '
 'HIỆN TRẠNG: packages/content-tools/src/nlp/hanviet-data.json lưu MỘT âm cho mỗi chữ (19.403 chữ, nguồn không đáng tin: kVietnamese của Unihan lẫn âm Nôm, 予 = "nhừ"); '
 'getHanVietForWord ghép âm từng chữ nên sai khoảng 15% từ JLPT: 予約 ra DƯ YÊU (đúng DỰ ƯỚC), 要約 ra YÊU YÊU (YẾU ƯỚC), 重要 ra TRÙNG YÊU (TRỌNG YẾU), 必要 ra TẤT YÊU (TẤT YẾU), '
 '番号 ra PHAN HIỆU (PHIÊN HIỆU), 音楽 ra ÂM LẠC (ÂM NHẠC), 社長 ra XÃ TRƯỜNG (XÃ TRƯỞNG). '
 'Từ điển JMdict + KANJIDIC2 đã nạp (bảng lexical_entries, entry_readings, kanji_entries; script apps/api/scripts/lexicon/). kanji_entries.onyomi có âm On (katakana) của từng chữ. '
 'LỚP 1 - BẢNG CHỮ + ÂM ON: tạo tools/import-data/data/hanviet-onyomi.tsv, mỗi dòng "kanji<TAB>âm On (katakana)<TAB>âm Hán Việt<TAB>ghi chú", '
 'phủ mọi âm On trong KANJIDIC2 của TOÀN BỘ 2.136 chữ Jōyō (grade 1-8). Âm Hán Việt viết HOA có dấu, NFC, một kiểu đặt dấu thống nhất. '
 'Ví dụ đúng: 楽 ガク NHẠC / 楽 ラク LẠC; 易 エキ DỊCH / 易 イ DỊ; 悪 アク ÁC / 悪 オ Ố; 説 セツ THUYẾT / 説 ゼイ THUẾ; 要 ヨウ YẾU; 約 ヤク ƯỚC; 予 ヨ DỰ; 番 バン PHIÊN. '
 'Thêm tools/import-data/data/hanviet-primary.tsv (một âm chính cho mỗi chữ) dùng khi không xác định được âm On (từ đọc âm Kun, chữ ngoài danh sách). '
 'LỚP 2 - NGOẠI LỆ THEO NGHĨA: tools/import-data/data/hanviet-word-overrides.tsv "từ<TAB>âm cả từ<TAB>lý do", tối thiểu 300 từ JLPT N5-N1 mà cùng âm On nhưng tiếng Việt đổi âm theo nghĩa, '
 'ví dụ 長 チョウ: 社長 XÃ TRƯỞNG / 長期 TRƯỜNG KỲ; 行 コウ: 銀行 NGÂN HÀNG / 旅行 LỮ HÀNH; 重 チョウ: 重複 TRÙNG PHỨC / 貴重 QUÝ TRỌNG. '
 'Lập danh sách chữ "đổi âm theo nghĩa" (長, 行, 重, ...) trong docs/decisions/H01-hanviet-word-level.md. '
 'LỚP 3 - THUẬT TOÁN VÀ ĐỘ TIN CẬY: thêm vào packages/content-tools hàm computeHanViet(term, reading) trả '
 '{ hanViet, perKanji: [{ kanji, onyomi, hanViet }], confidence: "high" | "review" | "kun", source: "override" | "rule" }. '
 'Thứ tự: (a) có trong ngoại lệ thì dùng, confidence high, source override; '
 '(b) đổi reading hiragana sang katakana, tách theo từng chữ bằng cách thử các âm On của chữ đó, chấp nhận biến âm (đục hóa ハ->バ/パ, カ->ガ...; âm ngắt ク/キ/チ/ツ->ッ), kana trong từ (okurigana) đi qua nguyên; '
 'tách được hết bằng âm On thì ghép Hán Việt theo bảng lớp 1; nếu có chữ thuộc danh sách "đổi âm theo nghĩa" mà từ không nằm trong ngoại lệ thì confidence review, ngược lại high; '
 '(c) không tách được bằng âm On (đọc âm Kun như 山 やま, 食べる) thì ghép âm chính của chữ, confidence kun (hiển thị là "âm của chữ", không phải từ Hán Việt). '
 'Không đoán: chữ không có trong bảng thì để trống và confidence review. '
 'LƯU CHO MỌI MỤC TỪ ĐIỂN: migration thêm vào lexical_entries các cột han_viet, han_viet_confidence, han_viet_source (rule | override | manual), han_viet_updated_at; '
 'script apps/api/scripts/lexicon/backfill-hanviet.mjs tính cho toàn bộ mục (dùng reading chính), KHÔNG ghi đè dòng có source manual, chạy lại không đổi kết quả, in thống kê số mục high/review/kun; '
 'script nạp từ điển (import-lexicon.mjs) tính Hán Việt cho mục mới. '
 'API: GET /dictionary/lookup trả thêm hanVietConfidence và hanVietPerKanji (giữ trường hanViet); GET /dictionary/hanviet nhận thêm tham số reading tùy chọn; '
 'getHanVietForWord(term) dùng giá trị đã lưu của mục từ điển khớp từ nếu có (sổ tay, flashcard, quiz, danh sách ôn tập tự nhận âm mới), không có thì tính theo lớp 1-3. '
 'API CHO DUYỆT (H02, H03 dùng): GET /admin/lexicon/hanviet?confidence=review|kun|high&q=&page= (editor, reviewer, admin) trả mục từ kèm reading, nghĩa đầu, hanViet, confidence, source, perKanji, số báo sai; '
 'PATCH /admin/lexicon/:id/hanviet { hanViet } đặt source manual, confidence high, ghi audit log; '
 'POST /dictionary/hanviet-reports { entry, reading?, suggestion?, note? } (học viên đã đăng nhập, giới hạn tần suất) chuyển mục sang confidence review và lưu báo cáo cho H03.',
 'tools/import-data/|packages/content-tools/|apps/api/src/modules/vocab/|apps/api/src/modules/learning/|apps/api/scripts/lexicon/|docs/decisions/',
 'hanviet-onyomi.tsv phủ mọi âm On của 2.136 chữ Jōyō; script kiểm tra báo 0 chữ thiếu|'
 'Bộ từ chuẩn packages/content-tools/tests/hanviet-golden.test.ts (từ + reading + âm đúng) gồm ít nhất 200 từ JLPT N5-N1 đạt 100%, trong đó có: '
 '予約 DỰ ƯỚC, 要約 YẾU ƯỚC, 約束 ƯỚC THÚC, 重要 TRỌNG YẾU, 重複 TRÙNG PHỨC, 貴重 QUÝ TRỌNG, 必要 TẤT YẾU, 番号 PHIÊN HIỆU, 音楽 ÂM NHẠC, 楽園 LẠC VIÊN, 貿易 MẬU DỊCH, 容易 DUNG DỊ, '
 '社長 XÃ TRƯỞNG, 部長 BỘ TRƯỞNG, 長期 TRƯỜNG KỲ, 銀行 NGÂN HÀNG, 旅行 LỮ HÀNH, 学生 HỌC SINH, 経済 KINH TẾ, 勉強 MIỄN CƯỜNG|'
 'Test thuật toán: 楽しい và 山 cho confidence kun; từ có chữ đổi âm theo nghĩa không có trong ngoại lệ cho review; biến âm (学校 がっこう, 一本 いっぽん) tách đúng|'
 'Backfill trên DB có JMdict: mọi mục có han_viet hoặc confidence review, dòng manual giữ nguyên; thống kê high/review/kun ghi trong docs/decisions/H01-hanviet-word-level.md|'
 'GET /dictionary/lookup?text=要約 trả hanViet YẾU ƯỚC, hanVietConfidence high, perKanji 要 ヨウ YẾU, 約 ヤク ƯỚC|PATCH admin đổi âm thì lookup trả âm mới; nạp lại từ điển không ghi đè|'
 'POST báo sai cần đăng nhập, chuyển mục sang review, có giới hạn tần suất',
 'pnpm test:import-validation|pnpm --filter @jlpt/content-tools test|pnpm test:vocab-data|pnpm test:learning:all',contracts='API DB',grants='apps/api/src/db/ apps/api/scripts/lexicon/')
task('H02','W3',11,4,'Trang /tu-vung: tra từ trong từ điển JMdict, hiện cách đọc, nghĩa và âm Hán Việt','H01',
 'HIỆN TRẠNG: /tu-vung (apps/web/features/corpus/components/vocab-explorer.tsx) chỉ lọc tại chỗ bộ ngữ liệu jlpt-official, bộ này đang có 0 từ nên trang TRỐNG. '
 'Từ điển JMdict + KANJIDIC2 (22.647 mục thông dụng) đã nạp vào DB; API GET /api/v1/dictionary/lookup?text=<từ> trả MỘT mục: entry, readings[], meanings[] (tiếng Anh), partOfSpeech, hanViet, license, attribution; '
 'tra được theo mặt chữ (予約) hoặc theo cách đọc kana (よやく); không có thì 404. corpus-client.lookupDictionary(query) đã gửi đúng tham số text. '
 'VIỆC CẦN LÀM: '
 '(1) Thêm khu "Tra từ điển" ở đầu /tu-vung: ô nhập (Input của @jlpt/ui) + nút Tra; tra khi bấm Enter/nút (không tra mỗi phím gõ). '
 '(2) Thẻ kết quả (Card của @jlpt/ui) hiện: từ (cỡ lớn, font Nhật), các cách đọc, nhãn âm Hán Việt (data-testid="dictionary-hanviet"), từ loại, danh sách nghĩa có tiêu đề "Nghĩa tiếng Anh (JMdict)", '
 'dòng ghi nguồn "Từ điển JMdict/KANJIDIC2 – EDRDG, CC BY-SA 4.0" có link tới /gioi-thieu#nguon-du-lieu, nút "Lưu vào sổ tay" gọi POST /api/v1/me/notebook-items (learning-client.createNotebookItem) với term, reading, meaning (nghĩa đầu tiên), hanViet; chưa đăng nhập thì nút dẫn tới /dang-nhap. '
 '(2b) Âm Hán Việt theo H01: confidence high hiện bình thường; review hiện kèm nhãn "Đang chờ xác nhận"; kun hiện là "Âm của chữ:" (không phải từ Hán Việt); có thể mở xem phân tách theo chữ (chữ - âm On - Hán Việt). '
 '(2c) Nút "Báo sai âm Hán Việt" (học viên đã đăng nhập) mở hộp thoại nhập âm đề xuất và ghi chú, gọi POST /api/v1/dictionary/hanviet-reports, báo đã gửi; chưa đăng nhập thì dẫn tới /dang-nhap. '
 '(3) Trạng thái: chưa tra → gợi ý kèm ví dụ bấm được (学生, 勉強, よやく); đang tra → Skeleton; 404 → "Không tìm thấy từ … trong từ điển"; lỗi mạng/5xx → Alert kèm nút Thử lại. '
 '(4) Danh sách ngữ liệu bên dưới giữ nguyên; khi bộ ngữ liệu trống thì KHÔNG hiện thông báo trống chiếm chỗ, chỉ còn khu tra từ. '
 '(5) Chỉ dùng component @jlpt/ui (giao diện HeroUI), class Tailwind, không style={{}}; không hiện nút đọc TTS (đang ẩn bằng FEATURES.tts); chuỗi giao diện đưa vào messages vi/ja/en. '
 'CI staging KHÔNG nạp JMdict, API dùng từ điển sandbox: E2E phải dùng từ có trong sandbox (学生 → がくせい, HỌC SINH; 学校; 先生).',
 'apps/web/|packages/ui/',
 'Gõ 学生 rồi Enter: thẻ hiện 学生, がくせい, nhãn HỌC SINH, có nghĩa và dòng ghi nguồn EDRDG|Gõ chuỗi không có trong từ điển: hiện "Không tìm thấy", không lỗi 500|Báo sai âm Hán Việt gửi được khi đã đăng nhập, chưa đăng nhập thì dẫn tới /dang-nhap|'
 'Đã đăng nhập bấm "Lưu vào sổ tay" thì /so-tay có từ đó; chưa đăng nhập thì dẫn tới /dang-nhap|Khi bộ ngữ liệu trống, trang không còn trống: khu tra từ hiện đầu trang|'
 +NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:web|pnpm check:no-mock-ui|pnpm check:ui-primitives',contracts='API',grants='tests/playwright/')

task('H03','W4',11,4,'Quản trị: màn hình "Duyệt Hán Việt" cho từ vựng','H01',
 'Màn hình mới trong admin, mục menu "Duyệt Hán Việt" thuộc nhóm Nội dung, vai trò editor, reviewer, admin. Dùng API của H01: '
 'GET /api/v1/admin/lexicon/hanviet (lọc confidence review | kun | high, tìm theo từ hoặc cách đọc, phân trang) và PATCH /api/v1/admin/lexicon/:id/hanviet. '
 'Bảng (Table của @jlpt/ui): từ, cách đọc, nghĩa đầu, âm Hán Việt hiện tại, phân tách theo chữ (chữ - âm On - Hán Việt), độ tin cậy (nhãn màu), nguồn (máy tính / ngoại lệ / người sửa), số báo sai từ học viên. '
 'Mặc định mở bộ lọc "Cần xem lại" (review), sắp theo số báo sai giảm dần. '
 'Sửa: bấm ô Hán Việt để sửa tại chỗ (Input), Lưu gọi PATCH, cập nhật dòng, nhãn nguồn đổi thành "người sửa"; nút "Xác nhận đúng" lưu nguyên âm hiện tại để chuyển sang high. '
 'Lỗi API hiện Alert, không mất dữ liệu đang gõ. Dùng component @jlpt/ui, không style={{}}, chuỗi vi/ja/en.',
 'apps/admin/',
 'Editor lọc "Cần xem lại", sửa 1 từ, lưu; tra từ đó ở /api/v1/dictionary/lookup trả âm mới và nguồn người sửa|"Xác nhận đúng" chuyển mục sang high|Vai trò không có quyền sửa thì nút bị ẩn hoặc lỗi 403 hiển thị rõ|'
 +NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:admin|pnpm check:no-mock-ui|pnpm check:ui-primitives',contracts='API',grants='tests/playwright/')
# Owner 2026-10-21: vocabulary list from real exams (H04) and select-to-look-up while taking exams with a word detail page (H05, H06).
task('H04','W5',11,6,'Bộ ngữ liệu đề thi lưu vào database, tự tách từ khi xuất bản đề; /tu-vung liệt kê từ của các đề thật','H01',
 'HIỆN TRẠNG (lỗi thiết kế): corpus.service (apps/api/src/modules/vocab/corpus.service.ts) giữ bộ ngữ liệu "Tập ngữ liệu đề thi JLPT N1–N5" (slug jlpt-official) '
 'trong Map aggregators ở BỘ NHỚ; chỉ có dữ liệu khi gọi API nạp thủ công một gói đề, MẤT HẾT khi API khởi động lại; đề đã xuất bản không tự vào. '
 'Vì vậy GET /api/v1/datasets/jlpt-official/vocabulary trả {"total":0} và /tu-vung, /thong-ke-tu-vung, admin "Từ vựng & Ngữ pháp" đều trống. '
 'VIỆC CẦN LÀM: '
 '(1) Bảng mới (migration) corpus_terms: dataset_id, term (dạng từ điển), reading, level (N1..N5 theo cấp của đề), exam_id, question_id, section/skill, count; '
 'khóa duy nhất (dataset_id, term, exam_id, question_id) để chạy lại không trùng. Tổng hợp theo từ để trả danh sách và tần suất. '
 '(2) Tách từ bằng tokenizer/lemmatizer có sẵn trong apps/api/src/modules/vocab/nlp (đưa về dạng từ điển: 食べた -> 食べる), bỏ trợ từ, dấu câu, kana đơn lẻ. '
 'Nguồn chữ: đề bài (stem), lựa chọn, đoạn văn đọc hiểu, transcript nghe nếu có; KHÔNG lấy đáp án đúng riêng ra (không lộ đáp án). '
 '(3) Khi một đề được xuất bản (ExamService.publishExam / approveAndPublishExam) thì tách từ của phiên bản vừa xuất bản vào corpus (qua outbox event content.published hoặc gọi trực tiếp trong transaction); '
 'gỡ xuất bản thì bỏ các dòng của đề đó khỏi corpus. Script bù apps/api/scripts/lexicon/backfill-corpus.mjs chạy cho mọi đề đang xuất bản, chạy lại không đổi kết quả. '
 '(4) Mỗi từ trong danh sách lấy thêm từ JMdict (lexical_entries): cách đọc, nghĩa đầu (tiếng Anh), từ loại, hanViet và hanVietConfidence của H01; từ không có trong JMdict vẫn hiện với cách đọc từ tokenizer. '
 '(5) API giữ nguyên đường dẫn và dạng trả hiện có (GET /datasets, /datasets/:id/vocabulary?level=&q=&page=, thống kê tần suất cho /thong-ke-tu-vung) để web và admin tự có dữ liệu; totalWords của dataset là số từ khác nhau. '
 'Bỏ Map trong bộ nhớ làm nguồn chính.',
 'apps/api/src/modules/vocab/|apps/api/src/modules/learning/|apps/api/scripts/lexicon/|docs/decisions/',
 'Sau khi chạy backfill trên preview (N3 12/2019 và đề demo N5 đã xuất bản), GET /datasets/jlpt-official/vocabulary trả danh sách khác rỗng, lọc level=N3 chỉ còn từ của đề N3|'
 'Khởi động lại API dữ liệu vẫn còn|Xuất bản một đề mới thì từ của đề đó có trong danh sách; gỡ xuất bản thì biến mất|Chạy backfill hai lần không tạo dòng trùng|'
 'Từ dạng chia (食べた) được gom về dạng từ điển (食べる); không có dòng nào là trợ từ hay dấu câu|Test không lộ đáp án: danh sách không có trường đáp án hay đánh dấu đáp án đúng|'
 '/tu-vung, /thong-ke-tu-vung và admin Từ vựng hiện dữ liệu thật (E2E staging dùng đề demo N5 được seed và xuất bản)',
 'pnpm test:vocab-data|pnpm test:learning:all',contracts='API DB',grants='apps/api/src/db/ apps/api/src/modules/exam/ apps/api/scripts/lexicon/ tests/playwright/')
task('H05','W5',11,4,'API từ điển cho tra nhanh khi bôi đen và trang chi tiết từ vựng','H01',
 'Phục vụ H06 (bôi đen chữ trong bài thi để tra). '
 '(1) GET /api/v1/dictionary/lookup?text=: nếu không khớp mặt chữ/cách đọc thì thử dạng từ điển qua lemmatizer có sẵn (食べた, 食べます -> 食べる; 高かった -> 高い; 勉強して -> 勉強する/勉強), '
 'rồi thử bỏ dần ký tự cuối là kana (okurigana thừa khi bôi đen dư); trả thêm matchedText (chuỗi đã khớp) và lemma. Bôi đen dài hơn 20 ký tự hoặc không có chữ Nhật trả 400. '
 '(2) Trả thêm posLabels: nhãn từ loại tiếng Việt suy từ mã JMdict trong partOfSpeech: n -> Danh từ; v1, v5* -> Động từ; vs -> Danh động từ (đi với する); vt/vi -> Ngoại động từ/Nội động từ (bổ sung); '
 'adj-i -> Tính từ đuôi い; adj-na -> Tính từ đuôi な; adv -> Phó từ; prt -> Trợ từ; conj -> Liên từ; int -> Thán từ; pn -> Đại từ; ctr -> Trợ số từ; exp -> Cụm từ; mã khác giữ nguyên trong ngoặc. '
 'Bảng ánh xạ đặt trong một file dùng chung, có test cho từng mã. '
 '(3) GET /api/v1/dictionary/entries/:term (term mã hóa URL): chi tiết một mục: mọi cách đọc, mọi nghĩa theo từng nghĩa (sense) kèm từ loại của nghĩa đó, posLabels, hanViet, hanVietConfidence, '
 'hanVietPerKanji, thông tin từng chữ Hán trong từ từ KANJIDIC2 (âm On, âm Kun, số nét, nghĩa tiếng Anh, cấp JLPT cũ nếu có), số lần xuất hiện trong đề thi theo cấp (dùng bảng corpus của H04 nếu đã có, chưa có thì trả mảng rỗng), license và attribution; không có thì 404. '
 'Nếu cần lưu nghĩa theo sense mà bảng entry_meanings chưa đủ, thêm cột sense_index/pos vào entry_meanings bằng migration và cập nhật import-lexicon.mjs. '
 '(4) Cache trong bộ nhớ có giới hạn cho lookup (tra lặp lại khi bôi đen) và giới hạn tần suất hợp lý. Công khai, không cần đăng nhập.',
 'apps/api/src/modules/vocab/|apps/api/scripts/lexicon/|docs/decisions/',
 'lookup 食べた trả entry 食べる, lemma 食べる, posLabels có Động từ|lookup 高かった trả 高い, posLabels có Tính từ đuôi い; lookup 静か trả posLabels có Tính từ đuôi な; lookup 予約 trả Danh từ và Danh động từ|'
 'Bôi đen dư okurigana (予約す) vẫn khớp 予約 và matchedText là 予約|GET /dictionary/entries/要約 trả các nghĩa theo sense, thông tin chữ 要 và 約 từ KANJIDIC2, hanViet của H01; từ không có trả 404|'
 'Chuỗi dài hơn 20 ký tự hoặc không có chữ Nhật trả 400, không bao giờ 500|Test ánh xạ từ loại phủ mọi mã nêu trên',
 'pnpm test:vocab-data',contracts='API DB',grants='apps/api/src/db/ apps/api/scripts/lexicon/')
task('H06','W3',11,8,'Web: bôi đen từ khi làm bài để xem nghĩa, cách đọc, Hán Việt, từ loại; nút Xem chi tiết; trang chi tiết từ vựng','H05 H02',
 'CHỦ DỰ ÁN QUYẾT ĐỊNH: tính năng chạy ở MỌI chế độ, KỂ CẢ THI THẬT; có công tắc để học viên bật/tắt ngay trong lúc làm bài. '
 '(1) PHẠM VI BÔI ĐEN: nội dung câu hỏi, các lựa chọn, đoạn văn đọc hiểu và lời giải ở: phòng thi /phong-thi (thi thật và luyện tập), luyện tập /luyen-tap, xem lại kết quả /ket-qua/[id]. '
 'Không áp dụng cho thanh công cụ, đồng hồ, phiếu trả lời. '
 '(2) CÁCH HOẠT ĐỘNG: khi người dùng bôi đen (chuột: mouseup; cảm ứng: chọn văn bản bằng nhấn giữ, sự kiện selectionchange có debounce 300ms) một chuỗi 1-20 ký tự có chữ Nhật trong vùng trên, '
 'lấy văn bản đã chọn BỎ chữ furigana (thẻ rt), gọi GET /api/v1/dictionary/lookup?text= (API của H05, có cache phía client theo chuỗi), '
 'hiện một khung nổi (Popover của @jlpt/ui, giao diện HeroUI) sát ngay vùng chọn, không che vùng chọn, tự lật lên/xuống cho vừa màn hình, dùng được ở 390px. '
 'NỘI DUNG KHUNG: từ (dạng từ điển, font Nhật cỡ lớn) và dạng đã bôi nếu khác (ví dụ "食べた -> 食べる"); cách đọc (hiragana); âm Hán Việt (theo độ tin cậy của H01: review thêm nhãn "Đang chờ xác nhận", kun hiện "Âm của chữ:"); '
 'nhãn từ loại tiếng Việt (posLabels, ví dụ "Động từ", "Tính từ đuôi な"); tối đa 3 nghĩa đầu với tiêu đề "Nghĩa tiếng Anh (JMdict)"; nút "Xem chi tiết"; dòng ghi nguồn EDRDG nhỏ. '
 'Đang tra: Skeleton; không tìm thấy: "Không tìm thấy trong từ điển"; lỗi: thông báo ngắn kèm Thử lại. '
 'ĐÓNG KHUNG: Esc, bấm ra ngoài, bỏ chọn văn bản, chuyển câu. '
 'KHÔNG ĐƯỢC ẢNH HƯỞNG BÀI THI: bôi đen/khung nổi không chọn hay đổi đáp án, không kích hoạt phím tắt phòng thi (1-4, F, mũi tên) khi đang gõ trong khung, không làm mất phiên, không ghi vào đáp án. '
 '(3) NÚT "XEM CHI TIẾT": trong phòng thi và luyện tập MỞ TAB MỚI tới /tu-vung/[term] (target _blank, rel noopener) để không rời bài đang làm; ở trang kết quả mở trong cùng tab. '
 '(4) CÔNG TẮC: thêm vào thanh công cụ phòng thi (exam-toolbar) và luyện tập một công tắc "Tra từ khi bôi đen" (Switch của @jlpt/ui) có nhãn rõ; mặc định BẬT; ghi nhớ trong localStorage (khóa jlpt_select_lookup) và áp dụng mọi trang trên; '
 'đọc giá trị lưu sau khi hydrate (không đọc localStorage trong useState để tránh lỗi hydration React #418). Trên 390px công tắc nằm trong hàng nút có xuống dòng, không tràn. '
 '(5) TRANG CHI TIẾT /tu-vung/[term] (Next.js App Router, decodeURIComponent): gọi GET /api/v1/dictionary/entries/:term của H05; hiện từ, mọi cách đọc, nhãn từ loại, các nghĩa đánh số theo từng nghĩa kèm từ loại của nghĩa, '
 'âm Hán Việt và bảng phân tách theo chữ (chữ - âm On - Hán Việt); với mỗi chữ Hán: âm On, âm Kun, số nét, nghĩa; số lần xuất hiện trong đề thi theo cấp (nếu có dữ liệu H04); '
 'nút "Lưu vào sổ tay" và nút "Báo sai âm Hán Việt" (dùng lại thành phần đã có ở H02); dòng ghi nguồn EDRDG có link /gioi-thieu#nguon-du-lieu; '
 'metadata SEO (title "<từ> - nghĩa, cách đọc, Hán Việt | JLPT Online", canonical); từ không có trả trang 404 của Next (notFound()). '
 '(6) Chỉ dùng component @jlpt/ui (HeroUI) và class Tailwind, không style={{}}, chuỗi giao diện đưa vào messages vi/ja/en, không hiện nút TTS (đang ẩn bằng FEATURES.tts). '
 'CI staging dùng từ điển sandbox: E2E dùng từ có trong sandbox (学生, 学校, 先生, 食べる).',
 'apps/web/|packages/ui/',
 'Trong phòng thi THI THẬT, bôi đen 学生 trong câu hỏi: khung nổi hiện 学生, がくせい, HỌC SINH, nhãn Danh từ, nghĩa và nút Xem chi tiết; đáp án đang chọn không đổi|'
 'Tắt công tắc "Tra từ khi bôi đen" thì bôi đen không hiện khung; tải lại trang vẫn giữ trạng thái tắt; bật lại thì hoạt động|'
 'Bấm Xem chi tiết trong phòng thi mở tab mới /tu-vung/学生, tab bài thi vẫn ở nguyên câu đang làm và đồng hồ vẫn chạy|'
 'Trang /tu-vung/学生 hiện đủ cách đọc, nghĩa, từ loại, Hán Việt và bảng theo chữ; /tu-vung/<chuỗi lạ> trả 404|'
 'Bôi đen trong luyện tập và trang xem lại kết quả cũng hoạt động; Esc và bấm ra ngoài đóng khung|'
 'Ở 390px khung nổi nằm trong màn hình, không tràn ngang; không có lỗi hydration trong console|'
 +NO_MOCK+'|'+REAL_E2E+'|'+STATES+'|'+LAYOUT,
 'pnpm test:web|pnpm check:no-mock-ui|pnpm check:ui-primitives',contracts='API',grants='tests/playwright/')
# Owner 2026-10-21: an admin page that lists every vocabulary entry in the database, as fast as possible (no dependencies).
task('H07','W4',11,3,'Quản trị: trang "Từ điển" liệt kê toàn bộ từ vựng trong database','',
 'LÀM ĐÚNG THEO HƯỚNG DẪN TỪNG BƯỚC docs/multi-worker/guides/H07-admin-lexicon.md (có sẵn toàn bộ code mẫu, đường dẫn file, chuỗi vi/ja/en và lệnh kiểm tra; Claude đã chạy thử: typecheck, lint, test đều qua). KHÔNG cần đọc thêm code ngoài các file được nhắc trong hướng dẫn; chỉ sửa tối thiểu nếu có điểm không khớp và ghi lại trong mô tả PR. '
 'CHỦ DỰ ÁN CẦN NHANH: task nhỏ, không phụ thuộc task khác, làm gọn trong phạm vi dưới đây. '
 'DỮ LIỆU: từ điển JMdict + KANJIDIC2 đã nạp vào các bảng lexical_entries (id, term, level, part_of_speech, license_id), entry_readings (entry_id, reading, is_primary), '
 'entry_meanings (entry_id, locale "en", meaning), lexicon_licenses (provider, license); trên preview có 22.647 mục, CI staging có thể rỗng. '
 '(1) API mới trong apps/api/src/modules/vocab (controller + service hiện có): GET /api/v1/admin/lexicon/entries?q=&pos=&page=&pageSize= '
 '(vai trò editor, reviewer, admin; pageSize mặc định 50, tối đa 200). q tìm theo mặt chữ (bắt đầu bằng hoặc chứa), cách đọc kana, hoặc nghĩa tiếng Anh (chứa, không phân biệt hoa thường). '
 'pos lọc theo mã từ loại JMdict (n, v1, v5, vs, adj-i, adj-na, adv...). Trả { total, page, pageSize, items: [{ id, term, readings[], meanings[] (tối đa 3), partOfSpeech, hanViet, provider }] }; '
 'hanViet lấy bằng getHanVietForWord(term) như tra từ hiện tại (khi H01 xong sẽ tự đúng hơn). Truy vấn phân trang ở database (limit/offset, đếm tổng), không nạp hết vào bộ nhớ; có index phù hợp nếu thiếu. '
 'Thêm hàm vào apps/admin/lib/api-client.ts. '
 '(2) Trang admin mới /lexicon, mục menu "Từ điển" trong nhóm "Nội dung & biên tập" (apps/admin/lib/navigation.ts), vai trò editor, reviewer, admin: '
 'tiêu đề, tổng số mục; ô tìm kiếm (Input) tra khi Enter/nút; bộ lọc từ loại (Select: Tất cả, Danh từ n, Động từ v1/v5, Danh động từ vs, Tính từ đuôi い adj-i, Tính từ đuôi な adj-na, Phó từ adv); '
 'bảng (Table của @jlpt/ui) cột: Từ (font Nhật), Cách đọc, Hán Việt, Từ loại, Nghĩa (tiếng Anh, tối đa 3); phân trang Trước/Sau và số trang; '
 'trạng thái: đang tải (Skeleton), không có kết quả, lỗi API (Alert + Thử lại); chân trang ghi nguồn "JMdict/KANJIDIC2 – EDRDG, CC BY-SA 4.0". '
 'Chỉ dùng component @jlpt/ui (giao diện HeroUI), không style={{}}, chuỗi vi/ja/en trong apps/admin/messages. Chỉ xem, không sửa (sửa Hán Việt là việc của H03).',
 'apps/admin/|apps/api/src/modules/vocab/',
 'Đăng nhập admin, menu Từ điển mở /lexicon, bảng hiện mục từ với tổng số đúng bằng số dòng lexical_entries; trên preview tổng là 22.647|'
 'Tìm 予約 thấy 予約; tìm よやく thấy 予約; tìm "reservation" thấy 予約; lọc adj-na chỉ còn tính từ đuôi な|Chuyển trang hoạt động, mỗi trang tối đa pageSize mục, phản hồi API dưới 1 giây trên 22.647 mục|'
 'Vai trò không phải editor/reviewer/admin bị chặn (403 hoặc ẩn menu)|Database chưa nạp từ điển thì trang hiện trạng thái trống rõ ràng, không lỗi|'
 +NO_MOCK+'|'+STATES+'|'+LAYOUT,
 'pnpm test:admin|pnpm test:vocab-data|pnpm check:no-mock-ui|pnpm check:ui-primitives',contracts='API',grants='apps/api/src/modules/vocab/ tests/playwright/')
# Staging E2E on jlpt-vm (same suite as CI) is a required check for tasks that touch the UI or APIs it uses.
for _t in TASKS:
    if _t['id'] in {'I05','I09','I03','I04','I10','I11','I12','I13','I14','I15','I16','I17','I19','I20','D02','D03','D04','D06','D07','D08','D09','D10','P03','P04','P05','H01','H02','H03','H04','H05','H06','H07'}:
        _t['checks'].append('sudo -n /usr/local/bin/jlpt-stage-test check')
    # Per-task runs cover Chromium + Mobile Safari; final acceptance runs every browser.
    # The integration E2E suite needs the staging stack and browser deps, so it only runs through
    # jlpt-stage-test (containers), never as a bare `pnpm test:e2e:integration` on the VM (I07 run 1, 2026-10-20).
    if _t['id'] in {'I07','D05','P06'}:
        _t['checks'].append('sudo -n /usr/local/bin/jlpt-stage-test check-all')

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
for day in range(1, max(t["day"] for t in TASKS)+1):
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

Thời gian: phiên review bị ngắt sau 30 phút và khi đó không có kết quả. Task chỉ tới bước review sau khi coordinator đã chạy và đạt mọi lệnh trong "Lệnh cần cung cấp và chạy" cùng install, lint, typecheck, test, build trên đúng headSHA này. Vì vậy KHÔNG chạy lại các lệnh đó, không chạy jlpt-stage-test, pnpm build, pnpm test toàn bộ, Lighthouse hay Playwright. Đánh giá bằng cách đọc diff, code và test. Nếu cần xác minh một điểm cụ thể, chỉ chạy một file test đơn lẻ (vitest run <file>) mất dưới 3 phút. Trả JSON trong vòng 20 phút; điểm nào chỉ chứng minh được bằng chạy lệnh nặng thì ghi vào evidenceReviewed là "đã được coordinator chạy", không trả UNCLEAR vì lý do đó.

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
