#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const DEFAULT_SELECTION = resolve(APP_ROOT, 'reports/luke-v4-production-batch-02-selection-2026-08-12.json')
const DEFAULT_CANDIDATE = resolve(APP_ROOT, 'reports/luke-v4-production-batch-02-source-candidate-prep-2026-08-12.json')
const DEFAULT_CONTRACT = resolve(APP_ROOT, 'reports/luke-v4-production-batch-02-context-materialization-contract-2026-08-12.json')
const DEFAULT_REGISTRY = resolve(APP_ROOT, 'data/lexicon/source-registry.json')
const DEFAULT_SOURCE_LOCK = resolve(APP_ROOT, 'data/lexicon/luke-g0-source-lock.json')
const DEFAULT_OUTPUT = resolve(APP_ROOT, 'reports/luke-v4-production-batch-02-context-morphology-evidence.json')
const TARGETS = ['G0006','G0007','G0009','G0011','G0012','G0015','G0018','G0020']

function arg(name, fallback) {
  const prefix = `--${name}=`
  const raw = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length)
  return raw ? resolve(process.cwd(), raw) : fallback
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function gitBlobSha(buffer) {
  return createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex')
}

function normalizeStrong(value) {
  const match = String(value || '').match(/G0*(\d+)/i)
  return match ? `G${String(Number(match[1])).padStart(4, '0')}` : null
}

function parseWordTransliteration(field) {
  const value = String(field || '').trim()
  const match = value.match(/^(.+?)\s+\(([^)]+)\)$/u)
  return match ? { word: match[1].trim(), transliteration: match[2].trim() } : { word: value, transliteration: '' }
}

function parseLemmaGloss(field) {
  const value = String(field || '').replace(/^\uFEFF/u, '').trim()
  if (!value) return { lemma: '', gloss: '' }
  const splitAt = value.indexOf('=')
  if (splitAt < 0) return { lemma: value.split(',')[0].trim(), gloss: '' }
  return { lemma: value.slice(0, splitAt).split(',')[0].trim(), gloss: value.slice(splitAt + 1).trim() }
}

