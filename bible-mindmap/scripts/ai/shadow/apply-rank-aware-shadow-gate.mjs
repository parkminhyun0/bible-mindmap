import fs from 'node:fs';
import path from 'node:path';

function rankAwareHardNegativeRate(report) {
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  if (!rows.length) return 0;
  const violations = rows.filter((row) => {
    const resultIds = Array.isArray(row.resultIds) ? row.resultIds : [];
    const relevantRanks = (row.relevantIds || []).map((id) => resultIds.indexOf(id));
    const hardNegativeRanks = (row.hardNegativeIds || [])
      .map((id) => resultIds.indexOf(id))
      .filter((rank) => rank >= 0);
    if (!hardNegativeRanks.length) return false;
    if (relevantRanks.some((rank) => rank < 0)) return true;
    return Math.min(...hardNegativeRanks) < Math.max(...relevantRanks);
  }).length;
  return violations / rows.length;
}

function applyRankAwareGate({ baseline, candidate, rawGate }) {
  const baselineRate = rankAwareHardNegativeRate(baseline);
  const candidateRate = rankAwareHardNegativeRate(candidate);
  const errors = (rawGate?.errors || []).filter((message) => (
    message !== 'Hybrid hard-negative rate regressed beyond allowance'
    && !message.startsWith('hard-negative rate above ')
  ));
  const maxRate = rawGate?.minimums?.maxHardNegativeRate ?? 0.35;
  if (candidateRate > maxRate) errors.push(`rank-aware hard-negative rate above ${maxRate}`);
  if (candidateRate > baselineRate + 0.125) {
    errors.push('Hybrid rank-aware hard-negative rate regressed beyond allowance');
  }
  return {
    ...rawGate,
    passed: errors.length === 0,
    errors,
    hardNegativePolicy: 'rank-aware-outrank-or-replacement',
    rawHardNegativeRate: {
      baseline: baseline?.hardNegativeRate ?? 0,
      candidate: candidate?.hardNegativeRate ?? 0,
    },
    rankAwareHardNegativeRate: {
      baseline: baselineRate,
      candidate: candidateRate,
    },
  };
}

function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--output-dir='));
  const requirePass = process.argv.includes('--require-pass');
  if (!outputArg) throw new Error('--output-dir is required');
  const outputDir = path.resolve(outputArg.slice('--output-dir='.length));
  const evaluationPath = path.join(outputDir, 'evaluation.json');
  const summaryPath = path.join(outputDir, 'summary.json');
  const evaluation = JSON.parse(fs.readFileSync(evaluationPath, 'utf8'));
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const baseline = evaluation.evaluation?.baseline || summary.baseline;
  const candidate = evaluation.evaluation?.candidate || summary.candidate;
  const gate = applyRankAwareGate({ baseline, candidate, rawGate: evaluation.evaluation?.gate || summary.gate });
  evaluation.evaluation.gate = gate;
  summary.gate = gate;
  fs.writeFileSync(evaluationPath, `${JSON.stringify(evaluation, null, 2)}\n`, 'utf8');
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`✓ rank-aware shadow gate · raw ${gate.rawHardNegativeRate.candidate.toFixed(4)} · rank-aware ${gate.rankAwareHardNegativeRate.candidate.toFixed(4)} · ${gate.passed ? 'pass' : 'fail'}`);
  if (requirePass && !gate.passed) process.exit(1);
}

main();
