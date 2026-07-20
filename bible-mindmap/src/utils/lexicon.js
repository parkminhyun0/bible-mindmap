/**
 * 원어 어형 데이터(TAGNT/TAHOT) 로더 + Strong's 사전 API wrapper.
 * 데이터 라이선스: STEPBible.data (CC BY 4.0)
 */

import { isOT } from '../data/bibleBooks';

const BASE = import.meta.env.BASE_URL; // ex: "/bible-mindmap/"

// ── Chapter cache ──────────────────────────────────────────────────────────
// key: `${lang}/${bookId}/${chapter}` → Promise<{verse: word[]}>
const _chapterCache = new Map();
const CACHE_MAX = 40;

function cacheGet(key) {
  const hit = _chapterCache.get(key);
  if (hit) { _chapterCache.delete(key); _chapterCache.set(key, hit); }
  return hit;
}
function cacheSet(key, value) {
  _chapterCache.set(key, value);
  if (_chapterCache.size > CACHE_MAX) {
    const firstKey = _chapterCache.keys().next().value;
    _chapterCache.delete(firstKey);
  }
}

export async function loadChapterLexicon(bookId, chapter) {
  const lang = isOT(bookId) ? 'hot' : 'gnt';
  const key = `${lang}/${bookId}/${chapter}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const url = `${BASE}data/lex/${lang}/${bookId}/${chapter}.json`;
  const promise = fetch(url).then((res) => {
    if (!res.ok) throw new Error(`lexicon fetch ${res.status}`);
    return res.json();
  }).catch((err) => {
    _chapterCache.delete(key);
    throw err;
  });
  cacheSet(key, promise);
  return promise;
}

/**
 * 특정 절 또는 절 범위의 단어 배열을 반환. 실패 시 null.
 *
 * @param {string} bookId
 * @param {number} chapter
 * @param {number} verseStart
 * @param {number} [verseEnd]  생략 시 verseStart 한 절만 로드
 */
export async function loadVerseLexicon(bookId, chapter, verseStart, verseEnd) {
  try {
    const ch = await loadChapterLexicon(bookId, chapter);
    if (!ch) return null;
    const end = verseEnd ?? verseStart;
    const combined = [];
    for (let v = verseStart; v <= end; v++) {
      const words = ch[v];
      if (Array.isArray(words)) combined.push(...words);
    }
    return combined.length ? combined : null;
  } catch {
    return null;
  }
}

// ── Strong 용례 (concordance) 인덱스 로더 ─────────────────────────────────
// 파일: public/data/strongs/{lang}/{bookId}.json
// 형식: { "G2316": [{ch,v,w,m,l}, ...], ... }
const _strongsBookCache = new Map();

/**
 * 주어진 Strong 번호가 특정 책에서 어디에 쓰이는지 반환.
 * @returns {Promise<Array<{ch:number, v:number, w:string, m:string, l:string}>>}
 */
export async function fetchStrongConcordance(strongId, bookId) {
  if (!strongId || !bookId) return [];
  const lang = isOT(bookId) ? 'hot' : 'gnt';
  const cacheKey = `${lang}/${bookId}`;

  let bookData;
  if (_strongsBookCache.has(cacheKey)) {
    bookData = await _strongsBookCache.get(cacheKey);
  } else {
    const url = `${BASE}data/strongs/${lang}/${bookId}.json`;
    const promise = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`strongs ${r.status}`);
      return r.json();
    }).catch(() => ({}));
    _strongsBookCache.set(cacheKey, promise);
    bookData = await promise;
  }

  return bookData[strongId] || [];
}

// ── Strong's 정의 사전 (로컬 청크) ───────────────────────────────────────────
// 빌드 시 openscriptures/strongs 데이터로 생성된 청크 파일에서 즉시 조회.
// 청크 번호 = floor((strongNum - 1) / 1000) — 인덱스 파일 불필요.
const _chunkDefCache = new Map(); // 'gnt-3' → Promise<{G3004:{d,e,k,l,t}}>
const CHUNK_SZ = 1000;

function strongsChunkIdx(strongNum) {
  const n = parseInt(strongNum.replace(/^[GH]/, ''), 10);
  return Math.floor((n - 1) / CHUNK_SZ);
}

async function loadStrongsChunk(lang, ci) {
  const key = `${lang}-${ci}`;
  if (!_chunkDefCache.has(key)) {
    const url = `${BASE}data/strongs-def/${lang}/${ci}.json`;
    const p = fetch(url)
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}));
    _chunkDefCache.set(key, p);
  }
  return _chunkDefCache.get(key);
}

async function lookupLocalDef(strongNum) {
  const lang = strongNum.startsWith('H') ? 'hot' : 'gnt';
  const ci   = strongsChunkIdx(strongNum);
  const chunk = await loadStrongsChunk(lang, ci);
  const raw   = chunk[strongNum];
  if (!raw) return null;

  // 정의 HTML 조립
  const parts = [];
  if (raw.e) parts.push(`<p class="lex-etym"><b>어원:</b> ${raw.e}</p>`);
  if (raw.d) parts.push(`<p>${raw.d.trim()}</p>`);
  if (raw.k) parts.push(`<p class="lex-kjv"><b>KJV 용례:</b> ${raw.k}</p>`);

  return parts.length ? { topic: strongNum, definition: parts.join(''), source: 'local' } : null;
}

// ── bolls.life BDBT (히브리어 BDB 정의 — 더 상세) ──────────────────────────
async function fetchBDBDef(strongNum) {
  const numOnly = strongNum.replace(/^H/, '');
  for (const id of [strongNum, numOnly]) {
    try {
      const res = await fetch(`https://bolls.life/dictionary-definition/BDBT/${id}/`);
      if (!res.ok) continue;
      const arr = await res.json();
      if (Array.isArray(arr) && arr[0]) return { ...arr[0], source: 'bdbt' };
    } catch { /* try next */ }
  }
  return null;
}

