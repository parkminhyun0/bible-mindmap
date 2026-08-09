# Strong Identity · Evidence Packet v2 계약

## 목적

P1의 세 번째 단위는 원어 한글사전의 모든 항목이 같은 Strong 정체성·출처·의미 노드·문맥·라이선스 계약을 사용하도록 고정한다. 이 단계는 신규 번역을 생성하지 않으며, 기존 Golden Reference `GEN-1-1-H776`을 새 계약으로 무손실 재현하는지 검증한다.

## Strong Identity v1

`StrongIdentity.schema.json`은 다음 불변 조건을 강제한다.

- 앞자리 0 제거: `H0776 → H776`, `G03056 → G3056`
- Extended Strong 접미 문자 보존: `H01234a → H1234a`
- `baseStrong`, `disambiguationSuffix`, `namespace` 분리
- `H`는 구약의 `hebrew | aramaic`, `G`는 신약의 `greek`
- lemma NFC 정규화
- 과학 음역·한글 음역·품사·출처 locator 기록
- 정렬된 canonical JSON SHA-256으로 identity fingerprint 고정

## Evidence Packet v2

`EvidencePacket.schema.json`은 다음 계층을 고정한다.

```text
Strong Identity
→ Source Inputs
→ Deterministic Sense Nodes
→ Normalized Sense Clusters
→ Representative Contexts
→ License Summary
→ Golden Regression 또는 Generation Gate
→ Packet Fingerprint
```

### 입력 정책

- `automatic-evidence`: Source Registry에서 `approved-ready`이고 canonical source fingerprint가 일치해야 한다.
- `legacy-regression-only`: 기존 승인 결과의 회귀 대조에만 허용하며 신규 후보 생성에는 사용할 수 없다.
- 제한 출처가 하나라도 필요한 packet은 `newGenerationAllowed=false`다.
- `candidate-generation` packet에는 제한 출처가 존재할 수 없다.

## H776 Golden fixture

`data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json`은 다음을 고정한다.

- `H776 · אֶרֶץ · 에레츠`
- `H776`, `H0776` 정규화 동등성
- 기존 BDB 한국어 구조 26개 노드
- 최대 깊이 3
- 5개 의미 클러스터
- TWOT 167·여성 명사·기존 어원 번역
- `pilot-reviewed` 표시 Gate
- PR #220 병합 SHA `7ec135fe540442a0e88c8c46fd954ccf6bb2cc23`
- 기존 Drawer·모바일/데스크톱 표시 계약

Open Scriptures full BDB는 현재 Source Registry에서 `blocked`이므로 이 fixture에서 `legacy-regression-only`로만 참조한다. STEPBible TAHOT·TBESH는 Strong·원문·형태론·축약 사전 대조에 사용하며 full BDB 계층을 대체하지 않는다.

## 자동 검증

`verify-lexicon-evidence-contracts.mjs`와 `Lexicon Evidence Contract` CI는 다음을 실패 처리한다.

- Strong 앞자리 0·접미 문자·언어·정경 불일치
- lemma NFC·identity fingerprint 불일치
- Source Registry 상태·source fingerprint 불일치
- 제한 출처를 신규 후보 생성에 사용
- 의미 node ID·순서·부모·깊이 오류
- node 미클러스터·중복 클러스터 배정
- 문맥 lemma·출처 불일치
- H776 26노드 번역·순서·계층·TWOT·어원·표시 Gate 회귀
- packet fingerprint 불일치

## 현재 제한

이 계약의 완성은 신규 full BDB 번역 생성을 허용하지 않는다. 명시적으로 재사용·LLM 입력·파생물 배포가 허가된 full BDB primary source가 `approved-ready`가 되기 전까지 신규 full BDB 번역은 계속 차단한다.

## 다음 단계

P2에서 결정론적 BDB parser의 입력·출력 계약을 구현하고, H776의 실제 source node 구조를 권리 확인된 primary source로 재추출할 수 있을 때 기존 26개 노드와 대조한다.
