/**
 * Hebrew display helpers.
 *
 * - Lexical form: choose the main lexical morpheme only.
 * - Surface form: keep every segmented morpheme in reading order, while
 *   removing cantillation, meteg, punctuation and separators.
 *
 * Both helpers preserve consonants + niqqud. They intentionally do not guess
 * or remove an unsegmented initial letter, because that could change the word.
 */
const HEBREW_DISPLAY_RE = /[^\u05B0-\u05BC\u05C1\u05C2\u05C7\u05D0-\u05EA]/g;
const HEBREW_LETTER_RE = /[\u05D0-\u05EA]/;

function cleanHebrewSegment(segment) {
  return String(segment || '')
    .normalize('NFC')
    .replace(HEBREW_DISPLAY_RE, '');
}

export function splitHebrewMorphemes(value) {
  if (!value) return [];
  return String(value)
    .split(/[\\/]+/)
    .map(cleanHebrewSegment)
    .filter((segment) => HEBREW_LETTER_RE.test(segment));
}

export function normalizeHebrewSurfaceForm(value) {
  return splitHebrewMorphemes(value).join('');
}

export function normalizeHebrewLexicalForm(value) {
  const segments = splitHebrewMorphemes(value);
  if (!segments.length) return '';
  return segments.reduce((best, current) => {
    const bestLetters = (best.match(/[\u05D0-\u05EA]/g) || []).length;
    const currentLetters = (current.match(/[\u05D0-\u05EA]/g) || []).length;
    if (currentLetters > bestLetters) return current;
    if (currentLetters === bestLetters && current.length >= best.length) return current;
    return best;
  }, segments[0]);
}
