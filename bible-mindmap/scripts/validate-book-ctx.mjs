#!/usr/bin/env node
// validate-book-ctx.mjs — Layer 1 (Structural) + Layer 4 (Build) 검증
// 사용: node scripts/validate-book-ctx.mjs [BookId]
//   BookId 생략 시 BOOK_CONTEXTS 전체 검증
//   BookId 지정 시 해당 책만 검증 (예: node scripts/validate-book-ctx.mjs Luke)
// exit 0 = 모두 PASS · exit 1 = FAIL 있음

import { readFileSync } from 'node:fs'
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

// ── 진단 로그 유틸 ────────────────────────────────────────────────
const ok = (msg) => console.log(`  ✅ ${msg}`)
const fail = (msg) => { console.log(`  ❌ ${msg}`); return 1 }
const warn = (msg) => console.log(`  ⚠️  ${msg}`)
const info = (msg) => console.log(`  ℹ️  ${msg}`)

// ── 필수 필드 스키마 ─────────────────────────────────────────────
const REQUIRED_TOP = ['id', 'book', 'chapters', 'discourseRules', 'meta', 'macro']
const REQUIRED_BOOK = ['ko', 'bollsNum', 'lexId', 'lexCorpus', 'en', 'testament']
const REQUIRED_META = ['genre', 'year', 'place', 'author', 'audience', 'theme', 'chapterAgenda']
const REQUIRED_MACRO = ['sections', 'pivots', 'arcs']

// ── verse 유효성 도우미 ──────────────────────────────────────────
function getMaxVerse(lexId, chapter) {
  const bookData = VERSE_COUNTS.books[lexId]
  if (!bookData) return null
  return bookData.chapters[chapter] ?? null
}

function chapterExists(lexId, chapter) {
  const bookData = VERSE_COUNTS.books[lexId]
  if (!bookData) return false
  return chapter >= 1 && chapter <= bookData._chapters
}

function isDisputedLateAddition(lexId, ch, verse) {
  return VERSE_MISMATCH.disputed_verses_late_addition.verses.some((d) => {
    if (d.book !== lexId) return false
    const [dch, drange] = d.ref.split(':')
    if (parseInt(dch, 10) !== ch) return false
    if (drange.includes('-')) {
      const [from, to] = drange.split('-').map((v) => parseInt(v.replace(/[a-z]/g, ''), 10))
      return verse >= from && verse <= to
    }
    return parseInt(drange.replace(/[a-z]/g, ''), 10) === verse
  })
}

// ── 개별 검증 함수 ──────────────────────────────────────────────
function validateSchema(ctx) {
  let errs = 0
  for (const k of REQUIRED_TOP) {
    if (!(k in ctx)) errs += fail(`필수 필드 누락: ${k}`)
  }
  if (ctx.book) {
    for (const k of REQUIRED_BOOK) {
      if (!(k in ctx.book)) errs += fail(`book.${k} 누락`)
    }
  }
  if (ctx.meta) {
    for (const k of REQUIRED_META) {
      if (!(k in ctx.meta)) errs += fail(`meta.${k} 누락`)
    }
  }
  if (ctx.macro) {
    for (const k of REQUIRED_MACRO) {
      if (!(k in ctx.macro) || !Array.isArray(ctx.macro[k])) {
        errs += fail(`macro.${k} 누락 또는 비배열`)
      }
    }
  }
  if (errs === 0) ok('스키마 필드 완결성')
  return errs
}

function validateChapters(ctx) {
  const lexId = ctx.book?.lexId
  const declared = ctx.chapters
  const actual = VERSE_COUNTS.books[lexId]?._chapters
  if (!actual) {
    warn(`verse_counts.json에 ${lexId} 없음 — chapters 검증 스킵`)
    return 0
  }
  if (declared !== actual) {
    return fail(`chapters 불일치: 선언 ${declared} vs 실측 ${actual}`)
  }
  ok(`chapters ${declared}장 (실측 일치)`)
  return 0
}

function validateSections(ctx) {
  let errs = 0
  const secs = ctx.macro.sections
  const totalCh = ctx.chapters

  const seen = new Set()
  let prevTo = 0
  for (const s of secs) {
    if (!s.id || !s.label || !s.color) errs += fail(`section 필수 필드 누락: ${JSON.stringify(s)}`)
    if (seen.has(s.id)) errs += fail(`section id 중복: ${s.id}`)
    seen.add(s.id)
    if (s.fromCh > s.toCh) errs += fail(`section ${s.id}: fromCh(${s.fromCh}) > toCh(${s.toCh})`)
    if (s.fromCh < 1 || s.toCh > totalCh) errs += fail(`section ${s.id}: 범위 [${s.fromCh}-${s.toCh}] 초과 (책 ${totalCh}장)`)
    if (s.fromCh !== prevTo + 1 && prevTo !== 0) {
      warn(`section ${s.id}: 이전 섹션 끝(${prevTo}) → 시작(${s.fromCh}) 사이 공백/겹침`)
    }
    prevTo = s.toCh
  }
  if (secs.length && secs[secs.length - 1].toCh !== totalCh) {
    warn(`마지막 section 끝(${secs[secs.length - 1].toCh}) ≠ 책 마지막 장(${totalCh})`)
  }
  if (errs === 0) ok(`sections ${secs.length}개 (범위·연속성)`)
  return errs
}

