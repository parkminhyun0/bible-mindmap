// Context Bible v2 — one normalized contract for all 66 books.
// Legacy fields remain available through contextRegistry; this module adds
// chapter-level structure so agenda / structure map / macro Arc share one source.

const nodeId = (ch, verse, kind = 'section') => `${kind}-${ch}-${verse}`;

function sectionForChapter(context, ch) {
  return (context?.macro?.sections || []).find((s) => ch >= s.fromCh && ch <= s.toCh) || null;
}

function pivotsForChapter(context, ch) {
  return (context?.macro?.pivots || []).filter((p) => p.ch === ch);
}

function buildLegacyChapter(context, ch) {
  const section = sectionForChapter(context, ch);
  const pivots = pivotsForChapter(context, ch);
  const legacyAgenda = context?.meta?.chapterAgenda?.[ch] || '';
  const agenda = legacyAgenda || section?.label || `${context?.book?.ko || ''} ${ch}장`;

  const structureNodes = pivots.map((p) => ({
    id: nodeId(p.ch, p.verse, 'pivot'),
    ch: p.ch,
    verse: p.verse,
    label: p.label,
    kind: 'pivot',
    source: 'macro-pivot',
  }));

  // If a chapter has no direct pivot, keep a section anchor so UI can still
  // explain where the chapter sits in the book. It is deliberately marked
  // coarse and must not be presented as a verse-level exegetical claim.
  if (!structureNodes.length && section) {
    structureNodes.push({
      id: nodeId(ch, 1, 'section'),
      ch,
      verse: 1,
      label: section.label,
      kind: 'section-anchor',
      source: 'macro-section',
    });
  }

  return {
    chapter: ch,
    agenda,
    agendaSource: legacyAgenda ? 'legacy-agenda' : section ? 'macro-section' : 'fallback',
    sections: section ? [{ ...section }] : [],
    structureNodes,
    relations: [],
    keyVerses: pivots.map((p) => ({ ch: p.ch, verse: p.verse, label: p.label })),
    quality: pivots.length ? 'structured' : section ? 'coarse' : 'fallback',
  };
}

export function adaptContextToV2(context) {
  const chapters = {};
  for (let ch = 1; ch <= (context?.chapters || 0); ch += 1) {
    chapters[ch] = buildLegacyChapter(context, ch);
  }

  return {
    schemaVersion: 2,
    id: context.id,
    book: context.book,
    meta: context.meta,
    chapters,
    macro: context.macro || { sections: [], pivots: [], arcs: [] },
    discourse: {
      rules: context.discourseRules || [],
      manual: context.manualDiscourse || {},
    },
    theologicalTerms: context.theoTerms || {},
    textualVariants: context.disputedRanges || [],
    contextTier: context.contextTier || 'legacy',
    contextStatus: context.contextStatus || {},
  };
}

export function applyChapterDetails(v2, details = {}) {
  if (!details || typeof details !== 'object') return v2;
  const chapters = { ...v2.chapters };
  for (const [key, detail] of Object.entries(details)) {
    const ch = Number(key);
    if (!chapters[ch] || !detail) continue;
    chapters[ch] = {
      ...chapters[ch],
      ...detail,
      chapter: ch,
      agendaSource: 'curated',
      quality: 'curated',
    };
  }
  return { ...v2, chapters };
}

export function auditContextV2(v2) {
  const errors = [];
  const warnings = [];
  const total = Object.keys(v2?.chapters || {}).length;

  if (!v2?.id) errors.push('missing-id');
  if (!v2?.book?.ko) errors.push('missing-book-meta');
  if (!v2?.macro) errors.push('missing-macro');

  for (let ch = 1; ch <= total; ch += 1) {
    const chapter = v2.chapters[ch];
    if (!chapter) { errors.push(`ch${ch}:missing`); continue; }
    if (!chapter.agenda?.trim()) errors.push(`ch${ch}:missing-agenda`);
    if (!chapter.structureNodes?.length) warnings.push(`ch${ch}:no-structure-node`);
    if (chapter.quality === 'coarse') warnings.push(`ch${ch}:coarse-only`);
    if (chapter.quality === 'fallback') warnings.push(`ch${ch}:fallback-only`);
  }

  return { bookId: v2?.id, chapterCount: total, errors, warnings };
}
