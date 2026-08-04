import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prioritizeAiCandidatesForHumanReview } from '../src/data/aiReviewPriority.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function argumentValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readCandidates(inputDir) {
  if (!fs.existsSync(inputDir)) return [];

  const candidates = [];
  const files = fs.readdirSync(inputDir)
    .filter((name) => name.endsWith('.json'))
    .sort();

  for (const file of files) {
    const fullPath = path.join(inputDir, file);
    const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const records = Array.isArray(parsed) ? parsed : [parsed];
    records.forEach((candidate, index) => {
      candidates.push({ ...candidate, __sourceFile: file, __sourceIndex: index });
    });
  }

  return candidates;
}

function buildQueue(candidates) {
  const sourceById = new Map(
    candidates.map((candidate) => [candidate.id, {
      file: candidate.__sourceFile,
      index: candidate.__sourceIndex,
      provider: candidate.provenance?.provider ?? null,
      model: candidate.provenance?.model ?? null,
      generatedAt: candidate.provenance?.generatedAt ?? null,
    }]),
  );

  return prioritizeAiCandidatesForHumanReview(candidates).map((item, rank) => ({
    rank: rank + 1,
    ...item,
    source: sourceById.get(item.id) ?? null,
  }));
}

function summarize(queue) {
  const byTier = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const byType = {};
  for (const item of queue) {
    byTier[item.tier] += 1;
    byType[item.type] = (byType[item.type] ?? 0) + 1;
  }
  return { total: queue.length, byTier, byType };
}

function toMarkdown(report) {
  const lines = [
    '# AI 사람 검토 우선순위 큐',
    '',
    `생성 시각: ${report.generatedAt}`,
    `후보 수: ${report.summary.total}`,
    '',
    '## 등급 요약',
    '',
    `- P0: ${report.summary.byTier.P0}`,
    `- P1: ${report.summary.byTier.P1}`,
    `- P2: ${report.summary.byTier.P2}`,
    `- P3: ${report.summary.byTier.P3}`,
    '',
  ];

  if (report.queue.length === 0) {
    lines.push('현재 검토 대기 후보가 없습니다.', '');
    return `${lines.join('\n')}\n`;
  }

  lines.push('## 검토 순서', '');
  for (const item of report.queue) {
    lines.push(
      `### ${item.rank}. ${item.id}`,
      '',
      `- 등급/점수: **${item.tier} · ${item.score}점**`,
      `- 유형/상태: ${item.type} · ${item.status}`,
      `- 신호: 영향도 ${item.signals.impact}/5 · 불확실성 ${item.signals.uncertainty}/5 · 사용 빈도 ${item.signals.frequency}/5 · 회귀 위험 ${item.signals.regressionRisk}/5`,
      `- 원본: ${item.source?.file ?? '알 수 없음'}${item.source?.index ? ` [${item.source.index}]` : ''}`,
      '- 우선 검토 이유:',
      ...item.reasons.map((reason) => `  - ${reason}`),
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

function writeReport(inputDir, outputDir) {
  const rawCandidates = readCandidates(inputDir);
  const queue = buildQueue(rawCandidates);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    inputDirectory: path.relative(projectRoot, inputDir) || '.',
    summary: summarize(queue),
    queue,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'ai-review-queue.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'ai-review-queue.md'), toMarkdown(report));
  return report;
}

function selfTest() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-ai-review-'));
  const inputDir = path.join(tempRoot, 'input');
  const outputDir = path.join(tempRoot, 'output');
  fs.mkdirSync(inputDir, { recursive: true });

  const fixtures = [
    {
      id: 'candidate:canonical-high',
      type: 'canonical-concept',
      status: 'candidate',
      payload: { conceptId: 'seed' },
      provenance: { provider: 'nvidia-build', model: 'fixture', generatedAt: '2026-08-04T00:00:00.000Z' },
      verification: { passed: false, errors: ['missing-ref'], warnings: [] },
      reviewSignals: { usageFrequency: 5, regressionRisk: 5 },
    },
    {
      id: 'candidate:alias-low',
      type: 'search-alias',
      status: 'reviewed',
      payload: { alias: '아브람' },
      provenance: { provider: 'nvidia-build', model: 'fixture', generatedAt: '2026-08-04T00:00:00.000Z' },
      verification: { passed: true, errors: [], warnings: [] },
      reviewSignals: { usageFrequency: 1, regressionRisk: 1 },
    },
  ];
  fs.writeFileSync(path.join(inputDir, 'fixtures.json'), JSON.stringify(fixtures));

  const report = writeReport(inputDir, outputDir);
  if (report.queue.length !== 2) throw new Error('self-test queue length mismatch');
  if (report.queue[0].id !== 'candidate:canonical-high') throw new Error('high-risk candidate must be first');
  if (report.queue[0].tier !== 'P0') throw new Error('high-risk candidate must be P0');
  if (!fs.existsSync(path.join(outputDir, 'ai-review-queue.json'))) throw new Error('JSON report missing');
  if (!fs.existsSync(path.join(outputDir, 'ai-review-queue.md'))) throw new Error('Markdown report missing');

  fs.rmSync(tempRoot, { recursive: true, force: true });
  console.log('✓ AI review queue generator self-test passed');
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const inputDir = path.resolve(projectRoot, argumentValue('--input', 'data/ai-candidates'));
  const outputDir = path.resolve(projectRoot, argumentValue('--output', 'artifacts/ai-review-queue'));
  const report = writeReport(inputDir, outputDir);
  console.log(`✓ AI review queue generated · total ${report.summary.total} · P0 ${report.summary.byTier.P0} · output ${path.relative(projectRoot, outputDir)}`);
}
