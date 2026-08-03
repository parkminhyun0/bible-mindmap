#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOOKS, isOT } from '../src/data/bibleBooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public/data/bible');
const CONCURRENCY = Number(process.env.BIBLE_BUILD_CONCURRENCY || 8);
const RETRIES = 3;
const TIMEOUT_MS = 15000;

const SOURCES = [
  { id: 'krv', code: 'KRV', books: ALL_BOOKS },
  { id: 'web', code: 'WEB', books: ALL_BOOKS },
  { id: 'wlc', code: 'WLC', books: ALL_BOOKS.filter((b) => isOT(b.id)) },
];

const bookNumber = new Map(ALL_BOOKS.map((book, index) => [book.id, index + 1]));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < RETRIES) await sleep(500 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function normalizeChapter(raw, label) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`${label}: empty chapter`);
  const rows = raw
    .map((row) => ({ verse: Number(row.verse), text: String(row.text || '').replace(/<[^>]*>/g, '').trim() }))
    .filter((row) => Number.isInteger(row.verse) && row.verse > 0 && row.text);
  if (!rows.length) throw new Error(`${label}: no valid verses`);
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.verse)) throw new Error(`${label}: duplicate verse ${row.verse}`);
    seen.add(row.verse);
  }
  return rows;
}

async function writeChapter(source, book, chapter) {
  const num = bookNumber.get(book.id);
  const label = `${source.id}/${book.id}/${chapter}`;
  const url = `https://bolls.life/get-text/${source.code}/${num}/${chapter}/`;
  const rows = normalizeChapter(await fetchJson(url), label);
  const dir = path.join(OUT, source.id, book.id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${chapter}.json`), `${JSON.stringify(rows)}\n`);
  return { source: source.id, bookId: book.id, chapter, verses: rows.length };
}

async function runPool(tasks, worker) {
  const queue = [...tasks];
  const results = [];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      results.push(await worker(item));
    }
  });
  await Promise.all(workers);
  return results;
}

await fs.rm(OUT, { recursive: true, force: true });
const tasks = [];
for (const source of SOURCES) {
  for (const book of source.books) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      tasks.push({ source, book, chapter });
    }
  }
}

console.log(`▶ local Bible corpus build: ${tasks.length} chapters · concurrency ${CONCURRENCY}`);
const results = await runPool(tasks, ({ source, book, chapter }) => writeChapter(source, book, chapter));
const manifest = {
  generatedAt: new Date().toISOString(),
  chapterCount: results.length,
  sources: Object.fromEntries(SOURCES.map((source) => [source.id, results.filter((r) => r.source === source.id).length])),
};
await fs.writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✓ local Bible corpus complete: ${results.length} chapters`);
