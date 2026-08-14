# task1 · 0-lead 최종 판정

- 작성: 0-lead (Claude) · 2026-08-14
- 브랜치: `pipeline/task-strong-link` (base `origin/main` = `087243ac`)
- 사이클 반복: **2회** (초기 PASS → PR CI의 CodeQL 경보로 1회 재작업 → 재검증 PASS)

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

## 반복 1회차 · CodeQL 경보 대응 (2026-08-14 추가)

초기 PASS 판정 후 PR #367의 GitHub CI에서 **로컬 검증이 잡지 못한** 신규 고위험 경보가 나왔다. 파이프라인 규칙대로 1-run 재실행 → 2-review 재검증을 1회 수행했다.

- **경보**: `js/incomplete-url-substring-sanitization` (high) · `scripts/verify-strong-external-link-policy.mjs:53`
- **성격**: 정적 계약 검사가 **우리 소스 코드 텍스트**를 `line.includes('biblehub.com')`로 훑은 것을 CodeQL이 "URL 호스트 부분문자열 검사"로 오인한 오탐. 런타임 코드가 아니며 실제 취약점은 아니다. 다만 CodeQL은 blocking 체크이므로 해소가 필요했다.
- **조치**: 경보 suppress 주석이나 Gate 완화 없이, **호스트명을 언급하지 않는** 계약으로 대체했다 — ① 헬퍼 `import` + 실사용 여부 검사, ② 헬퍼 결과(`${num}`) 외의 표현식으로 `/(?:hebrew|greek)/${...}` 경로를 조립하면 실패, ③ 기존 `replace(/^[GH]/` 잔존 금지 유지.
- **범위**: `scripts/verify-strong-external-link-policy.mjs` 1개 파일만 수정. 구현 파일 4개(`strongLink.js`, `lexicon.js`, `WordSearchModal.jsx`, `package.json`)는 `424fd8f1` 이후 **무변경**. 동작 케이스 16건 유지.
- **실효성 실증**: 2-review가 위반 코드 3종(0패딩 패턴 부활 / 헬퍼 우회 URL 조립 / 헬퍼 호출 제거)을 임시 주입해 각각 exit 1 실패를 확인하고 원상복구했다. 새 계약이 기존보다 **더 강하다**(헬퍼 실사용까지 강제).
- **교훈**: 이 저장소는 CodeQL이 blocking이므로, 로컬 verifier·oxlint PASS만으로 사이클을 닫지 말고 **PR CI의 CodeQL 결과까지 확인한 뒤** 최종 판정해야 한다. 다음 사이클의 01-plan 검증 절차에 반영한다.

## 잔여 리스크 (PR 본문에 명시)

1. `linkifyDefinition`의 **런타임 동작 테스트는 없다.** `lexicon.js`가 `import.meta.env`를 사용해 node 직접 import이 불가하므로 01-plan 3.4-D에서 정적 계약 검사로 대체했다. 이중 치환 안전성은 2-review의 시뮬레이션 검토 결과에 의존한다. → 런타임 계약 테스트는 후속 과제 후보.
2. Strong 패턴을 `{3,5}` → `{1,5}[a-z]?`로 확장했으므로, 사전 정의 HTML 본문에 `H1`·`G12` 같은 1~2자리 토큰이 있으면 **새로 링크가 생긴다**(기존에는 링크되지 않았음). 의도된 개선이나 표시상 변화이므로 배포 후 사전 팝업 육안 확인을 권장한다.
3. `verify:strong-link`는 `prebuild`/`predev` 체인에 넣지 않았다(다른 자동화와의 충돌 회피). **CI 필수 검사로 편입되지 않은 상태**이며, 편입은 별도 과제로 분리한다.
4. `LexiconPopup.jsx`의 3개 인라인 정규화는 이미 정상 동작하므로 손대지 않았다. 헬퍼 일원화는 후속 과제.

## ⚠️ 사고 기록 · 저장소 자동화의 무승인 자동 병합 (2026-08-14 추가)

**사용자는 "병합은 내가 한다"고 명시했고 0-lead는 병합하지 않았으나, 저장소 자동화가 PR #367을 사람 승인 없이 자동 병합했다.**

