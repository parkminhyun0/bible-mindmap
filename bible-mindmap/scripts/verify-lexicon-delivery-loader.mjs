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
const drawerSource = fs.readFileSync(DRAWER_PATH, 'utf8');
const wordSearchKoSource = fs.readFileSync(WORD_SEARCH_KO_PATH, 'utf8');
const bridgeSource = fs.readFileSync(BRIDGE_PATH, 'utf8');

assert.doesNotMatch(popupSource, /lexiconApprovalLoader/, 'LexiconPopup must not own the detailed approved dictionary loader');
assert.doesNotMatch(popupSource, /approved-lexicon-sense-panel/, 'LexiconPopup must not render the detailed approved sense tree');
assert.match(popupSource, /KOREAN_GLOSS/, 'LexiconPopup must retain the compact Korean gloss summary');

assert.match(bridgeSource, /lexiconApprovalLoader\.loadApprovedEntry\(strong\)/, 'translation drawer bridge must resolve approved data by Strong');
assert.match(bridgeSource, /normalizeLexiconStrong/, 'translation drawer bridge must normalize padded Strong ids');
assert.match(bridgeSource, /getLexiconTranslation\(strong\)/, 'legacy BDB pilot may be used only as optional drawer enrichment');
assert.match(
  bridgeSource,
  /lexiconApprovalLoader\.loadApprovedEntry\(strong\)[\s\S]*createState\(dialog, currentToolbar, strong, approvedEntry\)/,
  'approved Registry result must gate drawer creation and optional enrichment',
);
assert.doesNotMatch(bridgeSource, /method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/, 'translation drawer bridge must not introduce a Registry write transport');

assert.match(drawerSource, /approvedEntry\.approvedSenseTree/, 'drawer must render the approved Registry sense tree');
assert.match(drawerSource, /data-testid="approved-lexicon-drawer-sense-tree"/, 'drawer must expose the approved tree for browser regression');
assert.match(drawerSource, /Approval Registry · 승인 의미 \{senseCount\}개 · 읽기 전용/, 'drawer must identify read-only approved delivery');
assert.match(drawerSource, /enrichment\?\.originKo/, 'drawer must retain BDB origin enrichment');
assert.match(drawerSource, /enrichment\?\.twot\?\.entry/, 'drawer must retain TWOT enrichment');
assert.match(drawerSource, /evidenceCounts\.direct/, 'drawer must expose direct evidence counts');
assert.match(drawerSource, /evidenceCounts\['legacy-only'\]/, 'drawer must disclose legacy-only evidence counts');
assert.doesNotMatch(drawerSource, /enrichment\?\.definition|enrichment\.definition/, 'legacy pilot definition must not replace approved Registry translations');
assert.doesNotMatch(drawerSource, /method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/, 'drawer must remain read-only');

assert.match(wordSearchKoSource, /lexiconApprovalLoader\.loadApprovedEntry\(strong\)/, 'word search Korean pane must load the same approved Registry entry');
assert.match(wordSearchKoSource, /getLexiconTranslation\(strong\)/, 'word search Korean pane must load the same BDB enrichment as the popup drawer');
assert.match(wordSearchKoSource, /BDB 한글 사전 · 승인본/, 'word search Korean pane must mirror the popup drawer title');
assert.match(wordSearchKoSource, /✓ 사람 검토 완료/, 'word search Korean pane must mirror the popup drawer review badge');
assert.match(wordSearchKoSource, /enrichment\?\.originKo/, 'word search Korean pane must mirror BDB origin enrichment');
assert.match(wordSearchKoSource, /enrichment\?\.twot\?\.entry/, 'word search Korean pane must mirror TWOT enrichment');
assert.match(wordSearchKoSource, /evidenceCounts\.direct/, 'word search Korean pane must mirror direct evidence counts');
assert.match(wordSearchKoSource, /evidenceCounts\['legacy-only'\]/, 'word search Korean pane must mirror legacy-only evidence disclosure');
assert.match(wordSearchKoSource, /Approval Registry · 승인 의미 \{senseCount\}개 · 읽기 전용/, 'word search Korean pane must mirror the read-only footer');
assert.match(wordSearchKoSource, /data-modal-scroll-region="true"/, 'word search Korean pane must explicitly expose a modal scroll region');
assert.match(wordSearchKoSource, /WebkitOverflowScrolling: 'touch'/, 'word search Korean pane must retain momentum scrolling');
assert.match(wordSearchKoSource, /overscrollBehavior: 'contain'/, 'word search Korean pane must contain scroll chaining at panel boundaries');
assert.match(wordSearchKoSource, /touchAction: 'pan-y'/, 'word search Korean pane must allow one-finger vertical scrolling');
assert.doesNotMatch(wordSearchKoSource, /method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/, 'word search Korean pane must remain read-only');

console.log('✓ P4 Approval Registry delivery + rich translation drawer SSOT PASS');
console.log('  H0776→H776 · approved senses 26/26 · one lazy shard · unapproved Strong fail-closed');
console.log('  detailed Korean definition: Approval Registry only · BDB origin/TWOT: optional enrichment');
console.log('  LexiconPopup: compact summary · LexiconTranslationDrawer + WordSearch: rich approved dictionary');
console.log('  WordSearch Korean pane: popup-drawer parity · explicit momentum modal scroll region');
