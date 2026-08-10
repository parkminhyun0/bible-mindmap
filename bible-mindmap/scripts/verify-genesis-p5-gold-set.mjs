#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildGenesisP5GoldSet,
  CORE_STRONGS,
  GOLD_SIZE,
  GOLDEN_CONTROL,
  GROUP_QUOTAS,
} from './build-genesis-p5-gold-set.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const DEFAULT_INVENTORY = resolve(APP_ROOT, 'reports/genesis-strong-inventory.json')
const DEFAULT_REGISTRY = resolve(APP_ROOT, 'data/lexicon/approval-registry.json')
const DEFAULT_GOLD = resolve(APP_ROOT, 'reports/genesis-p5-gold-set.json')

function parseArgs(argv) {
  const args = { inventory: DEFAULT_INVENTORY, registry: DEFAULT_REGISTRY, gold: DEFAULT_GOLD, selfTest: false, strict: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--strict') args.strict = true
    else if (arg === '--inventory') args.inventory = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--inventory=')) args.inventory = resolve(process.cwd(), arg.slice(12))
    else if (arg === '--registry') args.registry = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--registry=')) args.registry = resolve(process.cwd(), arg.slice(11))
    else if (arg === '--gold') args.gold = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--gold=')) args.gold = resolve(process.cwd(), arg.slice(7))
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function assertNoGeneratedKoreanCandidate(item) {
  for (const forbidden of ['translationKo', 'glossKo', 'definitionKo', 'candidateKo', 'approvedSenseTree']) {
    assert.equal(Object.hasOwn(item, forbidden), false, `${item.strong} selection item must not contain ${forbidden}`)
  }
}

function verifyGold(gold, inventory, registry) {
  const rebuilt = buildGenesisP5GoldSet(inventory, registry)
  assert.deepEqual(gold, rebuilt, 'Gold Set output must equal deterministic rebuild')
  assert.equal(gold.schemaVersion, 1)
  assert.equal(gold.setId, 'genesis-p5-gold-25-v1')
  assert.equal(gold.book, 'GEN')
  assert.equal(gold.goldenReference, 'GEN-1-1-H776')
  assert.equal(gold.targetSize, GOLD_SIZE)
  assert.equal(gold.items.length, GOLD_SIZE)
  assert.equal(new Set(gold.items.map((item) => item.strong)).size, GOLD_SIZE, 'Strong IDs must be unique')
  assert.deepEqual(gold.counts.groups, GROUP_QUOTAS)

  const first = gold.items[0]
  assert.equal(first.strong, GOLDEN_CONTROL)
  assert.equal(first.group, 'golden-control')
  assert.equal(gold.sourceEvidence.h776ApprovedSenseCount, 26)
  assert.match(gold.sourceEvidence.h776EvidencePacketFingerprint, /^sha256:[0-9a-f]{64}$/)
  assert.match(gold.setFingerprint, /^sha256:[0-9a-f]{64}$/)

  const coreSet = new Set(CORE_STRONGS)
  for (const item of gold.items) {
    assert.match(item.strong, /^H[1-9]\d*$/)
    assert.ok(Number.isInteger(item.occurrences) && item.occurrences > 0)
    assert.ok(Number.isInteger(item.chapterCount) && item.chapterCount > 0)
    assert.match(item.firstReference, /^Gen\.\d+\.\d+$/)
    assertNoGeneratedKoreanCandidate(item)
    if (item.group === 'core-theology-context') assert.ok(coreSet.has(item.strong), `${item.strong} must belong to curated core list`)
    if (item.group === 'high-frequency-general') assert.ok(item.occurrences >= 20, `${item.strong} must satisfy high-frequency threshold`)
    if (item.group === 'medium-frequency-general') assert.ok(item.occurrences >= 5 && item.occurrences <= 19, `${item.strong} must satisfy medium-frequency threshold`)
    if (item.group === 'low-frequency-general') assert.ok(item.occurrences <= 4, `${item.strong} must satisfy low-frequency threshold`)
  }

  assert.equal(gold.selectionPolicy.deterministic, true)
  assert.equal(gold.governance.selectionOnly, true)
  for (const gate of [
    'candidateGenerationAllowed',
    'approvalRegistryWriteAllowed',
    'serviceUiWriteAllowed',
    'productionWriteAllowed',
    'existingApprovedMeaningMutationAllowed',
  ]) {
    assert.equal(gold.governance[gate], false, `${gate} must remain false in P5 selection contract`)
  }
  assert.equal(gold.governance.phaseTransitionEffectiveOnlyAfterIndependentReview, true)
  return rebuilt
}

function selfTest() {
  const make = (strong, occurrences) => ({ strong, occurrences, chapters: [1, 2], firstReference: 'Gen.1.1', sampleLemma: strong, sampleSurface: strong, coverage: 'missing' })
  const core = CORE_STRONGS.map((strong, index) => make(strong, 25 + (index % 5)))
  const general = [
    ...Array.from({ length: 10 }, (_, index) => make(`H${9300 + index}`, 40 - index)),
    ...Array.from({ length: 10 }, (_, index) => make(`H${9400 + index}`, 15 - index)),
    ...Array.from({ length: 10 }, (_, index) => make(`H${9500 + index}`, 1 + (index % 4))),
  ]
  const inventory = { schemaVersion: 1, entries: [...core, ...general] }
  const registry = {
    registryFingerprint: 'sha256:self-test',
    entries: [{
      identity: { canonicalStrong: GOLDEN_CONTROL },
      approvedSenseTree: Array.from({ length: 26 }, (_, index) => ({ id: `${index + 1}`, translationKo: 'fixture' })),
      evidencePacketFingerprint: `sha256:${'a'.repeat(64)}`,
    }],
  }
  const gold = buildGenesisP5GoldSet(inventory, registry)
  verifyGold(gold, inventory, registry)
  assert.throws(
    () => buildGenesisP5GoldSet(inventory, { ...registry, entries: [{ ...registry.entries[0], approvedSenseTree: registry.entries[0].approvedSenseTree.slice(0, 25) }] }),
    /26 approved senses/,
  )
  assert.throws(
    () => buildGenesisP5GoldSet({ ...inventory, entries: inventory.entries.filter((entry) => entry.strong !== GOLDEN_CONTROL) }, registry),
    /must exist in Genesis inventory/,
  )
  console.log('✓ Genesis P5 Gold 25 verifier self-test passed')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return selfTest()
  const inventory = readJson(args.inventory)
  const registry = readJson(args.registry)
  const gold = readJson(args.gold)
  verifyGold(gold, inventory, registry)
  console.log('✓ Genesis P5 Gold 25 contract PASS')
  console.log('  H776=26/26 · 25 unique Strong · theology + high/medium/low frequency coverage')
  console.log('  selection-only · candidate generation=false · Registry/UI/production write=false')
  if (args.strict && inventory.missingChapters?.length) {
    throw new Error(`strict: Genesis inventory missing chapters: ${inventory.missingChapters.join(', ')}`)
  }
}

main()
