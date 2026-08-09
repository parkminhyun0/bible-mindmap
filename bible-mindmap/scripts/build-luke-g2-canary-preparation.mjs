#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')

export const LUKE_G2_PREPARATION_VERSION = 1
export const LUKE_G2_CONTRACT_VERSION = '2026.08.09-luke-g2-prep.1'
export const CONFIRMATION_PHRASE = 'RUN-LUKE-G2-CANARY'
export const CANARY_SIZE = 10
export const MAX_CONTEXTS = 8

const DEFAULT_INVENTORY = resolve(APP_ROOT, 'data/lexicon/luke-g0-inventory.json')
const DEFAULT_MANIFEST = resolve(APP_ROOT, 'data/lexicon/luke-g1-manifest.json')
const DEFAULT_LOCK = resolve(APP_ROOT, 'data/lexicon/luke-g0-source-lock.json')
const DEFAULT_PACKETS = resolve(APP_ROOT, 'data/lexicon/luke-g2-canary-preparation.json')
const DEFAULT_GATE = resolve(APP_ROOT, 'data/lexicon/luke-g2-execution-gate.json')
const DEFAULT_REPORT = resolve(APP_ROOT, 'data/lexicon/luke-g2-report.json')
const DEFAULT_DOC = resolve(APP_ROOT, 'docs/luke-g2-canary-preparation.md')

const SLOT_DEFINITIONS = Object.freeze([
  { slotId: 'theology-god', preferred: ['G2316'], strategy: 'theology-noun' },
  { slotId: 'theology-kingdom', preferred: ['G932'], strategy: 'theology-noun' },
  { slotId: 'theology-salvation-verb', preferred: ['G4982'], strategy: 'theology-verb' },
  { slotId: 'theology-repentance', preferred: ['G3341'], strategy: 'theology-any' },
  { slotId: 'polysemy-spirit', preferred: ['G4151'], strategy: 'polysemy' },
  { slotId: 'high-frequency-verb', preferred: ['G3004'], strategy: 'high-verb' },
  { slotId: 'adjective-control', preferred: ['G1342'], strategy: 'medium-adjective' },
  { slotId: 'proper-name-control', preferred: ['G3137'], strategy: 'proper-name' },
  { slotId: 'existing-reuse-control', preferred: [], strategy: 'existing' },
  { slotId: 'low-frequency-control', preferred: [], strategy: 'low-new' },
])

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  }
  return value
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value))
}

export function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function normalizeStrong(value) {
  const match = String(value || '').match(/G0*(\d+)/iu)
  return match ? `G${Number(match[1])}` : ''
}

function strongNumber(value) {
  return Number.parseInt(normalizeStrong(value).slice(1), 10)
}

function normalizeGreek(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLocaleLowerCase('el').trim()
}

function parseWordTransliteration(field) {
  const value = String(field || '').trim()
  const match = value.match(/^(.+?)\s+\(([^)]+)\)$/u)
  return match ? { word: match[1].trim(), transliteration: match[2].trim() } : { word: value, transliteration: '' }
}

function parseLemmaGloss(field) {
  const value = String(field || '').replace(/^\uFEFF/u, '').trim()
  const splitAt = value.indexOf('=')
  if (splitAt < 0) return { lemma: value.split(',')[0].trim(), gloss: '' }
  return {
    lemma: value.slice(0, splitAt).split(',')[0].trim(),
    gloss: value.slice(splitAt + 1).trim(),
  }
}

export function parseTagntLuke(content) {
  const tokens = []
  const seen = new Set()
  for (const rawLine of String(content).split(/\r?\n/u)) {
    if (!rawLine.startsWith('Luk.')) continue
    const fields = rawLine.split('\t')
    const match = fields[0]?.match(/^Luk\.(\d+)\.(\d+)#(\d+)/u)
    if (!match || fields.length < 6 || !String(fields[5] || '').includes('SBL')) continue
    const chapter = Number(match[1])
    const verse = Number(match[2])
    const position = Number(match[3])
    const tokenId = `Luke.${chapter}.${verse}.${position}`
    if (seen.has(tokenId)) continue
    seen.add(tokenId)
    const { word, transliteration } = parseWordTransliteration(fields[1])
    const rawStrongMorph = String(fields[3] || '')
    const strong = normalizeStrong(rawStrongMorph)
    const morph = rawStrongMorph.includes('=') ? rawStrongMorph.slice(rawStrongMorph.indexOf('=') + 1).trim() : ''
    const { lemma, gloss } = parseLemmaGloss(fields[4])
    tokens.push({
      tokenId, chapter, verse, position,
      ref: `Luke ${chapter}:${verse}`,
      word, transliteration, strong, morph,
      lemma: lemma.normalize('NFC'), gloss,
    })
  }
  return tokens.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse || a.position - b.position)
}

