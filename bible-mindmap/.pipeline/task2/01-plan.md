# task2 · 01-plan — 사전 정의 탭 형식 통일 (코드 층)

- 작성: 0-lead (Claude) · 2026-08-14 · **사용자 착수 승인 완료 (2026-08-14)**
- 승인 조건 4건은 8절에 명시하며, 명세·검증 전반에 반영됨
- 근거: `.pipeline/task2/00-investigation.md` 9절
- 브랜치(예정): `pipeline/task-lexicon-definition-format`
- 개정 규칙 적용: **Draft PR 생성** · **PR CI의 CodeQL 확인 후 판정** · **종료 전 `merged_by` 점검**

## 1. 목표

모든 Strong 단어의 `📖 사전 정의` 탭이 **하나의 틀**로 렌더되게 한다.

```
① 한글 승인본 있음  → 한글 BDB 구조 트리   (Approval Registry)
② 없고 BDB 있음     → 영문 BDB 구조 트리   (bolls.life BDBT)
③ BDB 없음          → Strong's 데이터를 같은 구조 틀로 정규화 (산문 덤프 제거)
```

세 경우 모두 **같은 컴포넌트·같은 들여쓰기·같은 마커 체계**를 쓴다. 출처 배지(`한글 승인본` / `BDB` / `Strong's`)로 근거만 구분 표시한다.

## 2. 범위 (수정 대상 4파일 + 테스트 1)

| 파일 | 변경 |
|---|---|
| `src/utils/lexicon.js` | 정의 조회 결과를 **구조화 노드 트리**로 정규화해 반환. BDB 실패 시 재시도·음성 캐시 방지 |
| `src/components/LexiconDefinitionTree.jsx` (신규) | 세 소스 공통 렌더러. 한글/영문 BDB 트리·Strong's 정규화 노드를 동일 시각 규칙으로 표시 |
| `src/components/LexiconPopup.jsx` | `📖 사전 정의` 탭이 공통 렌더러를 사용. 한글 승인본이 있으면 우선 표시 |
| `vite.config.js` | bolls.life SW 캐싱 규칙 분리 (아래 3.4) |
| `tests/lexicon-definition-format.spec.js` (신규) | Playwright 계약 테스트 |

**금지:** `data/lexicon/**`, `scripts/verify-lexicon*`, `docs/lexicon-workflow/**`, `.github/workflows/**`, `reports/**`, `.cache/`, `approval-registry.json`, 사전 의미값·정렬 데이터. **한글 승인본 텍스트는 읽기 전용이며 어떤 경우에도 변형·요약하지 않는다.**

## 3. 구현 명세

### 3.1 정의 조회 결과의 구조화 (`lexicon.js`)

`fetchStrongDefinition`이 지금처럼 `{topic, definition(HTML), source}`를 그대로 주는 대신, 아래 정규형을 함께 반환한다.

```js
{
  source: 'approved-ko' | 'bdbt' | 'local',
  nodes: [{ id, depth, text, children }],   // 공통 트리
  meta: { originKo?, twot?, kjvUsage?, partOfSpeech? },
  raw: { definition }                        // 기존 HTML (호환용, 점진 제거)
}
```

- `bdbt`: BDB 응답의 `<ol>/<li>` 중첩을 파싱해 `nodes`로 변환한다. `Origin:` · `TWOT entry:` · `Part(s) of speech:` 는 `meta`로 분리한다.
- `local`: `raw.e`(어원) → `meta.originKo`, `raw.k`(KJV 용례) → `meta.kjvUsage`, `raw.d`(정의)는 **문장 단위로 분리해 depth 0 노드 목록**으로 만든다. 산문 한 덩어리를 그대로 쏟지 않는다.
- 파싱은 정규식이 아니라 `DOMParser`로 수행한다(중첩 `<ol>` 구조 안정성).

### 3.2 BDB 조회 신뢰성 (`lexicon.js`)

현재 결함: 실패 시 조용히 산문으로 폴백하고, `_defCache`가 그 실패를 세션 내내 고정한다.

- `fetchBDBDef` 실패 시 **1회 재시도**(짧은 backoff). `AbortController`로 타임아웃(예: 6초) 설정.
- **음성 결과를 영구 캐시하지 않는다.** `_defCache`는 `source === 'bdbt'` 성공만 무기한 보관하고, 폴백 결과는 짧은 TTL(예: 60초)로 저장해 재시도가 가능하게 한다.
- 히브리어인데 BDB를 못 얻은 경우, 사용자에게 **형식이 바뀐 이유를 알린다**: 배지 옆에 `BDB 조회 실패 · Strong's 표시` 같은 상태 표시. 조용한 형식 붕괴를 없앤다.

### 3.3 한글 승인본 우선 (`LexiconPopup.jsx`)

