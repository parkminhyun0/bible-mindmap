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

// ── 등록된 책 컨텍스트 (activeBookId 로 조회) ────────────────────────────
export const BOOK_CONTEXTS = {
  Gen: GEN_CTX,
  Rom: ROM_CTX,
  Ruth: RUTH_CTX,
};

export const SUPPORTED_BOOK_IDS = Object.keys(BOOK_CONTEXTS);
