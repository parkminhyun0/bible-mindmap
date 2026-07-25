// 비평장치(Apparatus) 큐레이션 DB — 학문적으로 유명한 지점만 선별
// 근거: Metzger *A Textual Commentary on the Greek NT* · NET Bible textual notes ·
//       BHS/BHQ apparatus 요약 · Wenham·Waltke·Bruce 등 표준 주석
//
// 스키마:
//   {
//     bookId,       - STEPBible 표준 (Gen, Exod, Ruth, Rom, Mark ...)
//     chapter, verse - 지점
//     type          - 'omission' | 'addition' | 'substitution' | 'order' | 'translation'
//     title         - 짧은 이름
//     summary       - 한 줄 요약
//     witnesses     - { omit: [...], include: [...], variants: {...} } (있는 것만)
//     metzger       - 'A'|'B'|'C'|'D' (학계 판단 신뢰도)
//     translations  - { kjv, esv, krv, ... } 각 역본의 처리 방식
//     significance  - 신학적/역사적 의미
//     refs          - 참고 문헌
//   }

const VARIANTS = [
  // ═══════════════════════════════════════════════════════════════
  // 창세기 (Genesis)
  // ═══════════════════════════════════════════════════════════════
  {
    bookId: 'Gen', chapter: 4, verse: 8,
    type: 'addition',
    title: '가인이 아벨에게 한 말 누락',
    summary: 'MT: "가인이 아벨에게 말하고" 만 있음 · LXX·사마리아·페시타에는 "우리가 들로 나가자" 추가',
    witnesses: {
      omit: ['MT (마소라 정본)'],
      include: ['LXX (70인역)', '사마리아 오경', '페시타 (시리아)', '타르굼'],
    },
    metzger: 'B',
    translations: {
      kjv: 'MT 따라 짧게', esv: 'MT 따라 짧게', krv: 'MT 따라 짧게', niv: '"들로 나가자" 반영',
    },
    significance: 'MT 는 원문 손상 가능성 · LXX·사마리아 오경 일치가 원본 반영 가능성 시사',
    refs: ['WLC (Westminster Leningrad Codex, 파블릭 도메인) 기반 히브리어 인용', 'NET Bible 각주 기반 큐레이션 (netbible.org)', '⚠ 학술 검증: BHS·BHQ·DSS 1차 자료 대조 권장'],
  },
  {
    bookId: 'Gen', chapter: 47, verse: 31,
    type: 'translation',
    title: '침상 머리에서 vs 지팡이 머리에서',
    summary: 'MT: הַמִּטָּה (침상) · LXX: ῥάβδου (지팡이). 히 11:21 은 LXX 따라 "지팡이" 인용',
    witnesses: { variants: {
      MT: 'הַמִּטָּה (하-미타 · 침상)',
      LXX: 'τῆς ῥάβδου (지팡이)',
    }},
    metzger: 'B',
    translations: {
      kjv: '침상', esv: '침상', krv: '침상', hebrews: '히 11:21 은 지팡이',
    },
    significance: '히브리어 자음 מטה 는 모음에 따라 침상(mittah)/지팡이(matteh) 두 뜻. 신약 저자는 LXX 전통 채택.',
    refs: ['WLC (Westminster Leningrad Codex, 파블릭 도메인) 기반 히브리어 인용', 'NET Bible 각주 기반 큐레이션 (netbible.org)', '⚠ 학술 검증: BHS·BHQ·DSS 1차 자료 대조 권장'],
  },

  // ═══════════════════════════════════════════════════════════════
  // 출애굽기 (Exodus)
  // ═══════════════════════════════════════════════════════════════
  {
    bookId: 'Exod', chapter: 20, verse: 13,
    type: 'translation',
    title: '살인하지 말라 (רָצַח)',
    summary: '히브리어 라차흐(רצח)는 넓은 의미의 살해 · 좁게는 계획적 살인. 국가 처형·전쟁·정당방위 포함 여부 논쟁',
    witnesses: { variants: {
      hebrew: 'לֹא תִּרְצָח (로 티르차흐)',
    }},
    metzger: 'A',
    translations: {
      kjv: 'Thou shalt not kill', esv: 'You shall not murder',
      krv: '살인하지 말지니라', niv: 'You shall not murder',
    },
    significance: 'KJV "kill" 은 넓은 번역 · 현대 번역은 대부분 "murder" (계획적 살인). 원어 자체가 다의적.',
    refs: ['WLC (Westminster Leningrad Codex, 파블릭 도메인) 기반 히브리어 인용', 'NET Bible 각주 기반 큐레이션 (netbible.org)', '⚠ 학술 검증: BHS·BHQ·DSS 1차 자료 대조 권장'],
  },

  // ═══════════════════════════════════════════════════════════════
  // 룻기 (Ruth)
  // ═══════════════════════════════════════════════════════════════
  {
    bookId: 'Ruth', chapter: 4, verse: 5,
    type: 'substitution',
    title: 'Ketiv/Qere · 사서 얻으리라 (קניתי vs קניתה)',
    summary: 'MT Ketiv: "내가 샀다" (1인칭) · Qere: "네가 산다" (2인칭). 대상은 나오미 밭 + 룻',
    witnesses: { variants: {
      ketiv: 'קָנִיתִי (카니티 · 내가 샀다)',
      qere: 'קָנִיתָה (카니타 · 네가 산다)',
    }},
    metzger: 'B',
    translations: {
      kjv: 'Qere 따라 2인칭', esv: 'Qere 따라 2인칭',
      krv: 'Qere 따라 · 2인칭',
    },
    significance: '마소라 학자들이 Ketiv 를 원문으로 두되 낭독은 Qere 로 하도록 표시. 문법 대명사 이슈.',
    refs: ['WLC (Westminster Leningrad Codex, 파블릭 도메인) 기반 히브리어 인용', 'NET Bible 각주 기반 큐레이션 (netbible.org)', '⚠ 학술 검증: BHS·BHQ·DSS 1차 자료 대조 권장'],
  },

  // ═══════════════════════════════════════════════════════════════
  // 레위기 (Leviticus)
  // ═══════════════════════════════════════════════════════════════
  {
    bookId: 'Lev', chapter: 16, verse: 8,
    type: 'translation',
    title: '아사셀 (עֲזָאזֵל) 해석 논쟁',
    summary: 'MT: "לַעֲזָאזֵל" (for Azazel) · 3설: (1) 광야 악마 · (2) 지명(절벽) · (3) "완전한 제거" 추상어',
    witnesses: { variants: {
      MT: 'לַעֲזָאזֵל (라-아자젤)',
      LXX: 'τῷ ἀποπομπαίῳ (for the sender-away · 추상적 처리)',
      Vulgate: 'capro emissario (보내는 염소 · scapegoat 어원)',
    }},
    metzger: 'B',
    translations: {
      kjv: 'scapegoat (보내는 염소 · Tyndale·Vulgate 전통)',
      esv: 'Azazel (음역 · 고유명사)',
      krv: '아사셀 (음역)',
      niv: 'scapegoat',
    },
    significance: '대속죄일 두 염소 중 하나가 아사셀 몫으로 광야로. 해석에 따라 죄 이전(제거) 신학·악마 몫(추방) 이해 갈림. Milgrom·Levine 3설 · 신약 히 13:11-12 연결.',
    refs: ['WLC (Westminster Leningrad Codex, 파블릭 도메인) 기반 히브리어 인용', 'NET Bible 각주 기반 큐레이션 (netbible.org)', '⚠ 학술 검증: BHS·BHQ·DSS 1차 자료 대조 권장'],
  },
  {
    bookId: 'Lev', chapter: 17, verse: 11,
    type: 'translation',
    title: '피의 속죄 신학 · "생명은 피에" (הַנֶּפֶשׁ בַּדָּם)',
    summary: 'MT: "כִּי־נֶפֶשׁ הַבָּשָׂר בַּדָּם הִוא" — 육체의 생명(네페쉬)은 피에. 속죄의 근거 논쟁: 피=생명 대체 vs 피=죽음 상징',
    witnesses: { variants: {
      MT: 'כִּי־נֶפֶשׁ הַבָּשָׂר בַּדָּם הִוא',
      LXX: 'ἡ γὰρ ψυχὴ πάσης σαρκὸς αἷμα αὐτοῦ ἐστιν (그 생명이 곧 피니라)',
    }},
    metzger: 'A',
    translations: {
      kjv: 'the life of the flesh is in the blood',
      esv: 'the life of the flesh is in the blood',
      krv: '육체의 생명은 피에 있음이라',
      niv: 'the life of a creature is in the blood',
    },
    significance: '구약 속죄 신학 핵심 · 신약 히 9:22 (피 흘림 없이는 사함이 없느니라) 근거. Milgrom: 피는 생명 대체 · Kiuchi: 죄인의 죽음 상징. 정통 기독론 대속의 성경적 근거.',
    refs: ['WLC (Westminster Leningrad Codex, 파블릭 도메인) 기반 히브리어 인용', 'NET Bible 각주 기반 큐레이션 (netbible.org)', '⚠ 학술 검증: BHS·BHQ·DSS 1차 자료 대조 권장'],
  },
  {
    bookId: 'Lev', chapter: 18, verse: 5,
    type: 'translation',
    title: '"준행하면 살리라" (וָחַי בָּהֶם) · 구원론 논쟁',
    summary: 'MT: "그로 인하여 살리라" — 율법 준행과 생명의 관계. 신약(롬 10:5 · 갈 3:12) 인용',
    witnesses: { variants: {
      MT: 'וָחַי בָּהֶם (베하이 바헴 · 그로 인하여 살리라)',
      LXX: 'ζήσεται ἐν αὐτοῖς (그것들 안에서 살리라)',
    }},
    metzger: 'A',
    translations: {
      kjv: 'shall live in them', esv: 'shall live by them',
      krv: '그로 인하여 살리라', niv: 'will live by them',
    },
    significance: '유대교 랍비 전통: 영원한 생명(내세) 함의 · 바울(롬 10:5·갈 3:12): 율법으로는 못 얻는 생명 대조 · 개혁주의: 언약 순종 원리. 율법·복음 관계 신학 논쟁 정점.',
    refs: ['WLC (Westminster Leningrad Codex, 파블릭 도메인) 기반 히브리어 인용', 'NET Bible 각주 기반 큐레이션 (netbible.org)', '⚠ 학술 검증: BHS·BHQ·DSS 1차 자료 대조 권장'],
  },

  // ═══════════════════════════════════════════════════════════════
  // 로마서 (Romans)
  // ═══════════════════════════════════════════════════════════════
  {
    bookId: 'Rom', chapter: 5, verse: 1,
    type: 'substitution',
    title: '평화를 가지자 vs 가지고 있다 (ἔχωμεν / ἔχομεν)',
    summary: '한 글자(오미크론 vs 오메가) 차이가 권면(가지자) vs 직설(가진다) 좌우 · 신학 결정적',
    witnesses: {
      variants: {
        subjunctive: 'ἔχωμεν (에코멘 · 가지자 · 권면형) — ℵ*, A, B*, C, D, K, L 등',
        indicative:  'ἔχομεν (에코멘 · 가진다 · 직설형) — ℵ¹, B², F, G, P 등',
      },
    },
    metzger: 'B',
    translations: {
      kjv: 'we have peace (직설)', esv: 'we have peace (직설)',
      krv: '화평을 누리자 (권면)', niv: 'we have peace',
    },
    significance: '외증(사본 증거)은 권면형(ἔχωμεν) 이 우세 · 내증(문맥·신학)은 직설형 우세. 대부분 현대 번역은 직설형 채택.',
    refs: ['Metzger *TC* p.452', 'Cranfield *Romans* I p.257'],
  },
  {
    bookId: 'Rom', chapter: 8, verse: 1,
    type: 'addition',
    title: '"혈과 육을 따라 걷지 아니하고..." 후반부',
    summary: 'Byzantine 사본에 "육신을 따라 행하지 아니하고 그 영을 따라 행하는 자에게" 추가 · Alexandrian 계열 없음',
    witnesses: {
      omit: ['ℵ*', 'B', 'D*', 'F', 'G', '1739* 등 (Critical Text)'],
      include: ['Byzantine 다수 · A, D², K, L, P (Textus Receptus)'],
    },
    metzger: 'A',
    translations: {
      kjv: '포함 (전체)', esv: '누락 (원본)', krv: '포함',
      revised: '각주 처리',
    },
    significance: '롬 8:4 에서 반복되는 문구를 사본 필사자가 8:1 로 앞당겨 삽입. Critical Text 는 누락이 원본.',
    refs: ['Metzger *TC* p.456', 'Cranfield *Romans* I p.373'],
  },
  {
    bookId: 'Rom', chapter: 16, verse: 24,
    type: 'omission',
    title: '"주 예수 그리스도의 은혜가..." 후반 축복문',
    summary: 'Byzantine·TR 에만 존재 · Alexandrian 사본 (ℵ, B, C) 에 없음. 16:20 축복문의 반복',
    witnesses: {
      omit: ['ℵ', 'A', 'B', 'C 등 Critical Text'],
      include: ['D, G, Ψ, Byzantine (KJV 반영)'],
    },
    metzger: 'A',
    translations: {
      kjv: '포함 (16:24 완전한 절)', esv: '누락 · 각주',
      krv: '포함', revised: '각주 처리',
    },
    significance: 'Critical Text 표준은 누락. KJV 만 별도 절 번호 부여.',
    refs: ['Metzger *TC* p.476'],
  },
  {
    bookId: 'Rom', chapter: 16, verse: 25,
    type: 'order',
    title: '송영 (16:25-27) 위치',
    summary: '일부 사본은 14장 끝, 15장 끝, 또는 두 곳에 · P⁴⁶ 은 15장 끝에 위치. 원래 로마서 종결 논쟁',
    witnesses: { variants: {
      '16장 끝 (표준)': 'ℵ, B, C, D 등',
      '14장 끝': 'L, Ψ, Byzantine 다수',
      '15장 끝': 'P⁴⁶',
      '두 곳 모두': 'A',
      '누락': 'F, G',
    }},
    metzger: 'C',
    translations: {
      kjv: '16장 끝', esv: '16장 끝', krv: '16장 끝',
    },
    significance: 'Marcion 이 로마서 15-16장 삭제한 흔적으로 추정 · 사본 전승사의 복잡성 반영',
    refs: ['Metzger *TC* p.470-473', 'Gamble *The Textual History of the Letter to the Romans*'],
  },

  // ═══════════════════════════════════════════════════════════════
  // 마가복음 (Mark)
  // ═══════════════════════════════════════════════════════════════
  {
    bookId: 'Mark', chapter: 1, verse: 1,
    type: 'omission',
    title: '"하나님의 아들" (υἱοῦ θεοῦ) 표제 누락',
    summary: 'ℵ*, Θ, 28, 원본 시리아·아르메니아 사본에서 누락. 대다수 사본은 포함',
    witnesses: {
      omit: ['ℵ*', 'Θ', '28', 'syrᵖᵃˡ', 'geo 등'],
      include: ['ℵ¹', 'B', 'D', 'L', 'W', 'Byzantine 다수'],
    },
    metzger: 'C',
    translations: {
      kjv: '포함', esv: '포함', krv: '포함', niv: '포함',
    },
    significance: '마가 서두 표제. 필사자 실수(눈 건너뜀 · homoioteleuton) 가능성 · 마가 기독론 핵심어라 원본일 가능성 우세',
    refs: ['Metzger *TC* p.62', 'France *Mark* p.49'],
  },
  {
    bookId: 'Mark', chapter: 1, verse: 41,
    type: 'substitution',
    title: '"긍휼히 여기사" (σπλαγχνισθείς) vs "노하사" (ὀργισθείς)',
    summary: '대다수: 긍휼히 여기사 · D, 그리고 라틴·시리아 계열 소수: 노하사. 어느 것이 원본인지 학계 논쟁',
    witnesses: {
      variants: {
        splanchnistheis: 'σπλαγχνισθείς (긍휼히 여기사) — ℵ, A, B, C, K, L, W 등 대다수',
        orgistheis:      'ὀργισθείς (노하사) — D, a, d, ff², r¹',
      },
    },
    metzger: 'C',
    translations: {
      kjv: '긍휼히 여기사', esv: '긍휼히 여기사', krv: '민망히 여기사',
      niv: '2011 개정판 "노하사" 채택',
    },
    significance: 'lectio difficilior (더 어려운 독법) 원리로는 "노하사" 가 원본일 수 있음 (필사자가 부드럽게 수정). 최근 학계는 이 견해 유력.',
    refs: ['Metzger *TC* p.64', 'Ehrman *Orthodox Corruption of Scripture*'],
  },
  {
    bookId: 'Mark', chapter: 9, verse: 29,
    type: 'addition',
    title: '"기도와 금식" 후반 (καὶ νηστείᾳ)',
    summary: '"금식" 추가 사본 다수 · ℵ*, B, k 는 "기도" 만',
    witnesses: {
      omit: ['ℵ*', 'B', 'k (라틴 고본)'],
      include: ['ℵ¹', 'A, C, D, L, W 등 대다수'],
    },
    metzger: 'A',
    translations: {
      kjv: '기도와 금식', esv: '기도만', krv: '기도와 금식',
      revised: '각주 처리',
    },
    significance: '초대 교회 금욕 실천이 필사에 반영된 것으로 추정. Critical Text 는 원본을 "기도" 만으로 봄.',
    refs: ['Metzger *TC* p.85'],
  },
  {
    bookId: 'Mark', chapter: 16, verse: 9,
    type: 'addition',
    title: '마가복음 긴 결말 (Longer Ending 16:9-20)',
    summary: '16:9-20 은 원본 마가복음에 없었을 가능성 매우 높음. 학문적 논쟁 유명 지점',
    witnesses: {
      omit: ['ℵ (시나이 사본)', 'B (바티칸 사본)', '304', '시리아 시내산 사본 등'],
      include: ['A, C, D, W, Θ, Byzantine 대다수 (TR 채택)'],
      variants: {
        '짧은 결말': 'L, Ψ, 083, 099 (별도 짧은 결말 삽입)',
      },
    },
    metzger: 'A',
    translations: {
      kjv: '포함', esv: '이중 대괄호 표기', krv: '포함',
      revised: '각주 처리', nrsv: '이중 대괄호',
    },
    significance: '마가 원본이 16:8 "그들이 무서워하더라" 로 끝나는지 · 원본 종결부가 소실됐는지 학문적 대논쟁. 대부분 현대 번역은 후대 부록으로 판정.',
    refs: ['Metzger *TC* p.102-107', 'France *Mark* p.685-688', 'NA28 apparatus'],
  },
  {
    bookId: 'Mark', chapter: 16, verse: 8,
    type: 'addition',
    title: '짧은 결말 (Shorter Ending)',
    summary: '16:8 다음에 별도의 짧은 종결부 삽입한 사본 계열 존재 · 긴 결말과 다른 후대 시도',
    witnesses: {
      include: ['L, Ψ, 083, 099, 사히딕 이집트어'],
    },
    metzger: 'A',
    translations: {
      esv: '이중 대괄호로 짧은/긴 결말 모두 표기', nrsv: '두 결말 모두',
      krv: '짧은 결말 없이 긴 결말만', kjv: '긴 결말만',
    },
    significance: '16:8 종결이 불만족스러웠던 후대 편집 흔적 · 원본은 16:8 종결 가능성 시사',
    refs: ['Metzger *TC* p.102-107'],
  },
  {
    bookId: 'Mark', chapter: 3, verse: 14,
    type: 'addition',
    title: '"열둘을 사도로" (οὓς καὶ ἀποστόλους ὠνόμασεν) 후반',
    summary: '일부 사본은 "이름 사도라 하시고" 추가 · 눅 6:13 병행에서 유입 가능성',
    witnesses: {
      omit: ['A, C² 등 Byzantine 다수'],
      include: ['ℵ, B, C*, Θ, W 등 (Critical Text)'],
    },
    metzger: 'C',
    translations: {
      kjv: '누락', esv: '포함', krv: '누락 · "열둘을 세우사"',
    },
    significance: '누가 병행 구절의 삽입 여부. Critical Text 는 원본이라 판단.',
    refs: ['Metzger *TC* p.69'],
  },
]

