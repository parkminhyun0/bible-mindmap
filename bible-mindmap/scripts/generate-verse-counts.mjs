#!/usr/bin/env node
// generate-verse-counts.mjs — STEPBible lex 데이터 스캔 → memory/whitelists/verse_counts.json
// 사용: node scripts/generate-verse-counts.mjs
// 출력: 66권 chapter → max verse 매핑 (Ground Truth · Layer 1·4 검증에 사용)

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const LEX_DIR = join(ROOT, 'public/data/lex')
const OUT = join(ROOT, '../memory/whitelists/verse_counts.json')

const manifest = JSON.parse(readFileSync(join(LEX_DIR, 'manifest.json'), 'utf8'))
const corpora = ['gnt', 'hot']

const result = {
  _meta: {
    description: '66권 chapter → max verse 매핑. STEPBible lex 데이터 (SBLGNT + WLC) 실측.',
    convention: 'primary = 개역한글 기준 verse 번호 (STEPBible primary field 사용)',
    source: 'https://github.com/STEPBible/STEPBible-Data',
    license: manifest.license || 'CC BY 4.0',
    generated: new Date().toISOString().slice(0, 10),
    generator: 'scripts/generate-verse-counts.mjs',
  },
  books: {},
}

let totalBooks = 0
let totalChapters = 0
let totalVerses = 0

for (const corpus of corpora) {
  const corpusDir = join(LEX_DIR, corpus)
  if (!existsSync(corpusDir)) continue

  const books = readdirSync(corpusDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  for (const book of books) {
    const bookDir = join(corpusDir, book)
    const chapters = readdirSync(bookDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => parseInt(f.replace('.json', ''), 10))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)

    if (!chapters.length) continue

    const bookCounts = { _corpus: corpus, _chapters: chapters.length, chapters: {} }
    for (const ch of chapters) {
      const chData = JSON.parse(readFileSync(join(bookDir, `${ch}.json`), 'utf8'))
      const verses = Object.keys(chData)
        .filter((k) => !k.startsWith('_'))
        .map((k) => parseInt(k, 10))
        .filter((n) => Number.isFinite(n))
      const maxVerse = verses.length ? Math.max(...verses) : 0
      bookCounts.chapters[ch] = maxVerse
      totalVerses += maxVerse
    }

    result.books[book] = bookCounts
    totalBooks++
    totalChapters += chapters.length
  }
}

result._meta.stats = {
  books: totalBooks,
  chapters: totalChapters,
  verses: totalVerses,
}

writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8')
console.log(`✅ verse_counts.json 생성 완료`)
console.log(`   경로: ${OUT}`)
console.log(`   책: ${totalBooks} · 장: ${totalChapters} · 절: ${totalVerses}`)
