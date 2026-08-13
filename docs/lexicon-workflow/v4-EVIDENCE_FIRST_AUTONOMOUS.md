# Full-Fidelity Lexicon Workflow — Current Policy SSOT

**Status**: ACTIVE · supersedes the previous Evidence-First v4 completion/workflow model.
**Compatibility path**: this file keeps its historical filename so existing agents and CI references do not break. Its contents are the current policy and the former v4 rules must not be used for completion decisions.
**Runtime authority**: GitHub-derived `main → active lexicon PR → exact head → CI/review/deploy` first; Notion mirrors current operational state.

## 0. Core principle

> **Source fidelity defines dictionary quality. Delivery visibility does not.**

H776 `אֶרֶץ` is the Golden baseline for **full-fidelity preservation and presentation**, not a requirement that every Strong have the same number of nodes or the same depth. Every entry must preserve all information actually present in its pinned source entry. A simple source remains simple; a complex source remains complex.

`Approved`, `Registry`, `Live`, or `App Active` are delivery states. They do **not** mean `Source Quality Complete` unless the entry has passed the full-fidelity contract below.

## 1. Full-Fidelity source contract

For every Hebrew entry, use the pinned BDB/OpenScriptures source identity. For Greek entries, use the pinned Greek lexical source named by the active book/batch contract.

A quality-complete entry must preserve, where present in the source:
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
- placing theological interpretation inside lexical meaning unless the source itself encodes it. Theological significance must be separate.

## 2. Production workflow

Canonical flow:

`pinned source capture`
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

## 3. Re-audit and correction rule for existing Genesis entries

H776 is preserved as the Golden reference unless an actual source regression is proven.

Re-audit scope:
- all currently approved non-H776 Hebrew entries;
- Genesis Batch04;
- Genesis Batch05 and subsequent active candidates;
- Genesis R4 entries.

Existing approved data is protected. Do not silently overwrite it. Required correction path:

`current approved snapshot`
→ `full source re-audit`
→ `correction candidate`
→ `full-fidelity verifier`
→ `existing Tier/audit gates`
→ `exact-head non-author review`
→ `lexicon-human-approval`
→ `Registry correction`
→ `public delivery rebuild`
→ `app/Pages/Live verification`.

An old `full BDB hierarchy PASS` or `App Active` flag is insufficient under this new contract unless new full-fidelity Evidence exists.

## 4. Full-Fidelity report contract

Each corrected or newly promoted entry must have machine-readable evidence containing at minimum:

