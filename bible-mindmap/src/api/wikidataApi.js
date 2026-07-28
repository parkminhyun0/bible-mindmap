import {
  BIBLICAL_CHRONOLOGY,
  getBibleTags,
  getBiblicalChronology,
  getBiblicalNameInfo,
  getStaticPlacePersons,
  resolveBiblicalName,
} from '../data/bibleReferences.js';

const BASE = 'https://www.wikidata.org/w/api.php';
const _cache = new Map();

const NT_BOOK_NAMES = [
  '마태복음', '마가복음', '누가복음', '요한복음', '사도행전', '로마서',
  '고린도', '갈라디아서', '에베소서', '빌립보서', '골로새서', '데살로니가',
  '디모데', '디도서', '빌레몬서', '히브리서', '야고보서', '베드로',
  '요한1', '요한2', '요한3', '유다서', '요한계시록',
];

function classifyTestament(bibleTags) {
  const hasNT = bibleTags.some((tag) => NT_BOOK_NAMES.some((book) => tag.includes(book)));
  const hasOT = bibleTags.some((tag) => !NT_BOOK_NAMES.some((book) => tag.includes(book)));
  if (hasOT && hasNT) return 'both';
  return hasNT ? 'nt' : 'ot';
}

function matchesTestament(itemTestament, requested) {
  return !requested || requested === 'all' || itemTestament === 'both' || itemTestament === requested;
}

function historicalScopeFromYears(birthYear, deathYear) {
  const representative = birthYear ?? deathYear;
  if (representative == null) return null;
  if (representative < -4) return 'ot';
  if (representative <= 100) return 'nt';
  return null;
}

function formatEstimatedYear(year) {
  if (year == null) return null;
  return year < 0 ? `BC ${Math.abs(year)} (추정)` : `AD ${year} (추정)`;
}

