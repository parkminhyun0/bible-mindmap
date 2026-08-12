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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TARGETS = ['H413','H834','H3605','H935','H3808','H1931','H3290','H251','H3205','H8141']
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'))
const registry = read('data/lexicon/approval-registry.json')
const prep = read('reports/genesis-v4-production-batch-03-promotion-prep-v3.json')
const promotion = read('reports/genesis-v4-production-batch-03-promotion-evidence-v3.json')
assert.equal(prep.status, 'RESEARCH_ONLY_PROMOTION_PREP_READY_75_OF_75_CURRENT_MAIN_REGISTRY_VERIFIED')
assert.equal(promotion.status, 'BATCH_03_ADDITIVE_REGISTRY_PROMOTION_PROPOSED_AWAITING_EXACT_HEAD_REVIEW_AND_MERGE')
assert.equal(promotion.baseMain, prep.currentDerivedMain)
assert.deepEqual(promotion.targets, TARGETS)
assert.equal(promotion.targetCount, 10)
assert.equal(promotion.promotedSenseNodes, 75)
assert.equal(promotion.existingApprovedMutationCount, 0)
assert.equal(registry.entries.length, promotion.registryEntryCountAfter)
assert.equal(registry.registryFingerprint, fingerprintWithout(registry,'registryFingerprint'))
assert.equal(registry.registryFingerprint, promotion.registryFingerprintAfter)
const byStrong = new Map(registry.entries.map(e => [e.identity.canonicalStrong,e]))
for (const lock of promotion.existingEntryLocks) {
  const e = byStrong.get(lock.canonicalStrong)
  assert.ok(e, lock.canonicalStrong + ': existing entry deleted')
  assert.equal(e.identity.identityFingerprint, lock.identityFingerprint, lock.canonicalStrong + ': identity drift')
  assert.equal(e.evidencePacketFingerprint, lock.evidencePacketFingerprint, lock.canonicalStrong + ': evidence drift')
  assert.equal(e.approvedAt, lock.approvedAt, lock.canonicalStrong + ': approvedAt drift')
  assert.equal(e.approvedSenseTree.length, lock.senseCount, lock.canonicalStrong + ': sense count drift')
  assert.equal(sha256Canonical(e.approvedSenseTree), lock.senseTreeFingerprint, lock.canonicalStrong + ': sense tree drift')
}
const prepByStrong = new Map(prep.entries.map(e => [e.strong,e]))
for (const strong of TARGETS) {
  const e = byStrong.get(strong); const p = prepByStrong.get(strong)
  assert.ok(e && p, strong + ': promotion target missing')
  assert.deepEqual(e.identity, p.identity, strong + ': identity != prep')
  assert.deepEqual(e.approvedSenseTree, p.approvedSenseTreeProposal, strong + ': sense tree != 75-node prep projection')
  assert.deepEqual(e.reviewer, p.evidence.reviewer, strong + ': reviewer provenance drift')
  assert.equal(e.reviewer.reviewerType, 'evidence-policy')
  assert.equal(e.evidencePacketFingerprint, p.evidence.evidencePacketFingerprint, strong + ': packet fingerprint drift')
  assert.equal(e.approvedAt, promotion.approvedAt, strong + ': promotion timestamp drift')
  assert.equal(p.sourceNodeProjection.length, p.approvedSenseTreeProposal.length, strong + ': source projection mismatch')
}
assert.equal(TARGETS.reduce((n,s)=>n+byStrong.get(s).approvedSenseTree.length,0),75,'Batch 03 must promote 75/75 BDB-aligned sense nodes')
assert.deepEqual(buildLexiconApprovalRegistry(registry.entries), registry, 'Registry deterministic rebuild drift')
assert.deepEqual(read('data/lexicon/manifest.json'), buildLexiconManifest(registry), 'data manifest drift')
for (const shard of buildLexiconShards(registry)) assert.deepEqual(read('data/lexicon/shards/'+shard.shardId+'.json'), shard, shard.shardId+': data shard drift')
const delivery = buildLexiconPublicDelivery(registry)
assert.deepEqual(read('public/lexicon/ko/registry.json'), delivery.registry, 'public registry drift')
for (const lang of ['hebrew','aramaic','greek']) assert.deepEqual(read('public/lexicon/ko/manifests/'+lang+'.json'), delivery.manifests[lang], lang+': public manifest drift')
for (const [rel,shard] of Object.entries(delivery.shards)) assert.deepEqual(read('public/lexicon/ko/'+rel), shard, rel+': public shard drift')
assert.deepEqual(read('data/lexicon/v4/registry-snapshot.json'), buildSnapshotFromRegistry(registry), 'universal Registry snapshot drift')
const h776 = byStrong.get('H776')
assert.equal(h776.approvedSenseTree.length,26,'H776 golden regression')
assert.deepEqual(h776.reviewer,{reviewerId:'parkminhyun0',reviewerType:'human'},'H776 reviewer regression')
assert.equal(promotion.serviceUiWrite,false)
assert.equal(promotion.existingApprovedMeaningMutationAllowed,false)
assert.equal(promotion.effectiveOnlyAfterIndependentReviewAndMerge,true)
assert.equal(promotion.selfApprovalAllowed,false)
console.log('✓ Genesis Batch 03 additive Registry promotion contract PASS')
console.log('  targets=10 · source/sense=75/75 · existing mutation=0 · H776=26/26')
console.log(`  Registry entries=${registry.entries.length} · public shards=${Object.keys(delivery.shards).length}`)
