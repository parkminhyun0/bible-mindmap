# 누가복음 G2 · 대표 10건 source/context packet 준비

## 판정

- 상태: **PASS**
- 대표 Strong: **10개**
- 준비 완료 packet: **10개**
- 대표 문맥: **70건**
- 실제 provider 호출: **0건**
- 실제 로컬 모델 호출: **0건**
- 서비스 쓰기: **0건**

## 대표 10건

| 순서 | 슬롯 | Strong | lemma | 출현 | 빈도 | 처리 | 문맥 |
|---:|---|---|---|---:|---|---|---:|
| 1 | theology-god | G2316 | θεός | 122 | high | translate | 8 |
| 2 | theology-kingdom | G932 | βασιλεία | 45 | medium | control-retranslate | 8 |
| 3 | theology-salvation-verb | G4982 | σῴζω | 17 | medium | translate | 8 |
| 4 | theology-repentance | G3341 | μετάνοια | 5 | low | translate | 5 |
| 5 | polysemy-spirit | G4151 | πνεῦμα | 36 | medium | control-retranslate | 8 |
| 6 | high-frequency-verb | G3004 | λέγω | 217 | high | translate | 8 |
| 7 | adjective-control | G1342 | δίκαιος | 11 | medium | translate | 8 |
| 8 | proper-name-control | G3137 | Μαρία | 17 | medium | translate | 8 |
| 9 | existing-reuse-control | G3686 | ὄνομα | 34 | medium | control-retranslate | 8 |
| 10 | low-frequency-control | G2 | Ἀαρών | 1 | low | translate | 1 |

## 실행 Gate

- 상태: **blocked-awaiting-explicit-approval**
- 승인 문자열: `RUN-LUKE-G2-CANARY`
- kill switch 기본값: **on**
- 실행 허용: **false**
- provider·로컬·수동 JSON 세 경로 모두 명시 승인 전 비활성입니다.
- 두 초안은 서로의 결과를 보지 않고 독립 생성한 뒤에만 비교합니다.
- R3·R4 및 신학 민감 항목은 자동 승인하지 않습니다.

## 안전 경계

TAGNT의 허용된 원천을 대표 문맥에 사용하고 MorphGNT는 lemma·품사 교차검증에만 사용합니다. 원문·Strong·형태론·성경 본문·기존 사전·사용자 저장 데이터는 변경하지 않습니다.
