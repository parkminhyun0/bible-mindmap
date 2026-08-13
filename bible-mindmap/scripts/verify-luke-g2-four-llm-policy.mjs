#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const gate = JSON.parse(readFileSync('data/lexicon/luke-g2-execution-gate.json','utf8'))
const policy = readFileSync('../docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md','utf8')
const runbook = readFileSync('docs/luke-g2-four-llm-evidence-runbook.md','utf8')

assert.equal(gate.schemaVersion,3)
assert.deepEqual(gate.allowedActors,['gpt','jarvis','claude','gemini'])
assert.equal(gate.sourceAdmission.greekLexicalSenseTreeRightsPassRequired,true)
assert.equal(gate.sourceAdmission.greekLexicalSenseTreeRightsPass,false)
assert.equal(gate.sourceAdmission.tagntOrMorphgntMaySubstituteForLexicalSenseTree,false)
assert.equal(gate.fullFidelity.sourceUnitCountRequired,true)
assert.equal(gate.fullFidelity.koMappedUnitCountRequired,true)
assert.equal(gate.fullFidelity.completeSourceToKoreanTraceabilityRequired,true)
assert.equal(gate.fullFidelity.qualifierMismatchMustBeZero,true)
assert.equal(gate.fullFidelity.morphologyBoundaryMismatchMustBeZero,true)
assert.equal(gate.adjudication.unresolvedMustBeZeroForAutomaticSemanticPromotion,true)
assert.equal(gate.adjudication.perEntryUserSemanticApprovalRequired,false)
assert.equal(gate.adjudication.r4PerEntryHumanFinalWordingRequired,false)
assert.equal(gate.executionPolicy.localModelExecutionAllowed,false)
for (const token of ['sourceUnitCount','koMappedUnitCount','GPT · 자비스 · Claude · Gemini']) assert.ok(policy.includes(token))
for (const token of ['Full-Fidelity','sourceUnitCount','koMappedUnitCount']) assert.ok(runbook.includes(token))
console.log('✓ Luke G2 Full-Fidelity gate PASS')
