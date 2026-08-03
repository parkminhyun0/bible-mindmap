import fs from 'node:fs';
import path from 'node:path';

const inputArg = process.argv.find((arg) => arg.startsWith('--input='));
const labelArg = process.argv.find((arg) => arg.startsWith('--label='));
const failArg = process.argv.find((arg) => arg.startsWith('--fail-on='));

if (!inputArg) {
  console.error('✗ --input=<npm-audit.json> is required');
  process.exit(2);
}

const inputPath = path.resolve(inputArg.slice('--input='.length));
const label = labelArg?.slice('--label='.length) || path.basename(inputPath);
const failOn = failArg?.slice('--fail-on='.length) || 'none';
const severityOrder = ['info', 'low', 'moderate', 'high', 'critical'];
const failIndex = failOn === 'none' ? Infinity : severityOrder.indexOf(failOn);
if (failIndex === -1) {
  console.error(`✗ unknown --fail-on severity: ${failOn}`);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (error) {
  console.error(`✗ ${label}: unable to read npm audit JSON (${error.message})`);
  process.exit(2);
}

const counts = report.metadata?.vulnerabilities || {};
const vulnerabilities = Object.entries(report.vulnerabilities || {})
  .map(([name, detail]) => ({
    name,
    severity: detail?.severity || 'unknown',
    direct: detail?.isDirect === true,
    range: detail?.range || '',
    nodes: Array.isArray(detail?.nodes) ? detail.nodes.length : 0,
    fixAvailable: detail?.fixAvailable || false,
    via: Array.isArray(detail?.via)
      ? detail.via.map((item) => typeof item === 'string' ? item : item?.title || item?.name || item?.url).filter(Boolean)
      : [],
  }))
  .sort((left, right) => {
    const severityDelta = severityOrder.indexOf(right.severity) - severityOrder.indexOf(left.severity);
    return severityDelta || left.name.localeCompare(right.name);
  });

const countSummary = severityOrder
  .map((severity) => `${severity}=${Number(counts[severity] || 0)}`)
  .join(' · ');
console.log(`npm audit · ${label} · ${countSummary} · total=${Number(counts.total || 0)}`);

for (const item of vulnerabilities) {
  const fix = item.fixAvailable === true
    ? 'fix available'
    : item.fixAvailable && typeof item.fixAvailable === 'object'
      ? `fix ${item.fixAvailable.name || item.name}@${item.fixAvailable.version || '?'}${item.fixAvailable.isSemVerMajor ? ' (major)' : ''}`
      : 'no automatic fix';
  console.log(
    `  - [${item.severity}] ${item.name}${item.direct ? ' (direct)' : ' (transitive)'} range=${item.range || '?'} nodes=${item.nodes} · ${fix}`,
  );
  for (const via of item.via.slice(0, 3)) console.log(`      via: ${via}`);
}

const blocking = vulnerabilities.filter((item) => {
  const index = severityOrder.indexOf(item.severity);
  return index >= failIndex;
});

if (blocking.length) {
  console.error(`✗ ${label}: ${blocking.length} package(s) at or above ${failOn}`);
  process.exit(1);
}
console.log(`✓ ${label}: no vulnerabilities at or above ${failOn}`);
