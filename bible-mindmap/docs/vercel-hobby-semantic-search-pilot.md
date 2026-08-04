# Vercel Hobby 의미 검색 pilot

기준일: 2026-08-04

## 목적

현재 키워드 검색을 그대로 유지하면서 NVIDIA 2048차원 embedding을 Vercel 서버 함수에서만 호출해 실제 체감 가치와 운영 지표를 확인한다.

## 현재 단계

- 서버 경계와 안전 계약만 추가
- 기본 kill switch는 OFF
- NVIDIA Secret이 없으면 자동 fallback
- shadow 결과는 사용자 검색 결과를 바꾸지 않음
- reranker는 사용하지 않음
- 운영 DB와 canonical 데이터 쓰기 없음

## Vercel 환경변수

- `NVIDIA_SEMANTIC_SEARCH_ENABLED=false` 기본값 유지
- `NVIDIA_API_KEY` 서버 Secret
- `NVIDIA_EMBEDDING_MODEL=nvidia/llama-nemotron-embed-1b-v2`
- `NVIDIA_EMBEDDING_ENDPOINT=https://integrate.api.nvidia.com/v1/embeddings`
- `NVIDIA_TIMEOUT_MS=1800`

브라우저 공개 변수인 `VITE_*` 또는 `NEXT_PUBLIC_*`에는 NVIDIA Key를 넣지 않는다.

## 체감 평가 순서

1. Preview에서 GET `/api/semantic-search`로 kill switch와 Secret 준비 상태를 확인한다.
2. 관리자 shadow 요청으로만 24개 고정 평가 질의와 실제 연구 질의를 실행한다.
3. 기존 keyword 결과와 semantic 후보의 유용성, 누락, 오탐, 응답 지연을 비교한다.
4. 실제 연구 흐름에서 도움이 된 사례와 방해된 사례를 별도로 기록한다.
5. 수치와 체감이 모두 개선될 때만 최대 5% canary 연결을 검토한다.

## 승격 조건

- Recall@3 >= 0.80
- MRR >= 0.75
- nDCG@3 >= 0.78
- hard-negative rate <= 0.35
- failure rate <= 0.02
- p95 latency <= 1200ms

## 즉시 중단 조건

- Secret 노출 가능성
- 비용 또는 rate limit 이상
- p95 또는 실패율 기준 초과
- 결과가 원어·정경 연구를 반복적으로 오도함
- 운영 DB 또는 사용자 데이터 쓰기 시도

중단 시 `NVIDIA_SEMANTIC_SEARCH_ENABLED=false`로 전환하고 기존 keyword 검색만 사용한다.