const _defCache = new Map();

/**
 * Strong's 번호로 사전 정의 조회.
 * 우선순위:
 *   Hebrew: (1) 로컬 청크 + (2) bolls.life BDBT 병렬 → 더 상세한 쪽 반환
 *   Greek : (1) 로컬 청크만 (즉시, 외부 API 없음)
 * 반환: { topic, definition, source } 또는 null
 */
export async function fetchStrongDefinition(strongNum) {
  if (!strongNum) return null;
  if (_defCache.has(strongNum)) return _defCache.get(strongNum);

  const isHeb = strongNum.startsWith('H');

  let entry;
  if (isHeb) {
    // 히브리어: 로컬과 BDBT 병렬 fetch — 둘 다 성공하면 BDBT 우선(더 상세)
    const [local, bdbt] = await Promise.all([
      lookupLocalDef(strongNum).catch(() => null),
      fetchBDBDef(strongNum).catch(() => null),
    ]);
    entry = bdbt || local || null;
  } else {
    // 헬라어: 로컬 청크만 (외부 API 불필요)
    entry = await lookupLocalDef(strongNum).catch(() => null);
  }

  _defCache.set(strongNum, entry);
  return entry;
}

// ── Morphology 코드 해석 ───────────────────────────────────────────────────
// TAGNT (Greek): "V-AAI-3S" = Verb, Aorist, Active, Indicative, 3rd person Singular
// TAHOT (Hebrew): "HNcmpa" = H(ebrew) N(oun) c(ommon) m(asculine) p(lural) a(bsolute)
// 여기서는 간략한 사람이 읽기 좋은 문자열로 변환

const GREEK_POS = {
  V: '동사', N: '명사', A: '형용사', T: '관사', P: '대명사',
  D: '부사', C: '접속사', I: '감탄사', R: '전치사', X: '불변사',
  ADV: '부사', PREP: '전치사', CONJ: '접속사', PRT: '불변사',
  INJ: '감탄사',
};
const GREEK_TENSE = {
  P: '현재', I: '미완료', F: '미래', A: '부정과거', X: '완료', Y: '과거완료',
};
const GREEK_VOICE = { A: '능동', M: '중간', P: '수동', E: '중수동' };
const GREEK_MOOD  = { I: '직설', S: '가정', O: '기원', M: '명령', N: '부정사', P: '분사' };
const GREEK_CASE  = { N: '주격', G: '속격', D: '여격', A: '대격', V: '호격' };
const GREEK_GEND  = { M: '남성', F: '여성', N: '중성' };
const GREEK_NUM   = { S: '단수', P: '복수', D: '쌍수' };
const GREEK_PERS  = { '1': '1인칭', '2': '2인칭', '3': '3인칭' };

