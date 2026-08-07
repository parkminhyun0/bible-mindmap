#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getLexiconTranslation,
  LEXICON_TRANSLATION_PILOT,
  normalizeLexiconTranslationStrong,
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

const nodes = collectNodes(translation.definition);
assert.equal(nodes.length, 26);
assert.equal(new Set(nodes.map((node) => node.id)).size, nodes.length, 'definition node ids must be unique');
assert.ok(nodes.every((node) => typeof node.text === 'string' && node.text.trim()), 'every node needs Korean text');
assert.ok(Math.max(...nodes.map((node) => node.depth)) >= 3, 'nested BDB hierarchy must be preserved');

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

console.log(`✓ lexicon translation pilot verifier passed · entries=1 · nodes=${nodes.length} · strong=H776`);
