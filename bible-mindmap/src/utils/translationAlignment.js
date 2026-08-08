import { normalizeStrongId, validateTextSpan } from '../data/translationAlignmentContract.js';

const ORIGINAL_MARK = /[\u0300-\u036f\u0591-\u05c7]/u;
const HANGUL = /[가-힣]/u;
const ENGLISH_TOKEN = /[A-Za-z]+(?:[’'][A-Za-z]+)*/g;

const KOREAN_PARTICLES = Object.freeze([
  '에게서부터', '으로부터', '로부터', '에게서는', '한테서는', '께서는',
  '으로써', '으로서', '에게서', '한테서', '에서는', '에게도', '한테도',
  '께서', '에게', '한테', '께', '으로', '로서', '로써', '에서', '이랑',
  '과', '와', '랑', '의', '에', '이', '가', '을', '를', '은', '는',
  '도', '만', '까지', '부터', '마다', '조차', '마저', '처럼', '보다', '밖에',
].sort((a, b) => b.length - a.length));

const KOREAN_AUXILIARY_PARTICLES = new Set(['은', '는', '도', '만', '까지', '부터', '조차', '마저']);

function uniqueStrings(values) {
  return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))];
}

export function mergeSpans(spans) {
  const sorted = (spans || [])
    .filter(span => validateTextSpan(span).length === 0)
    .map(span => ({ start: span.start, end: span.end }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const span of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || span.start > previous.end) merged.push({ ...span });
    else previous.end = Math.max(previous.end, span.end);
  }
  return merged;
}

function normalizeOriginalWithMap(text) {
  let normalized = '';
  const map = [];
  for (let index = 0; index < String(text || '').length;) {
    const codePoint = text.codePointAt(index);
    const character = String.fromCodePoint(codePoint);
    const nextIndex = index + character.length;
    for (const unit of character.normalize('NFD')) {
      if (ORIGINAL_MARK.test(unit) || unit === '/') continue;
      normalized += unit.toLowerCase();
      map.push({ start: index, end: nextIndex });
    }
    index = nextIndex;
  }
  return { normalized, map };
}

export function normalizeOriginal(text) {
  return normalizeOriginalWithMap(text).normalized;
}

export function findOriginalSpans(text, candidates) {
  if (!text) return [];
  const haystack = normalizeOriginalWithMap(text);
  const spans = [];
  for (const candidate of uniqueStrings(candidates)) {
    const needle = normalizeOriginal(candidate);
    if (!needle) continue;
    let from = 0;
    while (from <= haystack.normalized.length - needle.length) {
      const found = haystack.normalized.indexOf(needle, from);
      if (found < 0) break;
      const first = haystack.map[found];
      const last = haystack.map[found + needle.length - 1];
      if (first && last) spans.push({ start: first.start, end: last.end });
      from = found + Math.max(needle.length, 1);
    }
  }
  return mergeSpans(spans);
}

function normalizeEnglishToken(token) {
  return String(token || '')
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/(?:'s|s')$/, '');
}

function englishInflectionMatches(token, base) {
  const normalizedToken = normalizeEnglishToken(token);
  const normalizedBase = normalizeEnglishToken(base);
  if (!normalizedToken || !normalizedBase) return false;
  if (normalizedToken === normalizedBase) return true;
  if (normalizedBase.length < 3 || /[^a-z]/.test(normalizedBase)) return false;

  const forms = new Set([
    `${normalizedBase}s`,
    `${normalizedBase}ed`,
    `${normalizedBase}ing`,
  ]);
  if (/(?:s|x|z|ch|sh)$/.test(normalizedBase)) forms.add(`${normalizedBase}es`);
  if (normalizedBase.endsWith('e')) {
    forms.add(`${normalizedBase}d`);
    forms.add(`${normalizedBase.slice(0, -1)}ing`);
  }
  if (/[^aeiou]y$/.test(normalizedBase)) {
    forms.add(`${normalizedBase.slice(0, -1)}ies`);
    forms.add(`${normalizedBase.slice(0, -1)}ied`);
  }
  return forms.has(normalizedToken);
}

export function splitGlossCandidates(value) {
  if (Array.isArray(value)) return uniqueStrings(value.flatMap(splitGlossCandidates));
  return uniqueStrings(String(value || '').split(/[\/,;·|]/u));
}