- `lexiconApprovalLoader.loadApprovedEntry(strong)`로 승인 항목을 조회한다.
- 있으면 `📖 사전 정의` 탭 **상단에 한글 승인 트리**를 렌더하고, 영문 BDB 트리는 그 아래 접이식(`<details>`)으로 유지한다. 승인 배지·근거 구성 표기는 `ApprovedKoreanLexiconPane`과 동일 규칙을 재사용한다.
- 없으면 영문 BDB 트리만 렌더한다.
- **이 분기는 Strong 하드코딩 없이 레지스트리 존재 여부만으로 결정한다** → 승인이 늘어나면 코드 변경 없이 자동 전환된다(9.6 요구사항).

### 3.4 서비스 워커 캐시 분리 (`vite.config.js`) — **승인 조건 (1) 적용**

현재 `https://bolls.life/*` 전체가 `maxEntries: 500` 한 칸을 공유하고, 실측 결과 **이미 500개 포화**다. 절 본문 요청이 사전 응답을 축출한다.

허용된 변경은 **아래 두 가지뿐이다.**

1. `dictionary-definition` 경로를 **별도 캐시 규칙으로 분리**한다: `cacheName: 'bm-bolls-dict-v1'`, `maxEntries: 300`, `maxAgeSeconds: 30일`, `handler: 'StaleWhileRevalidate'`. 기존 `bolls.life/*` 규칙보다 **앞에** 배치해 우선 매칭되게 한다.
2. `cacheableResponse.statuses`에서 **`0`(opaque)을 제거**해 `[200]`만 남긴다.

**절 본문 캐시(`bm-bolls-v1`) 동작은 건드리지 않는다.** `handler`·`cacheName`·`maxEntries`·`maxAgeSeconds`는 전부 현행 유지하며, 그 규칙에 대한 변경은 위 2번(`statuses`에서 `0` 제거) **한 줄로 한정**한다. 다른 runtimeCaching 규칙(HTML·CHUNK·LEX·STRONGS·폰트)은 **일절 수정 금지**.

### 3.5 헬라어

`lexicon.js:190-193`은 헬라어에 대해 BDB 조회를 하지 않는다(BDB는 히브리어 사전이므로 타당). 따라서 헬라어는 **③ 경로**로 들어간다. 3.1의 `local` 정규화가 적용되면 헬라어도 히브리어와 **같은 구조 틀**로 표시된다. 헬라어용 구조 사전(BDAG 등) 도입은 라이선스 심사가 필요한 **데이터 작업이며 이 과제 범위 밖**이다.

## 4. 검증 절차 (2-review 수행)

1. `node scripts/verify-strong-external-link-policy.mjs` — task1 계약 유지 확인
2. `npx oxlint` — 신규 에러 0
3. `node scripts/verify-mobile-safety.mjs`, `verify-korean-gloss.mjs`, `verify-translation-alignment.mjs` — 기준선 유지
4. **신규 Playwright 계약 테스트** `tests/lexicon-definition-format.spec.js` — **승인 조건 (2)(3) 적용**

   네트워크는 `page.route`로 **고정 픽스처를 주입**해 결정적으로 만든다(bolls.life BDBT 응답, `data/strongs-def` 청크, `lexicon/ko` 레지스트리·매니페스트·샤드). 외부 API 실시간 의존은 테스트에 넣지 않는다. 픽스처 본문은 실제 응답 형태를 그대로 쓴다.

   **[조건 (3)] 아래 4개 상태를 각각 최소 1건 실측한다:**
   - **T1 · 히브리어 BDB 정상** — 미승인 히브리어 Strong. BDBT 200 픽스처 → **영문 BDB 구조 트리**(중첩 depth ≥ 2)가 렌더되고 배지가 `BDB`
   - **T2 · 히브리어 BDB 실패 폴백** — 동일 Strong에 BDBT 라우트를 실패(503/네트워크 오류)로 주입 → **산문 덤프가 아니라 동일 구조 틀 + `Strong's` 배지 + 조회 실패 상태 표시**. `<p class="lex-kjv">` 같은 원시 산문 블록이 DOM에 **없어야** 한다
   - **T3 · 헬라어** — 헬라어 Strong → 히브리어와 **동일한 구조 틀**로 렌더. `KJV 용례`는 본문 산문이 아니라 meta 영역에 배치
   - **T4 · 한글 승인본 보유(H776)** — 정의 탭 상단에 **한글 승인 트리** + 승인 배지. 트리 텍스트가 승인 레지스트리 값과 **바이트 일치**(변형 금지 계약)

   **[조건 (2)] 회귀 보존 계약 — 반드시 포함:**
   - **T5 · BibleHub / TWOT 링크 보존** — 정의 본문의 `H####`·`G####`·`TWOT` 링크가 여전히 생성되고 `href`가 `biblehub.com`의 **0패딩 없는** 경로를 가리킨다(task1 계약 유지). 헤더의 `📖 BibleHub (…)` 링크도 존재
   - **T6 · `📚 한글 사전` 드로어 보존** — 승인 항목 보유 Strong에서 팝업 툴바에 `📚 한글 사전` 토글이 **여전히 나타나고**, 클릭 시 드로어가 열려 승인 트리를 보여준다(`lexiconTranslationPilotBridge`가 찾는 DOM 구조 — `aria-label^="원어 사전"` 다이얼로그, `HEBREW/GREEK LEXICON` 라벨을 가진 툴바, 첫 `<a>`의 Strong 링크 — 를 깨뜨리지 않았다는 증거)
   - **T7 · 자동 전환 계약** — 레지스트리 픽스처에 임의 Strong을 "승인됨"으로 추가하면 **코드 변경 없이** 그 Strong의 정의 탭이 한글 승인본으로 전환된다 (데이터 층 진행 시 자동 반영 보장)

