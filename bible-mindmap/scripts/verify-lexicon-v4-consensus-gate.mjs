#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const matrix = JSON.parse(readFileSync('data/lexicon/v4/tier-gate-matrix.json','utf8'))

export function assertConsensus(strong, tier, evidence = {}) {
  assert.ok(matrix.tiers[tier], `${strong}: unknown tier ${tier}`)
  assert.equal(matrix.modelMajorityRuleProhibited,true)
  assert.equal(matrix.threeOfThreeConsensusAuthorityProhibited,true)
  for (const gate of matrix.commonRequiredGates) {
    assert.equal(evidence.gates?.[gate]?.verdict,'PASS',`${strong}: ${gate} must PASS`)
  }
  if (tier === 'R3') assert.equal(evidence.publicLexicalTheologicalEvidence?.verdict,'PASS',`${strong}: R3 public evidence missing`)
  if (tier === 'R4') assert.equal(evidence.extendedPublicResearch?.verdict,'PASS',`${strong}: R4 extended research missing`)
  assert.equal(evidence.unresolved ?? 0,0,`${strong}: unresolved must be zero`)
  assert.equal(evidence.gptAdjudication?.verdict,'PASS',`${strong}: GPT public-evidence adjudication required`)
  return { strong, tier, verdict:'SEMANTIC_PASS_ELIGIBLE' }
}

function selfTest() {
  const gates = Object.fromEntries(matrix.commonRequiredGates.map((g)=>[g,{verdict:'PASS'}]))
  const base = { gates, unresolved:0, gptAdjudication:{verdict:'PASS'} }
  assert.equal(assertConsensus('TEST-R3','R3',{...base,publicLexicalTheologicalEvidence:{verdict:'PASS'}}).verdict,'SEMANTIC_PASS_ELIGIBLE')
  assert.equal(assertConsensus('TEST-R4','R4',{...base,extendedPublicResearch:{verdict:'PASS'}}).verdict,'SEMANTIC_PASS_ELIGIBLE')
  let refused=false
  try { assertConsensus('TEST-FAIL','R3',{...base,gates:{...gates,'source-completeness':{verdict:'FAIL'}},publicLexicalTheologicalEvidence:{verdict:'PASS'}}) } catch { refused=true }
  assert.equal(refused,true)
  console.log('✓ full-fidelity AND gate self-test PASS · model majority is not authority')
}

if (process.argv.includes('--self-test') || !process.env.CONSENSUS_INPUT) selfTest()
