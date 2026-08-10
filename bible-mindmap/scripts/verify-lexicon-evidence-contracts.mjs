#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEXICON_TRANSLATION_PILOT,
  normalizeLexiconTranslationStrong,
  resolveLexiconTranslationDisplayState,
} from '../src/data/lexiconTranslationPilot.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
const schemaStrong = read('data/lexicon/schemas/StrongIdentity.schema.json');
const schemaPacket = read('data/lexicon/schemas/EvidencePacket.schema.json');
const registry = read('data/lexicon/source-registry.json');
const packet = read('data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json');
const existing = LEXICON_TRANSLATION_PILOT.H776;
const SHA = /^sha256:[a-f0-9]{64}$/;
const STRONG = /^[HG][1-9]\d*[a-z]?$/;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function fingerprint(value, key) {
  const copy = structuredClone(value);
  delete copy[key];
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonical(copy))).digest('hex')}`;
}

function normalizeStrong(value) {
  const match = String(value || '').trim().match(/^([GHgh])0*(\d+)([A-Za-z]?)$/);
  if (!match || Number(match[2]) < 1) return String(value || '').trim().toUpperCase();
  return `${match[1].toUpperCase()}${Number(match[2])}${match[3].toLowerCase()}`;
}

function flatten(nodes, parentId = null, depth = 0, out = []) {
  for (const node of nodes || []) {
    out.push({ id: node.id, parentId, depth, order: out.length + 1, translationKo: node.text });
    flatten(node.children, node.id, depth + 1, out);
  }
  return out;
}

function policyNumber(value) {
  const parsed = Number.parseFloat(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function validateSchemas() {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  need(schemaStrong.$schema === 'https://json-schema.org/draft/2020-12/schema', 'Strong schema draft mismatch');
  need(schemaStrong.additionalProperties === false, 'Strong schema must reject additional properties');
  need(schemaPacket.properties?.schemaVersion?.const === 2, 'Evidence schemaVersion must be 2');
  need(schemaPacket.properties?.identity?.$ref === './StrongIdentity.schema.json', 'Evidence identity ref mismatch');
  need(schemaPacket.additionalProperties === false, 'Evidence schema must reject additional properties');
  for (const key of ['sourceInputs', 'senseNodes', 'normalizedSenseClusters', 'licenseSummary', 'packetFingerprint']) {
    need(schemaPacket.required?.includes(key), `Evidence required field missing: ${key}`);
  }
  return errors;
}

function validateIdentity(identity) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  need(identity?.schemaVersion === 1, 'identity schemaVersion must be 1');
  need(STRONG.test(identity?.canonicalStrong || ''), 'canonicalStrong invalid');
  need(identity?.identityId === identity?.canonicalStrong, 'identityId mismatch');
  need(normalizeStrong(identity?.canonicalStrong) === identity?.canonicalStrong, 'canonicalStrong not normalized');
  need(Array.isArray(identity?.sourceForms) && identity.sourceForms.length > 0, 'sourceForms missing');
  for (const form of identity?.sourceForms || []) need(normalizeStrong(form) === identity.canonicalStrong, `source form mismatch: ${form}`);
  const match = String(identity?.canonicalStrong || '').match(/^([HG][1-9]\d*)([a-z]?)$/);
  const suffix = match?.[2] || null;
  need(identity?.baseStrong === match?.[1], 'baseStrong mismatch');
  need(identity?.disambiguationSuffix === suffix, 'disambiguationSuffix mismatch');
  need(identity?.namespace === (suffix ? 'extended-strong' : 'strong'), 'namespace mismatch');
  need(identity?.testament === 'old-testament' && ['hebrew', 'aramaic'].includes(identity?.language), 'H identity language/testament mismatch');
  need(identity?.lemmaNormalized === identity?.lemma?.normalize('NFC'), 'lemma NFC mismatch');
  need(Boolean(identity?.transliteration?.scientific), 'scientific transliteration missing');
  need(Boolean(identity?.partOfSpeech?.code), 'partOfSpeech missing');
  need(SHA.test(identity?.identityFingerprint || ''), 'identity fingerprint invalid');
  need(identity?.identityFingerprint === fingerprint(identity, 'identityFingerprint'), 'identity fingerprint mismatch');
  return errors;
}

function validatePacket(value) {
  const errors = [...validateIdentity(value.identity)];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  const sources = new Map(registry.sources.map((source) => [source.sourceId, source]));
  need(value.schemaVersion === 2, 'packet schemaVersion must be 2');

  const packetPolicy = policyNumber(value.sourceRegistryPolicyVersion);
  const currentPolicy = policyNumber(registry.policyVersion);
  if (value.processingMode === 'regression-only') {
    need(packetPolicy !== null && currentPolicy !== null && packetPolicy <= currentPolicy, 'historical registry policy invalid');
  } else {
    need(value.sourceRegistryPolicyVersion === registry.policyVersion, 'registry policy mismatch');
  }

  const inputIds = new Set();
  for (const input of value.sourceInputs || []) {
    need(!inputIds.has(input.sourceId), `duplicate source input: ${input.sourceId}`);
    inputIds.add(input.sourceId);
    const source = sources.get(input.sourceId);
    need(Boolean(source), `unregistered source: ${input.sourceId}`);
    if (!source) continue;

    if (input.usagePolicy === 'automatic-evidence') {
      need(source.workflow.status === 'approved-ready' && source.workflow.autoProcessingAllowed, `${input.sourceId}: not auto-ready`);
      need(source.provenance.contentHash === input.sourceFingerprint, `${input.sourceId}: fingerprint mismatch`);
      need(source.workflow.status === input.registryWorkflowStatus, `${input.sourceId}: workflow mismatch`);
    } else {
      need(input.usagePolicy === 'legacy-regression-only', `${input.sourceId}: usagePolicy invalid`);
      need(value.processingMode === 'regression-only', `${input.sourceId}: legacy source outside regression`);
      need(input.sourceFingerprint === null, `${input.sourceId}: legacy fingerprint must be null`);
      need(['blocked', 'internal-review-only', 'approved-pending-fingerprint', 'approved-ready'].includes(source.workflow.status), `${input.sourceId}: current workflow invalid`);
    }
  }

  const approved = value.sourceInputs.filter((item) => item.usagePolicy === 'automatic-evidence').map((item) => item.sourceId).sort();
  const restricted = value.sourceInputs.filter((item) => item.usagePolicy === 'legacy-regression-only').map((item) => item.sourceId).sort();
  need(JSON.stringify([...value.licenseSummary.approvedSources].sort()) === JSON.stringify(approved), 'approvedSources mismatch');
  need(JSON.stringify([...value.licenseSummary.restrictedSources].sort()) === JSON.stringify(restricted), 'restrictedSources mismatch');
  need(value.licenseSummary.allAutomaticInputsApproved === true, 'automatic inputs not approved');
  need(value.processingMode === 'regression-only', 'H776 fixture must remain regression-only');
  need(value.licenseSummary.newGenerationAllowed === false, 'H776 fixture must block generation');

  const nodes = value.senseNodes || [];
  const byId = new Map();
  const orders = new Set();
  for (const node of nodes) {
    need(!byId.has(node.id), `duplicate node: ${node.id}`);
    byId.set(node.id, node);
    need(!orders.has(node.order), `duplicate order: ${node.order}`);
    orders.add(node.order);
    need(Number.isInteger(node.depth) && node.depth >= 0, `${node.id}: depth invalid`);
    need(Number.isInteger(node.order) && node.order > 0, `${node.id}: order invalid`);
    need(node.provenanceStatus === 'legacy-approved-snapshot', `${node.id}: golden node provenance changed`);
    need(node.sourceText === null && Boolean(node.translationKo?.trim()), `${node.id}: legacy node invalid`);
    for (const ref of node.sourceRefs || []) need(inputIds.has(ref.sourceId), `${node.id}: undeclared sourceRef`);
  }
  need(nodes.every((node, index) => node.order === index + 1), 'node order must be contiguous');
  for (const node of nodes) {
    if (node.parentId === null) need(node.depth === 0, `${node.id}: root depth invalid`);
    else {
      const parent = byId.get(node.parentId);
      need(Boolean(parent), `${node.id}: parent missing`);
      if (parent) need(node.depth === parent.depth + 1 && parent.order < node.order, `${node.id}: parent relation invalid`);
    }
  }

  const clustered = (value.normalizedSenseClusters || []).flatMap((cluster) => cluster.memberNodeIds || []);
  need(new Set(clustered).size === clustered.length, 'node assigned to multiple clusters');
  need(new Set(clustered).size === nodes.length, 'not all nodes clustered');

  const golden = value.goldenRegression;
  const current = flatten(existing.definition);
  need(value.packetType === 'golden-reference' && value.status === 'golden-reference-fixture' && Boolean(golden), 'golden fixture gate mismatch');
  need(current.length === 26 && nodes.length === 26 && golden.expectedNodeCount === 26, 'H776 node count mismatch');
  need(Math.max(...current.map((node) => node.depth)) === 3 && golden.expectedMaxDepth === 3, 'H776 depth mismatch');
  need(existing.reviewStatus === golden.expectedDisplayStatus, 'H776 display status mismatch');
  need(existing.twot?.entry === golden.expectedTwotEntry, 'H776 TWOT mismatch');
  need(existing.originKo === golden.expectedOriginKo, 'H776 origin mismatch');
  need(value.identity.canonicalStrong === existing.strong, 'H776 Strong mismatch');
  need(value.identity.lemma === existing.lemma, 'H776 lemma mismatch');
  current.forEach((node, index) => {
    for (const key of ['id', 'parentId', 'depth', 'order', 'translationKo']) {
      need(nodes[index]?.[key] === node[key], `H776 node mismatch ${node.id}:${key}`);
    }
  });
  const display = resolveLexiconTranslationDisplayState('H0776');
  need(display.status === 'ready' && display.displayAllowed === true, 'H776 display gate regression');
  need(SHA.test(value.packetFingerprint || ''), 'packet fingerprint invalid');
  need(value.packetFingerprint === fingerprint(value, 'packetFingerprint'), 'packet fingerprint mismatch');
  return errors;
}

function selfTest() {
  assert.equal(normalizeStrong('H0776'), 'H776');
  assert.equal(normalizeStrong('H01234a'), 'H1234a');
  assert.equal(normalizeLexiconTranslationStrong('H0776'), 'H776');
  const drift = structuredClone(packet);
  drift.senseNodes[0].translationKo = '변경된 번역';
  drift.packetFingerprint = fingerprint(drift, 'packetFingerprint');
  assert.ok(validatePacket(drift).some((error) => error.includes('H776 node mismatch')));
  const unsafe = structuredClone(packet);
  unsafe.licenseSummary.newGenerationAllowed = true;
  unsafe.packetFingerprint = fingerprint(unsafe, 'packetFingerprint');
  assert.ok(validatePacket(unsafe).some((error) => error.includes('must block generation')));
}

const errors = [...validateSchemas(), ...validatePacket(packet)];
if (errors.length) {
  console.error(`✗ lexicon evidence contract failed · errors=${errors.length}`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
selfTest();
console.log(`✓ lexicon evidence contract passed · strong=${packet.identity.canonicalStrong} · nodes=${packet.senseNodes.length} · mode=${packet.processingMode} · historicalPolicy=${packet.sourceRegistryPolicyVersion} · currentPolicy=${registry.policyVersion} · generationAllowed=false`);
