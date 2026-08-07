#!/usr/bin/env node
// GPT 배치 통합 검증기 · 자비스 최종 검수 진입 게이트.
//
// [철학] 자비스는 값을 만들지 않고 검증만. GPT 가 계약(docs/gpt-batch-contracts/)
// 대로 낸 배치를 3개 트랙 verifier 로 병렬 실행해 하나라도 실패하면 exit 1.
// prebuild·CI 에 연결되어 계약 위반 배치는 main 진입 불가.
//
// 실행:  node scripts/verify-gpt-batch.mjs
// CI에서는 이 스크립트만 호출하면 3개가 다 검증됨.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TRACKS = [
  { key: 'gloss',      script: 'verify-korean-gloss.mjs',        contract: 'docs/gpt-batch-contracts/gloss.md' },
  { key: 'people',     script: 'verify-biblical-people.mjs',     contract: 'docs/gpt-batch-contracts/people.md' },
  { key: 'alignment',  script: 'verify-translation-alignment.mjs', contract: 'docs/gpt-batch-contracts/alignment.md' },
];

function runTrack({ key, script }) {
  const scriptPath = path.join(ROOT, 'scripts', script);
  const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8', cwd: ROOT });
  return {
    key,
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    status: result.status,
  };
}

const results = TRACKS.map(runTrack);
const failed = results.filter((r) => !r.ok);

console.log('=== GPT 배치 통합 검증 (자비스 게이트) ===');
for (const r of results) {
  const mark = r.ok ? '✓' : '✗';
  const summary = r.ok ? r.stdout.split('\n').pop() : (r.stderr || r.stdout || `exit ${r.status}`);
  console.log(`  ${mark} ${r.key.padEnd(10)} ${summary}`);
}

if (failed.length) {
  console.error(`\n✗ 배치 검증 실패 ${failed.length}건 — main 진입 차단. 상세:`);
  for (const r of failed) {
    console.error(`\n[${r.key}] exit=${r.status}`);
    if (r.stdout) console.error(r.stdout);
    if (r.stderr) console.error(r.stderr);
  }
  process.exit(1);
}

console.log('\n✓ 3트랙 전부 통과 · 자비스 최종 검수 준비 완료');
