# Genesis P5 R4 · external independent re-audit dispatch

This packet is research/evidence only. It must not mutate candidates, existing approved meanings, Approval Registry, service UI, or production data.

## Runtime state versus pinned evidence baseline

- current repository main after automation cleanup: `36c0b1d75f2ab3925130ba66b1e06f6683cbec21`
- pinned R4 candidate bundle fingerprint: `sha256:a9ebdc22e34659332b84ced41118597feae70f18a742e8a5234968e902c9d261`
- pinned R4 source input fingerprint: `sha256:adc1c48a14b111ed8c7046a9274478f70cbd9a17a27532eebc81d9c29fcbdf1c`
- targets: `H120 · H6030b · H7650 · H28 · H39`
- pinned usage evidence: `reports/genesis-p5-r4-pinned-corpus-usage-manifest.json` — 87 occurrences / 38 sampled contexts
- extended evidence: `reports/genesis-p5-r4-extended-evidence-intake.json`
- GPT audit: `reports/genesis-p5-r4-gpt-reaudit-results.json`
- H39 comparison: `reports/genesis-p5-r4-h39-comparative-evidence-note.md`

The newer runtime main does not authorize changing the pinned candidate/source fingerprints. Claude and Gemini must audit the same evidence baseline used by GPT.

## Per-target questions

### H120 אָדָם
Verify common-noun `human/man/mankind` versus Adam proper-name separation. The adamah/ground relationship may remain etymology metadata only and must not be promoted as semantic certainty.

### H6030b עָנָה
Verify the exact source-node/homograph boundary. Generic H6030 semantic range is insufficient. If the pinned source cannot establish the `b` segmentation unambiguously, return HOLD.

### H7650 שָׁבַע
Operational meaning `swear / take an oath` is stable. Verify that any proposed relationship with `seven` remains explicitly uncertain etymology metadata rather than a Korean lexical gloss.

### H28 אֲבִידָע
Proper-name identity is stable. Independently test the component grammar and competing explanatory English wordings. Do not force one Korean etymology wording if comparative-name evidence remains insufficient.

### H39 אֲבִימָאֵל
Current research preference, based on the public comparative evidence already collected, is the BDB/ISBE-style analysis `my father is El (God) / God is father`, with natural Korean candidate explanation `나의 아버지는 엘(하나님)이시다 / 하나님은 나의 아버지`.

This is a **preferred evidence interpretation, not an approved meaning mutation**. The Strong-style `father of Mael` analysis must remain preserved as alternative provenance unless the independent audit can demonstrate that the comparative South-Arabian evidence decisively excludes it. Claude and Gemini must therefore decide one of:

1. `PASS_WITH_BOUNDARY` — BDB/ISBE-style analysis may be preferred while the Strong alternative remains an explicit uncertainty/provenance note;
2. `HOLD` — more primary comparative-name/epigraphic evidence is required;
3. `DISPUTE` — evidence remains materially incompatible and no preferred user-facing etymology should be selected.

Do not add covenantal, soteriological, or other theological implications beyond the name-etymology evidence.

## Required output

For each target return:
- verdict: `PASS_WITH_BOUNDARY | HOLD | DISPUTE`
- concise evidence-backed reason
- exact unresolved items
- whether the current candidate can remain unchanged
- whether any Korean user-facing wording would overstate certainty

The external result is accepted into the tri-model intake only when it explicitly cites the candidate/source fingerprints above. R4 remains fail-closed and no Registry promotion is authorized by this packet.