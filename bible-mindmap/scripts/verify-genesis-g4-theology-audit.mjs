#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AUTHORITY_ORDER, THEOLOGY_AUDIT_VERSION, buildGenesisTheologyAudit } from './build-genesis-g4-theology-audit.mjs'

const DEFAULT_CONTEXT_REVIEW = 'reports/genesis-g3-context-review/context-review.json'
const DEFAULT_AUDIT = 'reports/genesis-g4-theology-audit/theology-audit.json'
const RISK_ORDER = { R0: 0, R1: 1, R2: 2, R3: 3, R4: 4 }
const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`

function parseArgs(argv) {
  const args = { contextReview: DEFAULT_CONTEXT_REVIEW, audit: DEFAULT_AUDIT, strict: false, selfTest: false }
  for (const arg of argv) {
    if (arg === '--strict') args.strict = true
    else if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--context-review=')) args.contextReview = arg.slice(17)
    else if (arg.startsWith('--audit=')) args.audit = arg.slice(8)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function forbiddenApproval(value, path = '$', errors = []) {
  if (Array.isArray(value)) value.forEach((item, index) => forbiddenApproval(item, `${path}[${index}]`, errors))
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`
      if (key === 'theologicalDecision' && child?.status !== 'pending-human-audit') errors.push(`${childPath}.status must remain pending-human-audit`)
      if (['automaticTheologyApprovalAllowed', 'automaticAdjudicationAllowed', 'productionWriteAllowed', 'finalApprovalAllowed'].includes(key) && child !== false) errors.push(`${childPath} must be false`)
      forbiddenApproval(child, childPath, errors)
    }
  }
  return errors
}

export function validateGenesisTheologyAudit({ contextRaw, contextReview, audit }) {
  const errors = []
  const warnings = []
  if (audit?.schemaVersion !== 1) errors.push('schemaVersion must be 1')
  if (audit?.auditVersion !== THEOLOGY_AUDIT_VERSION) errors.push('auditVersion mismatch')
  if (audit?.target !== 'genesis-g2-canary-theology-audit') errors.push('target mismatch')
  if (audit?.contextReviewDigest !== sha256(contextRaw)) errors.push('contextReviewDigest mismatch')
  if (audit?.contextReviewVersion !== contextReview.reviewVersion) errors.push('contextReviewVersion mismatch')
  if (audit?.status !== 'pending-human-theology-audit') errors.push(`status must remain pending-human-theology-audit: ${audit?.status}`)
  if (JSON.stringify(audit?.authorityOrder) !== JSON.stringify(AUTHORITY_ORDER)) errors.push('authorityOrder mismatch')
  if (audit?.governance?.scriptureRemainsFinalAuthority !== true) errors.push('scriptureRemainsFinalAuthority=true required')
  if (audit?.governance?.confessionServesAsDoctrinalGuardrail !== true) errors.push('confessionServesAsDoctrinalGuardrail=true required')
  if (audit?.governance?.aiOutputIsAdvisoryOnly !== true) errors.push('aiOutputIsAdvisoryOnly=true required')
  if (audit?.gates?.humanTheologyAuditRequired !== true) errors.push('humanTheologyAuditRequired=true required')
  if (audit?.gates?.contextEvidenceReady !== true) errors.push('contextEvidenceReady=true required')
  if (audit?.gates?.candidateEvidenceReady !== true) errors.push('candidateEvidenceReady=true required')
  forbiddenApproval(audit, '$', errors)

  if (!Array.isArray(audit?.items)) return { errors: [...errors, 'items array missing'], warnings }
  if (audit.items.length !== contextReview.items?.length) errors.push(`audit item count ${audit.items.length}/${contextReview.items?.length || 0}`)
  const contextByStrong = new Map((contextReview.items || []).map((item) => [item.strong, item]))
  const seen = new Set()
  const byRisk = { R0: 0, R1: 0, R2: 0, R3: 0, R4: 0 }
  let checklistItems = 0
  let evidenceIds = 0
  let intensiveReview = 0

  for (const [index, item] of audit.items.entries()) {
    const where = `items[${index}]`
    const context = contextByStrong.get(item.strong)
    if (!context) errors.push(`${where}: context item missing`)
    if (seen.has(item.strong)) errors.push(`${where}: duplicate Strong`)
    seen.add(item.strong)
    if (item.auditId !== `genesis-g4-audit:${item.strong}`) errors.push(`${where}: auditId mismatch`)
    if (!(item.riskLevel in RISK_ORDER)) errors.push(`${where}: invalid riskLevel ${item.riskLevel}`)
    else byRisk[item.riskLevel] += 1
    if (!Array.isArray(item.authorityOrder) || JSON.stringify(item.authorityOrder) !== JSON.stringify(AUTHORITY_ORDER)) errors.push(`${where}: authority order mismatch`)
    if (!Array.isArray(item.confessionalReferences) || item.confessionalReferences.length === 0) errors.push(`${where}: confessional references missing`)
    if (!Array.isArray(item.reviewChecklist) || item.reviewChecklist.length < 5) errors.push(`${where}: review checklist incomplete`)
    for (const check of item.reviewChecklist || []) {
      if (check.status !== 'pending') errors.push(`${where}: checklist must remain pending`)
      if ((check.evidenceIds || []).length) errors.push(`${where}: prefilled human evidence not allowed`)
      if (check.notes) errors.push(`${where}: prefilled human notes not allowed`)
    }
    if (!item.routing?.queue) errors.push(`${where}: routing queue missing`)
    if (item.routing?.automaticApprovalEligible !== false) errors.push(`${where}: automaticApprovalEligible must be false`)
    if (item.governance?.confessionalReferenceIsGuardrailNotLexiconReplacement !== true) errors.push(`${where}: confession guardrail boundary missing`)
    if (item.governance?.candidateMutationAllowed !== false) errors.push(`${where}: candidate mutation must be false`)
    if (context) {
      if (item.sourceSummary.genesisOccurrences !== context.genesisUsageEvidence?.totalOccurrences) errors.push(`${where}: Genesis occurrence mismatch`)
      if (item.sourceSummary.sourceNodeCount !== context.lexicalEvidence?.sourceNodeCount) errors.push(`${where}: BDB source node mismatch`)
      if (item.candidateSummary.nvidia?.primaryGlossKo !== context.providers?.nvidia?.primaryGlossKo) errors.push(`${where}: NVIDIA candidate mismatch`)
      if (item.candidateSummary.openai?.primaryGlossKo !== context.providers?.openai?.primaryGlossKo) errors.push(`${where}: OpenAI candidate mismatch`)
    }
    if (item.strong === 'H430' && item.riskLevel !== 'R4') errors.push('H430 must be R4')
    if (item.strong === 'H7307' && item.riskLevel !== 'R4') errors.push('H7307 must be R4')
    if (item.strong === 'H776' && RISK_ORDER[item.riskLevel] < RISK_ORDER.R2) errors.push('H776 must be at least R2')
    if (['R3', 'R4'].includes(item.riskLevel) && item.governance?.humanTheologyAuditRequired !== true) errors.push(`${where}: high-risk item requires human audit`)
    if (item.routing.queue === 'intensive-theology-review') intensiveReview += 1
    checklistItems += item.reviewChecklist?.length || 0
    evidenceIds += item.evidenceIds?.length || 0
  }

  const expectedCounts = {
    expectedItems: contextReview.counts?.reviewItems || 0,
    auditItems: audit.items.length,
    intensiveReview,
    checklistItems,
    evidenceIds,
  }
  for (const [key, value] of Object.entries(expectedCounts)) if (audit.counts?.[key] !== value) errors.push(`counts.${key}: ${audit.counts?.[key]} != ${value}`)
  if (JSON.stringify(audit.counts?.byRisk) !== JSON.stringify(byRisk)) errors.push('counts.byRisk mismatch')

  const rebuilt = buildGenesisTheologyAudit({ contextReview, contextReviewDigest: sha256(contextRaw) })
  const stripGeneratedAt = (value) => ({ ...value, generatedAt: null })
  if (JSON.stringify(stripGeneratedAt(rebuilt)) !== JSON.stringify(stripGeneratedAt(audit))) errors.push('deterministic rebuild mismatch')
  if (!audit.items.some((item) => ['R3', 'R4'].includes(item.riskLevel))) warnings.push('no high-risk item found')
  return { errors, warnings }
}

