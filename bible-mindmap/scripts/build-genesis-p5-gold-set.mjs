#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODULE_PATH = fileURLToPath(import.meta.url)
const __dirname = dirname(MODULE_PATH)
const APP_ROOT = resolve(__dirname, '..')
const DEFAULT_INVENTORY = resolve(APP_ROOT, 'reports/genesis-strong-inventory.json')
const DEFAULT_REGISTRY = resolve(APP_ROOT, 'data/lexicon/approval-registry.json')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/genesis-p5-gold-set.json')

export const GOLD_SIZE = 25
export const GOLDEN_CONTROL = 'H776'
export const GROUP_QUOTAS = Object.freeze({ 'golden-control': 1, 'core-theology-context': 9, 'high-frequency-general': 5, 'medium-frequency-general': 5, 'low-frequency-general': 5 })
export const CORE_STRONGS = Object.freeze([
  'H430', 'H776', 'H8064', 'H1254', 'H216', 'H2822', 'H3117', 'H4325', 'H7307', 'H120',
  'H127', 'H6754', 'H1823', 'H5315', 'H2416', 'H2896', 'H7451', 'H6086', 'H2233', 'H1285',
  'H2617', 'H6662', 'H6666', 'H539', 'H3068', 'H410', 'H8034', 'H1818', 'H5117', 'H3519',
  'H4191', 'H2421', 'H3205', 'H1121', 'H1', 'H802', 'H376', 'H517', 'H3722', 'H7965',
  'H571', 'H4941', 'H4150', 'H4397', 'H5030', 'H3548', 'H3478', 'H3290', 'H85', 'H12',
])

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
function sha256(value) { return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}` }
function goldenApprovalRegistryFingerprint(approvalRegistry) {
  assert.equal(approvalRegistry?.schemaVersion, 1, 'Approval Registry schemaVersion must remain 1')
  const goldenEntries = (approvalRegistry.entries || []).filter((entry) => entry?.identity?.canonicalStrong === GOLDEN_CONTROL)
  assert.equal(goldenEntries.length, 1, 'Gold baseline requires exactly one H776 golden control')
  return sha256({ schemaVersion: 1, entries: goldenEntries })
}
function strongNumber(strong) { const match = String(strong || '').match(/^H(\d+)$/); return match ? Number.parseInt(match[1], 10) : Number.POSITIVE_INFINITY }
function compareStrong(a, b) { return strongNumber(a.strong || a) - strongNumber(b.strong || b) }
function compareFrequencyDesc(a, b) { return b.occurrences - a.occurrences || compareStrong(a, b) }
function compareFrequencyAsc(a, b) { return a.occurrences - b.occurrences || compareStrong(a, b) }
function summarizeEntry(entry, group, rank) { return { strong: entry.strong, group, rank, occurrences: entry.occurrences, chapterCount: entry.chapters.length, firstReference: entry.firstReference, sampleLemma: entry.sampleLemma, sampleSurface: entry.sampleSurface, legacyCoverage: entry.coverage } }
function takeOrThrow(items, count, label) { if (items.length < count) throw new Error(`${label}: need ${count}, found ${items.length}`); return items.slice(0, count) }

export function buildGenesisP5GoldSet(inventory, approvalRegistry) {
  assert.equal(inventory?.schemaVersion, 1, 'Genesis inventory schemaVersion must be 1')
  assert.ok(Array.isArray(inventory?.entries) && inventory.entries.length, 'Genesis inventory entries required')
  assert.ok(Array.isArray(approvalRegistry?.entries), 'Approval Registry entries required')
  const byStrong = new Map(inventory.entries.map((entry) => [entry.strong, entry]))
  const h776 = byStrong.get(GOLDEN_CONTROL)
  if (!h776) throw new Error('GEN-1-1-H776 must exist in Genesis inventory')
  const approvedH776 = approvalRegistry.entries.find((entry) => entry?.identity?.canonicalStrong === GOLDEN_CONTROL)
  if (!approvedH776) throw new Error('GEN-1-1-H776 must exist in Approval Registry')
  if (approvedH776.approvedSenseTree?.length !== 26) throw new Error(`GEN-1-1-H776 must preserve 26 approved senses; found ${approvedH776.approvedSenseTree?.length || 0}`)

  const selected = [summarizeEntry(h776, 'golden-control', 1)]
  const selectedStrong = new Set([GOLDEN_CONTROL])
  const coreSet = new Set(CORE_STRONGS)
  const corePool = CORE_STRONGS.filter((strong) => strong !== GOLDEN_CONTROL && byStrong.has(strong)).map((strong) => byStrong.get(strong))
  const core = takeOrThrow(corePool, GROUP_QUOTAS['core-theology-context'], 'core-theology-context')
  for (const [index, entry] of core.entries()) { selected.push(summarizeEntry(entry, 'core-theology-context', index + 1)); selectedStrong.add(entry.strong) }
  const generalPool = inventory.entries.filter((entry) => !coreSet.has(entry.strong) && !selectedStrong.has(entry.strong))
  const high = takeOrThrow(generalPool.filter((entry) => entry.occurrences >= 20).sort(compareFrequencyDesc), GROUP_QUOTAS['high-frequency-general'], 'high-frequency-general')
  const medium = takeOrThrow(generalPool.filter((entry) => entry.occurrences >= 5 && entry.occurrences <= 19).sort(compareFrequencyDesc), GROUP_QUOTAS['medium-frequency-general'], 'medium-frequency-general')
  const low = takeOrThrow(generalPool.filter((entry) => entry.occurrences <= 4).sort(compareFrequencyAsc), GROUP_QUOTAS['low-frequency-general'], 'low-frequency-general')
  for (const [group, items] of [['high-frequency-general', high], ['medium-frequency-general', medium], ['low-frequency-general', low]]) {
    for (const [index, entry] of items.entries()) { selected.push(summarizeEntry(entry, group, index + 1)); selectedStrong.add(entry.strong) }
  }
  if (selected.length !== GOLD_SIZE || selectedStrong.size !== GOLD_SIZE) throw new Error(`Gold Set must contain ${GOLD_SIZE} unique Strong IDs; got ${selected.length}/${selectedStrong.size}`)

  const result = {
    schemaVersion: 1,
    setId: 'genesis-p5-gold-25-v1',
    book: 'GEN',
    goldenReference: 'GEN-1-1-H776',
    targetSize: GOLD_SIZE,
    selectionPolicy: { policyId: 'public-first-genesis-representative-v1', deterministic: true, quotas: GROUP_QUOTAS, frequencyBands: { high: 'occurrences >= 20', medium: '5 <= occurrences <= 19', low: 'occurrences <= 4' }, generalGroupsExcludeCuratedCoreList: true },
    sourceEvidence: {
      inventoryFingerprint: sha256(inventory),
      approvalRegistryFingerprint: goldenApprovalRegistryFingerprint(approvalRegistry),
      h776ApprovedSenseCount: approvedH776.approvedSenseTree.length,
      h776EvidencePacketFingerprint: approvedH776.evidencePacketFingerprint,
    },
    governance: { selectionOnly: true, candidateGenerationAllowed: false, approvalRegistryWriteAllowed: false, serviceUiWriteAllowed: false, productionWriteAllowed: false, existingApprovedMeaningMutationAllowed: false, phaseTransitionEffectiveOnlyAfterIndependentReview: true },
    counts: { selected: selected.length, groups: Object.fromEntries(Object.keys(GROUP_QUOTAS).map((group) => [group, selected.filter((item) => item.group === group).length])) },
    items: selected,
  }
  return { ...result, setFingerprint: sha256(result) }
}

function parseArgs(argv) {
  const args = { inventory: DEFAULT_INVENTORY, registry: DEFAULT_REGISTRY, out: DEFAULT_OUTPUT, selfTest: false, stdout: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--stdout') args.stdout = true
    else if (arg === '--inventory') args.inventory = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--inventory=')) args.inventory = resolve(process.cwd(), arg.slice(12))
    else if (arg === '--registry') args.registry = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--registry=')) args.registry = resolve(process.cwd(), arg.slice(11))
    else if (arg === '--out') args.out = resolve(process.cwd(), argv[++index])
    else if (arg.startsWith('--out=')) args.out = resolve(process.cwd(), arg.slice(6))
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}
function selfTest() {
  const make = (strong, occurrences) => ({ strong, occurrences, chapters: [1], firstReference: 'Gen.1.1', sampleLemma: strong, sampleSurface: strong, coverage: 'missing' })
  const core = CORE_STRONGS.map((strong, index) => make(strong, 30 - (index % 10)))
  const general = []
  for (let index = 0; index < 10; index += 1) general.push(make(`H${9000 + index}`, 50 - index))
  for (let index = 0; index < 10; index += 1) general.push(make(`H${9100 + index}`, 15 - index))
  for (let index = 0; index < 10; index += 1) general.push(make(`H${9200 + index}`, 1 + (index % 4)))
  const inventory = { schemaVersion: 1, entries: [...core, ...general] }
  const registry = { schemaVersion: 1, registryFingerprint: 'sha256:self-test', entries: [{ identity: { canonicalStrong: 'H776' }, approvedSenseTree: Array.from({ length: 26 }, (_, index) => ({ id: String(index + 1) })), evidencePacketFingerprint: 'sha256:h776' }] }
  const result = buildGenesisP5GoldSet(inventory, registry)
  assert.equal(result.items.length, GOLD_SIZE); assert.equal(new Set(result.items.map((item) => item.strong)).size, GOLD_SIZE); assert.equal(result.items[0].strong, GOLDEN_CONTROL); assert.deepEqual(result.counts.groups, GROUP_QUOTAS); assert.equal(result.governance.candidateGenerationAllowed, false)
  console.log('✓ Genesis P5 Gold 25 selector self-test passed')
}
function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return selfTest()
  const inventory = JSON.parse(readFileSync(args.inventory, 'utf8')); const registry = JSON.parse(readFileSync(args.registry, 'utf8'))
  const result = buildGenesisP5GoldSet(inventory, registry)
  if (args.stdout) return console.log(JSON.stringify(result, null, 2))
  mkdirSync(dirname(args.out), { recursive: true }); writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`Genesis P5 Gold Set written: ${args.out}`); console.log(`  selected: ${result.counts.selected}`); console.log(`  H776 approved senses: ${result.sourceEvidence.h776ApprovedSenseCount}`); console.log(`  candidate generation: ${result.governance.candidateGenerationAllowed}`)
}
if (process.argv[1] && resolve(process.argv[1]) === MODULE_PATH) main()
