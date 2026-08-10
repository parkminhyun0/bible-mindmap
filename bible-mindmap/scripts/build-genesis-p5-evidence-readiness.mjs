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
const DEFAULT_TAHOT = resolve(APP_ROOT, '.cache/lexicon/stepbible/TAHOT-Gen-Deu.txt')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/genesis-p5-evidence-readiness.json')
const GOLDEN_CONTROL = 'H776'

export const TAHOT_SOURCE = Object.freeze({
  sourceId: 'stepbible-tahot',
  commit: 'b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39',
  aggregateFingerprint: 'sha256:a3c81bbb9b88effe0b2712c60527ec8ac54f2dee856950aa05a616f42d7f75bf',
  genesisDatasetPath: 'Translators Amalgamated OT+NT/TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
})

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

function sha256Text(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function sourceGateSnapshot(source, expected) {
  const checks = {
    registered: Boolean(source),
    licenseApproved: source?.license?.status === 'approved',
    workflowReady: source?.workflow?.status === 'approved-ready',
    autoProcessingAllowed: source?.workflow?.autoProcessingAllowed === true,
    derivativeAllowed: source?.license?.derivativeAllowed === true,
    externalLlmInputAllowed: source?.license?.externalLlmInputAllowed === true,
    fullTextStorageAllowed: source?.license?.fullTextStorageAllowed === true,
    fingerprintPinned: source?.provenance?.contentHash === expected.aggregateFingerprint,
    commitPinned: source?.provenance?.version === expected.commit,
  }
  if (expected.datasetPath) {
    checks.datasetPinned = Array.isArray(source?.provenance?.datasetPaths)
      && source.provenance.datasetPaths.includes(expected.datasetPath)
  }
  return { ...checks, passed: Object.values(checks).every(Boolean) }
}

function normalizeTahotStrong(raw) {
  const match = String(raw || '').match(/^H0*(\d{1,5})([A-Z]?)$/)
  if (!match) return null
  const number = Number.parseInt(match[1], 10)
  if (!Number.isFinite(number) || number <= 0) return null
  return {
    baseStrong: `H${number}`,
    tahotStrong: `H${number}${match[2] || ''}`,
    openScripturesStrong: `H${number}${(match[2] || '').toLowerCase()}`,
    suffix: match[2] || '',
  }
}

export function parseGenesisTahotExtendedMap(text) {
  const byBase = new Map()
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    if (!rawLine.startsWith('Gen.')) continue
    const fields = rawLine.split('\t')
    if (fields.length < 6) continue
    const reference = fields[0].split('=')[0]
    const dStrongs = fields[4] || ''
    const rootMatches = [...dStrongs.matchAll(/\{(H0*\d{1,5}[A-Z]?)\}/g)]
    for (const rootMatch of rootMatches) {
      const normalized = normalizeTahotStrong(rootMatch[1])
      if (!normalized) continue
      if (!byBase.has(normalized.baseStrong)) byBase.set(normalized.baseStrong, new Map())
      const variants = byBase.get(normalized.baseStrong)
      if (!variants.has(normalized.tahotStrong)) {
        variants.set(normalized.tahotStrong, {
          tahotStrong: normalized.tahotStrong,
          openScripturesStrong: normalized.openScripturesStrong,
          suffix: normalized.suffix,
          occurrences: 0,
          references: [],
          sample: null,
        })
      }
      const variant = variants.get(normalized.tahotStrong)
      variant.occurrences += 1
      if (variant.references.length < 12 && !variant.references.includes(reference)) variant.references.push(reference)
      if (!variant.sample) {
        variant.sample = {
          reference,
          hebrew: fields[1] || '',
          transliteration: fields[2] || '',
          translationEn: fields[3] || '',
          dStrongs,
          grammar: fields[5] || '',
          expandedStrongTags: fields[11] || '',
        }
      }
    }
  }
  return byBase
}

function summarizeTahotVariants(variantMap) {
  return [...(variantMap?.values() || [])]
    .sort((left, right) => left.tahotStrong.localeCompare(right.tahotStrong, 'en'))
    .map((variant) => ({
      tahotStrong: variant.tahotStrong,
      openScripturesStrong: variant.openScripturesStrong,
      suffix: variant.suffix,
      occurrences: variant.occurrences,
      references: variant.references,
      sample: variant.sample,
    }))
}

