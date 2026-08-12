#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DEFAULT_CANDIDATE = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-public-research-refined-candidates-v2.json')
const DEFAULT_MATRIX = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-gpt-public-research-first-evidence-matrix-2026-08-12.json')
const DEFAULT_EVIDENCE = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-evidence-current-v2.json')
const DEFAULT_HISTORICAL_FREEZE = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-evidence-freeze.json')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/genesis-v4-production-batch-03-public-research-v2-freeze.json')

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function parseArg(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
  return raw ? resolve(process.cwd(), raw) : fallback
}

function evidenceContentFingerprint(report) {
  const clone = structuredClone(report)
  delete clone.generatedAt
  delete clone.reportFingerprint
  delete clone.derivedMain
  return sha256(JSON.stringify(clone))
}

function sorted(values) {
  return [...values].sort((a, b) => String(a).localeCompare(String(b)))
}

function main() {
  const candidatePath = parseArg('candidate', DEFAULT_CANDIDATE)
  const matrixPath = parseArg('matrix', DEFAULT_MATRIX)
  const evidencePath = parseArg('evidence', DEFAULT_EVIDENCE)
  const historicalFreezePath = parseArg('historical-freeze', DEFAULT_HISTORICAL_FREEZE)
  const outputPath = parseArg('out', DEFAULT_OUTPUT)

  const candidateRaw = readFileSync(candidatePath, 'utf8')
  const matrixRaw = readFileSync(matrixPath, 'utf8')
  const evidenceRaw = readFileSync(evidencePath, 'utf8')
  const historicalFreezeRaw = readFileSync(historicalFreezePath, 'utf8')
  const candidate = JSON.parse(candidateRaw)
  const matrix = JSON.parse(matrixRaw)
  const evidence = JSON.parse(evidenceRaw)
  const historicalFreeze = JSON.parse(historicalFreezeRaw)

  assert.equal(candidate.reportId, 'genesis-v4-production-batch-03-public-research-refined-candidates-v2')
  assert.equal(candidate.status, 'PUBLIC_RESEARCH_REFINED_PROPOSAL_READY_FOR_EXACT_FREEZE')
  assert.equal(matrix.reportId, 'genesis-v4-production-batch-03-gpt-public-research-first-evidence-matrix-2026-08-12')
  assert.equal(matrix.status, 'GPT_PUBLIC_RESEARCH_FIRST_PARALLEL_CROSSCHECK_COMPLETE_REFINEMENT_REQUIRED_BEFORE_PROMOTION')
  assert.equal(evidence.reportId, 'genesis-v4-production-batch-03-evidence-v1')
  assert.equal(historicalFreeze.freezeId, 'genesis-v4-production-batch-03-evidence-freeze-v1')

  const currentMain = process.env.DERIVED_MAIN || null
  assert.ok(currentMain && /^[0-9a-f]{40}$/.test(currentMain), 'DERIVED_MAIN required')
  assert.equal(evidence.derivedMain, currentMain, 'regenerated evidence must record current main')
  assert.equal(candidate.baselineDerivedMain, historicalFreeze.derivedMain, 'candidate historical baseline drift')
  assert.equal(candidate.evidence?.historicalSemanticFingerprint, historicalFreeze.semanticFingerprint, 'historical evidence fingerprint drift')

  const frozenInputs = historicalFreeze.sourceInputFingerprints || {}
  assert.equal(evidence.inputs?.selection?.digest, frozenInputs.selection, 'selection input drift')
  assert.equal(evidence.inputs?.tbeshSourceNodeLock?.digest, frozenInputs.tbeshSourceNodeLock, 'TBESH source-node lock drift')
  assert.equal(evidence.inputs?.sourceRegistry?.digest, frozenInputs.sourceRegistry, 'current-main source registry drift')
  assert.equal(evidence.contextSource?.digest, frozenInputs.genesisContextSource, 'Genesis context source drift')

  const expectedPrimaryFiles = new Map((frozenInputs.primarySourceFiles || []).map((item) => [item.filename, item.digest]))
  const currentPrimaryFiles = new Map((evidence.primarySource?.files || []).map((item) => [item.filename, item.digest]))
  assert.deepEqual(sorted(currentPrimaryFiles.keys()), sorted(expectedPrimaryFiles.keys()), 'primary source file set drift')
  for (const [filename, digest] of expectedPrimaryFiles) {
    assert.equal(currentPrimaryFiles.get(filename), digest, `${filename}: primary source digest drift`)
  }

  assert.equal(evidence.primarySource?.licenseStatus, 'approved', 'primary source license approval drift')
  assert.equal(evidence.primarySource?.licenseExpression, 'CC-BY-4.0', 'primary source license expression drift')
  assert.equal(evidence.primarySource?.externalLlmInputAllowed, true, 'primary source external-LLM permission drift')
  assert.equal(evidence.primarySource?.derivativeAllowed, true, 'primary source derivative permission drift')
  assert.equal(evidence.inputs?.sourceRegistry?.policyVersion, '1.2', 'source registry policy drift')

  const expectedStrongs = ['H413','H834','H3605','H935','H3808','H1931','H3290','H251','H3205','H8141']
  const candidates = candidate.items || []
  const evidenceByStrong = new Map((evidence.items || []).map((item) => [item.strong, item]))
  const lockByStrong = new Map((historicalFreeze.targetLocks || []).map((item) => [item.strong, item]))
  const matrixByStrong = new Map((matrix.items || []).map((item) => [item.strong, item]))

  assert.deepEqual(candidates.map((item) => item.strong), expectedStrongs, 'candidate Strong order drift')
  assert.deepEqual(sorted(evidenceByStrong.keys()), sorted(expectedStrongs), 'evidence target set drift')
  assert.deepEqual(sorted(lockByStrong.keys()), sorted(expectedStrongs), 'historical lock target set drift')
  assert.deepEqual(sorted(matrixByStrong.keys()), sorted(expectedStrongs), 'public research matrix target set drift')

  const targetSummary = []
  for (const item of candidates) {
    const source = evidenceByStrong.get(item.strong)
    const lock = lockByStrong.get(item.strong)
    const publicResearch = matrixByStrong.get(item.strong)
    assert.ok(source && lock && publicResearch, `${item.strong}: required evidence missing`)
    assert.equal(item.lemma, source.expectedLemma, `${item.strong}: lemma drift`)
    assert.deepEqual(item.bdbEntryIds, source.bdbEntries.map((entry) => entry.id), `${item.strong}: BDB entry drift`)
    assert.deepEqual(item.bdbEntryIds, lock.bdbEntryIds, `${item.strong}: historical BDB lock drift`)
    assert.deepEqual(item.contextControls, source.contextEvidence.sampleContexts.map((sample) => sample.reference), `${item.strong}: context controls drift`)
    assert.deepEqual(item.morphologyControls, source.contextEvidence.sampleContexts.map((sample) => sample.morph || '(none)'), `${item.strong}: morphology controls drift`)
    assert.equal(source.contextEvidence.totalOccurrences, lock.totalOccurrences, `${item.strong}: occurrence lock drift`)
    assert.equal(source.sourceCoverage.sourceNodes, lock.sourceNodeCount, `${item.strong}: source-node lock drift`)
    assert.ok(typeof item.candidateHeadKo === 'string' && item.candidateHeadKo.trim().length >= 2, `${item.strong}: Korean head missing`)
    assert.ok(Array.isArray(item.senseBoundaryKo) && item.senseBoundaryKo.length >= 3, `${item.strong}: insufficient sense hierarchy`)
    assert.ok(['LOW','MEDIUM','HIGH'].includes(item.risk), `${item.strong}: unsupported risk tier`)
    assert.ok(typeof item.note === 'string' && item.note.trim(), `${item.strong}: note missing`)

    if (publicResearch.candidateHeadMayRemain === false) {
      assert.equal(item.candidateHeadKo, publicResearch.recommendedHeadKo, `${item.strong}: required public-research head revision missing`)
    }

    targetSummary.push({
      strong: item.strong,
      lemma: item.lemma,
      bdbEntryIds: item.bdbEntryIds,
      contextControls: item.contextControls,
      morphologyControls: item.morphologyControls,
      risk: item.risk,
      candidateHeadKo: item.candidateHeadKo,
      senseBoundaryCount: item.senseBoundaryKo.length,
      publicResearchVerdict: publicResearch.verdict,
      candidateHeadChangedByPublicResearch: publicResearch.candidateHeadMayRemain === false,
    })
  }

  assert.equal(candidate.checks?.targetCount, 10)
  assert.equal(candidate.checks?.totalGenesisOccurrences, 2529)
  assert.equal(candidate.checks?.publicResearchMatrixBound, true)
  assert.equal(candidate.checks?.headRevisionCount, 1)
  assert.equal(candidate.checks?.senseHierarchyRefinementCount, 4)
  assert.equal(candidate.checks?.hold, 0)
  assert.equal(candidate.checks?.dispute, 0)
  assert.equal(matrix.summary?.blockingExternalClaudeGeminiVerdictRequired, false)
  assert.equal(matrix.summary?.headRevisionRequired, 1)
  assert.equal(matrix.summary?.senseHierarchyRefinementRequired, 4)

  const g = candidate.governance || {}
  assert.equal(g.researchOnly, true)
  assert.equal(g.candidateIsProposalOnly, true)
  assert.equal(g.publicResearchCrosscheckRequired, true)
  assert.equal(g.blockingExternalModelAuditRequired, false)
  assert.equal(g.candidatePromotionAllowed, false)
  assert.equal(g.approvalRegistryWriteAllowed, false)
  assert.equal(g.productionWriteAllowed, false)
  assert.equal(g.existingApprovedMeaningMutationAllowed, false)
  assert.equal(g.selfApproval, false)
  assert.equal(g.qualityGateWeakeningAllowed, false)
  assert.equal(g.theologicalOverreachForbidden, true)

  const baseline = {
    schemaVersion: 2,
    freezeId: 'genesis-v4-production-batch-03-public-research-v2-freeze',
    status: 'EXACT_PUBLIC_RESEARCH_CANDIDATE_BASELINE_FROZEN_CURRENT_MAIN_INPUTS_VERIFIED',
    researchBranch: candidate.researchBranch,
    currentDerivedMain: currentMain,
    historicalDerivedMain: historicalFreeze.derivedMain,
    candidatePath: 'bible-mindmap/reports/genesis-v4-production-batch-03-public-research-refined-candidates-v2.json',
    publicResearchMatrixPath: 'bible-mindmap/reports/genesis-v4-production-batch-03-gpt-public-research-first-evidence-matrix-2026-08-12.json',
    candidateFileFingerprint: sha256(candidateRaw),
    publicResearchMatrixFingerprint: sha256(matrixRaw),
    evidenceContentFingerprint: evidenceContentFingerprint(evidence),
    historicalEvidenceSemanticFingerprint: historicalFreeze.semanticFingerprint,
    sourceInputLocks: {
      selection: frozenInputs.selection,
      tbeshSourceNodeLock: frozenInputs.tbeshSourceNodeLock,
      sourceRegistry: frozenInputs.sourceRegistry,
      genesisContextSource: frozenInputs.genesisContextSource,
      primarySourceFiles: frozenInputs.primarySourceFiles,
    },
    counts: {
      targets: candidates.length,
      totalGenesisOccurrences: evidence.counts?.totalOccurrences,
      sampledContexts: evidence.counts?.sampledContexts,
      bdbEntries: evidence.counts?.bdbEntries,
      sourceNodes: evidence.counts?.sourceNodes,
      headRevisionCount: candidate.checks?.headRevisionCount,
      senseHierarchyRefinementCount: candidate.checks?.senseHierarchyRefinementCount,
    },
    targets: targetSummary,
    governance: {
      researchOnly: true,
      publicResearchFirstRequired: true,
      blockingExternalModelVerdictRequired: false,
      optionalExternalCounterAuditAllowed: true,
      candidatePromotionAllowed: false,
      approvalRegistryWriteAllowed: false,
      productionWriteAllowed: false,
      existingApprovedMeaningMutationAllowed: false,
      qualityGateWeakeningAllowed: false,
      selfApprovalAllowed: false,
    },
    nextGate: 'RUN_DETERMINISTIC_VERIFIER_AND_PREPARE_MAIN_BOUND_PROMOTION_ONLY_AFTER_CURRENT_MAIN_RECHECK_WITHOUT_EXTERNAL_MODEL_BLOCKING',
  }

  baseline.auditBundleFingerprint = sha256(JSON.stringify(baseline))
  writeFileSync(outputPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')

  console.log('✓ Genesis batch-03 Public-Research-First v2 baseline frozen')
  console.log(`✓ currentMain=${baseline.currentDerivedMain}`)
  console.log(`✓ candidate=${baseline.candidateFileFingerprint}`)
  console.log(`✓ publicResearch=${baseline.publicResearchMatrixFingerprint}`)
  console.log(`✓ evidenceContent=${baseline.evidenceContentFingerprint}`)
  console.log(`✓ auditBundle=${baseline.auditBundleFingerprint}`)
}

main()
