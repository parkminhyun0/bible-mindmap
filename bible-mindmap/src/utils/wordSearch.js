/**
 * wordSearch.js
 * 원어(Hebrew/Greek), 영어(gloss), 한글(KRV) 세 모드로 성경 전체 검색.
 *
 * - 원문/영어: lex JSON 로컬 파일 → 단어 단위 결과 (w, l, g, s, m)
 * - 한글: Bolls.life KRV API 병렬 스캔 → 절 단위 결과
 * - 절 본문 파생: KRV/ESV(Bolls.life) 및 원어(lex JSON 재구성)
 */

import { ALL_BOOKS, OT_BOOKS, NT_BOOKS, isOT } from '../data/bibleBooks';

const BASE = import.meta.env.BASE_URL;
const CONCURRENCY = 10;         // 로컬 lex JSON
const BOLLS_CONCURRENCY = 4;    // 원격 Bolls.life — 부하 완화 (rate-limit 회피)

// ── 원문 정규화: nikud·cantillation·Greek accent 제거 + 소문자화 ──────────
// Hebrew combining marks: U+0591–U+05C7 (nikud/cantillation)
// Greek combining marks (via NFD): U+0300–U+036F
// Regex uses explicit \u escapes to avoid literal-character range corruption.
const _NORM_MARKS = /[̀-֑ͯ-ׇ]/g;
export const normalizeOrig = (s) =>
  (s || '').normalize('NFD').replace(_NORM_MARKS, '').toLowerCase();

const BOLLS_BOOK_MAP = Object.fromEntries(ALL_BOOKS.map((b, i) => [b.id, i + 1]));

// ── manifest 캐시 ──────────────────────────────────────────────────────────
let _manifest = null;
async function getManifest() {
  if (_manifest) return _manifest;
  const res = await fetch(`${BASE}data/lex/manifest.json`);
  _manifest = await res.json();
  return _manifest;
}

// ── 단일 장 lex JSON 로드 (원어/영어 검색용) ─────────────────────────────
const _lexCache = new Map();
async function fetchChapterLex(bookId, chapter, signal) {
  const key = `${bookId}:${chapter}`;
  const cached = _lexCache.get(key);
  if (cached) return cached;

  const lang = isOT(bookId) ? 'hot' : 'gnt';
  const url = `${BASE}data/lex/${lang}/${bookId}/${chapter}.json`;
  const promise = fetch(url, { signal })
    .then(res => (res.ok ? res.json() : null))
    .catch(() => null);
  _lexCache.set(key, promise);
  const result = await promise;
  if (result === null) _lexCache.delete(key); // 실패 시 재시도 허용
  return result;
}

// ── HTML 태그 제거 (Bolls.life KJV 등 <S>Strong's번호</S> 태그 포함 대응) ─
const stripHtml = (str) => str
  ? str.replace(/<S>[^<]*<\/S>/gi, '')
       .replace(/<[^>]*>/g, '')
       .replace(/\s+/g, ' ')
       .trim()
  : '';

// ── Bolls.life 장 로드 — 캐시 + 백오프 3회 재시도 ────────────────────────
const _bollsCache = new Map();
async function _fetchBollsOnce(translation, bookNum, chapter, signal) {
  try {
    const res = await fetch(
      `https://bolls.life/get-text/${translation}/${bookNum}/${chapter}/`,
      { signal }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return null;
  }
}

async function fetchBollsChapter(translation, bookId, chapter, signal) {
  const bookNum = BOLLS_BOOK_MAP[bookId];
  if (!bookNum) return null;
  const key = `${translation}:${bookNum}:${chapter}`;
  const cached = _bollsCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const delays = [0, 400, 1200]; // 최대 3회 시도, 백오프
    for (const d of delays) {
      if (signal?.aborted) return null;
      if (d) await new Promise(r => setTimeout(r, d));
      const result = await _fetchBollsOnce(translation, bookNum, chapter, signal);
      if (result !== null) return result;
    }
    return null;
  })();
  _bollsCache.set(key, promise);
  const result = await promise;
  if (result === null) _bollsCache.delete(key);
  return result;
}

// ── 공통: lex 장 스캔 ─────────────────────────────────────────────────────
async function scanLexChapter(book, chapter, matchFn, signal) {
  const data = await fetchChapterLex(book.id, chapter, signal);
  if (!data) return [];

  const hits = [];
  for (const [verseKey, words] of Object.entries(data)) {
    const verse = parseInt(verseKey, 10);
    if (!Array.isArray(words)) continue;
    for (const word of words) {
      if (!word) continue;
      const field = matchFn(word);
      if (field) {
        hits.push({
          type: 'word',
          bookId: book.id,
          bookKo: book.ko,
          bookEn: book.en,
          chapter,
          verse,
          word,
          matchField: field,
        });
      }
    }
  }
  return hits;
}

