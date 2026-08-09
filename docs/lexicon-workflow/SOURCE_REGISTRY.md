# Source Registry v1 · 운영 계약

## 목적

`data/lexicon/source-registry.json`은 66권 원어 한글사전 파이프라인에 입력할 원문·형태론·사전 자료의 라이선스와 재현성 상태를 기록한다. 기존 Registry의 출처 우선순위와 신학 안전 선언을 보존하면서, 라이선스 권한·LLM 입력·파생물 배포·버전·SHA-256을 기계 검증 가능한 필드로 확장한다.

## 상태 해석

- `approved-ready`: 라이선스, 고정 버전, SHA-256, 수집 시각이 모두 확인되어 새 Evidence Packet에 자동 사용 가능
- `approved-pending-fingerprint`: 라이선스는 확인됐지만 원본 commit·파일 해시가 아직 고정되지 않아 새 자동 번역 입력에는 사용 금지
- `internal-review-only` / `metadata-only`: 허용된 제한 범위에서만 사용하며 자동 입력 금지
- `blocked`: 라이선스나 출처가 불명확하여 AI 입력·저장·파생물 생성·재배포 금지

`unknown` 출처가 Registry에 기록되는 것 자체는 허용한다. 다만 반드시 `blocked`이고 모든 사용 권한이 `false`여야 한다.

## 자동 차단

`verify-lexicon-source-registry.mjs`는 다음을 실패 처리한다.

- `unknown`·`prohibited`인데 `blocked`가 아님
- 제한 출처가 AI 입력·저장·파생물·재배포를 허용
- CC BY 출처의 귀속 또는 변경 고지 누락
- `approved-ready`인데 버전·SHA-256·수집 시각 누락
- fingerprint 대기 상태인데 자동 처리 허용
- 중복 sourceId, 잘못된 언어·정경·자료 유형
- 우선순위 목록이 차단된 출처를 참조

## 초기 마이그레이션

기존 Registry의 다음 자료를 보존·마이그레이션한다.

- Open Scriptures HebrewLexicon BDB: 저장소 편집물의 명시적 라이선스 확인 전 `blocked`
- unfoldingWord BDB Enhanced: 공개 라이선스 확인, fingerprint 대기
- STEPBible TBESH: CC BY 4.0, fingerprint 대기
- Open Scriptures Strong's: 저장소 편집물 라이선스 확인 전 `blocked`
- 한국어 사전 대조군: 판본·권한 미정으로 `blocked`
- STEPBible TAGNT·TAHOT: 기존 앱 빌드 사용은 유지하되 새 Evidence 입력은 fingerprint 이후 허용

## 다음 작업

1. STEPBible·unfoldingWord의 고정 commit과 대상 파일 SHA-256 등록
2. 차단된 Open Scriptures 저장소의 명시적 라이선스 확인
3. `StrongIdentity.schema.json`
4. `EvidencePacket.schema.json`
