import { ALL_BOOKS } from '../src/data/bibleBooks.js';
import { EXPANDED_OT1 } from '../src/data/expandedProfilesOT1.js';
import { EXPANDED_OT2 } from '../src/data/expandedProfilesOT2.js';
import { EXPANDED_NT } from '../src/data/expandedProfilesNT.js';
import { buildExpandedContext } from '../src/data/expandedContextEngine.js';

const specialized = new Set(['Gen','Exod','Lev','Rom','Ruth','Matt','Mark','Luke','John','Acts','Gal','Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb']);
const expanded = { ...EXPANDED_OT1, ...EXPANDED_OT2, ...EXPANDED_NT };
const expected = ALL_BOOKS.filter((b) => !specialized.has(b.id));
const missing = expected.filter((b) => !expanded[b.id]);
const unexpected = Object.keys(expanded).filter((id) => specialized.has(id) || !ALL_BOOKS.some((b) => b.id === id));
const invalidProfiles = [];
const invalidContexts = [];

for (const book of expected) {
  const profile = expanded[book.id];
  if (!profile) continue;

  const profileProblems = [];
  if (!profile.genre || !profile.author || !profile.audience || !profile.theme) profileProblems.push('required profile metadata');
  if (!Array.isArray(profile.sections) || !profile.sections.length) profileProblems.push('sections');
  if (!Array.isArray(profile.pivots) || !profile.pivots.length) profileProblems.push('pivots');

  const covered = new Set();
  for (const [from,to,label] of profile.sections || []) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from > to || !label) profileProblems.push(`invalid section ${from}-${to}`);
    for (let ch=from; ch<=to; ch++) covered.add(ch);
  }
  if (covered.size !== book.chapters || [...covered].some((ch) => ch < 1 || ch > book.chapters)) profileProblems.push('chapter coverage');
  for (const [ch,verse,label] of profile.pivots || []) {
    if (!Number.isInteger(ch) || !Number.isInteger(verse) || ch < 1 || ch > book.chapters || verse < 1 || !label) profileProblems.push(`invalid pivot ${ch}:${verse}`);
  }
  if (profileProblems.length) invalidProfiles.push({ id:book.id, problems:[...new Set(profileProblems)] });

  const index = ALL_BOOKS.findIndex((b) => b.id === book.id);
  const context = buildExpandedContext(book,index,profile,[]);
  const contextProblems = [];
  if (!context || context.id !== book.id || context.chapters !== book.chapters) contextProblems.push('identity');
  if (!context?.book?.ko || !context?.book?.en || !context?.book?.testament || !context?.book?.lexCorpus) contextProblems.push('book contract');
  if (!Array.isArray(context?.discourseRules) || !context.discourseRules.length) contextProblems.push('discourseRules');
  if (!context?.manualDiscourse || !context?.theoTerms) contextProblems.push('analysis data');
  if (!context?.meta?.genre || !context?.meta?.author || !context?.meta?.audience || !context?.meta?.theme) contextProblems.push('meta contract');
  if (Object.keys(context?.meta?.chapterAgenda || {}).length !== book.chapters) contextProblems.push('chapterAgenda');
  if (!Array.isArray(context?.macro?.sections) || !context.macro.sections.length) contextProblems.push('macro sections');
  if (!Array.isArray(context?.macro?.pivots) || !context.macro.pivots.length) contextProblems.push('macro pivots');
  if (!Array.isArray(context?.macro?.arcs)) contextProblems.push('macro arcs');
  if (!Array.isArray(context?.disputedRanges)) contextProblems.push('disputedRanges contract');
  if (context?.contextTier !== 'structured' || context?.contextStatus?.isSpecialized !== false) contextProblems.push('status contract');
  if (contextProblems.length) invalidContexts.push({ id:book.id, problems:[...new Set(contextProblems)] });
}

if (missing.length || unexpected.length || invalidProfiles.length || invalidContexts.length || Object.keys(expanded).length !== 45) {
  console.error('Context verification failed', {
    expandedCount: Object.keys(expanded).length,
    missing: missing.map((b) => b.id),
    unexpected,
    invalidProfiles,
    invalidContexts,
  });
  process.exit(1);
}

console.log(`✓ context coverage verified: ${specialized.size} specialized + ${expected.length} structured = ${ALL_BOOKS.length} books`);
console.log('✓ all 45 expanded books satisfy the Romans-parity context contract');
