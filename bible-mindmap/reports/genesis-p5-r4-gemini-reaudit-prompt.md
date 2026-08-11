# Genesis P5 R4 · Gemini independent re-audit

Quality bar: match the H776 (אֶרֶץ) pilot standard. Speed must come from parallel execution, never from reducing evidence depth.

Exact baseline only:
- main: `fa915618f565ea492e0f47df38d0b5328d154781`
- candidate bundle fingerprint: `sha256:a9ebdc22e34659332b84ced41118597feae70f18a742e8a5234968e902c9d261`
- source input fingerprint: `sha256:adc1c48a14b111ed8c7046a9274478f70cbd9a17a27532eebc81d9c29fcbdf1c`
- targets: `H120 · H6030b · H7650 · H28 · H39`
- pinned corpus usage: `reports/genesis-p5-r4-pinned-corpus-usage-manifest.json` (87 occurrences / 38 sampled contexts)
- extended evidence: `reports/genesis-p5-r4-extended-evidence-intake.json`

For every target independently verify all of the following axes:
1. Strong identity and lemma identity
2. source-node / homograph separation
3. Genesis usage clusters and sense boundaries
4. morphology-versus-Strong separation
5. Korean gloss fidelity without theological overreach
6. proper-name identity versus etymology wording
7. etymology certainty level and uncertainty expression
8. regression risk against existing approved meanings

Return per target:
- verdict: `PASS_WITH_BOUNDARY | HOLD | DISPUTE`
- evidence-backed reason
- unresolved items
- whether candidate can remain unchanged
- whether any user-facing Korean wording would overstate certainty

R4 is fail-closed: no automatic Approval Registry promotion. Do not infer missing evidence. H39 must remain disputed unless comparative evidence resolves the competing etymological analyses.
