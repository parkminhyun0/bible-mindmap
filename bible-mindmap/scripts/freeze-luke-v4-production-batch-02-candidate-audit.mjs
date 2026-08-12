#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DEFAULT_EVIDENCE = resolve(APP_ROOT, 'reports/luke-v4-production-batch-02-context-morphology-evidence.json')
const DEFAULT_CANDIDATE = resolve(APP_ROOT, 'reports/luke-v4-production-batch-02-source-candidate-prep-2026-08-12.json')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/luke-v4-production-batch-02-candidate-audit-freeze.json')
const TARGETS = ['G0006','G0007','G0009','G0011','G0012','G0015','G0018','G0020']

function arg(name, fallback) {
  const prefix = `--${name}=`
  const raw = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length)
  return raw ? resolve(process.cwd(), raw) : fallback
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function verifyEvidenceFingerprint(evidence) {
  const claimed = evidence.semanticFingerprint
  const clone = structuredClone(evidence)
  delete clone.semanticFingerprint
  assert.equal(sha256(JSON.stringify(clone)), claimed, 'Luke evidence semantic fingerprint drift')
  return claimed
}

function main() {
  const evidencePath = arg('evidence', DEFAULT_EVIDENCE)
  const candidatePath = arg('candidate', DEFAULT_CANDIDATE)
  const outputPath = arg('out', DEFAULT_OUTPUT)
  const evidenceRaw = readFileSync(evidencePath, 'utf8')
  const candidateRaw = readFileSync(candidatePath, 'utf8')
  const evidence = JSON.parse(evidenceRaw)
  const candidate = JSON.parse(candidateRaw)

  assert.equal(evidence.reportId, 'luke-v4-production-batch-02-context-morphology-evidence-v1')
  assert.equal(evidence.status, 'EXACT_TAGNT_CONTEXT_MORPHOLOGY_MATERIALIZED_CANDIDATE_BOUNDARY_PASS_AUDIT_FREEZE_NEXT')
  assert.equal(candidate.stage, 'SOURCE_FAITHFUL_CANDIDATE_PREP')
  const currentMain = process.env.DERIVED_MAIN || null
  assert.ok(currentMain && /^[0-9a-f]{40}$/.test(currentMain), 'DERIVED_MAIN required')
  assert.equal(evidence.derivedMain, currentMain, 'evidence current-main drift')
  const evidenceFingerprint = verifyEvidenceFingerprint(evidence)

  const evidenceByStrong = new Map((evidence.items || []).map((item) => [item.strong, item]))
  const candidateByStrong = new Map((candidate.targets || []).map((item) => [item.strong, item]))
  assert.deepEqual((evidence.items || []).map((item) => item.strong), TARGETS)
  assert.deepEqual((candidate.targets || []).map((item) => item.strong), TARGETS)

  const targets = TARGETS.map((strong) => {
    const source = evidenceByStrong.get(strong)
    const proposed = candidateByStrong.get(strong)
    assert.ok(source && proposed, `${strong}: candidate/evidence missing`)
    assert.equal(source.lemma, proposed.lemma, `${strong}: lemma drift`)
    assert.deepEqual(source.koreanCandidate, proposed.koreanCandidate, `${strong}: Korean candidate drift`)
    assert.equal(source.candidateNote, proposed.candidateNote, `${strong}: candidate note drift`)
    assert.equal(source.risk, proposed.risk, `${strong}: risk drift`)
    assert.equal(source.counts.actualTokens, proposed.lukeUsage.count, `${strong}: usage count drift`)
    if (['G0012','G0015','G0018','G0020'].includes(strong)) {
      assert.equal(source.tfLSJBoundary, proposed.tfLSJBoundary, `${strong}: TFLSJ boundary drift`)
      assert.ok(source.tfLSJBoundary?.trim(), `${strong}: TFLSJ boundary required`)
    }
    return {
      strong,
      lemma: source.lemma,
      risk: source.risk,
      koreanCandidate: source.koreanCandidate,
      exactTokenCount: source.counts.actualTokens,
      exactVerseCount: source.counts.distinctVerses,
      distinctMorphologies: source.counts.distinctMorphologies,
      exactTokenIds: source.exactOccurrences.map((occurrence) => occurrence.tokenId),
      exactRefs: source.exactOccurrences.map((occurrence) => occurrence.ref),
      tfLSJBoundaryRequired: ['G0012','G0015','G0018','G0020'].includes(strong),
    }
  })

  assert.equal(targets.reduce((sum, item) => sum + item.exactTokenCount, 0), 41)
  const baseline = {
    schemaVersion: 1,
    freezeId: 'luke-v4-production-batch-02-candidate-audit-freeze-v1',
    status: 'EXACT_CANDIDATE_CONTEXT_AUDIT_BASELINE_FROZEN_INDEPENDENT_AUDIT_REQUIRED',
    researchBranch: 'chatgpt/luke-v4-production-batch-02',
    derivedMain: currentMain,
    candidatePath: 'bible-mindmap/reports/luke-v4-production-batch-02-source-candidate-prep-2026-08-12.json',
    candidateFileFingerprint: sha256(candidateRaw),
    contextMorphologyEvidenceFingerprint: evidenceFingerprint,
    contextMorphologyEvidenceFileFingerprint: sha256(evidenceRaw),
    sourceLocks: {
      tagntCommit: evidence.tagntSource?.commit,
      tagntGitBlobSha: evidence.tagntSource?.gitBlobSha,
      tagntSha256: evidence.tagntSource?.sha256,
      sourceRegistryDigest: evidence.inputs?.currentMainSourceRegistry?.digest,
      currentMainG0SourceLockDigest: evidence.inputs?.currentMainG0SourceLock?.digest,
    },
    counts: {
      targets: targets.length,
      exactTargetTokens: evidence.counts?.exactTargetTokens,
      exactContextPackets: evidence.counts?.exactContextPackets,
      lukeSblTokensObserved: evidence.counts?.lukeSblTokensObserved,
      highRiskBoundaryTargets: 4,
    },
    targets,
    governance: {
      researchOnly: true,
      independentAuditRequired: true,
      auditModelsExpected: ['GPT','Claude','Gemini'],
      candidatePromotionAllowed: false,
      approvalRegistryWriteAllowed: false,
      productionWriteAllowed: false,
      existingApprovedMeaningMutationAllowed: false,
      qualityGateWeakeningAllowed: false,
      selfApprovalAllowed: false,
    },
    nextGate: 'INDEPENDENT_EXACT_FINGERPRINT_AUDIT_GPT_CLAUDE_GEMINI_THEN_COMPARE_VERDICTS_AND_ISOLATE_HOLD_DISPUTE_WITHOUT_BLOCKING_UNAFFECTED_TARGETS',
  }
  baseline.auditBundleFingerprint = sha256(JSON.stringify(baseline))
  assert.ok(/^sha256:[0-9a-f]{64}$/.test(baseline.candidateFileFingerprint))
  assert.ok(/^sha256:[0-9a-f]{64}$/.test(baseline.contextMorphologyEvidenceFingerprint))
  assert.ok(/^sha256:[0-9a-f]{64}$/.test(baseline.auditBundleFingerprint))

  writeFileSync(outputPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')
  console.log('✓ Luke batch-02 exact candidate/context audit baseline frozen')
  console.log(`✓ candidate=${baseline.candidateFileFingerprint}`)
  console.log(`✓ evidence=${baseline.contextMorphologyEvidenceFingerprint}`)
  console.log(`✓ auditBundle=${baseline.auditBundleFingerprint}`)
}

main()
