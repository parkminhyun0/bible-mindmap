import { BOOK_CONTEXTS, SUPPORTED_BOOK_IDS, STRUCTURED_BOOK_IDS, validateContextRegistry } from '../src/data/contextRegistry.js';
import { getArcExplanation } from '../src/utils/arcExplanation.js';

const issues = [];
const registry = validateContextRegistry();
issues.push(...registry.issues);

if (SUPPORTED_BOOK_IDS.length !== 66) issues.push(`supported-count:${SUPPORTED_BOOK_IDS.length}`);
if (STRUCTURED_BOOK_IDS.length !== 45) issues.push(`structured-count:${STRUCTURED_BOOK_IDS.length}`);

let arcCount = 0;
let structuredArcBooks = 0;

for (const [bookId, context] of Object.entries(BOOK_CONTEXTS)) {
  const macro = context?.macro || { pivots: [], arcs: [] };
  const arcs = macro.arcs || [];
  const pivots = macro.pivots || [];

  if (context.contextTier === 'structured') {
    if (pivots.length < 2) issues.push(`${bookId}:structured-pivots<2`);
    if (arcs.length < 1) issues.push(`${bookId}:structured-arcs<1`);
    if (arcs.length) structuredArcBooks += 1;
  }

  for (const arc of arcs) {
    arcCount += 1;
    const explanation = getArcExplanation({
      arc,
      macro,
      book: {
        ko: context.book?.ko,
        theme: context.meta?.theme,
        themeNote: context.meta?.themeNote,
      },
    });
    for (const field of ['type','method','criterion','evidence','meaning','caution']) {
      if (!explanation?.[field]) issues.push(`${bookId}:${arc.id}:missing-${field}`);
    }
    if (!explanation?.from || !explanation?.to) issues.push(`${bookId}:${arc.id}:missing-endpoint`);
  }
}

if (structuredArcBooks !== 45) issues.push(`structured-arc-books:${structuredArcBooks}/45`);

if (issues.length) {
  console.error('✗ Context Bible Arc verification failed');
  console.error(issues.join('\n'));
  process.exit(1);
}

console.log(`✓ Context Bible registry: ${registry.bookCount} books`);
console.log(`✓ structured books with Arc: ${structuredArcBooks}/45`);
console.log(`✓ valid Arc relationships: ${arcCount}`);
console.log('✓ no duplicate/broken/self Arc and all explanation fields resolve');
