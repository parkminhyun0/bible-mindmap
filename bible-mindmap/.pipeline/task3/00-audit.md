# UI Quality Upgrade v1 · Phase A 감사

> 노션 [🚦 UI Quality Upgrade v1 · 개발 준비 패킷] §5 의 **A · Audit** 단계 산출물.
> 코드는 한 줄도 변경하지 않았다. 실측과 판단만 담는다.
>
> 감사 시점 2026-08-19 KST · 대상 `src/` (CSS 10개 · JS/JSX 222개)
> 기준 커밋 `91f79b5d` (준비 패킷 SHA `32b836f2` + 1커밋)

## 요약 — 패킷의 전제가 실측과 다르다

준비 패킷은 Phase B(Motion Token 2.0)와 C(모션 부채 정리)를 첫 작업으로 잡았다.
그 전제는 "`transition: all` 남용, 과한 duration, reduced-motion 누락"이었다.
**실측해 보니 대부분 이미 정리돼 있다.** B·C 를 지금 착수하면 회귀 위험만 사고
실익이 적다.

대신 **접근성에서 실제 결함 한 건**이 나왔다. 이것이 이번 v1 의 최우선이어야 한다.

---

## 1. 모션 부채 — 예상보다 적다

| 항목 | 패킷의 가정 | 실측 | 판정 |
|---|---|---|---|
| `transition: all` | 남용 | **CSS 0건 · JSX 인라인 6건** | 경미 |
| 과한 duration(400ms+) | 있음 | **0건** (검출된 건 전부 디바운스 주석) | 없음 |
| `prefers-reduced-motion` | 누락 | **전역 차단 + 컴포넌트별 4곳** | 이미 충분 |
| `animation` 선언 | — | 6건 | 경미 |
| `scale(0.x)` | 있음 | 4건 | 경미 |

### 1-1. CSS 의 transition 은 이미 속성을 특정하고 있다

CSS 파일 10개의 `transition` 선언 **17건**이 다루는 속성:

```
background 9 · transform 9 · box-shadow 6 · none 4
border-color 3 · filter 3 · color 3 · opacity 2
```

`all` 이 없다. 애니메이션할 속성을 골라 쓰고 있다 — 패킷이 정리 대상으로 본
바로 그 상태가 이미 달성돼 있다.

### 1-2. `transition: all` 은 JSX 인라인에만 6건

| 파일·라인 | 값 |
|---|---|
| `src/components/CanonicalConceptModal.jsx:433` | `transition: 'all .15s'` |
| `src/components/ContextBibleModal.jsx:1265` | `transition:'all .12s'` |
| `src/components/ContextBibleModal.jsx:1359` | `transition:'all .12s'` |
| `src/components/ContextBibleModal.jsx:1422` | `transition:'all .15s'` |
| `src/components/ParallelStudyScaffolding.jsx:436` | `transition: 'all .25s ease'` |
| `src/components/WordSearchModal.jsx:740` | `transition:` (boxShadow 조건부와 함께) |

전부 120~250ms 로 짧다. `all` 이 이론적으로는 나쁘지만, 이 값들은 체감 문제를
일으키는 수준이 아니다. **단독 PR 로 다룰 가치는 낮고, 해당 컴포넌트를 다른
이유로 손댈 때 곁들여 정리하는 것이 맞다.**

> 참고 — JSX 인라인 `transition:` 총 92건 중 **39건은 `src/data/biblicalPeriods.js`
> 의 데이터 키**(`transition:` = 전환기)이지 CSS 가 아니다. 실제 UI 인라인 전환은
> 약 53건이다. 자동 스캔만 믿으면 이 39건에 속는다.

### 1-3. reduced-motion 은 이미 전역으로 막혀 있다

`src/index.css:483` 에 전역 차단이 있다.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

여기에 컴포넌트별 보강이 4곳 더 있다 — `index.css:688`(버튼·글래스),
`index.css:890`(모달), `appleCanvas.css:444`(캔버스 노드·엣지),
`appleModalInterior.css:301`(모달 내부 컨트롤).

**패킷 B 단계의 "Reduced Motion 계약"은 사실상 이미 존재한다.**

---

## 2. 접근성 — 여기에 실제 결함이 있다 ★

| 항목 | 실측 |
|---|---|
| `aria-label` | 134건 |
| `role="dialog"` | 33건 |
| `:focus-visible` | 17건 |
| `min-width/height: 44px+` | 16건 |
| `touch-action` | 17건 |
| 44px 미만 터치 타깃 후보 | 1건 (테스트용 CSS, `display:none`) |
| **`forced-colors` 미디어쿼리** | **0건** ← 결함 |

### 2-1. 고대비 모드에서 포커스 표시가 사라진다 (P0)

