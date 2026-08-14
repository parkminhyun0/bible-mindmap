#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyCandidate } from './lib/lexicon-full-fidelity-handoff.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const WORKSPACE = resolve(ROOT, '..')
const readJson = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'))

const candidate = readJson('data/lexicon/handoff/genesis-h1254a-full-fidelity/candidate.json')
const presentation = readJson('data/lexicon/handoff/genesis-h1254a-full-fidelity/presentation.ko.json')
const registry = readJson('data/lexicon/approval-registry.json')
const policy = readFileSync(resolve(WORKSPACE, 'docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md'), 'utf8')
const pane = readFileSync(resolve(ROOT, 'src/components/ApprovedKoreanLexiconPane.jsx'), 'utf8')
const loader = readFileSync(resolve(ROOT, 'src/data/lexiconFullFidelityPresentation.js'), 'utf8')

assert.equal(classifyCandidate(candidate).classification, 'VERIFIER_READY', 'H1254a FF candidate must remain VERIFIER_READY')
assert.equal(presentation.schemaVersion, 1)
assert.equal(presentation.scope, 'old-testament-bdb-full-fidelity-presentation')
assert.equal(presentation.strong, 'H1254a')
assert.equal(presentation.candidateFingerprint, candidate.candidateFingerprint, 'presentation candidate fingerprint drift')
assert.equal(presentation.approvedEvidenceFingerprint, candidate.approvedBaseline.approvedEvidenceFingerprint, 'presentation approved evidence baseline drift')
assert.equal(presentation.sourceLocator, candidate.approvedBaseline.sourceLocator, 'presentation source locator drift')

const approved = registry.entries.find((entry) => entry.identity?.canonicalStrong === 'H1254a')
assert.ok(approved, 'H1254a approved Registry baseline missing')
assert.equal(approved.evidencePacketFingerprint, presentation.approvedEvidenceFingerprint, 'approved Evidence fingerprint mismatch')
assert.equal(approved.identity?.sourceRefs?.[0]?.locator, presentation.sourceLocator, 'approved source locator mismatch')

const approvedTextById = new Map((approved.approvedSenseTree || []).map((node) => [node.id, node.translationKo]))
assert.equal(candidate.nodes.length, approvedTextById.size, 'protected Korean node count drift')
for (const node of candidate.nodes) {
  assert.equal(approvedTextById.get(node.sourceNodeId), node.textKo, `protected Korean wording drift: ${node.sourceNodeId}`)
}

const sourceIds = new Set((candidate.sourceAccount || []).map((account) => account.accountId))
const presentationIds = new Set((presentation.sections || []).flatMap((section) => section.accountIds || []))
assert.equal(sourceIds.size, presentationIds.size, 'material BDB sourceAccount presentation count mismatch')
for (const id of sourceIds) {
  assert.ok(presentationIds.has(id), `missing presentation account: ${id}`)
  const display = presentation.accounts?.[id]
  assert.ok(display?.textKo?.trim(), `missing Korean presentation text: ${id}`)
}
for (const id of presentationIds) assert.ok(sourceIds.has(id), `unsupported presentation account: ${id}`)

for (const required of [
  'entire Old Testament, not Genesis only',
  'BDB form-list',
  'qualifiers and usage restrictions',
  'usage groups',
  'representative references',
  '`approvedSenseTree`-only rendering is not sufficient',
  'Genesis-only BDB Full-Fidelity presentation scope',
]) assert.ok(policy.includes(required), `OT Full-Fidelity mandatory policy missing: ${required}`)

assert.ok(loader.includes('candidateBaselineMatches'), 'presentation loader must fail closed against approved baseline')
assert.ok(loader.includes('expectedAccounts.size !== displayedAccounts.size'), 'presentation loader must reject source-account omissions')
assert.ok(pane.includes('getLexiconFullFidelityPresentation'), 'approved Korean pane must load Full-Fidelity presentation')
assert.ok(pane.includes('word-search-bdb-full-fidelity'), 'approved Korean pane must expose Full-Fidelity BDB structure')
assert.ok(pane.includes('BDB 구조 완전 표시'), 'approved Korean pane must visibly identify Full-Fidelity structure')

console.log(`✓ OT BDB Full-Fidelity presentation contract · H1254a sourceAccount=${sourceIds.size}/${presentationIds.size} · approvedNodes=${candidate.nodes.length}/${approvedTextById.size} · Registry mutation=0`)
