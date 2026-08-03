import { ALL_BOOKS, isOT } from '../data/bibleBooks';

const LEX_BASE = import.meta.env?.BASE_URL || '/';

export const TRANSLATIONS = [
  { id: 'krv',      label: '개역한글', lang: 'ko' },
  { id: 'web',      label: 'WEB',      lang: 'en' },
  { id: 'lxx',      label: 'LXX',      lang: 'grc', otOnly: true },
  { id: 'original', label: '원어',      lang: 'multi' },
];

const BOLLS_BOOK_MAP = Object.fromEntries(
  ALL_BOOKS.map((b, i) => [b.id, i + 1])
);

const _chapterCache = new Map();
const CACHE_MAX = 60;
const FETCH_TIMEOUT_MS = 10000;
const FETCH_RETRIES = 2;

function cacheGet(key) {
  const hit = _chapterCache.get(key);
  if (hit) {
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJsonWithRetry(url) {
  let lastError;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) {
        const error = new Error(`${new URL(url, window.location.origin).host} ${res.status}`);
        error.retryable = res.status === 429 || res.status >= 500;
        throw error;
      }
      return await res.json();
    } catch (error) {
      lastError = error.name === 'AbortError'
        ? new Error('성경 본문 요청 시간이 초과되었습니다.')
        : error;

      const retryable = error.name === 'AbortError' || error.retryable || error instanceof TypeError;
      if (!retryable || attempt === FETCH_RETRIES) break;
      await sleep(300 * (attempt + 1));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

async function fetchChapter(translationCode, bookNum, chapter) {
  const key = `${translationCode}:${bookNum}:${chapter}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const promise = fetchJsonWithRetry(
    `https://bolls.life/get-text/${translationCode}/${bookNum}/${chapter}/`,
  ).catch((err) => {
    _chapterCache.delete(key);
    throw err;
  });
  cacheSet(key, promise);
  return promise;
}

async function fetchGreekChapterFromLex(bookId, chapter) {
  const key = `lex:gnt:${bookId}:${chapter}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const promise = fetchJsonWithRetry(`${LEX_BASE}data/lex/gnt/${bookId}/${chapter}.json`)
    .catch((err) => {
      _chapterCache.delete(key);
      throw err;
    });
  cacheSet(key, promise);
  return promise;
}

async function fetchOriginalGreek(bookId, chapter, verseStart, verseEnd) {
  const data = await fetchGreekChapterFromLex(bookId, chapter);
  const parts = [];
  for (let v = verseStart; v <= verseEnd; v += 1) {
    const words = data?.[String(v)];
    if (!Array.isArray(words) || !words.length) continue;
    parts.push({ verse: v, text: words.map((w) => w.w).join(' ').trim() });
  }
  if (!parts.length) throw new Error('해당 구절 없음');

  if (parts.length === 1) return parts[0].text;
  return parts
    .map(({ verse, text }) => `<span style="${VERSE_NUM_STYLE}">${verse}</span>${text}`)
    .join(' ');
}

async function fetchLxxBook(bookId) {
  const key = `lxx:${bookId}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const promise = fetchJsonWithRetry(`${LEX_BASE}lxx/${bookId}.json`)
    .catch((err) => {
      _chapterCache.delete(key);
      throw err;
    });
  cacheSet(key, promise);
  return promise;
}

async function fetchOriginalLxx(bookId, chapter, verseStart, verseEnd) {
  const book = await fetchLxxBook(bookId);
  const chap = book?.[String(chapter)];
  if (!chap) throw new Error('해당 장 LXX 없음');

  const parts = [];
  for (let v = verseStart; v <= verseEnd; v += 1) {
    const text = chap[String(v)];
    if (typeof text === 'string' && text.trim()) parts.push({ verse: v, text: text.trim() });
  }
  if (!parts.length) throw new Error('해당 구절 없음');

  if (parts.length === 1) return parts[0].text;
  return parts
    .map(({ verse, text }) => `<span style="${VERSE_NUM_STYLE}">${verse}</span>${text}`)
    .join(' ');
}

const VERSE_NUM_STYLE = 'font-weight:700;color:#94a3b8;font-size:0.78em;margin-right:3px;vertical-align:0.28em;';

async function fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, translationCode) {
  const bookNum = BOLLS_BOOK_MAP[bookId];
  if (!bookNum) throw new Error('Unknown book');
  const verses = await fetchChapter(translationCode, bookNum, chapter);
  const filtered = verses.filter((v) => v.verse >= verseStart && v.verse <= verseEnd);
  if (!filtered.length) throw new Error('해당 구절 없음');

  const cleaned = filtered.map((v) => ({
    verse: v.verse,
    text: v.text.replace(/<[^>]*>/g, '').trim(),
  }));

  if (cleaned.length === 1) return cleaned[0].text;
  return cleaned
    .map(({ verse, text }) => `<span style="${VERSE_NUM_STYLE}">${verse}</span>${text}`)
    .join(' ');
}

