#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEXICON_TRANSLATION_PILOT } from '../src/data/lexiconTranslationPilot.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_INPUT = 'data/lexicon/fixtures/GEN-1-1-H776.parser-input.v1.json';

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function fingerprint(value, key) {
  const copy = structuredClone(value);
  delete copy[key];
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonical(copy))).digest('hex')}`;
}

export function flattenLegacyDefinition(nodes, sourceLocator, parentId = null, depth = 0, out = []) {
  for (const node of nodes || []) {
    out.push({
      id: node.id,
      parentId,
      depth,
      order: out.length + 1,
      sourceText: null,
      translationSnapshotKo: node.text,
      provenanceStatus: 'legacy-approved-snapshot',
      sourceLocator: `${sourceLocator}:${node.id}`,
    });
    flattenLegacyDefinition(node.children, sourceLocator, node.id, depth + 1, out);
  }
  return out;
}

export function buildH776ParserAdapter(input, record = LEXICON_TRANSLATION_PILOT.H776) {
  if (input?.processingMode !== 'regression-only') {
    throw new Error('H776 legacy adapter requires regression-only processing');
  }
  if (input?.parser?.mode !== 'legacy-golden-adapter') {
    throw new Error('H776 legacy adapter mode mismatch');
  }
  if (input?.source?.usagePolicy !== 'legacy-regression-only') {
    throw new Error('H776 legacy adapter requires legacy-regression-only source policy');
  }
  if (!record || record.strong !== input?.identity?.canonicalStrong) {
    throw new Error('H776 legacy record identity mismatch');
  }

  const nodes = flattenLegacyDefinition(record.definition, input.source.locator);
  const output = {
    schemaVersion: 1,
    runId: 'GEN-1-1-H776-PARSER-RUN',
    requestId: input.requestId,
    parser: structuredClone(input.parser),
    processingMode: input.processingMode,
    source: structuredClone(input.source),
    identity: structuredClone(input.identity),
    nodes,
    summary: {
      rootCount: nodes.filter((node) => node.parentId === null).length,
      nodeCount: nodes.length,
      maxDepth: Math.max(...nodes.map((node) => node.depth)),
    },
    outputFingerprint: '',
  };
  output.outputFingerprint = fingerprint(output, 'outputFingerprint');
  return output;
}

function parseArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function runCli() {
  const inputPath = path.resolve(ROOT, parseArg('--input=') || DEFAULT_INPUT);
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const output = buildH776ParserAdapter(input);
  const writeTarget = parseArg('--write=');
  if (writeTarget) {
    const outputPath = path.resolve(ROOT, writeTarget);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`✓ H776 parser adapter wrote ${path.relative(ROOT, outputPath)} · nodes=${output.summary.nodeCount}`);
    return;
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli();
}
