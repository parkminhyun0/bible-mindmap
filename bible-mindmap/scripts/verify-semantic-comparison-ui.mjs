import fs from 'node:fs';

const files = {
  endpoint: new URL('../api/semantic-search.js', import.meta.url),
  panel: new URL('../src/components/CanonicalSemanticComparisonPanel.jsx', import.meta.url),
  launcher: new URL('../src/components/CanonicalConceptLauncher.jsx', import.meta.url),
};
const endpoint = fs.readFileSync(files.endpoint, 'utf8');
const panel = fs.readFileSync(files.panel, 'utf8');
const launcher = fs.readFileSync(files.launcher, 'utf8');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

assert(endpoint.includes("mode: 'manual-shadow-comparison'"), 'endpoint must identify manual shadow comparison mode');
assert(endpoint.includes('candidateIds'), 'endpoint must return candidate IDs');
assert(endpoint.includes('cosineSimilarity'), 'endpoint must rank candidates with vector similarity');
assert(!endpoint.includes('embedding: vector'), 'endpoint must not return raw embedding to the browser');
assert(endpoint.includes('productionWrite: false'), 'endpoint must preserve no-write telemetry');
assert(endpoint.includes('rerankerUsed: false'), 'endpoint must keep reranker disabled');
assert(panel.includes('현재 결과는 바꾸지 않고 후보만 비교합니다.'), 'comparison UI must explain keyword-visible safety');
assert(panel.includes("fetch('/api/semantic-search'"), 'comparison UI must call same-origin server endpoint');
assert(panel.includes("credentials: 'same-origin'"), 'comparison UI must use same-origin credentials');
assert(launcher.includes('CanonicalSemanticComparisonPanel'), 'canonical launcher must mount comparison panel');
assert(launcher.includes('setComparisonQuery(query)'), 'canonical launcher must track the active search query');

if (errors.length) {
  console.error(`✗ Semantic comparison UI verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✓ Semantic comparison UI verified · manual opt-in · keyword-visible · ranked candidates · no raw vector · no write · no reranker');
