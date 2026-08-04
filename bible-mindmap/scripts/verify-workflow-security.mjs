import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');
const errors = [];
const warnings = [];

const requiredFiles = [
  'validate-pr.yml',
  'deploy.yml',
  'nvidia-embedding-poc.yml',
  'nvidia-embedding-dimension-bakeoff.yml',
  'nvidia-reranker-poc.yml',
];

const workflowEntries = fs.existsSync(WORKFLOW_DIR)
  ? fs.readdirSync(WORKFLOW_DIR).filter((name) => /\.ya?ml$/i.test(name)).sort()
  : [];
if (!workflowEntries.length) errors.push('workflow directory is missing or empty');
for (const name of requiredFiles) {
  if (!workflowEntries.includes(name)) errors.push(`required workflow missing: ${name}`);
}

const rules = [
  { pattern: /actions\/checkout@(?!v6\b)[^\s]+/g, message: 'checkout must use Node 24 generation v6' },
  { pattern: /actions\/setup-node@(?!v6\b)[^\s]+/g, message: 'setup-node must use Node 24 generation v6' },
  { pattern: /actions\/upload-artifact@(?!v7\b)[^\s]+/g, message: 'upload-artifact must use v7' },
  { pattern: /actions\/download-artifact@(?!v8\b)[^\s]+/g, message: 'download-artifact must use v8' },
  { pattern: /actions\/github-script@(?!v9\b)[^\s]+/g, message: 'github-script must use Node 24 generation v9' },
  { pattern: /pull_request_target\s*:/g, message: 'pull_request_target is forbidden for untrusted PR code' },
  { pattern: /Align missing Tiptap runtime packages/g, message: 'temporary dependency repair workaround is forbidden' },
  { pattern: /npm install --no-save --package-lock=false/g, message: 'workflow must not repair the lockfile at runtime' },
];

for (const name of workflowEntries) {
  const filePath = path.join(WORKFLOW_DIR, name);
  const source = fs.readFileSync(filePath, 'utf8');
  for (const rule of rules) {
    const matches = [...source.matchAll(rule.pattern)];
    for (const match of matches) errors.push(`${name}: ${rule.message} (${match[0]})`);
  }
  if (!/^permissions:\s*$/m.test(source)) warnings.push(`${name}: explicit top-level permissions block not found`);
}

const validate = fs.readFileSync(path.join(WORKFLOW_DIR, 'validate-pr.yml'), 'utf8');
if (!validate.includes('npm audit --omit=dev --json')) errors.push('validate-pr.yml must audit production dependencies');
if (!validate.includes('--fail-on=high')) errors.push('validate-pr.yml must block production high/critical vulnerabilities');
if (!validate.includes('reports/security/npm-audit-full.json')) errors.push('validate-pr.yml must retain full dependency evidence');

const deploy = fs.readFileSync(path.join(WORKFLOW_DIR, 'deploy.yml'), 'utf8');
if (!deploy.includes('npm audit --omit=dev --json')) errors.push('deploy.yml must block production dependency vulnerabilities');
if (!deploy.includes('npm run verify:dependency-integrity')) errors.push('deploy.yml must verify dependency integrity');
if (!deploy.includes('npm run test:smoke')) errors.push('deploy.yml must run the unified browser smoke suite');
if (!deploy.includes('npm run verify:deploy')) errors.push('deploy.yml must verify the live deployment');

for (const name of ['nvidia-embedding-poc.yml', 'nvidia-embedding-dimension-bakeoff.yml', 'nvidia-reranker-poc.yml']) {
  const source = fs.readFileSync(path.join(WORKFLOW_DIR, name), 'utf8');
  if (!/^\s*workflow_dispatch:/m.test(source)) errors.push(`${name}: NVIDIA execution must remain manual`);
  if (/^\s*(push|pull_request|schedule):/m.test(source)) errors.push(`${name}: NVIDIA execution must not run automatically`);
  if (!source.includes('secrets.NVIDIA_API_KEY')) errors.push(`${name}: NVIDIA_API_KEY secret boundary missing`);
  if (!source.includes('permissions:\n  contents: read')) errors.push(`${name}: read-only contents permission required`);
}

const reranker = fs.readFileSync(path.join(WORKFLOW_DIR, 'nvidia-reranker-poc.yml'), 'utf8');
if (!reranker.includes('NVIDIA_EMBEDDING_DIMENSIONS: \'2048\'')) errors.push('reranker PoC must use the audited 2048 dimensions');
if (!reranker.includes('nvidia/llama-nemotron-rerank-1b-v2')) errors.push('reranker PoC approved model is missing');
if (!reranker.includes('--require-pass')) errors.push('reranker PoC must enforce its quality gate after report generation');
if (!reranker.includes('if: always()')) errors.push('reranker PoC must preserve its report even when the quality gate fails');

if (warnings.length) {
  console.warn(`⚠ workflow security warnings (${warnings.length})`);
  warnings.forEach((message) => console.warn(`  - ${message}`));
}
if (errors.length) {
  console.error(`✗ workflow security verification failed (${errors.length})`);
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}
console.log(`✓ workflow security verified · workflows ${workflowEntries.length} · Node 24 actions · manual NVIDIA · production audit · live verification`);
