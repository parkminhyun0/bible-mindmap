#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import {
  buildLukeG2Preparation,
  buildMarkdown,
} from './build-luke-g2-canary-preparation.mjs'

const ROOT = process.cwd()
const PATHS = {
  inventory: resolve(ROOT, 'data/lexicon/luke-g0-inventory.json'),
  manifest: resolve(ROOT, 'data/lexicon/luke-g1-manifest.json'),
  lock: resolve(ROOT, 'data/lexicon/luke-g0-source-lock.json'),
  packets: resolve(ROOT, 'data/lexicon/luke-g2-canary-preparation.json'),
  gate: resolve(ROOT, 'data/lexicon/luke-g2-execution-gate.json'),
  report: resolve(ROOT, 'data/lexicon/luke-g2-report.json'),
  doc: resolve(ROOT, 'docs/luke-g2-canary-preparation.md'),
}

async function downloadGitBlob(source) {
  if (!source?.repository || !source?.blobSha) throw new Error('repository/blobSha 고정값이 필요합니다.')
  const url = `https://api.github.com/repos/${source.repository}/git/blobs/${source.blobSha}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'bible-mindmap-luke-g2-materializer',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) throw new Error(`${source.repository} blob 다운로드 실패: HTTP ${response.status}`)
  const payload = await response.json()
  if (payload.sha !== source.blobSha || payload.encoding !== 'base64' || !payload.content) {
    throw new Error(`${source.repository} blob 응답 검증 실패`)
  }
  return Buffer.from(payload.content.replace(/\s+/gu, ''), 'base64').toString('utf8')
}

async function main() {
  const inventory = JSON.parse(readFileSync(PATHS.inventory, 'utf8'))
  const manifest = JSON.parse(readFileSync(PATHS.manifest, 'utf8'))
  const sourceLock = JSON.parse(readFileSync(PATHS.lock, 'utf8'))
  const [tagntContent, morphgntContent] = await Promise.all([
    downloadGitBlob(sourceLock.sources.tagnt),
    downloadGitBlob(sourceLock.sources.morphgnt),
  ])
  const { preparation, gate, report } = buildLukeG2Preparation({
    inventory,
    manifest,
    sourceLock,
    tagntContent,
    morphgntContent,
  })
  const doc = buildMarkdown(preparation, gate, report)
  for (const path of [PATHS.packets, PATHS.gate, PATHS.report, PATHS.doc]) mkdirSync(dirname(path), { recursive: true })
  writeFileSync(PATHS.packets, `${JSON.stringify(preparation, null, 2)}\n`, 'utf8')
  writeFileSync(PATHS.gate, `${JSON.stringify(gate, null, 2)}\n`, 'utf8')
  writeFileSync(PATHS.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  writeFileSync(PATHS.doc, doc, 'utf8')
  console.log('Luke G2 pinned-source materialization')
  console.log(`  selected: ${preparation.counts.selected}`)
  console.log(`  ready: ${preparation.counts.ready}`)
  console.log(`  representative contexts: ${preparation.counts.representativeContexts}`)
  console.log(`  pass: ${report.pass}`)
  console.log('  provider calls: 0')
  console.log('  local model calls: 0')
  console.log('  production writes: 0')
}

await main()
