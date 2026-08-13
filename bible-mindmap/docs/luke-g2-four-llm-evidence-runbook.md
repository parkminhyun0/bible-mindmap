# 누가복음 G2 · License-Safe Full-Fidelity Runbook

정책 SSOT: `docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md`.

누가복음은 창세기와 콘텐츠 Lane을 분리하지만 동일한 Full-Fidelity 기준을 적용한다. 허용 AI는 GPT·자비스·Claude·Gemini뿐이다. 사용자는 정상 Strong 의미를 항목별로 검수하지 않는다.

## 순서
1. TAGNT/MorphGNT 본문·형태론 baseline 유지.
2. 실제 Greek lexical sense-tree source를 exact dataset/version/license/fingerprint로 C0 Rights 입장한다. TAGNT/MorphGNT는 이를 대신하지 않는다.
3. 대표 10 Strong 각각에서 source entry 전체를 capture한다.
4. `sourceUnitCount`, `koMappedUnitCount`, `sourceAccount[]`, `usageQualifier[]`, `representativeRefs[]`, `lukeRefs[]`, `morphologyForms[]`, `rightsBasis`, `candidateFingerprint`를 기록한다.
5. missing/merge/unsupported/structure/qualifier/identity/morphology/provenance gap이 0인지 검증한다.
6. 70 representative contexts에서 exact Strong/lemma, morphology, sense-to-context, Luke usage를 검증한다.
7. GPT candidate → Jarvis audit → Claude blind audit → Gemini boundary audit → deterministic comparison → GPT public-evidence adjudication.
8. `unresolved=0`만 PASS. 나머지는 HOLD/DISPUTE.
9. protected Registry 변경은 별도 repository governance 후 배포한다.

R4도 extended public research를 추가할 뿐 Strong별 human-final-wording 단계는 두지 않는다. H776 node 수를 모방하지 않는다.

현재: candidate 0/1,979 · production write 0 · Full-Fidelity mapping 0/10 · Greek lexical source Rights admission부터 진행.