// ── 원문 검색 (w: 본문형, l: 레마) — nikud/accent 무시 매칭 ──────────────
export async function searchByOriginal(query, onResult, signal) {
  const q = query.trim();
  if (!q) return;
  const qNorm = normalizeOrig(q);
  if (!qNorm) return;

  const manifest = await getManifest();
  const books = [
    ...OT_BOOKS.filter((b) => manifest.coverage.hot.includes(b.id)),
    ...NT_BOOKS.filter((b) => manifest.coverage.gnt.includes(b.id)),
  ];

  for (const book of books) {
    if (signal?.aborted) return;
    for (let ch = 1; ch <= book.chapters; ch++) {
      if (signal?.aborted) return;
      const hits = await scanLexChapter(
        book, ch,
        (w) => {
          if (w.w) {
            const clean = w.w.replace(/\//g, '');
            if (clean.includes(q) || normalizeOrig(clean).includes(qNorm)) return 'w';
          }
          if (w.l && (w.l.includes(q) || normalizeOrig(w.l).includes(qNorm))) return 'l';
          return null;
        },
        signal
      );
      if (hits.length) onResult(hits);
    }
  }
}

// ── 영어 검색 (g: English gloss) ─────────────────────────────────────────
export async function searchByEnglish(query, onResult, signal) {
  const q = query.trim().toLowerCase();
  if (!q) return;

  const manifest = await getManifest();
  const books = [
    ...OT_BOOKS.filter((b) => manifest.coverage.hot.includes(b.id)),
    ...NT_BOOKS.filter((b) => manifest.coverage.gnt.includes(b.id)),
  ];

  for (const book of books) {
    if (signal?.aborted) return;
    for (let ch = 1; ch <= book.chapters; ch++) {
      if (signal?.aborted) return;
      const hits = await scanLexChapter(
        book, ch,
        (w) => {
          if (!w.g) return null;
          const glosses = w.g.toLowerCase().split('/');
          return glosses.some((g) => g.trim().includes(q)) ? 'g' : null;
        },
        signal
      );
      if (hits.length) onResult(hits);
    }
  }
}

// ── 한글 검색 (KRV 절 본문) ──────────────────────────────────────────────
export async function searchByKorean(query, scope, onResult, signal) {
  const q = query.trim();
  if (!q) return;

  let books;
  if (scope === 'ot') books = OT_BOOKS;
  else if (scope === 'nt') books = NT_BOOKS;
  else books = ALL_BOOKS;

  for (const book of books) {
    if (signal?.aborted) return;

    for (let ch = 1; ch <= book.chapters; ch += BOLLS_CONCURRENCY) {
      if (signal?.aborted) return;

      const chNums = Array.from(
        { length: Math.min(BOLLS_CONCURRENCY, book.chapters - ch + 1) },
        (_, i) => ch + i
      );

      const settled = await Promise.allSettled(
        chNums.map((c) => fetchBollsChapter('KRV', book.id, c, signal))
      );

      if (signal?.aborted) return;
      const hits = [];
      settled.forEach((result, idx) => {
        if (result.status !== 'fulfilled' || !result.value) return;
        const chapter = chNums[idx];
        for (const v of result.value) {
          const text = stripHtml(v.text);
          if (text && text.includes(q)) {
            hits.push({
              type: 'verse',
              bookId: book.id,
              bookKo: book.ko,
              bookEn: book.en,
              chapter,
              verse: Number(v.verse),
              text,
              matchedQuery: q,
            });
          }
        }
      });

      if (hits.length) onResult(hits);
    }
  }
}

// ── 입력 문자 기반 모드 자동 감지 ────────────────────────────────────────
export function detectInputMode(query) {
  if (!query) return null;
  if (/[֐-׿יִ-ﭏ]/.test(query)) return 'original'; // Hebrew
  if (/[Ͱ-Ͽἀ-῿]/.test(query)) return 'original'; // Greek
  if (/[가-힣ᄀ-ᇿ]/.test(query)) return 'korean';   // Korean
  return 'english';
}

// ── 공통: 단어/절 결과 목록 → (bookId, chapter, verse) 유니크 참조 ───────
function collectUniqueRefs(results) {
  const seen = new Set();
  const refs = [];
  for (const r of results) {
    const key = `${r.bookId}-${r.chapter}-${r.verse}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ bookId: r.bookId, bookKo: r.bookKo, chapter: r.chapter, verse: r.verse });
  }
  return refs;
}

function groupRefsByChapter(refs) {
  const byChap = new Map();
  for (const r of refs) {
    const k = `${r.bookId}-${r.chapter}`;
    if (!byChap.has(k)) {
      byChap.set(k, { bookId: r.bookId, bookKo: r.bookKo, chapter: r.chapter, verses: new Set() });
    }
    byChap.get(k).verses.add(r.verse);
  }
  return [...byChap.values()];
}

// ── 공통: Bolls.life 번역본 절 로드 ──────────────────────────────────────
async function fetchBollsVerses(translation, wordResults, onResult, signal) {
  const refs = collectUniqueRefs(wordResults);
  const entries = groupRefsByChapter(refs);

  for (let i = 0; i < entries.length; i += BOLLS_CONCURRENCY) {
    if (signal?.aborted) return;
    const batch = entries.slice(i, i + BOLLS_CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(async ({ bookId, bookKo, chapter, verses }) => {
      const chData = await fetchBollsChapter(translation, bookId, chapter, signal);
      if (!chData) return [];
      return chData
        .filter(v => verses.has(Number(v.verse)))
        .map(v => ({
          type: 'verse',
          bookId, bookKo, chapter,
          verse: Number(v.verse),
          text: stripHtml(v.text),
          matchedQuery: '',
        }));
    }));
    if (signal?.aborted) return;
    const hits = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    if (hits.length) onResult(hits);
  }
}

/**
 * 원문/영어 단어 결과 → KRV 한글 본문 파생.
 */
export const fetchKRVVerses = (wordResults, onResult, signal) =>
  fetchBollsVerses('KRV', wordResults, onResult, signal);

/**
 * 원문/영어 단어 결과 → ESV 영어 본문 파생.
 */
export const fetchESVVerses = (wordResults, onResult, signal) =>
  fetchBollsVerses('ESV', wordResults, onResult, signal);

/**
 * 원문 단어 결과 → 렉시콘 JSON에서 히브리어/헬라어 절 본문 재구성.
 */
export async function fetchOrigLangVerses(wordResults, onResult, signal) {
  const refs = collectUniqueRefs(wordResults);
  const entries = groupRefsByChapter(refs);

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    if (signal?.aborted) return;
    const batch = entries.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(async ({ bookId, bookKo, chapter, verses }) => {
      const data = await fetchChapterLex(bookId, chapter, signal);
      if (!data) return [];
      const results = [];
      for (const v of verses) {
        const words = data[v] ?? data[String(v)] ?? [];
        const text = words.map(w => w.w?.replace(/\//g, '') || '').filter(Boolean).join(' ');
        if (text) results.push({ type: 'verse', bookId, bookKo, chapter, verse: Number(v), text });
      }
      return results;
    }));
    if (signal?.aborted) return;
    const hits = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    if (hits.length) onResult(hits);
  }
}

/**
 * 한글 절 결과 → lexicon 빈도 분석으로 원문 단어 파생.
 * 상위 빈도 내용어(Strong's) 기반, 기능어(접속사·전치사·관사·불변사·접미사) 제외.
 */
export async function deriveOriginalFromKorean(verseResults, onResult, signal) {
  const SAMPLE = 40;
  const sample = verseResults.slice(0, SAMPLE);

  const freq = new Map();
  await Promise.all(sample.map(async r => {
    if (signal?.aborted) return;
    const data = await fetchChapterLex(r.bookId, r.chapter, signal);
    if (!data) return;
    const words = data[r.verse] ?? data[String(r.verse)] ?? [];
    for (const w of words) {
      if (!w?.s) continue;
      const posCode = (w.m || '')[1] || '';
      if ('CRTXS'.includes(posCode)) continue;
      if (!freq.has(w.s)) freq.set(w.s, { word: w, count: 0 });
      freq.get(w.s).count++;
    }
  }));

  if (!freq.size) return;

  const topSet = new Set(
    [...freq.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([s]) => s)
  );

  const refs = collectUniqueRefs(verseResults);
  const entries = groupRefsByChapter(refs);

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    if (signal?.aborted) return;
    const batch = entries.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(async ({ bookId, bookKo, chapter, verses }) => {
      const data = await fetchChapterLex(bookId, chapter, signal);
      if (!data) return [];
      const hits = [];
      for (const v of verses) {
        const words = data[v] ?? data[String(v)] ?? [];
        for (const w of words) {
          if (w?.s && topSet.has(w.s)) {
            hits.push({ type: 'word', bookId, bookKo, bookEn: bookKo, chapter, verse: v, word: w, matchField: 'derived' });
          }
        }
      }
      return hits;
    }));
    if (signal?.aborted) return;
    const hits = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    if (hits.length) onResult(hits);
  }
}
