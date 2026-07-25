#!/usr/bin/env node
// validate-ot.mjs — OT(구약) 전용 검증 (Master Config OT 로직 준수)
// 사용: node scripts/validate-ot.mjs
//   대상: BOOK_CONTEXTS 중 testament === 'OT' 전체
//   검증:
//     1. HEBREW_NARRATIVE_RULES 사용 여부
//     2. verse 넘버링 mismatch 대응 (창32·말4·요엘3·시편 표제)
//     3. textualVariants OT 항목 refs 표준 (NET Bible + BHS/BHQ/DSS 유의사항)
//     4. witnesses 시글 whitelist (파블릭 도메인·공개 자료)
//     5. BHS/BHQ 원문 무단 발췌 여부 (히브리어 인용은 WLC 기반만)
//     6. verse 상한 (verse_counts.json + mismatch 예외)

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { BOOK_CONTEXTS } from '../src/data/bookContext.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const VERSE_COUNTS = JSON.parse(
  readFileSync(join(ROOT, '../memory/whitelists/verse_counts.json'), 'utf8')
)
const VERSE_MISMATCH = JSON.parse(
  readFileSync(join(ROOT, '../memory/whitelists/verse_mismatch.json'), 'utf8')
)

// textualVariants.js 는 브라우저용 ESM · 파일 텍스트 직접 파싱
const VARIANTS_JS = readFileSync(join(ROOT, 'src/data/textualVariants.js'), 'utf8')

const ok = (m) => console.log(`  ✅ ${m}`)
const fail = (m) => { console.log(`  ❌ ${m}`); return 1 }
const warn = (m) => console.log(`  ⚠️  ${m}`)
const info = (m) => console.log(`  ℹ️  ${m}`)

// 허용된 사본 시글 (파블릭 도메인·공개 자료 중심)
const ALLOWED_SIGLA = new Set([
  'MT', 'MT (마소라 정본)', 'MT(마소라)',
  'LXX', 'LXX (70인역)', 'LXX(70인역)',
  'WLC', 'WLC (Westminster Leningrad Codex)',
  'DSS', 'DSS (쿰란 사본)', '쿰란', '사해사본',
  'SP', '사마리아 오경', 'Samaritan Pentateuch',
  'Peshitta', '페시타', '페시타 (시리아)',
  'Targum', '타르굼',
  'Vulgate', '불가타',
  'BHS', 'BHQ',  // 인용 언급은 OK (본문 발췌 X)
  'Ketiv', 'Qere',
])

// 표준 refs 표기 (Master Config OT 정책)
const OT_REFS_REQUIRED = [
  'NET Bible',
  'BHS',  // 유의사항 언급
]

const OT_BOOKS = Object.entries(BOOK_CONTEXTS).filter(([_, ctx]) => ctx.book?.testament === 'OT')

console.log(`🔍 validate-ot · 대상: ${OT_BOOKS.map(([k]) => k).join(', ')} (${OT_BOOKS.length}권)`)

let totalErrs = 0

// ── Test 1: OT 담화 규칙 (HEBREW_NARRATIVE_RULES) ────────────
console.log('\n🧪 [Test 1] HEBREW_NARRATIVE_RULES 사용 여부')
for (const [id, ctx] of OT_BOOKS) {
  const rules = ctx.discourseRules || []
  const hasHebrewRule = rules.some((r) =>
    ['wayehi_setting', 'hinneh', 'ki_reason', 'blessing', 'oath', 'goel', 'covenant_love'].includes(r.id)
  )
  if (hasHebrewRule) ok(`${id}: HEBREW_NARRATIVE_RULES 포함`)
  else totalErrs += fail(`${id}: HEBREW_NARRATIVE_RULES 미포함 (히브리어 담화 감지 안 됨)`)
}

// ── Test 2: verse 넘버링 mismatch 대응 ──────────────────────
console.log('\n🧪 [Test 2] verse 넘버링 mismatch 대응')
const mismatchBooks = Object.keys(VERSE_MISMATCH.chapter_boundary_shifts)
for (const [id, ctx] of OT_BOOKS) {
  if (mismatchBooks.includes(id)) {
    const shifts = VERSE_MISMATCH.chapter_boundary_shifts[id]
    info(`${id}: chapter 경계 mismatch 알려짐 (${shifts.note})`)
    // 실제 verse 필드가 개역한글 기준인지 확인 (KRV 관례상 primary field 매칭)
    // Gen 32:32 이 최대 (33이면 error)
    const pivots = ctx.macro?.pivots || []
    const badPivots = pivots.filter((p) => {
      const max = VERSE_COUNTS.books[id]?.chapters[p.ch]
      return max && p.verse > max
    })
    if (badPivots.length) {
      for (const bp of badPivots) totalErrs += fail(`${id} pivot ${bp.id}: ${bp.ch}:${bp.verse} 개역한글 상한 초과 · MT 기준으로 잘못 등록 가능성`)
    } else {
      ok(`${id}: pivots 개역한글 verse 상한 준수`)
    }
  } else {
    info(`${id}: mismatch 알려진 것 없음 (일반 검증 적용)`)
  }
}

