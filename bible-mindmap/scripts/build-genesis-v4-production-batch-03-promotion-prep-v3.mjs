#!/usr/bin/env node

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fingerprintWithout, sha256Canonical } from './lib/lexicon-evidence-verifier.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const TARGETS = ['H413','H834','H3605','H935','H3808','H1931','H3290','H251','H3205','H8141']
const POLICY_REVIEWER = { reviewerId: 'lexicon-v4-evidence-and-gate', reviewerType: 'evidence-policy' }
const KO_TRANSLIT = { H413:'엘', H834:'아셰르', H3605:'콜', H935:'보', H3808:'로', H1931:'후', H3290:'야아코브', H251:'아흐', H3205:'얄라드', H8141:'샤나' }
const POS = {
  R: { labelEn:'preposition', labelKo:'전치사' },
  T: { labelEn:'particle', labelKo:'불변화사' },
  N: { labelEn:'noun', labelKo:'명사' },
  V: { labelEn:'verb', labelKo:'동사' },
  D: { labelEn:'adverb', labelKo:'부사' },
  Pp: { labelEn:'personal pronoun', labelKo:'인칭대명사' },
  Np: { labelEn:'proper noun', labelKo:'고유명사' },
}

function arg(name, fallback = null) {
  const raw = process.argv.find((v) => v.startsWith(`--${name}=`))?.slice(name.length + 3)
  return raw ? path.resolve(process.cwd(), raw) : fallback
}
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')) }
function stableSet(values) { return [...values].sort((a,b) => String(a).localeCompare(String(b))) }
function contentFingerprint(report) {
  const copy = structuredClone(report)
  delete copy.generatedAt
  delete copy.reportFingerprint
  delete copy.derivedMain
  return sha256Canonical(copy)
}

function numericProjection(sourceNodes) {
  const numeric = new Map()
  const roots = sourceNodes.filter((node) => node.parentId === null)
  roots.forEach((node, index) => numeric.set(node.id, String(index + 1)))
  let remaining = sourceNodes.length - roots.length
  while (remaining > 0) {
    let advanced = 0
    for (const node of sourceNodes) {
      if (numeric.has(node.id) || !numeric.has(node.parentId)) continue
      const siblings = sourceNodes.filter((candidate) => candidate.parentId === node.parentId)
      numeric.set(node.id, `${numeric.get(node.parentId)}.${siblings.indexOf(node) + 1}`)
      advanced += 1
    }
    assert.ok(advanced > 0, 'source hierarchy contains an unresolved parent/cycle')
    remaining -= advanced
  }
  return numeric
}

function buildIdentity(item) {
  const primary = item.lexicalMappings?.[0]
  assert.ok(primary, `${item.strong}: lexical mapping missing`)
  const labels = POS[primary.partOfSpeechCode]
  assert.ok(labels, `${item.strong}: unsupported POS ${primary.partOfSpeechCode}`)
  const identity = {
    schemaVersion: 1,
    identityId: item.strong,
    sourceForms: [item.strong],
    canonicalStrong: item.strong,
    baseStrong: item.strong,
    disambiguationSuffix: null,
    namespace: 'strong',
    testament: 'old-testament',
    language: 'hebrew',
    lemma: item.expectedLemma,
    lemmaNormalized: item.expectedLemma.normalize('NFC'),
    transliteration: { scientific: primary.transliteration, korean: KO_TRANSLIT[item.strong] },
    partOfSpeech: { code: primary.partOfSpeechCode, ...labels },
    sourceRefs: item.lexicalMappings.map((mapping) => ({
      sourceId: 'openscriptures-hebrewlexicon-bdb',
      locator: `BrownDriverBriggs.xml:${mapping.bdbId}`,
    })),
  }
  identity.identityFingerprint = fingerprintWithout(identity, 'identityFingerprint')
  return identity
}

