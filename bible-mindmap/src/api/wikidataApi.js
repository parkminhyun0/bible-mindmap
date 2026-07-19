import { getStaticPlacePersons } from '../data/bibleReferences.js';

const BASE = 'https://www.wikidata.org/w/api.php';
const _cache = new Map();

// wbgetentities/wbsearchentities 공통 fetcher
async function apiFetch(params) {
  const url = new URL(BASE);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const key = url.toString();
  if (_cache.has(key)) return _cache.get(key);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const data = await res.json();
  _cache.set(key, data);
  return data;
}

// Wikidata time 문자열 → 표시용 연대
// wbgetentities: { time: "-1040-00-00T00:00:00Z", precision: 9 }
// wbsearchentities 경유 배치: 동일 형식
function parseTime(timeObj) {
  if (!timeObj) return null;
  const { time, precision } = timeObj;
  if (!time) return null;
  const bc = time.startsWith('-');
  const abs = bc ? time.slice(1) : time;
  const year = parseInt(abs.split('-')[0], 10);
  if (!year || isNaN(year)) return null;
  const approx = precision <= 9 ? ' (추정)' : '';
  return bc ? `BC ${year}${approx}` : `AD ${year}${approx}`;
}

function claimTimeYear(claims, pid) {
  const val = claims?.[pid]?.[0]?.mainsnak?.datavalue?.value;
  if (!val?.time) return null;
  const bc = val.time.startsWith('-');
  const abs = bc ? val.time.slice(1) : val.time;
  const year = parseInt(abs.split('-')[0], 10);
  return bc ? -year : year;
}

function claimValue(claims, pid) {
  return claims?.[pid]?.[0]?.mainsnak?.datavalue?.value ?? null;
}

// ── 인물 검색 ────────────────────────────────────────────────────────────────
// Wikidata P31 타입 — 성경/고대 인물로 인정하는 전체 목록
// Q5           사람 (human)
// Q41940       성경 인물 (biblical character)
// Q20643955    인간 성경 인물 (human biblical figure) ← 솔로몬·모세·아브라함 등
// Q9430        예언자 (prophet)
// Q29645880    성경 속 왕 (biblical king)
// Q21070568    신화적 인물 (mythical character) ← 고대근동 신화 포함
// Q18336849    전설적 인물 (legendary figure)
// Q4638       고대 그리스인 (ancient Greek)
// Q2078004    고대 로마인 (ancient Roman)
const BIBLICAL_PERSON_TYPES = new Set([
  'Q5', 'Q41940', 'Q20643955', 'Q9430', 'Q29645880',
  'Q21070568', 'Q18336849', 'Q4638', 'Q2078004',
]);

