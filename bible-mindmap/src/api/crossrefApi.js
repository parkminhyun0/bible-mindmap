import { ALL_BOOKS } from '../data/bibleBooks';

const BASE = import.meta.env.BASE_URL; // /bible-mindmap/app/
const _cache = new Map();

// bookId → 한글 책 이름
const KO_NAME = Object.fromEntries(ALL_BOOKS.map((b) => [b.id, b.ko]));

/**
 * 구절의 교차 참조 목록 반환 (votes 높은 순, 상위 limit개)
 * @param {string} bookId  - 'John', 'Gen', ...
 * @param {number} chapter
 * @param {number} verse
 * @param {number} limit
 * @returns {Promise<Array<{bookId, chapter, verseStart, verseEnd, reference, votes}>>}
 */
export async function fetchCrossRefs(bookId, chapter, verse, limit = 12) {
  const key = `${bookId}:${chapter}:${verse}`;
  if (_cache.has(key)) return _cache.get(key);

  const url = `${BASE}crossref/${bookId}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`crossref ${res.status}`);
  const data = await res.json();

  const results = data
    .filter((r) => r.from.ch === chapter && r.from.vs <= verse && r.from.ve >= verse)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, limit)
    .map((r) => {
      const { book, ch, vs, ve } = r.to;
      const koName = KO_NAME[book] || book;
      const ref =
        vs === ve
          ? `${koName} ${ch}:${vs}`
          : `${koName} ${ch}:${vs}-${ve}`;
      return { bookId: book, chapter: ch, verseStart: vs, verseEnd: ve, reference: ref, votes: r.votes };
    });

  _cache.set(key, results);
  return results;
}
