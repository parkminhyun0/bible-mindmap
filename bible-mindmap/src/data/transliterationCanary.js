// TASK-28 · 원어 한글 음역 presentation canary.
// Genesis/Luke 사전 생산 데이터, Approval Registry, approved meaning을 변경하지 않는다.
// strictKo는 SBL 학술 음역을 기준으로 한 한국어 근사이며 SBL의 공식 한국어 표기가 아니다.

export const TRANSLITERATION_CANARY = Object.freeze({
  H120: Object.freeze({ lemma: 'אָדָם', sblRoman: 'ʾādām', strictKo: '아담', customaryKo: '', ref: 'Gen 2:7' }),
  H6083: Object.freeze({ lemma: 'עָפָר', sblRoman: 'ʿāp̄ār', strictKo: '아파르', customaryKo: '', ref: 'Gen 2:7' }),
  H7704: Object.freeze({ lemma: 'שָׂדֶה', sblRoman: 'śādeh', strictKo: '사데', customaryKo: '', ref: 'Gen 2:5' }),
  H7880: Object.freeze({ lemma: 'שִׂיחַ', sblRoman: 'śîaḥ', strictKo: '시아흐', customaryKo: '', ref: 'Gen 2:5' }),
  H4899: Object.freeze({ lemma: 'מָשִׁיחַ', sblRoman: 'māšîaḥ', strictKo: '마쉬아흐', customaryKo: '', ref: 'Ps 2:2' }),
  H7307: Object.freeze({ lemma: 'רוּחַ', sblRoman: 'rûaḥ', strictKo: '루아흐', customaryKo: '', ref: 'Gen 1:2' }),
  G5547: Object.freeze({ lemma: 'Χριστός', sblRoman: 'Christos', strictKo: '크리스토스', customaryKo: '그리스도', ref: 'Mark 1:1' }),
  G4461: Object.freeze({ lemma: 'ῥαββί', sblRoman: 'rhabbi', strictKo: '라브비', customaryKo: '랍비', ref: 'John 1:38' }),
  G3323: Object.freeze({ lemma: 'Μεσσίας', sblRoman: 'Messias', strictKo: '메시아스', customaryKo: '메시야', ref: 'John 1:41' }),
  G2962: Object.freeze({ lemma: 'κύριος', sblRoman: 'kyrios', strictKo: '퀴리오스', customaryKo: '', ref: 'Luke 2:11' }),
  G2098: Object.freeze({ lemma: 'εὐαγγέλιον', sblRoman: 'euangelion', strictKo: '에우앙겔리온', customaryKo: '', ref: 'Mark 1:1' }),
});

export function normalizeStrongId(strongId) {
  const match = String(strongId || '').trim().match(/^([HG])0*(\d+)$/iu);
  if (!match) return '';
  return `${match[1].toUpperCase()}${Number(match[2])}`;
}

export function getTransliterationCanary(strongId) {
  const normalized = normalizeStrongId(strongId);
  return normalized ? (TRANSLITERATION_CANARY[normalized] || null) : null;
}

export function formatKoreanTransliteration(entry) {
  if (!entry?.strictKo) return '';
  return entry.customaryKo && entry.customaryKo !== entry.strictKo
    ? `${entry.strictKo} / ${entry.customaryKo}`
    : entry.strictKo;
}
