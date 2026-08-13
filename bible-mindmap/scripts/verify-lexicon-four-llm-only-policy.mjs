#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const APP_ROOT=process.cwd(); const REPO_ROOT=path.resolve(APP_ROOT,'..')
const policy=fs.readFileSync(path.resolve(REPO_ROOT,'docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md'),'utf8')
const gate=JSON.parse(fs.readFileSync(path.resolve(APP_ROOT,'data/lexicon/luke-g2-execution-gate.json'),'utf8'))
const matrix=JSON.parse(fs.readFileSync(path.resolve(APP_ROOT,'data/lexicon/full-fidelity/tier-gate-matrix-v2.json'),'utf8'))
assert.deepEqual(gate.allowedActors,['gpt','jarvis','claude','gemini'])
assert.equal(gate.executionPolicy.localModelExecutionAllowed,false)
assert.equal(gate.executionPolicy.unlistedLlmAllowed,false)
assert.equal(gate.executionPolicy.adHocTieBreakerModelAllowed,false)
assert.equal(gate.adjudication.finalAdjudicator,'gpt')
assert.equal(gate.adjudication.perEntryUserSemanticApprovalRequired,false)
assert.deepEqual(matrix.requiredActors,['gpt','jarvis','claude','gemini'])
assert.equal(matrix.modelMajorityRuleProhibited,true)
assert.equal(matrix.perEntryUserSemanticApprovalRequired,false)
for(const token of ['GPT','자비스','Claude','Gemini','sourceUnitCount','koMappedUnitCount','HOLD','DISPUTE']) assert.ok(policy.includes(token),`policy token missing: ${token}`)
console.log('✓ lexicon Full-Fidelity fixed-four policy PASS')
