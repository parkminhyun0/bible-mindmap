import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decideTrigger, buildTriggerIssue } from './lib/executor-trigger.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'data/lexicon/v4/executor-trigger-contract.json'), 'utf8'));
const state = JSON.parse(fs.readFileSync(path.join(root, '../docs/lexicon-workflow/EXECUTOR_HANDOFF_STATE.json'), 'utf8'));

const explicitSignal = process.env.EXECUTOR_TRIGGER_SIGNAL || '';
let signal = explicitSignal;
if (!signal && state.status === 'EXECUTOR_HANDOFF_READY') signal = state.handoffReason;
if (!signal && state.status === 'ACTIVE' && state.currentExecutor === 'JARVIS') {
  const checkpointMs = Date.parse(state.checkpointedAt);
  const ageMinutes = Number.isFinite(checkpointMs) ? (Date.now() - checkpointMs) / 60000 : Infinity;
  if (ageMinutes >= contract.pollIntervalMinutes) signal = 'stale-checkpoint-watch';
}

if (!signal) {
  console.log('EXECUTOR_TRIGGER NOOP: no actionable signal');
  process.exit(0);
}

const decision = decideTrigger({ handoffState: state, contract, signal });
console.log(JSON.stringify(decision, null, 2));
if (decision.verdict === 'NOOP' || decision.verdict === 'PRIMARY_CONTINUES') process.exit(0);
if (decision.verdict !== 'EMIT_HANDOFF_READY') {
  console.error(`EXECUTOR_TRIGGER ${decision.verdict}: ${decision.reason}`);
  process.exit(1);
}

if (process.env.EXECUTOR_TRIGGER_DRY_RUN === '1') {
  console.log('EXECUTOR_TRIGGER DRY_RUN PASS');
  process.exit(0);
}

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
if (!token || !repo) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required for issue emission');
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
const q = encodeURIComponent(`repo:${repo} is:issue is:open in:title \"${contract.triggerIssuePrefix}\"`);
const searchRes = await fetch(`https://api.github.com/search/issues?q=${q}`, { headers });
if (!searchRes.ok) throw new Error(`issue search failed: ${searchRes.status}`);
const found = await searchRes.json();
const duplicate = (found.items || []).find((item) => String(item.body || '').includes(decision.dedupeKey));
if (duplicate) {
  console.log(`EXECUTOR_TRIGGER DEDUPED: ${duplicate.html_url}`);
  process.exit(0);
}
const issue = buildTriggerIssue({ decision, contract });
const createRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
  method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: issue.title, body: issue.body })
});
if (!createRes.ok) throw new Error(`issue create failed: ${createRes.status} ${await createRes.text()}`);
const created = await createRes.json();
console.log(`EXECUTOR_TRIGGER EMITTED: ${created.html_url}`);
