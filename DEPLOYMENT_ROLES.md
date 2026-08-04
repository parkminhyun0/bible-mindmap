# 성경 마인드맵 배포·서버 역할 기준

이 문서는 `<성경 마인드맵>`의 공식 배포 경로와 서버 역할을 고정한다. NVIDIA 의미 검색 관련 구현·리뷰·배포는 이 기준을 우선 적용한다.

## 공식 역할

### GitHub Pages

- 사용자 화면과 정적 앱의 공식 배포 경로다.
- React/Vite 빌드 결과, PWA, 정적 데이터, 검색 UI와 fallback을 제공한다.
- NVIDIA API를 직접 호출하지 않는다.
- NVIDIA API Key를 포함하거나 공개 환경변수로 전달하지 않는다.

### Cloudflare Worker

- `[NVIDIA 의미 검색 비교]`의 공식 실시간 보안 백엔드다.
- GitHub Pages에서 전달된 요청의 Origin, 입력 길이와 요청 형식을 검증한다.
- NVIDIA API Key는 Worker Secret으로만 읽는다.
- NVIDIA 임베딩 API를 호출하고 의미 유사도를 계산해 상위 정경 개념 후보를 반환한다.
- 공급자 오류, 시간 초과, 한도 초과 또는 응답 검증 실패 시 명확한 오류를 반환한다.
- 검색 원문, 개인 메모, 사용자 식별자를 영속 저장하지 않는다.

### NVIDIA Build API

- 검색어와 정경 개념 후보의 임베딩 생성 및 의미 비교에 사용한다.
- 현재 기본 모델은 `nvidia/llama-nemotron-embed-1b-v2`다.
- NVIDIA 결과는 후보 순위 산출에만 사용하며 운영 성경 데이터나 신학 데이터를 자동 수정하지 않는다.

### GitHub Actions

- 의존성·보안·데이터 정합성·브라우저 회귀 검증을 수행한다.
- GitHub Pages 빌드와 배포를 담당한다.
- 필요할 경우 사전 색인 생성, 평가 corpus 실행, Recall·MRR·nDCG·hard-negative 품질 평가를 수행한다.
- Secret을 빌드 산출물이나 로그에 노출하지 않는다.

### Vercel

- `[NVIDIA 의미 검색 비교]`의 공식 배포 또는 백엔드 경로로 사용하지 않는다.
- 기존 Vercel pilot과 `/api/semantic-search` 기록은 과거 실험 자료로만 보존한다.
- Vercel 상태 실패는 GitHub Pages 및 Cloudflare Worker 기반 기능의 완료 판단 기준에 포함하지 않는다.

## 표시 규칙

- 실제 Cloudflare Worker에서 NVIDIA API 호출이 성공하고 검증된 후보가 반환됐을 때만 화면에 `[NVIDIA 의미 검색 비교]`라고 표시한다.
- 로컬 규칙 기반 의미 확장, 키워드 재정렬 또는 정적 추천을 NVIDIA 결과로 표시하지 않는다.
- Worker 미연결·Secret 누락·NVIDIA 오류 상태에서는 `NVIDIA 서버 연결 필요`, `NVIDIA 비교 일시 중단` 등 실제 상태를 표시한다.
- NVIDIA 비교 실패 시 기존 정적 키워드 검색 결과를 유지한다.

## 요청 흐름

1. 사용자가 GitHub Pages 검색창에 검색어를 입력한다.
2. 프런트엔드는 정적 키워드 검색 결과와 제한된 비교 후보 문장을 준비한다.
3. 프런트엔드는 Cloudflare Worker의 비교 endpoint로 검색어와 후보를 전송한다.
4. Worker는 요청을 검증하고 NVIDIA API로 임베딩을 생성한다.
5. Worker는 코사인 유사도를 계산하고 상위 후보만 반환한다.
6. 프런트엔드는 공급자, 모델, 지연시간, 유사도와 후보를 표시한다.
7. 오류가 발생하면 정적 검색을 유지하고 NVIDIA 결과를 숨긴다.

## 보안 하드 게이트

- 브라우저, 저장소, 빌드 결과에 NVIDIA API Key 금지
- `VITE_*`, `NEXT_PUBLIC_*` 등 공개 변수에 Secret 금지
- Worker Secret 외 저장 금지
- 허용된 GitHub Pages Origin만 브라우저 CORS 접근 허용
- 입력 길이, 후보 수와 응답 크기 제한
- 외부 응답 구조와 임베딩 차원 검증
- 개인 메모·사용자 식별자·검색 기록 영속 저장 금지

## 변경 절차

이 역할 분리를 변경하려면 다음을 모두 갱신해야 한다.

1. 이 문서
2. Notion `성경 마인드맵 개발 전용 운영 체계`
3. Notion `기능 강화 및 기능 향상을 위한 NVIDIA Build API 활용`
4. 관련 기능 카드와 PR 설명
5. 보안·회귀 검증

문서와 코드가 충돌할 경우 실제 Secret 보호와 사용자 데이터 안전을 우선하며, 임의로 NVIDIA 명칭을 붙이지 않는다.
