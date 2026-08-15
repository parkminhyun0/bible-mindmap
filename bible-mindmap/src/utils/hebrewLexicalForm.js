/**
 * Normalize a Hebrew display token to its lexical morpheme while preserving
 * consonants + niqqud. Cantillation, meteg, punctuation and segment separators
 * are removed. For morph-segmented tokens the segment with the most Hebrew
 * consonants wins; ties prefer the later segment so prefixes do not become the
 * dictionary headword.
 */
export function normalizeHebrewLexicalForm(value) {
  if (!value) return '';
  const segments = String(value)
    .normalize('NFC')
    .split(/[\\/]+/)
    .map((segment) => segment.replace(/[^\u05B0-\u05BC\u05C1\u05C2\u05C7\u05D0-\u05EA]/g, ''))
    .filter((segment) => /[\u05D0-\u05EA]/.test(segment));

  if (!segments.length) return '';
  return segments.reduce((best, current) => {
    const bestLetters = (best.match(/[\u05D0-\u05EA]/g) || []).length;
    const currentLetters = (current.match(/[\u05D0-\u05EA]/g) || []).length;
    if (currentLetters > bestLetters) return current;
    if (currentLetters === bestLetters && current.length >= best.length) return current;
    return best;
  }, segments[0]);
}
