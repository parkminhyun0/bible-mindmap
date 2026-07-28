import { ALL_BOOKS, KO_ABBR } from '../data/bibleBooks';

const COMBINED_BOOK_ALIASES = {
  '사무엘상·하': '사무엘상',
  '열왕기상·하': '열왕기상',
  '역대상·하': '역대상',
  '고린도전·후서': '고린도전서',
  '데살로니가전·후서': '데살로니가전서',
  '디모데전·후서': '디모데전서',
  '베드로전·후서': '베드로전서',
  '요한1·2·3서': '요한일서',
};

function resolveBook(bookName) {
  const normalizedName = COMBINED_BOOK_ALIASES[bookName] || bookName;
  const abbreviationId = KO_ABBR[normalizedName];
  return ALL_BOOKS.find(
    (book) =>
      book.ko === normalizedName ||
      book.en.toLowerCase() === normalizedName.toLowerCase() ||
      book.id === normalizedName ||
      book.id === abbreviationId,
  );
}

/**
 * 배경 카드의 폭넓은 본문 태그를 본문 팝업의 시작 위치로 변환한다.
 * 예: "창세기 14:18-20" → Gen 14:18, "창세기 11-23" → Gen 11:1
 */
export function parseBackgroundBibleReference(tag) {
  if (!tag || typeof tag !== 'string') return null;

  const clean = tag
    .replace(/[[({][^\])}]*[\])}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const bookNames = [
    ...Object.keys(COMBINED_BOOK_ALIASES),
    ...ALL_BOOKS.flatMap((book) => [book.ko, book.en, book.id]),
    ...Object.keys(KO_ABBR),
  ].sort((a, b) => b.length - a.length);

  const matchedName = bookNames.find(
    (name) => clean === name || clean.startsWith(`${name} `),
  );
  if (!matchedName) return null;

  const book = resolveBook(matchedName);
  if (!book) return null;

  const remainder = clean.slice(matchedName.length).trim();
  const chapterMatch = remainder.match(/^(\d+)(?:\s*-\s*(\d+))?/);
  const verseMatch = remainder.match(/^(\d+):(\d+)(?:\s*-\s*(\d+))?/);
  const chapter = Math.min(Math.max(Number(verseMatch?.[1] || chapterMatch?.[1] || 1), 1), book.chapters);
  const chapterEnd = Math.min(
    Math.max(Number(verseMatch?.[1] || chapterMatch?.[2] || chapter), chapter),
    book.chapters,
  );
  const verse = Math.max(Number(verseMatch?.[2] || 1), 1);
  const verseEnd = Math.max(Number(verseMatch?.[3] || verse), verse);

  return {
    bookId: book.id,
    ch: chapter,
    chapterEnd,
    verse,
    verseEnd,
    reference: tag,
  };
}
