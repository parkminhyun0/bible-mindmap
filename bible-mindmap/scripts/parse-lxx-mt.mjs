#!/usr/bin/env node
// parse-lxx-mt.mjs — Septuagint (LXX) vs Masoretic Text (MT) 자동 이문 감지 (Stage 3-C)
// 사용: node scripts/parse-lxx-mt.mjs [BookId]  (인자 없으면 39권 OT 전체)
// 입력:
//   .lxx-cache/{Book}.js       (openscriptures/GreekResources LxxLemmas · 다운로드 자동)
//   .oshb-cache/{Book}.xml     (OSHB WLC XML · MT 원문)
// 출력: public/data/variants/{OTBook}.json 병합 · source='lxx-mt'
// 필터: 구조적 차이 (누락/추가 verse · 단어 수 30%+ 차이 · 절대 차이 5+ 단어)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const LXX_CACHE = join(ROOT, '.lxx-cache')
const OSHB_CACHE = join(ROOT, '.oshb-cache')
const OUT_DIR = join(ROOT, 'public/data/variants')

try { mkdirSync(LXX_CACHE, { recursive: true }) } catch {}

const LXX_URL_BASE = 'https://raw.githubusercontent.com/openscriptures/GreekResources/master/LxxLemmas'

// OT 39권 · LxxLemmas 파일명 매핑 (STEPBible ID → LxxLemmas 파일명)
const OT_MAP = {
  Gen: 'Gen', Exod: 'Exod', Lev: 'Lev', Num: 'Num', Deut: 'Deut',
  Josh: 'Josh', Judg: 'Judg', Ruth: 'Ruth',
  '1Sam': '1Sam', '2Sam': '2Sam', '1Kgs': '1Kgs', '2Kgs': '2Kgs',
  '1Chr': '1Chr', '2Chr': '2Chr',
  Ezra: 'Ezra', Neh: 'Neh', Esth: 'Esth',
  Job: 'Job', Ps: 'Ps', Prov: 'Prov', Eccl: 'Eccl', Song: 'Song',
  Isa: 'Isa', Jer: 'Jer', Lam: 'Lam', Ezek: 'Ezek', Dan: 'Dan',
  Hos: 'Hos', Joel: 'Joel', Amos: 'Amos', Obad: 'Obad', Jonah: 'Jonah',
  Mic: 'Mic', Nah: 'Nah', Hab: 'Hab', Zeph: 'Zeph',
  Hag: 'Hag', Zech: 'Zech', Mal: 'Mal',
}

