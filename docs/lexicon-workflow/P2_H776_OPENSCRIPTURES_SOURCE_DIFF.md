# P2 · H776 OpenScriptures actual-source tree reconciliation note

## Scope

This unit parses the pinned OpenScriptures HebrewLexicon source without generating Korean candidates or modifying the approved H776 meaning tree, then freezes the reviewed mapping from the deterministic 23-node source tree to the preserved 26-node Golden Reference.

## Pinned mapping

- Strong: `H776`
- LexicalIndex entry: `bep`
- BDB entry: `a.fx.aa`
- Lemma: `אֶ֫רֶץ`
- Transliteration: `ʾereṣ`
- TWOT: `167`
- Source commit: `21c9add13bc727d3a951361778e97e3ff7afd1ce`

## Structural result

- Pinned source tree: 23 nodes, max depth 2
- Golden Reference: 26 nodes, max depth 3
- Source nodes accounted: 23/23
- Golden nodes accounted: 26/26
- Source-only nodes: 0

## Reviewed 23 → 26 reconciliation

### Exact mappings

22 source nodes preserve their identical Golden node ID. Their approved Korean text remains unchanged and is not regenerated.

### Source node `1.5`

The pinned source keeps the late-usage material in one node. The Golden Reference preserves this as a three-node subtree:

- source `1.5` → Golden `1.5`
- source `1.5` → Golden `1.5.1`
- source `1.5` → Golden `1.5.1.1`

This is recorded as `one-source-to-golden-subtree`. No synthetic source nodes are created.

### Golden node `1.2.8`

Golden `1.2.8` (“도시 또는 도시국가”) has no corresponding node in the pinned OpenScriptures entry. It is retained only as `legacy-approved-snapshot-only` evidence. The reconciliation contract explicitly forbids claiming primary-source support for this node. Any future meaning change requires secondary evidence and review.

## Source observation

Pinned `BrownDriverBriggs.xml` source node `1.2.3` reads `trial territory`, while the existing Korean Golden translation is “지파의 영토”. The anomaly is `open-reviewed`:

- preserve the pinned source text verbatim in evidence;
- preserve the existing Korean Golden wording;
- do not auto-correct the source;
- require secondary source evidence before any meaning change;
- do not let the anomaly block evidence regeneration;
- continue to block candidate generation and Golden mutation.

## Gates after reconciliation

- deterministic evidence regeneration: allowed
- candidate generation: blocked
- Approval Registry write: blocked
- Golden meaning mutation: blocked
- service/UI write: blocked

## Next unit

Regenerate an H776 Evidence Packet v2 artifact by combining the pinned source output with `GEN-1-1-H776.source-golden-reconciliation.v1.json`. Preserve all 26 approved Korean translations, attach source text only where actually supported, mark `1.2.8` as legacy-only, and carry the `1.2.3` anomaly explicitly.
