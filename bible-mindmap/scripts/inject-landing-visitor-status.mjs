#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const targetPath = path.join(root, 'dist/index.html');
const partialPath = path.join(root, 'landing/partials/visitor-status.html');
const marker = 'id="landing-visitor-status"';

const styles = `
<style data-landing-visitor-status-styles>
#landing-visitor-status{position:fixed;right:18px;bottom:18px;z-index:210;width:176px;padding:11px 13px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(15,23,42,.94);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:0 10px 34px rgba(0,0,0,.38);color:#e2e8f0}#landing-visitor-status .landing-visitor-status__title{font-size:10px;font-weight:800;letter-spacing:.06em;color:#ffffff;margin-bottom:9px}#landing-visitor-status .landing-visitor-status__metrics{display:grid;grid-template-columns:1fr 1px 1fr;align-items:center;gap:8px}#landing-visitor-status .landing-visitor-status__metric{text-align:center;min-width:0}#landing-visitor-status .landing-visitor-status__metric strong{display:block;font-size:20px;line-height:1;font-weight:800;font-variant-numeric:tabular-nums;color:#6ee7b7;overflow:hidden;text-overflow:ellipsis}#landing-visitor-status .landing-visitor-status__metric:last-child strong{color:#93c5fd}#landing-visitor-status .landing-visitor-status__metric span{display:block;margin-top:5px;font-size:9px;color:#ffffff;white-space:nowrap}#landing-visitor-status .landing-visitor-status__divider{width:1px;height:30px;background:rgba(255,255,255,.13)}#landing-visitor-status .landing-visitor-status__error{margin-top:7px;font-size:9px;line-height:1.35;color:#fca5a5;text-align:center}@media(max-width:560px){#landing-visitor-status{right:10px;bottom:calc(10px + env(safe-area-inset-bottom));width:146px;padding:9px 10px;border-radius:11px}#landing-visitor-status .landing-visitor-status__title{font-size:9.5px;margin-bottom:7px}#landing-visitor-status .landing-visitor-status__metrics{gap:6px}#landing-visitor-status .landing-visitor-status__metric strong{font-size:17px}#landing-visitor-status .landing-visitor-status__metric span{font-size:8.5px}#landing-visitor-status .landing-visitor-status__divider{height:26px}}@media(prefers-reduced-motion:reduce){#landing-visitor-status{scroll-behavior:auto}}
</style>`;

async function main() {
  const [html, partial] = await Promise.all([
    fs.readFile(targetPath, 'utf8'),
    fs.readFile(partialPath, 'utf8'),
  ]);

  if (html.includes(marker)) {
    console.log('✓ landing visitor status already present');
    return;
  }

  if (!html.includes('</head>') || !html.includes('</body>')) {
    throw new Error('landing document is missing </head> or </body>');
  }

  let next = html.replace('</head>', `${styles}\n</head>`);
  next = next.replace('</body>', `${partial}\n</body>`);
  await fs.writeFile(targetPath, next, 'utf8');
  console.log('✓ landing visitor status injected into dist/index.html');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
