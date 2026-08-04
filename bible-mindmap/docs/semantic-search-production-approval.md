# M6 의미 검색 production 승인 기록

승인일: 2026-08-04
승인 범위: NVIDIA 2048차원 Hybrid 검색의 제한적 canary 승격 준비

## 승인된 항목

- 기존 keyword 검색을 fallback으로 유지
- NVIDIA Hybrid 후보 pipeline을 최대 5% canary 요청에서만 사용
- 서버 측 provider 경계 유지
- production DB와 canonical 데이터 자동 쓰기 금지
- 품질·지연·오류 게이트 실패 시 즉시 기존 검색으로 복귀

## 아직 승인되지 않은 항목

- 100% 트래픽 전환
- 브라우저에서 NVIDIA API 직접 호출
- production DB·검색 원본 자동 수정
- AI 후보의 무인 canonical 반영
- reranker production 사용

## 승격 게이트

- Recall@3 >= 0.80
- MRR >= 0.75
- nDCG@3 >= 0.78
- hard-negative rate <= 0.35
- failure rate <= 0.02
- p95 latency <= 1200ms

이 기록은 기능을 즉시 전체 사용자에게 활성화하는 선언이 아니라, 안전한 canary 구현과 검증을 진행할 수 있다는 사용자 승인 근거다.