function buildReadinessInput(item, sourceStrong, mapping, unitIndex) {
  const input = {
    schemaVersion: 1,
    requestId: `P5-${item.strong}-${sourceStrong}-U${unitIndex + 1}-READINESS`,
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
      canonicalStrong: sourceStrong,
      lemmaNormalized: normalizeHebrewLemma(mapping.lemma),
    },
    options: {
      preserveHierarchy: true,
      preserveOrder: true,
      emitSourceText: true,
      allowTranslationSnapshot: false,
    },
    goldenReference: item.strong === GOLDEN_CONTROL && sourceStrong === GOLDEN_CONTROL
      ? { referenceCase: 'GEN-1-1-H776', expectedNodeCount: 26, expectedMaxDepth: 3 }
      : null,
    inputFingerprint: '',
  }
  input.inputFingerprint = fingerprint(input, 'inputFingerprint')
  return input
}

function resolveSourceUnits(item, sourceFiles, tahotVariantsByBase) {
  try {
    const mapping = resolveLexicalIndexRecord(sourceFiles.indexXml, item.strong)
    return {
      mode: 'direct-base',
      tahotVariants: summarizeTahotVariants(tahotVariantsByBase.get(item.strong)),
      units: [{ sourceStrong: item.strong, mapping, tahotVariant: null }],
    }
  } catch (error) {
    if (!String(error?.message || '').includes('LexicalIndex Strong') || !String(error?.message || '').includes('not found')) throw error
    const tahotVariants = summarizeTahotVariants(tahotVariantsByBase.get(item.strong))
    if (!tahotVariants.length) throw new Error(`${item.strong}: no Genesis TAHOT Extended Strong mapping`)
    const units = tahotVariants.map((variant) => {
      if (!variant.suffix) throw new Error(`${item.strong}: base mapping failed but TAHOT variant ${variant.tahotStrong} has no suffix`)
      let mapping
      try {
        mapping = resolveLexicalIndexRecord(sourceFiles.indexXml, variant.openScripturesStrong)
      } catch (mappingError) {
        throw new Error(`${item.strong}: TAHOT ${variant.tahotStrong} → ${variant.openScripturesStrong} unresolved: ${mappingError.message}`)
      }
      return { sourceStrong: variant.openScripturesStrong, mapping, tahotVariant: variant }
    })
    return { mode: 'tahot-extended', tahotVariants, units }
  }
}

function inspectSourceUnit(item, sourceUnit, unitIndex) {
  const { sourceStrong, mapping, tahotVariant } = sourceUnit
  const input = buildReadinessInput(item, sourceStrong, mapping, unitIndex)
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
    sourceStrong,
    readinessStatus: sourceTreeReady ? 'ready' : 'blocked',
    tahotContext: tahotVariant,
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
}

function inspectGoldItem(item, sourceFiles, tahotVariantsByBase) {
  const base = {
    strong: item.strong,
    group: item.group,
    role: item.strong === GOLDEN_CONTROL ? 'golden-regression-control' : 'candidate-target',
    genesisContext: {
      firstReference: item.firstReference,
      sampleSurface: item.sampleSurface,
      occurrences: item.occurrences,
      chapterCount: item.chapterCount,
    },
  }
  try {
    const resolution = resolveSourceUnits(item, sourceFiles, tahotVariantsByBase)
    const sourceUnits = resolution.units.map((unit, index) => inspectSourceUnit(item, unit, index))
    const ready = sourceUnits.every((unit) => unit.readinessStatus === 'ready')
    return {
      ...base,
      readinessStatus: ready ? 'ready' : 'blocked',
      resolution: {
        mode: resolution.mode,
        tahotVariants: resolution.tahotVariants,
        sourceUnitCount: sourceUnits.length,
      },
      sourceUnits,
      sourceTree: {
        unitCount: sourceUnits.length,
        nodeCount: sourceUnits.reduce((sum, unit) => sum + (unit.sourceTree?.nodeCount || 0), 0),
        allSourceTextPresent: sourceUnits.every((unit) => unit.sourceTree?.allSourceTextPresent === true),
        translationSnapshotsPresent: sourceUnits.some((unit) => unit.sourceTree?.translationSnapshotsPresent === true),
      },
      blocker: ready ? null : 'SOURCE_TREE_READINESS_FAILED',
    }
  } catch (error) {
    return {
      ...base,
      readinessStatus: 'blocked',
      resolution: null,
      sourceUnits: [],
      sourceTree: null,
      blocker: `SOURCE_RESOLUTION_ERROR:${error.message}`,
    }
  }
}

