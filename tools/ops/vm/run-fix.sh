#!/bin/bash
# Giao một việc sửa lỗi cho worker agy (Gemini) trong máy ảo.
#   run-fix.sh start  <slug> "<mô tả>" [W1..W6]   # clone main -> nhánh fix/<slug>, chạy agy ở nền
#   run-fix.sh status [slug]                        # trạng thái các việc
#   run-fix.sh finish <slug>                        # push nhánh + mở PR (sau khi agy xong)
#   run-fix.sh log    <slug>                        # đuôi log
set -euo pipefail
LOGS=/home/jlpt/adhoc-logs; STORE=/home/jlpt/paper-exam-20261024; MIRROR=/srv/jlpt-shared/mirror.git
mkdir -p "$LOGS"
cmd=${1:?'start|status|finish|log'}; slug=${2:-}

pick_worker() {
  local n f
  for n in 5 4 3 1 2; do
    if sudo -n pgrep -u jlpt-w$n -f "agy -p" >/dev/null 2>&1; then continue; fi
    local busy=0
    for f in "$LOGS"/*.worker; do
      [ -e "$f" ] || continue
      if [ "$(cat "$f")" = "W$n" ] && [ ! -e "${f%.worker}.exit" ]; then busy=1; fi
    done
    [ $busy = 0 ] && { echo "W$n"; return 0; }
  done
  return 1
}

case $cmd in
start)
  desc=${3:?'thiếu mô tả'}; W=${4:-$(pick_worker)} || { echo "Không có worker rảnh" >&2; exit 1; }
  n=${W#W}; u=jlpt-w$n; dir=/srv/jlpt-workers/w$n/adhoc/$slug
  [ -e "$LOGS/$slug.worker" ] && { echo "slug '$slug' đã dùng" >&2; exit 1; }
  echo "$W" > "$LOGS/$slug.worker"; echo "$desc" > "$LOGS/$slug.desc"
  BASE=${BASE:-main}; echo "$BASE" > "$LOGS/$slug.base"
  if [ "$BASE" = main ]; then
    sudo -n -u $u bash -c "mkdir -p $(dirname $dir) && git clone -q $MIRROR $dir && cd $dir && git checkout -q -b fix/$slug origin/main"
  else
    git -C $STORE fetch -q origin "+refs/heads/$BASE:refs/remotes/origin/$BASE"
    sudo -n mkdir -p $(dirname $dir) && sudo -n git clone -q $STORE $dir && sudo -n git -C $dir fetch -q $STORE "+refs/remotes/origin/$BASE:refs/remotes/origin/$BASE" 2>/dev/null || true; sudo -n git -C $dir checkout -q -b fix/$slug origin/$BASE
    sudo -n git -C $dir config user.name "$W (agent)"; sudo -n git -C $dir config user.email "jlpt-w$n@jlpt.local"
    sudo -n chown -R $u:$u /srv/jlpt-workers/w$n/adhoc
  fi
  prompt="Bạn đang làm trong repo web luyện thi JLPT tại thư mục hiện tại (nhánh fix/$slug). Đọc AGENTS.md rồi làm đúng việc sau, thay đổi tối thiểu, không sửa ngoài phạm vi: $desc
Sau khi sửa: chạy lint và typecheck cho phần đã đụng (nếu chạy được), rồi git add và git commit trên nhánh hiện tại với message theo kiểu 'fix(...): ...'. KHÔNG push. Cuối cùng in tóm tắt: file đã sửa, đã kiểm tra gì, điều gì chưa chắc."
  nohup bash -c "sudo -n -u $u env HOME=/home/$u PATH=/home/$u/.local/bin:/usr/local/bin:/usr/bin:/bin bash -c 'cd $dir && timeout 3000 agy -p \"\$0\" --output-format json --dangerously-skip-permissions' \"\$1\" > $LOGS/$slug.log 2>&1; echo \$? > $LOGS/$slug.exit" _ "$prompt" >/dev/null 2>&1 &
  echo "Đã giao '$slug' cho $W. Theo dõi: run-fix.sh status $slug"
  ;;
status)
  for f in "$LOGS"/${slug:-*}.worker; do [ -e "$f" ] || continue; s=$(basename "${f%.worker}")
    if [ -e "$LOGS/$s.exit" ]; then st="xong (exit $(cat "$LOGS/$s.exit"))"; else st="đang chạy"; fi
    echo "$s | $(cat $f) | $st | $(cat "$LOGS/$s.desc" | cut -c1-70)"; done ;;
log) tail -c 3000 "$LOGS/$slug.log" ;;
finish)
  W=$(cat "$LOGS/$slug.worker"); n=${W#W}; dir=/srv/jlpt-workers/w$n/adhoc/$slug
  [ "$(cat "$LOGS/$slug.exit" 2>/dev/null)" = 0 ] || { echo "agy chưa xong hoặc lỗi; xem: run-fix.sh log $slug" >&2; exit 1; }
  sudo -n git -c safe.directory=$dir -C $dir bundle create /tmp/$slug.bundle fix/$slug ^origin/$(cat $LOGS/$slug.base 2>/dev/null || echo main)
  git -C $STORE fetch -q /tmp/$slug.bundle fix/$slug:refs/heads/fix/$slug
  git -C $STORE push -q origin fix/$slug
  gh pr create --repo satthu565/jlpt-online --head fix/$slug --base $(cat $LOGS/$slug.base 2>/dev/null || echo main) --title "fix: $(cat "$LOGS/$slug.desc" | cut -c1-70)" --body "$(cat "$LOGS/$slug.desc")

Do worker $W (agy) thực hiện.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
  ;;
esac