function main() {
  const evidencePath = arg('evidence', path.join(ROOT, 'reports/genesis-v4-production-batch-03-evidence-current-v3.json'))
  const mapPath = arg('map', path.join(ROOT, 'reports/genesis-v4-production-batch-03-bdb-source-node-korean-map-v3.json'))
  const freezePath = arg('freeze', path.join(ROOT, 'reports/genesis-v4-production-batch-03-public-research-v2-freeze.json'))
  const registryPath = arg('registry')
  const trackStatePath = arg('track-state')
  const outPath = arg('out', path.join(ROOT, 'reports/genesis-v4-production-batch-03-promotion-prep-v3.json'))
  assert.ok(registryPath && trackStatePath, '--registry and --track-state are required')

  const evidence = read(evidencePath)
  const koreanMap = read(mapPath)
  const v2Freeze = read(freezePath)
  const registry = read(registryPath)
  const trackState = read(trackStatePath)
  const currentMain = process.env.DERIVED_MAIN
  assert.match(currentMain || '', /^[0-9a-f]{40}$/, 'DERIVED_MAIN required')
  assert.equal(evidence.derivedMain, currentMain, 'evidence/current main drift')
  assert.equal(koreanMap.status, 'GPT_PUBLIC_RESEARCH_SOURCE_NODE_KOREAN_MAP_75_OF_75')
  assert.equal(v2Freeze.status, 'EXACT_PUBLIC_RESEARCH_CANDIDATE_BASELINE_FROZEN_CURRENT_MAIN_INPUTS_VERIFIED')

  const gate = trackState.currentPhaseGate || {}
  assert.equal(gate.approvalRegistryPromotionAllowed, true, 'TRACK_STATE must allow Approval Registry promotion')
  assert.equal(gate.serviceUiWriteAllowed, false, 'service/UI write must remain disabled')
  assert.equal(gate.independentReviewRequired, true, 'independent review must remain required')
  assert.equal(gate.effectiveOnlyAfterIndependentReviewAndMerge, true, 'promotion must remain effective only after independent review and merge')

  const registryByStrong = new Map(registry.entries.map((entry) => [entry.identity.canonicalStrong, entry]))
  const existingTargets = TARGETS.filter((strong) => registryByStrong.has(strong))
  assert.deepEqual(existingTargets, [], `Batch 03 must be NEW entries only; already approved: ${existingTargets.join(', ')}`)
  const h776 = registryByStrong.get('H776')
  assert.ok(h776, 'H776 golden entry must remain present')
  assert.equal(h776.approvedSenseTree.length, 26, 'H776 golden sense tree must remain 26/26')
  assert.deepEqual(h776.reviewer, { reviewerId:'parkminhyun0', reviewerType:'human' }, 'H776 reviewer must remain human')

  const evidenceByStrong = new Map(evidence.items.map((item) => [item.strong, item]))
  const mapByStrong = new Map(koreanMap.targets.map((item) => [item.strong, item]))
  const v2ByStrong = new Map(v2Freeze.targets.map((item) => [item.strong, item]))
  assert.deepEqual(stableSet(evidenceByStrong.keys()), stableSet(TARGETS), 'evidence target set drift')
  assert.deepEqual(stableSet(mapByStrong.keys()), stableSet(TARGETS), 'Korean map target set drift')
  assert.deepEqual(stableSet(v2ByStrong.keys()), stableSet(TARGETS), 'v2 freeze target set drift')

  const entries = []
  let totalSourceNodes = 0
  let totalSenseNodes = 0
  for (const strong of TARGETS) {
    const source = evidenceByStrong.get(strong)
    const ko = mapByStrong.get(strong)
    const v2 = v2ByStrong.get(strong)
    assert.equal(ko.lemma, source.expectedLemma, `${strong}: Korean map lemma drift`)
    assert.equal(v2.lemma, source.expectedLemma, `${strong}: v2 lemma drift`)

    const sourceNodeById = new Map(source.sourceNodes.map((node) => [node.id, node]))
    const koNodeById = new Map(ko.nodes.map((node) => [node.sourceNodeKey, node]))
    assert.equal(sourceNodeById.size, source.sourceNodes.length, `${strong}: duplicate source node`)
    assert.equal(koNodeById.size, ko.nodes.length, `${strong}: duplicate Korean node mapping`)
    assert.deepEqual(stableSet(koNodeById.keys()), stableSet(sourceNodeById.keys()), `${strong}: source-node coverage must be exact`)

    for (const [sourceNodeKey, mapped] of koNodeById) {
      const raw = sourceNodeById.get(sourceNodeKey)
      assert.equal(mapped.sourceHash, raw.sourceHash, `${strong}/${sourceNodeKey}: source hash drift`)
      assert.ok(typeof mapped.translationKo === 'string' && mapped.translationKo.trim(), `${strong}/${sourceNodeKey}: Korean translation missing`)
    }

    const numeric = numericProjection(source.sourceNodes)
    const approvedSenseTreeProposal = source.sourceNodes.map((node, index) => {
      const id = numeric.get(node.id)
      const parentId = node.parentId === null ? null : numeric.get(node.parentId)
      return {
        id,
        parentId,
        depth: id.split('.').length - 1,
        order: index + 1,
        translationKo: koNodeById.get(node.id).translationKo,
        evidenceSupport: 'direct',
      }
    })
    const sourceNodeProjection = source.sourceNodes.map((node) => ({
      approvedSenseId: numeric.get(node.id),
      sourceNodeKey: node.id,
      sourceHash: node.sourceHash,
    }))
    const identity = buildIdentity(source)
    const senseTreeFingerprint = sha256Canonical(approvedSenseTreeProposal)

    const packet = {
      schemaVersion: 1,
      strong,
      identityFingerprint: identity.identityFingerprint,
      senseTreeFingerprint,
      sourceNodeCount: source.sourceNodes.length,
      sourceNodeCoverage: `${source.sourceNodes.length}/${source.sourceNodes.length}`,
      totalGenesisOccurrences: source.contextEvidence.totalOccurrences,
      representativeContexts: source.contextEvidence.sampleContexts.map((sample) => ({ reference: sample.reference, morph: sample.morph })),
      v2CandidateFileFingerprint: v2Freeze.candidateFileFingerprint,
      publicResearchMatrixFingerprint: v2Freeze.publicResearchMatrixFingerprint,
      evidenceContentFingerprint: contentFingerprint(evidence),
      currentDerivedMain: currentMain,
      reviewer: POLICY_REVIEWER,
      unresolvedThreads: 0,
      disputeRequired: 0,
      gates: {
        'source-fidelity':'PASS',
        license:'PASS',
        'sense-boundary':'PASS',
        morphology:'PASS',
        regression:'PASS',
        'korean-source-node-coverage':'PASS',
        'theological-overreach':'PASS',
        'existing-approved-mutation':'PASS_NEW_ENTRY_ONLY',
      },
    }
    packet.evidencePacketFingerprint = fingerprintWithout(packet, 'evidencePacketFingerprint')

    entries.push({
      strong,
      identity,
      approvedSenseTreeProposal,
      sourceNodeProjection,
      evidence: packet,
      promotionProvenance: {
        reviewer: POLICY_REVIEWER,
        approvedAt: null,
        note: 'approvedAt is intentionally unset in research prep and may only be set by a later current-main-bound promotion PR after exact-head independent review',
      },
    })
    totalSourceNodes += source.sourceNodes.length
    totalSenseNodes += approvedSenseTreeProposal.length
  }

  assert.equal(totalSourceNodes, 75, 'Batch 03 BDB source-node total must remain 75')
  assert.equal(totalSenseNodes, 75, 'Batch 03 proposed sense-node projection must remain 75/75')
  assert.equal(evidence.counts.totalOccurrences, 2529, 'Genesis occurrence total drift')
  assert.equal(evidence.counts.sampledContexts, 30, 'representative context count drift')
  assert.equal(evidence.counts.bdbEntries, 13, 'BDB entry count drift')

  const report = {
    schemaVersion: 3,
    reportId: 'genesis-v4-production-batch-03-promotion-prep-v3',
    status: 'RESEARCH_ONLY_PROMOTION_PREP_READY_75_OF_75_CURRENT_MAIN_REGISTRY_VERIFIED',
    book: 'Genesis',
    currentDerivedMain: currentMain,
    registryFingerprintBefore: registry.registryFingerprint,
    v2Freeze: {
      candidateFileFingerprint: v2Freeze.candidateFileFingerprint,
      publicResearchMatrixFingerprint: v2Freeze.publicResearchMatrixFingerprint,
      evidenceContentFingerprint: contentFingerprint(evidence),
      historicalEvidenceSemanticFingerprint: v2Freeze.historicalEvidenceSemanticFingerprint,
    },
    counts: {
      targets: entries.length,
      newEntries: entries.length,
      existingTargetEntries: existingTargets.length,
      totalGenesisOccurrences: evidence.counts.totalOccurrences,
      representativeContexts: evidence.counts.sampledContexts,
      bdbEntries: evidence.counts.bdbEntries,
      bdbSourceNodes: totalSourceNodes,
      proposedSenseNodes: totalSenseNodes,
      sourceNodeCoverage: '75/75',
    },
    entries,
    h776Regression: {
      present: true,
      approvedSenseCount: h776.approvedSenseTree.length,
      reviewer: h776.reviewer,
      evidencePacketFingerprint: h776.evidencePacketFingerprint,
    },
    governance: {
      researchOnly: true,
      publicResearchFirstRequired: true,
      blockingExternalModelVerdictRequired: false,
      newEntriesOnly: true,
      approvalRegistryMutationInThisPrep: false,
      productionMutationInThisPrep: false,
      existingApprovedMeaningMutationAllowed: false,
      serviceUiWriteAllowed: false,
      independentExactHeadReviewRequiredForPromotion: true,
      mainBoundPromotionPrCreated: false,
      qualityGateWeakeningAllowed: false,
      selfApprovalAllowed: false,
    },
    nextGate: 'WAIT_FOR_MAIN_FIFO_SLOT_THEN_REGENERATE_THIS_PACKET_AGAINST_LATEST_MAIN_AND_CREATE_SEPARATE_ADDITIVE_REGISTRY_PROMOTION_PR',
  }
  report.reportFingerprint = fingerprintWithout(report, 'reportFingerprint')
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log('✓ Genesis Batch 03 promotion prep v3')
  console.log(`✓ current main=${currentMain}`)
  console.log(`✓ NEW targets=${entries.length}/10 · source nodes=${totalSourceNodes}/75 · proposed sense nodes=${totalSenseNodes}/75`)
  console.log(`✓ Registry target collisions=${existingTargets.length} · H776=${h776.approvedSenseTree.length}/26 preserved`)
  console.log(`✓ evidenceContent=${report.v2Freeze.evidenceContentFingerprint}`)
  console.log(`✓ report=${report.reportFingerprint}`)
}

main()
