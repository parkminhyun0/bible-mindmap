import { ALL_BOOKS, isOT } from '../data/bibleBooks';

// Translation definitions used by BibleSearch and VerseNode
export const TRANSLATIONS = [
  { id: 'krv',      label: '개역한글',     lang: 'ko' },
  { id: 'esv',      label: 'ESV',          lang: 'en' },
  { id: 'original', label: '원어',          lang: 'multi' },
  { id: 'lxx',      label: 'LXX (70인역)', lang: 'el', testament: 'ot' },
];

const BOLLS_BOOK_MAP = {};
ALL_BOOKS.forEach((b, i) => {
  BOLLS_BOOK_MAP[b.id] = i + 1;
});

// ── 로컬 SBLGNT (신약 헬라어) ──────────────────────────────────────────────
const _sblgntCache = new Map();

// ── 로컬 LXX (구약 헬라어 — Rahlfs 1935) ───────────────────────────────────
const _lxxCache = new Map();

async function fetchFromSBLGNT(bookId, chapter, verseStart, verseEnd) {
  if (!_sblgntCache.has(bookId)) {
    const res = await fetch(`/sblgnt/${bookId}.json`);
    if (!res.ok) throw new Error(`SBLGNT 파일 없음: ${bookId}`);
    _sblgntCache.set(bookId, await res.json());
  }
  const bookData = _sblgntCache.get(bookId);
  const chData   = bookData[String(chapter)];
  if (!chData) throw new Error(`SBLGNT: ${bookId} ${chapter}장 없음`);

  const verses = [];
  for (let v = verseStart; v <= verseEnd; v++) {
    const text = chData[String(v)];
    if (text) verses.push(text);
  }
  if (!verses.length) throw new Error('SBLGNT: 해당 구절 없음');
  return verses.join(' ');
}

async function fetchFromLXX(bookId, chapter, verseStart, verseEnd) {
  if (!_lxxCache.has(bookId)) {
    const res = await fetch(`/lxx/${bookId}.json`);
    if (!res.ok) throw new Error(`LXX 파일 없음: ${bookId}`);
    _lxxCache.set(bookId, await res.json());
  }
  const bookData = _lxxCache.get(bookId);
  const chData   = bookData[String(chapter)];
  if (!chData) throw new Error(`LXX: ${bookId} ${chapter}장 없음`);

  const verses = [];
  for (let v = verseStart; v <= verseEnd; v++) {
    const text = chData[String(v)];
    if (text) verses.push(text);
  }
  if (!verses.length) throw new Error('LXX: 해당 구절 없음');
  return verses.join(' ');
}

// ── bolls.life (KRV, ESV, WLC) ───────────────────────────────────────────────
async function fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, translationCode) {
  const bookNum = BOLLS_BOOK_MAP[bookId];
  if (!bookNum) throw new Error('Unknown book');
  const url = `https://bolls.life/get-text/${translationCode}/${bookNum}/${chapter}/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bolls.life ${res.status}`);
  const verses = await res.json();
  const filtered = verses.filter((v) => v.verse >= verseStart && v.verse <= verseEnd);
  if (!filtered.length) throw new Error('해당 구절 없음');
  return filtered.map((v) => v.text.replace(/<[^>]*>/g, '').trim()).join(' ');
}

// ── fetchVerse ────────────────────────────────────────────────────────────────
// Supports new IDs (krv/esv/original/lxx) and legacy IDs (korean/wlc/greek).
export async function fetchVerse(bookId, chapter, verseStart, verseEnd, translationId) {
  const book = ALL_BOOKS.find((b) => b.id === bookId);
  if (!book) throw new Error('Book not found');

  const ot = isOT(bookId);

  // Legacy ID mapping
  const id = { korean: 'krv', wlc: 'original', greek: 'original' }[translationId] ?? translationId;

  switch (id) {
    case 'krv':
      return fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'KRV');
    case 'esv':
      return fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'ESV');
    case 'original':
      // 신약: 로컬 SBLGNT (학술 비평 본문) / 구약: bolls.life WLC (실제 마소라 본문)
      return ot
        ? fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'WLC')
        : fetchFromSBLGNT(bookId, chapter, verseStart, verseEnd);
    case 'lxx':
      if (!ot) throw new Error('LXX(70인역)는 구약 전용입니다');
      return fetchFromLXX(bookId, chapter, verseStart, verseEnd);
    default:
      throw new Error(`지원되지 않는 번역본: ${translationId}`);
  }
}

// Fetch all 4 translations in parallel.
// Returns { krv, esv, original, lxx } — null for failures or inapplicable (LXX on NT).
export async function fetchAllTranslations(bookId, chapter, verseStart, verseEnd) {
  const ot = isOT(bookId);

  const safe = async (id) => {
    try { return await fetchVerse(bookId, chapter, verseStart, verseEnd, id); }
    catch { return null; }
  };

  const [krv, esv, original, lxx] = await Promise.all([
    safe('krv'),
    safe('esv'),
    safe('original'),
    ot ? safe('lxx') : Promise.resolve(null),
  ]);

  return { krv, esv, original, lxx };
}
