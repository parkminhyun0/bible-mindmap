#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fingerprint } from './build-h776-parser-adapter.mjs'
import {
  OPENSCRIPTURES_BDB_SOURCE,
  buildOpenScripturesBdbOutput,
  loadOpenScripturesSourceFiles,
  normalizeHebrewLemma,
  resolveLexicalIndexRecord,
} from './build-openscriptures-bdb-adapter.mjs'
import {
  TAHOT_SOURCE,
  buildGenesisP5EvidenceReadiness,
  parseGenesisTahotExtendedMap,
} from './build-genesis-p5-evidence-readiness.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(APP_ROOT, '..')
const PATHS = Object.freeze({
  gold: resolve(APP_ROOT, 'reports/genesis-p5-gold-set.json'),
  sourceRegistry: resolve(APP_ROOT, 'data/lexicon/source-registry.json'),
  approvalRegistry: resolve(APP_ROOT, 'data/lexicon/approval-registry.json'),
  policy: resolve(APP_ROOT, 'data/lexicon/source-driver-policy.json'),
  trackState: resolve(REPO_ROOT, 'docs/lexicon-workflow/TRACK_STATE.json'),
  tahot: resolve(APP_ROOT, '.cache/lexicon/stepbible/TAHOT-Gen-Deu.txt'),
  out: resolve(APP_ROOT, 'reports/genesis-p5-candidate-inputs.json'),
})
const GOLDEN_CONTROL = 'H776'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
const sha256 = (value) => `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`

function tahotVariants(variantMap) {
  return [...(variantMap?.values() || [])].sort((a, b) => a.tahotStrong.localeCompare(b.tahotStrong, 'en'))
}

function resolveUnits(item, sourceFiles, tahotByBase) {
  try {
    return {
      mode: 'direct-base',
      units: [{ sourceStrong: item.strong, mapping: resolveLexicalIndexRecord(sourceFiles.indexXml, item.strong), tahotVariant: null }],
    }
  } catch (error) {
    const message = String(error?.message || '')
    if (!message.includes('LexicalIndex Strong') || !message.includes('not found')) throw error
    const variants = tahotVariants(tahotByBase.get(item.strong))
    if (!variants.length) throw new Error(`${item.strong}: no Genesis TAHOT Extended Strong mapping`)
    return {
      mode: 'tahot-extended',
      units: variants.map((variant) => {
        if (!variant.suffix) throw new Error(`${item.strong}: unresolved base has suffixless TAHOT variant`)
        return {
          sourceStrong: variant.openScripturesStrong,
          mapping: resolveLexicalIndexRecord(sourceFiles.indexXml, variant.openScripturesStrong),
          tahotVariant: variant,
        }
      }),
    }
  }
}

function parserInput(item, sourceStrong, mapping, unitIndex) {
  const input = {
    schemaVersion: 1,
    requestId: `P5-${item.strong}-${sourceStrong}-U${unitIndex + 1}-GPT-SOURCE`,
    parser: { id: 'bdb-deterministic-tree-parser', version: '1.0.0', mode: 'source-parse' },
    processingMode: 'regression-only',
    source: {
      sourceId: OPENSCRIPTURES_BDB_SOURCE.sourceId,
      registryWorkflowStatus: 'approved-ready',
      usagePolicy: 'automatic-evidence',
      sourceFingerprint: OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint,
      locator: `${OPENSCRIPTURES_BDB_SOURCE.files.index.path}:${mapping.lexicalEntryId}`,
    },
    identity: { canonicalStrong: sourceStrong, lemmaNormalized: normalizeHebrewLemma(mapping.lemma) },
    options: { preserveHierarchy: true, preserveOrder: true, emitSourceText: true, allowTranslationSnapshot: false },
    goldenReference: null,
    inputFingerprint: '',
  }
  input.inputFingerprint = fingerprint(input, 'inputFingerprint')
  return input
}

function materializeUnit(item, resolution, unit, unitIndex, sourceFiles) {
  const { sourceStrong, mapping, tahotVariant } = unit
  const { output } = buildOpenScripturesBdbOutput(parserInput(item, sourceStrong, mapping, unitIndex), sourceFiles)
  assert.ok(output.nodes.length > 0, `${sourceStrong}: source nodes missing`)
  assert.ok(output.nodes.every((node) => node.translationSnapshotKo === null), `${sourceStrong}: translation snapshot leaked`)
  assert.ok(output.nodes.every((node) => String(node.sourceText || '').trim()), `${sourceStrong}: sourceText missing`)
  return {
    unitId: `GEN-P5-${item.strong}-${sourceStrong}`,
    baseStrong: item.strong,
    sourceStrong,
    group: item.group,
    rank: item.rank,
    genesisContext: {
      occurrences: item.occurrences,
      chapterCount: item.chapterCount,
      firstReference: item.firstReference,
      sampleLemma: item.sampleLemma,
      sampleSurface: item.sampleSurface,
    },
    resolution: { mode: resolution.mode, tahotVariant },
    lexicalIdentity: {
      lexicalEntryId: mapping.lexicalEntryId,
      bdbEntryId: mapping.bdbEntryId,
      lemma: mapping.lemma,
      lemmaNormalized: normalizeHebrewLemma(mapping.lemma),
      transliteration: mapping.transliteration,
      partOfSpeech: mapping.partOfSpeech,
      briefDefinition: mapping.briefDefinition,
      twot: mapping.twot,
    },
    source: {
      sourceId: OPENSCRIPTURES_BDB_SOURCE.sourceId,
      sourceCommit: OPENSCRIPTURES_BDB_SOURCE.commit,
      sourceFingerprint: OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint,
      parserOutputFingerprint: output.outputFingerprint,
      nodeCount: output.nodes.length,
      nodes: output.nodes.map((node) => ({
        sourceNodeId: node.id,
        parentId: node.parentId,
        depth: node.depth,
        order: node.order,
        sourceText: node.sourceText,
        sourceLocator: node.sourceLocator,
      })),
    },
    candidateContract: {
      status: 'awaiting-gpt-candidate',
      preserveSourceNodeIdsExactly: true,
      sourceNodeMutationAllowed: false,
      candidateOnly: true,
      approvalRegistryWriteAllowed: false,
      serviceUiWriteAllowed: false,
      productionWriteAllowed: false,
    },
  }
}