// ── 인덱스 레지스트리 ─────────────────────────────────────────────────────
// 수동 큐레이션 (OT) + 동적 로드 (NT SBLGNT) 모두 동일 Map 에 저장
const _byVerse = new Map()      // 'bookId:ch:verse' → variant[]
const _versesByBook = new Map() // 'bookId:ch' → Set(verse)
const _loadedBooks = new Set()  // 이미 로드된 bookId
const _loadingBooks = new Map() // 로드 중인 bookId → Promise

// SBLGNT JSON 을 동적으로 fetch 하는 NT 책 목록 (CC BY 4.0)
const SBLGNT_BOOKS = new Set(['Matt', 'Mark', 'Luke', 'John', 'Rom'])

// OSHB Ketiv/Qere JSON 을 동적으로 fetch 하는 OT 책 목록 (Stage 3-A · 2026-07-25 도입)
// 근거: openscriptures/morphhb · CC BY 4.0 · WLC 마소라 Ketiv/Qere 표기 자동 파싱
// 수동 큐레이션(신학 결정적 지점)은 하드코딩 · OSHB(마소라 K/Q)는 자동 로드 · 함께 표시
const OSHB_BOOKS = new Set([
  'Gen', 'Exod', 'Lev', 'Num', 'Deut',
  'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth',
  'Job', 'Ps', 'Prov', 'Eccl', 'Song',
  'Isa', 'Jer', 'Lam', 'Ezek', 'Dan',
  'Hos', 'Joel', 'Amos', 'Obad', 'Jonah',
  'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal',
])

