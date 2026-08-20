// 10개 제안 → 셰이드별 2안 대조 → 합의/불일치 분리
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const IN = path.join(ROOT, '.pipeline/task6/input');
const PROP = path.join(ROOT, '.pipeline/task6/proposals');

const PAIRS = {
  A: ['A-gem31pro', 'A-claudeopus5'],
  B: ['B-gem31pro', 'B-agyopus46'],
  C: ['C-gem37flash', 'C-claudeopus5'],
  D: ['D-gem31pro', 'D-agysonnet46'],
  E: ['E-gem37flash', 'E-agyopus46'],
};

const norm = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

function readProposal(slug) {
  const p = path.join(PROP, `${slug}.json`);
  if (!fs.existsSync(p)) return { slug, missing: true, byStrong: new Map() };
  let raw = fs.readFileSync(p, 'utf8').trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const j = JSON.parse(raw);
  const byStrong = new Map();
  for (const e of j.entries || []) byStrong.set(e.strong, e);
  return { slug, missing: false, count: (j.entries || []).length, byStrong };
}

const agreed = [];
const disputed = [];
const report = [];

for (const [shard, slugs] of Object.entries(PAIRS)) {
  const input = JSON.parse(fs.readFileSync(path.join(IN, `shard-${shard}.json`), 'utf8'));
  const [p1, p2] = slugs.map(readProposal);
  const missing = [];
  let agree = 0;
  let disagree = 0;

  for (const item of input.items) {
    const a = p1.byStrong.get(item.strong);
    const b = p2.byStrong.get(item.strong);
    if (!a || !b) {
      missing.push(item.strong);
      disputed.push({ shard, strong: item.strong, lemma: item.lemma, lang: item.lang, reason: 'missing-proposal', a: a || null, b: b || null });
      continue;
    }
    const koSame = norm(a.translitKo) === norm(b.translitKo);
    const latSame = norm(a.translit) === norm(b.translit);
    if (koSame && latSame) {
      agree += 1;
      const note = norm(a.note) || norm(b.note);
      agreed.push({
        shard,
        strong: item.strong,
        lemma: item.lemma,
        translit: norm(a.translit),
        translitKo: norm(a.translitKo),
        note,
        agreement: 'both',
      });
    } else {
      disagree += 1;
      disputed.push({
        shard,
        strong: item.strong,
        lemma: item.lemma,
        lang: item.lang,
        glossEn: item.glossEn,
        reason: koSame ? 'latin-differs' : 'korean-differs',
        a: { model: slugs[0], translit: norm(a.translit), translitKo: norm(a.translitKo), note: norm(a.note) },
        b: { model: slugs[1], translit: norm(b.translit), translitKo: norm(b.translitKo), note: norm(b.note) },
      });
    }
  }
  report.push({
    shard,
    items: input.items.length,
    p1: { slug: p1.slug, missing: p1.missing, count: p1.count ?? 0 },
    p2: { slug: p2.slug, missing: p2.missing, count: p2.count ?? 0 },
    agree,
    disagree,
    missing: missing.length,
  });
}

const out = {
  batchId: 'top-frequency-batch-02',
  totals: { input: 245, agreed: agreed.length, disputed: disputed.length },
  shards: report,
  agreed,
  disputed,
};
fs.writeFileSync(path.join(ROOT, '.pipeline/task6/consensus.json'), `${JSON.stringify(out, null, 2)}\n`);
console.table(report);
console.log('agreed:', agreed.length, 'disputed:', disputed.length);