export function buildGenesisP5CandidateInputs({ gold, sourceRegistry, approvalRegistry, policy, trackState, sourceFiles, tahotText }) {
  const gate = trackState?.currentPhaseGate
  assert.equal(trackState?.activePhase, 'P5_GENESIS_CANDIDATE_GENERATION', 'P5 candidate phase is required')
  assert.equal(gate?.phase, 'P5_GENESIS_CANDIDATE_GENERATION', 'currentPhaseGate phase mismatch')
  assert.equal(gate?.candidateGenerationAllowed, true, 'TRACK_STATE candidate gate must be open')
  assert.equal(policy?.candidateGenerationEnabled, true, 'source-driver candidate policy must be open')
  assert.equal(gate?.serviceUiWriteAllowed, false, 'service/UI write must remain closed')
  assert.equal(trackState?.p5GenesisCandidateGeneration?.approvalRegistryWriteAllowed, false, 'Approval Registry write must remain closed')
  assert.equal(trackState?.p5GenesisCandidateGeneration?.productionWriteAllowed, false, 'production write must remain closed')

  const readiness = buildGenesisP5EvidenceReadiness({ gold, sourceRegistry, approvalRegistry, sourceFiles, tahotText })
  assert.equal(readiness.counts.ready, 25, 'Gold readiness must remain 25/25')
  assert.equal(readiness.counts.candidateTargetsReady, 24, 'candidate targets must remain 24/24')
  assert.equal(readiness.counts.candidateUnits, 27, 'candidate source units must remain 27')
  assert.equal(readiness.h776Regression?.approvedSenseCount, 26, 'H776 must remain 26/26')

  const tahotByBase = parseGenesisTahotExtendedMap(tahotText)
  const candidateItems = gold.items.filter((item) => item.strong !== GOLDEN_CONTROL)
  const units = candidateItems.flatMap((item) => {
    const resolution = resolveUnits(item, sourceFiles, tahotByBase)
    return resolution.units.map((unit, index) => materializeUnit(item, resolution, unit, index, sourceFiles))
  })
  assert.equal(candidateItems.length, 24, 'H776 must be the only excluded base item')
  assert.equal(units.length, 27, 'exactly 27 candidate source units are required')
  assert.equal(units.some((unit) => unit.baseStrong === GOLDEN_CONTROL || unit.sourceStrong === GOLDEN_CONTROL), false, 'H776 must never enter candidates')
  assert.equal(new Set(units.map((unit) => unit.unitId)).size, 27, 'candidate unit IDs must be unique')

  const result = {
    schemaVersion: 1,
    bundleId: 'genesis-p5-gpt-candidate-inputs-v1',
    book: 'GEN',
    phase: 'P5_GENESIS_CANDIDATE_GENERATION',
    goldenControlExcluded: GOLDEN_CONTROL,
    governance: {
      publicFirst: true,
      gptPrimaryCandidateGenerator: true,
      sourceOnly: true,
      translationStarted: false,
      candidateGenerationAllowed: true,
      sourceNodeMutationAllowed: false,
      approvalRegistryWriteAllowed: false,
      serviceUiWriteAllowed: false,
      productionWriteAllowed: false,
      existingApprovedMeaningMutationAllowed: false,
    },
    sourceEvidence: {
      openscriptures: { sourceId: OPENSCRIPTURES_BDB_SOURCE.sourceId, commit: OPENSCRIPTURES_BDB_SOURCE.commit, aggregateFingerprint: OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint },
      tahot: { sourceId: TAHOT_SOURCE.sourceId, commit: TAHOT_SOURCE.commit, aggregateFingerprint: TAHOT_SOURCE.aggregateFingerprint },
      goldSetFingerprint: gold.setFingerprint,
      approvalRegistryFingerprint: approvalRegistry.registryFingerprint,
    },
    counts: {
      goldBaseItems: 25,
      candidateBaseItems: 24,
      candidateUnits: 27,
      sourceNodes: units.reduce((sum, unit) => sum + unit.source.nodeCount, 0),
      extendedBaseItems: new Set(units.filter((unit) => unit.resolution.mode === 'tahot-extended').map((unit) => unit.baseStrong)).size,
    },
    units,
  }
  return { ...result, bundleFingerprint: sha256(result) }
}

function parseArgs(argv) {
  const args = { ...PATHS, stdout: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--stdout') args.stdout = true
    else if (arg === '--out') args.out = resolve(process.cwd(), argv[++i])
    else if (arg.startsWith('--out=')) args.out = resolve(process.cwd(), arg.slice(6))
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const result = buildGenesisP5CandidateInputs({
    gold: readJson(args.gold),
    sourceRegistry: readJson(args.sourceRegistry),
    approvalRegistry: readJson(args.approvalRegistry),
    policy: readJson(args.policy),
    trackState: readJson(args.trackState),
    sourceFiles: loadOpenScripturesSourceFiles(),
    tahotText: readFileSync(args.tahot, 'utf8'),
  })
  if (args.stdout) return process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  mkdirSync(dirname(args.out), { recursive: true })
  writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`✓ Genesis P5 GPT input bundle · base=24 · units=27 · nodes=${result.counts.sourceNodes}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
