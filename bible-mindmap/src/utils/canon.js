// 성경 정경 카테고리 (7종) · 관주(crossref) 닷 컬러 매핑
// 컬러는 시각적으로 즉시 구분 가능한 명도·채도 기준

const CANON_CATEGORIES = {
  torah:     { key: 'torah',     label: '오경',        color: '#eab308', bg: 'rgba(234,179,8,.14)',   emoji: '🟡' },
  history:   { key: 'history',   label: '역사서',      color: '#f97316', bg: 'rgba(249,115,22,.14)',  emoji: '🟠' },
  wisdom:    { key: 'wisdom',    label: '시가서·지혜', color: '#a855f7', bg: 'rgba(168,85,247,.14)',  emoji: '🟣' },
  prophets:  { key: 'prophets',  label: '예언서',      color: '#dc2626', bg: 'rgba(220,38,38,.14)',   emoji: '🔴' },
  gospels:   { key: 'gospels',   label: '복음서·행전', color: '#059669', bg: 'rgba(5,150,105,.14)',   emoji: '🟢' },
  epistles:  { key: 'epistles',  label: '서신',        color: '#2563eb', bg: 'rgba(37,99,235,.14)',   emoji: '🔵' },
  apocalypse:{ key: 'apocalypse',label: '계시록',      color: '#1e293b', bg: 'rgba(30,41,59,.15)',    emoji: '⚫' },
}

// bookId (bibleBooks.js 표준 id) → 카테고리 매핑
const BOOK_TO_CANON = {
  // 오경 (5)
  Gen: 'torah', Exod: 'torah', Lev: 'torah', Num: 'torah', Deut: 'torah',
  // 역사서 (12)
  Josh: 'history', Judg: 'history', Ruth: 'history',
  '1Sam': 'history', '2Sam': 'history', '1Kgs': 'history', '2Kgs': 'history',
  '1Chr': 'history', '2Chr': 'history', Ezra: 'history', Neh: 'history', Esth: 'history',
  // 시가서·지혜 (5)
  Job: 'wisdom', Ps: 'wisdom', Prov: 'wisdom', Eccl: 'wisdom', Song: 'wisdom',
  // 예언서 (17 · 대선지 5 + 소선지 12)
  Isa: 'prophets', Jer: 'prophets', Lam: 'prophets', Ezek: 'prophets', Dan: 'prophets',
  Hos: 'prophets', Joel: 'prophets', Amos: 'prophets', Obad: 'prophets', Jonah: 'prophets',
  Mic: 'prophets', Nah: 'prophets', Hab: 'prophets', Zeph: 'prophets', Hag: 'prophets',
  Zech: 'prophets', Mal: 'prophets',
  // 복음서·행전 (5)
  Matt: 'gospels', Mark: 'gospels', Luke: 'gospels', John: 'gospels', Acts: 'gospels',
  // 서신 (21)
  Rom: 'epistles', '1Cor': 'epistles', '2Cor': 'epistles', Gal: 'epistles', Eph: 'epistles',
  Phil: 'epistles', Col: 'epistles', '1Thess': 'epistles', '2Thess': 'epistles',
  '1Tim': 'epistles', '2Tim': 'epistles', Titus: 'epistles', Phlm: 'epistles',
  Heb: 'epistles', Jas: 'epistles',
  '1Pet': 'epistles', '2Pet': 'epistles', '1John': 'epistles', '2John': 'epistles', '3John': 'epistles',
  Jude: 'epistles',
  // 계시록 (1)
  Rev: 'apocalypse',
}

export function getCanonCategory(bookId) {
  const key = BOOK_TO_CANON[bookId] || 'history'
  return CANON_CATEGORIES[key]
}

export function getCanonColor(bookId) {
  return getCanonCategory(bookId).color
}

export const CANON_LEGEND = Object.values(CANON_CATEGORIES)
