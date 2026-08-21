// 파이프라인 현재 상태를 사실만으로 요약한다. 감독관이 이 출력을 근거로
// 다음 작업을 정한다. 추측이 끼어들 자리를 없애려고 전부 파일 존재로 판단한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BATCHES = [
  { task: 'task7', no: '03', shards: ['F', 'G', 'H'] },
  { task: 'task8', no: '04', shards: ['I', 'J', 'K'] },
  { task: 'task9', no: '05', shards: ['L', 'M', 'N'] },
  { task: 'task10', no: '06', shards: ['O', 'P', 'Q'] },
  { task: 'task11', no: '07', shards: ['R', 'S', 'T'] },
];
const MODELS = ['codex', 'gem31pro', 'gem37flash', 'gem36flash', 'claudeopus5'];

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