export async function searchBiblicalPerson(query) {
  if (!query.trim()) return [];

  // 1단계: 한국어 + 영어 병행 검색 → 중복 제거 (솔로몬/Solomon, 우르/Ur 동시 커버)
  const [koData, enData] = await Promise.all([
    apiFetch({ action: 'wbsearchentities', search: query, language: 'ko', uselang: 'ko', type: 'item', limit: '10' }),
    apiFetch({ action: 'wbsearchentities', search: query, language: 'en', uselang: 'ko', type: 'item', limit: '10' }),
  ]);
  const seen = new Set();
  const candidates = [...(koData.search || []), ...(enData.search || [])]
    .map((r) => r.id)
    .filter((id) => { if (seen.has(id)) return false; seen.add(id); return true; })
    .slice(0, 15);
  if (!candidates.length) return [];

  // 2단계: 배치 조회 (클레임 포함)
  const entityData = await apiFetch({
    action: 'wbgetentities',
    ids: candidates.join('|'),
    props: 'labels|descriptions|claims',
    languages: 'ko|en',
  });

  const results = [];
  for (const qid of candidates) {
    const e = entityData.entities?.[qid];
    if (!e) continue;

    const claims = e.claims || {};
    const types = (claims.P31 || []).map((s) => s.mainsnak?.datavalue?.value?.id).filter(Boolean);

    const isBiblical    = types.includes('Q41940') || types.includes('Q20643955');
    const isKnownPerson = types.some((t) => BIBLICAL_PERSON_TYPES.has(t));

    const birthYear = claimTimeYear(claims, 'P569');
    const deathYear = claimTimeYear(claims, 'P570');

    // 날짜가 있으면 연대 기반으로도 통과 가능 (AD 500 이전)
    const hasAncientDate =
      (birthYear !== null && birthYear <= 500) ||
      (deathYear !== null && deathYear <= 500);

    // 통과 조건:
    //   A) 성경 인물 태그 (Q41940 / Q20643955) → 무조건 통과
    //   B) 인정 타입 AND 날짜 < AD 500
    //   C) 인정 타입 AND 날짜 없음 (기원 불명 성경 인물) → 통과, 날짜는 미상으로 표시
    if (!isBiblical && !isKnownPerson && !hasAncientDate) continue;

    // 현대인 제외: 출생이 AD 500 이후 AND 성경 태그 없음
    if (!isBiblical && birthYear !== null && birthYear > 500) continue;
    if (!isBiblical && deathYear !== null && deathYear > 500) continue;

    const label = e.labels?.ko?.value || e.labels?.en?.value || qid;
    const desc  = e.descriptions?.ko?.value || e.descriptions?.en?.value || '';

    const birthRaw = claimValue(claims, 'P569');
    const deathRaw = claimValue(claims, 'P570');

    results.push({
      id: qid,
      wikidataId: qid,
      name: label,
      description: desc,
      birthDate: parseTime(birthRaw),
      deathDate: parseTime(deathRaw),
      birthYear,   // 숫자 (BC = 음수), 동시대 인물 검색에 사용
      deathYear,
      source: 'Wikidata',
    });

    if (results.length >= 5) break;
  }

  return results;
}

