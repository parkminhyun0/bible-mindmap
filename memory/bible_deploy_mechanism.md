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
- **앱 셸은 Pages, 대용량 데이터는 CDN**. lex·strongs·strongs-def·variants·places DB 등 대용량 정적 데이터를 Pages 아티팩트에서 분리해 **jsDelivr `@<tag>` 참조**로 전달한다. (59MB 아티팩트 → Pages 배포 타임아웃 원천 해결)
- **설정 지점**: 빌드 시 `VITE_DATA_BASE_URL`(예: `https://cdn.jsdelivr.net/gh/parkminhyun0/bible-mindmap@data-v1/bible-mindmap/public/`). 미설정이면 앱 동일출처(`BASE_URL`)로 자동 회귀 → 로컬/개발 동작 불변.
- **단일 출처 리스크 제거 = 2차 미러 런타임 폴백**(`src/config/dataBase.js`). 1차 jsDelivr 실패 시 **동일 tag 기준 Statically → GitHub raw → 앱 동일출처** 순으로 자동 재시도. jsDelivr `@tag` 참조면 미러 자동 유도, `VITE_DATA_BASE_URL_MIRROR`로 수동 지정도 가능. `abort`는 폴백 없이 즉시 전파.
- **데이터 fetch는 반드시 `resilientFetch`/`fetchData` 경유**(dataBase.js). 신규 대용량 데이터 로딩 코드도 이 헬퍼를 쓴다. 외부 API(bolls·wikidata 등)·동일출처는 그대로 통과.
- **태그는 불변**: jsDelivr는 tag를 영구 캐싱하므로 `@data-v1`은 스테일 없음. 데이터 변경 시 **새 tag 발행 + 빌드 env 갱신**([[bible-release-workflow]] 데이터 릴리스 절차).