이 앱의 포커스 링은 `outline: none` + `box-shadow` 조합으로 만들어져 있다.
**Windows 고대비 모드(`forced-colors: active`)는 `box-shadow` 를 강제로 제거한다.**
`outline` 은 이미 `none` 이므로, 키보드 포커스가 어디 있는지 전혀 보이지 않는다.

`src/index.css:643` 은 `:focus-visible` **전역 선택자**라 앱 전체가 영향을 받는다.
시각 보조가 가장 필요한 사용자에게 앱이 사실상 사용 불가가 된다.

대상 4곳:

| 파일·라인 | 내용 | 위험도 |
|---|---|---|
| `src/index.css:643` | `:focus-visible { outline:none; box-shadow: 3.5px 링 }` — **전역** | **높음** |
| `src/theme/appleModalInterior.css:54` | 모달 내 input/select/textarea 포커스 | 높음 |
| `src/theme/markResearchLayerTest.css:20` | 분할선 — 배경색만으로 포커스 표시 | 중간 |
| `src/theme/markResearchThreeColumnDirect.css:68` | 분할선 — 같음 | 중간 |

### 2-2. 건드리면 안 되는 곳 — `outline: none` 이라고 다 문제가 아니다

`outline: none` 총 7건 중 **3건은 정상이거나 위험이 낮다.**

| 파일·라인 | 판정 |
|---|---|
| `src/index.css:536` | ✅ **모범 패턴**. `button:focus:not(:focus-visible)` — 마우스 클릭 때만 링을 숨긴다. 지우면 클릭할 때마다 파란 링이 튄다 |
| `src/App.css:18` | TipTap 편집기. 캐럿이 보이므로 위험 낮음 |
| `src/index.css:544` | 모바일 TipTap. 위험 낮음 |

---

## 3. 성능 — `backdrop-filter` 48건

| 파일 | 건수 |
|---|---|
| `src/theme/appleChrome.css` | 18 |
| `src/index.css` | 16 |
| `src/theme/appleCanvas.css` | 14 |

3개 파일에 집중돼 있다. `backdrop-filter` 는 모바일에서 스크롤·드래그 프레임을
떨어뜨리는 대표 원인이고, `role="dialog"` 가 33개라 **모달이 겹칠 때 중첩 비용**이
커진다. 다만 지금은 **추정일 뿐 실측하지 않았다.** 프로파일링 없이 걷어내면
Apple 시각 파운데이션을 훼손하므로, 반드시 측정 후 판단한다.

### hover 게이팅은 사실상 없다

`@media (hover: hover)` **0건**, `@media (pointer: fine)` **1건**.
터치 기기에서 hover 스타일이 그대로 적용돼 "눌렀는데 hover 상태로 남는" 현상이
생길 수 있다. 다만 실제 증상을 확인하지 않았으므로 **의심 항목**으로만 남긴다.

---

## 4. 로드맵 교정안

| 패킷 단계 | 원래 순서 | 감사 후 판단 |
|---|---|---|
| A · Audit | 1 | **완료** (이 문서) |
| B · Motion Token 2.0 | 2 | **보류** — reduced-motion·속성 특정이 이미 돼 있어 실익 적음 |
| C · 모션 부채 정리 | 3 | **축소** — `all` 6건은 해당 컴포넌트 작업 시 곁들여 처리 |
| — | — | **신규 P0** — 고대비 모드 포커스 복구 (§2-1) |
| — | — | **신규 P1** — `backdrop-filter` 성능 실측 (§3) |
| D · 모바일 직접조작 | 4 | 유지 |
| E · 모달 모션 계약 | 5 | 유지 |
| F · 디자인 계약 문서 | 6 | 유지 |
| G · Visual/A11y QA | 7 | 유지 — 단 §2 결함을 baseline 에 반드시 포함 |

**권장 착수 순서: P0(고대비 포커스) → P1(backdrop-filter 실측) → D → E → F → G**

---

## 5. 감사 방법과 한계

- 정적 스캔(정규식) + 코드 문맥 확인으로 수행했다. **실행 시 동작은 검증하지 않았다.**
- `transition:` 스캔은 데이터 파일의 동명 키에 오염된다. `biblicalPeriods.js` 39건이
  그 예다. 자동 수치를 그대로 믿으면 안 된다.
- `backdrop-filter` 의 성능 영향은 **측정하지 않았다.** §3 은 가설이다.
- hover 게이팅 부재는 **실제 증상을 확인하지 않았다.** 의심 항목이다.

## 6. 이 문서로 하지 않은 것

- 코드·설정·의존성 변경 없음
- 브랜치·PR·CI 변경 없음
- 성경 본문·원어/BDB/Strong·정경·승인 사전·사용자 데이터 접근 없음
