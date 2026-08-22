// 파이프라인 현재 상태를 사실만으로 요약한다. 감독관이 이 출력을 근거로
// 다음 작업을 정한다. 추측이 끼어들 자리를 없애려고 전부 파일 존재로 판단한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// 배치 목록은 폴더에서 읽는다. 손으로 적어 두던 앞 판본은 b11 부터 빠져 있었고,
// 그래서 b11·b12 가 재감사까지 다 끝났는데도 0-lead 대행이 "PR 대상 없음" 으로
// 계속 대기했다. 배치를 열 때마다 사람이 이 목록을 고쳐야 하는 구조 자체가
// 조용한 정지를 부른다. 파일에서 읽으면 그런 자리가 없다.
// batch 번호는 task6 = batch02 기준으로 4를 뺀다.
const BATCHES = fs.readdirSync(path.join(ROOT, '.pipeline'))
  .filter((d) => /^task\d+$/.test(d))
  .map((task) => {
    const inp = path.join(ROOT, '.pipeline', task, 'input');
    if (!fs.existsSync(inp)) return null;
    const shards = fs.readdirSync(inp)
      .map((f) => /^shard-([A-Z]+)\.json$/.exec(f)).filter(Boolean).map((m) => m[1]).sort();
    if (!shards.length) return null;
    const no = String(Number(task.slice(4)) - 4).padStart(2, '0');
    return { task, no, shards };
  })
  .filter(Boolean)
  .sort((a, b) => Number(a.no) - Number(b.no));
const MODELS = ['codex', 'gem31pro', 'gptoss120b', 'gem37flash'];

const has = (p) => fs.existsSync(path.join(ROOT, p));
const count = (dir, pred = () => true) => {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return 0;
  return fs.readdirSync(d).filter(pred).length;
};

const out = { generatedFrom: '.pipeline/dispatch/state.mjs', batches: [], jobs: {} };

for (const b of BATCHES) {
  const dir = `.pipeline/${b.task}`;
  const proposals = [];
  const missingProposals = [];
  for (const s of b.shards) {
    for (const m of MODELS) {
      const f = `${dir}/proposals/${s}-${m}.json`;
      (has(f) ? proposals : missingProposals).push(`${s}-${m}`);
    }
  }
  out.batches.push({
    batch: b.no,
    task: b.task,
    shards: b.shards,
    inputReady: has(`${dir}/input/manifest.json`),
    proposals: `${proposals.length}/${b.shards.length * MODELS.length}`,
    // final.json 이 있으면 그 배치는 이미 확정된 것이다. 뒤늦게 빠진 제안을
    // 채워 넣을 이유가 없으므로 할 일로 보고하지 않는다.
    missingProposals: has(`${dir}/final.json`) ? [] : missingProposals,
    consensus: has(`${dir}/consensus.json`),
    disputedCount: has(`${dir}/disputed.json`)
      ? JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'disputed.json'), 'utf8')).count
      : null,
    rulings: count(`${dir}/rulings`, (f) => f.startsWith('adj-')),
    audits: count(`${dir}/audits`, (f) => f.startsWith('audit-')),
    recheck: has(`${dir}/audits/recheck.json`),
    final: has(`${dir}/final.json`),
    srcFile: has(`src/data/koreanGlossTopBatch${b.no}.js`),
  });
}

// 작업 목록 소진 현황
const jobsPath = path.join(ROOT, '.pipeline/dispatch/jobs.tsv');
if (fs.existsSync(jobsPath)) {
  const lines = fs.readFileSync(jobsPath, 'utf8').split('\n').filter(Boolean);
  const pending = lines.filter((l) => !fs.existsSync(path.join(ROOT, l.split('\t')[3] || '')));
  out.jobs = {
    total: lines.length,
    done: lines.length - pending.length,
    pending: pending.length,
    pendingTitles: pending.map((l) => l.split('\t')[1]).slice(0, 12),
  };
}

console.log(JSON.stringify(out, null, 2));
