import { KOREAN_GLOSS_TOP_BATCH_02 } from '../../../src/data/koreanGlossTopBatch02.js';
const data = KOREAN_GLOSS_TOP_BATCH_02;
const regs = [];
for (const strong in data) {
  const item = data[strong];
  const note = item.note || '';
  const translit = item.translit;
  
  // Extract words containing a-z from note
  const latinMatches = [...note.matchAll(/[a-zA-Zāēīōūšḥṭṣĕăŏ]+(?:-[a-zA-Zāēīōūšḥṭṣĕăŏ]+)*/g)].map(m => m[0]);
  
  // If note has a latin word that looks like a translit but doesn't match the field
  const possibleTranslits = latinMatches.filter(w => w.length > 2 && !['Gemini', 'Claude', 'SBL', 'option', 'option1', 'option2'].includes(w));
  if (possibleTranslits.length > 0 && !possibleTranslits.includes(translit)) {
    // maybe it mentions a related word
    if (!note.includes('같이') && !note.includes('처럼') && !note.includes('기존 배치')) {
       // regs.push({strong, possibleTranslits, translit, note});
    }
  }
}
// Let's just print them all to manually review
for (const strong in data) {
  const item = data[strong];
  const note = item.note || '';
  const latinMatches = [...note.matchAll(/[a-zA-Zāēīōūšḥṭṣĕăŏ]+/g)].map(m => m[0]);
  const possibleTranslits = latinMatches.filter(w => w.length > 2 && !['Gemini', 'Claude', 'SBL', 'option', 'option1', 'option2'].includes(w));
  if (possibleTranslits.length > 0 && !possibleTranslits.includes(item.translit)) {
      console.log(strong, possibleTranslits, item.translit, note);
  }
}
