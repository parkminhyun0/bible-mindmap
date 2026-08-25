import { KOREAN_GLOSS_TOP_BATCH_02 } from '../../../src/data/koreanGlossTopBatch02.js';
import fs from 'fs';

const data = KOREAN_GLOSS_TOP_BATCH_02;
const properNouns = [];
for (const strong in data) {
  const item = data[strong];
  const firstWord = item.glossKo.split(/[^a-zA-Z]/)[0];
  if (/^[A-Z]/.test(firstWord) && !['A', 'An', 'The', 'To', 'Be', 'For', 'And', 'In'].includes(firstWord)) {
    properNouns.push({strong, ...item});
  }
}
console.log(JSON.stringify(properNouns.map(x => ({s: x.strong, tk: x.translitKo, g: x.glossKo, n: x.note})), null, 2));
