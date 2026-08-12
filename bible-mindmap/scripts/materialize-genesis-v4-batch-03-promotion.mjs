#!/usr/bin/env node

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildLexiconApprovalRegistry } from './build-lexicon-approval-registry.mjs'
import { buildLexiconManifest } from './build-lexicon-manifest.mjs'
import { buildLexiconShards } from './build-lexicon-shards.mjs'
import { buildLexiconPublicDelivery } from './build-lexicon-public-delivery.mjs'
import { buildSnapshotFromRegistry } from './verify-lexicon-registry-universal-regression.mjs'
import { fingerprintWithout, sha256Canonical } from './lib/lexicon-evidence-verifier.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const TARGETS = ['H413','H834','H3605','H935','H3808','H1931','H3290','H251','H3205','H8141']
const REVIEWER = { reviewerId:'lexicon-v4-evidence-and-gate', reviewerType:'evidence-policy' }

function arg(name, fallback = null) {
  const value = process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3)
  return value ? path.resolve(process.cwd(), value) : fallback
}
function rawArg(name, fallback = null) {
  return process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')) }
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive:true })
  fs.writeFileSync(file, `${JSON.stringify(value)}\n`, 'utf8')
}
function lockEntry(entry) {
  return {
    canonicalStrong: entry.identity.canonicalStrong,
    identityFingerprint: entry.identity.identityFingerprint,
    evidencePacketFingerprint: entry.evidencePacketFingerprint,
    approvedAt: entry.approvedAt,
    senseCount: entry.approvedSenseTree.length,
    senseTreeFingerprint: sha256Canonical(entry.approvedSenseTree),
  }
}

function patchLoaderVerifier() {
  const file = path.join(ROOT, 'scripts/verify-lexicon-delivery-loader.mjs')
  let src = fs.readFileSync(file, 'utf8')
  const hardcoded = "assert.equal(Object.keys(expected.shards).length, 6, 'Genesis R3 promotion must publish six approved lazy shards including H776');"
  const structural = `assert.equal(\n  Object.keys(expected.shards).length,\n  new Set(publicRegistry.entries.map((entry) => entry.shardPath)).size,\n  'public shard count must match unique approved Registry routes',\n);`
  assert.ok(src.includes(hardcoded), 'expected historical six-shard assertion missing')
  src = src.replace(hardcoded, structural)
  src = src.replace(
    "console.log('  approved entries=6 · H776 human 26/26 preserved · R3 Evidence-policy entries lazy-delivered');",
    "console.log(`  approved entries=${approvalRegistry.entries.length} · H776 human 26/26 preserved · Evidence-policy entries lazy-delivered`);",
  )
  fs.writeFileSync(file, src, 'utf8')
}

