// 장별 관찰 카드(contextChapterCards)의 discourseMarkers 원어 표지 정확성 verifier.
// 각 marker의 원어 자음 골격이 그 장의 실제 원어 lex(public/data/lex/{hot|gnt})에
// 존재하는지 기계 대조한다. GPT가 "지어낸 표지"를 대규모에서 자동 차단하기 위함.
//
// 판정: lex가 있는 장에서만 대조. 미존재율(missing/checkable)이 25%를 넘으면 fail(날조 신호).
// 개별 미스(versification 오프셋 등)는 경고만 — 히브리 절 번호와 KRV 장 번호 차이를 감안.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTEXT_CHAPTER_CARDS } from '../src/data/contextChapterCards.js';
import { isOT } from '../src/data/bibleBooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LEX = (lang, book, ch) => path.join(ROOT, 'public/data/lex', lang, book, `${ch}.json`);

// 히브리: 니쿠드·칸틸레이션(U+0591–U+05C7) 제거 → 자음만. 헬라: NFD 후 결합기호 제거.
const stripHeb = (s) => s.normalize('NFD').replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '');
const stripGrk = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^Ͱ-Ͽ]/g, '').toLowerCase();

function lexConsonants(book, ch, ot) {
  const lang = ot ? 'hot' : 'gnt';
  const p = LEX(lang, book, ch);
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const set = new Set();
    for (const words of Object.values(data)) {
      for (const w of words) set.add(ot ? stripHeb(w.w) : stripGrk(w.w));
    }
    return set;
  } catch { return null; }
}

let checkable = 0, missing = 0, noLex = 0;
const misses = [];

for (const [key, card] of Object.entries(CONTEXT_CHAPTER_CARDS)) {
  if (!card || !Array.isArray(card.discourseMarkers)) continue;
  const [book, chStr] = key.split(':');
  const ch = parseInt(chStr, 10);
  const ot = isOT(book);
  const set = lexConsonants(book, ch, ot);
  if (!set) { noLex += 1; continue; }
  const strip = ot ? stripHeb : stripGrk;
  for (const dm of card.discourseMarkers) {
    const cons = strip(dm.marker || '');
    if (cons.length < 2) continue; // 음역만 있거나 너무 짧으면 스킵
    checkable += 1;
    const hit = [...set].some((w) => w.includes(cons) || cons.includes(w));
    if (!hit) { missing += 1; misses.push(`${key} · "${dm.marker}"(자음 ${cons})`); }
  }
}

const rate = checkable ? (missing / checkable) : 0;
console.log(`관찰 카드 마커 정확성 verifier · 대조 ${checkable}개 · 미존재 ${missing} (${(rate * 100).toFixed(1)}%) · lex없음 장 ${noLex}`);
if (misses.length) {
  console.warn(`⚠ 본문 미존재 마커 ${misses.length}건 (versification 오프셋 가능):`);
  for (const m of misses.slice(0, 30)) console.warn(`   - ${m}`);
}
if (rate > 0.25) {
  console.error(`✗ 미존재율 ${(rate * 100).toFixed(1)}% > 25% — 표지 날조 신호. 반려.`);
  process.exit(1);
}
console.log('✓ 관찰 카드 마커 정확성 통과 (원어 lex 대조)');
