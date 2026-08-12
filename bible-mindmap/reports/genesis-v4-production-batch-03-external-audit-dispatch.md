# Genesis v4 Production Batch 03 · independent external audit dispatch

This packet is research/evidence only. It must not mutate Korean candidates, existing approved meanings, Approval Registry, service UI, or production data.

## Exact baseline — mandatory

- research branch: `chatgpt/genesis-v4-production-batch-03`
- derived main: `9354587035437d9bcf103165ba3a12c5229353f2`
- targets: `H413 · H834 · H3605 · H935 · H3808 · H1931 · H3290 · H251 · H3205 · H8141`
- candidate file fingerprint: `sha256:8ca80ea7c77a51c5d3520716842e776b61b1645eaff45cb8216869d99ba2e768`
- evidence semantic fingerprint: `sha256:d88976313b5fcb8b4d4919b64ad818c233ba8a8b126bfd3fe2b873af5ac2181c`
- audit bundle fingerprint: `sha256:2149d4438d968b95ac269bad70a9e3044fa2443423578335adece8b948cb4bdf`
- candidate proposal: `reports/genesis-v4-production-batch-03-source-candidate-prep-2026-08-12.json`
- exact evidence freeze: `reports/genesis-v4-production-batch-03-evidence-freeze.json`
- exact candidate audit freeze: `reports/genesis-v4-production-batch-03-candidate-audit-freeze.json`

An audit result is invalid unless it explicitly repeats all three fingerprints above. Do not substitute a newer candidate wording or a different source snapshot.

## Evidence contract already verified

- 10/10 Strong targets mapped to pinned OpenScriptures BDB entries.
- 13 BDB entries and 75 BDB source/sense nodes materialized.
- 2,529 Genesis occurrences verified against pinned OSHB Genesis.
- 30 deterministic representative context+morphology samples, three per target.
- public-source permission gates remained `approved-ready`, `CC-BY-4.0`, external LLM input allowed.
- candidate/Approval Registry/production/existing-approved mutation = 0.

## Audit questions per target

### H413 אֶל
Check direction/goal, adversative relation, and topic/relation boundaries. Confirm that Korean particles do not create artificial lexical senses and that syntactic relation remains primary.

### H834 אֲשֶׁר
Check the basic relative-marker function separately from `בַאֲשֶׁר`, `כַּאֲשֶׁר`, and `מֵאֲשֶׁר` constructions. Reject any candidate that promotes construction-level translations into independent lexical senses without source support.

### H3605 כֹּל
Check totality, distributive use, and context-driven indefinite renderings. Confirm that construct/article scope is preserved rather than flattened into unrelated Korean glosses.

### H935 בּוֹא
Check Qal/Hiphil/Hophal stem boundaries and motion direction. The early Genesis sample is Hiphil-heavy; do not redefine the lemma globally as only `가져오다`.

### H3808 לֹא
Check negation scope and construction effects. Reject sense inflation from Korean translations such as `없다`, `없이`, or `아무것도 아니다` when they are syntactic renderings rather than distinct lexical senses.

### H1931 הוּא
Check gender/reference and discourse/syntactic behavior. Emphatic, resumptive, or copular translation effects must not be asserted as independent lexical meanings without evidence.

### H3290 יַעֲקֹב
Keep proper-name identity separate from etymological interpretation. Any heel/follow/supplant explanation must stay provenance or note material unless the pinned evidence supports stronger wording.

### H251 אָח
Check literal brother, wider male kinship, and community/figurative extensions. Possessive suffix morphology must not become a new lexical sense.

### H3205 יָלַד
Check subject role plus Qal/Niphal/Pual/Piel/Hiphil boundaries. Preserve birth, begetting, passive birth, and causative/midwifery distinctions without theological expansion.

### H8141 שָׁנָה
Confirm core `year` meaning and treat age/duration expressions as constructional/contextual uses unless pinned evidence requires a separate lexical boundary.

## Required verdict schema

For every target return:

```json
{
  "strong": "H...",
  "verdict": "PASS_WITH_BOUNDARY | HOLD | DISPUTE",
  "candidateCanRemainUnchanged": true,
  "sourceFidelity": "PASS | HOLD | FAIL",
  "morphologyContextFit": "PASS | HOLD | FAIL",
  "theologicalOverreach": "NONE | PRESENT",
  "conciseReason": "evidence-backed reason",
  "unresolved": [],
  "userFacingOverstatementRisk": "NONE | LOW | MEDIUM | HIGH"
}
```

Also return at the top level:

```json
{
  "auditor": "Claude | Gemini | independent GPT session",
  "candidateFileFingerprint": "sha256:8ca80ea7c77a51c5d3520716842e776b61b1645eaff45cb8216869d99ba2e768",
  "evidenceSemanticFingerprint": "sha256:d88976313b5fcb8b4d4919b64ad818c233ba8a8b126bfd3fe2b873af5ac2181c",
  "auditBundleFingerprint": "sha256:2149d4438d968b95ac269bad70a9e3044fa2443423578335adece8b948cb4bdf",
  "targets": []
}
```

`PASS_WITH_BOUNDARY` is not permission to write production. `HOLD`/`DISPUTE` isolates the affected target. Promotion remains fail-closed until required independent verdicts match this exact baseline and unresolved items are routed under the v4 governance rules.
