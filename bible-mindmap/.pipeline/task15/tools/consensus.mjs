// batch 03 · 묶음마다 네 모델이 낸 안을 대조한다.
//
// batch 02 는 묶음당 두 안이라 갈리면 곧바로 판정으로 넘겨야 했다. 이번엔 네
// 안이라 3표 이상 모이면 그 자체로 결론이 선다. 2:2 로 갈리거나 넷이 다 다른
// 자리만 판정으로 넘긴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const [taskArg = 'task15', ...shardArgs] = process.argv.slice(2);
const T7 = path.join(ROOT, `.pipeline/${taskArg}`);
const SHARDS = ["AD","AE","AF"];
const MODELS = ["codex","gem31pro","gptoss120b","gem37flash"];
const MAJORITY = 3;

const norm = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

function readProposal(slug) {
  const p = path.join(T7, 'proposals', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  let raw = fs.readFileSync(p, 'utf8').trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const j = JSON.parse(raw);
  return new Map((j.entries || []).map((e) => [e.strong, e]));
}

function vote(values) {
  const tally = new Map();
  for (const v of values) tally.set(v, (tally.get(v) || 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1]);
}

const settled = [];
const disputed = [];
const report = [];

for (const shard of SHARDS) {
  const input = JSON.parse(fs.readFileSync(path.join(T7, `input/shard-${shard}.json`), 'utf8'));
  const props = MODELS.map((m) => ({ model: m, map: readProposal(`${shard}-${m}`) })).filter((p) => p.map);
  let unanimous = 0;
  let majority = 0;
  let split = 0;

  for (const item of input.items) {
    const picks = props
      .map((p) => ({ model: p.model, e: p.map.get(item.strong) }))
      .filter((x) => x.e);

    if (picks.length < 2) {
      disputed.push({ shard, strong: item.strong, lemma: item.lemma, lang: item.lang, reason: 'too-few-proposals', options: picks });
      split += 1;
      continue;
    }

    const koRank = vote(picks.map((p) => norm(p.e.translitKo)));
    const latRank = vote(picks.map((p) => norm(p.e.translit)));
    const [koTop, koCount] = koRank[0];
    const [latTop, latCount] = latRank[0];
    const koTie = koRank.length > 1 && koRank[1][1] === koCount;

    if (koCount === picks.length && latCount === picks.length) {
      unanimous += 1;
    } else if (koCount >= MAJORITY && !koTie) {
      majority += 1;
    } else {
      split += 1;
      disputed.push({
        shard,
        strong: item.strong,
        lemma: item.lemma,
        lang: item.lang,
        glossEn: item.glossEn,
        reason: koTie ? 'tie' : 'no-majority',
        options: picks.map((p) => ({
          model: p.model,
          translit: norm(p.e.translit),
          translitKo: norm(p.e.translitKo),
          note: norm(p.e.note),
        })),
      });
      continue;
    }

    // 근거는 다수안을 낸 모델 중 가장 구체적인 note 를 쓴다.
    const backers = picks.filter((p) => norm(p.e.translitKo) === koTop);
    const bestNote = backers.map((p) => norm(p.e.note)).filter(Boolean).sort((a, b) => b.length - a.length)[0] || '';
    const tally = koCount === picks.length
      ? `네 모델이 독립으로 만든 음역안이 모두 일치했다.`
      : `네 모델 중 ${koCount}개가 같은 음역안을 냈다.`;

    settled.push({
      shard,
      strong: item.strong,
      lemma: item.lemma,
      translit: latTop,
      translitKo: koTop,
      votesKo: koCount,
      judges: picks.length,
      note: bestNote ? `${tally} ${bestNote}` : tally,
      origin: koCount === picks.length ? 'unanimous' : 'majority',
    });
  }

  report.push({ shard, items: input.items.length, proposers: props.length, unanimous, majority, split });
}

fs.writeFileSync(
  path.join(T7, 'consensus.json'),
  `${JSON.stringify({
    batchId: `top-frequency-batch-${taskArg === 'task15' ? '08' : '07'}`,
    models: MODELS,
    majorityThreshold: MAJORITY,
    totals: { settled: settled.length, disputed: disputed.length },
    shards: report,
    settled,
    disputed,
  }, null, 2)}\n`,
);

console.table(report);
console.log('결론난 것:', settled.length, '· 판정 필요:', disputed.length);
