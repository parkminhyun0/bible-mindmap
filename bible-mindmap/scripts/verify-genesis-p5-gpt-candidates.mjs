#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const ROOT=process.env.TEST_ROOT||process.cwd()
const read=(p)=>JSON.parse(readFileSync(resolve(ROOT,p),'utf8'))
const stable=(v)=>Array.isArray(v)?`[${v.map(stable).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`:JSON.stringify(v)
const sha=(v)=>`sha256:${createHash('sha256').update(stable(v)).digest('hex')}`
const SHA=/^sha256:[a-f0-9]{64}$/
const FLAG=new Set(['polysemy','theological-sensitive','proper-name','uncertain-etymology','source-text-noisy'])
const input=read('reports/genesis-p5-candidate-inputs.json')
const manifest=read('data/lexicon/candidates/genesis-p5/manifest.json')
const approval=read('data/lexicon/approval-registry.json')
const schema=read('data/lexicon/schemas/TranslationRecord.schema.json')
assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema')
assert.ok(schema.$id.endsWith('/schemas/lexicon/TranslationRecord.schema.json'))
assert.equal(schema.additionalProperties,false)
for(const key of ['candidateId','baseStrong','sourceStrong','identity','risk','nodes','generator','governance','candidateFingerprint']) assert.ok(schema.required.includes(key),`TranslationRecord required field missing: ${key}`)
assert.equal(input.bundleId,'genesis-p5-gpt-candidate-inputs-v1')
assert.equal(input.counts.candidateUnits,27)
assert.equal(input.counts.sourceNodes,150)
assert.equal(manifest.bundleId,'genesis-p5-gpt-candidates-v1')
assert.equal(manifest.sourceInputBundleFingerprint,input.bundleFingerprint)
assert.equal(manifest.goldenControlExcluded,'H776')
assert.deepEqual(manifest.counts,{candidateBaseItems:24,candidateUnits:27,translatedSourceNodes:150,riskTiers:{R0:0,R1:10,R2:7,R3:5,R4:5}})
for(const key of ['approvalRegistryWriteAllowed','serviceUiWriteAllowed','productionWriteAllowed','existingApprovedMeaningMutationAllowed']) assert.equal(manifest.governance[key],false)
const {bundleFingerprint,...manifestRest}=manifest
assert.match(bundleFingerprint,SHA)
assert.equal(bundleFingerprint,sha(manifestRest),'candidate manifest fingerprint drift')
const candidates=[]
let shardNodes=0
for(const meta of manifest.shards){
  const shard=read(meta.path)
  assert.equal(shard.group,meta.group)
  assert.equal(shard.sourceInputBundleFingerprint,input.bundleFingerprint)
  assert.equal(shard.count,meta.count)
  assert.equal(shard.translatedSourceNodes,meta.translatedSourceNodes)
  const {shardFingerprint,...shardRest}=shard
  assert.equal(shardFingerprint,meta.shardFingerprint)
  assert.equal(shardFingerprint,sha(shardRest),`${meta.group}: shardFingerprint drift`)
  assert.equal(shard.candidates.length,shard.count)
  shardNodes+=shard.translatedSourceNodes
  candidates.push(...shard.candidates)
}
assert.equal(candidates.length,27)
assert.equal(shardNodes,150)
assert.equal(new Set(candidates.map((candidate)=>candidate.sourceStrong)).size,27)
assert.equal(new Set(candidates.map((candidate)=>candidate.baseStrong)).size,24)
assert.equal(candidates.some((candidate)=>candidate.baseStrong==='H776'||candidate.sourceStrong==='H776'),false,'H776 candidate is forbidden')
const inputByStrong=new Map(input.units.map((unit)=>[unit.sourceStrong,unit]))
const hasHangul=(value)=>/[가-힣]/u.test(String(value||''))
const hasHan=(value)=>/\p{Script=Han}/u.test(String(value||''))
const hasLatin=(value)=>/\p{Script=Latin}/u.test(String(value||''))
const riskCounts={R0:0,R1:0,R2:0,R3:0,R4:0}
for(const candidate of candidates){
  const unit=inputByStrong.get(candidate.sourceStrong)
  assert.ok(unit,`${candidate.sourceStrong}: input missing`)
  assert.equal(candidate.status,'candidate')
  assert.equal(candidate.baseStrong,unit.baseStrong)
  assert.equal(candidate.parserOutputFingerprint,unit.source.parserOutputFingerprint)
  assert.equal(candidate.sourceNodeCount,unit.source.nodeCount)
  assert.equal(candidate.nodes.length,unit.source.nodes.length)
  assert.deepEqual(candidate.nodes.map((node)=>node.sourceNodeId),unit.source.nodes.map((node)=>node.sourceNodeId),`${candidate.sourceStrong}: sourceNodeId/order drift`)
  assert.equal(candidate.identity.lemma,unit.lexicalIdentity.lemma)
  assert.equal(candidate.identity.lemmaNormalized,unit.lexicalIdentity.lemmaNormalized)
  assert.ok(hasHangul(candidate.identity.transliterationKo),`${candidate.sourceStrong}: transliterationKo needs Hangul`)
  assert.equal(hasLatin(candidate.identity.transliterationKo),false,`${candidate.sourceStrong}: transliterationKo contains Latin`)
  for(const field of ['primaryGlossKo','notesKo']){
    assert.ok(hasHangul(candidate.identity[field]),`${candidate.sourceStrong}.${field} needs Hangul`)
    assert.equal(hasHan(candidate.identity[field]),false,`${candidate.sourceStrong}.${field} contains Han`)
  }
  for(const node of candidate.nodes){
    assert.ok(hasHangul(node.textKo),`${candidate.sourceStrong}.${node.sourceNodeId}: textKo needs Hangul`)
    assert.equal(hasHan(node.textKo),false,`${candidate.sourceStrong}.${node.sourceNodeId}: textKo contains Han`)
    assert.ok(node.confidence>=0&&node.confidence<=1,`${candidate.sourceStrong}.${node.sourceNodeId}: confidence invalid`)
    node.riskFlags.forEach((flag)=>assert.ok(FLAG.has(flag),`${candidate.sourceStrong}: invalid node risk flag ${flag}`))
  }
  if(candidate.nodes.length>1) assert.equal(candidate.nodes.every((node)=>node.confidence===1),false,`${candidate.sourceStrong}: confidence must be calibrated`)
  riskCounts[candidate.risk.tier]+=1
  const expectedGate={R0:'CLAUDE_BATCH_AUDIT',R1:'CLAUDE_BATCH_AUDIT',R2:'CLAUDE_FULL_AUDIT',R3:'CLAUDE_FULL_AUDIT_THEN_GEMINI',R4:'CLAUDE_FULL_AUDIT_THEN_HUMAN'}[candidate.risk.tier]
  assert.equal(candidate.risk.nextGate,expectedGate)
  candidate.risk.flags.forEach((flag)=>assert.ok(FLAG.has(flag),`${candidate.sourceStrong}: invalid record risk flag ${flag}`))
  assert.equal(candidate.generator.role,'gpt-primary-candidate')
  assert.equal(candidate.generator.sourceOnly,true)
  assert.equal(candidate.generator.otherModelOutputUsed,false)
  for(const key of ['finalApprovalAllowed','approvalRegistryWriteAllowed','serviceUiWriteAllowed','productionWriteAllowed','existingApprovedMeaningMutationAllowed']) assert.equal(candidate.governance[key],false,`${candidate.sourceStrong}: ${key} must remain false`)
  const {candidateFingerprint,...candidateRest}=candidate
  assert.equal(candidateFingerprint,sha(candidateRest),`${candidate.sourceStrong}: candidateFingerprint drift`)
}
assert.deepEqual(riskCounts,manifest.counts.riskTiers)
for(const strong of ['H430','H1254a','H3117','H7307','H46']){
  const candidate=candidates.find((item)=>item.sourceStrong===strong)
  assert.equal(candidate.risk.tier,'R3',`${strong}: must remain R3`)
  assert.ok(candidate.risk.flags.includes('theological-sensitive'),`${strong}: theological-sensitive flag required`)
}
const r4Strongs=['H120','H6030b','H7650','H28','H39']
for(const strong of r4Strongs) assert.equal(candidates.find((item)=>item.sourceStrong===strong).risk.tier,'R4',`${strong}: must remain R4`)
const h776=approval.entries.find((entry)=>entry?.identity?.canonicalStrong==='H776')
assert.ok(h776,'H776 Approval Registry entry must remain present')
assert.equal(h776.approvedSenseTree.length,26,'H776 Approval Registry must remain 26/26')
const approvedStrongs=new Set(approval.entries.map((entry)=>entry?.identity?.canonicalStrong).filter(Boolean))
for(const strong of r4Strongs) assert.equal(approvedStrongs.has(strong),false,`${strong}: R4 candidate must not be promoted by downstream Registry state`)
console.log(`✓ Genesis P5 GPT candidates · bases=24 · units=27 · nodes=150 · R3=5 · R4=5 · H776 excluded · candidate write gates remain closed`)
