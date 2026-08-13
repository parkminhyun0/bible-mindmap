#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
const gate=JSON.parse(fs.readFileSync('data/lexicon/luke-g2-execution-gate.json','utf8'))
const matrix=JSON.parse(fs.readFileSync('data/lexicon/full-fidelity/tier-gate-matrix-v2.json','utf8'))
assert.equal(gate.schemaVersion,3)
assert.equal(gate.gateId,'luke-g2-full-fidelity-evidence-v3')
assert.deepEqual(gate.allowedActors,['gpt','jarvis','claude','gemini'])
assert.equal(gate.fullFidelity.required,true)
assert.equal(gate.fullFidelity.sourceUnitToKoreanUnitExactMappingRequired,true)
assert.equal(gate.fullFidelity.qualifierCompletenessRequired,true)
assert.equal(gate.fullFidelity.morphologyBoundaryRequired,true)
assert.equal(gate.fullFidelity.provenanceCompleteRequired,true)
assert.equal(gate.fullFidelity.corpusAlignmentRequired,true)
assert.equal(gate.adjudication.perEntryUserSemanticApprovalRequired,false)
assert.equal(matrix.schemaVersion,2)
assert.deepEqual(matrix.requiredActors,['gpt','jarvis','claude','gemini'])
console.log('✓ Luke Full-Fidelity policy PASS')
