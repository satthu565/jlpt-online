#!/bin/bash
# Thay image của container API đang chạy (jlpt-staging-api) bằng một image đã dựng; tự khôi phục nếu lỗi.
#   sudo tools/ops/vm/deploy-api-image.sh <tag-mới> <tag-cũ-để-khôi-phục>
# Không đụng database, không chạy migration. Nếu nhánh có migration thì xử lý riêng theo DEV_WORKFLOW.md.
set -uo pipefail
NEW=jlpt/jlpt-api:${1:?'Cách dùng: deploy-api-image.sh <tag-mới> <tag-cũ>'}
OLD=jlpt/jlpt-api:${2:?'thiếu tag cũ để khôi phục'}
cd /srv/jlpt-demo
set -a; . /srv/jlpt-demo/.env; set +a
docker image inspect "$NEW" >/dev/null && docker image inspect "$OLD" >/dev/null || { echo "Thiếu image $NEW hoặc $OLD" >&2; exit 2; }
OV=/srv/jlpt-demo/compose.api-override.yml
use() { printf 'services:\n  api:\n    image: %s\n' "$1" > "$OV"; docker compose -p jlpt-demo -f compose.yml -f compose.override.yml -f "$OV" up -d --no-deps api 2>&1 | tail -2; }
use "$NEW"
ok=0
for _ in $(seq 1 45); do curl -fsS -o /dev/null http://127.0.0.1:4000/api/v1/health 2>/dev/null && { ok=1; break; }; sleep 2; done
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/v1/exams)
echo "health=$ok exams_http=$code"
if [ "$ok" != 1 ] || [ "$code" != 200 ]; then echo "THẤT BẠI, khôi phục $OLD"; use "$OLD"; exit 1; fi
echo "DEPLOY OK: $NEW (khôi phục bằng: sudo $0 ${OLD#jlpt/jlpt-api:} ${NEW#jlpt/jlpt-api:})"
