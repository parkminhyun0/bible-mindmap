#!/bin/bash
# 감독관 상주 루프.
#
# 시계에 맞춰 도는 대신 **일감이 떨어지려 할 때** 감독관을 부른다.
# 디스패처는 유휴 패널을 4초 안에 채우므로, 진짜 병목은 목록이 비는 순간이다.
# 작업자 패널이 10개니 남은 일이 그보다 적어지면 곧 노는 패널이 생긴다.
set -u
cd "$(dirname "$0")/../.." || exit 1
VIEW="/Users/parkminhyeon/.claude/jobs/46e38b12/tmp/stream-view.mjs"
LOW_WATER="${LOW_WATER:-12}"   # 작업자 10개 + 여유 2
POLL="${POLL:-10}"

pending() {
  awk -F'\t' 'NF{print $4}' .pipeline/dispatch/jobs.tsv 2>/dev/null |
    while IFS= read -r o; do [ -f "$o" ] || echo x; done | wc -l | tr -d ' '
}

while [ ! -f .pipeline/dispatch/STOP ]; do
  # Deterministic checks run every cycle so a quiet model/panel cannot hide a
  # completed stage or an invalid artifact from the supervisor.
  node .pipeline/dispatch/validate.mjs --fix >>.pipeline/dispatch/dispatch.log 2>&1 || true
  node .pipeline/dispatch/state.mjs >.pipeline/dispatch/state.latest.json 2>>.pipeline/dispatch/dispatch.log || true
  n="$(pending)"
  if [ "$n" -lt "$LOW_WATER" ]; then
    if [ "$n" -eq 0 ]; then
      echo "--- $(date '+%H:%M:%S') 큐 0건 · 종료하지 않고 배포/Notion/다음 배치 게이트 점검을 위해 감독관 호출 ---"
    else
      echo "--- $(date '+%H:%M:%S') 남은 작업 ${n}건 (기준 ${LOW_WATER}) · 감독관 호출 ---"
    fi
    # Codex supervisor calls are synchronous and may be quiet for several minutes.
    # Keep a visible heartbeat so a live supervisor is distinguishable from a hang.
    # 감독관은 판정하는 자리가 아니라 스크립트를 순서대로 실행하는 자리다.
    # 어느 모델이 맡든 교차검증에는 영향이 없다. 그래서 살아 있는 쪽을 쓴다.
    # chatgpt.com 이 끊겨 codex 감독관이 재접속만 반복하는 동안 대조·판정
    # 등록이 통째로 멈춘 적이 있다. 한 공급원이 죽어도 감독은 이어져야 한다.
    if curl -s -o /dev/null --max-time 8 https://chatgpt.com; then
      SUP_CMD=(codex exec --sandbox workspace-write --skip-git-repo-check)
      SUP_LABEL='감독관/Codex'
    else
      SUP_CMD=(agy --dangerously-skip-permissions --model gemini-3.1-pro-high
               --print-timeout 60m --output-format stream-json -p)
      SUP_LABEL='감독관/Gemini'
    fi
    "${SUP_CMD[@]}" "$(cat .pipeline/dispatch/supervisor.txt)" 2>&1 | node "$VIEW" "$SUP_LABEL" &
    supervisor_pid=$!
    while kill -0 "$supervisor_pid" 2>/dev/null; do
      echo "$(date '+%H:%M:%S') 감독관 heartbeat · 남은 작업 ${n}건 · 감독 점검 실행 중"
      sleep "$POLL"
    done
    wait "$supervisor_pid" || true
    echo "$(date '+%H:%M:%S') 감독관 heartbeat · Codex 점검 종료 · 다음 상태 확인 대기"
  else
    echo "$(date '+%H:%M:%S') 남은 작업 ${n}건 · 충분함, 대기"
  fi
  sleep "$POLL"
done
echo "감독관 루프 종료"
