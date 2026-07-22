/**
 * arcingBuilder.js
 *
 * 원어 어형 데이터에서 절 관계 다이어그램(Arcing) 구조를 자동 생성.
 * 히브리어: wayyiqtol(וַיִּ) = 서사 주선. 비-wayyiqtol 절은 전후 맥락에 따라 배치.
 * 그리스어: 직설법/명령법/가정법 동사 = 주선.
 */

import { loadChapterLexicon } from './lexicon';
import { fetchVerse } from '../api/bibleApi';
import { isOT } from '../data/bibleBooks';

// ── 히브리어 어형 감지 ─────────────────────────────────────────────────────

/**
 * TAHOT 형식: Hc/Vqw3ms, Hc/VNw3fs 등
 * 핵심: 어디서나 V[stem]w 패턴을 찾는다 (앵커 없음).
 */
function isWayyiqtol(m) {
  return /V[qpnhNPDQHTCAEF]w/.test(m || '');
}

function isHebParticiple(m) {
  return /V[qpnhNPDQHTCAEF][rs]/.test(m || '');
}

/**
 * Hebrew word 정리: 형태소 경계 '/', 악센트 마크 제거
 * 예: 'וַ/יְהִ֗י' → 'וַיְהִ֗י'
 */
function cleanHebWord(w) {
  return (w || '').replace(/\//g, '');
}

// ── Hebrew 접속사 Strong's → 종속절 역할 ──────────────────────────────────
const HEB_CONJ_ROLES = {
  'H3588': 'ground',        // כִּי  because / that
  'H0834': 'temporal',      // אֲשֶׁר which / when
  'H3651': 'result',        // לָכֵן therefore
  'H0518': 'circumstance',  // אִם  if / when
  'H1571': 'circumstance',  // גַּם  also / even
  'H3282': 'ground',        // יַעַן because
  'H0310': 'result',        // אַחַר after that
};

function hebrewClauseRole(words) {
  for (const w of words.slice(0, 5)) {
    const r = HEB_CONJ_ROLES[w.s];
    if (r) return r;
    if (isHebParticiple(w.m)) return 'circumstance';
    // 명령형 = 발화 내용
    if (/V[qpnhNPDQHTC]v/.test(w.m || '')) return 'speech';
  }
  return 'temporal';
}

// ── Greek verb 감지 ────────────────────────────────────────────────────────

/**
 * TAGNT: V-{tense}{voice}{mood}-{pgn}
 *   mood I=Indicative, M=Imperative, S=Subjunctive → main
 *   mood P=Participle, N=Infinitive → subordinate
 */
function isGrkMainVerb(m) {
  return /^V-[A-Z]{2}[IMS]/.test(m || '');
}

function isGrkSubordVerb(m) {
  return /^V-[A-Z]{2}[PN]/.test(m || '');
}

const GRK_CONJ_ROLES = {
  'G1063': 'ground',        // γάρ
  'G3754': 'ground',        // ὅτι
  'G2443': 'result',        // ἵνα
  'G5620': 'result',        // ὥστε
  'G3767': 'result',        // οὖν
  'G1487': 'circumstance',  // εἰ
  'G3739': 'temporal',      // ὅς
  'G3753': 'temporal',      // ὅτε
};

function greekClauseRole(words) {
  for (const w of words.slice(0, 4)) {
    const r = GRK_CONJ_ROLES[w.s];
    if (r) return r;
    if (isGrkSubordVerb(w.m)) return 'circumstance';
  }
  return 'temporal';
}

// ── 공용 헬퍼 ─────────────────────────────────────────────────────────────

function makeVerseRef(chapter, v) {
  return `${chapter}:${v}`;
}

function truncateKo(text, maxLen = 55) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

// ── 히브리어 구조 생성 ─────────────────────────────────────────────────────

function buildHebrewStructure(chLex, verseTexts, chapter, verseStart, verseEnd) {
  /**
   * 전략:
   *  1) 각 절을 분석해 주동사(wayyiqtol) 목록을 추출
   *  2) wayyiqtol이 없는 절 → 선행절(앞 주동사 없음) 또는 후행절(앞 주동사 있음)
   *  3) 같은 절 안에 wayyiqtol 여러 개 → 각각 별도 주선으로
   */

  const structure = [];
  let pendingPre = []; // 첫 주동사 앞에 쌓이는 선행절 버퍼

  for (let v = verseStart; v <= verseEnd; v++) {
    const words = chLex[v] || [];
    const fullKo = verseTexts[v] || '';
    const ko = truncateKo(fullKo);
    const ref = makeVerseRef(chapter, v);

    const mainWords = words.filter(w => isWayyiqtol(w.m));

    if (mainWords.length === 0) {
      // 비-wayyiqtol 절 → 선행 or 후행
      const role = hebrewClauseRole(words);
      const subClause = { verse: ref, ko: fullKo, role };

      if (structure.length === 0) {
        pendingPre.push(subClause);
      } else {
        const lastMain = findLastMainEntry(structure);
        if (lastMain) (lastMain.following = lastMain.following || []).push(subClause);
      }
    } else {
      // wayyiqtol 있는 절 → 절 단위 1행 (첫 번째 wayyiqtol을 대표 동사로)
      const entry = {
        main: {
          verse: ref,
          ko: fullKo,
          heb: cleanHebWord(mainWords[0].w),
          morph: mainWords[0].m || '',
        },
        following: [],
      };
      if (pendingPre.length > 0) {
        entry.preceding = [...pendingPre];
        pendingPre = [];
      }
      structure.push(entry);
    }
  }

  // 남은 선행절 버퍼 → 마지막 항목의 후행절로 처리
  if (pendingPre.length > 0) {
    const lastMain = findLastMainEntry(structure);
    if (lastMain) {
      lastMain.following = [...(lastMain.following || []), ...pendingPre];
    }
  }

  return structure;
}

function findLastMainEntry(structure) {
  for (let i = structure.length - 1; i >= 0; i--) {
    if (structure[i].main) return structure[i];
  }
  return null;
}

// ── 그리스어 구조 생성 ─────────────────────────────────────────────────────

function buildGreekStructure(chLex, verseTexts, chapter, verseStart, verseEnd) {
  const structure = [];
  let pendingPre = [];

  for (let v = verseStart; v <= verseEnd; v++) {
    const words = chLex[v] || [];
    const fullKo = verseTexts[v] || '';
    const ref = makeVerseRef(chapter, v);

    const mainWords = words.filter(w => isGrkMainVerb(w.m));

    if (mainWords.length === 0) {
      const subClause = { verse: ref, ko: fullKo, role: greekClauseRole(words) };
      if (structure.length === 0) {
        pendingPre.push(subClause);
      } else {
        const last = findLastMainEntry(structure);
        if (last) (last.following = last.following || []).push(subClause);
      }
    } else {
      const entry = {
        main: {
          verse: ref,
          ko: fullKo,
          heb: (mainWords[0].w || '').replace(/\//g, ''), // 헬라어도 동일 필드명 사용
          morph: mainWords[0].m || '',                     // 동사 어형 (UI 라벨용)
        },
        following: [],
      };
      if (pendingPre.length > 0) {
        entry.preceding = [...pendingPre];
        pendingPre = [];
      }
      structure.push(entry);
    }
  }

  if (pendingPre.length > 0) {
    const last = findLastMainEntry(structure);
    if (last) last.following = [...(last.following || []), ...pendingPre];
  }

  return structure;
}

// ── 공개 API ──────────────────────────────────────────────────────────────

/**
 * 주어진 책/장/절 범위에서 Arcing STRUCTURE 배열 자동 생성.
 */
export async function buildArcingFromPassage(bookId, chapter, verseStart, verseEnd) {
  const hebrew = isOT(bookId);

  const chLex = await loadChapterLexicon(bookId, chapter);
  if (!chLex) throw new Error('원어 데이터를 불러올 수 없습니다.');

  // KRV 본문 병렬 로드 (장 캐시 활용)
  const verseTexts = {};
  await Promise.all(
    Array.from({ length: verseEnd - verseStart + 1 }, (_, i) => verseStart + i).map(async (v) => {
      try {
        verseTexts[v] = await fetchVerse(bookId, chapter, v, v, 'krv');
      } catch {
        verseTexts[v] = '';
      }
    })
  );

  return hebrew
    ? buildHebrewStructure(chLex, verseTexts, chapter, verseStart, verseEnd)
    : buildGreekStructure(chLex, verseTexts, chapter, verseStart, verseEnd);
}