function bibleApiReference(book, chapter, verseStart, verseEnd) {
  const rawName = book?.en || book?.nameEn || book?.name || book?.id;
  const range = verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`;
  return `${rawName} ${chapter}:${range}`.replace(/\s+/g, '+');
}

async function fetchWebFallback(book, chapter, verseStart, verseEnd) {
  const reference = bibleApiReference(book, chapter, verseStart, verseEnd);
  const data = await fetchJsonWithRetry(
    `https://bible-api.com/${reference}?translation=web`,
  );
  const verses = Array.isArray(data?.verses) ? data.verses : [];
  if (!verses.length) {
    const text = typeof data?.text === 'string' ? data.text.trim() : '';
    if (!text) throw new Error('WEB 보조 본문 없음');
    return text;
  }

  const cleaned = verses.map((v) => ({
    verse: Number(v.verse),
    text: String(v.text || '').trim(),
  })).filter((v) => v.text);
  if (!cleaned.length) throw new Error('WEB 보조 본문 없음');
  if (cleaned.length === 1) return cleaned[0].text;
  return cleaned
    .map(({ verse, text }) => `<span style="${VERSE_NUM_STYLE}">${verse}</span>${text}`)
    .join(' ');
}

const LEGACY_ID_MAP = { korean: 'krv', wlc: 'original', greek: 'original', esv: 'web' };

export async function fetchVerse(bookId, chapter, verseStart, verseEnd, translationId) {
  const book = ALL_BOOKS.find((b) => b.id === bookId);
  if (!book) throw new Error('Book not found');

  const id = LEGACY_ID_MAP[translationId] ?? translationId;

  switch (id) {
    case 'krv':
      return fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'KRV');
    case 'web':
      try {
        return await fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'WEB');
      } catch {
        return fetchWebFallback(book, chapter, verseStart, verseEnd);
      }
    case 'lxx':
      if (!isOT(bookId)) throw new Error('LXX(칠십인역)는 구약에만 제공됩니다');
      return fetchOriginalLxx(bookId, chapter, verseStart, verseEnd);
    case 'original': {
      if (isOT(bookId)) {
        return fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'WLC');
      }
      return fetchOriginalGreek(bookId, chapter, verseStart, verseEnd);
    }
    default:
      throw new Error(`지원되지 않는 번역본: ${translationId}`);
  }
}

export async function fetchAllTranslations(bookId, chapter, verseStart, verseEnd) {
  const safe = async (id) => {
    try {
      return await fetchVerse(bookId, chapter, verseStart, verseEnd, id);
    } catch {
      return null;
    }
  };

  const [krv, web, original, lxx] = await Promise.all([
    safe('krv'), safe('web'), safe('original'),
    isOT(bookId) ? safe('lxx') : Promise.resolve(null),
  ]);
  return { krv, web, original, lxx };
}

export async function fetchVerseCount(bookId, chapter) {
  const bookNum = BOLLS_BOOK_MAP[bookId];
  if (!bookNum) return null;
  const verses = await fetchChapter('KRV', bookNum, chapter);
  if (!Array.isArray(verses) || !verses.length) return null;
  return verses[verses.length - 1].verse;
}
