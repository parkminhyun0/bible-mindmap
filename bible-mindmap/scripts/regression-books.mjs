#!/usr/bin/env node
// regression-books.mjs — Layer 5 (Regression) 스모크 테스트
// 사용: node scripts/regression-books.mjs
//   - BOOK_CONTEXTS 전체 재import 무결성
//   - 각 책의 lex 데이터 존재 확인
//   - NT 책: SBLGNT variants JSON 존재 확인
//   - validate-book-ctx.mjs 위임 실행 (Layer 1·4)
// exit 0 = 모두 PASS · exit 1 = 실패

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { BOOK_CONTEXTS, SUPPORTED_BOOK_IDS } from '../src/data/bookContext.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const LEX_DIR = join(ROOT, 'public/data/lex')
const VARIANTS_DIR = join(ROOT, 'public/data/variants')

// SBLGNT 자동 로드 대상 (textualVariants.js의 SBLGNT_BOOKS와 동기화)
const SBLGNT_BOOKS = new Set(['Matt', 'Mark', 'Luke', 'John', 'Rom'])
// OSHB Ketiv/Qere 자동 로드 대상 (Stage 3-A · 2026-07-25)
const OSHB_BOOKS = new Set([
  'Gen', 'Exod', 'Lev', 'Num', 'Deut',
  'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth',
  'Job', 'Ps', 'Prov', 'Eccl', 'Song',
  'Isa', 'Jer', 'Lam', 'Ezek', 'Dan',
  'Hos', 'Joel', 'Amos', 'Obad', 'Jonah',
  'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal',
])

const ok = (msg) => console.log(`  ✅ ${msg}`)
const fail = (msg) => { console.log(`  ❌ ${msg}`); return 1 }
const warn = (msg) => console.log(`  ⚠️  ${msg}`)

let totalErrs = 0

// ── Test 1: Import 무결성 ────────────────────────────
console.log('\n🧪 [Test 1] BOOK_CONTEXTS import 무결성')
if (!BOOK_CONTEXTS || typeof BOOK_CONTEXTS !== 'object') {
  totalErrs += fail('BOOK_CONTEXTS import 실패')
} else {
  ok(`BOOK_CONTEXTS 로드 (${Object.keys(BOOK_CONTEXTS).length}권)`)
}
if (!Array.isArray(SUPPORTED_BOOK_IDS)) {
  totalErrs += fail('SUPPORTED_BOOK_IDS 배열 아님')
} else {
  ok(`SUPPORTED_BOOK_IDS 로드 (${SUPPORTED_BOOK_IDS.length}개)`)
}
if (Object.keys(BOOK_CONTEXTS).length !== SUPPORTED_BOOK_IDS.length) {
  totalErrs += fail(`불일치: BOOK_CONTEXTS ${Object.keys(BOOK_CONTEXTS).length} vs SUPPORTED_BOOK_IDS ${SUPPORTED_BOOK_IDS.length}`)
}

// ── Test 2: id 일관성 (key === ctx.id) ──────────────
console.log('\n🧪 [Test 2] id 일관성 (key ↔ ctx.id ↔ book.lexId)')
for (const [key, ctx] of Object.entries(BOOK_CONTEXTS)) {
  if (ctx.id !== key) totalErrs += fail(`${key}: ctx.id='${ctx.id}' 불일치`)
  if (ctx.book?.lexId !== key) totalErrs += fail(`${key}: book.lexId='${ctx.book?.lexId}' 불일치`)
}
ok('key ↔ ctx.id ↔ book.lexId 일관성')