export function findEnglishSpans(text, candidates) {
  if (!text) return [];
  const spans = [];
  const candidateList = uniqueStrings(candidates);
  const singleWords = candidateList.filter(candidate => /^[A-Za-z]+(?:[’'][A-Za-z]+)?$/.test(candidate));
  const phrases = candidateList.filter(candidate => !singleWords.includes(candidate));

  for (const match of text.matchAll(ENGLISH_TOKEN)) {
    if (singleWords.some(candidate => englishInflectionMatches(match[0], candidate))) {
      spans.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  const lower = text.toLowerCase();
  for (const phrase of phrases) {
    const needle = phrase.toLowerCase();
    if (!needle) continue;
    let from = 0;
    while (from <= lower.length - needle.length) {
      const found = lower.indexOf(needle, from);
      if (found < 0) break;
      const before = found > 0 ? lower[found - 1] : '';
      const after = lower[found + needle.length] || '';
      if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) spans.push({ start: found, end: found + needle.length });
      from = found + Math.max(needle.length, 1);
    }
  }
  return mergeSpans(spans);
}

function consumeKoreanParticles(suffix) {
  if (!suffix) return 0;
  let rest = suffix;
  let consumed = 0;
  let segments = 0;

  if (rest.startsWith('들')) {
    consumed += 1;
    rest = rest.slice(1);
  }

  while (rest && segments < 3) {
    const particle = KOREAN_PARTICLES.find(item => rest.startsWith(item));
    if (!particle) break;
    if (segments > 0 && !KOREAN_AUXILIARY_PARTICLES.has(particle)) break;
    consumed += particle.length;
    rest = rest.slice(particle.length);
    segments += 1;
  }
  return rest.length === 0 ? consumed : 0;
}

export function extractKoreanCandidates(dictionaryEntry, extraCandidates = []) {
  const raw = [];
  if (dictionaryEntry) {
    raw.push(...splitGlossCandidates(dictionaryEntry.koreanCandidates || []));
    raw.push(...splitGlossCandidates(dictionaryEntry.glossKo || []));
  }
  raw.push(...splitGlossCandidates(extraCandidates));
  return uniqueStrings(raw)
    .map(value => value.replace(/\([^)]*\)/g, '').trim())
    .filter(value => value && /[가-힣]/.test(value));
}

export function findKoreanSpans(text, candidates) {
  if (!text) return [];
  const spans = [];
  for (const candidate of uniqueStrings(candidates).sort((a, b) => b.length - a.length)) {
    let from = 0;
    while (from <= text.length - candidate.length) {
      const found = text.indexOf(candidate, from);
      if (found < 0) break;
      const before = found > 0 ? text[found - 1] : '';
      if (HANGUL.test(before)) {
        from = found + 1;
        continue;
      }

      let wordEnd = found + candidate.length;
      while (wordEnd < text.length && HANGUL.test(text[wordEnd])) wordEnd += 1;
      const suffix = text.slice(found + candidate.length, wordEnd);
      if (!suffix) {
        spans.push({ start: found, end: found + candidate.length });
      } else {
        const consumed = consumeKoreanParticles(suffix);
        if (consumed === suffix.length) spans.push({ start: found, end: wordEnd });
      }
      from = found + Math.max(candidate.length, 1);
    }
  }
  return mergeSpans(spans);
}

function spansFromAlignmentRecord(alignmentRecord, language, text) {
  const target = alignmentRecord?.targets?.[language];
  if (!target || !Array.isArray(target.spans)) return [];
  if (typeof target.text === 'string' && target.text !== text) return [];
  return mergeSpans(target.spans.filter(span => validateTextSpan(span, text.length).length === 0));
}

export function resolveHighlightSpans({
  text,
  language,
  entry = {},
  dictionaryEntry = null,
  userQuery = '',
  alignmentRecord = null,
}) {
  if (!text) return { spans: [], status: 'missing-text', source: 'none', candidates: [] };

  const exactSpans = spansFromAlignmentRecord(alignmentRecord, language, text);
  if (exactSpans.length) {
    return { spans: exactSpans, status: alignmentRecord.status || 'verified', source: 'alignment-record', candidates: [] };
  }

  if (language === 'original') {
    const candidates = uniqueStrings([entry.w?.replace(/\//g, ''), userQuery, entry.l]);
    const spans = findOriginalSpans(text, candidates);
    return { spans, status: spans.length ? 'auto' : 'unresolved', source: 'original-surface', candidates };
  }

  if (language === 'english') {
    const candidates = uniqueStrings([
      ...splitGlossCandidates(dictionaryEntry?.englishCandidates || []),
      ...splitGlossCandidates(entry.g || []),
      userQuery,
    ]);
    const spans = findEnglishSpans(text, candidates);
    return { spans, status: spans.length ? 'auto' : 'unresolved', source: 'dictionary-gloss', candidates };
  }

  if (language === 'korean') {
    const candidates = extractKoreanCandidates(dictionaryEntry, userQuery ? [userQuery] : []);
    const spans = findKoreanSpans(text, candidates);
    return { spans, status: spans.length ? 'auto' : 'unresolved', source: 'dictionary-korean', candidates };
  }

  return { spans: [], status: 'unsupported-language', source: 'none', candidates: [] };
}

export { normalizeStrongId };
