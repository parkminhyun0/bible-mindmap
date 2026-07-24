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
  id: 'Exo',
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
};

// ── 등록된 책 컨텍스트 (activeBookId 로 조회) ────────────────────────────
export const BOOK_CONTEXTS = {
  Gen: GEN_CTX,
  Exo: EXO_CTX,
  Rom: ROM_CTX,
  Ruth: RUTH_CTX,
  Mark: MRK_CTX,
};

export const SUPPORTED_BOOK_IDS = Object.keys(BOOK_CONTEXTS);
