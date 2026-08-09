#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  PROVIDERS,
  createJobEnvelope,
  createStoredCandidate,
  sourceFingerprint,
  validateCandidate,
} from './ai/lexicon/genesis-g2-translation-contract.mjs'

const DEFAULT_SOURCE = 'reports/genesis-g2-bdb-source-packets.json'
const DEFAULT_OUTPUT_ROOT = 'reports/genesis-g2-blind-translation'
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

function fixturePacket() {
  return {
    packetId: 'genesis-g2-source:H1',
    strong: 'H1',
    category: 'self-test',
    sourcePacketStatus: 'ready',
    identity: { lemmas: ['אָב'], transliterations: ['ʾāb'], partOfSpeechCodes: ['N'], partOfSpeechLabels: ['Noun'], briefDefinitions: ['father'] },
    lexicalMappings: [{ strong: 'H1', bdbId: 'a.ae.ab' }],
    bdbEntries: [{ id: 'a.ae.ab', sourceHash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }],
    sourceNodes: [
      { id: 'bdb:a.ae.ab', parentId: null, nodeType: 'entry', label: 'entry', text: 'father', sourceHash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
      { id: 'bdb:a.ae.ab:s1', parentId: 'bdb:a.ae.ab', nodeType: 'sense', label: '1', text: 'father of an individual', sourceHash: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' },
    ],
    source: { sourceId: 'openscriptures-hebrewlexicon-bdb', versionRef: 'fixture', licenseStatus: 'verified-public-or-permitted' },
  }
}

function selfTest() {
  const packet = fixturePacket()
  for (const provider of PROVIDERS) {
    const envelope = createJobEnvelope(packet, provider)
    assert.equal(envelope.provider, provider)
    assert.equal(envelope.blindBoundary.otherProviderOutputIncluded, false)
    assert.equal(envelope.sourceFingerprint, sourceFingerprint(packet))
    const candidate = {
      strong: 'H1',
      sourceFingerprint: envelope.sourceFingerprint,
      transliterationKo: '아브',
      primaryGlossKo: '아버지',
      notesKo: '',
      nodes: envelope.source.nodes.map((node) => ({ sourceNodeId: node.sourceNodeId, textKo: '아버지', confidence: 0.9, riskFlags: [] })),
    }
    assert.equal(validateCandidate(candidate, envelope).passed, true)
    const stored = createStoredCandidate({
      envelope,
      providerResult: { model: 'fixture-model', requestId: 'fixture-request', usage: null },
      candidate,
      attempt: 1,
      generatedAt: '2026-08-09T00:00:00.000Z',
    })
    assert.equal(stored.governance.productionWriteAllowed, false)
    const broken = structuredClone(candidate)
    broken.nodes.pop()
    assert.equal(validateCandidate(broken, envelope).passed, false)
  }
  console.log('✓ Genesis G2 blind translation contract self-test passed')
}

function validateEnvelope(envelope, packet, provider, errors, where) {
  if (envelope.provider !== provider) errors.push(`${where}: provider mismatch`)
  if (envelope.strong !== packet.strong) errors.push(`${where}: strong mismatch`)
  if (envelope.sourceFingerprint !== sourceFingerprint(packet)) errors.push(`${where}: sourceFingerprint mismatch`)
  if (envelope.sourceNodeCount !== packet.sourceNodes.length) errors.push(`${where}: sourceNodeCount mismatch`)
  if (envelope.blindBoundary?.otherProviderOutputIncluded !== false) errors.push(`${where}: blind boundary missing`)
  if (envelope.blindBoundary?.crossProviderDirectoryReadAllowed !== false) errors.push(`${where}: cross-provider read not blocked`)
  if (envelope.blindBoundary?.productionWriteAllowed !== false) errors.push(`${where}: production write not blocked`)
  if (/candidates\/(?:nvidia|openai)/.test(JSON.stringify(envelope))) errors.push(`${where}: candidate directory leaked into envelope`)
}

function validateCandidateFile(candidate, packet, provider, errors, where) {
  const envelope = createJobEnvelope(packet, provider)
  if (candidate.provider !== provider) errors.push(`${where}: provider mismatch`)
  if (candidate.sourceFingerprint !== envelope.sourceFingerprint) errors.push(`${where}: sourceFingerprint mismatch`)
  if (candidate.status !== 'candidate') errors.push(`${where}: status must be candidate`)
  if (candidate.governance?.otherProviderOutputIncluded !== false) errors.push(`${where}: blind governance missing`)
  if (candidate.governance?.productionWriteAllowed !== false) errors.push(`${where}: production write must be false`)
  const validation = validateCandidate(candidate.payload, envelope)
  if (!validation.passed) errors.push(`${where}: ${validation.errors.join('; ')}`)
}

function main() {
  selfTest()
  const sourcePath = resolve(process.env.GENESIS_G2_SOURCE || DEFAULT_SOURCE)
  const outputRoot = resolve(process.env.GENESIS_G2_OUTPUT_ROOT || DEFAULT_OUTPUT_ROOT)
  if (!existsSync(sourcePath)) {
    console.log('✓ Genesis G2 source report absent — contract self-test only')
    return
  }
  const sourceSet = readJson(sourcePath)
  const packetMap = new Map(sourceSet.packets.map((packet) => [packet.strong, packet]))
  const errors = []
  for (const provider of PROVIDERS) {
    const envelopeDir = resolve(outputRoot, 'envelopes', provider)
    if (!existsSync(envelopeDir)) {
      errors.push(`${provider}: envelope directory missing`)
      continue
    }
    const files = readdirSync(envelopeDir).filter((file) => file.endsWith('.json')).sort()
    if (files.length !== sourceSet.counts.ready) errors.push(`${provider}: envelope count ${files.length}/${sourceSet.counts.ready}`)
    for (const file of files) {
      const envelope = readJson(resolve(envelopeDir, file))
      const packet = packetMap.get(envelope.strong)
      if (!packet) errors.push(`${provider}/${file}: unknown Strong`)
      else validateEnvelope(envelope, packet, provider, errors, `${provider}/${file}`)
    }

    const candidateDir = resolve(outputRoot, 'candidates', provider)
    if (existsSync(candidateDir)) {
      for (const file of readdirSync(candidateDir).filter((name) => name.endsWith('.json')).sort()) {
        const candidate = readJson(resolve(candidateDir, file))
        const packet = packetMap.get(candidate.strong)
        if (!packet) errors.push(`${provider}/candidates/${file}: unknown Strong`)
        else validateCandidateFile(candidate, packet, provider, errors, `${provider}/candidates/${file}`)
      }
    }
  }

  const nvidiaDir = resolve(outputRoot, 'envelopes', 'nvidia')
  const openaiDir = resolve(outputRoot, 'envelopes', 'openai')
  if (existsSync(nvidiaDir) && existsSync(openaiDir)) {
    for (const packet of sourceSet.packets.filter((item) => item.sourcePacketStatus === 'ready')) {
      const a = readJson(resolve(nvidiaDir, `${packet.strong}.json`))
      const b = readJson(resolve(openaiDir, `${packet.strong}.json`))
      if (a.blindGroupId !== b.blindGroupId) errors.push(`${packet.strong}: blindGroupId mismatch`)
      if (a.sourceFingerprint !== b.sourceFingerprint) errors.push(`${packet.strong}: provider source fingerprint mismatch`)
      if (a.jobId === b.jobId) errors.push(`${packet.strong}: provider jobId must differ`)
    }
  }

  if (errors.length) {
    console.error(`✗ Genesis G2 blind translation verification failed (${errors.length})`)
    errors.slice(0, 100).forEach((error) => console.error(`  - ${error}`))
    process.exit(1)
  }
  console.log(`✓ Genesis G2 blind translation verified · packets=${sourceSet.counts.ready} · providers=${PROVIDERS.length}`)
}

main()