// ── 장소 연관 인물 검색 ──────────────────────────────────────────────────────
// 전략: 2단계
//   1) wbgetentities로 장소 엔티티 조회 → P460(동일 장소 별칭) QID 수집
//      예) Q5699(Ur) ↔ Q5373099(갈대아 우르/Ur Kasdim) — Abraham의 P19는 Q5373099
//   2) 수집된 모든 QID를 VALUES에 담아 SPARQL 실행
//      탐색 속성: P19(출생지) / P20(사망지) / P937(활동지) / P551(거주지)
export async function searchPersonsAtPlace(wikidataId) {
  if (!wikidataId) return [];

  // ── Step 1: 장소 별칭 QID 수집 (P460 양방향) ──────────────────────────────
  const placeData = await apiFetch({
    action: 'wbgetentities',
    ids: wikidataId,
    props: 'claims',
    format: 'json',
  });
  const placeClaims = placeData.entities?.[wikidataId]?.claims || {};

  const allPlaceQIDs = new Set([wikidataId]);

  // P460: said to be the same as (정방향)
  (placeClaims.P460 || []).forEach((s) => {
    const id = s.mainsnak?.datavalue?.value?.id;
    if (id) allPlaceQIDs.add(id);
  });

  // P460 역방향: 다른 항목이 이 장소를 P460으로 가리키는지 → SPARQL로 처리 (아래 UNION)
  // P131 역방향(하위 장소): 이 장소 내부의 소도시들도 포함
  // → VALUES에 직접 넣기 어려우므로 SPARQL에서 wdt:P131+ 처리

  const qidValues = [...allPlaceQIDs].map((q) => `wd:${q}`).join(' ');

  // ── Step 2: SPARQL — 수집된 모든 장소 QID 기준으로 인물 검색 ──────────────
  // P460 별칭은 Step 1에서 이미 allPlaceQIDs에 포함했으므로 VALUES 하나로 충분
  // 재귀 P131+/역방향 P460 UNION은 서버 타임아웃(500) 원인이라 제외
  const sparql = `
    SELECT DISTINCT ?person ?personLabel ?birth ?death WHERE {
      VALUES ?loc { ${qidValues} }
      {
        { ?person wdt:P19 ?loc. }
        UNION { ?person wdt:P20 ?loc. }
        UNION { ?person wdt:P937 ?loc. }
        UNION { ?person wdt:P551 ?loc. }
      }
      {
        { ?person wdt:P31 wd:Q20643955. }
        UNION { ?person wdt:P31 wd:Q41940. }
        UNION { ?person wdt:P31 wd:Q9430. }
        UNION { ?person wdt:P31 wd:Q29645880. }
      }
      OPTIONAL { ?person wdt:P569 ?birth. }
      OPTIONAL { ?person wdt:P570 ?death. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". }
    }
    ORDER BY ASC(COALESCE(YEAR(?birth), YEAR(?death)))
    LIMIT 15
  `;

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
  const res = await fetch(url, { headers: { Accept: 'application/sparql-results+json' } });
  if (!res.ok) throw new Error(`SPARQL ${res.status}`);
  const data = await res.json();

  const parseSparql = (s) => {
    if (!s) return null;
    const bc = s.startsWith('-');
    const abs = bc ? s.slice(1) : s;
    const y = parseInt(abs.split('-')[0], 10);
    return (!y || isNaN(y)) ? null : (bc ? `BC ${y} (추정)` : `AD ${y} (추정)`);
  };
  const sparqlYear = (s) => {
    if (!s) return null;
    const bc = s.startsWith('-');
    const abs = bc ? s.slice(1) : s;
    const y = parseInt(abs.split('-')[0], 10);
    return (!y || isNaN(y)) ? null : (bc ? -y : y);
  };

  const sparqlResults = (data.results?.bindings || [])
    .map((b) => {
      const qid = b.person?.value?.split('/').pop() || '';
      return {
        id: qid,
        wikidataId: qid,
        name: b.personLabel?.value || qid,
        description: '',
        birthDate: parseSparql(b.birth?.value),
        deathDate: parseSparql(b.death?.value),
        birthYear: sparqlYear(b.birth?.value),
        deathYear: sparqlYear(b.death?.value),
        source: 'Wikidata',
      };
    })
    .filter((r) => r.name && r.name !== r.wikidataId);

  // 정적 매핑 병합 (Wikidata 데이터 공백 보완)
  // 모든 관련 QID(P460 별칭 포함)에 대해 정적 목록 수집
  const staticRaw = [...allPlaceQIDs].flatMap((qid) =>
    getStaticPlacePersons(qid).map((p) => ({
      id: p.wikidataId,
      wikidataId: p.wikidataId,
      name: p.name,
      description: p.description || '',
      birthDate: p.birthYear ? (p.birthYear < 0 ? `BC ${-p.birthYear} (추정)` : `AD ${p.birthYear} (추정)`) : null,
      deathDate: null,
      birthYear: p.birthYear || null,
      deathYear: p.deathYear || null,
      source: 'static',
    }))
  );

  // SPARQL 결과에 없는 정적 항목만 앞에 추가 (중복 제거)
  const sparqlIds = new Set(sparqlResults.map((r) => r.wikidataId));
  const staticUniq = staticRaw.filter((p) => !sparqlIds.has(p.wikidataId));
  // 중복된 static 항목 자체도 dedup
  const seenStatic = new Set();
  const staticDedup = staticUniq.filter((p) => {
    if (seenStatic.has(p.wikidataId)) return false;
    seenStatic.add(p.wikidataId);
    return true;
  });

  return [...staticDedup, ...sparqlResults];
}

