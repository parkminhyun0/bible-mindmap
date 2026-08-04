import assert from 'node:assert/strict';
import {
  CANONICAL_STATIC_SEARCH_INDEX,
  getCanonicalStaticSearchDiagnostics,
  searchCanonicalConceptsStatic,
} from '../src/search/canonicalConceptStaticSearch.js';

const diagnostics = getCanonicalStaticSearchDiagnostics();
assert.equal(diagnostics.runtimeApiCalls, false);
assert.equal(diagnostics.serverRequired, false);
assert.equal(diagnostics.browserSecretRequired, false);
assert.equal(diagnostics.conceptCount, 72);
assert.equal(CANONICAL_STATIC_SEARCH_INDEX.length, 72);
assert.ok(diagnostics.fields.includes('summary'));
assert.ok(diagnostics.fields.includes('anchor'));
assert.ok(diagnostics.fields.includes('strong'));

const cases = [
  ['씨 후손', 'seed'],
  ['성전 임재', 'temple'],
  ['언약', 'covenant'],
  ['어린양', 'lamb'],
  ['왕적 제사장', 'priest'],
  ['생명의 나무', 'tree_of_life'],
  ['빛', 'light'],
  ['장막 휘장', 'veil'],
  ['첫 열매', 'firstfruits'],
  ['증인 증언', 'witness'],
  ['H2233', 'seed'],
  ['G3485', 'temple'],
  ['그리스도 중심 구속사', 'temple'],
];

for (const [query, expected] of cases) {
  const results = searchCanonicalConceptsStatic(query, { limit: 5 });
  assert.ok(results.includes(expected), `${query}: expected ${expected} in top 5, got ${results.join(', ')}`);
}

assert.deepEqual(searchCanonicalConceptsStatic('', { limit: 3 }).length, 3);
assert.deepEqual(searchCanonicalConceptsStatic('존재하지않는검색어', { limit: 5 }), []);

console.log(JSON.stringify({
  status: 'passed',
  stage: 'P1-2e-a',
  diagnostics,
  caseCount: cases.length,
}, null, 2));
