// 성경 지명 자동 색인 파서
// 출처: OpenBible.info Bible-Geocoding-Data (CC-BY-4.0) — 성경의 식별 가능한 모든 장소
// ancient.jsonl → public/data/places.json (이름·등장 책·좌표·확실도·현대 지명)
// 재현성: 특정 커밋(PIN)에 고정. 한글명은 프로젝트 curated 프로필과 매칭해 부여.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOOKS } from '../src/data/bibleBooks.js';
import { BIBLICAL_PLACE_PROFILES } from '../src/data/bibleReferences.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PIN = '7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f';
const SRC = `https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/${PIN}/data/ancient.jsonl`;
const OUT = path.resolve(__dirname, '../public/data/places.json');

const BOOK_IDS = new Set(ALL_BOOKS.map((b) => b.id));
const OT_IDS = new Set(ALL_BOOKS.slice(0, 39).map((b) => b.id));

// 영문명(소문자) → 한글명 매핑 (curated 프로필의 canonicalName + aliases 기반)
const KO_MAP = new Map();
for (const p of Object.values(BIBLICAL_PLACE_PROFILES)) {
  const ko = p.canonicalName;
  KO_MAP.set(p.canonicalName.toLowerCase(), ko);
  for (const a of p.aliases || []) KO_MAP.set(String(a).toLowerCase(), ko);
}

function osisBooks(osises) {
  const books = new Set();
  for (const ref of osises || []) {
    for (const m of String(ref).matchAll(/([1-3]?[A-Za-z]+)\.\d+/g)) {
      const code = m[1];
      if (BOOK_IDS.has(code)) books.add(code);
    }
  }
  return [...books];
}

function bestIdentification(rec) {
  let best = null;
  for (const idn of rec.identifications || []) {
    for (const res of idn.resolutions || []) {
      if (!res.lonlat) continue;
      const score = idn.score?.vote_average ?? 0;
      if (!best || score > best.score) {
        const [lon, lat] = res.lonlat.split(',').map(Number);
        best = { lon, lat, score, modern: idn.description?.replace(/<[^>]+>/g, '') || '', types: idn.types || [] };
      }
    }
  }
  return best;
}

function certaintyFromScore(score) {
  if (score >= 700) return 'confirmed';
  if (score >= 350) return 'probable';
  return 'disputed';
}

async function main() {
  process.stdout.write('▶ OpenBible 지명 데이터 가져오는 중…\n');
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`fetch ancient.jsonl ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n').filter(Boolean);

  const places = [];
  let skippedNoCoord = 0;
  for (const line of lines) {
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    let extra = {};
    try { extra = rec.extra ? JSON.parse(rec.extra) : {}; } catch { /* noop */ }

    const best = bestIdentification(rec);
    if (!best || Number.isNaN(best.lat) || Number.isNaN(best.lon)) { skippedNoCoord += 1; continue; }

    const books = osisBooks(extra.osises);
    if (!books.length) continue; // 정경 참조 없는 항목 제외
    const testament = books.some((b) => !OT_IDS.has(b))
      ? (books.some((b) => OT_IDS.has(b)) ? 'both' : 'nt')
      : 'ot';

    const nameEn = rec.friendly_id || rec.id;
    // 동명 지명은 데이터셋이 "Bethany 1" 처럼 번호를 붙임 → 번호 보존하며 한글화
    const nm = String(nameEn).match(/^(.*?)(?:\s+(\d+))?$/);
    const koBase = KO_MAP.get((nm?.[1] || nameEn).toLowerCase());
    const ko = koBase ? (nm?.[2] ? `${koBase} ${nm[2]}` : koBase) : null;

    places.push({
      id: rec.id,
      name: ko || nameEn,
      nameEn,
      ko,
      books,
      refs: (extra.osises || []).length,
      testament,
      lat: Number(best.lat.toFixed(4)),
      lon: Number(best.lon.toFixed(4)),
      certainty: certaintyFromScore(best.score),
      types: best.types,
      modern: best.modern || '',
    });
  }

  places.sort((a, b) => b.refs - a.refs);
  const payload = {
    source: 'OpenBible.info Bible-Geocoding-Data (CC-BY-4.0)',
    sourceCommit: PIN,
    count: places.length,
    places,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload));
  const koCount = places.filter((p) => p.ko).length;
  process.stdout.write(`✓ places.json 생성: ${places.length}곳 (한글명 ${koCount} · 좌표없음 제외 ${skippedNoCoord}) → ${path.relative(process.cwd(), OUT)}\n`);
}

main().catch((err) => { process.stderr.write(`✗ build-places 실패: ${err.message}\n`); process.exit(1); });
