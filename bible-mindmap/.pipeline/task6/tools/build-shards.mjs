// task6 입력 셰이드 생성기 (오케스트레이션 전용, src 미변경)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = path.join(ROOT, '.pipeline/task6/input');

const { KOREAN_GLOSS_ACTIVE } = await import(path.join(ROOT, 'src/data/koreanGlossActive.js'));
const have = new Set(Object.keys(KOREAN_GLOSS_ACTIVE));

const freq = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/glossFrequency.json'), 'utf8'));
const remain = freq.candidates.filter((c) => !have.has(c.strong));

// strongs-def 권위 사전에서 lemma / translit(SBL 라틴) / 정의를 끌어온다.
function loadDefs(sub) {
  const dir = path.join(ROOT, 'public/data/strongs-def', sub);
  const map = {};
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const [k, v] of Object.entries(j)) {
      const m = /^([HG])0*(\d+)$/.exec(k);
      map[m ? `${m[1]}${m[2]}` : k] = v;
    }
  }
  return map;
}
const defs = { ...loadDefs('hot'), ...loadDefs('gnt') };

const missingDef = [];
const items = remain.map((c) => {
  const d = defs[c.strong];
  if (!d) missingDef.push(c.strong);
  return {
    strong: c.strong,
    lang: c.strong[0] === 'H' ? 'hebrew' : 'greek',
    count: c.count,
    lemma: d?.l || c.lemma || '',
    translit: d?.t || '',
    glossEn: (d?.k || c.glossEn || '').trim(),
    defEn: (d?.d || '').trim().slice(0, 180),
  };
});

const SHARDS = ['A', 'B', 'C', 'D', 'E'];
const per = Math.ceil(items.length / SHARDS.length);
const manifest = [];
SHARDS.forEach((s, i) => {
  const slice = items.slice(i * per, (i + 1) * per);
  fs.writeFileSync(
    path.join(OUT, `shard-${s}.json`),
    `${JSON.stringify({ shard: s, count: slice.length, items: slice }, null, 2)}\n`,
  );
  manifest.push({ shard: s, count: slice.length, first: slice[0]?.strong, last: slice.at(-1)?.strong });
});

fs.writeFileSync(
  path.join(OUT, 'manifest.json'),
  `${JSON.stringify(
    {
      batchId: 'top-frequency-batch-02',
      source: 'src/data/glossFrequency.json (STEPBible corpus) + public/data/strongs-def',
      totalItems: items.length,
      activeBefore: have.size,
      missingDef,
      shards: manifest,
    },
    null,
    2,
  )}\n`,
);

console.log('items:', items.length, 'missingDef:', missingDef.length, missingDef.slice(0, 10));
console.log(manifest);
