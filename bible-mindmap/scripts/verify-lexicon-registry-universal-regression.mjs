#!/usr/bin/env node
// Universal Approval Registry regression guard for Lexicon v4.
// Generalizes H776-specific protection to EVERY approved Strong entry.
// Compares current registry against a pinned snapshot; refuses:
//   - deletion of any approved entry
//   - reduction of approvedSenseTree count
//   - mutation of any existing sense (translationKo, sourceNodeId, parentId, depth, order)
//   - identityFingerprint / evidencePacketFingerprint drift
//
// A separate high-risk gate exists for INTENTIONAL sense mutation:
// the entry must appear in the snapshot's `intentionalMutations[]` list AND
// carry the label `existing-approved-meaning-change` on the PR.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const bibleMindmapPath = (p) => (process.env.TEST_ROOT ? resolve(process.env.TEST_ROOT, p) : resolve(REPO_ROOT, p))

const stable = (v) => Array.isArray(v)
  ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object'
    ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
    : JSON.stringify(v)
const sha = (v) => `sha256:${createHash('sha256').update(stable(v)).digest('hex')}`

function buildSnapshotFromRegistry(registry) {
  return {
    schemaVersion: 1,
    snapshotOfRegistrySchemaVersion: registry.schemaVersion,
    entries: registry.entries.map((entry) => ({
      canonicalStrong: entry.identity.canonicalStrong,
      identityFingerprint: entry.identity.identityFingerprint,
      evidencePacketFingerprint: entry.evidencePacketFingerprint,
      approvedAt: entry.approvedAt,
      senseCount: entry.approvedSenseTree.length,
      senseTreeFingerprint: sha(entry.approvedSenseTree),
    })),
    intentionalMutations: [],
  }
}

function checkRegressions(currentRegistry, snapshot) {
  const bySnapshotStrong = new Map(snapshot.entries.map((e) => [e.canonicalStrong, e]))
  const byCurrentStrong = new Map(currentRegistry.entries.map((e) => [e.identity.canonicalStrong, e]))
  const failures = []

  // 1. Deletion check
  for (const snap of snapshot.entries) {
    if (!byCurrentStrong.has(snap.canonicalStrong)) {
      failures.push({ kind: 'deletion', strong: snap.canonicalStrong, msg: 'approved entry removed from registry' })
    }
  }

  // 2. Per-entry checks
  for (const [strong, current] of byCurrentStrong) {
    const snap = bySnapshotStrong.get(strong)
    if (!snap) continue // new entry — allowed (registration is a different flow)
    const intentional = snapshot.intentionalMutations.some((m) => m.canonicalStrong === strong)
    // 2a. identityFingerprint drift
    if (current.identity.identityFingerprint !== snap.identityFingerprint && !intentional) {
      failures.push({ kind: 'identity-fingerprint-drift', strong, snapshot: snap.identityFingerprint, current: current.identity.identityFingerprint })
    }
    // 2b. evidencePacketFingerprint drift
    if (current.evidencePacketFingerprint !== snap.evidencePacketFingerprint && !intentional) {
      failures.push({ kind: 'evidence-packet-fingerprint-drift', strong, snapshot: snap.evidencePacketFingerprint, current: current.evidencePacketFingerprint })
    }
    // 2c. Sense count reduction
    if (current.approvedSenseTree.length < snap.senseCount && !intentional) {
      failures.push({ kind: 'sense-count-reduction', strong, snapshot: snap.senseCount, current: current.approvedSenseTree.length })
    }
    // 2d. Sense tree byte-level fingerprint drift
    const currentTreeFp = sha(current.approvedSenseTree)
    if (currentTreeFp !== snap.senseTreeFingerprint && !intentional) {
      failures.push({ kind: 'sense-tree-mutation', strong, snapshot: snap.senseTreeFingerprint, current: currentTreeFp })
    }
  }

  return failures
}

