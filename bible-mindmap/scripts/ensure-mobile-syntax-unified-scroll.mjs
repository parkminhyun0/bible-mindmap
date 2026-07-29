import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../src/components/SyntaxPanel.jsx');
let source = fs.readFileSync(target, 'utf8');

const parentOld = `        <div style={{
          flex: isMobile ? 1 : undefined,
          minHeight: isMobile ? 0 : undefined,
          height: isMobile ? undefined : size.h,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: isMobile ? 0 : '0 0 12px 12px',
        }}>`;

const parentNew = `        <div
          className={isMobile ? 'momentum-scroll' : undefined}
          style={{
          flex: isMobile ? 1 : undefined,
          minHeight: isMobile ? 0 : undefined,
          height: isMobile ? undefined : size.h,
          display: 'flex', flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: isMobile ? 'auto' : 'hidden',
          WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
          overscrollBehaviorY: isMobile ? 'contain' : undefined,
          touchAction: isMobile ? 'pan-y' : undefined,
          borderRadius: isMobile ? 0 : '0 0 12px 12px',
        }}>`;

const treeOld = `            <div className={isMobile ? 'momentum-scroll' : undefined}
              style={{ flex: 1, minHeight: 0, overflowY: 'auto',
                padding: viewMode === 'tree' ? (isMobile ? '10px 12px calc(env(safe-area-inset-bottom, 0px) + 24px)' : '14px 14px 24px') : '0',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: isMobile ? 'pan-y' : undefined,
                paddingBottom: isMobile && viewMode !== 'tree' ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)' : undefined,`;

const treeNew = `            <div className={!isMobile ? 'momentum-scroll' : undefined}
              style={{
                flex: isMobile ? '0 0 auto' : 1,
                minHeight: 0,
                overflowY: isMobile ? 'visible' : 'auto',
                padding: viewMode === 'tree' ? (isMobile ? '10px 12px calc(env(safe-area-inset-bottom, 0px) + 24px)' : '14px 14px 24px') : '0',
                WebkitOverflowScrolling: isMobile ? undefined : 'touch',
                overscrollBehavior: isMobile ? undefined : 'contain',
                paddingBottom: isMobile && viewMode !== 'tree' ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)' : undefined,`;

let changed = false;

if (!source.includes(parentNew) && source.includes(parentOld)) {
  source = source.replace(parentOld, parentNew);
  changed = true;
}

if (!source.includes(treeNew) && source.includes(treeOld)) {
  source = source.replace(treeOld, treeNew);
  changed = true;
}

if (changed) {
  fs.writeFileSync(target, source);
  console.log('✓ SyntaxPanel mobile unified scroll applied');
} else {
  console.log('✓ SyntaxPanel mobile unified scroll already present');
}
