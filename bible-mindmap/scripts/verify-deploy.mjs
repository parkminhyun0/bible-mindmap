// GitHub Pages 배포 실체 검증기.
// version.json의 커밋뿐 아니라 루트·앱 HTML과 실제 JS/CSS 자산까지 내려받아 확인한다.
import { execSync } from 'node:child_process';

const BASE_URL = new URL(process.env.LIVE_BASE_URL || 'https://parkminhyun0.github.io/bible-mindmap/');
const APP_URL = new URL('app/', BASE_URL);
const VERSION_URL = new URL('version.json', APP_URL);
const TIMEOUT_MS = Number(process.env.DEPLOY_VERIFY_TIMEOUT_MS || 15_000);

function expectedHead() {
  if (process.env.DEPLOY_SHA?.trim()) return process.env.DEPLOY_SHA.trim();
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null;
  }
}

async function request(url, { expectType, label, json = false } = {}) {
  const response = await fetch(`${url}${url.search ? '&' : '?'}_=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${label || url}: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (expectType && !contentType.toLowerCase().includes(expectType)) {
    throw new Error(`${label || url}: content-type ${contentType || '(missing)'} does not include ${expectType}`);
  }
  if (json) return { value: await response.json(), contentType, response };
  const text = await response.text();
  if (!text.trim()) throw new Error(`${label || url}: empty response body`);
  return { value: text, contentType, response };
}

function findModuleScript(html) {
  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\btype=["']module["']/i.test(tag)) continue;
    const src = /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1];
    if (src) return src;
  }
  return null;
}

function findModulePreloads(html) {
  const hrefs = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\brel=["']modulepreload["']/i.test(tag)) continue;
    const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
    if (href) hrefs.push(href);
  }
  return hrefs;
}

function findStylesheet(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\brel=["'][^"']*stylesheet[^"']*["']/i.test(tag)) continue;
    const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
    if (href) return href;
  }
  return null;
}

function commitsMatch(expected, live) {
  if (!expected || !live) return false;
  const left = String(expected).trim().toLowerCase();
  const right = String(live).trim().toLowerCase();
  return left === right || left.startsWith(right) || right.startsWith(left.slice(0, Math.min(12, left.length)));
}

async function main() {
  const expected = expectedHead();
  const checks = [];

  try {
    const root = await request(BASE_URL, { expectType: 'text/html', label: 'landing HTML' });
    if (!/<html\b/i.test(root.value) || !/성경\s*마인드맵/i.test(root.value)) {
      throw new Error('landing HTML: expected document/title marker missing');
    }
    checks.push(`landing HTML ${root.value.length} bytes`);

    const app = await request(APP_URL, { expectType: 'text/html', label: 'app HTML' });
    if (!/<div\b[^>]*\bid=["']root["']/i.test(app.value)) throw new Error('app HTML: #root mount node missing');
    const moduleSrc = findModuleScript(app.value);
    const stylesheetHref = findStylesheet(app.value);
    if (!moduleSrc) throw new Error('app HTML: module script asset missing');
    if (!stylesheetHref) throw new Error('app HTML: stylesheet asset missing');
    checks.push(`app HTML ${app.value.length} bytes`);

    const moduleUrl = new URL(moduleSrc, APP_URL);
    const moduleAsset = await request(moduleUrl, { label: 'module asset' });
    if (!/(javascript|ecmascript|text\/plain|application\/octet-stream)/i.test(moduleAsset.contentType)) {
      throw new Error(`module asset: unexpected content-type ${moduleAsset.contentType || '(missing)'}`);
    }
    if (moduleAsset.value.length < 1_000) throw new Error(`module asset: suspiciously small (${moduleAsset.value.length} bytes)`);
    checks.push(`module ${moduleAsset.value.length} bytes`);

    const preloadHrefs = findModulePreloads(app.value);
    const preloadAssets = await Promise.all(preloadHrefs.map((href, index) =>
      request(new URL(href, APP_URL), { label: `modulepreload[${index}] ${href}` })
    ));
    const bundleCorpus = [moduleAsset.value, ...preloadAssets.map((asset) => asset.value)].join('\n');
    // Runtime provenance contract follows the currently shipped English-source
    // Lexicon Viewer.  Korean approved-dictionary runtime is paused, so the old
    // OSHL/Korean-drawer marker set is not a valid deployment requirement here.
    // Keep this gate fail-closed by requiring the actual bottom provenance UI,
    // lexical-work identity, runtime-provider disclosure, morphology/concordance
    // attribution, and the explicit reuse-rights warning to all ship together.
    const provenanceMarkers = [
      '출처 · 저작권 · 재사용 근거',
      'Brown–Driver–Briggs Hebrew and English Lexicon (1906)',
      'Bolls.life BDBT',
      'STEPBible.data',
      'FREE ACCESS ≠ REUSE PERMISSION',
    ];
    const missingProvenance = provenanceMarkers.filter((marker) => !bundleCorpus.includes(marker));
    if (missingProvenance.length > 0) {
      throw new Error(`shipped bundle missing current Lexicon Viewer provenance markers (searched ${preloadAssets.length + 1} chunks): ${missingProvenance.join(' | ')}`);
    }
    checks.push(`bundle (${preloadAssets.length + 1} chunks) contains current Lexicon Viewer provenance markers`);

    const stylesheetUrl = new URL(stylesheetHref, APP_URL);
    const stylesheet = await request(stylesheetUrl, { label: 'stylesheet asset' });
    if (!/(text\/css|text\/plain|application\/octet-stream)/i.test(stylesheet.contentType)) {
      throw new Error(`stylesheet asset: unexpected content-type ${stylesheet.contentType || '(missing)'}`);
    }
    if (stylesheet.value.length < 500) throw new Error(`stylesheet asset: suspiciously small (${stylesheet.value.length} bytes)`);
    checks.push(`stylesheet ${stylesheet.value.length} bytes`);

    const version = await request(VERSION_URL, { expectType: 'application/json', label: 'version.json', json: true });
    const live = version.value;
    if (!live || typeof live !== 'object') throw new Error('version.json: object required');
    if (!live.commit) throw new Error('version.json: commit missing');
    if (!live.buildTime || Number.isNaN(Date.parse(live.buildTime))) throw new Error('version.json: valid buildTime missing');

    console.log('검증 기준 :', expected || '(git/DEPLOY_SHA 없음)');
    console.log('라이브 SHA:', live.commit, '| 빌드시각', live.buildTime);
    console.log('캐시 세대 :', live.htmlCache || '(미기록)', '/', live.chunkCache || '(미기록)');
    checks.forEach((check) => console.log('  ✓', check));

    if (expected && !commitsMatch(expected, live.commit)) {
      throw new Error(`live commit ${live.commit} does not match expected ${expected}`);
    }
    console.log('\n✓ 라이브 커밋·HTML·JS·CSS 자산 검증 통과.');
  } catch (error) {
    console.error(`✗ 라이브 배포 검증 실패: ${error.message}`);
    console.error('  배포 직후라면 CDN 전파 후 재시도하고, 지속되면 Pages build/artifact 경로를 확인하세요.');
    process.exit(1);
  }
}

main();