// 자동 로드 대상 통합 (SBLGNT + OSHB)
const AUTO_LOAD_BOOKS = new Set([...SBLGNT_BOOKS, ...OSHB_BOOKS])

const BASE_URL = (() => {
  try { return import.meta.env.BASE_URL || '/' } catch { return '/' }
})()

function _registerVariants(list) {
  for (const v of list) {
    const key = `${v.bookId}:${v.chapter}:${v.verse}`
    const arr = _byVerse.get(key) || []
    arr.push(v)
    _byVerse.set(key, arr)
    const bkey = `${v.bookId}:${v.chapter}`
    const s = _versesByBook.get(bkey) || new Set()
    s.add(v.verse)
    _versesByBook.set(bkey, s)
  }
}

// 수동 큐레이션 데이터 즉시 등록 (curated)
_registerVariants(VARIANTS)
// 자동 로드 대상(SBLGNT NT + OSHB OT)은 _loadedBooks에 표시하지 않음
// — JSON fetch가 실행되어야 나머지 apparatus 데이터가 로드됨
for (const v of VARIANTS) {
  if (!AUTO_LOAD_BOOKS.has(v.bookId)) _loadedBooks.add(v.bookId)
}

/**
 * 특정 책의 비평장치 데이터 로드
 *   - NT (SBLGNT_BOOKS): variants/{Book}.json fetch (파싱 이문)
 *   - OT (OSHB_BOOKS):   variants/{Book}.json fetch (Ketiv/Qere · Stage 3-A)
 *   - 기타 OT:          이미 curated 로드됨 (즉시 resolve)
 * 반환값: Promise<void> — 완료 후 hasVariant / getVariants 가 동작함
 */
