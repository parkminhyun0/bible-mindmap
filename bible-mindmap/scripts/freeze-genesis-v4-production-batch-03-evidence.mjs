#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DEFAULT_INPUT = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-evidence.json')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-evidence-freeze.json')

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function parseArg(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
  return raw ? resolve(process.cwd(), raw) : fallback
}

function semanticPayload(report) {
  const clone = structuredClone(report)
  delete clone.generatedAt
  delete clone.reportFingerprint
  return clone
}

function main() {
  const input = parseArg('in', DEFAULT_INPUT)
  const output = parseArg('out', DEFAULT_OUTPUT)
  const source = JSON.parse(readFileSync(input, 'utf8'))

  assert.equal(source.reportId, 'genesis-v4-production-batch-03-evidence-v1')
  assert.equal(source.status, 'PRIMARY_BDB_AND_CONTEXT_MORPHOLOGY_MATERIALIZED_CANDIDATE_PREP_NEXT')
  assert.equal(source.counts?.targets, 10)
  assert.equal(source.counts?.totalOccurrences, 2529)
  assert.equal(source.counts?.targetsWithCompleteBdbCoverage, 10)
  assert.equal(source.governance?.researchOnly, true)
  assert.equal(source.governance?.candidateMutation, false)
  assert.equal(source.governance?.approvalRegistryMutation, false)
  assert.equal(source.governance?.productionMutation, false)
  assert.equal(source.governance?.existingApprovedMeaningMutation, false)

  const semantic = semanticPayload(source)
  const semanticFingerprint = sha256(JSON.stringify(semantic))
  const freeze = {
    schemaVersion: 1,
    freezeId: 'genesis-v4-production-batch-03-evidence-freeze-v1',
    status: 'EXACT_RESEARCH_EVIDENCE_FROZEN_CANDIDATE_PREP_ALLOWED',
    researchBranch: source.researchBranch,
    derivedMain: source.derivedMain,
    sourceReportId: source.reportId,
    sourceGeneratedAt: source.generatedAt || null,
    fingerprintMethod: 'sha256-canonical-json-excluding-generatedAt-and-source-reportFingerprint-v1',
    semanticFingerprint,
    sourceInputFingerprints: {
      selection: source.inputs?.selection?.digest || null,
      tbeshSourceNodeLock: source.inputs?.tbeshSourceNodeLock?.digest || null,
      sourceRegistry: source.inputs?.sourceRegistry?.digest || null,
      genesisContextSource: source.contextSource?.digest || null,
      primarySourceFiles: source.primarySource?.files || [],
    },
    counts: source.counts,
    targetLocks: (source.items || []).map((item) => ({
      strong: item.strong,
      expectedLemma: item.expectedLemma,
      bdbEntryIds: (item.bdbEntries || []).map((entry) => entry.id),
      sourceNodeCount: item.sourceCoverage?.sourceNodes || 0,
      totalOccurrences: item.contextEvidence?.totalOccurrences || 0,
      firstReference: item.contextEvidence?.firstReference || null,
      sampledContexts: item.contextEvidence?.sampledContexts || 0,
      sampledMorphs: item.contextEvidence?.distinctSampleMorphs || [],
    })),
    governance: {
      researchOnly: true,
      candidatePrepAllowed: true,
      candidatePromotionAllowed: false,
      approvalRegistryWriteAllowed: false,
      productionWriteAllowed: false,
      existingApprovedMeaningMutationAllowed: false,
      qualityGateWeakeningAllowed: false,
      selfApprovalAllowed: false,
      independentAuditRequiredBeforePromotion: true,
    },
    nextGate: 'GENERATE_SOURCE_FAITHFUL_KOREAN_CANDIDATES_BOUND_TO_THIS_SEMANTIC_FINGERPRINT_THEN_FREEZE_CANDIDATE_AUDIT_BASELINE',
  }

  assert.ok(/^sha256:[0-9a-f]{64}$/.test(freeze.semanticFingerprint))
  assert.equal(freeze.targetLocks.length, 10)
  assert.ok(freeze.targetLocks.every((item) => item.bdbEntryIds.length >= 1))
  assert.ok(freeze.targetLocks.every((item) => item.sampledContexts >= 3))

  writeFileSync(output, `${JSON.stringify(freeze, null, 2)}\n`, 'utf8')
  console.log(`✓ Genesis batch-03 semantic evidence frozen · ${freeze.semanticFingerprint}`)
}

main()
