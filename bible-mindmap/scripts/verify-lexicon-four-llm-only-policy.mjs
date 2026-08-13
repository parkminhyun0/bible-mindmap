#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const APP = process.cwd()
const ROOT = path.resolve(APP,'..')
const policy = fs.readFileSync(path.resolve(ROOT,'docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md'),'utf8')
const gate = JSON.parse(fs.readFileSync(path.resolve(APP,'data/lexicon/luke-g2-execution-gate.json'),'utf8'))

for (const token of ['GPT','자비스','Claude','Gemini','sourceUnitCount','koMappedUnitCount','HOLD/DISPUTE']) assert.ok(policy.includes(token))
assert.deepEqual(gate.allowedActors,['gpt','jarvis','claude','gemini'])
assert.equal(gate.executionPolicy.localModelExecutionAllowed,false)
assert.equal(gate.executionPolicy.unlistedLlmAllowed,false)
assert.equal(gate.adjudication.perEntryUserSemanticApprovalRequired,false)
assert.equal(gate.adjudication.threeOfThreeConsensusAuthorityAllowed,false)
assert.equal(gate.adjudication.r4PerEntryHumanFinalWordingRequired,false)

for (const relative of [
  '.github/workflows/luke-lexicon-g2-zero-cost.yml',
  '.github/workflows/genesis-g2-zero-cost.yml',
  'bible-mindmap/scripts/ai/lexicon/run-luke-g2-local-ollama.mjs',
  'bible-mindmap/scripts/ai/lexicon/run-genesis-g2-local-ollama.mjs'
]) assert.equal(fs.existsSync(path.resolve(ROOT,relative)),false,`retired path reintroduced: ${relative}`)

console.log('✓ Fixed Four + unified Full-Fidelity policy PASS')
