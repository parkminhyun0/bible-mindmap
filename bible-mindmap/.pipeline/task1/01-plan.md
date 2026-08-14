# task1 · BibleHub 외부 링크 Strong 번호 정규화 통일

- 작성: 0-lead (Claude) · 2026-08-14
- 브랜치: `pipeline/task-strong-link` (base: `origin/main` = `087243ac`)
- 역할 분담: 1-run(codex) 구현 → 2-review(agy) 검증 → 0-lead 판정 → PR 생성(병합 금지)

## 1. 배경 / 문제

BibleHub 외부 링크를 만드는 코드가 3곳에서 서로 다른 정규화를 쓴다.

| 위치 | 현재 코드 | 결과 |
|---|---|---|
| `src/components/LexiconPopup.jsx:197,286,302` | `entry.s.replace(/^([GH])0*/, '')` | 정상 (`H0776` → `776`) |
| `src/components/WordSearchModal.jsx:402,443` | `strong.replace(/^[GH]/, '')` | **결함** (`H0776` → `0776` → 404) |
| `src/utils/lexicon.js:311,312` (`linkifyDefinition`) | `/\bH(\d{3,5})\b/` 캡처값 그대로 사용 | **결함** (`H0776` → `0776` → 404) + 1~2자리 Strong(`H1`, `G12`)은 링크 자체가 생성되지 않음 |

원본 데이터(STEPBible)는 Strong 번호를 0패딩된 형태(`H0776`)로 보유하며, PR #203은 사전 팝업의 **내부 조회 키**만 정규화했다. 외부 링크 경로는 미정리 상태로 남아 있다(노션 2026-08-07 Fable5 감사 ⚪경미-5 항목).

## 2. 목표 (완료 조건)

1. Strong 번호 → BibleHub URL 경로 조각 변환을 **단일 순수 함수**로 통일한다.
2. `WordSearchModal.jsx` 2곳, `lexicon.js` 2곳이 이 함수를 사용한다.
3. 새 검증 스크립트가 요구 케이스 전부를 통과한다.
4. 기존 정상 링크·기존 렌더링 동작은 변하지 않는다(회귀 0).

## 3. 구현 명세

### 3.1 신규 파일 `src/utils/strongLink.js`

빌드 도구 의존성이 없는 순수 모듈로 만든다. **`import` 문을 넣지 않는다** (node에서 직접 import해 검증하기 위함. `lexicon.js`는 `import.meta.env`를 쓰므로 헬퍼를 그쪽에 두면 node 검증이 불가능하다).

```js
export function strongNumberForExternalLink(strong) { ... }
export function biblehubStrongUrl(strong, isHebrew) { ... }
```

`strongNumberForExternalLink` 규칙:
- 입력이 falsy거나 문자열이 아니면 `''` 반환.
- 앞뒤 공백 제거.
- 선행 `G`/`H`(대소문자 무관) 1글자 제거.
- 이어지는 선행 `0` 제거. 단 **전부 0인 경우 `'0'`이 아니라 빈 문자열 취급 대신 마지막 `0` 유지 금지** — `H0`, `H000` 같은 무효 입력은 `''`를 반환한다.
- 숫자 뒤의 알파벳 접미사(`a`,`b` 등)는 **보존**한다 (`H1254a` → `1254a`). BibleHub는 `/hebrew/1254a.htm` 경로를 제공한다.
- 숫자부가 없으면 `''` 반환.

`biblehubStrongUrl(strong, isHebrew)`:
- `strongNumberForExternalLink` 결과가 빈 문자열이면 `''` 반환(호출부는 이 경우 링크를 렌더링하지 않는다).
- 아니면 `https://biblehub.com/${isHebrew ? 'hebrew' : 'greek'}/${num}.htm`.

### 3.2 `src/components/WordSearchModal.jsx`

- 상단에 `import { biblehubStrongUrl } from '../utils/strongLink.js';` 추가.
- 402행 / 443행의 인라인 템플릿 문자열을 `biblehubStrongUrl(strong, isHeb)`로 교체.
- **표시 텍스트(`📖 BibleHub ({strong}) ↗`, `BibleHub ↗`)와 스타일·조건부 렌더링 구조는 그대로 둔다.** `href`만 바꾼다.
- `biblehubStrongUrl`이 `''`를 반환하면 링크를 렌더링하지 않도록 기존 `strong &&` 조건에 결과값 확인을 더한다.

