#!/bin/bash
# 패널이 셸로 돌아오면 큐의 다음 일을 즉시 물린다. 유휴 패널을 만들지 않는다.
#
# 큐 형식 (탭 구분): model \t title \t promptfile \t outfile
#   model 이 "claude" 면 네이티브 claude CLI, 아니면 agy --model <model>.
# 큐가 비면 종료한다. 이미 outfile 이 있는 일은 건너뛴다.
set -u
cd "$(dirname "$0")/../.." || exit 1

WS="${CMUX_WS:-workspace:8}"
QUEUE=".pipeline/dispatch/queue.tsv"
LOG=".pipeline/dispatch/dispatch.log"
VIEW="/Users/parkminhyeon/.claude/jobs/46e38b12/tmp/stream-view.mjs"
SURFACES="18 19 20 21 22 24 25 26 27 28"
ROOT="$PWD"

export CMUX_QUIET=1

log() { printf '%s %s\n' "$(date '+%H:%M:%S')" "$*" >>"$LOG"; }

is_idle() {
  # 마지막 줄이 셸 프롬프트로 끝나면 유휴로 본다.
  local last
  last="$(cmux read-screen --workspace "$WS" --surface "surface:$1" --lines 1 2>/dev/null | tail -1)"
  case "$last" in
    *'% ') return 0 ;;
    *'%') return 0 ;;
    *) return 1 ;;
  esac
}

pop_job() {
  # 첫 줄을 꺼내고 큐에서 지운다. outfile 이 이미 있으면 계속 꺼낸다.
  while :; do
    [ -s "$QUEUE" ] || return 1
    JOB="$(head -1 "$QUEUE")"
    tail -n +2 "$QUEUE" >"$QUEUE.tmp" && mv "$QUEUE.tmp" "$QUEUE"
    [ -n "$JOB" ] || continue
    MODEL="$(printf '%s' "$JOB" | cut -f1)"
    TITLE="$(printf '%s' "$JOB" | cut -f2)"
    PROMPT="$(printf '%s' "$JOB" | cut -f3)"
    OUT="$(printf '%s' "$JOB" | cut -f4)"
    [ -f "$OUT" ] && { log "skip (이미 있음) $OUT"; continue; }
    [ -f "$PROMPT" ] || { log "skip (프롬프트 없음) $PROMPT"; continue; }
    return 0
  done
}

dispatch() {
  local surf="$1" label
  label="$(printf '%s' "$TITLE" | tr ' ' '_')"
  local cmd
  if [ "$MODEL" = "claude" ]; then
    cmd="cd $ROOT && claude --dangerously-skip-permissions --verbose --output-format stream-json -p \"\$(cat $PROMPT)\" 2>&1 | node $VIEW '$label'"
  else
    cmd="cd $ROOT && agy --dangerously-skip-permissions --model $MODEL --print-timeout 60m --output-format stream-json -p \"\$(cat $PROMPT)\" 2>&1 | node $VIEW '$label'"
  fi
  cmux rename-tab --workspace "$WS" --surface "surface:$surf" "$TITLE" >/dev/null 2>&1
  cmux send --workspace "$WS" --surface "surface:$surf" "$cmd" >/dev/null 2>&1
  cmux send-key --workspace "$WS" --surface "surface:$surf" Enter >/dev/null 2>&1
  log "dispatch surface:$surf ← $TITLE"
}

log "=== dispatcher 시작 · 큐 $(wc -l <"$QUEUE" | tr -d ' ')건 ==="
while [ -s "$QUEUE" ]; do
  for s in $SURFACES; do
    [ -s "$QUEUE" ] || break
    if is_idle "$s"; then
      if pop_job; then
        dispatch "$s"
        sleep 4   # 패널이 실행 상태로 바뀔 틈을 준다
      fi
    fi
  done
  sleep 12
done
log "=== 큐 소진 · dispatcher 종료 ==="
