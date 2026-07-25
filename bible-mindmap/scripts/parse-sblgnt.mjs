/**
 * SBLGNT Apparatus Parser
 * Source: https://github.com/Faithlife/SBLGNT (CC BY 4.0)
 * Attribution: Society of Biblical Literature & Logos Bible Software
 *
 * 출력 스키마 (textualVariants.js 와 동일):
 *   bookId, chapter, verse, type, title, summary, witnesses, translations, refs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = resolve(__dir, '../.sblgnt-cache')
const OUT_DIR   = resolve(__dir, '../public/data/variants')

// ── 증인 약어 → 한글 설명 ───────────────────────────────────────────────
const WITNESS_NAMES = {
  WH:   'Westcott-Hort (WH)',
  Treg: 'Tregelles (Treg)',
  NA28: 'Nestle-Aland 28판 (NA28)',
  RP:   'Robinson-Pierpont 비잔틴 (RP)',
}
const ALL_WITNESSES = ['WH', 'Treg', 'NA28', 'RP']

// ── bookId 매핑 (SBLGNT 파일명 → 우리 앱 lexId) ─────────────────────────
const BOOK_MAP = {
  Matt: 'Matt', Mark: 'Mark', Luke: 'Luke', John: 'John',
  Acts: 'Acts', Rom: 'Rom',
  '1Cor': '1Cor', '2Cor': '2Cor', Gal: 'Gal', Eph: 'Eph',
  Phil: 'Phil', Col: 'Col',
  '1Thess': '1Thess', '2Thess': '2Thess',
  '1Tim': '1Tim', '2Tim': '2Tim',
  Titus: 'Titus', Phlm: 'Phlm', Heb: 'Heb',
  Jas: 'Jas', '1Pet': '1Pet', '2Pet': '2Pet',
  '1John': '1John', '2John': '2John', '3John': '3John',
  Jude: 'Jude', Rev: 'Rev',
}

// ── 유형 감지 ────────────────────────────────────────────────────────────
function detectType(lhsText, rhsEntries) {
  const allRhs = rhsEntries.map(e => e.text)
  const hasAddition = allRhs.some(t => t.trimStart().startsWith('+'))
  const hasOmission = allRhs.some(t => t.trim() === '–' || t.trim() === '-')
  const lhsOmitted  = lhsText.trim() === '–' || lhsText.trim() === '-'
  if (hasOmission || lhsOmitted) return 'omission'
  if (hasAddition) return 'addition'
  // 단어 순서 차이 감지 (단어 집합이 같으면 'order')
  const lhsWords = lhsText.trim().split(/\s+/).sort()
  for (const rhs of allRhs) {
    const rhsWords = rhs.trim().replace(/^[+–-]\s*/, '').split(/\s+/).sort()
    if (lhsWords.join(' ') === rhsWords.join(' ')) return 'order'
  }
  return 'substitution'
}

// ── 한 줄 파싱: "reading WH Treg ] alt1 Wit1; alt2 Wit2" ─────────────────
function parseLine(line) {
  const sepIdx = line.indexOf(']')
  if (sepIdx < 0) return null
  const lhs = line.slice(0, sepIdx).trim()
  const rhs = line.slice(sepIdx + 1).trim()

  // 좌변: "text WH Treg ..."
  const lhsTokens = lhs.split(/\s+/)
  const lhsWitnesses = []
  const lhsWords = []
  for (const t of lhsTokens) {
    if (ALL_WITNESSES.includes(t)) lhsWitnesses.push(t)
    else lhsWords.push(t)
  }
  const lhsText = lhsWords.join(' ')

  // 우변: 세미콜론으로 여러 이독(異讀) 구분
  const rhsEntries = rhs.split(';').map(part => {
    const tokens = part.trim().split(/\s+/)
    const wits = []
    const words = []
    for (const t of tokens) {
      if (ALL_WITNESSES.includes(t)) wits.push(t)
      else words.push(t)
    }
    return { text: words.join(' '), witnesses: wits }
  })

  return { lhsText, lhsWitnesses, rhsEntries }
}

