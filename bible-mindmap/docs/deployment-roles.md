# 배포 역할 분리

## 운영 원칙

- **GitHub Pages**는 랜딩페이지와 공개 앱의 유일한 주 운영 배포입니다.
- **Vercel**은 서버 전용 API, NVIDIA shadow 검증, 제한된 Preview 실험에만 사용합니다.
- 일반 UI·콘텐츠·스타일 변경은 Vercel 빌드를 발생시키지 않습니다.

## GitHub Pages

다음 변경은 `main` 병합 후 GitHub Pages에서 빌드·회귀검증·배포·Live SHA 검증을 수행합니다.

- 공개 랜딩 및 앱 UI
- 성경·원어·정경 데이터
- 검색·팝업·모바일 UX
- 일반 정적 자산과 문서

## Vercel

다음 서버 경계 변경에만 자동 빌드를 허용합니다.

- `api/**`
- `src/data/canonicalConcepts.js`
- `package.json`, `package-lock.json`
- `vercel.json`
- `scripts/vercel-should-build.mjs`

Vercel 오류나 사용량 제한은 GitHub Pages의 공개 운영 완료 판정을 막지 않습니다. 다만 서버 API를 변경한 작업은 Vercel Preview 또는 Production 검증이 끝날 때까지 해당 서버 기능만 검증 대기로 기록합니다.

## 완료 판정

- 공개 UI 작업: GitHub Pages + Live SHA 성공 시 95%, 사용자 확인 시 100%
- Vercel 서버 작업: GitHub Pages 상태와 별도로 Vercel 함수·Secret·kill switch 검증 필요
