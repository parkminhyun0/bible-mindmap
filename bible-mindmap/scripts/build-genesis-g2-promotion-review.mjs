#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'

const DEFAULT_EVALUATION = 'reports/genesis-g2-canary-evaluation.json'
const DEFAULT_ROOT = 'reports/genesis-g2-canary-execution'
const DEFAULT_OUTPUT_DIR = 'reports/genesis-g2-promotion-review'
const PROVIDERS = ['nvidia', 'openai']

const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'))
const candidatePath = (root, provider, strong) => resolve(root, 'candidates', provider, `${strong}.json`)
const escapeCell = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')

function parseArgs(argv) {
  const args = { evaluation: DEFAULT_EVALUATION, root: DEFAULT_ROOT, outputDir: DEFAULT_OUTPUT_DIR, selfTest: false }
  for (const arg of argv) {
    if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--evaluation=')) args.evaluation = arg.slice('--evaluation='.length)
    else if (arg.startsWith('--output-root=')) args.root = arg.slice('--output-root='.length)
    else if (arg.startsWith('--output-dir=')) args.outputDir = arg.slice('--output-dir='.length)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function loadCandidates(root, strong) {
  const result = {}
  for (const provider of PROVIDERS) {
    const path = candidatePath(root, provider, strong)
    if (!existsSync(path)) throw new Error(`${strong}:${provider} candidate missing`)
    result[provider] = readJson(path)
  }
  return result
}

function disagreementRows(pair, candidates) {
  const left = candidates.nvidia.payload.nodes
  const right = candidates.openai.payload.nodes
  const scores = new Map(pair.agreement.nodes.map((node) => [node.sourceNodeId, node.score]))
  return left.map((node, index) => ({
    sourceNodeId: node.sourceNodeId,
    score: scores.get(node.sourceNodeId) ?? 0,
    nvidiaTextKo: node.textKo,
    openaiTextKo: right[index]?.textKo || '',
    nvidiaConfidence: node.confidence,
    openaiConfidence: right[index]?.confidence ?? null,
    riskFlags: [...new Set([...(node.riskFlags || []), ...(right[index]?.riskFlags || [])])].sort(),
  })).sort((a, b) => a.score - b.score)
}

export function buildPromotionReview({ evaluation, evaluationDigest, candidatesByStrong }) {
  const items = evaluation.pairs.map((pair) => {
    const candidates = candidatesByStrong[pair.strong]
    return {
      strong: pair.strong,
      role: pair.role,
      status: pair.status,
      warnings: pair.warnings,
      errors: pair.errors,
      agreement: pair.agreement,
      confidence: pair.confidence,
      riskCoverage: pair.riskCoverage,
      usage: pair.usage,
      providers: Object.fromEntries(PROVIDERS.map((provider) => [provider, {
        model: candidates[provider].model,
        requestId: candidates[provider].requestId,
        transliterationKo: candidates[provider].payload.transliterationKo,
        primaryGlossKo: candidates[provider].payload.primaryGlossKo,
        notesKo: candidates[provider].payload.notesKo,
      }])),
      disagreementNodes: disagreementRows(pair, candidates),
    }
  })

  return {
    schemaVersion: 1,
    target: 'genesis-g2-calibration-100',
    generatedAt: new Date().toISOString(),
    evaluationDigest,
    evaluationVersion: evaluation.evaluationVersion,
    promotionStatus: evaluation.promotion.status,
    counts: evaluation.counts,
    metrics: evaluation.metrics,
    gates: evaluation.gates,
    reasons: evaluation.promotion.reasons,
    items,
    governance: {
      humanApprovalRequired: true,
      automaticPromotionAllowed: false,
      serviceWriteAllowed: false,
      finalApprovalAllowed: false,
    },
  }
}

export function renderMarkdown(review) {
  const lines = [
    '# 창세기 G2 · Canary 승격 검토 패킷',
    '',
    `- 평가 digest: \`${review.evaluationDigest}\``,
    `- 승격 상태: **${review.promotionStatus}**`,
    `- 후보: **${review.counts.presentCandidates}/${review.counts.expectedCandidates}**`,
    `- 평균 lexical agreement: **${review.metrics.averageLexicalAgreement}**`,
    `- 평균 confidence: **${review.metrics.averageConfidence}**`,
    '- 자동 승격·서비스 쓰기·최종 승인: **금지**',
    '',
    '## Strong별 요약',
    '',
    '| Strong | 상태 | NVIDIA 표제어 | OpenAI 표제어 | 합의도 | confidence | 위험 누락 |',
    '|---|---|---|---|---:|---:|---|',
  ]
  for (const item of review.items) {
    lines.push(`| ${item.strong} | ${item.status} | ${escapeCell(item.providers.nvidia.primaryGlossKo)} | ${escapeCell(item.providers.openai.primaryGlossKo)} | ${item.agreement.nodeAverage} | ${item.confidence.average} | ${escapeCell(item.riskCoverage.missing.join(', ') || '-')} |`)
  }
  for (const item of review.items) {
    lines.push('', `## ${item.strong} · ${item.role}`, '')
    lines.push(`- NVIDIA: **${escapeCell(item.providers.nvidia.primaryGlossKo)}** · ${escapeCell(item.providers.nvidia.transliterationKo)} · model \`${escapeCell(item.providers.nvidia.model)}\``)
    lines.push(`- OpenAI: **${escapeCell(item.providers.openai.primaryGlossKo)}** · ${escapeCell(item.providers.openai.transliterationKo)} · model \`${escapeCell(item.providers.openai.model)}\``)
    lines.push(`- warnings: ${escapeCell(item.warnings.join('; ') || '없음')}`)
    lines.push('', '| node | score | NVIDIA | OpenAI | confidence N/O | risk |', '|---|---:|---|---|---|---|')
    for (const node of item.disagreementNodes) {
      lines.push(`| ${escapeCell(node.sourceNodeId)} | ${node.score} | ${escapeCell(node.nvidiaTextKo)} | ${escapeCell(node.openaiTextKo)} | ${node.nvidiaConfidence}/${node.openaiConfidence} | ${escapeCell(node.riskFlags.join(', ') || '-')} |`)
    }
  }
  lines.push('', '## 사람 승인 기록', '', '- [ ] 원문 구조와 전체 노드 보존 확인', '- [ ] H430·H7307 신학 민감 의미 확인', '- [ ] H776·H7307 다의어 구분 확인', '- [ ] 100개 교정 배치 확대 승인 여부 결정', '')
  return `${lines.join('\n')}\n`
}

export function approvalTemplate(review) {
  return {
    schemaVersion: 1,
    target: review.target,
    decision: 'pending',
    evaluationDigest: review.evaluationDigest,
    evaluationStatus: review.promotionStatus,
    reviewer: '',
    reviewedAt: null,
    notes: '',
    humanApprovalConfirmed: false,
    governance: {
      automaticPromotionAllowed: false,
      serviceWriteAllowed: false,
      finalApprovalAllowed: false,
    },
  }
}

function writePackage(args) {
  const evaluationRaw = readFileSync(resolve(args.evaluation), 'utf8')
  const evaluation = JSON.parse(evaluationRaw)
  const candidatesByStrong = Object.fromEntries(evaluation.pairs.map((pair) => [pair.strong, loadCandidates(args.root, pair.strong)]))
  const review = buildPromotionReview({ evaluation, evaluationDigest: sha256(evaluationRaw), candidatesByStrong })
  const dir = resolve(args.outputDir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'promotion-review.json'), `${JSON.stringify(review, null, 2)}\n`, 'utf8')
  writeFileSync(resolve(dir, 'promotion-review.md'), renderMarkdown(review), 'utf8')
  writeFileSync(resolve(dir, 'calibration-100-approval-template.json'), `${JSON.stringify(approvalTemplate(review), null, 2)}\n`, 'utf8')
  return review
}

function runSelfTest() {
  const root = resolve(tmpdir(), `genesis-g2-promotion-review-${process.pid}`)
  rmSync(root, { recursive: true, force: true })
  const candidate = (provider) => ({ provider, model: `${provider}-fixture`, requestId: `${provider}-req`, payload: { transliterationKo: '에레츠', primaryGlossKo: provider === 'nvidia' ? '땅' : '땅, 토지', notesKo: '', nodes: [{ sourceNodeId: 'n1', textKo: provider === 'nvidia' ? '땅' : '토지', confidence: 0.9, riskFlags: ['polysemy'] }] } })
  const evaluation = { evaluationVersion: 'fixture', promotion: { status: 'eligible-for-human-promotion-review', reasons: ['human review required'] }, counts: { expectedCandidates: 2, presentCandidates: 2 }, metrics: { averageLexicalAgreement: 0.6, averageConfidence: 0.9 }, gates: { humanApprovalRequired: true }, pairs: [{ strong: 'H776', role: 'fixture', status: 'manual-review-required', warnings: [], errors: [], agreement: { nodeAverage: 0.6, nodes: [{ sourceNodeId: 'n1', score: 0.6 }] }, confidence: { average: 0.9 }, riskCoverage: { missing: [] }, usage: {} }] }
  const review = buildPromotionReview({ evaluation, evaluationDigest: sha256(JSON.stringify(evaluation)), candidatesByStrong: { H776: { nvidia: candidate('nvidia'), openai: candidate('openai') } } })
  if (review.items.length !== 1 || !renderMarkdown(review).includes('H776')) throw new Error('promotion review self-test failed')
  if (approvalTemplate(review).decision !== 'pending') throw new Error('approval template self-test failed')
  console.log('✓ Genesis G2 promotion review self-test 통과')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) runSelfTest()
else {
  const review = writePackage(args)
  console.log(`✓ Genesis G2 promotion review · items=${review.items.length} · status=${review.promotionStatus}`)
}