function writeDedicatedVerifier() {
  const file = path.join(ROOT, 'scripts/verify-genesis-v4-batch-03-registry-promotion.mjs')
  const source = `#!/usr/bin/env node\n\nimport assert from 'node:assert/strict'\nimport fs from 'node:fs'\nimport path from 'node:path'\nimport { fileURLToPath } from 'node:url'\nimport { buildLexiconApprovalRegistry } from './build-lexicon-approval-registry.mjs'\nimport { buildLexiconManifest } from './build-lexicon-manifest.mjs'\nimport { buildLexiconShards } from './build-lexicon-shards.mjs'\nimport { buildLexiconPublicDelivery } from './build-lexicon-public-delivery.mjs'\nimport { buildSnapshotFromRegistry } from './verify-lexicon-registry-universal-regression.mjs'\nimport { fingerprintWithout, sha256Canonical } from './lib/lexicon-evidence-verifier.mjs'\n\nconst ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')\nconst TARGETS = ['H413','H834','H3605','H935','H3808','H1931','H3290','H251','H3205','H8141']\nconst read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'))\nconst registry = read('data/lexicon/approval-registry.json')\nconst prep = read('reports/genesis-v4-production-batch-03-promotion-prep-v3.json')\nconst promotion = read('reports/genesis-v4-production-batch-03-promotion-evidence-v3.json')\nassert.equal(prep.status, 'RESEARCH_ONLY_PROMOTION_PREP_READY_75_OF_75_CURRENT_MAIN_REGISTRY_VERIFIED')\nassert.equal(promotion.status, 'BATCH_03_ADDITIVE_REGISTRY_PROMOTION_PROPOSED_AWAITING_EXACT_HEAD_REVIEW_AND_MERGE')\nassert.equal(promotion.baseMain, prep.currentDerivedMain)\nassert.deepEqual(promotion.targets, TARGETS)\nassert.equal(promotion.targetCount, 10)\nassert.equal(promotion.promotedSenseNodes, 75)\nassert.equal(promotion.existingApprovedMutationCount, 0)\nassert.equal(registry.entries.length, promotion.registryEntryCountAfter)\nassert.equal(registry.registryFingerprint, fingerprintWithout(registry,'registryFingerprint'))\nassert.equal(registry.registryFingerprint, promotion.registryFingerprintAfter)\nconst byStrong = new Map(registry.entries.map(e => [e.identity.canonicalStrong,e]))\nfor (const lock of promotion.existingEntryLocks) {\n  const e = byStrong.get(lock.canonicalStrong)\n  assert.ok(e, lock.canonicalStrong + ': existing entry deleted')\n  assert.equal(e.identity.identityFingerprint, lock.identityFingerprint, lock.canonicalStrong + ': identity drift')\n  assert.equal(e.evidencePacketFingerprint, lock.evidencePacketFingerprint, lock.canonicalStrong + ': evidence drift')\n  assert.equal(e.approvedAt, lock.approvedAt, lock.canonicalStrong + ': approvedAt drift')\n  assert.equal(e.approvedSenseTree.length, lock.senseCount, lock.canonicalStrong + ': sense count drift')\n  assert.equal(sha256Canonical(e.approvedSenseTree), lock.senseTreeFingerprint, lock.canonicalStrong + ': sense tree drift')\n}\nconst prepByStrong = new Map(prep.entries.map(e => [e.strong,e]))\nfor (const strong of TARGETS) {\n  const e = byStrong.get(strong); const p = prepByStrong.get(strong)\n  assert.ok(e && p, strong + ': promotion target missing')\n  assert.deepEqual(e.identity, p.identity, strong + ': identity != prep')\n  assert.deepEqual(e.approvedSenseTree, p.approvedSenseTreeProposal, strong + ': sense tree != 75-node prep projection')\n  assert.deepEqual(e.reviewer, p.evidence.reviewer, strong + ': reviewer provenance drift')\n  assert.equal(e.reviewer.reviewerType, 'evidence-policy')\n  assert.equal(e.evidencePacketFingerprint, p.evidence.evidencePacketFingerprint, strong + ': packet fingerprint drift')\n  assert.equal(e.approvedAt, promotion.approvedAt, strong + ': promotion timestamp drift')\n  assert.equal(p.sourceNodeProjection.length, p.approvedSenseTreeProposal.length, strong + ': source projection mismatch')\n}\nassert.equal(TARGETS.reduce((n,s)=>n+byStrong.get(s).approvedSenseTree.length,0),75,'Batch 03 must promote 75/75 BDB-aligned sense nodes')\nassert.deepEqual(buildLexiconApprovalRegistry(registry.entries), registry, 'Registry deterministic rebuild drift')\nassert.deepEqual(read('data/lexicon/manifest.json'), buildLexiconManifest(registry), 'data manifest drift')\nfor (const shard of buildLexiconShards(registry)) assert.deepEqual(read('data/lexicon/shards/'+shard.shardId+'.json'), shard, shard.shardId+': data shard drift')\nconst delivery = buildLexiconPublicDelivery(registry)\nassert.deepEqual(read('public/lexicon/ko/registry.json'), delivery.registry, 'public registry drift')\nfor (const lang of ['hebrew','aramaic','greek']) assert.deepEqual(read('public/lexicon/ko/manifests/'+lang+'.json'), delivery.manifests[lang], lang+': public manifest drift')\nfor (const [rel,shard] of Object.entries(delivery.shards)) assert.deepEqual(read('public/lexicon/ko/'+rel), shard, rel+': public shard drift')\nassert.deepEqual(read('data/lexicon/v4/registry-snapshot.json'), buildSnapshotFromRegistry(registry), 'universal Registry snapshot drift')\nconst h776 = byStrong.get('H776')\nassert.equal(h776.approvedSenseTree.length,26,'H776 golden regression')\nassert.deepEqual(h776.reviewer,{reviewerId:'parkminhyun0',reviewerType:'human'},'H776 reviewer regression')\nassert.equal(promotion.serviceUiWrite,false)\nassert.equal(promotion.existingApprovedMeaningMutationAllowed,false)\nassert.equal(promotion.effectiveOnlyAfterIndependentReviewAndMerge,true)\nassert.equal(promotion.selfApprovalAllowed,false)\nconsole.log('✓ Genesis Batch 03 additive Registry promotion contract PASS')\nconsole.log('  targets=10 · source/sense=75/75 · existing mutation=0 · H776=26/26')\nconsole.log(\`  Registry entries=\${registry.entries.length} · public shards=\${Object.keys(delivery.shards).length}\`)\n`
  fs.writeFileSync(file, source, 'utf8')
}