// ── 증인(witnesses) 스키마 빌드 ─────────────────────────────────────────
function buildWitnesses(type, lhsText, lhsWits, rhsEntries) {
  if (type === 'omission') {
    // 좌변 = 본문 있음, 우변 누락
    const omitWits  = rhsEntries.filter(e => e.text.trim() === '–' || e.text.trim() === '-').flatMap(e => e.witnesses)
    const incWits   = lhsWits
    if (omitWits.length || incWits.length) {
      return {
        include: incWits.map(w => WITNESS_NAMES[w] || w),
        omit: omitWits.map(w => WITNESS_NAMES[w] || w),
      }
    }
  }
  if (type === 'addition') {
    const baseWits = lhsWits.map(w => WITNESS_NAMES[w] || w)
    const addEntries = rhsEntries.filter(e => e.text.trimStart().startsWith('+'))
    if (baseWits.length || addEntries.length) {
      const variants = {}
      variants[`${lhsText} (기본문)`] = baseWits.join(', ') || '—'
      for (const e of addEntries) {
        const extra = e.text.replace(/^\+\s*/, '').trim()
        variants[`${lhsText} + ${extra}`] = e.witnesses.map(w => WITNESS_NAMES[w] || w).join(', ')
      }
      return { variants }
    }
  }
  // substitution / order
  const variants = {}
  const lhsLabel = lhsText || '(누락)'
  variants[lhsLabel] = lhsWits.map(w => WITNESS_NAMES[w] || w).join(', ')
  for (const e of rhsEntries) {
    const rhsLabel = e.text || '(누락)'
    if (rhsLabel && rhsLabel !== lhsLabel) {
      variants[rhsLabel] = e.witnesses.map(w => WITNESS_NAMES[w] || w).join(', ')
    }
  }
  return { variants }
}

// ── 제목 자동 생성 ────────────────────────────────────────────────────────
function buildTitle(type, lhsText, rhsEntries) {
  const maxLen = 30
  const trim   = s => s.length > maxLen ? s.slice(0, maxLen) + '…' : s
  if (type === 'omission') {
    const missingText = rhsEntries.find(e => e.text.trim() === '–' || e.text.trim() === '-')
    return `"${trim(lhsText)}" 누락 (일부 사본)`
  }
  if (type === 'addition') {
    const added = rhsEntries.find(e => e.text.startsWith('+'))
    return `"${trim(lhsText)}" 뒤 추가 삽입`
  }
  if (type === 'order') {
    return `어순 차이: "${trim(lhsText)}"`
  }
  const alt = rhsEntries[0]?.text || ''
  return `"${trim(lhsText)}" vs "${trim(alt)}"`
}

// ── 요약 자동 생성 ────────────────────────────────────────────────────────
function buildSummary(lhsText, lhsWits, rhsEntries) {
  const lhsPart = `${lhsText} (${lhsWits.join(', ') || '—'})`
  const rhsParts = rhsEntries.map(e => `${e.text} (${e.witnesses.join(', ') || '—'})`).join(' · ')
  return `${lhsPart} · ${rhsParts}`
}

// ── translations 빌드 (어느 판이 어느 독법 채택) ─────────────────────────
function buildTranslations(lhsText, lhsWits, rhsEntries) {
  const t = {}
  const readable = s => s.replace(/^[+–-]\s*/, '').trim() || '(누락)'
  if (lhsWits.includes('WH'))   t['WH (웨스트코트-호르트)'] = readable(lhsText)
  if (lhsWits.includes('Treg')) t['Treg (트레겔레스)'] = readable(lhsText)
  if (lhsWits.includes('NA28')) t['NA28 (네슬-알란트)'] = readable(lhsText)
  if (lhsWits.includes('RP'))   t['RP (비잔틴)'] = readable(lhsText)
  for (const e of rhsEntries) {
    for (const w of e.witnesses) {
      t[WITNESS_NAMES[w] || w] = readable(e.text)
    }
  }
  return t
}

