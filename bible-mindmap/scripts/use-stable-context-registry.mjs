import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/components/ContextBibleModal.jsx');
let source = fs.readFileSync(target, 'utf8');

const legacy = "import { BOOK_CONTEXTS, SUPPORTED_BOOK_IDS } from '../data/bookContext';";
const stable = "import { BOOK_CONTEXTS, SUPPORTED_BOOK_IDS } from '../data/contextRegistry';";

if (source.includes(legacy)) {
  source = source.replace(legacy, stable);
  fs.writeFileSync(target, source);
  console.log('✓ ContextBibleModal now uses the stable 66-book context registry');
} else if (source.includes(stable)) {
  console.log('✓ stable 66-book context registry already in use');
} else {
  throw new Error('[context-registry] BOOK_CONTEXTS import anchor not found');
}