async function fetchLxx(bookId) {
  const file = OT_MAP[bookId]
  if (!file) throw new Error(`Unknown OT book: ${bookId}`)
  const cachePath = join(LXX_CACHE, `${file}.js`)
  if (existsSync(cachePath)) {
    console.log(`  [LXX ${bookId}] 캐시`)
    return readFileSync(cachePath, 'utf8')
  }
  const url = `${LXX_URL_BASE}/${file}.js`
  console.log(`  [LXX ${bookId}] 다운로드: ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const text = await res.text()
  writeFileSync(cachePath, text, 'utf8')
  return text
}

// LxxLemmas JSON 파싱 · verse → 단어 배열
// 형식: `{"Gen.1.1": [{"key":"εν","lemma":"ἐν"}, ...], ...}`
function parseLxxJson(jsText) {
  // JS 파일이지만 실제로는 유효 JSON (백틱·주석 없음)
  return JSON.parse(jsText)
}

function getLxxVerses(bookId, lxxData) {
  const prefix = `${OT_MAP[bookId]}.`
  const result = {} // "ch:v" → wordCount
  for (const [ref, words] of Object.entries(lxxData)) {
    if (!ref.startsWith(prefix)) continue
    const parts = ref.slice(prefix.length).split('.')
    if (parts.length !== 2) continue
    const ch = parseInt(parts[0], 10)
    const v = parseInt(parts[1], 10)
    if (!Number.isFinite(ch) || !Number.isFinite(v)) continue
    result[`${ch}:${v}`] = { count: words.length, words }
  }
  return result
}

// MT verse에서 단어 수 추출 (OSHB XML · 형태소 분해 무시하고 실제 단어 카운트)
function extractMTWordCounts(bookId) {
  const xmlPath = join(OSHB_CACHE, `${bookId}.xml`)
  if (!existsSync(xmlPath)) return null
  const xml = readFileSync(xmlPath, 'utf8')
  const result = {}
  const verseRE = /<verse\s+osisID="([^"]+)"[^>]*\/?>([\s\S]*?)(?=<verse\s+osisID=|<\/chapter>)/g
  let m
  while ((m = verseRE.exec(xml)) !== null) {
    const [, osisID, body] = m
    const parts = osisID.split('.')
    if (parts.length !== 3 || parts[0] !== bookId) continue
    const [_, chS, vS] = parts
    // 최상위 <w> 개수 (Ketiv/Qere note 안의 <w>는 제외)
    // 단순 카운트: <w[^>]*type="x-ketiv"[^>]*> 는 제외 · 나머지 <w>만
    let bodyClean = body.replace(/<note[\s\S]*?<\/note>/g, '') // note 내부 무시
    const wordMatches = bodyClean.match(/<w\b/g) || []
    result[`${chS}:${vS}`] = wordMatches.length
  }
  return result
}

function makeVariant(bookId, ch, verse, mtCount, lxxCount, diffType, lxxWords) {
  const lxxPreview = lxxWords ? lxxWords.slice(0, 8).map(w => w.lemma || w.key).join(' ') + (lxxWords.length > 8 ? ' ...' : '') : ''
  return {
    bookId,
    chapter: ch,
    verse,
    type: diffType === 'missing_lxx' ? 'omission' : diffType === 'missing_mt' ? 'addition' : 'substitution',
    source: 'lxx-mt',
    title: `LXX vs MT · ${diffType === 'missing_lxx' ? 'LXX 누락' : diffType === 'missing_mt' ? 'LXX 추가' : `단어 수 차이 (MT ${mtCount}·LXX ${lxxCount})`}`,
    summary: `Septuagint(LXX) vs Masoretic Text(MT) 자동 대조 · 구조적 차이 감지. ${diffType === 'missing_lxx' ? 'LXX 본문에서 이 절 누락됨.' : diffType === 'missing_mt' ? 'MT 본문에서 이 절 누락됨 (LXX만 존재).' : `단어 수: MT ${mtCount}개 vs LXX ${lxxCount}개 (차이 ${Math.abs(mtCount - lxxCount)}개 · ${Math.round(Math.abs(mtCount - lxxCount) / Math.max(mtCount, lxxCount) * 100)}%).`}`,
    witnesses: {
      variants: {
        MT: `${mtCount}단어 (자세히는 원문 참조)`,
        LXX: lxxPreview ? `${lxxCount}단어 · ${lxxPreview}` : `${lxxCount}단어`,
      },
    },
    metzger: 'C',
    translations: {
      krv: 'MT (마소라) 기반 번역 · 표준',
      esv: 'MT 기반 · LXX 참조 각주 (일부)',
    },
    significance: 'LXX는 BC 3-2세기 헬라어 번역 · MT와 여러 지점에서 구조 다름 (예: 예레미야 LXX가 MT보다 1/8 짧음 · 사무엘 대량 삽입 등). 신약 인용의 다수가 LXX 따름 (예: 히브리서 10:5 = 시 40:7 LXX).',
    refs: [
      'LxxLemmas (openscriptures/GreekResources · Rahlfs Septuagint 어휘)',
      'WLC (파블릭 도메인) · openscriptures/morphhb MT 대조',
      '⚠ 자동 구조 감지 (word count 기반) · 실제 텍스트 diff는 아님 · BHS·Rahlfs·Göttingen LXX 학술 검증 권장',
      '참고: Tov (2012) *Textual Criticism of the Hebrew Bible* · Jobes-Silva (2015) *Invitation to the Septuagint*',
    ],
  }
}

async function processBook(bookId) {
  console.log(`\n[${bookId}]`)
  let lxxData
  try {
    const jsText = await fetchLxx(bookId)
    lxxData = parseLxxJson(jsText)
  } catch (err) {
    console.log(`  ⚠ LXX 데이터 없음: ${err.message}`)
    return { bookId, lxxmt: 0, kept: 0, total: 0 }
  }
  const lxxVerses = getLxxVerses(bookId, lxxData)
  const mtCounts = extractMTWordCounts(bookId)
  if (!mtCounts) {
    console.log(`  ⚠ MT XML 없음 (parse-oshb.mjs 먼저 실행)`)
    return { bookId, lxxmt: 0, kept: 0, total: 0 }
  }

  // 알려진 numbering shift 책 · 구조적 diff (missing verse) 필터 제외
  // Ps: 시편 9-10 합쳐짐 · 이후 대량 shift (LXX 9 = MT 9-10 · LXX 113 = MT 114-115 등)
  // Jer: 절 순서 완전 다름 (25 이후) · 단, Jer는 실제 학술적 유의미하므로 유지
  // Joel/Mal: chapter 경계 다름 (verse_mismatch.json 참조)
  const SKIP_STRUCTURAL = new Set(['Ps', 'Joel', 'Mal'])  // numbering shift 대량 · 실제 이문 아님
  const skipStructural = SKIP_STRUCTURAL.has(bookId)

  const variants = []
  let scanned = 0, structural = 0, wordDiff = 0, skippedShort = 0, skippedNumbering = 0
  const allRefs = new Set([...Object.keys(lxxVerses), ...Object.keys(mtCounts)])
  for (const key of allRefs) {
    scanned++
    const [chS, vS] = key.split(':')
    const ch = parseInt(chS, 10), verse = parseInt(vS, 10)
    const mt = mtCounts[key]
    const lxx = lxxVerses[key]
    // Case 1: 절 누락 (skip if numbering-shift book)
    if (mt !== undefined && !lxx) {
      if (skipStructural) { skippedNumbering++; continue }
      variants.push(makeVariant(bookId, ch, verse, mt, 0, 'missing_lxx'))
      structural++
      continue
    }
    if (lxx && mt === undefined) {
      if (skipStructural) { skippedNumbering++; continue }
      variants.push(makeVariant(bookId, ch, verse, 0, lxx.count, 'missing_mt', lxx.words))
      structural++
      continue
    }
    // Case 2: 단어 수 극단 차이 (언어 차이 감안 · 매우 보수적 임계)
    if (mt && lxx) {
      // 짧은 절 skip: MT < 6단어 · 원래 언어 차이 큼 · 노이즈 유발
      if (mt < 6) { skippedShort++; continue }
      const diff = Math.abs(mt - lxx.count)
      const maxCount = Math.max(mt, lxx.count)
      const ratio = diff / maxCount
      // 학술적 유의미 → 절대 차이 ≥ 10 단어 AND 비율 ≥ 60% OR 절대 차이 ≥ 20
      if ((diff >= 10 && ratio >= 0.60) || diff >= 20) {
        variants.push(makeVariant(bookId, ch, verse, mt, lxx.count, 'word_count_diff', lxx.words))
        wordDiff++
      }
    }
  }

  const outPath = join(OUT_DIR, `${bookId}.json`)
  let existing = []
  if (existsSync(outPath)) {
    try {
      existing = JSON.parse(readFileSync(outPath, 'utf8'))
      if (!Array.isArray(existing)) existing = []
    } catch { /* ignore */ }
  }
  const kept = existing.filter((v) => v.source !== 'lxx-mt')
  const merged = [...kept, ...variants]
  writeFileSync(outPath, JSON.stringify(merged), 'utf8')
  console.log(`  LXX-MT 자동 ${variants.length}건 (구조적 ${structural} · 단어 수 ${wordDiff}) + 기존 ${kept.length}건 = 총 ${merged.length}건`)
  return { bookId, lxxmt: variants.length, kept: kept.length, total: merged.length, structural, wordDiff }
}

// ── 메인 ──────────────────────────────────────────────
const target = process.argv[2]
const targets = target ? [target] : Object.keys(OT_MAP)

if (target && !OT_MAP[target]) {
  console.error(`❌ ${target}: OT 책 아님. 지원: ${Object.keys(OT_MAP).join(', ')}`)
  process.exit(1)
}

console.log(`🔍 parse-lxx-mt · 대상: ${targets.length}권`)

let totalLxxmt = 0, totalStructural = 0, totalWordDiff = 0
for (const bookId of targets) {
  try {
    const r = await processBook(bookId)
    totalLxxmt += r.lxxmt
    totalStructural += r.structural || 0
    totalWordDiff += r.wordDiff || 0
  } catch (err) {
    console.error(`  ❌ ${err.message}`)
  }
}

console.log('')
console.log(`✅ 완료 · LXX-MT 자동 이문 총 ${totalLxxmt}건 (구조적 ${totalStructural} + 단어 수 차이 ${totalWordDiff})`)
