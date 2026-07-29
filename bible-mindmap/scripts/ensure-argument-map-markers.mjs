import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modalPath = path.resolve(__dirname, '../src/components/ContextBibleModal.jsx');
const panelPath = path.resolve(__dirname, '../src/components/ArgumentMapPanel.jsx');

let modal = fs.readFileSync(modalPath, 'utf8');
let panel = fs.readFileSync(panelPath, 'utf8');
let modalChanged = false;
let panelChanged = false;

const markerImport = "import ArgumentMapMarker from './ArgumentMapMarker';";
const panelImport = "import ArgumentMapPanel from './ArgumentMapPanel';";
if (!modal.includes(markerImport)) {
  if (!modal.includes(panelImport)) throw new Error('[argument-marker] ArgumentMapPanel import anchor not found');
  modal = modal.replace(panelImport, `${panelImport}\n${markerImport}`);
  modalChanged = true;
}

const markerRender = `                              <ArgumentMapMarker\n                                bookId={BOOK.lexId}\n                                bookKo={BOOK.ko}\n                                chapter={ch}\n                                verse={verse}\n                                chapterData={chData}\n                                genre={BOOK_META?.genre || ''}\n                                agenda={BOOK_META?.chapterAgenda?.[ch] || ''}\n                                isMobile={isMobile}\n                              />\n`;

if (!modal.includes('<ArgumentMapMarker')) {
  const anchor = `                              {showOrigRef && chData.hebRefs?.[verse] && (`;
  if (!modal.includes(anchor)) throw new Error('[argument-marker] verse marker render anchor not found');
  modal = modal.replace(anchor, `${markerRender}${anchor}`);
  modalChanged = true;
}

const listener = `  useEffect(() => {\n    const openFromVerseMarker = (event) => {\n      const detail = event?.detail || {};\n      if (detail.bookId !== bookId || Number(detail.chapter) !== Number(chapter)) return;\n      const verse = Number(detail.verse);\n      const relation = map?.relations?.find((rel) => {\n        const source = map.nodes.find((node) => node.id === rel.source);\n        const target = map.nodes.find((node) => node.id === rel.target);\n        return [source, target].some((node) => node && verse >= node.from && verse <= node.to);\n      });\n      setFilter('all');\n      if (relation) setSelectedRelation(relation.id);\n      if (isMobile) setMobileOpen(true);\n    };\n    window.addEventListener('argument-map-open', openFromVerseMarker);\n    return () => window.removeEventListener('argument-map-open', openFromVerseMarker);\n  }, [bookId, chapter, isMobile, map]);\n\n`;

if (!panel.includes("window.addEventListener('argument-map-open'")) {
  const anchor = `  useEffect(() => {\n    if (!isMobile || !mobileOpen) return undefined;`;
  if (!panel.includes(anchor)) throw new Error('[argument-marker] panel listener anchor not found');
  panel = panel.replace(anchor, `${listener}${anchor}`);
  panelChanged = true;
}

if (modalChanged) fs.writeFileSync(modalPath, modal);
if (panelChanged) fs.writeFileSync(panelPath, panel);

console.log(`✓ argument map verse markers ${modalChanged || panelChanged ? 'installed' : 'already enabled'}`);
