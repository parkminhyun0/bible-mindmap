# NVIDIA Reranker 실측 결정

결정일: 2026-08-04  
실제 run: `30865836689`  
기준 main: `85fd373265bb175f32db07e1b74d3b83f4aec490`  
상태: **production 도입 보류 · 2048차원 Hybrid-only 유지**

## 1. 평가 조건

- Embedding: `nvidia/llama-nemotron-embed-1b-v2`
- Embedding 차원: `2048`
- Reranker: `nvidia/llama-nemotron-rerank-1b-v2`
- 승인 문서: 12건
- 출처 참조: 36건
- 평가 질의: 16건
- 질의 유형: direct·semantic·multi-hop
- hard-negative: 16건
- 기존 검색: keyword + vector + RRF Hybrid Top-3
- 후보 검색: Hybrid Top-12 → NVIDIA Reranker → Top-3

## 2. 실제 결과

| 지표 | 2048 Hybrid-only | Hybrid + Reranker | 판정 |
|---|---:|---:|---|
| Recall@3 | 1.0000 | 0.96875 | 회귀 |
| MRR | 1.0000 | 1.0000 | 동일 |
| nDCG@3 | 0.99498 | 0.97582 | 회귀 |
| hard-negative rate | 0.1875 | 0.2500 | 악화 |
| failure rate | 0% | 0% | 정상 |
| p95 latency | 15.85ms | 277.99ms | 약 17.54배 증가 |
| multi-hop Recall@3 | 1.0000 | 0.83333 | 회귀 |
| multi-hop nDCG@3 | 0.97324 | 0.87105 | 회귀 |

Reranker endpoint와 응답 형식은 정상 작동했다. 따라서 이번 결과는 인프라 실패가 아니라 동일 평가 corpus에서의 실제 검색 품질 비교 결과다.

## 3. 비용·사용량

- Embedding tokens: 1,029
- Reranker tokens: 14,788
- 총 tokens: 15,817
- Reranker 요청: 16건
- 요청당 후보: 12건

Reranker는 검색 품질을 개선하지 못하면서 추가 네트워크 지연과 토큰 사용량을 발생시켰다.

## 4. 최종 결정

현재 production 후보는 다음으로 고정한다.

```text
2048차원 NVIDIA Embedding
→ keyword ranking
→ vector ranking
→ RRF Hybrid
→ 최종 검색 결과
```

Reranker는 production 검색에 연결하지 않는다.

- 정책 상태: `hold-production`
- 선택 pipeline: `nvidia-hybrid-2048`
- Reranker production eligible: `false`
- Reranker production activated: `false`
- 운영 DB 변경: 없음
- production index 변경: 없음

## 5. 재평가 조건

다음 중 하나가 발생할 때만 별도 실험으로 다시 검토한다.

1. 새로운 Reranker 모델 또는 명확한 모델 버전 개선
2. 한국어·성경·원어 corpus에 맞춘 fine-tuning 또는 domain adaptation
3. 후보 문서 chunking·길이·질의 형식의 구조적 변경
4. 최소 100개 이상의 독립 평가 질의와 사람 판정 데이터 확보
5. 현재 Hybrid 기준선보다 Recall·nDCG·hard-negative·multi-hop 성능을 모두 유지하거나 개선
6. latency·token 비용이 운영 예산 안에 들어오는 경우

재평가 전까지 Reranker는 연구·수동 평가 용도로만 허용한다.

## 6. 영구 근거

- evidence: `docs/evidence/nvidia-reranker-poc-30865836689.json`
- artifact ID: `8876054507`
- artifact digest: `sha256:a80450fc6c7d22aa8d1095458a5158d638c0e0006a8282a644dbba9b1f6105e9`
- GitHub artifact는 30일 후 만료되지만, 집계 수치와 digest는 저장소 evidence에 보존한다.
