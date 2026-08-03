import { ALL_BOOKS, isOT } from '../data/bibleBooks';

const BASE = import.meta.env?.BASE_URL || '/';
const BOLLS_BOOK_MAP = Object.fromEntries(ALL_BOOKS.map((book, index) => [book.id, index + 1]));
const VERSE_NUM_STYLE = 'font-weight:700;color:#94a3b8;font-size:0.78em;margin-right:3px;vertical-align:0.28em;';
const CACHE_MAX = 160;
const FETCH_TIMEOUT_MS = 10000;
const FETCH_RETRIES = 2;
const cache = new Map();

export const TRANSLATIONS = [
  { id: 'krv', label: '개역한글', lang: 'ko' },
  { id: 'web', label: 'WEB', lang: 'en' },
  { id: 'lxx', label: 'LXX', lang: 'grc', otOnly: true },
  { id: 'original', label: '원어', lang: 'multi' },
];

function cacheGet(key) {
  const value = cache.get(key);
  if (value) {
    cache.delete(key);
    cache.set(key, value);
  }
  return value;
}

function cacheSet(key, value) {
  cache.set(key, value);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJsonWithRetry(url, { noStore = false } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        ...(noStore ? { cache: 'no-store' } : {}),
      });
      if (!response.ok) {
        const error = new Error(`본문 데이터 ${response.status}`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error?.name === 'AbortError'
        ? new Error('성경 본문 요청 시간이 초과되었습니다.')
        : error;
      const retryable = error?.name === 'AbortError' || error?.retryable || error instanceof TypeError;
      if (!retryable || attempt === FETCH_RETRIES) break;
      await sleep(300 * (attempt + 1));
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError;
}

function chapterPromise(key, loader) {
  const cached = cacheGet(key);
  if (cached) return cached;
  const promise = loader().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cacheSet(key, promise);
  return promise;
}

function normalizeRows(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      verse: Number(row.verse),
      text: String(row.text || '').replace(/<[^>]*>/g, '').trim(),
    }))
    .filter((row) => Number.isInteger(row.verse) && row.verse > 0 && row.text);
}

function formatRows(rows, verseStart, verseEnd) {
  const selected = rows.filter((row) => row.verse >= verseStart && row.verse <= verseEnd);
  if (!selected.length) throw new Error('해당 구절 없음');
  if (selected.length === 1) return selected[0].text;
  return selected
    .map(({ verse, text }) => `<span style="${VERSE_NUM_STYLE}">${verse}</span>${text}`)
    .join(' ');
}

async function fetchLocalBibleChapter(sourceId, bookId, chapter) {
  return chapterPromise(`local:${sourceId}:${bookId}:${chapter}`, async () => {
    const raw = await fetchJsonWithRetry(`${BASE}data/bible/${sourceId}/${bookId}/${chapter}.json`);
    const rows = normalizeRows(raw);
    if (!rows.length) throw new Error('로컬 본문 데이터 없음');
    return rows;
  });
}

async function fetchBollsChapter(code, bookId, chapter) {
  const bookNum = BOLLS_BOOK_MAP[bookId];
  if (!bookNum) throw new Error('Unknown book');
  return chapterPromise(`bolls:${code}:${bookId}:${chapter}`, async () => {
    const raw = await fetchJsonWithRetry(
      `https://bolls.life/get-text/${code}/${bookNum}/${chapter}/`,
      { noStore: true },
    );
    const rows = normalizeRows(raw);
    if (!rows.length) throw new Error('외부 본문 데이터 없음');
    return rows;
  });
}

async function fetchLocalThenRemote(sourceId, code, bookId, chapter, verseStart, verseEnd) {
  try {
    return formatRows(await fetchLocalBibleChapter(sourceId, bookId, chapter), verseStart, verseEnd);
  } catch {
    return formatRows(await fetchBollsChapter(code, bookId, chapter), verseStart, verseEnd);
  }
}

