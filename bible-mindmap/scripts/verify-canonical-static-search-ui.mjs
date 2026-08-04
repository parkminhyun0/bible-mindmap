import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry = fs.readFileSync(new URL('../src/components/CanonicalConceptStaticSearchEntry.jsx', import.meta.url), 'utf8');
const launcher = fs.readFileSync(new URL('../src/components/CanonicalConceptLauncher.jsx', import.meta.url), 'utf8');

assert.match(entry, /searchCanonicalConceptsStatic/);
assert.match(entry, /서버·AI 호출 없이 브라우저에서 검색합니다/);
assert.match(entry, /CanonicalConceptModal initialConcept=\{selected\}/);
assert.match(entry, /한글·히브리어·헬라어·Strong·정경 흐름·신학 앵커 검색/);
assert.doesNotMatch(entry, /fetch\s*\(/);
assert.doesNotMatch(entry, /Authorization/i);
assert.doesNotMatch(entry, /NVIDIA_API_KEY/);
assert.match(launcher, /CanonicalConceptStaticSearchEntry/);
assert.match(launcher, /일반 사용자 검색은 .*정적 로컬 검색만 사용한다/);

console.log(JSON.stringify({
  status: 'passed',
  stage: 'P1-2e-b',
  runtimeApiCalls: false,
  serverRequired: false,
  browserSecretRequired: false,
  preservesExistingDetailModal: true,
}, null, 2));
