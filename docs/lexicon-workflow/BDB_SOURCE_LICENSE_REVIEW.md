# Full-definition BDB 출처 라이선스 검토 v1

- 검토 대상: `unfoldingWord/Brown-Driver-Briggs-Enhanced`
- 고정 commit: `5a7a632d6923641c4a71dbf23df719711e3d2041`
- 현재 판정: `clarification-required`
- Registry 유지 상태: `internal-review-only`
- 자동 처리: 차단
- candidate generation: 차단

## 1. 목적

창세기 H776 Golden Reference와 실제 full-definition BDB source tree를 대조하려면, 원문 전체 저장·결정론적 파싱·모델 처리·한국어 파생 번역·파생 데이터 재배포 권한이 모두 확인되어야 한다. 원전 BDB의 퍼블릭 도메인 여부만으로 후대 디지털 편집·구조화·교정 데이터의 권리를 추정하지 않는다.

## 2. 후보 비교

| 후보 | 구조 적합성 | 직접 라이선스 증거 | 현재 판정 |
|---|---:|---|---|
| OpenScriptures HebrewLexicon BDB | full hierarchy·Strong/TWOT 연결 | 저장소 단위 명시 라이선스 미확인 | blocked |
| unfoldingWord BDB Enhanced | unabridged·sense/stem/subsense 구조 | README의 버전 없는 `CC BY` | internal-review-only |
| eliranwong unabridged BDB | unabridged·원순서·Strong mapping | 원전 PD 선언은 있으나 formatting·교정의 명시 허가 불충분 | upstream evidence only |
| STEPBible TBESH | Extended Strong·축약 의미 | CC BY 4.0 명확 | approved secondary control |
| STEPBible full formatted BDB | 요구 구조와 잠재적으로 일치 | 검토 시점에 배포 데이터 없음 | unavailable |

## 3. 직접 증거와 간접 증거

### 직접 적용되는 증거

고정 commit의 README는 다음을 선언한다.

- BDB 원전은 public domain
- 저장소의 changes and additions는 `CC BY`
- 사용 시 저장소 링크 제공

그러나 다음이 빠져 있다.

- Creative Commons 정확한 버전
- 독립된 LICENSE 파일
- GitHub가 감지한 SPDX 식별자
- 저장·모델 처리·번역 파생물·재배포에 대한 저장소/commit 단위 명시

### 간접 조직 정책

unfoldingWord 공식 콘텐츠 페이지는 UHAL을 `CC BY-SA 4.0`으로 표시한다. 다만 이 정책이 검토 중인 GitHub 저장소와 고정 commit의 `Entries/`, `bdbToStrongsMapping.csv`에 직접 적용된다는 연결 문서는 확인되지 않았다. 따라서 조직 정책을 저장소의 정확한 라이선스로 자동 전이하지 않는다.

### upstream 계보

BDB Enhanced README는 `eliranwong/unabridged-BDB-Hebrew-lexicon`을 base data로 명시한다. upstream README는 BDB 문서를 public domain이라고 설명하지만 formatting, 성경 참조 교정, 보충 데이터의 권리를 하나의 정확한 라이선스로 부여하지 않는다. 이 때문에 upstream public-domain 문구만으로 enhanced 데이터셋 전체를 승인하지 않는다.

## 4. 현재 권리 Gate

허용:

- 저장소·README·commit·파일 경로 같은 metadata 조회
- 내부 라이선스 검토와 검토 결과 저장

차단:

- full text 저장 및 자동 fingerprint 승격
- 외부 모델 처리 입력
- 한국어 번역 파생물 생성
- 파생 데이터 재배포
- full-definition adapter 실행
- H776 actual-source tree 대조
- candidate generation

## 5. 승인 승격 조건

다음 근거가 저장소와 고정 commit에 직접 연결되어야 한다.

1. 정확한 라이선스 식별자와 안정적인 라이선스 URL
2. `Entries/`와 `bdbToStrongsMapping.csv`에 대한 적용 범위
3. full-text 저장 허용
4. hosted model-processing 허용
5. 한국어 번역 파생물 생성 허용
6. 파생 데이터 재배포 허용
7. attribution·변경 고지·share-alike 의무
8. upstream formatting·교정·보충 데이터의 권리 정리

위 조건이 확인된 뒤에만 다음 순서로 진행한다.

```text
license approved
→ approved-pending-fingerprint
→ canonical fingerprint
→ approved-ready
→ dedicated source adapter
→ H776 actual-source tree diff
```

## 6. 권리 확인 요청 초안

공개 문의나 이메일 전송은 별도 승인 후 수행한다. 문의 시 다음 네 가지를 한 번에 확인한다.

- 고정 commit에 적용되는 정확한 CC 라이선스 버전
- 공식 UHAL `CC BY-SA 4.0` 정책과 이 저장소의 관계
- full-text 저장·hosted model-processing·한국어 파생 번역·재배포 허용 여부
- 필요한 attribution·modification notice·share-alike 조건

## 7. 기계 계약

- 검토 원본: `data/lexicon/source-reviews/unfoldingword-bdb-enhanced.license-review.v1.json`
- 스키마: `data/lexicon/schemas/SourceLicenseReview.schema.json`
- verifier: `scripts/verify-lexicon-source-license-review.mjs`
- CI: `Lexicon Source Registry Gate`

verifier는 정확한 직접 증거가 추가되기 전에 Registry를 `approved` 또는 `approved-ready`로 바꾸거나 candidate generation을 활성화하는 변경을 차단한다.
