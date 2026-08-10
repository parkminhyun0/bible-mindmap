#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fingerprint } from './build-h776-parser-adapter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OPENSCRIPTURES_BDB_SOURCE = Object.freeze({
  sourceId: 'openscriptures-hebrewlexicon-bdb',
  commit: '21c9add13bc727d3a951361778e97e3ff7afd1ce',
  aggregateFingerprint: 'sha256:f239a1ce682946ae7b3537026033fa5dd61f4b485d22aba37189c2e6f2c873b0',
  files: Object.freeze({
    bdb: Object.freeze({ path: 'BrownDriverBriggs.xml', gitBlobSha: '21bb98cab34334cd500553addc38aca6792f7bce' }),
    index: Object.freeze({ path: 'LexicalIndex.xml', gitBlobSha: 'd11eb2078532f3119c70822bd27a91b484d4727b' }),
  }),
});

const DEFAULT_BDB_PATH = '.cache/lexicon/openscriptures/BrownDriverBriggs.xml';
const DEFAULT_INDEX_PATH = '.cache/lexicon/openscriptures/LexicalIndex.xml';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseAttributes(tag) {
  const attributes = {};
  const pattern = /([:\w-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  for (const match of tag.matchAll(pattern)) attributes[match[1]] = match[3] ?? match[4] ?? '';
  return attributes;
}

function decodeXmlEntities(value) {
  const named = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"' };
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z]+);/g, (whole, entity) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity] ?? whole;
  });
}

