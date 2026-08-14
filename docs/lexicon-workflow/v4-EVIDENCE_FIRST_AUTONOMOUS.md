# License-Safe Full-Fidelity Lexicon Workflow — Current Policy SSOT

**Status**: ACTIVE · mandatory.
**Supersedes**: all previous Evidence-First v4, pre-license Full-Fidelity, Genesis-only BDB-presentation, and `Approved/Live = quality complete` rules.
**Runtime authority**: GitHub-derived `main → active lexicon PR → exact head → CI/review/deploy` first; Notion mirrors current operational state.

## 0. Core principle

> **Rights-safe source admission comes first. Source fidelity defines dictionary quality. Delivery visibility does not.**

H776 `אֶרֶץ` is the Golden baseline for license-safe full-fidelity preservation and presentation, not a node-count/depth template. A simple source remains simple; a complex source remains complex.

`Approved`, `Registry`, `Live`, or `App Active` do not imply `Source Quality Complete` unless Rights/License, Full-Fidelity source accounting, book usage/morphology, required Tier gates, and the app presentation contract all pass.

## 1. C0 Rights / License source-admission gate

Before source text is copied, translated, structurally transformed, sent to an external model, stored, or redistributed, pin:
- original work and edition;
- exact digital dataset and immutable version/commit;
- source locator;
- license/rights basis;
- attribution and modification/change-notice requirements;
- whether derivative translation, full-text storage, model input, and redistribution are permitted;
- retrieved-at identity and content fingerprint.

`C0 Rights/License PASS` is required before source use. Unknown, contradictory, version-ambiguous, or incompatible rights fail closed as `LICENSE_HOLD`.

Public-domain status of BDB, Strong's, Thayer, or another historical work does not automatically grant reuse rights in every modern website/database presentation. BibleHub and comparable web displays are not canonical scraping/ingest sources. Modern copyrighted NAS-derived material, HELPS, site-authored topical/editorial material, or other restricted content is excluded unless compatible permission is explicit.

For the admitted Hebrew pipeline, BDB 1906 and the exact pinned Open Scriptures Hebrew Lexicon dataset are separate rights objects and both must be recorded.

## 2. Full-Fidelity source contract

**This contract applies to the entire Old Testament, not Genesis only.**

Every Hebrew/Aramaic Strong entry that is researched, corrected, approved, delivered, or displayed in the Korean lexicon must preserve every material element present in its Rights-PASS pinned BDB/OpenScriptures source, where applicable:
- Strong/lemma and homograph/extended-Strong identity;
- part of speech;
- BDB form-list;
- morphology/stem/binyan distinctions;
- every sense/subsense and source order;
- qualifiers and usage restrictions;
- usage groups and semantic boundaries;
- idiomatic/figurative/rare/poetic labels;
- representative biblical references;
- book-level usage/context and morphology required by Tier;
- source/provenance and rights metadata.

Forbidden shortcuts:
- flattening materially distinct BDB structures into a short Korean summary;
- dropping a form-list, qualifier, usage restriction, usage group, or representative-reference boundary for brevity;
- hiding material Full-Fidelity structure in research artifacts while the Korean app shows only a reduced `approvedSenseTree` summary and still calling that `Full-Fidelity App Active`;
- inventing senses to imitate H776's node count;
- adding theology to lexical meaning unless the admitted source itself encodes it.

The previous Genesis-only scope is superseded and must not be used as an execution rule.

## 3. Production workflow

Canonical flow:

`C0 Rights/License PASS`
→ `pinned source full capture`
→ `sourceAccount / structure extraction`
→ `Korean candidate/correction`
→ `Full-Fidelity Korean presentation serialization`
→ `source fidelity + completeness verification`
→ `book usage/context + morphology verification`
→ `Tier audit / exception handling`
→ `exact-head independent review`
→ `lexicon-human-approval when protected approved data is touched`
→ `Approval Registry`
→ `deterministic public registry/manifests/shards`
→ `Full-Fidelity presentation linkage`
→ `Strong+lemma app resolver`
→ `GitHub Pages`
→ `Live SHA verification`
→ `Notion sync`
→ `user screen confirmation for UI-visible 100%`.

