#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const targetPath = path.join(root, 'dist/index.html');
const partialPath = path.join(root, 'landing/partials/data-sources.html');
const marker = 'id="data-sources"';

const sourceStyles = `
<style data-landing-source-styles>
.source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.source-card,.source-notice{border:1px solid rgba(255,255,255,.08);background:linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.025));border-radius:22px;backdrop-filter:blur(16px)}.source-card{padding:27px}.source-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:rgba(37,99,235,.14);border:1px solid rgba(147,197,253,.18);font-family:'Gentium Plus','Noto Serif KR',serif;font-size:1.08rem;font-weight:700;color:#bfdbfe}.source-card h3{margin:18px 0 13px;font-size:1.03rem}.source-card ul{padding-left:18px;margin:0;display:grid;gap:13px}.source-card li{color:#9dacbf;font-size:.86rem;line-height:1.68}.source-card strong,.source-card b{color:#e5edf8}.source-card a,.source-notice a{color:#a7f3d0;text-underline-offset:3px}.source-notice{margin-top:18px;padding:24px 27px}.source-notice>strong{display:block;color:#fde68a;margin-bottom:7px}.source-notice p{margin:0;color:#9dacbf;font-size:.84rem;line-height:1.72}@media(max-width:760px){.source-grid{grid-template-columns:1fr}.source-card{padding:23px}.source-notice{padding:22px}}
</style>`;

async function injectDataSources() {
  const [html, partial] = await Promise.all([
    fs.readFile(targetPath, 'utf8'),
    fs.readFile(partialPath, 'utf8'),
  ]);

  if (html.includes(marker)) {
    console.log('✓ landing data source section already present');
    return;
  }

  const insertionPoint = '<section class="cta">';
  if (!html.includes(insertionPoint)) {
    throw new Error(`landing insertion point not found: ${insertionPoint}`);
  }

  let next = html.replace('</head>', `${sourceStyles}\n</head>`);
  next = next.replace(insertionPoint, `${partial}\n${insertionPoint}`);
  next = next.replace(
    '<a class="pill nav-extra" href="#features">기능</a>',
    '<a class="pill nav-extra" href="#features">기능</a><a class="pill nav-extra" href="#data-sources">데이터 출처</a>',
  );
  next = next.replace(
    '<a href="./guide.html">사용 가이드</a>',
    '<a href="#data-sources">데이터 출처</a> · <a href="./guide.html">사용 가이드</a>',
  );

  await fs.writeFile(targetPath, next, 'utf8');
  console.log('✓ landing data source attribution injected into dist/index.html');
}

async function main() {
  await injectDataSources();
  const visitor = spawnSync(process.execPath, ['scripts/inject-landing-visitor-status.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (visitor.stdout) process.stdout.write(visitor.stdout);
  if (visitor.status !== 0) {
    throw new Error(visitor.stderr || 'landing visitor status injection failed');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
