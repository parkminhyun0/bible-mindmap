#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonical, fingerprint } from './build-h776-parser-adapter.mjs';
import { LEXICON_TRANSLATION_PILOT } from '../src/data/lexiconTranslationPilot.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PACKET = 'data/lexicon/fixtures/GEN-1-1-H776.evidence-packet.v2.json';
const DEFAULT_RECONCILIATION = 'data/lexicon/fixtures/GEN-1-1-H776.source-golden-reconciliation.v1.json';
const DEFAULT_REGISTRY = 'data/lexicon/source-registry.json';
const BASELINE_GOLDEN_PACKET_FINGERPRINT = 'sha256:4ac67c63c1498f84b0ffc9c716ea98091cd0ccd8d11ac5e00aecff34ebd56ddf';
const ANOMALY_CODE = 'SOURCE_TEXT_TRIAL_TERRITORY';

const read = (relativePath) => JSON.parse(fs.readFileSync(path.resolve(ROOT, relativePath), 'utf8'));

function hashCanonical(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')}`;
}

function flattenGolden(nodes, parentId = null, depth = 0, out = []) {
  for (const node of nodes || []) {
    out.push({ id: node.id, parentId, depth, order: out.length + 1, translationKo: node.text });
    flattenGolden(node.children, node.id, depth + 1, out);
  }
  return out;
}

function buildMappingIndex(reconciliation) {
  const index = new Map();
  for (const mapping of reconciliation.sourceMappings || []) {
    for (const goldenNodeId of mapping.goldenNodeIds || []) {
      if (index.has(goldenNodeId)) throw new Error(`duplicate reconciliation mapping for ${goldenNodeId}`);
      index.set(goldenNodeId, mapping);
    }
  }
  for (const legacy of reconciliation.legacyRetained || []) {
    if (index.has(legacy.goldenNodeId)) throw new Error(`legacy node also source-mapped: ${legacy.goldenNodeId}`);
    index.set(legacy.goldenNodeId, legacy);
  }
  return index;
}

function buildObservationIndex(reconciliation) {
  const index = new Map();
  for (const observation of reconciliation.observations || []) {
    for (const goldenNodeId of observation.goldenNodeIds || []) {
      const list = index.get(goldenNodeId) || [];
      list.push(observation.code);
      index.set(goldenNodeId, list);
    }
  }
  return index;
}

