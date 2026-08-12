#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DEFAULT_CANDIDATE = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-source-candidate-prep-2026-08-12.json')
const DEFAULT_EVIDENCE = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-evidence.json')
const DEFAULT_FREEZE = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-evidence-freeze.json')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-candidate-audit-freeze.json')

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function parseArg(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
  return raw ? resolve(process.cwd(), raw) : fallback
}

function semanticEvidenceFingerprint(report) {
  const clone = structuredClone(report)
  delete clone.generatedAt
  delete clone.reportFingerprint
  return sha256(JSON.stringify(clone))
}

function sorted(values) {
  return [...values].sort((a, b) => String(a).localeCompare(String(b)))
}

function main() {
  const candidatePath = parseArg('candidate', DEFAULT_CANDIDATE)
  const evidencePath = parseArg('evidence', DEFAULT_EVIDENCE)
  const freezePath = parseArg('freeze', DEFAULT_FREEZE)
  const outputPath = parseArg('out', DEFAULT_OUTPUT)

  const candidateRaw = readFileSync(candidatePath, 'utf8')
  const evidenceRaw = readFileSync(evidencePath, 'utf8')
  const freezeRaw = readFileSync(freezePath, 'utf8')
  const candidate = JSON.parse(candidateRaw)
  const evidence = JSON.parse(evidenceRaw)
  const freeze = JSON.parse(freezeRaw)

  assert.equal(candidate.reportId, 'genesis-v4-production-batch-03-source-candidate-prep-2026-08-12')
  assert.equal(candidate.status, 'SOURCE_CONTEXT_CANDIDATE_PREPARED_EXACT_AUDIT_FREEZE_REQUIRED')
  assert.equal(evidence.reportId, 'genesis-v4-production-batch-03-evidence-v1')
  assert.equal(freeze.freezeId, 'genesis-v4-production-batch-03-evidence-freeze-v1')

  const currentMain = process.env.DERIVED_MAIN || null
  assert.ok(currentMain && /^[0-9a-f]{40}$/.test(currentMain), 'DERIVED_MAIN required')
  assert.equal(evidence.derivedMain, currentMain, 'regenerated evidence must bind to current main')
  assert.equal(candidate.derivedMain, currentMain, 'candidate derivedMain drift')
  assert.equal(freeze.derivedMain, currentMain, 'persisted evidence freeze derivedMain drift')

  const regeneratedSemantic = semanticEvidenceFingerprint(evidence)
  assert.equal(regeneratedSemantic, freeze.semanticFingerprint, 'regenerated evidence semantic fingerprint drift')
  assert.equal(candidate.evidence?.semanticFingerprint, freeze.semanticFingerprint, 'candidate evidence fingerprint drift')
  assert.equal(candidate.evidence?.oshbGenesisDigest, freeze.sourceInputFingerprints?.genesisContextSource, 'candidate OSHB digest drift')

  assert.equal(candidate.governance?.researchOnly, true)
  assert.equal(candidate.governance?.candidateIsProposalOnly, true)
  assert.equal(candidate.governance?.candidatePromotionAllowed, false)
  assert.equal(candidate.governance?.approvalRegistryWriteAllowed, false)
  assert.equal(candidate.governance?.productionWriteAllowed, false)
  assert.equal(candidate.governance?.existingApprovedMeaningMutationAllowed, false)
  assert.equal(candidate.governance?.independentAuditRequired, true)
  assert.equal(candidate.governance?.selfApproval, false)
  assert.equal(candidate.governance?.qualityGateWeakeningAllowed, false)
  assert.equal(candidate.governance?.theologicalOverreachForbidden, true)

  const evidenceByStrong = new Map((evidence.items || []).map((item) => [item.strong, item]))
  const freezeByStrong = new Map((freeze.targetLocks || []).map((item) => [item.strong, item]))
  const candidates = candidate.items || []
  assert.equal(candidates.length, 10, 'candidate target count drift')
  assert.equal(new Set(candidates.map((item) => item.strong)).size, 10, 'duplicate candidate Strong')

  const auditTargets = []
  for (const item of candidates) {
    const source = evidenceByStrong.get(item.strong)
    const lock = freezeByStrong.get(item.strong)
    assert.ok(source && lock, `${item.strong}: evidence/lock missing`)
    assert.equal(item.lemma, source.expectedLemma, `${item.strong}: lemma drift`)
    assert.deepEqual(item.bdbEntryIds, source.bdbEntries.map((entry) => entry.id), `${item.strong}: BDB entry IDs drift`)
    assert.deepEqual(item.bdbEntryIds, lock.bdbEntryIds, `${item.strong}: frozen BDB entry IDs drift`)
    assert.deepEqual(item.contextControls, source.contextEvidence.sampleContexts.map((sample) => sample.reference), `${item.strong}: context controls drift`)
    assert.deepEqual(item.morphologyControls, source.contextEvidence.sampleContexts.map((sample) => sample.morph || '(none)'), `${item.strong}: morphology controls drift`)
    assert.equal(source.contextEvidence.totalOccurrences, lock.totalOccurrences, `${item.strong}: occurrence lock drift`)
    assert.equal(source.sourceCoverage.sourceNodes, lock.sourceNodeCount, `${item.strong}: source-node lock drift`)
    assert.ok(typeof item.candidateHeadKo === 'string' && item.candidateHeadKo.trim().length >= 2, `${item.strong}: Korean head candidate missing`)
    assert.ok(Array.isArray(item.senseBoundaryKo) && item.senseBoundaryKo.length >= 2, `${item.strong}: Korean sense boundary insufficient`)
    assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(item.risk), `${item.strong}: unsupported risk tier ${item.risk}`)
    assert.ok(typeof item.note === 'string' && item.note.trim(), `${item.strong}: boundary note missing`)

    auditTargets.push({
      strong: item.strong,
      lemma: item.lemma,
      bdbEntryIds: item.bdbEntryIds,
      contextControls: item.contextControls,
      morphologyControls: item.morphologyControls,
      risk: item.risk,
      candidateHeadKo: item.candidateHeadKo,
      senseBoundaryCount: item.senseBoundaryKo.length,
    })
  }

  const expectedStrongs = ['H413','H834','H3605','H935','H3808','H1931','H3290','H251','H3205','H8141']
  assert.deepEqual(candidates.map((item) => item.strong), expectedStrongs, 'candidate Strong order drift')
  assert.deepEqual(sorted(evidenceByStrong.keys()), sorted(expectedStrongs), 'evidence target set drift')

  const baseline = {
    schemaVersion: 1,
    freezeId: 'genesis-v4-production-batch-03-candidate-audit-freeze-v1',
    status: 'EXACT_CANDIDATE_AUDIT_BASELINE_FROZEN_INDEPENDENT_AUDIT_REQUIRED',
    researchBranch: candidate.researchBranch,
    derivedMain: currentMain,
    candidatePath: 'bible-mindmap/reports/genesis-v4-production-batch-03-source-candidate-prep-2026-08-12.json',
    candidateFileFingerprint: sha256(candidateRaw),
    evidenceSemanticFingerprint: freeze.semanticFingerprint,
    evidenceFreezeFileFingerprint: sha256(freezeRaw),
    regeneratedEvidenceFileFingerprint: sha256(evidenceRaw),
    sourceLocks: {
      tbeshCommit: candidate.evidence?.tbeshCommit,
      openscripturesBdbCommit: candidate.evidence?.openscripturesBdbCommit,
      oshbGenesisDigest: candidate.evidence?.oshbGenesisDigest,
    },
    counts: {
      targets: candidates.length,
      totalGenesisOccurrences: evidence.counts?.totalOccurrences,
      sampledContexts: evidence.counts?.sampledContexts,
      bdbEntries: evidence.counts?.bdbEntries,
      sourceNodes: evidence.counts?.sourceNodes,
    },
    targets: auditTargets,
    governance: {
      researchOnly: true,
      independentAuditRequired: true,
      auditModelsExpected: ['GPT', 'Claude', 'Gemini'],
      candidatePromotionAllowed: false,
      approvalRegistryWriteAllowed: false,
      productionWriteAllowed: false,
      existingApprovedMeaningMutationAllowed: false,
      qualityGateWeakeningAllowed: false,
      selfApprovalAllowed: false,
    },
    nextGate: 'INDEPENDENT_EXACT_FINGERPRINT_AUDIT_GPT_CLAUDE_GEMINI_THEN_COMPARE_VERDICTS_AND_ROUTE_BY_RISK_WITHOUT_PRODUCTION_WRITE',
  }

  baseline.auditBundleFingerprint = sha256(JSON.stringify(baseline))
  assert.ok(/^sha256:[0-9a-f]{64}$/.test(baseline.candidateFileFingerprint))
  assert.ok(/^sha256:[0-9a-f]{64}$/.test(baseline.auditBundleFingerprint))

  writeFileSync(outputPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')
  console.log(`✓ Genesis batch-03 candidate audit baseline frozen`)
  console.log(`✓ candidate=${baseline.candidateFileFingerprint}`)
  console.log(`✓ evidence=${baseline.evidenceSemanticFingerprint}`)
  console.log(`✓ auditBundle=${baseline.auditBundleFingerprint}`)
}

main()
