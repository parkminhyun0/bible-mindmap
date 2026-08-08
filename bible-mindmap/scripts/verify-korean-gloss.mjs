#!/usr/bin/env node
// koreanGloss.js 전용 정합성 verifier.
//
// 검사(치명 = 실패로 종료):
//  1. 키 형식: ^[HG]\d+$ (선행 0 없는 정규 Strong)
//  2. 필수 필드: glossKo·translitKo·concept 모두 비어있지 않음
//  3. 과병합 가드([[lexicon-gloss-standard]]): 같은 개념쌍이라도 뜻이 실제로 다른
//     지정 쌍은 glossKo가 동일하면 안 됨(짝 단어 뜻 끌어오기 금지).
//
// 리뷰 플래그(비치명 = 경고만): 같은 concept 내 H·G가 아닌 중복 translit,
// 개념 불균형(H만 또는 G만) 등 사람이 눈으로 확인할 항목.
//
// 뜻의 학술적 정확성(BDB/HALOT·BDAG)은 이 스크립트로 검증하지 않는다 — Gemini·자비스
// 검수 게이트 담당. 여기서는 구조·과병합 방지만 자동 검사한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GLOSS_FILE = path.join(ROOT, 'src/data/koreanGloss.js');

// 개념쌍이지만 뜻이 실제로 달라 과병합하면 안 되는 쌍(lexicon-gloss-standard).
// 둘 다 존재하는데 glossKo가 완전히 같으면 실패.
const MUST_DIFFER = [
  ['H1121', 'G5206'], // 벤=아들/자손  ≠  휘오테시아=양자 삼음
  ['H776', 'G2817'], // 에레츠=땅/나라  ≠  클레로노미아=기업/상속
];

function loadGloss() {
  const src = fs.readFileSync(GLOSS_FILE, 'utf8');
  const m = src.match(/KOREAN_GLOSS\s*=\s*(\{[\s\S]*?\})\s*;?\s*$/m);
  if (!m) throw new Error('KOREAN_GLOSS 객체를 파싱하지 못했습니다.');
  return JSON.parse(m[1]);
}

function main() {
  let gloss;
  try {
    gloss = loadGloss();
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }

  const errors = [];
  const warns = [];
  const entries = Object.entries(gloss);

  // 1~2. 키 형식 + 필수 필드
  for (const [key, v] of entries) {
    if (!/^[HG]\d+$/.test(key)) errors.push(`키 형식 위반: "${key}" (정규 Strong 아님, 선행 0 금지)`);
    if (!v || typeof v !== 'object') {
      errors.push(`값이 객체가 아님: "${key}"`);
      continue;
    }
    for (const f of ['glossKo', 'translitKo', 'concept']) {
      if (!v[f] || !String(v[f]).trim()) errors.push(`필수 필드 누락/빈값: "${key}".${f}`);
    }
  }

  // 3. 과병합 가드
  for (const [a, b] of MUST_DIFFER) {
    if (gloss[a] && gloss[b]) {
      const ga = String(gloss[a].glossKo || '').trim();
      const gb = String(gloss[b].glossKo || '').trim();
      if (ga && ga === gb) {
        errors.push(`과병합 위반: ${a}·${b}는 뜻이 달라야 하는데 glossKo 동일("${ga}")`);
      }
    }
  }

  // 리뷰 플래그: 개념 그룹 구성
  const byConcept = new Map();
  for (const [key, v] of entries) {
    const c = v?.concept || '(무개념)';
    const g = byConcept.get(c) || [];
    g.push(key);
    byConcept.set(c, g);
  }
  for (const [c, keys] of byConcept) {
    const hasH = keys.some((k) => k.startsWith('H'));
    const hasG = keys.some((k) => k.startsWith('G'));
    if (!(hasH && hasG)) warns.push(`개념 불균형: "${c}" → ${keys.join(', ')} (H·G 쌍 미완성)`);
  }

  console.log(`koreanGloss verifier · 항목=${entries.length} 개념=${byConcept.size}`);
  for (const w of warns) console.log(`  ⚠ ${w}`);
  if (errors.length) {
    console.error(`✗ 정합성 실패 ${errors.length}건:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✓ 구조·과병합 가드 통과 (${entries.length}항목, ${byConcept.size}개념). 뜻 정확성은 Gemini·자비스 검수 담당.`);
}

main();
