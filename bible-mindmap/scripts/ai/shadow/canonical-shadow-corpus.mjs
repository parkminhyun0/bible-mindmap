import { CANONICAL_CONCEPTS } from '../../../src/data/canonicalConcepts.js';

export const CANONICAL_SHADOW_CORPUS_REVISION = 'canonical-concepts-72-v1';
export const EXPECTED_CANONICAL_SHADOW_DOCUMENTS = 72;

function compact(value) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
}

function uniqueStrings(values) {
  return [...new Set(values.map(compact).filter(Boolean))];
}

function buildDocument([conceptKey, concept]) {
  if (!concept || typeof concept !== 'object') throw new TypeError(`canonical concept ${conceptKey} must be an object`);
  const title = compact(concept.labelKo);
  if (!title) throw new TypeError(`canonical concept ${conceptKey} is missing labelKo`);
  if (!Array.isArray(concept.canonicalArc) || concept.canonicalArc.length < 1) {
    throw new TypeError(`canonical concept ${conceptKey} is missing canonicalArc`);
  }

  const sourceRefs = uniqueStrings(concept.canonicalArc.map((stage) => stage?.ref));
  if (!sourceRefs.length) throw new TypeError(`canonical concept ${conceptKey} has no source references`);

  const arcText = concept.canonicalArc.map((stage) => {
    const stageName = compact(stage?.stage);
    const summary = compact(stage?.summary);
    if (!stageName || !summary) throw new TypeError(`canonical concept ${conceptKey} has an incomplete arc stage`);
    return `${stageName}: ${summary}`;
  }).join('\n');
  const anchors = uniqueStrings(concept.reformedAnchors || []);
  const originalLabels = uniqueStrings([concept.labelHe, concept.labelGr]);
  const strong = uniqueStrings([concept.strong?.he, concept.strong?.gr]);
  const note = compact(concept.theologicalNote).slice(0, 900);

  return Object.freeze({
    id: `canonical.${conceptKey}`,
    title,
    text: [
      `정경 개념: ${title}`,
      originalLabels.length ? `원어: ${originalLabels.join(' · ')}` : '',
      strong.length ? `Strong: ${strong.join(' · ')}` : '',
      anchors.length ? `개혁주의 핵심: ${anchors.join(' · ')}` : '',
      arcText,
      note ? `신학 요약: ${note}` : '',
    ].filter(Boolean).join('\n'),
    sourceRefs: Object.freeze(sourceRefs),
    metadata: Object.freeze({
      approved: true,
      approvedForShadow: true,
      conceptKey,
      category: compact(concept.category),
      sourceRegistry: 'src/data/canonicalConcepts.js',
      corpusRevision: CANONICAL_SHADOW_CORPUS_REVISION,
    }),
  });
}

export function buildCanonicalShadowDocuments() {
  const documents = Object.entries(CANONICAL_CONCEPTS)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(buildDocument);
  if (documents.length !== EXPECTED_CANONICAL_SHADOW_DOCUMENTS) {
    throw new Error(
      `canonical shadow corpus expected ${EXPECTED_CANONICAL_SHADOW_DOCUMENTS} documents, received ${documents.length}`,
    );
  }
  const ids = documents.map((document) => document.id);
  if (new Set(ids).size !== ids.length) throw new Error('canonical shadow corpus contains duplicate document IDs');
  return Object.freeze(documents);
}

export const CANONICAL_SHADOW_DOCUMENTS = buildCanonicalShadowDocuments();
