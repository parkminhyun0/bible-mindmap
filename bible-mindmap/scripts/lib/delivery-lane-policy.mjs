export const ORDINARY_AUTO_LANE = 'ordinary-auto'
export const LEXICON_APPROVAL_LANE = 'lexicon-human-approval'
export const SYSTEM_MANUAL_LANE = 'system-manual'
export const DEFAULT_LEXICON_REVIEWER = 'bible-mindmap-review'

const LEXICON_APPROVAL_EXACT_FILES = new Set([
  'bible-mindmap/data/lexicon/approval-registry.json',
  'docs/lexicon-workflow/TRACK_STATE.json',
  'docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md',
  'bible-mindmap/data/lexicon/full-fidelity/golden-audit-contract-v2.json',
  'bible-mindmap/data/lexicon/full-fidelity/governance-exception-triggers-v2.json',
  'bible-mindmap/data/lexicon/full-fidelity/tier-gate-matrix-v2.json',
  'bible-mindmap/data/lexicon/v4/registry-snapshot.json',
  'bible-mindmap/scripts/lib/v4-auto-merge-decision.mjs',
])

const LEXICON_APPROVAL_PREFIXES = [
  'bible-mindmap/data/lexicon/schemas/',
]

const LEXICON_APPROVAL_PATTERNS = [
  /(^|\/)golden(?:-|\/|_)/i,
  /(^|\/)gold-set(?:-|\/|_)/i,
  /registry-promotion/i,
  /approval-registry/i,
  /approved-meaning/i,
  /governance-exception/i,
]

const SYSTEM_MANUAL_EXACT_FILES = new Set([
  'AGENTS.md',
  'bible-mindmap/scripts/lib/delivery-lane-policy.mjs',
  'bible-mindmap/scripts/verify-workflow-security.mjs',
])

const SYSTEM_MANUAL_PREFIXES = [
  '.github/workflows/',
]

export function isLexiconApprovalSensitivePath(filename) {
  const value = String(filename || '').trim()
  if (!value) return false
  if (LEXICON_APPROVAL_EXACT_FILES.has(value)) return true
  if (LEXICON_APPROVAL_PREFIXES.some((prefix) => value.startsWith(prefix))) return true
  return LEXICON_APPROVAL_PATTERNS.some((pattern) => pattern.test(value))
}

export function isSystemManualPath(filename) {
  const value = String(filename || '').trim()
  if (!value) return false
  if (SYSTEM_MANUAL_EXACT_FILES.has(value)) return true
  return SYSTEM_MANUAL_PREFIXES.some((prefix) => value.startsWith(prefix))
}

export function classifyDeliveryLane(filenames = []) {
  const unique = [...new Set((filenames || []).map((filename) => String(filename || '').trim()).filter(Boolean))]
  const lexiconApprovalFiles = unique.filter(isLexiconApprovalSensitivePath)
  const systemManualFiles = unique.filter((filename) => !lexiconApprovalFiles.includes(filename) && isSystemManualPath(filename))
  const lane = lexiconApprovalFiles.length > 0 ? LEXICON_APPROVAL_LANE : systemManualFiles.length > 0 ? SYSTEM_MANUAL_LANE : ORDINARY_AUTO_LANE
  return { lane, lexiconApprovalFiles, systemManualFiles, sensitiveFiles: [...lexiconApprovalFiles, ...systemManualFiles], files: unique }
}

export function latestReviewsByUser(reviews = []) {
  const latest = new Map()
  for (const review of reviews || []) {
    const login = review?.user?.login
    if (!login) continue
    const previous = latest.get(login)
    const previousTime = previous?.submitted_at || ''
    const nextTime = review?.submitted_at || ''
    if (!previous || nextTime >= previousTime) latest.set(login, review)
  }
  return latest
}

export function exactHeadApprovedReviewCandidates({ reviews = [], headSha, authorLogin }) {
  const latest = latestReviewsByUser(reviews)
  return [...latest.entries()].filter(([login, review]) => login !== authorLogin && review?.state === 'APPROVED' && review?.commit_id === headSha).map(([login, review]) => ({ login, review }))
}
