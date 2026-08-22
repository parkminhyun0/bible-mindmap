#!/bin/bash
# 패널이 셸로 돌아오면 다음 일을 즉시 물린다. 유휴 패널을 만들지 않는다.
#
# jobs.tsv 는 **지워지지 않는 작업 목록**이다. 큐에서 꺼내 버리던 앞 판본은
# 절전으로 죽은 작업 8건을 아무도 모르게 잃었다. 이제 산출 파일이 실제로
# 생겨야 완료로 본다. 배정하고 RETRY_AFTER 초가 지나도 파일이 없으면 다시
# 배정한다. 한도 소진처럼 조용히 끝나는 실패도 이 방식이면 되살아난다.
#
# jobs.tsv 형식 (탭 구분): model \t title \t promptfile \t outfile
#   model 이 "codex" 또는 legacy "claude" 면 Codex GPT 실행, 그 밖은 agy --model.
set -u
cd "$(dirname "$0")/../.." || exit 1

WS="${CMUX_WS:-workspace:8}"
JOBS=".pipeline/dispatch/jobs.tsv"
STATE=".pipeline/dispatch/inflight.tsv"   # outfile \t 배정시각 \t surface
LOG=".pipeline/dispatch/dispatch.log"
VIEW="/Users/parkminhyeon/.claude/jobs/46e38b12/tmp/stream-view.mjs"
# surface:18 hosts this dispatcher; never treat it as a worker panel.
SURFACES="19 20 21 22 24 25 26 27 28"
# 모델이 100개 항목을 음역하는 데 보통 2~5분, 감사는 더 걸린다. 이 값이 짧으면
# 아직 돌고 있는 작업을 다른 패널에 중복 배정해 두 패널이 같은 일을 한다.
# 실제로 60초로 낮춰져 있어 b08 U 가 두 패널에서 동시에 돌았다.
# 패널이 셸로 돌아오면 어차피 즉시 재배정하므로(아래 is_idle 검사) 이 값은
# "패널이 멈춘 것처럼 보이지만 실은 돌고 있는" 경우의 안전망일 뿐이다. 길게 둔다.
RETRY_AFTER="${RETRY_AFTER:-1500}"
# 한 작업을 몇 번까지 시도할지. 계속 실패하는 작업이 유휴 패널을 전부 물고
# 늘어지는 것을 막는다. 상한에 닿으면 .dead 표시를 남기고 큐에서 뺀다.
MAX_TRIES="${MAX_TRIES:-6}"
ROOT="$PWD"

export CMUX_QUIET=1
touch "$JOBS" "$STATE"

# 모델 승계 — 실패하면 **다른 계열**로 넘긴다.
#
# 같은 계열끼리는 같은 오류를 공유하므로, 한 계열이 못 하는 일은 그 계열의
# 다른 모델도 대개 못 한다. 한도에 걸렸다면 더욱 그렇다.
# 실제로 GPT-OSS 가 실패했을 때 같은 GPT 계열인 Codex 로 넘어간 적이 있다.
ROSTER_FILE=".pipeline/dispatch/roster.tsv"

family_of() {
  awk -F'\t' -v m="$1" '$1==m {print $4; exit}' "$ROSTER_FILE" 2>/dev/null
}

next_model() {
  local cur="$1" fam pick=""
  fam="$(family_of "$cur")"
  # 로스터에서 계열이 다른 모델을 순서대로 고른다.
  while IFS=$'\t' read -r model slug name family; do
    [ -z "$model" ] && continue
    [ "$model" = "$cur" ] && continue
    [ -n "$fam" ] && [ "$family" = "$fam" ] && continue
    pick="$model"
    break
  done <"$ROSTER_FILE"
  # 로스터에 없는 모델이면 첫 줄로 보낸다.
  [ -z "$pick" ] && pick="$(awk -F'\t' 'NF{print $1; exit}' "$ROSTER_FILE")"
  [ -z "$pick" ] && pick="$cur"
  printf '%s' "$pick"
}

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
    # 쿼터로 쉬는 모델의 일은 건너뛴다. 대체 실행은 하지 않는다 —
    # 한 모델이 여러 이름으로 다수결에 참여하면 교차검증이 형식만 남는다.
    # 기다리는 것이 옳다.
    cooling "$model" && continue
    started="$(awk -F'\t' -v o="$out" '$1==o {print $2}' "$STATE" | tail -1)"
    assigned="$(awk -F'\t' -v o="$out" '$1==o {print $3}' "$STATE" | tail -1)"
    if [ -n "$started" ]; then
      elapsed=$(( $(now) - started ))
      # 배정한 패널이 셸로 돌아왔다면 그 실행은 끝났거나 실패한 것이다.
      # 산출물이 없으면 25분 기다릴 것 없이 바로 다시 돌린다.
      # (막 배정한 직후를 오판하지 않게 30초 유예를 둔다.)
      if [ "$elapsed" -lt 30 ]; then continue; fi
      if [ "$elapsed" -lt "$RETRY_AFTER" ]; then
        if [ -n "$assigned" ] && [ "$assigned" != "surface:18" ] && ! is_idle "${assigned#surface:}"; then continue; fi
      fi
    fi
    # 같은 일을 몇 번 배정했는지 센다. 두 번 넘게 실패하면 그 모델이
    # 한도에 걸렸거나 그 일을 못 하는 것이다. 다른 계열로 넘긴다.
    #
    # 프롬프트를 고친 시각 이후의 시도만 센다. 이력 전체를 세면, 프롬프트가
    # 잘못돼 실패한 이력이 영구히 남아 고친 뒤에도 즉시 .dead 가 다시 붙는다.
    # 실제로 b09 판정이 그렇게 되살아나지 못했다. 실패의 원인이 제거됐으면
    # 그 이전 실패는 이 일의 능력에 대한 증거가 아니다.
    pmtime="$(stat -f %m "$prompt" 2>/dev/null || echo 0)"
    tries="$(awk -F'\t' -v o="$out" -v m="$pmtime" '$1==o && $2+0>m' "$STATE" | wc -l | tr -d ' ')"
    if [ "$tries" -ge "$MAX_TRIES" ]; then
      if [ ! -f "$out.dead" ]; then
        printf '%s\t%s회 시도 후 포기\n' "$(date '+%F %T')" "$tries" >"$out.dead"
        log "포기: $title (${tries}회 실패) — $out.dead 남김. 0-lead 확인 필요"
      fi
      continue
    fi
    if [ "$tries" -ge 2 ]; then
      alt="$(next_model "$model")"
      if [ "$alt" != "$model" ] && ! cooling "$alt"; then
        log "모델 승계: $title · $model → $alt (${tries}회 실패)"
        model="$alt"
        title="$title [$alt 승계]"
      fi
    fi
    MODEL="$model"; TITLE="$title"; PROMPT="$prompt"; OUT="$out"
    [ -n "$started" ] && log "재배정(${RETRY_AFTER}s 안에 산출물 없음): $title"
    return 0
  done <"$JOBS"
  return 1
}


