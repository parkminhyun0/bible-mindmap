// 정경 추적 개념 데이터(canonicalConcepts) 스키마·정합성 verifier.
// P0-1 하드 게이트:
//  - 필수 필드·enum·단계 수·summary 복제 검사
//  - ref = Book:Ch 또는 Book:Ch:Verse
//  - 장과 절을 실제 lex 데이터의 범위와 대조
//  - Strong 번호 형식뿐 아니라 실제 lex/Strong 정의 데이터 존재 여부 대조
// 하나라도 위반하면 fail(exit 1).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_CONCEPTS, CONCEPT_CATEGORIES } from '../src/data/canonicalConcepts.js';
import { CANONICAL_USAGE_MAP } from '../src/data/canonicalUsageMap.js';
import { ALL_BOOKS, getBook } from '../src/data/bibleBooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATEGORIES = new Set(Object.keys(CONCEPT_CATEGORIES));
const COVENANTS = new Set(['adamic', 'noahic', 'abrahamic', 'mosaic', 'davidic', 'new', 'none']);
const CONNECTIONS = new Set(['A', 'B', 'C', 'D', 'E']);
const BOOK_IDS = new Set(ALL_BOOKS.map((b) => b.id));

const errors = [];
const warns = [];
let conceptCount = 0;
let arcCount = 0;
const firstStems = new Map();

function isStr(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function walkJsonFiles(dir, visit) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += walkJsonFiles(full, visit);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      count += 1;
      visit(full);
    }
  }
  return count;
}

function collectStrongIds(value, out) {
  if (Array.isArray(value)) {
    for (const item of value) collectStrongIds(item, out);
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string') {
      const matches = child.match(/\b[HG]\d+\b/g);
      if (matches) matches.forEach((id) => out.add(id));
    }
    if (/strong/i.test(key)) {
      if (typeof child === 'number' && Number.isInteger(child)) {
        out.add(String(child));
      } else if (typeof child === 'string') {
        const matches = child.match(/[HG]?\d+/g);
        if (matches) matches.forEach((id) => out.add(id));
      }
    }
    collectStrongIds(child, out);
  }
}

function normalizeStrongIds(ids, prefix) {
  const normalized = new Set();
  for (const id of ids) {
    const text = String(id).trim().toUpperCase();
    if (/^[HG]\d+$/.test(text)) normalized.add(text);
    else if (/^\d+$/.test(text)) normalized.add(prefix + text);
  }
  return normalized;
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
    const raw = new Set();
    fileCount += walkJsonFiles(source.dir, (file) => {
      try {
        collectStrongIds(JSON.parse(fs.readFileSync(file, 'utf8')), raw);
      } catch (error) {
        errors.push(`Strong 인덱스 JSON 파싱 실패: ${path.relative(process.cwd(), file)} (${error.message})`);
      }
    });
    normalizeStrongIds(raw, source.prefix).forEach((id) => all.add(id));
  }

  if (fileCount === 0) {
    errors.push('Strong/lex 검증 데이터 파일이 하나도 없음 — 실제 Strong 존재 검증 불가');
  }
  return all;
}

