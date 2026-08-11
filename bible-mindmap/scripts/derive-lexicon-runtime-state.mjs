#!/usr/bin/env node
// GitHub-derived runtime state for the 66-book lexicon track.
// Volatile truth is derived from GitHub on every run; RESUME/TRACK_STATE are checkpoints only.

const API = process.env.GITHUB_API_URL || 'https://api.github.com'
const repo = process.env.GITHUB_REPOSITORY || ''
const token = process.env.GITHUB_TOKEN || ''

export function classifyReviewState({ headSha, reviews = [], primary = 'bible-mindmap-review', fallback = '' }) {
  const allowed = new Set([primary, fallback].filter(Boolean))
  const latest = new Map()
  for (const review of reviews) {
    const login = review?.user?.login || review?.author?.login
    if (login) latest.set(login, review)
  }
  for (const [login, review] of latest) {
    if (!allowed.has(login)) continue
    const state = String(review.state || '').toUpperCase()
    const commit = review.commit_id || review.commitId || null
    if (state === 'CHANGES_REQUESTED') return { state: 'BLOCKED', reviewer: login, commit }
    if (state === 'APPROVED' && commit === headSha) return { state: 'APPROVED', reviewer: login, commit }
  }
  return { state: 'WAITING', reviewer: null, commit: null }
}

function assert(value, message) {
  if (!value) throw new Error(message)
}

function selfTest() {
  const head = 'abc123'
  const exact = classifyReviewState({ headSha: head, reviews: [{ user: { login: 'bible-mindmap-review' }, state: 'APPROVED', commit_id: head }] })
  assert(exact.state === 'APPROVED', 'exact-head approval must pass')
  const stale = classifyReviewState({ headSha: head, reviews: [{ user: { login: 'bible-mindmap-review' }, state: 'APPROVED', commit_id: 'old' }] })
  assert(stale.state === 'WAITING', 'stale approval must not pass')
  const fallback = classifyReviewState({ headSha: head, fallback: 'lexicon-review-fallback', reviews: [{ user: { login: 'lexicon-review-fallback' }, state: 'APPROVED', commit_id: head }] })
  assert(fallback.state === 'APPROVED', 'configured independent fallback approval must pass classification')
  console.log('✓ derive-lexicon-runtime-state self-test')
}

async function gh(path) {
  if (!token) throw new Error('GITHUB_TOKEN is required')
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } })
  if (!res.ok) throw new Error(`GitHub API ${res.status} ${path}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest()
  if (!repo.includes('/')) throw new Error('GITHUB_REPOSITORY owner/repo is required')
  const [owner, name] = repo.split('/')
  const repoInfo = await gh(`/repos/${owner}/${name}`)
  const mainRef = repoInfo.default_branch || 'main'
  const main = await gh(`/repos/${owner}/${name}/commits/${encodeURIComponent(mainRef)}`)
  const pulls = await gh(`/repos/${owner}/${name}/pulls?state=open&per_page=100`)
  const lexicon = pulls.filter((pr) => (pr.labels || []).some((l) => l.name === 'lexicon-v4-auto-merge-eligible'))
  const active = []
  for (const pr of lexicon) {
    const headSha = pr.head.sha
    const [reviews, checks] = await Promise.all([
      gh(`/repos/${owner}/${name}/pulls/${pr.number}/reviews?per_page=100`),
      gh(`/repos/${owner}/${name}/commits/${headSha}/check-runs?per_page=100`),
    ])
    active.push({
      number: pr.number,
      headSha,
      mergeableState: pr.mergeable_state || null,
      review: classifyReviewState({ headSha, reviews, fallback: process.env.LEXICON_FALLBACK_REVIEWER || '' }),
      checks: (checks.check_runs || []).map(({ name, status, conclusion }) => ({ name, status, conclusion })),
    })
  }
  const out = { schemaVersion: 1, derivedAt: new Date().toISOString(), repo, main: { branch: mainRef, sha: main.sha }, activeLexiconPRs: active }
  console.log(JSON.stringify(out, null, 2))
}

main().catch((error) => { console.error(error.stack || error.message); process.exit(1) })
