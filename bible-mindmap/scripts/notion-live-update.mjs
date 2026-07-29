#!/usr/bin/env node
// CI 자동 배포 로그 갱신 스크립트
// GitHub Actions의 verify:deploy 성공 후 실행되어, Notion 대시보드의
// "🤖 CI 자동 배포 로그" 콜아웃을 배포 SHA·시각·run URL로 갱신한다.
//
// 사람이 큐레이팅하는 "🔴 LIVE 현황" 콜아웃은 건드리지 않는다(자동/수동 분리).
//
// 환경변수:
//   NOTION_API_TOKEN      (필수) Notion integration/bot 토큰. 없으면 조용히 skip(빌드 실패 안 함).
//   NOTION_CI_LOG_BLOCK   (선택) 갱신 대상 콜아웃 block id. 기본값 아래.
//   DEPLOY_SHA            (선택) 배포 커밋 sha. 기본 git HEAD 또는 GITHUB_SHA.
//   DEPLOY_RUN_URL        (선택) Actions run URL.
//   DEPLOY_TIME           (선택) ISO 시각. 기본 현재 시각.

const TOKEN = process.env.NOTION_API_TOKEN || '';
const BLOCK_ID = process.env.NOTION_CI_LOG_BLOCK || '3ac0b963-e600-81da-85b4-ea15fee06408';
const NOTION_VERSION = process.env.NOTION_API_VERSION || '2022-06-28';

if (!TOKEN) {
  console.log('ℹ️ NOTION_API_TOKEN 미설정 — Notion 자동 로그 갱신 skip (빌드는 계속 진행).');
  process.exit(0);
}

const sha = (process.env.DEPLOY_SHA || process.env.GITHUB_SHA || '').slice(0, 7) || 'unknown';
const runUrl = process.env.DEPLOY_RUN_URL || '';
const when = process.env.DEPLOY_TIME || new Date().toISOString();

const richText = [
  { type: 'text', text: { content: 'CI 자동 배포 로그 (GitHub Actions가 매 배포 성공 시 자동 갱신)\n' }, annotations: { bold: true } },
  { type: 'text', text: { content: `라이브 커밋: ${sha} · verify:deploy ✓ · 배포 시각: ${when}\n` } },
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
  // 노션 갱신 실패가 배포 자체를 실패시키지 않도록 경고만 남기고 성공 종료.
  console.warn(`⚠️ Notion 자동 로그 갱신 실패 (${res.status}): ${body.slice(0, 300)}`);
  process.exit(0);
}

console.log(`✓ Notion CI 자동 배포 로그 갱신: ${sha} @ ${when}`);
