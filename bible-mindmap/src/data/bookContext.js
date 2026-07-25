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
    desc: '"그리스도께서 우리를 자유롭게 하려고 자유를 주셨으니" (5:1) — 갈라디아서 대주제어 (11회 · 신약 최다권). 종의 멍에 아님 · Betz·Longenecker "마그나 카르타".',
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
    themeNote: '중심 진술 (2:16 이신칭의) · 자유 (5:1 마그나 카르타) · 성령 vs 육체 (5:16) · 새 창조 (6:15) 4중 축',
    chapterAgenda: {
      1: '서문 · 다른 복음 저주(1:6-9)·바울 사도직 변호(사람 아닌 계시로 받음)·회심 후 아라비아·다메섹',
      2: '예루살렘 방문 (14년 후·야고보·게바·요한 악수)·안디옥 사건 (베드로 대면·2:11-14)·이신칭의 정식(2:16)·그리스도와 함께 십자가(2:20)',
      3: '어리석도다 갈라디아(3:1)·성령 vs 율법(3:2-5)·아브라함 믿음(3:6-9)·율법의 저주 대속(3:13)·아브라함 씨=그리스도(3:16)·초등교사(3:24)·유대·헬라·남·여 하나(3:28)',
      4: '때가 차매 아들 보내심·양자 됨·압바 아버지(4:4-7)·사라·하갈 알레고리(4:21-31)·두 언약·시내산 vs 예루살렘',
      5: '자유 마그나 카르타(5:1)·할례 받으면 그리스도 무익(5:2-4)·사랑으로 역사하는 믿음(5:6)·성령 따라 행하라(5:16)·육체의 일 15가지·성령의 열매 9가지(5:22-23)',
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
      { id: 'p14', ch: 5, verse: 1,  color: '#059669', label: '자유 · 종의 멍에 X (마그나 카르타)' },
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

// ═══════════════════════════════════════════════════════════════════════════
// 빌립보서 (PHIL_CTX) — 옥중서신 · 그리스도 찬가(2:5-11 · κένωσις·ὑπερύψωσεν) · 기쁨 신학 (χαρά·χαίρω 16회)
// 신약학 표준: O'Brien(NIGTC) · Fee(NICNT) · Bockmuehl(BNTC) · Silva(BECNT) · Reumann(AB) · Hansen(Pillar) · Hawthorne(WBC) · Martin(Carmen Christi)
// ═══════════════════════════════════════════════════════════════════════════

const PHIL_STRUCTURAL_RULES = [
  { id: 'joy_rejoice', role: '기쁨 (χαρά · χαίρω)', icon: '😊', color: '#eab308', bg: 'rgba(234,179,8,.14)',
    gr: 'χαίρετε ἐν κυρίῳ πάντοτε', tr: '카이레테 엔 퀴리오 판토테',
    desc: '"주 안에서 항상 기뻐하라 · 다시 말하노니 기뻐하라" (4:4) — 빌립보서 χαρά·χαίρω 계열 16회 (신약 서신 최다권). 감옥에서 쓴 기쁨의 서신. Fee·Bockmuehl 아이러니 신학.',
    match: (s) => s.has('G5479') || s.has('G5463') },
  { id: 'christ_hymn', role: '그리스도 찬가 (2:5-11 Carmen Christi)', icon: '🎵', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'τοῦτο φρονεῖτε ἐν ὑμῖν ὃ καὶ ἐν Χριστῷ Ἰησοῦ', tr: '투토 프로네이테 엔 휘민 호 카이 엔 크리스토 이에수',
    desc: '"너희 안에 이 마음을 품으라 곧 그리스도 예수의 마음이니" (2:5) — 2:5-11 그리스도 찬가. Lohmeyer 시로 구분 · Martin *Carmen Christi* 대작. 비움 6-8 + 높이심 9-11 두 연.',
    match: null },
  { id: 'kenosis', role: '자기 비움 (κένωσις · ἐκένωσεν)', icon: '⬇️', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'ἑαυτὸν ἐκένωσεν · μορφὴν δούλου', tr: '헤아우톤 에케노센 · 모르펜 둘루',
    desc: '"자기를 비워 종의 형체를 가지사 · 사람들과 같이 되셨고 · 십자가 죽음까지 복종하셨으니" (2:7-8). κένωσις 신학 · Hawthorne·Bockmuehl · 성육신·낮아지심 극한.',
    match: (s) => s.has('G2758') || (s.has('G3444') && s.has('G1401')) },
  { id: 'exaltation_name', role: '지극히 높이심 (ὑπερύψωσεν)', icon: '⬆️', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ὑπερύψωσεν · τὸ ὄνομα τὸ ὑπὲρ πᾶν ὄνομα', tr: '휘페륍소센 · 토 오노마 토 휘페르 판 오노마',
    desc: '"하나님이 그를 지극히 높여 · 모든 이름 위에 뛰어난 이름을 주사 · 모든 무릎이 꿇게" (2:9-11 · 사 45:23 인용) — 신적 이름 예수께 · 모든 피조물 예배. Bauckham *God Crucified*.',
    match: (s) => s.has('G5251') || (s.has('G1119') && s.has('G2578')) },
  { id: 'citizenship_heaven', role: '하늘 시민권 (πολίτευμα)', icon: '🏛️', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ἡμῶν τὸ πολίτευμα ἐν οὐρανοῖς', tr: '헤몬 토 폴리튜마 엔 우라노이스',
    desc: '"우리의 시민권은 하늘에 있는지라" (3:20) · "복음에 합당하게 생활하라(πολιτεύεσθε)" (1:27). 빌립보 = 로마 식민지 · 시민권 특권 강함. Fee·Bockmuehl 사회사적 해석.',
    match: (s) => s.has('G4175') || s.has('G4176') },
  { id: 'gain_loss', role: '얻음·잃음 (배설물 · σκύβαλα)', icon: '💎', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'πάντα ζημίαν · σκύβαλα', tr: '판타 제미안 · 스퀴발라',
    desc: '"모든 것을 해로 여기고 · 배설물로 여김은 그리스도를 얻고자 함이니" (3:7-8) — σκύβαλα (거름·오물) 강한 어휘. 유대적 자랑 vs 그리스도. O\'Brien·Silva.',
    match: (s) => s.has('G4657') || s.has('G2209') },
  { id: 'press_toward', role: '푯대 향해 (κατὰ σκοπὸν διώκω)', icon: '🎯', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'κατὰ σκοπὸν διώκω εἰς τὸ βραβεῖον', tr: '카타 스코폰 디오코 에이스 토 브라베이온',
    desc: '"푯대를 향하여 그리스도 예수 안에서 하나님이 위에서 부르신 부름의 상을 위하여 달려가노라" (3:14). 경기장 은유 (βραβεῖον = 상급). Fee·Hawthorne 성화 신학.',
    match: (s) => s.has('G4649') || s.has('G1017') },
  { id: 'contentment', role: '자족 (αὐτάρκης)', icon: '⚖️', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'αὐτάρκης εἶναι', tr: '아우타르케스 에이나이',
    desc: '"어떠한 형편에든지 자족하기를 배웠노니" (4:11) · "능력 주시는 자 안에서 모든 것을 할 수 있느니라" (4:13). Stoic αὐτάρκεια 재정의 · 그리스도 의존 · Bockmuehl.',
    match: (s) => s.has('G0842') },
  { id: 'partnership_koinonia', role: '교제·헌금 (κοινωνία)', icon: '🤝', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'κοινωνίᾳ εἰς τὸ εὐαγγέλιον', tr: '코이노니아 에이스 토 유앙겔리온',
    desc: '"복음을 위한 너희의 교제" (1:5) · 헌금을 통한 사역 참여 (4:15-18 "받으신 향기·기쁨의 제물"). 상업 파트너십 언어. Sampley·Fee·Ogereau.',
    match: (s) => s.has('G2842') },
  { id: 'imprisonment_gospel', role: '매임·복음 진보 (아이러니)', icon: '⛓️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'τὰ κατʼ ἐμὲ μᾶλλον εἰς προκοπὴν τοῦ εὐαγγελίου', tr: '타 카트 에메 말론 에이스 프로코펜 투 유앙겔리우',
    desc: '"내가 당한 일이 도리어 복음의 진전이 된 줄을 너희가 알기를 원하노라" (1:12) — 감옥이 오히려 시위대·가이사 집 사람 복음 전파. 누가 24 아이러니 · Fee.',
    match: (s) => s.has('G4297') || s.has('G1199') },
  { id: 'same_mind', role: '같은 마음 (τὸ αὐτὸ φρονεῖν)', icon: '🤲', color: '#6366f1', bg: 'rgba(99,102,241,.13)',
    gr: 'τὸ αὐτὸ φρονεῖτε', tr: '토 아우토 프로네이테',
    desc: '"뜻을 합하며 한마음을 품어" (2:2) · "유오디아를 권하고 순두게를 권하노니 주 안에서 같은 마음을 품으라" (4:2). φρονέω 10회 (신약 최다권). 공동체 일치. Bockmuehl.',
    match: (s) => s.has('G5426') },
  { id: 'peace_god_transcend', role: '하나님의 평강 (지각에 뛰어난)', icon: '🕊️', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'εἰρήνη τοῦ θεοῦ ἡ ὑπερέχουσα πάντα νοῦν', tr: '에이레네 투 테우 헤 휘페레쿠사 판타 눈',
    desc: '"모든 지각에 뛰어난 하나님의 평강이 그리스도 예수 안에서 너희 마음과 생각을 지키시리라" (4:7) — 감사·간구 후 (4:6). 파수병 은유 (φρουρέω). Fee·Hansen.',
    match: (s) => s.has('G1515') && s.has('G5242') },
  { id: 'live_die_christ', role: '사는 것도 죽는 것도 그리스도 (1:21)', icon: '✝️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἐμοὶ γὰρ τὸ ζῆν Χριστὸς καὶ τὸ ἀποθανεῖν κέρδος', tr: '에모이 가르 토 젠 크리스토스 카이 토 아포타네인 케르도스',
    desc: '"내게 사는 것이 그리스도니 죽는 것도 유익함이라" (1:21) — 옥중 순교 각오 절정. 살든 죽든 그리스도 존귀 (1:20). Fee·O\'Brien.',
    match: null },
];

const PHIL_MANUAL_DISCOURSE = {
  '1:5':   'partnership_koinonia',    // 첫날부터 이제까지 복음을 위한 너희의 교제
  '1:6':   'joy_rejoice',             // 선한 일을 시작하신 이가 · 완성하실 줄 확신
  '1:12':  'imprisonment_gospel',     // 매임이 도리어 복음 진보
  '1:14':  'imprisonment_gospel',     // 매임으로 인하여 담대히 말씀
  '1:20':  'live_die_christ',         // 살든지 죽든지 내 몸에서 그리스도 존귀
  '1:21':  'live_die_christ',         // 사는 것이 그리스도니 죽는 것도 유익
  '1:27':  'citizenship_heaven',      // 복음에 합당하게 생활(πολιτεύεσθε)
  '2:2':   'same_mind',               // 뜻을 합하며 한마음을 품어
  '2:5':   'christ_hymn',             // 그리스도 예수의 마음을 품으라 (찬가 도입)
  '2:6':   'christ_hymn',             // 그는 근본 하나님의 본체시나
  '2:7':   'kenosis',                 // 자기를 비워 종의 형체
  '2:8':   'kenosis',                 // 십자가에 죽으심까지 복종
  '2:9':   'exaltation_name',         // 지극히 높여 모든 이름 위에
  '2:10':  'exaltation_name',         // 모든 무릎을 꿇게 하시고
  '2:11':  'exaltation_name',         // 예수 그리스도를 주라 시인
  '2:12':  'press_toward',            // 두렵고 떨림으로 너희 구원을 이루라
  '2:14':  'joy_rejoice',             // 원망과 시비 없이 하라
  '2:17':  'joy_rejoice',             // 관제로 부음이 될지라도 기뻐하고
  '3:2':   'gain_loss',               // 개들·행악하는 자·손할례당 조심
  '3:7':   'gain_loss',               // 그리스도로 인해 해로 여김
  '3:8':   'gain_loss',               // 배설물 (σκύβαλα)로 여김
  '3:10':  'live_die_christ',         // 부활 능력·고난 참여·죽으심 본받아
  '3:14':  'press_toward',            // 푯대 향해 달려가노라 · 위에서 부르신 상
  '3:20':  'citizenship_heaven',      // 시민권은 하늘에 있는지라
  '4:2':   'same_mind',               // 유오디아·순두게 · 같은 마음
  '4:4':   'joy_rejoice',             // 항상 기뻐하라 · 다시 말하노니 기뻐하라
  '4:6':   'peace_god_transcend',     // 아무것도 염려하지 말고 · 감사·간구
  '4:7':   'peace_god_transcend',     // 하나님의 평강 · 마음과 생각을 지키시리라
  '4:8':   'peace_god_transcend',     // 참되며 경건하며 옳으며 · 이것들을 생각하라
  '4:11':  'contentment',             // 자족하기를 배웠노니
  '4:13':  'contentment',             // 능력 주시는 자 안에서 모든 것을 할 수 있느니라
  '4:15':  'partnership_koinonia',    // 주고 받는 내 일에 참여한 교회
  '4:18':  'partnership_koinonia',    // 받으신 향기로운 제물 · 하나님을 기쁘시게 함
  '4:19':  'joy_rejoice',             // 하나님이 그리스도 예수 안에서 영광 가운데 그 풍성한 대로
};

export const PHIL_CTX = {
  id: 'Phil',
  book: { ko: '빌립보서', bollsNum: 50, lexId: 'Phil', lexCorpus: 'gnt', en: 'Philippians', testament: 'NT' },
  chapters: 4,
  discourseRules: [...GNT_DISCOURSE_RULES, ...PHIL_STRUCTURAL_RULES],
  manualDiscourse: PHIL_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신 · 옥중서신 · 우정 서신 (letter of friendship · Fee 분류)',
    genreNote: '헬레니즘 우정 서신 관습 (교제·감사·공동체 안부) + 감사 서신 · 3:2 갑작스러운 톤 변화 = 다중 서신 조합설 (Bornkamm·Reumann) vs 단일 서신 (Fee·O\'Brien·Bockmuehl)',
    year: 'AD 60-62 (로마 감금기 · 전통) 또는 AD 54-57 (에베소 감금 가설 · Reumann·Duncan)',
    yearNote: '로마설 다수 (시위대·가이사 집 사람 = 로마 궁정 · 1:13·4:22) · 에베소 가설(고전 15:32 근거)은 소수',
    place: '로마 감금 (전통) 또는 에베소',
    placeNote: '1:13 프라이토리온(πραιτώριον) = 근위대 vs 총독 관저 논쟁 · 로마설 유리',
    author: '바울 (친서 · 논쟁 없음 · 디모데 공동 발신자 1:1)',
    authorNote: '홈로고우메나(homologoumena) 7권 중 하나 · 자기 언급 다수 (1:12-26·3:4-14·4:11-13)',
    audience: '빌립보 교회 (마게도냐 최초 유럽 교회 · 행 16 루디아·간수·귀신 들린 여종)',
    audienceNote: '바울과 특별한 정 (헌금 지속 · 4:15-16 · 데살로니가에서도 · 3중 헌금) · 에바브로디도 파송 · 감사 서신',
    theme: '주 안에서 항상 기뻐하라 · 그리스도의 마음 · κένωσις·ὑπερύψωσεν · 하늘 시민권',
    themeNote: '2:5-11 그리스도 찬가(Carmen Christi)가 신학 중심 · 기쁨 16회 · 3:1·4:4 반복 명령 · 감옥의 아이러니',
    chapterAgenda: {
      1: '인사(바울·디모데)·감사(1:3-11 첫날부터 교제)·바울 매임 = 복음 진보(1:12-26 시위대·가이사 집·살든지 죽든지 그리스도 존귀·1:21 "사는 것이 그리스도")·복음 합당한 생활(1:27 시민권 동사)',
      2: '같은 마음 하나(2:1-4)·**그리스도 찬가(2:5-11 κένωσις·ὑπερύψωσεν·모든 무릎 꿇음·사 45:23 인용)**·두렵고 떨림 구원(2:12)·원망 없이(2:14)·디모데·에바브로디도 파송',
      3: '개들 조심(3:2 반유대주의자)·바울 자랑 목록·배설물(σκύβαλα)로 여김(3:7-8)·부활 능력·고난 참여(3:10)·푯대 향해 달려감(3:14)·시민권 하늘(3:20)·낮은 몸을 영광의 몸으로',
      4: '유오디아·순두게 같은 마음(4:2)·항상 기뻐하라(4:4)·염려 없이 감사와 간구·하나님의 평강(4:6-7)·경건한 것 생각(4:8)·자족(4:11)·능력 주시는 자(4:13)·헌금 감사(4:15-18)·가이사의 집 사람 문안(4:22)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 1, color: '#b45309', label: '감사·매임의 복음 진보·살든지 죽든지 그리스도' },
      { id: 's2', fromCh: 2, toCh: 2, color: '#7c3aed', label: '그리스도 찬가(κένωσις·ὑπερύψωσεν)·순종·본' },
      { id: 's3', fromCh: 3, toCh: 3, color: '#dc2626', label: '배설물·부활 능력·푯대·시민권' },
      { id: 's4', fromCh: 4, toCh: 4, color: '#eab308', label: '기쁨·평강·자족·헌금 감사' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 5,  color: '#059669', label: '첫날부터 복음 교제 (κοινωνία)' },
      { id: 'p2',  ch: 1, verse: 6,  color: '#eab308', label: '시작하신 이가 이루시리라' },
      { id: 'p3',  ch: 1, verse: 12, color: '#b45309', label: '매임이 도리어 복음 진보 (아이러니)' },
      { id: 'p4',  ch: 1, verse: 21, color: '#dc2626', label: '사는 것이 그리스도 · 죽는 것도 유익' },
      { id: 'p5',  ch: 1, verse: 27, color: '#0369a1', label: '복음에 합당하게 생활 (시민권 동사)' },
      { id: 'p6',  ch: 2, verse: 5,  color: '#7c3aed', label: '그리스도 예수의 마음 (찬가 도입)' },
      { id: 'p7',  ch: 2, verse: 7,  color: '#0891b2', label: '자기를 비워 종의 형체 (κένωσις)' },
      { id: 'p8',  ch: 2, verse: 8,  color: '#dc2626', label: '십자가에 죽으심까지 복종' },
      { id: 'p9',  ch: 2, verse: 9,  color: '#7c3aed', label: '지극히 높여 모든 이름 위에 (ὑπερύψωσεν)' },
      { id: 'p10', ch: 2, verse: 11, color: '#7c3aed', label: '예수 그리스도를 주라 시인 (사 45:23)' },
      { id: 'p11', ch: 2, verse: 12, color: '#059669', label: '두렵고 떨림으로 구원 이루라' },
      { id: 'p12', ch: 3, verse: 7,  color: '#dc2626', label: '그리스도로 인해 해로 여김' },
      { id: 'p13', ch: 3, verse: 8,  color: '#dc2626', label: '배설물 (σκύβαλα)로 여김' },
      { id: 'p14', ch: 3, verse: 10, color: '#dc2626', label: '부활 능력·고난 참여·죽으심 본받아' },
      { id: 'p15', ch: 3, verse: 14, color: '#059669', label: '푯대 향해 달려감 · 위에서 부르신 상' },
      { id: 'p16', ch: 3, verse: 20, color: '#0369a1', label: '시민권은 하늘에 있는지라' },
      { id: 'p17', ch: 4, verse: 4,  color: '#eab308', label: '항상 기뻐하라 · 다시 말하노니' },
      { id: 'p18', ch: 4, verse: 7,  color: '#0369a1', label: '하나님의 평강 · 지각에 뛰어난' },
      { id: 'p19', ch: 4, verse: 11, color: '#0891b2', label: '자족하기를 배웠노니 (αὐτάρκης)' },
      { id: 'p20', ch: 4, verse: 13, color: '#0891b2', label: '능력 주시는 자 안에서 모든 것' },
      { id: 'p21', ch: 4, verse: 19, color: '#eab308', label: '그리스도 예수 안에서 그 풍성한 대로 채우시리라' },
    ],
    arcs: [
      { id: 'a1',  from: 'p2',  to: 'p21', color: '#eab308', label: '시작하신 이 → 채우시리라 (하나님 완성 Inclusio)' },
      { id: 'a2',  from: 'p6',  to: 'p10', color: '#7c3aed', label: '그리스도 마음 → 예수 그리스도 주 시인 (찬가 축)' },
      { id: 'a3',  from: 'p7',  to: 'p9',  color: '#7c3aed', label: 'κένωσις(비움) → ὑπερύψωσεν(높이심) · 찬가 핵심 대립' },
      { id: 'a4',  from: 'p8',  to: 'p9',  color: '#dc2626', label: '십자가 죽음 → 지극히 높이심 (죽음-부활 축)' },
      { id: 'a5',  from: 'p3',  to: 'p4',  color: '#b45309', label: '매임 아이러니 → 사는 것도 죽는 것도 그리스도' },
      { id: 'a6',  from: 'p6',  to: 'p11', color: '#059669', label: '그리스도 마음 → 두렵고 떨림 구원 (본 → 실천)' },
      { id: 'a7',  from: 'p13', to: 'p15', color: '#dc2626', label: '배설물 → 푯대 향해 (버림 → 얻음)' },
      { id: 'a8',  from: 'p5',  to: 'p16', color: '#0369a1', label: '복음에 합당하게 생활 → 시민권 하늘 (시민권 Inclusio)' },
      { id: 'a9',  from: 'p14', to: 'p9',  color: '#dc2626', label: '부활 능력·고난 참여 → 지극히 높이심 (참여 신학)' },
      { id: 'a10', from: 'p17', to: 'p18', color: '#0369a1', label: '기뻐하라 → 평강 (기쁨의 열매)' },
      { id: 'a11', from: 'p1',  to: 'p21', color: '#059669', label: '교제 → 채우심 (헌금 축)' },
      { id: 'a12', from: 'p6',  to: 'p16', color: '#7c3aed', label: '그리스도 마음 → 낮은 몸을 영광의 몸으로 변형' },
      { id: 'a13', from: 'p12', to: 'p16', color: '#dc2626', label: '그리스도로 해로 여김 → 시민권 하늘 (참 자랑)' },
      { id: 'a14', from: 'p19', to: 'p20', color: '#0891b2', label: '자족 배움 → 능력 주시는 자 안에서 (자족의 근거)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 골로새서 (COL_CTX) — 옥중서신 · 그리스도론 정점 (1:15-20 찬가) · 골로새 이단 논박 · 에베소서 쌍둥이
// 신약학 표준: O'Brien(WBC) · Dunn(NIGTC) · Moo(Pillar) · Wright(TNTC) · Barth-Blanke(AB) · Pao(ZECNT) · Bruce(NICNT) · Sumney(NTL)
// ═══════════════════════════════════════════════════════════════════════════

const COL_STRUCTURAL_RULES = [
  { id: 'christ_supremacy_hymn', role: '그리스도 찬가·우선성 (1:15-20)', icon: '👑', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ὅς ἐστιν εἰκὼν τοῦ θεοῦ τοῦ ἀοράτου', tr: '호스 에스틴 에이콘 투 테우 투 아오라투',
    desc: '"그는 보이지 아니하는 하나님의 형상이시요 모든 피조물보다 먼저 나신 이니" (1:15-20) — 골로새 찬가 · 창조·유지·화해 3중 축. Käsemann·O\'Brien·Wright *Christ hymn*.',
    match: null },
  { id: 'image_firstborn', role: '형상 · 먼저 나신 이 (εἰκών · πρωτότοκος)', icon: '🖼️', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'εἰκὼν · πρωτότοκος', tr: '에이콘 · 프로토토코스',
    desc: '"보이지 아니하는 하나님의 형상 · 모든 피조물보다 먼저 나신 이" (1:15) · "죽은 자들 가운데서 먼저 나신 이" (1:18). πρωτότοκος = 우선권·주권 (창조 아님). Dunn·Bauckham.',
    match: (s) => s.has('G1504') || s.has('G4416') },
  { id: 'all_things_created', role: '만유 창조·유지 (1:16-17)', icon: '🌌', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ἐν αὐτῷ ἐκτίσθη τὰ πάντα · τὰ πάντα ἐν αὐτῷ συνέστηκεν', tr: '엔 아우토 에크티스테 타 판타 · 타 판타 엔 아우토 쉬네스테켄',
    desc: '"만물이 그 안에서 창조되되 · 만물이 그로 말미암고 그를 위하여 창조되었고 · 그가 만물보다 먼저 계시고 만물이 그 안에 함께 섰느니라" (1:16-17). 그리스도 우주 창조·섭리. Wright·Moo.',
    match: (s) => s.has('G2936') || s.has('G4921') },
  { id: 'head_body_church', role: '몸의 머리 (κεφαλὴ τοῦ σώματος)', icon: '⛪', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'ἡ κεφαλὴ τοῦ σώματος τῆς ἐκκλησίας', tr: '헤 케팔레 투 소마토스 테스 에클레시아스',
    desc: '"그는 몸인 교회의 머리시라 · 그가 근본이시요 죽은 자들 가운데서 먼저 나신 이시니" (1:18) · 골로새 특유 = 그리스도가 우주 만물의 머리 (2:10 통치·권세). Dunn·Barth.',
    match: (s) => s.has('G2776') && s.has('G4983') },
  { id: 'reconciliation_peace_blood', role: '십자가 피 · 만유 화해', icon: '🕊️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'εἰρηνοποιήσας διὰ τοῦ αἵματος τοῦ σταυροῦ αὐτοῦ', tr: '에이레노포이에사스 디아 투 하이마토스 투 스타우루 아우투',
    desc: '"그의 십자가의 피로 화평을 이루사 · 만물 곧 땅에 있는 것들이나 하늘에 있는 것들이 자기와 화목하게 되기를 기뻐하심이라" (1:20). 우주적 화해 · Wright·Sumney.',
    match: (s) => s.has('G1517') || (s.has('G0129') && s.has('G4716')) },
  { id: 'pleroma_fullness', role: '충만·신성 전체 (πλήρωμα)', icon: '🌊', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'πᾶν τὸ πλήρωμα τῆς θεότητος σωματικῶς', tr: '판 토 플레로마 테스 테오테토스 소마티코스',
    desc: '"모든 충만으로 예수 안에 거하게 하시고" (1:19) · "그 안에는 신성의 모든 충만이 육체로 거하시고" (2:9) — 골로새 이단(부분 계시 주장) 논박. Dunn·O\'Brien·Wright.',
    match: (s) => s.has('G4138') && s.has('G2320') },
  { id: 'mystery_christ_in_you', role: '너희 안에 계신 그리스도 (신비)', icon: '🔮', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'τὸ μυστήριον · Χριστὸς ἐν ὑμῖν ἡ ἐλπὶς τῆς δόξης', tr: '토 뮈스테리온 · 크리스토스 엔 휘민 헤 엘피스 테스 독세스',
    desc: '"이 비밀은 만세 감추었던 것인데 · 이 비밀은 너희 안에 계신 그리스도시니 곧 영광의 소망이니라" (1:26-27). 이방인 안 그리스도 = 신비. O\'Brien·Moo.',
    match: (s) => s.has('G3466') && s.has('G1680') },
  { id: 'colossian_heresy', role: '헛된 철학·초등학문 (골로새 이단)', icon: '⚠️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'κενῆς ἀπάτης · τὰ στοιχεῖα τοῦ κόσμου', tr: '케네스 아파테스 · 타 스토이케이아 투 코스무',
    desc: '"누가 철학과 헛된 속임수로 너희를 사로잡을까 주의하라 · 사람의 전통과 세상의 초등학문을 따름이요 그리스도를 따름이 아니니라" (2:8) — 골로새 이단 (유대-신비주의-금욕 혼합·천사 숭배 2:18). Dunn·Arnold·Sumney.',
    match: (s) => s.has('G4757') || s.has('G5385') },
  { id: 'circumcision_baptism', role: '그리스도의 할례 (세례 결합 · 2:11-12)', icon: '💧', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'περιτομῇ τοῦ Χριστοῦ · συνταφέντες αὐτῷ ἐν τῷ βαπτισμῷ', tr: '페리토메 투 크리스투 · 슁타펜테스 아우토 엔 토 밥티스모',
    desc: '"손으로 하지 아니한 할례 · 육의 몸을 벗음이요 그리스도의 할례니라 · 세례로 그리스도와 함께 장사되고" (2:11-12). 세례 = 새 할례 신학. Beasley-Murray·Moo.',
    match: (s) => s.has('G4061') && s.has('G0908') },
  { id: 'cosmic_triumph', role: '통치·권세 무장 해제 (개선식)', icon: '🏆', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἀπεκδυσάμενος τὰς ἀρχὰς καὶ τὰς ἐξουσίας', tr: '아페크뒤사메노스 타스 아르카스 카이 타스 엑수시아스',
    desc: '"통치자들과 권세들을 무력화하여 드러내어 · 십자가로 그들을 이기셨느니라" (2:15) — θριαμβεύσας = 로마 개선식 은유 · 우주적 승리. Wink·Wright·O\'Brien.',
    match: (s) => s.has('G0554') || s.has('G2358') },
  { id: 'above_things', role: '위의 것 찾으라 (3:1-2)', icon: '⬆️', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'τὰ ἄνω ζητεῖτε · τὰ ἄνω φρονεῖτε', tr: '타 아노 제테이테 · 타 아노 프로네이테',
    desc: '"그리스도와 함께 다시 살리심을 받았으면 위의 것을 찾으라 · 위의 것을 생각하고 땅의 것을 생각하지 말라" (3:1-2). 실천 부분 서두 · 부활 참여 신학. Moo·Wright.',
    match: (s) => s.has('G0507') },
  { id: 'life_hidden', role: '너희 생명 · 그리스도와 함께 감추어짐', icon: '🔒', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἡ ζωὴ ὑμῶν κέκρυπται σὺν τῷ Χριστῷ ἐν τῷ θεῷ', tr: '헤 조에 휘몬 케크뤼프타이 쉰 토 크리스토 엔 토 테오',
    desc: '"너희 생명이 그리스도와 함께 하나님 안에 감추어졌음이라 · 우리 생명이신 그리스도 나타나실 때에 너희도 영광 중에 나타나리라" (3:3-4). 종말론 · Dunn·O\'Brien.',
    match: (s) => s.has('G2928') && s.has('G2222') },
  { id: 'no_greek_jew_all_christ', role: '헬라·유대·야만·종·자유 = 그리스도 (3:11)', icon: '🤝', color: '#6366f1', bg: 'rgba(99,102,241,.13)',
    gr: 'οὐκ ἔνι Ἕλλην καὶ Ἰουδαῖος · Χριστὸς πάντα καὶ ἐν πᾶσιν', tr: '우크 에니 헬렌 카이 유다이오스 · 크리스토스 판타 카이 엔 파신',
    desc: '"거기에는 헬라인이나 유대인이나 할례파나 무할례파나 야만인이나 스구디아인이나 종이나 자유인이 차별이 있을 수 없나니 오직 그리스도는 만유시요 만유 안에 계시니라" (3:11). 갈 3:28 병행 확장. Moo·Wright.',
    match: null },
  { id: 'word_dwell_richly', role: '말씀 풍성히 거함 (3:16)', icon: '📖', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'ὁ λόγος τοῦ Χριστοῦ ἐνοικείτω ἐν ὑμῖν πλουσίως', tr: '호 로고스 투 크리스투 에노이케이토 엔 휘민 플루시오스',
    desc: '"그리스도의 말씀이 너희 속에 풍성히 거하여 · 시와 찬송과 신령한 노래를 부르며" (3:16). 엡 5:18 성령 충만 병행 · Colossian 예배학. O\'Brien·Bruce.',
    match: (s) => s.has('G1774') && s.has('G3056') },
];

const COL_MANUAL_DISCOURSE = {
  '1:6':   'mystery_christ_in_you',   // 온 천하에서와 같이 열매 맺어 자라는 도다
  '1:15':  'image_firstborn',         // 보이지 아니하는 하나님의 형상 · 먼저 나신 이
  '1:16':  'all_things_created',      // 만물이 그 안에서 창조되되
  '1:17':  'all_things_created',      // 만물이 그 안에 함께 섰느니라
  '1:18':  'head_body_church',        // 몸인 교회의 머리 · 죽은 자들 가운데 먼저 나신 이
  '1:19':  'pleroma_fullness',        // 모든 충만으로 예수 안에 거하게 하시고
  '1:20':  'reconciliation_peace_blood', // 십자가 피로 화평 · 만유 화목
  '1:22':  'reconciliation_peace_blood', // 육체의 죽음으로 말미암아 · 화목하게 하사
  '1:24':  'mystery_christ_in_you',   // 그리스도의 남은 고난 · 그의 몸된 교회 위하여
  '1:27':  'mystery_christ_in_you',   // 너희 안에 계신 그리스도 · 영광의 소망
  '2:3':   'christ_supremacy_hymn',   // 지혜와 지식의 모든 보화가 그 안에 감추어짐
  '2:6':   'above_things',            // 주 예수 받은 대로 · 그 안에서 행하되
  '2:8':   'colossian_heresy',        // 철학과 헛된 속임수 조심 · 초등학문
  '2:9':   'pleroma_fullness',        // 신성의 모든 충만이 육체로 거하시고
  '2:10':  'head_body_church',        // 모든 통치와 권세의 머리
  '2:11':  'circumcision_baptism',    // 그리스도의 할례 · 육의 몸을 벗음
  '2:12':  'circumcision_baptism',    // 세례로 그리스도와 함께 장사되고 다시 살리심
  '2:14':  'cosmic_triumph',          // 우리에게 불리한 증서 · 십자가에 못 박음
  '2:15':  'cosmic_triumph',          // 통치·권세 무장 해제 · 개선식 승리
  '2:16':  'colossian_heresy',        // 먹고 마심·절기·안식일·판단 X (그림자)
  '2:18':  'colossian_heresy',        // 천사 숭배·환상 · 육신의 생각 헛되이
  '2:20':  'colossian_heresy',        // 세상의 초등학문에서 죽었거늘
  '3:1':   'above_things',            // 그리스도와 함께 다시 살리심 · 위의 것 찾으라
  '3:2':   'above_things',            // 위의 것을 생각하고
  '3:3':   'life_hidden',             // 너희 생명이 그리스도와 함께 하나님 안에 감추어짐
  '3:4':   'life_hidden',             // 우리 생명이신 그리스도 나타나실 때
  '3:5':   'above_things',            // 땅에 있는 지체를 죽이라
  '3:9':   'above_things',            // 옛 사람과 그 행위를 벗어 버리고
  '3:10':  'above_things',            // 새 사람을 입었으니
  '3:11':  'no_greek_jew_all_christ', // 헬라·유대·야만·종·자유 · 그리스도 만유
  '3:15':  'reconciliation_peace_blood', // 그리스도의 평강이 너희 마음을 주장하게 하라
  '3:16':  'word_dwell_richly',       // 그리스도의 말씀이 너희 속에 풍성히 거하여
  '3:17':  'word_dwell_richly',       // 무엇을 하든지 주 예수의 이름으로
  '3:18':  'no_greek_jew_all_christ', // 아내들이여 남편에게 복종 (가정 규칙 시작)
  '3:23':  'word_dwell_richly',       // 무슨 일을 하든지 주께 하듯
  '4:2':   'word_dwell_richly',       // 기도를 계속하고 · 감사·깨어 있으라
  '4:6':   'word_dwell_richly',       // 너희 말을 항상 은혜 가운데 소금으로 맛을 냄
};

export const COL_CTX = {
  id: 'Col',
  book: { ko: '골로새서', bollsNum: 51, lexId: 'Col', lexCorpus: 'gnt', en: 'Colossians', testament: 'NT' },
  chapters: 4,
  discourseRules: [...GNT_DISCOURSE_RULES, ...COL_STRUCTURAL_RULES],
  manualDiscourse: COL_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신 · 옥중서신 · 이단 논박 서신 (에베소서·빌립보서·빌레몬서와 함께)',
    genreNote: '두기고+오네시모가 골로새·에베소·빌레몬 동시 전달 (골 4:7-9 = 엡 6:21 = 몬 10-12). 엡·골 병행 어휘 55% (Best·O\'Brien)',
    year: 'AD 60-62 (로마 감금 · 전통) · 학파설은 AD 70-90',
    yearNote: '엡·골·몬 동시 저술 · 로마 감금 · 골 4:10 아리스다고 = 행 27:2 동일 인물 근거',
    place: '로마 감금',
    placeNote: '4:10-14 동역자 목록 = 몬 23-24 병행 · 로마설 유리',
    author: '바울 (전통 · Bruce·Moo·Wright·O\'Brien·Dunn 다수) 또는 바울 학파 (Käsemann·Lohse·Sumney)',
    authorNote: '언어·문체 이례성 (긴 문장·중복) vs 이단 논박 상황 특수성 · Dunn 절충 (바울 후기 문체 진화)',
    audience: '골로새 교회 (에바브라 개척·바울 직접 방문 X · 1:7·2:1)',
    audienceNote: '리쿠스 계곡 삼도 (골로새·라오디게아·히에라볼리 · 4:13·4:16 라오디게아 서신 교환) · 이방인 다수',
    theme: '그리스도의 우선성·충족성 · 창조·유지·화해·머리 · 골로새 이단 논박',
    themeNote: '골로새 이단 = 유대적-신비주의-금욕 혼합 (2:8·2:16-23 · 천사 숭배·환상·엄격 규례) → 그리스도 πλήρωμα로 논박',
    chapterAgenda: {
      1: '인사(바울·디모데)·감사(에바브라 소식)·기도·**그리스도 찬가(1:15-20 형상·먼저 나신 이·만물 창조 유지·머리·화해·십자가 피)**·바울 사역 = 감추었던 신비 = 너희 안에 그리스도 영광의 소망(1:24-29)',
      2: '지혜·지식 보화 그 안에 감추어짐(2:3)·헛된 철학·초등학문 조심(2:8)·**신성의 모든 충만 육체로 거함(2:9)**·그리스도의 할례·세례로 함께 장사(2:11-13)·불리한 증서 십자가 못 박음(2:14)·통치·권세 무장 해제 개선식(2:15)·먹고 마심·절기·안식일 그림자·천사 숭배 조심',
      3: '위의 것 찾으라(3:1)·너희 생명 그리스도와 함께 감추어짐(3:3)·옛 사람 벗음·새 사람 입음(3:9-10)·헬라·유대·야만·종·자유 = 그리스도 만유(3:11)·평강·말씀 풍성히·시와 찬송(3:15-17)·가정 규칙(3:18-4:1 아내·남편·자녀·부모·종·상전)',
      4: '기도·감사·깨어(4:2)·은혜와 소금으로 말(4:6)·두기고·오네시모·아리스다고·마가·바나바 조카·유스도·에바브라·눅·데마(4:7-14)·라오디게아 서신 교환(4:16)·눔바(4:15)·마지막 인사',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 1, color: '#7c3aed', label: '그리스도 찬가·화해·바울 사역 (감사·1:15-20·신비)' },
      { id: 's2', fromCh: 2, toCh: 2, color: '#dc2626', label: '이단 논박 · 그리스도 안에서 충만·개선식 승리' },
      { id: 's3', fromCh: 3, toCh: 3, color: '#059669', label: '실천 · 위의 것·새 사람·가정 규칙' },
      { id: 's4', fromCh: 4, toCh: 4, color: '#0891b2', label: '기도·인사·동역자·라오디게아 교환' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 15, color: '#7c3aed', label: '형상 · 먼저 나신 이 (찬가 시작)' },
      { id: 'p2',  ch: 1, verse: 16, color: '#0369a1', label: '만물이 그 안에서 · 그로 말미암고 · 그를 위하여 창조' },
      { id: 'p3',  ch: 1, verse: 17, color: '#0369a1', label: '만물이 그 안에 함께 섰느니라 (우주 유지)' },
      { id: 'p4',  ch: 1, verse: 18, color: '#0891b2', label: '몸인 교회의 머리 · 죽은 자 가운데 먼저 나신 이' },
      { id: 'p5',  ch: 1, verse: 19, color: '#7c3aed', label: '모든 충만으로 예수 안에 거하게 하시고' },
      { id: 'p6',  ch: 1, verse: 20, color: '#dc2626', label: '십자가 피로 화평 · 만유 화목' },
      { id: 'p7',  ch: 1, verse: 27, color: '#7c3aed', label: '너희 안에 계신 그리스도 · 영광의 소망' },
      { id: 'p8',  ch: 2, verse: 3,  color: '#eab308', label: '지혜와 지식의 모든 보화 · 그 안에 감추어짐' },
      { id: 'p9',  ch: 2, verse: 6,  color: '#059669', label: '주 예수 받은 대로 · 그 안에서 행하되' },
      { id: 'p10', ch: 2, verse: 8,  color: '#dc2626', label: '헛된 철학 · 초등학문 조심 (골로새 이단)' },
      { id: 'p11', ch: 2, verse: 9,  color: '#7c3aed', label: '신성의 모든 충만 · 육체로 거함 (πλήρωμα)' },
      { id: 'p12', ch: 2, verse: 10, color: '#0891b2', label: '모든 통치·권세의 머리 · 그 안에서 충만' },
      { id: 'p13', ch: 2, verse: 14, color: '#dc2626', label: '불리한 증서 · 십자가에 못 박음' },
      { id: 'p14', ch: 2, verse: 15, color: '#dc2626', label: '통치·권세 무장 해제 · 개선식 승리' },
      { id: 'p15', ch: 3, verse: 1,  color: '#059669', label: '위의 것을 찾으라 (부활 참여)' },
      { id: 'p16', ch: 3, verse: 3,  color: '#7c3aed', label: '너희 생명 · 그리스도와 함께 하나님 안에 감추어짐' },
      { id: 'p17', ch: 3, verse: 4,  color: '#7c3aed', label: '그리스도 나타나실 때 · 너희도 영광 중에' },
      { id: 'p18', ch: 3, verse: 11, color: '#6366f1', label: '헬라·유대·야만·종·자유 = 그리스도 만유' },
      { id: 'p19', ch: 3, verse: 15, color: '#059669', label: '그리스도의 평강 · 마음을 주장하게 하라' },
      { id: 'p20', ch: 3, verse: 16, color: '#059669', label: '그리스도의 말씀이 너희 속에 풍성히 거하여' },
      { id: 'p21', ch: 3, verse: 17, color: '#059669', label: '무엇을 하든지 주 예수의 이름으로' },
      { id: 'p22', ch: 4, verse: 6,  color: '#0891b2', label: '은혜와 소금으로 맛을 냄 (말)' },
    ],
    arcs: [
      { id: 'a1',  from: 'p1',  to: 'p11', color: '#7c3aed', label: '형상 (1:15) → 신성 충만 육체로 (2:9) · 그리스도론 축' },
      { id: 'a2',  from: 'p2',  to: 'p14', color: '#0369a1', label: '만물 창조 → 통치·권세 무장 해제 (우주적 주권)' },
      { id: 'a3',  from: 'p4',  to: 'p12', color: '#0891b2', label: '교회 머리 → 모든 통치·권세 머리 (교회론·우주론)' },
      { id: 'a4',  from: 'p5',  to: 'p11', color: '#7c3aed', label: '모든 충만 (1:19) → 신성 충만 (2:9) · πλήρωμα Inclusio' },
      { id: 'a5',  from: 'p6',  to: 'p14', color: '#dc2626', label: '십자가 피 화해 → 개선식 승리 (십자가 축)' },
      { id: 'a6',  from: 'p10', to: 'p11', color: '#dc2626', label: '헛된 철학 → 신성 충만 (이단 논박 대안)' },
      { id: 'a7',  from: 'p7',  to: 'p17', color: '#7c3aed', label: '너희 안에 그리스도 → 그리스도 나타나실 때 영광 (종말)' },
      { id: 'a8',  from: 'p15', to: 'p16', color: '#059669', label: '위의 것 찾으라 → 생명 감추어짐 (부활 참여)' },
      { id: 'a9',  from: 'p9',  to: 'p21', color: '#059669', label: '그 안에서 행함 → 주 예수 이름으로 (실천 Inclusio)' },
      { id: 'a10', from: 'p18', to: 'p11', color: '#6366f1', label: '만유 = 그리스도 → 신성 충만 (그리스도 = 만유)' },
      { id: 'a11', from: 'p13', to: 'p14', color: '#dc2626', label: '불리한 증서 못 박음 → 통치 무장 해제 (구원의 우주적 결과)' },
      { id: 'a12', from: 'p19', to: 'p20', color: '#059669', label: '그리스도의 평강 → 말씀 풍성히 (내적 다스림)' },
      { id: 'a13', from: 'p16', to: 'p17', color: '#7c3aed', label: '감추어진 생명 → 영광 중 나타남 (종말 계시)' },
      { id: 'a14', from: 'p1',  to: 'p20', color: '#7c3aed', label: '형상 그리스도 → 말씀 풍성히 거함 (그리스도 임재 방식)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 데살로니가전서 (THESS1_CTX) — 바울 최초 서신 (AD 50-51) · 재림 신학 (파루시아 4:13-18) · 감사·격려
// 신약학 표준: Malherbe(AB) · Bruce(WBC) · Wanamaker(NIGTC) · Green(Pillar) · Fee(NICNT) · Weima(BECNT) · Marshall(NCBC) · Best(BNTC)
// ═══════════════════════════════════════════════════════════════════════════

const THESS1_STRUCTURAL_RULES = [
  { id: 'thanksgiving_recall', role: '감사·회상 3중', icon: '🙏', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'εὐχαριστοῦμεν τῷ θεῷ', tr: '유카리스투멘 토 테오',
    desc: '"우리가 하나님께 감사함" — 데살로니가전서 3회 시작 감사 (1:2·2:13·3:9) + 5:18 항상 감사. 서신 구조 프레임. Malherbe·Weima 서신 구조.',
    match: (s) => s.has('G2168') },
  { id: 'imitation_model', role: '본받은 자 · 본이 되어 (μιμητής·τύπος)', icon: '👥', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'μιμηταὶ ἡμῶν · τύπος πᾶσιν τοῖς πιστεύουσιν', tr: '미메타이 헤몬 · 튀포스 파신 토이스 피스튜우신',
    desc: '"너희는 우리와 주를 본받은 자가 되어" (1:6) · "마게도냐와 아가야에 있는 모든 믿는 자의 본이 되었으니" (1:7). 본받음 신학. Malherbe·Best.',
    match: (s) => s.has('G3402') || s.has('G5179') },
  { id: 'parousia_coming', role: '주의 강림 (παρουσία · 재림)', icon: '☁️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἡ παρουσία τοῦ κυρίου', tr: '헤 파루시아 투 퀴리우',
    desc: '"주 예수 강림하실 때에" (2:19·3:13·4:15·5:23 · 4회) · παρουσία = "왕의 방문·현현" 헬라어 정치 용어. Malherbe·Wanamaker 재림 신학.',
    match: (s) => s.has('G3952') },
  { id: 'rapture_meeting', role: '공중 만남 (Rapture · 4:16-17)', icon: '⛅', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἁρπαγησόμεθα ἐν νεφέλαις εἰς ἀπάντησιν τοῦ κυρίου', tr: '하르파게소메타 엔 네펠라이스 에이스 아판테신 투 퀴리우',
    desc: '"주께서 호령·천사장 소리·나팔소리로 강림하시리니 · 구름 속으로 끌어 올려 공중에서 주를 영접하게" (4:16-17). ἀπάντησις = 왕 마중 나감 (지상 귀환 함의). Wright·Bruce.',
    match: (s) => s.has('G0726') || s.has('G0529') },
  { id: 'day_of_lord', role: '주의 날 (ἡμέρα κυρίου · 도둑같이)', icon: '⚡', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἡμέρα κυρίου ὡς κλέπτης ἐν νυκτί', tr: '헤메라 퀴리우 호스 클렙테스 엔 뉘크티',
    desc: '"주의 날이 밤에 도둑같이 이를 줄을 너희 자신이 자세히 앎이라" (5:2) · OT 아모스 5:18·요엘 2 배경. 예수 마 24:43·눅 12:39 인용. Green·Weima.',
    match: (s) => s.has('G2250') && s.has('G2962') },
  { id: 'sons_of_light', role: '빛의 아들·낮의 아들 (5:5)', icon: '💡', color: '#eab308', bg: 'rgba(234,179,8,.14)',
    gr: 'υἱοὶ φωτός · υἱοὶ ἡμέρας', tr: '휘오이 포토스 · 휘오이 헤메라스',
    desc: '"너희는 다 빛의 아들이요 낮의 아들이라 · 우리가 밤이나 어둠에 속하지 아니하나니" (5:5). 쿰란 이원론 병행 (1QM) · 종말 공동체 정체성. Fee·Green.',
    match: (s) => s.has('G5457') && s.has('G5207') },
  { id: 'sanctification_holiness', role: '하나님의 뜻 = 거룩 (4:3-8)', icon: '✨', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'τοῦτο γάρ ἐστιν θέλημα τοῦ θεοῦ ὁ ἁγιασμὸς ὑμῶν', tr: '투토 가르 에스틴 텔레마 투 테우 호 하기아스모스 휘몬',
    desc: '"하나님의 뜻은 이것이니 너희의 거룩함이라 · 곧 음란을 버리고 · 각각 거룩함과 존귀함으로 자기의 아내 대할 줄" (4:3-4). 이방 배경 성 윤리. Malherbe·Weima.',
    match: (s) => s.has('G0038') },
  { id: 'brotherly_love', role: '형제 사랑 (φιλαδελφία · 4:9-10)', icon: '❤️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ὑμεῖς θεοδίδακτοί ἐστε εἰς τὸ ἀγαπᾶν ἀλλήλους', tr: '휘메이스 테오디닥토이 에스테 에이스 토 아가판 알렐루스',
    desc: '"너희는 하나님의 가르치심을 받아 서로 사랑함이라 · 온 마게도냐 모든 형제에 대함이라" (4:9-10). θεοδίδακτος (신약 유일). Green·Best.',
    match: (s) => s.has('G5360') || s.has('G2312') },
  { id: 'faith_hope_love_triad', role: '믿음·소망·사랑 3중 (1:3·5:8)', icon: '🌟', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ἔργου τῆς πίστεως · κόπου τῆς ἀγάπης · ὑπομονῆς τῆς ἐλπίδος', tr: '에르구 테스 피스테오스 · 코푸 테스 아가페스 · 휘포모네스 테스 엘피도스',
    desc: '"믿음의 역사 · 사랑의 수고 · 소망의 인내" (1:3) · "믿음과 사랑의 호심경·구원의 소망의 투구" (5:8). 최초 사도적 3중 정식 · 고전 13:13 병행. Fee·Malherbe.',
    match: (s) => s.has('G4102') && s.has('G0026') && s.has('G1680') },
  { id: 'work_own_hands', role: '자기 손으로 일함 (조용히)', icon: '🔨', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'ἐργάζεσθαι ταῖς χερσὶν ὑμῶν', tr: '에르가제스타이 타이스 케르신 휘몬',
    desc: '"조용히 자기 일을 하고 너희 손으로 일하기를 힘쓰라" (4:11) · 데살로니가 게으름 배경 (살후 3:6-12 확장). 노동 신학 · Malherbe.',
    match: (s) => s.has('G2038') && s.has('G5495') },
  { id: 'apostolic_care', role: '유모·아버지 사도 돌봄 (2:7·2:11)', icon: '👨‍👩‍👧', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'ὡς τροφὸς θάλπῃ τὰ ἑαυτῆς τέκνα · ὡς πατὴρ τέκνα ἑαυτοῦ', tr: '호스 트로포스 탈페 타 헤아우테스 테크나 · 호스 파테르 테크나 헤아우투',
    desc: '"유모가 자기 자녀를 기름과 같이" (2:7) · "아버지가 자기 자녀에게 하듯 · 권면하고 위로하고 경계함" (2:11). 사도 목양 이중 은유. Malherbe·Weima.',
    match: (s) => s.has('G5162') || (s.has('G3962') && s.has('G3870')) },
  { id: 'word_of_god_received', role: '하나님의 말씀 받음 (2:13)', icon: '📖', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'λόγον θεοῦ · οὐ λόγον ἀνθρώπων', tr: '로곤 테우 · 우 로곤 안트로폰',
    desc: '"우리가 전한 하나님의 말씀을 받을 때에 · 사람의 말로 받지 아니하고 하나님의 말씀으로 받음이니" (2:13). 초기 사도 자기 이해 · 말씀론. Bruce·Fee.',
    match: (s) => s.has('G3056') && s.has('G2316') },
];

const THESS1_MANUAL_DISCOURSE = {
  '1:2':   'thanksgiving_recall',     // 우리가 항상 하나님께 감사함 (감사 1)
  '1:3':   'faith_hope_love_triad',   // 믿음의 역사·사랑의 수고·소망의 인내
  '1:6':   'imitation_model',         // 너희는 우리와 주를 본받은 자
  '1:7':   'imitation_model',         // 마게도냐·아가야 모든 믿는 자의 본
  '1:10':  'parousia_coming',         // 하늘로부터 오실 그의 아들을 기다림 (재림 최초 언급)
  '2:7':   'apostolic_care',          // 유모가 자기 자녀를 기름과 같이
  '2:11':  'apostolic_care',          // 아버지가 자녀에게 하듯 권면·위로·경계
  '2:13':  'word_of_god_received',    // 하나님의 말씀으로 받음 (감사 2 + 말씀 · 후자 강조)
  '2:19':  'parousia_coming',         // 소망·기쁨의 면류관 · 주 예수 강림 (파루시아 1)
  '3:9':   'thanksgiving_recall',     // 우리가 어떻게 하나님께 감사할까 (감사 3)
  '3:13':  'parousia_coming',         // 주 예수 강림 · 마음 굳게 (파루시아 2)
  '4:3':   'sanctification_holiness', // 하나님의 뜻 = 너희 거룩
  '4:4':   'sanctification_holiness', // 각각 자기 아내 · 거룩·존귀
  '4:9':   'brotherly_love',          // 하나님의 가르치심 받아 서로 사랑
  '4:11':  'work_own_hands',          // 조용히 자기 일 · 손으로 일함
  '4:13':  'parousia_coming',         // 잠자는 자에 대해 알지 못함 X
  '4:15':  'parousia_coming',         // 주 강림 때까지 살아 남은 자 (파루시아 3)
  '4:16':  'rapture_meeting',         // 호령·천사장·나팔소리·강림
  '4:17':  'rapture_meeting',         // 구름 속으로 끌어 올려 공중 만남
  '5:2':   'day_of_lord',             // 주의 날 도둑같이
  '5:4':   'day_of_lord',             // 너희는 어둠에 있지 아니하매
  '5:5':   'sons_of_light',           // 다 빛의 아들·낮의 아들
  '5:8':   'faith_hope_love_triad',   // 믿음·사랑 호심경 · 구원 소망 투구
  '5:16':  'thanksgiving_recall',     // 항상 기뻐하라
  '5:17':  'thanksgiving_recall',     // 쉬지 말고 기도하라
  '5:18':  'thanksgiving_recall',     // 범사에 감사하라 (하나님의 뜻)
  '5:23':  'parousia_coming',         // 주 예수 강림 때까지 · 영·혼·몸 온전히 (파루시아 4)
  '5:24':  'sanctification_holiness', // 너희를 부르시는 이는 미쁘사 이루시리라
};

export const THESS1_CTX = {
  id: '1Thess',
  book: { ko: '데살로니가전서', bollsNum: 52, lexId: '1Thess', lexCorpus: 'gnt', en: '1 Thessalonians', testament: 'NT' },
  chapters: 5,
  discourseRules: [...GNT_DISCOURSE_RULES, ...THESS1_STRUCTURAL_RULES],
  manualDiscourse: THESS1_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신 · 바울 최초 서신 (홈로고우메나) · 목회 격려·재림 교리 서신',
    genreNote: '헬레니즘 편지 관습 완전 반영 (인사·감사·본론·권면·인사) · Malherbe 목양 철학자(paraenesis) · 재림 부분 = 예언·묵시 어휘',
    year: 'AD 50-51 (거의 확정)',
    yearNote: '고린도에서 (행 18:5 실라·디모데 마게도냐 귀환 = 살전 3:6) · 갈리오 총독 재임(행 18:12·AD 51-52) 근거 · 신약 최초기 문서 다수설',
    place: '고린도 (2차 선교여행 · 아가야)',
    placeNote: '살전 3:1 아덴 · 3:6 디모데 귀환 = 고린도 · Bruce·Malherbe·Wanamaker 확정',
    author: '바울·실루아노·디모데 (1:1 공동 발신자 · 실질 저자 바울)',
    authorNote: '홈로고우메나 · 저자 논쟁 없음 · 살후는 논쟁 (친서 vs 학파)',
    audience: '데살로니가 교회 (마게도냐 · 2차 선교여행 · 행 17:1-9 · 3주 사역 후 급히 떠남)',
    audienceNote: '유대인 반대·유대인 폭동으로 바울 도피 (행 17:5-10) · 젊은 이방인 교회 · 재림 오해 (죽은 성도 걱정)',
    theme: '재림(파루시아) 위로 · 감사·본받음 · 성화 · 형제 사랑 · 자기 손으로 일함',
    themeNote: 'παρουσία 4회 (2:19·3:13·4:15·5:23) 각 장 마감 위치 = 구조 표지 · 4:13-18 파루시아·5:1-11 주의 날 = 종말 두 축',
    chapterAgenda: {
      1: '인사(바울·실루아노·디모데)·감사 1(1:2)·믿음·소망·사랑 3중(1:3)·본받은 자·환난 성령 기쁨(1:6-7)·마게도냐·아가야 본이 됨·하늘로부터 오실 아들 기다림(1:10 재림 최초 언급)',
      2: '바울 데살로니가 사역 회상(2:1-12 유모·아버지 이중 은유 목양)·하나님의 말씀 받음(2:13 감사 2)·유대인 방해·소망 면류관 = 데살로니가(2:19 파루시아 1)',
      3: '디모데 파송(아덴 → 데살로니가)·믿음 견고 소식·바울 감사 3(3:9)·마음 굳게 함·거룩(3:13 파루시아 2)',
      4: '하나님의 뜻 = 거룩(4:3-8 성 윤리)·형제 사랑 = 하나님이 가르치심(4:9-10)·조용히 손으로 일함(4:11)·잠자는 자 대해 알지 못함 X(4:13)·**주 강림·호령·천사장·나팔·구름·공중 만남(4:16-17 파루시아 3)**',
      5: '주의 날 도둑같이(5:2)·빛의 아들·낮의 아들(5:5)·믿음·사랑 호심경·구원 소망 투구(5:8)·목자 훈계(5:12-22)·항상 기뻐(5:16)·쉬지 말고 기도(5:17)·범사에 감사(5:18)·영·혼·몸 온전히(5:23 파루시아 4)·미쁘신 이(5:24)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 3, color: '#059669', label: '감사·회상 · 바울 사역·디모데 파송·믿음 견고' },
      { id: 's2', fromCh: 4, toCh: 5, color: '#dc2626', label: '실천·재림 · 거룩·형제 사랑·파루시아·주의 날' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 3,  color: '#0369a1', label: '믿음·소망·사랑 3중 (최초 사도 정식)' },
      { id: 'p2',  ch: 1, verse: 6,  color: '#7c3aed', label: '본받은 자 · 환난 중 성령 기쁨' },
      { id: 'p3',  ch: 1, verse: 10, color: '#dc2626', label: '하늘로부터 오실 아들 기다림 (재림 최초 언급)' },
      { id: 'p4',  ch: 2, verse: 7,  color: '#059669', label: '유모가 자기 자녀를 기름과 같이 (목양)' },
      { id: 'p5',  ch: 2, verse: 13, color: '#059669', label: '하나님의 말씀으로 받음 (사람의 말 아닌)' },
      { id: 'p6',  ch: 2, verse: 19, color: '#dc2626', label: '소망·기쁨의 면류관 · 주 강림 (파루시아 1)' },
      { id: 'p7',  ch: 3, verse: 9,  color: '#059669', label: '어떻게 하나님께 감사할까 (감사 3)' },
      { id: 'p8',  ch: 3, verse: 13, color: '#dc2626', label: '주 예수 강림 · 마음 굳게 (파루시아 2)' },
      { id: 'p9',  ch: 4, verse: 3,  color: '#7c3aed', label: '하나님의 뜻 = 너희 거룩' },
      { id: 'p10', ch: 4, verse: 9,  color: '#dc2626', label: '하나님의 가르치심 · 서로 사랑' },
      { id: 'p11', ch: 4, verse: 11, color: '#b45309', label: '조용히 자기 손으로 일함' },
      { id: 'p12', ch: 4, verse: 13, color: '#dc2626', label: '잠자는 자에 대해 알지 못함 X (파루시아 3 도입)' },
      { id: 'p13', ch: 4, verse: 15, color: '#dc2626', label: '주의 강림 · 살아남은 자 (파루시아 3)' },
      { id: 'p14', ch: 4, verse: 16, color: '#7c3aed', label: '호령·천사장·나팔소리·강림' },
      { id: 'p15', ch: 4, verse: 17, color: '#7c3aed', label: '구름 속으로 · 공중 만남 · 항상 주와 함께' },
      { id: 'p16', ch: 5, verse: 2,  color: '#dc2626', label: '주의 날 · 밤에 도둑같이' },
      { id: 'p17', ch: 5, verse: 5,  color: '#eab308', label: '너희는 다 빛의 아들 · 낮의 아들' },
      { id: 'p18', ch: 5, verse: 8,  color: '#0369a1', label: '믿음·사랑 호심경 · 구원 소망 투구' },
      { id: 'p19', ch: 5, verse: 17, color: '#059669', label: '쉬지 말고 기도하라' },
      { id: 'p20', ch: 5, verse: 18, color: '#059669', label: '범사에 감사 · 하나님의 뜻' },
      { id: 'p21', ch: 5, verse: 23, color: '#dc2626', label: '주 강림 때까지 · 영·혼·몸 온전히 (파루시아 4)' },
      { id: 'p22', ch: 5, verse: 24, color: '#7c3aed', label: '부르시는 이는 미쁘사 이루시리라' },
    ],
    arcs: [
      { id: 'a1',  from: 'p3',  to: 'p21', color: '#dc2626', label: '아들 기다림 (1:10) → 강림 때 영·혼·몸 (5:23) · 재림 Inclusio' },
      { id: 'a2',  from: 'p6',  to: 'p8',  color: '#dc2626', label: '파루시아 1 → 파루시아 2 (각 장 마감 표지)' },
      { id: 'a3',  from: 'p8',  to: 'p13', color: '#dc2626', label: '파루시아 2 → 파루시아 3 (구조 축)' },
      { id: 'a4',  from: 'p13', to: 'p21', color: '#dc2626', label: '파루시아 3 → 파루시아 4 (재림 4중 축)' },
      { id: 'a5',  from: 'p1',  to: 'p18', color: '#0369a1', label: '믿음·소망·사랑 3중 → 호심경·투구 (3중 정식 재확인)' },
      { id: 'a6',  from: 'p12', to: 'p16', color: '#dc2626', label: '잠자는 자 → 주의 날 도둑같이 (4장 죽은 자 · 5장 산 자)' },
      { id: 'a7',  from: 'p14', to: 'p15', color: '#7c3aed', label: '호령·나팔 → 공중 만남 (Rapture 서사)' },
      { id: 'a8',  from: 'p9',  to: 'p10', color: '#7c3aed', label: '거룩 → 형제 사랑 (성화 이중 축)' },
      { id: 'a9',  from: 'p2',  to: 'p6',  color: '#7c3aed', label: '본받은 자 → 소망·기쁨의 면류관 (모범 → 상급)' },
      { id: 'a10', from: 'p4',  to: 'p11', color: '#059669', label: '유모 목양 → 조용히 일함 (사도 본 → 성도 실천)' },
      { id: 'a11', from: 'p17', to: 'p18', color: '#eab308', label: '빛의 아들 → 호심경·투구 (신분 → 무장)' },
      { id: 'a12', from: 'p19', to: 'p20', color: '#059669', label: '쉬지 말고 기도 → 범사에 감사 (3중 명령)' },
      { id: 'a13', from: 'p5',  to: 'p22', color: '#059669', label: '하나님의 말씀 → 미쁘신 이 (신실성 축)' },
      { id: 'a14', from: 'p3',  to: 'p15', color: '#7c3aed', label: '아들 기다림 → 공중 만남 (기다림의 성취)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 데살로니가후서 (THESS2_CTX) — 살전 쌍둥이 · 재림 오해 정정 (2:2) · 불법자·저지자·사탄 파루시아
// 신약학 표준: Malherbe(AB) · Bruce(WBC) · Wanamaker(NIGTC) · Green(Pillar) · Weima(BECNT) · Marshall(NCBC) · Best(BNTC) · Menken(NTT · 학파설)
// ═══════════════════════════════════════════════════════════════════════════

const THESS2_STRUCTURAL_RULES = [
  { id: 'thanksgiving_pattern', role: '감사·의무적 감사 (1:3·2:13)', icon: '🙏', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'εὐχαριστεῖν ὀφείλομεν τῷ θεῷ', tr: '유카리스테인 오페일로멘 토 테오',
    desc: '"우리가 너희를 위하여 항상 하나님께 감사할지니 · 이것이 마땅함이라(ὀφείλομεν)" (1:3·2:13) — 살전 감사와 달리 "당연·의무" 형식. Menken 학파설 근거 vs Malherbe 절충.',
    match: (s) => s.has('G2168') && s.has('G3784') },
  { id: 'persecution_endurance', role: '환난 인내 · 하나님 공의 심판 표지 (1:4-10)', icon: '⚔️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'ἔνδειγμα τῆς δικαίας κρίσεως τοῦ θεοῦ', tr: '엔데이그마 테스 디카이아스 크리세오스 투 테우',
    desc: '"이는 하나님의 공의로운 심판의 표(ἔνδειγμα)라 · 너희가 받는 환난이 하나님 나라에 합당한 자로 여김을 받게 하려" (1:5). 환난 = 신원 표지 · Bruce·Green 신정론.',
    match: (s) => s.has('G1730') || s.has('G2347') },
  { id: 'parousia_glory_fire', role: '주 예수 강림 · 불꽃 중에 (1:7-10)', icon: '🔥', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἐν τῇ ἀποκαλύψει τοῦ κυρίου Ἰησοῦ · ἐν πυρὶ φλογός', tr: '엔 테 아포칼륍세이 투 퀴리우 이에수 · 엔 퓌리 플로고스',
    desc: '"주 예수께서 자기의 능력의 천사들과 함께 하늘로부터 불꽃 중에 나타나실 때에 · 하나님을 모르는 자들과 복음에 복종하지 아니하는 자들에게 형벌을 내리시리로다" (1:7-8) · 시 79:6·사 66:15 배경. Marshall·Weima.',
    match: (s) => s.has('G0602') || (s.has('G4442') && s.has('G5395')) },
  { id: 'day_of_lord_correction', role: '주의 날 오해 정정 (2:1-2)', icon: '⚠️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ὡς ὅτι ἐνέστηκεν ἡ ἡμέρα τοῦ κυρίου', tr: '호스 호티 에네스테켄 헤 헤메라 투 퀴리우',
    desc: '"주의 날이 이미 이르렀다고 · 영으로나 또는 말로나 또는 우리에게서 받았다 하는 편지로나 쉽게 동심하거나 두려워하지 말아야 한다" (2:2) — 살전 4:13-18 오해 · 위조 편지 가능성 (Menken·Nicholl). Bruce·Wanamaker.',
    match: (s) => s.has('G1764') || (s.has('G2250') && s.has('G2962')) },
  { id: 'apostasy_falling_away', role: '먼저 배교 (ἀποστασία 2:3)', icon: '⬇️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'ἡ ἀποστασία πρῶτον', tr: '헤 아포스타시아 프로톤',
    desc: '"먼저 배교하는 일이 있고 · 저 불법의 사람 곧 멸망의 아들이 나타나기 전에는 그 날이 이르지 아니하리니" (2:3). 종말 배교 예고 · 유대·초대 교회 종말론. Green·Best.',
    match: (s) => s.has('G0646') },
  { id: 'man_of_lawlessness', role: '불법의 사람·멸망의 아들 (2:3-4)', icon: '👤', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ὁ ἄνθρωπος τῆς ἀνομίας · ὁ υἱὸς τῆς ἀπωλείας', tr: '호 안트로포스 테스 아노미아스 · 호 휘오스 테스 아폴레이아스',
    desc: '"불법의 사람 곧 멸망의 아들이 나타나기 전에는 · 그는 대적하는 자라 신이라고 불리는 모든 것과 숭배함을 받는 자 위에 자기를 높이고 · 하나님의 성전에 앉아 자기를 하나님이라고 내세우느니라" (2:3-4). 반그리스도 예고 · 단 11:36·겔 28. Malherbe·Wright.',
    match: (s) => (s.has('G0444') && s.has('G0458')) || s.has('G0684') },
  { id: 'restrainer', role: '저지자 (τὸ κατέχον · ὁ κατέχων 2:6-7)', icon: '🛑', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'τὸ κατέχον · ὁ κατέχων', tr: '토 카테콘 · 호 카테콘',
    desc: '"너희는 지금 그로 하여금 그의 때에 나타나게 하려 하여 막는 것을 아나니 · 불법의 비밀이 이미 활동하였으나 지금은 그것을 막는 자가 있어" (2:6-7) — 중성 (제국·법?) vs 남성 (성령·미가엘?) 해석 논쟁. 신약 최대 난해구 · Malherbe·Nicholl.',
    match: (s) => s.has('G2722') },
  { id: 'antichrist_parousia', role: '사탄의 파루시아 (거짓 표적)', icon: '⚡', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'κατʼ ἐνέργειαν τοῦ Σατανᾶ ἐν πάσῃ δυνάμει καὶ σημείοις καὶ τέρασιν ψεύδους', tr: '카트 에네르게이안 투 사타나 엔 파세 뒤나메이 카이 세메이오이스 카이 테라신 프슈두스',
    desc: '"악한 자의 나타남(παρουσία)은 사탄의 활동을 따라 모든 능력과 표적과 거짓 기적과" (2:9) — 사탄이 그리스도 파루시아 흉내. 마 24:24·계 13 병행 · Best·Green.',
    match: (s) => (s.has('G4567') && s.has('G4592')) || s.has('G5579') },
  { id: 'stand_firm_tradition', role: '전통 굳게 잡으라 (παραδόσεις 2:15)', icon: '🏛️', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'κρατεῖτε τὰς παραδόσεις', tr: '크라테이테 타스 파라도세이스',
    desc: '"굳건하게 서서 · 우리의 말로나 우리의 편지로 가르침을 받은 전통을 지키라" (2:15) — 사도 전통(παράδοσις) 개념 · 3:6에 재등장 (게으름 훈계도 전통). 초기 교회론. Weima·Wanamaker.',
    match: (s) => s.has('G3862') || s.has('G2902') },
  { id: 'work_discipline_lazy', role: '게으른 자 훈계 · 조용히 일하라 (3:6-15)', icon: '🔨', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'εἴ τις οὐ θέλει ἐργάζεσθαι μηδὲ ἐσθιέτω', tr: '에이 티스 우 텔레이 에르가제스타이 메데 에스티에토',
    desc: '"누구든지 일하기 싫어하거든 먹지도 말게 하라" (3:10) — 살전 4:11 확장 · 데살로니가 재림 임박 오해로 인한 게으름(ἀτάκτως) 문제. 바울 자기 손 노동 본(3:7-9). Malherbe·Weima.',
    match: (s) => s.has('G0813') || (s.has('G2038') && s.has('G3361')) },
  { id: 'lord_faithful_protect', role: '주는 미쁘사 굳게 하시고 · 악에서 지키시리라 (3:3)', icon: '🕊️', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'πιστὸς δέ ἐστιν ὁ κύριος', tr: '피스토스 데 에스틴 호 퀴리오스',
    desc: '"주는 미쁘사 너희를 굳건하게 하시고 악한 자에게서 지키시리라" (3:3) · "평강의 주께서 친히 · 항상 모든 일에 너희에게 평강을 주시기를" (3:16). 위로 절정 · Green·Best.',
    match: (s) => s.has('G4103') && s.has('G2962') },
  { id: 'peace_lord_himself', role: '평강의 주 친히 (3:16 축도)', icon: '🕊️', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'αὐτὸς δὲ ὁ κύριος τῆς εἰρήνης', tr: '아우토스 데 호 퀴리오스 테스 에이레네스',
    desc: '"평강의 주께서 친히 항상 모든 일에 너희에게 평강을 주시기를 원하노라" (3:16) · 바울 친필 서명 강조 (3:17 위조 편지 방지 · 2:2 배경). Malherbe·Nicholl.',
    match: (s) => s.has('G2962') && s.has('G1515') },
];

const THESS2_MANUAL_DISCOURSE = {
  '1:3':   'thanksgiving_pattern',      // 항상 하나님께 감사함 · 마땅함이라
  '1:4':   'persecution_endurance',     // 너희 참음과 믿음 · 박해와 환난 중에서
  '1:5':   'persecution_endurance',     // 하나님의 공의로운 심판의 표
  '1:7':   'parousia_glory_fire',       // 주 예수께서 하늘로부터 · 능력의 천사들과 함께 나타나심
  '1:8':   'parousia_glory_fire',       // 불꽃 중에 · 하나님 모르는 자·복음 복종 X 형벌
  '1:10':  'parousia_glory_fire',       // 그 날에 그의 성도들에게 영광을 받으시고
  '2:1':   'day_of_lord_correction',    // 주 예수 그리스도의 강림과 우리가 그 앞에 모임
  '2:2':   'day_of_lord_correction',    // 주의 날이 이미 이르렀다고 쉽게 동심 X
  '2:3':   'apostasy_falling_away',     // 먼저 배교 · 불법의 사람 나타남
  '2:4':   'man_of_lawlessness',        // 신이라고 불리는 모든 것에 대적 · 하나님 성전 앉음
  '2:6':   'restrainer',                // 지금 그를 막는 것을 아나니
  '2:7':   'restrainer',                // 불법의 비밀 활동 · 막는 자
  '2:8':   'man_of_lawlessness',        // 불법한 자 나타남 · 주 예수 입 기운으로 죽이심
  '2:9':   'antichrist_parousia',       // 사탄의 활동 · 모든 능력·표적·거짓 기적
  '2:13':  'thanksgiving_pattern',      // 우리가 항상 감사할지니 · 처음부터 구원 택하심
  '2:15':  'stand_firm_tradition',      // 굳게 서서 · 전통 지키라 (말·편지)
  '3:1':   'lord_faithful_protect',     // 우리를 위하여 기도 · 말씀 진보
  '3:3':   'lord_faithful_protect',     // 주는 미쁘사 굳게 하시고 악에서 지키심
  '3:6':   'work_discipline_lazy',      // 게으르게 행하고 우리에게 받은 전통대로 X 형제 떠나라
  '3:7':   'work_discipline_lazy',      // 우리가 게으르지 아니하며
  '3:9':   'work_discipline_lazy',      // 본을 보여 · 본받게 하려 함
  '3:10':  'work_discipline_lazy',      // 일하기 싫어하거든 먹지도 말게 하라
  '3:12':  'work_discipline_lazy',      // 조용히 일하여 자기 양식을 먹으라
  '3:16':  'peace_lord_himself',        // 평강의 주 친히 · 항상 모든 일에 평강
  '3:17':  'stand_firm_tradition',      // 나 바울이 친필로 문안 (모든 편지의 표시)
};

export const THESS2_CTX = {
  id: '2Thess',
  book: { ko: '데살로니가후서', bollsNum: 53, lexId: '2Thess', lexCorpus: 'gnt', en: '2 Thessalonians', testament: 'NT' },
  chapters: 3,
  discourseRules: [...GNT_DISCOURSE_RULES, ...THESS2_STRUCTURAL_RULES],
  manualDiscourse: THESS2_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신 · 재림 신학 정정 서신 (살전 쌍둥이)',
    genreNote: '살전 병행 구조 (감사·환난·재림·훈계) + 종말 정정 부분 (2:1-12) 삽입 · 위조 편지 가능성 언급 (2:2·3:17 친필)',
    year: 'AD 50-52 (친서설 · 살전 직후 · Bruce·Malherbe·Marshall) 또는 AD 80-100 (학파설 · Menken·Best)',
    yearNote: '살전 재림 오해 확산 → 즉각 후속 편지 (친서설) vs 파루시아 지연 상황 후대 위작 (학파설). 형식·어휘 차이는 상황 특수성 vs 학파 근거',
    place: '고린도 (친서설 · 살전과 동일) 또는 미상 (학파설)',
    placeNote: '살전과 같은 발신자 목록 (바울·실루아노·디모데 1:1) · 실라·디모데 고린도 체류 기간 근거',
    author: '바울 (전통 · Bruce·Marshall·Wanamaker·Green 다수) 또는 바울 학파 (Menken·Best·Trilling·Nicholl)',
    authorNote: '어휘·문체 차이 (묵시적 색채·형식적 감사 "ὀφείλομεν") vs 상황 대응 특수성 · Malherbe 절충 · 3:17 친필 서명 강조',
    audience: '데살로니가 교회 (살전 청중 동일)',
    audienceNote: '살전 이후 재림 임박 오해 확산 · 위조 편지 유통 가능성 (2:2 "우리에게서 받았다 하는 편지") · 게으름 문제 심화',
    theme: '주의 날 오해 정정 · 불법의 사람·저지자 · 환난 인내·게으름 훈계',
    themeNote: '2:1-12 종말 순서 계시 (배교 → 불법자 → 주 파루시아) · 살전 4:13-18 보완 · 3:17 친필 = 위조 방지 (진짜/가짜 편지 구별)',
    chapterAgenda: {
      1: '인사(바울·실루아노·디모데 = 살전과 동일)·감사 "마땅함이라"(1:3)·환난 인내 = 하나님 공의 심판 표(1:5)·주 예수 강림 · 하늘로부터 불꽃 중에 · 형벌·영광 이중 계시(1:7-10)·기도(1:11-12)',
      2: '**주의 날 이미 이르렀다는 것 X(2:1-2)**·먼저 배교(ἀποστασία)·불법의 사람 = 멸망의 아들·하나님 성전 앉음(2:3-4)·저지자(τὸ κατέχον·ὁ κατέχων 신약 최대 난해구 2:6-7)·주 예수 입 기운으로 죽이심(2:8)·사탄의 파루시아·거짓 능력·표적·기적(2:9-12)·감사(2:13)·전통 굳게 잡으라(2:15)·기도(2:16-17)',
      3: '우리 위하여 기도(3:1 말씀 진보)·주는 미쁘사(3:3 굳게·악에서 지키심)·**게으른 형제 훈계**·바울 자기 손 노동 본(3:7-9)·일 안 하면 먹지 말게(3:10)·조용히 자기 양식(3:12)·본받지 아니하는 자 사귀지 말라(3:14)·평강의 주 친히(3:16)·**바울 친필 서명(3:17 · 모든 편지의 표)**',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 1, color: '#b45309', label: '감사·환난 인내·주 강림 영광 (신정론)' },
      { id: 's2', fromCh: 2, toCh: 2, color: '#dc2626', label: '주의 날 오해 정정·불법자·저지자·사탄 파루시아' },
      { id: 's3', fromCh: 3, toCh: 3, color: '#059669', label: '기도·게으름 훈계·평강·친필 서명' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 3,  color: '#059669', label: '감사 · 마땅함이라 (ὀφείλομεν 의무형)' },
      { id: 'p2',  ch: 1, verse: 5,  color: '#b45309', label: '하나님의 공의로운 심판의 표 (환난)' },
      { id: 'p3',  ch: 1, verse: 7,  color: '#dc2626', label: '주 예수 강림 · 하늘로부터 불꽃 중에' },
      { id: 'p4',  ch: 1, verse: 8,  color: '#dc2626', label: '하나님 모르는 자 · 복음 복종 X 형벌' },
      { id: 'p5',  ch: 1, verse: 10, color: '#7c3aed', label: '성도들에게 영광 · 경이롭게 여김 받으심' },
      { id: 'p6',  ch: 2, verse: 2,  color: '#dc2626', label: '주의 날 이미 이르렀다 X (오해 정정)' },
      { id: 'p7',  ch: 2, verse: 3,  color: '#b45309', label: '먼저 배교 · 불법의 사람 나타남' },
      { id: 'p8',  ch: 2, verse: 4,  color: '#dc2626', label: '하나님 성전 앉음 · 자기를 하나님이라' },
      { id: 'p9',  ch: 2, verse: 6,  color: '#0891b2', label: '저지하는 것 (τὸ κατέχον)' },
      { id: 'p10', ch: 2, verse: 7,  color: '#0891b2', label: '저지하는 자 (ὁ κατέχων)' },
      { id: 'p11', ch: 2, verse: 8,  color: '#dc2626', label: '주 예수 입 기운으로 죽이심 · 강림 광채로 폐하심' },
      { id: 'p12', ch: 2, verse: 9,  color: '#dc2626', label: '사탄의 활동 · 거짓 능력·표적·기적' },
      { id: 'p13', ch: 2, verse: 13, color: '#059669', label: '감사 2 · 처음부터 구원 택하심' },
      { id: 'p14', ch: 2, verse: 15, color: '#7c3aed', label: '전통 굳게 잡으라 (말·편지)' },
      { id: 'p15', ch: 3, verse: 3,  color: '#0369a1', label: '주는 미쁘사 · 굳게 하시고 악에서 지키심' },
      { id: 'p16', ch: 3, verse: 6,  color: '#059669', label: '게으르게 행하는 형제 · 떠나라' },
      { id: 'p17', ch: 3, verse: 10, color: '#059669', label: '일하기 싫으면 먹지도 말게 하라' },
      { id: 'p18', ch: 3, verse: 16, color: '#059669', label: '평강의 주 친히 · 항상 모든 일에 평강' },
      { id: 'p19', ch: 3, verse: 17, color: '#7c3aed', label: '나 바울이 친필로 문안 (모든 편지의 표)' },
    ],
    arcs: [
      { id: 'a1',  from: 'p3',  to: 'p11', color: '#dc2626', label: '주 강림 (1:7) → 불법자 폐하심 (2:8) · 파루시아 축' },
      { id: 'a2',  from: 'p6',  to: 'p11', color: '#dc2626', label: '오해 정정 → 실제 순서 (배교→불법자→강림)' },
      { id: 'a3',  from: 'p7',  to: 'p8',  color: '#b45309', label: '배교 → 불법의 사람 등장 (종말 순서)' },
      { id: 'a4',  from: 'p9',  to: 'p10', color: '#0891b2', label: 'τὸ κατέχον (중성) → ὁ κατέχων (남성) · 저지자 대구' },
      { id: 'a5',  from: 'p8',  to: 'p12', color: '#dc2626', label: '하나님 성전 앉음 → 사탄 파루시아 (거짓 신격)' },
      { id: 'a6',  from: 'p11', to: 'p12', color: '#dc2626', label: '주 파루시아 vs 사탄 파루시아 (대조)' },
      { id: 'a7',  from: 'p1',  to: 'p13', color: '#059669', label: '감사 1 → 감사 2 (구원 신정론)' },
      { id: 'a8',  from: 'p14', to: 'p6',  color: '#7c3aed', label: '전통 굳게 → 오해 정정 (거짓 편지 대응)' },
      { id: 'a9',  from: 'p14', to: 'p19', color: '#7c3aed', label: '전통 굳게 → 친필 서명 (진짜 편지 표지)' },
      { id: 'a10', from: 'p6',  to: 'p19', color: '#7c3aed', label: '오해 (거짓 편지) → 친필 서명 (2:2 문제 → 3:17 해답)' },
      { id: 'a11', from: 'p16', to: 'p17', color: '#059669', label: '게으름 훈계 → 명령 (일 안 하면 X 먹음)' },
      { id: 'a12', from: 'p2',  to: 'p18', color: '#0369a1', label: '환난 → 평강 (신정론 완성)' },
      { id: 'a13', from: 'p15', to: 'p18', color: '#0369a1', label: '미쁘신 주 → 평강의 주 (주 자기 이중 은유)' },
      { id: 'a14', from: 'p5',  to: 'p13', color: '#7c3aed', label: '성도에게 영광 → 처음부터 택하심 (구원 연쇄)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 빌레몬서 (PHLM_CTX) — 최단 서신 (1장 25절) · 오네시모 서사 · 노예제 재해석 · 골로새서 짝
// 신약학 표준: Fitzmyer(AB) · Dunn(NIGTC) · Bruce(NICNT) · O'Brien(WBC) · Barth-Blanke(Anchor) · Wright(TNTC) · Moo(Pillar) · McKnight(NICNT) · deSilva
// ═══════════════════════════════════════════════════════════════════════════

const PHLM_STRUCTURAL_RULES = [
  { id: 'useful_pun', role: '무익→유익 어원 유희 (Ὀνήσιμος)', icon: '💡', color: '#eab308', bg: 'rgba(234,179,8,.14)',
    gr: 'τὸν ποτέ σοι ἄχρηστον νυνὶ δὲ σοὶ καὶ ἐμοὶ εὔχρηστον', tr: '톤 포테 소이 아크레스톤 뉘니 데 소이 카이 에모이 유크레스톤',
    desc: '"그가 전에는 네게 무익하였으나 이제는 나와 네게 유익하므로" (11절) — 오네시모(Ὀνήσιμος = "유익한 자") 이름 어원 유희. ἄχρηστον / εὔχρηστον 대구. Fitzmyer·Dunn 수사학 정점.',
    match: (s) => s.has('G0890') || s.has('G2173') },
  { id: 'brother_beloved', role: '종 이상의 사랑받는 형제 (16절)', icon: '❤️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'οὐκέτι ὡς δοῦλον ἀλλὰ ὑπὲρ δοῦλον ἀδελφὸν ἀγαπητόν', tr: '우케티 호스 둘론 알라 휘페르 둘론 아델폰 아가페톤',
    desc: '"이후로는 종과 같이 대하지 아니하고 종 이상으로 곧 사랑받는 형제로 · 육신과 주 안에서 특별히 나에게 그러하거든 하물며 네게랴" (16절). 노예제 신학적 전복 · Wright·McKnight·Bauckham.',
    match: (s) => (s.has('G0080') && s.has('G0027')) || s.has('G1401') },
  { id: 'voluntary_not_compulsion', role: '자의로 · 억지 아닌 (14절)', icon: '🤲', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'ἵνα μὴ ὡς κατὰ ἀνάγκην τὸ ἀγαθόν σου ᾖ ἀλλὰ κατὰ ἑκούσιον', tr: '히나 메 호스 카타 아낭켄 토 아가톤 수 에 알라 카타 헤쿠시온',
    desc: '"네 승낙이 없이는 내가 아무 것도 하기를 원하지 아니하노니 · 너의 선한 일이 억지같이 되지 아니하고 자의로 되게 하려 함이라" (14절). 사도 권위 vs 자율적 사랑. Dunn·Fitzmyer.',
    match: (s) => s.has('G0318') || s.has('G1595') },
  { id: 'debt_charge_me', role: '내게 돌리라 · 네가 빚졌으니 (18-19절)', icon: '📜', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'εἴ τι ἠδίκησέν σε ἢ ὀφείλει τοῦτο ἐμοὶ ἐλλόγα', tr: '에이 티 에디케센 세 에 오페일레이 투토 에모이 엘로가',
    desc: '"그가 만일 네게 불의를 하였거나 네게 빚진 것이 있으면 그것을 내 앞으로 계산하라 · 나 바울이 친필로 쓰노니 내가 갚으려니와 · 너는 이 외에 네 자신이 내게 빚진 것도 나는 말하지 아니하노라" (18-19). 대속 신학 축소판 · Wright·McKnight *대신 지불*.',
    match: (s) => s.has('G1677') || s.has('G3784') },
  { id: 'paul_prisoner', role: '매인 자 바울 (δέσμιος · 1·9·10)', icon: '⛓️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'Παῦλος δέσμιος Χριστοῦ Ἰησοῦ · ὁ πρεσβύτης νυνὶ δὲ καὶ δέσμιος', tr: '파울로스 데스미오스 크리스투 이에수 · 호 프레스뷔테스 뉘니 데 카이 데스미오스',
    desc: '"그리스도 예수를 위하여 갇힌 자 된 바울" (1) · "이러한 자로서 내가 · 나이가 많은 나 바울은 지금 또 예수 그리스도를 위하여 갇힌 자 되어" (9). 사도가 아닌 죄수로 겸손 호소. Fitzmyer.',
    match: (s) => s.has('G1198') },
  { id: 'koinonia_partner', role: '동역자 · 나같이 영접 (17절)', icon: '🤝', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'εἰ οὖν με ἔχεις κοινωνόν προσλαβοῦ αὐτὸν ὡς ἐμέ', tr: '에이 운 메 에케이스 코이노논 프로슬라부 아우톤 호스 에메',
    desc: '"그러므로 네가 나를 동역자로 알진대 그를 영접하기를 내게 하듯 하고" (17절). κοινωνός = 사업 동업자·영적 파트너 (빌 1:5 병행). 그리스도인 상호성. Ogereau·Fitzmyer.',
    match: (s) => s.has('G2844') || s.has('G4355') },
  { id: 'refresh_hearts', role: '심장 시원케 (σπλάγχνα · 7·12·20)', icon: '💗', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'τὰ σπλάγχνα τῶν ἁγίων ἀναπέπαυται · ἀνάπαυσόν μου τὰ σπλάγχνα', tr: '타 스플랑크나 톤 하기온 아나페파우타이 · 아나파우손 무 타 스플랑크나',
    desc: '"성도들의 심장이 너로 말미암아 평안함을 얻었나니" (7) · "저는 내 심장이라" (12 오네시모) · "나로 주 안에서 너로 말미암아 기쁨을 얻게 하고 내 심장이 그리스도 안에서 평안함을 얻게 하라" (20). σπλάγχνα 3중 축. Fitzmyer·Barth-Blanke.',
    match: (s) => s.has('G4698') || s.has('G0373') },
  { id: 'slavery_transcend', role: '노예제 재해석 · 잠시 → 영원 (15-16)', icon: '🔄', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἵνα αἰώνιον αὐτὸν ἀπέχῃς', tr: '히나 아이오니온 아우톤 아페케스',
    desc: '"아마도 그가 잠시 떠나게 된 것은 이를 통해 네가 그를 영원히 두게 함이리니 · 이후로는 종이 아니라 사랑받는 형제로" (15-16). 하나님 섭리 · 노예 신분 → 형제 신분 전환. 노예제 자체 폐지 아니나 근본 재정의. Bauckham·McKnight·Wright.',
    match: (s) => s.has('G0166') || s.has('G4363') },
];

const PHLM_MANUAL_DISCOURSE = {
  '1:1':   'paul_prisoner',              // 그리스도 예수를 위하여 갇힌 자 된 바울
  '1:6':   'koinonia_partner',           // 너의 믿음의 교제가 활력이 있게 되기를
  '1:7':   'refresh_hearts',             // 성도들의 심장이 너로 말미암아 평안함
  '1:9':   'paul_prisoner',              // 나이가 많은 나 바울 · 갇힌 자 되어
  '1:10':  'paul_prisoner',              // 갇힌 중에서 낳은 아들 오네시모
  '1:11':  'useful_pun',                 // 전에는 네게 무익하였으나 · 이제는 유익
  '1:12':  'refresh_hearts',             // 저는 내 심장이라 · 네게 돌려보내노니
  '1:13':  'koinonia_partner',           // 내가 붙들어 두고자 하나 (복음의 매임)
  '1:14':  'voluntary_not_compulsion',   // 네 승낙 없이 · 억지 아닌 자의로
  '1:15':  'slavery_transcend',          // 잠시 떠난 것 · 영원히 두게 함
  '1:16':  'brother_beloved',            // 종 이상 · 사랑받는 형제로
  '1:17':  'koinonia_partner',           // 나를 동역자로 알진대 · 내게 하듯 영접
  '1:18':  'debt_charge_me',             // 불의·빚 있으면 · 내 앞으로 계산
  '1:19':  'debt_charge_me',             // 나 바울이 친필로 · 갚으려니와 · 네 자신도 내게 빚짐
  '1:20':  'refresh_hearts',             // 내 심장이 그리스도 안에서 평안함
};

export const PHLM_CTX = {
  id: 'Phlm',
  book: { ko: '빌레몬서', bollsNum: 57, lexId: 'Phlm', lexCorpus: 'gnt', en: 'Philemon', testament: 'NT' },
  chapters: 1,
  discourseRules: [...GNT_DISCOURSE_RULES, ...PHLM_STRUCTURAL_RULES],
  manualDiscourse: PHLM_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신 · 개인 서신 (personal letter) · 신약 최단 서신 (25절)',
    genreNote: '헬레니즘 우정·중재 편지 관습 완전 반영 (Cicero·Pliny 병행) · 정교한 수사학 (deSilva 정중한 요청) · 유일한 개인 대상 · 그러나 공동체 청중 병기 (2절 압비아·아킵보·너희 집 교회)',
    year: 'AD 60-62 (로마 감금 · 골로새서와 동시 저술)',
    yearNote: '두기고+오네시모 동시 파송 (골 4:7-9 = 몬 10-12) · 감금 언급 (1·9·10·13·23)',
    place: '로마 감금 (전통) · 에베소 가설 (소수)',
    placeNote: '골로새서와 동일 · 골 4:9 = 몬 10-12 병행 · 에바브라 문안 병기 (골 4:12 = 몬 23)',
    author: '바울 · 디모데 (1절 공동 발신자 · 홈로고우메나 · 저자 논쟁 없음)',
    authorNote: '바울 친서 논쟁 없음 (자기 언급 19절 친필 서명) · 목회서신 학파설 근거 X',
    audience: '빌레몬 (골로새 교회 신자·오네시모의 주인·부유한 그리스도인) + 압비아·아킵보·너희 집 교회 (2절 공동체)',
    audienceNote: '빌레몬 = 골 4:17 아킵보 관련 가능성 · 골로새 교회 회원 · 오네시모(Ὀνήσιμος = "유익")는 도망한 종·후에 회심',
    theme: '그리스도 안에서 새로운 관계 · 노예 → 사랑받는 형제 · 환대·용서·자의로',
    themeNote: '노예제 자체 폐지 X (Barth-Blanke 논쟁) 그러나 신학적 근본 재정의 (16절 "종 이상") · 대속 축소판 (18-19절 · 그리스도 대신 지불)',
    chapterAgenda: {
      1: '**인사(1-3 매인 자 바울·디모데 → 빌레몬·압비아·아킵보·집 교회)**·감사·기도(4-7 심장 시원)·**오네시모 간청 본론(8-20)**: 사도 권위 대신 사랑 호소(8-9)·갇힌 중에 낳은 아들(10)·무익→유익 어원 유희(11)·심장 보냄(12)·자의로 억지 X(14)·잠시→영원(15)·**종 이상 사랑받는 형제(16)**·동역자 영접(17)·**내게 돌리라 친필 서명(18-19)**·심장 시원(20)·결론(21-25 순종 확신·객실 준비·에바브라·마가·아리스다고·데마·눅 문안)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 1, color: '#7c3aed', label: '인사·감사·오네시모 간청·결론 (단일 흐름)' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 1,  color: '#b45309', label: '매인 자 바울 (사도 대신 죄수 호칭)' },
      { id: 'p2',  ch: 1, verse: 6,  color: '#059669', label: '믿음의 교제 활력' },
      { id: 'p3',  ch: 1, verse: 7,  color: '#dc2626', label: '성도들의 심장 시원 (σπλάγχνα 1)' },
      { id: 'p4',  ch: 1, verse: 9,  color: '#b45309', label: '늙은 바울 · 갇힌 자 (겸손 호소)' },
      { id: 'p5',  ch: 1, verse: 10, color: '#7c3aed', label: '갇힌 중 낳은 아들 오네시모' },
      { id: 'p6',  ch: 1, verse: 11, color: '#eab308', label: '무익 → 유익 (오네시모 어원 유희)' },
      { id: 'p7',  ch: 1, verse: 12, color: '#dc2626', label: '저는 내 심장이라 (σπλάγχνα 2)' },
      { id: 'p8',  ch: 1, verse: 14, color: '#0891b2', label: '자의로 · 억지 아닌 (사랑 호소)' },
      { id: 'p9',  ch: 1, verse: 15, color: '#7c3aed', label: '잠시 떠남 → 영원히 얻음 (섭리)' },
      { id: 'p10', ch: 1, verse: 16, color: '#dc2626', label: '종 이상 · 사랑받는 형제 (핵심)' },
      { id: 'p11', ch: 1, verse: 17, color: '#059669', label: '동역자로 알진대 · 나같이 영접' },
      { id: 'p12', ch: 1, verse: 18, color: '#b45309', label: '불의·빚 · 내 앞으로 계산 (대속 축소판)' },
      { id: 'p13', ch: 1, verse: 19, color: '#b45309', label: '친필 서명 · 네 자신도 내게 빚짐' },
      { id: 'p14', ch: 1, verse: 20, color: '#dc2626', label: '내 심장 시원케 (σπλάγχνα 3)' },
    ],
    arcs: [
      { id: 'a1',  from: 'p3',  to: 'p14', color: '#dc2626', label: '성도 심장 시원 (7) → 내 심장 시원 (20) · σπλάγχνα Inclusio' },
      { id: 'a2',  from: 'p5',  to: 'p10', color: '#7c3aed', label: '낳은 아들 → 사랑받는 형제 (신분 상승)' },
      { id: 'a3',  from: 'p6',  to: 'p11', color: '#eab308', label: '유익 (이름 성취) → 동역자 영접' },
      { id: 'a4',  from: 'p12', to: 'p13', color: '#b45309', label: '내 앞 계산 → 네 자신 빚짐 (교차 대속)' },
      { id: 'a5',  from: 'p1',  to: 'p4',  color: '#b45309', label: '매인 자 (인사) → 갇힌 자 (호소) · 겸손 축' },
      { id: 'a6',  from: 'p8',  to: 'p11', color: '#0891b2', label: '자의로 → 동역자 영접 (자율적 사랑)' },
      { id: 'a7',  from: 'p9',  to: 'p10', color: '#7c3aed', label: '잠시→영원 → 종 이상 (섭리 신학)' },
      { id: 'a8',  from: 'p7',  to: 'p14', color: '#dc2626', label: '오네시모 = 내 심장 → 내 심장 시원 (요청 근거)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 디모데전서 (TIM1_CTX) — 목회서신 · 교회 조직 (감독·집사·과부·장로) · 경건의 신비 · 거짓 교사 논박
// 신약학 표준: Marshall(ICC) · Mounce(WBC) · Knight(NIGTC) · Towner(NICNT) · Fee(NIBC) · Johnson(AB) · Yarbrough(Pillar) · Collins(NTL)
// ═══════════════════════════════════════════════════════════════════════════

const TIM1_STRUCTURAL_RULES = [
  { id: 'faithful_saying', role: '미쁘다 이 말이여 (πιστὸς ὁ λόγος)', icon: '✅', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'πιστὸς ὁ λόγος', tr: '피스토스 호 로고스',
    desc: '"미쁘다 이 말이여 · 모든 사람이 받을 만한 말이로다" — 목회서신 특유 정형구 5회 (딤전 1:15·3:1·4:9 · 딤후 2:11 · 딛 3:8). 초대 교회 신조·찬송 인용 표지. Marshall·Knight·Towner.',
    match: (s) => s.has('G4103') && s.has('G3056') },
  { id: 'good_fight_faith', role: '믿음의 선한 싸움 (6:12)', icon: '⚔️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἀγωνίζου τὸν καλὸν ἀγῶνα τῆς πίστεως', tr: '아고니주 톤 칼론 아고나 테스 피스테오스',
    desc: '"믿음의 선한 싸움을 싸우라 · 영생을 취하라" (6:12) — 경기·군사 은유 · 딤후 4:7 "선한 싸움 다 싸우고" 병행. Pfitzner *Paul and the Agon Motif* · Mounce.',
    match: (s) => s.has('G0075') && s.has('G4102') },
  { id: 'overseer_deacon_qualifications', role: '감독·집사 자격 (3:1-13)', icon: '🏛️', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ἐπίσκοπος · διάκονος', tr: '에피스코포스 · 디아코노스',
    desc: '"감독은 책망할 것이 없으며 한 아내의 남편이 되며 · 집사들도 마찬가지로 정중하고" (3:1-13) — 목회서신 특유 조직 규정 · 딛 1:5-9 병행 · 초대 교회 직제 확립. Campbell·Marshall·Mounce.',
    match: (s) => s.has('G1985') || s.has('G1249') },
  { id: 'mystery_of_godliness', role: '경건의 신비 (3:16 초대 찬송)', icon: '🎵', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'τὸ τῆς εὐσεβείας μυστήριον · ὃς ἐφανερώθη ἐν σαρκί', tr: '토 테스 유세베이아스 뮈스테리온 · 호스 에파네로테 엔 사르키',
    desc: '"크도다 경건의 비밀이여 · 그는 육신으로 나타난 바 되시고 영으로 의롭다 하심을 받으시고 · 천사들에게 보이시고 · 만국에 전파되시고 · 세상에서 믿은 바 되시고 · 영광 가운데서 올려지셨느니라" (3:16) — 초대 교회 그리스도 찬송 6행 · Gundry·Mounce.',
    match: (s) => s.has('G3466') && s.has('G2150') },
  { id: 'false_teachers_law', role: '거짓 교사·율법 오용 (1:3-11·6:3-10)', icon: '⚠️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἑτεροδιδασκαλεῖν · μὴ προσέχειν μύθοις καὶ γενεαλογίαις', tr: '헤테로디다스칼레인 · 메 프로세케인 뮈토이스 카이 게네알로기아이스',
    desc: '"다른 교훈을 가르치지 말며 · 신화와 끝없는 족보에 몰두하지 말게 하려 함이라" (1:3-4) · "돈을 사랑함이 일만 악의 뿌리" (6:10). 에베소 이단(유대-영지 혼합 · Fee·Towner) · 오네시보로.',
    match: (s) => s.has('G2085') || s.has('G3454') },
  { id: 'godliness_contentment', role: '경건과 자족 (6:6)', icon: '⚖️', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'ἔστιν δὲ πορισμὸς μέγας ἡ εὐσέβεια μετὰ αὐταρκείας', tr: '에스틴 데 포리스모스 메가스 헤 유세베이아 메타 아우타르케이아스',
    desc: '"그러나 자족하는 마음이 있으면 경건은 큰 이익이 되느니라" (6:6) — εὐσέβεια(경건 · 목회서신 특유 어휘 10회) + αὐτάρκεια(자족 · 빌 4:11 병행). Fee·Marshall.',
    match: (s) => s.has('G2150') && s.has('G0841') },
  { id: 'one_mediator_ransom', role: '한 중보자·모든 사람 대속물 (2:5-6)', icon: '🕊️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'εἷς καὶ μεσίτης θεοῦ καὶ ἀνθρώπων · ἀντίλυτρον ὑπὲρ πάντων', tr: '헤이스 카이 메시테스 테우 카이 안트로폰 · 안틸뤼트론 휘페르 판톤',
    desc: '"하나님은 한 분이시요 · 하나님과 사람 사이에 중보자도 한 분이시니 · 곧 사람이신 그리스도 예수라 · 그가 모든 사람을 위하여 자기를 대속물(ἀντίλυτρον)로 주셨으니" (2:5-6). 막 10:45 병행 · Marshall·Knight.',
    match: (s) => s.has('G3316') || s.has('G0487') },
  { id: 'widows_care', role: '과부 돌봄 규정 (5:3-16)', icon: '👵', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'χήρας τίμα τὰς ὄντως χήρας · χήρα καταλεγέσθω μὴ ἔλαττον ἐτῶν ἑξήκοντα', tr: '케라스 티마 타스 온토스 케라스 · 케라 카탈레게스토 메 엘라톤 에톤 헥세콘타',
    desc: '"참 과부인 과부를 존대하라" (5:3) · "명부에 올릴 과부는 나이가 육십이 덜 되지 아니하고 한 남편의 아내였던 자" (5:9) — 초대 교회 과부 명부 제도 · 사회 복지 신학. Marshall·Bassler.',
    match: (s) => s.has('G5503') },
  { id: 'prayer_all_men', role: '만인 위한 기도·왕들 위한 기도 (2:1-4)', icon: '🙏', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'ὑπὲρ πάντων ἀνθρώπων · ὑπὲρ βασιλέων', tr: '휘페르 판톤 안트로폰 · 휘페르 바실레온',
    desc: '"모든 사람을 위하여 · 임금들과 높은 지위에 있는 모든 사람을 위하여" 간구·기도·도고·감사(2:1-2) · 하나님이 "모든 사람이 구원 받으며 진리를 아는 데에 이르기를 원하시느니라"(2:4). 로마 제국 문맥. Towner·Johnson.',
    match: (s) => s.has('G4335') && s.has('G4771') },
  { id: 'timothy_youth', role: '디모데 젊음 · 본을 보이라 (4:12)', icon: '👦', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'μηδείς σου τῆς νεότητος καταφρονείτω · ἀλλὰ τύπος γίνου', tr: '메데이스 수 테스 네오테토스 카타프로네이토 · 알라 튀포스 기누',
    desc: '"누구든지 네 연소함을 업신여기지 못하게 하고 · 오직 말과 행실과 사랑과 믿음과 정절에 있어서 믿는 자에게 본이 되어" (4:12). 디모데 젊음 (30대?) · 세대 계승. Fee·Johnson.',
    match: (s) => s.has('G3503') && s.has('G5179') },
  { id: 'scripture_teaching', role: '성경 낭독·권면·가르침 (4:13)', icon: '📖', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'πρόσεχε τῇ ἀναγνώσει τῇ παρακλήσει τῇ διδασκαλίᾳ', tr: '프로세케 테 아나그노세이 테 파라클레세이 테 디다스칼리아',
    desc: '"내가 이를 때까지 · 읽는 것(ἀνάγνωσις)과 권하는 것(παράκλησις)과 가르치는 것(διδασκαλία)에 전념하라" (4:13) — 회당·초대 교회 예배 3중 구조. Marshall·Mounce.',
    match: (s) => s.has('G0320') && s.has('G1319') },
  { id: 'flee_pursue', role: '피하라·따르라 대구 (6:11)', icon: '🏃', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ταῦτα φεῦγε · δίωκε δὲ δικαιοσύνην', tr: '타우타 퓨게 · 디오케 데 디카이오쉬넨',
    desc: '"이것들을 피하고 · 의와 경건과 믿음과 사랑과 인내와 온유를 따르며" (6:11) — 목회서신 특유 대구 (딤후 2:22 병행). 6가지 덕목 목록. Mounce·Johnson.',
    match: (s) => s.has('G5343') && s.has('G1377') },
];

const TIM1_MANUAL_DISCOURSE = {
  '1:3':   'false_teachers_law',        // 다른 교훈을 가르치지 말며
  '1:4':   'false_teachers_law',        // 신화·끝없는 족보 몰두 X
  '1:15':  'faithful_saying',           // 미쁘다 이 말이여 · 그리스도 예수께서 죄인 구원
  '1:18':  'good_fight_faith',          // 선한 싸움 싸우라
  '2:1':   'prayer_all_men',            // 모든 사람 위해 · 간구·기도·도고·감사
  '2:4':   'prayer_all_men',            // 모든 사람 구원 받기를 원하심
  '2:5':   'one_mediator_ransom',       // 하나님도 한 분·중보자도 한 분
  '2:6':   'one_mediator_ransom',       // 모든 사람 위해 대속물 (ἀντίλυτρον)
  '3:1':   'faithful_saying',           // 미쁘다 이 말이여 · 감독 직분
  '3:2':   'overseer_deacon_qualifications', // 감독은 책망할 것 없으며
  '3:8':   'overseer_deacon_qualifications', // 집사들도 마찬가지로 정중
  '3:16':  'mystery_of_godliness',      // 크도다 경건의 비밀 (6행 찬송)
  '4:9':   'faithful_saying',           // 미쁘다 이 말이여
  '4:12':  'timothy_youth',             // 연소함 업신여기지 못하게 · 본이 되어
  '4:13':  'scripture_teaching',        // 읽는 것·권하는 것·가르치는 것에 전념
  '5:3':   'widows_care',               // 참 과부인 과부를 존대하라
  '5:9':   'widows_care',               // 과부 명부 · 육십 이상
  '5:17':  'overseer_deacon_qualifications', // 잘 다스리는 장로들을 배나 존경
  '6:6':   'godliness_contentment',     // 자족하는 마음 있으면 경건은 큰 이익
  '6:10':  'false_teachers_law',        // 돈을 사랑함이 일만 악의 뿌리
  '6:11':  'flee_pursue',               // 이것들 피하고 · 의·경건·믿음·사랑·인내·온유 따르라
  '6:12':  'good_fight_faith',          // 믿음의 선한 싸움 싸우라 · 영생 취하라
  '6:15':  'mystery_of_godliness',      // 만왕의 왕이시요 만주의 주
  '6:20':  'false_teachers_law',        // 부탁한 것 지키고 · 거짓된 지식(γνῶσις) 피함
};

export const TIM1_CTX = {
  id: '1Tim',
  book: { ko: '디모데전서', bollsNum: 54, lexId: '1Tim', lexCorpus: 'gnt', en: '1 Timothy', testament: 'NT' },
  chapters: 6,
  discourseRules: [...GNT_DISCOURSE_RULES, ...TIM1_STRUCTURAL_RULES],
  manualDiscourse: TIM1_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신 · 목회서신 (Pastoral Epistles · 딤전·딤후·딛 삼권 세트) · 교회 조직 매뉴얼',
    genreNote: '개인 편지 형식이나 교회 규정 성격 · 헬레니즘 mandata principis(왕의 명령서) 장르 · Fiore 유형',
    year: 'AD 63-65 (친서설 · 로마 1차 감금 석방 후 · Bruce·Mounce·Knight·Towner) 또는 AD 100-140 (학파설 · Bauer·Käsemann·Dibelius)',
    yearNote: '친서설: 로마 감금(행 28) 이후 4차 여행 재구성 · Titus·에베소·마게도냐 이동 · 이후 로마 재감금 → 딤후 · 학파설: 문체·조직 발전·영지주의 근거',
    place: '마게도냐 (친서설 · 1:3 "내가 마게도냐로 갈 때에 너를 권하여 에베소에 머물라") 또는 미상 (학파설)',
    placeNote: '디모데가 에베소 남아 목회 · 바울 마게도냐 이동 중 편지',
    author: '바울 (친서설 · Bruce·Mounce·Knight·Towner·Marshall) 또는 바울 학파 (Dibelius·Käsemann·Bauer·Bassler)',
    authorNote: '어휘 통계(Harrison) · 조직 발전 · 정통주의 근거 vs 상황·개인 편지 특수성·초대 교회 다양성 근거 · Marshall 절충 (Allonymity)',
    audience: '디모데 (에베소 교회 · 바울 아들 · 행 16 이후 동역자 · 2:15-16 디모데 어릴 적부터 성경)',
    audienceNote: '30대 젊은 목회자 · 유대 어머니 유니게·할머니 로이스 (딤후 1:5) · 이방인 아버지 · 헬라계 유대인',
    theme: '교회 조직 · 감독·집사·과부·장로 자격 · 거짓 교사 논박 · 경건의 신비 · 자족',
    themeNote: '"미쁘다 이 말이여"(πιστὸς ὁ λόγος) 5회 · 3:16 경건 찬송 · 사도적 정통 계승 · 3:15 진리의 기둥과 터',
    chapterAgenda: {
      1: '인사(바울 · 디모데 참 아들)·거짓 교사 논박(다른 교훈·신화·족보 X 1:3-11)·바울 자기 회상 = 죄인 중 괴수(1:15 "미쁘다 이 말이여")·선한 싸움 위탁(1:18)·후메내오·알렉산더 파선',
      2: '**만인 위한 기도**(2:1-4 왕·높은 지위 · 하나님이 모든 사람 구원 원하심)·한 중보자·대속물(2:5-6)·여자 교훈 논쟁(2:9-15)',
      3: '**감독 자격**(3:1-7 · "미쁘다 이 말이여")·**집사 자격**(3:8-13)·진리의 기둥과 터 교회(3:15)·**경건의 비밀 찬송**(3:16 6행 · 육신 나타남→영광 올려짐)',
      4: '후일 배도(4:1-5 결혼 금지·음식 금지)·"미쁘다 이 말이여"(4:9)·**디모데 젊음 업신여기지 못하게 본이 되어**(4:12)·**낭독·권면·가르침에 전념**(4:13)·안수(4:14)',
      5: '노인·젊은이 대함(5:1-2)·**과부 명부**(5:3-16 참 과부·육십 이상)·잘 다스리는 장로 배나 존경(5:17)·안수 신중(5:22)',
      6: '종·상전(6:1-2)·거짓 교사·돈 사랑(6:3-10 "돈을 사랑함이 일만 악의 뿌리" 6:10)·**하나님의 사람아 이것들 피하고 · 의·경건·믿음·사랑·인내·온유 따르라**(6:11)·**믿음의 선한 싸움**(6:12)·**만왕의 왕**(6:15-16)·부탁한 것 지키라(6:20 거짓 γνῶσις)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 1, color: '#dc2626', label: '거짓 교사 논박 · 바울 자기 회상 · 선한 싸움 위탁' },
      { id: 's2', fromCh: 2, toCh: 3, color: '#0369a1', label: '예배 지침 · 감독·집사 자격 · 경건 찬송' },
      { id: 's3', fromCh: 4, toCh: 4, color: '#7c3aed', label: '후일 배도 · 디모데 개인 권면 · 낭독·권면·가르침' },
      { id: 's4', fromCh: 5, toCh: 5, color: '#0891b2', label: '과부·장로 규정' },
      { id: 's5', fromCh: 6, toCh: 6, color: '#059669', label: '종·거짓 교사·돈 사랑 · 선한 싸움 마감' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 15, color: '#059669', label: '미쁘다 이 말이여 · 죄인 구원 · 나는 괴수' },
      { id: 'p2',  ch: 1, verse: 18, color: '#dc2626', label: '선한 싸움 위탁' },
      { id: 'p3',  ch: 2, verse: 4,  color: '#0369a1', label: '모든 사람 구원 받기를 원하심' },
      { id: 'p4',  ch: 2, verse: 5,  color: '#dc2626', label: '한 하나님·한 중보자 예수' },
      { id: 'p5',  ch: 2, verse: 6,  color: '#dc2626', label: '모든 사람 위해 대속물 (ἀντίλυτρον)' },
      { id: 'p6',  ch: 3, verse: 1,  color: '#0369a1', label: '미쁘다 이 말이여 · 감독 직분' },
      { id: 'p7',  ch: 3, verse: 2,  color: '#0369a1', label: '감독 자격 (책망 X · 한 아내의 남편)' },
      { id: 'p8',  ch: 3, verse: 8,  color: '#0369a1', label: '집사 자격 (정중·일구이언 X)' },
      { id: 'p9',  ch: 3, verse: 15, color: '#7c3aed', label: '진리의 기둥과 터 · 하나님의 교회' },
      { id: 'p10', ch: 3, verse: 16, color: '#7c3aed', label: '경건의 비밀 · 육신 나타남 6행 찬송' },
      { id: 'p11', ch: 4, verse: 12, color: '#7c3aed', label: '연소함 업신여기지 못하게 · 본이 되어' },
      { id: 'p12', ch: 4, verse: 13, color: '#0369a1', label: '낭독·권면·가르침에 전념' },
      { id: 'p13', ch: 5, verse: 3,  color: '#0891b2', label: '참 과부인 과부를 존대' },
      { id: 'p14', ch: 5, verse: 17, color: '#0369a1', label: '잘 다스리는 장로 배나 존경' },
      { id: 'p15', ch: 6, verse: 6,  color: '#059669', label: '자족 · 경건은 큰 이익' },
      { id: 'p16', ch: 6, verse: 10, color: '#dc2626', label: '돈을 사랑함이 일만 악의 뿌리' },
      { id: 'p17', ch: 6, verse: 11, color: '#dc2626', label: '이것들 피하고 · 6덕목 따르라' },
      { id: 'p18', ch: 6, verse: 12, color: '#dc2626', label: '믿음의 선한 싸움 · 영생 취하라' },
      { id: 'p19', ch: 6, verse: 15, color: '#7c3aed', label: '만왕의 왕·만주의 주 (송영)' },
      { id: 'p20', ch: 6, verse: 20, color: '#dc2626', label: '부탁한 것 지키라 · 거짓 지식 피함' },
    ],
    arcs: [
      { id: 'a1',  from: 'p2',  to: 'p18', color: '#dc2626', label: '선한 싸움 위탁 (1:18) → 선한 싸움 (6:12) · 대주제 Inclusio' },
      { id: 'a2',  from: 'p3',  to: 'p5',  color: '#dc2626', label: '모든 사람 구원 → 모든 사람 대속물 (구원 의도-사역)' },
      { id: 'a3',  from: 'p4',  to: 'p10', color: '#7c3aed', label: '한 중보자 → 육신 나타남 (기독론)' },
      { id: 'a4',  from: 'p6',  to: 'p8',  color: '#0369a1', label: '감독 자격 → 집사 자격 (조직 축)' },
      { id: 'a5',  from: 'p9',  to: 'p10', color: '#7c3aed', label: '교회 = 진리의 기둥 → 경건의 비밀 찬송' },
      { id: 'a6',  from: 'p11', to: 'p12', color: '#7c3aed', label: '본이 되어 → 낭독·권면·가르침 (목회 실천)' },
      { id: 'a7',  from: 'p1',  to: 'p20', color: '#059669', label: '나는 괴수 (자기) → 부탁한 것 지키라 (계승)' },
      { id: 'a8',  from: 'p15', to: 'p17', color: '#059669', label: '자족 → 6덕목 따르라 (경건 실천)' },
      { id: 'a9',  from: 'p16', to: 'p17', color: '#dc2626', label: '돈 사랑 → 피하고 따르라 (탐욕 대응)' },
      { id: 'a10', from: 'p13', to: 'p14', color: '#0891b2', label: '과부 존대 → 장로 존경 (돌봄·존경)' },
      { id: 'a11', from: 'p1',  to: 'p10', color: '#059669', label: '"미쁘다 이 말이여" 1 → 경건 찬송 (신앙 정식)' },
      { id: 'a12', from: 'p10', to: 'p19', color: '#7c3aed', label: '경건 찬송 → 만왕의 왕 (기독론 축)' },
      { id: 'a13', from: 'p2',  to: 'p20', color: '#dc2626', label: '선한 싸움 위탁 → 부탁한 것 지키라 (계승 축)' },
      { id: 'a14', from: 'p11', to: 'p17', color: '#7c3aed', label: '연소함 업신여김 X → 6덕목 따르라 (본이 됨의 실천)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 디모데후서 (TIM2_CTX) — 목회서신 · 바울 유서·순교 각오·성경 영감(3:16-17)·정통 계승
// 신약학 표준: Marshall(ICC) · Mounce(WBC) · Knight(NIGTC) · Towner(NICNT) · Fee(NIBC) · Johnson(AB) · Yarbrough(Pillar) · Guthrie(TNTC)
// ═══════════════════════════════════════════════════════════════════════════

const TIM2_STRUCTURAL_RULES = [
  { id: 'apostolic_farewell', role: '바울 유서·순교 임박 (4:6-8)', icon: '⚱️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἐγὼ γὰρ ἤδη σπένδομαι · τὸν καλὸν ἀγῶνα ἠγώνισμαι', tr: '에고 가르 에데 스펜도마이 · 톤 칼론 아고나 에고니스마이',
    desc: '"관제(σπένδομαι)와 같이 벌써 내가 부어지고 나의 떠날 시각이 가까웠도다 · 나는 선한 싸움을 싸우고 나의 달려갈 길을 마치고 믿음을 지켰으니 · 이제 후로는 나를 위하여 의의 면류관이 예비되었으므로" (4:6-8). 순교 유언 · Fee·Mounce·Guthrie.',
    match: (s) => s.has('G4689') || (s.has('G0075') && s.has('G4712')) },
  { id: 'scripture_inspired', role: '성경 영감·유익 (3:16-17)', icon: '📖', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'πᾶσα γραφὴ θεόπνευστος καὶ ὠφέλιμος', tr: '파사 그라페 테오프뉴스토스 카이 오펠리모스',
    desc: '"모든 성경은 하나님의 감동(θεόπνευστος · 하파스레고메논)으로 된 것으로 교훈과 책망과 바르게 함과 의로 교육하기에 유익하니" (3:16-17). 성경 영감 교리 정식 · Warfield·Marshall·Mounce.',
    match: (s) => s.has('G2315') || s.has('G1124') },
  { id: 'entrust_faithful_men', role: '충성된 사람에게 부탁 (2:2)', icon: '🤝', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ταῦτα παράθου πιστοῖς ἀνθρώποις', tr: '타우타 파라투 피스토이스 안트로포이스',
    desc: '"네가 많은 증인 앞에서 내게 들은 바를 · 충성된 사람들에게 부탁하라 · 그들이 또 다른 사람들을 가르칠 수 있으리라" (2:2) — **4세대 계승** (바울→디모데→충성된 자→다른 자). 사도적 정통 계승 원리. Fee·Johnson.',
    match: (s) => s.has('G3908') && s.has('G4103') },
  { id: 'good_soldier_athlete_farmer', role: '군사·경기자·농부 3중 은유 (2:3-6)', icon: '⚔️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'στρατιώτης · ἀθλῶν · γεωργὸς κοπιῶντα', tr: '스트라티오테스 · 아틀론 · 게오르고스 코피온타',
    desc: '"그리스도 예수의 좋은 군사로 나와 함께 고난을 받으라" (2:3) · "경기하는 자가 법대로 경기하지 아니하면 승리자의 관을 얻지 못할 것이며" (2:5) · "수고하는 농부가 곡식을 먼저 받는 것이 마땅하니라" (2:6). 3중 은유 · Pfitzner·Mounce.',
    match: (s) => s.has('G4757') || s.has('G0118') || s.has('G1092') },
  { id: 'last_days_perilous', role: '말세 고통·타락 목록 (3:1-5)', icon: '⚠️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'ἐν ἐσχάταις ἡμέραις ἐνστήσονται καιροὶ χαλεποί', tr: '엔 에스카타이스 헤메라이스 에네스테손타이 카이로이 칼레포이',
    desc: '"말세에 고통하는 때가 이르러 · 사람들이 자기를 사랑하며 돈을 사랑하며 · 경건의 모양은 있으나 경건의 능력은 부인하니" (3:1-5) — 18가지 악 목록 · 이방 vice-list 형식 · Marshall·Fee.',
    match: (s) => s.has('G2078') && s.has('G2540') },
  { id: 'suffering_shame_gospel', role: '복음 위한 고난 · 부끄러워 X (1:8·12·16)', icon: '⚔️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'μὴ οὖν ἐπαισχυνθῇς τὸ μαρτύριον · οὐκ ἐπαισχύνομαι', tr: '메 운 에파이스퀸테스 토 마르튀리온 · 우크 에파이스퀴노마이',
    desc: '"우리 주의 증언과 그로 말미암아 갇힌 자 된 나를 부끄러워하지 말고 · 복음을 위하여 고난을 함께 받으라" (1:8) · "내가 이 고난을 받되 부끄러워하지 아니함은" (1:12) · 오네시보로 부끄러워 X(1:16). 부끄러워하다(ἐπαισχύνομαι) 3회 축. Fee·Mounce.',
    match: (s) => s.has('G1870') },
  { id: 'faithful_saying_pastoral', role: '미쁘다 이 말이여 (초대 신조 인용)', icon: '✅', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'πιστὸς ὁ λόγος · εἰ γὰρ συναπεθάνομεν καὶ συζήσομεν', tr: '피스토스 호 로고스 · 에이 가르 슁아페타노멘 카이 슁제소멘',
    desc: '"미쁘다 이 말이여 · 우리가 주와 함께 죽었으면 또한 함께 살 것이요 · 참으면 또한 함께 왕 노릇 할 것이요" (2:11-13) — 4행 초대 신조 인용 · 롬 6·8 그리스도 연합. Marshall·Knight.',
    match: (s) => s.has('G4103') && s.has('G4880') },
  { id: 'grandmother_mother_faith', role: '외조모·어머니 3세대 신앙 (1:5)', icon: '👵', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἡ ἐν σοὶ ἀνυπόκριτος πίστις · ἐνῴκησεν πρῶτον ἐν τῇ μάμμῃ σου Λωΐδι καὶ τῇ μητρί σου Εὐνίκῃ', tr: '헤 엔 소이 아뉘포크리토스 피스티스 · 에노이케센 프로톤 엔 테 맘메 수 로이디 카이 테 메트리 수 유니케',
    desc: '"이는 네 속에 거짓이 없는 믿음이 있음을 생각함이라 · 이 믿음은 먼저 네 외조모 로이스와 네 어머니 유니게 속에 있더니" (1:5) — 3세대 유대인 계승 · 어릴 적 성경(3:15) · Fee·Marshall.',
    match: null },
  { id: 'crown_of_righteousness', role: '의의 면류관 (4:8)', icon: '👑', color: '#eab308', bg: 'rgba(234,179,8,.14)',
    gr: 'ὁ τῆς δικαιοσύνης στέφανος', tr: '호 테스 디카이오쉬네스 스테파노스',
    desc: '"이제 후로는 나를 위하여 의의 면류관이 예비되었으므로 · 주 · 의로우신 재판장이 그 날에 내게 주실 것이며 · 나에게만 아니라 주의 나타나심을 사모하는 모든 자에게도니라" (4:8). 종말 상급 · Fee·Guthrie.',
    match: (s) => s.has('G4735') && s.has('G1343') },
  { id: 'preach_word_season', role: '말씀 전파·때를 얻든지 못 얻든지 (4:2)', icon: '📢', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'κήρυξον τὸν λόγον · εὐκαίρως ἀκαίρως', tr: '케뤽손 톤 로곤 · 유카이로스 아카이로스',
    desc: '"너는 말씀을 전파하라 · 때를 얻든지 못 얻든지 항상 힘쓰라 · 범사에 오래 참음과 가르침으로 경책하며 경계하며 권하라" (4:2). 최후 명령 · Mounce·Fee.',
    match: (s) => s.has('G2784') && s.has('G3056') },
  { id: 'orthodoxy_pattern_sound_words', role: '바른 말의 본 · 정통 계승 (1:13·2:15)', icon: '🎯', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'ὑποτύπωσιν ἔχε ὑγιαινόντων λόγων · ὀρθοτομοῦντα τὸν λόγον τῆς ἀληθείας', tr: '휘포튀포신 에케 휘기아이논톤 로곤 · 오르토토문타 톤 로곤 테스 알레테이아스',
    desc: '"너는 그리스도 예수 안에 있는 믿음과 사랑으로써 내게 들은 바 · 바른 말(ὑγιαίνοντες λόγοι)을 본받아 지키고" (1:13) · "진리의 말씀을 옳게 분별하며(ὀρθοτομέω)" (2:15). 목회서신 특유. Marshall·Knight.',
    match: (s) => s.has('G5199') || s.has('G3718') },
];

const TIM2_MANUAL_DISCOURSE = {
  '1:5':   'grandmother_mother_faith',   // 외조모 로이스·어머니 유니게 3세대 믿음
  '1:8':   'suffering_shame_gospel',     // 주의 증언 부끄러워 X · 복음 위해 함께 고난
  '1:12':  'suffering_shame_gospel',     // 이 고난 받되 부끄러워 X · 그 날까지 지키실 줄 확신
  '1:13':  'orthodoxy_pattern_sound_words', // 바른 말의 본 · 믿음·사랑
  '1:14':  'orthodoxy_pattern_sound_words', // 부탁한 아름다운 것 · 성령으로 지키라
  '1:16':  'suffering_shame_gospel',     // 오네시보로 · 내 사슬 부끄러워 X
  '2:2':   'entrust_faithful_men',       // 충성된 사람들에게 부탁 · 4세대 계승
  '2:3':   'good_soldier_athlete_farmer', // 그리스도 예수의 좋은 군사
  '2:5':   'good_soldier_athlete_farmer', // 경기자 · 법대로 경기
  '2:6':   'good_soldier_athlete_farmer', // 수고하는 농부 · 곡식 먼저 받음
  '2:8':   'orthodoxy_pattern_sound_words', // 예수 그리스도 · 죽은 자 가운데 다시 살아나심 기억
  '2:11':  'faithful_saying_pastoral',   // 미쁘다 이 말이여 · 함께 죽으면 함께 살고 (4행 신조)
  '2:15':  'orthodoxy_pattern_sound_words', // 진리의 말씀 옳게 분별 (ὀρθοτομέω)
  '2:22':  'good_soldier_athlete_farmer', // 청년의 정욕 피하고 · 의·믿음·사랑·화평 따르라
  '3:1':   'last_days_perilous',         // 말세에 고통하는 때 이르러
  '3:5':   'last_days_perilous',         // 경건의 모양 · 능력 부인
  '3:15':  'scripture_inspired',         // 어릴 때부터 성경 · 지혜롭게 하여 구원
  '3:16':  'scripture_inspired',         // 모든 성경 하나님 감동 · 교훈·책망·바르게·의 교육
  '3:17':  'scripture_inspired',         // 하나님의 사람 · 온전 · 모든 선한 일 준비
  '4:1':   'preach_word_season',         // 그 나타나심과 그의 나라 앞에서 엄히 명하노니
  '4:2':   'preach_word_season',         // 말씀 전파 · 때를 얻든지 못 얻든지
  '4:6':   'apostolic_farewell',         // 관제로 부어지고 · 떠날 시각 가까움
  '4:7':   'apostolic_farewell',         // 선한 싸움 싸우고 · 달려갈 길 마치고 · 믿음 지킴
  '4:8':   'crown_of_righteousness',     // 의의 면류관 예비 · 주의 나타나심 사모하는 모든 자
};

export const TIM2_CTX = {
  id: '2Tim',
  book: { ko: '디모데후서', bollsNum: 55, lexId: '2Tim', lexCorpus: 'gnt', en: '2 Timothy', testament: 'NT' },
  chapters: 4,
  discourseRules: [...GNT_DISCOURSE_RULES, ...TIM2_STRUCTURAL_RULES],
  manualDiscourse: TIM2_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신 · 목회서신 · **바울 최후 유서** (testament genre)',
    genreNote: '헬레니즘 farewell speech·유대 유언(창 49·신 33·요 13-17 병행) 형식 · 개인 편지 + 유언 혼합 · Fiore·Johnson',
    year: 'AD 66-67 (친서설 · 로마 2차 감금·네로 박해 순교 직전 · Bruce·Mounce·Knight) 또는 AD 100-140 (학파설)',
    yearNote: '4:6-8 임박 순교·4:16 첫 변명 홀로 · 로마 2차 감금 · 네로 박해 (AD 64-68) 문맥 · 트라디셔널 순교',
    place: '로마 감금 (지하 감옥·오네시보로 겨우 발견 1:17)',
    placeNote: '1:16-17 오네시보로 로마에서 바울 찾아 만남 · 4:13 두로아 서적·양피지 요청',
    author: '바울 (친서설 다수 · 개인 정보 밀도 최고) 또는 바울 학파',
    authorNote: '개인 편지 성격 강함 (4:9-21 개인 이름 15+) · 목회서신 중 친서설 가장 강함',
    audience: '디모데 (에베소 · 젊은 목회자 · 바울 사랑하는 아들)',
    audienceNote: '바울 로마로 속히 오라 부름 (4:9·4:21) · 마가도 데려오라 (4:11) · 두기고 이미 에베소 파송 (4:12) · 겨울 오기 전 도착 요망',
    theme: '바울 유서 · 순교 각오 · 정통 계승 · 성경 영감 · 복음 위한 고난',
    themeNote: '**4:6-8 삼중 정식** (선한 싸움 다 싸우고·달려갈 길 마치고·믿음 지킴) → 의의 면류관 · **2:2 4세대 계승** (바울→디모데→충성된 자→다른 자) · **3:16-17 성경 영감** 정식',
    chapterAgenda: {
      1: '인사·감사·**외조모 로이스·어머니 유니게 3세대 믿음**(1:5)·**주의 증언·나를 부끄러워 X**(1:8)·**부탁한 것 그 날까지 지키실 줄 확신**(1:12)·**바른 말의 본**(1:13-14)·오네시보로 부끄러워 X · 로마에서 나를 찾음(1:16-18)',
      2: '**충성된 사람에게 부탁**(2:2 · 4세대 계승)·**군사·경기자·농부 3중 은유**(2:3-6)·**"미쁘다 이 말이여" 4행 신조**(2:11-13 함께 죽으면 함께 살고)·**진리의 말씀 옳게 분별**(ὀρθοτομέω 2:15)·후메내오·빌레도 · 큰 집의 그릇·청년의 정욕 피하고 · 의·믿음·사랑·화평 따름(2:22)',
      3: '**말세 고통·18가지 악 목록**(3:1-5)·거짓 교사 · 얀네·얌브레 대적(3:8)·**어릴 때부터 성경 · 지혜롭게 구원**(3:15)·**모든 성경 하나님 감동 · 교훈·책망·바르게·의 교육 · 하나님의 사람 온전**(3:16-17)',
      4: '**말씀 전파·때를 얻든지 못 얻든지**(4:2)·**바울 유서**: 관제로 부어지고 · 떠날 시각 가까움(4:6)·**선한 싸움 싸우고·달려갈 길 마치고·믿음 지킴**(4:7)·**의의 면류관**(4:8)·**개인 인사**(데마·눅·마가·두기고·두로아 서적·양피지 요청·구리 세공업자 알렉산더·첫 변명 홀로 4:9-21)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 1, color: '#7c3aed', label: '3세대 믿음 · 고난 부끄러워 X · 바른 말의 본' },
      { id: 's2', fromCh: 2, toCh: 2, color: '#dc2626', label: '4세대 계승·3중 은유·신조 인용·진리 분별' },
      { id: 's3', fromCh: 3, toCh: 3, color: '#b45309', label: '말세 고통·거짓 교사·성경 영감' },
      { id: 's4', fromCh: 4, toCh: 4, color: '#eab308', label: '말씀 전파·바울 유서·면류관·개인 인사' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 5,  color: '#7c3aed', label: '외조모 로이스·어머니 유니게 3세대 믿음' },
      { id: 'p2',  ch: 1, verse: 8,  color: '#dc2626', label: '주의 증언·나를 부끄러워 X' },
      { id: 'p3',  ch: 1, verse: 12, color: '#dc2626', label: '이 고난 받되 부끄러워 X · 그 날까지 지키실 줄' },
      { id: 'p4',  ch: 1, verse: 13, color: '#0369a1', label: '바른 말의 본 (믿음·사랑)' },
      { id: 'p5',  ch: 2, verse: 2,  color: '#0369a1', label: '충성된 사람에게 부탁 (4세대 계승)' },
      { id: 'p6',  ch: 2, verse: 3,  color: '#dc2626', label: '그리스도 예수의 좋은 군사' },
      { id: 'p7',  ch: 2, verse: 11, color: '#059669', label: '미쁘다 이 말이여 · 4행 신조' },
      { id: 'p8',  ch: 2, verse: 15, color: '#0369a1', label: '진리의 말씀 옳게 분별 (ὀρθοτομέω)' },
      { id: 'p9',  ch: 3, verse: 1,  color: '#b45309', label: '말세에 고통하는 때 이르러' },
      { id: 'p10', ch: 3, verse: 5,  color: '#b45309', label: '경건의 모양 · 능력 부인' },
      { id: 'p11', ch: 3, verse: 15, color: '#7c3aed', label: '어릴 때부터 성경 · 지혜롭게 구원' },
      { id: 'p12', ch: 3, verse: 16, color: '#7c3aed', label: '모든 성경 하나님 감동 (θεόπνευστος)' },
      { id: 'p13', ch: 3, verse: 17, color: '#7c3aed', label: '하나님의 사람 · 온전·모든 선한 일 준비' },
      { id: 'p14', ch: 4, verse: 2,  color: '#dc2626', label: '말씀 전파 · 때를 얻든지 못 얻든지' },
      { id: 'p15', ch: 4, verse: 6,  color: '#dc2626', label: '관제로 부어지고 · 떠날 시각 가까움' },
      { id: 'p16', ch: 4, verse: 7,  color: '#dc2626', label: '선한 싸움 · 달려갈 길 · 믿음 지킴 (3중 정식)' },
      { id: 'p17', ch: 4, verse: 8,  color: '#eab308', label: '의의 면류관 · 주의 나타나심 사모하는 모든 자' },
      { id: 'p18', ch: 4, verse: 11, color: '#0891b2', label: '오직 누가만 · 마가도 데려오라' },
      { id: 'p19', ch: 4, verse: 17, color: '#0369a1', label: '주께서 내 곁에 서서 · 이방인이 다 듣게' },
    ],
    arcs: [
      { id: 'a1',  from: 'p2',  to: 'p3',  color: '#dc2626', label: '부끄러워 X (1:8) → 부끄러워 X (1:12) · 강조 축' },
      { id: 'a2',  from: 'p4',  to: 'p8',  color: '#0369a1', label: '바른 말의 본 → 진리 옳게 분별 (정통 축)' },
      { id: 'a3',  from: 'p1',  to: 'p5',  color: '#7c3aed', label: '3세대 믿음 → 4세대 계승 (전수 축)' },
      { id: 'a4',  from: 'p5',  to: 'p16', color: '#dc2626', label: '충성된 자에게 부탁 → 선한 싸움 완주 (계승·완성)' },
      { id: 'a5',  from: 'p6',  to: 'p16', color: '#dc2626', label: '좋은 군사 → 선한 싸움 다 싸움 (군사 은유 완성)' },
      { id: 'a6',  from: 'p9',  to: 'p10', color: '#b45309', label: '말세 시작 → 경건 모양뿐 (말세 특징)' },
      { id: 'a7',  from: 'p11', to: 'p13', color: '#7c3aed', label: '어릴 때 성경 → 하나님의 사람 온전 (성경 사역)' },
      { id: 'a8',  from: 'p12', to: 'p14', color: '#dc2626', label: '성경 영감 → 말씀 전파 (교리·실천)' },
      { id: 'a9',  from: 'p15', to: 'p17', color: '#eab308', label: '떠날 시각 → 의의 면류관 (죽음·상급)' },
      { id: 'a10', from: 'p16', to: 'p17', color: '#eab308', label: '3중 정식 → 면류관 (완성·보상)' },
      { id: 'a11', from: 'p2',  to: 'p16', color: '#dc2626', label: '고난 부끄러워 X → 선한 싸움 완주 (고난 축)' },
      { id: 'a12', from: 'p1',  to: 'p11', color: '#7c3aed', label: '3세대 믿음 → 어릴 때 성경 (양육)' },
      { id: 'a13', from: 'p7',  to: 'p16', color: '#059669', label: '함께 죽으면 함께 살고 → 믿음 지킴 (신조·실천)' },
      { id: 'a14', from: 'p14', to: 'p19', color: '#dc2626', label: '말씀 전파 → 이방인 다 듣게 (선포 완성)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 디도서 (TIT_CTX) — 목회서신 · 그레데 교회 조직·장로/감독 자격·2:11-14 초림·재림 신학·3:4-7 세례·성령 갱신
// 신약학 표준: Marshall(ICC) · Mounce(WBC) · Knight(NIGTC) · Towner(NICNT) · Fee(NIBC) · Johnson(AB) · Yarbrough(Pillar)
// ═══════════════════════════════════════════════════════════════════════════

const TIT_STRUCTURAL_RULES = [
  { id: 'elder_overseer_crete', role: '장로·감독 자격 (1:5-9)', icon: '🏛️', color: '#0369a1', bg: 'rgba(3,105,161,.13)',
    gr: 'πρεσβύτερος · ἐπίσκοπος', tr: '프레스뷔테로스 · 에피스코포스',
    desc: '"각 성에 장로들을 세우게 하려 함이니 · 감독은 하나님의 청지기로서 책망할 것이 없고" (1:5-9) — 그레데 각 성 장로 세움 · 딤전 3 병행 (장로=감독 동일시 · Campbell 논쟁). Marshall·Mounce.',
    match: (s) => s.has('G4245') && s.has('G1985') },
  { id: 'grace_appeared_saving', role: '구원 주시는 하나님 은혜 나타남 (2:11-14)', icon: '☀️', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἐπεφάνη γὰρ ἡ χάρις τοῦ θεοῦ σωτήριος πᾶσιν ἀνθρώποις', tr: '에페파네 가르 헤 카리스 투 테우 소테리오스 파신 안트로포이스',
    desc: '"모든 사람에게 구원을 주시는 하나님의 은혜가 나타나(ἐπιφαίνω) · 우리를 양육하시되 경건하지 않은 것과 이 세상 정욕을 다 버리고 · 이 세대에 신중함과 의로움과 경건함으로 살고 · **복스러운 소망과 우리의 크신 하나님 구주 예수 그리스도의 영광이 나타나심**을 기다리게 하셨으니" (2:11-14). 초림·재림 두 나타남 축 · Marshall·Towner.',
    match: (s) => s.has('G2014') && s.has('G5485') },
  { id: 'baptism_holy_spirit_renewal', role: '세례·성령 갱신 (3:4-7)', icon: '💧', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'διὰ λουτροῦ παλιγγενεσίας καὶ ἀνακαινώσεως πνεύματος ἁγίου', tr: '디아 루트루 팔링게네시아스 카이 아나카이노세오스 프뉴마토스 하기우',
    desc: '"우리 구주 하나님의 자비와 사람 사랑하심(φιλανθρωπία)이 나타날 때에 · 우리를 구원하시되 · **중생의 씻음(λουτρὸν παλιγγενεσίας)과 성령의 새롭게 하심**으로 하셨나니" (3:4-6) — 세례 신학 정식 · Towner·Mounce.',
    match: (s) => s.has('G3067') || s.has('G3824') },
  { id: 'sound_doctrine', role: '바른 교훈 (ὑγιαίνουσα διδασκαλία)', icon: '✅', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'ὑγιαίνουσα διδασκαλία', tr: '휘기아이누사 디다스칼리아',
    desc: '"바른 교훈에 합당한 것을 말하라" (2:1) · 딛 특유 어휘 4회 (1:9·1:13·2:1·2:2). ὑγιαίνω = 의료 은유 (건강한 가르침 vs 병든 이단). Marshall·Fee.',
    match: (s) => s.has('G5198') && s.has('G1319') },
  { id: 'household_code_titus', role: '가정·계층 권면 (2:1-10)', icon: '🏠', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'πρεσβύτας · πρεσβύτιδας · νέας · νέους · δούλους', tr: '프레스뷔타스 · 프레스뷔티다스 · 네아스 · 네우스 · 둘루스',
    desc: '"늙은 남자·늙은 여자·젊은 여자·젊은 남자·종들" 각 층 권면 (2:1-10) — 엡 5·골 3 Haustafel 확장 · 그레데 상황 특화. 노예 그리스도인 다수. Marshall·Towner.',
    match: (s) => s.has('G4246') || s.has('G3495') },
  { id: 'cretan_paradox', role: '그레데인의 역설 (1:12 자기 예언자 인용)', icon: '⚠️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'Κρῆτες ἀεὶ ψεῦσται · κακὰ θηρία · γαστέρες ἀργαί', tr: '크레테스 아에이 프슈스타이 · 카카 테리아 · 가스테레스 아르가이',
    desc: '"그레데인 중 어떤 선지자가 말하되 · 그레데인들은 항상 거짓말쟁이며 악한 짐승이며 배만 위하는 게으름뱅이라" (1:12) — Epimenides 인용 · 유명 "거짓말쟁이의 역설" · Marshall·Mounce.',
    match: null },
  { id: 'good_works_emphasis', role: '선한 일 열심 (특유 강조 6회)', icon: '🌟', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'καλῶν ἔργων ζηλωτής', tr: '칼론 에르곤 젤로테스',
    desc: '"자기 백성이 되게 하시고 · 선한 일을 열심히 하는 자가 되게 하려 하심이라" (2:14) · 딛 특유 "선한 일" 강조 6회 (1:16·2:7·2:14·3:1·3:8·3:14). 실천 신학. Marshall·Fee.',
    match: (s) => s.has('G2570') && s.has('G2041') },
  { id: 'faithful_saying_titus', role: '미쁘다 이 말이여 (3:8)', icon: '✅', color: '#059669', bg: 'rgba(5,150,105,.14)',
    gr: 'πιστὸς ὁ λόγος', tr: '피스토스 호 로고스',
    desc: '"이 말이 미쁘도다 · 원하건대 너는 이 여러 것에 대하여 굳세게 말하라 · 이는 하나님을 믿는 자들로 하여금 조심하여 선한 일을 힘쓰게 하려 함이라" (3:8). 세례 신학(3:4-7) 확증 표지. Marshall.',
    match: (s) => s.has('G4103') && s.has('G3056') },
  { id: 'heretic_admonish', role: '이단 훈계·2회 후 멀리 (3:10)', icon: '⛔', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'αἱρετικὸν ἄνθρωπον μετὰ μίαν καὶ δευτέραν νουθεσίαν παραιτοῦ', tr: '하이레티콘 안트로폰 메타 미안 카이 듀테란 누테시안 파라이투',
    desc: '"이단(αἱρετικός · 신약 hapax legomenon)에 속한 사람을 한두 번 훈계한 후에 멀리하라 · 이러한 사람은 네가 아는 바와 같이 부패하여서 스스로 정죄한 자니라" (3:10-11). 초대 교회 권징 시작. Marshall·Mounce.',
    match: (s) => s.has('G0141') || s.has('G3559') },
];

const TIT_MANUAL_DISCOURSE = {
  '1:5':   'elder_overseer_crete',      // 각 성에 장로들 세우라
  '1:7':   'elder_overseer_crete',      // 감독은 하나님의 청지기로서 책망할 것 없고
  '1:9':   'sound_doctrine',            // 바른 교훈으로 권면·거스러 말하는 자 책망
  '1:12':  'cretan_paradox',            // 그레데인 항상 거짓말쟁이 (Epimenides)
  '1:13':  'sound_doctrine',            // 엄히 꾸짖어 · 믿음에 온전하게 하라
  '1:16':  'good_works_emphasis',       // 하나님을 시인하나 · 행위로 부인 · 선한 일 무능
  '2:1':   'sound_doctrine',            // 바른 교훈에 합당한 것을 말하라
  '2:2':   'household_code_titus',      // 늙은 남자 · 신중·경건·믿음·사랑·인내
  '2:3':   'household_code_titus',      // 늙은 여자 · 행실 거룩·모함·술 X
  '2:4':   'household_code_titus',      // 젊은 여자 · 남편·자녀 사랑
  '2:6':   'household_code_titus',      // 젊은 남자 · 신중하도록
  '2:9':   'household_code_titus',      // 종들 · 상전에게 범사에 순종
  '2:11':  'grace_appeared_saving',     // 하나님의 은혜 나타나 · 모든 사람 구원
  '2:12':  'grace_appeared_saving',     // 우리를 양육 · 정욕 버리고 · 이 세대에 신중·의·경건
  '2:13':  'grace_appeared_saving',     // 복스러운 소망·크신 하나님 구주 예수 그리스도의 영광 나타남
  '2:14':  'good_works_emphasis',       // 자기 백성 삼으사 · 선한 일 열심 하는 자
  '3:1':   'good_works_emphasis',       // 통치자·권세 잡은 자에 복종 · 모든 선한 일 준비
  '3:4':   'baptism_holy_spirit_renewal', // 우리 구주 하나님의 자비·사람 사랑 나타남
  '3:5':   'baptism_holy_spirit_renewal', // 중생의 씻음·성령의 새롭게 하심으로 구원
  '3:7':   'baptism_holy_spirit_renewal', // 그의 은혜로 의롭다 하심 · 영생의 소망 상속자
  '3:8':   'faithful_saying_titus',     // 미쁘다 이 말이여 · 선한 일 힘쓰라
  '3:10':  'heretic_admonish',          // 이단(αἱρετικός) 한두 번 훈계 후 멀리하라
  '3:14':  'good_works_emphasis',       // 우리 사람들도 선한 일 열심 배우게
};

export const TIT_CTX = {
  id: 'Titus',
  book: { ko: '디도서', bollsNum: 56, lexId: 'Titus', lexCorpus: 'gnt', en: 'Titus', testament: 'NT' },
  chapters: 3,
  discourseRules: [...GNT_DISCOURSE_RULES, ...TIT_STRUCTURAL_RULES],
  manualDiscourse: TIT_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 서신 · 목회서신 · 교회 조직 매뉴얼 (딤전 짝)',
    genreNote: '딤전과 형식·구조 유사 (조직 규정 · Haustafel · 이단 논박) · 짧고 압축 · 2:11-14·3:4-7 두 신학 정식 삽입',
    year: 'AD 63-65 (친서설) 또는 AD 100-140 (학파설)',
    yearNote: '딤전과 동일 · 로마 감금 후 4차 여행 재구성 · 그레데 파송 후 마게도냐 이동 시점',
    place: '마게도냐 또는 니고볼리 (3:12 "니고볼리에서 겨울을 지내기로 결정하였노라") - 향할 곳',
    placeNote: '3:12 아데마·두기고 파송 후 · 니고볼리(에피루스) 겨울 · 아마 마게도냐에서 발신',
    author: '바울 (친서설) 또는 바울 학파',
    authorNote: '딤전·딤후·딛 3권 세트로 저자 논쟁 동일',
    audience: '디도 (그레데 파송 목회자 · 이방인 · 갈 2:1-3 예루살렘 방문 동행 · 할례 X 자유의 상징)',
    audienceNote: '그레데 = 100+ 도시 큰 섬 · 이방 문화 강함 · 유대인 그리스도인 문제(1:10-14 할례파) · 늦게 세워진 교회',
    theme: '교회 조직 · 바른 교훈 · 은혜 초림·재림 · 세례 성령 갱신 · 선한 일 열심',
    themeNote: '2:11-14 은혜 초림·재림 두 나타남 축 + 3:4-7 세례·성령 갱신 = 딛 두 신학 정점 · 선한 일 6회 특유 강조',
    chapterAgenda: {
      1: '인사(바울 하나님의 종·예수 그리스도의 사도 · 디도 참 아들)·**그레데에 남긴 이유 · 각 성에 장로 세움**(1:5-9)·거짓 교사·할례파 논박(1:10-16 **"그레데인 항상 거짓말쟁이" Epimenides 인용**)',
      2: '**바른 교훈에 합당한 것**(2:1)·**가정 권면**(늙은 남자·여자·젊은 여자·남자·종들 2:2-10)·**은혜 나타남**(2:11-14 초림 은혜·재림 영광 두 나타남 · **"모든 사람에게 구원"**·"복스러운 소망")',
      3: '**통치자 복종·선한 일 준비**(3:1-2)·**세례·성령 갱신**(3:4-7 "중생의 씻음과 성령의 새롭게 하심으로 구원")·"미쁘다 이 말이여"(3:8)·**이단 한두 번 훈계 후 멀리**(3:10)·개인 인사(아데마·두기고·아볼로 3:12-14 · 니고볼리에서 겨울)',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1, toCh: 1, color: '#0369a1', label: '장로·감독 자격 · 그레데 이단 논박' },
      { id: 's2', fromCh: 2, toCh: 2, color: '#7c3aed', label: '가정 권면 · 은혜 나타남 (초림·재림 두 나타남)' },
      { id: 's3', fromCh: 3, toCh: 3, color: '#0891b2', label: '실천·세례 갱신·이단 훈계·인사' },
    ],
    pivots: [
      { id: 'p1',  ch: 1, verse: 5,  color: '#0369a1', label: '각 성에 장로들 세우라' },
      { id: 'p2',  ch: 1, verse: 7,  color: '#0369a1', label: '감독 = 하나님의 청지기 · 책망할 것 없고' },
      { id: 'p3',  ch: 1, verse: 9,  color: '#059669', label: '바른 교훈으로 권면·책망' },
      { id: 'p4',  ch: 1, verse: 12, color: '#dc2626', label: '그레데인 항상 거짓말쟁이 (Epimenides)' },
      { id: 'p5',  ch: 1, verse: 16, color: '#059669', label: '하나님 시인 · 행위로 부인 · 선한 일 무능' },
      { id: 'p6',  ch: 2, verse: 1,  color: '#059669', label: '바른 교훈에 합당한 것 말하라' },
      { id: 'p7',  ch: 2, verse: 11, color: '#7c3aed', label: '모든 사람에게 구원 · 하나님 은혜 나타나 (초림)' },
      { id: 'p8',  ch: 2, verse: 12, color: '#7c3aed', label: '정욕 버리고 · 이 세대에 신중·의·경건' },
      { id: 'p9',  ch: 2, verse: 13, color: '#7c3aed', label: '복스러운 소망 · 크신 하나님 구주 예수 영광 나타남 (재림)' },
      { id: 'p10', ch: 2, verse: 14, color: '#059669', label: '자기 백성 삼으사 · 선한 일 열심' },
      { id: 'p11', ch: 3, verse: 4,  color: '#0891b2', label: '우리 구주 하나님의 자비·사람 사랑 (φιλανθρωπία)' },
      { id: 'p12', ch: 3, verse: 5,  color: '#0891b2', label: '중생의 씻음 · 성령의 새롭게 하심으로 구원' },
      { id: 'p13', ch: 3, verse: 7,  color: '#0891b2', label: '은혜로 의롭다 하심 · 영생 소망 상속자' },
      { id: 'p14', ch: 3, verse: 8,  color: '#059669', label: '미쁘다 이 말이여 · 선한 일 힘쓰라' },
      { id: 'p15', ch: 3, verse: 10, color: '#dc2626', label: '이단(αἱρετικός) 한두 번 훈계 후 멀리' },
    ],
    arcs: [
      { id: 'a1',  from: 'p7',  to: 'p9',  color: '#7c3aed', label: '은혜 나타남(초림) → 영광 나타남(재림) · 두 나타남 축' },
      { id: 'a2',  from: 'p7',  to: 'p10', color: '#7c3aed', label: '구원 목적 → 선한 일 열심 (구원-실천)' },
      { id: 'a3',  from: 'p11', to: 'p13', color: '#0891b2', label: '자비 나타남 → 상속자 (구원 서사)' },
      { id: 'a4',  from: 'p1',  to: 'p3',  color: '#0369a1', label: '장로 세움 → 바른 교훈 (조직 목적)' },
      { id: 'a5',  from: 'p5',  to: 'p10', color: '#059669', label: '선한 일 무능 → 선한 일 열심 (구원 전후)' },
      { id: 'a6',  from: 'p3',  to: 'p6',  color: '#059669', label: '바른 교훈 (감독) → 바른 교훈 (디도 자신)' },
      { id: 'a7',  from: 'p9',  to: 'p13', color: '#7c3aed', label: '재림 영광 → 영생 소망 상속자 (종말)' },
      { id: 'a8',  from: 'p12', to: 'p14', color: '#0891b2', label: '중생의 씻음 → 선한 일 힘쓰라 (세례-실천)' },
      { id: 'a9',  from: 'p4',  to: 'p15', color: '#dc2626', label: '그레데인 거짓 → 이단 멀리 (거짓 축)' },
      { id: 'a10', from: 'p2',  to: 'p6',  color: '#0369a1', label: '감독 자격 → 바른 교훈 실천 (자격-임무)' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 히브리서 (HEB_CTX) — 저자 미상 · OT 인용 밀도 최고 · 아들의 우월성·대제사장 기독론·멜기세덱·새 언약·믿음장(11)·경주(12)
// 신약학 표준: Attridge(Hermeneia) · Lane(WBC 2권) · Ellingworth(NIGTC) · Bruce(NICNT) · Cockerill(NICNT) · Koester(AB) · O'Brien(Pillar) · deSilva(SR) · Guthrie(NIVAC) · Peterson
// ═══════════════════════════════════════════════════════════════════════════

const HEB_STRUCTURAL_RULES = [
  { id: 'son_superior', role: '아들의 우월성 (1:1-4 · 만유 상속·창조 대리)', icon: '👑', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἐν υἱῷ · ὃν ἔθηκεν κληρονόμον πάντων · διʼ οὗ καὶ ἐποίησεν τοὺς αἰῶνας', tr: '엔 휘오 · 혼 에테켄 클레로노몬 판톤 · 디 후 카이 에포이에센 투스 아이오나스',
    desc: '"옛적에 선지자들을 통하여 여러 부분과 여러 모양으로 우리 조상들에게 말씀하신 하나님이 · 이 모든 날 마지막에는 아들을 통하여 우리에게 말씀하셨으니 · 이 아들을 만유의 상속자로 세우시고 · 또 그를 통하여 모든 세계를 지으셨느니라" (1:1-2). 히 프롤로그 · 계시 정점. Attridge·Lane.',
    match: (s) => s.has('G5207') && s.has('G2818') },
  { id: 'better_kreitton', role: '더 나은 것 (κρείττων) 13회', icon: '⬆️', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'κρείττων', tr: '크레이톤',
    desc: 'κρείττων(더 나은) — 히브리서 특유 어휘 13회 (신약 최다). 천사보다 더 나은 이름(1:4)·더 좋은 소망(7:19)·더 좋은 언약(7:22·8:6)·더 좋은 약속(8:6)·더 좋은 제물(9:23·11:35)·더 좋은 부활(11:35)·더 나은 것(11:40·12:24). 우월성 논증 축. Attridge·Cockerill·O\'Brien.',
    match: (s) => s.has('G2909') },
  { id: 'high_priest_melchizedek', role: '멜기세덱 반차 대제사장 (5·7)', icon: '⛩️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἀρχιερεὺς κατὰ τὴν τάξιν Μελχισέδεκ', tr: '아르키에류스 카타 텐 탁신 멜키세덱',
    desc: '"멜기세덱의 반차를 따르는 대제사장" (5:6·5:10·6:20·7:11·7:17·7:21) — 시 110:4 인용 · 창 14:18-20 배경 · 히 특유 기독론 (레위 반차 초월). Attridge·Cockerill·Peterson.',
    match: (s) => s.has('G3197') || (s.has('G0749') && s.has('G5010')) },
  { id: 'new_covenant_jer31', role: '새 언약 (렘 31:31-34 · 히 8:8-12 · 최장 OT 인용)', icon: '📜', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'διαθήκη καινή · οὐ κατὰ τὴν διαθήκην ἣν ἐποίησα τοῖς πατράσιν αὐτῶν', tr: '디아테케 카이네 · 우 카타 텐 디아테켄 헨 에포이에사 토이스 파트라신 아우톤',
    desc: '"새 언약을 맺으리라 · 이스라엘 집과 유다 집을 향하여 · 그들의 조상들과 맺은 언약과 같지 아니한 것" (8:8-12 = 렘 31:31-34 최장 OT 인용) · 10:15-18 재인용. Cockerill·Ellingworth.',
    match: (s) => s.has('G1242') && s.has('G2537') },
  { id: 'once_for_all_ephapax', role: '단번에 (ἐφάπαξ · ἅπαξ) · 그리스도 최종 제사', icon: '⚡', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἐφάπαξ · ἅπαξ', tr: '에파팍스 · 하팍스',
    desc: '"단번에(ἐφάπαξ) · 자기 자신을 드림으로써" (7:27·9:12·10:10) · "한 번(ἅπαξ) 나타나사" (9:26·9:28). 그리스도 최종 제사 = OT 반복 제사 초월. Cockerill·Peterson.',
    match: (s) => s.has('G2178') || s.has('G0530') },
  { id: 'warning_passages', role: '경고 본문 5회 (배교 경계)', icon: '⚠️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'βλέπετε · φοβηθῶμεν · φέρεσθαι', tr: '블레페테 · 포베토멘 · 페레스타이',
    desc: '히 5대 경고 본문: 표류 경고(2:1-4) · 광야 세대 경고(3:7-4:13) · 성숙·배교 경고(5:11-6:12) · 고의 죄 경고(10:26-31) · 에서 경고(12:14-29). McKnight *warning passages* · Attridge.',
    match: (s) => s.has('G0991') && s.has('G3392') },
  { id: 'shadow_reality', role: '그림자·모형 vs 실체 (10:1 σκιά·εἰκών)', icon: '🌗', color: '#0891b2', bg: 'rgba(8,145,178,.14)',
    gr: 'σκιὰν ἔχων ὁ νόμος τῶν μελλόντων ἀγαθῶν · οὐκ αὐτὴν τὴν εἰκόνα', tr: '스키안 에콘 호 노모스 톤 멜론톤 아가톤 · 우크 아우텐 텐 에이코나',
    desc: '"율법은 장차 올 좋은 일의 그림자일 뿐이요 · 참 형상이 아니므로" (10:1) · "하늘에 있는 것들의 모형과 그림자(ὑπόδειγμα καὶ σκιά)" (8:5). 플라톤 이원론 배경 vs 종말론 · Käsemann·Cockerill.',
    match: (s) => s.has('G4639') && s.has('G1504') },
  { id: 'faith_hall_of_fame', role: '믿음의 정의·믿음장 (11장)', icon: '🌟', color: '#eab308', bg: 'rgba(234,179,8,.14)',
    gr: 'ἔστιν δὲ πίστις ἐλπιζομένων ὑπόστασις · πραγμάτων ἔλεγχος οὐ βλεπομένων', tr: '에스틴 데 피스티스 엘피조메논 휘포스타시스 · 프라그마톤 엘렝코스 우 블레포메논',
    desc: '"믿음은 바라는 것들의 실상(ὑπόστασις)이요 보이지 않는 것들의 증거(ἔλεγχος)니" (11:1) — 히 11장 믿음의 사람들 목록: 아벨·에녹·노아·아브라함·사라·이삭·야곱·요셉·모세·라합·기드온·바락·삼손·다윗·선지자들. Attridge·Ellingworth.',
    match: (s) => s.has('G4102') && (s.has('G5287') || s.has('G1650')) },
  { id: 'jesus_pioneer_perfecter', role: '믿음의 창시자·완성자 예수 (12:2)', icon: '🎯', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'ἀφορῶντες εἰς τὸν τῆς πίστεως ἀρχηγὸν καὶ τελειωτὴν Ἰησοῦν', tr: '아포론테스 에이스 톤 테스 피스테오스 아르케곤 카이 텔레이오텐 이에순',
    desc: '"믿음의 주요 또 온전하게 하시는 이인 예수를 바라보자" (12:2) — ἀρχηγός(창시자·2:10 병행) + τελειωτής(완성자·히 hapax). 11장 믿음 목록의 정점. Cockerill·Peterson.',
    match: (s) => s.has('G0747') && s.has('G5051') },
  { id: 'race_perseverance', role: '경주 · 인내로 달림 (12:1-3)', icon: '🏃', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'τρέχωμεν τὸν προκείμενον ἡμῖν ἀγῶνα · διʼ ὑπομονῆς', tr: '트레코멘 톤 프로케이메논 헤민 아고나 · 디 휘포모네스',
    desc: '"우리 앞에 당한 경주를 인내로써 달리자 · 이렇게 많은 증인들이 구름 같이 둘러싸고" (12:1-3). 경기장 은유 · 순교자 관중 (11장 믿음 목록 = 구름 증인) · Pfitzner·Cockerill.',
    match: (s) => s.has('G5143') && s.has('G5281') },
  { id: 'discipline_father', role: '아버지의 징계 · 사랑의 증거 (12:5-11)', icon: '⚖️', color: '#b45309', bg: 'rgba(180,83,9,.13)',
    gr: 'ὃν γὰρ ἀγαπᾷ κύριος παιδεύει', tr: '혼 가르 아가파 퀴리오스 파이듀에이',
    desc: '"주께서 그 사랑하시는 자를 징계(παιδεύω)하시고 · 그가 받아들이시는 아들마다 채찍질하심이라 · 잠 3:11-12 인용" (12:5-6). 징계 신학 · 아들 됨의 표지. Attridge·Cockerill.',
    match: (s) => s.has('G3811') && s.has('G3962') },
  { id: 'zion_heavenly_jerusalem', role: '시온·하늘 예루살렘 (12:22-24)', icon: '🌆', color: '#7c3aed', bg: 'rgba(124,58,237,.14)',
    gr: 'προσεληλύθατε Σιὼν ὄρει · καὶ πόλει θεοῦ ζῶντος · Ἰερουσαλὴμ ἐπουρανίῳ', tr: '프로셀렐뤼타테 시온 오레이 · 카이 폴레이 테우 존토스 · 이에루살렘 에푸라니오',
    desc: '"너희가 이른 곳은 · 시온산과 · 살아 계신 하나님의 도성인 하늘의 예루살렘과 · 천만 천사와 · 하늘에 기록된 장자들의 모임과 교회와" (12:22-24). 시내산(12:18-21) 대비. Attridge·Peterson.',
    match: (s) => (s.has('G4622') && s.has('G2419')) || s.has('G4172') },
  { id: 'brotherly_love_ethics', role: '형제 사랑 실천 목록 (13장)', icon: '❤️', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἡ φιλαδελφία μενέτω · τῆς φιλοξενίας μὴ ἐπιλανθάνεσθε', tr: '헤 필라델피아 메네토 · 테스 필록세니아스 메 에필란타네스테',
    desc: '"형제 사랑을 계속하고 · 손님 대접(φιλοξενία)하기를 잊지 말라 · 이로써 부지중에 천사들을 대접" (13:1-2). 결혼·돈·지도자·진영 밖 예수 등 실천 명령 목록. Cockerill·Guthrie.',
    match: (s) => s.has('G5360') || s.has('G5381') },
  { id: 'outside_camp_reproach', role: '진영 밖 예수 · 능욕 (13:12-14)', icon: '⛺', color: '#dc2626', bg: 'rgba(220,38,38,.13)',
    gr: 'ἔξω τῆς παρεμβολῆς · φέροντες τὸν ὀνειδισμὸν αὐτοῦ', tr: '엑소 테스 파렘볼레스 · 페론테스 톤 오네이디스몬 아우투',
    desc: '"예수도 자기 피로써 백성을 거룩하게 하려고 성문 밖에서 고난을 받으셨느니라 · 그런즉 우리도 그의 능욕을 짊어지고 영문 밖으로 그에게 나아가자" (13:12-13). 유대교 이탈 격려. deSilva·Lane.',
    match: (s) => s.has('G3925') || s.has('G3680') },
];

const HEB_MANUAL_DISCOURSE = {
  '1:1':   'son_superior',              // 옛적에 선지자들 · 아들을 통하여 말씀
  '1:2':   'son_superior',              // 만유의 상속자 · 모든 세계를 지으심
  '1:3':   'son_superior',              // 하나님 영광의 광채·본체의 형상
  '1:4':   'better_kreitton',           // 천사보다 훨씬 뛰어난 이름
  '2:1':   'warning_passages',          // 흘러 떠내려가지 않도록 (경고 1)
  '2:9':   'once_for_all_ephapax',      // 모든 사람을 위하여 죽음을 맛보려 하심
  '2:17':  'high_priest_melchizedek',   // 자비하고 신실한 대제사장
  '3:7':   'warning_passages',          // 성령이 이르신 바 · 광야 세대 (경고 2)
  '4:12':  'warning_passages',          // 하나님의 말씀은 살아 있고 활력이 있어
  '4:14':  'high_priest_melchizedek',   // 큰 대제사장 · 하늘을 지나신 이 예수
  '4:15':  'high_priest_melchizedek',   // 모든 일에 시험을 받으신 이 · 죄는 없으시니
  '4:16':  'high_priest_melchizedek',   // 은혜의 보좌 앞에 담대히 나아갈 것이니라
  '5:6':   'high_priest_melchizedek',   // 멜기세덱의 반차를 따라 · 영원한 제사장 (시 110:4)
  '5:11':  'warning_passages',          // 성숙 경고 (경고 3 시작)
  '6:4':   'warning_passages',          // 한 번 빛을 받고 하늘의 은사를 맛보고 · 타락한 자
  '6:20':  'high_priest_melchizedek',   // 앞서 가신 예수께서 · 멜기세덱 반차를 따라 대제사장
  '7:22':  'better_kreitton',           // 더 좋은 언약의 보증이 되셨느니라
  '7:25':  'once_for_all_ephapax',      // 항상 살아 계셔서 그들을 위하여 간구
  '7:27':  'once_for_all_ephapax',      // 단번에 자기를 드려 이루셨느니라
  '8:6':   'new_covenant_jer31',        // 더 좋은 언약의 중보자 · 더 좋은 약속
  '8:8':   'new_covenant_jer31',        // 새 언약을 세울 날이 이르리라 (렘 31 인용 시작)
  '8:12':  'new_covenant_jer31',        // 저희 죄를 다시 기억하지 아니하리라
  '9:12':  'once_for_all_ephapax',      // 오직 자기 피로 · 단번에 성소에 들어가사
  '9:15':  'new_covenant_jer31',        // 새 언약의 중보자 · 영원한 기업의 약속
  '9:26':  'once_for_all_ephapax',      // 세상 끝에 자기를 단번에 제사로 드려 죄를 없이 하려
  '9:28':  'once_for_all_ephapax',      // 단번에 드리신 바 되사 · 두 번째 나타나심
  '10:1':  'shadow_reality',            // 율법은 그림자 · 참 형상이 아니므로
  '10:10': 'once_for_all_ephapax',      // 예수 그리스도의 몸을 단번에 드리심으로 · 거룩함을 얻음
  '10:26': 'warning_passages',          // 짐짓 죄를 범한즉 (경고 4)
  '10:31': 'warning_passages',          // 살아 계신 하나님의 손에 빠져 들어가는 것
  '11:1':  'faith_hall_of_fame',        // 믿음은 바라는 것들의 실상 · 보이지 않는 것들의 증거
  '11:6':  'faith_hall_of_fame',        // 믿음이 없이는 하나님을 기쁘시게 못하나니
  '11:8':  'faith_hall_of_fame',        // 아브라함 · 갈 바를 알지 못하고 나아갔음
  '11:13': 'faith_hall_of_fame',        // 이 사람들은 다 믿음을 따라 죽었으며 · 나그네·순례자
  '11:35': 'better_kreitton',           // 더 좋은 부활을 얻고자 하여
  '11:40': 'better_kreitton',           // 우리가 아니면 저들로 온전함을 이루지 못하게 하려
  '12:1':  'race_perseverance',         // 구름 같이 둘러싼 증인들 · 인내로 경주
  '12:2':  'jesus_pioneer_perfecter',   // 믿음의 주요 온전하게 하시는 이 예수
  '12:6':  'discipline_father',         // 주께서 사랑하시는 자 징계 (잠 3:11-12)
  '12:14': 'warning_passages',          // 화평·거룩함 좇으라 (경고 5 시작)
  '12:22': 'zion_heavenly_jerusalem',   // 시온산·살아계신 하나님의 도성·하늘 예루살렘
  '12:24': 'new_covenant_jer31',        // 새 언약의 중보자 예수 · 아벨의 피보다 나은 피
  '13:1':  'brotherly_love_ethics',     // 형제 사랑을 계속하고
  '13:2':  'brotherly_love_ethics',     // 손님 대접 · 부지중 천사 대접
  '13:8':  'son_superior',              // 예수 그리스도는 어제나 오늘이나 영원토록 동일
  '13:12': 'outside_camp_reproach',     // 예수도 · 성문 밖에서 고난 받으심
  '13:13': 'outside_camp_reproach',     // 우리도 그의 능욕 짊어지고 · 영문 밖으로
  '13:15': 'brotherly_love_ethics',     // 그러므로 우리는 예수로 말미암아 항상 찬송의 제사
  '13:20': 'new_covenant_jer31',        // 영원한 언약의 피로 · 큰 목자 되신 우리 주 예수
};

export const HEB_CTX = {
  id: 'Heb',
  book: { ko: '히브리서', bollsNum: 58, lexId: 'Heb', lexCorpus: 'gnt', en: 'Hebrews', testament: 'NT' },
  chapters: 13,
  discourseRules: [...GNT_DISCOURSE_RULES, ...HEB_STRUCTURAL_RULES],
  manualDiscourse: HEB_MANUAL_DISCOURSE,
  theoTerms: ROM_THEO_TERMS,
  meta: {
    genre: '신약 · 설교·논문 서신 혼합 · **λόγος τῆς παρακλήσεως**(권면의 말 · 13:22 자기 규정)',
    genreNote: '히 특유 · 서신 형식(13장) 갖추지만 실제로는 설교 · Attridge "설교 낭독 후 편지 형식 추가" · deSilva 수사학·유대 midrash 결합',
    year: 'AD 60-90 (다수 · Bruce·Lane·Attridge) · 성전 파괴(AD 70) 이전 여부 논쟁',
    yearNote: '성전 제사 현재형(8:4·9:6-9·10:1-3·13:10) → AD 70 이전 유리 (Bruce·Cockerill) vs 신학적 언어 (Attridge)',
    place: '미상 · "이달리야에서 온 자들" (13:24) → 로마 발신 or 로마 수신 논쟁',
    placeNote: '13:24 이달리야 언급 · 로마 수신 다수설(로마 클레멘트가 최초 인용) · 발신지 알렉산드리아·에베소 등 추측',
    author: '**미상 (Origen: "누가 썼는지 오직 하나님만 아신다")** · 후보: 바울(전통·거의 폐기)·바나바(Tertullian)·아볼로(Luther·Bruce 유력)·브리스길라(Harnack)·누가·클레멘트',
    authorNote: '문체·어휘 바울과 근본 차이 · 저자 자신 사도 아님 자인(2:3 "우리에게 확증한 바") · 헬레니즘 유대인 · 알렉산드리아 배경 유력',
    audience: '유대인 그리스도인 (전통) · 유대교 회귀 유혹 받는 신자들 · 혹은 이방인 겸 유대인 혼합 공동체',
    audienceNote: '10:32-34·13:7 박해 겪은 성숙 공동체 · 유대적 배경 강함 (구약 인용 밀도 최고 · OT 직접 인용 32회 + 암시 다수)',
    theme: '아들의 우월성 · 대제사장 기독론 · 새 언약 · 단번에 · 믿음 인내 · 배교 경고',
    themeNote: '**5대 경고 본문 (2:1-4·3:7-4:13·5:11-6:12·10:26-31·12:14-29)** = 히 구조의 X-ray · κρείττων 13회 = 우월성 논증 축 · 시 110:1·4 = 기독론 성경적 근거',
    chapterAgenda: {
      1: '**프롤로그: 옛적 선지자 → 이 마지막 날에 아들**(1:1-4 만유 상속·창조 대리·영광 광채·본체 형상·정하시고 앉음)·**아들이 천사보다 우월** OT 7 인용(1:5-14 시 2·삼하 7·신 32·시 104·시 45·시 102·시 110)',
      2: '**경고 1**(2:1-4 흘러 떠내려가지 않도록)·잠시 천사보다 못하게 · 죽음 맛보심(2:9)·**자비하고 신실한 대제사장 예수**(2:17-18)',
      3: '모세보다 뛰어난 아들 예수·**경고 2**(3:7-4:13 광야 세대·오늘·강퍅·안식)·시 95 인용',
      4: '**하나님의 안식 남아 있음**·**말씀 활력·양날의 검**(4:12)·**큰 대제사장 예수·은혜의 보좌 담대히**(4:14-16)',
      5: '대제사장 = 사람 중에서 택함·순종 배움(5:8)·**멜기세덱 반차** 도입(5:6·10)·**경고 3 시작**(5:11-14 성숙 미달)',
      6: '**경고 3 본체**(6:4-8 타락한 자·다시 회개 X)·소망의 닻·**멜기세덱 반차 예수**(6:20)',
      7: '**멜기세덱 = 살렘 왕·평강의 왕·아브라함이 십일조**(창 14)·레위보다 우월(레위도 아브라함 안에서 십일조)·**더 좋은 언약의 보증**(7:22)·**단번에 자기 드림**(7:27)',
      8: '**하늘 성소 대제사장**·모세는 모형·**새 언약 = 렘 31:31-34 최장 OT 인용**(8:8-12)',
      9: '지상 성막·연 1회 대제사장 지성소·**그리스도 자기 피로 단번에 성소**(9:12)·**새 언약 중보자**(9:15)·**단번에 자기를 제사로**(9:26-28)',
      10: '**율법은 그림자 참 형상 아님**(10:1)·그리스도 몸 단번에(10:10)·**새 언약 재인용**(10:15-18)·**경고 4**(10:26-31 짐짓 죄·살아계신 하나님의 손)',
      11: '**믿음장: 믿음의 정의(11:1)·아벨·에녹·노아·아브라함·사라·이삭·야곱·요셉·모세·라합·기드온·바락·삼손·다윗·선지자들**·**나그네·순례자**(11:13)·**더 좋은 부활**(11:35)·**우리가 아니면 저들로 온전함 못 이루게**(11:40)',
      12: '**구름 같이 둘러싼 증인·인내로 경주·믿음의 주 온전하게 하시는 예수**(12:1-2)·**아버지 징계**(12:5-11 잠 3:11-12)·**경고 5**(12:14-29)·**시내산 vs 시온산·하늘 예루살렘**(12:18-24)',
      13: '**형제 사랑·손님 대접**(13:1-2)·결혼·돈 사랑 X·지도자 본받음·**예수 어제·오늘·영원 동일**(13:8)·**성문 밖 예수·영문 밖 능욕 짊어짐**(13:12-14)·찬송의 제사·**영원한 언약의 피 큰 목자 예수**(13:20)·권면의 말(13:22)·이달리야 문안·은혜',
    },
  },
  macro: {
    sections: [
      { id: 's1', fromCh: 1,  toCh: 2,  color: '#7c3aed', label: '아들의 우월성 · 천사·인간 초월 (프롤로그·경고 1)' },
      { id: 's2', fromCh: 3,  toCh: 4,  color: '#0369a1', label: '모세보다 우월 · 하나님의 안식 (경고 2)' },
      { id: 's3', fromCh: 5,  toCh: 7,  color: '#dc2626', label: '멜기세덱 반차 대제사장 · 레위 초월 (경고 3)' },
      { id: 's4', fromCh: 8,  toCh: 10, color: '#7c3aed', label: '새 언약·하늘 성소·단번에 자기 제사 (경고 4)' },
      { id: 's5', fromCh: 11, toCh: 11, color: '#eab308', label: '믿음장 · 구름 같은 증인들' },
      { id: 's6', fromCh: 12, toCh: 12, color: '#dc2626', label: '경주·징계·시온산 (경고 5)' },
      { id: 's7', fromCh: 13, toCh: 13, color: '#059669', label: '실천 명령·영문 밖 예수·축도' },
    ],
    pivots: [
      { id: 'p1',  ch: 1,  verse: 1,  color: '#7c3aed', label: '옛적 선지자 → 아들 (계시 정점)' },
      { id: 'p2',  ch: 1,  verse: 3,  color: '#7c3aed', label: '영광의 광채·본체의 형상' },
      { id: 'p3',  ch: 2,  verse: 1,  color: '#dc2626', label: '경고 1 · 흘러 떠내려가지 않도록' },
      { id: 'p4',  ch: 2,  verse: 17, color: '#dc2626', label: '자비하고 신실한 대제사장' },
      { id: 'p5',  ch: 4,  verse: 12, color: '#0369a1', label: '말씀 살아 있고 활력 · 양날의 검' },
      { id: 'p6',  ch: 4,  verse: 14, color: '#dc2626', label: '큰 대제사장 예수 · 하늘을 지나신 이' },
      { id: 'p7',  ch: 4,  verse: 16, color: '#dc2626', label: '은혜의 보좌 앞에 담대히 나아갈 것' },
      { id: 'p8',  ch: 5,  verse: 6,  color: '#dc2626', label: '멜기세덱의 반차 · 영원한 제사장 (시 110:4)' },
      { id: 'p9',  ch: 6,  verse: 4,  color: '#dc2626', label: '경고 3 · 타락한 자 다시 회개 X' },
      { id: 'p10', ch: 6,  verse: 20, color: '#dc2626', label: '앞서 가신 예수 · 멜기세덱 반차 대제사장' },
      { id: 'p11', ch: 7,  verse: 22, color: '#7c3aed', label: '더 좋은 언약의 보증 (κρείττων)' },
      { id: 'p12', ch: 7,  verse: 27, color: '#dc2626', label: '단번에 자기를 드림 (ἐφάπαξ)' },
      { id: 'p13', ch: 8,  verse: 8,  color: '#7c3aed', label: '새 언약 (렘 31:31-34 인용 시작)' },
      { id: 'p14', ch: 8,  verse: 12, color: '#7c3aed', label: '저희 죄를 다시 기억하지 아니하리라' },
      { id: 'p15', ch: 9,  verse: 12, color: '#dc2626', label: '자기 피로 단번에 성소' },
      { id: 'p16', ch: 9,  verse: 15, color: '#7c3aed', label: '새 언약의 중보자 · 영원한 기업' },
      { id: 'p17', ch: 9,  verse: 26, color: '#dc2626', label: '세상 끝에 자기를 단번에 제사로 (죄 없이)' },
      { id: 'p18', ch: 10, verse: 1,  color: '#0891b2', label: '율법은 그림자 · 참 형상 아님' },
      { id: 'p19', ch: 10, verse: 10, color: '#dc2626', label: '예수 그리스도의 몸을 단번에 드림 · 거룩' },
      { id: 'p20', ch: 10, verse: 26, color: '#dc2626', label: '경고 4 · 짐짓 죄를 범한즉' },
      { id: 'p21', ch: 11, verse: 1,  color: '#eab308', label: '믿음의 정의 · 바라는 것 실상·증거' },
      { id: 'p22', ch: 11, verse: 6,  color: '#eab308', label: '믿음 없이는 하나님을 기쁘시게 못함' },
      { id: 'p23', ch: 11, verse: 13, color: '#eab308', label: '나그네·순례자 · 하늘 본향' },
      { id: 'p24', ch: 11, verse: 40, color: '#7c3aed', label: '우리가 아니면 저들로 온전함 못 이루게 (더 나은 것)' },
      { id: 'p25', ch: 12, verse: 1,  color: '#dc2626', label: '구름 같은 증인 · 인내로 경주' },
      { id: 'p26', ch: 12, verse: 2,  color: '#7c3aed', label: '믿음의 주 온전하게 하시는 예수 (창시자·완성자)' },
      { id: 'p27', ch: 12, verse: 6,  color: '#b45309', label: '주께서 사랑하시는 자 징계 (잠 3:11-12)' },
      { id: 'p28', ch: 12, verse: 22, color: '#7c3aed', label: '시온산·하늘 예루살렘·천만 천사' },
      { id: 'p29', ch: 12, verse: 24, color: '#7c3aed', label: '새 언약의 중보자 예수 · 아벨의 피보다 나은 피' },
      { id: 'p30', ch: 13, verse: 8,  color: '#7c3aed', label: '예수 그리스도 어제·오늘·영원토록 동일' },
      { id: 'p31', ch: 13, verse: 13, color: '#dc2626', label: '영문 밖으로 · 그의 능욕 짊어지고' },
      { id: 'p32', ch: 13, verse: 20, color: '#7c3aed', label: '영원한 언약의 피 · 큰 목자 예수 (축도)' },
    ],
    arcs: [
      { id: 'a1',  from: 'p1',  to: 'p30', color: '#7c3aed', label: '아들 통한 계시 (1:1) → 예수 어제·오늘·영원 동일 (13:8) · 대주제 Inclusio' },
      { id: 'a2',  from: 'p2',  to: 'p32', color: '#7c3aed', label: '영광의 광채 → 큰 목자 예수 (기독론 축)' },
      { id: 'a3',  from: 'p4',  to: 'p6',  color: '#dc2626', label: '자비 대제사장 도입 → 큰 대제사장 확립' },
      { id: 'a4',  from: 'p6',  to: 'p10', color: '#dc2626', label: '큰 대제사장 → 멜기세덱 반차 (대제사장 논증)' },
      { id: 'a5',  from: 'p8',  to: 'p10', color: '#dc2626', label: '멜기세덱 (시 110:4) → 반차 대제사장 완성' },
      { id: 'a6',  from: 'p11', to: 'p16', color: '#7c3aed', label: '더 좋은 언약 보증 → 새 언약 중보자 (언약 축)' },
      { id: 'a7',  from: 'p13', to: 'p29', color: '#7c3aed', label: '새 언약 (렘 31) → 새 언약의 중보자 예수 · 아벨보다 나은 피' },
      { id: 'a8',  from: 'p12', to: 'p19', color: '#dc2626', label: '단번에 자기 드림 (7:27) → 단번에 몸 드림 (10:10) · ἐφάπαξ 축' },
      { id: 'a9',  from: 'p15', to: 'p17', color: '#dc2626', label: '자기 피로 단번에 → 세상 끝 단번에 제사 (죄 없이)' },
      { id: 'a10', from: 'p3',  to: 'p20', color: '#dc2626', label: '경고 1 → 경고 4 (배교 경계 축)' },
      { id: 'a11', from: 'p18', to: 'p28', color: '#7c3aed', label: '그림자 → 시온산 하늘 예루살렘 (모형-실체)' },
      { id: 'a12', from: 'p21', to: 'p26', color: '#eab308', label: '믿음의 정의 → 믿음의 주 예수 (믿음 축)' },
      { id: 'a13', from: 'p22', to: 'p25', color: '#eab308', label: '믿음 없이 X → 구름 같은 증인들 (믿음 목록 도입)' },
      { id: 'a14', from: 'p23', to: 'p31', color: '#dc2626', label: '나그네·순례자 → 영문 밖 예수 (순례 신학)' },
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

export const SUPPORTED_BOOK_IDS = Object.keys(BOOK_CONTEXTS);
