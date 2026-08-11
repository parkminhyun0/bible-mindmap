# Genesis P5 R4 · H28 אֲבִידָע name-etymology evidence note

Status: `IDENTITY_STABLE_ETYMOLOGY_WORDING_BOUNDARY_NARROWED`

Governance: research/evidence only. Do not mutate the pinned candidate, existing approved meanings, Approval Registry, service UI, or production data.

## Pinned baseline

- candidate bundle fingerprint: `sha256:a9ebdc22e34659332b84ced41118597feae70f18a742e8a5234968e902c9d261`
- source input bundle fingerprint: `sha256:adc1c48a14b111ed8c7046a9274478f70cbd9a17a27532eebc81d9c29fcbdf1c`
- H28 candidate fingerprint: `sha256:0e14d5b1a36b874475ab4480012b4aaffc44e5af0a3f27d109ea799df58bd6a4`
- pinned Genesis occurrence: `Gen.25.4` (1 occurrence in the Genesis R4 manifest; canonical second occurrence is 1 Chr 1:33)

## Stable facts

The proper-name identity is stable across the pinned candidate and public lexicon witnesses:

- lemma: `אֲבִידָע`
- masculine proper name: Abida / 아비다
- biblical identity: son of Midian
- component tradition: `אָב` (father) + `יָדַע` (know)

The pinned candidate correctly keeps the proper-name transliteration separate from the proposed name meaning.

## Public lexical wording compared

The public BDB presentation gives the explanatory wording **“my father took knowledge”** and explicitly compares Sabaean personal-name forms. The same BDB material is publicly visible through BibleHub H28.

Strong's presentation derives the name from `father + know` but gives the looser nominal paraphrase **“father of knowledge (i.e. knowing)”**.

Other public dictionary presentations preserve a verbal reading such as **“my father knows”**. The International Standard Bible Encyclopedia tradition also gives “father of knowledge” or “my father knows.”

Public references inspected for this research-only pass:

- BibleHub H28 / BDB + Strong: https://biblehub.com/hebrew/28.htm
- StudyLight H28: https://www.studylight.org/lexicons/eng/hebrew/28.html
- StudyBible H28: https://studybible.info/strongs/H28
- Encyclopedia of the Bible (Abida): https://www.biblegateway.com/resources/encyclopedia-of-the-bible/Abida

## Audit interpretation

The evidence narrows the uncertainty but does not justify collapsing the alternatives into one historically certain Korean etymology.

1. `아비다` as the user-facing proper name is stable.
2. A `my father + know` analysis has stronger direct support in the BDB-style personal-name analysis than an abstract lexical meaning assigned to the name itself.
3. Strong's `father of knowledge` is best preserved as an alternative/traditional explanatory paraphrase, not silently promoted to the only meaning.
4. The precise tense/aspect nuance behind English renderings such as `my father knows` versus BDB's `my father took knowledge` should not be over-specified in Korean without an independent onomastic/grammar verdict.
5. Therefore the current candidate sentence “이름 뜻을 ‘나의 아버지가 알게 되었다’와 연결하는 설명이 제안되며” remains appropriately cautious in status, but its final Korean wording still requires independent audit before promotion.

## R4 boundary

Resolved:
- proper-name identity
- father/know component analysis as the relevant etymological family
- Strong `father of knowledge` should not override BDB-style personal-name analysis as semantic certainty

Still fail-closed:
- exact Korean verbal formulation (`나의 아버지가 안다`, `나의 아버지가 알게 되었다`, or another cautious paraphrase)
- certainty level for the comparative Sabaean evidence
- independent Claude/Gemini same-fingerprint verdict

Recommended audit choice set for Claude/Gemini:

- `PASS_WITH_BOUNDARY`: keep `아비다` as the meaning-bearing public label and place a cautious note such as “이름은 ‘나의 아버지 + 알다’와 관련된 것으로 풀이된다”; retain BDB/Strong wording variants in provenance.
- `HOLD`: if an exact Korean verbal etymology is required, request stronger onomastic/grammar evidence before selecting it.
- `DISPUTE`: only if the independent auditor finds the component analysis itself materially unsupported.

No Registry promotion is authorized by this note.
