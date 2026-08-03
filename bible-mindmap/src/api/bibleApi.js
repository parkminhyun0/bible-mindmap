import { ALL_BOOKS, isOT } from '../data/bibleBooks';
import {
  aliasesForRange,
  assertVerseCoverage,
  mergeVerseRows,
  missingVerseNumbers,
  normalizeVerseRows,
  remapAliasRows,
  selectVerseRows,
} from './verseNormalization';

const BASE = import.meta.env?.BASE_URL || '/';

export const TRANSLATIONS = [
  { id: 'krv', label: '개역한글', lang: 'ko' },
  { id: 'web', label: 'WEB', lang: 'en' },
  { id: 'lxx', label: 'LXX', lang: 'grc', otOnly: true },
  { id: 'original', label: '원어', lang: 'multi' },
];

const BOLLS_BOOK_MAP = Object.fromEntries(
  ALL_BOOKS.map((book, index) => [book.id, index + 1]),
);
const VERSE_NUM_STYLE = 'font-weight:700;color:#94a3b8;font-size:0.78em;margin-right:3px;vertical-align:0.28em;';
const CACHE_MAX = 160;
const FETCH_TIMEOUT_MS = 10000;
const FETCH_RETRIES = 2;
const chapterCache = new Map();

function cacheGet(key) {
  const hit = chapterCache.get(key);
  if (hit) {
    chapterCache.delete(key);
    chapterCache.set(key, hit);
  }
  return hit;
}

function cacheSet(key, value) {
  chapterCache.set(key, value);
  if (chapterCache.size > CACHE_MAX) {
    chapterCache.delete(chapterCache.keys().next().value);
  }
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
        const origin = globalThis.location?.origin || 'https://local.invalid';
        const host = new URL(url, origin).host;
        const error = new Error(`${host || '본문 데이터'} ${response.status}`);
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

function cachedPromise(key, loader) {
  const cached = cacheGet(key);
  if (cached) return cached;
  const promise = loader().catch((error) => {
    chapterCache.delete(key);
    throw error;
  });
  cacheSet(key, promise);
  return promise;
}

async function fetchBollsChapterRows(translationCode, bookId, chapter) {
  const bookNumber = BOLLS_BOOK_MAP[bookId];
  if (!bookNumber) throw new Error(`알 수 없는 성경 책: ${bookId}`);
  return cachedPromise(`bolls:${translationCode}:${bookId}:${chapter}`, async () => {
    const raw = await fetchJsonWithRetry(
      `https://bolls.life/get-text/${translationCode}/${bookNumber}/${chapter}/`,
    );
    const rows = normalizeVerseRows(raw);
    if (!rows.length) throw new Error(`${translationCode} ${bookId} ${chapter}장 본문 없음`);
    return rows;
  });
}

async function fetchLexChapter(corpus, bookId, chapter) {
  return cachedPromise(`lex:${corpus}:${bookId}:${chapter}`, () =>
    fetchJsonWithRetry(`${BASE}data/lex/${corpus}/${bookId}/${chapter}.json`));
}

async function fetchLexRows(corpus, bookId, chapter) {
  const chapterData = await fetchLexChapter(corpus, bookId, chapter);
  const rows = [];
  for (const [verseKey, words] of Object.entries(chapterData || {})) {
    if (!/^\d+$/.test(verseKey) || !Array.isArray(words)) continue;
    const text = words.map((word) => word?.w).filter(Boolean).join(' ').trim();
    if (text) rows.push({ verse: Number(verseKey), text });
  }
  return normalizeVerseRows(rows);
}

async function fetchLxxRows(bookId, chapter) {
  const book = await cachedPromise(`lxx:${bookId}`, () =>
    fetchJsonWithRetry(`${BASE}lxx/${bookId}.json`));
  const chapterData = book?.[String(chapter)];
  if (!chapterData) throw new Error('해당 장 LXX 없음');
  return normalizeVerseRows(
    Object.entries(chapterData).map(([verse, text]) => ({ verse: Number(verse), text })),
  );
}

function formatRows(rows, verseStart, verseEnd, label) {
  const selected = assertVerseCoverage(rows, verseStart, verseEnd, label);
  if (selected.length === 1) return selected[0].text;
  return selected
    .map(({ verse, text }) => `<span style="${VERSE_NUM_STYLE}">${verse}</span>${text}`)
    .join(' ');
}

function bibleApiReference(book, chapter, verseStart, verseEnd) {
  const rawName = book?.en || book?.nameEn || book?.name || book?.id;
  const range = verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`;
  return `${rawName} ${chapter}:${range}`.replace(/\s+/g, '+');
}

async function fetchBibleApiRows(book, chapter, verseStart, verseEnd) {
  const reference = bibleApiReference(book, chapter, verseStart, verseEnd);
  const data = await fetchJsonWithRetry(
    `https://bible-api.com/${reference}?translation=web`,
  );
  return normalizeVerseRows(data?.verses || []);
}

