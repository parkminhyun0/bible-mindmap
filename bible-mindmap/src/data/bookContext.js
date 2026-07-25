// ── 문맥 성경: 각 권별 컨텍스트 (BOOK · CHAPTERS · META · MACRO · 담화 규칙 · 신학어) ──
// 현재 등록: 로마서 (Rom · 완전 지원), 룻기 (Ruth · Hebrew 담화 규칙 미구현 · KRV + 거시구조)

// ── 헬라어 NT 담화 접속사 규칙 (Rom · Gal · 1Cor 등 재사용 가능) ────────
export const GNT_DISCOURSE_RULES = [
  { id: 'rhetorical_q', role: '수사적 질문', icon: '❓', color: '#f59e0b', bg: 'rgba(245,158,11,.12)',
    gr: 'τί οὖν', tr: '티 운',
    desc: '바울이 예상되는 반론을 스스로 질문으로 제기합니다. 독자의 생각을 대신 말하고 직접 반박하는 수사적 장치입니다.',
    match: (s) => s.has('G5101') && s.has('G3767') },
  { id: 'me_genoito', role: '강한 반박', icon: '⛔', color: '#ef4444', bg: 'rgba(239,68,68,.12)',
    gr: 'μὴ γένοιτο', tr: '메 게노이토',
    desc: '"절대로 그럴 수 없다!" 헬라어에서 가장 강한 부정 표현. 바울이 앞의 수사적 질문을 단호하게 부정합니다.',
    match: (s) => s.has('G3361') && s.has('G1096') },
  { id: 'major_concl', role: '대 결론', icon: '🏁', color: '#10b981', bg: 'rgba(16,185,129,.12)',
    gr: 'ἄρα', tr: '아라',
    desc: '긴 논증 끝에 바울이 핵심 결론을 선언합니다. 앞서 쌓아온 모든 논거가 이 한 절로 수렴됩니다.',
    match: (s) => s.has('G0686') },
  { id: 'concl', role: '결론·적용', icon: '✅', color: '#6366f1', bg: 'rgba(99,102,241,.12)',
    gr: 'οὖν', tr: '운',
    desc: '앞 논증에서 이끌어낸 결론 또는 실천적 적용입니다.',
    match: (s) => s.has('G3767') },
  { id: 'contrast', role: '대조·전환', icon: '↔', color: '#f87171', bg: 'rgba(248,113,113,.12)',
    gr: 'ἀλλά', tr: '알라',
    desc: '앞 내용과 대조되는 새로운 방향이 시작됩니다.',
    match: (s) => s.has('G0235') },
  { id: 'reason', role: '이유·설명', icon: '💡', color: '#fbbf24', bg: 'rgba(251,191,36,.1)',
    gr: 'γάρ', tr: '가르', indent: 1,
    desc: '앞 주장이나 사실에 대한 근거를 설명합니다. 개역한글에서 "이는", "왜냐하면"으로 번역되거나 생략됩니다.',
    match: (s) => s.has('G1063') },
  { id: 'purpose', role: '목적', icon: '🎯', color: '#34d399', bg: 'rgba(52,211,153,.1)',
    gr: 'ἵνα', tr: '히나', indent: 1,
    desc: '행동이나 사건의 목적과 의도를 밝힙니다.',
    match: (s) => s.has('G2443') },
];

// ── 로마서 신학 핵심어 ─────────────────────────────────────────────────
const ROM_THEO_TERMS = {
  'G0266': { ko: '죄',   color: '#ef4444' },
  'G5485': { ko: '은혜', color: '#22d3ee' },
  'G3551': { ko: '율법', color: '#f59e0b' },
  'G4151': { ko: '성령', color: '#10b981' },
  'G2222': { ko: '생명', color: '#34d399' },
  'G2288': { ko: '사망', color: '#94a3b8' },
  'G1343': { ko: '의',   color: '#a78bfa' },
  'G4102': { ko: '믿음', color: '#60a5fa' },
};

// ── 로마서 전용 구조 마커 (자동 감지 위에 오버레이 · 신학적 핵심 pivot) ──
const ROM_STRUCTURAL_RULES = [
  { id: 'thesis', role: '주제 선포', icon: '📖', color: '#e11d48', bg: 'rgba(225,29,72,.13)',
    gr: 'δικαιοσύνη θεοῦ', tr: '디카이오쉬네 테우',
    desc: '로마서의 핵심 주제 · "복음에는 하나님의 의가 나타나서" (1:17). 서신 전체의 논증이 이 명제에서 출발합니다.',
    match: null },
  { id: 'justification', role: '이신칭의 선언', icon: '⚖️', color: '#a78bfa', bg: 'rgba(167,139,250,.14)',
    gr: 'δικαιούμενοι δωρεάν', tr: '디카이우메노이 도레안',
    desc: '"그리스도 예수 안에 있는 구속으로 말미암아 하나님의 은혜로 값없이 의롭다 하심" — 로마서의 신학적 정점 응답.',
    match: null },
  { id: 'climax', role: '절정', icon: '🌟', color: '#059669', bg: 'rgba(5,150,105,.15)',
    gr: 'οὐδεμία κατάκρισις', tr: '우데미아 카타크리시스',
    desc: '"이제 그리스도 예수 안에 있는 자에게는 결코 정죄함이 없나니" (8:1) — 롬 5-8 전체 논증의 정점. 8:39 하나님의 사랑의 절대적 선언.',
    match: null },
  { id: 'doxology', role: '송영', icon: '👑', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'δόξα εἰς τοὺς αἰῶνας', tr: '독사 에이스 투스 아이오나스',
    desc: '"영광이 그에게 세세에 있으리로다 아멘" — 논증 단위의 마무리 찬양. 11:36 · 16:27 두 지점에 위치.',
    match: null },
  { id: 'praxis', role: '실천의 부름', icon: '🎯', color: '#d97706', bg: 'rgba(217,119,6,.14)',
    gr: 'παρακαλῶ οὖν', tr: '파라칼로 운',
    desc: '"그러므로 형제들아 내가 하나님의 자비하심으로 너희를 권하노니" (12:1) — 교리에서 실천 윤리로 전환하는 대전환.',
    match: null },
];

// 로마서 수동 담화 주석: 서신 전체 논증의 결정적 pivot 지점
// 자동 감지(γάρ/οὖν/ἄρα 등) 위에 오버레이 · 신학적 강조점을 명시적으로 표시
const ROM_MANUAL_DISCOURSE = {
  '1:17':  'thesis',        // 하나님의 의 선포 — 서신 전체 명제
  '3:24':  'justification', // 이신칭의 핵심 응답
  '5:1':   'justification', // 칭의의 첫 열매 · 평화
  '8:1':   'climax',        // 정죄 해방 — 롬 5-8 정점
  '8:39':  'climax',        // 하나님의 사랑의 절대성 — 8장 클라이맥스
  '11:36': 'doxology',      // 중간 송영 — 교리 부 마감
  '12:1':  'praxis',        // 실천의 부름 — 교리에서 윤리로 전환
  '16:27': 'doxology',      // 최종 송영 — 서신 전체 마감
};

// ── 로마서 컨텍스트 ────────────────────────────────────────────────────
export const ROM_CTX = {
  id: 'Rom',
  book: { ko: '로마서', bollsNum: 45, lexId: 'Rom', lexCorpus: 'gnt', en: 'Romans', testament: 'NT' },
  chapters: 16,
  discourseRules: [...GNT_DISCOURSE_RULES, ...ROM_STRUCTURAL_RULES],
  manualDiscourse: ROM_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신서 · 바울서신',
    genreNote: '교리적 논문에 가까운 조직신학 · 순회 서신',
    year: 'AD 57년경',
    yearNote: '3차 전도여행 말미, 예루살렘행 직전',
    place: '고린도 (겐그레아 항구 인근)',
    placeNote: '가이오의 집 (롬 16:23) · 뵈뵈 집사가 편지 전달',
    author: '사도 바울',
    authorNote: '더디오가 대필 (롬 16:22)',
    audience: '로마 교회 성도들',
    audienceNote: '유대인·이방인 혼합, 대부분 미방문',
    theme: '하나님의 의 (δικαιοσύνη θεοῦ)',
    themeNote: '이신칭의 복음 — 유대인·이방인 모두에게',
    chapterAgenda: {
      1:  '인사·복음의 능력·이방인의 죄',
      2:  '유대인의 죄·율법의 무능',
      3:  '모든 인류의 죄·이신칭의 선언 (3:21-26)',
      4:  '아브라함의 믿음 — 이신칭의의 원형',
      5:  '칭의의 열매·아담과 그리스도',
      6:  '죄에서 해방·세례와 연합',
      7:  '율법과 죄·내적 갈등',
      8:  '성령 안의 삶·하나님의 사랑 (절정)',
      9:  '이스라엘의 선택·하나님의 주권',
      10: '이스라엘의 불신앙·복음 전파의 필요',
      11: '남은 자·이스라엘의 회복·송영',
      12: '산 제사·교회 공동체 윤리',
      13: '국가 권세·이웃 사랑',
      14: '연약한 자·강한 자의 관용',
      15: '그리스도의 본·바울의 선교 계획',
      16: '문안 인사·마지막 권면·송영',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1,  toCh: 4,  color: '#e11d48', label: '죄와 칭의' },
      { id: 's2', fromCh: 5,  toCh: 8,  color: '#059669', label: '칭의의 삶' },
      { id: 's3', fromCh: 9,  toCh: 11, color: '#7c3aed', label: '이스라엘' },
      { id: 's4', fromCh: 12, toCh: 16, color: '#d97706', label: '실천·인사' },
    ],
    pivots: [
      { id: 'p1',  ch: 1,  verse: 17, color: '#e11d48', label: '주제 선포 · 하나님의 의' },
      { id: 'p2',  ch: 3,  verse: 22, color: '#e11d48', label: '이신칭의 핵심 응답' },
      { id: 'p3',  ch: 4,  verse: 3,  color: '#e11d48', label: '아브라함의 믿음' },
      { id: 'p4',  ch: 5,  verse: 1,  color: '#059669', label: '평화 · 칭의 열매' },
      { id: 'p5',  ch: 5,  verse: 12, color: '#059669', label: '아담 vs 그리스도' },
      { id: 'p6',  ch: 6,  verse: 23, color: '#059669', label: '사망 vs 생명' },
      { id: 'p7',  ch: 8,  verse: 1,  color: '#059669', label: '정죄 해방' },
      { id: 'p8',  ch: 8,  verse: 39, color: '#059669', label: '절정 · 하나님의 사랑' },
      { id: 'p9',  ch: 9,  verse: 1,  color: '#7c3aed', label: '이스라엘 문제 시작' },
      { id: 'p10', ch: 11, verse: 36, color: '#7c3aed', label: '중간 송영' },
      { id: 'p11', ch: 12, verse: 1,  color: '#d97706', label: '실천의 부름 (산 제사)' },
      { id: 'p12', ch: 16, verse: 27, color: '#d97706', label: '최종 송영' },
    ],
    arcs: [
      { id: 'a1', from: 'p1',  to: 'p2',  color: '#e11d48', label: '주제 → 응답 (이신칭의)' },
      { id: 'a2', from: 'p3',  to: 'p4',  color: '#059669', label: '아브라함 → 평화' },
      { id: 'a3', from: 'p2',  to: 'p8',  color: '#059669', label: '칭의 → 절정' },
      { id: 'a4', from: 'p5',  to: 'p7',  color: '#059669', label: '아담-그리스도 → 정죄 해방' },
      { id: 'a5', from: 'p6',  to: 'p8',  color: '#059669', label: '생명 line → 사랑' },
      { id: 'a6', from: 'p8',  to: 'p10', color: '#7c3aed', label: '송영 이어짐' },
      { id: 'a7', from: 'p10', to: 'p12', color: '#d97706', label: '송영 → 최종 송영' },
      { id: 'a8', from: 'p9',  to: 'p11', color: '#d97706', label: '주권 → 실천' },
    ],
  },
};

// ── 히브리 서사 담화 규칙 (스트롱 H-번호 + 모폴로지 자동 감지) ────────────
// OSHB/STEPBible 스트롱 태그 기반. Ruth 이외 히브리 서사 서(창세기·사무엘 등) 재사용 가능.
export const HEBREW_NARRATIVE_RULES = [
  { id: 'wayehi_setting', role: '서사 서두', icon: '📜', color: '#94a3b8', bg: 'rgba(148,163,184,.15)',
    gr: 'וַיְהִי', tr: '와이히',
    desc: '"그리고 있었다/일어났다" — 히브리 서사의 개시 마커 (wayyiqtol of הָיָה). 새로운 서사 단위나 시대 배경을 도입합니다.',
    match: (s, m) => s.has('H1961') && m.some(mm => mm && mm.includes('Vqw')) },
  { id: 'hinneh', role: '주의 환기', icon: '👁️', color: '#f59e0b', bg: 'rgba(245,158,11,.13)',
    gr: 'הִנֵּה', tr: '히네', indent: 1,
    desc: '"보라! 이제!" 극적 전환과 독자의 주의를 환기하는 히브리 감탄사. 서사의 결정적 순간을 강조합니다.',
    match: (s) => s.has('H2009') },
  { id: 'ki_reason', role: '이유·설명', icon: '💡', color: '#fbbf24', bg: 'rgba(251,191,36,.12)',
    gr: 'כִּי', tr: '키', indent: 1,
    desc: '"왜냐하면·때문에·비록" 앞선 주장이나 사실에 대한 근거를 도입. 히브리 산문에서 가장 흔한 인과 접속사.',
    match: (s) => s.has('H3588') },
  { id: 'blessing', role: '축복 정형구', icon: '🕊️', color: '#34d399', bg: 'rgba(52,211,153,.14)',
    gr: 'בָּרוּךְ יְהוָה', tr: '바루크 아도나이',
    desc: '"여호와여 복 있으시로다" 히브리 축복 관용구. 서사의 감사·전환·인정을 표현.',
    match: (s) => s.has('H1288') && s.has('H3068') },
  { id: 'oath', role: '맹세·언약', icon: '⚖️', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'חַי־יְהוָה', tr: '카이 아도나이',
    desc: '"여호와의 사심을 두고" 공식 맹세. 성문 재판 · 언약의 언어로, 반드시 이행되어야 하는 공적 서약.',
    match: (s) => s.has('H2416') && s.has('H3068') },
  { id: 'goel', role: '고엘·기업 무름', icon: '💠', color: '#a78bfa', bg: 'rgba(167,139,250,.15)',
    gr: 'גֹּאֵל', tr: '고엘',
    desc: '"기업 무를 자" — 가문 소멸을 막고 이름을 남기는 이스라엘 언약 규범. 룻기의 신학적 중심 개념.',
    match: (s) => s.has('H1350') },
  { id: 'covenant_love', role: '헤세드·언약적 사랑', icon: '🤝', color: '#059669', bg: 'rgba(5,150,105,.12)',
    gr: 'חֶסֶד', tr: '헤세드',
    desc: '언약적 사랑·신실한 자비. 룻기 전체를 관통하는 신학적 어휘 — 룻·나오미·보아스가 서로에게 보여주는 초과적 헌신.',
    match: (s) => s.has('H2617') },
];

// ── 히브리 OT 신학 핵심어 (스트롱 H-번호) ──────────────────────────────
export const HEBREW_OT_THEO_TERMS = {
  'H2617': { ko: '헤세드', color: '#059669' },   // 언약적 사랑
  'H1350': { ko: '고엘',   color: '#a78bfa' },   // 기업 무를 자
  'H3068': { ko: '여호와', color: '#d97706' },   // YHWH
  'H0430': { ko: '엘로힘', color: '#f59e0b' },   // God
  'H1288': { ko: '축복',   color: '#34d399' },   // bless
  'H2009': { ko: '히네',   color: '#eab308' },   // behold
  'H3588': { ko: '키',     color: '#fbbf24' },   // because/for
  'H1961': { ko: '하야',   color: '#94a3b8' },   // to be (wayyiqtol)
  'H1350_': { ko: '가알',  color: '#a78bfa' },   // redeem verb
};

// ── 룻기 전용 구조 마커 (자동 감지 불가 · manualDiscourse 전용) ──────────
const RUTH_STRUCTURAL_RULES = [
  { id: 'commitment', role: '언약적 결단', icon: '🤝', color: '#059669', bg: 'rgba(5,150,105,.16)',
    gr: 'רוּת', tr: '룻',
    desc: '자신의 정체성·미래를 걸고 다른 언약 공동체에 편입되는 결단 (룻 1:16-17). 언약적 사랑(헤세드) 의 인격적 구현.',
    match: null },
  { id: 'refusal', role: '거부·포기', icon: '⛔', color: '#ef4444', bg: 'rgba(239,68,68,.12)',
    gr: 'לֹא אוּכַל', tr: '로 우칼',
    desc: '"내가 할 수 없다" — 서사 반전 지점 (룻 4:6). 첫 고엘의 포기로 보아스의 기업 무름 자격이 확정.',
    match: null },
  { id: 'fulfillment', role: '성취·잉태', icon: '🌾', color: '#10b981', bg: 'rgba(16,185,129,.14)',
    gr: 'וַיִּתֵּן יְהוָה', tr: '와이텐 아도나이',
    desc: '"여호와께서 잉태케 하사" (룻 4:13) — 서사의 위기가 하나님의 개입으로 해결. 룻기 신적 섭리의 클라이맥스.',
    match: null },
  { id: 'genealogy', role: '계보 결론', icon: '👑', color: '#d97706', bg: 'rgba(217,119,6,.14)',
    gr: 'תּוֹלְדוֹת', tr: '톨레도트',
    desc: '다윗 계보로 서사 수렴 (룻 4:17-22). 이방 여인 룻의 신앙이 이스라엘 왕조의 뿌리에 편입되는 신학적 결론.',
    match: null },
];

// 룻기 수동 담화 주석: 스콜라 분석 기반 강조 지점
// (자동 감지 위에 오버레이 · 자동은 wayehi/hinneh/ki/blessing/oath/goel 등을 놓치지 않음)
const RUTH_MANUAL_DISCOURSE = {
  '1:1':  'wayehi_setting', // 사사 시대 · 기근 · 모압 이주 (와이히)
  '1:16': 'commitment',     // 룻의 결단 · 어머니의 하나님이 나의 하나님 (자동 감지 불가)
  '3:9':  'commitment',     // 옷자락 청혼 · 언약적 결속
  '4:6':  'refusal',        // 첫 고엘의 포기
  '4:13': 'fulfillment',    // 여호와께서 잉태케 하사
  '4:17': 'genealogy',      // 오벳 이름 · 다윗의 조부 계시
  '4:22': 'genealogy',      // 다윗 계보 결론
};

// ── 룻기 컨텍스트 ──────────────────────────────────────────────────────
// 히브리 lex (public/data/lex/hot/Ruth/*.json) 로 자동 감지 활성화
// manualDiscourse 는 자동 감지 위에 오버레이 — 서사 구조 핵심 지점 강조 (setting/commitment/fulfillment/genealogy 등)
export const RUTH_CTX = {
  id: 'Ruth',
  book: { ko: '룻기', bollsNum: 8, lexId: 'Ruth', lexCorpus: 'hot', en: 'Ruth', testament: 'OT' },
  chapters: 4,
  discourseRules: [...HEBREW_NARRATIVE_RULES, ...RUTH_STRUCTURAL_RULES],
  manualDiscourse: RUTH_MANUAL_DISCOURSE,
  theoTerms: HEBREW_OT_THEO_TERMS,
  meta: {
    genre: '구약 서사 · 역사서(단편)',
    genreNote: '히브리 정경 성문서 오축(五巻) 중 하나 · 칠칠절 낭독 두루마리',
    year: '사사시대 배경 (BC 12-11세기)',
    yearNote: '편집은 왕정 이후 (BC 10-6세기, 학자별 다름)',
    place: '유다 베들레헴 · 모압',
    placeNote: '이야기 배경 · 저작 장소는 명시 없음',
    author: '익명',
    authorNote: '탈무드 전승은 사무엘 · 다윗 조상 편집 관점',
    audience: '이스라엘 공동체',
    audienceNote: '다윗 조상 이야기 · 이방 여인의 신앙 편입 강조',
    theme: '헤세드 (חֶסֶד · 언약적 사랑)',
    themeNote: '이방인의 믿음 · 기업 무를 자(고엘) · 다윗 계보',
    chapterAgenda: {
      1: '모압에서의 비극 · 룻의 결단 (1:16-17)',
      2: '보아스의 밭 · 이삭줍기와 은혜',
      3: '타작마당의 청혼 · 옷자락',
      4: '성문 재판 · 구속 · 오벳 출생 · 다윗 계보',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 1, color: '#e11d48', label: '비극·결단' },
      { id: 's2', fromCh: 2, toCh: 2, color: '#059669', label: '은혜·만남' },
      { id: 's3', fromCh: 3, toCh: 3, color: '#7c3aed', label: '청혼·언약' },
      { id: 's4', fromCh: 4, toCh: 4, color: '#d97706', label: '구속·계보' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 1,  color: '#e11d48', label: '기근 · 모압 이주' },
      { id: 'p2',  ch: 1, verse: 16, color: '#e11d48', label: '룻의 결단 · 나의 하나님' },
      { id: 'p3',  ch: 1, verse: 22, color: '#e11d48', label: '베들레헴 귀향 · 보리 추수' },
      { id: 'p4',  ch: 2, verse: 1,  color: '#059669', label: '보아스 소개 · 유력자' },
      { id: 'p5',  ch: 2, verse: 12, color: '#059669', label: '여호와의 날개 아래' },
      { id: 'p6',  ch: 2, verse: 20, color: '#059669', label: '기업 무를 자 (고엘)' },
      { id: 'p7',  ch: 3, verse: 9,  color: '#7c3aed', label: '옷자락 청혼' },
      { id: 'p8',  ch: 3, verse: 11, color: '#7c3aed', label: '현숙한 여자 언약' },
      { id: 'p9',  ch: 4, verse: 6,  color: '#d97706', label: '첫 고엘의 포기' },
      { id: 'p10', ch: 4, verse: 13, color: '#d97706', label: '결혼 · 여호와의 잉태' },
      { id: 'p11', ch: 4, verse: 17, color: '#d97706', label: '오벳 출생 · 다윗의 조부' },
      { id: 'p12', ch: 4, verse: 22, color: '#d97706', label: '다윗 계보 결론' },
    ],
    arcs: [
      { id: 'a1', from: 'p1',  to: 'p11', color: '#d97706', label: '기근 → 오벳 (죽음 → 생명)' },
      { id: 'a2', from: 'p2',  to: 'p5',  color: '#059669', label: '룻의 신앙 → 여호와의 날개' },
      { id: 'a3', from: 'p6',  to: 'p9',  color: '#d97706', label: '고엘 언급 → 포기' },
      { id: 'a4', from: 'p9',  to: 'p10', color: '#d97706', label: '포기 → 보아스 구속' },
      { id: 'a5', from: 'p3',  to: 'p10', color: '#059669', label: '보리 추수 → 결혼 결실' },
      { id: 'a6', from: 'p7',  to: 'p11', color: '#7c3aed', label: '옷자락 → 후손' },
      { id: 'a7', from: 'p4',  to: 'p12', color: '#d97706', label: '보아스 → 다윗' },
    ],
  },
};

// ── 창세기 전용 구조 마커 (자동 감지 위에 오버레이) ────────────────────
const GEN_STRUCTURAL_RULES = [
  { id: 'creation', role: '창조 선언', icon: '🌅', color: '#f59e0b', bg: 'rgba(245,158,11,.14)',
    gr: 'בְּרֵאשִׁית בָּרָא', tr: '베레쉬트 바라',
    desc: '"태초에 하나님이 창조하시니라" — 우주와 시간의 출발점. 성경 전체 서사의 근원 명제.',
    match: null },
  { id: 'protoevangelium', role: '원복음', icon: '🐍', color: '#e11d48', bg: 'rgba(225,29,72,.13)',
    gr: 'זֶרַע הָאִשָּׁה', tr: '제라 하이샤',
    desc: '"여자의 후손이 뱀의 머리를 상하게 할 것이라" (3:15) — 인류 회복의 첫 언약적 약속. 그리스도 예표.',
    match: null },
  { id: 'toledot', role: '톨레도트 · 계보 서언', icon: '📜', color: '#94a3b8', bg: 'rgba(148,163,184,.13)',
    gr: 'אֵלֶּה תּוֹלְדוֹת', tr: '엘레 톨레도트',
    desc: '"이는 ~의 계보(족보)니라" — 창세기 서사를 10회 반복하며 구조화하는 형식적 표지어. 이야기의 새 단계 개시.',
    match: null },
  { id: 'covenant_call', role: '언약적 부르심', icon: '🤝', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'בְּרִית עוֹלָם', tr: '브릿 올람',
    desc: '"영원한 언약" · 하나님이 특정 인물·가문을 부르시고 약속을 세우시는 결정적 순간. 노아·아브라함·야곱.',
    match: null },
  { id: 'faith_reckoned', role: '믿음으로 의롭게 됨', icon: '🤲', color: '#a78bfa', bg: 'rgba(167,139,250,.14)',
    gr: 'וְהֶאֱמִן בַּיהוָה', tr: '베헤에민 바-아도나이',
    desc: '"아브람이 여호와를 믿으매 여호와께서 이를 그의 의로 여기시고" (15:6) — 이신칭의 원형 · 신약 신학의 뿌리.',
    match: null },
  { id: 'aqedah', role: '아케다 · 순종의 시험', icon: '🔥', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'הָעֲקֵדָה', tr: '하-아케다',
    desc: '"이삭의 결박" (22장) — 아브라함의 극한 순종 · 여호와 이레의 계시 · 그리스도 십자가 예표.',
    match: null },
  { id: 'israel_name', role: '이스라엘 이름 부여', icon: '👑', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'יִשְׂרָאֵל', tr: '이스라엘',
    desc: '"네 이름을 다시는 야곱이라 부를 것이 아니요 이스라엘이라" (32:28) — 얍복강 씨름 · 새 정체성 부여.',
    match: null },
  { id: 'divine_providence', role: '하나님의 예비', icon: '🌾', color: '#10b981', bg: 'rgba(16,185,129,.14)',
    gr: 'אֱלֹהִים חֲשָׁבָהּ לְטֹבָה', tr: '엘로힘 헤샤바흐 레토바',
    desc: '"당신들은 나를 해하려 하였으나 하나님은 그것을 선으로 바꾸사" (50:20) — 창세기 서사의 신학적 결론 · 섭리론의 정점.',
    match: null },
];

// 창세기 수동 담화 주석: 원역사 · 족장사 · 요셉 이야기의 신학적 결정 지점
const GEN_MANUAL_DISCOURSE = {
  '1:1':   'creation',           // 태초 창조 선언
  '1:27':  'creation',           // 하나님의 형상 · 인간 창조
  '3:15':  'protoevangelium',    // 원복음
  '5:1':   'toledot',            // 아담 톨레도트
  '6:5':   'covenant_call',      // 인류 죄악 · 홍수 예고
  '9:11':  'covenant_call',      // 노아 언약
  '10:1':  'toledot',            // 노아 아들들 톨레도트
  '11:10': 'toledot',            // 셈 톨레도트
  '11:27': 'toledot',            // 데라 톨레도트 · 아브람 등장
  '12:3':  'covenant_call',      // 아브라함 부르심 · 축복의 통로
  '15:6':  'faith_reckoned',     // 믿음으로 의롭게 됨
  '17:7':  'covenant_call',      // 영원한 언약 · 할례
  '22:12': 'aqedah',             // 아케다 · 여호와 이레
  '25:12': 'toledot',            // 이스마엘 톨레도트
  '25:19': 'toledot',            // 이삭 톨레도트
  '28:14': 'covenant_call',      // 야곱 언약 재확인 (벧엘)
  '32:28': 'israel_name',        // 이스라엘 이름 부여
  '36:1':  'toledot',            // 에서 톨레도트
  '37:2':  'toledot',            // 야곱 톨레도트 · 요셉 이야기 시작
  '45:5':  'divine_providence',  // 요셉의 신학적 해석
  '50:20': 'divine_providence',  // 요셉의 결론 · 섭리론 정점
};

