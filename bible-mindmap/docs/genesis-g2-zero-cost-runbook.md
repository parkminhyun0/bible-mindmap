# 창세기 G2 · 무과금 원어 사전 번역 실행 기준

## 목표

창세기 원어 한글사전 번역을 진행할 때 OpenAI API, NVIDIA API, Ollama Cloud 등 외부 유료 모델 호출을 기본 경로에서 완전히 제외한다.

- 외부 유료 API 호출: 0
- API key 등록: 불필요
- GitHub Secret 사용: 0
- 번역 실행 위치: 사용자 컴퓨터의 로컬 환경
- 기본 원자료: 공개 BDB 계층 자료와 창세기 OSHB 용례
- 자동 서비스 반영: 금지
- 사람 문맥 검토·개혁주의 신학 감사: 필수

기존 NVIDIA·OpenAI 실행 경로는 선택형 보관 상태로 남기되, 창세기 작업의 기본 경로로 사용하지 않는다.

## 무과금 경로 구성

### A. 로컬 모델 이중 후보

로컬 Ollama에서 서로 다른 모델 두 개를 독립 실행한다.

- 슬롯 A: 로컬 모델 A
- 슬롯 B: 로컬 모델 B
- 각 슬롯은 다른 슬롯의 결과를 읽지 않는다.
- 허용 주소는 `http://127.0.0.1:11434/api` 또는 `http://localhost:11434/api`뿐이다.
- Ollama Cloud URL, 외부 API URL, API key 전송은 코드에서 차단한다.

내부의 기존 비교·문맥·신학 검수 파이프라인을 재사용하기 위해 슬롯 A와 B는 각각 기존 비교 슬롯 디렉터리에 저장된다. 그러나 후보 파일의 `provenance`에는 실제 실행 백엔드가 `ollama-local`로 기록된다.

### B. 완전 수동 후보

로컬 모델을 설치하지 않아도 번들 안의 JSON 템플릿을 사람이 직접 작성할 수 있다.

- BDB source node마다 한글 번역을 입력한다.
- confidence와 risk flag를 기록한다.
- Strong과 source fingerprint는 변경하지 않는다.
- 자동검증 후 G3 문맥 검토와 G4 신학 감사로 넘긴다.

이 경로는 API 비용뿐 아니라 외부 AI 호출도 전혀 없다. 대신 사람이 직접 번역해야 하므로 작업 시간이 늘어난다.

## 실행 순서

저장소 최신 `main`을 내려받은 뒤 `bible-mindmap` 디렉터리에서 실행한다.

### 1. 원자료와 canary 재생성

```bash
node scripts/report-genesis-strong-inventory.mjs --strict --write=reports/genesis-strong-inventory.json
node scripts/build-genesis-translation-manifest.mjs
node scripts/build-genesis-g2-calibration-batch.mjs
node scripts/materialize-genesis-g2-bdb-packets.mjs
node scripts/build-genesis-g2-canary-set.mjs
node scripts/build-genesis-g3-usage-context-packets.mjs
```

### 2. 무과금 검토 번들 생성

```bash
npm run genesis:g2:zero-cost:prepare
```

생성 위치:

```text
reports/genesis-g2-zero-cost-bundle/
├─ bundle-manifest.json
├─ RUNBOOK.md
└─ templates/
   ├─ slot-a/
   └─ slot-b/
```

### 3. 로컬 모델 후보 A 생성

```bash
npm run genesis:g2:zero-cost:local -- \
  --slot=a \
  --model=<설치된 로컬 모델 A> \
  --execute
```

### 4. 로컬 모델 후보 B 생성

```bash
npm run genesis:g2:zero-cost:local -- \
  --slot=b \
  --model=<설치된 로컬 모델 B> \
  --execute
```

가능하면 서로 다른 계열의 로컬 모델을 사용한다. 모델을 다운로드하거나 실행하는 과정에서 외부 유료 cloud 모델을 선택하지 않는다.

### 5. 기존 품질 평가 재사용

```bash
node scripts/evaluate-genesis-g2-canary-results.mjs \
  --strict \
  --output-root=reports/genesis-g2-zero-cost-execution \
  --output=reports/genesis-g2-zero-cost-evaluation.json
```

### 6. 사람 검토 패킷

```bash
node scripts/build-genesis-g2-promotion-review.mjs \
  --evaluation=reports/genesis-g2-zero-cost-evaluation.json \
  --output-root=reports/genesis-g2-zero-cost-execution \
  --output-dir=reports/genesis-g2-zero-cost-promotion-review
```

이후 G3 창세기 문맥 대조와 G4 개혁주의 신학 감사 절차를 동일하게 적용한다.

## 비용 안전장치

무과금 경로의 verifier는 다음을 차단한다.

- `api.openai.com`
- NVIDIA 외부 inference endpoint
- `https://ollama.com/api`
- GitHub Actions Secret 참조
- workflow artifact 장기 보관
- 외부 유료 API key 사용
- 자동 서비스 데이터 쓰기
- 자동 최종 승인

GitHub 저장소는 공개 저장소이며, 이 경로의 CI는 표준 `ubuntu-latest`에서 offline self-test만 실행한다. 실제 로컬 모델 번역은 사용자 컴퓨터에서 수행한다.

## 품질 원칙

무과금으로 바뀌어도 다음 기준은 낮추지 않는다.

1. BDB 영어 원문 계층 보존
2. source node 누락·병합·분할 금지
3. 창세기 실제 출현과 형태론 대조
4. 다의어와 신학 민감어 R0–R4 분류
5. 성경 원문·문법·문맥 최우선
6. 웨스트민스터 표준문서 중심의 교리 안전선
7. 사람 승인 전 팝업 표시 금지
8. 승인되지 않은 항목은 `번역 데이터 준비 중` 표시

## 기존 유료 경로 처리

기존 `Genesis G2 Provider Preflight`, `Genesis G2 Canary Execute` 워크플로는 자동 실행되지 않는 선택형 보관 경로다. 무과금 운영에서는 실행하지 않고, API key도 등록하지 않는다.
