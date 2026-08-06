// 성경 지명 통합 색인
// 1) curated(BIBLICAL_PLACE_PROFILES): 직접 검토된 한글명·위치·동명이소 설명
// 2) biblical-places-db.json: OpenBible CC BY 4.0 기반 66권 전체 지명 DB
// 3) places.json: 구버전/오프라인 배포 호환용 fallback
//
// 원칙: curated를 우선하되, 동명이소/이명/좌표 미확정 지명을 숨기지 않는다.
import { ALL_BOOKS } from './bibleBooks.js';
import { DATA_BASE } from '../config/dataBase.js';
import {
  searchStaticBiblicalPlaces,
  getPlacesByReference as getCuratedByReference,
  BIBLICAL_PLACE_PROFILES,
} from './bibleReferences.js';

const BASE = import.meta.env.BASE_URL;
const BOOK_KO = Object.fromEntries(ALL_BOOKS.map((b) => [b.id, b.ko]));

let _indexPromise = null;
let _auto = null;
let _meta = null;
let _duplicateGroups = [];
let _nameCollisionGroups = [];
let _sourceMode = 'unloaded';

const CURATED_NAMES = new Set(
  Object.values(BIBLICAL_PLACE_PROFILES).map((p) => p.canonicalName),
);

function norm(s) {
  return String(s || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}
function baseName(name) {
  return String(name || '').replace(/\s+\d+$/, '').trim();
}
function bestCoordinateCandidate(p) {
  return (p.locationCandidates || []).find((c) => c.lat != null && c.lon != null) || null;
}
function certaintyFromCandidate(candidate) {
  const score = candidate?.score;
  if (!Number.isFinite(score)) return 'disputed';
  if (score >= 700) return 'confirmed';
  if (score >= 350) return 'probable';
  return 'disputed';
}
function matchesTestament(t, requested) {
  return !requested || requested === 'all' || t === 'both' || t === requested;
}

function normalizeLegacyPlace(p) {
  return {
    ...p,
    nameEn: p.nameEn || p.name,
    nameKo: p.ko || null,
    aliases: p.aliases || [],
    verseRefs: p.verseRefs || [],
    occurrenceCount: p.occurrenceCount ?? p.refs ?? 0,
    hasCoordinates: p.lat != null && p.lon != null,
    locationCandidates: p.lat != null && p.lon != null
      ? [{ lat: p.lat, lon: p.lon, description: p.modern || '', score: null }]
      : [],
    isHomonym: Boolean(p.isHomonym),
    duplicateGroup: p.duplicateGroup || null,
    duplicateIndex: p.duplicateIndex || null,
    samePlaceAs: p.samePlaceAs || [],
    _legacy: true,
  };
}

function normalizeFullPlace(p) {
  return { ...p, _legacy: false };
}

function toResult(p) {
  const coordinate = bestCoordinateCandidate(p);
  const bookTags = (p.books || []).map((id) => BOOK_KO[id] || id);
  const name = p.nameKo || p.ko || p.name || p.nameEn;
  const modern = coordinate?.description || p.modern || '';
  const certainty = p.certainty || certaintyFromCandidate(coordinate);
  const homonymLabel = p.isHomonym
    ? `동명이소${p.duplicateIndex ? ` ${p.duplicateIndex}` : ''}`
    : '';

  return {
    id: p.id,
    wikidataId: p.id,
    label: name,
    name,
    nameEn: p.nameEn || name,
    canonicalName: baseName(name),
    region: bookTags.length ? `${bookTags.slice(0, 3).join(' · ')}${bookTags.length > 3 ? ' 외' : ''}` : '',
    lat: coordinate?.lat ?? p.lat ?? null,
    lon: coordinate?.lon ?? p.lon ?? null,
    certainty,
    description: modern || (p.types?.join(', ') || ''),
    locationBasis: coordinate
      ? `OpenBible 식별 후보${Number.isFinite(coordinate.score) ? ` · score ${coordinate.score}` : ''}`
      : '성경 본문에는 등장하지만 현재 DB에서 좌표를 확정하지 않음',
    bibleTags: bookTags,
    books: p.books || [],
    testament: p.testament,
    source: p._legacy ? 'OpenBible 지명 색인 (호환 DB)' : 'OpenBible Bible-Geocoding-Data (CC BY 4.0)',
    verified: true,

    // DB v2 확장 필드 — PC/태블릿/모바일 공통 소비
    aliases: p.aliases || [],
    verseRefs: p.verseRefs || [],
    occurrenceCount: p.occurrenceCount ?? p.refs ?? 0,
    firstRef: p.firstRef || p.verseRefs?.[0] || null,
    types: p.types || [],
    hasCoordinates: Boolean(p.hasCoordinates ?? coordinate),
    locationCandidates: p.locationCandidates || [],
    isHomonym: Boolean(p.isHomonym),
    homonymLabel,
    duplicateGroup: p.duplicateGroup || null,
    duplicateIndex: p.duplicateIndex || null,
    samePlaceAs: p.samePlaceAs || [],
    koReviewStatus: p.koReviewStatus || (p.ko ? 'curated' : 'unknown'),
    sourceMode: p._legacy ? 'legacy' : 'full',
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

export function loadPlacesIndex() {
  if (_indexPromise) return _indexPromise;
  _indexPromise = fetchJson(`${DATA_BASE}data/biblical-places-db.json`)
    .then((data) => {
      _auto = (data.places || []).map(normalizeFullPlace);
      _meta = data.meta || null;
      _duplicateGroups = data.duplicateGroups || [];
      _nameCollisionGroups = data.nameCollisionGroups || [];
      _sourceMode = 'full';
      return _auto;
    })
    .catch(() => fetchJson(`${BASE}data/places.json`)
      .then((data) => {
        _auto = (data.places || []).map(normalizeLegacyPlace);
        _meta = {
          schemaVersion: 'legacy',
          stats: { biblicalPlaceCount: _auto.length },
          source: { title: data.source || 'OpenBible legacy places index' },
        };
        _duplicateGroups = [];
        _nameCollisionGroups = [];
        _sourceMode = 'legacy';
        return _auto;
      }))
    .catch(() => {
      _auto = [];
      _meta = null;
      _sourceMode = 'error';
      return _auto;
    });
  return _indexPromise;
}

export async function getPlacesIndexMeta() {
  await loadPlacesIndex();
  return {
    mode: _sourceMode,
    meta: _meta,
    count: _auto?.length || 0,
    duplicateGroups: _duplicateGroups,
    nameCollisionGroups: _nameCollisionGroups,
  };
}

function isSameAsCurated(autoPlace) {
  if (autoPlace.isHomonym || autoPlace.duplicateGroup) return false;
  const autoName = autoPlace.nameKo || autoPlace.ko || autoPlace.name || autoPlace.nameEn;
  return CURATED_NAMES.has(baseName(autoName));
}

function mergeCuratedFirst(curatedResults, autoMatches) {
  const results = [...curatedResults];
  const usedIds = new Set(results.map((r) => r.id || r.wikidataId).filter(Boolean));
  for (const a of autoMatches) {
    if (usedIds.has(a.id)) continue;
    // 일반 중복은 curated 우선. 동명이소는 서로 다른 장소이므로 반드시 유지한다.
    if (isSameAsCurated(a)) continue;
    results.push(toResult(a));
  }
  return results;
}

function matchesPlaceQuery(p, q) {
  if (norm(p.nameKo).includes(q) || norm(p.ko).includes(q)) return true;
  if (norm(p.name).includes(q) || norm(p.nameEn).includes(q)) return true;
  if ((p.aliases || []).some((alias) => norm(alias).includes(q))) return true;
  if ((p.verseRefs || []).some((ref) => norm(ref).includes(q))) return true;
  return false;
}

// 이름·이명·OSIS 참조 검색 (curated 우선 + 전체 DB 보완)
export async function searchPlacesCombined(query, testament = 'all') {
  const q = norm(query);
  if (!q) return [];
  const curated = searchStaticBiblicalPlaces(query, testament);
  await loadPlacesIndex();
  const auto = (_auto || []).filter((p) => (
    matchesTestament(p.testament, testament) && matchesPlaceQuery(p, q)
  ));
  return mergeCuratedFirst(curated, auto).slice(0, 80);
}

// 본문(책)·지역·이명·키워드 기준 일괄 조회
export async function getPlacesByReferenceCombined(query, testament = 'all') {
  const q = norm(query);
  if (!q) return [];
  const curated = getCuratedByReference(query, testament);
  await loadPlacesIndex();
  const bookId = ALL_BOOKS.find((b) => b.ko === query.trim() || b.id.toLowerCase() === q)?.id;
  const auto = (_auto || []).filter((p) => {
    if (!matchesTestament(p.testament, testament)) return false;
    if (bookId && (p.books || []).includes(bookId)) return true;
    if (matchesPlaceQuery(p, q)) return true;
    return (p.books || []).some((id) => norm(BOOK_KO[id]).includes(q));
  });
  return mergeCuratedFirst(curated, auto);
}