```json
{
  "strong": "Hxxxx",
  "lemma": "",
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

`sourceUnitCount` is determined from the actual source entry. It is **not** forced to equal H776's node count.

PASS requires zero missing source information, zero improper merges, zero unsupported Korean additions, zero material structure/qualifier/identity/morphology mismatches, complete provenance, and `unresolved=0`, plus every existing Tier-required gate.

## 5. Tier Router and audit gates

`tier-gate-matrix.json` remains the machine gate matrix. This policy does not weaken any Tier.

- R0–R2: every matrix-required deterministic Evidence gate must PASS.
- R3: required GPT/Claude/Gemini same-baseline evidence and unresolved-zero rules remain mandatory where the matrix requires them. Model majority is never authority.
- R4: never auto-promote. Perform extended research first, then all Tier-required audits, then human final wording.
- Missing required evidence = fail closed.
- Source conflict = HOLD or DISPUTE; do not block unrelated entries that can safely continue.

## 6. Protected approval data

Approval Registry, approved meanings, Golden/Gold Set data/contracts, promotion logic, approval schema, and human-exception policy remain protected.

Any PR mutating protected approved data requires:
- exact PR head;
- all required CI and deterministic regression checks green;
- non-author reviewer with write/maintain/admin permission;
- `lexicon-human-approval` success;
- no unresolved required review thread or evidence conflict.

No self-approval, model-generated human approval, or gate bypass is allowed.

## 7. GPT executor and Jarvis checkpoint verifier

When `RUN_STATE=RUN · EXECUTOR=GPT`:
- GPT is the execution owner for research, correction candidates, verifier implementation, PR preparation, post-approval Registry/public delivery, Pages/Live verification, and Notion synchronization.
- Jarvis is an independent checkpoint verifier and must not mutate Approval Registry or substitute for required human approval.

Jarvis checkpoint framework:
- **C1 source fidelity** — source locator/existence and Korean/source sense alignment;
- **C2 source completeness** — no omitted or improperly merged source meaning, qualifier, usage, or morphology information; no H776 node-count forcing;
- **C3 fingerprint + exact-head** — unrelated baseline entries unchanged, target identity/fingerprint valid, CI SHA equals PR head;
- **C4 regression** — Golden H776 unchanged, deterministic public rebuild, usage/morphology regression zero;
- **C5 Evidence** — Evidence packet exists, schema/fingerprint/provenance/pinned-source references valid;
- **C6 app presentation** — H776 and corrected entries use the same detailed dictionary presentation contract while showing each entry's actual source-derived information.

A Jarvis baseline snapshot may be used as an external regression oracle, but repository/current PR evidence remains the shared auditable source for promotion decisions.

## 8. App presentation and activation

Approved delivery must follow:

`Approval Registry → public registry/manifests/shards → Strong+lemma resolver → Pages → Live SHA`.

Exact Strong match is preferred. A base Strong may resolve to an extended canonical Strong only when the candidate is unique for that base and lemma identity matches. Multiple homographs, lemma mismatch, missing identity, or unapproved data fail closed.

All approved dictionary details use the same H776-style detailed UI contract:
- lemma;
- Korean transliteration;
- Strong identity;
- part of speech/morphology distinctions where available;
- source-derived meaning structure and qualifiers;
- provenance;
- approval/read-only state.

The number/depth of displayed senses follows the actual source entry, not H776's count.

## 9. Parallelism and FIFO

Genesis correction/research and Luke research may run concurrently. HOLD/DISPUTE on one entry does not stop unrelated research.

Only one dependent main-bound lexicon correction/promotion PR may be active at a time. Research/Evidence/correction preparation can proceed concurrently off the promotion path.

## 10. Status vocabulary

Use these states distinctly:
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

## 11. Fail-closed rules

Fail closed on any of:
- source identity or locator unresolved;
- missing/merged source information that changes meaning or qualification;
- unsupported Korean sense/addition;
- candidate/evidence/source fingerprint drift;
- required Tier audit missing or failing;
- unresolved review/evidence conflict;
- protected approved data mutation without exact-head human approval;
- Golden H776 regression;
- license unknown/prohibited;
- required CI fail;
- verifier/gate weakening or bypass.

## 12. Notion synchronization

`📚 원어 한글사전 66권 · Public-First 관제 대시보드` is current-state control, not historical truth. It must distinguish delivery state from source-quality state and may uncheck an old completion when the new full-fidelity contract reveals regression.

`🗓️ 원어 한글사전 · 일일 변경 브리핑` records material transitions with Strong/lemma, source/full-fidelity verdict, fingerprint, PR/head, review, merge, Pages and Live evidence where applicable.

Genesis/Luke detail cards use the same workflow vocabulary.

## 13. Superseded rules

The former v4 principle `Human approves POLICY. Evidence approves each Strong` is no longer sufficient as a completion rule for approved production changes. Evidence remains necessary, but protected approved-data mutation still requires the exact-head human approval defined above.

The following former concepts are superseded as standalone completion rules:
- `Evidence-First v4 completion`;
- `full BDB hierarchy complete` without full-fidelity Evidence;
- `Approved/Live/App Active = dictionary quality complete`;
- H776 node-count/depth imitation.

All agents must use this document's Full-Fidelity workflow for new work and for the active Genesis re-audit/correction program.
