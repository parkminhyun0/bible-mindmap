#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildH776ParserAdapter, canonical, fingerprint } from './build-h776-parser-adapter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
const inputSchema = read('data/lexicon/schemas/BdbParserInput.schema.json');
const outputSchema = read('data/lexicon/schemas/BdbParserOutput.schema.json');
const strongSchema = read('data/lexicon/schemas/StrongIdentity.schema.json');
const registry = read('data/lexicon/source-registry.json');
const input = read('data/lexicon/fixtures/GEN-1-1-H776.parser-input.v1.json');
const evidence = read('data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json');
const SHA = /^sha256:[a-f0-9]{64}$/;

function validateSchemas() {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  for (const [name, schema] of [['input', inputSchema], ['output', outputSchema]]) {
    need(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', `${name} schema draft mismatch`);
    need(schema.additionalProperties === false, `${name} schema must reject additional properties`);
    need(schema.properties?.identity?.$ref === './StrongIdentity.schema.json', `${name} identity ref mismatch`);
    need(schema.properties?.schemaVersion?.const === 1, `${name} schemaVersion mismatch`);
  }
  need(String(inputSchema.$id || '').endsWith('/BdbParserInput.schema.json'), 'input schema id mismatch');
  need(String(outputSchema.$id || '').endsWith('/BdbParserOutput.schema.json'), 'output schema id mismatch');
  need(String(strongSchema.$id || '').endsWith('/StrongIdentity.schema.json'), 'Strong schema prerequisite missing');
  for (const key of ['processingMode', 'source', 'identity', 'options', 'inputFingerprint']) {
    need(inputSchema.required?.includes(key), `input required field missing: ${key}`);
  }
  for (const key of ['processingMode', 'source', 'identity', 'nodes', 'summary', 'outputFingerprint']) {
    need(outputSchema.required?.includes(key), `output required field missing: ${key}`);
  }
  return errors;
}

function validateInput(value) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  const source = registry.sources.find((entry) => entry.sourceId === value?.source?.sourceId);
  need(value?.schemaVersion === 1, 'input schemaVersion must be 1');
  need(value?.parser?.id === 'bdb-deterministic-tree-parser', 'parser id mismatch');
  need(/^1\.\d+\.\d+$/.test(value?.parser?.version || ''), 'parser version invalid');
  need(Boolean(source), `unregistered parser source: ${value?.source?.sourceId}`);
  need(value?.identity?.identityFingerprint === evidence.identity.identityFingerprint, 'input identity fingerprint mismatch');
  need(value?.identity?.canonicalStrong === 'H776', 'input Strong mismatch');
  need(value?.inputFingerprint === fingerprint(value, 'inputFingerprint'), 'input fingerprint mismatch');

  if (value?.processingMode === 'candidate-generation') {
    need(source?.workflow?.status === value.source.registryWorkflowStatus, 'candidate parser source workflow mismatch');
    need(value?.parser?.mode === 'source-parse', 'candidate generation requires source-parse mode');
    need(value?.source?.usagePolicy === 'automatic-evidence', 'candidate generation requires automatic-evidence');
    need(source?.workflow?.status === 'approved-ready' && source?.workflow?.autoProcessingAllowed === true, 'candidate source is not approved-ready');
    need(value?.source?.sourceFingerprint === source?.provenance?.contentHash, 'candidate source fingerprint mismatch');
    need(value?.options?.emitSourceText === true, 'candidate generation must emit source text');
    need(value?.options?.allowTranslationSnapshot === false, 'candidate generation cannot carry translation snapshot');
    need(value?.goldenReference === null, 'candidate generation cannot include golden reference');
  } else {
    need(value?.processingMode === 'regression-only', 'processingMode invalid');
    need(value?.parser?.mode === 'legacy-golden-adapter', 'regression input requires legacy adapter');
    need(value?.source?.usagePolicy === 'legacy-regression-only', 'regression input requires legacy source policy');
    need(value?.source?.sourceFingerprint === null, 'legacy source fingerprint must be null');
    need(['blocked', 'internal-review-only', 'approved-pending-fingerprint', 'approved-ready'].includes(source?.workflow?.status), 'current parser source workflow invalid');
    need(value?.options?.emitSourceText === false, 'legacy adapter must not claim source text');
    need(value?.options?.allowTranslationSnapshot === true, 'legacy adapter must preserve translation snapshot');
    need(value?.goldenReference?.referenceCase === 'GEN-1-1-H776', 'golden reference missing');
  }
  return errors;
}

