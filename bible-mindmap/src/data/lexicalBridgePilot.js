export const LEXICAL_BRIDGE_PILOT = [
  {
    id: 'ruth-2-13-h5162',
    status: 'pilot-reviewed',
    strong: 'H5162',
    sourceRef: 'Ruth.2.13',
    sourceRefKo: '룻기 2:13',
    labelKo: '위로하다',
    hebrew: {
      surface: 'נִחַמְתָּנִי',
      lemma: 'נחם',
      transliterationKo: '나함',
      glossKo: '위로하다',
    },
    lxx: {
      surface: 'παρεκάλεσάς',
      phrase: 'παρεκάλεσάς με',
      lemma: 'παρακαλέω',
      transliterationKo: '파라칼레오',
      glossKo: '위로하다 · 권면하다',
    },
    nt: {
      sameLemma: ['παρακαλέω'],
      lexicalFamily: ['παράκλησις', 'παράκλητος'],
      representativeRefs: [
        {
          ref: 'John.14.26',
          refKo: '요한복음 14:26',
          lemma: 'παράκλητος',
          noteKo: '이 문맥에서 보혜사는 성령으로 명시된다.',
        },
        {
          ref: '1John.2.1',
          refKo: '요한일서 2:1',
          lemma: 'παράκλητος',
          noteKo: '같은 단어가 예수 그리스도에게도 사용되어 단어 자체를 성령과 동일시하지 않도록 경계한다.',
        },
      ],
    },
    evidence: [
      {
        grade: 'A',
        label: 'MT↔LXX 직접 대응',
        state: 'verified',
        note: '룻기 2:13의 נחם 활용형을 LXX가 παρακαλέω 활용형으로 번역한다.',
      },
      {
        grade: 'B',
        label: 'LXX↔NT 동일 lemma',
        state: 'verified',
        note: 'παρακαλέω는 신약에서도 동일 lemma로 사용된다.',
      },
      {
        grade: 'C',
        label: '동계어·어휘 family',
        state: 'verified',
        note: 'παράκλησις·παράκλητος는 동일 어휘 family의 후속 연구 대상으로 연결한다.',
      },
      {
        grade: 'D',
        label: '인용·반향·의미장',
        state: 'unresolved',
        note: '직접 인용이나 저자의 의도적 반향은 이 Pilot에서 확정하지 않는다.',
      },
      {
        grade: 'E',
        label: '정경적·신학적 해석',
        state: 'candidate',
        note: '정경적 의미 연결은 해석 후보로만 제시하며 사람 검토를 전제로 한다.',
      },
    ],
    cautionKo: '룻기 2:13이 성령을 직접 예언하거나 예표한다고 확정하지 않는다. 이 브릿지는 LXX 번역 전통을 통해 신약의 어휘적 배경을 탐색하는 연구 연결점이다.',
    searchTerms: ['H5162', '5162', 'נחם', '나함', '위로', '룻기 2:13', 'Ruth 2:13', 'παρακαλέω', '파라칼레오', 'παράκλητος'],
  },
];

export function normalizeBridgeStrong(strong) {
  if (!strong) return '';
  return String(strong).toUpperCase().replace(/^([HG])0+(?=\d)/, '$1');
}

export function getLexicalBridgeByStrong(strong) {
  const normalized = normalizeBridgeStrong(strong);
  return LEXICAL_BRIDGE_PILOT.find((bridge) => bridge.strong === normalized) || null;
}

export function hasLexicalBridge(strong) {
  return Boolean(getLexicalBridgeByStrong(strong));
}

export function searchLexicalBridges(query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return LEXICAL_BRIDGE_PILOT;

  return LEXICAL_BRIDGE_PILOT.filter((bridge) => {
    const haystack = [
      bridge.strong,
      bridge.sourceRef,
      bridge.sourceRefKo,
      bridge.labelKo,
      bridge.hebrew.surface,
      bridge.hebrew.lemma,
      bridge.hebrew.transliterationKo,
      bridge.lxx.surface,
      bridge.lxx.lemma,
      bridge.lxx.transliterationKo,
      ...bridge.searchTerms,
    ].join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}
