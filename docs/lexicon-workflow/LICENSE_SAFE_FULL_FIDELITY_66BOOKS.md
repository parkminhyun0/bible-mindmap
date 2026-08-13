# 66권 원어 한글사전 · License-Safe Full-Fidelity SSOT

**Status: ACTIVE · sole semantic-quality policy SSOT**

Genesis와 Luke는 콘텐츠·브랜치·PR을 분리하지만 검증 기준은 동일하다. 새 책도 이 규정을 상속한다.

## 권위와 AI
의미 권위는 `원문 → 문맥/형태론/용례 → Rights-PASS 공개 원어사전 → Rights-PASS 공개 신학·어휘자료 → GPT·자비스·Claude·Gemini 독립 분석` 순서다. 모델 다수결은 권위가 아니다. 허용 AI는 네 역할뿐이며 제5 LLM·로컬/Ollama·임시 tie-breaker는 금지한다. 사용자는 정상 Strong 의미를 항목별로 고르지 않는다. 미해결은 `HOLD/DISPUTE`다.

## C0 Rights
Lexical source 사용 전에 original work와 exact digital dataset을 별개로 심사하고 `sourceWork/sourceEdition/digitalDataset/datasetVersion/sourceLocator/rightsBasis/attribution/changeNotice/externalLlmInputAllowed/derivativeTranslationAllowed/fullTextStorageAllowed/redistributionAllowed/retrievedAt/contentFingerprint`를 고정한다. 불명확하면 `LICENSE_HOLD`. 제3자 웹 화면은 canonical ingest source가 아니다.

## Full-Fidelity
각 admitted source entry에서 실제 존재하는 Strong/lemma identity, homograph/extended boundary, POS/morphology, every sense/subsense, parent/depth/order, qualifier/usage restriction, idiomatic·figurative·rare·poetic label, representative refs, book-specific refs, provenance/rights를 손실 없이 보존한다. H776 node 수를 모방하지 않는다.

각 candidate는 `sourceUnitCount`, `koMappedUnitCount`, `missingSourceInformation[]`, `improperlyMergedSourceInformation[]`, `extraUnsupportedKoInformation[]`, `structureMismatch[]`, `qualifierMismatch[]`, `identityBoundaryMismatch[]`, `morphologyBoundaryMismatch[]`, `provenanceMissing[]`, `unresolved[]`를 기록한다. PASS는 Rights PASS + complete source↔Korean traceability + 모든 material gap=0의 AND 조건이다.

## Handoff와 본문 검증
공통 ladder는 `RESEARCH_IN_PROGRESS → CORRECTION_CANDIDATE_INCOMPLETE → HANDOFF_READY → VERIFIER_READY`. 필수 expansion은 `sourceAccount[]`, `usageQualifier[]`, `representativeRefs[]`, book-specific refs, `morphologyForms[]`, `rightsBasis`, `candidateFingerprint`. 이후 exact token/Strong/lemma, morphology/POS/stem/form, sense-to-context, book usage를 별도 검증한다.

## Tier 공통 Gate
모든 Tier는 최소 `rights-license`, `source-fidelity`, `source-completeness`, `sense-boundary`, `qualifier-preservation`, `identity-boundary`, `morphology`, `corpus-alignment`, `korean-naturalness`, `theological-overreach`, `provenance`, `fingerprint-same-baseline`, `regression`, `fixed-four-independent-evidence`, `deterministic-comparison`, `gpt-public-evidence-adjudication`, `unresolved-zero`를 AND로 요구한다. R3는 네 역할 전수 + 공개 lexical/theological Evidence, R4는 extended public research를 추가한다. R4도 사용자 Strong별 human-final-wording 단계는 두지 않는다.

## 최종 판정·승인·배포
GPT는 source와 public Evidence를 네 독립 보고서보다 우선해 최종 판정한다. `unresolved=0`만 semantic PASS다. Approval Registry/approved meaning/Golden 등 protected 변경은 repository governance approval을 별도로 거친다. 이는 semantic 재번역이 아니다. H776은 Golden regression control이며 node-count template가 아니다.

Canonical flow: `C0 Rights → pinned source → Full-Fidelity Evidence → Korean candidate → source completeness → book context/morphology → Tier research → Fixed Four independent evidence → deterministic comparison → GPT adjudication → PASS|HOLD|DISPUTE → protected approval if required → Registry → app → Pages/Live/shipped-content verification → Notion → user screen confirmation`.

## 폐기
Evidence-First 단독 완료, Rights 없는 Full-Fidelity, 3-of-3 모델 합의 권위, R4 human-final-wording 정상 단계, App Active=Source Quality Complete, H776 node-count 복제, local/Ollama/provider semantic judge는 재사용 금지다. Active docs/verifiers/workflows/Notion은 이 파일 하나만 semantic-quality policy SSOT로 참조한다.
