import { ALL_BOOKS } from '../src/data/bibleBooks.js';
import { EXPANDED_OT1 } from '../src/data/expandedProfilesOT1.js';
import { EXPANDED_OT2 } from '../src/data/expandedProfilesOT2.js';
import { EXPANDED_NT } from '../src/data/expandedProfilesNT.js';

const specialized = new Set(['Gen','Exod','Lev','Rom','Ruth','Matt','Mark','Luke','John','Acts','Gal','Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb']);
const expanded = { ...EXPANDED_OT1, ...EXPANDED_OT2, ...EXPANDED_NT };
const expected = ALL_BOOKS.filter((b) => !specialized.has(b.id));
const missing = expected.filter((b) => !expanded[b.id]);
const unexpected = Object.keys(expanded).filter((id) => specialized.has(id) || !ALL_BOOKS.some((b) => b.id === id));
const invalid = expected.filter((b) => {
  const p = expanded[b.id];
  if (!p) return true;
  if (!p.genre || !p.author || !p.audience || !p.theme) return true;
  if (!Array.isArray(p.sections) || !p.sections.length || !Array.isArray(p.pivots) || !p.pivots.length) return true;
  const covered = new Set();
  for (const [from,to] of p.sections) for (let ch=from; ch<=to; ch++) covered.add(ch);
  return covered.size !== b.chapters || [...covered].some((ch) => ch < 1 || ch > b.chapters);
});

if (missing.length || unexpected.length || invalid.length || Object.keys(expanded).length !== 45) {
  console.error('Context verification failed', {
    expandedCount: Object.keys(expanded).length,
    missing: missing.map((b) => b.id),
    unexpected,
    invalid: invalid.map((b) => b.id),
  });
  process.exit(1);
}

console.log(`✓ context coverage verified: ${specialized.size} specialized + ${expected.length} structured = ${ALL_BOOKS.length} books`);