function validatePivots(ctx) {
  let errs = 0
  const lexId = ctx.book?.lexId
  const seen = new Set()
  for (const p of ctx.macro.pivots) {
    if (!p.id || !p.label || !p.color) errs += fail(`pivot 필수 필드 누락: ${JSON.stringify(p)}`)
    if (seen.has(p.id)) errs += fail(`pivot id 중복: ${p.id}`)
    seen.add(p.id)
    if (!chapterExists(lexId, p.ch)) {
      errs += fail(`pivot ${p.id}: 존재하지 않는 장 ${p.ch}`)
      continue
    }
    const max = getMaxVerse(lexId, p.ch)
    if (max !== null && p.verse > max && !isDisputedLateAddition(lexId, p.ch, p.verse)) {
      errs += fail(`pivot ${p.id}: verse ${p.ch}:${p.verse} > 최대 ${max}`)
    }
  }
  if (errs === 0) ok(`pivots ${ctx.macro.pivots.length}개 (verse 유효)`)
  return errs
}

function validateArcs(ctx) {
  let errs = 0
  const pivotIds = new Set(ctx.macro.pivots.map((p) => p.id))
  const seen = new Set()
  for (const a of ctx.macro.arcs) {
    if (!a.id || !a.label || !a.color) errs += fail(`arc 필수 필드 누락: ${JSON.stringify(a)}`)
    if (seen.has(a.id)) errs += fail(`arc id 중복: ${a.id}`)
    seen.add(a.id)
    if (!pivotIds.has(a.from)) errs += fail(`arc ${a.id}: from='${a.from}' 은 pivots에 없음`)
    if (!pivotIds.has(a.to)) errs += fail(`arc ${a.id}: to='${a.to}' 은 pivots에 없음`)
  }
  if (errs === 0) ok(`arcs ${ctx.macro.arcs.length}개 (pivots 참조 유효)`)
  return errs
}

function validateManualDiscourse(ctx) {
  if (!ctx.manualDiscourse) { info('manualDiscourse 없음 (선택)'); return 0 }
  let errs = 0
  const lexId = ctx.book?.lexId
  const ruleIds = new Set(ctx.discourseRules.map((r) => r.id))
  const entries = Object.entries(ctx.manualDiscourse)
  for (const [key, markerId] of entries) {
    const m = key.match(/^(\d+):(\d+)$/)
    if (!m) { errs += fail(`manualDiscourse 키 형식 오류: '${key}' (예상 'ch:verse')`); continue }
    const [ , chS, vS ] = m
    const ch = parseInt(chS, 10), verse = parseInt(vS, 10)
    if (!chapterExists(lexId, ch)) { errs += fail(`manualDiscourse ${key}: 장 ${ch} 없음`); continue }
    const max = getMaxVerse(lexId, ch)
    if (max !== null && verse > max && !isDisputedLateAddition(lexId, ch, verse)) {
      errs += fail(`manualDiscourse ${key}: verse > 최대 ${max}`)
    }
    if (!ruleIds.has(markerId)) errs += fail(`manualDiscourse ${key}: markerId '${markerId}' 은 discourseRules에 없음`)
  }
  if (errs === 0) ok(`manualDiscourse ${entries.length}개 (verse·markerId 유효)`)
  return errs
}

function validateDisputedRanges(ctx) {
  if (!ctx.disputedRanges) { info('disputedRanges 없음 (선택)'); return 0 }
  let errs = 0
  const lexId = ctx.book?.lexId
  for (const d of ctx.disputedRanges) {
    if (!d.label) errs += fail(`disputedRange label 누락: ${JSON.stringify(d)}`)
    if (!chapterExists(lexId, d.ch)) { errs += fail(`disputedRange: 장 ${d.ch} 없음`); continue }
    if (d.from > d.to) errs += fail(`disputedRange ch${d.ch}: from > to`)
    // late addition 은 verse_counts 초과 허용
  }
  if (errs === 0) ok(`disputedRanges ${ctx.disputedRanges.length}개 (범위 유효)`)
  return errs
}

function validateChapterAgenda(ctx) {
  const agenda = ctx.meta?.chapterAgenda
  if (!agenda) return fail(`meta.chapterAgenda 누락`)
  const keys = Object.keys(agenda).map(Number).sort((a, b) => a - b)
  if (keys.length !== ctx.chapters) {
    warn(`chapterAgenda ${keys.length}개 ≠ chapters ${ctx.chapters}`)
  }
  ok(`chapterAgenda ${keys.length}개`)
  return 0
}

// ── 메인 실행 ────────────────────────────────────────────────
function validateBook(bookId, ctx) {
  console.log(`\n📖 ${bookId} (${ctx.book?.ko || '?'})`)
  let errs = 0
  errs += validateSchema(ctx)
  errs += validateChapters(ctx)
  errs += validateSections(ctx)
  errs += validatePivots(ctx)
  errs += validateArcs(ctx)
  errs += validateManualDiscourse(ctx)
  errs += validateDisputedRanges(ctx)
  errs += validateChapterAgenda(ctx)
  return errs
}

const target = process.argv[2]
const books = target ? { [target]: BOOK_CONTEXTS[target] } : BOOK_CONTEXTS
if (target && !BOOK_CONTEXTS[target]) {
  console.error(`❌ ${target}: BOOK_CONTEXTS에 없음. 등록된 책: ${Object.keys(BOOK_CONTEXTS).join(', ')}`)
  process.exit(1)
}

console.log(`🔍 validate-book-ctx · 대상: ${Object.keys(books).join(', ')}`)
let totalErrs = 0
for (const [id, ctx] of Object.entries(books)) {
  if (!ctx) { console.error(`❌ ${id}: 컨텍스트 없음`); totalErrs++; continue }
  totalErrs += validateBook(id, ctx)
}

console.log('')
if (totalErrs === 0) {
  console.log(`✅ 전체 PASS (${Object.keys(books).length}권)`)
  process.exit(0)
} else {
  console.log(`❌ ${totalErrs}건 실패`)
  process.exit(1)
}
