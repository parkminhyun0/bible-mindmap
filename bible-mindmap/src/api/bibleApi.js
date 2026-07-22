import { ALL_BOOKS, isOT } from '../data/bibleBooks';

// Translation definitions used by BibleSearch and VerseNode
export const TRANSLATIONS = [
  { id: 'krv',      label: '개역한글', lang: 'ko' },
  { id: 'esv',      label: 'ESV',      lang: 'en' },
  { id: 'original', label: '원어',      lang: 'multi' },
];

// bookId → 1-based canonical index (bolls.life numbering)
const BOLLS_BOOK_MAP = Object.fromEntries(
  ALL_BOOKS.map((b, i) => [b.id, i + 1])
);

// ── Chapter cache ─────────────────────────────────────────────────────────
// Key: `${code}:${bookNum}:${chapter}` → Promise<verse[]>
// Deduplicates concurrent requests and eliminates repeat fetches for the same chapter.
const _chapterCache = new Map();
const CACHE_MAX = 60;

function cacheGet(key) {
  const hit = _chapterCache.get(key);
  if (hit) {
    // LRU touch
    _chapterCache.delete(key);
    _chapterCache.set(key, hit);
  }
  return hit;
}
function cacheSet(key, value) {
  _chapterCache.set(key, value);
  if (_chapterCache.size > CACHE_MAX) {
    const firstKey = _chapterCache.keys().next().value;
    _chapterCache.delete(firstKey);
  }
}

async function fetchChapter(translationCode, bookNum, chapter) {
  const key = `${translationCode}:${bookNum}:${chapter}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const promise = fetch(`https://bolls.life/get-text/${translationCode}/${bookNum}/${chapter}/`)
    .then((res) => {
      if (!res.ok) throw new Error(`bolls.life ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      _chapterCache.delete(key); // 실패 시 캐시 무효화하여 재시도 허용
      throw err;
    });
  cacheSet(key, promise);
  return promise;
}

// ── bolls.life (KRV, ESV, WLC, NTGT) ──────────────────────────────────────
async function fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, translationCode) {
  const bookNum = BOLLS_BOOK_MAP[bookId];
  if (!bookNum) throw new Error('Unknown book');
  const verses = await fetchChapter(translationCode, bookNum, chapter);
  const filtered = verses.filter((v) => v.verse >= verseStart && v.verse <= verseEnd);
  if (!filtered.length) throw new Error('해당 구절 없음');
  return filtered.map((v) => v.text.replace(/<[^>]*>/g, '').trim()).join(' ');
}

// ── fetchVerse ────────────────────────────────────────────────────────────
// Supports new IDs (krv/esv/original) and legacy IDs (korean/wlc/greek).
const LEGACY_ID_MAP = { korean: 'krv', wlc: 'original', greek: 'original' };

export async function fetchVerse(bookId, chapter, verseStart, verseEnd, translationId) {
  const book = ALL_BOOKS.find((b) => b.id === bookId);
  if (!book) throw new Error('Book not found');

  const id = LEGACY_ID_MAP[translationId] ?? translationId;

  switch (id) {
    case 'krv':
      return fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'KRV');
    case 'esv':
      return fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'ESV');
    case 'original': {
      const code = isOT(bookId) ? 'WLC' : 'NTGT';
      return fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, code);
    }
    default:
      throw new Error(`지원되지 않는 번역본: ${translationId}`);
  }
}

// Fetch all 3 translations in parallel. Returns { krv, esv, original } — null for failures.
export async function fetchAllTranslations(bookId, chapter, verseStart, verseEnd) {
  const safe = (id) =>
    fetchVerse(bookId, chapter, verseStart, verseEnd, id).catch(() => null);

  const [krv, esv, original] = await Promise.all([
    safe('krv'), safe('esv'), safe('original'),
  ]);
  return { krv, esv, original };
}

// 해당 장의 총 절 수를 반환 (KRV 기준, 캐시 재사용).
export async function fetchVerseCount(bookId, chapter) {
  const bookNum = BOLLS_BOOK_MAP[bookId];
  if (!bookNum) return null;
  const verses = await fetchChapter('KRV', bookNum, chapter);
  if (!Array.isArray(verses) || !verses.length) return null;
  return verses[verses.length - 1].verse;
}
