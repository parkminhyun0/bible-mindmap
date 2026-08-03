import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CANONICAL_CONCEPTS } from '../src/data/canonicalConcepts.js';
import { CANONICAL_USAGE_MAP } from '../src/data/canonicalUsageMap.js';
import { CONTEXT_CHAPTER_CARDS } from '../src/data/contextChapterCards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..');
const REGISTER_PATH = path.join(ROOT, 'docs', 'system-audit-residual-risks.json');
const HUMAN_DOC_PATH = path.join(ROOT, 'docs', 'system-audit-residual-risks.md');
const NVIDIA_EVIDENCE_PATH = path.join(ROOT, 'docs', 'evidence', 'nvidia-embedding-dimension-bakeoff-30842224158.json');
const NVIDIA_DECISION_PATH = path.join(ROOT, 'docs', 'nvidia-embedding-dimension-decision.md');
const errors = [];
const fail = (message) => errors.push(message);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

function readText(relativePath) {
  const absolutePath = path.resolve(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`required evidence file missing: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

if (!fs.existsSync(REGISTER_PATH)) {
  console.error('✗ A6 residual risk register is missing');
  process.exit(1);
}

let register;
try {
  register = JSON.parse(fs.readFileSync(REGISTER_PATH, 'utf8'));
} catch (error) {
  console.error(`✗ A6 residual risk register JSON parse failed: ${error.message}`);
  process.exit(1);
}

if (register.schemaVersion !== 1) fail('schemaVersion must be 1');
if (register.stage !== 'A6') fail('stage must be A6');
if (!/^\d{4}-\d{2}-\d{2}$/.test(register.auditedAt || '')) fail('auditedAt must use YYYY-MM-DD');
if (!/^[0-9a-f]{40}$/.test(register.baseline?.mainCommit || '')) fail('baseline.mainCommit must be a full commit SHA');
for (const key of ['openIssues', 'openPullRequests', 'openP0', 'openP1']) {
  if (!Number.isInteger(register.baseline?.[key]) || register.baseline[key] < 0) fail(`baseline.${key} must be a non-negative integer`);
}
if (register.baseline?.openP0 !== 0) fail(`open P0 must be 0, found ${register.baseline?.openP0}`);
if (register.baseline?.openP1 !== 0) fail(`open P1 must be 0, found ${register.baseline?.openP1}`);

const allowedSeverities = new Set(['P0', 'P1', 'P2', 'P3']);
const allowedStatuses = new Set([
  'resolved-validation',
  'planned-expansion',
  'monitored',
  'accepted-exception',
  'tooling-debt',
  'performance-debt',
]);
const requiredIds = new Set(['A6-R001', 'A6-R002', 'A6-R003', 'A6-R004', 'A6-R005', 'A6-R006', 'A6-R007']);
const seenIds = new Set();

if (!Array.isArray(register.risks)) fail('risks must be an array');
for (const risk of register.risks || []) {
  if (!nonEmpty(risk?.id)) {
    fail('risk id is required');
    continue;
  }
  if (seenIds.has(risk.id)) fail(`duplicate risk id: ${risk.id}`);
  seenIds.add(risk.id);
  if (!allowedSeverities.has(risk.severity)) fail(`${risk.id}: invalid severity ${risk.severity}`);
  if (!allowedStatuses.has(risk.status)) fail(`${risk.id}: invalid status ${risk.status}`);
  if ((risk.severity === 'P0' || risk.severity === 'P1') && risk.status !== 'resolved-validation') {
    fail(`${risk.id}: active ${risk.severity} risk is forbidden at audit closure`);
  }
  if (!nonEmpty(risk.category)) fail(`${risk.id}: category is required`);
  if (!nonEmpty(risk.title)) fail(`${risk.id}: title is required`);
  if (!nonEmpty(risk.rationale)) fail(`${risk.id}: rationale is required`);
  if (!Array.isArray(risk.evidence) || risk.evidence.length < 1 || risk.evidence.some((item) => !nonEmpty(item))) {
    fail(`${risk.id}: at least one evidence reference is required`);
  }
  if (!nonEmpty(risk.guard)) fail(`${risk.id}: guard is required`);
}
for (const id of requiredIds) if (!seenIds.has(id)) fail(`required residual risk missing: ${id}`);
for (const id of seenIds) if (!requiredIds.has(id)) fail(`unreviewed residual risk id: ${id}`);

const nvidiaRisk = (register.risks || []).find((risk) => risk.id === 'A6-R001');
if (nvidiaRisk?.status !== 'resolved-validation') fail('A6-R001 must be resolved-validation after the real endpoint bake-off');
if (nvidiaRisk?.resolution?.runId !== 30842224158) fail('A6-R001 run ID must remain 30842224158');
if (nvidiaRisk?.resolution?.selectedDimensions !== 2048) fail('A6-R001 must retain 2048 dimensions');
if (nvidiaRisk?.resolution?.qualityMaintainedAt384 !== false) fail('A6-R001 must record that 384 quality was not maintained');
if (nvidiaRisk?.resolution?.productionIndexChanged !== false) fail('A6-R001 must not change the production index');
if (nvidiaRisk?.resolution?.existingDbModified !== false) fail('A6-R001 must not modify the existing DB');

const conceptCount = Object.keys(CANONICAL_CONCEPTS).length;
const usageCount = Object.keys(CANONICAL_USAGE_MAP || {}).length;
const pendingUsageCount = Object.keys(CANONICAL_CONCEPTS)
  .filter((key) => !Object.hasOwn(CANONICAL_USAGE_MAP || {}, key)).length;
const chapterCardCount = Object.keys(CONTEXT_CHAPTER_CARDS).length;
const observations = register.observations || {};
const observedCounts = {
  canonicalConceptCount: conceptCount,
  canonicalUsageMapCount: usageCount,
  canonicalUsagePendingCount: pendingUsageCount,
  chapterCardCount,
};
for (const [key, actual] of Object.entries(observedCounts)) {
  if (observations[key] !== actual) fail(`${key} changed: register ${observations[key]} / actual ${actual}`);
}

const markerRun = spawnSync(process.execPath, ['scripts/verify-chapter-card-markers.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});
if (markerRun.status !== 0) {
  fail(`chapter marker verifier failed while collecting A6 evidence: ${(markerRun.stderr || markerRun.stdout || '').trim()}`);
} else {
  const match = markerRun.stdout.match(/대조 (\d+)개 · 미존재 (\d+) \(([\d.]+)%\)/);
  if (!match) {
    fail('could not parse chapter marker verifier summary');
  } else {
    const checked = Number(match[1]);
    const missing = Number(match[2]);
    const missingRatePercent = Number(match[3]);
    if (observations.chapterCardMarkerChecked !== checked) {
      fail(`chapterCardMarkerChecked changed: register ${observations.chapterCardMarkerChecked} / actual ${checked}`);
    }
    if (observations.chapterCardMarkerMissing !== missing) {
      fail(`chapterCardMarkerMissing changed: register ${observations.chapterCardMarkerMissing} / actual ${missing}`);
    }
    if (observations.chapterCardMarkerMissingRatePercent !== missingRatePercent) {
      fail(`chapterCardMarkerMissingRatePercent changed: register ${observations.chapterCardMarkerMissingRatePercent} / actual ${missingRatePercent}`);
    }
    const maxRate = register.thresholds?.chapterCardMarkerMaxMissingRatePercent;
    if (!Number.isFinite(maxRate) || maxRate < 0) fail('chapterCardMarkerMaxMissingRatePercent must be a non-negative number');
    else if (missingRatePercent > maxRate) fail(`chapter marker missing rate ${missingRatePercent}% exceeds A6 limit ${maxRate}%`);
  }
}

const markerVerifier = readText('scripts/verify-chapter-card-markers.mjs');
if (!markerVerifier.includes("['Acts:28', 'Acts ends openly")) fail('Acts:28 terminal exception or its rationale is missing');
if (!markerVerifier.includes('if (rate > 0.25)')) fail('chapter marker anti-fabrication hard threshold is missing');

const curatedVerifier = readText('scripts/verify-curated-chapters.mjs');
if (!curatedVerifier.includes("['Rom:16', { maxVerse: 27")) fail('Rom:16 versification override is missing or changed');
if (!curatedVerifier.includes('TAGNT/KRV versification difference for the final doxology')) {
  fail('Rom:16 versification rationale is missing');
}

const workflowPath = path.join(REPO_ROOT, '.github', 'workflows', 'nvidia-embedding-dimension-bakeoff.yml');
if (!fs.existsSync(workflowPath)) {
  fail('NVIDIA dimension bake-off workflow is missing');
} else {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  if (!/^\s*workflow_dispatch:/m.test(workflow)) fail('NVIDIA dimension bake-off must remain manual');
  if (/^\s*(push|pull_request|schedule):/m.test(workflow)) fail('NVIDIA dimension bake-off must not run automatically');
  if (!workflow.includes('secrets.NVIDIA_API_KEY')) fail('NVIDIA dimension bake-off secret boundary is missing');
  if (!workflow.includes('permissions:\n  contents: read')) fail('NVIDIA dimension bake-off must remain read-only');
}

const comparisonSource = readText('scripts/ai/poc/compare-nvidia-embedding-dimensions.mjs');
if (!comparisonSource.includes('requiresHumanApproval: true')) fail('NVIDIA recommendation must require human approval');
if (!comparisonSource.includes('changesProductionIndex: false')) fail('NVIDIA comparison must not change the production index');

if (!fs.existsSync(NVIDIA_EVIDENCE_PATH)) {
  fail('NVIDIA dimension bake-off evidence is missing');
} else {
  try {
    const evidence = JSON.parse(fs.readFileSync(NVIDIA_EVIDENCE_PATH, 'utf8'));
    if (evidence.run?.id !== 30842224158) fail('NVIDIA evidence run ID changed');
    if (evidence.run?.headSha !== '0c550ae60d0e4351601f011fccf354384c682faa') fail('NVIDIA evidence head SHA changed');
    if (evidence.corpus?.documents !== 12 || evidence.corpus?.cases !== 16 || evidence.corpus?.hardNegatives !== 16) {
      fail('NVIDIA evidence evaluation coverage changed');
    }
    if (evidence.results?.['2048']?.recallAt3 !== 1) fail('NVIDIA 2048 Recall@3 evidence changed');
    if (evidence.results?.['384']?.recallAt3 !== 0.96875) fail('NVIDIA 384 Recall@3 evidence changed');
    if (evidence.results?.['2048']?.hardNegativeRate !== 0.1875) fail('NVIDIA 2048 hard-negative evidence changed');
    if (evidence.results?.['384']?.hardNegativeRate !== 0.375) fail('NVIDIA 384 hard-negative evidence changed');
    if (evidence.comparison?.qualityMaintainedAt384 !== false) fail('NVIDIA evidence must reject 384 quality maintenance');
    if (evidence.decision?.selectedDimensions !== 2048) fail('NVIDIA evidence must select 2048');
    if (evidence.decision?.productionIndexChanged !== false) fail('NVIDIA evidence must not change production index');
    if (evidence.decision?.existingDbModified !== false) fail('NVIDIA evidence must not modify existing DB');
  } catch (error) {
    fail(`NVIDIA dimension evidence parse failed: ${error.message}`);
  }
}

if (!fs.existsSync(NVIDIA_DECISION_PATH)) fail('NVIDIA dimension decision document is missing');
else {
  const decisionDoc = fs.readFileSync(NVIDIA_DECISION_PATH, 'utf8');
  if (!decisionDoc.includes('2048차원 유지')) fail('NVIDIA decision document must retain 2048 dimensions');
  if (!decisionDoc.includes('운영 검색 인덱스와 기존 성경 DB는 자동 변경하지 않는다')) {
    fail('NVIDIA decision document must preserve the production boundary');
  }
}

if (!fs.existsSync(HUMAN_DOC_PATH)) {
  fail('human-readable residual risk document is missing');
} else {
  const humanDoc = fs.readFileSync(HUMAN_DOC_PATH, 'utf8');
  for (const id of requiredIds) if (!humanDoc.includes(id)) fail(`human-readable document missing ${id}`);
  if (!humanDoc.includes('미해결 **P0: 0건**')) fail('human-readable P0 closure statement is missing');
  if (!humanDoc.includes('미해결 **P1: 0건**')) fail('human-readable P1 closure statement is missing');
  if (!humanDoc.includes('활성 잔여 항목은 P2 2건, P3 4건')) fail('human-readable active risk counts are stale');
}

if (errors.length) {
  console.error(`✗ A6 residual risk verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

const activeRisks = (register.risks || []).filter((risk) => risk.status !== 'resolved-validation');
const p2 = activeRisks.filter((risk) => risk.severity === 'P2').length;
const p3 = activeRisks.filter((risk) => risk.severity === 'P3').length;
console.log(
  `✓ A6 residual risks verified · open P0 0 · open P1 0 · active P2 ${p2} · active P3 ${p3} · `
  + `NVIDIA 2048 selected · canonical usage ${usageCount}/${conceptCount} · chapter markers ${observations.chapterCardMarkerMissing}/${observations.chapterCardMarkerChecked}`,
);
