import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/components/SyntaxPanel.jsx');
let source = fs.readFileSync(target, 'utf8');

const parentBefore = `        <div style={{\n          flex: isMobile ? 1 : undefined,\n          height: isMobile ? undefined : size.h,\n          display: 'flex', flexDirection: 'column',\n          overflow: 'hidden',\n          borderRadius: isMobile ? 0 : '0 0 12px 12px',\n        }}>`;

const parentAfter = `        <div style={{\n          flex: isMobile ? 1 : undefined,\n          minHeight: isMobile ? 0 : undefined,\n          height: isMobile ? undefined : size.h,\n          display: 'flex', flexDirection: 'column',\n          overflow: 'hidden',\n          borderRadius: isMobile ? 0 : '0 0 12px 12px',\n        }}>`;

const scrollerBefore = `            <div className={isMobile ? 'momentum-scroll' : undefined}\n              style={{ flex: 1, overflowY: 'auto',\n                padding: viewMode === 'tree' ? (isMobile ? '10px 12px calc(env(safe-area-inset-bottom, 0px) + 24px)' : '14px 14px 24px') : '0',\n                WebkitOverflowScrolling: 'touch',\n                overscrollBehavior: 'contain',`;

const scrollerAfter = `            <div className={isMobile ? 'momentum-scroll' : undefined}\n              style={{ flex: 1, minHeight: 0, overflowY: 'auto',\n                padding: viewMode === 'tree' ? (isMobile ? '10px 12px calc(env(safe-area-inset-bottom, 0px) + 24px)' : '14px 14px 24px') : '0',\n                WebkitOverflowScrolling: 'touch',\n                overscrollBehavior: 'contain',\n                touchAction: isMobile ? 'pan-y' : undefined,`;

let changed = false;

if (!source.includes(parentAfter)) {
  if (!source.includes(parentBefore)) {
    throw new Error('[syntax-scroll] parent flex anchor not found; refusing unsafe patch');
  }
  source = source.replace(parentBefore, parentAfter);
  changed = true;
}

if (!source.includes(scrollerAfter)) {
  if (!source.includes(scrollerBefore)) {
    throw new Error('[syntax-scroll] scroll container anchor not found; refusing unsafe patch');
  }
  source = source.replace(scrollerBefore, scrollerAfter);
  changed = true;
}

if (changed) {
  fs.writeFileSync(target, source);
  console.log('✓ SyntaxPanel mobile vertical scrolling ensured');
} else {
  console.log('✓ SyntaxPanel mobile vertical scrolling already present');
}
