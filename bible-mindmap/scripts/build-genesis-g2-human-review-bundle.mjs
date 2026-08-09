#!/usr/bin/env node

import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const DEFAULT_OUTPUT_DIR = 'reports/genesis-g2-human-review-packets'

export const REQUIRED_REVIEW_INPUTS = Object.freeze([
  'reports/genesis-g2-bdb-source-packets.json',
  'reports/genesis-g2-canary-set.json',
  'reports/genesis-g3-usage-context-packets.json',
  'reports/genesis-g2-zero-cost-pipeline.json',
  'reports/genesis-g2-zero-cost-evaluation.json',
  'reports/genesis-g2-zero-cost-execution/candidates',
  'reports/genesis-g2-zero-cost-promotion-review',
  'reports/genesis-g3-zero-cost-context-review',
  'reports/genesis-g4-zero-cost-theology-audit',
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

function copyEntry(source, destinationRoot) {
  const relative = source.replace(/^reports\//, '')
  const destination = resolve(destinationRoot, relative)
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(resolve(source), destination, { recursive: true, force: true })
  return relative
}

export function buildHumanReviewBundle({ outputDir = DEFAULT_OUTPUT_DIR, requiredInputs = REQUIRED_REVIEW_INPUTS } = {}) {
  const missing = requiredInputs.filter((path) => !existsSync(resolve(path)))
  if (missing.length) throw new Error(`human review inputs missing: ${missing.join(', ')}`)

  const output = resolve(outputDir)
  rmSync(output, { recursive: true, force: true })
  mkdirSync(output, { recursive: true })
  const copied = requiredInputs.map((source) => copyEntry(source, output))

  const pipeline = JSON.parse(readFileSync(resolve('reports/genesis-g2-zero-cost-pipeline.json'), 'utf8'))
  const evaluation = JSON.parse(readFileSync(resolve('reports/genesis-g2-zero-cost-evaluation.json'), 'utf8'))
  const manifest = {
    schemaVersion: 1,
    bundleId: 'genesis-g2-human-review-packets-v2',
    generatedAt: new Date().toISOString(),
    sourceIncluded: true,
    canaryIncluded: true,
    usageContextIncluded: true,
    candidatePairs: evaluation?.counts?.pairs ?? evaluation?.pairs?.length ?? 0,
    pipelineStatus: pipeline.status || null,
    copied,
    governance: {
      humanReviewRequired: true,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
    },
    nextStep: 'Compress this directory and provide it for BDB source-node, context, and theology review.',
  }
  writeFileSync(join(output, 'bundle-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`✓ Genesis G2 human review bundle · entries=${copied.length} · output=${output}`)
  return manifest
}

function runSelfTest() {
  const root = mkdtempSync(join(tmpdir(), 'genesis-g2-review-bundle-'))
  const previous = process.cwd()
  try {
    process.chdir(root)
    for (const path of REQUIRED_REVIEW_INPUTS) {
      const target = resolve(path)
      if (path.endsWith('/candidates') || !path.endsWith('.json')) {
        mkdirSync(target, { recursive: true })
        writeFileSync(join(target, 'fixture.json'), '{}\n', 'utf8')
      } else {
        mkdirSync(dirname(target), { recursive: true })
        const value = path.endsWith('pipeline.json')
          ? { status: 'human-review-packets-ready' }
          : path.endsWith('evaluation.json')
            ? { counts: { pairs: 5 } }
            : {}
        writeFileSync(target, `${JSON.stringify(value)}\n`, 'utf8')
      }
    }
    const manifest = buildHumanReviewBundle({ outputDir: 'out' })
    assert.equal(manifest.sourceIncluded, true)
    assert.equal(manifest.canaryIncluded, true)
    assert.equal(manifest.candidatePairs, 5)
    assert.ok(manifest.copied.includes('genesis-g2-bdb-source-packets.json'))
    assert.ok(manifest.copied.includes('genesis-g2-canary-set.json'))
    assert.equal(manifest.governance.productionWriteAllowed, false)
    console.log('✓ Genesis G2 human review bundle self-test 통과')
  } finally {
    process.chdir(previous)
    rmSync(root, { recursive: true, force: true })
  }
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) runSelfTest()
else buildHumanReviewBundle({ outputDir: args.outputDir })
