#!/usr/bin/env node
// parse-sp-mt.mjs — Samaritan Pentateuch (SP) vs Masoretic Text (MT) 자동 이문 감지
// 사용: node scripts/parse-sp-mt.mjs [BookId]   (인자 없으면 오경 5권 전체)
// 입력:
//   .oshb-cache/sp-verses.json   (extract-sp-verses.py 로 사전 생성 · DT-UCPH SP CC BY-NC 4.0)
//   .oshb-cache/{Book}.xml       (OSHB WLC XML · CC BY 4.0 · MT 원문)
// 출력: public/data/variants/{OTBook}.json 병합 · source='sp-mt'
// 필터: matres lectionis (모음자 waw/yod 미묘한 차이) 제외 · 자음 root 다른 것만
// 근거: Tal (1994), Florentin (2005), Kartveit (2009) 학술 이문 관점

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CACHE_DIR = join(ROOT, '.oshb-cache')
const OUT_DIR = join(ROOT, 'public/data/variants')
// SP 텍스트 (Python text-fabric으로 사전 추출 · 커밋됨)
// 우선순위: scripts/data/ (커밋) → .oshb-cache/ (로컬 캐시)
const SP_JSON_DATA = join(__dirname, 'data', 'sp-verses.json')
const SP_JSON_CACHE = join(CACHE_DIR, 'sp-verses.json')
const SP_JSON = existsSync(SP_JSON_DATA) ? SP_JSON_DATA : SP_JSON_CACHE

const PENTATEUCH = ['Gen', 'Exod', 'Lev', 'Num', 'Deut']

if (!existsSync(SP_JSON)) {
  console.error(`❌ SP 데이터 없음: ${SP_JSON}`)
  console.error(`   먼저 실행: python3 scripts/extract-sp-verses.py`)
  process.exit(1)
}

const SP = JSON.parse(readFileSync(SP_JSON, 'utf8'))

// ── 히브리어 정규화 (자음 시퀀스만 · 토큰화 무관하게 통합 비교) ─────
// MT는 `/` 형태소 구분자·SP는 공백 사용 → 통합 자음 문자열로 비교
// Unicode: 모음(U+05B0-U+05BC, U+05C1-U+05C2), 악센트(U+0591-U+05AF, U+05BD-U+05C0),
//         maqqef U+05BE, sof-pasuq U+05C3, punctum extraordinarium U+05C4-U+05C5
function toConsonants(text) {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[֑-ׇ]/g, '')     // 모든 히브리 모음·악센트·구두점 제거
    .replace(/[^א-ת]/g, '')    // 히브리 자음(U+05D0-U+05EA)만 유지 (공백·/·-·기타 모두 제거)
}

// MT XML에서 verse별 텍스트 추출 (OSHB WLC)
function extractMTVerses(bookId) {
  const xmlPath = join(CACHE_DIR, `${bookId}.xml`)
  if (!existsSync(xmlPath)) return null
  const xml = readFileSync(xmlPath, 'utf8')
  const result = {}
  const verseRE = /<verse\s+osisID="([^"]+)"[^>]*\/?>([\s\S]*?)(?=<verse\s+osisID=|<\/chapter>)/g
  let m
  while ((m = verseRE.exec(xml)) !== null) {
    const [, osisID, body] = m
    const parts = osisID.split('.')
    if (parts.length !== 3 || parts[0] !== bookId) continue
    const [_, chStr, vStr] = parts
    // Ketiv/Qere 중 Ketiv 우선 · 일반 <w>는 자음 텍스트
    // <w type="x-ketiv"> 는 자음만 있는 원형
    // 표준 <w> 는 모음 표기된 형태
    const wordRE = /<w[^>]*>([^<]+)<\/w>/g
    let wm, hebrewText = ''
    while ((wm = wordRE.exec(body)) !== null) {
      hebrewText += (hebrewText ? ' ' : '') + wm[1]
    }
    result[`${chStr}:${vStr}`] = hebrewText
  }
  return result
}

// matres lectionis 정규화 · 자음 sequence에서 종종 다르게 표기되는 waw/yod 를 통일
// SP는 "full spelling" 선호 (모음 표기 waw/yod 추가) · MT는 "defective spelling" 자주
// 예: MT "בראשית" vs SP "בראשית" (동일) · MT "אתם" vs SP "אותם" (SP에 waw 추가)
function normalizeMatres(cons) {
  // 이중 waw/yod → 단일 (SP의 모음 표기 감소)
  return cons
    .replace(/וו/g, 'ו')  // 이중 waw
    .replace(/יי/g, 'י')  // 이중 yod
}

// Levenshtein-like 편집 거리 (자음 sequence 기반 · O(n·m))
function editDistance(a, b) {
  const n = a.length, m = b.length
  if (n === 0) return m
  if (m === 0) return n
  const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[0][i] = i
  for (let j = 0; j <= m; j++) dp[j][0] = j
  for (let j = 1; j <= m; j++) {
    for (let i = 1; i <= n; i++) {
      dp[j][i] = a[i-1] === b[j-1] ? dp[j-1][i-1]
        : 1 + Math.min(dp[j-1][i], dp[j][i-1], dp[j-1][i-1])
    }
  }
  return dp[m][n]
}

