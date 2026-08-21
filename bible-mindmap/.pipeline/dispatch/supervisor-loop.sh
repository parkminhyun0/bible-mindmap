#!/bin/bash
# 감독관 상주 루프.
#
# 시계에 맞춰 도는 대신 **일감이 떨어지려 할 때** 감독관을 부른다.
# 디스패처는 유휴 패널을 4초 안에 채우므로, 진짜 병목은 목록이 비는 순간이다.
# 작업자 패널이 10개니 남은 일이 그보다 적어지면 곧 노는 패널이 생긴다.
set -u
cd "$(dirname "$0")/../.." || exit 1
VIEW="/Users/parkminhyeon/.claude/jobs/46e38b12/tmp/stream-view.mjs"
LOW_WATER="${LOW_WATER:-10}"   # 남은 일이 이보다 적으면 감독관 호출
POLL="${POLL:-15}"

pending() {
  awk -F'\t' 'NF{print $4}' .pipeline/dispatch/jobs.tsv 2>/dev/null |
    while IFS= read -r o; do [ -f "$o" ] || echo x; done | wc -l | tr -d ' '
}

while [ ! -f .pipeline/dispatch/STOP ]; do
  n="$(pending)"
  if [ "$n" -lt "$LOW_WATER" ]; then
    echo "--- $(date '+%H:%M:%S') 남은 작업 ${n}건 (기준 ${LOW_WATER}) · 감독관 호출 ---"
    codex exec --sandbox workspace-write --skip-git-repo-check \
      "$(cat .pipeline/dispatch/supervisor.txt)" 2>&1 | node "$VIEW" '감독관'
  else
    echo "$(date '+%H:%M:%S') 남은 작업 ${n}건 · 충분함, 대기"
  fi
  sleep "$POLL"
done
echo "감독관 루프 종료"
