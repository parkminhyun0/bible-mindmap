# P2 · H776 OpenScriptures actual-source tree reconciliation note

## Scope

This unit parses the pinned OpenScriptures HebrewLexicon source without generating Korean candidates or modifying the approved H776 meaning tree.

## Pinned mapping

- Strong: `H776`
- LexicalIndex entry: `bep`
- BDB entry: `a.fx.aa`
- Lemma: `אֶ֫רֶץ`
- Transliteration: `ʾereṣ`
- TWOT: `167`
- Source commit: `21c9add13bc727d3a951361778e97e3ff7afd1ce`

## Expected structural result

- Pinned source tree: 23 nodes, max depth 2
- Golden Reference: 26 nodes, max depth 3
- Exact ID matches: 23
- Source-only nodes: 0
- Golden-only structural nodes: 3

### Golden-only nodes

1. `1.2.8` — legacy expansion “city or city-state”; no corresponding node in the pinned OpenScriptures entry.
2. `1.5.1` — Golden subdivision of source node `1.5`.
3. `1.5.1.1` — Golden subdivision of source node `1.5`.

## Source observation

Pinned `BrownDriverBriggs.xml` node `1.2.3` reads `trial territory`. The existing Korean Golden translation uses “지파의 영토”. This unit records the discrepancy only. It does not correct the source, change the approved Korean meaning, or authorize candidate generation.

## Gates

- candidate generation: blocked
- Approval Registry write: blocked
- Golden meaning mutation: blocked
- service/UI write: blocked

The next unit must define a reviewed source-to-Golden reconciliation mapping before Evidence Packet regeneration is allowed.
