// 설교 문서 검색을 위한 태그 추출/관리 유틸
import { ALL_BOOKS, OT_BOOKS, NT_BOOKS, KO_ABBR, getBook, isOT } from '../data/bibleBooks';

// 성경 카테고리 (신약/구약 세부 구분)
const BOOK_CATEGORIES = {
  // 구약
  Gen: '오경', Exod: '오경', Lev: '오경', Num: '오경', Deut: '오경',
  Josh: '역사서', Judg: '역사서', Ruth: '역사서',
  '1Sam': '역사서', '2Sam': '역사서', '1Kgs': '역사서', '2Kgs': '역사서',
  '1Chr': '역사서', '2Chr': '역사서', Ezra: '역사서', Neh: '역사서', Esth: '역사서',
  Job: '시가서', Ps: '시가서', Prov: '시가서', Eccl: '시가서', Song: '시가서',
  Isa: '대선지서', Jer: '대선지서', Lam: '대선지서', Ezek: '대선지서', Dan: '대선지서',
  Hos: '소선지서', Joel: '소선지서', Amos: '소선지서', Obad: '소선지서',
  Jonah: '소선지서', Mic: '소선지서', Nah: '소선지서', Hab: '소선지서',
  Zeph: '소선지서', Hag: '소선지서', Zech: '소선지서', Mal: '소선지서',
  // 신약
  Matt: '복음서', Mark: '복음서', Luke: '복음서', John: '복음서',
  Acts: '역사서',
  Rom: '바울서신', '1Cor': '바울서신', '2Cor': '바울서신', Gal: '바울서신',
  Eph: '바울서신', Phil: '바울서신', Col: '바울서신',
  '1Thess': '바울서신', '2Thess': '바울서신',
  '1Tim': '바울서신', '2Tim': '바울서신', Titus: '바울서신', Phlm: '바울서신',
  Heb: '일반서신', Jas: '일반서신', '1Pet': '일반서신', '2Pet': '일반서신',
  '1John': '일반서신', '2John': '일반서신', '3John': '일반서신', Jude: '일반서신',
  Rev: '예언서',
};

// 긴 약어 → 짧은 약어 순서로 정렬 (예: '고전' 이 '고' 보다 먼저 매치되어야 함)
const KO_ABBRS_SORTED = Object.keys(KO_ABBR).sort((a, b) => b.length - a.length);

// 입력 문자열 안에서 성경 책명(정식/약어) 을 모두 찾아 bookId 배열로 반환
function findBookIds(text) {
  const ids = new Set();
  // 1) 정식 명칭 매치 (요한복음, 창세기 등)
  for (const b of ALL_BOOKS) {
    if (text.includes(b.ko)) ids.add(b.id);
  }
  // 2) 약어 매치 (요 3:16, 창 1:1 등) — 정식 명칭과 겹치는 것은 이미 잡혔음
  for (const abbr of KO_ABBRS_SORTED) {
    // 약어 뒤에 숫자 또는 공백+숫자가 오는 경우만 인정
    const rx = new RegExp(`(?:^|[\\s,;])${abbr}\\s*\\d`, 'g');
    if (rx.test(text)) ids.add(KO_ABBR[abbr]);
  }
  return Array.from(ids);
}

/**
 * 성경 본문 문자열에서 검색용 태그 배열을 자동 추출.
 * 예: "요한복음 3:16" → ["요한복음", "요한복음-3장", "신약", "복음서"]
 *     "창 1:1-5, 시 23"  → ["창세기", "창세기-1장", "구약", "오경",
 *                          "시편", "시편-23장", "시가서"]
 */
export function extractScriptureTags(scripture) {
  if (!scripture) return [];
  const tags = new Set();
  const bookIds = findBookIds(scripture);

  for (const id of bookIds) {
    const book = getBook(id);
    if (!book) continue;
    // 기본 태그: 책 이름
    tags.add(book.ko);
    // 카테고리 태그: 오경/역사서/시가서/…
    const cat = BOOK_CATEGORIES[id];
    if (cat) tags.add(cat);
    // 신약/구약 태그
    tags.add(isOT(id) ? '구약' : '신약');
    // 장 태그 추출: "요한복음 3", "요한복음3장", "요 3:16" 등
    const abbrs = Object.entries(KO_ABBR).filter(([, v]) => v === id).map(([k]) => k);
    const names = [book.ko, ...abbrs].sort((a, b) => b.length - a.length);
    for (const name of names) {
      const rx = new RegExp(`${name}\\s*(\\d+)`, 'g');
      let m;
      while ((m = rx.exec(scripture)) !== null) {
        tags.add(`${book.ko}-${m[1]}장`);
      }
    }
  }
  return Array.from(tags);
}

/**
 * 사용자 입력 문자열(쉼표/공백/줄바꿈 구분) 을 태그 배열로 정규화.
 * '#' 접두어 자동 제거, 중복 제거, 공백 태그 제거.
 */
export function parseTagInput(input) {
  if (!input) return [];
  // 쉼표 · 줄바꿈 · #(태그 경계) 로 분할
  const parts = input
    .split(/[,\n]|(?=#)/)
    .map((s) => s.trim().replace(/^#+/, ''))
    .filter(Boolean);
  return Array.from(new Set(parts));
}

/**
 * 문서 데이터에서 자동 태그 + 수동 태그를 병합해 반환.
 * @param {object} sermonData  { scripture, tags, ... }
 */
export function collectDocTags(sermonData) {
  if (!sermonData) return [];
  const auto   = extractScriptureTags(sermonData.scripture || '');
  const manual = Array.isArray(sermonData.tags) ? sermonData.tags : [];
  return Array.from(new Set([...auto, ...manual]));
}
