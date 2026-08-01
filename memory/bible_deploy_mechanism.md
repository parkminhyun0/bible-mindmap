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
