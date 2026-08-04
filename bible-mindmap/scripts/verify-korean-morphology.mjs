import { explainMorphologyKorean } from '../src/utils/morphologyKorean.js';

const cases = [
  ['V-AAI-3S', ['동사', '부정과거', '능동태', '직설법', '3인칭', '단수']],
  ['N-GSM', ['명사', '속격', '단수', '남성']],
  ['HVqp3ms', ['동사', '칼(Qal)', '완료형', '3인칭', '남성', '단수']],
  ['HNcmpa', ['명사', '남성', '복수', '독립형']],
  ['HR/Ncfsc', ['전치사', '명사', '여성', '단수', '연계형']],
];

const errors = [];
for (const [code, expected] of cases) {
  const result = explainMorphologyKorean(code);
  if (!result) {
    errors.push(`${code}: result missing`);
    continue;
  }
  for (const label of expected) {
    if (!result.values.includes(label)) errors.push(`${code}: missing ${label}`);
  }
  if (!result.summary || !result.explanation || !result.caution) {
    errors.push(`${code}: Korean explanation contract incomplete`);
  }
}

const empty = explainMorphologyKorean('');
if (empty !== null) errors.push('empty morphology must return null');

if (errors.length) {
  console.error(`✗ Korean morphology verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`✓ Korean morphology explanations verified · ${cases.length} representative forms`);
