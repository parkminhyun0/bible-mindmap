#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_INPUT = resolve(process.cwd(), 'reports/genesis-p5-candidate-inputs.json')
const SHA256 = /^sha256:[a-f0-9]{64}$/
const STRONG = /^H[1-9][0-9]*[a-z]?$/

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
const sha256 = (value) => `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

export function verifyGenesisP5CandidateInputs(bundle) {
  assert.equal(bundle?.schemaVersion, 1)
  assert.equal(bundle?.bundleId, 'genesis-p5-gpt-candidate-inputs-v1')
  assert.equal(bundle?.book, 'GEN')
  assert.equal(bundle?.phase, 'P5_GENESIS_CANDIDATE_GENERATION')
  assert.equal(bundle?.goldenControlExcluded, 'H776')
  assert.equal(bundle?.governance?.publicFirst, true)
  assert.equal(bundle?.governance?.gptPrimaryCandidateGenerator, true)
  assert.equal(bundle?.governance?.sourceOnly, true)
  assert.equal(bundle?.governance?.translationStarted, false)
  assert.equal(bundle?.governance?.candidateGenerationAllowed, true)
  assert.equal(bundle?.governance?.sourceNodeMutationAllowed, false)
  for (const key of ['approvalRegistryWriteAllowed','serviceUiWriteAllowed','productionWriteAllowed','existingApprovedMeaningMutationAllowed']) {
    assert.equal(bundle?.governance?.[key], false, `${key} must remain false`)
  }
  assert.equal(bundle?.counts?.goldBaseItems, 25)
  assert.equal(bundle?.counts?.candidateBaseItems, 24)
  assert.equal(bundle?.counts?.candidateUnits, 27)
  assert.equal(bundle?.counts?.extendedBaseItems, 3)
  assert.ok(Number.isInteger(bundle?.counts?.sourceNodes) && bundle.counts.sourceNodes > 0)
  assert.ok(Array.isArray(bundle?.units) && bundle.units.length === 27)
  assert.equal(new Set(bundle.units.map((unit) => unit.unitId)).size, 27)
  assert.equal(new Set(bundle.units.map((unit) => unit.baseStrong)).size, 24)
  assert.equal(bundle.units.some((unit) => unit.baseStrong === 'H776' || unit.sourceStrong === 'H776'), false)

  let nodeTotal = 0
  for (const unit of bundle.units) {
    assert.match(unit.baseStrong, /^H[1-9][0-9]*$/)
    assert.match(unit.sourceStrong, STRONG)
    assert.equal(unit.unitId, `GEN-P5-${unit.baseStrong}-${unit.sourceStrong}`)
    assert.ok(['direct-base','tahot-extended'].includes(unit.resolution?.mode))
    if (unit.resolution.mode === 'tahot-extended') {
      assert.ok(/[a-z]$/.test(unit.sourceStrong), `${unit.sourceStrong}: Extended Strong suffix must be preserved`)
      assert.ok(unit.resolution.tahotVariant?.tahotStrong)
    }
    assert.ok(String(unit.lexicalIdentity?.lemma || '').trim())
    assert.ok(String(unit.lexicalIdentity?.lemmaNormalized || '').trim())
    assert.match(unit.source?.sourceFingerprint || '', SHA256)
    assert.match(unit.source?.parserOutputFingerprint || '', SHA256)
    assert.ok(Number.isInteger(unit.source?.nodeCount) && unit.source.nodeCount > 0)
    assert.equal(unit.source.nodes.length, unit.source.nodeCount)
    assert.equal(unit.candidateContract?.status, 'awaiting-gpt-candidate')
    assert.equal(unit.candidateContract?.preserveSourceNodeIdsExactly, true)
    assert.equal(unit.candidateContract?.sourceNodeMutationAllowed, false)
    assert.equal(unit.candidateContract?.candidateOnly, true)
    for (const key of ['approvalRegistryWriteAllowed','serviceUiWriteAllowed','productionWriteAllowed']) {
      assert.equal(unit.candidateContract?.[key], false, `${unit.unitId}: ${key} must remain false`)
    }
    const seen = new Set()
    unit.source.nodes.forEach((node, index) => {
      assert.equal(node.order, index + 1, `${unit.unitId}: source node order drift`)
      assert.ok(!seen.has(node.sourceNodeId), `${unit.unitId}: duplicate sourceNodeId ${node.sourceNodeId}`)
      seen.add(node.sourceNodeId)
      assert.ok(String(node.sourceText || '').trim(), `${unit.unitId}:${node.sourceNodeId} sourceText missing`)
      assert.ok(String(node.sourceLocator || '').trim(), `${unit.unitId}:${node.sourceNodeId} sourceLocator missing`)
      assert.equal(Object.hasOwn(node, 'textKo'), false, `${unit.unitId}: candidate translation leaked into source bundle`)
      assert.equal(Object.hasOwn(node, 'translationKo'), false, `${unit.unitId}: approved translation leaked into source bundle`)
    })
    nodeTotal += unit.source.nodeCount
  }
  assert.equal(nodeTotal, bundle.counts.sourceNodes)
  const extended = Object.fromEntries(
    [...new Set(bundle.units.filter((unit) => unit.resolution.mode === 'tahot-extended').map((unit) => unit.baseStrong))]
      .sort()
      .map((base) => [base, bundle.units.filter((unit) => unit.baseStrong === base).map((unit) => unit.sourceStrong).sort()]),
  )
  assert.deepEqual(extended, {
    H1254: ['H1254a'],
    H6030: ['H6030b'],
    H834: ['H834a','H834b','H834c','H834d'],
  })
  assert.match(bundle.sourceEvidence?.openscriptures?.aggregateFingerprint || '', SHA256)
  assert.match(bundle.sourceEvidence?.tahot?.aggregateFingerprint || '', SHA256)
  assert.match(bundle.bundleFingerprint || '', SHA256)
  const { bundleFingerprint, ...withoutFingerprint } = bundle
  assert.equal(bundleFingerprint, sha256(withoutFingerprint), 'bundleFingerprint drift')
  return { unitCount: bundle.units.length, baseCount: new Set(bundle.units.map((unit) => unit.baseStrong)).size, nodeCount: nodeTotal }
}

const input = process.argv.find((arg) => arg.startsWith('--input='))?.slice(8) || DEFAULT_INPUT
const result = verifyGenesisP5CandidateInputs(readJson(resolve(input)))
console.log(`✓ Genesis P5 GPT candidate source inputs · bases=${result.baseCount} · units=${result.unitCount} · nodes=${result.nodeCount} · H776 excluded`)