COOLDOWN=".pipeline/dispatch/cooldown.tsv"
[ -f "$COOLDOWN" ] || : >"$COOLDOWN"

# 모델이 쿼터로 쉬는 중인가. agy 로 도는 모델들은 **하나의 쿼터를 공유**하므로
# 하나가 걸리면 셋 다 걸린다. 그걸 모르고 배정하면 작업이 헛되이 소모되고,
# 실패 횟수가 쌓여 멀쩡한 작업이 .dead 로 죽는다. 실제로 그렇게 죽었다.
cooling() {
  local m="$1" until
  until="$(awk -F'\t' -v m="$m" '$1==m {print $2}' "$COOLDOWN" | tail -1)"
  [ -n "$until" ] || return 1
  [ "$(now)" -lt "$until" ]
}

# 패널 화면에서 쿼터 소진을 읽어 휴지기를 건다.
# 쿼터는 그 모델의 능력 문제가 아니므로 **이 시도는 실패로 세지 않는다** —
# 해당 배정 이력을 지워 작업이 처음 상태로 돌아가게 한다.
note_quota() {
  local surf="$1" screen out m secs h mi
  screen="$(cmux read-screen --workspace "$WS" --surface "surface:$surf" --lines 12 2>/dev/null)"
  # 쿼터 소진과 네트워크 끊김은 원인이 다르지만 대응은 같다 — 그 모델의
  # 능력 문제가 아니므로 실패로 세지 않고 잠시 쉬게 한다. chatgpt.com 이
  # 끊겼을 때 codex 작업이 6회 실패로 .dead 가 될 뻔했다.
  case "$screen" in
    *"quota reached"*|*"stream disconnected before completion"*|*"failed to lookup address"*) ;;
    *) return 1;;
  esac
  out="$(awk -F'\t' -v s="surface:$surf" '$3==s {print $1}' "$STATE" | tail -1)"
  [ -n "$out" ] || return 1
  m="$(awk -F'\t' -v o="$out" '$4==o {print $1}' "$JOBS" | head -1)"
  [ -n "$m" ] || return 1
  h="$(printf '%s' "$screen" | sed -n 's/.*Resets in \([0-9]*\)h.*/\1/p' | tail -1)"
  mi="$(printf '%s' "$screen" | sed -n 's/.*Resets in [0-9]*h\([0-9]*\)m.*/\1/p' | tail -1)"
  secs=$(( ${h:-0} * 3600 + ${mi:-30} * 60 + 120 ))
  # agy 로 도는 모델은 쿼터를 공유한다. 함께 쉬게 한다.
  case "$m" in
    codex|claude) printf '%s\t%s\n' "$m" "$(( $(now) + secs ))" >>"$COOLDOWN" ;;
    *) awk -F'\t' '$1!="codex" && $1!="claude" {print $1}' ".pipeline/dispatch/roster.tsv" \
         | while IFS= read -r am; do printf '%s\t%s\n' "$am" "$(( $(now) + secs ))" >>"$COOLDOWN"; done ;;
  esac
  # 이 시도는 없었던 것으로 한다.
  grep -v -F "$out	" "$STATE" >"$STATE.tmp" 2>/dev/null && mv "$STATE.tmp" "$STATE"
  rm -f "$out.dead"
  log "쿼터 휴지기 ${secs}초: $m (공유 쿼터 포함) — 이 시도는 실패로 세지 않는다"
  return 0
}

dispatch() {
  local surf="$1" label cmd
  label="$(printf '%s' "$TITLE" | tr ' ' '_')"

  # 모델은 지정된 그대로 돌린다. **대체 실행을 넣지 마라.**
  #
  # 한때 claude 를 codex exec 로 돌리고, agy 계열이 실패하면 Codex 가 대신
  # 하도록 고쳐진 적이 있다. 큐를 멈추지 않으려는 의도였지만 결과가 나빴다 —
  # 한 모델이 여러 이름으로 다수결에 참여해 교차검증이 형식만 남았다.
  # 이 작업의 품질은 서로 다른 계열이 독립으로 보는 데서 나온다.
  #
  # 모델이 실패하면 산출물이 안 생기고, 그러면 (a) 패널이 셸로 돌아와 즉시
  # 재배정되고 (b) 두 번 실패하면 next_model 이 **다른 계열로** 넘긴다.
  # 그 경로로 처리하라. 산출물의 출처는 언제나 표시된 모델이어야 한다.
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
    note_quota "$s" && continue
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
