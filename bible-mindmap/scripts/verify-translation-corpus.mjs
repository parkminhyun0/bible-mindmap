#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOOKS, isOT } from '../src/data/bibleBooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const errors = [];
let checked = 0;

async function readJson(file, label) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    errors.push(`${label}: ${error.code === 'ENOENT' ? '파일 누락' : `JSON 오류 (${error.message})`}`);
    return null;
  }
}

function verifyRows(rows, label) {
  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push(`${label}: 절 데이터 없음`);
    return;
  }
  let previous = 0;
  for (const row of rows) {
    const verse = Number(row?.verse);
    const text = typeof row?.text === 'string' ? row.text.trim() : '';
    if (!Number.isInteger(verse) || verse <= 0 || !text) {
      errors.push(`${label}: 잘못된 절 레코드`);
      return;
    }
    if (verse <= previous) {
      errors.push(`${label}: 절 번호 역전/중복 (${previous} → ${verse})`);
      return;
    }
    previous = verse;
  }
}

function verifyLexChapter(data, label) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
    errors.push(`${label}: 원어 절 데이터 없음`);
    return;
  }
  for (const [verse, words] of Object.entries(data)) {
    if (!/^\d+$/.test(verse) || !Array.isArray(words) || words.length === 0) {
      errors.push(`${label}:${verse}: 잘못된 원어 절 데이터`);
      return;
    }
    if (!words.some((word) => typeof word?.w === 'string' && word.w.trim())) {
      errors.push(`${label}:${verse}: 원어 표면형 누락`);
      return;
    }
  }
}

for (const book of ALL_BOOKS) {
  for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
    for (const source of ['krv', 'web']) {
      const label = `${source}/${book.id}/${chapter}`;
      const file = path.join(ROOT, 'public/data/bible', source, book.id, `${chapter}.json`);
      const rows = await readJson(file, label);
      if (rows) verifyRows(rows, label);
      checked += 1;
    }

    const corpus = isOT(book.id) ? 'hot' : 'gnt';
    const originalFile = path.join(ROOT, 'public/data/lex', corpus, book.id, `${chapter}.json`);
    const original = await readJson(originalFile, `${corpus}/${book.id}/${chapter}`);
    if (original) verifyLexChapter(original, `${corpus}/${book.id}/${chapter}`);
    checked += 1;
  }

  if (isOT(book.id)) {
    const lxx = await readJson(path.join(ROOT, 'public/lxx', `${book.id}.json`), `lxx/${book.id}`);
    if (lxx && (typeof lxx !== 'object' || Array.isArray(lxx) || Object.keys(lxx).length === 0)) {
      errors.push(`lxx/${book.id}: 장 데이터 없음`);
    }
    checked += 1;
  }
}

for (const source of ['krv', 'web']) {
  const rows = await readJson(
    path.join(ROOT, 'public/data/bible', source, 'Rom', '16.json'),
    `${source}/Rom/16 regression`,
  );
  const verses = new Set(Array.isArray(rows) ? rows.map((row) => Number(row.verse)) : []);
  for (const verse of [25, 26, 27]) {
    if (!verses.has(verse)) errors.push(`${source}/Rom/16:${verse}: 회귀 절 누락`);
  }
}

const greek = await readJson(
  path.join(ROOT, 'public/data/lex/gnt/Rom/16.json'),
  'gnt/Rom/16 regression',
);
for (const verse of [25, 26, 27]) {
  if (!Array.isArray(greek?.[String(verse)]) || greek[String(verse)].length === 0) {
    errors.push(`gnt/Rom/16:${verse}: 회귀 절 누락`);
  }
}

if (errors.length) {
  console.error(`✗ translation corpus 검증 실패 (${errors.length}건 / ${checked}개 검사)`);
  errors.slice(0, 100).forEach((error) => console.error(`  - ${error}`));
  if (errors.length > 100) console.error(`  ... 외 ${errors.length - 100}건`);
  process.exit(1);
}
console.log(`✓ translation corpus 검증 통과 (${checked}개 파일/장 검사)`);
