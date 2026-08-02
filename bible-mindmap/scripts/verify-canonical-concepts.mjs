// 정경 추적 개념 데이터(canonicalConcepts) 스키마·정합성 verifier.
// GPT가 생성한 CANONICAL_CONCEPTS가 자비스 확정 스펙을 지키는지 기계 대조한다.
//  - 필수 필드(label*, strong, canonicalArc, theologicalNote, reformedAnchors)
//  - strong 형식(He=H+숫자, Gr=G+숫자)
//  - canonicalArc 5~7단계 · 각 단계 필드 완비
//  - ref = 'Book:Ch' 또는 'Book:Ch:Verse' (유효 Book 약어·장 범위)
//  - covenantLink / connectionType enum
//  - 개념 간 summary 첫 30자 고유성(템플릿 복제 차단)
// 하나라도 위반하면 fail(exit 1).

import { CANONICAL_CONCEPTS, CONCEPT_CATEGORIES } from '../src/data/canonicalConcepts.js';
import { CANONICAL_USAGE_MAP } from '../src/data/canonicalUsageMap.js';
import { ALL_BOOKS, getBook } from '../src/data/bibleBooks.js';

const CATEGORIES = new Set(Object.keys(CONCEPT_CATEGORIES));

const COVENANTS = new Set(['adamic', 'noahic', 'abrahamic', 'mosaic', 'davidic', 'new', 'none']);
const CONNECTIONS = new Set(['A', 'B', 'C', 'D', 'E']);
const BOOK_IDS = new Set(ALL_BOOKS.map((b) => b.id));

const errors = [];
const warns = [];
let conceptCount = 0;
let arcCount = 0;
const firstStems = new Map(); // 첫 30자 → 개념/단계 (고유성 점검)

function isStr(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function checkRef(ref, where) {
  if (!isStr(ref)) { errors.push(`${where}: ref 누락`); return; }
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
  }
  if (vStr !== undefined) {
    const v = Number(vStr);
    if (!Number.isInteger(v) || v < 1) errors.push(`${where}: 절 번호 오류 "${ref}"`);
  }
}

for (const [key, c] of Object.entries(CANONICAL_CONCEPTS)) {
  conceptCount++;
  const w = `개념 '${key}'`;

  if (key !== key.toLowerCase()) errors.push(`${w}: 키는 소문자 슬러그여야 함`);
  if (!isStr(c.emoji)) errors.push(`${w}: emoji 누락 (개념 대표 이모지)`);
  if (!isStr(c.category)) errors.push(`${w}: category 누락`);
  else if (!CATEGORIES.has(c.category)) errors.push(`${w}: 알 수 없는 category "${c.category}" (허용: ${[...CATEGORIES].join('/')})`);
  if (!isStr(c.labelKo)) errors.push(`${w}: labelKo 누락`);
  if (!isStr(c.labelHe)) errors.push(`${w}: labelHe 누락`);
  if (!isStr(c.labelGr)) errors.push(`${w}: labelGr 누락`);

  if (!c.strong || typeof c.strong !== 'object') {
    errors.push(`${w}: strong 객체 누락`);
  } else {
    if (!isStr(c.strong.he) || !/^H\d+$/.test(c.strong.he)) errors.push(`${w}: strong.he 형식 오류 (H+숫자)`);
    if (c.strong.gr !== undefined && !/^G\d+$/.test(c.strong.gr)) errors.push(`${w}: strong.gr 형식 오류 (G+숫자)`);
  }

  if (!isStr(c.theologicalNote)) errors.push(`${w}: theologicalNote 누락`);
  if (!Array.isArray(c.reformedAnchors) || c.reformedAnchors.length === 0) errors.push(`${w}: reformedAnchors 배열 누락`);

  if (!Array.isArray(c.canonicalArc)) {
    errors.push(`${w}: canonicalArc 배열 누락`);
    continue;
  }
  if (c.canonicalArc.length < 5 || c.canonicalArc.length > 7) {
    errors.push(`${w}: canonicalArc 단계 수 ${c.canonicalArc.length} (5~7 요구)`);
  }

  c.canonicalArc.forEach((s, i) => {
    arcCount++;
    const sw = `${w} arc[${i}]`;
    if (!isStr(s.stage)) errors.push(`${sw}: stage 누락`);
    if (!isStr(s.summary)) errors.push(`${sw}: summary 누락`);
    checkRef(s.ref, sw);
    if (!COVENANTS.has(s.covenantLink)) errors.push(`${sw}: covenantLink enum 위반 "${s.covenantLink}"`);
    if (!CONNECTIONS.has(s.connectionType)) errors.push(`${sw}: connectionType enum 위반 "${s.connectionType}"`);
    // 첫 30자 고유성 (개념 간 템플릿 복제 차단)
    if (isStr(s.summary)) {
      const stem = s.summary.slice(0, 30);
      if (firstStems.has(stem)) warns.push(`중복 summary 도입부: ${sw} ↔ ${firstStems.get(stem)}`);
      else firstStems.set(stem, sw);
    }
  });
}

// ── 용례지도(canonicalUsageMap) 심화 데이터 검증 (선택 파일 · 있으면 게이팅) ──
let usageCount = 0;
for (const [key, arr] of Object.entries(CANONICAL_USAGE_MAP || {})) {
  const uw = `usageMap.${key}`;
  if (!CANONICAL_CONCEPTS[key]) errors.push(`${uw}: 존재하지 않는 개념 키`);
  if (!Array.isArray(arr)) { errors.push(`${uw}: 배열 아님`); continue; }
  if (arr.length < 6 || arr.length > 10) warns.push(`${uw}: 용례 ${arr.length}개 (권장 6~10)`);
  arr.forEach((u, i) => {
    usageCount += 1;
    if (!isStr(u?.note)) errors.push(`${uw}[${i}]: note 누락`);
    checkRef(u?.ref, `${uw}[${i}]`);
  });
}

console.log(`정경 추적 개념 verifier · 개념 ${conceptCount} · arc 단계 ${arcCount} · 용례 ${usageCount} · 오류 ${errors.length} · 경고 ${warns.length}`);
if (warns.length) {
  console.log(`⚠ 경고 ${warns.length}건:`);
  warns.slice(0, 20).forEach((x) => console.log('   - ' + x));
}
if (errors.length) {
  console.log(`✗ 스키마·정합성 오류 ${errors.length}건:`);
  errors.slice(0, 40).forEach((x) => console.log('   - ' + x));
  process.exit(1);
}
console.log('✓ 정경 추적 개념 정합성 통과 (스키마·ref·enum·strong 형식)');
