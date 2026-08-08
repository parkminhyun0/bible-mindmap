#!/usr/bin/env node
// koreanGloss 확장용 코퍼스 빈도표 생성기.
//
// public/data/lex(STEPBible, CC BY 4.0)의 Strong·형태소 데이터를 집계해
// - Strong별 실제 출현 빈도
// - 형태소 기반 내용어(N 명사·V 동사·A 형용사) vs 기능어(관사·전치사·접속사·대명사 등) 분류
// - 기존 koreanGloss.js 수록 여부
// 를 산출하고, "아직 미수록 + 내용어" 후보를 빈도 상위 순으로 뽑는다.
//
// 목적: 뜻(glossKo) 값은 절대 생성하지 않는다(권위 사전 게이트 별도). 이 표는
// "다음에 어떤 Strong을 우선 다룰지"를 코퍼스 근거로 객관 선정하기 위한 것.
//
// 사용: LEX_DIR=<lex 경로> node scripts/build-gloss-frequency.mjs [--top=300]
// 기본 LEX_DIR = public/data/lex. 출력 = src/data/glossFrequency.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LEX_DIR = process.env.LEX_DIR || path.join(ROOT, 'public/data/lex');
const TOP = Number((process.argv.find((a) => a.startsWith('--top=')) || '--top=300').split('=')[1]);
const OUT = path.join(ROOT, 'src/data/glossFrequency.json');
const GLOSS_FILE = path.join(ROOT, 'src/data/koreanGloss.js');

// Strong 정규화: "H0559" → "H559" (koreanGloss 키와 일치시키기 위해 선행 0 제거).
function normStrong(s) {
  const m = /^([HG])0*(\d+)$/.exec(String(s).trim());
  return m ? `${m[1]}${m[2]}` : null;
}

// 형태소 코드에서 내용어 여부 판정.
// 토큰의 m 은 "HRd/Ncmsa" 처럼 "/"로 접사와 본어가 분리된다. 각 세그먼트에서
// 언어 접두(H/G/A[람어])와 파싱코드를 제거한 첫 품사 문자가 N(명사)·V(동사)·A(형용사)면 내용어.
function isContentMorph(m) {
  if (!m) return false;
  for (const seg of String(m).split('/')) {
    // 선행 언어 표시(H/G/A) 제거 후 첫 글자가 품사.
    const pos = seg.replace(/^[HGA]/, '')[0];
    if (pos === 'N' || pos === 'V' || pos === 'A') return true;
  }
  return false;
}

function loadExistingGlossKeys() {
  try {
    const src = fs.readFileSync(GLOSS_FILE, 'utf8');
    return new Set((src.match(/"([HG]\d+)":/g) || []).map((x) => x.replace(/[":]/g, '')));
  } catch {
    return new Set();
  }
}

function walkJson(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJson(p, files);
    else if (e.name.endsWith('.json') && e.name !== 'manifest.json') files.push(p);
  }
  return files;
}

function main() {
  if (!fs.existsSync(LEX_DIR)) {
    console.error(`✗ lex 데이터를 찾을 수 없음: ${LEX_DIR} (LEX_DIR 지정 또는 npm run build:lexicon)`);
    process.exit(1);
  }
  const existing = loadExistingGlossKeys();
  // strong → { count, content(내용어 관측 수), lemma, gloss(영문 예시) }
  const tally = new Map();
  const files = walkJson(LEX_DIR);
  for (const file of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    for (const verse of Object.values(data)) {
      if (!Array.isArray(verse)) continue;
      for (const tok of verse) {
        const s = normStrong(tok?.s);
        if (!s) continue;
        const rec = tally.get(s) || { count: 0, content: 0, lemma: '', gloss: '' };
        rec.count += 1;
        if (isContentMorph(tok.m)) rec.content += 1;
        if (!rec.lemma && tok.l) rec.lemma = tok.l;
        if (!rec.gloss && tok.g) rec.gloss = String(tok.g).replace(/[<>[\]]/g, '').trim();
        tally.set(s, rec);
      }
    }
  }

  const rows = [...tally.entries()].map(([strong, r]) => ({
    strong,
    count: r.count,
    // 관측의 과반이 내용어 형태소면 내용어로 표시.
    content: r.content * 2 >= r.count,
    lemma: r.lemma,
    glossEn: r.gloss,
    inGloss: existing.has(strong),
  }));
  rows.sort((a, b) => b.count - a.count);

  const candidates = rows.filter((r) => r.content && !r.inGloss).slice(0, TOP);

  const out = {
    generatedFrom: 'public/data/lex (STEPBible, CC BY 4.0)',
    note: '빈도·형태소는 코퍼스 근거. glossKo 값은 이 표로 생성하지 않음(권위 사전 게이트 별도).',
    totals: { strongCount: rows.length, tokenFiles: files.length, existingGloss: existing.size },
    top: TOP,
    // 내용어 미수록 후보(빈도 상위). 실제 뜻은 BDB/HALOT·BDAG 검수로 채운다.
    candidates,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`✓ 빈도표 생성: ${path.relative(ROOT, OUT)}`);
  console.log(`  고유 Strong=${rows.length} · 기존 gloss=${existing.size} · 내용어 미수록 후보=${candidates.length}(top ${TOP})`);
  console.log('  상위 10 후보:');
  for (const c of candidates.slice(0, 10)) {
    console.log(`   ${c.strong.padEnd(7)} ${String(c.count).padStart(5)}회  ${c.lemma || ''} — ${c.glossEn || ''}`);
  }
}

main();
