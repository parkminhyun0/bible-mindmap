---
name: bible-deploy-mechanism
description: 성경 마인드맵 실제 배포 경로 = GitHub Actions 워크플로우 (gh-pages 브랜치 푸시 아님) · CI 의존성 함정
metadata:
  type: project
---

성경 마인드맵 라이브 배포의 실제 동작. 관련: [[bible-release-workflow]] [[bible-notion-map]]

- **실제 배포 = `.github/workflows/deploy.yml`** ("Deploy to GitHub Pages", Pages `build_type=workflow`). `main` push 시 트리거: npm ci → lexicon/apparatus 파서 → `npm run build` → upload-pages-artifact → deploy-pages.
- **`npm run deploy`(gh-pages 브랜치 푸시)는 이 설정에서 무의미** — 착각하지 말 것. 배포 성사는 워크플로우 성공으로만 판정.
- **CI 함정**: `vite.config.js`/앱이 import하는 패키지는 반드시 `package.json`에 선언돼야 함. 로컬 node_modules에만 있고 미선언이면 로컬 빌드는 통과, CI `npm ci`는 실패. (2026-07-29 `@vitejs/plugin-react` 미선언으로 하루 배포 실패 → `d01dfcc` 복구)
- **확인 방법**: `gh run watch <id> --exit-status` + `npm run verify:deploy`(라이브 version.json commit vs 로컬 HEAD). 앱 [사용법] 타이틀바 `build <sha>` 배지로 육안 확인. `gh api .../pages/builds/latest`는 workflow 방식에서 옛 날짜 표시하니 신뢰 X.

## 데이터 전달 표준 = A안 (jsDelivr CDN 오프로드 + 2차 미러 폴백) · 확정 2026-08-07
- **앱 셸은 Pages, 대용량 데이터는 CDN**. lex·strongs·strongs-def·variants·places DB 등 대용량 정적 데이터는 **`data-dist` 브랜치에 발행**되어 jsDelivr 로 서빙된다. Pages 아티팩트에서는 제외(`deploy.yml`의 "Offload large data" 단계가 `dist/app/data/lex|strongs|strongs-def|variants` + `biblical-places-db.json` 삭제) → 59MB 문제 원천 해결. (소용량 places fallback·context 등은 아티팩트에 유지)
- **CDN 베이스 자동 주입 (수동 tag/env 편집 없음)**: `deploy.yml`의 "Resolve data-dist CDN base" 단계가 `git ls-remote origin data-dist`로 **최신 data-dist 커밋 SHA를 자동 resolve**해 `VITE_DATA_BASE_URL=https://cdn.jsdelivr.net/gh/<repo>@<DATA_SHA>/` 를 주입한다. data-dist 브랜치 없으면 빌드 실패(발행 필요). `VITE_DATA_BASE_URL` 미설정(로컬/개발)이면 앱 동일출처(`BASE_URL`)로 자동 회귀 → 기존 동작 불변.
- **불변성은 커밋 SHA로 보장**: jsDelivr는 `@<commit-sha>`를 영구 캐싱하므로 스테일 없음. data-dist에 새로 발행하면 SHA가 바뀌고 다음 앱 빌드가 그 SHA를 자동으로 가리킨다(별도 태그·env 갱신 불필요).
- **단일 출처 리스크 제거 = 2차 미러 런타임 폴백**(`src/config/dataBase.js`). 1차 jsDelivr 실패 시 **동일 SHA 기준 Statically → GitHub raw → 앱 동일출처** 순으로 자동 재시도. jsDelivr `@<ref>` 참조면 미러 자동 유도, `VITE_DATA_BASE_URL_MIRROR`로 수동 지정도 가능. `abort`는 폴백 없이 즉시 전파.
- **데이터 fetch는 반드시 `resilientFetch`/`fetchData` 경유**(dataBase.js). 신규 대용량 데이터 로딩 코드도 이 헬퍼를 쓴다. 외부 API(bolls·wikidata 등)·동일출처는 그대로 통과.
- 데이터 릴리스(발행) 절차: [[bible-release-workflow]].
