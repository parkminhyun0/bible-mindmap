// 원어 한글 음역 정책 제안서.
// IMPORTANT: 박 목사님 확인 전에는 labelHe/labelGr 또는 산문 데이터를 변경하지 않는다.
// 이 파일은 승인 게이트와 검증 계약만 제공하며 자동 변환기가 아니다.

export const TRANSLITERATION_POLICY = Object.freeze({
  schemaVersion: 1,
  decisionId: 'ADR-1',
  status: 'pending-pastor-approval',
  migrationEnabled: false,
  displayFormat: Object.freeze({
    withCustomary: '원어 (SBL 엄밀 음역 / 개역개정 관용 표기)',
    strictOnly: '원어 (SBL 엄밀 음역)',
  }),
  approval: Object.freeze({
    approved: false,
    approvedBy: '',
    approvedAt: '',
    note: '박 목사님 확인 전 데이터 이관 금지',
  }),
  preservation: Object.freeze([
    '원어 철자·모음부호·악센트 불변',
    'Strong·lemma·형태론 불변',
    '관용 표기는 개역개정에서 실제 사용하는 경우에만 병기',
    '엄밀식과 관용식이 같으면 중복 병기 금지',
    '문맥 의존 음가는 자동 확정하지 않고 수동 검토',
  ]),
  proposedMappings: Object.freeze([
    Object.freeze({
      id: 'he-shin-sin',
      language: 'hebrew',
      source: 'שׁ / שׂ',
      sblSymbol: 'š / ś',
      proposedKoreanRule: 'שׁ은 문맥에 따라 시/쉬 계열, שׂ은 스/사 계열로 구분하되 실제 음절은 단어 단위 검토',
      mode: 'word-level-review',
      approved: false,
    }),
    Object.freeze({
      id: 'he-gutturals',
      language: 'hebrew',
      source: 'ח / ה / ע',
      sblSymbol: 'ḥ / h / ʿ',
      proposedKoreanRule: 'ח는 흐/흐 계열, ה는 하/ㅎ 계열, ע는 아인 표지 또는 문맥상 비표기 후보를 단어별 검토',
      mode: 'word-level-review',
      approved: false,
    }),
    Object.freeze({
      id: 'he-furtive-patach',
      language: 'hebrew',
      source: 'פתח גנובה (furtive patach)',
      sblSymbol: 'a before final guttural',
      proposedKoreanRule: '어말 후음 앞 a를 먼저 읽는 순서를 보존: 예 מָשִׁיחַ → 마시아흐 후보',
      mode: 'word-level-review',
      approved: false,
    }),
    Object.freeze({
      id: 'gr-eu',
      language: 'greek',
      source: 'ευ',
      sblSymbol: 'eu',
      proposedKoreanRule: '후속 자음의 유·무성에 따른 에우/에브/에프 계열은 자동 단일화하지 않고 단어별 검토',
      mode: 'context-required',
      approved: false,
    }),
    Object.freeze({
      id: 'gr-double-sigma-upsilon-rho',
      language: 'greek',
      source: 'σσ / υ / ῥ',
      sblSymbol: 'ss / y / rh',
      proposedKoreanRule: 'σσ의 장단·표기, υ의 위/유 계열, 어두 ῥ의 흐/르 계열을 기존 관용 표기와 함께 단어별 검토',
      mode: 'word-level-review',
      approved: false,
    }),
  ]),
});

export function canApplyTransliterationMigration(policy = TRANSLITERATION_POLICY) {
  return policy.status === 'approved'
    && policy.migrationEnabled === true
    && policy.approval?.approved === true
    && Boolean(policy.approval?.approvedBy)
    && Boolean(policy.approval?.approvedAt)
    && policy.proposedMappings.every((entry) => entry.approved === true);
}
