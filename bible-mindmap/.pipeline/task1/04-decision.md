# task1 · 0-lead 최종 판정

- 작성: 0-lead (Claude) · 2026-08-14
- 브랜치: `pipeline/task-strong-link` (base `origin/main` = `087243ac`)
- 사이클 반복: 1회 (재작업 없음)

## 판정: **PASS · PR 생성 (병합은 사용자)**

## 근거

2-review(agy)의 `03-review.md` PASS 판정을 수용한다. 판정 근거 중 자동 검증 항목은 0-lead가 독립적으로 재실행해 일치를 확인했다.

| 항목 | 2-review 보고 | 0-lead 독립 재실행 |
|---|---|---|
| `node scripts/verify-strong-external-link-policy.mjs` | PASS (16 케이스) | PASS · `exit=0` · "16 behavior cases; static contract OK" |
| `npx oxlint` | 신규 에러 0 | `exit=0` · 에러 0 (기존 warning만) |
| verify-mobile-safety / korean-gloss / translation-alignment | 전부 PASS | 사이클 시작 시 기준선 PASS와 동일 |
| 변경 파일 범위 | 01-plan 5절 목록 준수 | `git diff --cached --stat`로 7개(구현 5 + task1 문서 2) 확인 |

사용자 지정 검증 케이스 4종 모두 스크립트에 존재하고 통과한다:
- `H0776` → `776` ✅
- `G0025` → `25` ✅
- `H1` → `1` ✅
- 회귀: `H776` → `776`, `G2817` → `2817`, `H1254a` → `1254a` ✅ (기존 정상 링크 불변)

## 명세 이탈 1건 · 수용 판정

1-run이 01-plan 3.3에 없던 `lexicon.js:112 strongsChunkIdx()`(내부 청크 조회 경로)도 헬퍼로 교체했다. 2-review가 동등성을 전수 확인했고 0-lead도 다음을 확인해 **수용**한다:

- `parseInt('0776', 10) === 776`, `parseInt('776', 10) === 776` → 선행 0 처리 결과 동일
- `parseInt('1254a', 10) === 1254`, 헬퍼 결과 `'1254a'` → `1254` → 동일
- 무효 입력 `H0`: 기존 `-1`, 신규 `NaN` → 두 경우 모두 존재하지 않는 청크 파일 요청 후 null. 최종 거동 동일
- 이탈이지만 같은 파일·같은 정규화 주제이며, 검증 스크립트의 정적 계약(`replace(/^[GH]/` 잔존 금지)을 만족시키기 위한 불가피한 변경

## 잔여 리스크 (PR 본문에 명시)

1. `linkifyDefinition`의 **런타임 동작 테스트는 없다.** `lexicon.js`가 `import.meta.env`를 사용해 node 직접 import이 불가하므로 01-plan 3.4-D에서 정적 계약 검사로 대체했다. 이중 치환 안전성은 2-review의 시뮬레이션 검토 결과에 의존한다. → 런타임 계약 테스트는 후속 과제 후보.
2. Strong 패턴을 `{3,5}` → `{1,5}[a-z]?`로 확장했으므로, 사전 정의 HTML 본문에 `H1`·`G12` 같은 1~2자리 토큰이 있으면 **새로 링크가 생긴다**(기존에는 링크되지 않았음). 의도된 개선이나 표시상 변화이므로 배포 후 사전 팝업 육안 확인을 권장한다.
3. `verify:strong-link`는 `prebuild`/`predev` 체인에 넣지 않았다(다른 자동화와의 충돌 회피). **CI 필수 검사로 편입되지 않은 상태**이며, 편입은 별도 과제로 분리한다.
4. `LexiconPopup.jsx`의 3개 인라인 정규화는 이미 정상 동작하므로 손대지 않았다. 헬퍼 일원화는 후속 과제.

## 후속 조치

- [x] `gh` CLI로 PR 생성 (Draft 아님, auto-merge·self-approve 없음)
- [ ] **병합은 사용자(박 목사님)가 수행** — 0-lead는 병합하지 않는다
- [ ] 병합·배포 후 `H0776` 계열 링크가 BibleHub `/hebrew/776.htm`으로 실제 이동하는지 사용자 화면 확인
- [x] 노션 「하루 작업 브리핑」에 결과 요약 추가

## 다른 자동화와의 간섭 점검

- 사이클 시작 시 존재한 자비스/GPT 미커밋 산출물(`reports/genesis-*.json` 5건, `.cache/`)은 **커밋·이동·수정하지 않았다.** 사이클 종료 시점에도 untracked 상태로 그대로 남아 있다.
- 활성 자동화 점유 영역(`data/lexicon/**`, `scripts/verify-lexicon*`, `docs/lexicon-workflow/**`, `.github/workflows/**`) 접근 0.
- open PR #360 / #345와 변경 파일 교집합 없음.
