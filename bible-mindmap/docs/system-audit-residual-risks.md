# 전체 시스템 감사 A6 · 잔여 위험 등록부

기준 커밋: `0c550ae60d0e4351601f011fccf354384c682faa`  
감사일: 2026-08-04  
기계 판독 원본: `docs/system-audit-residual-risks.json`

## 결론

- 미해결 **P0: 0건**
- 미해결 **P1: 0건**
- 열린 GitHub issue: **0건**
- 열린 GitHub PR: **0건** — 오래된 PR #37은 최신 1,106장 관찰카드 체계로 대체됐음을 확인하고 종료했다.
- NVIDIA 실제 endpoint bake-off는 완료되어 A6-R001을 해결 상태로 전환했다.
- 현재 활성 잔여 항목은 P2 2건, P3 4건이며 운영 차단 결함이 아니라 계획적 데이터 확장·제한된 원어 검토·명시적 본문 예외·개발/성능 부채다.

## 분류 기준

| 등급 | 의미 | 종료 조건 |
| --- | --- | --- |
| P0 | 데이터 손상·비밀키 노출·서비스 전면 장애 | 0건 필수 |
| P1 | 핵심 기능 회귀·잘못된 성경 참조·배포 불능 | 0건 필수 |
| P2 | 품질 확장·제한된 데이터 검토 | 통제와 후속 조건 문서화 |
| P3 | 명시적 예외·도구 경고·성능 개선 후보 | 허용 근거와 회귀 게이트 문서화 |

## 해결된 항목

### A6-R001 · P2 · NVIDIA 실제 endpoint bake-off 완료

GitHub Actions run `30842224158`에서 `nvidia/llama-nemotron-embed-1b-v2`를 실제 NVIDIA endpoint로 실행해 2048차원과 384차원을 비교했다. 평가 범위는 승인 문서 12건·출처 36건·직접/의미/multi-hop 질의 16건·hard-negative 16건이다.

- 2048차원: Recall@3 1.0 · MRR 1.0 · nDCG@3 0.99498 · hard-negative 0.1875
- 384차원: Recall@3 0.96875 · MRR 1.0 · nDCG@3 0.97582 · hard-negative 0.375
- multi-hop Recall@3: 2048은 1.0, 384는 0.83333
- 384차원은 저장량 81.25% 절감이 가능하지만 검색 누락과 오탐이 증가해 품질 유지 조건을 충족하지 못했다.
- 기본 평가·향후 인덱스 설계 권고는 2048차원 유지다.
- 운영 DB와 production 인덱스는 변경하지 않았으며 실제 production 도입은 별도 승인과 구현 PR을 요구한다.

영구 근거:

- `docs/evidence/nvidia-embedding-dimension-bakeoff-30842224158.json`
- `docs/nvidia-embedding-dimension-decision.md`

## 활성 잔여 항목

### A6-R002 · P2 · 정경 용례지도 48개 확장

정경 개념 72개 중 24개에 상세 usage map이 있다. 나머지 48개는 계획적 콘텐츠 확장 범위다. 존재하지 않는 개념 키·잘못된 참조·Strong·절 범위 오류는 기존 verifier가 하드 실패한다.

### A6-R003 · P2 · 관찰카드 원어 마커 39건

관찰카드 1,106장, 원어 마커 2,304개 중 39개(1.7%)가 lex 표면형과 직접 일치하지 않는다. lex 부재 장은 0개다. 현재 수치와 2% 상한을 CI에 고정해 증가를 차단하고, 철자·굴절·분절·versification 차이를 후속 검토한다.

### A6-R004 · P3 · 사도행전 28장 열린 결말

사도행전 28:31의 열린 종결을 보존하기 위해 `Acts:28`만 `nextChapterPreview` 없는 종결 카드로 허용한다. 이유가 코드에 명시되며 다른 누락은 실패한다.

### A6-R005 · P3 · 로마서 16장 절 번호 차이

STEPBible TAGNT의 24절 인덱스와 KRV 계열 최종 송영 25~27절 차이를 `Rom:16` 한 건에 한해 최대 27절로 허용한다. 다른 장절 범위 오류는 계속 실패한다.

### A6-R006 · P3 · glob deprecation

개발 도구 전이 의존성에서 deprecation 안내가 출력된다. production/full npm audit의 high·critical은 0건이며, 보안 감사 JSON을 CI artifact로 보존한다.

### A6-R007 · P3 · Vite 대형 chunk

production build는 성공하고 11개 Chromium smoke와 Pages live asset 검증도 통과한다. 기능을 축소하지 않는 범위에서 lazy loading·manualChunks를 후속 성능 개선 후보로 둔다.

## 자동 차단 규칙

`npm run verify:residual-risks`는 다음을 검사한다.

1. 등록부 스키마·고유 ID·필수 근거·허용 상태
2. P0/P1 0건과 활성 P0/P1 항목 부재
3. 정경 개념 72개·usage map 24개·대기 48개의 실제 registry 일치
4. 관찰카드 1,106장과 원어 마커 2,304개·미일치 39개·1.7%의 실제 verifier 출력 일치
5. 원어 마커 미일치율 2% 이하
6. `Acts:28` 종결 예외와 `Rom:16` 27절 예외가 코드에 명시돼 있는지
7. NVIDIA workflow가 수동 실행 전용이고 운영 인덱스를 변경하지 않으며 사람 승인을 요구하는지
8. run `30842224158` 실측 근거가 2048차원 선택·384 품질 회귀·DB/인덱스 미변경을 보존하는지
9. 이 문서가 모든 등록 ID를 포함하는지

등록 수치나 예외가 개선되거나 악화돼도 등록부와 근거를 함께 검토하지 않으면 CI가 실패한다.