- `merged_by = github-actions[bot]` · `merged_at = 2026-08-14T07:44:48Z` · squash → **main `42eac141`**
- 사람 리뷰 승인 0건 (제출된 review는 `github-advanced-security[bot]`의 COMMENTED 1건뿐)
- 판정 경로: `lexicon-human-approval` = `ordinary-auto: no approved lexicon data touched` → 일반 lane → `Ordinary Auto Merge` / `Safe auto merge` 워크플로가 병합
- 병합 후 `Deploy to GitHub Pages` SUCCESS → **수정 사항이 이미 라이브에 반영됨**
- 0-lead는 `gh pr merge`를 호출하지 않았고 auto-merge를 활성화하지도 않았다. Draft 지정도 하지 않았다(일반 PR로 생성).

### 2차 피해와 조치

자동 병합이 **CodeQL 수정 커밋 이전 시점(`17dcd3ca`)** 을 대상으로 실행되어, 반복 1회차의 수정이 main에 들어가지 못했다. 결과적으로 **main에 고위험 CodeQL 경보 1건이 열린 상태로 남았다** (`js/incomplete-url-substring-sanitization` @ `scripts/verify-strong-external-link-policy.mjs:53`).

- 조치: `pipeline/task-strong-link-codeql` 브랜치를 `origin/main` 기준으로 만들어 CodeQL 수정을 cherry-pick하고 **PR #368을 Draft로 생성**했다.
- **Draft로 생성한 이유**: 이 저장소에서 Draft는 auto-merge를 차단하는 검증된 방법(노션 2026-08-13 Delivery canary 기록)이며, 사용자가 직접 병합하겠다는 지시를 자동화로부터 보호하기 위한 유일한 수단이다.
- PR #367 브랜치(`pipeline/task-strong-link`)에는 PR head 동기화 유도용 빈 커밋(`e9faf103`)이 남아 있다. 이미 병합·종료된 브랜치이므로 삭제 여부는 사용자 판단에 맡긴다.

### 다음 사이클 규칙 개정 (반드시 반영)

1. **PR은 Draft로 생성한다.** 사용자가 병합 주체인 이상, 일반 PR로 열면 이 저장소의 auto-merge 워크플로가 사람 승인 없이 병합할 수 있다.
2. **로컬 verifier·oxlint PASS만으로 사이클을 닫지 않는다.** PR CI의 CodeQL 결과까지 확인한 뒤 최종 판정한다(이번에 CodeQL 경보를 사후에 발견한 원인).
3. 사이클 종료 전 `merged_by`를 확인해 의도치 않은 자동 병합이 있었는지 점검한다.

## 후속 조치

- [x] `gh` CLI로 PR #367 생성 (0-lead는 병합하지 않음)
- [x] ~~병합은 사용자가 수행~~ → **저장소 자동화가 무승인 자동 병합함** (위 사고 기록 참조). main `42eac141` · Pages 배포 완료
- [x] CodeQL 수정 후속 PR **#368 Draft** 생성 — 병합은 사용자
- [ ] **PR #368 병합은 사용자(박 목사님)가 수행** (Ready for review 전환 후)
- [ ] 라이브에서 `H0776` 계열 링크가 BibleHub `/hebrew/776.htm`으로 실제 이동하는지 사용자 화면 확인
- [ ] auto-merge 워크플로가 사람 승인 없이 일반 lane PR을 병합하는 현행 동작을 유지할지 사용자 결정 필요
- [x] 노션 「하루 작업 브리핑」에 결과 요약 및 자동 병합 사고 기록 추가

## 다른 자동화와의 간섭 점검

- 사이클 시작 시 존재한 자비스/GPT 미커밋 산출물(`reports/genesis-*.json` 5건, `.cache/`)은 **커밋·이동·수정하지 않았다.** 사이클 종료 시점에도 untracked 상태로 그대로 남아 있다.
- 활성 자동화 점유 영역(`data/lexicon/**`, `scripts/verify-lexicon*`, `docs/lexicon-workflow/**`, `.github/workflows/**`) 접근 0.
- open PR #360 / #345와 변경 파일 교집합 없음.
