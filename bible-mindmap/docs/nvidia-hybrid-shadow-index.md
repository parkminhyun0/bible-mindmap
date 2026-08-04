# P1-2c · 2048차원 Hybrid-only production shadow index

상태: 코드·mock 검증 단계  
운영 DB 변경: 없음  
production index 활성화: 없음  
라이브 검색 연결: 없음

## 목적

Reranker 실측 run `30865836689`에서 Hybrid+Reranker는 2048차원 Hybrid-only보다 Recall@3, nDCG@3, hard-negative 오탐률, multi-hop 검색, p95 지연에서 악화됐다. 따라서 production 후보 pipeline은 `nvidia-hybrid-2048`로 유지한다.

P1-2c는 이 pipeline을 라이브 앱에 바로 연결하지 않는다. 실제 정경 개념 registry 72개 전체로 별도 shadow index를 생성해 품질·추적성·저장량·재현성을 검증한다.

## Shadow corpus

- 단일 원본: `src/data/canonicalConcepts.js`
- 문서 수: 72개
- 문서 ID: `canonical.<conceptKey>`
- 포함 정보: 한국어 제목, 히브리어·헬라어 표기, Strong 번호, 개혁주의 anchor, 정경 arc 요약, 압축 신학 요약
- 모든 문서는 실제 `canonicalArc.ref`에서 생성한 `sourceRefs`를 최소 1개 이상 보존
- corpus revision: `canonical-concepts-72-v1`
- 문서 순서: concept key 오름차순으로 고정

## 확대 평가

- 질의 수: 24개
- direct: 8개
- semantic paraphrase: 8개
- multi-hop: 8개
- 모든 질의에 hard-negative 지정
- 비교 pipeline:
  1. keyword-only Top-5
  2. keyword + NVIDIA 2048차원 vector RRF Hybrid Top-5
- 지표: Recall@5, MRR, nDCG@5, hard-negative rate, failure rate, segment별 성능, local retrieval latency

## 생성 artifact

수동 workflow `NVIDIA Hybrid Shadow Index`는 다음 파일을 30일 artifact로 보존한다.

1. `shadow-index.json` — 72개 승인 문서와 2048차원 float32 벡터
2. `manifest.json` — 모델, 차원, source commit, corpus revision, 문서 ID checksum, 문서 내용 checksum, vector checksum, 저장량
3. `evaluation.json` — keyword baseline과 Hybrid 결과, segment별 지표, NVIDIA 요청·토큰·지연
4. `summary.json` — 승인 검토용 요약

## 안전 경계

- `workflow_dispatch` 수동 실행만 허용
- `NVIDIA_API_KEY` GitHub Secret 사용
- `contents: read`
- artifact는 `reports/nvidia-hybrid-shadow-index` 아래에서 생성
- 앱의 `public/`, `src/`, 운영 DB에 쓰지 않음
- `shadowOnly: true`
- `liveSearchConnected: false`
- `productionActivated: false`
- 사람 승인 전 승격 금지

## 품질 게이트

- Recall@5 ≥ 0.80
- MRR ≥ 0.75
- nDCG@5 ≥ 0.78
- hard-negative rate ≤ 0.35
- failure rate = 0
- direct Recall@5 ≥ 0.875
- semantic Recall@5 ≥ 0.75
- multi-hop Recall@5 ≥ 0.6875
- keyword baseline 대비 허용 범위를 넘는 회귀 금지
- semantic, multi-hop 또는 hard-negative에서 2048차원 vector의 측정 가능한 기여 필요

게이트가 실패해도 artifact는 먼저 보존하며 production으로 승격하지 않는다.

## 다음 승인 단계

실제 shadow run의 품질과 artifact를 검토한 뒤에만 다음 중 하나를 결정한다.

- 통과: 승인 corpus 확장과 shadow query 확대
- 부분 통과: 질의·문서 구성 보정 후 재실행
- 실패: Hybrid production 후보 보류, keyword-only 유지

통과하더라도 라이브 검색 연결은 별도 구현 PR, degraded/fallback 정책, 사용자 승인, 전체 회귀 검증을 요구한다.
