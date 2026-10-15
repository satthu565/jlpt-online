# Vận hành một VPS cho sáu coding worker

## Mô hình triển khai

Một VPS coding Ubuntu với6user `jlpt-w1`…`jlpt-w6`, home và clone riêng; coordinator user `jlpt-coordinator`; executor build riêng có policy. Không dùng VPS này chứa production data/secrets. Staging target độc lập; không dùng tên “worker” trong Compose để chỉ coding agents.

`config/workers.example.json` là đầu vào thiết kế coordinator mới, không phải config cho runner cũ. Không chạy setup-vps.sh cũ sáu lần: script đó vẫn viết cùng `jlpt-runner.service`, có thể ghi đè và cùng state. Installer mới `install-coordinator.sh` nằm trong repo `jlpt-coordinator`, xây ở ngày 0, idempotent, không overwrite credentials/catalog/state của lần chạy trước.

## Chuẩn bị và xác minh tài nguyên

Không suy từ quota tài khoản thành tài nguyên VPS. W6 đo trong F07:6native CLI sessions,2builds,1 browser suite, Postgres+2Redis cùng logs/disk, record CPU/RAM/swap peak, I/O, network và OOM. Chọn limits sau phép đo, không hứa gói4/8GB production đủ làm máy build6 worker. Cấu hình hiện có chưa được cung cấp nên chưa chốt chi phí/gói mới.

Mục tiêu scheduler không swap thrash/OOM; giảm heavyBuilds/browserSuites khi vượt ngưỡng. Tách heavy CI/build sang executor khác nếu cần, operator duyệt chi phí. Luôn dành headroom cho coordinator/DB; limit Node heap/Playwright workers; log rotation; disk alerts khi80%; cleanup theo retention giữ checkpoint chưa bàn giao.

## Thứ tự installer coordinator (ngày 0, kiểm chứng lại ở F07)

1. Xác minh OS, disk, SSH key và quyền operator; update packages không reboot tự ý.
2. Cài version Node/pnpm/Git/CLI đã khóa; không cài dịch vụ/thư viện đọc PDF tự động; công cụ validate local dùng Python chuẩn, app dùng TypeScript. Codec/malware/browser deps theo lockfile. Chạy shellcheck, bash -n trên installer.
3. Tạo coordinator và 6 worker users, home700, credential files600; không sudo/Docker host group cho worker. Coordinator secret dir700, file600.
4. Tạo clone riêng hoặc broker checkout `/srv/jlpt-workers/wN/repo`. Không chia sẻ .git/worktree metadata giữa user khi chưa có ACL cần thiết.
5. Dev services do trusted executor quản lý, worker không chạy arbitrary docker/docker-compose trên host. Broker chỉ cho build/run manifests được policy chấp nhận, không mount Docker socket, host root hoặc coordinator home.
6. Generate env từng worker:DB, Redis-core/cache namespaces, queue prefixes, storage, cổng, test fixture IDs, hostnames theo config. Staging/billing sandbox và provider callback dùng credentials riêng.
7. Operator đăng nhập Google bằng CLI chính thức trong từng user; không copy token vào JSON config/log. Kiểm tra hành vi headless của đúng CLI version với task nhỏ, không tự mặc định quota/availability.
8. Tạo service coordinator duy nhất và worker launch policy; stop cả process group khi shutdown; restart reconcile assignments/checkpoints.
9. `workers check` xác minh auth, disk/ports, denied secret access, repo permissions, build/E2E limits, clock sync và native CLI smoke.
10. Chạy dry-run graph; chạy task F01/F02 có CI thật; chỉ bật auto allocation sau khi coordinator qua 12 tình huống kiểm thử của DAC_TA_RUNNER.md và F07 pass.

## Dữ liệu thử và cổng

DB riêng từng worker, role DB chỉ database đó; ngăn DROP DB khác. Redis namespaces cho cảcore/cache/BullMQ; test cầnFLUSHALL dùng instance riêng, không chỉ đổi DB index. Storage và mail-test recipient/prefix riêng; không lấy cùng browser profile/session/cookie giữa tenants.

Config mẫu cổng W1=3100/3101/4100, W2=3200/3201/4200,…W6=3600/3601/4600. Coordinator phải reserve port và kiểm actual availability trước run. Không cần chạy sáu full web/admin/api cùng lúc; task thuần/schema/review không start servers. Server chỉ bind loopback, operator dùng SSH tunnel/VPN thích hợp.

Không có user Linux isolation nào làm Google không nhận biết IP/accounts. Nhiều account là khả năng kỹ thuật, quyền dùng/quota theo Google phải được operator xác nhận; hệ thống không tự identity-rotate hoặc proxy OAuth.

## Vận hành thường ngày

Dashboard:task state, worker/quota reset/checkpoint, critical path, queue waits, external blockers, review backlog, CPU/RAM/disk, cost per provider. Tác vụ pause ngừng cấp mới; stop nhận signal→checkpoint→kill group→reconcile. Nếu không checkpoint được, giữ workspace read-only để phục hồi, không clean.

Sao lưu state SQLite bằng API backup/snapshot nhất quán, kèm checkpoints, assignment manifest, catalog hashes; không copy WAL file đơn lẻ rồi coi là backup hợp lệ. Test restore coordinator trước auto mode. Credential backup bằng cơ chế operator quản lý, không Git artifact.
