#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const DEFAULT_LOCK = 'reports/luke-v4-greek-source-lock.json'
const DEFAULT_CANDIDATES = 'reports/luke-v4-first-10-candidate-prep.json'
const DEFAULT_OUTPUT = 'reports/luke-v4-first-10-tbesg-evidence.json'

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`)
  return createHash('sha1').update(Buffer.concat([header, buffer])).digest('hex')
}

function normalizeStrong(value) {
  const match = String(value).match(/^G0*(\d+)$/i)
  if (!match) throw new Error(`Invalid Greek Strong: ${value}`)
  return `G${String(Number(match[1])).padStart(4, '0')}`
}

export function parseTbesg(text, targets) {
  const wanted = new Set(targets.map(normalizeStrong))
  const found = new Map()
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.startsWith('G')) continue
    const cols = rawLine.split('\t')
    if (cols.length < 8) continue
    let strong
    try { strong = normalizeStrong(cols[0]) } catch { continue }
    if (!wanted.has(strong)) continue
    if (found.has(strong)) throw new Error(`Duplicate TBESG row for ${strong}`)
    found.set(strong, {
      strong,
      extendedStrong: cols[1] || null,
      unifiedStrong: cols[2] || null,
      greek: cols[3] || null,
      transliteration: cols[4] || null,
      morph: cols[5] || null,
      gloss: cols[6] || null,
      definitionHtml: cols.slice(7).join('\t') || null,
    })
  }
  const missing = [...wanted].filter((strong) => !found.has(strong))
  if (missing.length) throw new Error(`Missing TBESG rows: ${missing.join(', ')}`)
  return targets.map((strong) => found.get(normalizeStrong(strong)))
}

function args(argv) {
  const out = { lock: DEFAULT_LOCK, candidates: DEFAULT_CANDIDATES, tbesg: null, output: DEFAULT_OUTPUT, selfTest: false }
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i]
    if (value === '--self-test') out.selfTest = true
    else if (value === '--lock') out.lock = argv[++i]
    else if (value === '--candidates') out.candidates = argv[++i]
    else if (value === '--tbesg') out.tbesg = argv[++i]
    else if (value === '--output') out.output = argv[++i]
    else throw new Error(`Unknown argument: ${value}`)
  }
  return out
}

function selfTest() {
  const fixture = [
    'G0002\tG0002 = the Greek of\tH0175\tἈαρών\tAarōn\tN:N-M-P\tAaron\t<b>Ἀαρών</b>',
    'G0932\tG0932 =\tG0932\tβασιλεία\tbasileia\tG:N-F\tkingdom\t<b>βασιλεία</b>',
  ].join('\n')
  const rows = parseTbesg(fixture, ['G0002', 'G0932'])
  assert.equal(rows.length, 2)
  assert.equal(rows[0].greek, 'Ἀαρών')
  assert.equal(rows[1].gloss, 'kingdom')
  assert.equal(normalizeStrong('G2'), 'G0002')
  console.log('✓ Luke TBESG deterministic adapter self-test passed')
}

function main() {
  const opt = args(process.argv.slice(2))
  if (opt.selfTest) return selfTest()
  if (!opt.tbesg) throw new Error('--tbesg <pinned TBESG file> is required')

  const lock = JSON.parse(readFileSync(opt.lock, 'utf8'))
  const candidates = JSON.parse(readFileSync(opt.candidates, 'utf8'))
  const source = lock.stepBible.sources.find((item) => item.id === 'stepbible-tbesg')
  if (!source) throw new Error('Pinned stepbible-tbesg source lock missing')

  const buffer = readFileSync(opt.tbesg)
  assert.equal(buffer.length, source.bytes, 'TBESG byte length drift')
  assert.equal(gitBlobSha(buffer), source.blobSha, 'TBESG Git blob SHA drift')

  const targets = candidates.candidates.map((item) => item.strong)
  const rows = parseTbesg(buffer.toString('utf8'), targets)
  const result = {
    schemaVersion: 1,
    status: 'PINNED_TBESG_EVIDENCE_EXTRACTED',
    source: {
      repository: lock.stepBible.repository,
      commit: lock.stepBible.commit,
      blobSha: source.blobSha,
      bytes: source.bytes,
      license: lock.stepBible.license,
    },
    counts: { requested: targets.length, extracted: rows.length },
    rows,
    governance: {
      researchOnly: true,
      approvalRegistryWriteAllowed: false,
      productionWriteAllowed: false,
      existingApprovedMeaningMutationAllowed: false,
    },
    nextGate: 'LUKE_CONTEXT_AND_TFLSJ_SENSE_BOUNDARY_CROSSCHECK',
  }
  writeFileSync(opt.output, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`✓ Luke TBESG evidence extracted: ${rows.length}/${targets.length}`)
}

main()