// 자음 sequence 비교 · 학술적 유의미 여부
// 규칙:
//   0) matres lectionis 정규화 후 동일 → 스킵 (SP full vs MT defective spelling)
//   1) 편집 거리 / 최대 길이 비율 ≥ 8% → 유의 (실질적 텍스트 차이)
//   2) 짧은 절 (자음 15자 미만) 은 임계 ≥ 15% (짧을수록 노이즈 큼)
function isSignificantDiff(spCons, mtCons) {
  if (!spCons || !mtCons) return false
  const spN = normalizeMatres(spCons)
  const mtN = normalizeMatres(mtCons)
  if (spN === mtN) return false
  const maxLen = Math.max(spN.length, mtN.length)
  if (maxLen === 0) return false
  const dist = editDistance(spN, mtN)
  const ratio = dist / maxLen
  const threshold = maxLen < 15 ? 0.15 : 0.08
  return ratio >= threshold
}

// Diff 감지 시 이문 entry 생성
function makeVariant(bookId, ch, verse, spText, mtText) {
  return {
    bookId,
    chapter: parseInt(ch, 10),
    verse: parseInt(verse, 10),
    type: 'substitution',
    source: 'sp-mt',
    title: `SP vs MT · 자음 텍스트 이문`,
    summary: `사마리아 오경(SP)과 마소라 정본(MT) 자음 텍스트 차이 · 자동 감지. 문자·어형·삽입/누락 등 다양한 원인.`,
    witnesses: {
      variants: {
        MT: mtText || '(MT 없음)',
        SP: spText || '(SP 없음)',
      },
    },
    metzger: 'C',
    translations: {
      krv: 'MT (마소라) 따라 번역 · 표준',
      niv: 'MT 우선 · SP 참조 각주 (일부)',
    },
    significance: '사마리아 오경 = 오경(창-신) 만 보존 · MT와 ~6,000건 차이 (대부분 철자 · 일부 신학적 중요) · Tal·Florentin 학술 계열.',
    refs: [
      'DT-UCPH SP (Text-Fabric 4.1.3 · CC BY-NC 4.0) · Christian Canu Højgaard, Martijn Naaijer, Stefan Schorch (2023)',
      'MS Chester Beatty Library 751 + MS Garizim 1 (Stefan Schorch ed. critical editio maior)',
      'WLC (Westminster Leningrad Codex, 파블릭 도메인) · openscriptures/morphhb MT 대조',
      '⚠ 자동 감지 · Tal (1994) · Florentin (2005) · BHS SP 각주 학술 검증 권장',
    ],
  }
}

async function processBook(bookId) {
  if (!SP[bookId]) {
    console.log(`[${bookId}] SP 데이터 없음 (Pentateuch 아님)`)
    return { bookId, spmt: 0, kept: 0, total: 0 }
  }
  const mtVerses = extractMTVerses(bookId)
  if (!mtVerses) {
    console.error(`[${bookId}] MT XML 없음 (parse-oshb.mjs 먼저 실행)`)
    return { bookId, spmt: 0, kept: 0, total: 0 }
  }
  const spmtVariants = []
  let scanned = 0, skipped = 0
  for (const [ch, verses] of Object.entries(SP[bookId])) {
    for (const [v, spText] of Object.entries(verses)) {
      scanned++
      const mtText = mtVerses[`${ch}:${v}`]
      if (!mtText) continue
      const spCons = toConsonants(spText)
      const mtCons = toConsonants(mtText)
      if (!isSignificantDiff(spCons, mtCons)) { skipped++; continue }
      spmtVariants.push(makeVariant(bookId, ch, v, spText, mtText))
    }
  }
  // 기존 파일 병합 (OSHB + curated 유지 · SP-MT는 덮어쓰기)
  const outPath = join(OUT_DIR, `${bookId}.json`)
  let existing = []
  if (existsSync(outPath)) {
    try {
      existing = JSON.parse(readFileSync(outPath, 'utf8'))
      if (!Array.isArray(existing)) existing = []
    } catch { /* ignore */ }
  }
  const kept = existing.filter((v) => v.source !== 'sp-mt')
  const merged = [...kept, ...spmtVariants]
  writeFileSync(outPath, JSON.stringify(merged), 'utf8')
  console.log(`[${bookId}] SP-MT 자동 ${spmtVariants.length}건 + 기존 ${kept.length}건 = 총 ${merged.length}건`)
  console.log(`         스캔 ${scanned}절 · 필터 후 유의미 ${spmtVariants.length}건 · 미묘 차이 ${skipped}절 제외`)
  return { bookId, spmt: spmtVariants.length, kept: kept.length, total: merged.length }
}

// ── 메인 ──────────────────────────────────────────────
const target = process.argv[2]
const targets = target ? [target] : PENTATEUCH

if (target && !PENTATEUCH.includes(target)) {
  console.error(`❌ ${target}: 오경 아님 (SP는 오경만). 지원: ${PENTATEUCH.join(', ')}`)
  process.exit(1)
}

console.log(`🔍 parse-sp-mt · 대상: ${targets.join(', ')}\n`)
let totalSpmt = 0
for (const bookId of targets) {
  const r = await processBook(bookId)
  totalSpmt += r.spmt
  console.log('')
}
console.log(`✅ 완료 · SP-MT 자동 이문 총 ${totalSpmt}건`)
console.log(`   출력: ${OUT_DIR}/`)
