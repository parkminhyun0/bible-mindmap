# 창세기 G2 · 무과금 로컬 실행 한 번에 진행하기

## 목적

이 절차는 외부 유료 API, 외부 무료 티어 API, GitHub Secret을 사용하지 않는다.

- 입력: 공개 BDB 원자료와 창세기 OSHB 용례
- 실행: 사용자 컴퓨터의 로컬 Ollama
- 후보: 서로 다른 로컬 모델 A/B의 독립 후보
- 후속: 자동 비교 → 창세기 문맥 검토 패킷 → R0–R4 신학 감사 패킷
- 서비스 쓰기·최종 승인: 사람 검토 전 차단

## 1. 로컬 상태만 점검

저장소의 `bible-mindmap` 폴더에서 다음 명령을 실행한다.

```bash
node scripts/ai/lexicon/run-genesis-g2-zero-cost-pipeline.mjs
```

점검기는 다음을 자동 확인한다.

- Ollama가 `127.0.0.1:11434`에서 실행 중인지
- 설치된 로컬 모델 목록
- 로컬 모델이 두 개 이상인지
- 두 슬롯이 같은 모델명·같은 digest를 사용하지 않는지
- 컴퓨터 메모리 범위에서 실행 가능한 설치 모델을 우선 선택했는지

점검 결과는 다음 파일에 저장된다.

```text
reports/genesis-g2-zero-cost-pipeline.json
```

이 단계는 번역을 실행하지 않으며 외부 API 호출도 없다.

## 2. 모델을 자동 선택하여 canary 전체 실행

설치된 모델 중 서로 다른 두 모델을 자동 선택하려면 다음 한 명령을 실행한다.

```bash
node scripts/ai/lexicon/run-genesis-g2-zero-cost-pipeline.mjs \
  --execute \
  --confirmation=RUN-GENESIS-G2-ZERO-COST-CANARY
```

파이프라인은 순서대로 다음을 수행한다.

1. 무과금 번들 재생성
2. 로컬 후보 A 생성
3. 로컬 후보 B 생성
4. 후보 10건 구조·합의·confidence 평가
5. 사람 승격 검토 패킷 생성
6. 창세기 실제 용례 문맥 검토 패킷 생성
7. R0–R4 개혁주의 신학 감사 패킷 생성

기존 후보가 같은 source fingerprint로 이미 존재하면 다시 생성하지 않고 건너뛰므로 중단 후 같은 명령으로 재개할 수 있다.

## 3. 사용할 모델을 직접 지정

```bash
node scripts/ai/lexicon/run-genesis-g2-zero-cost-pipeline.mjs \
  --execute \
  --model-a=<설치된-로컬-모델-A> \
  --model-b=<설치된-로컬-모델-B> \
  --confirmation=RUN-GENESIS-G2-ZERO-COST-CANARY
```

두 모델은 다음 조건을 만족해야 한다.

- Ollama의 `/api/tags` 목록에 실제로 존재
- 모델명이 서로 다름
- digest가 서로 다름
- 가능하면 서로 다른 모델 계열

같은 회사·계열이라도 서로의 결과를 읽지 않으면 블라인드는 유지된다. 다만 오류 상관성을 낮추기 위해 다른 계열을 권장한다.

## 4. 생성되는 검토 자료

```text
reports/
├─ genesis-g2-zero-cost-execution/
│  ├─ candidates/nvidia/
│  └─ candidates/openai/
├─ genesis-g2-zero-cost-evaluation.json
├─ genesis-g2-zero-cost-promotion-review/
├─ genesis-g3-zero-cost-context-review/
│  ├─ context-review.json
│  └─ context-review.md
├─ genesis-g4-zero-cost-theology-audit/
│  ├─ theology-audit.json
│  └─ theology-audit.md
└─ genesis-g2-zero-cost-pipeline.json
```

`nvidia`와 `openai` 디렉터리명은 기존 비교 계약과 호환하기 위한 슬롯명일 뿐이다. 각 후보의 `provenance`에는 실제 실행 백엔드와 로컬 모델명이 기록된다.

## 5. 로컬 모델을 사용하지 않는 완전 수동 JSON 경로

먼저 템플릿을 생성한다.

```bash
npm run genesis:g2:zero-cost:prepare
```

다음 폴더의 JSON에 한글 번역을 입력한다.

```text
reports/genesis-g2-zero-cost-bundle/templates/
├─ slot-a/
└─ slot-b/
```

각 파일에서 다음을 모두 작성한다.

- `transliterationKo`
- `primaryGlossKo`
- `notesKo`
- 모든 source node의 `textKo`
- 0–1 범위의 `confidence`
- 허용된 `riskFlags`

Strong, source fingerprint, source node ID와 순서는 변경하지 않는다.

작성 후 먼저 검증만 수행한다.

```bash
node scripts/ai/lexicon/import-genesis-g2-zero-cost-manual.mjs --slot=a
node scripts/ai/lexicon/import-genesis-g2-zero-cost-manual.mjs --slot=b
```

검증이 통과하면 후보 계약으로 변환한다.

```bash
node scripts/ai/lexicon/import-genesis-g2-zero-cost-manual.mjs \
  --slot=a \
  --translator-id=manual-a \
  --execute

node scripts/ai/lexicon/import-genesis-g2-zero-cost-manual.mjs \
  --slot=b \
  --translator-id=manual-b \
  --execute
```

수동 후보도 로컬 모델 후보와 같은 평가·문맥·신학 감사 절차를 사용한다.

## 6. 비용·보안 경계

다음은 코드에서 차단한다.

- OpenAI·NVIDIA·Gemini·Groq·OpenRouter 외부 endpoint
- Ollama Cloud
- GitHub Actions Secret
- API key 전달
- `localhost`, `127.0.0.1`, IPv6 loopback 이외 Ollama 주소
- 사람 검토 전 서비스 데이터 쓰기
- 자동 최종 승인

로컬 모델 다운로드 용량, 컴퓨터 전력, 실행 시간은 필요하지만 외부 API 청구는 0원이다.

## 7. 완료 판정

파이프라인 보고서 상태가 다음이면 기술 결과가 사람 검토 단계까지 준비된 것이다.

```text
human-review-packets-ready
```

이 상태도 번역 최종 승인을 뜻하지 않는다. G3 문맥 판단과 G4 신학 감사, 사람 승인 후에만 팝업 표시 후보가 된다.
