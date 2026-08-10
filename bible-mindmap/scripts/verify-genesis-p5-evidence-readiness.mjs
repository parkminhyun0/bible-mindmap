#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildGenesisP5EvidenceReadiness, TAHOT_SOURCE } from './build-genesis-p5-evidence-readiness.mjs'
import { OPENSCRIPTURES_BDB_SOURCE, loadOpenScripturesSourceFiles } from './build-openscriptures-bdb-adapter.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const DEFAULT_GOLD = resolve(APP_ROOT, 'reports/genesis-p5-gold-set.json')
const DEFAULT_READINESS = resolve(APP_ROOT, 'reports/genesis-p5-evidence-readiness.json')
const DEFAULT_SOURCE_REGISTRY = resolve(APP_ROOT, 'data/lexicon/source-registry.json')
const DEFAULT_APPROVAL_REGISTRY = resolve(APP_ROOT, 'data/lexicon/approval-registry.json')
const DEFAULT_TAHOT = resolve(APP_ROOT, '.cache/lexicon/stepbible/TAHOT-Gen-Deu.txt')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function parseArgs(argv) {
  const args = {
    gold: DEFAULT_GOLD,
    readiness: DEFAULT_READINESS,
    sourceRegistry: DEFAULT_SOURCE_REGISTRY,
    approvalRegistry: DEFAULT_APPROVAL_REGISTRY,
    tahot: DEFAULT_TAHOT,
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
    else if (arg === '--tahot') args.tahot = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--tahot=')) args.tahot = resolve(process.cwd(), arg.slice(8))
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

function assertSourceGate(gate, label) {
  assert.equal(gate.passed, true, `${label} source Gate must pass`)
  for (const [name, passed] of Object.entries(gate)) {
    assert.equal(passed, true, `${label} source Gate must pass: ${name}`)
  }
}

function verifyExtendedResolution(readiness) {
  const actual = Object.fromEntries(
    readiness.extendedStrongResolution.map((entry) => [entry.baseStrong, entry.resolvedStrongs]),
  )
  assert.deepEqual(actual, {
    H834: ['H834a', 'H834b', 'H834c', 'H834d'],
    H1254: ['H1254a'],
    H6030: ['H6030b'],
  }, 'Genesis ambiguous base Strongs must preserve TAHOT context disambiguation')

  const h1254 = readiness.items.find((item) => item.strong === 'H1254')
  const h834 = readiness.items.find((item) => item.strong === 'H834')
  const h6030 = readiness.items.find((item) => item.strong === 'H6030')
  assert.equal(h1254?.resolution?.mode, 'tahot-extended')
  assert.deepEqual(h1254?.resolution?.tahotVariants.map((entry) => entry.tahotStrong), ['H1254A'])
  assert.equal(h834?.resolution?.mode, 'tahot-extended')
  assert.deepEqual(h834?.resolution?.tahotVariants.map((entry) => entry.tahotStrong), ['H834A', 'H834B', 'H834C', 'H834D'])
  assert.equal(h6030?.resolution?.mode, 'tahot-extended')
  assert.deepEqual(h6030?.resolution?.tahotVariants.map((entry) => entry.tahotStrong), ['H6030B'])
  for (const item of [h1254, h834, h6030]) {
    assert.ok(item.resolution.tahotVariants.every((entry) => entry.occurrences > 0), `${item.strong}: TAHOT context occurrences required`)
    assert.ok(item.resolution.tahotVariants.every((entry) => entry.references.every((ref) => /^Gen\.\d+\.\d+#\d+$/.test(ref))), `${item.strong}: Genesis TAHOT references required`)
  }
}

function verifyReadiness(readiness, gold, sourceRegistry, approvalRegistry, sourceFiles, tahotText) {
  const rebuilt = buildGenesisP5EvidenceReadiness({ gold, sourceRegistry, approvalRegistry, sourceFiles, tahotText })
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
  assertSourceGate(readiness.source.gate, 'OpenScriptures BDB')

  assert.equal(readiness.alignmentSource.sourceId, TAHOT_SOURCE.sourceId)
  assert.equal(readiness.alignmentSource.role, 'extended-strong-context-disambiguation-only')
  assert.equal(readiness.alignmentSource.commit, TAHOT_SOURCE.commit)
  assert.equal(readiness.alignmentSource.aggregateFingerprint, TAHOT_SOURCE.aggregateFingerprint)
  assert.equal(readiness.alignmentSource.datasetPath, TAHOT_SOURCE.genesisDatasetPath)
  assert.match(readiness.alignmentSource.fetchedFileFingerprint, /^sha256:[0-9a-f]{64}$/)
  assertSourceGate(readiness.alignmentSource.gate, 'STEPBible TAHOT')

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
  assert.equal(readiness.counts.extendedResolvedItems, 3)
  assert.equal(readiness.counts.sourceUnits, 28)
  assert.equal(readiness.counts.candidateUnits, 27)
  assert.ok(readiness.counts.sourceNodes >= 28)
  assert.equal(readiness.items.length, 25)
  assert.deepEqual(readiness.items.map((item) => item.strong), gold.items.map((item) => item.strong), 'readiness Strong order must equal Gold selection')
  assert.equal(new Set(readiness.items.map((item) => item.strong)).size, 25)
  verifyExtendedResolution(readiness)

  for (const item of readiness.items) {
    assert.equal(item.readinessStatus, 'ready', `${item.strong}: source readiness must pass`)
    assert.equal(item.blocker, null, `${item.strong}: blocker must be null`)
    assert.ok(item.sourceTree?.nodeCount > 0, `${item.strong}: source nodes required`)
    assert.equal(item.sourceTree?.allSourceTextPresent, true, `${item.strong}: every source node needs source text`)
    assert.equal(item.sourceTree?.translationSnapshotsPresent, false, `${item.strong}: translation snapshots forbidden`)
    assert.equal(item.resolution?.sourceUnitCount, item.sourceUnits.length, `${item.strong}: source unit count drift`)
    assert.ok(item.sourceUnits.length > 0, `${item.strong}: at least one source unit required`)
    assert.match(item.genesisContext?.firstReference || '', /^Gen\.\d+\.\d+$/)
    assert.ok(item.genesisContext?.sampleSurface, `${item.strong}: Genesis surface context required`)
    if (item.strong === 'H776') assert.equal(item.role, 'golden-regression-control')
    else assert.equal(item.role, 'candidate-target')

    for (const unit of item.sourceUnits) {
      assert.equal(unit.readinessStatus, 'ready', `${item.strong}/${unit.sourceStrong}: source unit must pass`)
      assert.equal(unit.blocker, null, `${item.strong}/${unit.sourceStrong}: unit blocker must be null`)
      assert.match(unit.sourceStrong, /^H[1-9][0-9]*[a-z]?$/)
      assert.ok(unit.lexicalIdentity?.lexicalEntryId, `${unit.sourceStrong}: lexicalEntryId required`)
      assert.ok(unit.lexicalIdentity?.bdbEntryId, `${unit.sourceStrong}: bdbEntryId required`)
      assert.ok(unit.lexicalIdentity?.lemma, `${unit.sourceStrong}: lemma required`)
      assert.equal(unit.sourceTree?.rootCount, 1, `${unit.sourceStrong}: exactly one BDB root required`)
      assert.ok(unit.sourceTree?.nodeCount > 0, `${unit.sourceStrong}: source nodes required`)
      assert.equal(unit.sourceTree?.allSourceTextPresent, true, `${unit.sourceStrong}: every source node needs source text`)
      assert.equal(unit.sourceTree?.translationSnapshotsPresent, false, `${unit.sourceStrong}: translation snapshots forbidden`)
      assert.match(unit.sourceTree?.outputFingerprint || '', /^sha256:[0-9a-f]{64}$/)
      assert.equal(unit.sourceDriver?.selectedAdapterId, 'openscriptures-bdb-xml-v1')
      assert.equal(unit.sourceDriver?.executionAllowed, true)
      assert.equal(unit.sourceDriver?.candidateGenerationAllowed, false)
      assert.deepEqual(unit.sourceDriver?.blockerCodes, [])
      assert.match(unit.sourceDriver?.reportFingerprint || '', /^sha256:[0-9a-f]{64}$/)
    }
  }

  assert.equal(readiness.governance.sourceReadinessOnly, true)
  assert.equal(readiness.governance.translationStarted, false)
  assert.equal(readiness.governance.extendedStrongSuffixesPreserved, true)
  assert.equal(readiness.governance.ambiguousBaseStrongAutoCollapseAllowed, false)
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
  const tahotText = readFileSync(args.tahot, 'utf8')
  verifyReadiness(readiness, gold, sourceRegistry, approvalRegistry, sourceFiles, tahotText)
  console.log('✓ Genesis P5 Evidence readiness contract PASS')
  console.log(`  base Gold: ${readiness.counts.ready}/${readiness.counts.selected} · source units: ${readiness.counts.sourceUnits} · candidate units: ${readiness.counts.candidateUnits}`)
  console.log('  Extended Strong: H1254→H1254a · H834→H834a/b/c/d · H6030→H6030b')
  console.log('  candidate generation eligible=true · allowed=false · Registry/UI/production write=false')
  if (args.strict && readiness.counts.blocked !== 0) throw new Error(`strict: ${readiness.counts.blocked} Gold items blocked`)
}

main()
