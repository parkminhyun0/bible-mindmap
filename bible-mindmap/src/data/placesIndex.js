// 성경 지명 통합 색인
// curated(BIBLICAL_PLACE_PROFILES · 권위·한글·동명 비정) + 자동색인(places.json · OpenBible CC-BY)
// 자동색인은 좌표·등장 책을 가진 롱테일 지명을 포함. curated에 있는 지명은 curated가 우선.
import { ALL_BOOKS } from './bibleBooks.js';
import { searchStaticBiblicalPlaces, getPlacesByReference as getCuratedByReference, BIBLICAL_PLACE_PROFILES } from './bibleReferences.js';

const BASE = import.meta.env.BASE_URL;
const BOOK_KO = Object.fromEntries(ALL_BOOKS.map((b) => [b.id, b.ko]));

let _indexPromise = null;
let _auto = null; // 로드된 자동색인 배열

// curated에 이미 있는 한글 canonicalName 집합 (중복 억제용)
const CURATED_NAMES = new Set(
  Object.values(BIBLICAL_PLACE_PROFILES).map((p) => p.canonicalName),
);

function norm(s) {
  return String(s || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}
function baseName(name) {
  return String(name || '').replace(/\s+\d+$/, '').trim();
}

function toResult(p) {
  const bookTags = (p.books || []).map((id) => BOOK_KO[id] || id);
  return {
    id: p.id,
    wikidataId: p.id,
    label: p.name,
    name: p.name,
    canonicalName: baseName(p.name),
    region: bookTags[0] ? `${bookTags[0]} 등 본문 지역` : '',
    lat: p.lat,
    lon: p.lon,
    certainty: p.certainty,
    description: p.modern ? `현대: ${p.modern}` : (p.types?.join(', ') || ''),
    locationBasis: p.modern ? `OpenBible 비정 · 현대 위치: ${p.modern}` : 'OpenBible 대표 좌표',
    bibleTags: bookTags,
    books: p.books || [],
    testament: p.testament,
    source: 'OpenBible.info Geocoding (CC BY 4.0)',
    verified: true,
  };
}

export function loadPlacesIndex() {
  if (_indexPromise) return _indexPromise;
  _indexPromise = fetch(`${BASE}data/places.json`)
    .then((r) => { if (!r.ok) throw new Error(`places ${r.status}`); return r.json(); })
    .then((data) => { _auto = data.places || []; return _auto; })
    .catch(() => { _auto = []; return _auto; });
  return _indexPromise;
}

function matchesTestament(t, requested) {
  return !requested || requested === 'all' || t === 'both' || t === requested;
}

// curated + 자동색인 병합 (curated의 이름과 겹치는 자동 항목은 제외)
function mergeCuratedFirst(curatedResults, autoMatches) {
  const results = [...curatedResults];
  for (const a of autoMatches) {
    if (CURATED_NAMES.has(baseName(a.name))) continue; // curated가 우선
    results.push(toResult(a));
  }
  return results;
}

// 이름 검색 (curated 우선 + 자동색인 보완)
export async function searchPlacesCombined(query, testament = 'all') {
  const q = norm(query);
  if (!q) return [];
  const curated = searchStaticBiblicalPlaces(query, testament);
  await loadPlacesIndex();
  const auto = (_auto || []).filter((p) => (
    matchesTestament(p.testament, testament)
    && (norm(p.name).includes(q) || norm(p.nameEn).includes(q))
  ));
  return mergeCuratedFirst(curated, auto).slice(0, 40);
}

// 본문(책)·지역·키워드 기준 일괄 조회 (curated 우선 + 자동색인 보완)
export async function getPlacesByReferenceCombined(query, testament = 'all') {
  const q = norm(query);
  if (!q) return [];
  const curated = getCuratedByReference(query, testament);
  await loadPlacesIndex();
  // 책 id로도 매칭 (예: '여호수아' → Josh)
  const bookId = ALL_BOOKS.find((b) => b.ko === query.trim() || b.id.toLowerCase() === q)?.id;
  const auto = (_auto || []).filter((p) => {
    if (!matchesTestament(p.testament, testament)) return false;
    if (bookId && (p.books || []).includes(bookId)) return true;
    return norm(p.name).includes(q) || norm(p.nameEn).includes(q)
      || (p.books || []).some((id) => norm(BOOK_KO[id]).includes(q));
  });
  return mergeCuratedFirst(curated, auto);
}