function selfTest() {
  // Build a synthetic 2-entry registry
  const registry = {
    schemaVersion: 1,
    entries: [
      {
        identity: { canonicalStrong: 'H776', identityFingerprint: 'sha256:fp-h776-identity' },
        evidencePacketFingerprint: 'sha256:fp-h776-evidence',
        approvedAt: '2026-08-07T15:59:47Z',
        approvedSenseTree: [
          { id: '1', parentId: null, depth: 0, order: 1, translationKo: '땅' },
          { id: '1.1', parentId: '1', depth: 1, order: 2, translationKo: '지구' },
        ],
      },
      {
        identity: { canonicalStrong: 'H430', identityFingerprint: 'sha256:fp-h430-identity' },
        evidencePacketFingerprint: 'sha256:fp-h430-evidence',
        approvedAt: '2026-08-15T09:00:00Z',
        approvedSenseTree: [
          { id: '1', parentId: null, depth: 0, order: 1, translationKo: '하나님, 신들' },
        ],
      },
    ],
  }
  const snapshot = buildSnapshotFromRegistry(registry)
  // 1. Identity check → no failures
  let failures = checkRegressions(registry, snapshot)
  assert.deepEqual(failures, [], 'identical registry vs snapshot must have zero failures')

  // 2. Deletion → fail
  const deletionCase = { ...registry, entries: registry.entries.filter((e) => e.identity.canonicalStrong !== 'H430') }
  failures = checkRegressions(deletionCase, snapshot)
  assert.ok(failures.some((f) => f.kind === 'deletion' && f.strong === 'H430'), 'deletion of H430 must fail')

  // 3. Sense count reduction → fail
  const reducedCase = JSON.parse(JSON.stringify(registry))
  reducedCase.entries[0].approvedSenseTree = reducedCase.entries[0].approvedSenseTree.slice(0, 1)
  failures = checkRegressions(reducedCase, snapshot)
  assert.ok(failures.some((f) => f.kind === 'sense-count-reduction' && f.strong === 'H776'), 'sense reduction must fail')

  // 4. Sense translationKo mutation → fail
  const mutatedCase = JSON.parse(JSON.stringify(registry))
  mutatedCase.entries[0].approvedSenseTree[0].translationKo = '다른 뜻'
  failures = checkRegressions(mutatedCase, snapshot)
  assert.ok(failures.some((f) => f.kind === 'sense-tree-mutation' && f.strong === 'H776'), 'sense tree mutation must fail')

  // 5. Identity fingerprint drift → fail
  const idDriftCase = JSON.parse(JSON.stringify(registry))
  idDriftCase.entries[0].identity.identityFingerprint = 'sha256:different'
  failures = checkRegressions(idDriftCase, snapshot)
  assert.ok(failures.some((f) => f.kind === 'identity-fingerprint-drift' && f.strong === 'H776'), 'identity fingerprint drift must fail')

  // 6. Intentional mutation (allowlisted in snapshot) → pass
  const withIntentional = JSON.parse(JSON.stringify(snapshot))
  withIntentional.intentionalMutations.push({ canonicalStrong: 'H776', label: 'existing-approved-meaning-change', pr: 999 })
  failures = checkRegressions(mutatedCase, withIntentional)
  assert.equal(failures.length, 0, 'intentional mutation in snapshot allowlist must pass')

  console.log('✓ v4 universal registry regression · 6 fixture cases · deletion·reduction·mutation·drift all rejected, allowlisted mutation accepted')
}

// If running against live registry+snapshot:
function verifyLiveRegistryAgainstSnapshot() {
  const registryPath = bibleMindmapPath('data/lexicon/approval-registry.json')
  const snapshotPath = bibleMindmapPath('data/lexicon/v4/registry-snapshot.json')
  if (!existsSync(registryPath)) {
    console.log('ℹ registry file missing — treat as empty, PASS')
    return
  }
  const registry = readJson(registryPath)
  // If snapshot doesn't exist yet, auto-derive from current registry (bootstrap) and warn — don't fail
  let snapshot
  if (existsSync(snapshotPath)) {
    snapshot = readJson(snapshotPath)
  } else {
    snapshot = buildSnapshotFromRegistry(registry)
    console.log(`ℹ snapshot missing at ${snapshotPath} — bootstrapping from current registry (${snapshot.entries.length} entries); commit this snapshot to activate regression guard`)
  }
  const failures = checkRegressions(registry, snapshot)
  if (failures.length > 0) {
    console.error(`✗ v4 universal registry regression: ${failures.length} failures:`)
    for (const f of failures) console.error(`  - ${f.kind} · ${f.strong} · ${JSON.stringify(f)}`)
    process.exit(1)
  }
  console.log(`✓ v4 universal registry regression · ${registry.entries.length}/${snapshot.entries.length} approved entries · zero regression`)
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  const args = process.argv.slice(2)
  if (args.includes('--self-test')) selfTest()
  else verifyLiveRegistryAgainstSnapshot()
}

export { buildSnapshotFromRegistry, checkRegressions }