export function normalizeXmlText(fragment) {
  return decodeXmlEntities(String(fragment)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeHebrewLemma(value) {
  return String(value).normalize('NFC').replace(/[\u0591-\u05AF]/g, '');
}

export function gitBlobSha(content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto.createHash('sha1').update(header).update(buffer).digest('hex');
}

function extractElementAt(xml, tagName, startIndex) {
  const tokenPattern = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*>`, 'g');
  tokenPattern.lastIndex = startIndex;
  let depth = 0;
  for (const token of xml.matchAll(tokenPattern)) {
    const raw = token[0];
    const isClosing = raw.startsWith('</');
    const isSelfClosing = /\/\s*>$/.test(raw);
    if (!isClosing) {
      depth += 1;
      if (isSelfClosing) depth -= 1;
    } else {
      depth -= 1;
      if (depth === 0) {
        return {
          start: startIndex,
          end: token.index + raw.length,
          text: xml.slice(startIndex, token.index + raw.length),
        };
      }
    }
  }
  throw new Error(`Unclosed <${tagName}> element at ${startIndex}`);
}

function extractElementById(xml, tagName, id) {
  const openingPattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*\\bid=(?:"${escapeRegExp(id)}"|'${escapeRegExp(id)}')[^>]*>`, 'g');
  const match = openingPattern.exec(xml);
  if (!match) throw new Error(`${tagName} id=${id} not found`);
  return extractElementAt(xml, tagName, match.index).text;
}

function elementInnerXml(element, tagName) {
  const openEnd = element.indexOf('>');
  const closeStart = element.lastIndexOf(`</${tagName}>`);
  if (openEnd < 0 || closeStart < 0) throw new Error(`Invalid <${tagName}> element`);
  return element.slice(openEnd + 1, closeStart);
}

function directChildElements(fragment, tagName) {
  const tokenPattern = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*>`, 'g');
  const blocks = [];
  let depth = 0;
  let blockStart = null;
  for (const token of fragment.matchAll(tokenPattern)) {
    const raw = token[0];
    const isClosing = raw.startsWith('</');
    const isSelfClosing = /\/\s*>$/.test(raw);
    if (!isClosing) {
      if (depth === 0) blockStart = token.index;
      depth += 1;
      if (isSelfClosing) {
        depth -= 1;
        if (depth === 0 && blockStart !== null) {
          blocks.push(fragment.slice(blockStart, token.index + raw.length));
          blockStart = null;
        }
      }
    } else {
      depth -= 1;
      if (depth === 0 && blockStart !== null) {
        blocks.push(fragment.slice(blockStart, token.index + raw.length));
        blockStart = null;
      }
    }
  }
  if (depth !== 0) throw new Error(`Unbalanced <${tagName}> hierarchy`);
  return blocks;
}

function firstElement(xml, tagName) {
  const match = new RegExp(`<${escapeRegExp(tagName)}\\b([^>]*)>([\\s\\S]*?)</${escapeRegExp(tagName)}>`).exec(xml);
  return match ? { attributes: parseAttributes(match[1]), text: normalizeXmlText(match[2]), raw: match[0] } : null;
}

export function resolveLexicalIndexRecord(indexXml, canonicalStrong) {
  const match = /^H([1-9][0-9]*)([a-z]?)$/.exec(canonicalStrong || '');
  if (!match) throw new Error(`Unsupported Hebrew Strong identity: ${canonicalStrong}`);
  const [, strongNumber, suffix] = match;
  const entryPattern = /<entry\b[^>]*>[\s\S]*?<\/entry>/g;
  for (const entryMatch of indexXml.matchAll(entryPattern)) {
    const entryXml = entryMatch[0];
    const xrefMatch = /<xref\b([^>]*)\/>/.exec(entryXml);
    if (!xrefMatch) continue;
    const xref = parseAttributes(xrefMatch[1]);
    if (xref.strong !== strongNumber) continue;
    if ((xref.aug || '') !== suffix) continue;
    const opening = /^<entry\b([^>]*)>/.exec(entryXml);
    const word = firstElement(entryXml, 'w');
    const pos = firstElement(entryXml, 'pos');
    const definition = firstElement(entryXml, 'def');
    if (!opening || !word || !xref.bdb) throw new Error(`Incomplete LexicalIndex record for ${canonicalStrong}`);
    return {
      lexicalEntryId: parseAttributes(opening[1]).id,
      lemma: word.text,
      transliteration: word.attributes.xlit || null,
      partOfSpeech: pos?.text || null,
      briefDefinition: definition?.text || null,
      bdbEntryId: xref.bdb,
      twot: xref.twot || null,
      aug: xref.aug || null,
      sourceText: normalizeXmlText(entryXml),
    };
  }
  throw new Error(`LexicalIndex Strong ${canonicalStrong} not found`);
}

function buildSenseNodes(entryXml, bdbEntryId, parentId = '1', depth = 1, locatorPrefix = '') {
  const inner = elementInnerXml(entryXml, 'entry');
  const blocks = directChildElements(inner, 'sense');
  const nodes = [];
  blocks.forEach((block, index) => {
    const opening = /^<sense\b([^>]*)>/.exec(block);
    const attributes = parseAttributes(opening?.[1] || '');
    const sourceLabel = attributes.n || String(index + 1);
    const id = `${parentId}.${index + 1}`;
    const locator = `${locatorPrefix}/sense[${sourceLabel}]`;
    nodes.push({
      id,
      parentId,
      depth,
      order: 0,
      sourceText: normalizeXmlText(block),
      translationSnapshotKo: null,
      provenanceStatus: 'parsed-source',
      sourceLocator: `${OPENSCRIPTURES_BDB_SOURCE.files.bdb.path}:${bdbEntryId}${locator}`,
    });
    const nestedEntry = `<entry>${elementInnerXml(block, 'sense')}</entry>`;
    nodes.push(...buildSenseNodes(nestedEntry, bdbEntryId, id, depth + 1, locator));
  });
  return nodes;
}

export function buildOpenScripturesBdbOutput(input, { bdbXml, indexXml }) {
  if (input?.processingMode !== 'regression-only') {
    throw new Error('OpenScriptures adapter remains regression-only until reconciliation approval');
  }
  if (input?.parser?.mode !== 'source-parse') throw new Error('OpenScriptures adapter requires source-parse mode');
  if (input?.source?.sourceId !== OPENSCRIPTURES_BDB_SOURCE.sourceId) throw new Error('OpenScriptures sourceId mismatch');
  if (input?.source?.usagePolicy !== 'automatic-evidence') throw new Error('OpenScriptures adapter requires automatic-evidence policy');
  if (input?.source?.sourceFingerprint !== OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint) throw new Error('OpenScriptures source fingerprint mismatch');
  if (input?.options?.emitSourceText !== true || input?.options?.allowTranslationSnapshot !== false) {
    throw new Error('OpenScriptures adapter requires source text and forbids translation snapshots');
  }

  const mapping = resolveLexicalIndexRecord(indexXml, input.identity.canonicalStrong);
  if (normalizeHebrewLemma(mapping.lemma) !== normalizeHebrewLemma(input.identity.lemmaNormalized)) {
    throw new Error(`OpenScriptures lemma mismatch: ${mapping.lemma}`);
  }
  const entryXml = extractElementById(bdbXml, 'entry', mapping.bdbEntryId);
  const senseNodes = buildSenseNodes(entryXml, mapping.bdbEntryId, '1', 1, '');
  const nodes = [{
    id: '1',
    parentId: null,
    depth: 0,
    order: 0,
    sourceText: normalizeXmlText(entryXml),
    translationSnapshotKo: null,
    provenanceStatus: 'parsed-source',
    sourceLocator: `${OPENSCRIPTURES_BDB_SOURCE.files.bdb.path}:${mapping.bdbEntryId}`,
  }, ...senseNodes].map((node, index) => ({ ...node, order: index + 1 }));

  const output = {
    schemaVersion: 1,
    runId: `${input.requestId}-RUN`,
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
  return { output, mapping };
}

export function loadOpenScripturesSourceFiles({ bdbPath = DEFAULT_BDB_PATH, indexPath = DEFAULT_INDEX_PATH } = {}) {
  const resolvedBdbPath = path.resolve(ROOT, bdbPath);
  const resolvedIndexPath = path.resolve(ROOT, indexPath);
  const bdbBuffer = fs.readFileSync(resolvedBdbPath);
  const indexBuffer = fs.readFileSync(resolvedIndexPath);
  const bdbSha = gitBlobSha(bdbBuffer);
  const indexSha = gitBlobSha(indexBuffer);
  if (bdbSha !== OPENSCRIPTURES_BDB_SOURCE.files.bdb.gitBlobSha) throw new Error(`BrownDriverBriggs.xml git blob mismatch: ${bdbSha}`);
  if (indexSha !== OPENSCRIPTURES_BDB_SOURCE.files.index.gitBlobSha) throw new Error(`LexicalIndex.xml git blob mismatch: ${indexSha}`);
  return {
    bdbXml: bdbBuffer.toString('utf8').replace(/^\uFEFF/, ''),
    indexXml: indexBuffer.toString('utf8').replace(/^\uFEFF/, ''),
    files: [
      { path: OPENSCRIPTURES_BDB_SOURCE.files.bdb.path, bytes: bdbBuffer.length, gitBlobSha: bdbSha },
      { path: OPENSCRIPTURES_BDB_SOURCE.files.index.path, bytes: indexBuffer.length, gitBlobSha: indexSha },
    ],
  };
}

export function createOpenScripturesBdbAdapter(paths = {}) {
  return Object.freeze({
    adapterId: 'openscriptures-bdb-xml-v1',
    parserMode: 'source-parse',
    sourceIds: Object.freeze([OPENSCRIPTURES_BDB_SOURCE.sourceId]),
    supports(input) {
      return /^H[1-9][0-9]*[a-z]?$/.test(input?.identity?.canonicalStrong || '');
    },
    execute(input) {
      const sourceFiles = loadOpenScripturesSourceFiles(paths);
      return buildOpenScripturesBdbOutput(input, sourceFiles).output;
    },
  });
}

function parseArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function runCli() {
  const inputPath = parseArg('--input=');
  if (!inputPath) throw new Error('OpenScriptures adapter requires --input=<json>');
  const input = JSON.parse(fs.readFileSync(path.resolve(ROOT, inputPath), 'utf8'));
  const sourceFiles = loadOpenScripturesSourceFiles({ bdbPath: parseArg('--bdb=') || DEFAULT_BDB_PATH, indexPath: parseArg('--index=') || DEFAULT_INDEX_PATH });
  const { output } = buildOpenScripturesBdbOutput(input, sourceFiles);
  const writeTarget = parseArg('--write=');
  if (writeTarget) {
    const outputPath = path.resolve(ROOT, writeTarget);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`✓ OpenScriptures BDB adapter wrote ${path.relative(ROOT, outputPath)} · nodes=${output.summary.nodeCount}`);
    return;
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) runCli();
