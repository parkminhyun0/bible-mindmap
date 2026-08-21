#!/bin/bash
# 패널이 셸로 돌아오면 다음 일을 즉시 물린다. 유휴 패널을 만들지 않는다.
#
# jobs.tsv 는 **지워지지 않는 작업 목록**이다. 큐에서 꺼내 버리던 앞 판본은
# 절전으로 죽은 작업 8건을 아무도 모르게 잃었다. 이제 산출 파일이 실제로
# 생겨야 완료로 본다. 배정하고 RETRY_AFTER 초가 지나도 파일이 없으면 다시
# 배정한다. 한도 소진처럼 조용히 끝나는 실패도 이 방식이면 되살아난다.
#
# jobs.tsv 형식 (탭 구분): model \t title \t promptfile \t outfile
#   model 이 "codex" 면 codex exec, "claude" 면 네이티브 claude, 그 밖은 agy --model.
set -u
cd "$(dirname "$0")/../.." || exit 1

WS="${CMUX_WS:-workspace:8}"
JOBS=".pipeline/dispatch/jobs.tsv"
STATE=".pipeline/dispatch/inflight.tsv"   # outfile \t 배정시각 \t surface
LOG=".pipeline/dispatch/dispatch.log"
VIEW="/Users/parkminhyeon/.claude/jobs/46e38b12/tmp/stream-view.mjs"
SURFACES="18 19 20 21 22 24 25 26 27 28"
RETRY_AFTER="${RETRY_AFTER:-1500}"        # 25분 안에 산출물이 없으면 재배정
ROOT="$PWD"

export CMUX_QUIET=1
touch "$JOBS" "$STATE"

log() { printf '%s %s\n' "$(date '+%H:%M:%S')" "$*" >>"$LOG"; }
now() { date +%s; }

is_idle() {
  local last
  last="$(cmux read-screen --workspace "$WS" --surface "surface:$1" --lines 1 2>/dev/null | tail -1)"
  case "$last" in
    *'% '|*'%') return 0 ;;
    *) return 1 ;;
  esac
}

# 산출물이 아직 없고, 배정된 적 없거나 배정이 오래된 첫 작업을 고른다.
pick_job() {
  local line model title prompt out started
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    model="$(printf '%s' "$line" | cut -f1)"
    title="$(printf '%s' "$line" | cut -f2)"
    prompt="$(printf '%s' "$line" | cut -f3)"
    out="$(printf '%s' "$line" | cut -f4)"
    [ -f "$out" ] && continue                       # 이미 끝난 일
    [ -f "$prompt" ] || { continue; }
    started="$(awk -F'\t' -v o="$out" '$1==o {print $2}' "$STATE" | tail -1)"
    assigned="$(awk -F'\t' -v o="$out" '$1==o {print $3}' "$STATE" | tail -1)"
    if [ -n "$started" ]; then
      elapsed=$(( $(now) - started ))
      # 배정한 패널이 셸로 돌아왔다면 그 실행은 끝났거나 실패한 것이다.
      # 산출물이 없으면 25분 기다릴 것 없이 바로 다시 돌린다.
      # (막 배정한 직후를 오판하지 않게 30초 유예를 둔다.)
      if [ "$elapsed" -lt 30 ]; then continue; fi
      if [ "$elapsed" -lt "$RETRY_AFTER" ]; then
        if [ -n "$assigned" ] && ! is_idle "${assigned#surface:}"; then continue; fi
      fi
    fi
    MODEL="$model"; TITLE="$title"; PROMPT="$prompt"; OUT="$out"
    [ -n "$started" ] && log "재배정(${RETRY_AFTER}s 안에 산출물 없음): $title"
    return 0
  done <"$JOBS"
  return 1
}

dispatch() {
  local surf="$1" label cmd
  label="$(printf '%s' "$TITLE" | tr ' ' '_')"
  if [ "$MODEL" = "codex" ]; then
    cmd="cd $ROOT && codex exec --sandbox workspace-write --skip-git-repo-check \"\$(cat $PROMPT)\" 2>&1 | node $VIEW '$label'"
  elif [ "$MODEL" = "claude" ]; then
    cmd="cd $ROOT && claude --dangerously-skip-permissions --verbose --output-format stream-json -p \"\$(cat $PROMPT)\" 2>&1 | node $VIEW '$label'"
  else
    cmd="cd $ROOT && agy --dangerously-skip-permissions --model $MODEL --print-timeout 60m --output-format stream-json -p \"\$(cat $PROMPT)\" 2>&1 | node $VIEW '$label'"
  fi
  cmux rename-tab --workspace "$WS" --surface "surface:$surf" "$TITLE" >/dev/null 2>&1
  cmux send --workspace "$WS" --surface "surface:$surf" "$cmd" >/dev/null 2>&1
  cmux send-key --workspace "$WS" --surface "surface:$surf" Enter >/dev/null 2>&1
  printf '%s\t%s\t%s\n' "$OUT" "$(now)" "surface:$surf" >>"$STATE"
  log "dispatch surface:$surf ← $TITLE"
}

remaining() {
  awk -F'\t' 'NF{print $4}' "$JOBS" | while IFS= read -r o; do [ -f "$o" ] || echo x; done | wc -l | tr -d ' '
}

log "=== dispatcher 시작 · 남은 작업 $(remaining)건 ==="
# 못 쓸 산출물은 지워 다시 돌게 한다. 파일만 있고 내용이 깨진 채 완료로
# 잡히던 자리를 막는다.
node .pipeline/dispatch/validate.mjs --fix >>"$LOG" 2>&1 || true

while [ ! -f .pipeline/dispatch/STOP ]; do
  for s in $SURFACES; do
    is_idle "$s" || continue
    pick_job || break
    dispatch "$s"
    sleep 2
  done
  sleep 4
  tick=$(( ${tick:-0} + 1 ))
  if [ $(( tick % 15 )) -eq 0 ]; then
    node .pipeline/dispatch/validate.mjs --fix >>"$LOG" 2>&1 || true
  fi
done
log "=== STOP 감지 · dispatcher 종료 (남은 작업 $(remaining)건) ==="