### 3.3 `src/utils/lexicon.js` · `linkifyDefinition`

- `import { strongNumberForExternalLink } from './strongLink.js';` 추가.
- Strong 치환 2줄을 다음으로 교체:
  - 패턴을 `/\bH(\d{1,5}[a-z]?)\b/g`, `/\bG(\d{1,5}[a-z]?)\b/g`로 확장 (1~2자리 Strong 링크 누락 해소 + 접미사 지원).
  - `href`는 `strongNumberForExternalLink(m)` 결과로 만든다. 결과가 빈 문자열이면 **치환하지 않고 원문 `m`을 그대로 반환**한다.
- `TWOT` 치환 규칙은 **변경 금지**. TWOT 치환이 먼저 실행되어 이미 `<a ...>`로 감싼 구간을 Strong 패턴이 다시 건드리지 않는지 확인할 것(회귀 케이스로 검증).

### 3.4 신규 검증 스크립트 `scripts/verify-strong-external-link-policy.mjs`

저장소 관례(`scripts/verify-*.mjs`)를 따른다. 실패 시 비-0 종료 코드 + 실패 케이스 출력.

**A. 순수 함수 케이스** (`strongNumberForExternalLink`)

| 입력 | 기대값 | 성격 |
|---|---|---|
| `H0776` | `776` | 필수(사용자 지정) |
| `G0025` | `25` | 필수(사용자 지정) |
| `H1` | `1` | 필수(사용자 지정) |
| `H776` | `776` | **회귀** — 기존 정상 링크 불변 |
| `G2817` | `2817` | **회귀** |
| `H1254a` | `1254a` | 접미사 보존 |
| `h0430` | `430` | 소문자 |
| `H0` / `H000` / `H` / `''` / `null` / `undefined` | `''` | 무효 입력 |

**B. URL 조립 케이스** (`biblehubStrongUrl`)
- `('H0776', true)` → `https://biblehub.com/hebrew/776.htm`
- `('G0025', false)` → `https://biblehub.com/greek/25.htm`
- `('H', true)` → `''`

**C. `linkifyDefinition` 회귀 케이스** (`src/utils/lexicon.js`는 `import.meta.env` 때문에 node import 불가 → **정적 소스 검사**로 대체)
- `src/utils/lexicon.js`, `src/components/WordSearchModal.jsx` 소스를 읽어 `biblehub.com` 문자열이 등장하는 줄이 전부 `strongLink.js` 헬퍼를 경유하는지 확인한다(TWOT 링크 1줄은 예외로 허용).
- 두 파일에 `replace(/^[GH]/` 같은 **0패딩 미제거 패턴이 남아 있지 않은지** 정규식으로 검사한다.

**D. `linkifyDefinition` 동작 회귀** — `import.meta` 문제를 피하기 위해, 스크립트가 `lexicon.js` 소스에서 `linkifyDefinition` 함수 본문을 읽어 실행하는 방식은 **쓰지 않는다.** 대신 위 C의 정적 계약 검사로 대체하고, 동작 확인은 아래 5번 수동 확인 항목에 남긴다.

### 3.5 `package.json`

- `scripts`에 `"verify:strong-link": "node scripts/verify-strong-external-link-policy.mjs"` **한 줄만** 추가한다.
- `prebuild` / `predev` 체인은 **수정 금지** (다른 자동화와 충돌 위험. CI 편입은 별도 과제).

## 4. 금지 사항 (범위 제한)

- `src/components/LexiconPopup.jsx`는 이번 사이클에서 **수정하지 않는다** (이미 정상 동작. 헬퍼 일원화는 후속 과제).
- `data/lexicon/**`, `scripts/verify-lexicon*`, `docs/lexicon-workflow/**`, `.github/workflows/**`, `reports/**`, `.cache/` **접근·수정 금지** (자비스·GPT 배치 점유 영역).
- 사전 의미값·koreanGloss·Approval Registry·정렬 데이터 **변경 0**.
- 표시 텍스트·스타일·레이아웃 변경 금지. `href` 값만 바뀐다.
- 기존 verifier 체인(`prebuild`/`predev`) 및 품질 Gate 완화 금지.

## 5. 검증 절차 (2-review 수행)

