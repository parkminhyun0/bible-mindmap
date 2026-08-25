import { KOREAN_GLOSS_TOP_BATCH_02 } from '../../../src/data/koreanGlossTopBatch02.js';
const data = KOREAN_GLOSS_TOP_BATCH_02;
for (const strong in data) {
  const item = data[strong];
  const note = item.note || '';
  if (note.includes('채택')) {
    console.log(strong, 'has 채택');
  }
}
