# Source Registry v1.1 · 운영 계약

## 목적

`data/lexicon/source-registry.json`은 66권 원어 한글사전 파이프라인에 입력할 원문·형태론·사전 자료의 라이선스와 재현성 상태를 기록한다. 라이선스 권한, LLM 입력, 파생물 배포, 고정 commit, 파일 범위와 canonical SHA-256을 기계 검증 가능한 계약으로 유지한다.

## fingerprint 계약

`sha256-path-content-manifest-v1`은 등록된 `datasetPaths` 아래 모든 파일에 대해 다음 한 줄을 만든 뒤 경로 기준으로 정렬하고 전체 manifest를 다시 SHA-256으로 계산한다.

```text
<file-sha256>\t<byte-count>\t<repository-relative-path>\n
```

이 방식은 파일 내용 변경뿐 아니라 파일 추가·삭제·이름 변경과 입력 범위 변경도 감지한다. `git-commit` 출처는 40자리 commit, `fileCount`, `totalBytes`, `contentHash`, `retrievedAt`이 모두 일치해야 `approved-ready`가 된다.

## 현재 승인·고정 결과

공통 STEPBible commit: `b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39`

| sourceId | 파일 | 바이트 | canonical SHA-256 | 상태 |
|---|---:|---:|---|---|
| `stepbible-tbesh` | 1 | 3,288,045 | `da09f53ee1da7606b5d8a10cd2a263b3553df15b5fa0e36dda9c7707c6883988` | `approved-ready` |
| `stepbible-tagnt` | 2 | 30,128,964 | `ba355279e97ad2984fdd3523cc7b2a3e35ff633a9b01e3d92c40b27a94a022a5` | `approved-ready` |
| `stepbible-tahot` | 4 | 70,208,423 | `a3c81bbb9b88effe0b2712c60527ec8ac54f2dee856950aa05a616f42d7f75bf` | `approved-ready` |

세 자료는 CC BY 4.0의 귀속·변경고지 조건을 Registry에 보존하는 경우에만 새 Evidence Packet 입력에 사용할 수 있다. TBESH는 축약 대조 자료이며 full BDB 계층을 대체하지 않는다.

## 라이선스 재검토 결과

- `unfoldingword-bdb-enhanced`: commit `5a7a632d6923641c4a71dbf23df719711e3d2041`까지 고정했으나 README가 `CC BY`의 구체 버전을 지정하지 않는다. `internal-review-only`로 유지하며 외부 LLM 입력·파생 번역·재배포를 금지한다.
- `openscriptures-hebrewlexicon-bdb`: 저장소 수정·편집물의 명시적 라이선스 확인 전 `blocked`.
- `openscriptures-strongs`: 저장소 편집물 라이선스 확인 전 `blocked`.
- `korean-ot-nt-dictionary`: 판본·출처·권한 미정으로 `blocked`.

따라서 현재 자동 사용 가능한 full BDB 원문은 없다. H776 Golden Reference는 기존 승인 fixture로 회귀 검증에만 사용하며, 신규 full BDB 번역 생성은 권리 확인 전 시작하지 않는다.

## 자동 차단

`verify-lexicon-source-registry.mjs`와 `compute-lexicon-source-fingerprints.mjs`는 다음을 실패 처리한다.

- 제한 출처가 AI 입력·저장·파생물·재배포를 허용
- CC BY 4.0 출처의 귀속 또는 변경 고지 누락
- `approved-ready`의 commit·파일 수·바이트·canonical SHA-256·수집 시각 누락
- 실제 pinned 파일의 재계산 결과와 Registry fingerprint 불일치
- fingerprint 대기 상태에서 자동 처리 허용
- 중복 sourceId, 잘못된 언어·정경·자료 유형
- 우선순위 목록이 차단·내부 검토 출처를 참조

## 다음 작업

1. `StrongIdentity.schema.json`
2. `EvidencePacket.schema.json`
3. H776 Golden Reference를 새 계약의 fixture로 마이그레이션
4. full BDB 사용 가능 출처의 명시적 라이선스 확보 또는 대체 공개 출처 확정
