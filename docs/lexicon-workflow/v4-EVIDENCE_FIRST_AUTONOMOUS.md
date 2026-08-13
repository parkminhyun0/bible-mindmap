# License-Safe Full-Fidelity Lexicon Workflow — Current Policy SSOT

**Status**: ACTIVE · supersedes the previous Evidence-First v4 and pre-license Full-Fidelity completion/workflow models.
**Compatibility path**: this file keeps its historical filename so existing agents and CI references do not break. Its contents are the current policy and former v4/pre-license rules must not be used for completion decisions.
**Runtime authority**: GitHub-derived `main → active lexicon PR → exact head → CI/review/deploy` first; Notion mirrors current operational state.

## 0. Core principle

> **Rights-safe source admission comes first. Source fidelity defines dictionary quality. Delivery visibility does not.**

No lexical source may enter candidate generation, correction, approval, or redistribution merely because it is freely viewable on the web. The rights status of the original work and the rights/license of the exact digital transcription, correction, or edited dataset actually used must be assessed separately.

H776 `אֶרֶץ` is the Golden baseline for **license-safe full-fidelity preservation and presentation**, not a requirement that every Strong have the same number of nodes or the same depth. Every entry must preserve all information actually present in its admitted pinned source entry. A simple source remains simple; a complex source remains complex.

`Approved`, `Registry`, `Live`, or `App Active` are delivery states. They do **not** mean `Source Quality Complete` unless the entry has passed both the Rights/License gate and the full-fidelity contract below.

## 1. C0 Rights / License source-admission gate

Before any source text is copied, stored, sent to an external model, translated, structurally transformed, or redistributed, record a machine-readable rights packet containing at minimum:

- `sourceWork` — original lexical work;
- `sourceEdition` — edition/publication identity where applicable;
- `digitalDataset` — exact machine-readable dataset actually used;
- `datasetVersion` / git commit or immutable release identifier;
- `sourceLocator` and dataset path;
- `rightsBasis` / exact license expression;
- attribution requirements;
- modification/change-notice requirements;
- ShareAlike / NonCommercial / NoDerivatives or other restrictions;
- whether external LLM input is allowed;
- whether derivative translation is allowed;
- whether full-text storage is allowed;
- whether redistribution is allowed;
- `retrievedAt`;
- canonical content hash/fingerprint.

Fail closed as `LICENSE_HOLD` when any required right is unknown, contradictory, version-ambiguous, or incompatible with the intended project use. Do not silently substitute another web source to fill a gap; use `SOURCE_GAP` or `LICENSE_HOLD` instead.

### 1.1 Public-domain original vs digital dataset

Public-domain status of BDB, Strong's, Thayer, or another historical work does **not** automatically grant reuse rights in every modern website/database presentation of that work. Treat the historical work and the exact digital dataset as separate rights objects.

### 1.2 Canonical-source exclusions

BibleHub and comparable third-party web pages are not canonical scraping/ingest sources for production. They may be used as human reference surfaces or outbound links only. Modern copyrighted components such as NAS-derived content, HELPS Word-studies, site-authored topical material, or other restricted content must not be ingested without explicit compatible permission.

STEP resources are admitted module-by-module/dataset-by-dataset. Never assume one license for the entire STEP service. OpenScriptures or any other repository is admitted only at an exact pinned version/commit with verified license/provenance.

## 2. Full-Fidelity source contract

For every Hebrew entry, use a Rights-PASS pinned BDB/OpenScriptures source identity. For Greek entries, use the Rights-PASS pinned Greek lexical source named by the active book/batch contract.

A quality-complete entry must preserve, where present in the admitted source:
- Strong/lemma identity and source locator/provenance;
- homograph and extended-Strong boundaries;
- part of speech, morphology/stem/binyan or analogous Greek morphology distinctions;
- every sense/subsense and their semantic boundaries;
- qualifiers, usage restrictions, idiomatic/figurative/rare/poetic or other source labels;
- source order and structural relationships when the source encodes them;
- book-level usage/context evidence required by the applicable Tier.

Forbidden shortcuts:
- merging materially distinct source senses into one Korean summary;
- dropping qualifiers or usage restrictions for brevity;
- flattening source distinctions when that loses information;
- inventing extra senses to make another entry look like H776;
- using app visibility as a substitute for source completeness;
- placing theological interpretation inside lexical meaning unless the source itself encodes it. Theological significance must be separate;
- using a rights-unknown or rights-incompatible source for convenience.

## 3. Production workflow

Canonical flow:

