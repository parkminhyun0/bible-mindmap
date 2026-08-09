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
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
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

function validateSchemas() {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  need(schemaStrong.$schema === 'https://json-schema.org/draft/2020-12/schema', 'Strong schema draft mismatch');
  need(schemaStrong.additionalProperties === false, 'Strong schema must reject additional properties');
  need(String(schemaStrong.$id || '').endsWith('/StrongIdentity.schema.json'), 'Strong schema id mismatch');
  for (const key of ['canonicalStrong', 'baseStrong', 'disambiguationSuffix', 'language', 'lemmaNormalized', 'identityFingerprint']) {
    need(schemaStrong.required?.includes(key), `Strong required field missing: ${key}`);
  }
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
  for (const form of identity?.sourceForms || []) {
    need(normalizeStrong(form) === identity.canonicalStrong, `source form mismatch: ${form}`);
  }
  const match = String(identity?.canonicalStrong || '').match(/^([HG][1-9]\d*)([a-z]?)$/);
  const base = match?.[1] || null;
  const suffix = match?.[2] || null;
  need(identity?.baseStrong === base, 'baseStrong mismatch');
  need(identity?.disambiguationSuffix === suffix, 'disambiguationSuffix mismatch');
  need(identity?.namespace === (suffix ? 'extended-strong' : 'strong'), 'namespace mismatch');
  if (identity?.canonicalStrong?.startsWith('G')) {
    need(identity.testament === 'new-testament' && identity.language === 'greek', 'G identity language/testament mismatch');
  } else {
    need(identity?.testament === 'old-testament', 'H identity testament mismatch');
    need(['hebrew', 'aramaic'].includes(identity?.language), 'H identity language mismatch');
  }
  need(typeof identity?.lemma === 'string' && identity.lemma.length > 0, 'lemma missing');
  need(identity?.lemmaNormalized === identity?.lemma?.normalize('NFC'), 'lemma NFC mismatch');
  need(Boolean(identity?.transliteration?.scientific), 'scientific transliteration missing');
  need(Boolean(identity?.partOfSpeech?.code && identity?.partOfSpeech?.labelEn), 'partOfSpeech missing');
  need(Array.isArray(identity?.sourceRefs) && identity.sourceRefs.length > 0, 'identity sourceRefs missing');
  need(SHA.test(identity?.identityFingerprint || ''), 'identity fingerprint invalid');
  need(identity?.identityFingerprint === fingerprint(identity, 'identityFingerprint'), 'identity fingerprint mismatch');
  return errors;
}

