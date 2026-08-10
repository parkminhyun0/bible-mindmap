#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { fingerprint } from './build-h776-parser-adapter.mjs'
import {
  OPENSCRIPTURES_BDB_SOURCE,
  loadOpenScripturesSourceFiles,
  normalizeHebrewLemma,
  resolveLexicalIndexRecord,
} from './build-openscriptures-bdb-adapter.mjs'
import { runLexiconSourceDriver } from './lexicon-source-driver.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const DEFAULT_GOLD = resolve(APP_ROOT, 'reports/genesis-p5-gold-set.json')
const DEFAULT_SOURCE_REGISTRY = resolve(APP_ROOT, 'data/lexicon/source-registry.json')
const DEFAULT_APPROVAL_REGISTRY = resolve(APP_ROOT, 'data/lexicon/approval-registry.json')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/genesis-p5-evidence-readiness.json')
const GOLDEN_CONTROL = 'H776'

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function sourceGateSnapshot(source) {
  const checks = {
    registered: Boolean(source),
    licenseApproved: source?.license?.status === 'approved',
    workflowReady: source?.workflow?.status === 'approved-ready',
    autoProcessingAllowed: source?.workflow?.autoProcessingAllowed === true,
    derivativeAllowed: source?.license?.derivativeAllowed === true,
    externalLlmInputAllowed: source?.license?.externalLlmInputAllowed === true,
    fullTextStorageAllowed: source?.license?.fullTextStorageAllowed === true,
    fingerprintPinned: source?.provenance?.contentHash === OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint,
    commitPinned: source?.provenance?.version === OPENSCRIPTURES_BDB_SOURCE.commit,
  }
  return { ...checks, passed: Object.values(checks).every(Boolean) }
}

function buildReadinessInput(item, mapping) {
  const strongMatch = /^H([1-9][0-9]*)([a-z]?)$/.exec(item.strong)
  if (!strongMatch) throw new Error(`unsupported Gold Strong: ${item.strong}`)
  const input = {
    schemaVersion: 1,
    requestId: `P5-${item.strong}-READINESS`,
    parser: { id: 'bdb-deterministic-tree-parser', version: '1.0.0', mode: 'source-parse' },
    processingMode: 'regression-only',
    source: {
      sourceId: OPENSCRIPTURES_BDB_SOURCE.sourceId,
      registryWorkflowStatus: 'approved-ready',
      usagePolicy: 'automatic-evidence',
      sourceFingerprint: OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint,
      locator: `${OPENSCRIPTURES_BDB_SOURCE.files.index.path}:${mapping.lexicalEntryId}`,
    },
    identity: {
      canonicalStrong: item.strong,
      lemmaNormalized: normalizeHebrewLemma(mapping.lemma),
    },
    options: {
      preserveHierarchy: true,
      preserveOrder: true,
      emitSourceText: true,
      allowTranslationSnapshot: false,
    },
    goldenReference: item.strong === GOLDEN_CONTROL
      ? { referenceCase: 'GEN-1-1-H776', expectedNodeCount: 26, expectedMaxDepth: 3 }
      : null,
    inputFingerprint: '',
  }
  input.inputFingerprint = fingerprint(input, 'inputFingerprint')
  return input
}

function inspectGoldItem(item, sourceFiles) {
  try {
    const mapping = resolveLexicalIndexRecord(sourceFiles.indexXml, item.strong)
    const input = buildReadinessInput(item, mapping)
    const { report, output } = runLexiconSourceDriver(input, { operation: 'execute' })
    const sourceTreeReady = Boolean(
      report?.decision?.executionAllowed
      && output
      && output.summary?.rootCount === 1
      && output.summary?.nodeCount > 0
      && output.nodes?.every((node) => node.translationSnapshotKo === null)
      && output.nodes?.every((node) => typeof node.sourceText === 'string' && node.sourceText.length > 0)
      && output.nodes?.every((node) => typeof node.sourceLocator === 'string' && node.sourceLocator.length > 0)
    )
    return {
      strong: item.strong,
      group: item.group,
      role: item.strong === GOLDEN_CONTROL ? 'golden-regression-control' : 'candidate-target',
      readinessStatus: sourceTreeReady ? 'ready' : 'blocked',
      genesisContext: {
        firstReference: item.firstReference,
        sampleSurface: item.sampleSurface,
        occurrences: item.occurrences,
        chapterCount: item.chapterCount,
      },
      lexicalIdentity: {
        lexicalEntryId: mapping.lexicalEntryId,
        bdbEntryId: mapping.bdbEntryId,
        lemma: mapping.lemma,
        transliteration: mapping.transliteration,
        partOfSpeech: mapping.partOfSpeech,
        briefDefinition: mapping.briefDefinition,
        twot: mapping.twot,
      },
      sourceTree: output ? {
        rootCount: output.summary.rootCount,
        nodeCount: output.summary.nodeCount,
        maxDepth: output.summary.maxDepth,
        outputFingerprint: output.outputFingerprint,
        allSourceTextPresent: output.nodes.every((node) => typeof node.sourceText === 'string' && node.sourceText.length > 0),
        translationSnapshotsPresent: output.nodes.some((node) => node.translationSnapshotKo !== null),
      } : null,
      sourceDriver: {
        selectedAdapterId: report?.selectedAdapterId || null,
        executionAllowed: report?.decision?.executionAllowed === true,
        candidateGenerationAllowed: report?.decision?.candidateGenerationAllowed === true,
        blockerCodes: report?.decision?.blockerCodes || [],
        reportFingerprint: report?.reportFingerprint || null,
      },
      blocker: sourceTreeReady ? null : 'SOURCE_TREE_READINESS_FAILED',
    }
  } catch (error) {
    return {
      strong: item.strong,
      group: item.group,
      role: item.strong === GOLDEN_CONTROL ? 'golden-regression-control' : 'candidate-target',
      readinessStatus: 'blocked',
      genesisContext: {
        firstReference: item.firstReference,
        sampleSurface: item.sampleSurface,
        occurrences: item.occurrences,
        chapterCount: item.chapterCount,
      },
      lexicalIdentity: null,
      sourceTree: null,
      sourceDriver: {
        selectedAdapterId: null,
        executionAllowed: false,
        candidateGenerationAllowed: false,
        blockerCodes: [],
        reportFingerprint: null,
      },
      blocker: `SOURCE_PARSE_ERROR:${error.message}`,
    }
  }
}

