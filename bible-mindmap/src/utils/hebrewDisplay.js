const STEPBIBLE_MORPHEME_SEPARATOR = /\//g;
const STEPBIBLE_JOIN_MARKER = /\\/g;
const HEBREW_MAQAF = '\u05be';

export function normalizeHebrewDisplayWord(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(STEPBIBLE_MORPHEME_SEPARATOR, '')
    .replace(STEPBIBLE_JOIN_MARKER, '');
}

export function normalizeHebrewLexiconWords(words) {
  if (!Array.isArray(words)) return words;
  return words.map((word) => {
    if (!word || typeof word !== 'object') return word;
    const normalizedWord = normalizeHebrewDisplayWord(word.w);
    const displayJoinNext = typeof normalizedWord === 'string' && normalizedWord.endsWith(HEBREW_MAQAF);
    if (normalizedWord === word.w && !displayJoinNext) return word;
    return {
      ...word,
      w: normalizedWord,
      ...(displayJoinNext ? { displayJoinNext: true } : {}),
    };
  });
}

export function normalizeHebrewLexiconChapter(chapterData) {
  if (!chapterData || typeof chapterData !== 'object') return chapterData;
  return Object.fromEntries(
    Object.entries(chapterData).map(([verse, words]) => [
      verse,
      Array.isArray(words) ? normalizeHebrewLexiconWords(words) : words,
    ]),
  );
}

export function joinHebrewDisplayWords(words) {
  if (!Array.isArray(words)) return '';
  const normalizedWords = normalizeHebrewLexiconWords(words);
  let text = '';
  let joinNext = false;
  for (const word of normalizedWords) {
    const displayWord = typeof word?.w === 'string' ? word.w : '';
    if (!displayWord) continue;
    if (text && !joinNext) text += ' ';
    text += displayWord;
    joinNext = Boolean(word.displayJoinNext);
  }
  return text.trim();
}
