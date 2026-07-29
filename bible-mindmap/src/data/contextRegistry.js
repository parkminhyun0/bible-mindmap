import { ALL_BOOKS } from './bibleBooks';
import { BOOK_CONTEXTS as SPECIALIZED_BOOK_CONTEXTS, GNT_DISCOURSE_RULES } from './bookContext';
import { buildExpandedContext } from './expandedContextEngine';
import { EXPANDED_OT1 } from './expandedProfilesOT1';
import { EXPANDED_OT2 } from './expandedProfilesOT2';
import { EXPANDED_NT } from './expandedProfilesNT';

const EXPANDED_BOOK_PROFILES = { ...EXPANDED_OT1, ...EXPANDED_OT2, ...EXPANDED_NT };

const FALLBACK_OT_RULES = [];

function normalizeArcSet(context) {
  const macro = context?.macro || { sections: [], pivots: [], arcs: [] };
  const pivots = Array.isArray(macro.pivots) ? macro.pivots : [];
  const pivotIds = new Set(pivots.map((pivot) => pivot.id));
  const seenIds = new Set();
  const seenPairs = new Set();
  const arcs = [];

  for (const arc of Array.isArray(macro.arcs) ? macro.arcs : []) {
    if (!arc?.id || !arc?.from || !arc?.to) continue;
    if (arc.from === arc.to) continue;
    if (!pivotIds.has(arc.from) || !pivotIds.has(arc.to)) continue;
    if (seenIds.has(arc.id)) continue;
    const pair = `${arc.from}->${arc.to}`;
    if (seenPairs.has(pair)) continue;
    seenIds.add(arc.id);
    seenPairs.add(pair);
    arcs.push(arc);
  }

  return { ...context, macro: { ...macro, pivots, arcs } };
}

function makeFallbackContext(book, index) {
  const testament = index < 39 ? 'OT' : 'NT';
  return {
    id: book.id,
    book: {
      ko: book.ko,
      bollsNum: index + 1,
      lexId: book.id,
      lexCorpus: testament === 'OT' ? 'hot' : 'gnt',
      en: book.en,
      testament,
    },
    chapters: book.chapters,
    discourseRules: testament === 'NT' ? GNT_DISCOURSE_RULES : FALLBACK_OT_RULES,
    manualDiscourse: {},
    theoTerms: {},
    meta: {
      genre: testament === 'NT' ? '신약 성경' : '구약 성경',
      genreNote: '공통 안전 컨텍스트',
      author: '', audience: '', theme: '', themeNote: '', chapterAgenda: {},
    },
    macro: { sections: [], pivots: [], arcs: [] },
    disputedRanges: [],
    contextTier: 'fallback',
    contextStatus: { source: 'fallback', isSpecialized: false, hasManualPivots: false, hasMacro: false },
  };
}

export const BOOK_CONTEXTS = Object.fromEntries(
  ALL_BOOKS.map((book, index) => {
    const specialized = SPECIALIZED_BOOK_CONTEXTS[book.id];
    if (specialized) return [book.id, normalizeArcSet(specialized)];

    const profile = EXPANDED_BOOK_PROFILES[book.id];
    const baseRules = index < 39 ? FALLBACK_OT_RULES : GNT_DISCOURSE_RULES;
    const expanded = profile ? buildExpandedContext(book, index, profile, baseRules) : null;
    return [book.id, normalizeArcSet(expanded || makeFallbackContext(book, index))];
  }),
);

export const SUPPORTED_BOOK_IDS = ALL_BOOKS.map((book) => book.id);
export const SPECIALIZED_BOOK_IDS = Object.keys(SPECIALIZED_BOOK_CONTEXTS);
export const STRUCTURED_BOOK_IDS = SUPPORTED_BOOK_IDS.filter((id) => !SPECIALIZED_BOOK_CONTEXTS[id]);

export function validateContextRegistry() {
  const issues = [];
  const ids = Object.keys(BOOK_CONTEXTS);
  if (ids.length !== ALL_BOOKS.length) issues.push(`book-count:${ids.length}/${ALL_BOOKS.length}`);

  for (const book of ALL_BOOKS) {
    const context = BOOK_CONTEXTS[book.id];
    if (!context) { issues.push(`${book.id}:missing-context`); continue; }
    if (context.chapters !== book.chapters) issues.push(`${book.id}:chapter-count`);

    const pivots = context.macro?.pivots || [];
    const arcs = context.macro?.arcs || [];
    const pivotIds = new Set(pivots.map((pivot) => pivot.id));
    const arcIds = new Set();
    const pairs = new Set();

    for (const arc of arcs) {
      if (arcIds.has(arc.id)) issues.push(`${book.id}:duplicate-arc-id:${arc.id}`);
      arcIds.add(arc.id);
      const pair = `${arc.from}->${arc.to}`;
      if (pairs.has(pair)) issues.push(`${book.id}:duplicate-arc-pair:${pair}`);
      pairs.add(pair);
      if (!pivotIds.has(arc.from) || !pivotIds.has(arc.to)) issues.push(`${book.id}:broken-arc:${arc.id}`);
      if (arc.from === arc.to) issues.push(`${book.id}:self-arc:${arc.id}`);
    }

    if (context.contextTier === 'structured' && pivots.length >= 2 && arcs.length === 0) {
      issues.push(`${book.id}:structured-without-arcs`);
    }
  }

  return { bookCount: ids.length, issues };
}
