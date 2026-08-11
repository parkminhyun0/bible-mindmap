#!/usr/bin/env node
// safe-auto-merge.yml 의 v4 governance guard 회귀 테스트.
// 워크플로 내 인라인 스크립트가 사용하는 판정 (V4_LABEL / isLexiconScope) 은
// 여기에서도 동일하게 import 해 실제 실행 논리와 계약이 일치함을 보장한다.

import assert from 'node:assert/strict'
import { V4_LABEL, isLexiconScope } from '../lib/v4-auto-merge-decision.mjs'

// Guard 함수 재현: safe-auto-merge.yml 인라인 로직과 동치.
function shouldBlockGenericMerge(labels, filenames) {
  const labelSet = new Set(labels)
  const v4ScopeFiles = filenames.filter((filename) => isLexiconScope(filename))
  return labelSet.has(V4_LABEL) || v4ScopeFiles.length > 0
}

// Case A · non-v4 chatgpt/* PR — Safe Auto Merge behavior 유지
assert.equal(
  shouldBlockGenericMerge([], [
    'bible-mindmap/src/components/SavePanel.jsx',
    'bible-mindmap/src/utils/parallelDiff.js',
  ]),
  false,
  'Case A: non-v4 UI change 는 generic lane 이 처리해야 한다',
)

// Case B · v4 label 만 붙은 PR (파일은 v4 스코프 밖) — generic lane block
assert.equal(
  shouldBlockGenericMerge([V4_LABEL], [
    'bible-mindmap/src/components/SavePanel.jsx',
  ]),
  true,
  'Case B: v4 label 이 붙었으면 generic lane 은 fail-closed',
)

// Case C · v4 scope 파일 (label 없음) — generic lane block
assert.equal(
  shouldBlockGenericMerge([], [
    'bible-mindmap/data/lexicon/approval-registry.json',
  ]),
  true,
  'Case C: v4 스코프 파일이면 라벨 없어도 generic lane 은 fail-closed',
)

// Case C2 · v4 스코프 각 prefix 검증
for (const filename of [
  'bible-mindmap/data/lexicon/whatever.json',
  'bible-mindmap/reports/genesis-anything.json',
  'docs/lexicon-workflow/policy.md',
  'bible-mindmap/scripts/verify-lexicon-x.mjs',
  'bible-mindmap/scripts/verify-golden-audit-y.mjs',
  'bible-mindmap/scripts/lib/v4-decision.mjs',
  'bible-mindmap/scripts/tests/v4-x.mjs',
  '.github/workflows/lexicon-v4-anything.yml',
  'memory/RESUME.json',
]) {
  assert.equal(
    shouldBlockGenericMerge([], [filename]),
    true,
    `Case C2: v4 스코프 파일 ${filename} 도 fail-closed`,
  )
}

// Case E · sensitive non-v4 PR + auto-merge-approved — v4 guard 는 통과 (기존 sensitive 흐름 진입)
assert.equal(
  shouldBlockGenericMerge(['auto-merge-approved'], [
    '.github/workflows/some-other.yml',
  ]),
  false,
  'Case E: v4 스코프가 아닌 sensitive 파일은 v4 guard 통과 (기존 sensitive 정책이 처리)',
)

// Case · v4 label + v4 스코프 동시 — 당연히 block
assert.equal(
  shouldBlockGenericMerge([V4_LABEL], [
    'bible-mindmap/data/lexicon/approval-registry.json',
  ]),
  true,
  'v4 label + v4 스코프 동시도 block',
)

// Case · 완전히 무관한 파일만 — 통과
assert.equal(
  shouldBlockGenericMerge([], [
    'README.md',
    'bible-mindmap/index.html',
  ]),
  false,
  '완전히 무관한 파일은 통과',
)

console.log('✓ safe-auto-merge v4 governance guard 회귀 테스트 통과')