Research/candidate completion alone is not production completion.

## 4. Mandatory Korean presentation serialization

For every material BDB source account intended for approved app delivery, there must be a source-faithful Korean presentation record traceable to the same immutable Full-Fidelity candidate/evidence identity.

The presentation layer must preserve:
- source-account order and grouping;
- form-list boundaries;
- sense/subsense boundaries;
- qualifier/usage-group boundaries;
- representative references;
- morphology labels;
- source locator;
- candidate fingerprint;
- approved Evidence fingerprint.

The presentation layer must not rewrite or silently replace the approved Korean sense tree. It may enrich the approved meaning with verified source structure only when:
1. canonical Strong/lemma identity matches;
2. the approved Evidence fingerprint matches the presentation baseline;
3. protected Korean node text remains byte-consistent with the approved baseline where the presentation claims unchanged wording;
4. every material sourceAccount is accounted for;
5. no unsupported semantic expansion is introduced.

If any invariant fails, the Full-Fidelity enrichment fails closed and `Full-Fidelity App Active` must not be claimed.

## 5. Existing Old Testament entry correction rule

H776 is preserved as the Golden reference unless an actual source or rights regression is proven.

All currently approved Old Testament Hebrew/Aramaic entries are subject to this same contract. Existing approved data is protected and must not be silently overwritten.

Required correction path:

`current approved snapshot`
→ `C0 rights/provenance re-audit`
→ `full BDB source re-audit`
→ `correction candidate`
→ `Full-Fidelity presentation artifact`
→ `verifier`
→ `Tier/audit gates`
→ `exact-head non-author review`
→ `lexicon-human-approval`
→ `Registry/delivery correction when required`
→ `app/Pages/Live verification`.

An old `full BDB hierarchy PASS`, `App Active`, pre-license approval, or book-local completion flag is insufficient unless current rights-safe Full-Fidelity Evidence and presentation exist.

## 6. Rights-safe provenance display

Every approved Old Testament entry shown in the app must expose enough public provenance to identify:
- original work;
- digital dataset/provider;
- immutable version/commit;
- rights/license basis;
- attribution;
- derivative/change notice;
- source locator when practical.

The UI must not imply that BibleHub or another third-party display is the canonical source of the Korean derivative.

Full-Fidelity PASS additionally requires all applicable checks to be zero/clean:
- missing source information;
- improperly merged source information;
- unsupported Korean information;
- structure mismatch;
- qualifier mismatch;
- identity/homograph mismatch;
- morphology mismatch;
- presentation-account omission;
- provenance missing;
- unresolved conflict.

`sourceUnitCount` comes from the actual admitted source. Never force another entry to equal H776's node count.

## 7. Tier Router and audit gates

`tier-gate-matrix.json` remains authoritative and no Tier may be weakened.
- R0–R2: all required deterministic Evidence gates PASS.
- R3: required same-baseline model/audit evidence remains mandatory where the matrix requires it; model majority is never authority.
- R4: never auto-promote; extended research and human final wording remain mandatory.

Missing required evidence fails closed. Source conflict remains HOLD/DISPUTE. Rights uncertainty remains `LICENSE_HOLD`.

## 8. Protected approval data

Approval Registry, approved meanings, Golden/Gold Set data/contracts, promotion/approval policy, approval schema, and protected presentation data remain human-review protected.

Any PR mutating protected approved data requires:
- exact PR head;
- all required CI and deterministic regression checks green;
- non-author reviewer with write/maintain/admin permission;
- `lexicon-human-approval` success;
- no unresolved required review thread, evidence conflict, or rights conflict.

No self-approval, synthesized human approval, or gate bypass.

## 9. GPT executor and Jarvis checkpoint verifier

Executor routing is operational only and never narrows this Old-Testament-wide quality contract. When an executor is authorized by current runtime state, it may perform only the actions that governance permits; protected human approval is never synthesized by an agent.

