// Pure decision function for Lexicon v4 reviewer-scoped auto-merge.
// No I/O. Consumed by:
//   - .github/workflows/lexicon-v4-auto-merge.yml (via dynamic import after checkout)
//   - bible-mindmap/scripts/tests/v4-auto-merge-decision-dry-run.mjs (fixtures)
//
// Corrections vs prior version (defects fixed by this file):
//   1) Scope gate = label AND lexicon-only (both required); prior was OR.
//   2) Registry logic distinguishes NEW entry addition (allowed) from
//      mutation / deletion / drift of existing (HUMAN_EXCEPTION_REQUIRED,
//      never auto). `existing-approved-meaning-change` label is a routing
//      marker only, NEVER an auto-merge authorization.
//   3) Explicit V4_REQUIRED_CHECKS set — missing check = WAIT, pending = WAIT,
//      failed = FAIL_CLOSED. Never silently pass on "no required check found".
//   4) Reviewer state resolution uses latest review per user; approvals on
//      older heads never count.
//   5) Retrieval failures fail-closed (caller signals via retrievalErrors).
//
// Never weaken this file. Any relaxation must be reviewed as v4 policy change.
import { createHash } from 'node:crypto'

export const V4_REVIEWER = 'bible-mindmap-review'
export const V4_LABEL = 'lexicon-v4-auto-merge-eligible'
export const HIGH_RISK_LABEL = 'existing-approved-meaning-change'

export const V4_LEXICON_PATH_PREFIXES = [
  'bible-mindmap/data/lexicon/',
  'bible-mindmap/reports/',
  'docs/lexicon-workflow/',
  'bible-mindmap/scripts/verify-lexicon-',
  'bible-mindmap/scripts/verify-golden-audit-',
  'bible-mindmap/scripts/lib/v4-',
  'bible-mindmap/scripts/tests/v4-',
  '.github/workflows/lexicon-v4-',
]
export const V4_LEXICON_EXACT_FILES = new Set(['memory/RESUME.json'])

// Required check-run names on the current head SHA. Missing / pending → WAIT;
// failure → FAIL_CLOSED. Names must match .github/workflows/*.yml job names.
export const V4_REQUIRED_CHECKS = new Set([
  'v4 foundation contract',
  'v4 consensus gate self-test',
  'v4 universal registry regression',
  'v4 golden audit sample contract',
  'v4 auto-merge decision dry-run',
  'verify-and-build',
  'security-audit',
  'verify-resume-checkpoint',
  'fingerprint',
  'verify-gpt-candidates',
])

// stable canonical serialisation for deterministic byte-level fingerprint
const stable = (v) => Array.isArray(v)
  ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object'
    ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
    : JSON.stringify(v)
export const sha256Sig = (v) => `sha256:${createHash('sha256').update(stable(v)).digest('hex')}`

export function isLexiconScope(filename) {
  if (V4_LEXICON_EXACT_FILES.has(filename)) return true
  return V4_LEXICON_PATH_PREFIXES.some((p) => filename.startsWith(p))
}

/**
 * Diff two Approval Registries.
 * @returns {{additions: {strong:string}[], mutations: {strong:string, kind:string}[], deletions: {strong:string}[], drifts: {strong:string, kind:string}[]}}
 */
export function diffApprovalRegistries(baseRegistry, headRegistry) {
  const bmap = new Map((baseRegistry?.entries || []).map((e) => [e.identity.canonicalStrong, e]))
  const hmap = new Map((headRegistry?.entries || []).map((e) => [e.identity.canonicalStrong, e]))
  const additions = [], mutations = [], deletions = [], drifts = []
  for (const [strong, base] of bmap) {
    const head = hmap.get(strong)
    if (!head) { deletions.push({ strong }); continue }
    if (head.identity.identityFingerprint !== base.identity.identityFingerprint) {
      drifts.push({ strong, kind: 'identity-fingerprint-drift' })
    }
    if (head.evidencePacketFingerprint !== base.evidencePacketFingerprint) {
      drifts.push({ strong, kind: 'evidence-packet-fingerprint-drift' })
    }
    if ((head.approvedSenseTree?.length || 0) < (base.approvedSenseTree?.length || 0)) {
      mutations.push({ strong, kind: 'sense-count-reduction' })
    } else {
      const baseFp = sha256Sig(base.approvedSenseTree || [])
      const headFp = sha256Sig(head.approvedSenseTree || [])
      if (baseFp !== headFp) mutations.push({ strong, kind: 'sense-tree-mutation' })
    }
  }
  for (const [strong] of hmap) {
    if (!bmap.has(strong)) additions.push({ strong })
  }
  return { additions, mutations, deletions, drifts }
}

/**
 * Decide auto-merge action from resolved GitHub state.
 * Callers must resolve `currentHeadSha` freshly from the API — never trust stale event payloads.
 *
 * @param {Object} input
 * @param {Object} input.pr — PR object (labels[], state, draft, head.repo.full_name, base.repo.full_name)
 * @param {string} input.currentHeadSha — FRESH head SHA from API
 * @param {string[]} input.filenames — all files changed in PR
 * @param {Array<{user:{login:string}, state:string, commit_id:string, submitted_at:string}>} input.reviewsAll — chronological reviews from listReviews
 * @param {number} input.reviewThreadsUnresolved — count of non-resolved, non-outdated review threads
 * @param {Map<string,{status:string, conclusion:string|null}>} input.requiredCheckStatuses — check-run name → status
 * @param {ReturnType<typeof diffApprovalRegistries>|null} input.registryDiff — null when registry unchanged
 * @param {string|null} input.mergeableState — mergeable_state from PR API
 * @param {string[]} [input.retrievalErrors] — non-empty if any API fetch failed
 * @returns {{verdict:'AUTO_MERGE'|'WAIT'|'DECLINE'|'FAIL_CLOSED', reason:string}}
 */