// wbgetentities/wbsearchentities 공통 fetcher
async function apiFetch(params) {
  const url = new URL(BASE);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const key = url.toString();
  const cached = _cache.get(key);
  if (cached) return cached;

  const promise = fetch(url.toString())
    .then((res) => {
      if (!res.ok) throw new Error(`Wikidata ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      _cache.delete(key); // 실패 시 캐시 무효화하여 재시도 허용
      throw err;
    });
  _cache.set(key, promise);
  return promise;
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

export async function searchBiblicalPerson(query, testament = 'all') {
  if (!query.trim()) return [];
  const resolvedName = resolveBiblicalName(query);
  const searchQuery = resolvedName.query;

  // 1단계: 한국어 + 영어 병행 검색 → 중복 제거 (솔로몬/Solomon, 우르/Ur 동시 커버)
  const [koData, enData] = await Promise.all([
    apiFetch({ action: 'wbsearchentities', search: searchQuery, language: 'ko', uselang: 'ko', type: 'item', limit: '10' }),
    apiFetch({ action: 'wbsearchentities', search: searchQuery, language: 'en', uselang: 'ko', type: 'item', limit: '10' }),
  ]);
  const seen = new Set();
  // 이름 변경·별칭 사전에 연결된 성경 인물은 일반 동명이인보다 항상 먼저 검증한다.
  // 예: 사라 → Q194808을 우선해 동명의 역사 인물/성인이 앞서는 것을 방지한다.
  const candidates = [resolvedName.qid, ...(koData.search || []).map((r) => r.id), ...(enData.search || []).map((r) => r.id)]
    .filter(Boolean)
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
    const bibleTags = getBibleTags(qid);
    const types = (claims.P31 || []).map((s) => s.mainsnak?.datavalue?.value?.id).filter(Boolean);

    const isBiblical    = types.includes('Q41940') || types.includes('Q20643955');
    const isKnownPerson = types.some((t) => BIBLICAL_PERSON_TYPES.has(t));

    const chronology = getBiblicalChronology(qid);
    const birthYear = claimTimeYear(claims, 'P569') ?? chronology?.birthYear ?? null;
    const deathYear = claimTimeYear(claims, 'P570') ?? chronology?.deathYear ?? null;

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

    const category = bibleTags.length > 0 ? 'biblical' : 'historical';
    const itemTestament = category === 'biblical'
      ? classifyTestament(bibleTags)
      : historicalScopeFromYears(birthYear, deathYear);
    if (!itemTestament || !matchesTestament(itemTestament, testament)) continue;
    const nameInfo = category === 'biblical'
      ? (
        resolvedName.qid === qid
          ? resolvedName
          : getBiblicalNameInfo(qid)
      )
      : null;

    const label = e.labels?.ko?.value || e.labels?.en?.value || qid;
    const desc  = e.descriptions?.ko?.value || e.descriptions?.en?.value || '';

    const birthRaw = claimValue(claims, 'P569');
    const deathRaw = claimValue(claims, 'P570');

    results.push({
      id: qid,
      wikidataId: qid,
      label,
      name: label,
      description: desc,
      birthDate: parseTime(birthRaw) || (chronology ? formatEstimatedYear(chronology.birthYear) : null),
      deathDate: parseTime(deathRaw) || (chronology ? formatEstimatedYear(chronology.deathYear) : null),
      birthYear,   // 숫자 (BC = 음수), 동시대 인물 검색에 사용
      deathYear,
      bibleTags,
      testament: itemTestament,
      category,
      nameAliases: nameInfo?.aliases || [],
      nameChangeNote: nameInfo?.note || null,
      nameChangeReference: nameInfo?.reference || null,
      matchedName: resolvedName.matchedName,
      source: category === 'biblical' ? '성경 본문 + Wikidata 식별자' : 'Wikidata 역사 연대',
      verified: category === 'biblical',
    });

    if (results.length >= 5) break;
  }

  return results.sort((a, b) => {
    if (a.category !== b.category) return a.category === 'biblical' ? -1 : 1;
    return 0;
  });
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
// SPARQL로 같은 시대에 활동한 성경·역사 인물 검색 (±150년 범위)
// birthYear/deathYear 는 숫자 (BC=음수)
export async function searchContemporaries(wikidataId, birthYear, deathYear, testament = 'all') {
  const baseChronology = getBiblicalChronology(wikidataId);
  const resolvedBirthYear = birthYear ?? baseChronology?.birthYear ?? null;
  const resolvedDeathYear = deathYear ?? baseChronology?.deathYear ?? null;
  // 기준 연도 결정
  const mid = resolvedBirthYear !== null
    ? resolvedBirthYear
    : (resolvedDeathYear !== null ? resolvedDeathYear - 30 : null);
  if (mid === null) return [];

  const startY = mid - 150;
  const endY   = mid + 150;

  const sparql = `
    SELECT DISTINCT ?person ?personLabel ?personDescription ?birth ?death WHERE {
      VALUES ?type { wd:Q20643955 wd:Q41940 wd:Q9430 wd:Q29645880 wd:Q5 }
      ?person wdt:P31 ?type.
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
    LIMIT 40
  `;

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
  let bindings = [];
  try {
    const res = await fetch(url, { headers: { Accept: 'application/sparql-results+json' } });
    if (!res.ok) throw new Error(`SPARQL ${res.status}`);
    const data = await res.json();
    bindings = data.results?.bindings || [];
  } catch {
    // Wikidata가 일시적으로 실패해도 아래 정적 성경 연대 결과는 계속 제공한다.
  }

  const results = bindings.map((b) => {
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
    const bibleTags = getBibleTags(qid);
    const category = bibleTags.length > 0 ? 'biblical' : 'historical';
    const itemTestament = category === 'biblical'
      ? classifyTestament(bibleTags)
      : historicalScopeFromYears(
        sparqlYear(b.birth?.value),
        sparqlYear(b.death?.value),
      );
    const nameInfo = category === 'biblical' ? getBiblicalNameInfo(qid) : null;
    return {
      id: qid,
      wikidataId: qid,
      name: b.personLabel?.value || qid,
      label: b.personLabel?.value || qid,
      description: b.personDescription?.value || '',
      birthDate: parseSparql(b.birth?.value),
      deathDate: parseSparql(b.death?.value),
      birthYear: sparqlYear(b.birth?.value),
      deathYear: sparqlYear(b.death?.value),
      bibleTags,
      testament: itemTestament,
      category,
      nameAliases: nameInfo?.aliases || [],
      nameChangeNote: nameInfo?.note || null,
      nameChangeReference: nameInfo?.reference || null,
      source: category === 'biblical' ? '성경 본문 + Wikidata 식별자' : 'Wikidata 역사 연대',
      verified: category === 'biblical',
    };
  }).filter((r) =>
    r.name
    && r.name !== r.wikidataId
    && r.testament
    && (r.category === 'historical' || matchesTestament(r.testament, testament))
  );

  const staticBiblical = Object.entries(BIBLICAL_CHRONOLOGY)
    .filter(([qid, chronology]) => (
      qid !== wikidataId
      && chronology.birthYear >= startY
      && chronology.birthYear <= endY
    ))
    .map(([qid, chronology]) => {
      const bibleTags = getBibleTags(qid);
      const itemTestament = classifyTestament(bibleTags);
      const nameInfo = getBiblicalNameInfo(qid);
      return {
        id: qid,
        wikidataId: qid,
        name: chronology.name,
        label: chronology.name,
        description: '성경 인물 대표 연대 기준',
        birthDate: formatEstimatedYear(chronology.birthYear),
        deathDate: formatEstimatedYear(chronology.deathYear),
        birthYear: chronology.birthYear,
        deathYear: chronology.deathYear,
        bibleTags,
        testament: itemTestament,
        category: 'biblical',
        nameAliases: nameInfo?.aliases || [],
        nameChangeNote: nameInfo?.note || null,
        nameChangeReference: nameInfo?.reference || null,
        source: '성경 본문 + 프로젝트 성경 연대 기준',
        verified: true,
      };
    })
    .filter((item) => matchesTestament(item.testament, testament));

  const deduped = [...new Map(
    [...staticBiblical, ...results].map((item) => [item.wikidataId, item]),
  ).values()];
  const biblical = deduped.filter((item) => item.category === 'biblical').slice(0, 10);
  const historical = deduped.filter((item) => item.category === 'historical').slice(0, 10);
  return [...biblical, ...historical];
}

// ── 장소 검색 ────────────────────────────────────────────────────────────────
// 통과 조건: P625(좌표) 보유 + 위도 20-48 / 경도 10-65
// 커버: 이스라엘·팔레스타인, 이집트, 메소포타미아(이라크), 페르시아(이란),
//       아나톨리아(터키), 그리스, 이탈리아(로마) → 베들레헴(펜실베이니아) 등 제외
export async function searchBiblicalPlace(query, testament = 'all') {
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
    const bibleTags = getBibleTags(qid);
    // 좌표만 맞는 동명 현대 도시를 막고, 성경 본문에 연결된 장소만 허용한다.
    if (bibleTags.length === 0) continue;
    const itemTestament = classifyTestament(bibleTags);
    if (!matchesTestament(itemTestament, testament)) continue;
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
      label,
      name: label,
      description: desc,
      lat: parseFloat(lat.toFixed(4)),
      lon: parseFloat(lon.toFixed(4)),
      bibleTags,
      testament: itemTestament,
      source: '성경 본문 + Wikidata 식별자',
      verified: true,
    });

    if (results.length >= 5) break;
  }

  return results;
}