function parseTagntLuke(content) {
  const tokens = []
  const tokenIds = new Set()
  for (const rawLine of content.split(/\r?\n/u)) {
    if (!rawLine.startsWith('Luk.')) continue
    const fields = rawLine.split('\t')
    const ref = fields[0]?.match(/^Luk\.(\d+)\.(\d+)#(\d+)/u)
    if (!ref || fields.length < 6 || !String(fields[5] || '').includes('SBL')) continue
    const chapter = Number(ref[1])
    const verse = Number(ref[2])
    const position = Number(ref[3])
    const tokenId = `Luke.${chapter}.${verse}.${position}`
    assert.equal(tokenIds.has(tokenId), false, `duplicate SBL token ${tokenId}`)
    tokenIds.add(tokenId)
    const { word, transliteration } = parseWordTransliteration(fields[1])
    const strong = normalizeStrong(fields[3])
    const morph = String(fields[3] || '').includes('=') ? String(fields[3]).slice(String(fields[3]).indexOf('=') + 1).trim() : ''
    const { lemma, gloss } = parseLemmaGloss(fields[4])
    tokens.push({
      tokenId,
      chapter,
      verse,
      position,
      ref: `Luke ${chapter}:${verse}`,
      word,
      transliteration,
      strong,
      morph,
      lemma: lemma.normalize('NFC'),
      gloss,
      editions: String(fields[5] || ''),
    })
  }
  return tokens.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse || a.position - b.position)
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function downloadPinnedTagnt(sourceRegistry, sourceLock) {
  const source = (sourceRegistry.sources || []).find((item) => item.sourceId === 'stepbible-tagnt')
  assert.ok(source, 'current-main stepbible-tagnt source registry entry missing')
  assert.equal(source.license?.status, 'approved')
  assert.equal(source.license?.expression, 'CC-BY-4.0')
  assert.equal(source.license?.externalLlmInputAllowed, true)
  assert.equal(source.workflow?.status, 'approved-ready')
  assert.equal(source.workflow?.autoProcessingAllowed, true)

  const commit = source.provenance?.version
  const datasetPath = sourceLock.sources?.tagnt?.path
  const expectedBlobSha = sourceLock.sources?.tagnt?.blobSha
  assert.ok(commit && datasetPath && expectedBlobSha, 'TAGNT pin incomplete')
  assert.ok((source.provenance?.datasetPaths || []).includes(datasetPath), 'G0 TAGNT path not present in current source registry')

  const encodedPath = datasetPath.split('/').map(encodeURIComponent).join('/')
  const url = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${commit}/${encodedPath}`
  const response = await fetch(url, { headers: { 'User-Agent': 'bible-mindmap-luke-v4-batch02' } })
  if (!response.ok) throw new Error(`TAGNT download failed: HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  assert.equal(gitBlobSha(buffer), expectedBlobSha, 'TAGNT git blob SHA drift')
  const text = buffer.toString('utf8')
  assert.ok(text.includes('Luk.'), 'TAGNT Luke rows missing')
  return { text, buffer, source, commit, datasetPath, expectedBlobSha }
}

async function main() {
  const selectionPath = arg('selection', DEFAULT_SELECTION)
  const candidatePath = arg('candidate', DEFAULT_CANDIDATE)
  const contractPath = arg('contract', DEFAULT_CONTRACT)
  const registryPath = arg('registry', DEFAULT_REGISTRY)
  const sourceLockPath = arg('source-lock', DEFAULT_SOURCE_LOCK)
  const outputPath = arg('out', DEFAULT_OUTPUT)

  const selectionRaw = readFileSync(selectionPath, 'utf8')
  const candidateRaw = readFileSync(candidatePath, 'utf8')
  const contractRaw = readFileSync(contractPath, 'utf8')
  const registryRaw = readFileSync(registryPath, 'utf8')
  const sourceLockRaw = readFileSync(sourceLockPath, 'utf8')
  const selection = JSON.parse(selectionRaw)
  const candidate = JSON.parse(candidateRaw)
  const contract = JSON.parse(contractRaw)
  const registry = JSON.parse(registryRaw)
  const sourceLock = JSON.parse(sourceLockRaw)

  assert.equal(registry.policyVersion, '1.2', 'current source registry policy drift')
  assert.equal(selection.selectedCount, 8)
  assert.equal(selection.selectedTokenCount, 41)
  assert.equal(contract.checks?.targetCount, 8)
  assert.equal(contract.checks?.expectedLukeTokens, 41)
  assert.equal(candidate.checks?.selectedCount, 8)
  assert.equal(candidate.checks?.candidatePrepared, 8)
  assert.deepEqual((selection.selected || []).map((item) => item.strong), TARGETS)
  assert.deepEqual((candidate.targets || []).map((item) => item.strong), TARGETS)

  const downloaded = await downloadPinnedTagnt(registry, sourceLock)
  const allTokens = parseTagntLuke(downloaded.text)
  assert.equal(allTokens.length, 19405, `Luke SBL token inventory drift: ${allTokens.length}`)
  const verses = new Map()
  for (const token of allTokens) {
    const key = `${token.chapter}:${token.verse}`
    if (!verses.has(key)) verses.set(key, [])
    verses.get(key).push(token)
  }

  const selectionByStrong = new Map(selection.selected.map((item) => [item.strong, item]))
  const candidateByStrong = new Map(candidate.targets.map((item) => [item.strong, item]))
  const items = []

  for (const strong of TARGETS) {
    const selected = selectionByStrong.get(strong)
    const proposed = candidateByStrong.get(strong)
    const occurrences = allTokens.filter((token) => token.strong === strong)
    assert.equal(occurrences.length, selected.tokenCount, `${strong}: TAGNT occurrence count drift`)
    assert.equal(occurrences[0]?.ref, selected.firstRef, `${strong}: first reference drift`)
    assert.equal(proposed.lukeUsage?.count, occurrences.length, `${strong}: candidate usage count drift`)
    assert.equal(proposed.lukeUsage?.firstRef, occurrences[0]?.ref, `${strong}: candidate first reference drift`)
    assert.ok(occurrences.every((token) => token.lemma), `${strong}: missing lemma`)
    assert.ok(occurrences.every((token) => token.morph), `${strong}: missing morphology`)
    assert.ok(occurrences.every((token) => token.word), `${strong}: missing surface`)

    const exactOccurrences = occurrences.map((token) => {
      const verseTokens = verses.get(`${token.chapter}:${token.verse}`) || []
      return {
        tokenId: token.tokenId,
        ref: token.ref,
        position: token.position,
        surface: token.word,
        transliteration: token.transliteration,
        strong: token.strong,
        morphology: token.morph,
        lemma: token.lemma,
        gloss: token.gloss,
        verseContext: verseTokens.map((context) => ({
          tokenId: context.tokenId,
          position: context.position,
          surface: context.word,
          strong: context.strong,
          morphology: context.morph,
          lemma: context.lemma,
          focus: context.tokenId === token.tokenId,
        })),
      }
    })

    const highRisk = ['G0012','G0015','G0018','G0020'].includes(strong)
    if (highRisk) assert.ok(proposed.tfLSJBoundary?.trim(), `${strong}: TFLSJ boundary required`)
    assert.ok(Array.isArray(proposed.koreanCandidate) && proposed.koreanCandidate.length >= 1, `${strong}: Korean candidate missing`)
    assert.ok(proposed.candidateNote?.trim(), `${strong}: candidate boundary note missing`)

    items.push({
      strong,
      lemma: selected.lemma,
      inventoryTransliteration: selected.transliteration,
      candidateTransliteration: proposed.transliteration,
      candidateMorphClass: proposed.morph,
      koreanCandidate: proposed.koreanCandidate,
      candidateNote: proposed.candidateNote,
      risk: proposed.risk,
      tbESG: proposed.tbESG,
      tfLSJBoundary: proposed.tfLSJBoundary,
      counts: {
        expectedTokens: selected.tokenCount,
        actualTokens: occurrences.length,
        distinctVerses: unique(occurrences.map((token) => token.ref)).length,
        distinctMorphologies: unique(occurrences.map((token) => token.morph)),
        exactContexts: exactOccurrences.length,
      },
      exactOccurrences,
    })
  }

  const derivedMain = process.env.DERIVED_MAIN || null
  assert.ok(derivedMain && /^[0-9a-f]{40}$/.test(derivedMain), 'DERIVED_MAIN required')
  const report = {
    schemaVersion: 1,
    track: 'luke-lexicon-v4',
    reportId: 'luke-v4-production-batch-02-context-morphology-evidence-v1',
    status: 'EXACT_TAGNT_CONTEXT_MORPHOLOGY_MATERIALIZED_CANDIDATE_BOUNDARY_PASS_AUDIT_FREEZE_NEXT',
    researchBranch: 'chatgpt/luke-v4-production-batch-02',
    derivedMain,
    staleContractDerivedMain: contract.derivedMain || null,
    inputs: {
      selection: { path: 'reports/luke-v4-production-batch-02-selection-2026-08-12.json', digest: sha256(selectionRaw) },
      candidatePrep: { path: 'reports/luke-v4-production-batch-02-source-candidate-prep-2026-08-12.json', digest: sha256(candidateRaw) },
      contextContract: { path: 'reports/luke-v4-production-batch-02-context-materialization-contract-2026-08-12.json', digest: sha256(contractRaw) },
      currentMainSourceRegistry: { policyVersion: registry.policyVersion, digest: sha256(registryRaw) },
      currentMainG0SourceLock: { digest: sha256(sourceLockRaw) },
    },
    tagntSource: {
      sourceId: 'stepbible-tagnt',
      repository: 'STEPBible/STEPBible-Data',
      commit: downloaded.commit,
      datasetPath: downloaded.datasetPath,
      gitBlobSha: downloaded.expectedBlobSha,
      sha256: sha256(downloaded.buffer),
      registryLicense: downloaded.source.license?.expression,
      registryStatus: downloaded.source.workflow?.status,
      externalLlmInputAllowed: downloaded.source.license?.externalLlmInputAllowed === true,
    },
    counts: {
      targets: items.length,
      exactTargetTokens: items.reduce((sum, item) => sum + item.counts.actualTokens, 0),
      exactContextPackets: items.reduce((sum, item) => sum + item.counts.exactContexts, 0),
      lukeSblTokensObserved: allTokens.length,
      targetsWithCountMatch: items.filter((item) => item.counts.expectedTokens === item.counts.actualTokens).length,
      targetsWithMorphology: items.filter((item) => item.counts.distinctMorphologies.length > 0).length,
    },
    items,
    governance: {
      researchOnly: true,
      candidateMutation: false,
      candidatePromotionAllowed: false,
      approvalRegistryMutation: false,
      productionMutation: false,
      existingApprovedMeaningMutation: false,
      selfApprovalAllowed: false,
      qualityGateWeakeningAllowed: false,
      independentAuditRequiredBeforePromotion: true,
    },
    nextGate: 'FREEZE_EXACT_LUKE_BATCH_02_CANDIDATE_CONTEXT_FINGERPRINT_THEN_DISPATCH_GPT_CLAUDE_GEMINI_INDEPENDENT_AUDIT',
  }

  assert.equal(report.counts.targets, 8)
  assert.equal(report.counts.exactTargetTokens, 41)
  assert.equal(report.counts.exactContextPackets, 41)
  assert.equal(report.counts.targetsWithCountMatch, 8)
  assert.equal(report.counts.targetsWithMorphology, 8)
  report.semanticFingerprintMethod = 'sha256-json-without-semanticFingerprint-v1'
  report.semanticFingerprint = sha256(JSON.stringify(report))
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`✓ Luke batch-02 exact TAGNT evidence · targets=${report.counts.targets} · tokens=${report.counts.exactTargetTokens} · contexts=${report.counts.exactContextPackets}`)
  console.log(`✓ semanticFingerprint=${report.semanticFingerprint}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
