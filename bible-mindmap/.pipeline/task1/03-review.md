# task1 · 2-review 검증 보고서

- 검증자: 2-review (Antigravity)
- 일시: 2026-08-14
- 대상 브랜치: `pipeline/task-strong-link`
- 최종 판정: **PASS**

---

## 1. 검증 명령 실행 결과 요약

| 검증 항목 | 실행 명령 | 결과 | 상세 요약 |
|---|---|---|---|
| 1. Strong 링크 정책 검증 | `node scripts/verify-strong-external-link-policy.mjs` | **PASS** | 16개 동작 케이스 및 정적 계약 검증 통과 |
| 2. Lint 검사 | `npx oxlint` | **PASS** | 신규 에러 0건 (exit code 0, 기존 warning만 존재) |
| 3-1. 모바일 안전성 | `node scripts/verify-mobile-safety.mjs` | **PASS** | 모바일 안전·성능 규칙 통과 |
| 3-2. 한글 표제어 가드 | `node scripts/verify-korean-gloss.mjs` | **PASS** | 144항목·73개념 구조/과병합 가드 통과 |
| 3-3. 번역 정렬 일치성 | `node scripts/verify-translation-alignment.mjs` | **PASS** | regression=29, committedRecords=52 통과 |
| 4. 변경 파일 범위 | `git diff origin/main --stat` | **PASS** | 01-plan 5절 명시 5개 파일 + task1 문서로 제한됨 |

---

## 2. 추가 중점 검토 항목 분석

### 2.1 검증 케이스 포괄성 검토
- `scripts/verify-strong-external-link-policy.mjs`의 `numberCases` 배열에 사용자 지정 필수 케이스와 기존 회귀 방지 케이스가 모두 포함되어 있음을 확인했습니다.
  - 필수 케이스: `H0776` → `'776'`, `G0025` → `'25'`, `H1` → `'1'`
  - 회귀 케이스: `H776` → `'776'`, `G2817` → `'2817'`, `H1254a` → `'1254a'`
  - 무효 입력 처리: `H0`, `H000`, `H`, `''`, `null`, `undefined` → 모두 `''`
  - URL 조립 케이스: `biblehubStrongUrl('H0776', true)` → `'https://biblehub.com/hebrew/776.htm'`, `('G0025', false)` → `'https://biblehub.com/greek/25.htm'`, `('H', true)` → `''`

### 2.2 `lexicon.js`의 `strongsChunkIdx()` 헬퍼 교체 동작 동등성 검토
- **변경 내용**: `parseInt(strongNum.replace(/^[GH]/, ''), 10)` → `parseInt(strongNumberForExternalLink(strongNum), 10)`
- **검토 결과: 기존 동작과 완전히 동등함 (안전성 향상 포함)**
  - **선행 0 처리**: `H0776` → `'776'` → `parseInt` 결과 `776` (기존 `parseInt('0776', 10)` = `776`과 동일, 청크 인덱스 `0`).
  - **접미사 입력**: `H1254a` → `'1254a'` → `parseInt` 결과 `1254` (기존 `parseInt('1254a', 10)` = `1254`와 동일, 청크 인덱스 `1`).
  - **유효 범위 전체**: H1~H8674, G1~G5624 전체 범위에서 기존과 새 계산 결과가 100% 일치함을 전수 검증했습니다.
  - **무효 입력 거동**: `H0`/`H000` 입력 시 기존은 `-1`, 신규는 `NaN`을 반환하나, 둘 다 로컬 청크 파일(`hot/-1.json`, `hot/NaN.json`)이 존재하지 않아 fetch 실패 후 null을 반환하므로 최종 동작은 동일합니다. `null`/`undefined` 입력 시 기존 코드는 `replace` 호출 예외(TypeError)가 발생했으나 새 코드는 안전하게 `NaN`으로 처리되어 방어력이 강화되었습니다.
  - 교체 목적: `verify-strong-external-link-policy.mjs`의 정적 소스 검사(`replace(/^[GH]/`) 통과 및 코드베이스 정규화 방식 통일을 위해 적절히 처리되었습니다.

### 2.3 `linkifyDefinition` 패턴 확장 및 마크업 이중 치환 안전성 검토
- **변경 내용**: `/\bH(\d{3,5})\b/g` → `/\bH(\d{1,5}[a-z]?)\b/g`, `/\bG(\d{3,5})\b/g` → `/\bG(\d{1,5}[a-z]?)\b/g`
- **검토 결과: 이중 치환 및 마크업 훼손 위험 없음**
  - TWOT 치환이 먼저 실행되어 `<a href="https://biblehub.com/twot/${num}.htm" ...>TWOT ... ↗</a>` 마크업이 생성됩니다.
  - 생성된 TWOT 마크업 내의 문자열(`https`, `biblehub`, `twot`, `target`, `weight`, `TWOT ...`)에는 단어 경계를 만족하는 대문자 `H\d`나 `G\d` 패턴이 존재하지 않으므로 후속 Strong 정규식에 매칭되지 않습니다.
  - H 치환으로 생성된 마크업(`https://biblehub.com/hebrew/...`) 역시 대문자 `G\d` 패턴이 없어 G 치환 시 영향을 받지 않습니다.
  - 복합 텍스트(TWOT, 1~5자리 Strong, 접미사 Strong, 기존 HTML 태그 혼합)에 대한 시뮬레이션 결과 중첩 `<a>` 태그 발생 없이 정확히 단일 링크로 변환됨을 확인했습니다.

---

## 3. 구현 변경 파일 및 범위 검토

`git diff origin/main --stat` 결과:
```
 bible-mindmap/.pipeline/task1/01-plan.md           | 128 +++++++++++++++++++++
 bible-mindmap/.pipeline/task1/02-impl.md           |  39 +++++++
 bible-mindmap/package.json                         |   1 +
 .../scripts/verify-strong-external-link-policy.mjs |  70 +++++++++++
 bible-mindmap/src/components/WordSearchModal.jsx   |   8 +-
 bible-mindmap/src/utils/lexicon.js                 |  13 ++-
 bible-mindmap/src/utils/strongLink.js              |  12 ++
 7 files changed, 265 insertions(+), 6 deletions(-)
```

- **01-plan 5절 명시 파일 준수**:
  1. `src/utils/strongLink.js` (신규 순수 모듈)
  2. `src/utils/lexicon.js`
  3. `src/components/WordSearchModal.jsx`
  4. `scripts/verify-strong-external-link-policy.mjs` (신규 검증 스크립트)
  5. `package.json` (`verify:strong-link` 1줄 추가)
  - 파이프라인 산출물: `.pipeline/task1/**`
- **금지 구역 위반 0**:
  - `LexiconPopup.jsx` 미수정.
  - `data/lexicon/**`, `reports/**`, `.github/workflows/**` 등 접근/수정 없음.
  - UI 레이아웃, 스타일, 표시 텍스트 불변 (`href` 및 유효성 조건만 보강).

---

## 4. 최종 결론

- 01-plan 명세에 따른 요구사항이 충실히 구현되었으며, 모든 자동화 검증 스크립트와 회귀/안전성 테스트를 통과했습니다.
- **판정: PASS**
- 후속 조치: 0-lead의 최종 판정 및 PR 생성을 권장합니다. (배포 후 BibleHub 실제 라우팅 수동 점검 권장)