function validatePacket(value) {
  const errors = [...validateIdentity(value.identity)];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  const sources = new Map(registry.sources.map((source) => [source.sourceId, source]));
  need(value.schemaVersion === 2, 'packet schemaVersion must be 2');
  need(value.sourceRegistryPolicyVersion === registry.policyVersion, 'registry policy mismatch');

  const inputIds = new Set();
  for (const input of value.sourceInputs || []) {
    need(!inputIds.has(input.sourceId), `duplicate source input: ${input.sourceId}`);
    inputIds.add(input.sourceId);
    const source = sources.get(input.sourceId);
    need(Boolean(source), `unregistered source: ${input.sourceId}`);
    if (!source) continue;
    need(source.workflow.status === input.registryWorkflowStatus, `${input.sourceId}: workflow mismatch`);
    if (input.usagePolicy === 'automatic-evidence') {
      need(source.workflow.status === 'approved-ready' && source.workflow.autoProcessingAllowed, `${input.sourceId}: not auto-ready`);
      need(source.provenance.contentHash === input.sourceFingerprint, `${input.sourceId}: fingerprint mismatch`);
    } else {
      need(input.usagePolicy === 'legacy-regression-only', `${input.sourceId}: usagePolicy invalid`);
      need(value.processingMode === 'regression-only', `${input.sourceId}: legacy source outside regression`);
      need(input.sourceFingerprint === null, `${input.sourceId}: legacy fingerprint must be null`);
    }
  }
  const approved = value.sourceInputs.filter((v) => v.usagePolicy === 'automatic-evidence').map((v) => v.sourceId).sort();
  const restricted = value.sourceInputs.filter((v) => v.usagePolicy === 'legacy-regression-only').map((v) => v.sourceId).sort();
  need(JSON.stringify([...value.licenseSummary.approvedSources].sort()) === JSON.stringify(approved), 'approvedSources mismatch');
  need(JSON.stringify([...value.licenseSummary.restrictedSources].sort()) === JSON.stringify(restricted), 'restrictedSources mismatch');
  need(value.licenseSummary.allAutomaticInputsApproved === true, 'automatic inputs not approved');
  if (value.processingMode === 'candidate-generation') {
    need(restricted.length === 0, 'candidate generation cannot use restricted sources');
    need(value.licenseSummary.newGenerationAllowed === true && value.status === 'source-ready', 'candidate generation gate mismatch');
  } else {
    need(value.processingMode === 'regression-only', 'processingMode invalid');
    need(value.licenseSummary.newGenerationAllowed === false, 'regression packet must block generation');
  }

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
    if (node.provenanceStatus === 'legacy-approved-snapshot') {
      need(node.sourceText === null && Boolean(node.translationKo?.trim()), `${node.id}: legacy node invalid`);
    } else {
      need(node.provenanceStatus === 'parsed-source' && Boolean(node.sourceText?.trim()), `${node.id}: parsed node invalid`);
    }
    for (const ref of node.sourceRefs || []) need(inputIds.has(ref.sourceId), `${node.id}: undeclared sourceRef`);
  }
  need(nodes.every((node, index) => node.order === index + 1), 'node order must be contiguous');
  for (const node of nodes) {
    if (node.parentId === null) need(node.depth === 0, `${node.id}: root depth invalid`);
    else {
      const parent = byId.get(node.parentId);
      need(Boolean(parent), `${node.id}: parent missing`);
      if (parent) {
        need(parent.order < node.order, `${node.id}: parent order invalid`);
        need(node.depth === parent.depth + 1, `${node.id}: depth relation invalid`);
      }
    }
  }

  const clustered = [];
  for (const cluster of value.normalizedSenseClusters || []) {
    for (const nodeId of cluster.memberNodeIds || []) {
      need(byId.has(nodeId), `${cluster.clusterId}: unknown node ${nodeId}`);
      clustered.push(nodeId);
    }
  }
  need(new Set(clustered).size === clustered.length, 'node assigned to multiple clusters');
  need(new Set(clustered).size === nodes.length, 'not all nodes clustered');
  for (const context of value.representativeContexts || []) {
    need(context.lemma === value.identity.lemma, `${context.reference}: lemma mismatch`);
    for (const sourceId of context.sourceIds || []) need(inputIds.has(sourceId), `${context.reference}: undeclared source`);
  }

  if (value.packetType === 'golden-reference') {
    const golden = value.goldenRegression;
    const current = flatten(existing.definition);
    need(value.status === 'golden-reference-fixture' && Boolean(golden), 'golden fixture gate mismatch');
    need(current.length === golden.expectedNodeCount && nodes.length === current.length, 'H776 node count mismatch');
    need(Math.max(...current.map((node) => node.depth)) === golden.expectedMaxDepth, 'H776 depth mismatch');
    need(existing.reviewStatus === golden.expectedDisplayStatus, 'H776 display status mismatch');
    need(existing.twot?.entry === golden.expectedTwotEntry, 'H776 TWOT mismatch');
    need(existing.originKo === golden.expectedOriginKo, 'H776 origin mismatch');
    need(value.identity.canonicalStrong === existing.strong, 'H776 Strong mismatch');
    need(value.identity.lemma === existing.lemma, 'H776 lemma mismatch');
    need(value.identity.transliteration.korean === existing.translitKo, 'H776 transliteration mismatch');
    need(value.identity.partOfSpeech.labelKo === existing.partOfSpeechKo, 'H776 POS mismatch');
    current.forEach((node, index) => {
      for (const key of ['id', 'parentId', 'depth', 'order', 'translationKo']) {
        need(nodes[index]?.[key] === node[key], `H776 node mismatch ${node.id}:${key}`);
      }
    });
    for (const form of golden.expectedStrongForms || []) need(normalizeStrong(form) === 'H776', `golden form mismatch: ${form}`);
    const display = resolveLexiconTranslationDisplayState('H0776');
    need(display.status === 'ready' && display.displayAllowed === true, 'H776 display gate regression');
  } else {
    need(value.goldenRegression === null, 'generation packet cannot include goldenRegression');
  }

  need(SHA.test(value.packetFingerprint || ''), 'packet fingerprint invalid');
  need(value.packetFingerprint === fingerprint(value, 'packetFingerprint'), 'packet fingerprint mismatch');
  return errors;
}

function selfTest() {
  assert.equal(normalizeStrong('H0776'), 'H776');
  assert.equal(normalizeStrong('H01234a'), 'H1234a');
  assert.equal(normalizeStrong('g03056'), 'G3056');
  assert.equal(normalizeLexiconTranslationStrong('H0776'), 'H776');

  const suffix = structuredClone(packet);
  suffix.identity.canonicalStrong = 'H776a';
  suffix.identity.identityId = 'H776a';
  suffix.identity.identityFingerprint = fingerprint(suffix.identity, 'identityFingerprint');
  assert.ok(validatePacket(suffix).some((error) => error.includes('disambiguationSuffix')));

  const unsafe = structuredClone(packet);
  unsafe.packetType = 'generation';
  unsafe.processingMode = 'candidate-generation';
  unsafe.status = 'source-ready';
  unsafe.goldenRegression = null;
  unsafe.licenseSummary.newGenerationAllowed = true;
  unsafe.packetFingerprint = fingerprint(unsafe, 'packetFingerprint');
  assert.ok(validatePacket(unsafe).some((error) => error.includes('restricted sources')));

  const drift = structuredClone(packet);
  drift.senseNodes[0].translationKo = '변경된 번역';
  drift.packetFingerprint = fingerprint(drift, 'packetFingerprint');
  assert.ok(validatePacket(drift).some((error) => error.includes('H776 node mismatch')));
}

const errors = [...validateSchemas(), ...validatePacket(packet)];
if (errors.length) {
  console.error(`✗ lexicon evidence contract failed · errors=${errors.length}`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
selfTest();
console.log(`✓ lexicon evidence contract passed · strong=${packet.identity.canonicalStrong} · nodes=${packet.senseNodes.length} · clusters=${packet.normalizedSenseClusters.length} · mode=${packet.processingMode} · generationAllowed=${packet.licenseSummary.newGenerationAllowed}`);
