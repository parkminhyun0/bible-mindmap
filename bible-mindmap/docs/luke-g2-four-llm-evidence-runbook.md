# 누가복음 G2 · License-Safe Full-Fidelity Runbook

공통 품질 SSOT는 `docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md`다. 누가복음은 창세기와 **동일한 검증 깊이**를 적용하며 Greek source만 책별로 다르다.

## 실행 순서

1. 기존 TAGNT/MorphGNT C0 Rights PASS를 보존한다.
2. 대표 10 Strong에 사용할 Rights-PASS pinned Greek lexicon을 정식 source로 등록한다.
3. 각 Greek lexicon entry를 deterministic source unit으로 분해한다.
4. `sourceUnitCount`와 `koMappedUnitCount`를 1:1 추적한다.
5. 모든 sense/subsense, parent/depth/order, qualifier, usage restriction, identity/homograph, morphology, provenance를 보존한다.
6. 누가복음 실제 문맥·형태론·용례와 후보를 대조한다.
7. GPT·자비스·Claude·Gemini가 동일 pinned Evidence baseline에서 독립 검증한다.
8. deterministic comparison 후 GPT가 public-Evidence-first 최종 판정한다.
9. missing/merged/unsupported 정보, structure/qualifier/identity/morphology/provenance/corpus mismatch, theological overreach, unresolved가 모두 0일 때만 PASS다.
10. 해결되지 않는 항목은 HOLD/DISPUTE로 격리하고 다음 안전 항목을 계속 진행한다.

## Tier

R0–R4 모두 동일 Full-Fidelity 기본 Gate를 통과한다. R3는 Rights-PASS 공개 신학·어휘 Evidence를 추가하고 R4는 extended public lexical/scholarly/biblical-usage research를 추가한다. R4도 Evidence가 해결되면 GPT가 semantic PASS를 판정한다.

## 사용자 역할

정상 Strong의 의미를 사용자가 하나씩 고르지 않는다. protected Registry 저장소 승인과 Production/실제 화면 확인은 semantic 판정과 별도다.

## 현재 10 Strong

기존 10 Strong · 70 representative contexts는 source/context 원자료로 재사용한다. 다음 실제 단계는 Greek lexicon C0 등록 → full lexical entry capture → 10 Strong Full-Fidelity report 생성이다.