export function buildH776EvidencePacketV2({
  sourceOutput,
  packetTemplate = read(DEFAULT_PACKET),
  reconciliation = read(DEFAULT_RECONCILIATION),
  registry = read(DEFAULT_REGISTRY),
  goldenRecord = LEXICON_TRANSLATION_PILOT.H776,
} = {}) {
  if (!sourceOutput) throw new Error('sourceOutput is required');
  if (sourceOutput.identity?.canonicalStrong !== 'H776') throw new Error('source output Strong must be H776');
  if (sourceOutput.processingMode !== 'regression-only') throw new Error('source output must remain regression-only');
  if (sourceOutput.summary?.nodeCount !== reconciliation.source?.nodeCount) throw new Error('source node count mismatch');
  if (sourceOutput.summary?.maxDepth !== reconciliation.source?.maxDepth) throw new Error('source maxDepth mismatch');
  if (sourceOutput.source?.sourceFingerprint !== reconciliation.source?.sourceFingerprint) throw new Error('source fingerprint mismatch');
  if (sourceOutput.outputFingerprint !== fingerprint(sourceOutput, 'outputFingerprint')) throw new Error('source output fingerprint mismatch');
  if (reconciliation.gates?.evidenceRegenerationAllowed !== true) throw new Error('reconciliation does not allow evidence regeneration');
  for (const gate of ['candidateGenerationAllowed', 'approvalRegistryWriteAllowed', 'serviceUiWriteAllowed', 'goldenMeaningMutationAllowed']) {
    if (reconciliation.gates?.[gate] !== false) throw new Error(`reconciliation gate must remain closed: ${gate}`);
  }

  const sourceNodes = new Map((sourceOutput.nodes || []).map((node) => [node.id, node]));
  const mappingIndex = buildMappingIndex(reconciliation);
  const observationIndex = buildObservationIndex(reconciliation);
  const goldenNodes = flattenGolden(goldenRecord?.definition);
  if (goldenNodes.length !== reconciliation.golden?.nodeCount) throw new Error('Golden node count mismatch');

  const senseNodes = goldenNodes.map((golden) => {
    const mapping = mappingIndex.get(golden.id);
    if (!mapping) throw new Error(`Golden node not accounted by reconciliation: ${golden.id}`);

    if ('goldenNodeId' in mapping) {
      return {
        ...golden,
        sourceText: null,
        provenanceStatus: 'legacy-approved-snapshot',
        evidenceSupport: 'legacy-only',
        sourceNodeId: null,
        observations: observationIndex.get(golden.id) || [],
        sourceRefs: [],
      };
    }

    const sourceNode = sourceNodes.get(mapping.sourceNodeId);
    if (!sourceNode) throw new Error(`mapped source node missing: ${mapping.sourceNodeId}`);
    const combined = mapping.relation === 'one-source-to-golden-subtree';
    return {
      ...golden,
      sourceText: sourceNode.sourceText,
      provenanceStatus: combined ? 'reconciled-source' : 'parsed-source',
      evidenceSupport: combined ? 'combined' : 'direct',
      sourceNodeId: sourceNode.id,
      observations: observationIndex.get(golden.id) || [],
      sourceRefs: [{ sourceId: sourceOutput.source.sourceId, locator: sourceNode.sourceLocator }],
    };
  }).map(({ id, parentId, depth, order, sourceText, translationKo, provenanceStatus, evidenceSupport, sourceNodeId, observations, sourceRefs }) => ({
    id, parentId, depth, order, sourceText, translationKo, provenanceStatus, evidenceSupport, sourceNodeId, observations, sourceRefs,
  }));

  const supportCounts = senseNodes.reduce((counts, node) => {
    if (node.evidenceSupport === 'direct') counts.direct += 1;
    else if (node.evidenceSupport === 'combined') counts.combined += 1;
    else if (node.evidenceSupport === 'legacy-only') counts.legacyOnly += 1;
    return counts;
  }, { direct: 0, combined: 0, legacyOnly: 0 });

  const packet = structuredClone(packetTemplate);
  packet.sourceRegistryPolicyVersion = registry.policyVersion;
  packet.identity = structuredClone(sourceOutput.identity);
  packet.sourceInputs = (packet.sourceInputs || []).map((input) => {
    if (input.sourceId !== sourceOutput.source.sourceId) return input;
    return {
      sourceId: sourceOutput.source.sourceId,
      registryWorkflowStatus: sourceOutput.source.registryWorkflowStatus,
      usagePolicy: sourceOutput.source.usagePolicy,
      sourceFingerprint: sourceOutput.source.sourceFingerprint,
      locators: [sourceOutput.source.locator],
    };
  });
  if (!packet.sourceInputs.some((input) => input.sourceId === sourceOutput.source.sourceId)) {
    packet.sourceInputs.unshift({
      sourceId: sourceOutput.source.sourceId,
      registryWorkflowStatus: sourceOutput.source.registryWorkflowStatus,
      usagePolicy: sourceOutput.source.usagePolicy,
      sourceFingerprint: sourceOutput.source.sourceFingerprint,
      locators: [sourceOutput.source.locator],
    });
  }

  packet.senseNodes = senseNodes;
  packet.licenseSummary = {
    allAutomaticInputsApproved: true,
    newGenerationAllowed: false,
    approvedSources: packet.sourceInputs.filter((input) => input.usagePolicy === 'automatic-evidence').map((input) => input.sourceId),
    restrictedSources: packet.sourceInputs.filter((input) => input.usagePolicy === 'legacy-regression-only').map((input) => input.sourceId),
    notes: 'H776 Golden의 승인 한국어 26노드를 보존한 채 pinned OpenScriptures BDB sourceText를 23→26 reconciliation으로 결합한 회귀 Evidence Packet이다. 1.2.8은 primary source node가 없어 legacy-only로 유지하며, 1.2.3은 SOURCE_TEXT_TRIAL_TERRITORY 관찰이 해소되기 전 candidate generation과 의미 변경을 금지한다.',
  };

  const koreanSnapshot = goldenNodes.map(({ id, translationKo }) => ({ id, translationKo }));
  packet.regeneration = {
    mode: 'deterministic-source-golden-reconciliation',
    baselineGoldenPacketFingerprint: BASELINE_GOLDEN_PACKET_FINGERPRINT,
    sourceOutputFingerprint: sourceOutput.outputFingerprint,
    reconciliationId: reconciliation.reconciliationId,
    reconciliationFingerprint: reconciliation.reconciliationFingerprint,
    koreanSnapshotFingerprint: hashCanonical(koreanSnapshot),
    evidenceSupportCounts: supportCounts,
    gates: structuredClone(reconciliation.gates),
  };
  packet.packetFingerprint = '';
  packet.packetFingerprint = fingerprint(packet, 'packetFingerprint');

  if (packet.senseNodes.find((node) => node.id === '1.2.3')?.observations?.includes(ANOMALY_CODE) !== true) {
    throw new Error(`${ANOMALY_CODE} observation missing`);
  }
  return packet;
}

function parseArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function runCli() {
  const sourceOutputPath = parseArg('--source-output=');
  if (!sourceOutputPath) throw new Error('requires --source-output=<json>');
  const packet = buildH776EvidencePacketV2({ sourceOutput: read(sourceOutputPath) });
  const writeTarget = parseArg('--write=');
  if (writeTarget) {
    const outputPath = path.resolve(ROOT, writeTarget);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`);
    console.log(`✓ H776 Evidence Packet v2 regenerated · nodes=${packet.senseNodes.length} · fingerprint=${packet.packetFingerprint}`);
    return;
  }
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) runCli();
