#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const DEFAULT_EVALUATION = 'evidence/genesis-g2/canary-evaluation.json'
const DEFAULT_APPROVAL = 'evidence/genesis-g2/calibration-100-approval.json'

const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`

function parseArgs(argv) {
  const args = { evaluation: DEFAULT_EVALUATION, approval: DEFAULT_APPROVAL, output: null, strict: false, selfTest: false }
  for (const arg of argv) {
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--evaluation=')) args.evaluation = arg.slice('--evaluation='.length)
    else if (arg.startsWith('--approval=')) args.approval = arg.slice('--approval='.length)
    else if (arg.startsWith('--output=')) args.output = arg.slice('--output='.length)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

export function verifyPromotion({ evaluationRaw, approval }) {
  const evaluation = JSON.parse(evaluationRaw)
  const errors = []
  const digest = sha256(evaluationRaw)
  if (approval?.schemaVersion !== 1) errors.push('approval schemaVersion must be 1')
  if (approval?.target !== 'genesis-g2-calibration-100') errors.push('approval target mismatch')
  if (approval?.decision !== 'approved') errors.push('approval decision must be approved')
  if (approval?.evaluationDigest !== digest) errors.push('evaluationDigest mismatch')
  if (approval?.evaluationStatus !== evaluation?.promotion?.status) errors.push('evaluationStatus mismatch')
  if (evaluation?.promotion?.status !== 'eligible-for-human-promotion-review') errors.push(`evaluation is not eligible: ${evaluation?.promotion?.status}`)
  if (evaluation?.gates?.technicalGatePassed !== true) errors.push('technicalGatePassed must be true')
  if (evaluation?.gates?.qualityThresholdPassed !== true) errors.push('qualityThresholdPassed must be true')
  if (evaluation?.gates?.automaticPromotionAllowed !== false) errors.push('evaluation automaticPromotionAllowed must be false')
  if (approval?.humanApprovalConfirmed !== true) errors.push('humanApprovalConfirmed must be true')
  if (typeof approval?.reviewer !== 'string' || approval.reviewer.trim().length < 2) errors.push('reviewer missing')
  if (!approval?.reviewedAt || Number.isNaN(Date.parse(approval.reviewedAt))) errors.push('reviewedAt invalid')
  if (approval?.governance?.automaticPromotionAllowed !== false) errors.push('approval automaticPromotionAllowed must remain false')
  if (approval?.governance?.serviceWriteAllowed !== false) errors.push('approval serviceWriteAllowed must remain false')
  if (approval?.governance?.finalApprovalAllowed !== false) errors.push('approval finalApprovalAllowed must remain false')
  return {
    schemaVersion: 1,
    target: 'genesis-g2-calibration-100',
    evaluationDigest: digest,
    decision: approval?.decision || null,
    reviewer: approval?.reviewer || null,
    passed: errors.length === 0,
    errors,
    governance: {
      humanApprovalRequired: true,
      automaticPromotionAllowed: false,
      serviceWriteAllowed: false,
      finalApprovalAllowed: false,
    },
  }
}

function selfTest() {
  const evaluation = {
    promotion: { status: 'eligible-for-human-promotion-review' },
    gates: { technicalGatePassed: true, qualityThresholdPassed: true, automaticPromotionAllowed: false },
  }
  const evaluationRaw = `${JSON.stringify(evaluation, null, 2)}\n`
  const approval = {
    schemaVersion: 1,
    target: 'genesis-g2-calibration-100',
    decision: 'approved',
    evaluationDigest: sha256(evaluationRaw),
    evaluationStatus: 'eligible-for-human-promotion-review',
    reviewer: 'fixture-reviewer',
    reviewedAt: new Date().toISOString(),
    humanApprovalConfirmed: true,
    governance: { automaticPromotionAllowed: false, serviceWriteAllowed: false, finalApprovalAllowed: false },
  }
  const report = verifyPromotion({ evaluationRaw, approval })
  if (!report.passed) throw new Error(`promotion verifier self-test failed: ${report.errors.join('; ')}`)
  const rejected = verifyPromotion({ evaluationRaw, approval: { ...approval, decision: 'pending' } })
  if (rejected.passed) throw new Error('pending approval must not pass')
  console.log('✓ Genesis G2 calibration promotion verifier self-test 통과')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) {
  selfTest()
  process.exit(0)
}
const evaluationRaw = readFileSync(resolve(args.evaluation), 'utf8')
const approval = JSON.parse(readFileSync(resolve(args.approval), 'utf8'))
const report = verifyPromotion({ evaluationRaw, approval })
if (args.output) {
  const output = resolve(args.output)
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}
console.log(`${report.passed ? '✓' : '✗'} Genesis G2 calibration promotion Gate · decision=${report.decision} · errors=${report.errors.length}`)
if (args.strict && !report.passed) process.exitCode = 2