export function loadBookVariants(bookId) {
  if (_loadedBooks.has(bookId)) return Promise.resolve()
  if (_loadingBooks.has(bookId)) return _loadingBooks.get(bookId)
  if (!AUTO_LOAD_BOOKS.has(bookId)) {
    _loadedBooks.add(bookId)
    return Promise.resolve()
  }

  const promise = fetch(`${BASE_URL}data/variants/${bookId}.json`)
    .then(r => {
      if (!r.ok) throw new Error(`variants/${bookId}.json HTTP ${r.status}`)
      return r.json()
    })
    .then(list => {
      _registerVariants(list)
      _loadedBooks.add(bookId)
      _loadingBooks.delete(bookId)
      const verses = new Set()
      const sources = {}
      for (const v of list) {
        verses.add(`${v.chapter}:${v.verse}`)
        const src = v.source || (SBLGNT_BOOKS.has(bookId) ? 'sblgnt' : 'curated')
        sources[src] = (sources[src] || 0) + 1
      }
      const srcSummary = Object.entries(sources).map(([k, n]) => `${k}:${n}`).join(' · ')
      console.log(`[비평장치] ✅ ${bookId} 로드: ${list.length}건 · ${verses.size}개 절 · ${srcSummary}`)
    })
    .catch(e => {
      console.warn(`[비평장치] ⚠ ${bookId} JSON 로드 실패 (curated 만 사용):`, e.message)
      _loadedBooks.add(bookId) // 재시도 방지
      _loadingBooks.delete(bookId)
    })

  _loadingBooks.set(bookId, promise)
  return promise
}

