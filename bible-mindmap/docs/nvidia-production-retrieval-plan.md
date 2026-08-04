# P1-2 · 2048차원 production 검색 인덱스 계획

기준 main: `85fd373265bb175f32db07e1b74d3b83f4aec490`  
상태: P1-2a 계약 완료 · P1-2b 실제 Reranker 평가 완료 · **Hybrid-only 선택**  
운영 DB/production 인덱스 변경: 없음

## 1. 확정된 production 검색 기준

실제 NVIDIA Dimension Bake-off run `30842224158`에서 `nvidia/llama-nemotron-embed-1b-v2`의 2048차원이 384차원보다 Recall@3, nDCG@3, hard-negative 오탐률, multi-hop Recall@3에서 우수했다.

production 검색 인덱스의 승인 기준은 다음과 같다.

- provider: `nvidia`
- embedding model: `nvidia/llama-nemotron-embed-1b-v2`
- dimension: `2048`
- encoding: `float32`
- 승인된 문서만 포함
- 모든 문서는 최소 1개 이상의 `sourceRefs` 보존
- source commit, corpus revision, 문서 ID checksum 기록
- 사람 승인 전 `productionActivated: false`

## 2. 선택된 검색 파이프라인

```text
사용자 질의
→ NVIDIA query embedding 2048차원
→ keyword ranking
→ vector ranking
→ RRF Hybrid
→ 최종 결과
```

현재 production 후보에는 Reranker를 포함하지 않는다.

## 3. Reranker 실제 평가 결과

두 번째 실제 run `30865836689`에서는 hosted endpoint와 응답 형식이 정상 작동했고, 16건의 Reranker 요청이 모두 성공했다. 따라서 아래 결과는 인프라 오류가 아니라 실제 품질 비교 결과다.

| 지표 | Hybrid-only | Hybrid + Reranker |
|---|---:|---:|
| Recall@3 | 1.0000 | 0.96875 |
| MRR | 1.0000 | 1.0000 |
| nDCG@3 | 0.99498 | 0.97582 |
| hard-negative rate | 0.1875 | 0.2500 |
| failure rate | 0% | 0% |
| p95 latency | 15.85ms | 277.99ms |
| multi-hop Recall@3 | 1.0000 | 0.83333 |
| multi-hop nDCG@3 | 0.97324 | 0.87105 |

추가 사용량:

- Embedding tokens: 1,029
- Reranker tokens: 14,788
- 총 tokens: 15,817
- Reranker 요청: 16건

Reranker는 MRR을 유지했지만 Recall, nDCG, hard-negative 통제, multi-hop 검색, 지연시간에서 기준선을 악화시켰다.

## 4. Reranker 정책

- 평가 모델: `nvidia/llama-nemotron-rerank-1b-v2`
- 상태: `hold-production`
- production eligible: `false`
- production activated: `false`
- 수동 연구·재평가만 허용
- 브라우저 직접 호출 금지
- API key는 서버/GitHub Actions Secret에서만 사용
- 운영 DB와 production index 자동 변경 금지

hosted endpoint와 self-hosted NIM endpoint는 분리 유지한다.

- hosted: `https://ai.api.nvidia.com/v1/retrieval/nvidia/llama-nemotron-rerank-1b-v2/reranking`
- self-hosted: `<NIM_BASE>/v1/ranking`
- 별도 endpoint는 `NVIDIA_RERANKER_URL` 전체 URL로 명시

## 5. 단계별 진행

### P1-2a · 완료

- production index manifest 계약
- 2048차원·승인 문서·출처·checksum 하드 게이트
- Reranker request/response 계약
- NVIDIA server-only adapter
- 운영 변경 없음

### P1-2b · 완료

- 12문서·16질의 실제 Hybrid 대 Reranker 비교
- hosted endpoint 보정
- Recall@3, MRR, nDCG@3, hard-negative, latency, token 사용량 측정
- direct/semantic/multi-hop segment별 회귀 확인
- 실측 결과에 따라 Reranker production 도입 보류
- 영구 evidence와 artifact digest 보존

### P1-2c · 다음 단계

Reranker 없이 2048차원 Hybrid-only shadow index를 구축한다.

- 승인 corpus 전체의 embedding index artifact 생성
- source revision·model·dimension·checksum manifest 보존
- keyword/vector/RRF 결과를 shadow 환경에서 기록
- 기존 검색과 결과 비교 로그 생성
- 검색 실패·오탐·지연·출처 보존 검증
- 사용자 승인 후에만 production activation PR 진행

## 6. Reranker 재평가 조건

다음 조건이 충족되기 전에는 production 도입을 재개하지 않는다.

- 새로운 Reranker 모델 또는 명확한 버전 개선
- 한국어·성경 domain에 맞춘 모델 개선
- 최소 100개 이상의 독립 평가 질의와 사람 판정 데이터
- Hybrid 대비 Recall·nDCG·hard-negative·multi-hop 회귀 없음
- 최소 1개 이상의 명확한 품질 개선
- latency와 token 비용이 운영 예산 이내

## 7. 영구 근거

- 차원 결정: `docs/evidence/nvidia-embedding-dimension-bakeoff-30842224158.json`
- Reranker 결정: `docs/evidence/nvidia-reranker-poc-30865836689.json`
- 사람이 읽는 결정서: `docs/nvidia-reranker-decision.md`

## 현재 결론

`nvidia-hybrid-2048`을 production 검색 후보로 유지한다. Reranker는 실제 endpoint에서 정상 작동했지만 현재 평가 corpus에서 품질과 비용 이점이 없으므로 production에 연결하지 않는다. 다음 단계는 2048차원 Hybrid-only shadow index 구축과 확대 평가다.
