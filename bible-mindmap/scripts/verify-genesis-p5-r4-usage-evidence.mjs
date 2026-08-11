#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_INPUT = resolve(process.cwd(), 'reports/genesis-p5-r4-pinned-corpus-usage.json')
const DEFAULT_MANIFEST = resolve(process.cwd(), 'reports/genesis-p5-r4-pinned-corpus-usage-manifest.json')
const SHA256 = /^sha256:[a-f0-9]{64}$/
const CANDIDATE_BUNDLE_FP = 'sha256:a9ebdc22e34659332b84ced41118597feae70f18a742e8a5234968e902c9d261'
const SOURCE_INPUT_BUNDLE_FP = 'sha256:adc1c48a14b111ed8c7046a9274478f70cbd9a17a27532eebc81d9c29fcbdf1c'
const EXPECTED = Object.freeze({
  H120: { baseStrong: 'H120', corpusStrong: 'H120', count: 47, fp: 'sha256:7521aaf5b0f2992a23601a3a357262ced753e0932c7e7657a7045977edd92125' },
  H6030b: { baseStrong: 'H6030', corpusStrong: 'H6030', count: 19, fp: 'sha256:2f2014de76317122a4a605240ed5e2367c408d32583c0046a827af59707b5fbb' },
  H7650: { baseStrong: 'H7650', corpusStrong: 'H7650', count: 19, fp: 'sha256:c7ffb8646a26cd58e3ac239eb782faa171acb6ca7af215072fa97f13fd9013d2' },
  H28: { baseStrong: 'H28', corpusStrong: 'H28', count: 1, fp: 'sha256:0e14d5b1a36b874475ab4480012b4aaffc44e5af0a3f27d109ea799df58bd6a4' },
  H39: { baseStrong: 'H39', corpusStrong: 'H39', count: 1, fp: 'sha256:27bf6bf5e378efa24f39481ade6875f63c86c2f04533d7f3e106934d343a543d' },
})
const digest = (raw) => `sha256:${createHash('sha256').update(raw).digest('hex')}`

