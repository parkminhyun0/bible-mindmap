# Luke v4 Production Batch 02 · independent external audit dispatch

This packet is research/evidence only. It must not mutate Korean candidates, existing approved meanings, Approval Registry, service UI, or production data.

## Exact baseline — mandatory

- research branch: `chatgpt/luke-v4-production-batch-02`
- derived main: `9354587035437d9bcf103165ba3a12c5229353f2`
- targets: `G0006 · G0007 · G0009 · G0011 · G0012 · G0015 · G0018 · G0020`
- candidate file fingerprint: `sha256:1deb4ba1803d2e7b499890460df11039af577b577bb5923592ac3be10109f6bf`
- context+morphology evidence fingerprint: `sha256:8fe12a7a967ab8ad96909deb5f5f847634cf4da55ee82a546dd81d6b77d1347b`
- audit bundle fingerprint: `sha256:fc6e82918c9632d501e4c4bf19b2ecff570d67bf24435e02ef510c8fb77d1179`
- candidate proposal: `reports/luke-v4-production-batch-02-source-candidate-prep-2026-08-12.json`
- exact candidate/context audit freeze: `reports/luke-v4-production-batch-02-candidate-audit-freeze.json`

An audit result is invalid unless it explicitly repeats all three fingerprints above. Do not substitute a newer candidate wording or a different source snapshot.

## Evidence contract already verified

- current-main Source Registry/G0 source lock re-read at execution time.
- pinned TAGNT git blob `705c1bc1cf752e013efcef99b8d9a3b7853bf843` verified.
- full Luke SBL inventory observed: 19,405 tokens.
- target coverage: 8/8 Strong, 41/41 target tokens, 41 complete verse-context packets.
- exact surface, lemma, morphology, Strong, token ID, and verse context preserved for every target occurrence.
- high-risk boundary terms `G0012 · G0015 · G0018 · G0020` retain TFLSJ cross-check boundaries.
- candidate/Approval Registry/production/existing-approved mutation = 0.

## Audit questions per target

### G0006 Ἄβελ
Confirm the Korean proper-name identity `아벨` and keep Hebrew-name etymology separate from the lexical head.

### G0007 Ἀβιά
Confirm `아비야` in Luke 1:5 as proper-name/priestly-course identity. Do not turn OT etymology into the Greek lexical gloss.

### G0009 Ἀβιληνή
Check Korean conventional place-name spelling `아빌레네` and keep geographic explanation separate from the proper-name headword.

### G0011 Ἀβραάμ
Confirm canonical proper-name identity `아브라함` across all 15 Luke tokens. Hebrew etymology must remain separate metadata.

### G0012 ἄβυσσος
Check `깊이를 헤아릴 수 없는 곳 / 무저갱 / 깊은 구렁` against Luke 8:31, TBESG and TFLSJ. Do not automatically equate the Luke referent with a later systematic concept of hell beyond the lexical/context evidence.

### G0015 ἀγαθοποιέω
Check `선을 행하다 / 좋은 일을 하다 / 남에게 선을 베풀다` against all four Luke tokens and their four distinct verb morphologies. Exclude irrelevant non-Luke lexical expansions.

### G0018 ἀγαθός
This is the main polysemy risk. Check all 16 tokens/13 verses and ten observed morphology classes. Preserve broad `good` range and substantival `좋은 것/재물` uses without collapsing everything into only moral `선한` or inventing unsupported senses.

### G0020 ἀγαλλίασις
Check whether `크게 기뻐함 / 환희 / 넘치는 기쁨` preserves the stronger exultation nuance in Luke 1:14 and 1:44 rather than reducing it to neutral pleasure.

## Required verdict schema

For every target return:

```json
{
  "strong": "G...",
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
  "candidateFileFingerprint": "sha256:1deb4ba1803d2e7b499890460df11039af577b577bb5923592ac3be10109f6bf",
  "contextMorphologyEvidenceFingerprint": "sha256:8fe12a7a967ab8ad96909deb5f5f847634cf4da55ee82a546dd81d6b77d1347b",
  "auditBundleFingerprint": "sha256:fc6e82918c9632d501e4c4bf19b2ecff570d67bf24435e02ef510c8fb77d1179",
  "targets": []
}
```

`PASS_WITH_BOUNDARY` is not permission to write production. `HOLD`/`DISPUTE` isolates only the affected target. Promotion remains fail-closed until all required independent verdicts match this exact baseline and unresolved items are handled under v4 governance.
