import { TRANSLITERATION_POLICY, canDisplayTransliteration } from './transliterationPolicy.js';

// TASK-28 · 독립 presentation canary.
// Strong/lemma/사전 의미/Approval Registry를 변경하지 않고 사전 팝업 표시층에서만 사용한다.
// strictKo는 SBL 학술 음역을 기준으로 한 한국어 근사이며 SBL의 공식 한국어 표기가 아니다.
export const TRANSLITERATION_PRESENTATION = Object.freeze({
  H120: Object.freeze({
    language: 'hebrew',
    lemma: 'אָדָם',
    sblRoman: 'ʾādām',
    strictKo: '아담',
    customaryKo: '',
    ruleIds: Object.freeze(['he-gutturals']),
    canaryRef: 'Gen 2:7',
  }),
  H6083: Object.freeze({
    language: 'hebrew',
    lemma: 'עָפָר',
    sblRoman: 'ʿāp̄ār',
    strictKo: '아파르',
    customaryKo: '',
    ruleIds: Object.freeze(['he-gutturals']),
    canaryRef: 'Gen 2:7',
  }),
  H7704: Object.freeze({
    language: 'hebrew',
    lemma: 'שָׂדֶה',
    sblRoman: 'śādeh',
    strictKo: '사데',
    customaryKo: '',
    ruleIds: Object.freeze(['he-shin-sin']),
    canaryRef: 'Gen 2:5',
  }),
  H7880: Object.freeze({
    language: 'hebrew',
    lemma: 'שִׂיחַ',
    sblRoman: 'śîaḥ',
    strictKo: '시아흐',
    customaryKo: '',
    ruleIds: Object.freeze(['he-shin-sin', 'he-gutturals', 'he-furtive-patach']),
    canaryRef: 'Gen 2:5',
  }),
  H4899: Object.freeze({
    language: 'hebrew',
    lemma: 'מָשִׁיחַ',
    sblRoman: 'māšîaḥ',
    strictKo: '마쉬아흐',
    customaryKo: '',
    ruleIds: Object.freeze(['he-shin-sin', 'he-gutturals', 'he-furtive-patach']),
    canaryRef: 'Ps 2:2',
  }),
  H7307: Object.freeze({
    language: 'hebrew',
    lemma: 'רוּחַ',
    sblRoman: 'rûaḥ',
    strictKo: '루아흐',
    customaryKo: '',
    ruleIds: Object.freeze(['he-gutturals', 'he-furtive-patach']),
    canaryRef: 'Gen 1:2',
  }),
  G5547: Object.freeze({
    language: 'greek',
    lemma: 'Χριστός',
    sblRoman: 'Christos',
    strictKo: '크리스토스',
    customaryKo: '그리스도',
    ruleIds: Object.freeze(['gr-double-sigma-upsilon-rho']),
    canaryRef: 'Mark 1:1',
  }),
  G4461: Object.freeze({
    language: 'greek',
    lemma: 'ῥαββί',
    sblRoman: 'rhabbi',
    strictKo: '라브비',
    customaryKo: '랍비',
    ruleIds: Object.freeze(['gr-double-sigma-upsilon-rho']),
    canaryRef: 'John 1:38',
  }),
  G3323: Object.freeze({
    language: 'greek',
    lemma: 'Μεσσίας',
    sblRoman: 'Messias',
    strictKo: '메시아스',
    customaryKo: '메시야',
    ruleIds: Object.freeze(['gr-double-sigma-upsilon-rho']),
    canaryRef: 'John 1:41',
  }),
  G2962: Object.freeze({
    language: 'greek',
    lemma: 'κύριος',
    sblRoman: 'kyrios',
    strictKo: '퀴리오스',
    customaryKo: '',
    ruleIds: Object.freeze(['gr-double-sigma-upsilon-rho']),
    canaryRef: 'Luke 2:11',
  }),
  G2098: Object.freeze({
    language: 'greek',
    lemma: 'εὐαγγέλιον',
    sblRoman: 'euangelion',
    strictKo: '에우앙겔리온',
    customaryKo: '',
    ruleIds: Object.freeze(['gr-eu']),
    canaryRef: 'Mark 1:1',
  }),
});

export const TRANSLITERATION_CANARY_COUNT = Object.keys(TRANSLITERATION_PRESENTATION).length;

export function normalizeStrongId(strongId) {
  const match = String(strongId || '').trim().match(/^([HG])0*(\d+)$/iu);
  if (!match) return '';
  return `${match[1].toUpperCase()}${Number(match[2])}`;
}

export function getTransliterationPresentation(strongId, policy = TRANSLITERATION_POLICY) {
  if (!canDisplayTransliteration(policy)) return null;
  const normalized = normalizeStrongId(strongId);
  return normalized ? (TRANSLITERATION_PRESENTATION[normalized] || null) : null;
}

export function formatKoreanTransliteration(presentation) {
  if (!presentation?.strictKo) return '';
  if (presentation.customaryKo && presentation.customaryKo !== presentation.strictKo) {
    return `${presentation.strictKo} / ${presentation.customaryKo}`;
  }
  return presentation.strictKo;
}