async function fetchWebRows(book, chapter, verseStart, verseEnd) {
  let rows = await fetchBollsChapterRows('WEB', book.id, chapter);

  // WEB 자체 장절 체계와 앱의 개역한글 기준 참조가 다른 구간을 정규화한다.
  for (const alias of aliasesForRange(book.id, chapter, verseStart, verseEnd)) {
    const sourceRows = await fetchBollsChapterRows(
      'WEB',
      alias.source.bookId,
      alias.source.chapter,
    );
    rows = mergeVerseRows(rows, remapAliasRows(sourceRows, alias));
  }

  // 공급자별 데이터 누락이 남아 있을 때만 두 번째 WEB 공급자를 사용한다.
  if (missingVerseNumbers(rows, verseStart, verseEnd).length) {
    try {
      rows = mergeVerseRows(
        rows,
        await fetchBibleApiRows(book, chapter, verseStart, verseEnd),
      );
    } catch {
      // 아래 assertVerseCoverage가 정확한 누락 절을 오류로 보고한다.
    }
  }

  return assertVerseCoverage(rows, verseStart, verseEnd, 'WEB');
}

async function fetchOriginalRows(bookId, chapter, verseStart, verseEnd) {
  const corpus = isOT(bookId) ? 'hot' : 'gnt';
  const fallbackCode = isOT(bookId) ? 'WLC' : 'NTGT';
  let rows = [];

  // 로컬 STEPBible 자료를 우선 사용한다. TAHOT은 앱의 개역한글 기준
  // primary ref로 생성되므로 구약의 장절 차이도 여기서 흡수된다.
  try {
    rows = await fetchLexRows(corpus, bookId, chapter);
  } catch {
    rows = [];
  }

  // TAGNT/SBL 계열에서 생략되거나 로컬 파일에 없는 절만 정상 시절의
  // Bolls 원어 공급원(WLC/NTGT)으로 채운다. 기존 절은 로컬 자료를 유지한다.
  if (missingVerseNumbers(rows, verseStart, verseEnd).length) {
    const fallbackRows = await fetchBollsChapterRows(fallbackCode, bookId, chapter);
    rows = mergeVerseRows(rows, fallbackRows);
  }

  return assertVerseCoverage(rows, verseStart, verseEnd, isOT(bookId) ? '히브리어' : '헬라어');
}

const LEGACY_ID_MAP = { korean: 'krv', wlc: 'original', greek: 'original', esv: 'web' };

export async function fetchVerse(bookId, chapter, verseStart, verseEnd, translationId) {
  const book = ALL_BOOKS.find((item) => item.id === bookId);
  if (!book) throw new Error('Book not found');
  const id = LEGACY_ID_MAP[translationId] ?? translationId;

  if (id === 'krv') {
    const rows = await fetchBollsChapterRows('KRV', bookId, chapter);
    return formatRows(rows, verseStart, verseEnd, '개역한글');
  }

  if (id === 'web') {
    const rows = await fetchWebRows(book, chapter, verseStart, verseEnd);
    return formatRows(rows, verseStart, verseEnd, 'WEB');
  }

  if (id === 'lxx') {
    if (!isOT(bookId)) throw new Error('LXX(칠십인역)는 구약에만 제공됩니다.');
    const rows = await fetchLxxRows(bookId, chapter);
    return formatRows(rows, verseStart, verseEnd, 'LXX');
  }

  if (id === 'original') {
    const rows = await fetchOriginalRows(bookId, chapter, verseStart, verseEnd);
    return formatRows(rows, verseStart, verseEnd, isOT(bookId) ? '히브리어' : '헬라어');
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
  const rows = await fetchBollsChapterRows('KRV', bookId, chapter);
  return selectVerseRows(rows, 1, Number.MAX_SAFE_INTEGER).at(-1)?.verse ?? null;
}