1. `node scripts/verify-strong-external-link-policy.mjs` → 전 케이스 PASS 확인 (직접 실행).
2. `npx oxlint` → **신규 에러 0** 확인 (기존 warning은 무관).
3. `node scripts/verify-mobile-safety.mjs`, `node scripts/verify-korean-gloss.mjs`, `node scripts/verify-translation-alignment.mjs` → 기준선 OK 유지 확인.
4. `git diff origin/main --stat` → 수정 파일이 아래 5개를 벗어나지 않았는지 확인:
   - `src/utils/strongLink.js` (신규)
   - `src/utils/lexicon.js`
   - `src/components/WordSearchModal.jsx`
   - `scripts/verify-strong-external-link-policy.mjs` (신규)
   - `package.json` (1줄)
   - (+ `.pipeline/task1/**` 산출물)
5. 사용자 화면 확인이 필요한 항목은 없음(외부 링크 URL 교정). 단 배포 후 `H0776` 계열 링크가 BibleHub 실제 페이지로 이동하는지는 박 목사님 확인 권장 사항으로 보고서에 기재.

## 6. 판정 기준

- **PASS**: 5번 1~4 전부 통과 + 금지 사항 위반 0.
- **FAIL**: 검증 케이스 1건이라도 실패, 또는 4번의 파일 범위 이탈.

## 6-1. 반복 1회차 추가 명세 (CodeQL 대응 · 2026-08-14 추가)

PR #367의 GitHub CI에서 로컬 검증이 잡지 못한 신규 CodeQL 고위험 경보가 발생했다. 파이프라인 규칙(FAIL/수정 지시 → 1-run 재실행 → 2-review 재검증)에 따라 아래를 추가 명세로 지시한다.

- **경보**: `js/incomplete-url-substring-sanitization` (high) · `scripts/verify-strong-external-link-policy.mjs:53`
- **원인**: 정적 계약 검사가 소스 라인을 `line.includes('biblehub.com')`로 필터링한다. CodeQL이 이를 "URL 호스트 부분문자열 검사"(호스트 위조 우회 가능)로 오인한다. 검사 대상이 URL이 아니라 **우리 소스 코드 텍스트**이므로 실제 취약점은 아니지만, CodeQL은 blocking 체크이므로 해소해야 한다.
- **수정 방향**: 호스트명 부분문자열 검사를 **제거**하고, 동등하거나 더 강한 계약으로 대체한다. 취약점을 억제(suppress)하는 주석이나 Gate 완화로 해결하지 않는다.
  - 검사 대상 두 파일(`src/utils/lexicon.js`, `src/components/WordSearchModal.jsx`)에서 **호스트명을 언급하지 않는** 판정 기준을 쓴다. 예: BibleHub 경로 조각을 직접 조립하는 잔존 패턴(`/(?:hebrew|greek)\/\$\{`)이 헬퍼 결과(`${num}`) 외의 표현식으로 남아 있으면 실패 처리.
  - 기존 `replace(/^[GH]/` 잔존 금지 검사는 그대로 유지한다.
  - `WordSearchModal.jsx`가 `biblehubStrongUrl`을 import·사용하는지, `lexicon.js`가 `strongNumberForExternalLink`를 import·사용하는지 확인하는 검사를 추가해 계약 강도를 유지한다.
- **불변 조건**: 3.1~3.3의 구현 코드(`strongLink.js`, `lexicon.js`, `WordSearchModal.jsx`)와 4절 금지 사항, 3.4-A/B의 동작 케이스 16건은 **변경하지 않는다.** 수정 범위는 `scripts/verify-strong-external-link-policy.mjs`의 정적 계약 검사부(C)로 한정한다.
- **재검증**: 5절 1~4를 다시 수행하고, 추가로 정적 계약 검사가 여전히 **실효성이 있는지**(고의로 `replace(/^[GH]/`를 되살리거나 헬퍼를 우회하는 URL 조립을 넣으면 실패하는지) 확인한다.

## 7. 사이클 운영 메모

- agy(2-review) 호출 **직전에 반드시 커밋**하여 복구 지점을 확보한다 (ROLES.md 권한 정책 — `--dangerously-skip-permissions`는 커밋된 트리에서만).
- 완료 후 gh CLI로 PR 생성. **병합은 사용자가 한다 (auto-merge·self-approve 금지).**
- 04-decision 후 노션 「하루 작업 브리핑」에 결과 요약을 추가한다.