// Greek morph 파싱: "V-AAI-3S", "N-GSM", "N-GSM-P" 등
function parseGreekMorph(code) {
  if (!code) return null;
  const [head, ...rest] = code.split('-');
  const pos = GREEK_POS[head] || head;
  const parts = [pos];
  const detail = rest.join('-');
  if (!detail) return { pos, human: pos };

  // Verb: "AAI-3S" → tense, voice, mood + person, number
  if (head === 'V') {
    const [tvm, pn] = detail.split('-');
    if (tvm?.length >= 3) {
      const [t, v, m] = tvm.split('');
      if (GREEK_TENSE[t]) parts.push(GREEK_TENSE[t]);
      if (GREEK_VOICE[v]) parts.push(GREEK_VOICE[v]);
      if (GREEK_MOOD[m])  parts.push(GREEK_MOOD[m]);
    }
    if (pn?.length >= 2) {
      const [p, n] = pn.split('');
      if (GREEK_PERS[p]) parts.push(GREEK_PERS[p]);
      if (GREEK_NUM[n])  parts.push(GREEK_NUM[n]);
    }
  } else {
    // Nominal: "GSM" → case, number, gender
    const [gnc] = detail.split('-');
    if (gnc?.length >= 3) {
      const [c, n, g] = gnc.split('');
      if (GREEK_CASE[c]) parts.push(GREEK_CASE[c]);
      if (GREEK_NUM[n])  parts.push(GREEK_NUM[n]);
      if (GREEK_GEND[g]) parts.push(GREEK_GEND[g]);
    }
  }
  return { pos, human: parts.join(' · ') };
}

// Hebrew morph 파싱 — 매우 상세하므로 최소한만
const HEB_POS = {
  V: '동사', N: '명사', A: '형용사', P: '대명사',
  T: '접속사·불변사', R: '전치사', C: '접속사', D: '부사',
  S: '접미대명사', X: '불변사', I: '감탄사',
};
const HEB_VERB_STEM = { q: 'Qal', N: 'Niphal', p: 'Piel', P: 'Pual', h: 'Hiphil', H: 'Hophal', t: 'Hithpael' };
const HEB_VERB_ASPECT = { p: '완료', i: '미완료', v: '연속', q: '연속완료', a: '분사', c: '분사수동', r: '분사', s: '부정사', j: '지시' };
const HEB_GEND = { m: '남성', f: '여성', c: '공성' };
const HEB_NUM  = { s: '단수', p: '복수', d: '쌍수' };
const HEB_PERS = { '1': '1인칭', '2': '2인칭', '3': '3인칭' };

function parseHebrewMorph(code) {
  if (!code || !code.startsWith('H')) return null;
  const rest = code.slice(1);
  // 접두어와 본체가 '/'로 분리됨
  const parts = rest.split('/').map((seg) => {
    if (!seg) return null;
    const head = seg[0];
    const pos = HEB_POS[head] || head;
    // Verb: e.g. "Vqp3ms" → V+q(Qal)+p(perfect)+3+m+s
    if (head === 'V' && seg.length >= 5) {
      const stem = HEB_VERB_STEM[seg[1]] || seg[1];
      const aspect = HEB_VERB_ASPECT[seg[2]] || seg[2];
      const p = HEB_PERS[seg[3]];
      const g = HEB_GEND[seg[4]];
      const n = HEB_NUM[seg[5]];
      return [pos, stem, aspect, p, g, n].filter(Boolean).join(' · ');
    }
    // Noun: "Ncmpa" → N+c(common)+m+p+a(absolute)
    if (head === 'N' && seg.length >= 5) {
      const g = HEB_GEND[seg[2]];
      const n = HEB_NUM[seg[3]];
      const state = seg[4] === 'a' ? '독립형' : seg[4] === 'c' ? '연계형' : '';
      return [pos, g, n, state].filter(Boolean).join(' · ');
    }
    return pos;
  }).filter(Boolean);
  return { human: parts.join(' | ') };
}

export function humanizeMorph(code) {
  if (!code) return '';
  if (code.startsWith('H')) return parseHebrewMorph(code)?.human || code;
  return parseGreekMorph(code)?.human || code;
}