export function parseMorphgntLuke(content) {
  const rows = []
  for (const rawLine of String(content).split(/\r?\n/u)) {
    const fields = rawLine.trim().split(/\s+/u)
    if (fields.length < 7 || !/^\d{6}$/u.test(fields[0])) continue
    rows.push({
      chapter: Number(fields[0].slice(2, 4)),
      verse: Number(fields[0].slice(4, 6)),
      pos: fields[1],
      parsing: fields[2],
      lemma: fields.slice(6).join(' ').normalize('NFC'),
    })
  }
  return rows
}

function frequencyBand(tokenCount) {
  if (tokenCount >= 50) return 'high'
  if (tokenCount >= 10) return 'medium'
  return 'low'
}

function hasPos(item, family) {
  return (item.identity?.partOfSpeechFamilies || []).includes(family)
}

function strategyPredicate(strategy, item) {
  const signals = item.theologyAudit?.signals || []
  if (strategy === 'theology-noun') return signals.includes('THEOLOGY_KEYWORD') && hasPos(item, 'N')
  if (strategy === 'theology-verb') return signals.includes('THEOLOGY_KEYWORD') && hasPos(item, 'V')
  if (strategy === 'theology-any') return signals.includes('THEOLOGY_KEYWORD')
  if (strategy === 'polysemy') return signals.includes('POLYSEMOUS_GLOSS_SET') || (item.sourceEvidence?.englishGlosses || []).length >= 3
  if (strategy === 'high-verb') return frequencyBand(item.usage?.tokenCount || 0) === 'high' && hasPos(item, 'V')
  if (strategy === 'medium-adjective') return frequencyBand(item.usage?.tokenCount || 0) === 'medium' && hasPos(item, 'A')
  if (strategy === 'proper-name') return signals.includes('PROPER_NAME')
  if (strategy === 'existing') return item.routing?.action === 'reuse-existing'
  if (strategy === 'low-new') return frequencyBand(item.usage?.tokenCount || 0) === 'low' && item.routing?.action === 'translate'
  return false
}

function strategySort(strategy, left, right) {
  const l = left.usage?.tokenCount || 0
  const r = right.usage?.tokenCount || 0
  if (strategy === 'low-new') return l - r || strongNumber(left.strong) - strongNumber(right.strong)
  return r - l || strongNumber(left.strong) - strongNumber(right.strong)
}

export function selectLukeCanaryItems(manifest) {
  if (manifest?.manifestId !== 'luke-lexicon-ko-g1' || !Array.isArray(manifest.items)) {
    throw new Error('누가복음 G1 manifest가 필요합니다.')
  }
  const byStrong = new Map(manifest.items.map((item) => [item.strong, item]))
  const selected = new Set()
  const result = []

  for (const slot of SLOT_DEFINITIONS) {
    let item = slot.preferred.map((strong) => byStrong.get(strong)).find((candidate) => candidate && !selected.has(candidate.strong))
    if (!item) {
      item = manifest.items
        .filter((candidate) => !selected.has(candidate.strong) && strategyPredicate(slot.strategy, candidate))
        .sort((a, b) => strategySort(slot.strategy, a, b))[0]
    }
    if (!item) throw new Error(`${slot.slotId}: 대표 항목을 선정하지 못했습니다.`)
    selected.add(item.strong)
    result.push({ slotId: slot.slotId, selectionStrategy: slot.strategy, item })
  }
  return result
}

