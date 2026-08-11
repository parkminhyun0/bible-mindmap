#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))

const schema = readJson('data/lexicon/schemas/ApprovalRegistry.schema.json')
const registry = readJson('data/lexicon/approval-registry.json')
const reviewerTypeEnum = schema?.$defs?.reviewer?.properties?.reviewerType?.enum

assert.deepEqual(
  reviewerTypeEnum,
  ['human', 'evidence-policy'],
  'Approval Registry reviewer provenance must distinguish human approval from v4 Evidence AND-Gate approval',
)

for (const entry of registry.entries || []) {
  assert.ok(
    reviewerTypeEnum.includes(entry.reviewer?.reviewerType),
    `${entry.identity?.canonicalStrong}: unsupported reviewerType`,
  )
  if (entry.reviewer?.reviewerType === 'evidence-policy') {
    assert.equal(
      entry.reviewer.reviewerId,
      'lexicon-v4-evidence-and-gate',
      `${entry.identity?.canonicalStrong}: evidence-policy provenance must use the pinned v4 gate identity`,
    )
  }
}

const h776 = (registry.entries || []).find((entry) => entry.identity?.canonicalStrong === 'H776')
assert.ok(h776, 'H776 golden entry must remain present')
assert.deepEqual(
  h776.reviewer,
  { reviewerId: 'parkminhyun0', reviewerType: 'human' },
  'H776 legacy human approval provenance must not be rewritten by the v4 migration',
)

console.log(`✓ v4 approval provenance contract · reviewerType human|evidence-policy · existing H776 remains human · entries=${registry.entries.length}`)