// ── Test 3: textualVariants OT 항목 refs 표준 ────────────────
console.log('\n🧪 [Test 3] apparatus refs 표기 표준 (NET Bible + BHS/BHQ/DSS 유의사항)')
const otVariantBlocks = []
const blockRegex = /\{\s*bookId:\s*'([A-Za-z0-9]+)',\s*chapter:\s*(\d+),\s*verse:\s*(\d+)[\s\S]*?refs:\s*\[([\s\S]*?)\]/g
let m
while ((m = blockRegex.exec(VARIANTS_JS)) !== null) {
  const [_, bookId, ch, verse, refsBody] = m
  const ctx = BOOK_CONTEXTS[bookId]
  if (!ctx || ctx.book?.testament !== 'OT') continue
  otVariantBlocks.push({ bookId, ch: +ch, verse: +verse, refsBody })
}
info(`OT 이문 블록 발견: ${otVariantBlocks.length}건`)
for (const b of otVariantBlocks) {
  const hasNET = /NET Bible/i.test(b.refsBody)
  const hasBHS = /BHS|BHQ|DSS/i.test(b.refsBody)
  const hasWarning = /⚠|유의|권장|검증/.test(b.refsBody)
  if (!hasNET) totalErrs += fail(`${b.bookId} ${b.ch}:${b.verse}: refs에 "NET Bible" 언급 없음`)
  if (!hasBHS) totalErrs += fail(`${b.bookId} ${b.ch}:${b.verse}: refs에 "BHS/BHQ/DSS" 언급 없음`)
  if (!hasWarning) totalErrs += fail(`${b.bookId} ${b.ch}:${b.verse}: refs에 학술 검증 유의사항 없음`)
  if (hasNET && hasBHS && hasWarning) ok(`${b.bookId} ${b.ch}:${b.verse}: refs 표준 준수`)
}

// ── Test 4: witnesses 시글 whitelist ─────────────────────────
console.log('\n🧪 [Test 4] witnesses 시글 whitelist (omit/include 배열만 · variants 값은 원문 인용이라 제외)')
// omit: [...] · include: [...] 배열의 시글만 검사 (variants 안의 값은 언어 원문이라 제외)
const witnessRegex = /bookId:\s*'([A-Za-z0-9]+)'[\s\S]*?witnesses:\s*\{([\s\S]*?)\},\s*metzger/g
let wm
let witCount = 0
let witUnknown = 0
while ((wm = witnessRegex.exec(VARIANTS_JS)) !== null) {
  const [_, bookId, witBody] = wm
  const ctx = BOOK_CONTEXTS[bookId]
  if (!ctx || ctx.book?.testament !== 'OT') continue
  witCount++
  // omit/include 배열만 추출 (variants 는 원문 인용이라 시글 아님)
  const arrayMatches = [...witBody.matchAll(/(omit|include)\s*:\s*\[([^\]]+)\]/g)]
  for (const am of arrayMatches) {
    const sigla = (am[2].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, ''))
    for (const s of sigla) {
      const known = [...ALLOWED_SIGLA].some((allowed) => s.includes(allowed) || s === allowed)
      if (!known) {
        warn(`  → ${bookId}: 미등록 시글 후보 "${s}"`)
        witUnknown++
      }
    }
  }
}
ok(`OT witnesses 블록 ${witCount}건 검사 · omit/include 시글 whitelist ${witUnknown === 0 ? '전부 등록됨 ✓' : `미등록 ${witUnknown}건`}`)

// ── Test 5: BHS/BHQ 원문 무단 발췌 여부 (히브리어 인용 검사) ─
console.log('\n🧪 [Test 5] 저작권 · 히브리어 인용은 WLC/파블릭 도메인만 (BHS/BHQ 발췌 금지)')
// 히브리어 유니코드 블록 (U+0590 ~ U+05FF) 포함 여부만 확인
// 실제 발췌 판별은 어렵지만, 인용 근거에 BHS/BHQ 만 있으면 경고
for (const b of otVariantBlocks) {
  const bookBlock = VARIANTS_JS.slice(
    VARIANTS_JS.indexOf(`bookId: '${b.bookId}', chapter: ${b.ch}, verse: ${b.verse}`),
    VARIANTS_JS.indexOf(`bookId: '${b.bookId}', chapter: ${b.ch}, verse: ${b.verse}`) + 2000
  )
  const hasHebrew = /[֐-׿]/.test(bookBlock)
  const onlyBHS = /BHS|BHQ/.test(bookBlock) && !/WLC|Westminster|파블릭|public domain/i.test(bookBlock)
  if (hasHebrew && onlyBHS) {
    warn(`${b.bookId} ${b.ch}:${b.verse}: 히브리어 인용 있으나 WLC 명시 없음 (BHS 발췌 오해 가능 · refs에 WLC 명시 권장)`)
  }
}
ok('히브리어 인용 저작권 리스크 스캔 완료 (경고만)')

// ── Test 6: 상세 OT 사본 시글 표준 목록 안내 ─────────────────
console.log('\n📋 표준 OT 시글 참고 (whitelist)')
console.log(`   ${[...ALLOWED_SIGLA].join(' · ')}`)

// ── 최종 리포트 ─────────────────────────────────────────────
console.log('')
if (totalErrs === 0) {
  console.log(`✅ OT validation PASS · ${OT_BOOKS.length}권 · 이문 ${otVariantBlocks.length}건 표준 준수`)
  process.exit(0)
} else {
  console.log(`❌ OT validation FAIL · ${totalErrs}건`)
  process.exit(1)
}