`C0 Rights/License PASS`
→ `pinned license-safe source capture`
→ `source structure/information extraction`
→ `Korean candidate or correction candidate`
→ `source fidelity + completeness verification`
→ `book usage/context + morphology verification`
→ `Tier audit / exception handling`
→ `exact-head independent review`
→ `lexicon-human-approval when protected approved data is touched`
→ `Approval Registry`
→ `deterministic public registry/manifests/shards`
→ `safe Strong+lemma app resolution`
→ `GitHub Pages`
→ `Live SHA verification`
→ `Notion sync`
→ `user screen confirmation for UI-visible 100%`.

Research/candidate completion alone is not production completion.

## 4. Re-audit and correction rule for existing Genesis entries

H776 is preserved as the Golden reference unless an actual source or rights regression is proven.

Re-audit scope:
- all currently approved Hebrew entries, including H776 for C0 rights/provenance verification;
- all currently approved non-H776 Hebrew entries for full-fidelity correction review;
- Genesis Batch04;
- Genesis Batch05 and subsequent active candidates;
- Genesis R4 entries.

Existing approved data is protected. Do not silently overwrite it. Required correction path:

`current approved snapshot`
→ `C0 rights/provenance re-audit`
→ `full source re-audit`
→ `correction candidate`
→ `full-fidelity verifier`
→ `existing Tier/audit gates`
→ `exact-head non-author review`
→ `lexicon-human-approval`
→ `Registry correction`
→ `public delivery rebuild`
→ `app/Pages/Live verification`.

An old `full BDB hierarchy PASS`, `App Active`, or pre-license source approval flag is insufficient under this contract unless current Rights/License and full-fidelity Evidence exists.

## 5. Rights-safe provenance display

Every approved Hebrew entry shown in the app must expose enough public provenance to identify the rights-safe source lineage without requiring the user to inspect repository internals. At minimum show:
- original work;
- digital dataset/provider;
- immutable dataset version/commit;
- rights/license basis;
- required attribution;
- change/derivative notice for the Korean translation/structuring;
- source locator when practical.

For the currently admitted Open Scriptures BDB dataset, the public source registry is the machine SSOT for the exact pinned commit, license expression, attribution, change-notice requirement, and content hash. The UI must not imply that BibleHub or another third-party display is the source of the Korean derivative.

## 6. Full-Fidelity report contract

Each corrected or newly promoted entry must have machine-readable evidence containing at minimum:

```json
{
  "strong": "Hxxxx",
  "lemma": "",
  "rightsVerdict": "PASS|LICENSE_HOLD|SOURCE_GAP",
  "sourceWork": "",
  "digitalDataset": "",
  "datasetVersion": "",
  "rightsBasis": "",
  "sourceLocator": "",
  "sourceUnitCount": 0,
  "koMappedUnitCount": 0,
  "missingSourceInformation": [],
  "improperlyMergedSourceInformation": [],
  "extraUnsupportedKoInformation": [],
  "structureMismatch": [],
  "qualifierMismatch": [],
  "identityBoundaryMismatch": [],
  "morphologyBoundaryMismatch": [],
  "provenanceMissing": [],
  "unresolved": [],
  "verdict": "PASS|HOLD|DISPUTE"
}
```

`sourceUnitCount` is determined from the actual admitted source entry. It is **not** forced to equal H776's node count.

PASS requires `rightsVerdict=PASS`, zero missing source information, zero improper merges, zero unsupported Korean additions, zero material structure/qualifier/identity/morphology mismatches, complete provenance, and `unresolved=0`, plus every existing Tier-required gate.

## 7. Tier Router and audit gates

`tier-gate-matrix.json` remains the machine gate matrix. This policy does not weaken any Tier.

- R0–R2: every matrix-required deterministic Evidence gate must PASS.
- R3: required GPT/Claude/Gemini same-baseline evidence and unresolved-zero rules remain mandatory where the matrix requires them. Model majority is never authority.
- R4: never auto-promote. Perform extended research first, then all Tier-required audits, then human final wording.
- Missing required evidence = fail closed.
- Source conflict = HOLD or DISPUTE; do not block unrelated entries that can safely continue.
- Rights uncertainty = `LICENSE_HOLD`; do not substitute with a convenient unreviewed source.

## 8. Protected approval data

Approval Registry, approved meanings, Golden/Gold Set data/contracts, promotion logic, approval schema, and human-exception policy remain protected.

Any PR mutating protected approved data requires:
- exact PR head;
- all required CI and deterministic regression checks green;
- non-author reviewer with write/maintain/admin permission;
- `lexicon-human-approval` success;
- no unresolved required review thread, evidence conflict, or rights conflict.

No self-approval, model-generated human approval, or gate bypass is allowed.

## 9. GPT executor and Jarvis checkpoint verifier

When `RUN_STATE=RUN · EXECUTOR=GPT`:
- GPT is the execution owner for source-rights intake, research, correction candidates, verifier implementation, PR preparation, post-approval Registry/public delivery, Pages/Live verification, and Notion synchronization.
- Jarvis is an independent checkpoint verifier and must not mutate Approval Registry or substitute for required human approval.

