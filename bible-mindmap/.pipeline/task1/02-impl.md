# task1 · 1-run 구현 결과

## 구현 요약

- `src/utils/strongLink.js` (신규)
  - Strong 번호의 공백·대소문자 접두사·선행 0을 정규화하는 `strongNumberForExternalLink`를 추가했다.
  - 숫자 접미사를 보존하고, 숫자가 없거나 전부 0인 무효 입력은 빈 문자열로 처리한다.
  - 정규화 결과로 히브리어/헬라어 BibleHub URL을 만드는 `biblehubStrongUrl`을 추가했다.
- `src/components/WordSearchModal.jsx`
  - 두 BibleHub 링크의 기존 표시 텍스트·스타일·레이아웃을 유지하고 `href`만 `biblehubStrongUrl` 결과로 교체했다.
  - 헬퍼가 빈 문자열을 반환하면 링크를 렌더링하지 않도록 기존 조건을 보강했다.
- `src/utils/lexicon.js`
  - `linkifyDefinition`의 Strong 패턴을 1~5자리와 알파벳 접미사까지 지원하도록 확장했다.
  - H/G 링크 경로를 `strongNumberForExternalLink` 결과로 만들고, 무효 결과는 원문을 유지한다.
  - 정적 계약에 따라 기존 청크 인덱스 계산에 남아 있던 `replace(/^[GH]/, '')`도 같은 헬퍼로 통일했다.
  - TWOT 치환 규칙은 변경하지 않았다.
- `scripts/verify-strong-external-link-policy.mjs` (신규)
  - 명세의 정규화 13건, URL 3건 및 두 호출부의 정적 계약을 검증한다.
  - 직접 접두사 제거 패턴 잔존과 헬퍼를 거치지 않는 Strong BibleHub URL을 실패 처리한다. TWOT URL은 예외로 유지한다.
- `package.json`
  - `verify:strong-link` 스크립트 한 줄을 추가했다. `prebuild`와 `predev`는 변경하지 않았다.

## 검증 결과

- `node scripts/verify-strong-external-link-policy.mjs`: PASS — 16개 동작 케이스 및 정적 계약 통과.
- `npm run verify:strong-link`: PASS — 동일 정책 검증 통과.
- `npx oxlint`: 실행 환경 제한으로 미실행 — 로컬 `node_modules/.bin/oxlint`가 없고 npm 레지스트리 조회가 네트워크 DNS 제한(`ENOTFOUND registry.npmjs.org`)으로 실패했다. 구현 lint 오류 판정은 아님.
- `node scripts/verify-mobile-safety.mjs`: PASS — 모바일 안전·성능 규칙 통과.
- `node scripts/verify-korean-gloss.mjs`: PASS — 144항목·73개념 구조/과병합 가드 통과(기존 개념 불균형 경고 2건).
- `node scripts/verify-translation-alignment.mjs`: PASS — regression=29, committedRecords=52, legacyPilotFiles=1, manifestFiles=1.
- `git diff --check`: PASS.
- 변경 범위 확인: 허용된 5개 구현 파일과 `.pipeline/task1/**` 산출물만 변경했다. 금지 경로 및 `LexiconPopup.jsx`는 수정하지 않았다.

## 후속 확인 권장

- 배포 후 `H0776` 계열 외부 링크가 실제 BibleHub `/hebrew/776.htm` 페이지로 이동하는지 사용자 확인을 권장한다.
- 2-review 환경에 oxlint가 설치되어 있거나 네트워크가 허용되면 `npx oxlint`를 재실행해야 한다.

git commit 및 push는 수행하지 않았다.
