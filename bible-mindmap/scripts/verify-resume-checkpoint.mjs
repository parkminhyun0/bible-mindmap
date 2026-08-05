#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_MAX_BYTES = 600;
const DEFAULT_MAX_AGE_HOURS = 12;
const REQUIRED_FIELDS = ['v', 'updated', 'repo', 'task', 'check', 'next', 'block', 'deep'];
const ACTIVE_TEXT_FIELDS = ['task', 'check', 'next', 'block'];

function fail(message) {
  console.error(`✗ RESUME checkpoint: ${message}`);
  process.exitCode = 1;
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function extractPrNumbers(value) {
  const matches = String(value || '').matchAll(/\bPR\s*#?\s*(\d+)\b/gi);
  return [...new Set([...matches].map((match) => Number(match[1])))]
    .filter((number) => Number.isInteger(number) && number > 0);
}

function parsePrFixture() {
  const raw = process.env.CHECKPOINT_PR_STATES || '';
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`CHECKPOINT_PR_STATES JSON 오류: ${error.message}`);
  }
}

async function fetchPullRequest({ apiBase, repository, number, token, fixture }) {
  if (fixture) {
    const pullRequest = fixture[String(number)];
    if (!pullRequest) throw new Error(`PR #${number} fixture가 없습니다.`);
    return pullRequest;
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'bible-mindmap-resume-verifier',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBase}/repos/${repository}/pulls/${number}`, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PR #${number} 조회 실패 (${response.status}): ${body.slice(0, 160)}`);
  }

  return response.json();
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultResumePath = path.resolve(scriptDir, '../../memory/RESUME.json');
  const resumePath = path.resolve(process.env.RESUME_FILE || defaultResumePath);
  const maxBytes = parsePositiveNumber(process.env.RESUME_MAX_BYTES, DEFAULT_MAX_BYTES);
  const maxAgeHours = parsePositiveNumber(process.env.RESUME_MAX_AGE_HOURS, DEFAULT_MAX_AGE_HOURS);
  const requireRemote = process.env.CHECKPOINT_REQUIRE_REMOTE === '1';
  const now = process.env.CHECKPOINT_NOW ? new Date(process.env.CHECKPOINT_NOW) : new Date();

  let raw;
  try {
    raw = await readFile(resumePath, 'utf8');
  } catch (error) {
    fail(`파일을 읽을 수 없습니다: ${resumePath} (${error.message})`);
    return;
  }

  const byteLength = Buffer.byteLength(raw, 'utf8');
  if (byteLength > maxBytes) {
    fail(`파일 크기 ${byteLength}B가 제한 ${maxBytes}B를 초과했습니다.`);
  }

  let checkpoint;
  try {
    checkpoint = JSON.parse(raw);
  } catch (error) {
    fail(`유효한 JSON이 아닙니다: ${error.message}`);
    return;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in checkpoint)) fail(`필수 필드 '${field}'가 없습니다.`);
  }

  if (checkpoint.v !== 1) fail(`지원하지 않는 버전입니다: ${checkpoint.v}`);
  for (const field of ACTIVE_TEXT_FIELDS) {
    if (typeof checkpoint[field] !== 'string' || checkpoint[field].trim() === '') {
      fail(`'${field}'는 비어 있지 않은 문자열이어야 합니다.`);
    }
  }
  if (!Array.isArray(checkpoint.deep) || checkpoint.deep.length === 0) {
    fail(`'deep'은 하나 이상의 경로를 가진 배열이어야 합니다.`);
  }

  const updatedAt = new Date(checkpoint.updated);
  if (Number.isNaN(updatedAt.getTime())) {
    fail(`'updated'가 유효한 ISO 날짜가 아닙니다: ${checkpoint.updated}`);
  } else if (Number.isNaN(now.getTime())) {
    fail(`검증 기준 시각이 유효하지 않습니다: ${process.env.CHECKPOINT_NOW}`);
  } else {
    const ageMs = now.getTime() - updatedAt.getTime();
    const ageHours = ageMs / 3_600_000;
    if (ageMs < -10 * 60_000) {
      fail(`'updated'가 현재보다 ${Math.abs(ageHours).toFixed(1)}시간 미래입니다.`);
    } else if (ageHours > maxAgeHours) {
      fail(`체크포인트가 ${ageHours.toFixed(1)}시간 경과해 ${maxAgeHours}시간 기준을 넘었습니다.`);
    }
  }

  const expectedRepo = process.env.GITHUB_REPOSITORY || 'parkminhyun0/bible-mindmap';
  if (checkpoint.repo !== expectedRepo) {
    fail(`repo 불일치: checkpoint='${checkpoint.repo}', expected='${expectedRepo}'`);
  }

  const references = [];
  for (const field of ACTIVE_TEXT_FIELDS) {
    for (const number of extractPrNumbers(checkpoint[field])) references.push({ field, number });
  }

  let fixture = null;
  try {
    fixture = parsePrFixture();
  } catch (error) {
    fail(error.message);
  }

  const uniqueNumbers = [...new Set(references.map(({ number }) => number))];
  const token = process.env.GITHUB_TOKEN || '';
  if (uniqueNumbers.length > 0 && !token && !fixture && !requireRemote) {
    console.warn(`⚠ PR 원격 상태 검증을 건너뜁니다: GITHUB_TOKEN 없음 (${uniqueNumbers.map((number) => `#${number}`).join(', ')})`);
  }

  if (uniqueNumbers.length > 0 && (token || fixture || requireRemote)) {
    const apiBase = (process.env.CHECKPOINT_GITHUB_API_BASE || 'https://api.github.com').replace(/\/$/, '');

    for (const number of uniqueNumbers) {
      try {
        const pullRequest = await fetchPullRequest({
          apiBase,
          repository: checkpoint.repo,
          number,
          token,
          fixture,
        });
        const fields = references.filter((item) => item.number === number).map((item) => item.field).join(', ');
        if (pullRequest.state !== 'open' || pullRequest.merged_at) {
          fail(`종료된 PR #${number}를 활성 필드(${fields})가 참조합니다: state=${pullRequest.state}, merged=${Boolean(pullRequest.merged_at)}`);
        }
      } catch (error) {
        fail(error.message);
      }
    }
  }

  if (!process.exitCode) {
    console.log(`✓ RESUME checkpoint 유효: ${byteLength}B, updated=${checkpoint.updated}, task=${checkpoint.task}`);
  }
}

await main();
