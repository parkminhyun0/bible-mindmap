// 판정 5안 → 다수결 → rulings.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const taskArg = process.argv[2] || 'task11';
const T6 = path.join(ROOT, `.pipeline/${taskArg}`);
const norm = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

function readJson(p) {
  let raw = fs.readFileSync(p, 'utf8').trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(raw);
}

const files = fs.readdirSync(path.join(T6, 'rulings')).filter((f) => f.startsWith('adj-') && f.endsWith('.json'));
const judges = files.map((f) => ({ slug: f.replace(/^adj-|\.json$/g, ''), data: readJson(path.join(T6, 'rulings', f)) }));
console.log('판정자:', judges.map((j) => `${j.slug}(${j.data.rulings?.length ?? 0})`).join(' '));

const disputed = readJson(path.join(T6, 'disputed.json'));
const consensusAgreedNotes = new Map();

function vote(values) {
  const tally = new Map();
  for (const v of values) tally.set(v, (tally.get(v) || 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1]);
}

const out = [];
const ties = [];

for (const item of disputed.items) {
  const picks = judges
    .map((j) => (j.data.rulings || []).find((r) => r.strong === item.strong))
    .filter(Boolean);

  if (!picks.length) {
    throw new Error(`판정 없음: ${item.strong}`);
  }

  const koRank = vote(picks.map((p) => norm(p.translitKo)));
  const latRank = vote(picks.map((p) => norm(p.translit)));
  const [koTop, koCount] = koRank[0];
  const [latTop, latCount] = latRank[0];

  const koTie = koRank.length > 1 && koRank[1][1] === koCount;
  const latTie = latRank.length > 1 && latRank[1][1] === latCount;
  if (koTie || latTie) {
    ties.push({ strong: item.strong, koRank, latRank });
  }

  // 판정 근거는 다수안을 고른 판정자 중 가장 구체적인 것을 쓴다.
  const supporters = picks.filter((p) => norm(p.translitKo) === koTop);
  const bestNote = supporters
    .map((p) => norm(p.note))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] || '';

  // 판정자 수를 하드코딩하지 않는다. 실제로 판정한 모델 수를 그대로 쓴다.
  const tally = `표기가 갈려 ${picks.length}개 모델이 독립 판정했다(${koCount}/${picks.length} 일치).`;
  out.push({
    strong: item.strong,
    lemma: item.lemma,
    translit: latTop,
    translitKo: koTop,
    votesKo: koCount,
    votesLat: latCount,
    judges: picks.length,
    tie: koTie || latTie,
    note: bestNote ? `${tally} ${bestNote}` : tally,
  });
}

const rules = judges.map((j) => ({ model: j.slug, rules: j.data.rules || {} }));
fs.writeFileSync(
  path.join(T6, 'rulings.json'),
  `${JSON.stringify({ judgeCount: judges.length, judges: judges.map((j) => j.slug), rules, tieCount: ties.length, ties, rulings: out }, null, 2)}\n`,
);

const dist = {};
for (const r of out) dist[r.votesKo] = (dist[r.votesKo] || 0) + 1;
console.log('판정 완료:', out.length, '· 한글 득표 분포(득표수:항목수):', dist, '· 동률:', ties.length);
void consensusAgreedNotes;
