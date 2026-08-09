# 누가복음 G2 · 무과금 독립 번역 후보 실행 기준

## 현재 판정

- 대표 10개 Greek Strong과 70개 문맥 준비 완료
- 독립 슬롯 A/B 템플릿 20개 준비 완료
- local-two-model 실행기·한 번 실행 파이프라인·수동 JSON importer 준비
- 실제 후보 생성: 0건
- 외부 유료 API 호출: 0건
- 서비스 사전 쓰기: 0건
- 현재 `luke-g2-execution-gate.json`은 계속 차단 상태

## 창세기 G2에서 확인된 오류

창세기 첫 무과금 canary에서 다음 문제가 실제로 발생했다.

- `transliterationKo`에 한글 대신 라틴 학술 음역이 들어감
- 한국어 필드에 중국어 또는 번역되지 않은 영어 문장이 남음
- 모든 문맥·의미 노드 confidence가 1.0으로 고정됨
- 신학 민감어·다의어의 필수 risk flag가 누락됨
- 모델·프롬프트·생성 설정이 바뀌어도 기존 후보를 재사용할 위험이 있었음
- 사람 검토 묶음에서 원천 packet이 빠질 수 있었음

누가복음 G2에서는 실제 모델 실행 전에 위 실패를 코드 Gate로 차단한다.

## 반영된 품질 Gate

`luke-g2-translation-contract.mjs`는 후보 저장 전에 다음을 검증한다.

1. `transliterationKo`는 한글을 포함하고 라틴 음역을 포함하지 않는다.
2. `primaryGlossKo`, `alternateGlossesKo`, `lexicalNotesKo`, `glossKo`, `rationaleKo`는 한글 중심이어야 한다.
3. 중국 한자와 다수의 미번역 라틴 단어가 남은 문장을 차단한다.
4. 모든 context confidence가 1.0인 후보를 차단한다.
5. 대표 위험군의 필수 risk flag를 강제한다.
   - G2316 θεός: `theological-sensitive`
   - G932 βασιλεία: `polysemy`, `theological-sensitive`
   - G4151 πνεῦμα: `polysemy`, `theological-sensitive`
   - G3137 Μαρία: `proper-name`
   - G3686 ὄνομα: `polysemy`
   - G2 Ἀαρών: `proper-name`
6. 계약·프롬프트·모델·생성 설정이 달라지면 기존 후보를 재사용하지 않는다.

## 로컬 Ollama 안정값

창세기 오류 수정 결과를 누가복음 기본값으로 승격했다.

```text
temperature=0
num_ctx=8192
```

필요한 경우에만 다음 범위 안에서 변경한다.

```bash
--temperature=<0..1>
--num-ctx=<4096..131072>
```

## Gate를 열지 않고 가능한 사전점검

박 목사님 Mac의 `bible-mindmap` 디렉터리에서 다음을 실행한다.

```bash
node scripts/ai/lexicon/run-luke-g2-zero-cost-pipeline.mjs \
  --model-a=<설치모델A> \
  --model-b=<설치모델B>
```

이 명령은 실제 후보를 생성하지 않고 다음만 확인한다.

- Ollama `127.0.0.1:11434` 연결
- `/api/tags` 설치 모델 탐색
- 모델 A/B 설치 여부
- 서로 다른 모델명과 서로 다른 digest
- 대표 source/context packet 수
- Gate 차단 상태
- 비용·서비스 쓰기·자동 승인 차단

Ollama가 실행되지 않은 환경에서 명령 구조만 확인하려면:

```bash
node scripts/ai/lexicon/run-luke-g2-zero-cost-pipeline.mjs \
  --offline-plan \
  --model-a=<설치모델A> \
  --model-b=<설치모델B>
```

## 실제 실행을 위한 별도 승인 Gate

실제 로컬 모델 호출은 별도 Gate 활성화 커밋 이후에만 수행한다.

- `localTwoModel.enabled=true`
- `executionAllowed=true`
- 승인 문자열 `RUN-LUKE-G2-CANARY`
- kill switch `off`
- 서로 다른 설치 모델 A/B
- 비용 상한 `$0`
- 사람 검토 필수 유지
- production write 금지 유지

Gate 활성화 없이 `--execute`를 붙이면 실행기는 실패해야 한다.

## 실제 한 번 실행 형태

Gate 활성화 이후:

```bash
node scripts/ai/lexicon/run-luke-g2-zero-cost-pipeline.mjs \
  --execute \
  --confirmation=RUN-LUKE-G2-CANARY \
  --kill-switch=off \
  --model-a=<설치모델A> \
  --model-b=<설치모델B> \
  --temperature=0 \
  --num-ctx=8192
```

실행 순서:

1. Ollama 설치 모델·digest 사전점검
2. 슬롯 A 독립 후보 생성
3. 슬롯 A 결과와 격리된 상태에서 슬롯 B 독립 후보 생성
4. 최신 계약·프롬프트·언어 순도·confidence·risk flag 검증
5. 두 후보의 backend·모델·생성 설정·source fingerprint 검증
6. 비교 리포트 생성
7. 상태를 `human-review-required`로 종료

## 수동 독립 JSON 경로

로컬 모델 실행이 어려운 경우 별도 `manualIndependentJson` Gate 활성화 후 사용한다.

검증만:

```bash
node scripts/ai/lexicon/import-luke-g2-zero-cost-manual.mjs \
  --slot=a \
  --input=<후보A.json> \
  --model-id=<독립작성자또는모델A>
```

실제 candidate 영역 저장은 Gate 활성화와 다음 인자가 모두 필요하다.

```bash
node scripts/ai/lexicon/import-luke-g2-zero-cost-manual.mjs \
  --execute \
  --slot=a \
  --input=<후보A.json> \
  --model-id=<독립작성자또는모델A> \
  --confirmation=RUN-LUKE-G2-CANARY \
  --kill-switch=off
```

슬롯 B도 다른 작성자 또는 모델로 별도 작성한다.

## 사람 검토 묶음

두 후보 비교가 통과한 뒤:

```bash
node scripts/build-luke-g2-human-review-bundle.mjs
```

생성 위치:

```text
reports/luke-g2-human-review-packets/
```

포함 항목:

- 대표 10 Strong source/context preparation
- 실행 Gate snapshot
- 슬롯 A/B 후보 20개
- 독립 후보 비교 리포트
- 한글 음역·언어 순도·confidence·risk flag 검토 체크리스트
- production write·자동 승인 차단 manifest

이 묶음은 G3 문맥 대조와 G4 신학 감사로 승격하기 위한 사람 검토 자료이며, 추천이나 자동 승인이 아니다.

## 검토 우선순위

1. G2316 θεός — 신학 민감성, lexical meaning과 교리 결론 분리
2. G4151 πνεῦμα — 성령·영·바람의 다의성
3. G932 βασιλεία — 나라·왕국·왕권의 문맥 구분
4. G4982 σῴζω·G3341 μετάνοια·G1342 δίκαιος — 구원론 관련 과잉 신학화 방지
5. G3137 Μαρία·G2 Ἀαρών — 고유명사 안정 음역
6. G3004 λέγω·G3686 ὄνομα — 고빈도·다의어 문맥 분기

이 Gate를 통과하기 전에는 전수 확대, 사전 팝업 반영, 서비스 데이터 쓰기, 최종 승인을 수행하지 않는다.
