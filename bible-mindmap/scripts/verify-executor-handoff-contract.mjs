#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { clone, decideHandoff, validateHandoffState } from './lib/executor-handoff.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dir, '../..');
const contractPath = path.join(repoRoot, 'bible-mindmap/data/lexicon/v4/executor-handoff-contract.json');
const statePath = path.join(repoRoot, 'docs/lexicon-workflow/EXECUTOR_HANDOFF_STATE.json');

function fail(message) {
  console.error(`✗ executor handoff contract: ${message}`);
  process.exitCode = 1;
}

async function loadJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bible-mindmap-executor-handoff-verifier',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${url}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

function validateFreshness(state, contract) {
  if (state.status === 'COMPLETE') return [];
  const at = new Date(state.checkpointedAt);
  if (Number.isNaN(at.getTime())) return ['invalid checkpointedAt'];
  const hours = (Date.now() - at.getTime()) / 3_600_000;
  if (hours < -0.25) return [`checkpoint is ${Math.abs(hours).toFixed(1)}h in the future`];
  if (hours > contract.maxCheckpointAgeHours && state.status === 'ACTIVE') {
    return [`ACTIVE checkpoint is stale (${hours.toFixed(1)}h > ${contract.maxCheckpointAgeHours}h); mark EXECUTOR_HANDOFF_READY or refresh checkpoint`];
  }
  return [];
}

async function remoteValidate(state) {
  if (state.activePR === 0) return { skipped: true, reason: 'bootstrap-activePR=0' };
  const token = process.env.GITHUB_TOKEN || '';
  if (!token) throw new Error('GITHUB_TOKEN required for remote validation');
  const repository = process.env.GITHUB_REPOSITORY || 'parkminhyun0/bible-mindmap';
  const [owner] = repository.split('/');
  const api = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');

  const pr = await githubJson(`${api}/repos/${repository}/pulls/${state.activePR}`, token);
  if (pr.state !== 'open' || pr.merged_at) throw new Error(`active PR #${state.activePR} is not open`);
  if (pr.head.ref !== state.activeBranch) throw new Error(`activeBranch mismatch: state=${state.activeBranch}, PR=${pr.head.ref}`);

  const headQuery = encodeURIComponent(`${owner}:${state.activeBranch}`);
  const open = await githubJson(`${api}/repos/${repository}/pulls?state=open&head=${headQuery}&per_page=20`, token);
  if (open.length !== 1 || open[0].number !== state.activePR) {
    throw new Error(`expected exactly one open PR for ${state.activeBranch}; found ${open.map(p => `#${p.number}`).join(',') || 'none'}`);
  }

  let headRelation = 'equal';
  if (pr.head.sha !== state.headSHA) {
    const compare = await githubJson(`${api}/repos/${repository}/compare/${state.headSHA}...${pr.head.sha}`, token);
    headRelation = compare.status === 'ahead' ? 'descendant' : compare.status;
    if (!['descendant', 'equal', 'identical'].includes(headRelation)) {
      throw new Error(`checkpoint head is not an ancestor of current PR head: ${headRelation}`);
    }
  }

  return { skipped: false, pr: pr.number, currentHeadSHA: pr.head.sha, headRelation };
}

async function selfTest(contract, state) {
  assert.deepEqual(validateHandoffState(state, contract), []);
  const badStatus = clone(state); badStatus.status = 'MAGIC';
  assert.ok(validateHandoffState(badStatus, contract).some(e => e.includes('invalid status')));
  const badOrder = clone(state); badOrder.completedSteps = ['state-reconcile', 'handoff-contract'];
  assert.ok(validateHandoffState(badOrder, contract).some(e => e.includes('contiguous prefix')));
  const drift = decideHandoff(state, {
    retrievalOk: true,
    currentExecutor: state.currentExecutor,
    currentHeadSHA: state.headSHA,
    headRelation: 'equal',
    prOpen: true,
    openPrCountForBranch: state.activePR > 0 ? 1 : 0,
    candidateFingerprint: 'sha256:' + '0'.repeat(64),
  });
  assert.equal(drift.verdict, 'FAIL_CLOSED');
  console.log('✓ executor handoff verifier self-test PASS');
}

const contract = await loadJson(contractPath);
const state = await loadJson(statePath);

if (process.argv.includes('--self-test')) {
  await selfTest(contract, state);
  process.exit(0);
}

for (const error of validateHandoffState(state, contract)) fail(error);
for (const error of validateFreshness(state, contract)) fail(error);

if (process.env.HANDOFF_REQUIRE_REMOTE === '1' && !process.exitCode) {
  try {
    const result = await remoteValidate(state);
    if (result.skipped) console.log(`⚠ remote handoff validation skipped: ${result.reason}`);
    else console.log(`✓ remote handoff PR state: #${result.pr}, currentHead=${result.currentHeadSHA}, relation=${result.headRelation}`);
  } catch (error) {
    fail(error.message);
  }
}

if (!process.exitCode) {
  console.log(`✓ executor handoff contract valid: status=${state.status}, executor=${state.currentExecutor}, next=${state.nextStep}, activePR=${state.activePR}`);
}
