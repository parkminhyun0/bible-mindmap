# 결정론적 BDB 파서 · 입력·출력 계약 v1

## 목적

P2는 사전 구조를 LLM이 생성하지 못하도록 파서의 입력과 출력을 기계 계약으로 고정한다. 신규 번역을 만들지 않으며, `GEN-1-1-H776`의 기존 승인 구조를 `legacy-golden-adapter`로 변환해 26개 노드·순서·부모 관계가 무손실인지 확인한다.

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

실제 source tree 파싱에는 다음을 모두 요구한다.

- Source Registry `approved-ready`
- `autoProcessingAllowed=true`
- `usagePolicy=automatic-evidence`
- source fingerprint 일치
- `emitSourceText=true`
- `allowTranslationSnapshot=false`
- full text 저장과 파생물 권한 허용
- 등록된 source adapter 존재

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

## Source-neutral driver

`lexicon-source-driver.mjs`는 출처 파일 형식이나 특정 Strong을 직접 알지 않는다. 출처별 구현은 `lexicon-source-adapters.mjs`에서 adapter로 등록하며, driver core는 다음 정보만으로 라우팅한다.

```text
Parser Input fingerprint
+ Source Registry workflow/license/fingerprint
+ source-driver-policy.json
+ registered adapter metadata
→ preflight report
→ allowed adapter execution 또는 fail-closed
```

현재 등록된 운영 adapter는 `h776-legacy-golden-v1` 하나이며 회귀 전용이다. driver core에는 H776 또는 Open Scriptures source ID가 존재하지 않으며 CLI 입력 경로도 반드시 명시해야 한다.

`source-driver-policy.json`은 현재 다음을 고정한다.

- `candidateGenerationEnabled=false`
- 회귀 adapter 실행만 허용
- source-parse는 `approved-ready`, 자동 처리 허용, 라이선스 승인, source fingerprint, full-text 저장·파생 권한, 등록 adapter를 모두 요구
- 승인된 축약 사전 TBESH도 full-definition adapter가 없으면 `ADAPTER_NOT_REGISTERED`로 차단

`SourceDriverReport.schema.json`은 preflight·execute 결과를 다음과 같이 기록한다.

- 선택 route: `legacy-adapter | source-parser | blocked`
- 선택 adapter ID
- Registry·license·fingerprint snapshot
- 실행 허용 여부
- candidate generation 허용 여부
- blocker code 목록
- parser output fingerprint 연결
- canonical report fingerprint

## 자동 검증

`verify-lexicon-parser-contract.mjs`, `verify-lexicon-source-driver.mjs`, `Lexicon Parser Contract` CI는 다음을 차단한다.

- 차단 출처의 candidate-generation 사용
- parser mode·usage policy·source fingerprint 불일치
- parser ID 또는 input fingerprint 변조
- 등록되지 않았거나 복수로 매칭되는 adapter
- 승인됐지만 full-definition adapter가 없는 TBESH를 BDB 대체물로 사용
- 계층·순서·부모·깊이 변경
- H776 26개 노드 또는 번역 snapshot 변경
- legacy adapter가 source text를 읽었다고 주장
- 동일 입력의 비결정적 preflight·출력
- input/output/report fingerprint 불일치

CI는 H776 driver report와 parser output을 artifact로 보존한다. 합성 approved-ready source와 주입 adapter는 인터페이스 검증에만 사용하며 저장소 출처나 번역 데이터로 등록하지 않는다.

## 현재 제한과 다음 단계

이 계약과 driver는 full BDB 신규 번역을 허용하지 않는다. 명시적 라이선스가 있는 full-definition primary source가 `approved-ready`가 되기 전까지 `candidateGenerationEnabled=false`를 유지한다.

다음 P2 단위는 다음 순서다.

1. full-definition BDB 계열 primary source의 라이선스·판본·파생물·저장·LLM 입력 권한을 결정
2. 승인 가능한 출처가 있으면 Source Registry에 고정 commit·canonical fingerprint를 등록
3. 해당 형식의 source adapter를 별도 파일로 구현
4. 실제 H776 source tree를 regression-only로 파싱해 legacy 26개 노드와 차이표 생성
5. 사람 Gate 전에는 candidate generation과 운영 쓰기를 계속 차단

어느 경우에도 기존 H776 한국어 번역을 새 원문 파싱 결과로 가장하지 않는다.
