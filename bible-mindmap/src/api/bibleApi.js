import { ALL_BOOKS, isOT } from '../data/bibleBooks';

// 로컬 원어 데이터 base 경로 (Vite: /bible-mindmap/app/ · Node 폴백 /)
const LEX_BASE = import.meta.env?.BASE_URL || '/';

// Translation definitions used by BibleSearch and VerseNode
export const TRANSLATIONS = [
  { id: 'krv',      label: '개역한글', lang: 'ko' },
  { id: 'web',      label: 'WEB',      lang: 'en' },
  { id: 'lxx',      label: 'LXX',      lang: 'grc', otOnly: true },
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
const FETCH_TIMEOUT_MS = 8000;
const FETCH_RETRIES = 1;

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJsonWithRetry(url) {
  let lastError;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        const error = new Error(`bolls.life ${res.status}`);
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
      await sleep(250 * (attempt + 1));
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
  )
    .catch((err) => {
      _chapterCache.delete(key); // 실패 시 캐시 무효화하여 재시도 허용
      throw err;
    });
  cacheSet(key, promise);
  return promise;
}

// ── 로컬 STEPBible TAGNT (헬라어 신약 · CC BY 4.0) ─────────────────────────
// public/data/lex/gnt/{bookId}/{chapter}.json 의 단어(w)를 이어 붙여 헬라어 본문을
// 재구성한다. 저작권: STEPBible-Data (CC BY 4.0, https://github.com/STEPBible/STEPBible-Data).
// bolls.life "NTGT"(라이선스 불확실)를 대체 — 헬라어 표시는 이제 로컬 개방 데이터 사용.
async function fetchGreekChapterFromLex(bookId, chapter) {
  const key = `lex:gnt:${bookId}:${chapter}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const promise = fetchJsonWithRetry(`${LEX_BASE}data/lex/gnt/${bookId}/${chapter}.json`)
    .catch((err) => {
      _chapterCache.delete(key); // 실패 시 캐시 무효화하여 재시도 허용
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

  // 단일 절: 텍스트만 (기존 동작 유지)
  if (parts.length === 1) return parts[0].text;
  // 다중 절: 각 절 앞에 절 번호 <span> 삽입
  return parts
    .map(({ verse, text }) => `<span style="${VERSE_NUM_STYLE}">${verse}</span>${text}`)
    .join(' ');
}

// ── 로컬 LXX (칠십인역 · Rahlfs 1935 · 퍼블릭 도메인) ──────────────────────
// public/lxx/{bookId}.json ( { "장": { "절": "본문" } } ) 에서 구약 헬라어 본문을 읽는다.
// 저작권: Rahlfs 1935판(A. Rahlfs 1935 사망 → life+70, 2006년 PD). 출처 eliranwong/LXX-Rahlfs-1935.
// 구약(39권)만 존재. bolls 비의존.
async function fetchLxxBook(bookId) {
  const key = `lxx:${bookId}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const promise = fetchJsonWithRetry(`${LEX_BASE}lxx/${bookId}.json`)
    .catch((err) => {
      _chapterCache.delete(key); // 실패 시 캐시 무효화하여 재시도 허용
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

// ── bolls.life (KRV, WEB, WLC) ────────────────────────────────────────────
// 절 번호를 인라인 <span>으로 삽입하여 여러 절을 이어 붙일 때도 구분되도록 함.
// TipTap TextStyle 확장이 style 속성을 보존하므로 편집 후에도 유지됨.
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

  // 단일 절: 절 번호 없이 텍스트만 반환 (기존 동작 유지)
  if (cleaned.length === 1) return cleaned[0].text;

  // 다중 절: 각 절 앞에 절 번호 <span> 삽입
  return cleaned
    .map(({ verse, text }) => `<span style="${VERSE_NUM_STYLE}">${verse}</span>${text}`)
    .join(' ');
}

// ── fetchVerse ────────────────────────────────────────────────────────────
// Supports new IDs (krv/web/original) and legacy IDs (korean/wlc/greek).
const LEGACY_ID_MAP = { korean: 'krv', wlc: 'original', greek: 'original', esv: 'web' };

export async function fetchVerse(bookId, chapter, verseStart, verseEnd, translationId) {
  const book = ALL_BOOKS.find((b) => b.id === bookId);
  if (!book) throw new Error('Book not found');

  const id = LEGACY_ID_MAP[translationId] ?? translationId;

  switch (id) {
    case 'krv':
      return fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'KRV');
    case 'web':
      return fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'WEB');
    case 'lxx':
      // 칠십인역 — 구약(OT)에만 제공 (로컬 Rahlfs 1935, PD)
      if (!isOT(bookId)) throw new Error('LXX(칠십인역)는 구약에만 제공됩니다');
      return fetchOriginalLxx(bookId, chapter, verseStart, verseEnd);
    case 'original': {
      // 히브리어(구약): WLC — 퍼블릭 도메인, bolls.life 유지
      if (isOT(bookId)) {
        return fetchFromBollsLife(bookId, chapter, verseStart, verseEnd, 'WLC');
      }
      // 헬라어(신약): 로컬 STEPBible TAGNT(CC BY 4.0) 재구성 — bolls 비의존
      return fetchOriginalGreek(bookId, chapter, verseStart, verseEnd);
    }
    default:
      throw new Error(`지원되지 않는 번역본: ${translationId}`);
  }
}

// Fetch all 3 translations in parallel. Returns { krv, web, original } — null for failures.
export async function fetchAllTranslations(bookId, chapter, verseStart, verseEnd) {
  const safe = (id) =>
    fetchVerse(bookId, chapter, verseStart, verseEnd, id).catch(() => null);

  const [krv, web, original, lxx] = await Promise.all([
    safe('krv'), safe('web'), safe('original'),
    isOT(bookId) ? safe('lxx') : Promise.resolve(null),
  ]);
  return { krv, web, original, lxx };
}

// 해당 장의 총 절 수를 반환 (KRV 기준, 캐시 재사용).
export async function fetchVerseCount(bookId, chapter) {
  const bookNum = BOLLS_BOOK_MAP[bookId];
  if (!bookNum) return null;
  const verses = await fetchChapter('KRV', bookNum, chapter);
  if (!Array.isArray(verses) || !verses.length) return null;
  return verses[verses.length - 1].verse;
}