// ── SBLGNT 텍스트 파일 파싱 메인 ─────────────────────────────────────────
function parseSBLGNT(bookId, text) {
  const variants = []
  const lines = text.split('\n')

  let currentCh  = 0
  let currentVerse = 0

  const chapterHeaderRe = /^[A-Za-z0-9]+ (\d+):\d+/
  const verseHeaderRe   = /^(\d+):(\d+)/
  const variantLineRe   = /^(\d+:\d+\s+)?(.+)\s+]\s+(.+)$/
  const bulletRe        = /^•\s+(.+)/

  let pendingVarLines = []  // 현재 절에 쌓인 variant 텍스트 줄들

  const flushVariants = (ch, verse, varLines) => {
    for (const vl of varLines) {
      const parsed = parseLine(vl)
      if (!parsed) continue
      const { lhsText, lhsWitnesses: lhsWits, rhsEntries } = parsed
      const type = detectType(lhsText, rhsEntries)
      variants.push({
        bookId,
        chapter: ch,
        verse,
        type,
        source: 'sblgnt', // ← UI 배지 · 자동 감지 표시
        title: buildTitle(type, lhsText, rhsEntries),
        summary: buildSummary(lhsText, lhsWits, rhsEntries),
        witnesses: buildWitnesses(type, lhsText, lhsWits, rhsEntries),
        translations: buildTranslations(lhsText, lhsWits, rhsEntries),
        refs: ['SBLGNT Apparatus (Faithlife/SBLGNT, CC BY 4.0)'],
      })
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // "Mark 1:1" 형태 챕터 헤더
    if (/^[A-Za-z1-9]+ \d+:\d+$/.test(line)) {
      flushVariants(currentCh, currentVerse, pendingVarLines)
      pendingVarLines = []
      const m = line.match(/(\d+):(\d+)$/)
      if (m) { currentCh = +m[1]; currentVerse = +m[2] }
      continue
    }

    // "1:1 text WH ] ..." 또는 "2 text WH ] ..." 형태
    const directMatch = line.match(/^(\d+)(:\d+)?\s+(.+].*)/);
    if (directMatch && line.includes(']')) {
      flushVariants(currentCh, currentVerse, pendingVarLines)
      pendingVarLines = []
      // 절 번호 업데이트 (챕터:절 또는 절만)
      if (directMatch[2]) {
        currentCh    = +directMatch[1]
        currentVerse = +directMatch[2].slice(1)
      } else {
        currentVerse = +directMatch[1]
      }
      pendingVarLines.push(directMatch[3])
      continue
    }

    // "• text WH ] ..." 같은 줄 (같은 절, 추가 variant)
    const bulletMatch = line.match(/^•\s+(.+].*)/);
    if (bulletMatch) {
      pendingVarLines.push(bulletMatch[1])
      continue
    }
  }

  // 마지막 flush
  flushVariants(currentCh, currentVerse, pendingVarLines)

  return variants
}

// ── 메인: 다운로드 + 파싱 + 저장 ─────────────────────────────────────────
const BOOKS_TO_PROCESS = ['Matt', 'Mark', 'Luke', 'John', 'Rom']  // 현재 앱에 있는 NT 책

try { mkdirSync(CACHE_DIR, { recursive: true }) } catch {}
try { mkdirSync(OUT_DIR, { recursive: true })   } catch {}

for (const book of BOOKS_TO_PROCESS) {
  const cacheFile = `${CACHE_DIR}/${book}.txt`
  let text

  // 캐시에서 읽거나 fetch
  try {
    text = readFileSync(cacheFile, 'utf8')
    console.log(`[${book}] 캐시에서 로드`)
  } catch {
    const url = `https://raw.githubusercontent.com/Faithlife/SBLGNT/master/data/sblgntapp/text/${book}.txt`
    console.log(`[${book}] 다운로드: ${url}`)
    const res = await fetch(url)
    if (!res.ok) { console.error(`[${book}] 다운로드 실패: ${res.status}`); continue }
    text = await res.text()
    writeFileSync(cacheFile, text)
  }

  const variants = parseSBLGNT(BOOK_MAP[book] || book, text)
  const outPath  = `${OUT_DIR}/${book}.json`
  writeFileSync(outPath, JSON.stringify(variants, null, 2))
  console.log(`[${book}] ${variants.length}개 이문 → ${outPath}`)
}

console.log('\n완료. bible-mindmap/public/data/variants/ 에 JSON 파일 생성됨.')
