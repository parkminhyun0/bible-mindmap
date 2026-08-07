// BDB 전체 정의 한국어 번역 파일럿.
// 파일럿 범위는 H776(אֶרֶץ, 에레츠) 1개 항목이며,
// 짧은 검색용 뜻(koreanGloss.js)과 긴 사전 번역을 의도적으로 분리한다.

export const LEXICON_TRANSLATION_PILOT_VERSION = '2026.08.08-pilot.1';

export const LEXICON_TRANSLATION_PILOT = Object.freeze({
  H776: Object.freeze({
    strong: 'H776',
    source: 'BDB',
    sourceLanguage: 'en',
    sourceVersion: 'bdbt-pilot-2026.08',
    translationVersion: LEXICON_TRANSLATION_PILOT_VERSION,
    reviewStatus: 'pilot-reviewed',
    titleKo: 'BDB 정의 번역',
    lemma: 'אֶרֶץ',
    translitKo: '에레츠',
    definition: Object.freeze([
      {
        id: '1',
        text: '땅, 대지',
        children: [
          {
            id: '1.1',
            text: '지구·땅',
            children: [
              { id: '1.1.1', text: '한 부분과 대조되는 온 땅' },
              { id: '1.1.2', text: '하늘과 대조되는 땅' },
              { id: '1.1.3', text: '땅의 주민들' },
            ],
          },
          {
            id: '1.2',
            text: '지역·영토',
            children: [
              { id: '1.2.1', text: '나라, 영토' },
              { id: '1.2.2', text: '지방, 지역' },
              { id: '1.2.3', text: '지파의 영토' },
              { id: '1.2.4', text: '한 구획의 땅' },
              { id: '1.2.5', text: '가나안 땅, 이스라엘 땅' },
              { id: '1.2.6', text: '그 땅의 주민들' },
              { id: '1.2.7', text: '스올, 돌아올 수 없는 땅, 지하 세계' },
              { id: '1.2.8', text: '도시 또는 도시국가' },
            ],
          },
          {
            id: '1.3',
            text: '땅바닥, 지표면',
            children: [
              { id: '1.3.1', text: '땅바닥' },
              { id: '1.3.2', text: '토양' },
            ],
          },
          {
            id: '1.4',
            text: '관용 표현에서의 용법',
            children: [
              { id: '1.4.1', text: '그 땅의 백성' },
              { id: '1.4.2', text: '거리 측정에서 사용되는 지역의 넓이 또는 거리' },
              { id: '1.4.3', text: '평평한 지역, 평야 지대' },
              { id: '1.4.4', text: '생존자의 땅' },
              { id: '1.4.5', text: '땅끝' },
            ],
          },
          {
            id: '1.5',
            text: '거의 전적으로 후기 용례에서 사용됨',
            children: [
              {
                id: '1.5.1',
                text: '여러 땅, 여러 나라',
                children: [
                  { id: '1.5.1.1', text: '종종 가나안과 대조되어 사용됨' },
                ],
              },
            ],
          },
        ],
      },
    ]),
    originKo: '현재는 사용되지 않는 어근에서 유래한 것으로 보이며, 아마도 “견고하다”라는 뜻입니다.',
    twot: Object.freeze({
      entry: '167',
      sourceLabel: 'TWOT 항목',
    }),
    partOfSpeechKo: '여성 명사',
    noticeKo: '한국어 번역은 연구 보조용 파일럿입니다. 해석과 인용에서는 영어 BDB 원문을 함께 확인하십시오.',
  }),
});

export function normalizeLexiconTranslationStrong(value) {
  const raw = String(value || '').trim().toUpperCase();
  const match = raw.match(/^([GH])0*(\d+)$/);
  return match ? `${match[1]}${Number(match[2])}` : raw;
}

export function getLexiconTranslation(value) {
  const key = normalizeLexiconTranslationStrong(value);
  return LEXICON_TRANSLATION_PILOT[key] || null;
}
