import { ALL_BOOKS, getBook, KO_ABBR } from '../data/bibleBooks';
import { CITATIONS } from '../data/citations';

// ── CrossRef lazy-loader ──────────────────────────────────────────────────────
const _crossrefCache = new Map(); // bookId → entry[]

async function loadCrossref(bookId) {
  if (_crossrefCache.has(bookId)) return _crossrefCache.get(bookId);
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}crossref/${bookId}.json`);
    if (!res.ok) { _crossrefCache.set(bookId, []); return []; }
    const data = await res.json();
    _crossrefCache.set(bookId, data);
    return data;
  } catch {
    _crossrefCache.set(bookId, []);
    return [];
  }
}

/**
 * refObj 절 범위에 해당하는 crossref 항목을 votes 내림차순으로 반환
 * topN: 최대 반환 수 (기본 8)
 */
export async function findCrossrefsFor(refObj, topN = 8) {
  if (!refObj) return [];
  const entries = await loadCrossref(refObj.book);
  return entries
    .filter(
      (e) =>
        e.from.ch === refObj.chapter &&
        e.from.vs <= refObj.verseEnd &&
        e.from.ve >= refObj.verseStart,
    )
    .slice(0, topN); // 이미 votes 내림차순 정렬되어 있음
}

// ── 기존 수동 인용(CITATIONS) 함수들 ─────────────────────────────────────────

// "마가복음 1:2", "마가복음 1:2-3", "마가복음 1:2-3 [개역한글]" 형태를 파싱
// 실패 시 null 반환
export function parseReference(refString) {
  if (!refString || typeof refString !== 'string') return null;

  // 번역명 태그 제거: [개역한글], (ESV) 등
  const clean = refString.replace(/[[({][^\])}]*[\])}]/g, '').trim();

  // 형식: "<책명> <장>:<절시>" 또는 "<책명> <장>:<절시>-<절끝>"
  const m = clean.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) return null;

  const bookName = m[1].trim();
  const chapter = parseInt(m[2], 10);
  const verseStart = parseInt(m[3], 10);
  const verseEnd = m[4] ? parseInt(m[4], 10) : verseStart;

  const abbrId = KO_ABBR[bookName];
  const book = ALL_BOOKS.find(
    (b) => b.ko === bookName || b.en === bookName || b.id === bookName || b.id === abbrId,
  );
  if (!book) return null;

  return { book: book.id, chapter, verseStart, verseEnd };
}

// 두 절 범위가 겹치는지 확인
function overlaps(a, b) {
  if (a.book !== b.book || a.chapter !== b.chapter) return false;
  return a.verseStart <= b.verseEnd && b.verseStart <= a.verseEnd;
}

// 주어진 참조가 인용하는 원 본문 목록을 반환
export function findCitationsFor(refObj) {
  if (!refObj) return [];
  return CITATIONS.filter((c) => overlaps(c.citing, refObj)).map((c) => ({
    id: c.id,
    sources: c.sources,
    note: c.note,
    matched: c.citing,
  }));
}

// 참조 문자열을 사람이 읽기 좋게 포맷팅
// { book: 'Exod', chapter: 23, verseStart: 20, verseEnd: 20 } → "출애굽기 23:20"
export function formatReference(refObj) {
  const book = getBook(refObj.book);
  if (!book) return '';
  const range =
    refObj.verseStart === refObj.verseEnd
      ? `${refObj.verseStart}`
      : `${refObj.verseStart}-${refObj.verseEnd}`;
  return `${book.ko} ${refObj.chapter}:${range}`;
}

// 기존 노드 중 원 본문과 매칭되는 노드 찾기
export function findExistingSourceNode(sourceRef, nodes) {
  for (const n of nodes) {
    if (n.type !== 'verse') continue;
    const parsed = parseReference(n.data?.reference);
    if (!parsed) continue;
    if (overlaps(parsed, sourceRef)) return n;
  }
  return null;
}

// 두 노드 사이에 이미 인용(citation) 또는 crossref 엣지가 존재하는지 확인
export function hasCitationEdge(sourceId, targetId, edges) {
  return edges.some(
    (e) =>
      (e.type === 'citation' || e.type === 'crossref') &&
      ((e.source === sourceId && e.target === targetId) ||
        (e.source === targetId && e.target === sourceId)),
  );
}

// ── 통합 제안 목록 생성 (수동 인용 + crossref) ───────────────────────────────
// return: [{ source, note, part, existingNode, alreadyConnected, votes?, isCrossref? }]
export async function buildSuggestions(selectedNode, nodes, edges) {
  if (!selectedNode || selectedNode.type !== 'verse') return [];
  const parsed = parseReference(selectedNode.data?.reference);
  if (!parsed) return [];

  const suggestions = [];
  const seenKey = new Set();

  // 1) 수동 CITATIONS (높은 신뢰도 — 항상 우선 표시)
  const groups = findCitationsFor(parsed);
  for (const g of groups) {
    for (const src of g.sources) {
      const key = `${src.book}-${src.chapter}-${src.verseStart}-${src.verseEnd}`;
      seenKey.add(key);
      const existingNode = findExistingSourceNode(src, nodes);
      const alreadyConnected = existingNode
        ? hasCitationEdge(selectedNode.id, existingNode.id, edges)
        : false;
      suggestions.push({
        key: `manual::${g.id}::${key}`,
        source: src,
        note: g.note,
        part: src.part || null,
        existingNode,
        alreadyConnected,
        isCrossref: false,
      });
    }
  }

  // 2) OpenBible.info crossref (수동 인용과 중복되지 않는 항목만)
  const crossrefs = await findCrossrefsFor(parsed, 12);
  for (const cr of crossrefs) {
    const src = {
      book: cr.to.book,
      chapter: cr.to.ch,
      verseStart: cr.to.vs,
      verseEnd: cr.to.ve,
    };
    const key = `${src.book}-${src.chapter}-${src.verseStart}-${src.verseEnd}`;
    if (seenKey.has(key)) continue; // 수동 인용에 이미 있으면 스킵
    seenKey.add(key);
    const existingNode = findExistingSourceNode(src, nodes);
    const alreadyConnected = existingNode
      ? hasCitationEdge(selectedNode.id, existingNode.id, edges)
      : false;
    suggestions.push({
      key: `crossref::${key}`,
      source: src,
      note: null,
      part: null,
      existingNode,
      alreadyConnected,
      votes: cr.votes,
      isCrossref: true,
    });
  }

  return suggestions;
}