// ── 창세기 컨텍스트 ────────────────────────────────────────────────────
export const GEN_CTX = {
  id: 'Gen',
  book: { ko: '창세기', bollsNum: 1, lexId: 'Gen', lexCorpus: 'hot', en: 'Genesis', testament: 'OT' },
  chapters: 50,
  discourseRules: [...HEBREW_NARRATIVE_RULES, ...GEN_STRUCTURAL_RULES],
  manualDiscourse: GEN_MANUAL_DISCOURSE,
  theoTerms: HEBREW_OT_THEO_TERMS,
  meta: {
    genre: '구약 오경 · 원역사·족장 서사',
    genreNote: '토라(תּוֹרָה) 첫 권 · 우주 창조부터 이스라엘의 애굽 정착까지',
    year: '편집: BC 15세기 (전통) · BC 6-5세기 (문서비평)',
    yearNote: '사건 배경: 태초 ~ BC 1876년경 (요셉의 애굽 사망)',
    place: '편집 장소 불명',
    placeNote: '전통: 시내 광야 · 문서비평: 유대 후기 편집',
    author: '모세 (전통) · 익명 편집자들',
    authorNote: '탈무드·초대교회 전승: 모세 저작 · 문서비평: J·E·P 자료 편집설',
    audience: '이스라엘 백성',
    audienceNote: '출애굽 세대 → 왕정 → 포로 세대까지 정체성 확인',
    theme: '창조 · 언약 · 약속 (בְּרֵאשִׁית)',
    themeNote: '하나님이 세상을 창조하시고 언약으로 백성을 부르시는 서사',
    chapterAgenda: {
      1:  '태초 · 6일 창조',
      2:  '에덴 · 인간 · 결혼',
      3:  '타락 · 저주 · 추방',
      4:  '가인·아벨 · 인류 살인',
      5:  '아담-노아 계보',
      6:  '부패한 세대 · 방주 명령',
      7:  '대홍수 · 심판',
      8:  '물이 물러감 · 방주 정박',
      9:  '노아 언약 · 무지개',
      10: '열국 계보 (족속 목록)',
      11: '바벨탑 · 셈-아브람 계보',
      12: '아브람 부르심 · 축복 선언',
      13: '롯과의 분리',
      14: '왕들의 전쟁 · 멜기세덱',
      15: '아브라함 언약 · 별처럼',
      16: '하갈 · 이스마엘 출생',
      17: '할례 언약 · 이름 개명',
      18: '세 방문객 · 소돔 예고',
      19: '소돔·고모라 심판',
      20: '그랄의 사라 사건',
      21: '이삭 출생 · 하갈 추방',
      22: '아케다 (이삭 번제)',
      23: '사라의 죽음 · 막벨라',
      24: '이삭·리브가 결혼',
      25: '아브라함 죽음 · 쌍둥이',
      26: '이삭·아비멜렉 · 우물',
      27: '야곱의 축복 도둑질',
      28: '벧엘의 사다리 꿈',
      29: '라반의 집 · 결혼',
      30: '야곱의 자녀 출생',
      31: '라반과의 결별',
      32: '얍복강 씨름 · 이스라엘',
      33: '에서와의 화해',
      34: '디나 사건 · 세겜 학살',
      35: '벧엘 귀환 · 라헬 죽음',
      36: '에서의 계보 · 에돔',
      37: '요셉의 꿈 · 형들의 시기',
      38: '유다와 다말',
      39: '보디발 집 · 옥에 갇힘',
      40: '감옥의 꿈 해석',
      41: '파라오의 꿈 · 요셉 등용',
      42: '형들의 첫 방문',
      43: '베냐민과 함께 재방문',
      44: '은잔 시험',
      45: '정체 밝힘 · 형제 화해',
      46: '야곱의 애굽 이주',
      47: '애굽 정착 · 기근 통치',
      48: '에브라임·므낫세 축복',
      49: '열두 아들 축복',
      50: '야곱 죽음 · 요셉 죽음',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1,  toCh: 11, color: '#f59e0b', label: '원역사' },
      { id: 's2', fromCh: 12, toCh: 25, color: '#059669', label: '아브라함' },
      { id: 's3', fromCh: 25, toCh: 36, color: '#a78bfa', label: '이삭·야곱' },
      { id: 's4', fromCh: 37, toCh: 50, color: '#7c3aed', label: '요셉' },
    ],
    pivots: [
      { id: 'p1',  ch: 1,  verse: 1,   color: '#f59e0b', label: '태초 · 창조 선언' },
      { id: 'p2',  ch: 1,  verse: 27,  color: '#f59e0b', label: '하나님의 형상 · 인간 창조' },
      { id: 'p3',  ch: 3,  verse: 15,  color: '#e11d48', label: '원복음 · 여자의 후손' },
      { id: 'p4',  ch: 6,  verse: 5,   color: '#e11d48', label: '인류 죄악의 절정' },
      { id: 'p5',  ch: 9,  verse: 11,  color: '#f59e0b', label: '노아 언약 · 무지개' },
      { id: 'p6',  ch: 12, verse: 3,   color: '#059669', label: '아브라함 부르심 · 축복' },
      { id: 'p7',  ch: 15, verse: 6,   color: '#059669', label: '믿음으로 의롭게 됨' },
      { id: 'p8',  ch: 17, verse: 7,   color: '#059669', label: '영원한 언약 · 할례' },
      { id: 'p9',  ch: 22, verse: 12,  color: '#059669', label: '아케다 · 여호와 이레' },
      { id: 'p10', ch: 28, verse: 14,  color: '#a78bfa', label: '야곱 언약 · 벧엘' },
      { id: 'p11', ch: 32, verse: 28,  color: '#a78bfa', label: '이스라엘 이름 부여' },
      { id: 'p12', ch: 45, verse: 5,   color: '#7c3aed', label: '요셉의 신학적 해석' },
      { id: 'p13', ch: 50, verse: 20,  color: '#7c3aed', label: '섭리론 · 선으로 바꾸사' },
    ],
    arcs: [
      { id: 'a1', from: 'p1',  to: 'p3',  color: '#e11d48', label: '창조 → 원복음 (타락 후 회복 약속)' },
      { id: 'a2', from: 'p3',  to: 'p6',  color: '#059669', label: '원복음 → 아브라함 부르심 (회복 계보)' },
      { id: 'a3', from: 'p4',  to: 'p5',  color: '#f59e0b', label: '죄악 → 노아 언약 (심판과 은혜)' },
      { id: 'a4', from: 'p6',  to: 'p7',  color: '#059669', label: '부르심 → 믿음의 의' },
      { id: 'a5', from: 'p7',  to: 'p9',  color: '#059669', label: '믿음 → 아케다 (완성된 순종)' },
      { id: 'a6', from: 'p8',  to: 'p10', color: '#a78bfa', label: '언약 → 언약 재확인' },
      { id: 'a7', from: 'p11', to: 'p13', color: '#7c3aed', label: '이스라엘 → 섭리 결론' },
      { id: 'a8', from: 'p1',  to: 'p13', color: '#94a3b8', label: '창조 → 섭리 (전체 대주제)' },
    ],
  },
};

// ── 출애굽기 전용 구조 마커 (자동 감지 위에 오버레이) ────────────────────
const EXO_STRUCTURAL_RULES = [
  { id: 'burning_bush', role: '불붙는 떨기나무·소명', icon: '🔥', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'הַסְּנֶה', tr: '하-스네', indent: 1,
    desc: '"떨기나무 가운데로부터 나오는 불꽃 안에서" (3:2) — 모세의 소명 사건. 하나님이 인격적으로 부르시는 결정적 순간.',
    match: null },
  { id: 'divine_name', role: '여호와 이름 계시', icon: '🎯', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'אֶהְיֶה אֲשֶׁר אֶהְיֶה', tr: '에흐예 아쉐르 에흐예',
    desc: '"나는 스스로 있는 자니라" (3:14) · "여호와" 이름의 신학적 의미. 6:3 에서 언약적 재확인.',
    match: null },
  { id: 'plagues', role: '열 재앙 · 심판', icon: '🩸', color: '#991b1b', bg: 'rgba(153,27,27,.13)',
    gr: 'מַכָּה', tr: '마카',
    desc: '애굽 신들에 대한 심판 · 여호와의 절대 주권 계시 (7-12장). 애굽인이 알게 되리라.',
    match: null },
  { id: 'passover', role: '유월절 · 어린양', icon: '🐑', color: '#e11d48', bg: 'rgba(225,29,72,.13)',
    gr: 'פֶּסַח', tr: '페사흐',
    desc: '"내가 애굽 땅을 칠 때에 그 피가 너희를 위하여 표적이 될지라" (12:13) — 대속의 원형 · 그리스도 예표.',
    match: null },
  { id: 'exodus_deliverance', role: '홍해·구원 사건', icon: '🌊', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'יְשׁוּעַת יְהוָה', tr: '예슈아트 아도나이',
    desc: '"여호와께서 오늘 너희를 위하여 행하시는 구원을 보라" (14:13) — 출애굽 서사의 정점. 모세의 노래로 응답 (15장).',
    match: null },
  { id: 'sinai_covenant', role: '시내 언약', icon: '⛰️', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'בְּרִית סִינַי', tr: '브릿 시나이',
    desc: '"너희는 내 소유가 되겠고 제사장 나라·거룩한 백성이 되리라" (19:5-6) — 이스라엘 국가·언약 정체성의 결정적 형성.',
    match: null },
  { id: 'decalogue', role: '십계명 선포', icon: '📜', color: '#a78bfa', bg: 'rgba(167,139,250,.14)',
    gr: 'עֲשֶׂרֶת הַדְּבָרִים', tr: '아세렛 하-데바림',
    desc: '"하나님이 이 모든 말씀으로 이르시되" (20:1) — 언약 백성의 기본 규범. 신구약 윤리의 근간.',
    match: null },
  { id: 'tabernacle', role: '성막 · 임재의 처소', icon: '🏛️', color: '#d97706', bg: 'rgba(217,119,6,.14)',
    gr: 'מִשְׁכָּן', tr: '미쉬칸',
    desc: '"내가 그들 중에 거할 성소를 그들이 나를 위하여 짓되" (25:8) — 하나님이 언약 백성 가운데 거하시는 표징. 그리스도 성육신 예표.',
    match: null },
  { id: 'glory_shekinah', role: '여호와의 영광 임재', icon: '💎', color: '#f59e0b', bg: 'rgba(245,158,11,.14)',
    gr: 'כְּבוֹד יְהוָה', tr: '크보드 아도나이',
    desc: '"여호와의 영광이 성막에 충만하매" (40:34) — 시내산·성막에 임재하신 영광의 신학적 절정. 출애굽기 서사의 최종 응답.',
    match: null },
  { id: 'hardening', role: '완악한 마음', icon: '🪨', color: '#78716c', bg: 'rgba(120,113,108,.14)',
    gr: 'חָזַק / כָּבֵד לֵב', tr: '하자크 / 카바드 레브',
    desc: '바로의 마음이 완악해짐 — 재앙 서사 전체를 관통하는 신학적 미스터리. 자기 완악(카바드) 과 여호와가 완악하게 하심(하자크) 의 긴장. 총 20회 반복.',
    match: null },
  { id: 'recognition_formula', role: '알리라 · 인정 공식', icon: '👁️', color: '#0284c7', bg: 'rgba(2,132,199,.13)',
    gr: 'וִידַעְתֶּם כִּי־אֲנִי יְהוָה', tr: '비이다템 키 아니 아도나이',
    desc: '"너희(애굽인) 가 알리라 나는 여호와인 줄" (Erkenntnisformel) — 재앙·홍해 서사를 묶는 표준 공식. 심판의 목적이 곧 계시.',
    match: null },
  { id: 'divine_warrior', role: '여호와가 싸우신다', icon: '⚔️', color: '#1e40af', bg: 'rgba(30,64,175,.14)',
    gr: 'יְהוָה אִישׁ מִלְחָמָה', tr: '아도나이 이쉬 밀하마',
    desc: '"여호와는 용사시니 여호와는 그 이름이시로다" (15:3). 홍해 사건의 신학적 해석 — 이스라엘은 가만히 서고 여호와가 싸우심.',
    match: null },
  { id: 'firstborn', role: '장자 · 첫아들 신학', icon: '👶', color: '#be185d', bg: 'rgba(190,24,93,.13)',
    gr: 'בְּנִי בְכֹרִי יִשְׂרָאֵל', tr: '베니 브코리 이스라엘',
    desc: '"이스라엘은 내 아들 내 장자라" (4:22) — 유월절·초태생 성별·장자 심판 신학의 뿌리. 애굽 장자 vs 이스라엘 장자의 대비.',
    match: null },
  { id: 'sabbath_sign', role: '안식일 · 언약의 표징', icon: '🕎', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'אוֹת בֵּינִי וּבֵינֵיכֶם', tr: '오트 베이니 우베이네켐',
    desc: '"나와 이스라엘 자손 사이에 영원한 표징이며" (31:17) — 안식일이 시내언약의 정체성 표식. 창조·구속·언약을 잇는 신학.',
    match: null },
  { id: 'mediator', role: '모세의 중보', icon: '🙏', color: '#65a30d', bg: 'rgba(101,163,13,.13)',
    gr: 'וַיְחַל מֹשֶׁה', tr: '와이할 모쉐',
    desc: '"모세가 그의 하나님 여호와께 구하여" (32:11) — 금송아지 사건 후 모세의 중보로 하나님이 뜻을 돌이키심. 이스라엘 존속의 결정적 순간.',
    match: null },
  { id: 'face_shining', role: '모세의 빛나는 얼굴', icon: '✨', color: '#eab308', bg: 'rgba(234,179,8,.14)',
    gr: 'קָרַן עוֹר פָּנָיו', tr: '카란 오르 파나이브',
    desc: '"모세가 여호와와 말씀하였음으로 얼굴 피부에 광채가 나니" (34:29) — 여호와 임재의 물리적 표징. 고후 3:7-18 배경.',
    match: null },
];

// 출애굽기 수동 담화 주석: 소명·재앙·유월절·홍해·시내·성막 서사의 신학적 결정 지점
// 구약학 표준 모티프 반영: 완악한 마음(hardening), 인정 공식(recognition_formula),
// 여호와 용사(divine_warrior), 장자 신학(firstborn), 안식일 언약 표징(sabbath_sign),
// 모세 중보(mediator), 얼굴 광채(face_shining) 등
const EXO_MANUAL_DISCOURSE = {
  '1:8':   'wayehi_setting',      // 새 왕의 즉위 · 억압 서사 개시
  '2:24':  'sinai_covenant',      // 하나님이 언약을 기억하시니라
  '3:2':   'burning_bush',        // 불붙는 떨기나무
  '3:14':  'divine_name',         // 에흐예 아쉐르 에흐예 (I AM)
  '4:22':  'firstborn',           // 이스라엘은 내 아들 · 내 장자 (장자 신학 서두)
  '6:3':   'divine_name',         // 엘 샤다이 → 여호와 이름 재계시
  '6:7':   'sinai_covenant',      // 내가 너희를 애굽인의 무거운 짐 밑에서 빼내고
  '7:3':   'hardening',           // 내가 바로의 마음을 완악하게 하고
  '7:5':   'recognition_formula', // 애굽인이 나를 여호와인 줄 알리라 (표준 공식 첫 등장)
  '7:17':  'recognition_formula', // 이로 인하여 여호와인 줄 네가 알리라
  '9:16':  'recognition_formula', // 내가 너를 세웠음은 내 이름이 온 땅에 전파되게 하려 함이라
  '10:1':  'hardening',           // 내가 바로의 마음을 완악하게 하였음은
  '12:13': 'passover',            // 피가 표적이 되어 · 넘어가리라
  '12:23': 'passover',            // 여호와께서 애굽 땅을 치실 때 넘어가시고
  '12:29': 'plagues',             // 애굽 땅에 모든 장자를 치시매
  '13:2':  'firstborn',           // 이스라엘 자손 중에 처음 난 것은 다 내게 돌리라
  '13:21': 'exodus_deliverance',  // 여호와께서 구름·불기둥으로 인도하시니
  '14:4':  'hardening',           // 내가 바로의 마음을 완악하게 한즉 (홍해 배경)
  '14:13': 'exodus_deliverance',  // 너희는 두려워 말고 가만히 서서 구원을 보라
  '14:14': 'divine_warrior',      // 여호와께서 너희를 위하여 싸우시리니
  '14:21': 'exodus_deliverance',  // 여호와께서 큰 동풍으로 바다를 물러가게 하시니
  '14:18': 'recognition_formula', // 애굽 사람이 나를 여호와인 줄 알리라
  '15:2':  'exodus_deliverance',  // 여호와는 나의 힘·나의 노래·나의 구원
  '15:3':  'divine_warrior',      // 여호와는 용사시니 여호와는 그 이름이시로다
  '15:11': 'divine_warrior',      // 여호와여 신 중에 주와 같은 자 누구니이까 (찬양 절정)
  '16:4':  'sinai_covenant',      // 하늘에서 양식을 비같이 내리리니 (만나·언약 시험)
  '19:5':  'sinai_covenant',      // 너희는 내 소유가 되겠고
  '19:16': 'sinai_covenant',      // 시내산 강림 · 우레·번개·나팔소리
  '20:1':  'decalogue',           // 하나님이 이 모든 말씀으로 이르시되
  '24:8':  'sinai_covenant',      // 언약의 피 · 여호와가 세우신 언약의 피니라
  '24:17': 'glory_shekinah',      // 여호와의 영광의 모양이 맹렬한 불 같이
  '25:8':  'tabernacle',          // 성소를 지으라 · 내가 그들 중에 거하리라
  '31:17': 'sabbath_sign',        // 나와 이스라엘 자손 사이에 영원한 표징 (안식일 언약)
  '32:11': 'mediator',            // 모세가 그의 하나님 여호와께 구하여 (금송아지 후 중보)
  '32:14': 'mediator',            // 여호와께서 뜻을 돌이키사 (중보 응답)
  '33:11': 'divine_name',         // 여호와께서 모세와 대면하여 말씀하시며
  '33:19': 'divine_name',         // 나의 모든 선한 것을 네 앞으로 지나가게 하고
  '34:6':  'divine_name',         // 여호와의 성품 · 자비·은혜·오래 참음 (구약 신조)
  '34:29': 'face_shining',        // 얼굴 피부에 광채가 나니
  '40:34': 'glory_shekinah',      // 여호와의 영광이 성막에 충만하매 (결론)
};

// ── 출애굽기 컨텍스트 ──────────────────────────────────────────────────
export const EXO_CTX = {
  id: 'Exod',
  book: { ko: '출애굽기', bollsNum: 2, lexId: 'Exod', lexCorpus: 'hot', en: 'Exodus', testament: 'OT' },
  chapters: 40,
  discourseRules: [...HEBREW_NARRATIVE_RULES, ...EXO_STRUCTURAL_RULES],
  manualDiscourse: EXO_MANUAL_DISCOURSE,
  theoTerms: HEBREW_OT_THEO_TERMS,
  meta: {
    genre: '구약 오경 · 구속사·언약 서사',
    genreNote: '토라(תּוֹרָה) 두 번째 · 출애굽부터 시내언약·성막 건축까지',
    year: '편집: BC 15세기 (전통) · BC 6-5세기 (문서비평)',
    yearNote: '사건 배경: BC 1446년경 출애굽 (전통) · BC 13세기 (수정 연대)',
    place: '편집 장소 불명',
    placeNote: '전통: 시내 광야 · 문서비평: 유대 후기 편집',
    author: '모세 (전통) · 익명 편집자들',
    authorNote: '탈무드·초대교회: 모세 저작 · 문서비평: J·E·P 편집설',
    audience: '이스라엘 백성',
    audienceNote: '출애굽 세대 → 정착 세대 → 포로 세대까지 정체성·법 근간',
    theme: '구속·언약·임재 (יְצִיאָה)',
    themeNote: '노예에서 언약 백성으로 · 여호와가 그들 중에 거하시다',
    chapterAgenda: {
      1:  '애굽 압제·산파의 신앙',
      2:  '모세 출생·미디안 도피·언약 기억',
      3:  '떨기나무 소명·여호와 이름 계시',
      4:  '표적 3·모세의 반문·십보라 할례',
      5:  '바로 첫 대면·짚 없이 벽돌·억압 심화',
      6:  '여호와 이름 재계시·모세-아론 계보',
      7:  '아론의 지팡이·1재앙 피·완악한 마음',
      8:  '2·3·4재앙 개구리·이·파리·구별 시작',
      9:  '5·6·7재앙 가축·독종·우박·이름 전파',
      10: '8·9재앙 메뚜기·흑암·완악 정점',
      11: '10재앙 예고·장자 심판 선언',
      12: '유월절 규례·출애굽·이방인 규정',
      13: '초태생 성별·구름/불기둥 인도',
      14: '홍해 갈라짐·여호와가 싸우신다',
      15: '모세의 노래·미리암의 응답·마라의 쓴물',
      16: '만나·안식일 원리 (첫 계명)',
      17: '반석의 물·아말렉 전쟁·여호와 닛시',
      18: '이드로 방문·70장로 재판 조직',
      19: '시내산 강림·제사장 나라·언약 제안',
      20: '십계명 선포·백성의 두려움',
      21: '종·상해·살인 판례법 (미쉬파팀)',
      22: '재산·도덕·사회 판례법',
      23: '공의·3대 절기·가나안 정복 약속',
      24: '언약 체결·언약의 피·70장로 하나님 뵈옴',
      25: '성막 설계·법궤·진설병상·등잔대',
      26: '성막 휘장·널판·문·구조',
      27: '번제단·성막 뜰·감람유',
      28: '제사장 예복·에봇·우림-둠밈',
      29: '제사장 위임식·상번제·언약 임재',
      30: '분향단·물두멍·관유·향·인구조사 속전',
      31: '브살렐 성령 소명·안식일 언약의 표징',
      32: '금송아지 배교·모세의 중보·심판',
      33: '여호와의 얼굴·모세와 대면·영광 요청',
      34: '언약 갱신·여호와 성품 계시·모세 얼굴 광채',
      35: '안식일 재확인·성막 자원 헌금 넘침',
      36: '성막 시공 개시·재료 그만 명령',
      37: '브살렐이 법궤·상·등잔대·분향단 제작',
      38: '번제단·물두멍·성막 뜰·헌납 총계',
      39: '제사장 예복 완성·모세의 검열 (7번)',
      40: '성막 봉헌·여호와 영광 충만 (창조 서사 완결)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1,  toCh: 12, color: '#e11d48', label: '애굽에서 · 구속' },
      { id: 's2', fromCh: 13, toCh: 18, color: '#0891b2', label: '광야에서 · 인도' },
      { id: 's3', fromCh: 19, toCh: 24, color: '#059669', label: '시내에서 · 언약' },
      { id: 's4', fromCh: 25, toCh: 40, color: '#d97706', label: '성막 · 임재' },
    ],
    pivots: [
      { id: 'p1',  ch: 1,  verse: 8,  color: '#e11d48', label: '새 왕 · 압제 시작' },
      { id: 'p2',  ch: 3,  verse: 2,  color: '#dc2626', label: '불붙는 떨기나무 · 소명' },
      { id: 'p3',  ch: 3,  verse: 14, color: '#7c3aed', label: '여호와 이름 · 에흐예' },
      { id: 'p4',  ch: 4,  verse: 22, color: '#be185d', label: '이스라엘 = 내 장자' },
      { id: 'p5',  ch: 6,  verse: 3,  color: '#7c3aed', label: '엘 샤다이 → 여호와' },
      { id: 'p6',  ch: 7,  verse: 5,  color: '#0284c7', label: '알리라 (인정 공식 첫 등장)' },
      { id: 'p7',  ch: 12, verse: 13, color: '#e11d48', label: '유월절 · 피의 표적' },
      { id: 'p8',  ch: 12, verse: 29, color: '#991b1b', label: '장자 심판' },
      { id: 'p9',  ch: 14, verse: 14, color: '#1e40af', label: '여호와가 싸우신다' },
      { id: 'p10', ch: 14, verse: 21, color: '#0891b2', label: '홍해 갈라짐' },
      { id: 'p11', ch: 15, verse: 3,  color: '#1e40af', label: '여호와는 용사시니' },
      { id: 'p12', ch: 19, verse: 5,  color: '#059669', label: '제사장 나라 · 거룩한 백성' },
      { id: 'p13', ch: 20, verse: 1,  color: '#a78bfa', label: '십계명 선포' },
      { id: 'p14', ch: 24, verse: 8,  color: '#059669', label: '언약의 피' },
      { id: 'p15', ch: 25, verse: 8,  color: '#d97706', label: '내가 그들 중에 거하리라' },
      { id: 'p16', ch: 31, verse: 17, color: '#0369a1', label: '안식일 · 언약의 표징' },
      { id: 'p17', ch: 32, verse: 11, color: '#65a30d', label: '모세의 중보 (금송아지 후)' },
      { id: 'p18', ch: 34, verse: 6,  color: '#7c3aed', label: '여호와 성품 계시 (구약 신조)' },
      { id: 'p19', ch: 34, verse: 29, color: '#eab308', label: '모세의 얼굴 광채' },
      { id: 'p20', ch: 40, verse: 34, color: '#f59e0b', label: '여호와 영광 성막 충만' },
    ],
    arcs: [
      { id: 'a1',  from: 'p1',  to: 'p2',  color: '#dc2626', label: '압제 → 소명' },
      { id: 'a2',  from: 'p3',  to: 'p5',  color: '#7c3aed', label: '이름 계시 → 재확인' },
      { id: 'a3',  from: 'p4',  to: 'p8',  color: '#be185d', label: '이스라엘 장자 → 애굽 장자 심판 (대비)' },
      { id: 'a4',  from: 'p6',  to: 'p11', color: '#0284c7', label: '알리라 → 알게 됨 (인정 공식 완성)' },
      { id: 'a5',  from: 'p7',  to: 'p8',  color: '#e11d48', label: '유월절 → 장자 심판' },
      { id: 'a6',  from: 'p9',  to: 'p11', color: '#1e40af', label: '여호와가 싸우신다 → 승리 찬양' },
      { id: 'a7',  from: 'p12', to: 'p13', color: '#059669', label: '언약 → 규범 (십계명)' },
      { id: 'a8',  from: 'p13', to: 'p14', color: '#a78bfa', label: '규범 → 언약의 피' },
      { id: 'a9',  from: 'p14', to: 'p17', color: '#059669', label: '언약 체결 → 중보 (배교 극복)' },
      { id: 'a10', from: 'p17', to: 'p18', color: '#65a30d', label: '중보 → 성품 계시 (자비·은혜)' },
      { id: 'a11', from: 'p15', to: 'p20', color: '#d97706', label: '성막 명령 → 영광 임재' },
      { id: 'a12', from: 'p1',  to: 'p20', color: '#94a3b8', label: '압제 → 임재 (전체 대주제)' },
    ],
  },
};

// ── 마가복음 전용 구조 마커 (자동 감지 위에 오버레이) ────────────────────
// 신약학 표준 신학 모티프 반영 (Wrede, Marcus, France, Hooker, Bock 등)
const MRK_STRUCTURAL_RULES = [
  { id: 'immediately', role: '즉시 (마가 시그니처)', icon: '⚡', color: '#eab308', bg: 'rgba(234,179,8,.13)',
    gr: 'εὐθύς', tr: '유튀스', indent: 1,
    desc: '"곧·즉시" — 마가 특유 부사, 복음서 통틀어 41회 등장 (마가 26·마태 5·누가 1). 사건의 긴박성·성령 주도성 강조.',
    match: (s) => s.has('G2117') || s.has('G2112') },
  { id: 'son_of_god', role: '하나님의 아들 계시', icon: '👑', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'υἱὸς θεοῦ', tr: '휘오스 테우',
    desc: '"하나님의 아들 예수 그리스도" (1:1) — 서두 · 세례 (1:11) · 변화산 (9:7) · 백부장 고백 (15:39) 을 잇는 대주제.',
    match: null },
  { id: 'heaven_torn', role: '하늘 찢어짐 · Inclusio', icon: '🕊️', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'σχιζομένους', tr: '스키조메누스',
    desc: '"하늘이 갈라짐" (1:10 세례) 과 "성전 휘장 위로부터 아래까지 찢어짐" (15:38) 이 동일 어근으로 대응 — 하나님·인간 사이 진입 개방의 신학적 액자 (inclusio).',
    match: null },
  { id: 'messianic_secret', role: '메시아 비밀 (침묵 명령)', icon: '🤫', color: '#64748b', bg: 'rgba(100,116,139,.15)',
    gr: 'μηδενὶ μηδὲν εἴπῃς', tr: '메데니 메덴 에이페스',
    desc: '"아무에게도 이르지 말라" — 예수가 자신의 정체·이적을 함구하도록 명령. Wrede 이후 신약학 표준 개념. 1:44, 3:12, 5:43, 7:36, 8:30, 9:9.',
    match: null },
  { id: 'passion_prediction', role: '수난 예고 (3회)', icon: '✝️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'δεῖ τὸν υἱὸν τοῦ ἀνθρώπου πολλὰ παθεῖν', tr: '데이 톤 휘온 투 안트로푸 폴라 파테인',
    desc: '"인자가 반드시 많은 고난을 받고" — 8:31, 9:31, 10:33-34 세 지점에서 정확히 반복. 마가 서사 중심축이 갈릴리→예루살렘·정체계시→수난으로 전환.',
    match: null },
  { id: 'transfiguration', role: '변화산 계시', icon: '🌟', color: '#f59e0b', bg: 'rgba(245,158,11,.14)',
    gr: 'μετεμορφώθη', tr: '메테모르포테',
    desc: '"그가 변화되사" (9:2) — 예수의 신성 계시. 모세·엘리야 함께 · 하늘 음성 "이는 내 사랑하는 아들이니 너희는 그의 말을 들으라" (9:7).',
    match: null },
  { id: 'ransom', role: '대속물 · 신학적 정점', icon: '🎯', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'λύτρον ἀντὶ πολλῶν', tr: '뤼트론 안티 폴론',
    desc: '"많은 사람의 대속물로 자기 목숨을 주려 함이니라" (10:45) — 마가복음의 신학적 정점. 섬김·자기 비움·구속 신학이 응결.',
    match: null },
  { id: 'temple_action', role: '성전 정화·심판', icon: '🏛️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'ἐξέβαλεν τοὺς πωλοῦντας', tr: '엑세발렌 투스 폴룬타스',
    desc: '"파는 자들을 내쫓으시니라" (11:15) — 무화과 저주와 샌드위치 구조로 성전 심판 예고. 예루살렘 갈등의 도화선.',
    match: null },
  { id: 'centurion_confession', role: '백부장 고백 (Inclusio 완성)', icon: '💀', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἀληθῶς οὗτος ὁ ἄνθρωπος υἱὸς θεοῦ ἦν', tr: '알레토스 후토스 호 안트로포스 휘오스 테우 엔',
    desc: '"이 사람은 진실로 하나님의 아들이었도다" (15:39) — 이방인 백부장이 십자가 앞에서 마가 서두 (1:1) 를 완성하는 고백. Inclusio 신학적 절정.',
    match: null },
  { id: 'empty_tomb', role: '빈 무덤 · 부활 선포', icon: '🎭', color: '#10b981', bg: 'rgba(16,185,129,.14)',
    gr: 'ἠγέρθη, οὐκ ἔστιν ὧδε', tr: '에게르테 우크 에스틴 호데',
    desc: '"그가 살아나셨고 여기 계시지 아니하니라" (16:6) — 마가 원본 종결점. 여인들의 두려움 · 침묵 (16:8) 으로 열린 결말.',
    match: null },
  { id: 'son_of_man', role: '인자 (Son of Man)', icon: '🧑', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ὁ υἱὸς τοῦ ἀνθρώπου', tr: '호 휘오스 투 안트로푸',
    desc: '예수의 자기 지칭 · 마가 14회 · 다니엘 7:13 배경. 지상 권세(2:10·28) → 수난(8:31 이후) → 재림(13:26·14:62) 세 국면으로 발전. Marcus·Hooker 마가 기독론 핵심.',
    match: null },
  { id: 'kingdom_of_god', role: '하나님 나라 선포', icon: '👑', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'βασιλεία τοῦ θεοῦ', tr: '바실레이아 투 테우',
    desc: '"하나님 나라가 가까이 왔으니 회개하고 복음을 믿으라" (1:15) — 마가 14회 · 예수 사역의 총주제. 이미/아직 (already/not yet) 긴장. France·Kingsbury 마가 대주제.',
    match: (s) => s.has('G0932') && s.has('G2316') },
  { id: 'way_of_lord', role: '도상 신학 (the Way)', icon: '🛤️', color: '#d97706', bg: 'rgba(217,119,6,.13)',
    gr: 'ἐν τῇ ὁδῷ', tr: '엔 테 호도',
    desc: '"길에서" — 마가 8:27-10:52 도상 부분의 신학적 뼈대. 예수의 길 (수난)  = 제자의 길 (자기부인). Marcus *Way of the Lord* 는 이 부분을 마가 서사 중심 척추로 봄.',
    match: null },
  { id: 'elijah_motif', role: '엘리야 모티프', icon: '🌿', color: '#a16207', bg: 'rgba(161,98,7,.12)',
    gr: 'Ἠλίας', tr: '엘리아스',
    desc: '세례요한 = 엘리야 (1:2-3, 9:11-13) · 변화산 함께 등장 (9:4) · 십자가 절규 오해 (15:35-36). 말라기 4:5 종말론 성취 프레임. Öhler·Marcus 강조.',
    match: (s) => s.has('G2243') },
  { id: 'intercalation', role: '샌드위치 구조 (A-B-A)', icon: '🌀', color: '#be185d', bg: 'rgba(190,24,93,.13)',
    gr: 'A-B-A', tr: '인터칼레이션',
    desc: '마가 특유 서사 기법 · 한 이야기(A)를 시작 → 다른 이야기(B) 삽입 → 원래 이야기(A) 완결. 두 이야기가 상호 해석. 5:21-43(야이로/혈루증) · 11:12-25(무화과/성전) · 14:1-11(음모/향유) · 14:53-72(재판/베드로 부인). Edwards "Markan Sandwiches" 표준 개념.',
    match: null },
];

