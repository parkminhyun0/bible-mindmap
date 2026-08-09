# 결정론적 BDB 파서 · 입력·출력 계약 v1

## 목적

P2 첫 단위는 사전 구조를 LLM이 생성하지 못하도록 파서의 입력과 출력을 기계 계약으로 고정한다. 이 단계는 신규 번역을 만들지 않으며, `GEN-1-1-H776`의 기존 승인 구조를 `legacy-golden-adapter`로 변환해 26개 노드·순서·부모 관계가 무손실인지 확인한다.

## 입력 계약

`BdbParserInput.schema.json`은 다음을 요구한다.

```text
parser identity/version/mode
+ processingMode
+ Source Registry 상태·사용 정책·fingerprint·locator
+ Strong Identity
+ 구조 보존 옵션
+ Golden Reference 기대값
+ canonical input fingerprint
```

### source-parse

신규 후보 생성에 사용하려면 다음을 모두 만족해야 한다.

- Source Registry `approved-ready`
- `autoProcessingAllowed=true`
- `usagePolicy=automatic-evidence`
- source fingerprint 일치
- `emitSourceText=true`
- `allowTranslationSnapshot=false`
- 제한 출처 0개

### legacy-golden-adapter

현재 H776은 full BDB 출처가 `blocked`이므로 다음 조건으로만 처리한다.

- `processingMode=regression-only`
- `usagePolicy=legacy-regression-only`
- source fingerprint `null`
- `emitSourceText=false`
- 기존 승인 한국어는 `translationSnapshotKo`로만 보존
- 신규 후보 생성·재배포 근거로 사용 금지

## 출력 계약

`BdbParserOutput.schema.json`은 모든 노드를 다음 평면 구조로 출력한다.

```text
id
parentId
depth
order
sourceText
translationSnapshotKo
provenanceStatus
sourceLocator
```

파서는 노드 ID·계층·순서를 바꾸지 않는다. `parsed-source`는 권리 확인된 실제 원문을 읽었을 때만 사용할 수 있다. H776 adapter는 `legacy-approved-snapshot`이며 `sourceText=null`을 강제한다.

## H776 adapter

`build-h776-parser-adapter.mjs`는 기존 `lexiconTranslationPilot.js`의 H776 트리를 결정론적으로 평면화한다.

```text
기존 승인 H776 트리
→ 26개 ordered nodes
→ root 1개
→ maxDepth 3
→ Evidence Packet v2 노드와 1:1 비교
```

동일 입력은 항상 동일한 canonical SHA-256 출력을 만들어야 한다.

## 자동 검증

`verify-lexicon-parser-contract.mjs`와 `Lexicon Parser Contract` CI는 다음을 차단한다.

- 차단 출처의 candidate-generation 사용
- parser mode·usage policy·source fingerprint 불일치
- 계층·순서·부모·깊이 변경
- H776 26개 노드 또는 번역 snapshot 변경
- legacy adapter가 source text를 읽었다고 주장
- 동일 입력의 비결정적 출력
- input/output fingerprint 불일치

## 현재 제한과 다음 단계

이 계약은 full BDB 신규 번역을 허용하지 않는다. 명시적 라이선스가 있는 full BDB primary source가 `approved-ready`가 되기 전까지 H776 adapter는 회귀 전용이다.

다음 P2 단위는 다음 중 하나다.

1. 사용 가능한 full BDB primary source의 명시적 권리 확보와 Source Registry 승격
2. source-neutral parser driver 인터페이스를 구현하고, 승인된 축약 자료(TBESH)는 Strong·축약 의미 대조에만 사용

어느 경우에도 기존 H776 한국어 번역을 새 원문 파싱 결과로 가장하지 않는다.
