#!/usr/bin/env node
// KRV 자동 정렬 배치 생성기 · 자비스가 만들고 실행하는 스크립트.
//
// [배경] GPT 실행 환경 제약(네트워크 차단 · verify 실행 불가)으로 정렬 트랙은
// 자비스가 자동 생성 · GPT/Gemini 는 uncertain / 신학 민감어 검수 담당으로 조정.
//
// [절차] lex(jsDelivr fetch) → KRV(bolls.life fetch) → koreanGloss 후보 →
// findKoreanSpans(기존 translationAlignment.js 재사용) → relation/status/confidence 판정 →
// tokenChecksum → JSON 산출.
//
// 실행: node scripts/build-krv-alignment.mjs --book Gen --chapter 1 --from 1 --to 5
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTokenChecksum, createTokenId, ALIGNMENT_SCHEMA_VERSION, normalizeStrongId } from '../src/data/translationAlignmentContract.js';
import { findKoreanSpans, splitGlossCandidates } from '../src/utils/translationAlignment.js';
import { KOREAN_GLOSS } from '../src/data/koreanGloss.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// 데이터 소스 (A안 CDN)
const DATA_DIST_SHA = '6fd9ad8';
const LEX_BASE = `https://cdn.jsdelivr.net/gh/parkminhyun0/bible-mindmap@${DATA_DIST_SHA}/data/lex/hot`;
const KRV_BASE = 'https://bolls.life/get-text/KRV';
const KRV_VERSION = 'bolls-krv-2026.08';

// 성경 책 → bolls.life 책 번호 매핑 (창세기 = 1)
const BOOK_NUMBERS = { Gen: 1 };

// 신학 민감어 (confidence 무관 review 강제)
const SENSITIVE_STRONGS = new Set(['H430', 'H3068', 'H136', 'G2316', 'G2962', 'G5547', 'G4151']);

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--(\w+)=?(.*)$/);
    if (m) args[m[1]] = m[2] || argv[argv.indexOf(a) + 1];
  }
  return args;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

// KRV 절 배열 → { 1: "…", 2: "…" } 맵
async function fetchKrvChapter(book, chapter) {
  const bookNum = BOOK_NUMBERS[book];
  if (!bookNum) throw new Error(`Unknown book: ${book}`);
  const data = await fetchJson(`${KRV_BASE}/${bookNum}/${chapter}/`);
  const map = {};
  for (const row of data) map[row.verse] = String(row.text || '').trim();
  return map;
}

// 정렬 record 하나 생성
function buildRecord({ token, tokenIndex, verse, verseText, bookId, chapter }) {
  const strong = normalizeStrongId(token.s);
  const isSensitive = SENSITIVE_STRONGS.has(strong);
  const gloss = KOREAN_GLOSS[strong] || null;

  // 후보 확보: koreanGloss 후보 · lemma 도 후보
  const candidates = gloss ? splitGlossCandidates(gloss.glossKo) : [];

  const record = {
    schemaVersion: ALIGNMENT_SCHEMA_VERSION,
    tokenId: createTokenId({ bookId: bookId.toLowerCase(), chapter, verse, language: 'hot', index: tokenIndex }),
    strong,
    tokenChecksum: computeTokenChecksum(token.w),
    relation: 'direct',
    status: 'auto',
    confidence: 0.98,
    targets: {},
    sourceVersions: {
      dictionary: '2026-08-07.1',
      lexicon: DATA_DIST_SHA,
      krv: KRV_VERSION,
    },
  };

  // 사전에 후보 없으면 uncertain
  if (!candidates.length) {
    record.relation = 'uncertain';
    record.status = 'review';
    record.confidence = 0.4;
    record.targets.korean = { text: verseText, spans: [] };
    record.notes = `koreanGloss 미등록(${strong}) — 사전 확장 필요`;
    return record;
  }

  // 실제 KRV 본문에서 스팬 탐색 (findKoreanSpans 는 조사 파싱·부분매칭 배제 포함)
  const spans = findKoreanSpans(verseText, candidates);

  if (spans.length === 0) {
    record.relation = 'uncertain';
    record.status = 'review';
    record.confidence = 0.35;
    record.targets.korean = { text: verseText, spans: [] };
    record.notes = `KRV 본문에서 후보 발견 실패 — 의역·생략 가능`;
    return record;
  }

  if (spans.length > 1) {
    // 중복 후보: 확신 낮춤, 첫 매치만 기록
    record.status = isSensitive ? 'review' : 'review';
    record.confidence = 0.7;
    record.targets.korean = { text: verseText, spans: [spans[0]] };
    record.notes = `KRV 본문에 후보 ${spans.length} 회 등장 — 위치 확인 필요`;
    return record;
  }

  // 신학 민감어는 자동 승인 금지 → review 강제
  if (isSensitive) {
    record.status = 'review';
    record.notes = `신학 민감어 — 자비스 개혁주의 검수 필수`;
  }
  record.targets.korean = { text: verseText, spans };
  return record;
}