function groupByVerse(tokens) {
  const map = new Map()
  for (const token of tokens) {
    const key = `${token.chapter}:${token.verse}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(token)
  }
  return map
}

function representativeTokens(tokens, max = MAX_CONTEXTS) {
  if (tokens.length <= max) return tokens
  const chosen = new Map()
  const add = (token) => { if (token) chosen.set(token.tokenId, token) }
  add(tokens[0])
  add(tokens.at(-1))
  const firstByChapter = new Map()
  for (const token of tokens) if (!firstByChapter.has(token.chapter)) firstByChapter.set(token.chapter, token)
  const spread = [...firstByChapter.values()]
  for (let index = 0; index < spread.length && chosen.size < max; index += 1) {
    const position = spread.length === 1 ? 0 : Math.round(index * (spread.length - 1) / Math.max(1, max - 2))
    add(spread[position])
  }
  for (const token of tokens) {
    if (chosen.size >= max) break
    add(token)
  }
  return [...chosen.values()].sort((a, b) => a.chapter - b.chapter || a.verse - b.verse || a.position - b.position)
}

function contextRecord(token, verseTokens, morphRows) {
  const morphVerse = morphRows.filter((row) => row.chapter === token.chapter && row.verse === token.verse)
  const normalizedLemma = normalizeGreek(token.lemma)
  const window = verseTokens.filter((entry) => Math.abs(entry.position - token.position) <= 4)
  return {
    contextId: `luke-g2-context:${token.tokenId}`,
    tokenId: token.tokenId,
    reference: token.ref,
    target: {
      word: token.word,
      transliteration: token.transliteration,
      lemma: token.lemma,
      strong: token.strong,
      morphology: token.morph,
      englishGloss: token.gloss,
    },
    verse: {
      tokenCount: verseTokens.length,
      text: verseTokens.map((entry) => entry.word).join(' '),
      sourceHash: sha256(stableStringify(verseTokens.map(({ tokenId, word, lemma, strong, morph }) => ({ tokenId, word, lemma, strong, morph })))),
    },
    localWindow: window.map(({ tokenId, position, word, lemma, strong, morph, gloss }) => ({
      tokenId, position, word, lemma, strong, morphology: morph, englishGloss: gloss,
    })),
    morphgntCrossCheck: {
      verseTokenCount: morphVerse.length,
      lemmaPresent: morphVerse.some((row) => normalizeGreek(row.lemma) === normalizedLemma),
      partOfSpeechCodes: [...new Set(morphVerse.filter((row) => normalizeGreek(row.lemma) === normalizedLemma).map((row) => row.pos))].sort(),
      parsingCodes: [...new Set(morphVerse.filter((row) => normalizeGreek(row.lemma) === normalizedLemma).map((row) => row.parsing))].sort(),
    },
  }
}

function sourceUrl(source) {
  const ref = source.blobSha || source.ref
  const encodedPath = String(source.path).split('/').map(encodeURIComponent).join('/')
  return `https://raw.githubusercontent.com/${source.repository}/${ref}/${encodedPath}`
}

async function downloadPinned(source) {
  const response = await fetch(sourceUrl(source), { headers: { 'User-Agent': 'bible-mindmap-luke-g2-preparation' } })
  if (!response.ok) throw new Error(`${source.repository}/${source.path} 다운로드 실패: HTTP ${response.status}`)
  return response.text()
}

export function buildExecutionGate() {
  return {
    schemaVersion: 1,
    gateId: 'luke-g2-canary-execute-v1',
    contractVersion: LUKE_G2_CONTRACT_VERSION,
    state: 'blocked-awaiting-explicit-approval',
    confirmationRequired: CONFIRMATION_PHRASE,
    executionAllowed: false,
    killSwitchDefault: 'on',
    maxItems: CANARY_SIZE,
    modes: {
      providerBoth: {
        enabled: false,
        requiredSecrets: ['NVIDIA_API_KEY', 'OPENAI_API_KEY'],
        requiredInputs: ['nvidia_model_id', 'openai_model_id', 'provider_budget_usd', 'confirmation', 'kill_switch'],
        minimumIndependentDrafts: 2,
      },
      localTwoModel: {
        enabled: false,
        requiredSecrets: [],
        requiredInputs: ['local_model_a', 'local_model_b', 'confirmation', 'kill_switch'],
        minimumIndependentDrafts: 2,
      },
      manualIndependentJson: {
        enabled: false,
        requiredSecrets: [],
        requiredInputs: ['draft_a_path', 'draft_b_path', 'confirmation', 'kill_switch'],
        minimumIndependentDrafts: 2,
      },
    },
    independence: {
      draftAVisibleToDraftBBeforeCompletion: false,
      draftBVisibleToDraftABeforeCompletion: false,
      comparisonOnlyAfterBothDraftsValidated: true,
    },
    safety: {
      secretsMayBeLogged: false,
      rawCredentialsMayBeStored: false,
      sourceNodeMutationAllowed: false,
      productionWriteAllowed: false,
      candidateOnly: true,
      humanReviewRequired: true,
      automaticApprovalAllowed: false,
      r3r4AutomaticApprovalAllowed: false,
    },
    executionEvidence: {
      providerCalls: 0,
      localModelCalls: 0,
      manualCandidateImports: 0,
      productionWrites: 0,
      approvalState: 'not-approved',
    },
  }
}

export function buildLukeG2Preparation({ inventory, manifest, sourceLock, tagntContent, morphgntContent }) {
  if (inventory?.book !== 'Luke' || inventory?.stage !== 'G0') throw new Error('누가복음 G0 inventory가 필요합니다.')
  const tagntDigest = sha256(tagntContent)
  const morphgntDigest = sha256(morphgntContent)
  if (inventory.sources?.tagnt?.sha256 && inventory.sources.tagnt.sha256 !== tagntDigest) throw new Error('TAGNT digest가 G0 inventory와 다릅니다.')
  if (inventory.sources?.morphgnt?.sha256 && inventory.sources.morphgnt.sha256 !== morphgntDigest) throw new Error('MorphGNT digest가 G0 inventory와 다릅니다.')

  const tagntTokens = parseTagntLuke(tagntContent)
  const morphRows = parseMorphgntLuke(morphgntContent)
  const verseMap = groupByVerse(tagntTokens)
  const selected = selectLukeCanaryItems(manifest)

  const packets = selected.map(({ slotId, selectionStrategy, item }, index) => {
    const occurrences = tagntTokens.filter((token) => token.strong === item.strong)
    const contexts = representativeTokens(occurrences).map((token) => contextRecord(
      token,
      verseMap.get(`${token.chapter}:${token.verse}`) || [],
      morphRows,
    ))
    const ready = occurrences.length === item.usage.tokenCount && contexts.length > 0
    return {
      schemaVersion: 1,
      packetId: `luke-g2-source-context:${item.strong}`,
      order: index + 1,
      slotId,
      selectionStrategy,
      strong: item.strong,
      frequencyBand: frequencyBand(item.usage.tokenCount),
      sourcePacketStatus: ready ? 'ready' : 'blocked',
      identity: structuredClone(item.identity),
      usage: structuredClone(item.usage),
      sourceEvidence: structuredClone(item.sourceEvidence),
      reuse: structuredClone(item.reuse),
      routing: {
        action: item.routing.action === 'reuse-existing' ? 'control-retranslate' : 'translate',
        originalAction: item.routing.action,
        targetPayloadPath: item.routing.payloadPath,
      },
      theologyAudit: structuredClone(item.theologyAudit),
      contextCoverage: {
        totalOccurrences: occurrences.length,
        expectedOccurrences: item.usage.tokenCount,
        representativeContexts: contexts.length,
        chaptersRepresented: [...new Set(contexts.map((context) => Number(context.reference.match(/Luke (\d+):/u)?.[1])))].filter(Number.isFinite),
      },
      contexts,
      modelBoundary: {
        translationStatus: 'not-started',
        independentDraftsRequired: 2,
        crossVisibilityBeforeComparison: false,
        productionWriteAllowed: false,
        humanApprovalRequired: true,
      },
    }
  })

  const posFamilies = [...new Set(packets.flatMap((packet) => packet.identity.partOfSpeechFamilies || []))].sort()
  const frequencyBands = [...new Set(packets.map((packet) => packet.frequencyBand))].sort()
  const gate = buildExecutionGate()
  const preparation = {
    schemaVersion: LUKE_G2_PREPARATION_VERSION,
    preparationId: 'luke-g2-canary-preparation-v1',
    contractVersion: LUKE_G2_CONTRACT_VERSION,
    generatedDate: sourceLock.generatedDate,
    book: { id: 'Luke', nameKo: '누가복음', testament: 'NT', sourceLanguage: 'greek' },
    governance: {
      theologicalFramework: 'reformed-westminster-primary',
      sourceAndContextOnly: true,
      translationStarted: false,
      providerCallsAllowed: false,
      localModelCallsAllowed: false,
      productionWriteAllowed: false,
      sourceNodeMutationAllowed: false,
      finalHumanApprovalRequired: true,
    },
    source: {
      tagnt: { ...sourceLock.sources.tagnt, sha256: tagntDigest },
      morphgnt: { ...sourceLock.sources.morphgnt, sha256: morphgntDigest },
      koreanGloss: structuredClone(sourceLock.sources.koreanGloss),
    },
    selectionContract: {
      size: CANARY_SIZE,
      slots: SLOT_DEFINITIONS.map(({ slotId, strategy, preferred }) => ({ slotId, strategy, preferred })),
      requiredCoverage: {
        partOfSpeechFamilies: ['N', 'V', 'A'],
        frequencyBands: ['high', 'medium', 'low'],
        minimumReuseControls: 1,
        minimumNewTranslations: 1,
      },
    },
    counts: {
      selected: packets.length,
      ready: packets.filter((packet) => packet.sourcePacketStatus === 'ready').length,
      blocked: packets.filter((packet) => packet.sourcePacketStatus === 'blocked').length,
      reuseControls: packets.filter((packet) => packet.routing.originalAction === 'reuse-existing').length,
      newTranslations: packets.filter((packet) => packet.routing.originalAction === 'translate').length,
      representativeContexts: packets.reduce((sum, packet) => sum + packet.contexts.length, 0),
      posFamilies,
      frequencyBands,
    },
    executionGateRef: 'data/lexicon/luke-g2-execution-gate.json',
    packets,
  }

  const requiredPos = preparation.selectionContract.requiredCoverage.partOfSpeechFamilies
  const requiredBands = preparation.selectionContract.requiredCoverage.frequencyBands
  const pass = preparation.counts.selected === CANARY_SIZE
    && preparation.counts.ready === CANARY_SIZE
    && new Set(packets.map((packet) => packet.strong)).size === CANARY_SIZE
    && requiredPos.every((family) => posFamilies.includes(family))
    && requiredBands.every((band) => frequencyBands.includes(band))
    && preparation.counts.reuseControls >= 1
    && preparation.counts.newTranslations >= 1
    && gate.executionEvidence.providerCalls === 0
    && gate.executionEvidence.localModelCalls === 0
    && gate.executionEvidence.productionWrites === 0

  const report = {
    schemaVersion: 1,
    book: 'Luke',
    stage: 'G2-preparation',
    generatedDate: sourceLock.generatedDate,
    pass,
    summary: structuredClone(preparation.counts),
    selected: packets.map((packet) => ({
      order: packet.order,
      slotId: packet.slotId,
      strong: packet.strong,
      lemma: packet.identity.primaryLemma,
      tokenCount: packet.usage.tokenCount,
      frequencyBand: packet.frequencyBand,
      routing: packet.routing.action,
      contexts: packet.contexts.length,
      status: packet.sourcePacketStatus,
    })),
    executionEvidence: structuredClone(gate.executionEvidence),
    nextGate: 'Explicit model/mode/cost/kill-switch approval before any Luke G2 candidate generation.',
  }
  return { preparation, gate, report }
}

export function buildMarkdown(preparation, gate, report) {
  const rows = report.selected.map((item) => `| ${item.order} | ${item.slotId} | ${item.strong} | ${item.lemma || ''} | ${item.tokenCount} | ${item.frequencyBand} | ${item.routing} | ${item.contexts} |`).join('\n')
  return `# 누가복음 G2 · 대표 10건 source/context packet 준비\n\n## 판정\n\n- 상태: **${report.pass ? 'PASS' : 'FAIL'}**\n- 대표 Strong: **${report.summary.selected}개**\n- 준비 완료 packet: **${report.summary.ready}개**\n- 대표 문맥: **${report.summary.representativeContexts}건**\n- 실제 provider 호출: **${report.executionEvidence.providerCalls}건**\n- 실제 로컬 모델 호출: **${report.executionEvidence.localModelCalls}건**\n- 서비스 쓰기: **${report.executionEvidence.productionWrites}건**\n\n## 대표 10건\n\n| 순서 | 슬롯 | Strong | lemma | 출현 | 빈도 | 처리 | 문맥 |\n|---:|---|---|---|---:|---|---|---:|\n${rows}\n\n## 실행 Gate\n\n- 상태: **${gate.state}**\n- 승인 문자열: \`${gate.confirmationRequired}\`\n- kill switch 기본값: **${gate.killSwitchDefault}**\n- 실행 허용: **${gate.executionAllowed}**\n- provider·로컬·수동 JSON 세 경로 모두 명시 승인 전 비활성입니다.\n- 두 초안은 서로의 결과를 보지 않고 독립 생성한 뒤에만 비교합니다.\n- R3·R4 및 신학 민감 항목은 자동 승인하지 않습니다.\n\n## 안전 경계\n\nTAGNT의 허용된 원천을 대표 문맥에 사용하고 MorphGNT는 lemma·품사 교차검증에만 사용합니다. 원문·Strong·형태론·성경 본문·기존 사전·사용자 저장 데이터는 변경하지 않습니다.\n`
}

function parseArgs(argv) {
  const args = {
    inventory: DEFAULT_INVENTORY,
    manifest: DEFAULT_MANIFEST,
    lock: DEFAULT_LOCK,
    packets: DEFAULT_PACKETS,
    gate: DEFAULT_GATE,
    report: DEFAULT_REPORT,
    doc: DEFAULT_DOC,
    selfTest: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--inventory') args.inventory = resolve(process.cwd(), argv[++index])
    else if (arg === '--manifest') args.manifest = resolve(process.cwd(), argv[++index])
    else if (arg === '--lock') args.lock = resolve(process.cwd(), argv[++index])
    else if (arg === '--packets') args.packets = resolve(process.cwd(), argv[++index])
    else if (arg === '--gate') args.gate = resolve(process.cwd(), argv[++index])
    else if (arg === '--report') args.report = resolve(process.cwd(), argv[++index])
    else if (arg === '--doc') args.doc = resolve(process.cwd(), argv[++index])
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function runSelfTest() {
  const items = SLOT_DEFINITIONS.map((slot, index) => ({
    strong: slot.preferred[0] || `G${6000 + index}`,
    identity: { primaryLemma: `lemma-${index}`, partOfSpeechFamilies: index === 6 ? ['A'] : index === 2 || index === 5 ? ['V'] : ['N'] },
    usage: { tokenCount: index === 5 ? 80 : index === 6 ? 15 : index === 9 ? 1 : 6, verseCount: 1, chapterCount: 1, chapters: [1], firstRef: 'Luke 1:1', firstTokenId: `Luke.1.1.${index + 1}` },
    sourceEvidence: { englishGlosses: index === 4 ? ['a', 'b', 'c'] : ['a'], morphologyCodes: ['N-NSM'], sourceFingerprint: `sha256:${index}` },
    reuse: { eligible: index === 8 },
    routing: { action: index === 8 ? 'reuse-existing' : 'translate', payloadPath: `data/${index}.json` },
    theologyAudit: { signals: index < 5 ? ['THEOLOGY_KEYWORD'] : index === 7 ? ['PROPER_NAME'] : [], reviewRoute: 'standard' },
  }))
  items[8].strong = 'G7000'
  const manifest = { manifestId: 'luke-lexicon-ko-g1', items }
  const selected = selectLukeCanaryItems(manifest)
  assert.equal(selected.length, 10)
  assert.equal(new Set(selected.map((entry) => entry.item.strong)).size, 10)
  const parsed = parseTagntLuke('Luk.1.1#1\tθεός (theos)\t\tG2316=N-NSM\tθεός=God\tSBL')
  assert.equal(parsed[0].strong, 'G2316')
  assert.equal(buildExecutionGate().executionAllowed, false)
  console.log('✓ Luke G2 canary preparation self-test passed')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()
  const inventory = JSON.parse(readFileSync(args.inventory, 'utf8'))
  const manifest = JSON.parse(readFileSync(args.manifest, 'utf8'))
  const sourceLock = JSON.parse(readFileSync(args.lock, 'utf8'))
  const [tagntContent, morphgntContent] = await Promise.all([
    downloadPinned(sourceLock.sources.tagnt),
    downloadPinned(sourceLock.sources.morphgnt),
  ])
  const { preparation, gate, report } = buildLukeG2Preparation({ inventory, manifest, sourceLock, tagntContent, morphgntContent })
  const markdown = buildMarkdown(preparation, gate, report)
  for (const path of [args.packets, args.gate, args.report, args.doc]) mkdirSync(dirname(path), { recursive: true })
  writeFileSync(args.packets, `${JSON.stringify(preparation, null, 2)}\n`, 'utf8')
  writeFileSync(args.gate, `${JSON.stringify(gate, null, 2)}\n`, 'utf8')
  writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  writeFileSync(args.doc, markdown, 'utf8')
  console.log('Luke G2 canary preparation')
  console.log(`  selected: ${preparation.counts.selected}`)
  console.log(`  ready: ${preparation.counts.ready}`)
  console.log(`  representative contexts: ${preparation.counts.representativeContexts}`)
  console.log(`  pass: ${report.pass}`)
  console.log('  provider calls: 0')
  console.log('  local model calls: 0')
  console.log('  production writes: 0')
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) await main()
