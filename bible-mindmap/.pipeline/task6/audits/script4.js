import { KOREAN_GLOSS_TOP_BATCH_02 } from '../../../src/data/koreanGlossTopBatch02.js';
const data = KOREAN_GLOSS_TOP_BATCH_02;
const regs = [];
for (const strong in data) {
  const item = data[strong];
  const note = item.note || '';
  
  // Extract quoted texts from note to see if they match tk or translit
  // For Korean:
  const korMatches = [...note.matchAll(/['"]([가-힣]+)['"]/g)].map(m => m[1]);
  // if tk is not in korMatches, but note explicitly says we adopt korMatches[0]?
  // Actually, let's just see if translitKo is explicitly mentioned as something else.
  // We can just print out any note that mentions a Korean word but doesn't mention translitKo
  
  const hasTk = note.includes(item.translitKo);
  if (!hasTk && korMatches.length > 0) {
     // Is it talking about a conventional spelling?
     // e.g. "관용 표기 '모세'와 차이"
     const isConv = note.includes('관용') || note.includes('한국어 성경') || note.includes('배포 데이터');
     if (!isConv) {
        // Look closely
        regs.push({strong, issue: 'translitKo not mentioned, but other Korean word is', evidence: note});
     }
  }
}
console.log(JSON.stringify(regs, null, 2));
