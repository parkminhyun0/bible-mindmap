#!/usr/bin/env node
/**
 * STEPBible.data TAGNT (Greek NT) + TAHOT (Hebrew OT)
 * → public/data/lex/{gnt|hot}/{bookId}/{chapter}.json
 *
 * Data license: CC BY 4.0 · https://github.com/STEPBible/STEPBible-Data
 *
 * Output format per file: { "1": [ { w, tr, s, m, l, g }, ... ], "2": [...], ... }
 *   w  = original word (Greek/Hebrew with accents)
 *   tr = transliteration
 *   s  = Strong's number (primary — G/H prefixed)
 *   m  = morphology code (STEPBible tag)
 *   l  = lemma / dictionary form
 *   g  = short English gloss
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const RAW_DIR = '/tmp/stepbible-raw';
const OUT_DIR = path.join(REPO_ROOT, 'public/data/lex');
const STRONGS_DIR = path.join(REPO_ROOT, 'public/data/strongs');

const BASE_URL = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT';

const SOURCES = [
  { fn: 'TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt', lang: 'gnt' },
  { fn: 'TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt', lang: 'gnt' },
  { fn: 'TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt', lang: 'hot' },
  { fn: 'TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt', lang: 'hot' },
  { fn: 'TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt', lang: 'hot' },
  { fn: 'TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt', lang: 'hot' },
];

// STEPBible book code → 앱의 bookId
const BOOK_MAP = {
  // OT
  Gen: 'Gen', Exo: 'Exod', Lev: 'Lev', Num: 'Num', Deu: 'Deut',
  Jos: 'Josh', Jdg: 'Judg', Rut: 'Ruth',
  '1Sa': '1Sam', '2Sa': '2Sam', '1Ki': '1Kgs', '2Ki': '2Kgs',
  '1Ch': '1Chr', '2Ch': '2Chr',
  Ezr: 'Ezra', Neh: 'Neh', Est: 'Esth',
  Job: 'Job', Psa: 'Ps', Pro: 'Prov', Ecc: 'Eccl', Sng: 'Song',
  Isa: 'Isa', Jer: 'Jer', Lam: 'Lam', Ezk: 'Ezek', Dan: 'Dan',
  Hos: 'Hos', Jol: 'Joel', Amo: 'Amos', Oba: 'Obad', Jon: 'Jonah',
  Mic: 'Mic', Nam: 'Nah', Hab: 'Hab', Zep: 'Zeph', Hag: 'Hag',
  Zec: 'Zech', Mal: 'Mal',
  // NT
  Mat: 'Matt', Mrk: 'Mark', Luk: 'Luke', Jhn: 'John', Act: 'Acts',
  Rom: 'Rom', '1Co': '1Cor', '2Co': '2Cor', Gal: 'Gal', Eph: 'Eph',
  Php: 'Phil', Col: 'Col', '1Th': '1Thess', '2Th': '2Thess',
  '1Ti': '1Tim', '2Ti': '2Tim', Tit: 'Titus', Phm: 'Phlm',
  Heb: 'Heb', Jas: 'Jas', '1Pe': '1Pet', '2Pe': '2Pet',
  '1Jn': '1John', '2Jn': '2John', '3Jn': '3John',
  Jud: 'Jude', Rev: 'Rev',
};

async function download(fn) {
  const dest = path.join(RAW_DIR, fn);
  try {
    await fs.stat(dest);
    console.log(`  ✓ cached: ${fn}`);
    return dest;
  } catch { /* not cached */ }
  const url = `${BASE_URL}/${encodeURIComponent(fn)}`;
  console.log(`  ↓ fetching: ${fn}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${fn}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.writeFile(dest, buf);
  return dest;
}

// STEPBible dStrong 필드에서 primary Strong's만 추출: "H9003/{H7225G}" → "H7225", "G1080=V-AAI-3S" → "G1080"
function extractStrong(field) {
  if (!field) return '';
  // 헬라어: "G1138=N-GSM-P" 형태
  const gMatch = field.match(/G(\d+)/);
  if (gMatch) return `G${gMatch[1]}`;
  // 히브리어: "H9003/{H7225G}" → 두번째의 primary 뽑기 (curly brace 우선)
  const hCurly = field.match(/\{H(\d+)/);
  if (hCurly) return `H${hCurly[1]}`;
  const hMatch = field.match(/H(\d+)/);
  if (hMatch) return `H${hMatch[1]}`;
  return '';
}

// dStrong 필드에서 morphology 뽑기: "G1138=N-GSM-P" → "N-GSM-P"
function extractMorph(dStrongField, morphField) {
  // Greek: "G1138=N-GSM-P" → morph after '='
  if (dStrongField?.includes('=')) {
    const idx = dStrongField.indexOf('=');
    const rhs = dStrongField.slice(idx + 1).trim();
    if (rhs && !rhs.includes(' ')) return rhs;
  }
  // Hebrew: morphField 별도 (e.g. "HR/Ncfsa")
  if (morphField) return morphField.trim();
  return '';
}

// "Δαυείδ, Δαυίδ, Δαβίδ=David" → lemma "Δαυείδ", gloss "David"
function parseLemmaGloss(field) {
  if (!field) return ['', ''];
  // "{H1254A=בָּרָא=to create}" (히브리어, 중괄호로 감쌈 + 3 파트)
  const cleaned = field.replace(/^\{|\}$/g, '');
  const parts = cleaned.split('=');
  if (parts.length >= 3) {
    // Hebrew: "H1254A=בָּרָא=to create" — parts[1] = lemma, parts[2] = gloss
    return [parts[1].trim(), parts[2].trim()];
  }
  if (parts.length === 2) {
    // Greek: "Δαυείδ, Δαυίδ=David" — lemma may be comma-separated, take first
    const lemma = parts[0].split(',')[0].trim();
    return [lemma, parts[1].trim()];
  }
  return [cleaned, ''];
}

// "Δαυὶδ (Dauid)" → ["Δαυὶδ", "Dauid"]
function parseWordTr(field) {
  if (!field) return ['', ''];
  const m = field.match(/^(\S+)\s*\(([^)]+)\)/);
  if (m) return [m[1], m[2]];
  return [field.trim(), ''];
}

// STEPBible ref: "Mat.1.1#01=NKO" or "Gen.1.1#01=L"
// → { book: 'Matt', chapter: 1, verse: 1 }
function parseRef(refField) {
  if (!refField) return null;
  const m = refField.match(/^(\w+)\.(\d+)\.(\d+)#/);
  if (!m) return null;
  const bookCode = m[1];
  const bookId = BOOK_MAP[bookCode];
  if (!bookId) return null;
  return { bookId, chapter: +m[2], verse: +m[3] };
}

async function processFile(src) {
  const filepath = await download(src.fn);
  console.log(`\n▶ parsing ${src.fn} (${src.lang})`);
  const content = await fs.readFile(filepath, 'utf8');
  const lines = content.split(/\r?\n/);

  // byBook[bookId][chapter][verse] = [wordObj, ...]
  const byBook = new Map();

  let processed = 0;
  for (const raw of lines) {
    if (!raw || raw.startsWith('#') || raw.startsWith('=')) continue;
    const fields = raw.split('\t');
    if (fields.length < 5) continue;
    const ref = parseRef(fields[0]);
    if (!ref) continue;

    const [word, translit] = parseWordTr(fields[1]);
    if (!word) continue;

    // Greek: dStrongs=Grammar in field[3], lemma=gloss in field[4]
    // Hebrew: strong in field[4], morph in field[5], lemma/gloss extracted from field[10] area
    let strongField, morphField, lemmaGlossField;
    if (src.lang === 'gnt') {
      strongField = fields[3];
      morphField = ''; // grammar is inside strongField after '='
      lemmaGlossField = fields[4];
    } else {
      // Hebrew fields: 0=ref, 1=word, 2=translit, 3=gloss, 4=strong, 5=morph, ..., final has "{H1254A=בָּרָא=to create}"
      strongField = fields[4];
      morphField = fields[5] || '';
      // Find the {Hxxx=lemma=gloss} pattern in later fields
      lemmaGlossField = fields.find((f, i) => i >= 6 && /^\{H\d/.test(f)) || '';
    }

    const strong = extractStrong(strongField);
    const morph = extractMorph(strongField, morphField);
    const [lemma, gloss] = parseLemmaGloss(lemmaGlossField);
    // 히브리어: gloss 필드(fields[3])에도 영어 뜻이 있음 — 우선 사용
    const finalGloss = src.lang === 'hot' ? (fields[3]?.trim() || gloss) : gloss;

    const w = { w: word, tr: translit, s: strong, m: morph, l: lemma, g: finalGloss };
    // 빈 값은 저장 안 함
    for (const k of Object.keys(w)) if (!w[k]) delete w[k];

    if (!byBook.has(ref.bookId)) byBook.set(ref.bookId, new Map());
    const chMap = byBook.get(ref.bookId);
    if (!chMap.has(ref.chapter)) chMap.set(ref.chapter, new Map());
    const vMap = chMap.get(ref.chapter);
    if (!vMap.has(ref.verse)) vMap.set(ref.verse, []);
    vMap.get(ref.verse).push(w);
    processed++;
  }

  console.log(`  ↳ ${processed.toLocaleString()} words → writing chapter files + Strong index`);

  // Strong 인덱스: { strongNum → [{ch, v, w, m, l}] } per book
  // key: bookId → Map<strongNum, [{ch,v,w,m,l}]>
  const strongIndex = new Map(); // bookId → Map<s, entries[]>

  for (const [bookId, chMap] of byBook) {
    const bookDir = path.join(OUT_DIR, src.lang, bookId);
    await fs.mkdir(bookDir, { recursive: true });

    if (!strongIndex.has(bookId)) strongIndex.set(bookId, new Map());
    const sMap = strongIndex.get(bookId);

    for (const [chapter, vMap] of chMap) {
      const obj = {};
      for (const v of [...vMap.keys()].sort((a, b) => a - b)) {
        const words = vMap.get(v);
        obj[v] = words;
        // Strong 인덱스에 추가 (w, m, l만 — 글로스는 팝업에 이미 있음)
        for (const word of words) {
          if (!word.s) continue;
          if (!sMap.has(word.s)) sMap.set(word.s, []);
          sMap.get(word.s).push({ ch: chapter, v, w: word.w, m: word.m || '', l: word.l || '' });
        }
      }
      const outfile = path.join(bookDir, `${chapter}.json`);
      await fs.writeFile(outfile, JSON.stringify(obj));
    }
  }

  // Strong 인덱스 파일 저장: public/data/strongs/{lang}/{bookId}.json
  const strongsLangDir = path.join(STRONGS_DIR, src.lang);
  await fs.mkdir(strongsLangDir, { recursive: true });
  for (const [bookId, sMap] of strongIndex) {
    const obj = {};
    for (const [s, entries] of sMap) {
      obj[s] = entries;
    }
    await fs.writeFile(path.join(strongsLangDir, `${bookId}.json`), JSON.stringify(obj));
  }
  console.log(`  ↳ Strong index written to ${strongsLangDir}/`);
}

async function writeManifest() {
  // 어떤 (lang, bookId) 조합이 커버되는지 매니페스트로 저장
  const langs = ['gnt', 'hot'];
  const manifest = { license: 'CC BY 4.0', source: 'https://github.com/STEPBible/STEPBible-Data', coverage: {} };
  for (const lang of langs) {
    const dir = path.join(OUT_DIR, lang);
    try {
      const books = await fs.readdir(dir);
      manifest.coverage[lang] = books.sort();
    } catch {
      manifest.coverage[lang] = [];
    }
  }
  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\n✓ manifest.json written');
}

// ── Strong's 정의 사전 (openscriptures/strongs, Public Domain) ──────────────
// 청킹 전략: chunk = floor((strongNum - 1) / 1000) — 인덱스 파일 불필요
const CHUNK_SIZE = 1000;
const DEF_DIR = path.join(REPO_ROOT, 'public/data/strongs-def');

const STRONGS_DICT_URLS = {
  gnt: [
    'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js',
    'https://raw.githubusercontent.com/openscriptures/strongs/master/strongs-greek-dictionary.js',
  ],
  hot: [
    'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js',
    'https://raw.githubusercontent.com/openscriptures/strongs/master/strongs-hebrew-dictionary.js',
  ],
};

async function fetchFirstOk(urls) {
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (r.ok) { console.log(`  ✓ got: ${url}`); return r; }
    } catch { /* try next */ }
  }
  throw new Error(`All URLs failed:\n  ${urls.join('\n  ')}`);
}

function parseStrongsJs(text) {
  // 파일 형식: var/const X = { ... }; 또는 module.exports = { ... }
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('JSON object not found in strongs JS');
  return JSON.parse(text.slice(start, end + 1));
}

async function buildStrongsDefChunks(lang) {
  console.log(`\n▶ Strong's def dictionary: ${lang}`);
  const res  = await fetchFirstOk(STRONGS_DICT_URLS[lang]);
  const text = await res.text();
  const raw  = parseStrongsJs(text);

  // 키 정규화: "G0001" / "G1" 모두 "G1" 형태로
  const prefix = lang === 'gnt' ? 'G' : 'H';
  const entries = Object.entries(raw).map(([k, v]) => {
    const num = parseInt(k.replace(/^[GH]/, ''), 10);
    const key = `${prefix}${num}`;
    return [key, {
      d: v.strongs_def || v.definition || v.def || '',
      e: v.derivation  || '',             // etymology
      k: v.kjv_def     || v.kjv || '',
      l: v.lemma        || '',
      t: v.translit     || v.pronunciation || '',
    }];
  });
  console.log(`  ↳ ${entries.length} entries`);

  // 청크로 분할해 저장
  const outDir = path.join(DEF_DIR, lang);
  await fs.mkdir(outDir, { recursive: true });

  const chunks = new Map(); // chunkIdx → { key: entry }
  for (const [key, val] of entries) {
    const num = parseInt(key.slice(1), 10);
    const ci  = Math.floor((num - 1) / CHUNK_SIZE);
    if (!chunks.has(ci)) chunks.set(ci, {});
    chunks.get(ci)[key] = val;
  }

  for (const [ci, obj] of chunks) {
    await fs.writeFile(path.join(outDir, `${ci}.json`), JSON.stringify(obj));
  }
  console.log(`  ↳ ${chunks.size} chunk files → ${outDir}`);
}

async function main() {
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const src of SOURCES) {
    await processFile(src);
  }
  await writeManifest();

  // Strong's 정의 사전 빌드 (실패해도 전체는 중단 안 함)
  for (const lang of ['gnt', 'hot']) {
    await buildStrongsDefChunks(lang).catch(e =>
      console.warn(`  ⚠ strongs-def ${lang} skipped:`, e.message)
    );
  }

  console.log('\n✅ done. Output:', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
