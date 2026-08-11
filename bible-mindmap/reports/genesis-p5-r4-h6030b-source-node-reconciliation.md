# Genesis P5 R4 · H6030b pinned source-node reconciliation

Status: `SOURCE_NODE_IDENTITY_RESOLVED_WITH_SEMANTIC_BOUNDARY_REMAINING`

Governance: research/evidence only. Candidate, existing approved meanings, Approval Registry, service UI, and production data MUST NOT be mutated by this note.

## Pinned baseline

- candidate bundle fingerprint: `sha256:a9ebdc22e34659332b84ced41118597feae70f18a742e8a5234968e902c9d261`
- source input bundle fingerprint: `sha256:adc1c48a14b111ed8c7046a9274478f70cbd9a17a27532eebc81d9c29fcbdf1c`
- H6030b candidate fingerprint: `sha256:2f2014de76317122a4a605240ed5e2367c408d32583c0046a827af59707b5fbb`
- parser output fingerprint: `sha256:d5d8d70c5992de95418de2e84ab4f165f974c9438e613fd86da65b0f44bc0841`

## Deterministic source resolution

The pinned candidate-input artifact resolves Genesis base Strong `H6030` by the repository's `tahot-extended` path, not by guessing from a generic H6030 page:

- TAHOT Strong: `H6030B`
- OpenScriptures Strong: `H6030b`
- suffix: `B`
- Genesis occurrences: `19`
- lexical entry id: `jpe`
- BDB entry id: `p.dt.aa`
- lemma: `עָנָה`
- part of speech: verb
- brief definition: `answer`
- OpenScriptures BDB source commit: `21c9add13bc727d3a951361778e97e3ff7afd1ce`
- source fingerprint: `sha256:f239a1ce682946ae7b3537026033fa5dd61f4b485d22aba37189c2e6f2c873b0`

The first pinned TAHOT sample is `Gen.18.27#01`, Hebrew `וַ/יַּ֥עַן`, with `dStrongs=H9001/{H6030B}` and expanded tag `{H6030B=עָנָה=to answer}`. The same pinned mapping supplies the 19 Genesis occurrences used by the R4 usage manifest.

## Source-node tree

The deterministic OpenScriptures BDB adapter materializes exactly 13 ordered nodes from `BrownDriverBriggs.xml:p.dt.aa` and preserves their IDs. The top-level branches are:

- `1.1` Qal — answer/respond; occasion-sensitive response; witness/testimony/respondent uses
- `1.2` Niphal — make answer / be answered
- `1.3` Hiphil — explicitly marked by BDB as `wholly dub.`

The candidate preserves the same 13 source node IDs and the same parser-output fingerprint. Therefore the previously open question of whether Genesis `H6030B` was being attached merely to the unsuffixed generic Strong family is resolved: the pinned repository contract explicitly maps it to the suffixed OpenScriptures lexical unit `H6030b` / BDB `p.dt.aa`.

## R4 verdict boundary

Resolved:
- base-to-extended source identity (`H6030` → TAHOT `H6030B` → OpenScriptures `H6030b`)
- lexical entry identity (`jpe` / `p.dt.aa`)
- source-node count/order/locators and parser fingerprint
- Genesis occurrence mapping count (`19`)

Still fail-closed:
- Hiphil wording remains source-text-noisy because BDB itself marks it `wholly dub.`
- independent Claude/Gemini review must confirm that Korean wording does not flatten the Qal/Niphal branches or overstate the Hiphil proposal
- this note does not authorize candidate changes or Registry promotion

Next R4 step: feed this reconciliation into the exact-fingerprint tri-model intake. H6030b may move from `HOLD_FOR_SOURCE_NODE_RECONCILIATION` to `SOURCE_NODE_RESOLVED_AWAITING_INDEPENDENT_SEMANTIC_AUDIT`, but it is not promotion-ready until the remaining semantic/uncertainty gate is independently closed.
