// 성경 전체 지명 DB 빌더
// Source: OpenBible.info Bible-Geocoding-Data (CC BY 4.0)
//
// 원칙
// 1) 성경 구절이 연결된 ancient place는 좌표 유무와 관계없이 모두 보존한다.
// 2) 동명이소(Ai 1/2/3, Aphek 1/2/3 등)는 합치지 않고 별도 레코드 + duplicateGroup으로 표시한다.
// 3) 번역별 이명/철자 변형은 aliases에 보존한다.
// 4) 동일 장소의 다른 고대 명칭 관계는 samePlaceAs에 보존한다.
// 5) 현대 위치 식별은 복수 후보와 원자료 score를 보존하며, 앱이 임의로 확정하지 않는다.
// 6) 한글명은 프로젝트에서 직접 검토된 것만 채우고 나머지는 null로 둔다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOOKS } from '../src/data/bibleBooks.js';
import { BIBLICAL_PLACE_PROFILES } from '../src/data/bibleReferences.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// OpenBible.info 저장소의 현재 공개 데이터가 고정된 커밋.
// 재현 가능한 빌드를 위해 main 대신 SHA를 사용한다.
const SOURCE_COMMIT = '7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f';
const SOURCE_REPO = 'openbibleinfo/Bible-Geocoding-Data';
const SOURCE_URL = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_COMMIT}/data/ancient.jsonl`;
const OUT = path.resolve(__dirname, '../public/data/biblical-places-db.json');
const LEGACY_OUT = path.resolve(__dirname, '../public/data/places.json');

const OT_BOOKS = new Set([
  'Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr',
  'Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos',
  'Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal',
]);
const NT_BOOKS = new Set([
  'Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal','Eph','Phil','Col','1Thess','2Thess',
  '1Tim','2Tim','Titus','Phlm','Heb','Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev',
]);

// 프로젝트 내부 책 ID와 OSIS 차이를 흡수한다.
const BOOK_ALIAS = new Map([
  ['Ex','Exod'], ['1Thes','1Thess'], ['2Thes','2Thess'], ['Est','Esth'], ['Sng','Song'], ['Nahum','Nah'],
]);

const KO_MAP = new Map();
for (const p of Object.values(BIBLICAL_PLACE_PROFILES || {})) {
  const ko = p?.canonicalName;
  if (!ko) continue;
  KO_MAP.set(String(p.canonicalName).toLowerCase(), ko);
  for (const alias of p.aliases || []) KO_MAP.set(String(alias).toLowerCase(), ko);
}

function cleanText(value='') {
  return String(value).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeName(value='') {
  return String(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function splitNumberedName(name='') {
  const match = String(name).match(/^(.*?)(?:\s+(\d+))?$/);
  return {
    base: (match?.[1] || name).trim(),
    index: match?.[2] ? Number(match[2]) : null,
  };
}

function normalizeOsisBook(ref='') {
  const match = String(ref).match(/^([1-3]?[A-Za-z]+)\./);
  if (!match) return null;
  return BOOK_ALIAS.get(match[1]) || match[1];
}

function getVerseRefs(rec, extra) {
  if (Array.isArray(rec.verses) && rec.verses.length) {
    return rec.verses
      .map((v) => typeof v === 'string' ? v : v?.osis)
      .filter(Boolean);
  }
  return Array.isArray(extra?.osises) ? extra.osises.filter(Boolean) : [];
}

function classifyTestament(refs) {
  let hasOT = false;
  let hasNT = false;
  const books = [];
  const seen = new Set();

  for (const ref of refs) {
    const book = normalizeOsisBook(ref);
    if (!book) continue;
    if (!seen.has(book)) { books.push(book); seen.add(book); }
    if (OT_BOOKS.has(book)) hasOT = true;
    if (NT_BOOKS.has(book)) hasNT = true;
  }

  return {
    testament: hasOT && hasNT ? 'both' : hasNT ? 'nt' : hasOT ? 'ot' : 'unknown',
    books,
  };
}

function candidateScore(idn) {
  const score = idn?.score || {};
  if (Number.isFinite(score.time_total)) return score.time_total;
  if (Number.isFinite(score.vote_total)) return score.vote_total;
  if (Number.isFinite(score.vote_average)) return score.vote_average;
  return null;
}

function identificationCandidates(rec) {
  const rows = [];
  for (let identificationIndex = 0; identificationIndex < (rec.identifications || []).length; identificationIndex += 1) {
    const idn = rec.identifications[identificationIndex];
    const score = candidateScore(idn);
    const base = {
      identificationIndex,
      targetId: idn?.id || null,
      targetSource: idn?.id_source || null,
      description: cleanText(idn?.description || ''),
      class: idn?.class || null,
      types: Array.isArray(idn?.types) ? idn.types : [],
      score,
    };

    const resolutions = Array.isArray(idn?.resolutions) ? idn.resolutions : [];
    if (!resolutions.length) {
      rows.push({ ...base, resolutionIndex: null, lat: null, lon: null, geometry: null, landOrWater: null });
      continue;
    }

    for (let resolutionIndex = 0; resolutionIndex < resolutions.length; resolutionIndex += 1) {
      const res = resolutions[resolutionIndex] || {};
      let lon = null;
      let lat = null;
      if (res.lonlat) {
        const parts = String(res.lonlat).split(',').map(Number);
        if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
          [lon, lat] = parts;
        }
      }
      rows.push({
        ...base,
        resolutionIndex,
        lat: lat == null ? null : Number(lat.toFixed(6)),
        lon: lon == null ? null : Number(lon.toFixed(6)),
        geometry: res.ancient_geometry || null,
        landOrWater: res.land_or_water || null,
        locationType: res.type || null,
        lonlatType: res.lonlat_type || null,
      });
    }
  }
  return rows.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
}

function aliasesFor(rec, canonicalName) {
  const aliases = new Set();
  const counts = rec.translation_name_counts || {};
  for (const name of Object.keys(counts)) {
    if (normalizeName(name) !== normalizeName(canonicalName)) aliases.add(name);
  }
  return [...aliases].sort((a, b) => a.localeCompare(b, 'en'));
}

function curatedKoName(englishName) {
  const { base, index } = splitNumberedName(englishName);
  const koBase = KO_MAP.get(base.toLowerCase());
  if (!koBase) return null;
  return index ? `${koBase} ${index}` : koBase;
}

function buildDuplicateMetadata(places) {
  const groups = new Map();
  for (const place of places) {
    const { base, index } = splitNumberedName(place.nameEn);
    const key = normalizeName(base);
    if (!groups.has(key)) groups.set(key, { key, baseName: base, members: [] });
    groups.get(key).members.push({ id: place.id, nameEn: place.nameEn, duplicateIndex: index });
  }

  const duplicateGroups = [];
  for (const group of groups.values()) {
    if (group.members.length < 2) continue;
    const groupId = `dup:${group.key.replace(/\s+/g, '-')}`;
    duplicateGroups.push({ groupId, baseName: group.baseName, memberCount: group.members.length, members: group.members });
    for (const member of group.members) {
      const place = places.find((p) => p.id === member.id);
      if (!place) continue;
      place.isHomonym = true;
      place.duplicateGroup = groupId;
      place.duplicateIndex = member.duplicateIndex;
    }
  }
  return duplicateGroups.sort((a, b) => a.baseName.localeCompare(b.baseName, 'en'));
}

function buildNameCollisionGroups(places) {
  const index = new Map();
  for (const place of places) {
    const names = new Set([place.nameEn, ...(place.aliases || [])]);
    for (const name of names) {
      const normalized = normalizeName(name);
      if (!normalized) continue;
      if (!index.has(normalized)) index.set(normalized, { normalized, label: name, placeIds: new Set() });
      index.get(normalized).placeIds.add(place.id);
    }
  }
  return [...index.values()]
    .filter((row) => row.placeIds.size > 1)
    .map((row) => ({ name: row.label, normalized: row.normalized, placeIds: [...row.placeIds], count: row.placeIds.size }))
    .sort((a, b) => a.normalized.localeCompare(b.normalized, 'en'));
}

function attachSamePlaceNames(places, idToName) {
  for (const place of places) {
    place.samePlaceAs = (place.samePlaceAncientIds || [])
      .map((id) => ({ id, nameEn: idToName.get(id) || null }))
      .filter((row, i, arr) => row.id && arr.findIndex((x) => x.id === row.id) === i);
    delete place.samePlaceAncientIds;
  }
}

function legacyPayload(db) {
  return {
    source: db.meta.source.title,
    sourceCommit: db.meta.source.commit,
    count: db.places.length,
    places: db.places.map((p) => {
      const best = p.locationCandidates.find((c) => c.lat != null && c.lon != null) || null;
      return {
        id: p.id,
        name: p.nameKo || p.nameEn,
        nameEn: p.nameEn,
        ko: p.nameKo,
        books: p.books,
        refs: p.verseRefs.length,
        testament: p.testament,
        lat: best?.lat ?? null,
        lon: best?.lon ?? null,
        certainty: best?.score == null ? 'unknown' : best.score >= 700 ? 'confirmed' : best.score >= 350 ? 'probable' : 'disputed',
        types: p.types,
        modern: best?.description || '',
      };
    }),
  };
}

async function main() {
  process.stdout.write('▶ OpenBible.info 전체 성경 지명 DB 원자료 가져오는 중…\n');
  const response = await fetch(SOURCE_URL, { headers: { 'User-Agent': 'bible-mindmap-place-db-builder/1.0' } });
  if (!response.ok) throw new Error(`fetch ancient.jsonl HTTP ${response.status}`);
  const raw = await response.text();
  const sourceLines = raw.split('\n').filter((line) => line.trim());

  const parsedRecords = [];
  for (const line of sourceLines) {
    try { parsedRecords.push(JSON.parse(line)); }
    catch (error) { throw new Error(`ancient.jsonl JSON parse 실패: ${error.message}`); }
  }

  const idToName = new Map(parsedRecords.map((rec) => [rec.id, rec.friendly_id || rec.id]));
  const places = [];
  let noVerseRecords = 0;
  let noCoordinatePlaces = 0;
  let unknownTestament = 0;

  for (const rec of parsedRecords) {
    let extra = {};
    try { extra = rec.extra ? JSON.parse(rec.extra) : {}; } catch { extra = {}; }

    const verseRefs = getVerseRefs(rec, extra);
    if (!verseRefs.length) { noVerseRecords += 1; continue; }

    const nameEn = rec.friendly_id || rec.id;
    const { testament, books } = classifyTestament(verseRefs);
    if (testament === 'unknown') unknownTestament += 1;

    const locationCandidates = identificationCandidates(rec);
    if (!locationCandidates.some((candidate) => candidate.lat != null && candidate.lon != null)) noCoordinatePlaces += 1;

    const samePlaceAncientIds = [];
    for (const idn of rec.identifications || []) {
      if (idn?.id_source === 'ancient' && idn?.id && idn.id !== rec.id) samePlaceAncientIds.push(idn.id);
    }

    places.push({
      id: rec.id,
      slug: rec.url_slug || null,
      nameEn,
      nameKo: curatedKoName(nameEn),
      koReviewStatus: curatedKoName(nameEn) ? 'curated' : 'pending',
      aliases: aliasesFor(rec, nameEn),
      translationNameCounts: rec.translation_name_counts || {},
      testament,
      books,
      verseRefs,
      occurrenceCount: verseRefs.length,
      firstRef: verseRefs[0] || null,
      types: Array.isArray(rec.types) ? rec.types : [],
      precedingArticle: rec.preceding_article || '',
      locationCandidates,
      hasCoordinates: locationCandidates.some((candidate) => candidate.lat != null && candidate.lon != null),
      isHomonym: false,
      duplicateGroup: null,
      duplicateIndex: splitNumberedName(nameEn).index,
      samePlaceAncientIds,
      sourceRecord: {
        geojsonFile: rec.geojson_file || null,
        kmlFile: rec.kml_file || null,
        linkedData: rec.linked_data || {},
      },
    });
  }

  attachSamePlaceNames(places, idToName);
  const duplicateGroups = buildDuplicateMetadata(places);
  const nameCollisionGroups = buildNameCollisionGroups(places);

  places.sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en', { numeric: true }));

  const stats = {
    sourceRecordCount: parsedRecords.length,
    biblicalPlaceCount: places.length,
    otOnly: places.filter((p) => p.testament === 'ot').length,
    ntOnly: places.filter((p) => p.testament === 'nt').length,
    bothTestaments: places.filter((p) => p.testament === 'both').length,
    unknownTestament,
    noVerseRecordsExcluded: noVerseRecords,
    noCoordinatePlacesKept: noCoordinatePlaces,
    homonymPlaceCount: places.filter((p) => p.isHomonym).length,
    duplicateGroupCount: duplicateGroups.length,
    nameCollisionGroupCount: nameCollisionGroups.length,
    koreanCuratedCount: places.filter((p) => p.nameKo).length,
    koreanPendingCount: places.filter((p) => !p.nameKo).length,
  };

  const db = {
    meta: {
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      canonicalScope: '66-book Protestant Bible; only ancient records with canonical verse references are included',
      policy: {
        preserveNoCoordinatePlaces: true,
        preserveHomonymsAsSeparateRecords: true,
        preserveTranslationAliases: true,
        preserveIdentificationCandidates: true,
        doNotAutoConfirmDisputedLocations: true,
        koreanNamesRequireCuratedReview: true,
      },
      source: {
        title: 'OpenBible.info Bible-Geocoding-Data',
        repository: `https://github.com/${SOURCE_REPO}`,
        file: 'data/ancient.jsonl',
        commit: SOURCE_COMMIT,
        license: 'CC BY 4.0 (dataset; embedded third-party geometry/media may have separate licenses)',
      },
      stats,
    },
    duplicateGroups,
    nameCollisionGroups,
    places,
  };

  // 구조적 검수: 성경 지명을 좌표 유무 때문에 버리는 일이 다시 생기지 않도록 강제한다.
  if (parsedRecords.length < 1300) throw new Error(`원자료 레코드 수 비정상: ${parsedRecords.length}`);
  if (places.length < 1200) throw new Error(`성경 참조 지명 수 비정상: ${places.length}`);
  if (unknownTestament > 0) throw new Error(`구약/신약 분류 실패 ${unknownTestament}건`);
  if (places.some((p) => !p.id || !p.nameEn || !p.verseRefs.length)) throw new Error('필수 필드 누락 지명 존재');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(db, null, 2)}\n`);
  // 기존 코드가 places.json을 참조할 가능성을 위해 호환 파일은 계속 생성하되, 새 DB는 별도 파일로 유지한다.
  fs.writeFileSync(LEGACY_OUT, `${JSON.stringify(legacyPayload(db))}\n`);

  process.stdout.write(`✓ biblical-places-db.json 생성: ${places.length}개 지명\n`);
  process.stdout.write(`  OT ${stats.otOnly} · NT ${stats.ntOnly} · BOTH ${stats.bothTestaments}\n`);
  process.stdout.write(`  동명이소 그룹 ${stats.duplicateGroupCount} · 좌표 미확정/없음 ${stats.noCoordinatePlacesKept}개도 보존\n`);
  process.stdout.write(`  → ${path.relative(process.cwd(), OUT)}\n`);
}

main().catch((error) => {
  process.stderr.write(`✗ build-places 실패: ${error.stack || error.message}\n`);
  process.exit(1);
});
