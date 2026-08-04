// 정경 개념 ↔ 용례지도 완전성 하드 게이트.
// 모든 CANONICAL_CONCEPTS 키는 CANONICAL_USAGE_MAP에 존재해야 하며,
// 용례지도에는 존재하지 않는 고아 키가 없어야 한다.

import { CANONICAL_CONCEPTS } from '../src/data/canonicalConcepts.js';
import { CANONICAL_USAGE_MAP } from '../src/data/canonicalUsageMap.js';

const errors = [];
const conceptKeys = Object.keys(CANONICAL_CONCEPTS || {}).sort();
const usageKeys = Object.keys(CANONICAL_USAGE_MAP || {}).sort();
const conceptKeySet = new Set(conceptKeys);
const usageKeySet = new Set(usageKeys);

const missingUsageKeys = conceptKeys.filter((key) => !usageKeySet.has(key));
const orphanUsageKeys = usageKeys.filter((key) => !conceptKeySet.has(key));

if (missingUsageKeys.length) {
  errors.push(`용례지도 누락 개념 ${missingUsageKeys.length}개: ${missingUsageKeys.join(', ')}`);
}
if (orphanUsageKeys.length) {
  errors.push(`개념 정의가 없는 용례지도 키 ${orphanUsageKeys.length}개: ${orphanUsageKeys.join(', ')}`);
}

for (const key of usageKeys) {
  const usages = CANONICAL_USAGE_MAP[key];
  const where = `usageMap.${key}`;

  if (!Array.isArray(usages)) {
    errors.push(`${where}: 배열 아님`);
    continue;
  }
  if (usages.length < 6 || usages.length > 10) {
    errors.push(`${where}: 용례 ${usages.length}개 (6~10 요구)`);
  }

  const seenRefs = new Set();
  usages.forEach((usage, index) => {
    const ref = typeof usage?.ref === 'string' ? usage.ref.trim() : '';
    const note = typeof usage?.note === 'string' ? usage.note.trim() : '';
    const itemWhere = `${where}[${index}]`;

    if (!ref) errors.push(`${itemWhere}: ref 누락`);
    if (!note) errors.push(`${itemWhere}: note 누락`);
    if (note.length > 40) errors.push(`${itemWhere}: note ${note.length}자 (40자 이하 요구)`);
    if (/[“”"']/.test(note)) errors.push(`${itemWhere}: 직접 인용으로 오인될 수 있는 따옴표 사용`);

    if (ref) {
      if (seenRefs.has(ref)) errors.push(`${where}: 동일 ref 중복 (${ref})`);
      seenRefs.add(ref);
    }
  });
}

console.log(
  `정경 용례지도 완전성 verifier · 개념 ${conceptKeys.length} · 용례지도 키 ${usageKeys.length} · 누락 ${missingUsageKeys.length} · 고아 ${orphanUsageKeys.length} · 오류 ${errors.length}`,
);

if (errors.length) {
  console.log(`✗ 정경 용례지도 완전성 오류 ${errors.length}건:`);
  errors.slice(0, 100).forEach((message) => console.log(`   - ${message}`));
  process.exit(1);
}

console.log('✓ 정경 개념 ↔ 용례지도 완전성 통과');