export function decideAutoMerge(input) {
  const { pr, currentHeadSha, filenames, reviewsAll, reviewThreadsUnresolved, requiredCheckStatuses, registryDiff, mergeableState, retrievalErrors } = input

  if (retrievalErrors && retrievalErrors.length > 0) {
    return { verdict: 'FAIL_CLOSED', reason: `retrieval error: ${retrievalErrors.join('; ')}` }
  }

  // Gate 0: PR baseline
  if (pr.state !== 'open') return { verdict: 'DECLINE', reason: `pr.state=${pr.state}` }
  if (pr.draft) return { verdict: 'DECLINE', reason: 'pr.draft' }
  if (pr.head.repo.full_name !== pr.base.repo.full_name) {
    return { verdict: 'FAIL_CLOSED', reason: 'fork PR' }
  }

  // Gate 1: scope = LABEL AND lexicon-only (both required, no OR)
  const labels = new Set((pr.labels || []).map((l) => l.name))
  if (!labels.has(V4_LABEL)) return { verdict: 'DECLINE', reason: `missing label ${V4_LABEL}` }
  if (!filenames || filenames.length === 0) return { verdict: 'DECLINE', reason: 'no files changed' }
  const nonLexicon = filenames.filter((f) => !isLexiconScope(f))
  if (nonLexicon.length > 0) {
    return { verdict: 'FAIL_CLOSED', reason: `non-lexicon files present (${nonLexicon.slice(0, 3).join(', ')}); label ${V4_LABEL} does NOT authorize non-lexicon auto-merge` }
  }

  // Gate 2: exact-head APPROVED review by V4_REVIEWER
  //   Compute LATEST review per user (chronological order from API).
  const latestByUser = new Map()
  for (const r of reviewsAll || []) latestByUser.set(r.user.login, r)
  const v4Review = latestByUser.get(V4_REVIEWER)
  if (!v4Review) return { verdict: 'WAIT', reason: `no review from ${V4_REVIEWER} yet` }
  if (v4Review.state !== 'APPROVED') {
    return { verdict: v4Review.state === 'CHANGES_REQUESTED' ? 'FAIL_CLOSED' : 'WAIT',
             reason: `${V4_REVIEWER} latest review=${v4Review.state}` }
  }
  if (v4Review.commit_id !== currentHeadSha) {
    return { verdict: 'WAIT', reason: `${V4_REVIEWER} APPROVED on ${v4Review.commit_id} != current head ${currentHeadSha}; need re-review` }
  }

  // Gate 3: no CHANGES_REQUESTED from any user at latest state
  for (const [user, r] of latestByUser) {
    if (r.state === 'CHANGES_REQUESTED') return { verdict: 'FAIL_CLOSED', reason: `${user} requested changes` }
  }

  // Gate 4: unresolved review threads
  if (reviewThreadsUnresolved == null) {
    return { verdict: 'FAIL_CLOSED', reason: 'review-thread state not retrieved; fail-closed per v4 §4' }
  }
  if (reviewThreadsUnresolved > 0) {
    return { verdict: 'FAIL_CLOSED', reason: `unresolved review threads=${reviewThreadsUnresolved}` }
  }

  // Gate 5: registry mutation is HUMAN_EXCEPTION_REQUIRED (never auto), regardless of label
  if (registryDiff) {
    const mut = registryDiff.mutations.length + registryDiff.deletions.length + registryDiff.drifts.length
    if (mut > 0) {
      const detail = [
        registryDiff.mutations.map((m) => `mutation:${m.strong}:${m.kind}`).join(','),
        registryDiff.deletions.map((d) => `deletion:${d.strong}`).join(','),
        registryDiff.drifts.map((d) => `drift:${d.strong}:${d.kind}`).join(','),
      ].filter(Boolean).join(' | ')
      return {
        verdict: 'FAIL_CLOSED',
        reason: `HUMAN_EXCEPTION_REQUIRED: ${detail}. Label ${HIGH_RISK_LABEL} is a routing marker only and NEVER authorizes auto-merge.`,
      }
    }
    // pure additions are allowed to auto-proceed if other gates satisfied
  }

  // Gate 6: required check-runs — explicit set, missing = WAIT, pending = WAIT, failed = FAIL_CLOSED
  for (const name of V4_REQUIRED_CHECKS) {
    const s = requiredCheckStatuses?.get(name)
    if (!s) return { verdict: 'WAIT', reason: `required check missing: ${name}` }
    if (s.status !== 'completed') return { verdict: 'WAIT', reason: `required check pending: ${name} (status=${s.status})` }
    if (!['success', 'skipped', 'neutral'].includes(s.conclusion)) {
      return { verdict: 'FAIL_CLOSED', reason: `required check failed: ${name} conclusion=${s.conclusion}` }
    }
  }

  // Gate 7: mergeable
  if (mergeableState && ['dirty', 'blocked', 'behind', 'unknown'].includes(mergeableState)) {
    return { verdict: 'WAIT', reason: `mergeable_state=${mergeableState}` }
  }

  return { verdict: 'AUTO_MERGE', reason: 'all v4 gates passed' }
}
