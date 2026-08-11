#!/usr/bin/env node

import assert from 'node:assert/strict'
import {
  deriveLegacyAllowedUses,
  normalizeRegistry,
  normalizeSource,
} from '../lib/source-registry-adapter.mjs'

function v12Source(overrides = {}) {
  const source = {
    sourceId: 'fixture-source',
    role: 'secondary-control',
    license: {
      status: 'approved',
      expression: 'fixture-license',
      licenseUrl: 'https://example.invalid/license',
      attributionRequired: false,
      attributionText: null,
      changeNoticeRequired: false,
      derivativeAllowed: false,
      redistributionAllowed: false,
      externalLlmInputAllowed: false,
      fullTextStorageAllowed: false,
    },
    provenance: {
      repositoryUrl: 'https://github.com/example/fixture',
      datasetPaths: ['fixture.txt'],
      version: '0123456789012345678901234567890123456789',
    },
    workflow: {
      autoProcessingAllowed: true,
    },
  }
  return {
    ...source,
    ...overrides,
    license: { ...source.license, ...(overrides.license ?? {}) },
    provenance: { ...source.provenance, ...(overrides.provenance ?? {}) },
    workflow: { ...source.workflow, ...(overrides.workflow ?? {}) },
  }
}

// approved BDB: historical G2의 명시적 download/parse 호환 + 직접 permission boolean만 투영.
{
  const source = v12Source({
    sourceId: 'openscriptures-hebrewlexicon-bdb',
    role: 'primary-full-definition-source',
    license: {
      derivativeAllowed: true,
      redistributionAllowed: true,
      externalLlmInputAllowed: true,
      fullTextStorageAllowed: true,
    },
  })
  assert.deepEqual(new Set(deriveLegacyAllowedUses(source)), new Set([
    'download',
    'parse',
    'ai-input',
    'derived-translation',
    'redistribute',
    'full-text-storage',
  ]))
  const normalized = normalizeSource(source)
  assert.equal(normalized.licenseStatus, 'verified-public-or-permitted')
  assert.equal(normalized.role, 'primary-source')
}

// internal-review-only: license URL이 있어도 어떠한 legacy authorization도 생기면 안 된다.
{
  const source = v12Source({
    sourceId: 'openscriptures-hebrewlexicon-bdb',
    license: { status: 'internal-review-only' },
    workflow: { autoProcessingAllowed: false },
  })
  assert.deepEqual(deriveLegacyAllowedUses(source), [])
  const normalized = normalizeSource(source)
  assert.equal(normalized.licenseStatus, 'internal-validation-only')
  assert.deepEqual(normalized.allowedUses, [])
}

// metadata-only: 알려진 상태로 보존하되 content-processing permission은 0개다.
{
  const source = v12Source({
    sourceId: 'metadata-catalog',
    license: { status: 'metadata-only' },
    workflow: { autoProcessingAllowed: false },
  })
  const normalized = normalizeSource(source)
  assert.equal(normalized.licenseStatus, 'metadata-only')
  assert.deepEqual(normalized.allowedUses, [])
}

// prohibited: boolean이 잘못 true여도 status gate가 우선하며 fail closed.
{
  const source = v12Source({
    sourceId: 'openscriptures-hebrewlexicon-bdb',
    license: {
      status: 'prohibited',
      derivativeAllowed: true,
      redistributionAllowed: true,
      externalLlmInputAllowed: true,
      fullTextStorageAllowed: true,
    },
  })
  assert.deepEqual(deriveLegacyAllowedUses(source), [])
  assert.equal(normalizeSource(source).licenseStatus, 'prohibited')
}

// licenseUrl alone is provenance, not download authorization.
{
  const source = v12Source({ sourceId: 'approved-with-license-url-only' })
  assert.ok(source.license.licenseUrl)
  assert.deepEqual(deriveLegacyAllowedUses(source), [])
}

// Generic approved source: direct booleans may project their matching legacy uses,
// but download/parse are never inferred without an explicit source compatibility rule.
{
  const source = v12Source({
    sourceId: 'approved-generic-source',
    license: {
      externalLlmInputAllowed: true,
      derivativeAllowed: true,
    },
  })
  assert.deepEqual(new Set(deriveLegacyAllowedUses(source)), new Set([
    'ai-input',
    'derived-translation',
  ]))
  assert.equal(deriveLegacyAllowedUses(source).includes('download'), false)
  assert.equal(deriveLegacyAllowedUses(source).includes('parse'), false)
}

// Flat legacy fixtures remain identity-compatible; this adapter must not rewrite their policy.
{
  const flat = {
    id: 'legacy-flat',
    role: 'primary-source',
    licenseStatus: 'verified-public-or-permitted',
    allowedUses: ['download', 'parse'],
    files: ['fixture.xml'],
  }
  assert.deepEqual(normalizeSource(flat), {
    ...flat,
    repository: null,
    versionRef: null,
    attribution: null,
  })
}

// Registry wrapper keeps registry-level policy metadata intact.
{
  const registry = normalizeRegistry({
    schemaVersion: 1,
    policyVersion: '1.2',
    sources: [v12Source({ sourceId: 'metadata-catalog', license: { status: 'metadata-only' } })],
  })
  assert.equal(registry.policyVersion, '1.2')
  assert.equal(registry.sources[0].licenseStatus, 'metadata-only')
}

console.log('✓ source registry legacy adapter policy hardening tests passed')