function main() {
  const prepPath = arg('prep')
  const approvedAt = rawArg('approved-at')
  const expectedMain = rawArg('expected-main')
  assert.ok(prepPath && approvedAt && expectedMain, '--prep, --approved-at and --expected-main required')
  assert.match(expectedMain, /^[0-9a-f]{40}$/)
  assert.match(approvedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  const prep = readJson(prepPath)
  assert.equal(prep.currentDerivedMain, expectedMain, 'promotion prep must be regenerated against exact promotion base main')
  assert.equal(prep.status, 'RESEARCH_ONLY_PROMOTION_PREP_READY_75_OF_75_CURRENT_MAIN_REGISTRY_VERIFIED')
  assert.equal(prep.counts.targets, 10)
  assert.equal(prep.counts.newEntries, 10)
  assert.equal(prep.counts.existingTargetEntries, 0)
  assert.equal(prep.counts.bdbSourceNodes, 75)
  assert.equal(prep.counts.proposedSenseNodes, 75)
  assert.equal(prep.counts.sourceNodeCoverage, '75/75')

  const registryPath = path.join(ROOT, 'data/lexicon/approval-registry.json')
  const before = readJson(registryPath)
  assert.equal(before.registryFingerprint, prep.registryFingerprintBefore, 'pre-promotion Registry fingerprint drift')
  const existingEntryLocks = before.entries.map(lockEntry)
  const existing = new Set(before.entries.map(e => e.identity.canonicalStrong))
  assert.deepEqual(TARGETS.filter(s => existing.has(s)), [], 'promotion targets must remain NEW')

  const promoted = prep.entries.map((item) => {
    assert.ok(TARGETS.includes(item.strong))
    assert.deepEqual(item.evidence.reviewer, REVIEWER)
    assert.equal(item.promotionProvenance.approvedAt, null)
    assert.equal(item.sourceNodeProjection.length, item.approvedSenseTreeProposal.length)
    return {
      identity: item.identity,
      approvedSenseTree: item.approvedSenseTreeProposal,
      reviewer: REVIEWER,
      approvedAt,
      evidencePacketFingerprint: item.evidence.evidencePacketFingerprint,
    }
  })
  assert.equal(promoted.reduce((n,e)=>n+e.approvedSenseTree.length,0),75)
  const registry = buildLexiconApprovalRegistry([...before.entries, ...promoted])
  assert.equal(registry.entries.length, before.entries.length + 10)
  writeJson(registryPath, registry)

  const manifest = buildLexiconManifest(registry)
  writeJson(path.join(ROOT, 'data/lexicon/manifest.json'), manifest)
  const dataShards = buildLexiconShards(registry)
  const dataShardDir = path.join(ROOT, 'data/lexicon/shards')
  const expectedData = new Set(dataShards.map(s => `${s.shardId}.json`))
  for (const name of fs.readdirSync(dataShardDir).filter(n => n.endsWith('.json'))) assert.ok(expectedData.has(name), `unexpected pre-existing data shard: ${name}`)
  for (const shard of dataShards) writeJson(path.join(dataShardDir, `${shard.shardId}.json`), shard)

  const delivery = buildLexiconPublicDelivery(registry)
  const publicRoot = path.join(ROOT, 'public/lexicon/ko')
  writeJson(path.join(publicRoot, 'registry.json'), delivery.registry)
  for (const [lang,value] of Object.entries(delivery.manifests)) writeJson(path.join(publicRoot, `manifests/${lang}.json`), value)
  const publicShardDir = path.join(publicRoot, 'shards')
  fs.mkdirSync(publicShardDir, { recursive:true })
  const expectedPublic = new Set(Object.keys(delivery.shards).map(p => path.basename(p)))
  for (const name of fs.readdirSync(publicShardDir).filter(n => n.endsWith('.json'))) assert.ok(expectedPublic.has(name), `unexpected pre-existing public shard: ${name}`)
  for (const [rel,value] of Object.entries(delivery.shards)) writeJson(path.join(publicRoot, rel), value)

  writeJson(path.join(ROOT, 'data/lexicon/v4/registry-snapshot.json'), buildSnapshotFromRegistry(registry))
  writeJson(path.join(ROOT, 'reports/genesis-v4-production-batch-03-promotion-prep-v3.json'), prep)

  const promotion = {
    schemaVersion: 1,
    reportId: 'genesis-v4-production-batch-03-promotion-evidence-v3',
    status: 'BATCH_03_ADDITIVE_REGISTRY_PROMOTION_PROPOSED_AWAITING_EXACT_HEAD_REVIEW_AND_MERGE',
    baseMain: expectedMain,
    approvedAt,
    reviewer: REVIEWER,
    targets: TARGETS,
    targetCount: 10,
    promotedSenseNodes: 75,
    sourceNodeCoverage: '75/75',
    existingApprovedMutationCount: 0,
    registryEntryCountBefore: before.entries.length,
    registryEntryCountAfter: registry.entries.length,
    registryFingerprintBefore: before.registryFingerprint,
    registryFingerprintAfter: registry.registryFingerprint,
    promotionPrepFingerprint: prep.reportFingerprint,
    v2CandidateFileFingerprint: prep.v2Freeze.candidateFileFingerprint,
    publicResearchMatrixFingerprint: prep.v2Freeze.publicResearchMatrixFingerprint,
    evidenceContentFingerprint: prep.v2Freeze.evidenceContentFingerprint,
    existingEntryLocks,
    gates: {
      sourceFidelity:'PASS', license:'PASS', senseBoundary:'PASS', morphology:'PASS', regression:'PASS',
      koreanSourceNodeCoverage:'PASS_75_OF_75', theologicalOverreach:'PASS', existingApprovedMutation:'PASS_ZERO',
    },
    serviceUiWrite: false,
    existingApprovedMeaningMutationAllowed: false,
    effectiveOnlyAfterIndependentReviewAndMerge: true,
    selfApprovalAllowed: false,
    qualityGateWeakeningAllowed: false,
  }
  promotion.reportFingerprint = fingerprintWithout(promotion, 'reportFingerprint')
  writeJson(path.join(ROOT, 'reports/genesis-v4-production-batch-03-promotion-evidence-v3.json'), promotion)
  patchLoaderVerifier()
  writeDedicatedVerifier()

  console.log(`✓ materialized Batch 03 promotion · Registry ${before.entries.length} → ${registry.entries.length}`)
  console.log(`✓ targets=10 · senses=75/75 · data/public shards=${dataShards.length}`)
  console.log(`✓ Registry before=${before.registryFingerprint}`)
  console.log(`✓ Registry after=${registry.registryFingerprint}`)
  console.log(`✓ promotion evidence=${promotion.reportFingerprint}`)
}

main()
