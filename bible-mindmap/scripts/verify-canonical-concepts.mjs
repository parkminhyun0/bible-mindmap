// 정경 추적 개념 데이터(canonicalConcepts) 스키마·정합성 verifier.
// P0-1 하드 게이트: 스키마, ref 절 상한, enum, Strong 실재를 검사한다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_CONCEPTS, CONCEPT_CATEGORIES } from '../src/data/canonicalConcepts.js';
import { CANONICAL_USAGE_MAP } from '../src/data/canonicalUsageMap.js';
import { ALL_BOOKS, getBook, isOT } from '../src/data/bibleBooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATEGORIES = new Set(Object.keys(CONCEPT_CATEGORIES));
const COVENANTS = new Set(['adamic', 'noahic', 'abrahamic', 'mosaic', 'davidic', 'new', 'none']);
const CONNECTIONS = new Set(['A', 'B', 'C', 'D', 'E']);
const BOOK_IDS = new Set(ALL_BOOKS.map((book) => book.id));
const errors = [];
const warns = [];
const firstStems = new Map();
let conceptCount = 0;
let arcCount = 0;
let usageCount = 0;

const VERSE_MAX_OVERRIDES = new Map([
  ['Rom:16', { maxVerse: 27, reason: 'TAGNT/KRV versification difference for the final doxology' }],
]);

function isStr(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function walkJsonFiles(dir, visit) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) count += walkJsonFiles(full, visit);
    else if (entry.isFile() && entry.name.endsWith('.json')) {
      count += 1;
      visit(full);
    }
  }
  return count;
}

function collectStrongIds(value, prefix, out) {
  if (Array.isArray(value)) {
    for (const item of value) collectStrongIds(item, prefix, out);
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (/^\d+$/.test(key)) out.add(`${prefix}${Number(key)}`);
    if (/^[HG]\d+$/.test(key.toUpperCase())) out.add(key.toUpperCase());

    if (typeof child === 'string') {
      const matches = child.toUpperCase().match(/\b[HG]\d+\b/g);
      if (matches) matches.forEach((id) => out.add(id));
      if (/strong/i.test(key)) {
        const numeric = child.match(/\d+/g);
        if (numeric) numeric.forEach((id) => out.add(`${prefix}${Number(id)}`));
      }
    } else if (typeof child === 'number' && Number.isInteger(child) && /strong/i.test(key)) {
      out.add(`${prefix}${child}`);
    }

    collectStrongIds(child, prefix, out);
  }
}

function loadStrongIndex() {
  const sources = [
    { dir: path.resolve(__dirname, '../public/data/strongs-def/hot'), prefix: 'H' },
    { dir: path.resolve(__dirname, '../public/data/strongs-def/gnt'), prefix: 'G' },
    { dir: path.resolve(__dirname, '../public/data/lex/hot'), prefix: 'H' },
    { dir: path.resolve(__dirname, '../public/data/lex/gnt'), prefix: 'G' },
  ];
  const all = new Set();
  let fileCount = 0;

  for (const source of sources) {
    fileCount += walkJsonFiles(source.dir, (file) => {
      try {
        collectStrongIds(JSON.parse(fs.readFileSync(file, 'utf8')), source.prefix, all);
      } catch (error) {
        errors.push(`Strong 인덱스 JSON 파싱 실패: ${path.relative(process.cwd(), file)} (${error.message})`);
      }
    });
  }

  if (fileCount === 0) errors.push('Strong/lex 검증 데이터 파일이 하나도 없음 — 실제 Strong 존재 검증 불가');
  return all;
}

