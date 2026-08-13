#!/usr/bin/env node
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const verifier = path.resolve(scriptDir, '../verify-resume-checkpoint.mjs')
const temp = await mkdtemp(path.join(tmpdir(), 'resume-cache-policy-'))

function run({ strict, checkpoint }) {
  const resumePath = path.join(temp, `resume-${strict ? 'strict' : 'cache'}-${Math.random().toString(16).slice(2)}.json`)
  return writeFile(resumePath, `${JSON.stringify(checkpoint)}\n`, 'utf8').then(() => spawnSync(
    process.execPath,
    [verifier],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        RESUME_FILE: resumePath,
        CHECKPOINT_STRICT_RUNTIME: strict ? '1' : '0',
        CHECKPOINT_REQUIRE_REMOTE: '1',
        CHECKPOINT_PR_STATES: JSON.stringify({
          343: {
            state: 'closed',
            merged_at: '2026-08-13T00:53:49Z',
            merge_commit_sha: 'merged-sha',
          },
        }),
        CHECKPOINT_NOW: '2026-08-13T01:00:00Z',
        GITHUB_REPOSITORY: 'parkminhyun0/bible-mindmap',
        GITHUB_SHA: 'different-sha',
      },
    },
  ))
}

try {
  const inherited = {
    v: 1,
    updated: '2026-08-13T00:00:00Z',
    repo: 'parkminhyun0/bible-mindmap',
    task: '완료된 system task · PR #343',
    check: 'GitHub-derived state가 runtime SSOT',
    next: '현재 GitHub 상태에서 다음 작업 결정',
    block: 'none',
    deep: ['AGENTS.md'],
  }

  const cacheResult = await run({ strict: false, checkpoint: inherited })
  assert.equal(cacheResult.status, 0, `inherited cache must not block unrelated PRs: ${cacheResult.stderr}`)
  assert.match(cacheResult.stderr, /종료된 PR #343/)
  assert.match(cacheResult.stdout, /mode=inherited-cache/)

  const strictResult = await run({ strict: true, checkpoint: inherited })
  assert.notEqual(strictResult.status, 0, 'a PR that owns RESUME must fail on a closed active PR reference')
  assert.match(strictResult.stderr, /종료된 PR #343/)

  const malformed = { ...inherited }
  delete malformed.repo
  const malformedResult = await run({ strict: false, checkpoint: malformed })
  assert.notEqual(malformedResult.status, 0, 'cache mode must still fail structural corruption')
  assert.match(malformedResult.stderr, /필수 필드 'repo'/)

  console.log('✓ RESUME cache ownership policy passed · inherited runtime warnings · owned strict state · structural fail-closed')
} finally {
  await rm(temp, { recursive: true, force: true })
}