5. `git diff origin/main --stat` — 2절 파일 목록 이탈 없음. **특히 `vite.config.js` 변경이 3.4의 2가지를 넘지 않았는지 diff를 직접 읽어 확인**(조건 (1))
6. **PR CI에서 CodeQL 결과 확인** (개정 규칙)

> Playwright 브라우저가 설치돼 있지 않거나 실행이 불가능하면 **PASS로 판정하지 말고 그 사실을 명시**한 뒤 FAIL 또는 조건부 보류로 보고한다. 실행하지 않은 테스트를 통과로 기록하는 것은 금지한다.

## 5. 판정 기준

- **PASS**: 4번 1~6 전부 통과 + 금지 영역 위반 0 + 한글 승인 텍스트 변형 0 + T5·T6 회귀 0
- **FAIL**: T1~T7 중 1건이라도 실패, 파일 범위 이탈, `vite.config.js` 변경이 3.4 범위 초과, 또는 CodeQL 신규 경보

## 6. 리스크

1. **UI 가시 변경이다.** 배포 후 박 목사님 실기 확인 전 100% 완료 판정 금지.
2. `LexiconPopup`은 `dangerouslySetInnerHTML`로 렌더 중이다(`:297`). 트리 렌더러로 바꾸면 기존 링크(`linkifyDefinition`의 BibleHub·TWOT 링크) 동작을 보존해야 한다 → T3에 링크 존재 확인 포함.
3. SW 캐시 규칙 변경은 **기존 사용자 브라우저의 캐시 전환**을 수반한다. `cacheName`을 새로 만들므로 구 캐시는 `cleanupOutdatedCaches`로 정리되나, 첫 방문 시 사전 재조회가 발생한다(성능 일시 저하).
4. bolls.life 의존 자체는 남는다. 근본 해소(로컬 BDB 데이터셋)는 라이선스·Source Gate 심사가 필요한 데이터 작업이며 별도 lane 소관이다.
5. `ApprovedKoreanLexiconPane`·`LexiconTranslationDrawer`와 렌더 로직이 중복될 수 있다. 공통 컴포넌트로 추출하면 두 파일이 범위에 추가되는데, 이는 자비스 lane이 최근 건드린 파일(`609b8a77`)이라 **이번 사이클에서는 건드리지 않고** 중복을 허용한다. 통합은 후속 과제.

## 8. 사용자 착수 승인 조건 (2026-08-14)

| # | 조건 | 반영 위치 |
|---|---|---|
| 1 | SW 캐시 변경은 **사전 캐시 분리 + `statuses`에서 `0` 제거까지만**. 절 본문 캐시 동작은 건드리지 말 것 | 3.4 (허용 변경 2가지 명시, 나머지 규칙 수정 금지) · 4-5 (diff 직접 확인) |
| 2 | 기존 **BibleHub·TWOT 링크**와 **`📚 한글 사전` 드로어**를 회귀 없이 보존하고 agy 검증 케이스에 포함 | 4-T5 · 4-T6 |
| 3 | **히브리어 BDB 정상 / 히브리어 BDB 실패 폴백 / 헬라어 / 한글 승인본 보유(H776) / 미승인** 각 1개 이상 실측 | 4-T1~T4 (미승인 히브리어는 T1·T2에서 사용) |
| 4 | 완료 후 **Draft PR**. 병합과 실기 확인은 사용자가 수행 | 7절 · 사이클 종료 절차 |

**사이클 종료 절차**: 04-decision 기록 → Draft PR(기존 #371 재사용 또는 신규) → PR CI의 **CodeQL 확인** → **`merged_by` 점검** → 노션 브리핑 기록. **0-lead는 병합하지 않는다.**
