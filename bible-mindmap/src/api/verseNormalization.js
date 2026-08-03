// 앱의 구절 선택 기준은 개역한글의 정경 장·절 번호다.
// 역본별 장절 배치 차이는 이 계층에서만 정규화하고 UI에는 동일한 참조를 제공한다.

export const WEB_CANONICAL_ALIASES = Object.freeze([
  Object.freeze({
    target: Object.freeze({ bookId: 'Rom', chapter: 16, verseStart: 25, verseEnd: 27 }),
    source: Object.freeze({ bookId: 'Rom', chapter: 14, verseStart: 24, verseEnd: 26 }),
    reason: 'WEB는 로마서 송영을 14:24-26에 배치하며, 개역한글/TR 체계는 16:25-27에 배치한다.',
  }),
]);

export function normalizeVerseRows(rawRows) {
  if (!Array.isArray(rawRows)) return [];
  const byVerse = new Map();
  for (const raw of rawRows) {
    const verse = Number(raw?.verse);
    const text = String(raw?.text ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!Number.isInteger(verse) || verse < 1 || !text) continue;
    if (!byVerse.has(verse)) byVerse.set(verse, { verse, text });
  }
  return [...byVerse.values()].sort((a, b) => a.verse - b.verse);
}

export function mergeVerseRows(...collections) {
  const byVerse = new Map();
  for (const rows of collections) {
    for (const row of normalizeVerseRows(rows)) {
      if (!byVerse.has(row.verse)) byVerse.set(row.verse, row);
    }
  }
  return [...byVerse.values()].sort((a, b) => a.verse - b.verse);
}

export function selectVerseRows(rows, verseStart, verseEnd) {
  return normalizeVerseRows(rows)
    .filter((row) => row.verse >= verseStart && row.verse <= verseEnd);
}

export function missingVerseNumbers(rows, verseStart, verseEnd) {
  const present = new Set(selectVerseRows(rows, verseStart, verseEnd).map((row) => row.verse));
  const missing = [];
  for (let verse = verseStart; verse <= verseEnd; verse += 1) {
    if (!present.has(verse)) missing.push(verse);
  }
  return missing;
}

export function aliasesForRange(bookId, chapter, verseStart, verseEnd) {
  return WEB_CANONICAL_ALIASES.filter((alias) => (
    alias.target.bookId === bookId
    && alias.target.chapter === chapter
    && alias.target.verseEnd >= verseStart
    && alias.target.verseStart <= verseEnd
  ));
}

export function remapAliasRows(sourceRows, alias) {
  const offset = alias.target.verseStart - alias.source.verseStart;
  return selectVerseRows(sourceRows, alias.source.verseStart, alias.source.verseEnd)
    .map((row) => ({ verse: row.verse + offset, text: row.text }));
}

export function assertVerseCoverage(rows, verseStart, verseEnd, label = '본문') {
  const missing = missingVerseNumbers(rows, verseStart, verseEnd);
  if (missing.length) {
    const error = new Error(`${label} 누락 절: ${missing.join(', ')}`);
    error.code = 'VERSE_COVERAGE_INCOMPLETE';
    error.missingVerses = missing;
    throw error;
  }
  return selectVerseRows(rows, verseStart, verseEnd);
}
