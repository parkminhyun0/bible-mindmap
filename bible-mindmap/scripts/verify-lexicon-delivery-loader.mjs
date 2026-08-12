import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLexiconPublicDelivery } from './build-lexicon-public-delivery.mjs';
import { createLexiconApprovalLoader, normalizeLexiconStrong } from '../src/data/lexiconApprovalLoader.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DATA = path.join(ROOT, 'data/lexicon');
const PUBLIC = path.join(ROOT, 'public/lexicon/ko');
const POPUP_PATH = path.join(ROOT, 'src/components/LexiconPopup.jsx');
const DRAWER_PATH = path.join(ROOT, 'src/components/LexiconTranslationDrawer.jsx');
const WORD_SEARCH_KO_PATH = path.join(ROOT, 'src/components/ApprovedKoreanLexiconPane.jsx');
const BRIDGE_PATH = path.join(ROOT, 'src/utils/lexiconTranslationPilotBridge.jsx');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const approvalRegistry = readJson(path.join(DATA, 'approval-registry.json'));
const expected = buildLexiconPublicDelivery(approvalRegistry);
const publicRegistry = readJson(path.join(PUBLIC, 'registry.json'));
assert.deepEqual(publicRegistry, expected.registry, 'public registry projection drift');
assert.equal(publicRegistry.count, approvalRegistry.entries.length, 'public Registry count must match approved Registry');
assert.deepEqual(
  new Set(publicRegistry.entries.map((entry) => entry.strong)),
  new Set(approvalRegistry.entries.map((entry) => entry.identity.canonicalStrong)),
  'public Registry Strong set drift',
);
for (const entry of publicRegistry.entries) {
  assert.equal(Object.hasOwn(entry, 'approvedSenseTree'), false, 'public registry index must not inline approved sense trees');
}

for (const language of ['hebrew', 'aramaic', 'greek']) {
  assert.deepEqual(readJson(path.join(PUBLIC, `manifests/${language}.json`)), expected.manifests[language], `${language} public manifest drift`);
}
for (const [relativePath, shard] of Object.entries(expected.shards)) {
  assert.deepEqual(readJson(path.join(PUBLIC, relativePath)), shard, `${relativePath} public shard drift`);
}
assert.equal(
  Object.keys(expected.shards).length,
  new Set(publicRegistry.entries.map((entry) => entry.shardPath)).size,
  'public shard count must match unique approved Registry routes',
);

assert.equal(normalizeLexiconStrong('H0776'), 'H776');
assert.equal(normalizeLexiconStrong('h00776'), 'H776');
assert.equal(normalizeLexiconStrong('G0001a'), 'G1a');
assert.equal(normalizeLexiconStrong('H0000'), null);
assert.equal(normalizeLexiconStrong('earth'), null);

const baseUrl = 'https://example.test/bible-mindmap/lexicon/ko/';
const payloadByPath = new Map([
  ['registry.json', publicRegistry],
  ['manifests/hebrew.json', expected.manifests.hebrew],
  ['manifests/aramaic.json', expected.manifests.aramaic],
  ['manifests/greek.json', expected.manifests.greek],
  ...Object.entries(expected.shards),
]);
const requests = [];
const fetchImpl = async (url, options) => {
  assert.equal(options?.method, 'GET', 'loader must remain GET-only');
  assert.equal(options?.credentials, 'same-origin', 'loader must use same-origin static delivery');
  const relativePath = String(url).slice(baseUrl.length);
  requests.push(relativePath);
  const payload = payloadByPath.get(relativePath);
  return payload ? { ok: true, status: 200, json: async () => structuredClone(payload) } : { ok: false, status: 404, json: async () => ({}) };
};

const loader = createLexiconApprovalLoader({ baseUrl, fetchImpl });
const h776 = await loader.loadApprovedEntry('H0776');
assert.equal(h776.identity.canonicalStrong, 'H776');
assert.equal(h776.identity.lemma, 'אֶרֶץ');
assert.equal(h776.approvedSenseTree.length, 26, 'H776 approved Korean senses must remain 26/26');
assert.equal(h776.reviewer.reviewerType, 'human', 'H776 provenance must remain human');
assert.equal(Object.isFrozen(h776), true, 'returned approved entry must be read-only');
assert.equal(Object.isFrozen(h776.approvedSenseTree), true, 'returned sense tree must be read-only');
assert.deepEqual(requests, ['registry.json', 'manifests/hebrew.json', 'shards/hebrew-H701-H800.json'], 'H776 must lazy-fetch only its route');

