import { ALL_BOOKS, isOT } from '../data/bibleBooks.js';
import { normalizeStrongId } from '../data/translationAlignmentContract.js';
import { fetchData } from '../config/dataBase.js';
import {
  normalizeAlignmentTokenId,
  resolveAlignmentPayload,
} from './alignmentLoaderCore.js';

const MANIFEST_PATH = 'data/alignment/manifest.json';
const jsonCache = new Map();

function cleanSurface(value) {
  return String(value || '').replace(/\//g, '');
}

function bookDefinition(bookId) {
  const raw = String(bookId || '').toLowerCase();
  return ALL_BOOKS.find((book) => book.id.toLowerCase() === raw) || null;
}

async function fetchJson(path, signal) {
  if (!path) return null;
  const cacheKey = String(path);
  if (!signal && jsonCache.has(cacheKey)) return jsonCache.get(cacheKey);

  const request = fetchData(cacheKey, { signal })
    .then((response) => (response.ok ? response.json() : null))
    .catch((error) => {
      if (error?.name === 'AbortError') throw error;
      return null;
    });

  if (!signal) jsonCache.set(cacheKey, request);
  const value = await request;
  if (!signal && value == null) jsonCache.delete(cacheKey);
  return value;
}

function wordSignature(word = {}) {
  return [
    normalizeStrongId(word.s),
    cleanSurface(word.w),
    String(word.l || ''),
    String(word.m || ''),
  ].join('|');
}

export function occurrenceOrdinalForRow(row, rows = []) {
  const index = rows.indexOf(row);
  if (index <= 0) return 0;
  const reference = `${row?.bookId}|${row?.chapter}|${row?.verse}|${wordSignature(row?.word)}`;
  let ordinal = 0;
  for (let i = 0; i < index; i += 1) {
    const candidate = rows[i];
    const key = `${candidate?.bookId}|${candidate?.chapter}|${candidate?.verse}|${wordSignature(candidate?.word)}`;
    if (key === reference) ordinal += 1;
  }
  return ordinal;
}

export async function resolveVerseTokenId({
  bookId,
  chapter,
  verse,
  word,
  occurrenceOrdinal = 0,
  signal,
}) {
  const book = bookDefinition(bookId);
  if (!book || !Number.isInteger(Number(chapter)) || !Number.isInteger(Number(verse))) return null;
  const language = isOT(book.id) ? 'hot' : 'gnt';
  const chapterPayload = await fetchJson(`data/lex/${language}/${book.id}/${Number(chapter)}.json`, signal);
  const words = chapterPayload?.[String(Number(verse))];
  if (!Array.isArray(words)) return null;

  const expected = wordSignature(word);
  const matchingIndexes = [];
  words.forEach((candidate, index) => {
    if (wordSignature(candidate) === expected) matchingIndexes.push(index);
  });
  const tokenIndex = matchingIndexes[occurrenceOrdinal] ?? matchingIndexes[0];
  if (!Number.isInteger(tokenIndex)) return null;

  const manifest = await fetchJson(MANIFEST_PATH, signal);
  const bookConfig = manifest?.books?.[book.id] || null;
  const slug = String(bookConfig?.slug || book.en || book.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}.${Number(chapter)}.${Number(verse)}.${language}.${tokenIndex}`;
}

function configuredPath(entry, chapter) {
  if (!entry) return null;
  if (typeof entry === 'string') return entry.replace('{chapter}', String(chapter));
  if (entry.path) return entry.path.replace('{chapter}', String(chapter));
  if (entry.pathTemplate) return entry.pathTemplate.replace('{chapter}', String(chapter));
  return null;
}

export async function loadVerseAlignment({
  bookId,
  chapter,
  verse,
  tokenId,
  sourceVersions = {},
  currentSurface,
  targetLanguage = 'korean',
  verseText,
  signal,
}) {
  const normalizedTokenId = normalizeAlignmentTokenId(tokenId);
  if (!normalizedTokenId) return { status: 'missing-token-id', record: null, target: null };

  const manifest = await fetchJson(MANIFEST_PATH, signal);
  if (!manifest) return { status: 'missing-manifest', record: null, target: null };

  const override = manifest.overrides?.[normalizedTokenId] || null;
  const book = bookDefinition(bookId);
  const bookConfig = book ? manifest.books?.[book.id] : null;
  const chapterEntry = bookConfig?.translations?.krv || bookConfig?.alignment || null;
  const sourcePath = configuredPath(override || chapterEntry, Number(chapter));
  if (!sourcePath) return { status: 'missing-path', record: null, target: null };

  const payload = await fetchJson(sourcePath, signal);
  if (!payload) return { status: 'missing-file', sourcePath, record: null, target: null };

  const configuredVersions = override?.currentSourceVersions
    || chapterEntry?.currentSourceVersions
    || bookConfig?.currentSourceVersions
    || {};
  const currentSourceVersions = { ...configuredVersions, ...sourceVersions };
  const result = resolveAlignmentPayload({
    payload,
    tokenId: normalizedTokenId,
    targetLanguage,
    currentSurface,
    currentSourceVersions,
    verseText,
  });

  return {
    ...result,
    tokenId: normalizedTokenId,
    sourcePath,
    bookId: book?.id || bookId,
    chapter: Number(chapter),
    verse: Number(verse),
  };
}

export function clearAlignmentLoaderCache() {
  jsonCache.clear();
}
