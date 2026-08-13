# 성경 66권 원어 한글사전 · Full-Fidelity 공통 운영 시스템

- 버전: 6.0
- 상태: ACTIVE
- Source of Truth: GitHub `parkminhyun0/bible-mindmap`
- 유일 품질 정책 SSOT: `docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md`
- Golden Reference: `GEN-1-1-H776`

## 공통 흐름

`C0 Rights PASS → pinned source capture → deterministic source units → Evidence Packet → Korean candidate → Full-Fidelity verifier → book context/morphology/corpus verifier → GPT/자비스/Claude/Gemini independent evidence → deterministic comparison → GPT public-evidence adjudication → PASS|HOLD|DISPUTE → protected Registry governance → public dictionary → app/Pages/Live`.

## 모든 Strong의 동일 기본 Gate

R0–R4 모두 rights/license, source identity, source full-fidelity, sense structure, qualifier completeness, morphology boundary, corpus alignment, Korean naturalness, theological overreach, provenance completeness, Fixed Four independence, same-baseline fingerprint, deterministic comparison, unresolved-zero, regression을 AND로 통과한다.

`sourceUnitCount = koMappedUnitCount`가 필수이며 missing/merged/unsupported source information과 structure/qualifier/identity/morphology/provenance/corpus mismatch는 모두 0이어야 한다.

Tier는 품질을 낮추지 않고 연구 깊이만 더한다. R3는 Rights-PASS 공개 신학·어휘 Evidence를 추가하고 R4는 extended public lexical/scholarly/biblical-usage research를 추가한다. R4도 Evidence가 해결되면 GPT가 semantic PASS를 판정하고, 해결되지 않으면 HOLD/DISPUTE다.

## Fixed Four

의미 생성·감사·쟁점 판정은 GPT·자비스·Claude·Gemini만 사용한다. 네 역할은 동일 pinned Evidence baseline에서 독립 제출한다. 추가 LLM, 로컬 모델, 임시 tie-breaker는 금지한다. 모델 다수결은 의미 권위가 아니다.

## 사용자 Gate

사용자는 정상 Strong의 의미를 하나씩 선택하지 않는다. semantic Evidence가 해결되면 GPT가 최종 판정한다. protected Registry 저장소 승인, 정책 자체 변경, Production/실제 화면 확인은 별도 governance다.

## 책별 Lane

창세기와 누가복음은 source packet·branch·PR·진행 상태를 섞지 않는다. 그러나 검증 깊이는 동일하다. 창세기는 Rights-PASS Hebrew lexical source, 누가복음은 Rights-PASS Greek lexical source를 사용한다.

## 완료

Strong semantic 완료와 delivery 완료를 구분한다. UI-visible 100%는 Pages/Live SHA 일치와 사용자 실제 화면 확인 후에만 사용한다.

## 폐기

Evidence-First 단독 완료, 3-of-3 consensus 권위, 낮은 Tier의 일부 AI 검증, R4 per-Strong wording 선택, H776 node 수 복제는 활성 규칙이 아니다. 새 세션은 유일 SSOT만 읽는다.
