import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/data/bookContext.js');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

const imports = [
  "import { ALL_BOOKS } from './bibleBooks';",
  "import { buildExpandedContext } from './expandedContextEngine';",
  "import { EXPANDED_OT1 } from './expandedProfilesOT1';",
  "import { EXPANDED_OT2 } from './expandedProfilesOT2';",
  "import { EXPANDED_NT } from './expandedProfilesNT';",
];
for (const line of [...imports].reverse()) {
  if (!source.includes(line)) { source = `${line}\n${source}`; changed = true; }
}

const originalBlock = `// ── 등록된 책 컨텍스트 (activeBookId 로 조회) ────────────────────────────
export const BOOK_CONTEXTS = {
  Gen: GEN_CTX,
  Exod: EXO_CTX,
  Lev: LEV_CTX,
  Rom: ROM_CTX,
  Ruth: RUTH_CTX,
  Matt: MAT_CTX,
  Mark: MRK_CTX,
  Luke: LUK_CTX,
  John: JHN_CTX,
  Acts: ACT_CTX,
  Gal: GAL_CTX,
  Eph: EPH_CTX,
  Phil: PHIL_CTX,
  Col: COL_CTX,
  '1Thess': THESS1_CTX,
  '2Thess': THESS2_CTX,
  '1Tim': TIM1_CTX,
  '2Tim': TIM2_CTX,
  Titus: TIT_CTX,
  Phlm: PHLM_CTX,
  Heb: HEB_CTX,
};

export const SUPPORTED_BOOK_IDS = Object.keys(BOOK_CONTEXTS);`;

const structuredBlock = `// ── 66권 정식 컨텍스트 레지스트리 ──────────────────────────────────────
// 기존 21권의 전문 컨텍스트는 그대로 보존하고, 나머지 45권은 권별 구조 프로필과
// 장르별 담화 규칙을 결합해 로마서와 동일한 필드 계약으로 제공한다.
const SPECIALIZED_BOOK_CONTEXTS = {
  Gen: GEN_CTX,
  Exod: EXO_CTX,
  Lev: LEV_CTX,
  Rom: ROM_CTX,
  Ruth: RUTH_CTX,
  Matt: MAT_CTX,
  Mark: MRK_CTX,
  Luke: LUK_CTX,
  John: JHN_CTX,
  Acts: ACT_CTX,
  Gal: GAL_CTX,
  Eph: EPH_CTX,
  Phil: PHIL_CTX,
  Col: COL_CTX,
  '1Thess': THESS1_CTX,
  '2Thess': THESS2_CTX,
  '1Tim': TIM1_CTX,
  '2Tim': TIM2_CTX,
  Titus: TIT_CTX,
  Phlm: PHLM_CTX,
  Heb: HEB_CTX,
};

const EXPANDED_BOOK_PROFILES = { ...EXPANDED_OT1, ...EXPANDED_OT2, ...EXPANDED_NT };

function makeFallbackContext(book, index) {
  const testament = index < 39 ? 'OT' : 'NT';
  return {
    id: book.id,
    book: { ko: book.ko, bollsNum: index + 1, lexId: book.id, lexCorpus: testament === 'OT' ? 'hot' : 'gnt', en: book.en, testament },
    chapters: book.chapters,
    discourseRules: testament === 'NT' ? GNT_DISCOURSE_RULES : HEBREW_NARRATIVE_RULES,
    manualDiscourse: {}, theoTerms: {},
    meta: { genre: testament === 'NT' ? '신약 성경' : '구약 성경', genreNote: '안전 fallback', author: '', audience: '', theme: '', themeNote: '', chapterAgenda: {} },
    macro: { sections: [], pivots: [], arcs: [] },
  };
}

export const BOOK_CONTEXTS = Object.fromEntries(
  ALL_BOOKS.map((book, index) => {
    if (SPECIALIZED_BOOK_CONTEXTS[book.id]) return [book.id, SPECIALIZED_BOOK_CONTEXTS[book.id]];
    const profile = EXPANDED_BOOK_PROFILES[book.id];
    const baseRules = index < 39 ? HEBREW_NARRATIVE_RULES : GNT_DISCOURSE_RULES;
    return [book.id, buildExpandedContext(book, index, profile, baseRules) || makeFallbackContext(book, index)];
  })
);

export const SUPPORTED_BOOK_IDS = ALL_BOOKS.map((book) => book.id);`;

const oldFallbackStart = '// ── 등록된 책 컨텍스트 + 66권 공통 fallback';
if (source.includes(originalBlock)) {
  source = source.replace(originalBlock, structuredBlock);
  changed = true;
} else if (source.includes(oldFallbackStart) && !source.includes('const EXPANDED_BOOK_PROFILES')) {
  const start = source.indexOf(oldFallbackStart);
  const endMarker = 'export const SUPPORTED_BOOK_IDS = ALL_BOOKS.map((book) => book.id);';
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('[all-bible-contexts] old fallback block boundary not found');
  source = source.slice(0, start) + structuredBlock + source.slice(end + endMarker.length);
  changed = true;
}

if (!source.includes('const EXPANDED_BOOK_PROFILES')) throw new Error('[all-bible-contexts] structured registry was not installed');

if (changed) {
  fs.writeFileSync(target, source);
  console.log('✓ all 66 Bible books use specialized or structured full contexts');
} else {
  console.log('✓ all 66 structured contexts already enabled');
}