// ── Test 3: lex 데이터 존재 ─────────────────────────
console.log('\n🧪 [Test 3] lex 데이터 존재')
for (const [key, ctx] of Object.entries(BOOK_CONTEXTS)) {
  const corpus = ctx.book?.lexCorpus
  const lexId = ctx.book?.lexId
  if (!corpus || !lexId) { totalErrs += fail(`${key}: corpus/lexId 없음`); continue }
  const bookDir = join(LEX_DIR, corpus, lexId)
  if (!existsSync(bookDir)) {
    totalErrs += fail(`${key}: lex 디렉토리 없음 (${corpus}/${lexId})`)
    continue
  }
  const ch1 = join(bookDir, '1.json')
  if (!existsSync(ch1)) totalErrs += fail(`${key}: 1.json 없음`)
  else ok(`${key} lex: ${corpus}/${lexId}/`)
}

// ── Test 4: NT SBLGNT variants JSON ─────────────────
console.log('\n🧪 [Test 4] NT SBLGNT variants JSON (SBLGNT_BOOKS)')
for (const [key, ctx] of Object.entries(BOOK_CONTEXTS)) {
  if (ctx.book?.testament !== 'NT') continue
  if (!SBLGNT_BOOKS.has(key)) {
    warn(`${key}: NT지만 SBLGNT_BOOKS Set에 없음 (자동 로드 스킵됨)`)
    continue
  }
  const variantPath = join(VARIANTS_DIR, `${key}.json`)
  if (!existsSync(variantPath)) {
    totalErrs += fail(`${key}: variants JSON 없음 (${variantPath})`)
  } else {
    const stat = readFileSync(variantPath, 'utf8')
    const parsed = JSON.parse(stat)
    const count = Array.isArray(parsed) ? parsed.length : (parsed.variants?.length ?? 0)
    ok(`${key} variants: ${count}건`)
  }
}

// ── Test 4b: OT OSHB variants JSON (Stage 3-A) ──────
console.log('\n🧪 [Test 4b] OT OSHB variants JSON (OSHB_BOOKS · Ketiv/Qere 자동)')
let oshbFound = 0, oshbMissing = 0
for (const [key, ctx] of Object.entries(BOOK_CONTEXTS)) {
  if (ctx.book?.testament !== 'OT') continue
  if (!OSHB_BOOKS.has(key)) continue
  const variantPath = join(VARIANTS_DIR, `${key}.json`)
  if (existsSync(variantPath)) {
    const parsed = JSON.parse(readFileSync(variantPath, 'utf8'))
    const count = Array.isArray(parsed) ? parsed.length : (parsed.variants?.length ?? 0)
    const oshbCount = (Array.isArray(parsed) ? parsed : []).filter(v => v.source === 'oshb').length
    ok(`${key} variants: ${count}건 (OSHB 자동 ${oshbCount})`)
    oshbFound++
  } else {
    warn(`${key}: OSHB JSON 아직 없음 (node scripts/parse-oshb.mjs ${key} 로 생성 필요)`)
    oshbMissing++
  }
}
if (oshbFound + oshbMissing > 0) {
  console.log(`  ℹ️  OT 등록됨 ${oshbFound + oshbMissing}권 · JSON 있음 ${oshbFound} · 없음 ${oshbMissing}`)
}

// ── Test 5: validate-book-ctx 위임 ──────────────────
console.log('\n🧪 [Test 5] validate-book-ctx.mjs 위임 (Layer 1·4)')
const validateScript = join(__dirname, 'validate-book-ctx.mjs')
const result = spawnSync('node', [validateScript], { encoding: 'utf8' })
if (result.status !== 0) {
  totalErrs += fail(`validate-book-ctx 실패 (exit ${result.status})`)
  console.log(result.stdout)
  console.log(result.stderr)
} else {
  ok('validate-book-ctx 전체 PASS')
}

// ── 최종 리포트 ─────────────────────────────────────
console.log('')
if (totalErrs === 0) {
  console.log(`✅ Regression PASS · ${Object.keys(BOOK_CONTEXTS).length}권 무결성 확인`)
  process.exit(0)
} else {
  console.log(`❌ Regression FAIL · ${totalErrs}건 실패`)
  process.exit(1)
}
