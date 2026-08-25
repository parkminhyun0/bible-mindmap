import { KOREAN_GLOSS_TOP_BATCH_02 } from '../../../src/data/koreanGlossTopBatch02.js';

const data = KOREAN_GLOSS_TOP_BATCH_02;
const regressions = [];
const remaining = [];

for (const strong in data) {
  const item = data[strong];
  const note = item.note || '';
  const tk = item.translitKo;
  
  // Check 1.1: discrepancy between note and translitKo.
  // We can use regex to find words in Korean quotes or explicitly mentioned as "표기 ...를" 
  const tkMatch = note.match(/['"]([가-힣]+)['"](?:를|을) (?:표제로|채택)/);
  if (tkMatch) {
    if (tkMatch[1] !== tk) {
      regressions.push({
        strong, 
        issue: `note says ${tkMatch[1]} is adopted, but translitKo is ${tk}`, 
        evidence: note, 
        severity: 'high'
      });
    }
  }

  // Check 1.2: old symbols
  const forbidden = ['ḇ', 'ḡ', 'ḏ', 'ḵ', 'ṯ', 'p̄', 'ə'];
  for (const c of forbidden) {
    if (note.includes(c)) {
      regressions.push({ strong, issue: `contains forbidden char ${c}`, evidence: note, severity: 'medium' });
      break;
    }
  }

  // Check 1.3: wrong judge counts
  const match = note.match(/([0-9]+)개 모델/);
  if (match && match[1] !== '3') {
    regressions.push({ strong, issue: `wrong judge count: ${match[1]}`, evidence: note, severity: 'high' });
  }

  // Check 2: Missing explanations.
  // The proper nouns script already identified H4519 as suspicious because its explanation was wiped out.
  if (strong === 'H4519') {
     remaining.push({ strong, issue: '관용 표기와 갈리는 이유 설명(유성 셰바, 신-세골 등)이 삭제되며 정보가 유실됨', severity: 'medium' });
  }

}
console.log(JSON.stringify({ regressions, remaining }, null, 2));
