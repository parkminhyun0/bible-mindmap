#!/usr/bin/env node
// CI 자동 배포 로그 갱신 스크립트
// 기본 배포 경로에서는 Notion 실패가 Pages 성공을 뒤집지 않는다.
// 별도 reconcile workflow는 NOTION_SYNC_STRICT=1로 실행해 실패를 DLQ로 승격한다.
//
// 2026-08-09 대시보드 리뉴얼로 기존 CI 로그 콜아웃(3ac0b963-...6408)은 은퇴됐고,
// Live SHA·배포 상태는 상단 카드에서 GPT가 수동 관제한다. 신규 CI 자동 갱신 대상
// 블록이 아직 없으므로 NOTION_CI_LOG_BLOCK이 비어 있으면 즉시 PASS로 종료한다.
// 되살릴 때는 vars.NOTION_CI_LOG_BLOCK에 대상 블록 id만 설정하면 자동 재활성된다.

import { execSync } from 'node:child_process';

const TOKEN = process.env.NOTION_API_TOKEN || '';
const BLOCK_ID = process.env.NOTION_CI_LOG_BLOCK || '';
const NOTION_VERSION = process.env.NOTION_API_VERSION || '2022-06-28';
const STRICT = process.env.NOTION_SYNC_STRICT === '1';

function fail(message, code = 2) {
  console.error(message);
  if (STRICT) process.exit(code);
  console.warn('⚠️ Notion sync warning recorded; Pages deployment verdict remains independent.');
  process.exit(0);
}

if (!BLOCK_ID) {
  console.log('ℹ NOTION_CI_LOG_BLOCK 미설정 — CI Notion 로그 동기화 skip (2026-08-09 대시보드 리뉴얼로 은퇴).');
  process.exit(0);
}

if (!TOKEN) fail('⚠️ NOTION_API_TOKEN 미설정 — Notion 자동 로그 갱신 불가.');

const sha = (process.env.DEPLOY_SHA || process.env.GITHUB_SHA || '').slice(0, 7) || 'unknown';
const runUrl = process.env.DEPLOY_RUN_URL || '';
const when = process.env.DEPLOY_TIME || new Date().toISOString();

function git(cmd, fallback = '') {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
}

const headSubject = git('log -1 --pretty=%s', '(커밋 메시지 조회 실패)').slice(0, 200);
const recent = git('log -5 --pretty=format:"%h %s"')
  .split('\n')
  .filter(Boolean)
  .map((l) => `  • ${l}`.slice(0, 160))
  .join('\n');

const richText = [
  { type: 'text', text: { content: '🤖 CI 자동 배포 로그 (GitHub Actions가 매 배포 성공 시 자동 갱신 · 사람이 편집하지 말 것)\n' }, annotations: { bold: true } },
  { type: 'text', text: { content: `라이브 커밋: ${sha} · verify:deploy ✓ · 배포 시각: ${when}\n` } },
  { type: 'text', text: { content: `최신 작업: ${headSubject}\n` }, annotations: { color: 'green' } },
  { type: 'text', text: { content: `\n최근 이력(신→구):\n${recent || '  • (이력 없음)'}\n\n` } },
  { type: 'text', text: { content: runUrl ? `Actions run: ${runUrl}` : 'Actions run URL 미제공' } },
];

const res = await fetch(`https://api.notion.com/v1/blocks/${BLOCK_ID}`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ callout: { rich_text: richText } }),
});

if (!res.ok) {
  const body = await res.text();
  fail(`⚠️ Notion 자동 로그 갱신 실패 (${res.status}): ${body.slice(0, 500)}`);
}

console.log(`✓ Notion CI 자동 배포 로그 갱신: ${sha} @ ${when}`);
