<!-- 이 템플릿은 자동으로 표시됩니다. AI 에이전트가 PR을 열 때도 채워집니다. -->

## 요약


## 아키텍처 원칙 준수 (필수 · CI가 자동 검증)

`bible-mindmap/AGENTS.md`를 읽고 진행했다는 전제로 아래를 체크합니다.

- [ ] `predev`/`prebuild` 또는 어떤 빌드 스크립트도 tracked 소스(`src/`·`index.html`·`package.json`·`vite.config.js`)를 in-place 편집하지 않음
- [ ] UI/설계 변경은 **소스를 직접 편집**해 커밋 (patch 스크립트로 우회하지 않음)
- [ ] `predev`/`prebuild`는 읽기전용 verifier만 실행 (`verify-*`·`audit-*`)
- [ ] 데이터 생성물은 `public/data/*` 또는 `dist/*`에만 기록
- [ ] Vite alias로 데이터 소스를 은닉하지 않음 (실제 경로 직접 import)
- [ ] 로컬 `npm run build` 2회 연속 실행 시 워킹트리 STABLE (소스 무변형)

## 검증

- [ ] 로마서 gold standard 불변 (`pivots=12`·`arcs=8`·`chapterAgenda=16`)
- [ ] `npm run build` 통과 · `oxlint` clean
- [ ] `npm run verify:deploy`로 라이브 반영 확인 예정 (배포 후)

## Notion 동기화 (릴리스 시)

- [ ] 관련 설계 페이지 + 당일 수정 기록에 구현/검증/배포 구분 기록
- [ ] **최상위 대시보드** 🔴 LIVE 콜아웃 갱신 (마지막 단계)
- [ ] 기능/파일 구조 변경 시 🗺️ 기능 구조도 · 📂 로컬 파일 구조 갱신

---

⚠️ **위반 시 CI post-build `guard-no-source-mutation.mjs`가 배포를 자동 차단합니다.**
