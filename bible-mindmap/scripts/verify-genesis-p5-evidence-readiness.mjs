#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildGenesisP5EvidenceReadiness } from './build-genesis-p5-evidence-readiness.mjs'
import { OPENSCRIPTURES_BDB_SOURCE, loadOpenScripturesSourceFiles } from './build-openscriptures-bdb-adapter.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const DEFAULT_GOLD = resolve(APP_ROOT, 'reports/genesis-p5-gold-set.json')
const DEFAULT_READINESS = resolve(APP_ROOT, 'reports/genesis-p5-evidence-readiness.json')
const DEFAULT_SOURCE_REGISTRY = resolve(APP_ROOT, 'data/lexicon/source-registry.json')
const DEFAULT_APPROVAL_REGISTRY = resolve(APP_ROOT, 'data/lexicon/approval-registry.json')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function parseArgs(argv) {
  const args = {
    gold: DEFAULT_GOLD,
    readiness: DEFAULT_READINESS,
    sourceRegistry: DEFAULT_SOURCE_REGISTRY,
    approvalRegistry: DEFAULT_APPROVAL_REGISTRY,
    strict: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--strict') args.strict = true
    else if (arg === '--gold') args.gold = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--gold=')) args.gold = resolve(process.cwd(), arg.slice(7))
    else if (arg === '--readiness') args.readiness = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--readiness=')) args.readiness = resolve(process.cwd(), arg.slice(12))
    else if (arg === '--source-registry') args.sourceRegistry = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--source-registry=')) args.sourceRegistry = resolve(process.cwd(), arg.slice(18))
    else if (arg === '--approval-registry') args.approvalRegistry = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--approval-registry=')) args.approvalRegistry = resolve(process.cwd(), arg.slice(20))
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function assertNoGeneratedTranslationPayload(value, path = 'root') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoGeneratedTranslationPayload(entry, `${path}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return
  const forbidden = new Set([
    'translationKo',
    'glossKo',
    'definitionKo',
    'candidateKo',
    'recommendedGlossKo',
    'approvedSenseTree',
  ])
  for (const [key, entry] of Object.entries(value)) {
    assert.equal(forbidden.has(key), false, `${path}.${key}: generated/approved Korean payload is forbidden in readiness bundle`)
    assertNoGeneratedTranslationPayload(entry, `${path}.${key}`)
  }
}

function verifyReadiness(readiness, gold, sourceRegistry, approvalRegistry, sourceFiles) {
  const rebuilt = buildGenesisP5EvidenceReadiness({ gold, sourceRegistry, approvalRegistry, sourceFiles })
  assert.deepEqual(readiness, rebuilt, 'Evidence readiness output must equal deterministic rebuild')
  assert.equal(readiness.schemaVersion, 1)
  assert.equal(readiness.bundleId, 'genesis-p5-gold-25-evidence-readiness-v1')
  assert.equal(readiness.book, 'GEN')
  assert.equal(readiness.goldSetId, 'genesis-p5-gold-25-v1')
  assert.equal(readiness.goldSetFingerprint, gold.setFingerprint)
  assert.match(readiness.bundleFingerprint, /^sha256:[0-9a-f]{64}$/)

  assert.equal(readiness.source.sourceId, OPENSCRIPTURES_BDB_SOURCE.sourceId)
  assert.equal(readiness.source.commit, OPENSCRIPTURES_BDB_SOURCE.commit)
  assert.equal(readiness.source.aggregateFingerprint, OPENSCRIPTURES_BDB_SOURCE.aggregateFingerprint)
  assert.equal(readiness.source.gate.passed, true)
  for (const [name, passed] of Object.entries(readiness.source.gate)) {
    assert.equal(passed, true, `source Gate must pass: ${name}`)
  }

  assert.equal(readiness.h776Regression.strong, 'H776')
  assert.equal(readiness.h776Regression.approvedSenseCount, 26)
  assert.equal(readiness.h776Regression.retranslationTarget, false)
  assert.match(readiness.h776Regression.evidencePacketFingerprint, /^sha256:[0-9a-f]{64}$/)

  assert.equal(readiness.counts.selected, 25)
  assert.equal(readiness.counts.ready, 25)
  assert.equal(readiness.counts.blocked, 0)
  assert.equal(readiness.counts.candidateTargets, 24)
  assert.equal(readiness.counts.candidateTargetsReady, 24)
  assert.equal(readiness.counts.goldenControls, 1)
  assert.ok(readiness.counts.sourceNodes >= 25)
  assert.equal(readiness.items.length, 25)
  assert.deepEqual(readiness.items.map((item) => item.strong), gold.items.map((item) => item.strong), 'readiness Strong order must equal Gold selection')
  assert.equal(new Set(readiness.items.map((item) => item.strong)).size, 25)

  for (const item of readiness.items) {
    assert.equal(item.readinessStatus, 'ready', `${item.strong}: source readiness must pass`)
    assert.equal(item.blocker, null, `${item.strong}: blocker must be null`)
    assert.ok(item.lexicalIdentity?.lexicalEntryId, `${item.strong}: lexicalEntryId required`)
    assert.ok(item.lexicalIdentity?.bdbEntryId, `${item.strong}: bdbEntryId required`)
    assert.ok(item.lexicalIdentity?.lemma, `${item.strong}: lemma required`)
    assert.ok(item.sourceTree?.nodeCount > 0, `${item.strong}: source nodes required`)
    assert.equal(item.sourceTree?.rootCount, 1, `${item.strong}: exactly one BDB root required`)
    assert.equal(item.sourceTree?.allSourceTextPresent, true, `${item.strong}: every source node needs source text`)
    assert.equal(item.sourceTree?.translationSnapshotsPresent, false, `${item.strong}: translation snapshots forbidden`)
    assert.match(item.sourceTree?.outputFingerprint || '', /^sha256:[0-9a-f]{64}$/)
    assert.equal(item.sourceDriver?.selectedAdapterId, 'openscriptures-bdb-xml-v1')
    assert.equal(item.sourceDriver?.executionAllowed, true)
    assert.equal(item.sourceDriver?.candidateGenerationAllowed, false)
    assert.deepEqual(item.sourceDriver?.blockerCodes, [])
    assert.match(item.sourceDriver?.reportFingerprint || '', /^sha256:[0-9a-f]{64}$/)
    assert.match(item.genesisContext?.firstReference || '', /^Gen\.\d+\.\d+$/)
    assert.ok(item.genesisContext?.sampleSurface, `${item.strong}: Genesis surface context required`)
    if (item.strong === 'H776') assert.equal(item.role, 'golden-regression-control')
    else assert.equal(item.role, 'candidate-target')
  }

  assert.equal(readiness.governance.sourceReadinessOnly, true)
  assert.equal(readiness.governance.translationStarted, false)
  assert.equal(readiness.governance.candidateGenerationEligible, true)
  for (const gate of [
    'candidateGenerationAllowed',
    'approvalRegistryWriteAllowed',
    'serviceUiWriteAllowed',
    'productionWriteAllowed',
    'existingApprovedMeaningMutationAllowed',
  ]) {
    assert.equal(readiness.governance[gate], false, `${gate} must remain false before the audited phase-transition PR`)
  }
  assert.equal(readiness.governance.phaseTransitionRequiresIndependentReview, true)
  assertNoGeneratedTranslationPayload(readiness)
  return rebuilt
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const gold = readJson(args.gold)
  const readiness = readJson(args.readiness)
  const sourceRegistry = readJson(args.sourceRegistry)
  const approvalRegistry = readJson(args.approvalRegistry)
  const sourceFiles = loadOpenScripturesSourceFiles()
  verifyReadiness(readiness, gold, sourceRegistry, approvalRegistry, sourceFiles)
  console.log('✓ Genesis P5 Evidence readiness contract PASS')
  console.log(`  source trees: ${readiness.counts.ready}/${readiness.counts.selected} · candidate targets ready: ${readiness.counts.candidateTargetsReady}/${readiness.counts.candidateTargets}`)
  console.log('  candidate generation eligible=true · allowed=false · Registry/UI/production write=false')
  if (args.strict && readiness.counts.blocked !== 0) throw new Error(`strict: ${readiness.counts.blocked} Gold items blocked`)
}

main()