const requestCount = requests.length;
assert.deepEqual(await loader.loadApprovedEntry('H776'), h776, 'cached H776 lookup must remain stable');
assert.equal(requests.length, requestCount, 'cached H776 lookup must not refetch');
const h430 = await loader.loadApprovedEntry('H430');
assert.equal(h430.identity.canonicalStrong, 'H430');
assert.equal(h430.approvedSenseTree.length, 13, 'H430 approved sense count drift');
assert.equal(h430.reviewer.reviewerType, 'evidence-policy', 'R3 entry must expose Evidence policy provenance');
assert.deepEqual(requests.slice(requestCount), ['shards/hebrew-H401-H500.json'], 'same-language R3 lookup must reuse registry/manifest and lazy-fetch one shard');
const approvedRequestCount = requests.length;
assert.equal(await loader.loadApprovedEntry('H1254'), null, 'unapproved base H1254 must fail closed; only H1254a is approved');
assert.equal(await loader.loadApprovedEntry('G2316'), null, 'unapproved Greek Strong must fail closed');
assert.equal(requests.length, approvedRequestCount, 'unapproved Strong must not trigger shard fetch');

const popupSource = fs.readFileSync(POPUP_PATH, 'utf8');
const drawerSource = fs.readFileSync(DRAWER_PATH, 'utf8');
const wordSearchKoSource = fs.readFileSync(WORD_SEARCH_KO_PATH, 'utf8');
const bridgeSource = fs.readFileSync(BRIDGE_PATH, 'utf8');
assert.doesNotMatch(popupSource, /lexiconApprovalLoader/, 'LexiconPopup must not own the detailed approved dictionary loader');
assert.match(popupSource, /KOREAN_GLOSS/, 'LexiconPopup must retain compact Korean gloss summary');
assert.match(bridgeSource, /lexiconApprovalLoader\.loadApprovedEntry\(strong\)/, 'drawer bridge must resolve approved data by Strong');
assert.match(bridgeSource, /normalizeLexiconStrong/, 'drawer bridge must normalize padded Strong ids');
assert.doesNotMatch(bridgeSource, /method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/, 'bridge must remain read-only');

for (const [label, source] of [['drawer', drawerSource], ['word-search', wordSearchKoSource]]) {
  assert.match(source, /approvedEntry.*approvedSenseTree|approvedEntry\?\.approvedSenseTree/s, `${label}: approved sense tree required`);
  assert.match(source, /Evidence 검증 승인/, `${label}: Evidence-policy approval badge required`);
  assert.match(source, /사람 검토 완료/, `${label}: legacy human approval badge must remain supported`);
  assert.match(source, /Evidence AND-Gate 자동 승인/, `${label}: automated approval provenance must be disclosed`);
  assert.match(source, /Approval Registry · 승인 의미 \{senseCount\}개 · 읽기 전용/, `${label}: read-only footer required`);
  assert.doesNotMatch(source, /method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/, `${label}: must remain read-only`);
}
assert.match(drawerSource, /data-testid="approved-lexicon-drawer-sense-tree"/, 'drawer approved-tree test id required');
assert.match(wordSearchKoSource, /data-modal-scroll-region="true"/, 'word search modal scroll region required');
assert.match(wordSearchKoSource, /WebkitOverflowScrolling: 'touch'/, 'word search momentum scrolling required');
assert.match(wordSearchKoSource, /overscrollBehavior: 'contain'/, 'word search overscroll containment required');
assert.match(wordSearchKoSource, /touchAction: 'pan-y'/, 'word search vertical touch scrolling required');

console.log('✓ Approval Registry delivery + read-only loader contract PASS');
console.log(`  approved entries=${approvalRegistry.entries.length} · H776 human 26/26 preserved · Evidence-policy entries lazy-delivered`);
console.log('  H0776→H776 normalization · H430 one-shard lazy load · unapproved Strong fail-closed');
console.log('  drawer + word search disclose human vs Evidence-policy approval provenance');