// 마가복음 수동 담화 주석: 정체 계시 · 메시아 비밀 · 수난·부활 서사의 신학적 결정 지점
// 신약학 표준 15종 마커 반영 (Wrede·Marcus·France·Hooker·Edwards·Öhler)
const MRK_MANUAL_DISCOURSE = {
  '1:1':   'son_of_god',            // 표제 · 하나님의 아들 예수 그리스도의 복음
  '1:2':   'elijah_motif',          // 세례요한 = 엘리야 (말라기·이사야 결합 인용)
  '1:10':  'heaven_torn',           // 하늘 갈라짐 · 성령 강림 (Inclusio 시작)
  '1:11':  'son_of_god',            // 하늘 음성 "너는 내 사랑하는 아들이라"
  '1:15':  'kingdom_of_god',        // 때가 찼고 하나님 나라가 가까이 왔다 (총주제)
  '1:44':  'messianic_secret',      // 나병환자에게 침묵 명령
  '2:10':  'son_of_man',            // 인자가 땅에서 죄를 사하는 권세 (지상 권세 국면)
  '2:28':  'son_of_man',            // 인자는 안식일의 주인
  '3:12':  'messianic_secret',      // 귀신들에게 침묵 명령
  '4:11':  'kingdom_of_god',        // 하나님 나라의 비밀 (비유의 신비)
  '4:26':  'kingdom_of_god',        // 스스로 자라나는 씨 비유
  '5:25':  'intercalation',         // 야이로 딸 도중 혈루증 여인 삽입 (샌드위치 A-B-A)
  '5:43':  'messianic_secret',      // 야이로 딸 살리심 · 침묵 명령
  '6:15':  'elijah_motif',          // 사람들이 예수를 엘리야라고 함
  '7:36':  'messianic_secret',      // 귀 먹은 자 고침 · 침묵 명령
  '8:27':  'way_of_lord',           // 도상 부분 시작 · "길에서 물으시되"
  '8:29':  'son_of_god',            // 베드로의 고백 "주는 그리스도시니이다"
  '8:30':  'messianic_secret',      // 자기의 일을 말하지 말라
  '8:31':  'passion_prediction',    // 첫 번째 수난 예고
  '8:38':  'son_of_man',            // 인자가 아버지 영광으로 올 때 (재림 국면)
  '9:2':   'transfiguration',       // 변화산 · 메테모르포테
  '9:4':   'elijah_motif',          // 엘리야가 모세와 함께 나타남
  '9:7':   'son_of_god',            // 변화산 하늘 음성
  '9:9':   'messianic_secret',      // 인자가 죽은 자 가운데서 살아난 뒤에야
  '9:11':  'elijah_motif',          // 엘리야가 먼저 와야 하리라
  '9:31':  'passion_prediction',    // 두 번째 수난 예고
  '10:15': 'kingdom_of_god',        // 어린 아이와 같이 · 하나님 나라 받음
  '10:32': 'way_of_lord',           // 예수께서 앞서서 예루살렘으로 올라가시는 길
  '10:33': 'passion_prediction',    // 세 번째 수난 예고 (상세)
  '10:45': 'ransom',                // 대속물 · 신학적 정점
  '10:52': 'way_of_lord',           // 바디매오 · 예수를 길에서 따르니라 (도상 종결)
  '11:12': 'intercalation',         // 무화과 저주 · 성전 정화 · 무화과 마름 (샌드위치)
  '11:15': 'temple_action',         // 성전 정화
  '12:34': 'kingdom_of_god',        // 네가 하나님 나라에서 멀지 아니하도다
  '13:26': 'son_of_man',            // 인자가 구름 타고 오심 (재림 국면 절정)
  '14:1':  'intercalation',         // 종교지도자 음모 · 향유 부음 · 유다 배신 (샌드위치)
  '14:22': 'ransom',                // 성찬 제정 · 이는 내 몸이니라
  '14:36': 'ransom',                // 겟세마네 · 아바 아버지
  '14:53': 'intercalation',         // 재판 · 베드로 부인 (샌드위치 · A-B-A)
  '14:62': 'son_of_man',            // "내가 그니라" · 재판 대답 · 인자 클라이맥스
  '15:34': 'passion_prediction',    // 엘로이 엘로이 · 십자가 절규
  '15:35': 'elijah_motif',          // 사람들이 엘리야를 부른다 오해
  '15:38': 'heaven_torn',           // 성전 휘장 찢어짐 (Inclusio 완성)
  '15:39': 'centurion_confession',  // 백부장 고백 · 진실로 하나님의 아들
  '15:43': 'kingdom_of_god',        // 요셉 · 하나님 나라를 기다리는 자
  '16:6':  'empty_tomb',            // 그가 살아나셨고 여기 계시지 아니하니라
  '16:8':  'empty_tomb',            // 여인들의 두려움 · 원본 종결
};

