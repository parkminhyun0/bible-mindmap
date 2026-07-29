import { BOOK_CONTEXTS, validateContextRegistry } from '../src/data/contextRegistry.js';

const { bookCount, issues, warnings } = validateContextRegistry();
const curated = [];
const coarse = [];
const fallback = [];

for (const [bookId, context] of Object.entries(BOOK_CONTEXTS)) {
  const chapters = Object.values(context.contextV2?.chapters || {});
  const counts = chapters.reduce((acc, ch) => {
    acc[ch.quality] = (acc[ch.quality] || 0) + 1;
    return acc;
  }, {});
  if (counts.curated) curated.push(`${bookId}:${counts.curated}`);
  if (counts.coarse) coarse.push(`${bookId}:${counts.coarse}`);
  if (counts.fallback) fallback.push(`${bookId}:${counts.fallback}`);
}

console.log(`Context Bible v2 audit: ${bookCount}/66 books`);
console.log(`Curated chapter coverage: ${curated.length ? curated.join(', ') : 'none'}`);
console.log(`Books with coarse chapters: ${coarse.length}`);
console.log(`Books with fallback chapters: ${fallback.length}`);

if (warnings.length) {
  console.warn(`Context v2 quality warnings: ${warnings.length}`);
  console.warn(warnings.slice(0, 80).join('\n'));
  if (warnings.length > 80) console.warn(`... ${warnings.length - 80} more warnings`);
}

if (issues.length) {
  console.error(`Context v2 structural errors: ${issues.length}`);
  console.error(issues.join('\n'));
  process.exit(1);
}

console.log('Context Bible v2 structural audit passed.');