async function main() {
  const args = parseArgs(process.argv);
  const book = args.book || 'Gen';
  const chapter = Number(args.chapter || 1);
  const fromVerse = Number(args.from || 1);
  const toVerse = Number(args.to || 5);

  console.log(`▶ 정렬 파일럿: ${book} ${chapter}장 ${fromVerse}-${toVerse}절 · data-dist ${DATA_DIST_SHA}`);

  const lex = await fetchJson(`${LEX_BASE}/${book}/${chapter}.json`);
  const krv = await fetchKrvChapter(book, chapter);

  const records = [];
  for (let v = fromVerse; v <= toVerse; v += 1) {
    const tokens = lex[String(v)];
    const verseText = krv[v];
    if (!tokens || !verseText) {
      console.log(`  ↷ ${v}절: 데이터 없음 (lex=${!!tokens} krv=${!!verseText})`);
      continue;
    }
    tokens.forEach((token, idx) => {
      records.push(buildRecord({
        token, tokenIndex: idx, verse: v, verseText,
        bookId: book === 'Gen' ? 'genesis' : book.toLowerCase(), chapter,
      }));
    });
  }

  const output = {
    schemaVersion: ALIGNMENT_SCHEMA_VERSION,
    book: book === 'Gen' ? 'genesis' : book.toLowerCase(),
    chapter,
    translation: 'krv',
    sourceVersions: {
      dictionary: '2026-08-07.1',
      lexicon: DATA_DIST_SHA,
      krv: KRV_VERSION,
    },
    range: { fromVerse, toVerse, note: '파일럿 · 창1:1~5' },
    records,
  };

  const outDir = path.join(ROOT, 'public/data/alignment/krv/genesis');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${chapter}.json`);
  await fs.writeFile(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  // 리포트
  const total = records.length;
  const auto = records.filter((r) => r.status === 'auto').length;
  const review = records.filter((r) => r.status === 'review').length;
  const uncertain = records.filter((r) => r.relation === 'uncertain').length;
  const sensitive = records.filter((r) => SENSITIVE_STRONGS.has(r.strong)).length;
  const missingGloss = records.filter((r) => (r.notes || '').includes('koreanGloss 미등록')).length;

  console.log(`✓ 산출: ${path.relative(ROOT, outPath)}`);
  console.log(`  전체 토큰: ${total}`);
  console.log(`  자동승인(auto): ${auto} (${((auto / total) * 100).toFixed(1)}%)`);
  console.log(`  검수대기(review): ${review} (${((review / total) * 100).toFixed(1)}%)`);
  console.log(`    - uncertain(정렬 실패·의역): ${uncertain}`);
  console.log(`    - 신학 민감어: ${sensitive}`);
  console.log(`    - 사전 미등록: ${missingGloss}`);
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});
