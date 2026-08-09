#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getLexiconTranslation,
  isLexiconTranslationDisplayable,
  LEXICON_TRANSLATION_BLOCKED_STATUSES,
  LEXICON_TRANSLATION_DISPLAY_STATUSES,
  LEXICON_TRANSLATION_PILOT,
  normalizeLexiconTranslationStrong,
  resolveLexiconTranslationDisplayState,
  validateLexiconTranslationDisplayRecord,
} from '../src/data/lexiconTranslationPilot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function collectNodes(nodes, depth = 0, acc = []) {
  for (const node of nodes || []) {
    acc.push({ ...node, depth });
    collectNodes(node.children, depth + 1, acc);
  }
  return acc;
}

assert.equal(normalizeLexiconTranslationStrong('H0776'), 'H776');
assert.equal(normalizeLexiconTranslationStrong('h000776'), 'H776');
assert.equal(getLexiconTranslation('H0776'), LEXICON_TRANSLATION_PILOT.H776);
assert.equal(getLexiconTranslation('G3056'), null);

const translation = LEXICON_TRANSLATION_PILOT.H776;
assert.equal(translation.strong, 'H776');
assert.equal(translation.source, 'BDB');
assert.equal(translation.reviewStatus, 'pilot-reviewed');
assert.ok(translation.originKo);
assert.equal(translation.twot.entry, '167');
assert.equal(translation.partOfSpeechKo, '여성 명사');
assert.equal(validateLexiconTranslationDisplayRecord(translation, 'H0776').valid, true);
assert.equal(isLexiconTranslationDisplayable(translation, 'H776'), true);
assert.equal(resolveLexiconTranslationDisplayState('H0776').status, 'ready');
assert.equal(resolveLexiconTranslationDisplayState('H0776').displayAllowed, true);

const candidateFixture = {
  ...translation,
  strong: 'H430',
  lemma: 'אֱלֹהִים',
  translitKo: '엘로힘',
  reviewStatus: 'blind-candidate',
};
for (const status of LEXICON_TRANSLATION_BLOCKED_STATUSES) {
  const record = { ...candidateFixture, reviewStatus: status };
  const state = resolveLexiconTranslationDisplayState('H430', { H430: record });
  assert.equal(state.status, 'pending-review', `${status} must remain pending`);
  assert.equal(state.displayAllowed, false, `${status} must not display`);
  assert.equal(state.translation, null, `${status} must not return candidate payload`);
  assert.equal(isLexiconTranslationDisplayable(record, 'H430'), false);
}
for (const status of LEXICON_TRANSLATION_DISPLAY_STATUSES) {
  const record = { ...candidateFixture, reviewStatus: status };
  assert.equal(isLexiconTranslationDisplayable(record, 'H430'), true, `${status} must display`);
  assert.equal(resolveLexiconTranslationDisplayState('H430', { H430: record }).status, 'ready');
}
const invalidFixture = { ...candidateFixture, reviewStatus: 'human-reviewed', definition: [{ id: '1', text: '' }] };
assert.equal(resolveLexiconTranslationDisplayState('H430', { H430: invalidFixture }).status, 'blocked-invalid');
assert.equal(resolveLexiconTranslationDisplayState('H9999').messageKo, '번역 데이터 준비 중');

const nodes = collectNodes(translation.definition);
assert.equal(nodes.length, 26);
assert.equal(new Set(nodes.map((node) => node.id)).size, nodes.length, 'definition node ids must be unique');
assert.ok(nodes.every((node) => typeof node.text === 'string' && node.text.trim()), 'every node needs Korean text');
assert.ok(Math.max(...nodes.map((node) => node.depth)) >= 3, 'nested BDB hierarchy must be preserved');

const drawerPath = path.join(ROOT, 'src', 'components', 'LexiconTranslationDrawer.jsx');
const drawerSource = fs.readFileSync(drawerPath, 'utf8');
for (const contract of [
  'formatBdbOutlineMarker(node.id, depth)',
  'depth % 2 === 0',
  'String.fromCharCode(97 + (current % 26))',
  'paddingLeft: depth * 16',
]) {
  assert.ok(drawerSource.includes(contract), `BDB outline marker contract missing: ${contract}`);
}
assert.ok(
  !drawerSource.includes('          {node.id}\n'),
  'raw dotted node ids must not be rendered as visible outline markers',
);

const bridgePath = path.join(ROOT, 'src', 'utils', 'lexiconTranslationPilotBridge.jsx');
const bridgeSource = fs.readFileSync(bridgePath, 'utf8');
for (const contract of [
  'getLexiconTranslation',
  'LexiconTranslationDrawer',
  'data-lexicon-translation-toggle',
  'installLexiconTranslationPilotBridge',
]) {
  assert.ok(bridgeSource.includes(contract), `translation bridge missing: ${contract}`);
}

const mainPath = path.join(ROOT, 'src', 'main.jsx');
const mainSource = fs.readFileSync(mainPath, 'utf8');
assert.ok(mainSource.includes('installLexiconTranslationPilotBridge()'), 'main bootstrap is missing pilot bridge');

console.log(`✓ lexicon translation display gate passed · displayStatuses=${LEXICON_TRANSLATION_DISPLAY_STATUSES.length} · blockedStatuses=${LEXICON_TRANSLATION_BLOCKED_STATUSES.length} · entries=1 · nodes=${nodes.length}`);
