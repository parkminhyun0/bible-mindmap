# Genesis Full-Fidelity Handoff Specification

Status: **ACTIVE · handoff specification** (not a research candidate)

**Purpose.** Machine-aligned contract for what a Genesis Korean-lexicon correction candidate must contain before Jarvis independent C1–C6 verification may run. Mirrors the executable classifier in `bible-mindmap/scripts/lib/lexicon-full-fidelity-handoff.mjs`.

**Non-goal.** This document does not author Korean lexical content. Filling the required fields is GPT Genesis research responsibility.

## Reference implementation

- Classifier: `bible-mindmap/scripts/lib/lexicon-full-fidelity-handoff.mjs`
- CLI: `bible-mindmap/scripts/verify-lexicon-full-fidelity-handoff.mjs` (`--self-test`, `--json`)
- npm script: `verify:lexicon-full-fidelity-handoff`
- CI enforcement: `bible-mindmap/scripts/verify-genesis-p5-gpt-candidates.mjs` (imported; runs on every P5 bundle change via `Genesis P5 GPT Candidate Contract` workflow)
- Baseline PR: [#358](https://github.com/parkminhyun0/bible-mindmap/pull/358) → merge SHA `1add7736af40f64f8b30d152afc49902a271042d`

If this document and the classifier disagree, the **classifier wins** and this document must be corrected. Never relax the classifier to match documentation.

## Classification ladder

| Class | Meaning | Objective test |
|---|---|---|
| `RESEARCH_IN_PROGRESS` | Candidate skeleton missing | `candidateId`, `identity.lemma`, `identity.transliterationKo`, or `nodes` absent/empty |
| `CORRECTION_CANDIDATE_INCOMPLETE` | Candidate exists but not Full-Fidelity | Any required expansion field missing OR lemma-specific baseline unmet |
| `HANDOFF_READY` | Full-Fidelity fields + lemma-specific coverage satisfied | Passes generic + lemma-specific checks; C1–C6 may run |
| `VERIFIER_READY` | HANDOFF_READY + governance closed-write invariants + fingerprint self-consistency | Ready for promotion PR pipeline once C1–C6 returns PASS |

`HANDOFF_READY` and `VERIFIER_READY` never automatically equal `PASS`. Only Jarvis independent C1–C6 can return `PASS` / `HOLD` / `DISPUTE`.

## Required Full-Fidelity expansion fields

Every Genesis correction candidate MUST contain, in addition to the existing `TranslationRecord.schema.json` fields:

- `sourceAccount[]` — array; each entry ties one candidate node to its BDB print source with `{sourceNodeId, bdbLocator, capturedText}`. Non-empty array.
- `usageQualifier[]` — array of qualifier objects/strings capturing the BDB print entry's usage restrictions.
- `representativeRefs[]` — array of scripture references documented in the BDB print entry.
- `genesisRefs[]` — subset of representative references limited to Genesis; must have at least the lemma-specific minimum.
- `morphologyForms[]` — array of morphology form objects; each entry `{stem, form, gloss}` (or equivalent).
- `rightsBasis` — object with at minimum `{datasetCommit, license, attribution}` pinning the source-of-truth commit.

**Fingerprint self-consistency.** `candidateFingerprint` must equal `sha256(stableStringify(candidate - candidateFingerprint))`. `MISSING_CANDIDATE_FINGERPRINT` or `CANDIDATE_FINGERPRINT_DRIFT` demotes to `HANDOFF_READY` or lower.

**Governance closed-write invariants (all `false`).** `finalApprovalAllowed`, `approvalRegistryWriteAllowed`, `serviceUiWriteAllowed`, `productionWriteAllowed`, `existingApprovedMeaningMutationAllowed`. Any `true` value emits `GOVERNANCE_OPEN_WRITE:<key>` and blocks `VERIFIER_READY`.

**Claim-vs-reality guard.** If candidate `status` claims `handoff-ready` / `verifier-ready` / `pass` / `approved` while classifier disagrees, the CI job fails with `HANDOFF_READY_CLAIMED_BUT_INCOMPLETE:<claim>→<observed>`.

## Reason codes

Exact strings emitted by the classifier:

- `MISSING_SOURCE_ACCOUNT`
- `MISSING_USAGE_QUALIFIERS`
- `MISSING_REPRESENTATIVE_REFS`
- `MISSING_GENESIS_REFS` (also `MISSING_GENESIS_REFS:min=<N>` for lemma-specific minima)
- `MISSING_MORPHOLOGY_FORMS`
- `MISSING_RIGHTS_BASIS`
- `FULL_FIDELITY_GAP_UNRESOLVED`
- `LEMMA_QUALIFIER_MISSING:<regex>`
- `MORPHOLOGY_STEM_MISSING:<stem>`
- `GOVERNANCE_OPEN_WRITE:<governance-key>`
- `CANDIDATE_FINGERPRINT_DRIFT`
- `MISSING_CANDIDATE_FINGERPRINT`
- `HANDOFF_READY_CLAIMED_BUT_INCOMPLETE:<claim>→<observed>`

## Lemma-specific baselines

Encoded in `LEMMA_SPECIFIC_REQUIREMENTS` in the classifier.

### H1254a בָּרָא · Bara

- `usageQualifier[]` must contain at least one entry matching `/신적|divine|deity|god\b/i` (captures the BDB "always of divine activity" qualifier).
- `morphologyForms[]` must include stems containing `Qal`, `Niphal`, AND `Piel` (case-insensitive substring match).
- `genesisRefs.length >= 3`.
- Implicitly satisfies `sourceAccount[]` reconciliation for the Qal form-list and Qal usage-groups (once other fields are populated).
- Known deficiency labels this addresses: `QAL_FORM_LIST`, `ALWAYS_OF_DIVINE_ACTIVITY_QUALIFIER`, `FOUR_QAL_USAGE_GROUPS`.

### H430 אֱלֹהִים · Elohim

- `usageQualifier.length >= 3` (captures BDB print qualifiers: numerical-plural vs. plural-of-majesty distinctions, "the God" / "true God" boundaries, etc.).
- `representativeRefs.length >= 5`.
- `genesisRefs.length >= 3`.
- Implicitly satisfies `sourceAccount[]` reconciliation across 13-sense structure.
- Known deficiency labels this addresses: `BDB_PRINT_QUALIFIERS`, `REPRESENTATIVE_REFERENCES`.

## Baselines that must NOT change

The candidate must NOT mutate:

- Approved snapshot for the lemma (Registry entry).
- Approved Evidence fingerprint. Existing approved FPs to preserve:
  - H1254a: `sha256:43a91cd4c50101a46d2a4c7459198f63c46d789c3700ba6ce0276b520cae7f84` (source locator `BrownDriverBriggs.xml:b.cw.aa`)
  - H430: `sha256:13121be18dd2b5e68bfabdaa38a89b3c755d07a9e948189a6ce4138b8cff374a` (source locator `BrownDriverBriggs.xml:a.dl.ad`)
- H776 Golden control (excluded from P5 bundle by `manifest.goldenControlExcluded: "H776"`).

## Delivery path once a candidate reaches `VERIFIER_READY`

1. Jarvis runs independent C1–C6 (source fidelity, completeness, fingerprint/exact-head, regression, evidence/provenance, app presentation).
2. If PASS: permitted Registry mutation → promotion PR (lane classified by `delivery-lane-policy.mjs`; H1254a/H430 will land in `lexicon-human-approval` because the change touches an existing approved meaning) → required CI → merge on exact-head non-author approval → GitHub Pages → Live SHA + shipped-payload verification → **max 95%** pending Pastor Park visual confirmation of the newly promoted user-facing result.
3. If HOLD: record exact failing evidence; preserve thresholds; other lemmas continue.
4. If DISPUTE: stop this lemma's promotion path; report exact lexical/theological ambiguity; other lemmas continue.

## Non-authoritative sources

- Branch name (e.g. `chatgpt/lexicon-full-fidelity-*`), phase label (e.g. `P5_GENESIS_CANDIDATE_GENERATION`), or model attribution (`generator.model`) are informational and never move a candidate up the ladder.
- 3-of-4 or 4-of-4 model consensus is NOT semantic authority. Semantic authority follows the sequence: source text → morphology/usage → Rights-PASS lexica → Rights-PASS scholarly reference → independent AI/human analysis (per `LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md`).

## Current baseline snapshot (2026-08-14 KST)

Live run against `main@1add7736af40f64f8b30d152afc49902a271042d`:

```
Bundle: genesis-p5-gpt-candidates-v1 (27 candidates, Golden control excluded=H776)
Tally:
    0 RESEARCH_IN_PROGRESS
   27 CORRECTION_CANDIDATE_INCOMPLETE
    0 HANDOFF_READY
    0 VERIFIER_READY

H1254a בָּרָא: CORRECTION_CANDIDATE_INCOMPLETE
  reasons: MISSING_SOURCE_ACCOUNT, MISSING_USAGE_QUALIFIERS,
           MISSING_REPRESENTATIVE_REFS, MISSING_GENESIS_REFS,
           MISSING_MORPHOLOGY_FORMS, MISSING_RIGHTS_BASIS,
           FULL_FIDELITY_GAP_UNRESOLVED
H430 אֱלֹהִים: CORRECTION_CANDIDATE_INCOMPLETE
  reasons: MISSING_SOURCE_ACCOUNT, MISSING_USAGE_QUALIFIERS,
           MISSING_REPRESENTATIVE_REFS, MISSING_GENESIS_REFS,
           MISSING_MORPHOLOGY_FORMS, MISSING_RIGHTS_BASIS,
           FULL_FIDELITY_GAP_UNRESOLVED
```

## H776 status

Closed as an active blocker on **2026-08-14 KST**. PR #357 (`5867ccc95a1b0036f0baa827709b6a6c5b994aef`) merged; Live-verified; Pastor Park visually confirmed the rendered ⚖️ 출처 · 라이선스 · 변경 고지 card. H776 remains only as a Golden/regression control (excluded from all P5 candidate mutation).