export function verifyGenesisP5R4UsageEvidence(report, manifest, rawReport) {
  assert.equal(report?.schemaVersion, 1)
  assert.equal(report?.reportId, 'genesis-p5-r4-pinned-corpus-usage-v1')
  assert.equal(report?.book, 'GEN')
  assert.equal(report?.status, 'PINNED_CORPUS_USAGE_COMPLETE')
  assert.equal(report?.baseline?.candidateBundleFingerprint, CANDIDATE_BUNDLE_FP)
  assert.equal(report?.baseline?.sourceInputBundleFingerprint, SOURCE_INPUT_BUNDLE_FP)
  assert.equal(report?.source?.id, 'openscriptures-hebrew-bible-genesis')
  assert.equal(report?.source?.file, '.oshb-cache/Gen.xml')
  assert.match(report?.source?.digest || '', SHA256)
  assert.equal(report?.source?.windowRadius, 4)
  assert.equal(report?.source?.sampleLimit, 12)
  for (const key of ['candidateMutationAllowed','approvalRegistryWriteAllowed','serviceUiWriteAllowed','productionWriteAllowed','existingApprovedMeaningMutationAllowed','autoApprovalAllowed','humanFinalWordingAllowedAtThisStage']) assert.equal(report?.governance?.[key], false, `${key} must remain false`)
  assert.equal(report?.governance?.evidenceCollectionOnly, true)
  assert.ok(Array.isArray(report?.items) && report.items.length === 5)
  assert.deepEqual(new Set(report.items.map((item) => item.sourceStrong)), new Set(Object.keys(EXPECTED)))
  let occurrenceTotal = 0
  let sampleTotal = 0
  for (const item of report.items) {
    const expected = EXPECTED[item.sourceStrong]
    assert.ok(expected, `${item.sourceStrong}: unexpected R4 item`)
    assert.equal(item.baseStrong, expected.baseStrong)
    assert.equal(item.corpusStrong, expected.corpusStrong)
    assert.equal(item.candidateFingerprint, expected.fp)
    assert.equal(item.risk?.tier, 'R4')
    assert.equal(item.expectedOccurrences, expected.count)
    assert.equal(item.totalOccurrences, expected.count)
    assert.ok(Array.isArray(item.occurrences) && item.occurrences.length === expected.count)
    assert.ok(Array.isArray(item.sampleContexts) && item.sampleContexts.length >= 1 && item.sampleContexts.length <= 12)
    assert.equal(item.sampleContextIds.length, item.sampleContexts.length)
    assert.ok(Array.isArray(item.chapters) && item.chapters.length >= 1)
    assert.equal(item.firstReference, item.occurrences[0].reference)
    assert.equal(item.lastReference, item.occurrences.at(-1).reference)
    assert.equal(item.mapping, item.sourceStrong === 'H6030b' ? 'extended-source-to-base-corpus' : 'direct')
    for (const occurrence of item.occurrences) {
      assert.match(occurrence.reference || '', /^Gen\.\d+\.\d+$/)
      assert.equal(occurrence.corpusStrong, expected.corpusStrong)
      assert.ok(String(occurrence.surface || '').trim())
      assert.ok(String(occurrence.lemma || '').trim())
      assert.ok(String(occurrence.morph || '').trim())
      assert.ok(String(occurrence.verseText || '').trim())
      assert.ok(Array.isArray(occurrence.contextTokens) && occurrence.contextTokens.length > 0)
      assert.equal(occurrence.contextTokens.filter((token) => token.focus).length, 1)
    }
    occurrenceTotal += item.totalOccurrences
    sampleTotal += item.sampleContexts.length
  }
  assert.equal(occurrenceTotal, 87)
  assert.equal(report?.counts?.items, 5)
  assert.equal(report?.counts?.occurrences, occurrenceTotal)
  assert.equal(report?.counts?.sampledContexts, sampleTotal)
  assert.equal(report?.nextGate, 'THREE_MODEL_REAUDIT_ON_EXACT_PINNED_BASELINE')

  assert.equal(manifest?.schemaVersion, 1)
  assert.equal(manifest?.manifestId, 'genesis-p5-r4-pinned-corpus-usage-manifest-v1')
  assert.equal(manifest?.status, report.status)
  assert.deepEqual(manifest?.baseline, report.baseline)
  assert.equal(manifest?.source?.digest, report.source.digest)
  assert.equal(manifest?.source?.windowRadius, report.source.windowRadius)
  assert.equal(manifest?.source?.sampleLimit, report.source.sampleLimit)
  assert.equal(manifest?.ciEvidence?.generatedReportDigest, digest(rawReport), 'generated report digest drift')
  assert.equal(manifest?.counts?.items, report.counts.items)
  assert.equal(manifest?.counts?.occurrences, report.counts.occurrences)
  assert.equal(manifest?.counts?.sampledContexts, report.counts.sampledContexts)
  const manifestByStrong = new Map(manifest.items.map((item) => [item.sourceStrong, item]))
  for (const item of report.items) {
    const pinned = manifestByStrong.get(item.sourceStrong)
    assert.ok(pinned, `${item.sourceStrong}: manifest row missing`)
    assert.equal(pinned.baseStrong, item.baseStrong)
    assert.equal(pinned.corpusStrong, item.corpusStrong)
    assert.equal(pinned.candidateFingerprint, item.candidateFingerprint)
    assert.equal(pinned.occurrences, item.totalOccurrences)
    assert.deepEqual(pinned.chapters, item.chapters)
    assert.equal(pinned.firstReference, item.firstReference)
    assert.equal(pinned.lastReference, item.lastReference)
    assert.equal(pinned.sampleCount, item.sampleContexts.length)
  }
  assert.equal(manifest?.nextGate, report.nextGate)
  return { items: 5, occurrences: occurrenceTotal, samples: sampleTotal }
}

const input = process.argv.find((arg) => arg.startsWith('--input='))?.slice(8) || DEFAULT_INPUT
const manifestPath = process.argv.find((arg) => arg.startsWith('--manifest='))?.slice(11) || DEFAULT_MANIFEST
const raw = readFileSync(resolve(input), 'utf8')
const result = verifyGenesisP5R4UsageEvidence(JSON.parse(raw), JSON.parse(readFileSync(resolve(manifestPath), 'utf8')), raw)
console.log(`✓ Genesis P5 R4 usage evidence + manifest · items=${result.items} · occurrences=${result.occurrences} · samples=${result.samples} · Registry writes=0`)
