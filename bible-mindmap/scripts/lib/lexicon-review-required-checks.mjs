import { fileURLToPath } from 'node:url'

// Single source of truth for the Lexicon v4 Review Coordinator's required-check
// set on a per-PR basis. UNIVERSAL_REQUIRED_CHECKS run on every lexicon-eligible
// PR. SCOPE_SPECIFIC_REQUIRED_CHECKS attach an additional required check only
// when the PR touches paths inside the corresponding scope, so that a check
// which is by design skipped (its own workflow path filter did not match) is
// never counted as "missing" and never blocks review coordination for PRs
// outside its scope.
//
// The path patterns for a scope must mirror the same pathspecs used by the
// scope's underlying workflow (`.github/workflows/<scope>.yml`). Keep the two
// lists in sync when the workflow's path filter changes.

export const UNIVERSAL_REQUIRED_CHECKS = Object.freeze([
  'v4 foundation contract',
  'v4 consensus gate self-test',
  'v4 universal registry regression',
  'v4 golden audit sample contract',
  'v4 auto-merge decision dry-run',
  'verify-and-build',
  'security-audit',
  'verify-resume-checkpoint',
  'fingerprint',
])

const GENESIS_P5_SCOPE_PATHS = Object.freeze([
  '.github/workflows/genesis-p5-candidate-inputs.yml',
  'bible-mindmap/scripts/build-genesis-p5-candidate-inputs.mjs',
  'bible-mindmap/scripts/verify-genesis-p5-candidate-inputs.mjs',
  'bible-mindmap/scripts/verify-genesis-p5-gpt-candidates.mjs',
  'bible-mindmap/scripts/build-genesis-p5-claude-audit-bundle.mjs',
  'bible-mindmap/scripts/verify-genesis-p5-claude-audit-bundle.mjs',
  'bible-mindmap/data/lexicon/schemas/TranslationRecord.schema.json',
  'bible-mindmap/scripts/build-genesis-p5-evidence-readiness.mjs',
  'bible-mindmap/scripts/build-genesis-p5-gold-set.mjs',
  'bible-mindmap/scripts/build-openscriptures-bdb-adapter.mjs',
  'bible-mindmap/data/lexicon/source-registry.json',
  'bible-mindmap/data/lexicon/source-driver-policy.json',
  'bible-mindmap/data/lexicon/approval-registry.json',
  'memory/RESUME.json',
])

const GENESIS_P5_SCOPE_PREFIXES = Object.freeze([
  'bible-mindmap/data/lexicon/candidates/genesis-p5/',
  'docs/lexicon-workflow/',
])

export const SCOPE_SPECIFIC_REQUIRED_CHECKS = Object.freeze({
  'genesis-p5-gpt-candidates': Object.freeze({
    checkName: 'verify-gpt-candidates',
    workflowFile: '.github/workflows/genesis-p5-candidate-inputs.yml',
    exactPaths: GENESIS_P5_SCOPE_PATHS,
    prefixPaths: GENESIS_P5_SCOPE_PREFIXES,
  }),
})

function isFileInScope(filePath, scope) {
  if (scope.exactPaths.some((p) => p === filePath)) return true
  return scope.prefixPaths.some((prefix) => filePath.startsWith(prefix))
}

export function requiredCheckNamesForFiles(filePaths) {
  const required = new Set(UNIVERSAL_REQUIRED_CHECKS)
  const paths = Array.isArray(filePaths) ? filePaths : []
  for (const scope of Object.values(SCOPE_SPECIFIC_REQUIRED_CHECKS)) {
    if (paths.some((f) => isFileInScope(f, scope))) {
      required.add(scope.checkName)
    }
  }
  return required
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1) } }
  const luke = requiredCheckNamesForFiles([
    'bible-mindmap/data/lexicon/luke-g0-source-lock.json',
    'bible-mindmap/data/lexicon/luke-g0-rights-packet.json',
  ])
  assert(!luke.has('verify-gpt-candidates'), 'Luke lane PR must NOT require verify-gpt-candidates')
  assert(luke.has('v4 foundation contract'), 'universal check missing')
  const p5 = requiredCheckNamesForFiles(['bible-mindmap/data/lexicon/candidates/genesis-p5/H430/candidate.json'])
  assert(p5.has('verify-gpt-candidates'), 'Genesis P5 candidate change must require verify-gpt-candidates')
  const policy = requiredCheckNamesForFiles(['docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md'])
  assert(policy.has('verify-gpt-candidates'), 'lexicon policy doc change must require verify-gpt-candidates')
  const registry = requiredCheckNamesForFiles(['bible-mindmap/data/lexicon/approval-registry.json'])
  assert(registry.has('verify-gpt-candidates'), 'approval-registry change must require verify-gpt-candidates')
  const resume = requiredCheckNamesForFiles(['memory/RESUME.json'])
  assert(resume.has('verify-gpt-candidates'), 'RESUME.json change must require verify-gpt-candidates (per workflow path filter)')
  const unrelated = requiredCheckNamesForFiles(['bible-mindmap/src/components/App.jsx'])
  assert(!unrelated.has('verify-gpt-candidates'), 'unrelated UI change must NOT require verify-gpt-candidates')
  console.log('✓ lexicon-review-required-checks self-test passed')
}
