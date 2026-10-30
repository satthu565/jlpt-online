#!/usr/bin/env bash
# Xem thử một nhánh git trên http://192.168.114.206:3210 (jlpt-vm :3210) mà không đụng :3000/:3001.
#
#   tools/ops/preview-branch.sh <nhánh|commit>
#
# Việc script làm: lấy nhánh từ GitHub, build web trong thư mục riêng, chạy ở cổng 3210.
# Web xem thử dùng chung API (:4000) và database với :3000, nên:
#   - nhánh có migration database bị từ chối (đặt PREVIEW_ALLOW_MIGRATION=1 chỉ khi đã có sao lưu và chủ dự án đồng ý);
#   - nhánh sửa API, admin, infra: chỉ cảnh báo, vì phần web gọi endpoint mới sẽ không chạy trên API cũ.
# Quay lại: dừng bản xem thử bằng `sudo -n systemctl stop jlpt-preview-branch`.
set -euo pipefail

REF=${1:?'Cách dùng: preview-branch.sh <nhánh|commit>'}
STORE=${PREVIEW_STORE:-/home/jlpt/paper-exam-20261024}   # clone chứa kho git
DIR=${PREVIEW_DIR:-/home/jlpt/preview-3210}              # thư mục build của bản xem thử
PORT=3210
URL="http://192.168.114.206:${PORT}"

exec 9>/tmp/jlpt-preview-branch.lock
flock -n 9 || { echo "Đang có một lượt build xem thử khác. Chờ rồi chạy lại." >&2; exit 3; }

git -C "$STORE" fetch -q origin "+refs/heads/*:refs/remotes/origin/*" || { echo "Không lấy được code từ GitHub (git fetch lỗi)." >&2; exit 1; }
if git -C "$STORE" rev-parse -q --verify "origin/$REF" >/dev/null; then SHA=$(git -C "$STORE" rev-parse "origin/$REF")
elif git -C "$STORE" rev-parse -q --verify "$REF^{commit}" >/dev/null; then SHA=$(git -C "$STORE" rev-parse "$REF^{commit}")
else echo "Không tìm thấy nhánh hoặc commit '$REF' (nhánh phải đã được push lên GitHub)." >&2; exit 1; fi

CHANGED=$(git -C "$STORE" diff --name-only origin/main..."$SHA" || true)
if echo "$CHANGED" | grep -q '^apps/api/src/db/migrations/' && [ "${PREVIEW_ALLOW_MIGRATION:-0}" != 1 ]; then
  echo "TỪ CHỐI: nhánh có migration database, mà bản xem thử dùng chung database với :3000." >&2
  echo "Chỉ dùng PREVIEW_ALLOW_MIGRATION=1 khi đã có sao lưu và chủ dự án đồng ý." >&2
  exit 2
fi
if echo "$CHANGED" | grep -qE '^(apps/api|apps/admin|infra|contracts)/'; then
  echo "CẢNH BÁO: nhánh sửa cả API/admin/infra. Bản xem thử chỉ chạy phần WEB, vẫn gọi API của main." >&2
fi

if [ ! -e "$DIR/.git" ]; then git -C "$STORE" worktree add -q --detach "$DIR" "$SHA"; fi
cd "$DIR"
git checkout -q --detach "$SHA"
git clean -qfdx -e node_modules -e '.next' >/dev/null 2>&1 || true

export CI=1 NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_API_URL=/api/v1 API_INTERNAL_URL=http://127.0.0.1:4000 NODE_ENV=production
echo "== Cài dependency"; pnpm install --frozen-lockfile --prefer-offline >/tmp/jlpt-preview-branch.log 2>&1 || { tail -20 /tmp/jlpt-preview-branch.log; exit 1; }
echo "== Build web (vài phút)"; pnpm turbo run build --filter=@jlpt/web... >>/tmp/jlpt-preview-branch.log 2>&1 || { tail -30 /tmp/jlpt-preview-branch.log; echo "Build lỗi, bản xem thử cũ (nếu có) giữ nguyên." >&2; exit 1; }

echo "== Chạy trên cổng $PORT (qua nginx)"
sudo -n systemctl restart jlpt-preview-branch
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://127.0.0.1:1${PORT}/" || true)
  [ "$code" = 200 ] && break; sleep 2
done
[ "$code" = 200 ] || { echo "Web không lên (HTTP $code). Xem: journalctl -u jlpt-preview-branch -n 50" >&2; exit 1; }
echo "$SHA $REF $(date -u +%FT%TZ)" > "$DIR/.preview-info"
echo
echo "XEM THỬ: $URL"
echo "Nhánh: $REF @ ${SHA:0:9}  ($(git log -1 --format=%s | cut -c1-70))"
echo "Lưu ý: dùng chung API và database với :3000. Thao tác ghi dữ liệu (nộp bài, lưu nghĩa) là thật."
