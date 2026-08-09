# 누가복음 G2 · 무과금 독립 번역 후보 실행 기준

## 현재 판정

- `local-two-model` 실행기와 후보 계약을 준비한다.
- 실제 후보 생성: 0건
- 외부 유료 API 호출: 0건
- 서비스 사전 쓰기: 0건
- 현재 커밋의 `luke-g2-execution-gate.json`은 계속 차단 상태다.

## 이번 단계에서 허용되는 것

1. 대표 10개 Strong과 70개 문맥으로 슬롯 A/B용 입력 envelope와 수동 JSON 템플릿을 만든다.
2. 로컬 Ollama 주소는 `127.0.0.1`·`localhost`·`::1`, 포트 `11434`, 경로 `/api`만 허용한다.
3. 실행 전에는 dry-run으로 입력 envelope만 생성한다.
4. 후보 A와 후보 B를 각기 다른 디렉터리에 기록하고 비교 전 상호 열람을 금지한다.
5. 두 후보의 구조 검증이 모두 끝난 뒤에만 비교 리포트를 만든다.

## 실제 실행을 위한 별도 승인 Gate

실제 로컬 모델 호출은 이 PR에서 수행하지 않는다. 후속 Gate 활성화 커밋에서 다음 조건을 모두 명시해야 한다.

- `localTwoModel.enabled=true`
- `executionAllowed=true`
- 승인 문자열 `RUN-LUKE-G2-CANARY`
- kill switch `off`
- 서로 다른 설치 모델 A/B
- 비용 상한 `$0`
- 사람 검토 필수 유지
- production write 금지 유지

Gate 활성화 커밋 없이 `--execute`를 붙이면 실행기는 실패해야 한다.

## 준비 명령

```bash
cd bible-mindmap
node scripts/build-luke-g2-zero-cost-bundle.mjs
node scripts/ai/lexicon/run-luke-g2-local-ollama.mjs --slot=a --model=<설치모델A>
node scripts/ai/lexicon/run-luke-g2-local-ollama.mjs --slot=b --model=<설치모델B>
```

위 명령은 `--execute`가 없으므로 모델을 호출하지 않고 envelope만 생성한다.

## 후속 실제 실행 형태

Gate 활성화 이후에만 다음 형태를 사용한다.

```bash
node scripts/ai/lexicon/run-luke-g2-local-ollama.mjs \
  --slot=a \
  --model=<설치모델A> \
  --confirmation=RUN-LUKE-G2-CANARY \
  --kill-switch=off \
  --execute
```

슬롯 B도 서로 다른 모델로 별도 실행한다. 두 슬롯 완료 후:

```bash
node scripts/verify-luke-g2-local-results.mjs --strict
```

비교 리포트는 추천·승인이 아니라 검토 자료다. R3·R4, `THEOLOGY_KEYWORD`, 다의어, 고유명사, 기존 한글과 충돌하는 후보는 자동 승인하지 않는다.
