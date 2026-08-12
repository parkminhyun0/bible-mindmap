import { ALL_BOOKS } from '../data/bibleBooks.js';

const BASE = import.meta.env?.BASE_URL || '/'; // /bible-mindmap/app/ in Vite; safe fallback for read-only Node verifiers
const _cache = new Map();
// bookId → Promise<json> — 책 전체 파일 캐시 (동시/반복 요청 시 중복 fetch 방지)
const _bookCache = new Map();

// bookId → 한글 책 이름
const KO_NAME = Object.fromEntries(ALL_BOOKS.map((b) => [b.id, b.ko]));

function fetchBookCrossRefs(bookId) {
  let promise = _bookCache.get(bookId);
  if (promise) return promise;

  const url = `${BASE}crossref/${bookId}.json`;
  promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`crossref ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      _bookCache.delete(bookId); // 실패 시 캐시 무효화하여 재시도 허용
      throw err;
    });
  _bookCache.set(bookId, promise);
  return promise;
}

// ── 참조 유무 동기 판정 인덱스 ────────────────────────────────────────
// 아이콘 렌더 시점에 '이 절에 참조 본문이 실제로 존재하는가'를 동기로 확인하기 위해
// 책별로 참조가 걸린 source 절('ch:verse') Set을 구축한다. (fetchBookCrossRefs 캐시 재사용)
const _indexByBook = new Map(); // bookId → Set('ch:verse')
const _indexLoaded = new Set(); // 인덱스 구축 완료 bookId

export function isCrossRefIndexLoaded(bookId) {
  return _indexLoaded.has(bookId);
}

// 동기 판정: 인덱스 미로드 또는 참조 없음이면 false → 아이콘 숨김
export function hasCrossRef(bookId, chapter, verse) {
  const set = _indexByBook.get(bookId);
  return set ? set.has(`${chapter}:${verse}`) : false;
}

export async function loadCrossRefIndex(bookId) {
  if (_indexLoaded.has(bookId)) return;
  const data = await fetchBookCrossRefs(bookId);
  const set = new Set();
  for (const r of data) {
    const ch = r?.from?.ch;
    const vs = r?.from?.vs;
    const ve = r?.from?.ve;
    if (ch == null || vs == null || ve == null) continue;
    for (let v = vs; v <= ve; v += 1) set.add(`${ch}:${v}`);
  }
  _indexByBook.set(bookId, set);
  _indexLoaded.add(bookId);
}

/**
 * 구절의 교차 참조 목록 반환 (votes 높은 순, 상위 limit개)
 * @param {string} bookId  - 'John', 'Gen', ...
 * @param {number} chapter
 * @param {number} verse
 * @param {number} limit
 * @returns {Promise<Array<{bookId, chapter, verseStart, verseEnd, reference, votes}>>}
 */
export async function fetchCrossRefs(bookId, chapter, verse, limit = 12) {
  // 캐시에는 limit 미적용 전체 목록을 저장 — 호출자마다 limit이 달라도
  // (CrossrefPopup 5 · NodeEditor 12 · parallelStudy 12+) 재사용 가능
  const key = `${bookId}:${chapter}:${verse}`;
  const cached = _cache.get(key);
  if (cached) return cached.slice(0, limit);

  const data = await fetchBookCrossRefs(bookId);

  const results = data
    .filter((r) => r?.from && r.from.ch === chapter && r.from.vs <= verse && r.from.ve >= verse)
    .sort((a, b) => b.votes - a.votes)
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
  return results.slice(0, limit);
}
