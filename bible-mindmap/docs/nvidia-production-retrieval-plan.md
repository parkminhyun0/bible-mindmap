# P1-2 · 2048차원 production 검색 인덱스와 Reranker 계약

기준 main: `280c37ade12d082b144b99ffc96da89c0c42a77c`  
상태: P1-2a 계약 완료 · P1-2b 실제 endpoint 보정 중  
운영 DB/production 인덱스 변경: 없음

## 결정 배경

실제 NVIDIA Dimension Bake-off run `30842224158`에서 `nvidia/llama-nemotron-embed-1b-v2`의 2048차원이 384차원보다 Recall@3, nDCG@3, hard-negative 오탐률, multi-hop Recall@3에서 우수했다. 따라서 production 검색 인덱스의 유일한 승인 기준은 다음과 같다.

- provider: `nvidia`
- embedding model: `nvidia/llama-nemotron-embed-1b-v2`
- dimension: `2048`
- encoding: `float32`
- 승인된 문서만 포함
- 모든 문서는 최소 1개 이상의 `sourceRefs` 보존
- source commit, corpus revision, 문서 ID checksum 기록
- 사람 승인 전 `productionActivated: false`

## 검색 파이프라인

```text
사용자 질의
→ NVIDIA query embedding 2048차원
→ keyword ranking
→ vector ranking
→ RRF Hybrid 후보 Top 20
→ NVIDIA text reranker 후보 Top 20 재평가
→ 최종 Top 5
→ 원래 Hybrid 순위·점수·출처와 reranker logit을 함께 반환
```

Reranker는 Hybrid 검색을 대체하지 않는다. Hybrid가 서로 다른 검색 신호를 모으고, Reranker는 그 제한된 후보 안에서 질의와 문서의 직접 관련도를 다시 평가한다.

## Reranker 정책

- 기본 모델: `nvidia/llama-nemotron-rerank-1b-v2`
- NVIDIA hosted Build API endpoint: `https://ai.api.nvidia.com/v1/retrieval/nvidia/llama-nemotron-rerank-1b-v2/reranking`
- self-hosted NeMo Retriever NIM endpoint: `<NIM_BASE>/v1/ranking`
- self-hosted 또는 별도 endpoint는 `NVIDIA_RERANKER_URL`로 전체 URL을 명시
- Embedding/LLM의 `NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1`을 Reranker 주소로 재사용하지 않음
- query: text 1건
- passages: 최대 50건, production 기본 shortlist는 20건
- truncate: `NONE`
- 응답: 모든 passage의 고유 index와 finite logit 필요
- 중복·누락·범위 밖 index는 하드 실패
- 원래 Hybrid rank와 모든 `sourceRefs`를 보존
- 브라우저 `src/`에서 NVIDIA endpoint 직접 호출 금지
- API key는 서버/GitHub Actions Secret에서만 사용

공식 근거:
- NVIDIA Retrieval Models: https://build.nvidia.com/explore/retrieval
- Hosted NeMo Retriever quickstart: https://docs.nvidia.com/nemo/retriever/26.5.0/reference/retriever-cli-quickstart/
- Self-hosted Reranking OpenAI API: https://docs.nvidia.com/nim/nemo-retriever/text-reranking/latest/use-the-api-openai.html

## P1-2b 첫 실제 실행에서 발견된 문제

수동 run `30864810255`에서 Embedding과 Hybrid 기준선은 정상 작동했다.

- Hybrid Recall@3: `1.0000`
- Hybrid MRR: `1.0000`
- Hybrid nDCG@3: `0.99498`
- Hybrid hard-negative rate: `0.1875`
- Embedding total tokens: `1029`

그러나 Reranker 16건이 모두 `HTTP 404`로 실패했다. 원인은 모델 품질이 아니라 Reranker 요청을 Embedding용 호스트 `https://integrate.api.nvidia.com/v1/ranking`으로 보낸 URL 계약 오류였다. 보고서 artifact는 정상 보존됐으며 운영 DB와 production index는 변경되지 않았다.

보정 원칙:

1. hosted Build API와 self-hosted NIM endpoint를 별도 정책으로 관리한다.
2. hosted 기본값은 `ai.api.nvidia.com/.../reranking` 전체 URL이다.
3. `NVIDIA_RERANKER_URL`이 있으면 해당 전체 URL을 명시적으로 사용한다.
4. URL은 HTTPS를 기본으로 하고 loopback 개발만 HTTP를 허용한다.
5. Embedding의 `NVIDIA_BASE_URL` 변경이 Reranker endpoint를 바꾸지 못하게 한다.

## 실패 정책

Reranker 실패를 조용히 숨기지 않는다. 계약 위반과 provider 오류는 명시적 실패로 처리한다. 실제 앱 적용 단계에서는 다음 두 모드를 별도 승인한다.

1. strict: reranker 실패 시 검색 요청 실패
2. degraded: 검증된 Hybrid 결과를 반환하되 `rerankerStatus: degraded`와 원인을 기록

기본 production 정책은 사용자 검색 지속성을 위해 degraded 후보를 검토하되, 실패율·지연시간·오탐률 측정 전에는 확정하지 않는다.

## 단계별 도입

### P1-2a · 완료

- production index manifest 계약
- 2048차원·승인 문서·출처·checksum 하드 게이트
- Reranker request/response 계약
- NVIDIA server-only adapter
- mock 재정렬·오류 계약 검증
- 운영 변경 없음

### P1-2b · 현재 단계

- 12문서·16질의 Hybrid shortlist 생성
- 실제 NVIDIA reranker endpoint 수동 PoC
- Hybrid-only와 Hybrid+Reranker 품질 비교
- Recall@3, MRR, nDCG@3, hard-negative rate, p95 latency, token usage 측정
- direct/semantic/multi-hop segment별 회귀 확인
- 첫 run의 hosted endpoint 404 보정 후 재실행

### P1-2c · 승인 후 단계

- 승인 corpus 전체에 2048차원 index artifact 생성
- checksum·source revision·모델·차원 manifest와 함께 보관
- 배포 전 shadow 검색
- 기존 검색과 결과 비교 로그
- 사용자 승인 후 production activation PR

## 승인 기준

Reranker 도입은 다음을 모두 만족할 때만 허용한다.

- Hybrid 대비 Recall@3 회귀 없음
- MRR 또는 nDCG@3 개선
- hard-negative rate 악화 없음
- multi-hop Recall@3 회귀 없음
- 실패율 0% 또는 명시적 degraded 정책 검증
- p95 latency가 정한 예산 안에 있음
- sourceRefs, 원래 Hybrid rank, 모델·request ID 추적 가능
- 운영 DB와 승인 데이터 자동 변경 없음

## 현재 결론

2048차원 production index 구조는 유지한다. 첫 Reranker 실측 실패는 검색 품질 문제가 아니라 hosted endpoint 분리 누락에서 발생했으며, URL 계약을 보정한 뒤 실제 API를 다시 측정한다. 품질이 검증되기 전에는 라이브 검색에 연결하지 않는다.