function fixtureContext() {
  const item = (strong, expected) => ({
    strong, role: 'fixture',
    identity: { lemmas: [strong], transliterations: [strong] },
    providers: { nvidia: { primaryGlossKo: '후보 A' }, openai: { primaryGlossKo: '후보 B' } },
    lexicalEvidence: { packetId: `source:${strong}`, sourceNodeCount: 2, lowAgreementSourceNodeIds: [] },
    genesisUsageEvidence: { totalOccurrences: 3, chapters: [1], sampleContextIds: [`${strong}:o1`] },
    candidateMetrics: { agreement: { nodeAverage: 0.8 }, confidence: { average: 0.9 }, warnings: [], riskCoverage: { expected, missing: [] } },
  })
  return {
    reviewVersion: 'fixture', status: 'human-context-review-required',
    counts: { reviewItems: 3 }, gates: { sourceEvidenceReady: true, candidateEvidenceReady: true },
    items: [item('H430', ['theological-sensitive']), item('H7307', ['polysemy', 'theological-sensitive']), item('H776', ['polysemy'])],
  }
}

function runSelfTest() {
  const contextReview = fixtureContext()
  const contextRaw = `${JSON.stringify(contextReview)}\n`
  const audit = buildGenesisTheologyAudit({ contextReview, contextReviewDigest: sha256(contextRaw) })
  assert.deepEqual(validateGenesisTheologyAudit({ contextRaw, contextReview, audit }).errors, [])
  const invalid = structuredClone(audit)
  invalid.items[0].theologicalDecision.status = 'approved'
  assert(validateGenesisTheologyAudit({ contextRaw, contextReview, audit: invalid }).errors.length > 0)
  console.log('✓ Genesis G4 theology audit verifier self-test passed')
}

function main(args) {
  if (args.selfTest) return runSelfTest()
  const contextRaw = readFileSync(resolve(args.contextReview), 'utf8')
  const contextReview = JSON.parse(contextRaw)
  const audit = JSON.parse(readFileSync(resolve(args.audit), 'utf8'))
  const result = validateGenesisTheologyAudit({ contextRaw, contextReview, audit })
  console.log(`Genesis G4 theology audit verification · items=${audit.counts?.auditItems}/${audit.counts?.expectedItems} · risk=${JSON.stringify(audit.counts?.byRisk)}`)
  for (const warning of result.warnings) console.log(`  - warning: ${warning}`)
  if (args.strict && audit.counts?.expectedItems !== 5) result.errors.push(`strict canary audit requires 5 items: ${audit.counts?.expectedItems}`)
  if (args.strict && audit.counts?.intensiveReview < 2) result.errors.push(`strict canary audit requires at least 2 intensive reviews: ${audit.counts?.intensiveReview}`)
  if (result.errors.length) {
    console.error(`✗ Genesis G4 theology audit verification failed (${result.errors.length})`)
    result.errors.slice(0, 100).forEach((error) => console.error(`  - ${error}`))
    process.exitCode = 2
  } else console.log('✓ Genesis G4 theology audit verification passed')
}

main(parseArgs(process.argv.slice(2)))
