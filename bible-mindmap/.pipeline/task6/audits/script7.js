import { KOREAN_GLOSS_TOP_BATCH_02 } from '../../../src/data/koreanGlossTopBatch02.js';
const data = KOREAN_GLOSS_TOP_BATCH_02;
let aggrOnlyCount = 0;
const needsExplanation = [];
for (const strong in data) {
  const item = data[strong];
  let note = item.note || '';
  
  // Remove known aggregation / housekeeping texts
  note = note.replace(/두 모델 계열\(Gemini·Claude\)이 독립으로 만든 음역안이 일치했다\./g, '')
             .replace(/표기가 갈려 3개 모델이 독립 판정했다\([0-9]\/3 일치\)\./g, '')
             .replace(/베가드케파트 연음은 기존 배치\(ṭôb·ʿereb\)를 따라 구분 기호 없이 적었다\./g, '')
             .replace(/관용 표기 '.*?'[와과] 차이/g, '')  // These are basically empty too, as seen above
             .replace(/\(관용 표기 ".*?"와 차이 있음\)/g, '')
             .trim();
  
  if (note === '') {
    aggrOnlyCount++;
    // Proper nouns typically need explanation, especially if they differ from Korean Bible conventions.
    const isProper = /^[A-Z]/.test(item.glossKo) && !['A', 'An', 'The', 'To', 'Be', 'For', 'And', 'In'].includes(item.glossKo.split(' ')[0]);
    if (isProper) {
       needsExplanation.push(strong);
    }
  }
}
console.log(JSON.stringify({aggrOnlyCount, needsExplanation}));
