// 정경 개념·용례지도 집계 보고서.
// CI 로그와 운영 문서에서 개념 수, 용례 수, 배치별 키 수를 빠르게 확인한다.

import { CANONICAL_CONCEPTS } from '../src/data/canonicalConcepts.js';
import { CANONICAL_USAGE_MAP } from '../src/data/canonicalUsageMap.js';

const conceptKeys = Object.keys(CANONICAL_CONCEPTS || {});
const usageEntries = Object.entries(CANONICAL_USAGE_MAP || {});
const usageCount = usageEntries.reduce((sum, [, usages]) => sum + (Array.isArray(usages) ? usages.length : 0), 0);
const minUsage = Math.min(...usageEntries.map(([, usages]) => usages.length));
const maxUsage = Math.max(...usageEntries.map(([, usages]) => usages.length));

const summary = {
  concepts: conceptKeys.length,
  usageMapKeys: usageEntries.length,
  usages: usageCount,
  minUsagePerConcept: minUsage,
  maxUsagePerConcept: maxUsage,
  complete: conceptKeys.length === usageEntries.length,
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.complete) process.exit(1);