export function buildGenesisP5EvidenceReadiness({ gold, sourceRegistry, approvalRegistry, sourceFiles, tahotText }) {
  if (gold?.setId !== 'genesis-p5-gold-25-v1' || gold?.items?.length !== 25) {
    throw new Error('Genesis P5 Gold 25 selection is required')
  }
  const bdbSource = sourceRegistry?.sources?.find((entry) => entry.sourceId === OPENSCRIPTURES_BDB_SOURCE.sourceId)
  const bdbGate = sourceGateSnapshot(bdbSource, {
    commit: OPENSCRIPTURES_BDB_SOURCE.commit,
    aggregateFingerprint: OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint,
  })
  if (!bdbGate.passed) throw new Error('OpenScriptures BDB source Gate is not fully ready')

  const tahotSource = sourceRegistry?.sources?.find((entry) => entry.sourceId === TAHOT_SOURCE.sourceId)
  const tahotGate = sourceGateSnapshot(tahotSource, {
    commit: TAHOT_SOURCE.commit,
    aggregateFingerprint: TAHOT_SOURCE.aggregateFingerprint,
    datasetPath: TAHOT_SOURCE.genesisDatasetPath,
  })
  if (!tahotGate.passed) throw new Error('STEPBible TAHOT source Gate is not fully ready')
  if (!String(tahotText || '').includes('Translators Amalgamated Hebrew OT tagged with disambiguated Strongs')) {
    throw new Error('TAHOT Genesis source header missing')
  }

  const approvedH776 = approvalRegistry?.entries?.find((entry) => entry?.identity?.canonicalStrong === GOLDEN_CONTROL)
  if (approvedH776?.approvedSenseTree?.length !== 26) {
    throw new Error(`H776 approved regression must remain 26/26; found ${approvedH776?.approvedSenseTree?.length || 0}`)
  }

  const tahotVariantsByBase = parseGenesisTahotExtendedMap(tahotText)
  const items = gold.items.map((item) => inspectGoldItem(item, sourceFiles, tahotVariantsByBase))
  const ready = items.filter((item) => item.readinessStatus === 'ready').length
  const blocked = items.length - ready
  const candidateTargets = items.filter((item) => item.role === 'candidate-target')
  const candidateTargetsReady = candidateTargets.filter((item) => item.readinessStatus === 'ready').length
  const sourceUnits = items.flatMap((item) => item.sourceUnits)
  const candidateUnits = items.filter((item) => item.role === 'candidate-target').flatMap((item) => item.sourceUnits)
  const extendedResolvedItems = items.filter((item) => item.resolution?.mode === 'tahot-extended')
  const candidateGenerationEligible = bdbGate.passed
    && tahotGate.passed
    && ready === 25
    && candidateTargets.length === 24
    && candidateTargetsReady === 24
    && sourceUnits.every((unit) => unit.readinessStatus === 'ready')
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
      gate: bdbGate,
    },
    alignmentSource: {
      sourceId: TAHOT_SOURCE.sourceId,
      role: 'extended-strong-context-disambiguation-only',
      commit: TAHOT_SOURCE.commit,
      aggregateFingerprint: TAHOT_SOURCE.aggregateFingerprint,
      datasetPath: TAHOT_SOURCE.genesisDatasetPath,
      fetchedFileFingerprint: sha256Text(tahotText),
      gate: tahotGate,
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
      extendedStrongSuffixesPreserved: true,
      ambiguousBaseStrongAutoCollapseAllowed: false,
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
      sourceUnits: sourceUnits.length,
      candidateUnits: candidateUnits.length,
      extendedResolvedItems: extendedResolvedItems.length,
      sourceNodes: sourceUnits.reduce((sum, unit) => sum + (unit.sourceTree?.nodeCount || 0), 0),
    },
    extendedStrongResolution: extendedResolvedItems.map((item) => ({
      baseStrong: item.strong,
      resolvedStrongs: item.sourceUnits.map((unit) => unit.sourceStrong),
      tahotStrongs: item.resolution.tahotVariants.map((variant) => variant.tahotStrong),
      occurrenceCount: item.resolution.tahotVariants.reduce((sum, variant) => sum + variant.occurrences, 0),
    })),
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
    tahot: DEFAULT_TAHOT,
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
    else if (arg === '--tahot') args.tahot = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--tahot=')) args.tahot = resolve(process.cwd(), arg.slice(8))
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
  const tahotText = readFileSync(args.tahot, 'utf8')
  const result = buildGenesisP5EvidenceReadiness({ gold, sourceRegistry, approvalRegistry, sourceFiles, tahotText })
  if (args.stdout) {
    console.log(JSON.stringify(result, null, 2))
    return
  }
  mkdirSync(dirname(args.out), { recursive: true })
  writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`Genesis P5 Evidence readiness written: ${args.out}`)
  console.log(`  ready: ${result.counts.ready}/${result.counts.selected} · candidate targets: ${result.counts.candidateTargetsReady}/${result.counts.candidateTargets}`)
  console.log(`  source units: ${result.counts.sourceUnits} · extended-resolved base items: ${result.counts.extendedResolvedItems}`)
  console.log(`  candidate generation eligible: ${result.governance.candidateGenerationEligible} · allowed: ${result.governance.candidateGenerationAllowed}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