export function buildGenesisP5EvidenceReadiness({ gold, sourceRegistry, approvalRegistry, sourceFiles }) {
  if (gold?.setId !== 'genesis-p5-gold-25-v1' || gold?.items?.length !== 25) {
    throw new Error('Genesis P5 Gold 25 selection is required')
  }
  const source = sourceRegistry?.sources?.find((entry) => entry.sourceId === OPENSCRIPTURES_BDB_SOURCE.sourceId)
  const sourceGate = sourceGateSnapshot(source)
  if (!sourceGate.passed) throw new Error('OpenScriptures BDB source Gate is not fully ready')

  const approvedH776 = approvalRegistry?.entries?.find((entry) => entry?.identity?.canonicalStrong === GOLDEN_CONTROL)
  if (approvedH776?.approvedSenseTree?.length !== 26) {
    throw new Error(`H776 approved regression must remain 26/26; found ${approvedH776?.approvedSenseTree?.length || 0}`)
  }

  const items = gold.items.map((item) => inspectGoldItem(item, sourceFiles))
  const ready = items.filter((item) => item.readinessStatus === 'ready').length
  const blocked = items.length - ready
  const candidateTargets = items.filter((item) => item.role === 'candidate-target')
  const candidateTargetsReady = candidateTargets.filter((item) => item.readinessStatus === 'ready').length
  const candidateGenerationEligible = sourceGate.passed
    && ready === 25
    && candidateTargets.length === 24
    && candidateTargetsReady === 24
    && approvedH776.approvedSenseTree.length === 26

  const result = {
    schemaVersion: 1,
    bundleId: 'genesis-p5-gold-25-evidence-readiness-v1',
    book: 'GEN',
    goldSetId: gold.setId,
    goldSetFingerprint: gold.setFingerprint,
    source: {
      sourceId: OPENSCRIPTURES_BDB_SOURCE.sourceId,
      commit: OPENSCRIPTURES_BDB_SOURCE.commit,
      aggregateFingerprint: OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint,
      files: sourceFiles.files,
      gate: sourceGate,
    },
    h776Regression: {
      strong: GOLDEN_CONTROL,
      approvedSenseCount: approvedH776.approvedSenseTree.length,
      evidencePacketFingerprint: approvedH776.evidencePacketFingerprint,
      retranslationTarget: false,
    },
    governance: {
      sourceReadinessOnly: true,
      translationStarted: false,
      candidateGenerationEligible,
      candidateGenerationAllowed: false,
      approvalRegistryWriteAllowed: false,
      serviceUiWriteAllowed: false,
      productionWriteAllowed: false,
      existingApprovedMeaningMutationAllowed: false,
      phaseTransitionRequiresIndependentReview: true,
    },
    counts: {
      selected: items.length,
      ready,
      blocked,
      candidateTargets: candidateTargets.length,
      candidateTargetsReady,
      goldenControls: items.filter((item) => item.role === 'golden-regression-control').length,
      sourceNodes: items.reduce((sum, item) => sum + (item.sourceTree?.nodeCount || 0), 0),
    },
    items,
    bundleFingerprint: '',
  }
  result.bundleFingerprint = sha256(result)
  return result
}

function parseArgs(argv) {
  const args = {
    gold: DEFAULT_GOLD,
    sourceRegistry: DEFAULT_SOURCE_REGISTRY,
    approvalRegistry: DEFAULT_APPROVAL_REGISTRY,
    out: DEFAULT_OUTPUT,
    stdout: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--stdout') args.stdout = true
    else if (arg === '--gold') args.gold = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--gold=')) args.gold = resolve(process.cwd(), arg.slice(7))
    else if (arg === '--source-registry') args.sourceRegistry = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--source-registry=')) args.sourceRegistry = resolve(process.cwd(), arg.slice(18))
    else if (arg === '--approval-registry') args.approvalRegistry = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--approval-registry=')) args.approvalRegistry = resolve(process.cwd(), arg.slice(20))
    else if (arg === '--out') args.out = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--out=')) args.out = resolve(process.cwd(), arg.slice(6))
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const gold = readJson(args.gold)
  const sourceRegistry = readJson(args.sourceRegistry)
  const approvalRegistry = readJson(args.approvalRegistry)
  const sourceFiles = loadOpenScripturesSourceFiles()
  const result = buildGenesisP5EvidenceReadiness({ gold, sourceRegistry, approvalRegistry, sourceFiles })
  if (args.stdout) {
    console.log(JSON.stringify(result, null, 2))
    return
  }
  mkdirSync(dirname(args.out), { recursive: true })
  writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`Genesis P5 Evidence readiness written: ${args.out}`)
  console.log(`  ready: ${result.counts.ready}/${result.counts.selected} · candidate targets: ${result.counts.candidateTargetsReady}/${result.counts.candidateTargets}`)
  console.log(`  candidate generation eligible: ${result.governance.candidateGenerationEligible} · allowed: ${result.governance.candidateGenerationAllowed}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