function loadVerseMaxima() {
  const result = new Map();

  for (const meta of ALL_BOOKS) {
    const corpus = meta.lexCorpus || (isOT(meta.id) ? 'hot' : 'gnt');
    const dir = path.resolve(__dirname, `../public/data/lex/${corpus}/${meta.id}`);
    const perChapter = new Map();

    if (!fs.existsSync(dir)) {
      errors.push(`${meta.id}: lex 디렉터리 없음 — ref 절 상한 검증 불가`);
      result.set(meta.id, perChapter);
      continue;
    }

    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) {
      const chapter = Number(file.replace('.json', ''));
      if (!Number.isInteger(chapter) || chapter < 1) continue;

      try {
        const json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        if (!json || typeof json !== 'object' || Array.isArray(json)) {
          errors.push(`${meta.id}:${chapter} lex 루트가 객체가 아님`);
          continue;
        }
        const verses = Object.keys(json)
          .map(Number)
          .filter((verse) => Number.isInteger(verse) && verse >= 1);
        if (verses.length === 0) {
          errors.push(`${meta.id}:${chapter} lex에 유효한 절 키가 없음`);
          continue;
        }
        const lexMax = Math.max(...verses);
        const override = VERSE_MAX_OVERRIDES.get(`${meta.id}:${chapter}`);
        if (override) {
          warns.push(`${meta.id}:${chapter} 절 상한 ${lexMax}→${override.maxVerse} 적용 (${override.reason})`);
          perChapter.set(chapter, Math.max(lexMax, override.maxVerse));
        } else {
          perChapter.set(chapter, lexMax);
        }
      } catch (error) {
        errors.push(`${meta.id}:${chapter} lex JSON 파싱 실패 (${error.message})`);
      }
    }

    result.set(meta.id, perChapter);
  }

  return result;
}

const STRONG_IDS = loadStrongIndex();
const VERSE_MAXIMA = loadVerseMaxima();

function checkStrong(value, prefix, where, required = true) {
  if (value === undefined && !required) return;
  if (!isStr(value) || !new RegExp(`^${prefix}\\d+$`).test(value)) {
    errors.push(`${where}: 형식 오류 (${prefix}+숫자)`);
    return;
  }
  const normalized = `${prefix}${Number(value.slice(1))}`;
  if (!STRONG_IDS.has(value) && !STRONG_IDS.has(normalized)) {
    errors.push(`${where}: 실제 Strong/lex 데이터에 존재하지 않음 (${value})`);
  }
}

function checkRef(ref, where) {
  if (!isStr(ref)) {
    errors.push(`${where}: ref 누락`);
    return;
  }

  const parts = ref.split(':');
  if (parts.length < 2 || parts.length > 3) {
    errors.push(`${where}: ref 형식 오류 "${ref}" (Book:Ch 또는 Book:Ch:Verse)`);
    return;
  }

  const [book, chapterText, verseText] = parts;
  if (!BOOK_IDS.has(book)) {
    errors.push(`${where}: 알 수 없는 Book 약어 "${book}" (ref ${ref})`);
    return;
  }

  const chapter = Number(chapterText);
  const meta = getBook(book);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > meta.chapters) {
    errors.push(`${where}: 장 범위 오류 "${ref}" (${book}은 1~${meta.chapters}장)`);
    return;
  }

  if (verseText !== undefined) {
    const verse = Number(verseText);
    const maxVerse = VERSE_MAXIMA.get(book)?.get(chapter);
    if (!Number.isInteger(verse) || verse < 1) errors.push(`${where}: 절 번호 오류 "${ref}"`);
    else if (!Number.isInteger(maxVerse)) errors.push(`${where}: ${book}:${chapter} lex 장 데이터 없음 — 절 상한 검증 불가`);
    else if (verse > maxVerse) errors.push(`${where}: 절 범위 오류 "${ref}" (${book}:${chapter}은 1~${maxVerse}절)`);
  }
}

