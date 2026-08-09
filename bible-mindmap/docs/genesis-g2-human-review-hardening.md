# 창세기 G2 · 사람 검토 결과 반영 및 재생성 절차

## 판정

첫 무과금 canary 실행은 모델 A/B 후보 10건과 문맥·신학 감사 패킷까지 생성했지만, 다음 품질 결함 때문에 100개 교정 배치 확대를 보류한다.

- 한글 음역 필드에 라틴 학술 음역이 들어감
- 한국어 의미 노드에 중국어 또는 번역되지 않은 영어 문장이 남음
- 모든 의미 노드 confidence가 1.0으로 고정됨
- H430·H776·H7307의 필수 신학·다의성 위험 플래그가 누락됨
- 최초 사람 검토 ZIP에 BDB source packet과 canary set이 빠짐

서비스 데이터 쓰기와 최종 승인은 계속 차단한다.

## 반영된 품질 Gate

`genesis-g2-translation-contract.mjs`는 다음을 후보 저장 전에 검증한다.

1. `transliterationKo`는 한글을 포함하고 라틴 음역을 포함하지 않는다.
2. `primaryGlossKo`, `notesKo`, `textKo`는 한글 중심이어야 하며 중국 한자를 포함하지 않는다.
3. 다수의 미번역 라틴 단어가 남은 문장을 차단한다.
4. 모든 node confidence가 1.0인 후보를 차단한다.
5. H430은 `theological-sensitive`, H776은 `polysemy`, H7307은 두 플래그를 후보 전체에서 반드시 포함한다.

## 로컬 Ollama 안정값

기본 실행값은 실제 H430 구조 누락 복구에서 확인된 다음 설정이다.

```text
temperature=0
num_ctx=8192
```

필요한 경우에만 다음 인자로 명시 변경한다.

```bash
--temperature=<0..1>
--num-ctx=<4096..131072>
```

계약·프롬프트·생성 설정이 달라지면 기존 후보를 재사용하지 않고 새로 생성한다.

## 최신 코드 적용 후 canary 재생성

저장소의 `bible-mindmap` 폴더에서 실행한다.

```bash
node scripts/ai/lexicon/run-genesis-g2-zero-cost-pipeline.mjs \
  --execute \
  --confirmation=RUN-GENESIS-G2-ZERO-COST-CANARY \
  --model-a=qwen2.5:7b \
  --model-b=gemma3:12b \
  --timeout-ms=1200000
```

새 계약 버전과 프롬프트 버전이 적용되므로 이전 canary 후보는 자동 재사용 대상에서 제외된다.

## 완전한 사람 검토 묶음 생성

파이프라인 완료 후 다음을 실행한다.

```bash
node scripts/build-genesis-g2-human-review-bundle.mjs
```

생성 위치:

```text
reports/genesis-g2-human-review-packets/
```

이 디렉터리에는 다음이 모두 포함되어야 한다.

- BDB source packet 100개
- canary set 5개
- 창세기 용례·문맥 packet 100개
- 모델 A/B 후보 10개
- 후보 평가 결과
- 승격 검토 자료
- 문맥 검토 자료
- 신학 감사 자료
- 파이프라인 보고서와 bundle manifest

Mac에서 압축:

```bash
cd reports
zip -r ~/Desktop/genesis-g2-human-review-packets-v2.zip genesis-g2-human-review-packets
```

## 재검토 순서

1. H56 — Gemma 기반 소폭 교정
2. H559 — Gemma 기반 수동 재작성
3. H7307 — Gemma 기반 문맥·신학 재작성
4. H430 — 두 모델 결과를 참고하지 않고 BDB 노드별 수동 재구성
5. H776 — 기존 human-reviewed 파일럿을 golden control로 유지

이 Gate를 통과하기 전에는 calibration 100 확대, 사전 팝업 반영, 서비스 데이터 쓰기, 최종 승인을 수행하지 않는다.
