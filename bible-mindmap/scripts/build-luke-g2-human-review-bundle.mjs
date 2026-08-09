#!/usr/bin/env node

import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const DEFAULT_OUTPUT_DIR = 'reports/luke-g2-human-review-packets'

export const REQUIRED_REVIEW_INPUTS = Object.freeze([
  'data/lexicon/luke-g2-canary-preparation.json',
  'data/lexicon/luke-g2-execution-gate.json',
  'reports/luke-g2-zero-cost-execution/candidates',
  'reports/luke-g2-zero-cost-comparison.json',
])

function parseArgs(argv) {
  const args = { outputDir: DEFAULT_OUTPUT_DIR, selfTest: false }
  for (const arg of argv) {
    if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--output-dir=')) args.outputDir = arg.slice('--output-dir='.length)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function relativeReviewPath(source) {
  return source.startsWith('reports/') ? source.slice('reports/'.length) : source
}

function copyEntry(source, destinationRoot) {
  const relative = relativeReviewPath(source)
  const destination = resolve(destinationRoot, relative)
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(resolve(source), destination, { recursive: true, force: true })
  return relative
}

export function buildLukeG2HumanReviewBundle({
  outputDir = DEFAULT_OUTPUT_DIR,
  requiredInputs = REQUIRED_REVIEW_INPUTS,
} = {}) {
  const missing = requiredInputs.filter((path) => !existsSync(resolve(path)))
  if (missing.length) throw new Error(`human review inputs missing: ${missing.join(', ')}`)
  const output = resolve(outputDir)
  rmSync(output, { recursive: true, force: true })
  mkdirSync(output, { recursive: true })
  const copied = requiredInputs.map((source) => copyEntry(source, output))
  const preparation = JSON.parse(readFileSync(resolve('data/lexicon/luke-g2-canary-preparation.json'), 'utf8'))
  const comparison = JSON.parse(readFileSync(resolve('reports/luke-g2-zero-cost-comparison.json'), 'utf8'))
  const manifest = {
    schemaVersion: 1,
    bundleId: 'luke-g2-human-review-packets-v1',
    generatedAt: new Date().toISOString(),
    sourceContextPreparationIncluded: true,
    executionGateIncluded: true,
    candidatePairsIncluded: true,
    selectedStrongs: (preparation.packets || []).length,
    representativeContexts: (preparation.packets || []).reduce((sum, packet) => sum + (packet.contexts || []).length, 0),
    comparedPairs: comparison?.summary?.compared ?? comparison?.items?.length ?? 0,
    copied,
    governance: {
      candidateOnly: true,
      humanReviewRequired: true,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
      r3r4AutomaticApprovalAllowed: false,
    },
    reviewChecklist: [
      '한글 음역이 실제 한글 발음인지 확인',
      '영어·중국어 미번역 문장이 남지 않았는지 확인',
      '모든 confidence가 1.0으로 고정되지 않았는지 확인',
      '신학 민감어·다의어·고유명사 필수 risk flag 확인',
      'TAGNT 문맥과 MorphGNT 교차검증을 함께 확인',
    ],
    nextStep: 'Review both blind candidates against the pinned Luke source/context packet before any G3/G4 promotion.',
  }
  writeFileSync(join(output, 'bundle-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`✓ Luke G2 human review bundle · entries=${copied.length} · output=${output}`)
  return manifest
}

function runSelfTest() {
  const root = mkdtempSync(join(tmpdir(), 'luke-g2-review-bundle-'))
  const previous = process.cwd()
  try {
    process.chdir(root)
    const preparation = {
      packets: [
        { strong: 'G2316', contexts: [{}, {}] },
        { strong: 'G4151', contexts: [{}, {}] },
      ],
    }
    for (const path of REQUIRED_REVIEW_INPUTS) {
      const target = resolve(path)
      if (path.endsWith('/candidates')) {
        mkdirSync(target, { recursive: true })
        writeFileSync(join(target, 'fixture.json'), '{}\n', 'utf8')
      } else {
        mkdirSync(dirname(target), { recursive: true })
        const value = path.endsWith('luke-g2-canary-preparation.json')
          ? preparation
          : path.endsWith('luke-g2-zero-cost-comparison.json')
            ? { summary: { compared: 2 } }
            : {}
        writeFileSync(target, `${JSON.stringify(value)}\n`, 'utf8')
      }
    }
    const manifest = buildLukeG2HumanReviewBundle({ outputDir: 'out' })
    assert.equal(manifest.sourceContextPreparationIncluded, true)
    assert.equal(manifest.selectedStrongs, 2)
    assert.equal(manifest.representativeContexts, 4)
    assert.equal(manifest.comparedPairs, 2)
    assert.equal(manifest.governance.productionWriteAllowed, false)
    console.log('✓ Luke G2 human review bundle self-test passed')
  } finally {
    process.chdir(previous)
    rmSync(root, { recursive: true, force: true })
  }
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) runSelfTest()
else buildLukeG2HumanReviewBundle({ outputDir: args.outputDir })
