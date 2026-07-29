import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/data/bookContext.js');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

const importLine = "import { ALL_BOOKS } from './bibleBooks';";
if (!source.includes(importLine)) {
  source = `${importLine}\n${source}`;
  changed = true;
}

const oldBlock = `// ── 등록된 책 컨텍스트 (activeBookId 로 조회) ────────────────────────────
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

const newBlock = `// ── 등록된 책 컨텍스트 + 66권 공통 fallback ─────────────────────────────
// 전문 컨텍스트는 그대로 우선 사용하고, 아직 전문 데이터가 없는 책은
// KRV 본문 + 가능한 원어 lex + 공통 담화 규칙으로 문맥성경을 사용할 수 있게 한다.
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

function genericGenre(book, testament) {
  const id = book.id;
  if (['Gen','Exod','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth'].includes(id)) return '구약 서사·역사';
  if (['Lev'].includes(id)) return '구약 율법';
  if (['Job','Ps','Prov','Eccl','Song','Lam'].includes(id)) return '구약 시가·지혜';
  if (['Isa','Jer','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal'].includes(id)) return '구약 예언';
  if (['Matt','Mark','Luke','John'].includes(id)) return '신약 복음서';
  if (id === 'Acts') return '신약 서사';
  if (id === 'Rev') return '신약 묵시·예언';
  return testament === 'NT' ? '신약 서신서' : '성경 본문';
}

function makeGenericContext(book, index) {
  const testament = index < 39 ? 'OT' : 'NT';
  const lexCorpus = testament === 'OT' ? 'hot' : 'gnt';
  return {
    id: book.id,
    book: {
      ko: book.ko,
      bollsNum: index + 1,
      lexId: book.id,
      lexCorpus,
      en: book.en,
      testament,
    },
    chapters: book.chapters,
    discourseRules: testament === 'NT' ? GNT_DISCOURSE_RULES : HEBREW_NARRATIVE_RULES,
    manualDiscourse: {},
    theoTerms: {},
    meta: {
      genre: genericGenre(book, testament),
      genreNote: '공통 컨텍스트 · 전문 권별 데이터는 단계적으로 확장',
      author: '', audience: '', theme: '', themeNote: '',
      chapterAgenda: {},
    },
    macro: { sections: [], pivots: [], arcs: [] },
  };
}

export const BOOK_CONTEXTS = Object.fromEntries(
  ALL_BOOKS.map((book, index) => [
    book.id,
    SPECIALIZED_BOOK_CONTEXTS[book.id] || makeGenericContext(book, index),
  ])
);

export const SUPPORTED_BOOK_IDS = ALL_BOOKS.map((book) => book.id);`;

if (!source.includes('SPECIALIZED_BOOK_CONTEXTS')) {
  if (!source.includes(oldBlock)) throw new Error('[all-bible-contexts] registry anchor not found; refusing unsafe patch');
  source = source.replace(oldBlock, newBlock);
  changed = true;
}

if (changed) {
  fs.writeFileSync(target, source);
  console.log('✓ all 66 Bible books enabled with specialized-first fallback contexts');
} else {
  console.log('✓ all 66 Bible fallback contexts already enabled');
}