Jarvis checkpoint framework:
- **C0 Rights/License** — exact work/dataset/version/license and permitted uses.
- **C1 source fidelity** — source locator/existence and Korean/source alignment.
- **C2 source completeness** — no omitted/merged sense, qualifier, usage, morphology, or presentation account.
- **C3 fingerprint + exact-head** — baseline/fingerprint/current head consistency.
- **C4 regression** — H776 and unrelated approved entries unchanged; deterministic rebuild.
- **C5 Evidence** — packet/schema/provenance/pinned-source references valid.
- **C6 app presentation** — the Korean dictionary reproduces the actual BDB structural boundaries and rights-safe provenance; summary-only rendering is not Full-Fidelity PASS.

## 10. App presentation and activation

All approved Old Testament Hebrew/Aramaic dictionary details use the same quality contract as H776, while the actual number and depth of senses follow each source entry.

Required visible structure where present:
- lemma;
- Korean transliteration;
- Strong identity;
- part of speech;
- **BDB form-list**;
- **sense/subsense hierarchy**;
- **qualifiers and usage restrictions**;
- **usage groups**;
- **representative references**;
- **morphology/form distinctions**;
- provenance;
- rights/license/attribution/change notice;
- approval/read-only state.

`approvedSenseTree`-only rendering is not sufficient when verified Full-Fidelity metadata contains additional material BDB structure.

Exact Strong match is preferred. Base-Strong alias resolution is allowed only when unique and lemma identity matches. Ambiguous homographs, lemma mismatch, missing identity, or unapproved data fail closed.

Approved activation follows `Approval Registry → deterministic public registry/manifests/shards → Full-Fidelity presentation linkage → Strong+lemma resolver → Pages → Live SHA`.

## 11. Parallelism and execution scope

Research/Evidence/presentation preparation may proceed concurrently across Old Testament books and lemmas. A HOLD/DISPUTE blocks only the affected entry when unrelated work can safely continue.

Only one dependent main-bound correction/promotion implementation PR should be active at a time unless the active governance explicitly permits independent non-overlapping delivery.

A book-specific executor assignment is an operational routing decision only; it never narrows this Old Testament quality contract.

## 12. Status vocabulary

Use distinctly:
`Rights Intake → Rights/License PASS → Research/Candidate → Reaudit Required → Correction In Progress → Source Full-Fidelity PASS → Presentation Ready → Tier Audit PASS → Approval Required → Delivery Approved → App Active → Live Verified → Source Quality Complete`.

`App Active` and `Source Quality Complete` are never interchangeable. `Full-Fidelity App Active` requires the presentation contract in §10.

## 13. Fail-closed rules

Fail closed on:
- unresolved dataset/license/version;
- incompatible rights;
- unresolved source identity/locator;
- missing/merged material BDB information;
- missing Korean presentation for a material sourceAccount intended for app delivery;
- unsupported Korean addition;
- fingerprint drift;
- required Tier audit missing/failing;
- unresolved evidence/review conflict;
- protected mutation without exact-head human approval;
- H776 regression;
- required CI failure;
- verifier/gate weakening or bypass.

## 14. Notion synchronization

`📚 원어 한글사전 66권 · Public-First 관제 대시보드` mirrors current state. `🗓️ 원어 한글사전 · 일일 변경 브리핑` records material transitions.

All Old Testament book cards inherit this exact contract. No book card may define a weaker Genesis-only or local presentation rule.

## 15. Superseded rules

The following are deleted as execution/completion rules:
- Genesis-only BDB Full-Fidelity presentation scope;
- `approvedSenseTree` summary-only rendering as sufficient Full-Fidelity app delivery;
- Evidence-First completion without current Rights/License PASS;
- pre-license Full-Fidelity completion;
- `Approved/Live/App Active = dictionary quality complete`;
- H776 node-count/depth imitation;
- free-web-viewability as reuse permission.

All agents must use this Old-Testament-wide License-Safe BDB Full-Fidelity workflow for current and future Hebrew/Aramaic lexicon work.
