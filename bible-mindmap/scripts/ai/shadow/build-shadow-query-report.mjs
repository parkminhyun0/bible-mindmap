import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function round(value, digits = 4) {
  return Number(Number(value || 0).toFixed(digits));
}

function indexRows(report, label) {
  const rows = report?.rows;
  if (!Array.isArray(rows)) throw new TypeError(`${label}.rows must be an array`);
  return new Map(rows.map((row) => [row.caseId, row]));
}

function classify(delta) {
  if (delta.recall > 0.0001 || delta.mrr > 0.0001 || delta.ndcg > 0.0001 || delta.hardNegativeRate < -0.0001) return 'improved';
  if (delta.recall < -0.0001 || delta.mrr < -0.0001 || delta.ndcg < -0.0001 || delta.hardNegativeRate > 0.0001) return 'regressed';
  return 'unchanged';
}

export function buildShadowQueryComparison(evaluationArtifact) {
  if (!evaluationArtifact || typeof evaluationArtifact !== 'object') throw new TypeError('evaluation artifact is required');
  if (evaluationArtifact.productionIndexModified !== false || evaluationArtifact.liveSearchConnected !== false) {
    throw new Error('shadow report refuses production-connected artifacts');
  }
  const evaluation = evaluationArtifact.evaluation;
  const baseline = evaluation?.baseline;
  const candidate = evaluation?.candidate;
  const baselineRows = indexRows(baseline, 'baseline');
  const candidateRows = indexRows(candidate, 'candidate');
  if (baselineRows.size !== candidateRows.size) throw new Error('baseline and candidate case counts differ');

  const rows = [...baselineRows.values()].map((before) => {
    const after = candidateRows.get(before.caseId);
    if (!after) throw new Error(`candidate row missing: ${before.caseId}`);
    const delta = Object.freeze({
      recall: round(after.recall - before.recall),
      mrr: round(after.reciprocalRank - before.reciprocalRank),
      ndcg: round(after.ndcg - before.ndcg),
      hardNegativeRate: round(after.hardNegativeRate - before.hardNegativeRate),
      latencyMs: round(after.latencyMs - before.latencyMs, 2),
    });
    return Object.freeze({
      caseId: before.caseId,
      query: before.query,
      queryType: before.metadata?.queryType || 'unknown',
      outcome: classify(delta),
      baseline: Object.freeze({
        resultIds: before.resultIds,
        recall: round(before.recall),
        mrr: round(before.reciprocalRank),
        ndcg: round(before.ndcg),
        hardNegativeRate: round(before.hardNegativeRate),
        latencyMs: round(before.latencyMs, 2),
      }),
      candidate: Object.freeze({
        resultIds: after.resultIds,
        recall: round(after.recall),
        mrr: round(after.reciprocalRank),
        ndcg: round(after.ndcg),
        hardNegativeRate: round(after.hardNegativeRate),
        latencyMs: round(after.latencyMs, 2),
      }),
      delta,
      requiresHumanReview: classify(delta) === 'regressed' || Boolean(after.error),
      reviewReason: after.error
        ? `candidate error: ${after.error}`
        : classify(delta) === 'regressed'
          ? 'candidate ranking regressed against keyword baseline'
          : classify(delta) === 'improved'
            ? 'candidate improved semantic ranking'
            : 'no measurable ranking change',
    });
  });

  const counts = rows.reduce((acc, row) => {
    acc[row.outcome] += 1;
    if (row.requiresHumanReview) acc.requiresHumanReview += 1;
    return acc;
  }, { improved: 0, unchanged: 0, regressed: 0, requiresHumanReview: 0 });

  return Object.freeze({
    schemaVersion: 1,
    stage: evaluationArtifact.stage,
    generatedAt: evaluationArtifact.generatedAt,
    shadowOnly: true,
    productionIndexModified: false,
    liveSearchConnected: false,
    queryCount: rows.length,
    summary: Object.freeze(counts),
    rows: Object.freeze(rows),
  });
}

export function renderShadowQueryComparisonMarkdown(report) {
  const lines = [
    '# NVIDIA Shadow Search · 질의별 비교 보고서',
    '',
    `- 생성 시각: ${report.generatedAt}`,
    `- 비교 질의: ${report.queryCount}`,
    `- 개선: ${report.summary.improved}`,
    `- 동일: ${report.summary.unchanged}`,
    `- 회귀: ${report.summary.regressed}`,
    `- 사람 검토 필요: ${report.summary.requiresHumanReview}`,
    '- 공개 검색 결과 변경: 없음',
    '',
    '| 질의 | 유형 | 판정 | Recall Δ | MRR Δ | nDCG Δ | Hard negative Δ | 검토 |',
    '|---|---|---:|---:|---:|---:|---:|---|',
  ];
  for (const row of report.rows) {
    lines.push(`| ${row.query.replaceAll('|', '\\|')} | ${row.queryType} | ${row.outcome} | ${row.delta.recall} | ${row.delta.mrr} | ${row.delta.ndcg} | ${row.delta.hardNegativeRate} | ${row.requiresHumanReview ? row.reviewReason : '-'} |`);
  }
  lines.push('', '## 운영 경계', '', '- NVIDIA 결과는 Shadow 비교에만 사용합니다.', '- 기존 keyword 검색이 사용자에게 계속 제공됩니다.', '- production 인덱스·DB·canonical 데이터는 변경하지 않습니다.', '- 회귀 질의는 사람 검토 큐로 전달합니다.', '');
  return lines.join('\n');
}

export function writeShadowQueryComparison({ inputPath, outputDir }) {
  const artifact = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const report = buildShadowQueryComparison(artifact);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'query-comparison.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'query-comparison.md'), `${renderShadowQueryComparisonMarkdown(report)}\n`, 'utf8');
  return report;
}

function main() {
  const inputArg = process.argv.find((arg) => arg.startsWith('--input='));
  const outputArg = process.argv.find((arg) => arg.startsWith('--output-dir='));
  if (!inputArg || !outputArg) throw new Error('--input and --output-dir are required');
  const report = writeShadowQueryComparison({
    inputPath: path.resolve(inputArg.slice('--input='.length)),
    outputDir: path.resolve(outputArg.slice('--output-dir='.length)),
  });
  console.log(`✓ Shadow query comparison · ${report.queryCount} queries · improved ${report.summary.improved} · regressed ${report.summary.regressed}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    console.error(`✗ Shadow query comparison failed: ${error.message}`);
    process.exit(1);
  }
}
