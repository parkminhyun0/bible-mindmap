#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOOKS, isOT } from '../src/data/bibleBooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public/data/bible');
const RETRIES = 4;
const TIMEOUT_MS = 120000;

// Bolls는 전체 성경 수집에 장 단위 API를 사용하지 말고 정적 번역본 파일을
// 내려받으라고 명시한다. 역본별 1회 다운로드로 429와 부분 생성 문제를 막는다.
const SOURCES = [
  { id: 'krv', code: 'KRV', books: ALL_BOOKS },
  { id: 'web', code: 'WEB', books: ALL_BOOKS },
  { id: 'wlc', code: 'WLC', books: ALL_BOOKS.filter((book) => isOT(book.id)) },
];

const bookByNumber = new Map(ALL_BOOKS.map((book, index) => [index + 1, book]));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'bible-mindmap-build/2.0' },
      });
      if (!response.ok) {
        const error = new Error(`${response.status} ${response.statusText}`);
        error.retryAfter = Number(response.headers.get('retry-after')) || 0;
        throw error;
      }
      const payload = await response.json();
      if (!Array.isArray(payload) || payload.length === 0) {
        throw new Error('empty translation payload');
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt + 1 < RETRIES) {
        const waitMs = error.retryAfter > 0
          ? error.retryAfter * 1000
          : 1500 * (2 ** attempt);
        await sleep(waitMs);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function groupTranslation(rawRows, source) {
  const allowedBooks = new Set(source.books.map((book) => book.id));
  const chapters = new Map();

  for (const raw of rawRows) {
    const bookNumber = Number(raw.book);
    const chapter = Number(raw.chapter);
    const verse = Number(raw.verse);
    const book = bookByNumber.get(bookNumber);
    const text = cleanText(raw.text);

    if (!book || !allowedBooks.has(book.id)) continue;
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) continue;
    if (!Number.isInteger(verse) || verse < 1 || !text) continue;

    const key = `${book.id}:${chapter}`;
    if (!chapters.has(key)) chapters.set(key, new Map());
    const verses = chapters.get(key);
    if (verses.has(verse)) throw new Error(`${source.id}/${book.id}/${chapter}: duplicate verse ${verse}`);
    verses.set(verse, text);
  }

  return chapters;
}

async function writeSource(source) {
  const url = `https://bolls.life/static/translations/${source.code}.json`;
  console.log(`  ↓ ${source.id}: ${url}`);
  const payload = await fetchJson(url);
  const grouped = groupTranslation(payload, source);
  let chapterCount = 0;
  let verseCount = 0;

  for (const book of source.books) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      const key = `${book.id}:${chapter}`;
      const verseMap = grouped.get(key);
      if (!verseMap?.size) throw new Error(`${source.id}/${book.id}/${chapter}: missing chapter`);

      const rows = [...verseMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([verse, text]) => ({ verse, text }));

      const dir = path.join(OUT, source.id, book.id);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `${chapter}.json`), `${JSON.stringify(rows)}\n`);
      chapterCount += 1;
      verseCount += rows.length;
    }
  }

  console.log(`  ✓ ${source.id}: ${chapterCount}장 · ${verseCount}절`);
  return { chapterCount, verseCount };
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
console.log(`▶ local Bible corpus bulk build: ${SOURCES.length} translations`);

const sourceResults = {};
// 공급자 부담과 메모리 피크를 줄이기 위해 번역본은 순차 다운로드한다.
for (const source of SOURCES) {
  sourceResults[source.id] = await writeSource(source);
}

const manifest = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  provider: 'bolls-static-translation-json',
  sources: sourceResults,
};
await fs.writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✓ local Bible corpus complete: ${Object.values(sourceResults).reduce((sum, item) => sum + item.chapterCount, 0)} chapters`);