// ── 마가복음 컨텍스트 ──────────────────────────────────────────────────
export const MRK_CTX = {
  id: 'Mark',
  book: { ko: '마가복음', bollsNum: 41, lexId: 'Mark', lexCorpus: 'gnt', en: 'Mark', testament: 'NT' },
  chapters: 16,
  discourseRules: [...GNT_DISCOURSE_RULES, ...MRK_STRUCTURAL_RULES],
  manualDiscourse: MRK_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS, // 신약 신학어 재사용 (은혜·죄·믿음·의·성령 등)
  meta: {
    genre: '신약 복음서 · 공관복음 (가장 짧고 이른)',
    genreNote: '4복음서 중 최초 기록 (AD 65-70) · 마태·누가의 자료원 (마가 우선설)',
    year: 'AD 65-70년경',
    yearNote: '네로 박해 · 성전 파괴 직전. 로마 교회 청중 대상 (라틴어 차용어 다수)',
    place: '로마 (전통)',
    placeNote: '초대교회 전승 (파피아스·이레네우스): 베드로 통역자 마가가 로마에서 기록',
    author: '마가 요한 (베드로의 통역자)',
    authorNote: '베드로의 설교를 기록 · 바나바의 사촌 (골 4:10) · 바울과 동행 (행 12:25)',
    audience: '로마 교회 이방 그리스도인',
    audienceNote: '박해 상황 · 예수의 고난·인내 강조 · 유대 관습 설명 (7:3) · 아람어 번역 (5:41, 15:34)',
    theme: '하나님의 아들 예수 그리스도 (υἱὸς θεοῦ)',
    themeNote: '정체 계시 → 메시아 비밀 → 수난·부활. 십자가 신학 · 종말론적 긴박성',
    chapterAgenda: {
      1:  '세례요한·예수 세례·광야 시험·갈릴리 사역 개시 (하늘 찢어짐)',
      2:  '중풍병자 죄사함·레위 부르심·안식일 논쟁',
      3:  '12제자 임명·바알세불 논쟁·참된 가족',
      4:  '씨 뿌리는 자 비유·등불·풍랑 잠재우심',
      5:  '거라사 광인·야이로 딸·혈루증 여인',
      6:  '나사렛 배척·12제자 파송·오병이어·물 위 걸으심',
      7:  '장로들의 전통·수로보니게 여인·귀먹은 자',
      8:  '사천 명 먹이심·표적 요구·베드로 고백·첫 수난 예고',
      9:  '변화산·귀신들린 아이·둘째 수난 예고·섬김 가르침',
      10: '이혼 논쟁·부자 청년·셋째 수난 예고·대속물 선언·바디매오',
      11: '예루살렘 입성·성전 정화·무화과 저주 (샌드위치 구조)',
      12: '악한 소작농·가이사·부활·큰 계명·과부의 두 렙돈',
      13: '성전 파괴 예언·인자의 재림·깨어 있으라 (소묵시록)',
      14: '향유 부음·유월절 성찬·겟세마네·체포·재판·베드로 부인',
      15: '빌라도 재판·십자가·성전 휘장 찢어짐·백부장 고백',
      16: '빈 무덤·여인들의 두려움 (원본 종결 · 16:9-20 후대 부록)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1,  toCh: 8,  color: '#0891b2', label: '갈릴리 사역 · 정체 계시' },
      { id: 's2', fromCh: 8,  toCh: 10, color: '#dc2626', label: '수난 예고 3회 · 도상 (途上)' },
      { id: 's3', fromCh: 11, toCh: 13, color: '#b45309', label: '예루살렘 · 논쟁·묵시' },
      { id: 's4', fromCh: 14, toCh: 16, color: '#7c3aed', label: '수난·부활' },
    ],
    pivots: [
      { id: 'p1',  ch: 1,  verse: 1,  color: '#7c3aed', label: '표제 · 하나님의 아들' },
      { id: 'p2',  ch: 1,  verse: 10, color: '#0891b2', label: '하늘 찢어짐 (세례)' },
      { id: 'p3',  ch: 1,  verse: 11, color: '#7c3aed', label: '하늘 음성 · 사랑하는 아들' },
      { id: 'p4',  ch: 1,  verse: 15, color: '#059669', label: '하나님 나라 선포' },
      { id: 'p5',  ch: 2,  verse: 10, color: '#0369a1', label: '인자 · 죄사함 권세 (지상)' },
      { id: 'p6',  ch: 8,  verse: 27, color: '#d97706', label: '도상 신학 시작 (길에서)' },
      { id: 'p7',  ch: 8,  verse: 29, color: '#7c3aed', label: '베드로 고백 · 그리스도' },
      { id: 'p8',  ch: 8,  verse: 31, color: '#dc2626', label: '첫 수난 예고' },
      { id: 'p9',  ch: 9,  verse: 7,  color: '#7c3aed', label: '변화산 · 하늘 음성' },
      { id: 'p10', ch: 9,  verse: 31, color: '#dc2626', label: '두 번째 수난 예고' },
      { id: 'p11', ch: 10, verse: 33, color: '#dc2626', label: '세 번째 수난 예고' },
      { id: 'p12', ch: 10, verse: 45, color: '#059669', label: '대속물 · 신학적 정점' },
      { id: 'p13', ch: 10, verse: 52, color: '#d97706', label: '바디매오 · 길에서 따름 (도상 종결)' },
      { id: 'p14', ch: 11, verse: 15, color: '#b45309', label: '성전 정화' },
      { id: 'p15', ch: 13, verse: 26, color: '#0369a1', label: '인자 재림 · 구름 (묵시)' },
      { id: 'p16', ch: 14, verse: 22, color: '#059669', label: '성찬 제정' },
      { id: 'p17', ch: 14, verse: 36, color: '#7c3aed', label: '겟세마네 · 아바 아버지' },
      { id: 'p18', ch: 14, verse: 62, color: '#0369a1', label: '"내가 그니라" · 인자 클라이맥스' },
      { id: 'p19', ch: 15, verse: 34, color: '#dc2626', label: '엘로이 엘로이 · 절규' },
      { id: 'p20', ch: 15, verse: 38, color: '#0891b2', label: '성전 휘장 찢어짐' },
      { id: 'p21', ch: 15, verse: 39, color: '#7c3aed', label: '백부장 고백 (Inclusio 완성)' },
      { id: 'p22', ch: 16, verse: 6,  color: '#10b981', label: '부활 · 여기 계시지 않다' },
    ],
    arcs: [
      { id: 'a1',  from: 'p1',  to: 'p21', color: '#7c3aed', label: '표제 → 백부장 고백 (Inclusio · 하나님의 아들)' },
      { id: 'a2',  from: 'p2',  to: 'p20', color: '#0891b2', label: '하늘 찢어짐 → 휘장 찢어짐 (진입 개방)' },
      { id: 'a3',  from: 'p3',  to: 'p9',  color: '#7c3aed', label: '세례 음성 → 변화산 음성 (아들 확증)' },
      { id: 'a4',  from: 'p5',  to: 'p18', color: '#0369a1', label: '인자 · 지상 권세 → 재판 대답 (기독론 발전)' },
      { id: 'a5',  from: 'p18', to: 'p15', color: '#0369a1', label: '인자 · 재림 (13:26) → 재판 (14:62) 상호 조명' },
      { id: 'a6',  from: 'p6',  to: 'p13', color: '#d97706', label: '도상 신학 (8:27 → 10:52) · 길에서 물으심 → 길에서 따름' },
      { id: 'a7',  from: 'p7',  to: 'p8',  color: '#dc2626', label: '베드로 고백 → 첫 수난 예고 (전환점)' },
      { id: 'a8',  from: 'p8',  to: 'p11', color: '#dc2626', label: '수난 예고 3회 반복' },
      { id: 'a9',  from: 'p8',  to: 'p12', color: '#059669', label: '수난 → 대속물 (섬김 신학)' },
      { id: 'a10', from: 'p12', to: 'p19', color: '#dc2626', label: '대속물 예고 → 십자가 절규 (성취)' },
      { id: 'a11', from: 'p14', to: 'p20', color: '#b45309', label: '성전 정화 → 성전 심판 (휘장)' },
      { id: 'a12', from: 'p4',  to: 'p12', color: '#059669', label: '하나님 나라 선포 → 대속물 (나라의 대가)' },
      { id: 'a13', from: 'p7',  to: 'p21', color: '#7c3aed', label: '유대인 제자 → 이방 백부장 (대비 아이러니)' },
      { id: 'a14', from: 'p1',  to: 'p22', color: '#10b981', label: '복음 시작 → 부활 (전체 대주제)' },
    ],
  },
  // ── 비평장치: 본문 비평 특수 범위 ──────────────────────────────────────
  disputedRanges: [
    { ch: 16, from: 9, to: 20, label: '장문 결말 (Longer Ending · 16:9-20) — ℵ B 등 최고 사본 부재' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 마태복음 (MAT_CTX) — 유대인 대상 · 다섯 담론 · 왕국 신학 · 대위임
// 신약학 표준: Bacon(5 담론) · Kingsbury(왕국 기독론) · Davies-Allison(성취) · France(교회론)
// ═══════════════════════════════════════════════════════════════════════════
const MAT_STRUCTURAL_RULES = [
  { id: 'fulfillment', role: '성취 인용 (πληρωθῇ)', icon: '📜', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἵνα πληρωθῇ', tr: '히나 플레로테',
    desc: '"선지자로 하신 말씀을 이루려 하심이라" — 마태 특유 성취 공식 (10회+). 1:22, 2:15, 2:17, 2:23, 4:14, 8:17, 12:17, 13:35, 21:4, 27:9. 예수=구약 성취 논증. Davies-Allison 표준.',
    match: (s) => s.has('G4137') },
  { id: 'immanuel', role: '임마누엘 (Inclusio)', icon: '🕊️', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'μεθʼ ἡμῶν ὁ θεός', tr: '메트 헤몬 호 테오스',
    desc: '"하나님이 우리와 함께 계시다" — 1:23 (탄생) → 18:20 (교회) → 28:20 (대위임) Inclusio. Kupp·Kingsbury 마태 대주제.',
    match: null },
  { id: 'kingdom_heaven', role: '하늘나라 (마태 시그니처)', icon: '👑', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'βασιλεία τῶν οὐρανῶν', tr: '바실레이아 톤 우라논',
    desc: '"천국·하늘나라" — 마태 33회 (다른 복음서 0회). 유대인 청중 하나님의 이름 회피. 마가 "하나님 나라" 대응. 4:17, 5:3, 13:11 등.',
    match: (s) => s.has('G0932') },
  { id: 'sermon_mount', role: '산상수훈 · 새 모세', icon: '⛰️', color: '#d97706', bg: 'rgba(217,119,6,.13)',
    gr: 'ἀναβὰς εἰς τὸ ὄρος', tr: '아나바스 에이스 토 오로스',
    desc: '"산에 올라가시니" (5:1) — 새 모세 모티프. 시내산 율법 vs 산상 팔복. 마태 5-7장 첫 담론. Allison *New Moses* 표준.',
    match: null },
  { id: 'fulfilled_law', role: '율법 성취', icon: '📖', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'πληρῶσαι', tr: '플레로사이',
    desc: '"율법·선지자를 폐하러 온 것이 아니요 완전케 하러 왔노라" (5:17) — 마태 기독론 핵심. "너희는 들었으나 나는 너희에게 이르노니" (6회 대조).',
    match: null },
  { id: 'discourse_end', role: '담론 종결 공식', icon: '🔚', color: '#6366f1', bg: 'rgba(99,102,241,.13)',
    gr: 'καὶ ἐγένετο ὅτε ἐτέλεσεν ὁ Ἰησοῦς', tr: '카이 에게네토 호테 에텔레센 호 이에수스',
    desc: '"예수께서 이 말씀을 마치시매" — 5 담론 종결 표시 (7:28, 11:1, 13:53, 19:1, 26:1). Bacon "Five Books" 표준 · 마태 구조 척추.',
    match: null },
  { id: 'davidic_messiah', role: '다윗의 자손', icon: '👑', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'υἱὸς Δαυίδ', tr: '휘오스 다우이드',
    desc: '"다윗의 자손 예수" — 마태 9회 (마가 3, 누가 3). 왕적 메시아 · 계보 (1:1) · 맹인 부르짖음 · 예루살렘 입성. Kingsbury 마태 기독론.',
    match: (s) => s.has('G1138') },
  { id: 'church', role: '교회 (ἐκκλησία)', icon: '⛪', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ἐκκλησία', tr: '에클레시아',
    desc: '"교회" — 4복음서 중 마태만 사용 (16:18 반석, 18:17 권징). 교회론적 관심 · 유대-기독 공동체 정착. France·Luz 강조.',
    match: (s) => s.has('G1577') },
  { id: 'great_commission', role: '대위임 (Inclusio 완성)', icon: '🌍', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'μαθητεύσατε πάντα τὰ ἔθνη', tr: '마테튜사테 판타 타 에트네',
    desc: '"모든 족속으로 제자를 삼아" (28:19) — 마태 결말. 만민 사명 · 삼위일체 세례 · "내가 세상 끝날까지 너희와 함께" (임마누엘 완성).',
    match: null },
  { id: 'woes', role: '화 있을진저 (7회)', icon: '⚠️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'οὐαὶ ὑμῖν', tr: '우아이 휘민',
    desc: '"화 있을진저 서기관들과 바리새인들이여" — 23장 7회 반복 (5,13,15,16,23,25,27,29). 위선 심판 · 팔복(5장)과 대조 (Inclusio 부정).',
    match: null },
  { id: 'apocalyptic_discourse', role: '종말 담론', icon: '🌌', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'συντέλεια τοῦ αἰῶνος', tr: '쉰텔레이아 투 아이오노스',
    desc: '"세상 끝" — 마태 24-25장 감람산 강화. 성전 파괴 · 인자 재림 · 열 처녀 · 달란트 · 양과 염소. 다니엘 배경 · 종말론적 심판.',
    match: (s) => s.has('G4930') },
  { id: 'sheep_goats', role: '양과 염소 · 최후 심판', icon: '⚖️', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'πρόβατα καὶ ἐρίφια', tr: '프로바타 카이 에리피아',
    desc: '"양은 그의 오른편에, 염소는 왼편에" (25:33) — 마태만의 최후 심판 비유. 지극히 작은 자 = 예수. 사회적 신학 · 종말 심판 기준.',
    match: null },
  { id: 'passion_prediction', role: '수난 예고 (3회)', icon: '✝️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'δεῖ αὐτὸν … παθεῖν καὶ ἀποκτανθῆναι', tr: '데이 아우톤 … 파테인 카이 아포크탄테나이',
    desc: '수난·부활 예고 3회 (16:21, 17:22-23, 20:17-19). 마가와 병행하나 "제3일에 살아나야" 강조. 십자가 신학.',
    match: null },
  { id: 'son_of_man', role: '인자 (Son of Man)', icon: '🧑', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ὁ υἱὸς τοῦ ἀνθρώπου', tr: '호 휘오스 투 안트로푸',
    desc: '예수의 자기 지칭 · 마태 30회 (신약 최다). 다니엘 7:13 배경. 지상 권세 → 수난 → 재림·심판 (25:31). 종말론적 심판자 강조.',
    match: null },
  { id: 'centurion_confession', role: '백부장 고백 · 부활 지진', icon: '💀', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἀληθῶς θεοῦ υἱὸς ἦν οὗτος', tr: '알레토스 테우 휘오스 엔 후토스',
    desc: '"이는 진실로 하나님의 아들이었도다" (27:54) — 마태는 지진·바위 갈라짐·성도 부활 (27:51-53) 추가. 우주적 심판 강조.',
    match: null },
];

// 마태복음 수동 담화 주석: 다섯 담론 · 성취 인용 · 교회론 · 왕국 신학 결정 지점
const MAT_MANUAL_DISCOURSE = {
  '1:1':   'davidic_messiah',         // 아브라함과 다윗의 자손 예수 그리스도의 계보
  '1:22':  'fulfillment',             // 이는 주께서 선지자로 하신 말씀을 이루려 (첫 성취 공식)
  '1:23':  'immanuel',                // 임마누엘 · 하나님이 우리와 함께 (Inclusio 시작)
  '2:15':  'fulfillment',             // 애굽에서 내 아들을 불렀다 (호세아 11:1)
  '2:17':  'fulfillment',             // 라마에서 슬퍼함이 있어 (예레미야 31:15)
  '2:23':  'fulfillment',             // 나사렛 사람이라 (통합 예언)
  '3:17':  'davidic_messiah',         // 하늘 음성 · 내 사랑하는 아들
  '4:14':  'fulfillment',             // 이사야 9장 · 흑암에 앉은 자
  '4:17':  'kingdom_heaven',          // 회개하라 천국이 가까웠느니라 (사역 시작)
  '5:1':   'sermon_mount',            // 산에 올라가 앉으시니 (산상수훈 시작)
  '5:3':   'kingdom_heaven',          // 팔복 · 심령이 가난한 자
  '5:17':  'fulfilled_law',           // 폐하러 온 것이 아니요 완전케 하러 왔노라
  '5:21':  'fulfilled_law',           // 옛 사람에게 말한 바 · 나는 너희에게 이르노니
  '6:9':   'kingdom_heaven',          // 주기도문 · 나라이 임하시오며
  '7:28':  'discourse_end',           // 예수께서 이 말씀을 마치시매 (담론 1 종결)
  '8:17':  'fulfillment',             // 이사야 53장 · 우리의 연약함을 담당
  '10:1':  'church',                  // 12제자에게 권능을 주심 (담론 2 시작)
  '10:7':  'kingdom_heaven',          // 천국이 가까웠다 전파하며
  '11:1':  'discourse_end',           // 예수께서 12제자에게 명하시기를 마치시고 (담론 2 종결)
  '12:17': 'fulfillment',             // 이사야 42장 · 종의 노래
  '13:1':  'kingdom_heaven',          // 비유 담론 시작 (담론 3)
  '13:11': 'kingdom_heaven',          // 천국의 비밀을 아는 것이
  '13:35': 'fulfillment',             // 시편 78편 · 비유로 말하리라
  '13:53': 'discourse_end',           // 예수께서 이 모든 비유를 마치신 후 (담론 3 종결)
  '16:16': 'davidic_messiah',         // 주는 그리스도시요 살아계신 하나님의 아들
  '16:18': 'church',                  // 이 반석 위에 내 교회를 세우리니 (에클레시아)
  '16:21': 'passion_prediction',      // 첫 번째 수난 예고
  '17:2':  'davidic_messiah',         // 변화산 · 그 얼굴이 해 같이 빛나며
  '17:22': 'passion_prediction',      // 두 번째 수난 예고
  '18:1':  'church',                  // 천국에서는 누가 크니이까 (담론 4 시작 · 교회 담론)
  '18:17': 'church',                  // 교회에 말하고 (권징 절차 · 에클레시아)
  '18:20': 'immanuel',                // 두세 사람이 내 이름으로 · 내가 있느니라
  '19:1':  'discourse_end',           // 예수께서 이 말씀을 마치시고 (담론 4 종결)
  '20:17': 'passion_prediction',      // 세 번째 수난 예고 (상세)
  '20:28': 'passion_prediction',      // 대속물 · 자기 목숨을 많은 사람의 대속물로
  '21:4':  'fulfillment',             // 스가랴 9장 · 나귀 새끼 (예루살렘 입성)
  '21:9':  'davidic_messiah',         // 호산나 다윗의 자손이여
  '23:13': 'woes',                    // 화 있을진저 · 첫 번째 화
  '23:15': 'woes',                    // 화 있을진저 · 두 번째
  '23:23': 'woes',                    // 화 있을진저 · 십일조·정의 유기
  '23:27': 'woes',                    // 화 있을진저 · 회칠한 무덤
  '24:3':  'apocalyptic_discourse',   // 감람산 강화 시작 (담론 5)
  '24:14': 'apocalyptic_discourse',   // 이 천국 복음이 온 세상에 전파
  '24:30': 'son_of_man',              // 인자의 징조가 하늘에서 보이겠고
  '25:31': 'sheep_goats',             // 인자가 자기 영광으로 · 만민 심판
  '25:32': 'sheep_goats',             // 양과 염소 분리
  '25:40': 'sheep_goats',             // 지극히 작은 자 하나에게 한 것이 곧 내게
  '26:1':  'discourse_end',           // 예수께서 이 말씀을 다 마치시고 (담론 5 종결 · 마지막)
  '26:26': 'passion_prediction',      // 성찬 제정 · 이는 내 몸이니라
  '26:39': 'passion_prediction',      // 겟세마네 · 내 아버지여
  '26:64': 'son_of_man',              // 인자가 권능의 우편에 앉은 것과 구름 타고 오는
  '27:9':  'fulfillment',             // 예레미야 · 은 삼십
  '27:46': 'passion_prediction',      // 엘리 엘리 라마 사박다니
  '27:51': 'centurion_confession',    // 성전 휘장 찢어짐 · 지진
  '27:54': 'centurion_confession',    // 백부장 · 진실로 하나님의 아들
  '28:6':  'great_commission',        // 여기 계시지 않고 살아나셨느니라
  '28:18': 'great_commission',        // 하늘과 땅의 모든 권세를 내게 주셨으니
  '28:19': 'great_commission',        // 모든 족속으로 제자를 삼아
  '28:20': 'immanuel',                // 내가 세상 끝날까지 너희와 항상 함께 (Inclusio 완성)
};

export const MAT_CTX = {
  id: 'Matt',
  book: { ko: '마태복음', bollsNum: 40, lexId: 'Matt', lexCorpus: 'gnt', en: 'Matthew', testament: 'NT' },
  chapters: 28,
  discourseRules: [...GNT_DISCOURSE_RULES, ...MAT_STRUCTURAL_RULES],
  manualDiscourse: MAT_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 복음서 · 공관복음 (유대인 대상)',
    genreNote: 'NT 첫 번째 책 · 다섯 담론 구조 (Bacon "Five Books") · 마가 자료 + Q + M(마태 특수자료)',
    year: 'AD 80-90년경',
    yearNote: '성전 파괴 후 (24:2 회고) · 얌니아 회의 이후 유대-기독 갈등 반영. 다수 학자 견해',
    place: '안디옥 (전통) 또는 시리아 유대인 공동체',
    placeNote: '이레네우스: 히브리인 위해 히브리 방언으로 기록 · 현존 그리스어본은 원문·번역 논쟁',
    author: '마태 (세리 레위) · 12제자',
    authorNote: '파피아스: "마태가 히브리 방언으로 로기아를 편집" · 익명 저자설(현대 다수)도 병존',
    audience: '유대인 그리스도인 공동체',
    audienceNote: '구약 인용 60회+ (마가 15) · 유대 관습 설명 생략 · 성취 공식 · 하늘나라 (신명 회피)',
    theme: '왕이신 예수 · 임마누엘 · 새 모세 · 교회',
    themeNote: '다윗의 자손 · 아브라함의 자손 (1:1) → 대위임 (28:20). 왕국·성취·교회론적 관심',
    chapterAgenda: {
      1:  '예수 계보·마리아·요셉·임마누엘 탄생 예언',
      2:  '동방박사·헤롯·이집트 피난·베들레헴 학살·나사렛',
      3:  '세례요한·예수 세례·하늘 음성',
      4:  '광야 40일 시험·갈릴리 사역 개시·첫 제자 부르심',
      5:  '산상수훈 ① — 팔복·소금과 빛·율법 완성·6대 대조',
      6:  '산상수훈 ② — 자선·주기도문·금식·재물·염려',
      7:  '산상수훈 ③ — 판단·황금률·좁은 문·거짓 선지자·반석 (7:28 담론1 종결)',
      8:  '이적 ① — 나병환자·백부장 종·베드로 장모·풍랑',
      9:  '이적 ② — 중풍병자·마태 부르심·야이로 딸·혈루증·소경 2인',
      10: '12제자 파송 담론 (담론 2) — 권능·박해 예고·성령의 도우심 (11:1 종결)',
      11: '세례요한의 질문·회개하지 않는 도시들·수고하고 무거운 짐 진 자들',
      12: '안식일 논쟁·바알세불 논쟁·요나의 표적·참된 가족',
      13: '천국 비유 담론 (담론 3) — 씨 뿌리는 자·가라지·겨자씨·누룩·감추인 보화·진주·그물 (13:53 종결)',
      14: '세례요한 죽음·오병이어·물 위 걸으심·베드로 물 위',
      15: '장로 전통 논쟁·가나안 여인·칠병이어',
      16: '표적 요구·베드로 고백·교회 반석·천국 열쇠·첫 수난 예고',
      17: '변화산·귀신들린 아이·둘째 수난 예고·성전세 (물고기)',
      18: '교회 담론 (담론 4) — 어린 아이·잃은 양·권징 절차·용서 (일만 달란트) (19:1 종결)',
      19: '이혼 논쟁·어린이 축복·부자 청년',
      20: '포도원 품꾼 비유·셋째 수난 예고·야고보 요한 어머니·바디매오',
      21: '예루살렘 입성·성전 정화·무화과 저주·두 아들·악한 소작농',
      22: '왕의 잔치·가이사 세금·부활 논쟁·큰 계명·다윗의 자손',
      23: '서기관·바리새인 화 있을진저 7번·예루살렘 애가',
      24: '종말 담론 ① (담론 5 시작) — 성전 파괴·환난·인자 재림',
      25: '종말 담론 ② — 열 처녀·달란트·양과 염소 최후 심판 (26:1 담론5 종결)',
      26: '향유 부음·유월절 성찬·겟세마네·체포·재판·베드로 부인',
      27: '가룟 유다 자살·빌라도 재판·십자가·지진·성전 휘장·백부장 고백·매장',
      28: '부활·여인들·경비병 뇌물·갈릴리 재회·대위임 (임마누엘 Inclusio 완성)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1,  toCh: 4,  color: '#7c3aed', label: '탄생·시작 · 왕적 정체 계시' },
      { id: 's2', fromCh: 5,  toCh: 9,  color: '#d97706', label: '산상수훈 + 이적 (담론1 + 사역)' },
      { id: 's3', fromCh: 10, toCh: 12, color: '#0891b2', label: '파송·논쟁 (담론2)' },
      { id: 's4', fromCh: 13, toCh: 17, color: '#059669', label: '비유·교회 계시 (담론3)' },
      { id: 's5', fromCh: 18, toCh: 20, color: '#0369a1', label: '교회 담론·도상 (담론4)' },
      { id: 's6', fromCh: 21, toCh: 25, color: '#b45309', label: '예루살렘 논쟁·종말 (담론5)' },
      { id: 's7', fromCh: 26, toCh: 28, color: '#dc2626', label: '수난·부활·대위임' },
    ],
    pivots: [
      { id: 'p1',  ch: 1,  verse: 1,  color: '#7c3aed', label: '표제 · 다윗·아브라함의 자손' },
      { id: 'p2',  ch: 1,  verse: 23, color: '#0891b2', label: '임마누엘 (Inclusio 시작)' },
      { id: 'p3',  ch: 3,  verse: 17, color: '#7c3aed', label: '하늘 음성 · 사랑하는 아들' },
      { id: 'p4',  ch: 4,  verse: 17, color: '#059669', label: '천국 선포 · 사역 개시' },
      { id: 'p5',  ch: 5,  verse: 1,  color: '#d97706', label: '산상수훈 시작 · 새 모세' },
      { id: 'p6',  ch: 5,  verse: 17, color: '#b45309', label: '율법 성취' },
      { id: 'p7',  ch: 7,  verse: 28, color: '#6366f1', label: '담론1 종결' },
      { id: 'p8',  ch: 10, verse: 1,  color: '#0891b2', label: '12제자 파송 (담론2)' },
      { id: 'p9',  ch: 11, verse: 1,  color: '#6366f1', label: '담론2 종결' },
      { id: 'p10', ch: 13, verse: 1,  color: '#059669', label: '비유 담론 (담론3)' },
      { id: 'p11', ch: 13, verse: 53, color: '#6366f1', label: '담론3 종결' },
      { id: 'p12', ch: 16, verse: 16, color: '#7c3aed', label: '베드로 고백' },
      { id: 'p13', ch: 16, verse: 18, color: '#0369a1', label: '교회 반석 (에클레시아)' },
      { id: 'p14', ch: 16, verse: 21, color: '#dc2626', label: '첫 수난 예고' },
      { id: 'p15', ch: 17, verse: 2,  color: '#7c3aed', label: '변화산 · 얼굴이 해 같이' },
      { id: 'p16', ch: 18, verse: 1,  color: '#0369a1', label: '교회 담론 시작 (담론4)' },
      { id: 'p17', ch: 18, verse: 20, color: '#0891b2', label: '임마누엘 (교회 중)' },
      { id: 'p18', ch: 19, verse: 1,  color: '#6366f1', label: '담론4 종결' },
      { id: 'p19', ch: 21, verse: 9,  color: '#7c3aed', label: '호산나 다윗의 자손' },
      { id: 'p20', ch: 23, verse: 13, color: '#dc2626', label: '화 있을진저 시작 (7회)' },
      { id: 'p21', ch: 24, verse: 3,  color: '#0369a1', label: '감람산 강화 시작 (담론5)' },
      { id: 'p22', ch: 25, verse: 31, color: '#7c3aed', label: '양과 염소 · 최후 심판' },
      { id: 'p23', ch: 26, verse: 1,  color: '#6366f1', label: '담론5 종결 (마지막)' },
      { id: 'p24', ch: 26, verse: 26, color: '#dc2626', label: '성찬 제정' },
      { id: 'p25', ch: 27, verse: 46, color: '#dc2626', label: '엘리 엘리 · 절규' },
      { id: 'p26', ch: 27, verse: 51, color: '#7c3aed', label: '휘장 찢어짐 · 지진' },
      { id: 'p27', ch: 27, verse: 54, color: '#7c3aed', label: '백부장 고백' },
      { id: 'p28', ch: 28, verse: 6,  color: '#10b981', label: '부활 · 여기 계시지 않다' },
      { id: 'p29', ch: 28, verse: 19, color: '#dc2626', label: '대위임 · 만민' },
      { id: 'p30', ch: 28, verse: 20, color: '#0891b2', label: '임마누엘 (Inclusio 완성)' },
    ],
    arcs: [
      { id: 'a1',  from: 'p2',  to: 'p30', color: '#0891b2', label: '임마누엘 대(大) Inclusio (1:23 → 28:20)' },
      { id: 'a2',  from: 'p1',  to: 'p19', color: '#7c3aed', label: '다윗의 자손 (계보 → 입성)' },
      { id: 'a3',  from: 'p3',  to: 'p15', color: '#7c3aed', label: '세례 하늘 음성 → 변화산 (아들 확증)' },
      { id: 'a4',  from: 'p5',  to: 'p7',  color: '#d97706', label: '산상수훈 (담론1 골격)' },
      { id: 'a5',  from: 'p7',  to: 'p23', color: '#6366f1', label: '5 담론 종결 공식 반복' },
      { id: 'a6',  from: 'p6',  to: 'p20', color: '#b45309', label: '율법 성취 → 위선 심판' },
      { id: 'a7',  from: 'p12', to: 'p27', color: '#7c3aed', label: '유대 제자 고백 → 이방 백부장 고백' },
      { id: 'a8',  from: 'p13', to: 'p17', color: '#0369a1', label: '교회 반석 (16:18) → 교회 임재 (18:20)' },
      { id: 'a9',  from: 'p14', to: 'p25', color: '#dc2626', label: '수난 예고 → 십자가 절규' },
      { id: 'a10', from: 'p4',  to: 'p29', color: '#059669', label: '천국 선포 → 만민 제자화' },
      { id: 'a11', from: 'p21', to: 'p22', color: '#0369a1', label: '감람산 강화 · 인자 재림 → 심판' },
      { id: 'a12', from: 'p2',  to: 'p17', color: '#0891b2', label: '임마누엘 중간 확증 (교회 중 임재)' },
      { id: 'a13', from: 'p1',  to: 'p29', color: '#7c3aed', label: '아브라함 (모든 민족의 아비) → 대위임 (만민)' },
      { id: 'a14', from: 'p26', to: 'p28', color: '#10b981', label: '지진 죽음 → 부활' },
    ],
  },
  // ── 비평장치: 본문 비평 특수 범위 (마태복음) ──────────────────────────────
  disputedRanges: [
    { ch: 6, from: 13, to: 13, label: '주기도문 송영 · 나라와 권세와 영광이 아버지께 (다수 사본만) — ℵ B D 등 부재' },
    { ch: 17, from: 21, to: 21, label: '금식 기도 절 · 기도와 금식 아니고는 (일부 사본 삽입) — 마가 9:29 조화' },
    { ch: 18, from: 11, to: 11, label: '잃은 자 구원 절 · 인자가 온 것은 (일부 사본 삽입) — 누가 19:10 조화' },
    { ch: 23, from: 14, to: 14, label: '과부의 가옥 삼키는 화 (일부 사본 삽입) — 마가 12:40 조화' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 누가복음 (LUK_CTX) — 이방인 대상 · 여행 서사 · 성령·기도·여성·가난한 자 · 누가-행전 이중 저작
// 신약학 표준: Bock(BECNT) · Marshall(NIGTC) · Fitzmyer(Anchor) · Green(NICNT) · Tannehill(Narrative Unity) · Bovon(Hermeneia)
// ═══════════════════════════════════════════════════════════════════════════
const LUK_STRUCTURAL_RULES = [
  { id: 'holy_spirit', role: '성령 (누가 시그니처)', icon: '🕊️', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'Πνεῦμα ἅγιον', tr: '프뉴마 하기온',
    desc: '"성령" — 누가복음 17회 (신약 최다). 세례요한 수태·마리아 수태·예수 세례·광야·나사렛 선언·기쁨. 누가-행전 이중 축. Bock·Marshall 강조.',
    match: (s) => s.has('G4151') },
  { id: 'prayer_scene', role: '기도 (예수 기도 8회)', icon: '🙏', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'προσευχόμενος', tr: '프로슈코메노스',
    desc: '"예수께서 기도하시더라" — 누가 특유 예수 기도 8회 (3:21·5:16·6:12·9:18·9:28·11:1·22:41·23:34). 결정적 순간마다 기도. Fitzmyer·Green.',
    match: (s) => s.has('G4336') },
  { id: 'today_fulfillment', role: '오늘 성취 (σήμερον)', icon: '📅', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'σήμερον', tr: '세메론',
    desc: '"오늘" — 누가 종말론적 성취 (2:11 구주·4:21 이 글이 성취·19:9 이 집에 구원·23:43 낙원). 카이로스 시간 응축. Conzelmann 표준.',
    match: (s) => s.has('G4594') },
  { id: 'nazareth_manifesto', role: '나사렛 선언 (미션 성명서)', icon: '📣', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'εὐαγγελίσασθαι πτωχοῖς', tr: '유앙겔리사스타이 프토코이스',
    desc: '"가난한 자에게 복음을" (4:18-19) — 이사야 61:1-2 인용. 예수 사역 요약·프로그램. 성령 기름부음 → 해방 선포. Green·Bock 미션 성명서.',
    match: null },
  { id: 'travel_narrative', role: '여행 서사 (예루살렘 향발)', icon: '🚶', color: '#d97706', bg: 'rgba(217,119,6,.13)',
    gr: 'ἐπορεύετο εἰς Ἰερουσαλήμ', tr: '에포류에토 에이스 이에루살렘',
    desc: '"예수께서 예루살렘을 향하여" (9:51) — 누가 특유 여행 서사 시작. 9:51-19:27 특수 자료 대부분 포함 (탕자·사마리아인 등). Fitzmyer *Travel Narrative*.',
    match: null },
  { id: 'women_witness', role: '여성 (제자·목격자)', icon: '👩', color: '#a855f7', bg: 'rgba(168,85,247,.13)',
    gr: 'γυναῖκες', tr: '귀나이케스',
    desc: '"여성" — 누가만: 엘리사벳·마리아·안나·과부·죄녀·마르다/마리아·재정 후원 여성(8:2-3)·부활 첫 증인. 여성 제자성 강조. Reid·Karris.',
    match: (s) => s.has('G1135') },
  { id: 'poor_gospel', role: '가난한 자 복음', icon: '🤲', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'πτωχοί', tr: '프토코이',
    desc: '"가난한 자" — 팔복 "가난한 자는 복이 있나니" (6:20 · 마태는 "심령이 가난한") · 나사렛 선언 · 부자·나사로 · 삭개오. 사회적 신학. Green·Tannehill.',
    match: (s) => s.has('G4434') },
  { id: 'table_fellowship', role: '식탁 교제', icon: '🍽️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'συνανεκλίθη', tr: '쉬나네클리테',
    desc: '"함께 앉으심" — 예수 식사 장면 10회+ (5:29 레위·7:36 시몬·10:38 마르다·14:1 바리새인·19:5 삭개오·22:14 성찬·24:30 엠마오). 밥상 교제 신학.',
    match: null },
  { id: 'magnificat_canticles', role: '찬가 (4곡)', icon: '🎵', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ᾨδὴ Μαρίας', tr: '오데 마리아스',
    desc: '누가 특유 찬가 4곡: 마그니피카트(1:46-55 마리아)·베네딕투스(1:68-79 사가랴)·글로리아(2:14 천사)·눈크 디미티스(2:29-32 시메온). 구약 찬가 계승. Farris.',
    match: null },
  { id: 'historical_anchor', role: '정치사 정박', icon: '📜', color: '#6366f1', bg: 'rgba(99,102,241,.13)',
    gr: 'ἐν ἔτει δὲ πεντεκαιδεκάτῳ', tr: '엔 에테이 데 펜테카이데카토',
    desc: '"디베료 가이사 재위 15년" (3:1-2) — 누가만 로마 정치사·유대 종교 지도자 6명 나열로 시점 정박. 역사적 신뢰성·세계사 지평. Marshall·Bovon.',
    match: null },
  { id: 'parable_lukan', role: '누가 특수 비유', icon: '📖', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'παραβολή', tr: '파라볼레',
    desc: '누가만: 선한 사마리아인(10)·어리석은 부자(12)·잃은 양·드라크마·탕자(15)·불의한 청지기(16)·부자와 나사로(16)·과부와 재판관(18)·바리새인/세리(18). 자비·회개.',
    match: null },
  { id: 'salvation_universal', role: '만민 구원 (σωτηρία)', icon: '🌍', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'σωτήριόν τοῦ θεοῦ', tr: '소테리온 투 테우',
    desc: '"모든 육체가 하나님의 구원을 보리라" (3:6 이사야 40 확장)·시메온 "이방을 비추는 빛" (2:32)·족보 아담까지 (3:38). 만민 지평·이방인 편입.',
    match: (s) => s.has('G4991') },
  { id: 'son_of_man', role: '인자 (25회)', icon: '🧑', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ὁ υἱὸς τοῦ ἀνθρώπου', tr: '호 휘오스 투 안트로푸',
    desc: '예수 자기 지칭·누가 25회 (다니엘 7:13 배경). 지상 권세(5:24) → 수난(9:22, 22:22) → 재림(21:27). 잃은 자 찾으러 옴 (19:10). Marshall·Bock.',
    match: null },
  { id: 'passion_prediction', role: '수난 예고 (3회+)', icon: '✝️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'δεῖ τὸν υἱὸν τοῦ ἀνθρώπου παθεῖν', tr: '데이 톤 휘온 투 안트로푸 파테인',
    desc: '수난·부활 예고 3회 (9:22·9:44·18:31-33) + 여행 서사 중 반복. 마가·마태와 병행하나 "선지자가 예루살렘 밖에서 죽을 수 없다" (13:33) 추가.',
    match: null },
  { id: 'ascension_spirit_promise', role: '승천·성령 약속 (누가-행전 다리)', icon: '☁️', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'ἐπαγγελίαν τοῦ πατρός μου', tr: '에팡겔리안 투 파트로스 무',
    desc: '"내 아버지의 약속·위로부터 능력" (24:49)·승천 (24:51)·성전 축복 (24:53). 사도행전 1:8과 직접 연결. 두 권 저작 다리·Tannehill *Narrative Unity*.',
    match: null },
];

// 누가복음 수동 담화 주석: 성령·기도·여성·오늘·가난한 자·여행 서사 결정 지점
const LUK_MANUAL_DISCOURSE = {
  '1:1':   'historical_anchor',       // 서문 · 데오빌로에게 (누가-행전 프로젝트 선언)
  '1:15':  'holy_spirit',             // 세례요한 태에서부터 성령 충만
  '1:35':  'holy_spirit',             // 성령이 네게 임하시고 (마리아 수태)
  '1:46':  'magnificat_canticles',    // 마그니피카트 시작 (내 영혼이 주를 찬양)
  '1:68':  'magnificat_canticles',    // 베네딕투스 시작 (주 이스라엘의 하나님 찬송)
  '2:11':  'today_fulfillment',       // 오늘 다윗의 동네에 구주가 나셨으니
  '2:14':  'magnificat_canticles',    // 글로리아 (지극히 높은 곳에서 하나님께 영광)
  '2:29':  'magnificat_canticles',    // 눈크 디미티스 (주여 이제 종을 놓으사)
  '2:32':  'salvation_universal',     // 이방을 비추는 빛이요 이스라엘 영광
  '3:1':   'historical_anchor',       // 디베료 가이사 15년 (정치사 정박)
  '3:6':   'salvation_universal',     // 모든 육체가 하나님의 구원을 (이사야 40)
  '3:22':  'holy_spirit',             // 성령이 비둘기 같이 (예수 세례)
  '3:38':  'salvation_universal',     // 아담은 하나님의 아들 (족보 만민)
  '4:1':   'holy_spirit',             // 성령 충만하여 광야로
  '4:18':  'nazareth_manifesto',      // 주의 성령이 내게 임하셨으니 (미션 성명서)
  '4:21':  'today_fulfillment',       // 오늘 이 글이 너희 귀에 응하였느니라
  '5:16':  'prayer_scene',            // 예수는 물러가사 기도하시니라
  '5:24':  'son_of_man',              // 인자가 땅에서 죄를 사하는 권세
  '5:29':  'table_fellowship',        // 레위 잔치 (세리·죄인과 앉음)
  '6:12':  'prayer_scene',            // 밤이 새도록 하나님께 기도 (12제자 임명 전)
  '6:20':  'poor_gospel',             // 가난한 자는 복이 있나니 (누가 평지설교)
  '7:22':  'poor_gospel',             // 가난한 자에게 복음이 전파된다
  '7:36':  'table_fellowship',        // 바리새인 시몬 집 식사 (죄녀 향유)
  '8:2':   'women_witness',           // 자기 소유로 예수를 섬기던 여자들
  '9:18':  'prayer_scene',            // 예수께서 홀로 기도하실 때
  '9:22':  'passion_prediction',      // 첫 번째 수난 예고 · 인자가 많은 고난
  '9:28':  'prayer_scene',            // 기도하러 산에 올라 (변화산)
  '9:31':  'passion_prediction',      // 별세 (엑소도스) 예루살렘에서 이루실
  '9:44':  'passion_prediction',      // 두 번째 수난 예고 (인자 사람 손에 넘김)
  '9:51':  'travel_narrative',        // 예루살렘을 향하여 굳게 결심 (여행 시작)
  '10:1':  'travel_narrative',        // 70인 파송 (여행 서사 중)
  '10:33': 'parable_lukan',           // 어떤 사마리아인 (선한 사마리아인 비유)
  '10:38': 'table_fellowship',        // 마르다 집 · 마리아 발치 (여성 제자성)
  '10:39': 'women_witness',           // 마리아 · 주의 발치에 앉아 말씀
  '11:1':  'prayer_scene',            // 주여 우리에게도 기도를 가르쳐 주옵소서
  '11:2':  'prayer_scene',            // 아버지여 이름이 거룩히 여김을 받으시고
  '12:16': 'parable_lukan',           // 어리석은 부자 비유 (누가 특수)
  '13:33': 'passion_prediction',      // 선지자가 예루살렘 밖에서 죽을 수 없다
  '14:1':  'table_fellowship',        // 바리새인 관원 집 안식일 식사
  '14:13': 'poor_gospel',             // 잔치에 가난한 자·병신·소경 청하라
  '15:11': 'parable_lukan',           // 탕자 비유 (누가 특수 · 자비의 정점)
  '16:19': 'parable_lukan',           // 부자와 나사로 (누가 특수)
  '17:20': 'son_of_man',              // 하나님 나라가 볼 수 있게 임하는 것이 아니요
  '18:1':  'parable_lukan',           // 과부와 재판관 (기도의 비유)
  '18:9':  'parable_lukan',           // 바리새인과 세리 (의롭게 됨의 비유)
  '18:14': 'parable_lukan',           // 세리는 의롭다 하심을 받고
  '18:31': 'passion_prediction',      // 세 번째 수난 예고 (예루살렘 상경)
  '19:5':  'table_fellowship',        // 삭개오 · 오늘 네 집에 유하여야 하겠다
  '19:9':  'today_fulfillment',       // 오늘 구원이 이 집에 이르렀으니
  '19:10': 'son_of_man',              // 인자가 온 것은 잃은 자를 찾아 구원
  '19:28': 'travel_narrative',        // 예수께서 예루살렘으로 올라가시니라 (여행 종결)
  '19:41': 'passion_prediction',      // 예루살렘 애가 (성 보시고 우심)
  '22:14': 'table_fellowship',        // 유월절 최후의 만찬 자리
  '22:19': 'passion_prediction',      // 이는 너희를 위하여 주는 내 몸이라
  '22:41': 'prayer_scene',            // 감람산에서 무릎 꿇고 기도
  '22:44': 'prayer_scene',            // 겟세마네 피땀 (사본 논쟁)
  '22:69': 'son_of_man',              // 인자가 하나님의 권능의 우편에
  '23:34': 'prayer_scene',            // 아버지여 저들을 사하여 주옵소서 (사본 논쟁)
  '23:43': 'today_fulfillment',       // 오늘 네가 나와 함께 낙원에
  '23:46': 'passion_prediction',      // 아버지여 내 영혼을 아버지 손에 부탁하나이다
  '23:49': 'women_witness',           // 여자들이 멀리서 이 일을 보니라
  '24:1':  'women_witness',           // 여자들이 향품을 가지고 무덤에 (부활 첫 증인)
  '24:27': 'salvation_universal',     // 모세와 모든 선지자의 글로 자기에 관한 것을
  '24:30': 'table_fellowship',        // 엠마오 · 떡을 떼시니 눈이 밝아져
  '24:47': 'salvation_universal',     // 죄사함을 얻게 하는 회개가 만민에게
  '24:49': 'ascension_spirit_promise',// 아버지의 약속하신 것 · 위로부터 능력
  '24:53': 'ascension_spirit_promise',// 늘 성전에서 하나님을 찬송 (성전 Inclusio)
};

export const LUK_CTX = {
  id: 'Luke',
  book: { ko: '누가복음', bollsNum: 42, lexId: 'Luke', lexCorpus: 'gnt', en: 'Luke', testament: 'NT' },
  chapters: 24,
  discourseRules: [...GNT_DISCOURSE_RULES, ...LUK_STRUCTURAL_RULES],
  manualDiscourse: LUK_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 복음서 · 공관복음 (이방인·데오빌로 대상)',
    genreNote: '누가-행전 이중 저작의 제1권 · 정교한 헬라어 서문 (1:1-4) · 마가 자료 + Q + L(누가 특수자료)',
    year: 'AD 80-85년경',
    yearNote: '성전 파괴 후 (21:20 명시적 예언 반영) · 사도행전과 짝을 이룸. 다수 학자 견해',
    place: '안디옥 (전통) 또는 로마·아가야 · 헬라어권 이방 도시',
    placeNote: '이레네우스: 누가는 바울의 동역자 · 안디옥 출신 의사',
    author: '누가 (Λουκᾶς) · 바울의 동역자 · 이방인 의사',
    authorNote: '골 4:14, 딤후 4:11, 몬 24 · 사도행전 "우리" 문단 저자 (16:10, 20:5, 21:1, 27:1). 익명 저자설도 병존',
    audience: '이방인 그리스도인 (특히 데오빌로 · 헬라어권 교양층)',
    audienceNote: '"각하 데오빌로" (1:3) · 유대 관습 설명 · 지리 설명 · 아람어 표현 헬라어화. 만민 구원 지평',
    theme: '이방인 구주 예수 · 성령·기도·여성·가난한 자 · 만민 구원',
    themeNote: '나사렛 선언 (4:18-19) → 잃은 자 찾음 (19:10) → 만민 죄사함 (24:47). 누가-행전 축',
    chapterAgenda: {
      1:  '서문(1:1-4)·세례요한 수태고지·마리아 수태고지·엘리사벳 방문·마그니피카트·세례요한 탄생·베네딕투스',
      2:  '예수 탄생·목자·천사 찬양(글로리아)·성전 봉헌·시메온(눈크 디미티스)·안나·소년 예수 성전',
      3:  '세례요한 사역(정치사 정박 3:1-2)·예수 세례(성령 강림)·족보(아담까지)',
      4:  '광야 40일 시험·나사렛 선언(미션 성명서 4:18-19)·가버나움 사역·귀신 축출·병 고침',
      5:  '첫 제자(베드로 배 부르심)·나병환자·중풍병자·레위(마태) 부르심·금식 논쟁',
      6:  '안식일 논쟁 2회·12제자 임명·평지 설교(팔복·화 있을진저·원수 사랑)',
      7:  '백부장 종·나인 성 과부 아들 살리심·세례요한 사자·시몬 집 죄녀 향유 부음',
      8:  '재정 후원 여성들·씨 뿌리는 비유·등불·참된 가족·풍랑·군대귀신·야이로 딸·혈루증',
      9:  '12제자 파송·오병이어·베드로 고백·첫 수난 예고·변화산·귀신들린 아이·예루살렘 향발(9:51)',
      10: '70인 파송·사탄 떨어짐·선한 사마리아인 비유·마르다와 마리아',
      11: '주기도문·구하라 찾으라·바알세불 논쟁·요나 표적·화 있을진저 6번(서기관·바리새인)',
      12: '두려워 말라·어리석은 부자 비유·근심하지 말라·재림 준비·분열·시대 분별',
      13: '갈릴리인·실로암 회개·굽은 여인·겨자씨/누룩·좁은 문·예루살렘 애가',
      14: '안식일 수종병자·잔치 자리·큰 잔치 비유·제자도 대가(십자가·소금)',
      15: '잃은 양·잃은 드라크마·탕자 비유 (삼중 회개 비유 · 누가 특수 정점)',
      16: '불의한 청지기 비유·부자와 나사로 (누가 특수 · 재물관)',
      17: '실족 경고·용서·믿음·종의 본분·열 문둥이·하나님 나라·인자 임함',
      18: '과부와 재판관·바리새인과 세리·어린이·부자 관원·셋째 수난 예고·여리고 소경',
      19: '삭개오·므나 비유·예루살렘 입성(여행 종결)·예루살렘 애가·성전 정화',
      20: '권위 논쟁·포도원 소작인·가이사 세금·부활 논쟁·다윗의 자손·서기관 조심',
      21: '과부 두 렙돈·성전 파괴 예언·종말 담론·인자 재림·깨어 있으라',
      22: '유월절 예비·성찬 제정·감람산 기도(피땀)·체포·베드로 부인·산헤드린 재판',
      23: '빌라도·헤롯·바라바·십자가·낙원 약속(오늘)·백부장 고백·매장·여자들 목격',
      24: '부활(빈 무덤)·엠마오 두 제자(떡 떼심)·예루살렘 나타나심·승천·성령 약속(성전 Inclusio 완성)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1,  toCh: 2,  color: '#7c3aed', label: '서문·탄생·성전 봉헌 (찬가 4곡)' },
      { id: 's2', fromCh: 3,  toCh: 4,  color: '#d97706', label: '사역 준비 (정치사 정박·나사렛 선언)' },
      { id: 's3', fromCh: 5,  toCh: 9,  color: '#0891b2', label: '갈릴리 사역 (부르심·이적·베드로 고백)' },
      { id: 's4', fromCh: 10, toCh: 19, color: '#059669', label: '여행 서사 (예루살렘 향발 · 특수 비유)' },
      { id: 's5', fromCh: 20, toCh: 21, color: '#b45309', label: '예루살렘 논쟁·종말 담론' },
      { id: 's6', fromCh: 22, toCh: 24, color: '#dc2626', label: '수난·부활·승천 (누가-행전 다리)' },
    ],
    pivots: [
      { id: 'p1',  ch: 1,  verse: 1,  color: '#6366f1', label: '서문 · 누가-행전 프로젝트 (데오빌로)' },
      { id: 'p2',  ch: 1,  verse: 35, color: '#0891b2', label: '성령 수태 (마리아 응답)' },
      { id: 'p3',  ch: 1,  verse: 46, color: '#0369a1', label: '마그니피카트 (마리아 찬가)' },
      { id: 'p4',  ch: 2,  verse: 11, color: '#dc2626', label: '오늘 구주 (오늘 1)' },
      { id: 'p5',  ch: 2,  verse: 32, color: '#dc2626', label: '이방을 비추는 빛 (만민)' },
      { id: 'p6',  ch: 3,  verse: 1,  color: '#6366f1', label: '정치사 정박 (디베료 15년)' },
      { id: 'p7',  ch: 3,  verse: 38, color: '#dc2626', label: '아담까지 족보 (만민 함의)' },
      { id: 'p8',  ch: 4,  verse: 18, color: '#059669', label: '나사렛 선언 (미션 성명서)' },
      { id: 'p9',  ch: 4,  verse: 21, color: '#dc2626', label: '오늘 성취 (오늘 2)' },
      { id: 'p10', ch: 6,  verse: 12, color: '#7c3aed', label: '밤새 기도 (12제자 임명)' },
      { id: 'p11', ch: 6,  verse: 20, color: '#059669', label: '가난한 자는 복이 있나니 (평지설교)' },
      { id: 'p12', ch: 7,  verse: 22, color: '#059669', label: '가난한 자에게 복음 (미션 확인)' },
      { id: 'p13', ch: 9,  verse: 22, color: '#dc2626', label: '첫 수난 예고' },
      { id: 'p14', ch: 9,  verse: 31, color: '#7c3aed', label: '변화산 · 별세(엑소도스)' },
      { id: 'p15', ch: 9,  verse: 51, color: '#d97706', label: '예루살렘 향발 (여행 시작)' },
      { id: 'p16', ch: 10, verse: 33, color: '#7c3aed', label: '선한 사마리아인 (자비)' },
      { id: 'p17', ch: 11, verse: 2,  color: '#7c3aed', label: '주기도문' },
      { id: 'p18', ch: 15, verse: 11, color: '#7c3aed', label: '탕자 비유 (자비의 정점)' },
      { id: 'p19', ch: 17, verse: 20, color: '#0369a1', label: '하나님 나라 임함' },
      { id: 'p20', ch: 18, verse: 14, color: '#7c3aed', label: '세리 의롭다 하심' },
      { id: 'p21', ch: 19, verse: 9,  color: '#dc2626', label: '오늘 구원 (오늘 3 · 삭개오)' },
      { id: 'p22', ch: 19, verse: 10, color: '#0369a1', label: '인자가 잃은 자 찾으러 옴' },
      { id: 'p23', ch: 19, verse: 28, color: '#d97706', label: '예루살렘 입성 (여행 종결)' },
      { id: 'p24', ch: 22, verse: 19, color: '#dc2626', label: '성찬 · 너희를 위하여 주는 내 몸' },
      { id: 'p25', ch: 22, verse: 44, color: '#7c3aed', label: '겟세마네 피땀 (기도)' },
      { id: 'p26', ch: 23, verse: 34, color: '#7c3aed', label: '아버지여 저들을 사하소서' },
      { id: 'p27', ch: 23, verse: 43, color: '#dc2626', label: '오늘 낙원 (오늘 4)' },
      { id: 'p28', ch: 24, verse: 27, color: '#dc2626', label: '모세와 모든 선지자 (구약 성취)' },
      { id: 'p29', ch: 24, verse: 49, color: '#0891b2', label: '성령 약속 (누가-행전 다리)' },
      { id: 'p30', ch: 24, verse: 53, color: '#0891b2', label: '성전 축복 (Inclusio 완성)' },
    ],
    arcs: [
      { id: 'a1',  from: 'p2',  to: 'p29', color: '#0891b2', label: '성령 Inclusio (수태 → 약속) · 누가-행전 축' },
      { id: 'a2',  from: 'p4',  to: 'p27', color: '#dc2626', label: '오늘 대주제 (구주 탄생 → 낙원)' },
      { id: 'a3',  from: 'p8',  to: 'p22', color: '#059669', label: '나사렛 선언 → 잃은 자 찾음 (미션 성취)' },
      { id: 'a4',  from: 'p11', to: 'p12', color: '#059669', label: '가난한 자 팔복 → 미션 확인' },
      { id: 'a5',  from: 'p13', to: 'p25', color: '#dc2626', label: '수난 예고 → 겟세마네 (수난 성취)' },
      { id: 'a6',  from: 'p15', to: 'p23', color: '#d97706', label: '여행 서사 (예루살렘 향발 → 입성)' },
      { id: 'a7',  from: 'p5',  to: 'p29', color: '#dc2626', label: '만민 (이방 빛 → 성령 약속)' },
      { id: 'a8',  from: 'p10', to: 'p25', color: '#7c3aed', label: '기도 축 (밤새 → 겟세마네)' },
      { id: 'a9',  from: 'p16', to: 'p18', color: '#7c3aed', label: '자비 (사마리아인 → 탕자)' },
      { id: 'a10', from: 'p13', to: 'p26', color: '#dc2626', label: '수난 예고 → 십자가 첫 말씀 (용서)' },
      { id: 'a11', from: 'p3',  to: 'p28', color: '#0369a1', label: '마그니피카트(구약 성취) → 모세·선지자' },
      { id: 'a12', from: 'p6',  to: 'p23', color: '#6366f1', label: '정치사 정박 → 예루살렘 입성 (역사적 지평)' },
      { id: 'a13', from: 'p29', to: 'p30', color: '#0891b2', label: '성령 약속 → 성전 축복 (Inclusio 완성)' },
      { id: 'a14', from: 'p7',  to: 'p28', color: '#dc2626', label: '아담(만민) → 구약 성취 (구속사)' },
    ],
  },
  // ── 비평장치: 본문 비평 특수 범위 (누가복음) ──────────────────────────────
  disputedRanges: [
    { ch: 17, from: 36, to: 36, label: '밭에 두 사람 있음 (일부 사본만) — 마태 24:40 조화' },
    { ch: 22, from: 19, to: 20, label: '성찬 후반부 · 잔·언약 (Western text 부재) — 짧은 본문 vs 긴 본문 논쟁' },
    { ch: 22, from: 43, to: 44, label: '겟세마네 피땀 · 천사 강력 (사본 논쟁 심함 · ℵ¹ D 부재)' },
    { ch: 23, from: 17, to: 17, label: '명절에 죄수 놓아주는 관례 (일부 사본 삽입) — 마태 27:15/막 15:6 조화' },
    { ch: 23, from: 34, to: 34, label: '아버지여 저들을 사하여 주옵소서 (일부 사본만 · P75 B D* 부재)' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 요한복음 (JHN_CTX) — 로고스·표적 7·I AM 7·보혜사·유월절 3회·대사장 기도·사랑하시는 제자
// 신약학 표준: Brown(Anchor) · Carson(PNTC) · Keener(2권) · Beasley-Murray(WBC) · Köstenberger(BECNT) · Lincoln(BNTC)
// ═══════════════════════════════════════════════════════════════════════════
const JHN_STRUCTURAL_RULES = [
  { id: 'logos', role: '로고스 (말씀 · 프롤로그)', icon: '📜', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ὁ λόγος', tr: '호 로고스',
    desc: '"태초에 말씀이 계시니라" (1:1) — 요한 프롤로그 (1:1-18) 로고스 신학. 선재 · 창조 · 성육신 (1:14) · 독생하신 하나님(μονογενὴς θεός · 1:18 · 신성). Brown·Bultmann·Carson.',
    match: (s) => s.has('G3056') },
  { id: 'signs', role: '표적 (σημεῖα · 7개)', icon: '⚡', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'σημεῖα', tr: '세메이아',
    desc: '요한 특유 "표적" 7개: 가나 물→포도주(2:11)·왕의 신하 아들(4:54)·38년 병자(5:8)·오병이어(6:14)·물 위 걸으심(6:19)·태생 소경(9:7)·나사로 부활(11:43). Dodd·Brown 표적서.',
    match: (s) => s.has('G4592') },
  { id: 'i_am', role: '나는 ~이다 (ἐγώ εἰμι · 7 I AM)', icon: '👑', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ἐγώ εἰμι', tr: '에고 에이미',
    desc: '요한 특유 7 I AM 은유: 생명의 떡(6:35)·세상의 빛(8:12)·양의 문(10:7)·선한 목자(10:11)·부활이요 생명(11:25)·길·진리·생명(14:6)·참 포도나무(15:1). + 절대적 "내가 있다" (8:58 · 출 3:14).',
    match: (s) => s.has('G1473') && s.has('G1510') },
  { id: 'eternal_life', role: '영원한 생명 (ζωὴ αἰώνιος)', icon: '♾️', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'ζωὴ αἰώνιος', tr: '조에 아이오니오스',
    desc: '"영원한 생명" — 요한 17회 (신약 최다). 3:16·5:24·6:47·17:3 등. 요한 특유: 현재적 소유 (이미 시작됨). Brown·Bultmann *realized eschatology*.',
    match: (s) => s.has('G2222') && s.has('G0166') },
  { id: 'paraclete', role: '보혜사 (παράκλητος)', icon: '🕊️', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'παράκλητος', tr: '파라클레토스',
    desc: '"다른 보혜사" — 요한 고별 담론 4회 약속 (14:16·14:26·15:26·16:7). 진리의 영·성령. 예수 이후 대변인·위로자. Brown·Carson.',
    match: (s) => s.has('G3875') },
  { id: 'love_agape', role: '사랑 (ἀγάπη)', icon: '❤️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἀγάπη', tr: '아가페',
    desc: '"하나님이 세상을 이처럼 사랑하사" (3:16) · "새 계명" (13:34) · "끝까지 사랑" (13:1) · 아버지·아들·제자 사랑. 요한 신학 정점. Barrett·Köstenberger.',
    match: (s) => s.has('G0026') },
  { id: 'truth', role: '진리 (ἀλήθεια)', icon: '✅', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ἀλήθεια', tr: '알레테이아',
    desc: '"진리를 알지니 진리가 자유케 하리라" (8:32) · 영과 진리 (4:24) · 진리의 영 (14:17). 요한 25회+. Bultmann·Brown 진리 개념.',
    match: (s) => s.has('G0225') },
  { id: 'world_kosmos', role: '세상 (κόσμος)', icon: '🌍', color: '#6366f1', bg: 'rgba(99,102,241,.13)',
    gr: 'κόσμος', tr: '코스모스',
    desc: '"세상" — 요한 78회 (신약 최다). 이중 의미: 창조 (1:10) vs 예수 대적 (15:18-19). 세상의 구주 (4:42) · 세상 이김 (16:33). Cassem·Brown.',
    match: (s) => s.has('G2889') },
  { id: 'passover_three', role: '유월절 3회 (연대기)', icon: '🌾', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'πάσχα', tr: '파스카',
    desc: '요한 특유 유월절 3회 명시 (2:13·6:4·11:55) → 예수 공생애 3년 근거. 공관복음 (유월절 1회) 대비. Carson·Morris 연대기 재구성.',
    match: (s) => s.has('G3957') },
  { id: 'high_priestly_prayer', role: '대사장 기도 (17장)', icon: '🙏', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'προσευχή τοῦ ἀρχιερέως', tr: '프로슈케 투 아르키에레오스',
    desc: '"아버지여" — 요한 17장 전체 예수 기도. 자신 영광(1-5)·제자들 보호(6-19)·모든 믿는 자 하나 됨(20-26). Käsemann·Brown *high priestly prayer*.',
    match: null },
  { id: 'beloved_disciple', role: '사랑하시는 제자', icon: '💙', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'ὃν ἠγάπα ὁ Ἰησοῦς', tr: '혼 에가파 호 이에수스',
    desc: '"예수께서 사랑하시는 제자" — 요한만: 13:23·19:26·20:2·21:7·21:24. 저자 자기 언급(전통) 또는 이상적 제자 표상. 익명성·목격 증언. Bauckham·Charlesworth.',
    match: null },
  { id: 'judaeans', role: '유대인 (Ἰουδαῖοι · 특유 용법)', icon: '⚔️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'οἱ Ἰουδαῖοι', tr: '호이 유다이오이',
    desc: '요한 특유 "유대인" 용법 (71회) — 종종 유대 종교 지도자·예수 대적자 지칭. 갈릴리 유대인 아님. 반유대주의 논쟁. Brown·Reinhartz·Lieu.',
    match: (s) => s.has('G2453') },
  { id: 'hour_of_glory', role: '영광의 때 (ἡ ὥρα)', icon: '⏰', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἡ ὥρα', tr: '헤 호라',
    desc: '"내 때가 아직 이르지 아니하였다" (2:4·7:30·8:20) → "인자의 영광의 때가 왔다" (12:23·17:1). 십자가=영광의 때. Brown·Morris 요한 시간 신학.',
    match: (s) => s.has('G5610') },
  { id: 'light_darkness', role: '빛과 어둠 (φῶς / σκοτία)', icon: '💡', color: '#eab308', bg: 'rgba(234,179,8,.14)',
    gr: 'τὸ φῶς τοῦ κόσμου', tr: '토 포스 투 코스무',
    desc: '"빛이 어둠에 비치되" (1:5) · 세상의 빛 (8:12·9:5) · 빛과 어둠 이원론. 쿰란·요한 문학 배경. Charlesworth·Bultmann 이원론.',
    match: (s) => s.has('G5457') || s.has('G4653') },
  { id: 'bear_witness', role: '증언 (μαρτυρέω)', icon: '📢', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'μαρτυρέω', tr: '마르튀레오',
    desc: '"증언하다" — 요한 47회 (신약 최다). 세례요한 증언 (1:7·5:33) · 성부 증언 (5:37) · 성령 증언 (15:26) · 제자 증언 (21:24). 법정적 증언 신학.',
    match: (s) => s.has('G3140') },
];

// 요한복음 수동 담화 주석: 로고스·표적·I AM·보혜사·유월절·대사장 기도·사랑하시는 제자 결정 지점
const JHN_MANUAL_DISCOURSE = {
  '1:1':   'logos',                   // 태초에 말씀이 계시니라
  '1:14':  'logos',                   // 말씀이 육신이 되어
  '1:18':  'logos',                   // 독생하신 하나님이 나타내셨느니라 (μονογενὴς θεός)
  '1:29':  'bear_witness',            // 세례요한 · 하나님의 어린 양
  '2:11':  'signs',                   // 첫 표적 · 그의 영광을 나타내시매
  '2:13':  'passover_three',          // 유월절 1 (성전 정화)
  '2:19':  'hour_of_glory',           // 이 성전을 헐라 · 사흘 동안 일으키리라
  '3:5':   'eternal_life',            // 물과 성령으로 나지 아니하면
  '3:14':  'hour_of_glory',           // 인자도 들려야 하리니 (모세 뱀)
  '3:16':  'love_agape',              // 하나님이 세상을 이처럼 사랑하사
  '3:19':  'light_darkness',          // 빛이 세상에 왔으되 사람들이 어둠을 사랑
  '4:23':  'truth',                   // 아버지께 참되게 예배하는 자는 영과 진리로
  '4:42':  'world_kosmos',            // 세상의 구주신 줄 앎이니라
  '4:54':  'signs',                   // 두 번째 표적 (왕의 신하 아들)
  '5:8':   'signs',                   // 세 번째 표적 (38년 병자)
  '5:24':  'eternal_life',            // 사망에서 생명으로 옮겼느니라
  '5:39':  'bear_witness',            // 성경이 나에 대하여 증언
  '6:4':   'passover_three',          // 유월절 2 (오병이어 배경)
  '6:14':  'signs',                   // 네 번째 표적 (오병이어)
  '6:19':  'signs',                   // 다섯 번째 표적 (물 위 걸으심)
  '6:35':  'i_am',                    // I AM · 생명의 떡
  '6:53':  'eternal_life',            // 인자의 살을 먹고 그 피를 마시지 아니하면
  '7:24':  'truth',                   // 외모로 판단하지 말고 공의롭게 판단
  '7:30':  'hour_of_glory',           // 그의 때가 아직 이르지 아니하였음
  '7:37':  'paraclete',               // 목마르거든 내게로 와서 마시라 (성령 예고)
  '8:12':  'i_am',                    // I AM · 세상의 빛
  '8:32':  'truth',                   // 진리를 알지니 · 자유케 하리라
  '8:44':  'truth',                   // 마귀는 처음부터 진리 안에 서지 못함
  '8:58':  'i_am',                    // 아브라함 전에 내가 있다 (I AM 절대적)
  '9:5':   'light_darkness',          // 내가 세상에 있는 동안 세상의 빛
  '9:7':   'signs',                   // 여섯 번째 표적 (태생 소경)
  '10:11': 'i_am',                    // I AM · 선한 목자
  '10:14': 'i_am',                    // I AM · 선한 목자 (재확언)
  '10:30': 'i_am',                    // 나와 아버지는 하나이니라
  '11:25': 'i_am',                    // I AM · 부활이요 생명
  '11:43': 'signs',                   // 일곱 번째 표적 (나사로 부활)
  '11:55': 'passover_three',          // 유월절 3 (수난 유월절)
  '12:23': 'hour_of_glory',           // 인자의 영광을 얻을 때가 왔도다
  '12:32': 'hour_of_glory',           // 내가 땅에서 들리면 모든 사람을 이끌리라
  '12:35': 'light_darkness',          // 빛이 너희 중에 잠시 있으니
  '13:1':  'love_agape',              // 유월절 전 · 사랑하시되 끝까지 사랑
  '13:23': 'beloved_disciple',        // 사랑하시는 그 제자 (최후의 만찬 · 최초 등장)
  '13:34': 'love_agape',              // 새 계명을 너희에게 주노니 서로 사랑
  '14:6':  'i_am',                    // I AM · 길이요 진리요 생명 (I AM 6)
  '14:16': 'paraclete',               // 다른 보혜사 (1차 약속)
  '14:26': 'paraclete',               // 아버지께서 내 이름으로 보내실 보혜사 성령
  '15:5':  'i_am',                    // I AM · 참 포도나무 (I AM 7)
  '15:12': 'love_agape',              // 서로 사랑하라 (재차)
  '15:26': 'paraclete',               // 아버지께로부터 나오시는 진리의 성령
  '16:7':  'paraclete',               // 내가 떠나가지 아니하면 보혜사가 오시지
  '16:13': 'truth',                   // 진리의 성령이 오시면 모든 진리 가운데로
  '16:33': 'world_kosmos',            // 내가 세상을 이기었노라
  '17:1':  'high_priestly_prayer',    // 아버지여 때가 이르렀사오니 (대사장 기도 시작)
  '17:11': 'high_priestly_prayer',    // 저희로 하나가 되게 하옵소서 (제자들)
  '17:21': 'high_priestly_prayer',    // 저희도 다 하나가 되어 (모든 믿는 자)
  '18:36': 'world_kosmos',            // 내 나라는 이 세상에 속한 것이 아니라
  '19:26': 'beloved_disciple',        // 어머니여 · 사랑하시는 제자에게 위탁
  '19:30': 'hour_of_glory',           // 다 이루었다 (τετέλεσται)
  '19:34': 'bear_witness',            // 곧 피와 물이 나오더라 · 본 자가 증언
  '20:2':  'beloved_disciple',        // 시몬 베드로와 사랑하시던 그 다른 제자
  '20:22': 'paraclete',               // 성령을 받으라 (부활 후 성령 강림)
  '20:28': 'i_am',                    // 도마 · 나의 주님이시요 나의 하나님이시니이다
  '20:31': 'bear_witness',            // 이것을 기록함은 (책의 목적 · 믿음)
  '21:7':  'beloved_disciple',        // 예수의 사랑하시는 그 제자
  '21:24': 'beloved_disciple',        // 이 일들을 증언하고 이 일들을 기록한 제자
};

export const JHN_CTX = {
  id: 'John',
  book: { ko: '요한복음', bollsNum: 43, lexId: 'John', lexCorpus: 'gnt', en: 'John', testament: 'NT' },
  chapters: 21,
  discourseRules: [...GNT_DISCOURSE_RULES, ...JHN_STRUCTURAL_RULES],
  manualDiscourse: JHN_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 복음서 · 제4복음서 (공관복음과 별개 계열)',
    genreNote: '고 기독론 · 로고스 신학 · 표적서 + 영광서 구조 · 다층적 상징 · 헬라어 단순하나 신학 심오',
    year: 'AD 85-95년경',
    yearNote: '요한 서신·계시록과 함께 마지막에 기록 · 유대인 회당 축출 (9:22 배경) 이후 · 다수 학자 견해',
    place: '에베소 (전통 · 이레네우스)',
    placeNote: '요한 사도가 밧모섬 유배 전후 에베소 교회에서 기록 · 아시아 소재',
    author: '요한 사도 (전통) · 또는 요한 학파 · "예수의 사랑하시는 제자"',
    authorNote: '사도 요한 저자설 (전통) vs 요한 학파·장로 요한 저자설 (현대 다수). 목격 증언 근거 (19:35, 21:24)',
    audience: '헬라어권 그리스도인 (에베소 교회 · 회당 축출 유대-기독)',
    audienceNote: '20:31 명시적 목적: "믿게 하려" · 이방인 · 회당 축출 유대인 기독교인 · 헬라 철학 지평',
    theme: '예수는 하나님의 아들 그리스도 · 로고스 성육신 · 영광의 때 · 영원한 생명',
    themeNote: '프롤로그 신성 (1:1·1:18) → 도마 신성 고백 (20:28) Inclusio. 표적 → 믿음 → 영생 (20:31)',
    chapterAgenda: {
      1:  '프롤로그 로고스(1:1-18)·세례요한 증언·첫 제자 부르심(안드레·베드로·빌립·나다나엘)',
      2:  '가나 혼인잔치(첫 표적)·성전 정화(공관과 다른 배치·요한은 사역 초반)',
      3:  '니고데모(위로부터 남·요 3:16)·세례요한 예수 증언(마지막)',
      4:  '사마리아 여인(영과 진리)·왕의 신하 아들(두 번째 표적)',
      5:  '벳새다 못 38년 병자(세 번째 표적)·안식일 논쟁·아들 권세·네 증인',
      6:  '오병이어(네 번째 표적)·물 위 걸으심(다섯 번째)·생명의 떡 담론(I AM 1)·12제자 떠남',
      7:  '초막절·형제 불신·생수의 강 약속·니고데모 옹호·유대인 분쟁',
      8:  '간음한 여인(사본 논쟁)·세상의 빛(I AM 2)·진리가 자유케·아브라함 전에 내가 있다(I AM 절대적)',
      9:  '태생 소경(여섯 번째 표적)·유대인 심문·눈 뜬 자 신앙 고백·영적 소경 대조',
      10: '선한 목자·양의 문(I AM 3, 4)·나와 아버지는 하나·수전절·유대인 돌 들다',
      11: '나사로 부활(일곱 번째 표적·I AM 5 부활이요 생명)·산헤드린 예수 죽일 결의',
      12: '마리아 향유·예루살렘 입성·헬라인 온 것·인자 영광의 때·표적서 결론',
      13: '유월절 전·발 씻김·유다 지목·새 계명·베드로 부인 예고',
      14: '근심하지 말라·길·진리·생명(I AM 6)·첫 보혜사 약속·내 평강',
      15: '참 포도나무(I AM 7)·서로 사랑·세상 미움·성령 증언',
      16: '보혜사 강림 예고(재차)·잠시 후 다시 잠시·세상 이김',
      17: '대사장 기도(자신 영광·제자들 보호·모든 믿는 자 하나 됨)',
      18: '켓세마네(요한은 "동산") 체포·안나스·가야바·베드로 부인·빌라도 심문',
      19: '빌라도·십자가(INRI)·예수 어머니 요한에게·다 이루었다·창 찔림(물과 피)',
      20: '부활·막달라 마리아·베드로·요한 무덤·도마 고백·책의 목적(20:31)',
      21: '갈릴리 재현·153마리 물고기·베드로 회복 3중·사랑하시는 제자 에필로그',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1,  toCh: 1,  color: '#7c3aed', label: '프롤로그 · 로고스 (신성 시작)' },
      { id: 's2', fromCh: 2,  toCh: 4,  color: '#d97706', label: '사역 시작 · 첫 표적 · 상징 대화' },
      { id: 's3', fromCh: 5,  toCh: 10, color: '#0891b2', label: '예루살렘 표적·논쟁·I AM 대부분' },
      { id: 's4', fromCh: 11, toCh: 12, color: '#059669', label: '나사로·영광의 때·표적서 결론' },
      { id: 's5', fromCh: 13, toCh: 17, color: '#0369a1', label: '고별 담론·보혜사 약속·대사장 기도' },
      { id: 's6', fromCh: 18, toCh: 21, color: '#dc2626', label: '수난·부활·에필로그' },
    ],
    pivots: [
      { id: 'p1',  ch: 1,  verse: 1,  color: '#7c3aed', label: '로고스 · 태초에 말씀 (신성)' },
      { id: 'p2',  ch: 1,  verse: 14, color: '#7c3aed', label: '말씀이 육신이 되어 (성육신)' },
      { id: 'p3',  ch: 1,  verse: 18, color: '#7c3aed', label: '독생하신 하나님 (μονογενὴς θεός)' },
      { id: 'p4',  ch: 1,  verse: 29, color: '#dc2626', label: '세상 죄를 지고 가는 어린 양' },
      { id: 'p5',  ch: 2,  verse: 11, color: '#dc2626', label: '첫 표적 · 영광 나타냄 (가나)' },
      { id: 'p6',  ch: 2,  verse: 19, color: '#7c3aed', label: '이 성전을 헐라 · 내 몸' },
      { id: 'p7',  ch: 3,  verse: 16, color: '#dc2626', label: '하나님이 세상을 이처럼 사랑' },
      { id: 'p8',  ch: 4,  verse: 24, color: '#0369a1', label: '영과 진리로 예배' },
      { id: 'p9',  ch: 4,  verse: 42, color: '#6366f1', label: '세상의 구주 (사마리아인 고백)' },
      { id: 'p10', ch: 5,  verse: 24, color: '#059669', label: '영원한 생명 (사망에서 생명으로)' },
      { id: 'p11', ch: 6,  verse: 35, color: '#0369a1', label: 'I AM 생명의 떡' },
      { id: 'p12', ch: 8,  verse: 12, color: '#0369a1', label: 'I AM 세상의 빛' },
      { id: 'p13', ch: 8,  verse: 32, color: '#0369a1', label: '진리가 너희를 자유롭게' },
      { id: 'p14', ch: 8,  verse: 58, color: '#0369a1', label: '아브라함 전에 내가 있다 (I AM 절대적)' },
      { id: 'p15', ch: 10, verse: 11, color: '#0369a1', label: 'I AM 선한 목자' },
      { id: 'p16', ch: 10, verse: 30, color: '#0369a1', label: '나와 아버지는 하나' },
      { id: 'p17', ch: 11, verse: 25, color: '#0369a1', label: 'I AM 부활이요 생명' },
      { id: 'p18', ch: 11, verse: 43, color: '#dc2626', label: '나사로야 나오라 (표적 7)' },
      { id: 'p19', ch: 12, verse: 23, color: '#7c3aed', label: '인자 영광의 때가 왔도다' },
      { id: 'p20', ch: 12, verse: 32, color: '#7c3aed', label: '내가 들리면 · 모든 사람 이끌리라' },
      { id: 'p21', ch: 13, verse: 1,  color: '#dc2626', label: '사랑하시되 끝까지 (유월절 전)' },
      { id: 'p22', ch: 13, verse: 34, color: '#dc2626', label: '새 계명 · 서로 사랑하라' },
      { id: 'p23', ch: 14, verse: 6,  color: '#0369a1', label: 'I AM 길·진리·생명' },
      { id: 'p24', ch: 14, verse: 16, color: '#0891b2', label: '다른 보혜사 약속 (1차)' },
      { id: 'p25', ch: 15, verse: 5,  color: '#0369a1', label: 'I AM 참 포도나무' },
      { id: 'p26', ch: 17, verse: 1,  color: '#7c3aed', label: '대사장 기도 시작 (때가 이르렀사오니)' },
      { id: 'p27', ch: 17, verse: 21, color: '#7c3aed', label: '저희로 하나가 되어 (모든 믿는 자)' },
      { id: 'p28', ch: 19, verse: 30, color: '#dc2626', label: '다 이루었다 (τετέλεσται)' },
      { id: 'p29', ch: 19, verse: 34, color: '#dc2626', label: '물과 피 (창 찔림)' },
      { id: 'p30', ch: 20, verse: 28, color: '#7c3aed', label: '도마 고백 · 나의 주님이시요 나의 하나님이시니이다' },
      { id: 'p31', ch: 20, verse: 31, color: '#059669', label: '이것을 기록함은 (책의 목적 · 믿음)' },
    ],
    arcs: [
      { id: 'a1',  from: 'p1',  to: 'p30', color: '#7c3aed', label: '신성 Inclusio (로고스 → 도마 하나님 고백)' },
      { id: 'a2',  from: 'p2',  to: 'p28', color: '#dc2626', label: '성육신 → 다 이루었다 (십자가 완성)' },
      { id: 'a3',  from: 'p4',  to: 'p28', color: '#dc2626', label: '하나님의 어린 양 → 십자가 (구속)' },
      { id: 'a4',  from: 'p5',  to: 'p18', color: '#dc2626', label: '표적 축 (첫 표적 → 일곱 번째 표적)' },
      { id: 'a5',  from: 'p6',  to: 'p30', color: '#7c3aed', label: '성전 = 내 몸 → 부활 신성 (성전 신학)' },
      { id: 'a6',  from: 'p11', to: 'p25', color: '#0369a1', label: 'I AM 축 (생명의 떡 → 참 포도나무)' },
      { id: 'a7',  from: 'p19', to: 'p28', color: '#7c3aed', label: '영광의 때 → 다 이루었다' },
      { id: 'a8',  from: 'p24', to: 'p27', color: '#0891b2', label: '보혜사 약속 → 대사장 기도 (성령 · 하나 됨)' },
      { id: 'a9',  from: 'p7',  to: 'p31', color: '#059669', label: '3:16 사랑 → 20:31 기록 목적 (믿음 · 영생)' },
      { id: 'a10', from: 'p21', to: 'p22', color: '#dc2626', label: '끝까지 사랑 → 새 계명 (사랑 명령)' },
      { id: 'a11', from: 'p16', to: 'p27', color: '#7c3aed', label: '나와 아버지 하나 → 저희도 하나 (교회론)' },
      { id: 'a12', from: 'p14', to: 'p30', color: '#0369a1', label: 'I AM 절대적 → 도마 하나님 (예수 신성)' },
      { id: 'a13', from: 'p3',  to: 'p28', color: '#7c3aed', label: '독생하신 하나님 → 다 이루었다 (아버지 뜻)' },
      { id: 'a14', from: 'p20', to: 'p29', color: '#dc2626', label: '들려짐 → 창 찔림 (십자가 신학)' },
    ],
  },
  // ── 비평장치: 본문 비평 특수 범위 (요한복음) ──────────────────────────────
  disputedRanges: [
    { ch: 1,  from: 18, to: 18, label: '독생하신 하나님 (μονογενὴς θεός · P66 P75 ℵ B) vs 독생자 (υἱός · A C² Θ) — 신성 해석' },
    { ch: 5,  from: 4,  to: 4,  label: '천사 물 동함 (일부 사본 삽입 · ℵ B C* D W 부재)' },
    { ch: 7,  from: 53, to: 53, label: '간음한 여인 시작 (Pericope Adulterae · 7:53-8:11 · 사본 위치 다양)' },
    { ch: 8,  from: 1,  to: 11, label: '간음한 여인 본체 (Pericope Adulterae · P66 P75 ℵ B 부재 · 후대 삽입 유력)' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 사도행전 (ACT_CTX) — 누가행전 제2권 · 성령·지리적 확장 (예루살렘 → 유대·사마리아 → 땅끝)
// 신약학 표준: Bruce(NICNT) · Fitzmyer(Anchor) · Barrett(ICC 2권) · Keener(Baker 4권) · Peterson(Pillar) · Witherington(SR) · Marshall(TNTC) · Bock(BECNT) · Johnson(SP) · Haenchen · Pervo(Hermeneia)
// ═══════════════════════════════════════════════════════════════════════════

// 사도행전 신학 핵심어 (성령·말씀·이름·회개·구원·교회 · 서사 중심)
const ACT_THEO_TERMS = {
  'G4151': { ko: '성령', color: '#7c3aed' },
  'G3056': { ko: '말씀', color: '#059669' },
  'G3686': { ko: '이름', color: '#dc2626' },
  'G3341': { ko: '회개', color: '#d97706' },
  'G4991': { ko: '구원', color: '#6366f1' },
  'G1577': { ko: '교회', color: '#0891b2' },
  'G3144': { ko: '증인', color: '#b45309' },
};

const ACT_STRUCTURAL_RULES = [
  { id: 'spirit_pentecost', role: '성령 강림 (πνεῦμα ἅγιον)', icon: '🕊️', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'πνεῦμα ἅγιον', tr: '프뉴마 하기온',
    desc: '"성령" — 사도행전 70회+ (신약 최다권). 오순절 강림 (2:4) · 사마리아 (8:17) · 이방인 오순절 (10:44) · 에베소 12제자 (19:6). 누가 성령론 · Bruce·Fitzmyer·Keener 성령 신학.',
    match: (s) => s.has('G4151') },
  { id: 'geographic_program', role: '지리 프로그램 (1:8)', icon: '🌍', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ἕως ἐσχάτου τῆς γῆς', tr: '헤오스 에스카투 테스 게스',
    desc: '"예루살렘·유대·사마리아·땅끝까지 증인" (1:8) — 사도행전 전체 구조 표어. 1-7 예루살렘 · 8-12 유대/사마리아 · 13-28 이방·로마. Bruce·Marshall·Witherington 구조 분석.',
    match: null },
  { id: 'summary_statement', role: '요약 진술 (말씀 흥왕)', icon: '📈', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'ὁ λόγος ηὔξανεν', tr: '호 로고스 에우크사넨',
    desc: '누가 특유 요약 진술 6-7회 (2:47 · 6:7 · 9:31 · 12:24 · 16:5 · 19:20 · 28:31) — 각 단락 마감·말씀 진전 표지. Cadbury·Haenchen "panels" 이론. 서사 프레임.',
    match: (s) => s.has('G0837') && s.has('G3056') },
  { id: 'kerygma_sermon', role: '케리그마 설교', icon: '📢', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'κήρυγμα', tr: '케뤼그마',
    desc: '초대 사도 설교 8-10편 (베드로 2·3·10·11 · 스데반 7 · 바울 13·17·20·22·26). C.H. Dodd 케리그마 재구성. 예수 죽음·부활·회개 요청·성경 성취.',
    match: null },
  { id: 'name_of_jesus', role: '예수의 이름 (ὄνομα)', icon: '✨', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'τὸ ὄνομα Ἰησοῦ', tr: '토 오노마 이에수',
    desc: '"이름" — 사도행전 33회+ 예수 이름 관련. 나사렛 예수 이름으로 (3:6) · 다른 이름 없음 (4:12) · 이름 위하여 고난 (5:41) · 이 이름으로 세례 (2:38). 이름 신학 · Barrett·Peterson.',
    match: (s) => s.has('G3686') && s.has('G2424') },
  { id: 'way_of_the_lord', role: '그 도 (ἡ ὁδός)', icon: '🛤️', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'ἡ ὁδός', tr: '헤 호도스',
    desc: '"그 도(道)" — 사도행전 특유 초대 그리스도인 자칭 (9:2 · 19:9 · 19:23 · 22:4 · 24:14 · 24:22). 유대교 내 갱신 운동 자기 이해. Fitzmyer·Bruce "the Way" 배경.',
    match: null },
  { id: 'repentance_baptism', role: '회개·세례 (μετάνοια·βαπτίζω)', icon: '💧', color: '#d97706', bg: 'rgba(217,119,6,.13)',
    gr: 'μετανοήσατε καὶ βαπτισθήτω', tr: '메타노에사테 카이 밥티스테토',
    desc: '"회개하고 세례를 받으라" (2:38) — 사도 설교 응답 표준 공식. 회개 (μετάνοια · 6회) + 세례 (βαπτίζω · 21회). 유대·이방 공통 입회 · Peterson·Marshall.',
    match: (s) => s.has('G3340') || (s.has('G0907') && s.has('G3341')) },
  { id: 'gentile_inclusion', role: '이방인 편입 (ἔθνη)', icon: '🤝', color: '#6366f1', bg: 'rgba(99,102,241,.13)',
    gr: 'τὰ ἔθνη', tr: '타 에트네',
    desc: '이방인 편입 서사 · 사도행전 핵심 신학. 고넬료 (10:34-48) · 안디옥 (11:20-26) · 공의회 (15) · 이방의 빛 (13:47) · "이방인에게" (22:21 · 28:28). Dunn·Bock·Jervell.',
    match: (s) => s.has('G1484') },
  { id: 'persecution_scattering', role: '박해·흩어짐 (διωγμός)', icon: '⚔️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'διωγμὸς μέγας · διεσπάρησαν', tr: '디오그모스 메가스 · 디에스파레산',
    desc: '박해가 확산 촉발 (8:1-4) — 스데반 순교 → 큰 박해 → 흩어짐 → 흩어진 자들이 말씀 전파. 누가 서사 아이러니 (박해 → 선교). Haenchen·Pervo 흩어짐 모티프.',
    match: (s) => s.has('G1375') || s.has('G1289') },
  { id: 'conversion_narrative', role: '회심 서사', icon: '💫', color: '#eab308', bg: 'rgba(234,179,8,.14)',
    gr: 'ἐπιστρέφω πρὸς τὸν κύριον', tr: '에피스트레포 프로스 톤 퀴리온',
    desc: '주요 회심: 3천 명 (2:41) · 내시 (8:26-40) · 사울 (9·22·26 · 3중 반복) · 고넬료 (10) · 루디아·간수 (16). 사울 회심 3중 서사 = 이방 선교 신학적 근거. Witherington·Marguerat.',
    match: (s) => s.has('G1994') },
  { id: 'witness_martys', role: '증인 (μάρτυς)', icon: '📜', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'μάρτυς', tr: '마르튀스',
    desc: '"증인" — 부활 목격 사도 자기 규정 (1:8·1:22·2:32·3:15·5:32·10:39·22:15·26:16). 스데반 (22:20) 첫 순교자 · 이후 순교자(martyr) 어원. Trites·Bock 증언 신학.',
    match: (s) => s.has('G3144') },
  { id: 'church_ekklesia', role: '교회 (ἐκκλησία)', icon: '⛪', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'ἡ ἐκκλησία', tr: '헤 에클레시아',
    desc: '"교회" — 사도행전 23회 (지역 교회 첫 등장). 예루살렘 (5:11 · 8:1) · 안디옥 (11:26 · 13:1) · 각 성 (14:23 · 20:17). 자기 피로 사신 교회 (20:28). 초대 교회론 · Peterson·Fitzmyer.',
    match: (s) => s.has('G1577') },
  { id: 'holy_spirit_guidance', role: '성령 인도 (예언·환상·금지)', icon: '🧭', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'τὸ πνεῦμα εἶπεν', tr: '토 프뉴마 에이펜',
    desc: '성령 직접 인도 서사 다수: 빌립 (8:29) · 베드로 환상 (10:19) · 안디옥 파송 (13:2) · 아시아 금지 · 마게도냐 환상 (16:6-10) · 아가보 (11:28 · 21:11). 누가 성령론 · Squires 신적 필연성.',
    match: null },
];

const ACT_MANUAL_DISCOURSE = {
  '1:8':   'geographic_program',      // 예루살렘·유대·사마리아·땅끝 증인 (표어)
  '2:4':   'spirit_pentecost',        // 오순절 성령 강림
  '2:14':  'kerygma_sermon',          // 베드로 오순절 설교 (1차 케리그마)
  '2:38':  'repentance_baptism',      // 회개하고 세례 · 성령 선물
  '2:41':  'conversion_narrative',    // 3천 명 회심
  '2:47':  'summary_statement',       // 첫 요약 진술
  '3:6':   'name_of_jesus',           // 나사렛 예수 그리스도 이름으로
  '3:12':  'kerygma_sermon',          // 베드로 미문 설교 (2차 케리그마)
  '4:12':  'name_of_jesus',           // 다른 이름으로는 구원 없음
  '4:31':  'spirit_pentecost',        // 성령 충만 · 담대히 말씀
  '5:32':  'witness_martys',          // 우리는 이 일에 증인
  '5:41':  'witness_martys',          // 그 이름 위해 능욕받음 기뻐함
  '6:7':   'summary_statement',       // 요약 · 말씀 왕성 · 제사장 순종
  '7:2':   'kerygma_sermon',          // 스데반 설교 (구속사 개관)
  '7:59':  'witness_martys',          // 스데반 순교 · 주 예수여 내 영혼을 받으시옵소서
  '8:1':   'persecution_scattering',  // 큰 박해 · 사방으로 흩어짐
  '8:4':   'persecution_scattering',  // 흩어진 자들이 두루 다니며 복음 말씀 전함
  '8:29':  'holy_spirit_guidance',    // 성령이 빌립에게 · 수레로 가까이 나아가라
  '8:37':  'repentance_baptism',      // 내시 신앙고백 (사본 논쟁)
  '9:2':   'way_of_the_lord',         // 이 도를 좇는 사람들
  '9:15':  'conversion_narrative',    // 사울 · 내 이름을 이방인에게 전할 택한 그릇
  '9:31':  'summary_statement',       // 요약 · 온 유대·갈릴리·사마리아 교회 평안
  '10:15': 'gentile_inclusion',       // 하나님이 깨끗하게 하신 것 (베드로 환상)
  '10:19': 'holy_spirit_guidance',    // 성령이 저에게 · 세 사람이 너를 찾으니
  '10:34': 'gentile_inclusion',       // 하나님이 사람의 외모 취하지 아니하심
  '10:44': 'spirit_pentecost',        // 이방인 오순절 (성령 강림)
  '11:18': 'gentile_inclusion',       // 이방인에게도 회개 · 생명 얻는 회개
  '11:26': 'church_ekklesia',         // 안디옥 · 제자들이 "그리스도인" 일컬음 최초
  '11:28': 'holy_spirit_guidance',    // 아가보 성령 감동 예언 (흉년)
  '12:24': 'summary_statement',       // 요약 · 하나님 말씀은 흥왕
  '13:2':  'holy_spirit_guidance',    // 성령이 · 바나바와 사울 따로 세우라 (1차 선교 파송)
  '13:16': 'kerygma_sermon',          // 바울 비시디아 안디옥 설교 (첫 바울 설교)
  '13:38': 'repentance_baptism',      // 죄사함을 이 사람으로 · 이신칭의 예고
  '13:47': 'gentile_inclusion',       // 이방의 빛 · 사 49:6 인용
  '15:11': 'gentile_inclusion',       // 주 예수의 은혜로 구원 (공의회 · 베드로)
  '15:28': 'holy_spirit_guidance',    // 성령과 우리는 · 공의회 결의
  '16:5':  'summary_statement',       // 요약 · 교회들이 믿음 굳어지고 수 증가
  '16:6':  'holy_spirit_guidance',    // 성령이 아시아에서 말씀 전함 금하심
  '16:9':  'holy_spirit_guidance',    // 마게도냐 환상 · 우리를 도우라
  '16:31': 'name_of_jesus',           // 주 예수를 믿으라 (빌립보 간수)
  '17:22': 'kerygma_sermon',          // 아레오바고 설교 (이방 청중 케리그마)
  '17:31': 'kerygma_sermon',          // 부활로 확증 · 심판 예고
  '18:26': 'way_of_the_lord',         // 브리스길라·아굴라 · 하나님의 도를 정확히 풀어
  '19:9':  'way_of_the_lord',         // 그 도를 비방
  '19:20': 'summary_statement',       // 요약 · 주의 말씀이 힘 있게 흥왕
  '20:17': 'church_ekklesia',         // 에베소 장로 청함 (교회 감독)
  '20:24': 'witness_martys',          // 내 달려갈 길 · 하나님의 은혜 복음 증거
  '20:28': 'church_ekklesia',         // 자기 피로 사신 교회 · 감독자로 세우심
  '20:35': 'kerygma_sermon',          // 밀레도 고별 (에베소 장로 · 목회 설교)
  '22:4':  'way_of_the_lord',         // 이 도를 박해하여 죽이기까지
  '22:15': 'witness_martys',          // 만민 앞에서 그의 증인
  '22:21': 'gentile_inclusion',       // 내가 너를 이방인에게 보내리라 (재소환)
  '24:14': 'way_of_the_lord',         // 그들이 이단이라 하는 도를 따라 섬김
  '26:16': 'witness_martys',          // 네가 본 것과 내가 나타날 것의 증인
  '26:18': 'conversion_narrative',    // 눈 뜨게 · 어둠에서 빛으로 · 사탄 권세에서 하나님께
  '28:28': 'gentile_inclusion',       // 이 구원이 이방인에게로 보내신 줄 알라
  '28:31': 'summary_statement',       // 마지막 · 담대히 하나님 나라 · 아무 금지 없이
};

export const ACT_CTX = {
  id: 'Acts',
  book: { ko: '사도행전', bollsNum: 44, lexId: 'Acts', lexCorpus: 'gnt', en: 'Acts', testament: 'NT' },
  chapters: 28,
  discourseRules: [...GNT_DISCOURSE_RULES, ...ACT_STRUCTURAL_RULES],
  manualDiscourse: ACT_MANUAL_DISCOURSE,
  theoTerms: ACT_THEO_TERMS,
  meta: {
    genre: '신약 서사 · 역사·전기 (누가행전 제2권)',
    genreNote: '고대 역사서 + 전기 혼합 · 케리그마 설교 8편 삽입 · "우리" 구절 여행일지 (16:10-17 · 20:5-15 · 21:1-18 · 27:1-28:16)',
    year: 'AD 62-90년경',
    yearNote: '이른 연대 (AD 62 · 바울 로마 감금 종료 이전 · Bruce·Marshall) vs 늦은 연대 (AD 80-90 · 예루살렘 파괴 이후 · Fitzmyer·Haenchen)',
    place: '로마 또는 안디옥·에베소 (전통)',
    placeNote: '누가 바울 동역자 · 로마·안디옥·아가야 등 다양 · 확정 어려움',
    author: '누가 (전통 · Lk 1:1-4 + Acts 1:1 데오빌로 헌정 이중 서문)',
    authorNote: '이방인 의사 · 골 4:14 · 바울 동역자 · "우리" 구절 = 저자 목격 (Bruce·Fitzmyer 다수) · 익명 저자 (일부 비평)',
    audience: '데오빌로 및 헬라어권 이방 그리스도인',
    audienceNote: '데오빌로 (Lk 1:3 · Acts 1:1) · κράτιστε 호칭 = 로마 관리 가능성 · 이방 기독교 정당화 · 로마 제국 문맥',
    theme: '성령의 능력으로 예루살렘에서 땅끝까지 · 하나님 나라 로마 도달',
    themeNote: '1:8 지리 프로그램 → 28:31 로마 성취 Inclusio. 예수가 시작한 일(1:1)을 성령이 이어감. 유대→이방 확장 신학적 정당화',
    chapterAgenda: {
      1:  '이중 서문(데오빌로)·40일 부활 후 나타나심·1:8 지리 프로그램·승천·마티아 사도 선정',
      2:  '오순절 성령 강림·방언·베드로 첫 케리그마 설교·회개·세례·3천 명·초대교회 공동체(2:42-47)',
      3:  '베드로 미문 앉은뱅이 치유·"나사렛 예수 이름으로"·베드로 두 번째 설교(솔로몬 행각)',
      4:  '베드로·요한 산헤드린 심문·"다른 이름 없음"(4:12)·교회 담대함·초대교회 나눔(4:32-37)',
      5:  '아나니아·삽비라 거짓·사도 표적·산헤드린 재심문·가말리엘 조언·사도들 채찍질 기뻐함',
      6:  '일곱 집사(스데반·빌립 포함)·6:7 요약·스데반 논쟁 시작·거짓 증인',
      7:  '스데반 설교(구속사 개관 · 아브라함→요셉→모세→성전)·순교·"주여 이 죄를 그들에게 돌리지 마옵소서"',
      8:  '큰 박해·흩어진 자들 말씀 전파·빌립 사마리아 부흥·시몬 마술사·에디오피아 내시(사본 논쟁 8:37)',
      9:  '사울 다마섹 도상 회심(1차)·아나니아·"택한 그릇"·다메섹·예루살렘 첫 방문·9:31 요약',
      10: '고넬료 환상·베드로 욥바 환상(부정한 짐승)·이방인 오순절(10:44)·"외모 취하지 아니하심"(10:34)',
      11: '예루살렘 이방인 사역 보고·안디옥 교회·"그리스도인" 첫 호칭·아가보 흉년 예언',
      12: '헤롯 아그립바 1세·야고보 순교·베드로 옥에서 천사 구원·헤롯 죽음·12:24 요약',
      13: '안디옥 성령 파송(1차 선교)·구브로·엘루마 마술사·비시디아 안디옥 바울 설교·이방의 빛(13:47)',
      14: '이고니온·루스드라(제우스·헤르메스 오해·바울 돌 맞음)·더베·1차 선교 마감·안디옥 귀환 보고',
      15: '예루살렘 공의회·이방인 할례 논쟁·베드로 은혜 구원(15:11)·야고보 판결·"성령과 우리"(15:28)·바나바·바울 결별',
      16: '2차 선교 시작·디모데·마게도냐 환상·빌립보 루디아·귀신 들린 여종·감옥·간수 회심("주 예수를 믿으라"·16:31)·16:5 요약',
      17: '데살로니가·베뢰아·아덴 아레오바고 설교(이방 케리그마·부활)·"천하를 어지럽게 하던 자"',
      18: '고린도 1년 6개월·아굴라·브리스길라·갈리오 판결·이스라엘 확정·아볼로 등장·"하나님의 도를 정확히"',
      19: '에베소 3년·12제자 성령 세례·두란노 서원 2년·기적·스게와 아들·아데미 신전·데메드리오 소요·19:20 요약',
      20: '마게도냐·헬라·드로아 유두고 부활·밀레도 에베소 장로 고별("자기 피로 사신 교회"·20:28·"내 달려갈 길"·20:24)',
      21: '예루살렘 향한 여행·두로·가이사랴·아가보 예언·성전 정결 오해·유대인 소요·바울 체포',
      22: '바울 히브리어 자기 변호(회심 2차 증언)·이방인 파송 재소환(22:21)·로마 시민권·산헤드린 이송',
      23: '산헤드린 심문(부활 쟁점 이용)·40여인 살해 음모·벨릭스에게 야간 이송·가이사랴 도착',
      24: '벨릭스 심문·더둘로 고발·바울 변호("이 도를 따라"·24:14)·2년 감금',
      25: '베스도 취임·유대인 재고발·바울 카이사르 상소(25:11)·아그립바 왕 방문',
      26: '아그립바 앞 세 번째 회심 증언·"눈 뜨게·어둠에서 빛으로"(26:18)·아그립바 반응·바울 무죄',
      27: '로마行 항해·유라굴로 광풍·14일 표류·바울 예언·바울 지도력·몰타 파선·모두 구원',
      28: '몰타 3개월(뱀·아버지 열병)·로마 도착·유대인 지도자 접견·이사야 6:9-10 인용·"이방인에게"(28:28)·2년 셋집·"담대히 하나님 나라"(28:31 · 마지막)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1,  toCh: 2,  color: '#7c3aed', label: '서곡 · 승천 · 오순절 성령 강림' },
      { id: 's2', fromCh: 3,  toCh: 7,  color: '#dc2626', label: '예루살렘 교회 · 사도 설교 · 스데반 순교' },
      { id: 's3', fromCh: 8,  toCh: 12, color: '#0891b2', label: '유대·사마리아 확산 · 사울 회심 · 이방 첫 회심(고넬료)' },
      { id: 's4', fromCh: 13, toCh: 14, color: '#d97706', label: '바울 1차 선교여행 · 이방 교회 세움' },
      { id: 's5', fromCh: 15, toCh: 15, color: '#059669', label: '예루살렘 공의회 · 이방인 자유 결정' },
      { id: 's6', fromCh: 16, toCh: 19, color: '#0369a1', label: '2차·3차 선교여행 · 유럽 진출' },
      { id: 's7', fromCh: 20, toCh: 28, color: '#6366f1', label: '예루살렘 → 로마 · 수난 · 변호 · 땅끝 성취' },
    ],
    pivots: [
      { id: 'p1',  ch: 1,  verse: 8,  color: '#0369a1', label: '지리 프로그램 · 예루살렘·유대·사마리아·땅끝 증인' },
      { id: 'p2',  ch: 2,  verse: 4,  color: '#7c3aed', label: '오순절 성령 강림 · 방언' },
      { id: 'p3',  ch: 2,  verse: 38, color: '#d97706', label: '회개하고 세례 · 성령 선물' },
      { id: 'p4',  ch: 2,  verse: 47, color: '#059669', label: '요약 1 · 초대교회 · 구원받는 자 더하심' },
      { id: 'p5',  ch: 4,  verse: 12, color: '#dc2626', label: '다른 이름 없음 (예수) · 구원 유일성' },
      { id: 'p6',  ch: 6,  verse: 7,  color: '#059669', label: '요약 2 · 하나님 말씀 왕성 · 제사장 순종' },
      { id: 'p7',  ch: 7,  verse: 59, color: '#dc2626', label: '스데반 순교 · 첫 순교자 · 사울 목격' },
      { id: 'p8',  ch: 8,  verse: 1,  color: '#b45309', label: '큰 박해 · 사방 흩어짐 (선교 촉발)' },
      { id: 'p9',  ch: 9,  verse: 15, color: '#eab308', label: '사울 · 이방인에게 내 이름 전할 택한 그릇' },
      { id: 'p10', ch: 9,  verse: 31, color: '#059669', label: '요약 3 · 온 유대·갈릴리·사마리아 교회 평안' },
      { id: 'p11', ch: 10, verse: 34, color: '#6366f1', label: '외모 취하지 아니하심 (이방인 편입)' },
      { id: 'p12', ch: 10, verse: 44, color: '#7c3aed', label: '이방인 오순절 (성령 강림)' },
      { id: 'p13', ch: 11, verse: 26, color: '#0891b2', label: '안디옥 · "그리스도인" 첫 호칭' },
      { id: 'p14', ch: 12, verse: 24, color: '#059669', label: '요약 4 · 하나님 말씀은 흥왕' },
      { id: 'p15', ch: 13, verse: 2,  color: '#7c3aed', label: '성령 파송 · 바나바·사울 (1차 선교)' },
      { id: 'p16', ch: 13, verse: 47, color: '#6366f1', label: '이방의 빛 (사 49:6 성취)' },
      { id: 'p17', ch: 15, verse: 11, color: '#6366f1', label: '주 예수의 은혜로 구원 (공의회 · 베드로)' },
      { id: 'p18', ch: 15, verse: 28, color: '#7c3aed', label: '성령과 우리 (공의회 결의)' },
      { id: 'p19', ch: 16, verse: 5,  color: '#059669', label: '요약 5 · 교회 믿음 굳어지고 수 증가' },
      { id: 'p20', ch: 16, verse: 31, color: '#dc2626', label: '주 예수를 믿으라 · 온 집이 구원 (빌립보 간수)' },
      { id: 'p21', ch: 17, verse: 31, color: '#dc2626', label: '아레오바고 · 부활로 확증 · 심판' },
      { id: 'p22', ch: 19, verse: 20, color: '#059669', label: '요약 6 · 주의 말씀 힘 있게 흥왕' },
      { id: 'p23', ch: 20, verse: 24, color: '#b45309', label: '내 달려갈 길 · 은혜의 복음 증거' },
      { id: 'p24', ch: 20, verse: 28, color: '#0891b2', label: '자기 피로 사신 교회 · 감독자 세우심' },
      { id: 'p25', ch: 22, verse: 21, color: '#6366f1', label: '내가 너를 이방인에게 보내리라 (재소환)' },
      { id: 'p26', ch: 26, verse: 18, color: '#eab308', label: '눈 뜨게 · 어둠에서 빛으로 · 사탄 권세에서 하나님께' },
      { id: 'p27', ch: 28, verse: 28, color: '#6366f1', label: '이 구원이 이방인에게 (마지막 연설)' },
      { id: 'p28', ch: 28, verse: 31, color: '#059669', label: '요약 7 (마지막) · 담대히 하나님 나라 · 아무 금지 없이' },
    ],
    arcs: [
      { id: 'a1',  from: 'p1',  to: 'p28', color: '#0369a1', label: '지리 프로그램(1:8) → 로마 성취(28:31) · 대주제 Inclusio' },
      { id: 'a2',  from: 'p2',  to: 'p12', color: '#7c3aed', label: '유대 오순절 → 이방 오순절 · 성령 확장' },
      { id: 'a3',  from: 'p2',  to: 'p3',  color: '#d97706', label: '성령 강림 → 응답(회개·세례)' },
      { id: 'a4',  from: 'p7',  to: 'p8',  color: '#b45309', label: '스데반 순교 → 큰 박해·흩어짐' },
      { id: 'a5',  from: 'p8',  to: 'p13', color: '#0891b2', label: '흩어짐 → 안디옥 이방 교회 · "그리스도인"' },
      { id: 'a6',  from: 'p9',  to: 'p25', color: '#eab308', label: '택한 그릇 → 이방인 파송 재소환' },
      { id: 'a7',  from: 'p9',  to: 'p26', color: '#eab308', label: '택한 그릇 → 아그립바 앞 세 번째 회심 증언' },
      { id: 'a8',  from: 'p11', to: 'p17', color: '#6366f1', label: '외모 취하지 아니하심 → 공의회 은혜 구원' },
      { id: 'a9',  from: 'p15', to: 'p23', color: '#b45309', label: '1차 선교 파송 → 밀레도 결론 (내 달려갈 길)' },
      { id: 'a10', from: 'p17', to: 'p18', color: '#7c3aed', label: '베드로 결정 → 성령과 우리 (공의회 신학)' },
      { id: 'a11', from: 'p1',  to: 'p16', color: '#6366f1', label: '지리 프로그램 → 이방의 빛 (사 49:6)' },
      { id: 'a12', from: 'p5',  to: 'p20', color: '#dc2626', label: '예수 이름 유일 구원 → 예수를 믿으라 (간수)' },
      { id: 'a13', from: 'p4',  to: 'p28', color: '#059669', label: '요약 축 · 첫 요약 → 마지막 요약 (말씀 진행 · 7개 패널)' },
      { id: 'a14', from: 'p11', to: 'p27', color: '#6366f1', label: '이방인 편입 시작 → 이방인에게 보내신 구원 (마지막)' },
    ],
  },
  // ── 비평장치: 본문 비평 특수 범위 (사도행전) ──────────────────────────────
  disputedRanges: [
    { ch: 8,  from: 37, to: 37, label: '내시 신앙고백 (일부 사본만 · Byz 소수 · P45 P74 ℵ A B C 부재 · 후대 삽입)' },
    { ch: 15, from: 34, to: 34, label: '실라 안디옥 잔류 (D 서방 본문 · P74 ℵ A B 부재)' },
    { ch: 24, from: 6,  to: 8,  label: '천부장 언급 (24:6b-8a · 서방 본문 확장 · 초기 사본 부재)' },
    { ch: 28, from: 29, to: 29, label: '유대인 격론 (Byz·서방 사본만 · P74 ℵ A B E 부재 · 후대 삽입)' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 레위기 (LEV_CTX) — 오경 중심 · 5제사·제사장·정결·대속죄일·거룩성 법전·희년·절기
// 구약학 표준: Wenham(NICOT) · Milgrom(Anchor 3권) · Hartley(WBC) · Levine(JPS) · Kiuchi(Apollos) · Nihan
// ═══════════════════════════════════════════════════════════════════════════
const LEV_STRUCTURAL_RULES = [
  { id: 'divine_speech', role: '여호와 말씀 정형구', icon: '📜', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'וַיְדַבֵּר יְהוָה אֶל־מֹשֶׁה', tr: '와예다베르 아도나이 엘-모세',
    desc: '"여호와께서 모세에게 일러 이르시되" — 레위기 구조 뼈대. 30회+ 반복 (1:1, 4:1, 5:14, 6:1 등). 제사장 규범 신적 계시 강조. Milgrom·Wenham 구조 분석.',
    match: (s) => s.has('H1696') && s.has('H3068') },
  { id: 'offering_torah', role: '5제사 규례 (עֹלָה·מִנְחָה·שְׁלָמִים·חַטָּאת·אָשָׁם)', icon: '🔥', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'קָרְבָּן', tr: '코르반',
    desc: '레위기 1-7장 다섯 제사: 번제(עֹלָה·1) · 소제(מִנְחָה·2) · 화목제(שְׁלָמִים·3) · 속죄제(חַטָּאת·4) · 속건제(אָשָׁם·5). Milgrom *Leviticus* 제사 신학 표준.',
    match: (s) => s.has('H5930') || s.has('H4503') || s.has('H8002') || s.has('H2403') || s.has('H0817') },
  { id: 'atonement', role: '속죄 (כִּפֻּר)', icon: '🕊️', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'כִּפֻּר', tr: '키푸르',
    desc: '"속죄하다·덮다" — 레위기 핵심 동사 · 4:20·5:6·16:30 등 60회+. 대속죄일(יוֹם כִּפֻּרִים·16장) 정점. Milgrom·Kiuchi 속죄 신학.',
    match: (s) => s.has('H3722') },
  { id: 'blood_life', role: '피 = 생명 (17:11 핵심)', icon: '🩸', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'כִּי־נֶפֶשׁ הַבָּשָׂר בַּדָּם', tr: '키-네페쉬 하바사르 바담',
    desc: '"육체의 생명은 피에 있음이라 내가 이 피를 너희에게 주어 제단에 뿌려 너희의 생명을 위하여 속죄하게 하였나니" (17:11) — 구약 속죄 신학 정점 · 신약 예수 피 연결. Milgrom.',
    match: (s) => s.has('H1818') },
  { id: 'priesthood', role: '제사장직 (כֹּהֵן)', icon: '👑', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'כֹּהֵן', tr: '코헨',
    desc: '"제사장" — 아론과 아들들 위임식(8장) · 제사장 규례(21-22장). 레위기 194회+. 성막·성전 예배 중보 체계. Nihan·Wenham.',
    match: (s) => s.has('H3548') },
  { id: 'purity_impurity', role: '정과 부정 (טָהוֹר / טָמֵא)', icon: '🧼', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'טָהוֹר / טָמֵא', tr: '타호르 / 타메',
    desc: '"정한 것과 부정한 것" — 음식(11) · 산모(12) · 나병(13-14) · 유출(15). 거룩 접근 조건. Milgrom *purity system* 표준 · Douglas 인류학.',
    match: (s) => s.has('H2891') || s.has('H2930') },
  { id: 'holiness', role: '거룩 (קָדוֹשׁ · Holiness Code)', icon: '✨', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'קְדֹשִׁים תִּהְיוּ כִּי קָדוֹשׁ אֲנִי יְהוָה', tr: '케도쉼 티흐유 키 카도쉬 아니 아도나이',
    desc: '"너희는 거룩하라 이는 나 여호와 너희 하나님이 거룩함이니라" (19:2) — 거룩성 법전(17-26장) 정점 · 레위기 대주제. Milgrom H-source · Knohl.',
    match: (s) => s.has('H6918') || s.has('H6942') },
  { id: 'sacred_calendar', role: '여호와의 절기 (מוֹעֵד · 23장)', icon: '📅', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'מוֹעֲדֵי יְהוָה', tr: '모아데 아도나이',
    desc: '"여호와의 절기" — 안식일·유월절·초실절·오순절·나팔절·속죄일·초막절 (23장). 이스라엘 성력 완전 명세. Wenham·Hartley 절기 신학.',
    match: (s) => s.has('H4150') },
  { id: 'azazel', role: '아사셀 · 광야 염소 (עֲזָאזֵל)', icon: '🐐', color: '#6366f1', bg: 'rgba(99,102,241,.13)',
    gr: 'עֲזָאזֵל', tr: '아자젤',
    desc: '대속죄일 두 염소 (16:8-22) · "아사셀을 위한 염소" 광야로 죄 짊어짐. 이름 해석 논쟁 (지명·악마·강력 제거). Milgrom·Levine 아사셀 3설.',
    match: (s) => s.has('H5799') },
  { id: 'jubilee_year', role: '희년 (יוֹבֵל · 25장)', icon: '🎺', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'יוֹבֵל', tr: '요벨',
    desc: '"오십년째 해를 거룩하게 하여 그 땅에 있는 모든 자에게 자유를 공포하라" (25:10) — 50년마다 자유·기업 회복. 예수 나사렛 선언(눅 4) 배경. Ringe.',
    match: (s) => s.has('H3104') },
  { id: 'neighbor_love', role: '이웃 사랑 (19:18)', icon: '❤️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'וְאָהַבְתָּ לְרֵעֲךָ כָּמוֹךָ', tr: '베아하브타 레레아카 카모카',
    desc: '"네 이웃 사랑하기를 네 자신과 같이 하라" (19:18) — 구약 사랑 계명 정점. 예수 두 큰 계명 인용 (마 22:39). 19:34 이방인까지 확장. Milgrom.',
    match: (s) => s.has('H0157') && s.has('H7453') },
  { id: 'blessing_curse', role: '축복과 저주 (26장 언약)', icon: '⚖️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'בְּרָכָה / קְלָלָה', tr: '베라카 / 케랄라',
    desc: '"순종하면 축복 · 청종하지 않으면 저주" (26장) — 신 27-28장 병행. 언약 유지·파기 결과 명시. 시내산 언약 결론. Wenham·Hartley 언약 신학.',
    match: (s) => s.has('H1288') || s.has('H7043') },
];

// 레위기 수동 담화 주석: 5제사·대속죄일·거룩·이웃 사랑·희년·절기 결정 지점
const LEV_MANUAL_DISCOURSE = {
  '1:1':   'divine_speech',         // 여호와께서 회막에서 모세를 부르시고 이르시되 (책 시작)
  '1:4':   'atonement',             // 안수하라 · 그를 위해 속죄
  '1:9':   'offering_torah',        // 향기로운 냄새의 화제라 (번제 완성)
  '2:1':   'offering_torah',        // 소제 (מִנְחָה) 규례
  '3:1':   'offering_torah',        // 화목제 (שְׁלָמִים) 규례
  '4:3':   'priesthood',            // 기름부음 받은 제사장이 범죄
  '4:20':  'atonement',             // 그를 위해 속죄한즉 사함을 얻으리라
  '5:1':   'offering_torah',        // 속건제 (אָשָׁם) 규례 시작
  '5:5':   'atonement',             // 죄를 자백하고
  '6:9':   'offering_torah',        // 번제단 위에 밤새도록 · 불이 꺼지지 않게
  '7:26':  'blood_life',            // 피를 먹지 말라 (피 규례)
  '8:12':  'priesthood',            // 관유를 아론의 머리에 붓고 (위임식)
  '8:33':  'priesthood',            // 위임식 7일
  '9:6':   'divine_speech',         // 이는 여호와께서 명령하신 것 (첫 제사)
  '9:24':  'divine_speech',         // 여호와 앞에서 불이 나와 (임재)
  '10:1':  'priesthood',            // 나답 아비후 · 여호와께서 명하지 않으신 다른 불
  '10:3':  'holiness',              // 나를 가까이 하는 자 중에 · 내가 거룩하다 함을 얻겠고
  '10:10': 'purity_impurity',       // 거룩과 속됨·부정과 정한 것 분별 (제사장 사명)
  '11:44': 'holiness',              // 너희도 거룩할지어다 (거룩 명령 첫 등장)
  '11:45': 'holiness',              // 나는 여호와니라 (출애굽 인용)
  '12:2':  'purity_impurity',       // 산모 정결
  '13:2':  'purity_impurity',       // 나병 진단 시작
  '14:2':  'purity_impurity',       // 나병 정결례
  '15:2':  'purity_impurity',       // 유출병 정결
  '16:2':  'atonement',             // 지성소에 아무 때나 들어오지 말라 · 죽지 아니하리라
  '16:8':  'azazel',                // 두 염소를 위해 제비 · 여호와 몫·아사셀 몫
  '16:10': 'azazel',                // 아사셀을 위한 염소 · 광야로 보낼지니
  '16:22': 'azazel',                // 그 염소가 그들의 모든 불의를 지고 · 광야로
  '16:30': 'atonement',             // 이 날에 너희를 위하여 속죄
  '16:34': 'atonement',             // 매년 한 번 (대속죄일 영원한 규례)
  '17:11': 'blood_life',            // 육체의 생명은 피에 있음이라 · 속죄
  '17:14': 'blood_life',            // 모든 생물의 생명은 피
  '18:5':  'holiness',              // 사람이 준행하면 그로 인하여 살리라
  '19:2':  'holiness',              // 너희는 거룩하라 (거룩성 법전 정점)
  '19:9':  'neighbor_love',         // 밭 모퉁이 · 가난한 자·이방인
  '19:18': 'neighbor_love',         // 네 이웃 사랑하기를 네 자신과 같이
  '19:34': 'neighbor_love',         // 이방인을 네 자신과 같이 사랑
  '20:7':  'holiness',              // 스스로 거룩하게 하여
  '20:26': 'holiness',              // 너희는 나에게 거룩할지어다
  '21:6':  'priesthood',            // 제사장은 그 하나님께 대해 거룩하고
  '22:32': 'holiness',              // 내 거룩한 이름을 욕되게 하지 말라
  '23:3':  'sacred_calendar',       // 안식일 (여섯 날 일하고 일곱째 안식)
  '23:5':  'sacred_calendar',       // 유월절
  '23:15': 'sacred_calendar',       // 오순절 (칠 안식 후 오십일)
  '23:24': 'sacred_calendar',       // 나팔절
  '23:27': 'sacred_calendar',       // 대속죄일
  '23:34': 'sacred_calendar',       // 초막절
  '24:16': 'holiness',              // 여호와의 이름을 훼방한 자
  '25:10': 'jubilee_year',          // 오십년째 해 · 자유를 공포하라
  '25:23': 'jubilee_year',          // 이 땅은 다 내 것 (하나님 소유)
  '25:38': 'jubilee_year',          // 애굽 땅에서 인도한 여호와
  '26:3':  'blessing_curse',        // 내 규례를 준행하면 (축복 시작)
  '26:12': 'blessing_curse',        // 나는 너희 중에 행하여 너희 하나님이 되고 (임재 언약)
  '26:14': 'blessing_curse',        // 청종치 않으면 (저주 시작)
  '26:42': 'blessing_curse',        // 야곱·이삭·아브라함과의 언약을 기억
  '27:30': 'offering_torah',        // 십일조는 여호와의 것
  '27:34': 'divine_speech',         // 이것이 규례이니라 (책 결론)
};

export const LEV_CTX = {
  id: 'Lev',
  book: { ko: '레위기', bollsNum: 3, lexId: 'Lev', lexCorpus: 'hot', en: 'Leviticus', testament: 'OT' },
  chapters: 27,
  discourseRules: [...HEBREW_NARRATIVE_RULES, ...LEV_STRUCTURAL_RULES],
  manualDiscourse: LEV_MANUAL_DISCOURSE,
  theoTerms: HEBREW_OT_THEO_TERMS,
  meta: {
    genre: '구약 · 오경 (Torah) · 제사장 문서 (P source)',
    genreNote: '오경 중심 위치 · 시내산 언약의 예배·거룩 규범 · 서사 없이 규범 위주 (예외: 10장 나답 아비후, 24:10 신성모독)',
    year: '내러티브 시점: 출애굽 2년째 (BC 1446년경 전통) · 최종 편집 후대',
    yearNote: '전통: 모세 저작 · 비평학: P 문서 (포로기·포로 이후 편집 · Wellhausen). 텍스트 안정성 매우 높음',
    place: '시내산 회막 (출애굽 광야)',
    placeNote: '레위기 전체가 시내산 회막 계시 (1:1 · 27:34) · 지리적 이동 없음',
    author: '모세 (전통) · P 문서 편집자 (현대 비평)',
    authorNote: 'Milgrom: 구약 자료 중 가장 잘 보존된 신학 체계 · Nihan: H(거룩성)와 P(제사장) 통합',
    audience: '광야 이스라엘 (시내산 언약 공동체) · 이후 성전 시대 제사장·백성',
    audienceNote: '제사장·레위인 실무 규범 + 백성 거룩 훈련 · 히브리 정경 명칭 "와이크라"(그가 부르셨다·1:1 첫 단어)',
    theme: '거룩·속죄·임재 · 여호와께 가까이 나아감',
    themeNote: '핵심 삼중 축: 제사(속죄) · 정결(구분) · 거룩(모방). "나는 거룩하니 너희도 거룩할지어다" (11:44·19:2)',
    chapterAgenda: {
      1:  '번제 (עֹלָה) 규례 · 소·양·염소·비둘기',
      2:  '소제 (מִנְחָה) 규례 · 고운 가루·유향·기름·소금',
      3:  '화목제 (שְׁלָמִים) 규례 · 소·양·염소',
      4:  '속죄제 (חַטָּאת) 규례 · 대제사장·회중·족장·평민 구분',
      5:  '속건제 (אָשָׁם) 규례 시작 · 죄를 자백',
      6:  '번제·소제·속죄제 추가 규례 · 제사장 몫 (계속 태우는 불)',
      7:  '속건제·화목제 마무리 · 피와 기름 금지 (제사 총결)',
      8:  '아론과 아들들 위임식 · 관유·성별·7일 격리',
      9:  '위임 8일째 첫 제사 · 여호와의 영광이 나타나 · 불이 제단에서',
      10: '나답과 아비후 (다른 불 · 죽음) · 제사장 삶 규례 강화',
      11: '음식법 · 정결/부정한 짐승 (육상·수생·공중·기는 것)',
      12: '산모 정결례 (남아 7일·여아 14일 후 정결)',
      13: '나병 (צָרַעַת) 진단 규례 · 피부·의복',
      14: '나병자·나병 든 집 정결례 (물·향백나무·우슬초)',
      15: '유출병 정결 (남·녀·부부)',
      16: '대속죄일 (יוֹם כִּפֻּרִים) · 지성소·두 염소·아사셀·영원한 규례',
      17: '피 규례 · 육체의 생명은 피에 · 우상 제사 금지',
      18: '성적 부정 금지 · 애굽·가나안 관습 배격',
      19: '거룩성 법전 정점 · 이웃 사랑(19:18)·이방인 사랑(19:34)',
      20: '형벌 규정 (도덕·성적 죄) · 스스로 거룩하게',
      21: '제사장 거룩 규례 · 흠 있는 제사장',
      22: '성물 규례 · 흠 있는 제물 금지 · 거룩한 이름',
      23: '여호와의 절기 (안식일·유월절·초실절·오순절·나팔절·속죄일·초막절)',
      24: '성막 등불·진설병 · 신성모독 처벌 사례',
      25: '안식년·희년 (יוֹבֵל) · 땅은 하나님 것 · 자유 공포',
      26: '순종하면 축복 · 청종치 않으면 저주 · 언약 기억',
      27: '서원·십일조 규례 · 결론 (이것이 규례이니라)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1,  toCh: 7,  color: '#dc2626', label: '다섯 제사 규례 (제사 토라)' },
      { id: 's2', fromCh: 8,  toCh: 10, color: '#7c3aed', label: '제사장 위임·첫 제사 (나답 아비후)' },
      { id: 's3', fromCh: 11, toCh: 15, color: '#059669', label: '정결 규례 (음식·산모·나병·유출)' },
      { id: 's4', fromCh: 16, toCh: 16, color: '#0891b2', label: '대속죄일 (중심 신학)' },
      { id: 's5', fromCh: 17, toCh: 26, color: '#0369a1', label: '거룩성 법전 (Holiness Code · 이웃 사랑·희년·언약)' },
      { id: 's6', fromCh: 27, toCh: 27, color: '#b45309', label: '서원·십일조 부록' },
    ],
    pivots: [
      { id: 'p1',  ch: 1,  verse: 1,  color: '#7c3aed', label: '여호와께서 회막에서 모세를 부르시고 (책 시작)' },
      { id: 'p2',  ch: 1,  verse: 9,  color: '#dc2626', label: '향기로운 냄새 화제 (번제 완성)' },
      { id: 'p3',  ch: 4,  verse: 20, color: '#0891b2', label: '속죄한즉 사함을 얻으리라 (속죄 첫 등장)' },
      { id: 'p4',  ch: 8,  verse: 12, color: '#7c3aed', label: '관유를 아론의 머리에 부어 (위임식)' },
      { id: 'p5',  ch: 9,  verse: 24, color: '#7c3aed', label: '여호와 앞에서 불이 나와 (첫 제사 응답)' },
      { id: 'p6',  ch: 10, verse: 1,  color: '#dc2626', label: '나답과 아비후 다른 불' },
      { id: 'p7',  ch: 10, verse: 10, color: '#059669', label: '거룩과 속됨·부정과 정한 것 분별' },
      { id: 'p8',  ch: 11, verse: 44, color: '#0369a1', label: '너희도 거룩할지어다 (거룩 예고)' },
      { id: 'p9',  ch: 16, verse: 2,  color: '#0891b2', label: '지성소 (대속죄일 시작)' },
      { id: 'p10', ch: 16, verse: 8,  color: '#6366f1', label: '아사셀 (עֲזָאזֵל) 제비' },
      { id: 'p11', ch: 16, verse: 22, color: '#6366f1', label: '아사셀 광야로 (죄 전가)' },
      { id: 'p12', ch: 16, verse: 30, color: '#0891b2', label: '이 날에 너희를 위하여 속죄' },
      { id: 'p13', ch: 17, verse: 11, color: '#dc2626', label: '육체의 생명은 피에 있음이라' },
      { id: 'p14', ch: 18, verse: 5,  color: '#0369a1', label: '준행하면 그로 인하여 살리라' },
      { id: 'p15', ch: 19, verse: 2,  color: '#0369a1', label: '너희는 거룩하라 (거룩성 법전 정점)' },
      { id: 'p16', ch: 19, verse: 18, color: '#dc2626', label: '네 이웃 사랑하기를 네 자신과 같이' },
      { id: 'p17', ch: 19, verse: 34, color: '#dc2626', label: '이방인을 네 자신과 같이 사랑' },
      { id: 'p18', ch: 20, verse: 26, color: '#0369a1', label: '너희는 나에게 거룩할지어다' },
      { id: 'p19', ch: 22, verse: 32, color: '#0369a1', label: '내 거룩한 이름' },
      { id: 'p20', ch: 23, verse: 3,  color: '#b45309', label: '안식일 (절기 서두)' },
      { id: 'p21', ch: 23, verse: 5,  color: '#b45309', label: '유월절' },
      { id: 'p22', ch: 23, verse: 24, color: '#b45309', label: '나팔절' },
      { id: 'p23', ch: 23, verse: 27, color: '#0891b2', label: '대속죄일 (절기 명세)' },
      { id: 'p24', ch: 23, verse: 34, color: '#b45309', label: '초막절' },
      { id: 'p25', ch: 25, verse: 10, color: '#059669', label: '희년 (יוֹבֵל) · 자유를 공포' },
      { id: 'p26', ch: 25, verse: 23, color: '#059669', label: '이 땅은 다 내 것 (하나님 소유)' },
      { id: 'p27', ch: 26, verse: 12, color: '#7c3aed', label: '나는 너희 중에 행하여 (임재 언약)' },
      { id: 'p28', ch: 26, verse: 42, color: '#b45309', label: '아브라함·이삭·야곱과의 언약 기억' },
      { id: 'p29', ch: 27, verse: 30, color: '#dc2626', label: '십일조는 여호와의 것' },
      { id: 'p30', ch: 27, verse: 34, color: '#7c3aed', label: '이것이 규례이니라 (책 결론)' },
    ],
    arcs: [
      { id: 'a1',  from: 'p1',  to: 'p30', color: '#7c3aed', label: '여호와 부르심 → 규례 결론 (책 전체)' },
      { id: 'a2',  from: 'p3',  to: 'p12', color: '#0891b2', label: '속죄 첫 등장 → 대속죄일 완성' },
      { id: 'a3',  from: 'p4',  to: 'p6',  color: '#7c3aed', label: '위임 → 나답 아비후 (제사장 신성 경계)' },
      { id: 'a4',  from: 'p5',  to: 'p11', color: '#dc2626', label: '첫 제사 불 → 아사셀 광야 (죄 처리)' },
      { id: 'a5',  from: 'p8',  to: 'p15', color: '#0369a1', label: '거룩 예고(11:44) → 거룩성 법전 정점(19:2)' },
      { id: 'a6',  from: 'p9',  to: 'p12', color: '#0891b2', label: '대속죄일 내부 축 (지성소 → 속죄 성취)' },
      { id: 'a7',  from: 'p15', to: 'p19', color: '#0369a1', label: '19:2 거룩 → 22:32 거룩한 이름 (H-source)' },
      { id: 'a8',  from: 'p16', to: 'p17', color: '#dc2626', label: '이웃 사랑 → 이방인 사랑 (사랑 확장)' },
      { id: 'a9',  from: 'p13', to: 'p27', color: '#dc2626', label: '피=생명 → 임재 언약 (구속·임재)' },
      { id: 'a10', from: 'p14', to: 'p15', color: '#0369a1', label: '준행하면 살리라 → 거룩 (율법·생명)' },
      { id: 'a11', from: 'p20', to: 'p24', color: '#b45309', label: '안식일 → 초막절 (절기 축)' },
      { id: 'a12', from: 'p25', to: 'p28', color: '#059669', label: '희년 → 언약 기억 (땅·아브라함 언약)' },
      { id: 'a13', from: 'p7',  to: 'p11', color: '#059669', label: '거룩·속됨 구분 → 아사셀 광야 (분리 신학)' },
      { id: 'a14', from: 'p8',  to: 'p27', color: '#0369a1', label: '거룩 예고 → 임재 (거룩=임재 조건)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 갈라디아서 (GAL_CTX) — 바울 초기 서신 · 이신칭의·자유·성령·율법에서 해방
// 신약학 표준: Betz(Hermeneia) · Longenecker(WBC) · Bruce(NIGTC) · Moo(BECNT) · Martyn(AB) · Dunn(BNTC) · Schreiner(ZECNT) · deSilva(NICNT) · Silva(BECNT lex)
// ═══════════════════════════════════════════════════════════════════════════

const GAL_STRUCTURAL_RULES = [
  { id: 'justification_faith', role: '이신칭의 (δικαιόω ἐκ πίστεως)', icon: '⚖️', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'δικαιοῦται ἐκ πίστεως', tr: '디카이우타이 에크 피스테오스',
    desc: '"사람이 의롭게 되는 것은 율법의 행위로 말미암음이 아니요 오직 예수 그리스도를 믿음으로 말미암는 줄 앎이라" (2:16) — 갈라디아서 심장 · 종교개혁 정식. Bruce·Moo·Schreiner·Dunn NPP 논쟁.',
    match: (s) => s.has('G1344') && s.has('G4102') },
  { id: 'law_works', role: '율법의 행위 (ἔργα νόμου)', icon: '📜', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'ἔργα νόμου', tr: '에르가 노무',
    desc: '"율법의 행위" — 갈라디아서 6회 (2:16 3회 · 3:2·3:5·3:10). 전통(도덕 행위) vs NPP(할례·안식일·정결법 = 유대 정체성 표지 · Dunn·Wright). Sanders·Moo 반박.',
    match: (s) => s.has('G2041') && s.has('G3551') },
  { id: 'spirit_flesh', role: '성령 vs 육체 (πνεῦμα vs σάρξ)', icon: '🕊️', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'πνεύματι περιπατεῖτε', tr: '프뉴마티 페리파테이테',
    desc: '"성령을 따라 행하라 · 육체의 욕심을 이루지 아니하리라" (5:16) — 5-6장 윤리 대립축. 성령 vs 육체 이원 대립. Fee 성령론 · Martyn 묵시론 해석.',
    match: (s) => s.has('G4151') && s.has('G4561') },
  { id: 'freedom_liberty', role: '자유 (ἐλευθερία)', icon: '🔓', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'τῇ ἐλευθερίᾳ ἡμᾶς Χριστὸς ἠλευθέρωσεν', tr: '테 엘류테리아 헤마스 크리스토스 엘류테로센',
    desc: '"그리스도께서 우리를 자유롭게 하려고 자유를 주셨으니" (5:1) — 갈라디아서 대주제어 (11회 · 신약 최다권). 종의 멍에 아님 · Betz·Longenecker "카르타 마그나".',
    match: (s) => s.has('G1657') || s.has('G1659') },
  { id: 'cross_crucified', role: '십자가 (σταυρός · συνεσταύρωμαι)', icon: '✝️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'Χριστῷ συνεσταύρωμαι', tr: '크리스토 쉬네스타우로마이',
    desc: '"내가 그리스도와 함께 십자가에 못 박혔나니" (2:20) · "그리스도의 십자가 외에는 자랑할 것이 없으니" (6:14). Käsemann·Martyn 십자가 신학.',
    match: (s) => s.has('G4716') || s.has('G4957') },
  { id: 'curse_of_law', role: '율법의 저주 · 대속 저주', icon: '⚡', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'κατάρα τοῦ νόμου', tr: '카타라 투 노무',
    desc: '"우리를 위하여 저주가 되사 · 율법의 저주에서 우리를 속량하셨으니" (3:13 · 신 21:23 인용). 대속 신학 · Cranfield·Wright·Moo.',
    match: (s) => s.has('G2671') || s.has('G1943') },
  { id: 'abraham_seed', role: '아브라함의 씨 (σπέρμα Ἀβραάμ)', icon: '🌱', color: '#eab308', bg: 'rgba(234,179,8,.14)',
    gr: 'σπέρμα Ἀβραάμ', tr: '스페르마 아브라암',
    desc: '"믿음으로 말미암은 자들은 아브라함의 자손인 줄 알지어다" (3:7) · "아브라함의 씨"는 단수 = 그리스도 (3:16). Betz·Longenecker·Wright 성경 신학.',
    match: (s) => s.has('G4690') && s.has('G0011') },
  { id: 'sons_adoption', role: '아들 됨·양자 (υἱοθεσία)', icon: '👶', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'υἱοθεσία · Ἀββα ὁ πατήρ', tr: '휘오테시아 · 압바 호 파테르',
    desc: '"때가 차매 하나님이 그 아들을 보내사 · 아들의 명분을 얻게 하려 하심이라" (4:4-5) · "압바 아버지"(4:6). 양자 됨 신학 · Burke·Scott·Dunn.',
    match: (s) => s.has('G5206') || (s.has('G0005') && s.has('G3962')) },
  { id: 'spirit_fruit', role: '성령의 열매 (καρπὸς τοῦ πνεύματος)', icon: '🍇', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'καρπὸς τοῦ πνεύματος', tr: '카르포스 투 프뉴마토스',
    desc: '"성령의 열매는 사랑·희락·화평·오래 참음·자비·양선·충성·온유·절제니" (5:22-23) — 9가지. 육체의 일 (5:19-21) 대조. Barclay·Fee.',
    match: (s) => s.has('G2590') && s.has('G4151') },
  { id: 'galatians_folly', role: '갈라디아 어리석음 (ὦ ἀνόητοι Γαλάται)', icon: '❗', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ὦ ἀνόητοι Γαλάται', tr: '오 아노에토이 갈라타이',
    desc: '"어리석도다 갈라디아 사람들아 · 누가 너희를 꾀더냐" (3:1) — 바울 격정적 책망. 성령으로 시작 → 육체로 마치려 하는가 (3:3). Betz 수사학·Martyn 묵시.',
    match: (s) => s.has('G0453') && s.has('G1052') },
  { id: 'no_partial_gospel', role: '다른 복음 저주 (ἀνάθεμα)', icon: '⛔', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἀνάθεμα ἔστω', tr: '아나테마 에스토',
    desc: '"다른 복음을 전하면 저주를 받을지어다" (1:8-9 반복) — 갈라디아서 서두 문제 진술. 유대주의자 대적 · Betz 편지 형식 이례적 (감사 생략).',
    match: (s) => s.has('G0331') },
  { id: 'new_creation', role: '새로 지음 받은 자 (καινὴ κτίσις)', icon: '🌱', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'καινὴ κτίσις', tr: '카이네 크티시스',
    desc: '"할례나 무할례가 아무것도 아니로되 오직 새로 지음 받는 것만이 중요하니라" (6:15). 종말론적 새 창조 · Martyn 묵시·Wright.',
    match: (s) => s.has('G2537') && s.has('G2937') },
  { id: 'antioch_incident', role: '안디옥 사건 (베드로 대면)', icon: '⚔️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'κατὰ πρόσωπον αὐτῷ ἀντέστην', tr: '카타 프로소폰 아우토 안테스텐',
    desc: '"내가 그를 면대하여 책망하였노라" (2:11) — 갈 2:11-14 안디옥 사건. 이방·유대 식탁 교제 문제 · 이신칭의 실천적 근거. Bruce·Dunn·Bauckham 재구성.',
    match: null },
  { id: 'faith_working_love', role: '사랑으로 역사하는 믿음', icon: '❤️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'πίστις διʼ ἀγάπης ἐνεργουμένη', tr: '피스티스 디 아가페스 에네르구메네',
    desc: '"그리스도 예수 안에서는 할례나 무할례가 효력이 없되 사랑으로써 역사하는 믿음뿐이니라" (5:6). 야고보 vs 바울 화해 지점 · Luther·Calvin.',
    match: (s) => s.has('G4102') && s.has('G0026') },
];

const GAL_MANUAL_DISCOURSE = {
  '1:6':   'no_partial_gospel',       // 다른 복음 좇음 · 이상히 여기노라
  '1:8':   'no_partial_gospel',       // 다른 복음 전하면 저주
  '1:9':   'no_partial_gospel',       // 저주 재선언
  '1:12':  'freedom_liberty',         // 사람에게 받은 것도 아니요 · 계시로
  '1:16':  'freedom_liberty',         // 이방에 그를 전하기 위하여
  '2:11':  'antioch_incident',        // 안디옥에서 · 게바를 면대하여 책망
  '2:14':  'antioch_incident',        // 복음의 진리를 따라 바로 행하지 아니함
  '2:16':  'justification_faith',     // 이신칭의 정식 (율법 행위 아님)
  '2:20':  'cross_crucified',         // 그리스도와 함께 십자가에 못 박혔나니
  '3:1':   'galatians_folly',         // 어리석도다 갈라디아 사람들아
  '3:2':   'spirit_flesh',            // 성령을 받은 것이 율법의 행위로냐 · 믿음으로냐
  '3:5':   'spirit_flesh',            // 성령 주시고 능력 행하시는 이가
  '3:6':   'abraham_seed',            // 아브라함이 하나님을 믿으매 (창 15:6)
  '3:7':   'abraham_seed',            // 믿음으로 말미암은 자들 · 아브라함의 자손
  '3:10':  'curse_of_law',            // 율법 책에 기록된 대로 저주 아래
  '3:11':  'justification_faith',     // 의인은 믿음으로 살리라 (합 2:4)
  '3:13':  'curse_of_law',            // 우리를 위하여 저주가 되사 (신 21:23)
  '3:16':  'abraham_seed',            // 아브라함의 씨 = 단수 = 그리스도
  '3:22':  'justification_faith',     // 성경이 모든 것을 죄 아래 가두었으니
  '3:24':  'law_works',               // 율법이 그리스도께로 인도하는 초등교사
  '3:26':  'sons_adoption',           // 너희가 다 믿음으로 말미암아 하나님의 아들
  '3:28':  'sons_adoption',           // 유대인·헬라인·종·자유인·남자·여자 하나
  '4:4':   'sons_adoption',           // 때가 차매 하나님이 아들을 보내사
  '4:6':   'sons_adoption',           // 압바 아버지
  '4:9':   'freedom_liberty',         // 어찌하여 다시 초등학문으로 돌아가려
  '5:1':   'freedom_liberty',         // 자유를 주셨으니 · 종의 멍에 X
  '5:2':   'law_works',               // 만일 할례를 받으면 · 그리스도 무익
  '5:4':   'justification_faith',     // 율법 안에서 의롭다 함을 얻으려 하는 자
  '5:6':   'faith_working_love',      // 사랑으로 역사하는 믿음
  '5:11':  'cross_crucified',         // 십자가의 걸림돌 (σκάνδαλον)
  '5:13':  'freedom_liberty',         // 자유를 육체의 기회 삼지 말고
  '5:14':  'faith_working_love',      // 온 율법 · 이웃 사랑
  '5:16':  'spirit_flesh',            // 성령을 따라 행하라 · 육체 욕심 이루지 아니
  '5:19':  'spirit_flesh',            // 육체의 일 (15가지)
  '5:22':  'spirit_fruit',            // 성령의 열매 9가지
  '5:24':  'cross_crucified',         // 그리스도의 사람들은 육체와 정욕을 못 박음
  '5:25':  'spirit_flesh',            // 성령으로 살면 또한 성령으로 행할지니
  '6:2':   'faith_working_love',      // 짐을 서로 지라 · 그리스도의 법
  '6:7':   'spirit_flesh',            // 사람이 무엇으로 심든지 그대로 거두리라
  '6:8':   'spirit_flesh',            // 육체를 위하여 심는 자·성령을 위하여 심는 자
  '6:14':  'cross_crucified',         // 자랑할 것은 십자가 뿐 · 세상이 못 박히고
  '6:15':  'new_creation',            // 새로 지음 받는 것만이 중요
  '6:17':  'cross_crucified',         // 내 몸에 예수의 흔적을 가졌노라 (στίγματα)
};

export const GAL_CTX = {
  id: 'Gal',
  book: { ko: '갈라디아서', bollsNum: 48, lexId: 'Gal', lexCorpus: 'gnt', en: 'Galatians', testament: 'NT' },
  chapters: 6,
  discourseRules: [...GNT_DISCOURSE_RULES, ...GAL_STRUCTURAL_RULES],
  manualDiscourse: GAL_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신 · 바울 초기 서신',
    genreNote: '논쟁적 서신 (감사 부분 생략 · 갈 1:6 즉시 문제 제기 · Betz "사법적 수사" 대 Longenecker "심의적")',
    year: 'AD 48-49 (남갈라디아설·이른 연대) 또는 AD 55 (북갈라디아설·늦은 연대)',
    yearNote: '남갈라디아설: 예루살렘 공의회 이전 · Bruce·Longenecker·Witherington. 북갈라디아설: 3차 여행 중 · Betz·Martyn·Lightfoot',
    place: '안디옥 (남갈라디아설) 또는 에베소/마게도냐 (북갈라디아설)',
    placeNote: '남갈라디아설(이른 연대)이면 안디옥에서 · 북갈라디아설이면 3차 여행 중 아시아·마게도냐 어느 지점',
    author: '바울 (친서 · 논쟁 없음 · 7 홈로고우메나 중 하나)',
    authorNote: '전 학계 만장 · 갈 1:1 · 5:2 · 6:11 (큰 글자로 친필 서명) · 자서전 1-2장',
    audience: '갈라디아 지역 여러 교회 (남갈라디아: 비시디아 안디옥·이고니온·루스드라·더베 · 1차 선교 개척)',
    audienceNote: '유대주의자(Judaizers) 침투 · 이방인 신자에게 할례·유대 율법 강요 · 갈 1:6 "속히 이르는 다른 복음"',
    theme: '이신칭의 · 성령의 자유 · 율법에서 해방 · 새 창조',
    themeNote: '중심 진술 (2:16 이신칭의) · 자유 (5:1 카르타 마그나) · 성령 vs 육체 (5:16) · 새 창조 (6:15) 4중 축',
    chapterAgenda: {
      1: '서문 · 다른 복음 저주(1:6-9)·바울 사도직 변호(사람 아닌 계시로 받음)·회심 후 아라비아·다메섹',
      2: '예루살렘 방문 (14년 후·야고보·게바·요한 악수)·안디옥 사건 (베드로 대면·2:11-14)·이신칭의 정식(2:16)·그리스도와 함께 십자가(2:20)',
      3: '어리석도다 갈라디아(3:1)·성령 vs 율법(3:2-5)·아브라함 믿음(3:6-9)·율법의 저주 대속(3:13)·아브라함 씨=그리스도(3:16)·초등교사(3:24)·유대·헬라·남·여 하나(3:28)',
      4: '때가 차매 아들 보내심·양자 됨·압바 아버지(4:4-7)·사라·하갈 알레고리(4:21-31)·두 언약·시내산 vs 예루살렘',
      5: '자유 카르타 마그나(5:1)·할례 받으면 그리스도 무익(5:2-4)·사랑으로 역사하는 믿음(5:6)·성령 따라 행하라(5:16)·육체의 일 15가지·성령의 열매 9가지(5:22-23)',
      6: '짐 서로 지라(6:2)·심는 대로 거둠(6:7-8)·큰 글자 친필(6:11)·자랑할 것은 십자가(6:14)·새 창조(6:15)·예수의 흔적(6:17)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 2, color: '#b45309', label: '자서전 · 사도직 변호 · 예루살렘·안디옥' },
      { id: 's2', fromCh: 3, toCh: 4, color: '#0369a1', label: '신학 논증 · 이신칭의·아브라함·양자 됨' },
      { id: 's3', fromCh: 5, toCh: 6, color: '#059669', label: '윤리 적용 · 자유·성령·새 창조' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 8,  color: '#dc2626', label: '다른 복음 저주 (ἀνάθεμα)' },
      { id: 'p2',  ch: 1, verse: 12, color: '#7c3aed', label: '계시로 받음 (사람으로부터 아님)' },
      { id: 'p3',  ch: 2, verse: 11, color: '#b45309', label: '안디옥 사건 · 게바 면대 책망' },
      { id: 'p4',  ch: 2, verse: 16, color: '#0369a1', label: '이신칭의 정식 (율법 행위 아님)' },
      { id: 'p5',  ch: 2, verse: 20, color: '#dc2626', label: '그리스도와 함께 십자가에 못 박혔나니' },
      { id: 'p6',  ch: 3, verse: 1,  color: '#dc2626', label: '어리석도다 갈라디아 사람들아' },
      { id: 'p7',  ch: 3, verse: 6,  color: '#eab308', label: '아브라함 · 믿음이 의로 여겨짐' },
      { id: 'p8',  ch: 3, verse: 11, color: '#0369a1', label: '의인은 믿음으로 살리라 (합 2:4)' },
      { id: 'p9',  ch: 3, verse: 13, color: '#dc2626', label: '우리를 위하여 저주가 되사 (대속)' },
      { id: 'p10', ch: 3, verse: 16, color: '#eab308', label: '아브라함의 씨 = 그리스도 (단수)' },
      { id: 'p11', ch: 3, verse: 28, color: '#0891b2', label: '유대·헬라·종·자유·남·여 하나' },
      { id: 'p12', ch: 4, verse: 4,  color: '#0891b2', label: '때가 차매 아들 보내심' },
      { id: 'p13', ch: 4, verse: 6,  color: '#0891b2', label: '압바 아버지 (성령의 아들 인장)' },
      { id: 'p14', ch: 5, verse: 1,  color: '#059669', label: '자유 · 종의 멍에 X (카르타 마그나)' },
      { id: 'p15', ch: 5, verse: 6,  color: '#dc2626', label: '사랑으로 역사하는 믿음' },
      { id: 'p16', ch: 5, verse: 14, color: '#dc2626', label: '온 율법 · 이웃 사랑' },
      { id: 'p17', ch: 5, verse: 16, color: '#7c3aed', label: '성령을 따라 행하라 · 육체 욕심 이루지 아니' },
      { id: 'p18', ch: 5, verse: 22, color: '#059669', label: '성령의 열매 9가지' },
      { id: 'p19', ch: 6, verse: 2,  color: '#dc2626', label: '짐을 서로 지라 · 그리스도의 법' },
      { id: 'p20', ch: 6, verse: 14, color: '#dc2626', label: '자랑할 것은 십자가 뿐' },
      { id: 'p21', ch: 6, verse: 15, color: '#059669', label: '새로 지음 받는 것만이 중요 (새 창조)' },
      { id: 'p22', ch: 6, verse: 17, color: '#dc2626', label: '내 몸에 예수의 흔적 (στίγματα)' },
    ],
    arcs: [
      { id: 'a1',  from: 'p1',  to: 'p4',  color: '#dc2626', label: '다른 복음 저주 → 이신칭의 (문제 → 해답)' },
      { id: 'a2',  from: 'p4',  to: 'p14', color: '#0369a1', label: '이신칭의 → 자유 (의롭게 됨의 결과)' },
      { id: 'a3',  from: 'p5',  to: 'p20', color: '#dc2626', label: '2:20 십자가 → 6:14 십자가 자랑 (Inclusio)' },
      { id: 'a4',  from: 'p7',  to: 'p10', color: '#eab308', label: '아브라함 믿음 → 씨=그리스도 (성경 신학)' },
      { id: 'a5',  from: 'p9',  to: 'p12', color: '#0891b2', label: '저주 대속 → 아들 보내심·양자' },
      { id: 'a6',  from: 'p12', to: 'p13', color: '#0891b2', label: '아들 보내심 → 압바 아버지 (양자 신학)' },
      { id: 'a7',  from: 'p11', to: 'p14', color: '#059669', label: '하나 됨 → 자유 (신분·해방)' },
      { id: 'a8',  from: 'p14', to: 'p17', color: '#7c3aed', label: '자유 → 성령 따라 행함 (자유의 실체)' },
      { id: 'a9',  from: 'p15', to: 'p16', color: '#dc2626', label: '사랑 역사 믿음 → 이웃 사랑 (자유의 목적)' },
      { id: 'a10', from: 'p17', to: 'p18', color: '#059669', label: '성령 행함 → 성령의 열매' },
      { id: 'a11', from: 'p6',  to: 'p21', color: '#dc2626', label: '갈라디아 어리석음 → 새 창조 (책망 → 목표)' },
      { id: 'a12', from: 'p3',  to: 'p11', color: '#b45309', label: '안디옥 사건 → 하나 됨 (식탁 교제 신학)' },
      { id: 'a13', from: 'p2',  to: 'p22', color: '#7c3aed', label: '계시로 받음 → 예수의 흔적 (사도직 Inclusio)' },
      { id: 'a14', from: 'p1',  to: 'p21', color: '#dc2626', label: '다른 복음 → 새 창조 (거짓 대안 → 참 대안)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 에베소서 (EPH_CTX) — 옥중서신 · 교회론 정점 · 그리스도 안에서 · 성령 인침 · 영적 전쟁
// 신약학 표준: Lincoln(WBC) · O'Brien(Pillar) · Hoehner(Baker) · Thielman(BECNT) · Barth(AB 2권) · Arnold(ZECNT) · Best(ICC) · Bruce(NICNT)
// ═══════════════════════════════════════════════════════════════════════════

const EPH_STRUCTURAL_RULES = [
  { id: 'in_christ', role: '그리스도 안에서 (ἐν Χριστῷ)', icon: '👑', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἐν Χριστῷ Ἰησοῦ', tr: '엔 크리스토 이에수',
    desc: '"그리스도 안에서" — 에베소서 34회 (신약 최다권 · 1:3-14 한 문장 안에 12회+). 신자 존재론적 위치·연합 신학. Best·Lincoln·Barth "in Christ" 신비.',
    match: (s) => s.has('G1722') && s.has('G5547') },
  { id: 'heavenly_blessings', role: '하늘 신령한 복 (ἐν τοῖς ἐπουρανίοις)', icon: '☁️', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ἐν τοῖς ἐπουρανίοις', tr: '엔 토이스 에푸라니오이스',
    desc: '"하늘에 속한 모든 신령한 복" (1:3) — 에베소서 특유 표현 5회 (1:3·1:20·2:6·3:10·6:12). 우주적 지평·영적 세계 · Lincoln·Arnold "heavenly places".',
    match: (s) => s.has('G2032') },
  { id: 'mystery_oikonomia', role: '만유 통일 신비 (μυστήριον)', icon: '🔮', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'τὸ μυστήριον τοῦ θελήματος αὐτοῦ', tr: '토 뮈스테리온 투 텔레마토스 아우투',
    desc: '"그 뜻의 비밀을 우리에게 알리셨으니 · 하늘·땅 모든 것을 그리스도 안에서 통일되게 하려 하심이라" (1:9-10). 에베소서 μυστήριον 6회. Caragounis·Lincoln.',
    match: (s) => s.has('G3466') },
  { id: 'spirit_seal', role: '성령 인침 (σφραγίζω)', icon: '🔏', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'ἐσφραγίσθητε τῷ πνεύματι', tr: '에스프라기스테테 토 프뉴마티',
    desc: '"약속의 성령으로 인치심을 받았으니" (1:13) · "구원의 날까지 인치심을 받았느니라" (4:30). 성령 = 종말론적 보증금 (ἀρραβών · 1:14). Fee·O\'Brien.',
    match: (s) => s.has('G4972') || s.has('G0728') },
  { id: 'grace_faith_not_works', role: '은혜 · 믿음 · 자랑 없음 (2:8-9)', icon: '🎁', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'χάριτί ἐστε σεσῳσμένοι διὰ πίστεως', tr: '카리티 에스테 세소스메노이 디아 피스테오스',
    desc: '"너희는 그 은혜에 의하여 믿음으로 말미암아 구원을 받았으니 · 하나님의 선물 · 행위에서 난 것이 아니니" (2:8-9). 종교개혁 정식. Hoehner·Thielman.',
    match: (s) => s.has('G5485') && s.has('G4102') && s.has('G4982') },
  { id: 'one_new_man', role: '새 사람 하나 (유대·이방)', icon: '🤝', color: '#6366f1', bg: 'rgba(99,102,241,.13)',
    gr: 'εἰς ἕνα καινὸν ἄνθρωπον', tr: '에이스 헤나 카이논 안트로폰',
    desc: '"둘로 자기 안에서 한 새 사람을 지어 화평하게 하시고 · 중간에 막힌 담을 자기 육체로 허시고" (2:14-15). 유대·이방 화해 신학. Lincoln·Best·Barth.',
    match: (s) => s.has('G1520') && s.has('G2537') && s.has('G0444') },
  { id: 'church_body', role: '그리스도의 몸 (σῶμα Χριστοῦ)', icon: '⛪', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'τὸ σῶμα Χριστοῦ', tr: '토 소마 크리스투',
    desc: '"교회는 그의 몸이니 만물 안에서 만물을 충만하게 하시는 이의 충만함이니라" (1:23) · "몸이 하나요 성령도 한 분이시니" (4:4). 에베소 교회론 정점. Best·Barth.',
    match: (s) => s.has('G4983') },
  { id: 'cornerstone_temple', role: '모퉁잇돌·성전 지어짐', icon: '🏛️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'ἀκρογωνιαῖος · ναὸς ἅγιος', tr: '아크로고니아이오스 · 나오스 하기오스',
    desc: '"그리스도 예수께서 친히 모퉁잇돌 · 각 건물마다 서로 연결하여 주 안에서 성전이 되어 가고" (2:20-21). 사도·선지자 터 위 · McKelvey·O\'Brien.',
    match: (s) => s.has('G0204') || (s.has('G3485') && s.has('G0040')) },
  { id: 'reveal_mystery_gentile', role: '이방인 신비 계시 (동일 상속자)', icon: '🌍', color: '#6366f1', bg: 'rgba(99,102,241,.13)',
    gr: 'συγκληρονόμα · σύσσωμα · συμμέτοχα', tr: '슁클레로노마 · 슁소마 · 슁메토카',
    desc: '"이방인들이 함께 상속자가 되고 함께 지체가 되고 함께 약속에 참여하는 자가 됨이라" (3:6) — 3중 "함께"(συν-). 만세 감추었던 신비 계시. Thielman·Lincoln.',
    match: (s) => s.has('G4789') || s.has('G4954') },
  { id: 'five_offices', role: '사역자 5직 (4:11)', icon: '👥', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ἀποστόλους · προφήτας · εὐαγγελιστάς · ποιμένας καὶ διδασκάλους', tr: '아포스톨루스 · 프로페타스 · 유앙겔리스타스 · 포이메나스 카이 디다스칼루스',
    desc: '"그가 어떤 사람은 사도로 · 어떤 사람은 선지자로 · 어떤 사람은 복음 전하는 자로 · 어떤 사람은 목사와 교사로 삼으셨으니" (4:11). 목사-교사 = 단일 직 논쟁. Lincoln·Hoehner.',
    match: (s) => s.has('G0652') && s.has('G4396') },
  { id: 'new_self_walk', role: '새 사람 옷 입음·행함', icon: '🚶', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'ἐνδύσασθαι τὸν καινὸν ἄνθρωπον', tr: '엔뒤사스타이 톤 카이논 안트로폰',
    desc: '"옛 사람을 벗어 버리고 · 새 사람을 입으라 · 하나님을 따라 의와 진리의 거룩함으로" (4:22-24) · "사랑 가운데 행하라" (5:2). 실천 신학 · Lincoln.',
    match: (s) => s.has('G1746') && s.has('G2537') },
  { id: 'spirit_filled', role: '성령으로 충만 (5:18)', icon: '🕊️', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'πληροῦσθε ἐν πνεύματι', tr: '플레루스테 엔 프뉴마티',
    desc: '"술 취하지 말라 · 오직 성령으로 충만함을 받으라" (5:18) — 명령형 · 현재 수동 (지속적 충만). 5:19-21 5분사 결과 (찬송·감사·복종). Fee·O\'Brien.',
    match: (s) => s.has('G4137') && s.has('G4151') },
  { id: 'household_code', role: '가정 규칙 (Haustafel)', icon: '🏠', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'αἱ γυναῖκες · οἱ ἄνδρες · τὰ τέκνα · οἱ δοῦλοι', tr: '하이 귀나이케스 · 호이 안드레스 · 타 테크나 · 호이 둘로이',
    desc: '"아내들이여 · 남편들이여 · 자녀들아 · 종들아" (5:22-6:9) — 그레코-로마 가정 규칙 재구성. 그리스도와 교회 (5:32) 신학적 기초. Lincoln·Thielman.',
    match: null },
  { id: 'spiritual_warfare', role: '전신갑주 · 영적 전쟁 (6:10-18)', icon: '⚔️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'πανοπλίαν τοῦ θεοῦ', tr: '파노플리안 투 테우',
    desc: '"하나님의 전신갑주를 입으라 · 우리의 씨름은 혈과 육이 아니라 · 통치자·권세·어둠의 세상 주관자·악의 영들" (6:10-12) · 6가지 무기. Arnold·Lincoln.',
    match: (s) => s.has('G3833') },
  { id: 'love_supreme', role: '사랑 (ἀγάπη · 지극한 사랑)', icon: '❤️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'τῇ ἀγάπῃ τοῦ Χριστοῦ', tr: '테 아가페 투 크리스투',
    desc: '"그리스도의 사랑의 너비·길이·높이·깊이가 어떠함을 깨달아" (3:18-19) · "사랑 가운데서 진리를 말하여" (4:15) · "사랑 가운데서 행하라" (5:2). O\'Brien·Best.',
    match: (s) => s.has('G0026') },
];

const EPH_MANUAL_DISCOURSE = {
  '1:3':   'heavenly_blessings',      // 하늘에 속한 모든 신령한 복
  '1:4':   'in_christ',               // 창세 전에 그리스도 안에서 택하사
  '1:7':   'grace_faith_not_works',   // 그의 피로 말미암아 속량 · 죄사함
  '1:9':   'mystery_oikonomia',       // 그 뜻의 비밀 알리셨으니
  '1:10':  'mystery_oikonomia',       // 만유 통일 (하늘·땅) 그리스도 안에서
  '1:13':  'spirit_seal',             // 약속의 성령으로 인치심을 받았으니
  '1:14':  'spirit_seal',             // 성령 = 보증 (ἀρραβών) · 기업의 보증이 되사
  '1:20':  'heavenly_blessings',      // 하늘에서 자기의 오른편에 앉히사
  '1:22':  'church_body',             // 만물을 그의 발 아래 · 교회의 머리
  '1:23':  'church_body',             // 교회는 그의 몸 · 만물 안 만물 충만
  '2:5':   'grace_faith_not_works',   // 허물로 죽은 우리 · 함께 살리셨고
  '2:6':   'in_christ',               // 그리스도 예수 안에서 함께 하늘에 앉히시니
  '2:8':   'grace_faith_not_works',   // 은혜에 의하여 믿음으로 말미암아
  '2:9':   'grace_faith_not_works',   // 행위에서 난 것 아님 · 자랑하지 못하게
  '2:10':  'new_self_walk',           // 그의 만드신 바 · 선한 일 위해 지으심
  '2:13':  'in_christ',               // 그리스도 예수 안에서 · 그의 피로 가까워짐
  '2:14':  'one_new_man',             // 화평 · 중간에 막힌 담을 허심
  '2:15':  'one_new_man',             // 한 새 사람 지어 화평
  '2:19':  'one_new_man',             // 하나님 권속 · 성도들과 동일 시민
  '2:20':  'cornerstone_temple',      // 그리스도 예수 친히 모퉁잇돌
  '2:21':  'cornerstone_temple',      // 각 건물 연결 · 주 안에서 성전
  '3:6':   'reveal_mystery_gentile',  // 이방인 함께 상속자 · 지체 · 참여자 (3중 συν-)
  '3:10':  'church_body',             // 교회로 말미암아 · 통치·권세들에게 각종 지혜
  '3:12':  'in_christ',               // 그 안에서 담대함과 확신 · 나아감
  '3:18':  'love_supreme',            // 사랑의 너비·길이·높이·깊이
  '3:20':  'heavenly_blessings',      // 넘치도록 하실 이
  '4:3':   'one_new_man',             // 성령이 하나 되게 하신 것 지키라
  '4:4':   'church_body',             // 몸이 하나 · 성령도 하나 (7개 하나)
  '4:11':  'five_offices',            // 사역자 5직 (사도·선지자·복음전하는 자·목사·교사)
  '4:13':  'church_body',             // 온전한 사람 · 그리스도 장성한 분량
  '4:15':  'love_supreme',            // 사랑 가운데 진리를 말하여
  '4:22':  'new_self_walk',           // 옛 사람 벗어 버리고
  '4:24':  'new_self_walk',           // 새 사람 입으라 · 의와 진리의 거룩함
  '4:30':  'spirit_seal',             // 성령을 근심하게 하지 말라 · 구원의 날까지 인침
  '5:2':   'love_supreme',            // 사랑 가운데 행하라
  '5:8':   'new_self_walk',           // 빛의 자녀들처럼 행하라
  '5:18':  'spirit_filled',           // 술 취하지 말고 성령으로 충만
  '5:19':  'spirit_filled',           // 시와 찬미와 신령한 노래
  '5:22':  'household_code',          // 아내들이여 남편에게 복종
  '5:25':  'household_code',          // 남편들아 아내 사랑 · 그리스도가 교회 사랑
  '5:32':  'church_body',             // 이 비밀이 크도다 · 그리스도와 교회
  '6:1':   'household_code',          // 자녀들아 부모에게 순종
  '6:5':   'household_code',          // 종들아 상전에게 두려워하고
  '6:10':  'spiritual_warfare',       // 주 안에서 · 그 힘의 능력으로 강건하여지고
  '6:11':  'spiritual_warfare',       // 하나님의 전신갑주를 입으라
  '6:12':  'spiritual_warfare',       // 우리 씨름은 혈과 육이 아니라 · 통치·권세·주관자·악의 영들
  '6:17':  'spiritual_warfare',       // 성령의 검·하나님의 말씀
  '6:18':  'spirit_filled',           // 모든 기도와 간구를 하되 성령 안에서
};

export const EPH_CTX = {
  id: 'Eph',
  book: { ko: '에베소서', bollsNum: 49, lexId: 'Eph', lexCorpus: 'gnt', en: 'Ephesians', testament: 'NT' },
  chapters: 6,
  discourseRules: [...GNT_DISCOURSE_RULES, ...EPH_STRUCTURAL_RULES],
  manualDiscourse: EPH_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신 · 옥중서신 (골로새서·빌립보서·빌레몬서와 함께)',
    genreNote: '회람 서신 가능성 (일부 사본 1:1 "에베소" 부재 · Best·Lincoln) · 예전·찬송 요소 다수 (1:3-14 한 문장 202단어)',
    year: 'AD 60-62 (로마 감금기 · 전통) 또는 AD 80-100 (후기 저작설)',
    yearNote: '옥중서신 그룹 · 두기고 골로새·에베소 동시 전달 (엡 6:21 = 골 4:7) · Lincoln·Barth 후기 저작설 vs Bruce·O\'Brien·Hoehner 바울 친서',
    place: '로마 감금 (전통) · 또는 가이사랴',
    placeNote: '엡 3:1·4:1·6:20 갇힌 자 언급 · 로마 감금 (행 28:16-31) 다수설',
    author: '바울 (전통) 또는 바울 학파 (현대 다수 · 문체·어휘·신학 논쟁)',
    authorNote: '바울 친서 지지: Bruce·O\'Brien·Hoehner·Thielman·Arnold. 학파설: Lincoln·Best·Käsemann·Barth · 문체 이례성·긴 문장·교회론 발전',
    audience: '에베소 교회 (전통) · 또는 소아시아 이방 기독교 회람 서신',
    audienceNote: '엡 1:15·3:2 "듣기만 하고" = 바울 직접 안 만난 교회 · 회람설 뒷받침 · 이방 기독교 정체성 확립',
    theme: '그리스도 안에서 · 교회의 신비 · 유대·이방 하나 · 영적 전쟁 · 우주적 화해',
    themeNote: '1-3 교리 (그리스도 안에서·성령 인침·교회론) → 4-6 실천 (일치·거룩·가정·전신갑주) 2부 구조. "그리스도 안에서" 34회.',
    chapterAgenda: {
      1: '인사·삼위 찬송(1:3-14 한 문장·성부 택하심·성자 속량·성령 인침)·바울 감사·기도(교회 눈 밝히사)·그리스도 부활·승귀·교회 머리',
      2: '허물로 죽은 자에서 함께 살리심(2:1-10 은혜·믿음·구원 정식)·유대·이방 하나 됨(2:11-22 중간 담·새 사람·성전 지어짐)',
      3: '이방인 신비 계시(3:1-13 함께 상속자·지체·참여자)·바울 기도(3:14-21 사랑 너비·길이·높이·깊이·풍성한 도달)',
      4: '몸의 하나됨(4:1-6 7개 하나)·사역자 5직·그리스도 장성한 분량(4:11-16)·옛 사람 벗음·새 사람 입음(4:17-32)',
      5: '사랑 가운데 행함·빛의 자녀·성령 충만(5:1-21)·부부론 "이 비밀이 크도다"(5:22-33)',
      6: '자녀·부모·종·상전(6:1-9)·전신갑주 6가지·영적 전쟁·주 안에서 강건(6:10-20)·두기고·마지막 인사',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 3, color: '#7c3aed', label: '교리 · 그리스도 안에서·교회 신비·이방 편입' },
      { id: 's2', fromCh: 4, toCh: 6, color: '#059669', label: '실천 · 일치·거룩·가정·영적 전쟁' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 3,  color: '#0369a1', label: '하늘 신령한 복 (찬송 시작)' },
      { id: 'p2',  ch: 1, verse: 4,  color: '#7c3aed', label: '창세 전 그리스도 안에서 택하심' },
      { id: 'p3',  ch: 1, verse: 7,  color: '#dc2626', label: '그의 피로 속량 · 죄사함' },
      { id: 'p4',  ch: 1, verse: 10, color: '#7c3aed', label: '만유 통일 · 하늘·땅 그리스도 안에서' },
      { id: 'p5',  ch: 1, verse: 13, color: '#0891b2', label: '약속의 성령으로 인치심 (보증)' },
      { id: 'p6',  ch: 1, verse: 22, color: '#0891b2', label: '만물 발 아래 · 교회의 머리' },
      { id: 'p7',  ch: 2, verse: 8,  color: '#059669', label: '은혜로·믿음으로 구원 (선물)' },
      { id: 'p8',  ch: 2, verse: 10, color: '#059669', label: '그의 만드신 바 · 선한 일 위해 지으심' },
      { id: 'p9',  ch: 2, verse: 14, color: '#6366f1', label: '화평 · 중간 담을 허심' },
      { id: 'p10', ch: 2, verse: 15, color: '#6366f1', label: '한 새 사람 지어 화평 (유대·이방)' },
      { id: 'p11', ch: 2, verse: 20, color: '#b45309', label: '그리스도 예수 · 모퉁잇돌' },
      { id: 'p12', ch: 3, verse: 6,  color: '#6366f1', label: '이방인 함께 상속자·지체·참여자 (3중 συν)' },
      { id: 'p13', ch: 3, verse: 10, color: '#0891b2', label: '교회로 말미암아 · 통치·권세들에게 각종 지혜' },
      { id: 'p14', ch: 3, verse: 18, color: '#dc2626', label: '사랑의 너비·길이·높이·깊이' },
      { id: 'p15', ch: 3, verse: 20, color: '#0369a1', label: '넘치도록 하실 이 (송영)' },
      { id: 'p16', ch: 4, verse: 3,  color: '#6366f1', label: '성령이 하나 되게 하신 것 지키라' },
      { id: 'p17', ch: 4, verse: 4,  color: '#0891b2', label: '몸이 하나 · 7개 하나 (일치 신학)' },
      { id: 'p18', ch: 4, verse: 11, color: '#0369a1', label: '사역자 5직 (사도·선지자·복음전자·목사·교사)' },
      { id: 'p19', ch: 4, verse: 15, color: '#dc2626', label: '사랑 가운데 진리를 말하여' },
      { id: 'p20', ch: 4, verse: 24, color: '#059669', label: '새 사람 입으라 · 의·진리의 거룩함' },
      { id: 'p21', ch: 4, verse: 30, color: '#0891b2', label: '성령을 근심 X · 구원의 날까지 인침' },
      { id: 'p22', ch: 5, verse: 2,  color: '#dc2626', label: '사랑 가운데 행하라' },
      { id: 'p23', ch: 5, verse: 18, color: '#7c3aed', label: '성령으로 충만 · 술 취하지 말고' },
      { id: 'p24', ch: 5, verse: 32, color: '#0891b2', label: '이 비밀이 크도다 · 그리스도와 교회 (부부론)' },
      { id: 'p25', ch: 6, verse: 11, color: '#dc2626', label: '하나님의 전신갑주를 입으라' },
      { id: 'p26', ch: 6, verse: 12, color: '#dc2626', label: '우리 씨름은 · 통치·권세·주관자·악의 영들' },
      { id: 'p27', ch: 6, verse: 17, color: '#dc2626', label: '성령의 검 · 하나님의 말씀' },
    ],
    arcs: [
      { id: 'a1',  from: 'p2',  to: 'p10', color: '#7c3aed', label: '창세 전 택하심 → 새 사람 (구원 사역)' },
      { id: 'a2',  from: 'p4',  to: 'p9',  color: '#6366f1', label: '만유 통일 → 유대·이방 화평 (우주 → 인간)' },
      { id: 'a3',  from: 'p5',  to: 'p21', color: '#0891b2', label: '성령 인침 (1차) → 구원의 날까지 인침 (재확인)' },
      { id: 'a4',  from: 'p6',  to: 'p17', color: '#0891b2', label: '교회 머리 → 몸 하나 (교회론 Inclusio)' },
      { id: 'a5',  from: 'p7',  to: 'p8',  color: '#059669', label: '은혜·믿음 구원 → 선한 일 위해 지으심' },
      { id: 'a6',  from: 'p9',  to: 'p12', color: '#6366f1', label: '중간 담 허심 → 함께 상속자 (이방 편입 3중)' },
      { id: 'a7',  from: 'p11', to: 'p18', color: '#b45309', label: '모퉁잇돌 → 5직 세우심 (교회 건축)' },
      { id: 'a8',  from: 'p14', to: 'p22', color: '#dc2626', label: '사랑 4차원 → 사랑 가운데 행하라' },
      { id: 'a9',  from: 'p16', to: 'p23', color: '#7c3aed', label: '성령 하나 지킴 → 성령 충만 (성령 신학)' },
      { id: 'a10', from: 'p20', to: 'p22', color: '#059669', label: '새 사람 입음 → 사랑 행함 (실천)' },
      { id: 'a11', from: 'p24', to: 'p25', color: '#0891b2', label: '부부론 → 전신갑주 (교회 실천 → 우주 전쟁)' },
      { id: 'a12', from: 'p25', to: 'p27', color: '#dc2626', label: '전신갑주 → 성령의 검 (무기 축)' },
      { id: 'a13', from: 'p3',  to: 'p26', color: '#dc2626', label: '피로 속량 → 악의 영들 (우주적 승리)' },
      { id: 'a14', from: 'p1',  to: 'p15', color: '#0369a1', label: '신령한 복 (찬송 시작) → 송영 (3장 결론)' },
    ],
  },
};

// ── 등록된 책 컨텍스트 (activeBookId 로 조회) ────────────────────────────
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
};

export const SUPPORTED_BOOK_IDS = Object.keys(BOOK_CONTEXTS);
