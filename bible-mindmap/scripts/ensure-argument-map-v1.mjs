import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/components/ContextBibleModal.jsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

const importAnchor = "import { getArcExplanation } from '../utils/arcExplanation';";
const importLine = "import ArgumentMapPanel from './ArgumentMapPanel';";
if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) throw new Error('[argument-map] import anchor not found; refusing unsafe patch');
  source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
  changed = true;
}

const renderBlock = `            {rightMode === 'verse' && (\n              <ArgumentMapPanel\n                bookId={BOOK.lexId}\n                bookKo={BOOK.ko}\n                chapter={activeRef.ch}\n                activeVerse={activeRef.verse}\n                onNavigate={scrollTo}\n                isMobile={isMobile}\n                chapterData={activeCh}\n                genre={BOOK_META.genre}\n                agenda={BOOK_META.chapterAgenda?.[activeRef.ch] || ''}\n              />\n            )}\n\n`;

if (!source.includes('<ArgumentMapPanel')) {
  const renderAnchor = "            {rightMode === 'thread' && (";
  if (!source.includes(renderAnchor)) throw new Error('[argument-map] render anchor not found; refusing unsafe patch');
  source = source.replace(renderAnchor, `${renderBlock}${renderAnchor}`);
  changed = true;
} else if (!source.includes('chapterData={activeCh}')) {
  source = source.replace(
    '                isMobile={isMobile}\n              />',
    "                isMobile={isMobile}\n                chapterData={activeCh}\n                genre={BOOK_META.genre}\n                agenda={BOOK_META.chapterAgenda?.[activeRef.ch] || ''}\n              />",
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(target, source);
  console.log('✓ all-Bible argument map engine integrated into ContextBibleModal');
} else {
  console.log('✓ all-Bible argument map engine already integrated');
}
