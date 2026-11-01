#!/bin/bash
# Dựng image API từ một ref git (mặc định origin/main) trên jlpt-vm.
#   tools/ops/vm/build-api-image.sh <tag> [ref]      ví dụ: build-api-image.sh main-20261101 origin/main
# Bắt buộc --network=host: không có thì pnpm install trong Docker lỗi EAI_AGAIN (container không phân giải được DNS).
# Cần khoảng 3,5 GB trống tạm thời; script dọn build cache khi xong.
set -euo pipefail
TAG=${1:?'Cách dùng: build-api-image.sh <tag> [ref]'}
REF=${2:-origin/main}
STORE=${STORE:-/home/jlpt/paper-exam-20261024}
DIR=$(mktemp -d /tmp/apib.XXXXXX)
git -C "$STORE" fetch -q origin "+refs/heads/*:refs/remotes/origin/*"
git -C "$STORE" worktree add -q --detach "$DIR" "$REF"
trap 'git -C "$STORE" worktree remove --force "$DIR" >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
echo "Dựng jlpt/jlpt-api:$TAG từ $REF ($(git -C "$DIR" rev-parse --short HEAD))"
avail=$(df --output=avail -BG / | tail -1 | tr -dc 0-9)
[ "$avail" -ge 4 ] || { echo "Chỉ còn ${avail} GB trống, cần >= 4 GB. Dọn đĩa trước." >&2; exit 1; }
(cd "$DIR" && sudo -n docker build --network=host -f infra/docker/api.Dockerfile -t "jlpt/jlpt-api:$TAG" .)
sudo -n docker builder prune -af | tail -1
