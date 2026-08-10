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

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }

const approvalRegistry = readJson(path.join(DATA, 'approval-registry.json'));
const expected = buildLexiconPublicDelivery(approvalRegistry);
const publicRegistry = readJson(path.join(PUBLIC, 'registry.json'));
assert.deepEqual(publicRegistry, expected.registry, 'public registry projection drift');
assert.equal(publicRegistry.count, 1, 'H776 pilot delivery must expose exactly one approved Strong');
assert.equal(publicRegistry.entries[0].strong, 'H776');
assert.equal(Object.hasOwn(publicRegistry.entries[0], 'approvedSenseTree'), false, 'public registry index must not inline approved sense trees');

for (const language of ['hebrew', 'aramaic', 'greek']) {
  assert.deepEqual(readJson(path.join(PUBLIC, `manifests/${language}.json`)), expected.manifests[language], `${language} public manifest drift`);
}
for (const [relativePath, shard] of Object.entries(expected.shards)) {
  assert.deepEqual(readJson(path.join(PUBLIC, relativePath)), shard, `${relativePath} public shard drift`);
}
assert.deepEqual(Object.keys(expected.shards), ['shards/hebrew-H701-H800.json'], 'H776 pilot must publish one lazy shard only');

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
  return payload
    ? { ok: true, status: 200, json: async () => structuredClone(payload) }
    : { ok: false, status: 404, json: async () => ({}) };
};

const loader = createLexiconApprovalLoader({ baseUrl, fetchImpl });
const h776 = await loader.loadApprovedEntry('H0776');
assert.equal(h776.identity.canonicalStrong, 'H776');
assert.equal(h776.identity.lemma, 'אֶרֶץ');
assert.equal(h776.approvedSenseTree.length, 26, 'H776 approved Korean senses must remain 26/26');
assert.equal(Object.isFrozen(h776), true, 'returned approved entry must be read-only');
assert.equal(Object.isFrozen(h776.approvedSenseTree), true, 'returned sense tree must be read-only');
assert.deepEqual(requests, ['registry.json', 'manifests/hebrew.json', 'shards/hebrew-H701-H800.json'], 'loader must lazy-fetch only the approved H776 route');

const requestCount = requests.length;
const cachedH776 = await loader.loadApprovedEntry('H776');
assert.deepEqual(cachedH776, h776, 'cached lookup must remain semantically stable');
assert.equal(requests.length, requestCount, 'cached approved lookup must not refetch registry/manifest/shard');
assert.equal(await loader.loadApprovedEntry('H1254'), null, 'unapproved Strong must fail closed');
assert.equal(await loader.loadApprovedEntry('G2316'), null, 'unapproved Greek Strong must fail closed');
assert.equal(requests.length, requestCount, 'unapproved Strong must not trigger manifest or shard fetch');

const popupSource = fs.readFileSync(POPUP_PATH, 'utf8');
assert.match(popupSource, /import \{ lexiconApprovalLoader \} from ['"]\.\.\/data\/lexiconApprovalLoader['"];/, 'LexiconPopup must use the approved Registry loader');
assert.match(popupSource, /lexiconApprovalLoader\.loadApprovedEntry\(entry\.s\)/, 'LexiconPopup must resolve approved data by the selected Strong');
assert.match(popupSource, /data-testid="approved-lexicon-sense-panel"/, 'LexiconPopup must expose the approved sense panel for browser regression');
assert.match(popupSource, /approvedEntry\.approvedSenseTree/, 'LexiconPopup must render the approved sense tree');
assert.match(popupSource, /approvedPrimaryGloss \|\| koreanGloss\?\.glossKo/, 'approved primary meaning must override legacy short gloss only when present');
assert.match(popupSource, /Approval Registry · 승인 의미 \{senses\.length\}개 · 읽기 전용/, 'approved panel must identify read-only Registry delivery');
assert.doesNotMatch(popupSource, /LEXICON_TRANSLATION_PILOT/, 'LexiconPopup must not read the legacy H776 pilot snapshot after native Registry integration');
assert.doesNotMatch(popupSource, /method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/, 'LexiconPopup must not introduce a Registry write transport');

console.log('✓ P4 read-only Approval Registry delivery + LexiconPopup React integration PASS');
console.log('  H0776→H776 · approved senses 26/26 · one lazy shard · unapproved Strong fail-closed');
console.log('  loader transport: same-origin GET-only · React UI: approved data read-only integration enabled');