export function isVariantLoaded(bookId) {
  return _loadedBooks.has(bookId)
}

// ── apparatus mode 필터링 ──────────────────────────────────
// mode: 'off' | 'standard' | 'scholarly'
//   off:       apparatus 완전 숨김
//   standard:  curated (source 없음) + SBLGNT Metzger A/B + curated 수동 이문만
//   scholarly: 모든 자동/수동 이문 (전체 노출)
function filterByMode(variants, mode) {
  if (!variants || variants.length === 0) return []
  if (mode === 'scholarly') return variants
  if (mode === 'off') return []
  // standard: curated (source 없음 or 'curated') + SBLGNT Metzger A/B
  return variants.filter((v) => {
    if (!v.source || v.source === 'curated') return true // 수동 큐레이션은 항상 노출
    if (v.source === 'sblgnt' && (v.metzger === 'A' || v.metzger === 'B')) return true
    return false // 나머지 자동 (OSHB · SP-MT · LXX-MT · SBLGNT C/D) 는 학술 모드에서만
  })
}

export function hasVariant(bookId, chapter, verse, mode = 'standard') {
  const arr = _byVerse.get(`${bookId}:${chapter}:${verse}`)
  if (!arr || arr.length === 0) return false
  return filterByMode(arr, mode).length > 0
}

export function getVariants(bookId, chapter, verse, mode = 'standard') {
  const arr = _byVerse.get(`${bookId}:${chapter}:${verse}`) || []
  return filterByMode(arr, mode)
}

export function getVariantVerseSet(bookId, chapter) {
  return _versesByBook.get(`${bookId}:${chapter}`) || new Set()
}

export const ALL_VARIANTS = VARIANTS
