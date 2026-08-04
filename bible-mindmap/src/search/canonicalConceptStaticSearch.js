import { CANONICAL_CONCEPTS, CONCEPT_CATEGORIES } from '../data/canonicalConcepts.js';

const TOKEN_SPLIT = /[^\p{L}\p{N}]+/u;
const FIELD_WEIGHTS = Object.freeze({
  id: 14,
  labelKo: 14,
  labelHe: 11,
  labelGr: 11,
  strong: 10,
  category: 8,
  anchor: 6,
  stage: 5,
  summary: 3,
  note: 1,
});

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[()\[\]{}·/,_—–-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalize(value).split(TOKEN_SPLIT).filter((token) => token.length > 1);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildFields(id, concept) {
  const arcs = Array.isArray(concept.canonicalArc) ? concept.canonicalArc : [];
  return Object.freeze({
    id: normalize(id.replaceAll('_', ' ')),
    labelKo: normalize(concept.labelKo),
    labelHe: normalize(concept.labelHe),
    labelGr: normalize(concept.labelGr),
    strong: normalize([concept.strong?.he, concept.strong?.gr].filter(Boolean).join(' ')),
    category: normalize(CONCEPT_CATEGORIES[concept.category]?.ko),
    anchor: normalize((concept.reformedAnchors || []).join(' ')),
    stage: normalize(arcs.map((arc) => arc.stage).join(' ')),
    summary: normalize(arcs.map((arc) => arc.summary).join(' ')),
    note: normalize(concept.theologicalNote),
  });
}

export const CANONICAL_STATIC_SEARCH_INDEX = Object.freeze(
  Object.entries(CANONICAL_CONCEPTS).map(([id, concept]) => {
    const fields = buildFields(id, concept);
    const tokens = unique(Object.values(fields).flatMap(tokenize));
    return Object.freeze({ id, fields, tokens });
  }),
);

function scoreField(fieldValue, query, queryTokens, weight) {
  if (!fieldValue) return 0;
  if (fieldValue === query) return weight * 8;
  if (fieldValue.startsWith(query)) return weight * 5;
  if (fieldValue.includes(query)) return weight * 3;

  let score = 0;
  for (const token of queryTokens) {
    if (fieldValue === token) score += weight * 4;
    else if (fieldValue.startsWith(token)) score += weight * 2.5;
    else if (fieldValue.includes(token)) score += weight;
  }
  return score;
}

function scoreEntry(entry, query, queryTokens) {
  let score = 0;
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    score += scoreField(entry.fields[field], query, queryTokens, weight);
  }

  const matchedTokens = queryTokens.filter((token) => entry.tokens.some((candidate) => candidate.includes(token)));
  if (queryTokens.length > 1 && matchedTokens.length === queryTokens.length) score += 18;
  score += matchedTokens.length * 2;
  return score;
}

export function searchCanonicalConceptsStatic(query, { limit = 72 } = {}) {
  const normalized = normalize(query);
  if (!normalized) return CANONICAL_STATIC_SEARCH_INDEX.map(({ id }) => id).slice(0, limit);
  const queryTokens = unique(tokenize(normalized));

  return CANONICAL_STATIC_SEARCH_INDEX
    .map((entry) => ({ id: entry.id, score: scoreEntry(entry, normalized, queryTokens) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map(({ id }) => id);
}

export function getCanonicalStaticSearchDiagnostics() {
  return Object.freeze({
    schemaVersion: 1,
    mode: 'development-generated-static-search',
    runtimeApiCalls: false,
    serverRequired: false,
    browserSecretRequired: false,
    conceptCount: CANONICAL_STATIC_SEARCH_INDEX.length,
    fields: Object.keys(FIELD_WEIGHTS),
  });
}