function loadVerseMaxima() {
  const result = new Map();

  for (const meta of ALL_BOOKS) {
    const corpus = meta.lexCorpus || (meta.testament === 'NT' ? 'gnt' : 'hot');
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

      const full = path.join(dir, file);
      try {
        const json = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (!json || typeof json !== 'object' || Array.isArray(json)) {
          errors.push(`${meta.id}:${chapter} lex 루트가 객체가 아님`);
          continue;
        }

        const verses = Object.keys(json)
          .map(Number)
          .filter((v) => Number.isInteger(v) && v >= 1);

        if (verses.length === 0) {
          errors.push(`${meta.id}:${chapter} lex에 유효한 절 키가 없음`);
          continue;
        }
        perChapter.set(chapter, Math.max(...verses));
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
  if (!STRONG_IDS.has(value)) {
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

  const [book, chStr, vStr] = parts;
  if (!BOOK_IDS.has(book)) {
    errors.push(`${where}: 알 수 없는 Book 약어 "${book}" (ref ${ref})`);
    return;
  }

  const ch = Number(chStr);
  const meta = getBook(book);
  if (!Number.isInteger(ch) || ch < 1 || ch > meta.chapters) {
    errors.push(`${where}: 장 범위 오류 "${ref}" (${book}은 1~${meta.chapters}장)`);
    return;
  }

  if (vStr !== undefined) {
    const verse = Number(vStr);
    const maxVerse = VERSE_MAXIMA.get(book)?.get(ch);

    if (!Number.isInteger(verse) || verse < 1) {
      errors.push(`${where}: 절 번호 오류 "${ref}"`);
    } else if (!Number.isInteger(maxVerse)) {
      errors.push(`${where}: ${book}:${ch} lex 장 데이터 없음 — 절 상한 검증 불가`);
    } else if (verse > maxVerse) {
      errors.push(`${where}: 절 범위 오류 "${ref}" (${book}:${ch}은 1~${maxVerse}절)`);
    }
  }
}

for (const [key, c] of Object.entries(CANONICAL_CONCEPTS)) {
  conceptCount += 1;
  const where = `개념 '${key}'`;

  if (key !== key.toLowerCase()) errors.push(`${where}: 키는 소문자 슬러그여야 함`);
  if (!isStr(c.emoji)) errors.push(`${where}: emoji 누락`);
  if (!isStr(c.category)) errors.push(`${where}: category 누락`);
  else if (!CATEGORIES.has(c.category)) errors.push(`${where}: 알 수 없는 category "${c.category}"`);
  if (!isStr(c.labelKo)) errors.push(`${where}: labelKo 누락`);
  if (!isStr(c.labelHe)) errors.push(`${where}: labelHe 누락`);
  if (!isStr(c.labelGr)) errors.push(`${where}: labelGr 누락`);

  if (!c.strong || typeof c.strong !== 'object') {
    errors.push(`${where}: strong 객체 누락`);
  } else {
    checkStrong(c.strong.he, 'H', `${where} strong.he`);
    checkStrong(c.strong.gr, 'G', `${where} strong.gr`, false);
  }

  if (!isStr(c.theologicalNote)) errors.push(`${where}: theologicalNote 누락`);
  if (!Array.isArray(c.reformedAnchors) || c.reformedAnchors.length === 0) {
    errors.push(`${where}: reformedAnchors 배열 누락`);
  }

  if (!Array.isArray(c.canonicalArc)) {
    errors.push(`${where}: canonicalArc 배열 누락`);
    continue;
  }
  if (c.canonicalArc.length < 5 || c.canonicalArc.length > 7) {
    errors.push(`${where}: canonicalArc 단계 수 ${c.canonicalArc.length} (5~7 요구)`);
  }

  c.canonicalArc.forEach((stage, index) => {
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

let usageCount = 0;
for (const [key, arr] of Object.entries(CANONICAL_USAGE_MAP || {})) {
  const where = `usageMap.${key}`;
  if (!CANONICAL_CONCEPTS[key]) errors.push(`${where}: 존재하지 않는 개념 키`);
  if (!Array.isArray(arr)) {
    errors.push(`${where}: 배열 아님`);
    continue;
  }
  if (arr.length < 6 || arr.length > 10) warns.push(`${where}: 용례 ${arr.length}개 (권장 6~10)`);

  arr.forEach((usage, index) => {
    usageCount += 1;
    if (!isStr(usage?.note)) errors.push(`${where}[${index}]: note 누락`);
    checkRef(usage?.ref, `${where}[${index}]`);
  });
}

console.log(`정경 추적 개념 verifier · 개념 ${conceptCount} · arc 단계 ${arcCount} · 용례 ${usageCount} · Strong 인덱스 ${STRONG_IDS.size} · 오류 ${errors.length} · 경고 ${warns.length}`);
if (warns.length) {
  console.log(`⚠ 경고 ${warns.length}건:`);
  warns.slice(0, 20).forEach((x) => console.log('   - ' + x));
}
if (errors.length) {
  console.log(`✗ 스키마·정합성 오류 ${errors.length}건:`);
  errors.slice(0, 80).forEach((x) => console.log('   - ' + x));
  process.exit(1);
}
console.log('✓ 정경 추적 개념 정합성 통과 (스키마·ref 절상한·enum·Strong 실재)');