Jarvis checkpoint framework:
- **C0 Rights/License** — exact work/dataset/version/license, permitted uses, attribution/change obligations, and content fingerprint;
- **C1 source fidelity** — source locator/existence and Korean/source sense alignment;
- **C2 source completeness** — no omitted or improperly merged source meaning, qualifier, usage, or morphology information; no H776 node-count forcing;
- **C3 fingerprint + exact-head** — unrelated baseline entries unchanged, target identity/fingerprint valid, CI SHA equals PR head;
- **C4 regression** — Golden H776 unchanged, deterministic public rebuild, usage/morphology regression zero;
- **C5 Evidence** — Evidence packet exists, schema/fingerprint/provenance/pinned-source references valid;
- **C6 app presentation** — H776 and corrected entries use the same detailed dictionary presentation contract and show the required license-safe provenance while displaying each entry's actual source-derived information.

A Jarvis baseline snapshot may be used as an external regression oracle, but repository/current PR evidence remains the shared auditable source for promotion decisions.

## 10. App presentation and activation

Approved delivery must follow:

`Approval Registry → public registry/manifests/shards → Strong+lemma resolver → Pages → Live SHA`.

Exact Strong match is preferred. A base Strong may resolve to an extended canonical Strong only when the candidate is unique for that base and lemma identity matches. Multiple homographs, lemma mismatch, missing identity, or unapproved data fail closed.

All approved dictionary details use the same H776-style detailed UI contract:
- lemma;
- Korean transliteration;
- Strong identity;
- part of speech/morphology distinctions where available;
- source-derived meaning structure and qualifiers;
- source/provenance;
- rights/license/attribution/change notice;
- approval/read-only state.

The number/depth of displayed senses follows the actual source entry, not H776's count.

## 11. Parallelism and current execution scope

Research/Evidence/correction preparation can proceed concurrently off the promotion path, but only one dependent main-bound lexicon correction/promotion PR may be active at a time.

**Current GPT execution scope (2026-08-13): Genesis only.** Luke is explicitly outside the GPT execution lane while the user delegates Luke work to Claude. GPT automation must not generate, mutate, promote, or change Luke state until the user reassigns it.

## 12. Status vocabulary

Use these states distinctly:
- `Rights Intake`
- `Rights/License PASS`
- `LICENSE_HOLD`
- `SOURCE_GAP`
- `Research/Candidate`
- `Reaudit Required`
- `Correction In Progress`
- `Source Full-Fidelity PASS`
- `Tier Audit PASS`
- `Approval Required`
- `Delivery Approved`
- `App Active`
- `Live Verified`
- `Source Quality Complete`

Never collapse `App Active` into `Source Quality Complete`.

## 13. Fail-closed rules

Fail closed on any of:
- exact digital dataset/license/version unresolved;
- rights incompatible with translation, model input, storage, or redistribution;
- source identity or locator unresolved;
- missing/merged source information that changes meaning or qualification;
- unsupported Korean sense/addition;
- candidate/evidence/source fingerprint drift;
- required Tier audit missing or failing;
- unresolved review/evidence conflict;
- protected approved data mutation without exact-head human approval;
- Golden H776 regression;
- required CI fail;
- verifier/gate weakening or bypass.

## 14. Notion synchronization

`📚 원어 한글사전 66권 · Public-First 관제 대시보드` is current-state control, not historical truth. It must distinguish Rights/License state, delivery state, and source-quality state and may uncheck an old completion when the new contract reveals regression.

`🗓️ 원어 한글사전 · 일일 변경 브리핑` records material transitions with Strong/lemma, rights verdict, exact dataset/version/license, full-fidelity verdict, fingerprint, PR/head, review, merge, Pages and Live evidence where applicable.

Genesis detail cards use the same workflow vocabulary. Luke state is not changed by GPT while Luke is user-delegated to Claude.

## 15. Superseded rules

The former v4 principle `Human approves POLICY. Evidence approves each Strong` is no longer sufficient as a completion rule for approved production changes. Evidence remains necessary, but rights-safe source admission and protected approved-data human approval are also mandatory.

The following former concepts are superseded as standalone completion rules:
- `Evidence-First v4 completion`;
- pre-license `Full-Fidelity PASS` without Rights/License PASS;
- `full BDB hierarchy complete` without full-fidelity Evidence;
- `Approved/Live/App Active = dictionary quality complete`;
- H776 node-count/depth imitation;
- free-web-viewability as reuse permission.

All agents must use this document's License-Safe Full-Fidelity workflow for new work and for the active Genesis re-audit/correction program.