function validateOutput(output) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  need(output?.schemaVersion === 1, 'output schemaVersion must be 1');
  need(output?.requestId === input.requestId, 'output requestId mismatch');
  need(output?.processingMode === input.processingMode, 'output processingMode mismatch');
  need(output?.parser?.mode === 'legacy-golden-adapter', 'output parser mode mismatch');
  need(output?.source?.sourceId === input.source.sourceId, 'output source mismatch');
  need(output?.identity?.identityFingerprint === input.identity.identityFingerprint, 'output identity mismatch');
  need(SHA.test(output?.outputFingerprint || ''), 'output fingerprint invalid');
  need(output?.outputFingerprint === fingerprint(output, 'outputFingerprint'), 'output fingerprint mismatch');

  const nodes = output?.nodes || [];
  const byId = new Map();
  const orders = new Set();
  for (const node of nodes) {
    need(!byId.has(node.id), `duplicate parser node: ${node.id}`);
    byId.set(node.id, node);
    need(!orders.has(node.order), `duplicate parser order: ${node.order}`);
    orders.add(node.order);
    need(node.provenanceStatus === 'legacy-approved-snapshot', `${node.id}: provenance mismatch`);
    need(node.sourceText === null, `${node.id}: legacy adapter must not claim source text`);
    need(Boolean(node.translationSnapshotKo?.trim()), `${node.id}: translation snapshot missing`);
    need(node.sourceLocator === `${input.source.locator}:${node.id}`, `${node.id}: source locator mismatch`);
  }
  need(nodes.every((node, index) => node.order === index + 1), 'parser node order must be contiguous');
  for (const node of nodes) {
    if (node.parentId === null) need(node.depth === 0, `${node.id}: root depth invalid`);
    else {
      const parent = byId.get(node.parentId);
      need(Boolean(parent), `${node.id}: parent missing`);
      if (parent) need(parent.order < node.order && node.depth === parent.depth + 1, `${node.id}: parent relation invalid`);
    }
  }
  need(output.summary.rootCount === 1, 'rootCount mismatch');
  need(output.summary.nodeCount === 26 && nodes.length === 26, 'nodeCount mismatch');
  need(output.summary.maxDepth === 3, 'maxDepth mismatch');
  need(input.goldenReference.expectedNodeCount === output.summary.nodeCount, 'golden nodeCount mismatch');
  need(input.goldenReference.expectedMaxDepth === output.summary.maxDepth, 'golden maxDepth mismatch');
  const evidenceNodes = evidence.senseNodes || [];
  need(evidenceNodes.length === nodes.length, 'evidence/parser node count mismatch');
  evidenceNodes.forEach((node, index) => {
    const parsed = nodes[index];
    for (const key of ['id', 'parentId', 'depth', 'order']) need(parsed?.[key] === node[key], `parser/evidence mismatch ${node.id}:${key}`);
    need(parsed?.translationSnapshotKo === node.translationKo, `parser/evidence translation mismatch ${node.id}`);
  });
  return errors;
}

function selfTest() {
  const repeatedA = buildH776ParserAdapter(input);
  const repeatedB = buildH776ParserAdapter(input);
  assert.deepEqual(canonical(repeatedA), canonical(repeatedB), 'adapter output must be deterministic');
  const unsafe = structuredClone(input);
  unsafe.processingMode = 'candidate-generation';
  unsafe.parser.mode = 'source-parse';
  unsafe.options.emitSourceText = true;
  unsafe.options.allowTranslationSnapshot = false;
  unsafe.goldenReference = null;
  unsafe.inputFingerprint = fingerprint(unsafe, 'inputFingerprint');
  assert.ok(validateInput(unsafe).some((error) => error.includes('fingerprint mismatch') || error.includes('workflow mismatch')));
  const tampered = structuredClone(repeatedA);
  tampered.nodes[0].translationSnapshotKo = '변경';
  assert.ok(validateOutput(tampered).some((error) => error.includes('fingerprint')));
}

const output = buildH776ParserAdapter(input);
const errors = [...validateSchemas(), ...validateInput(input), ...validateOutput(output)];
if (errors.length) {
  console.error(`✗ lexicon parser contract failed · errors=${errors.length}`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
selfTest();
const writeArg = process.argv.find((value) => value.startsWith('--write='));
if (writeArg) {
  const target = path.resolve(ROOT, writeArg.slice('--write='.length));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
}
console.log(`✓ lexicon parser contract passed · strong=${output.identity.canonicalStrong} · mode=${output.parser.mode} · nodes=${output.summary.nodeCount} · sourceTextClaimed=false · generationAllowed=false · currentSource=${registry.sources.find((item) => item.sourceId === input.source.sourceId)?.workflow.status}`);
