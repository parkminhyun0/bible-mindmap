// 신약 → 구약 인용/반향 매핑 시드 데이터
// 각 항목은 확인된 표준 인용(NA28/UBS 인용 인덱스 기반)만 수록
//
// 스키마:
//   id       : 고유 슬러그
//   citing   : 인용하는 쪽 (신약)  { book, chapter, verseStart, verseEnd }
//   sources  : 인용되는 원 본문 (구약) 배열
//              각 source는 { book, chapter, verseStart, verseEnd, part?, kind? }
//              - part : 인용 위치 힌트 (예: "1:2a")
//              - kind : 'quotation' | 'allusion' | 'echo' (기본 'quotation')
//   note     : 짧은 해설

export const CITATIONS = [
  // ── 마태복음 ──
  {
    id: 'matt-1-23',
    citing: { book: 'Matt', chapter: 1, verseStart: 23, verseEnd: 23 },
    sources: [{ book: 'Isa', chapter: 7, verseStart: 14, verseEnd: 14 }],
    note: '동정녀 잉태 예언 — 임마누엘',
  },
  {
    id: 'matt-2-6',
    citing: { book: 'Matt', chapter: 2, verseStart: 6, verseEnd: 6 },
    sources: [{ book: 'Mic', chapter: 5, verseStart: 2, verseEnd: 2 }],
    note: '베들레헴에서 나올 통치자',
  },
  {
    id: 'matt-2-15',
    citing: { book: 'Matt', chapter: 2, verseStart: 15, verseEnd: 15 },
    sources: [{ book: 'Hos', chapter: 11, verseStart: 1, verseEnd: 1 }],
    note: '"애굽에서 내 아들을 불렀다" — 유형론적 성취',
  },
  {
    id: 'matt-2-18',
    citing: { book: 'Matt', chapter: 2, verseStart: 18, verseEnd: 18 },
    sources: [{ book: 'Jer', chapter: 31, verseStart: 15, verseEnd: 15 }],
    note: '라마의 통곡 — 라헬이 자식을 잃음',
  },
  {
    id: 'matt-3-3',
    citing: { book: 'Matt', chapter: 3, verseStart: 3, verseEnd: 3 },
    sources: [{ book: 'Isa', chapter: 40, verseStart: 3, verseEnd: 3 }],
    note: '광야에 외치는 자의 소리',
  },
  {
    id: 'matt-4-4',
    citing: { book: 'Matt', chapter: 4, verseStart: 4, verseEnd: 4 },
    sources: [{ book: 'Deut', chapter: 8, verseStart: 3, verseEnd: 3 }],
    note: '사람이 떡으로만 살 것이 아니요',
  },
  {
    id: 'matt-22-37',
    citing: { book: 'Matt', chapter: 22, verseStart: 37, verseEnd: 37 },
    sources: [{ book: 'Deut', chapter: 6, verseStart: 5, verseEnd: 5 }],
    note: '가장 크고 첫째 되는 계명 — 쉐마',
  },
  {
    id: 'matt-22-39',
    citing: { book: 'Matt', chapter: 22, verseStart: 39, verseEnd: 39 },
    sources: [{ book: 'Lev', chapter: 19, verseStart: 18, verseEnd: 18 }],
    note: '둘째 계명 — 네 이웃을 네 자신 같이',
  },
  {
    id: 'matt-27-46',
    citing: { book: 'Matt', chapter: 27, verseStart: 46, verseEnd: 46 },
    sources: [{ book: 'Ps', chapter: 22, verseStart: 1, verseEnd: 1 }],
    note: '엘리 엘리 라마 사박다니',
  },

  // ── 마가복음 ──
  {
    id: 'mark-1-2-3',
    citing: { book: 'Mark', chapter: 1, verseStart: 2, verseEnd: 3 },
    sources: [
      { book: 'Exod', chapter: 23, verseStart: 20, verseEnd: 20, part: '1:2a' },
      { book: 'Mal', chapter: 3, verseStart: 1, verseEnd: 1, part: '1:2b' },
      { book: 'Isa', chapter: 40, verseStart: 3, verseEnd: 3, part: '1:3' },
    ],
    note: '삼중 복합 인용 — 마가는 이사야만 표제로 언급',
  },
  {
    id: 'mark-7-6-7',
    citing: { book: 'Mark', chapter: 7, verseStart: 6, verseEnd: 7 },
    sources: [{ book: 'Isa', chapter: 29, verseStart: 13, verseEnd: 13 }],
    note: '입술로만 공경하는 백성 — 외식주의 비판',
  },
  {
    id: 'mark-10-6-8',
    citing: { book: 'Mark', chapter: 10, verseStart: 6, verseEnd: 8 },
    sources: [
      { book: 'Gen', chapter: 1, verseStart: 27, verseEnd: 27, part: '10:6' },
      { book: 'Gen', chapter: 2, verseStart: 24, verseEnd: 24, part: '10:7-8' },
    ],
    note: '결혼의 창조 질서 — 창세기 이중 인용',
  },
  {
    id: 'mark-12-29-30',
    citing: { book: 'Mark', chapter: 12, verseStart: 29, verseEnd: 30 },
    sources: [{ book: 'Deut', chapter: 6, verseStart: 4, verseEnd: 5 }],
    note: '쉐마 — 첫째 되는 계명',
  },
  {
    id: 'mark-12-31',
    citing: { book: 'Mark', chapter: 12, verseStart: 31, verseEnd: 31 },
    sources: [{ book: 'Lev', chapter: 19, verseStart: 18, verseEnd: 18 }],
    note: '둘째 계명 — 이웃 사랑',
  },
  {
    id: 'mark-12-36',
    citing: { book: 'Mark', chapter: 12, verseStart: 36, verseEnd: 36 },
    sources: [{ book: 'Ps', chapter: 110, verseStart: 1, verseEnd: 1 }],
    note: '주께서 내 주께 이르시되',
  },
  {
    id: 'mark-15-34',
    citing: { book: 'Mark', chapter: 15, verseStart: 34, verseEnd: 34 },
    sources: [{ book: 'Ps', chapter: 22, verseStart: 1, verseEnd: 1 }],
    note: '엘로이 엘로이 라마 사박다니',
  },

  // ── 누가복음 ──
  {
    id: 'luke-3-4-6',
    citing: { book: 'Luke', chapter: 3, verseStart: 4, verseEnd: 6 },
    sources: [{ book: 'Isa', chapter: 40, verseStart: 3, verseEnd: 5 }],
    note: '누가는 이사야 40:3-5까지 확장 인용',
  },
  {
    id: 'luke-4-18-19',
    citing: { book: 'Luke', chapter: 4, verseStart: 18, verseEnd: 19 },
    sources: [{ book: 'Isa', chapter: 61, verseStart: 1, verseEnd: 2 }],
    note: '나사렛 회당의 취임 설교',
  },

  // ── 요한복음 ──
  {
    id: 'john-1-23',
    citing: { book: 'John', chapter: 1, verseStart: 23, verseEnd: 23 },
    sources: [{ book: 'Isa', chapter: 40, verseStart: 3, verseEnd: 3 }],
    note: '세례 요한의 자기 정체 선언',
  },
  {
    id: 'john-12-15',
    citing: { book: 'John', chapter: 12, verseStart: 15, verseEnd: 15 },
    sources: [{ book: 'Zech', chapter: 9, verseStart: 9, verseEnd: 9 }],
    note: '나귀 새끼를 타고 오시는 왕',
  },
  {
    id: 'john-12-38',
    citing: { book: 'John', chapter: 12, verseStart: 38, verseEnd: 38 },
    sources: [{ book: 'Isa', chapter: 53, verseStart: 1, verseEnd: 1 }],
    note: '우리의 전한 것을 누가 믿었느냐',
  },

  // ── 로마서 ──
  {
    id: 'rom-1-17',
    citing: { book: 'Rom', chapter: 1, verseStart: 17, verseEnd: 17 },
    sources: [{ book: 'Hab', chapter: 2, verseStart: 4, verseEnd: 4 }],
    note: '오직 의인은 믿음으로 살리라 — 종교개혁의 핵심',
  },
  {
    id: 'rom-4-3',
    citing: { book: 'Rom', chapter: 4, verseStart: 3, verseEnd: 3 },
    sources: [{ book: 'Gen', chapter: 15, verseStart: 6, verseEnd: 6 }],
    note: '아브라함이 하나님을 믿으매 — 이신칭의',
  },
  {
    id: 'rom-10-5',
    citing: { book: 'Rom', chapter: 10, verseStart: 5, verseEnd: 5 },
    sources: [{ book: 'Lev', chapter: 18, verseStart: 5, verseEnd: 5 }],
    note: '율법으로 말미암은 의',
  },
  {
    id: 'rom-10-13',
    citing: { book: 'Rom', chapter: 10, verseStart: 13, verseEnd: 13 },
    sources: [{ book: 'Joel', chapter: 2, verseStart: 32, verseEnd: 32 }],
    note: '주의 이름을 부르는 자는 구원을 받으리라',
  },

  // ── 갈라디아서 ──
  {
    id: 'gal-3-6',
    citing: { book: 'Gal', chapter: 3, verseStart: 6, verseEnd: 6 },
    sources: [{ book: 'Gen', chapter: 15, verseStart: 6, verseEnd: 6 }],
    note: '아브라함이 하나님을 믿으매 (롬 4:3과 동일 인용)',
  },
  {
    id: 'gal-3-11',
    citing: { book: 'Gal', chapter: 3, verseStart: 11, verseEnd: 11 },
    sources: [{ book: 'Hab', chapter: 2, verseStart: 4, verseEnd: 4 }],
    note: '의인은 믿음으로 살리라',
  },
  {
    id: 'gal-3-13',
    citing: { book: 'Gal', chapter: 3, verseStart: 13, verseEnd: 13 },
    sources: [{ book: 'Deut', chapter: 21, verseStart: 23, verseEnd: 23 }],
    note: '나무에 달린 자는 저주 아래 있는 자',
  },

  // ── 히브리서 ──
  {
    id: 'heb-1-5',
    citing: { book: 'Heb', chapter: 1, verseStart: 5, verseEnd: 5 },
    sources: [
      { book: 'Ps', chapter: 2, verseStart: 7, verseEnd: 7 },
      { book: '2Sam', chapter: 7, verseStart: 14, verseEnd: 14 },
    ],
    note: '아들 됨의 이중 증거',
  },
  {
    id: 'heb-1-13',
    citing: { book: 'Heb', chapter: 1, verseStart: 13, verseEnd: 13 },
    sources: [{ book: 'Ps', chapter: 110, verseStart: 1, verseEnd: 1 }],
    note: '내 우편에 앉으라 — 그리스도의 왕권',
  },
  {
    id: 'heb-8-8-12',
    citing: { book: 'Heb', chapter: 8, verseStart: 8, verseEnd: 12 },
    sources: [{ book: 'Jer', chapter: 31, verseStart: 31, verseEnd: 34 }],
    note: '새 언약 — 예레미야 인용 중 가장 긴 구약 인용',
  },
  {
    id: 'heb-10-37-38',
    citing: { book: 'Heb', chapter: 10, verseStart: 37, verseEnd: 38 },
    sources: [{ book: 'Hab', chapter: 2, verseStart: 3, verseEnd: 4 }],
    note: '의인은 믿음으로 살리라 (신약의 세 번째 인용)',
  },
];