// ── 동시대 인물 검색 ─────────────────────────────────────────────────────────
// SPARQL로 같은 시대에 활동한 성경 인물 검색 (±150년 범위)
// birthYear/deathYear 는 숫자 (BC=음수)
export async function searchContemporaries(wikidataId, birthYear, deathYear) {
  // 기준 연도 결정
  const mid = birthYear !== null ? birthYear : (deathYear !== null ? deathYear - 30 : null);
  if (mid === null) return [];

  const startY = mid - 150;
  const endY   = mid + 150;

  const sparql = `
    SELECT DISTINCT ?person ?personLabel ?birth ?death WHERE {
      { ?person wdt:P31 wd:Q20643955. }
      UNION
      { ?person wdt:P31 wd:Q41940. }
      OPTIONAL { ?person wdt:P569 ?birth. }
      OPTIONAL { ?person wdt:P570 ?death. }
      FILTER(?person != wd:${wikidataId})
      FILTER(
        (BOUND(?birth) && YEAR(?birth) >= ${startY} && YEAR(?birth) <= ${endY}) ||
        (!BOUND(?birth) && BOUND(?death) && YEAR(?death) >= ${startY} && YEAR(?death) <= ${endY})
      )
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". }
    }
    ORDER BY ASC(COALESCE(YEAR(?birth), YEAR(?death)))
    LIMIT 10
  `;

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
  const res = await fetch(url, { headers: { Accept: 'application/sparql-results+json' } });
  if (!res.ok) throw new Error(`SPARQL ${res.status}`);
  const data = await res.json();

  return (data.results?.bindings || []).map((b) => {
    const qid = b.person?.value?.split('/').pop() || '';
    const parseSparql = (s) => {
      if (!s) return null;
      const bc = s.startsWith('-');
      const abs = bc ? s.slice(1) : s;
      const y = parseInt(abs.split('-')[0], 10);
      if (!y || isNaN(y)) return null;
      return bc ? `BC ${y} (추정)` : `AD ${y} (추정)`;
    };
    const sparqlYear = (s) => {
      if (!s) return null;
      const bc = s.startsWith('-');
      const abs = bc ? s.slice(1) : s;
      const y = parseInt(abs.split('-')[0], 10);
      return (!y || isNaN(y)) ? null : (bc ? -y : y);
    };
    return {
      id: qid,
      wikidataId: qid,
      name: b.personLabel?.value || qid,
      description: '',
      birthDate: parseSparql(b.birth?.value),
      deathDate: parseSparql(b.death?.value),
      birthYear: sparqlYear(b.birth?.value),
      deathYear: sparqlYear(b.death?.value),
      source: 'Wikidata',
    };
  }).filter((r) => r.name && r.name !== r.wikidataId); // 라벨 없는 결과 제거
}

// ── 장소 검색 ────────────────────────────────────────────────────────────────
// 통과 조건: P625(좌표) 보유 + 위도 20-48 / 경도 10-65
// 커버: 이스라엘·팔레스타인, 이집트, 메소포타미아(이라크), 페르시아(이란),
//       아나톨리아(터키), 그리스, 이탈리아(로마) → 베들레헴(펜실베이니아) 등 제외
export async function searchBiblicalPlace(query) {
  if (!query.trim()) return [];

  // 한국어 + 영어 병행 검색 → 중복 제거 후 합산 (우르/Ur 같은 영어 지명 커버)
  const [koData, enData] = await Promise.all([
    apiFetch({ action: 'wbsearchentities', search: query, language: 'ko', uselang: 'ko', type: 'item', limit: '10' }),
    apiFetch({ action: 'wbsearchentities', search: query, language: 'en', uselang: 'ko', type: 'item', limit: '10' }),
  ]);
  const seen = new Set();
  const candidates = [...(koData.search || []), ...(enData.search || [])]
    .map((r) => r.id)
    .filter((id) => { if (seen.has(id)) return false; seen.add(id); return true; })
    .slice(0, 15);
  if (!candidates.length) return [];

  const entityData = await apiFetch({
    action: 'wbgetentities',
    ids: candidates.join('|'),
    props: 'labels|descriptions|claims',
    languages: 'ko|en',
  });

  const results = [];
  for (const qid of candidates) {
    const e = entityData.entities?.[qid];
    if (!e) continue;

    const claims = e.claims || {};
    const coordRaw = claimValue(claims, 'P625');
    if (!coordRaw) continue;

    const lat = coordRaw.latitude;
    const lon = coordRaw.longitude;

    // 지리 범위 필터
    if (lat < 20 || lat > 48) continue;
    if (lon < 10 || lon > 65) continue;

    const label = e.labels?.ko?.value || e.labels?.en?.value || qid;
    const desc  = e.descriptions?.ko?.value || e.descriptions?.en?.value || '';

    results.push({
      id: qid,
      wikidataId: qid,
      name: label,
      description: desc,
      lat: parseFloat(lat.toFixed(4)),
      lon: parseFloat(lon.toFixed(4)),
      source: 'Wikidata',
    });

    if (results.length >= 5) break;
  }

  return results;
}