async function fetchOriginalChapter(corpus, bookId, chapter) {
  return chapterPromise(`${corpus}:${bookId}:${chapter}`, () =>
    fetchJsonWithRetry(`${BASE}data/lex/${corpus}/${bookId}/${chapter}.json`));
}

async function fetchOriginalFromLex(corpus, bookId, chapter, verseStart, verseEnd) {
  const data = await fetchOriginalChapter(corpus, bookId, chapter);
  const rows = [];
  for (let verse = verseStart; verse <= verseEnd; verse += 1) {
    const words = data?.[String(verse)];
    if (Array.isArray(words) && words.length) {
      const text = words.map((word) => word.w).filter(Boolean).join(' ').trim();
      if (text) rows.push({ verse, text });
    }
  }
  return formatRows(rows, verseStart, verseEnd);
}

async function fetchLxx(bookId, chapter, verseStart, verseEnd) {
  const book = await chapterPromise(`lxx:${bookId}`, () =>
    fetchJsonWithRetry(`${BASE}lxx/${bookId}.json`));
  const chapterData = book?.[String(chapter)];
  if (!chapterData) throw new Error('해당 장 LXX 없음');
  const rows = Object.entries(chapterData).map(([verse, text]) => ({
    verse: Number(verse),
    text: String(text || '').trim(),
  }));
  return formatRows(rows, verseStart, verseEnd);
}

function bibleApiReference(book, chapter, verseStart, verseEnd) {
  const range = verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`;
  return `${book.en} ${chapter}:${range}`.replace(/\s+/g, '+');
}

async function fetchWebEmergency(book, chapter, verseStart, verseEnd) {
  const data = await fetchJsonWithRetry(
    `https://bible-api.com/${bibleApiReference(book, chapter, verseStart, verseEnd)}?translation=web`,
    { noStore: true },
  );
  const rows = normalizeRows(data?.verses || []);
  if (rows.length) return formatRows(rows, verseStart, verseEnd);
  const text = String(data?.text || '').trim();
  if (!text) throw new Error('WEB 보조 본문 없음');
  return text;
}

const LEGACY_ID_MAP = { korean: 'krv', wlc: 'original', greek: 'original', esv: 'web' };

export async function fetchVerse(bookId, chapter, verseStart, verseEnd, translationId) {
  const book = ALL_BOOKS.find((item) => item.id === bookId);
  if (!book) throw new Error('Book not found');
  const id = LEGACY_ID_MAP[translationId] ?? translationId;

  if (id === 'krv') {
    return fetchLocalThenRemote('krv', 'KRV', bookId, chapter, verseStart, verseEnd);
  }
  if (id === 'web') {
    try {
      return await fetchLocalThenRemote('web', 'WEB', bookId, chapter, verseStart, verseEnd);
    } catch {
      return fetchWebEmergency(book, chapter, verseStart, verseEnd);
    }
  }
  if (id === 'lxx') {
    if (!isOT(bookId)) throw new Error('LXX는 구약에만 제공됩니다.');
    return fetchLxx(bookId, chapter, verseStart, verseEnd);
  }
  if (id === 'original') {
    return fetchOriginalFromLex(isOT(bookId) ? 'hot' : 'gnt', bookId, chapter, verseStart, verseEnd);
  }
  throw new Error(`지원되지 않는 번역본: ${translationId}`);
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
    safe('krv'),
    safe('web'),
    safe('original'),
    isOT(bookId) ? safe('lxx') : Promise.resolve(null),
  ]);
  return { krv, web, original, lxx };
}

export async function fetchVerseCount(bookId, chapter) {
  try {
    const rows = await fetchLocalBibleChapter('krv', bookId, chapter);
    return rows.at(-1)?.verse ?? null;
  } catch {
    const rows = await fetchBollsChapter('KRV', bookId, chapter);
    return rows.at(-1)?.verse ?? null;
  }
}