for (const [key, concept] of Object.entries(CANONICAL_CONCEPTS)) {
  conceptCount += 1;
  const where = `개념 '${key}'`;

  if (key !== key.toLowerCase()) errors.push(`${where}: 키는 소문자 슬러그여야 함`);
  if (!isStr(concept.emoji)) errors.push(`${where}: emoji 누락`);
  if (!isStr(concept.category)) errors.push(`${where}: category 누락`);
  else if (!CATEGORIES.has(concept.category)) errors.push(`${where}: 알 수 없는 category "${concept.category}"`);
  if (!isStr(concept.labelKo)) errors.push(`${where}: labelKo 누락`);
  if (!isStr(concept.labelHe)) errors.push(`${where}: labelHe 누락`);
  if (!isStr(concept.labelGr)) errors.push(`${where}: labelGr 누락`);

  if (!concept.strong || typeof concept.strong !== 'object') errors.push(`${where}: strong 객체 누락`);
  else {
    checkStrong(concept.strong.he, 'H', `${where} strong.he`);
    checkStrong(concept.strong.gr, 'G', `${where} strong.gr`, false);
  }

  if (!isStr(concept.theologicalNote)) errors.push(`${where}: theologicalNote 누락`);
  if (!Array.isArray(concept.reformedAnchors) || concept.reformedAnchors.length === 0) {
    errors.push(`${where}: reformedAnchors 배열 누락`);
  }

  if (!Array.isArray(concept.canonicalArc)) {
    errors.push(`${where}: canonicalArc 배열 누락`);
    continue;
  }
  if (concept.canonicalArc.length < 5 || concept.canonicalArc.length > 7) {
    errors.push(`${where}: canonicalArc 단계 수 ${concept.canonicalArc.length} (5~7 요구)`);
  }

  concept.canonicalArc.forEach((stage, index) => {
    arcCount += 1;
    const stageWhere = `${where} arc[${index}]`;
    if (!isStr(stage.stage)) errors.push(`${stageWhere}: stage 누락`);
    if (!isStr(stage.summary)) errors.push(`${stageWhere}: summary 누락`);
    checkRef(stage.ref, stageWhere);
    if (!COVENANTS.has(stage.covenantLink)) errors.push(`${stageWhere}: covenantLink enum 위반 "${stage.covenantLink}"`);
    if (!CONNECTIONS.has(stage.connectionType)) errors.push(`${stageWhere}: connectionType enum 위반 "${stage.connectionType}"`);

    if (isStr(stage.summary)) {
      const stem = stage.summary.slice(0, 30);
      if (firstStems.has(stem)) warns.push(`중복 summary 도입부: ${stageWhere} ↔ ${firstStems.get(stem)}`);
      else firstStems.set(stem, stageWhere);
    }
  });
}

for (const [key, usages] of Object.entries(CANONICAL_USAGE_MAP || {})) {
  const where = `usageMap.${key}`;
  if (!CANONICAL_CONCEPTS[key]) errors.push(`${where}: 존재하지 않는 개념 키`);
  if (!Array.isArray(usages)) {
    errors.push(`${where}: 배열 아님`);
    continue;
  }
  if (usages.length < 6 || usages.length > 10) warns.push(`${where}: 용례 ${usages.length}개 (권장 6~10)`);

  usages.forEach((usage, index) => {
    usageCount += 1;
    if (!isStr(usage?.note)) errors.push(`${where}[${index}]: note 누락`);
    checkRef(usage?.ref, `${where}[${index}]`);
  });
}

console.log(`정경 추적 개념 verifier · 개념 ${conceptCount} · arc 단계 ${arcCount} · 용례 ${usageCount} · Strong 인덱스 ${STRONG_IDS.size} · 오류 ${errors.length} · 경고 ${warns.length}`);
if (warns.length) {
  console.log(`⚠ 경고 ${warns.length}건:`);
  warns.slice(0, 30).forEach((message) => console.log(`   - ${message}`));
}
if (errors.length) {
  console.log(`✗ 스키마·정합성 오류 ${errors.length}건:`);
  errors.slice(0, 100).forEach((message) => console.log(`   - ${message}`));
  process.exit(1);
}
console.log('✓ 정경 추적 개념 정합성 통과 (스키마·ref 절상한·enum·Strong 실재)');
