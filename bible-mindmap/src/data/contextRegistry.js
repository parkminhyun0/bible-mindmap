import { ALL_BOOKS } from './bibleBooks.js';
import { BOOK_CONTEXTS as SPECIALIZED_BOOK_CONTEXTS, GNT_DISCOURSE_RULES } from './bookContext.js';
import { buildExpandedContext } from './expandedContextEngine.js';
import { EXPANDED_OT1 } from './expandedProfilesOT1.js';
import { EXPANDED_OT2 } from './expandedProfilesOT2.js';
import { EXPANDED_NT } from './expandedProfilesNT.js';
import { adaptContextToV2, applyChapterDetails, auditContextV2 } from './contextBibleV2.js';
import { CURATED_CHAPTER_DETAILS } from './curatedChapterDetails.js';

const EXPANDED_BOOK_PROFILES = { ...EXPANDED_OT1, ...EXPANDED_OT2, ...EXPANDED_NT };
const FALLBACK_OT_RULES = [];
const COLORS = ['#7c3aed','#dc2626','#059669','#0369a1','#d97706','#0891b2'];

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

function mergeCuratedChapterArc(context, v2, details) {
  if (!details || !Object.keys(details).length) return context;

  const originalMacro = context.macro || { sections: [], pivots: [], arcs: [] };
  const pivots = [...(originalMacro.pivots || [])];
  const arcs = [...(originalMacro.arcs || [])];
  const occupied = new Set(pivots.map((p) => `${p.ch}:${p.verse}`));
  const curated = [];

  for (let ch = 1; ch <= context.chapters; ch += 1) {
    const chapter = v2.chapters[ch];
    if (chapter?.quality !== 'curated') continue;
    const key = chapter.keyVerses?.[0];
    if (!key?.verse) continue;
    const id = `cv2-${ch}`;
    const pivot = {
      id,
      ch,
      verse: key.verse,
      color: COLORS[(ch - 1) % COLORS.length],
      label: key.label || chapter.agenda,
      source: 'context-v2-curated',
    };
    curated.push(pivot);
    if (!occupied.has(`${pivot.ch}:${pivot.verse}`)) {
      pivots.push(pivot);
      occupied.add(`${pivot.ch}:${pivot.verse}`);
    }
  }

  for (let i = 0; i < curated.length - 1; i += 1) {
    const from = curated[i];
    const to = curated[i + 1];
    arcs.push({
      id: `cv2-a${i + 1}`,
      from: from.id,
      to: to.id,
      color: to.color,
      label: `${from.label} → ${to.label}`,
      type: '장별 구조 진행',
      method: '장별 의제 → 핵심 본문 앵커 → 권 전체 문학적 진행',
      criterion: `${context.book.ko} ${from.ch}장의 핵심 의제가 ${to.ch}장의 핵심 의제로 어떻게 진행되는지 장 경계와 사건·계보·예배·왕권의 흐름을 따라 확인합니다.`,
      evidence: `${context.book.ko} ${from.ch}:${from.verse} “${from.label}”과 ${context.book.ko} ${to.ch}:${to.verse} “${to.label}”을 우선 본문 근거로 비교합니다.`,
      meaning: `${context.book.ko}의 장별 전개를 권 전체 주제 안에서 읽기 위한 정밀화된 구조 Arc입니다.`,
      caution: '이 Arc는 장별 문학 구조를 설명하는 연구 보조선입니다. 연결된 본문과 앞뒤 문맥을 직접 확인하고 단독 교리 근거로 사용하지 않습니다.',
      source: 'context-v2-curated',
    });
  }

  return normalizeArcSet({ ...context, macro: { ...originalMacro, pivots, arcs } });
}

function enhanceWithV2(context) {
  const details = CURATED_CHAPTER_DETAILS[context.id] || null;
  const v2 = applyChapterDetails(adaptContextToV2(context), details);
  const chapterAgenda = Object.fromEntries(
    Object.entries(v2.chapters).map(([ch, data]) => [Number(ch), data.agenda]),
  );

  const enriched = {
    ...context,
    meta: { ...context.meta, chapterAgenda },
    contextV2: v2,
  };
  return mergeCuratedChapterArc(enriched, v2, details);
}

const BASE_CONTEXTS = Object.fromEntries(
  ALL_BOOKS.map((book, index) => {
    const specialized = SPECIALIZED_BOOK_CONTEXTS[book.id];
    if (specialized) return [book.id, normalizeArcSet(specialized)];

    const profile = EXPANDED_BOOK_PROFILES[book.id];
    const baseRules = index < 39 ? FALLBACK_OT_RULES : GNT_DISCOURSE_RULES;
    const expanded = profile ? buildExpandedContext(book, index, profile, baseRules) : null;
    return [book.id, normalizeArcSet(expanded || makeFallbackContext(book, index))];
  }),
);

export const BOOK_CONTEXTS = Object.fromEntries(
  Object.entries(BASE_CONTEXTS).map(([id, context]) => [id, enhanceWithV2(context)]),
);

export const CONTEXT_V2 = Object.fromEntries(
  Object.entries(BOOK_CONTEXTS).map(([id, context]) => [id, context.contextV2]),
);

export const SUPPORTED_BOOK_IDS = ALL_BOOKS.map((book) => book.id);
export const SPECIALIZED_BOOK_IDS = Object.keys(SPECIALIZED_BOOK_CONTEXTS);
export const STRUCTURED_BOOK_IDS = SUPPORTED_BOOK_IDS.filter((id) => !SPECIALIZED_BOOK_CONTEXTS[id]);

export function validateContextRegistry() {
  const issues = [];
  const warnings = [];
  const ids = Object.keys(BOOK_CONTEXTS);
  if (ids.length !== ALL_BOOKS.length) issues.push(`book-count:${ids.length}/${ALL_BOOKS.length}`);

  for (const book of ALL_BOOKS) {
    const context = BOOK_CONTEXTS[book.id];
    if (!context) { issues.push(`${book.id}:missing-context`); continue; }
    if (context.chapters !== book.chapters) issues.push(`${book.id}:chapter-count`);

    const v2Audit = auditContextV2(context.contextV2);
    issues.push(...v2Audit.errors.map((x) => `${book.id}:${x}`));
    warnings.push(...v2Audit.warnings.map((x) => `${book.id}:${x}`));

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

  return { bookCount: ids.length, issues, warnings };
}
