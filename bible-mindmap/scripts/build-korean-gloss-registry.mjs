#!/usr/bin/env node
// src/data/koreanGlossActive.js 를 배치 파일 목록에서 다시 만든다.
//
// 왜 필요한가: 배치를 하나 더할 때마다 koreanGlossActive.js 와 검증기를 손으로
// 고쳐야 했다. 배치 브랜치 여러 개가 같은 두 파일의 같은 줄을 건드리니 충돌이
// 반복됐다. 이제 배치를 더하는 일은 **새 파일 하나를 놓는 것**이고, 이 스크립트가
// 등록부를 다시 만든다. 충돌이 나면 어느 쪽을 택하든 다시 돌리면 정답이 된다.
//
// 검증기도 여기서 내보내는 KOREAN_GLOSS_BATCHES 를 순회하므로 배치가 늘어도
// 고칠 일이 없다.
//
// 사용: node scripts/build-korean-gloss-registry.mjs [--check]
//   --check 는 파일을 쓰지 않고 최신인지만 확인한다(CI 용).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src/data');
const OUT = path.join(DATA, 'koreanGlossActive.js');
const CHECK = process.argv.includes('--check');

// 적용 순서 = 뒤에 오는 것이 앞을 덮는다.
//   1) 파일럿 baseline
//   2) 빈도 상위 배치 (번호 순)
//   3) 창세기 1장 배치 (번호 순) — 본문을 직접 검토해 만든 것이라 가장 뒤
const files = fs.readdirSync(DATA).filter((f) => /^koreanGloss(TopBatch|Genesis1Batch)\d+\.js$/.test(f));
const rank = (f) => (f.startsWith('koreanGlossTopBatch') ? 0 : 1);
const num = (f) => Number(/(\d+)\.js$/.exec(f)[1]);
files.sort((a, b) => rank(a) - rank(b) || num(a) - num(b));

const entries = files.map((f) => {
  const base = f.replace(/\.js$/, '');
  const konst = base
    .replace(/^koreanGloss/, 'KOREAN_GLOSS_')
    .replace(/TopBatch(\d+)/, 'TOP_BATCH_$1')
    .replace(/Genesis1Batch(\d+)/, 'GENESIS_1_BATCH_$1');
  return { file: f, konst };
});

// 상수 이름이 실제 파일에 있는지 확인한다. 이름 규칙이 어긋나면 여기서 멈춘다.
for (const e of entries) {
  const src = fs.readFileSync(path.join(DATA, e.file), 'utf8');
  for (const name of [e.konst, `${e.konst}_META`]) {
    if (!src.includes(`export const ${name}`)) {
      console.error(`${e.file}: export const ${name} 를 찾지 못했다. 이름 규칙을 확인하라.`);
      process.exit(1);
    }
  }
}

const lines = [];
lines.push(`// 런타임 한글 음역 사전 등록부.
//
// **이 파일은 scripts/build-korean-gloss-registry.mjs 가 만든다. 손으로 고치지 마라.**
// 배치를 더하려면 src/data/koreanGloss{TopBatch|Genesis1Batch}NN.js 를 놓고
// 스크립트를 다시 돌려라. 충돌이 나면 어느 쪽을 택하든 다시 돌리면 정답이 된다.
//
// 적용 순서: 파일럿 baseline → 빈도 상위 배치(번호 순) → 창세기 1장 배치(번호 순).
// 뒤에 오는 것이 앞을 덮는다. 창세기 배치는 본문을 직접 검토해 만든 것이라
// 빈도 배치보다 뒤에 둔다.

import { KOREAN_GLOSS } from './koreanGloss.js';`);
for (const e of entries) {
  lines.push(`import { ${e.konst}, ${e.konst}_META } from './${e.file}';`);
}
lines.push('');
lines.push(`// 검증기·리포트가 배치를 순회할 때 쓴다. 배치가 늘어도 소비하는 쪽은 고칠 일이 없다.
export const KOREAN_GLOSS_BATCHES = [`);
for (const e of entries) {
  lines.push(`  { entries: ${e.konst}, meta: ${e.konst}_META },`);
}
lines.push('];');
lines.push('');
lines.push(`export const KOREAN_GLOSS_ACTIVE = {
  ...KOREAN_GLOSS,`);
for (const e of entries) {
  lines.push(`  ...${e.konst},`);
}
lines.push('};');
lines.push('');
lines.push(`export const KOREAN_GLOSS_ACTIVE_META = {
  baselineCount: Object.keys(KOREAN_GLOSS).length,
  batchCount: KOREAN_GLOSS_BATCHES.length,
  extensionCount: KOREAN_GLOSS_BATCHES.reduce((n, b) => n + Object.keys(b.entries).length, 0),
};`);
lines.push('');

const next = lines.join('\n');
const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';

if (CHECK) {
  if (prev !== next) {
    console.error('koreanGlossActive.js 가 배치 파일 목록과 어긋난다. node scripts/build-korean-gloss-registry.mjs 를 돌려라.');
    process.exit(1);
  }
  console.log(`✓ 등록부 최신 · 배치 ${entries.length}개`);
} else {
  fs.writeFileSync(OUT, next);
  console.log(`✓ koreanGlossActive.js 생성 · 배치 ${entries.length}개 (${entries.map((e) => e.file.replace('koreanGloss', '')).join(' ')})`);
}
