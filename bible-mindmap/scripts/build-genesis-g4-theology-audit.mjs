#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const THEOLOGY_AUDIT_VERSION = '2026.08.09-g4.0'
const DEFAULT_CONTEXT_REVIEW = 'reports/genesis-g3-context-review/context-review.json'
const DEFAULT_OUTPUT_DIR = 'reports/genesis-g4-theology-audit'

const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`
const escapeCell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')

export const AUTHORITY_ORDER = Object.freeze([
  {
    id: 'scripture-original-context',
    rank: 1,
    labelKo: '성경 원문·문법·문맥',
    ruleKo: '히브리어 형태와 창세기 문맥이 번역 의미 범위를 결정한다.',
  },
  {
    id: 'scripture-analogy-progressive-revelation',
    rank: 2,
    labelKo: '성경의 유비·점진적 계시',
    ruleKo: '후대 계시는 창세기 의미를 밝혀 주되 본문에 없는 뜻을 역주입하지 않는다.',
  },
  {
    id: 'reformed-confessional-guardrail',
    rank: 3,
    labelKo: '개혁주의 신조 안전선',
    ruleKo: '웨스트민스터 표준문서를 1차 신조 기준으로 삼고 벨직·하이델베르크·도르트와 교차 점검한다.',
  },
  {
    id: 'source-lexicon-hierarchy',
    rank: 4,
    labelKo: 'BDB 원문 의미 계층',
    ruleKo: '사전의 sense 경계와 하위 의미 구조를 보존하며 신조가 사전 뜻을 임의로 대체하지 않는다.',
  },
  {
    id: 'model-output-advisory-only',
    rank: 5,
    labelKo: 'AI 후보·점수',
    ruleKo: '모델 합의와 confidence는 검토 우선순위 자료일 뿐 신학적 최종 권위가 아니다.',
  },
])

export const CONFESSIONAL_REFERENCES = Object.freeze({
  scripture: ['WCF 1.9', 'Belgic 7'],
  god: ['WCF 2.1-3', 'WSC 4-6', 'Belgic 8-11', 'Heidelberg 24-25'],
  creation: ['WCF 4.1-2', 'WSC 9-10', 'Belgic 12-14', 'Heidelberg 26-28'],
  providence: ['WCF 5.1-7', 'WSC 11', 'Belgic 13', 'Heidelberg 27-28'],
  covenant: ['WCF 7.1-6', 'WSC 12, 20', 'Belgic 17, 22-23', 'Heidelberg 19-23'],
  christology: ['WCF 8.1-8', 'Belgic 18-21', 'Heidelberg 29-31'],
  pneumatology: ['WCF 2.3, 10.1-4', 'Belgic 8-11, 24', 'Heidelberg 53'],
  sin: ['WCF 6.1-6', 'WSC 13-19', 'Belgic 14-15', 'Heidelberg 3-11'],
  anthropology: ['WCF 4.2, 9.1-5', 'WSC 10, 13-19', 'Belgic 14', 'Heidelberg 6-8'],
  general: ['WCF 1.9', 'Belgic 7'],
})

const STRONG_POLICIES = Object.freeze({
  H430: {
    forcedRisk: 'R4',
    domains: ['god', 'scripture'],
    triggers: ['divine-designation', 'morphological-plural-form', 'theological-sensitive'],
    questions: [
      'אֱלֹהִים의 형태적 복수성과 문맥상 단수 지시를 혼동하지 않았는가?',
      '창세기 문맥이 허용하지 않는 삼위일체 증명이나 반대로 삼위일체 부정을 번역 문구에 삽입하지 않았는가?',
      '참 하나님·거짓 신들·천상 존재 등 지시 대상의 문맥적 차이를 보존했는가?',
    ],
  },
  H7307: {
    forcedRisk: 'R4',
    domains: ['pneumatology', 'creation', 'scripture'],
    triggers: ['spirit-wind-breath-polysemy', 'theological-sensitive', 'polysemy'],
    questions: [
      'רוּחַ의 영·바람·호흡 의미를 각 창세기 문맥과 형태론에 따라 구분했는가?',
      '성령을 지시하는 문맥과 피조 세계의 바람·생명의 호흡을 동일 의미로 평면화하지 않았는가?',
      '후대 계시를 참조하되 창세기 본문에 없는 인격·사역 설명을 번역 자체에 과잉 삽입하지 않았는가?',
    ],
  },
  H776: {
    forcedRisk: 'R2',
    domains: ['creation', 'covenant', 'scripture'],
    triggers: ['land-earth-territory-polysemy', 'polysemy'],
    questions: [
      '땅·대지·육지·지역·영토의 의미 범위를 창세기 문맥별로 구분했는가?',
      '약속의 땅이라는 후대 신학 주제를 일반적인 אֶרֶץ 용례에 과잉 적용하지 않았는가?',
    ],
  },
  H559: {
    forcedRisk: 'R0',
    domains: ['scripture'],
    triggers: ['high-frequency-reporting-verb'],
    questions: [
      '일반 발화 동사를 신적 계시 용어로 일괄 격상하지 않았는가?',
      '화자와 담화 기능에 따라 말하다·이르다 등의 자연스러운 차이를 허용했는가?',
    ],
  },
  H56: {
    forcedRisk: 'R1',
    domains: ['general'],
    triggers: ['low-frequency-lexeme'],
    questions: [
      '희귀 용례에 BDB 범위를 넘어서는 신학적 의미를 부여하지 않았는가?',
      '문맥상 애도·슬픔 등 정서 의미를 과도하게 교리화하지 않았는가?',
    ],
  },
})

const RISK_ORDER = Object.freeze({ R0: 0, R1: 1, R2: 2, R3: 3, R4: 4 })

function maxRisk(...levels) {
  return levels.filter((level) => level in RISK_ORDER).sort((a, b) => RISK_ORDER[b] - RISK_ORDER[a])[0] || 'R0'
}

function inferredRisk(item) {
  const expected = new Set(item.candidateMetrics?.riskCoverage?.expected || [])
  const warnings = item.candidateMetrics?.warnings || []
  let risk = 'R0'
  if (expected.has('polysemy')) risk = maxRisk(risk, 'R2')
  if (expected.has('theological-sensitive')) risk = maxRisk(risk, 'R3')
  if (warnings.length) risk = maxRisk(risk, 'R1')
  if ((item.candidateMetrics?.agreement?.nodeAverage ?? 1) < 0.35) risk = maxRisk(risk, 'R2')
  if ((item.candidateMetrics?.confidence?.average ?? 1) < 0.7) risk = maxRisk(risk, 'R2')
  return risk
}

function policyFor(item) {
  const explicit = STRONG_POLICIES[item.strong]
  const domains = explicit?.domains || ['general']
  const refs = [...new Set(domains.flatMap((domain) => CONFESSIONAL_REFERENCES[domain] || CONFESSIONAL_REFERENCES.general))]
  const baseQuestions = [
    '한국어 번역이 BDB 원문 sense의 범위와 계층을 보존하는가?',
    '창세기 실제 용례와 형태론 분포가 선택한 표제어와 의미 설명을 지지하는가?',
    '성경의 유비를 사용하되 후대 교리 개념을 창세기 어휘 뜻 자체와 혼동하지 않았는가?',
    '번역 문구가 특정 신학 전통의 해설을 사전적 의미인 것처럼 숨겨 삽입하지 않았는가?',
    '독자가 본문 문맥과 추가 신학 설명을 명확히 구분할 수 있는가?',
  ]
  return {
    riskLevel: maxRisk(inferredRisk(item), explicit?.forcedRisk),
    domains,
    triggers: [...new Set([...(explicit?.triggers || []), ...(item.candidateMetrics?.riskCoverage?.expected || [])])],
    confessionalReferences: refs,
    questions: [...baseQuestions, ...(explicit?.questions || [])],
  }
}

function evidenceIds(item) {
  return [
    `bdb:${item.lexicalEvidence.packetId}`,
    ...item.genesisUsageEvidence.sampleContextIds.map((id) => `genesis-usage:${id}`),
    ...item.lexicalEvidence.lowAgreementSourceNodeIds.map((id) => `candidate-disagreement:${id}`),
  ]
}

export function buildGenesisTheologyAudit({ contextReview, contextReviewDigest }) {
  const items = (contextReview.items || []).map((item) => {
    const policy = policyFor(item)
    return {
      auditId: `genesis-g4-audit:${item.strong}`,
      strong: item.strong,
      role: item.role,
      riskLevel: policy.riskLevel,
      riskDomains: policy.domains,
      riskTriggers: policy.triggers,
      confessionalReferences: policy.confessionalReferences,
      authorityOrder: AUTHORITY_ORDER,
      sourceSummary: {
        lemmas: item.identity?.lemmas || [],
        transliterations: item.identity?.transliterations || [],
        sourceNodeCount: item.lexicalEvidence?.sourceNodeCount || 0,
        genesisOccurrences: item.genesisUsageEvidence?.totalOccurrences || 0,
        genesisChapters: item.genesisUsageEvidence?.chapters || [],
        sampleContextIds: item.genesisUsageEvidence?.sampleContextIds || [],
      },
      candidateSummary: {
        nvidia: item.providers?.nvidia || null,
        openai: item.providers?.openai || null,
        agreement: item.candidateMetrics?.agreement || null,
        confidence: item.candidateMetrics?.confidence || null,
        warnings: item.candidateMetrics?.warnings || [],
        missingRiskFlags: item.candidateMetrics?.riskCoverage?.missing || [],
      },
      evidenceIds: evidenceIds(item),
      reviewChecklist: policy.questions.map((question, index) => ({
        id: `${item.strong}:theology-check:${index + 1}`,
        question,
        status: 'pending',
        evidenceIds: [],
        notes: '',
      })),
      theologicalDecision: {
        status: 'pending-human-audit',
        decision: null,
        approvedGlossKo: null,
        approvedSenseNotesKo: '',
        reviewer: '',
        reviewedAt: null,
        rationale: '',
      },
      routing: {
        queue: policy.riskLevel === 'R4' ? 'intensive-theology-review'
          : policy.riskLevel === 'R3' ? 'theology-review'
            : policy.riskLevel === 'R2' ? 'semantic-context-review'
              : policy.riskLevel === 'R1' ? 'sample-review'
                : 'standard-review',
        automaticApprovalEligible: false,
        sampleOnlyEligible: ['R0', 'R1'].includes(policy.riskLevel),
      },
      governance: {
        humanTheologyAuditRequired: ['R3', 'R4'].includes(policy.riskLevel),
        confessionalReferenceIsGuardrailNotLexiconReplacement: true,
        automaticTheologyApprovalAllowed: false,
        candidateMutationAllowed: false,
        productionWriteAllowed: false,
        finalApprovalAllowed: false,
      },
    }
  })

  const countsByRisk = Object.fromEntries(Object.keys(RISK_ORDER).map((risk) => [risk, items.filter((item) => item.riskLevel === risk).length]))
  return {
    schemaVersion: 1,
    auditVersion: THEOLOGY_AUDIT_VERSION,
    target: 'genesis-g2-canary-theology-audit',
    generatedAt: new Date().toISOString(),
    contextReviewDigest,
    contextReviewVersion: contextReview.reviewVersion,
    status: items.length && contextReview.status === 'human-context-review-required' ? 'pending-human-theology-audit' : 'blocked',
    authorityOrder: AUTHORITY_ORDER,
    counts: {
      expectedItems: contextReview.counts?.reviewItems || 0,
      auditItems: items.length,
      byRisk: countsByRisk,
      intensiveReview: items.filter((item) => item.routing.queue === 'intensive-theology-review').length,
      checklistItems: items.reduce((sum, item) => sum + item.reviewChecklist.length, 0),
      evidenceIds: items.reduce((sum, item) => sum + item.evidenceIds.length, 0),
    },
    gates: {
      contextEvidenceReady: contextReview.gates?.sourceEvidenceReady === true,
      candidateEvidenceReady: contextReview.gates?.candidateEvidenceReady === true,
      humanTheologyAuditRequired: true,
      automaticTheologyApprovalAllowed: false,
      serviceWriteAllowed: false,
      finalApprovalAllowed: false,
    },
    items,
    governance: {
      stage: 'G4-theology-audit',
      scriptureRemainsFinalAuthority: true,
      confessionServesAsDoctrinalGuardrail: true,
      aiOutputIsAdvisoryOnly: true,
      automaticAdjudicationAllowed: false,
      productionWriteAllowed: false,
      finalApprovalAllowed: false,
    },
  }
}

export function renderGenesisTheologyAuditMarkdown(audit) {
  const lines = [
    '# 창세기 G4 · 개혁주의 신학 감사 패킷',
    '',
    `- 상태: **${audit.status}**`,
    `- Strong: **${audit.counts.auditItems}/${audit.counts.expectedItems}**`,
    `- 위험 분포: **${Object.entries(audit.counts.byRisk).map(([risk, count]) => `${risk} ${count}`).join(' · ')}**`,
    `- 집중 신학 검토: **${audit.counts.intensiveReview}건**`,
    '- 자동 신학 승인·서비스 쓰기·최종 승인: **금지**',
    '',
    '## 권위 순서',
    '',
  ]
  for (const authority of audit.authorityOrder) lines.push(`${authority.rank}. **${authority.labelKo}** — ${authority.ruleKo}`)
  lines.push('', '## 감사 큐', '', '| Strong | 위험 | 큐 | NVIDIA | OpenAI | 출현 | 신조 교차점 |', '|---|---|---|---|---|---:|---|')
  for (const item of audit.items) {
    lines.push(`| ${item.strong} | ${item.riskLevel} | ${item.routing.queue} | ${escapeCell(item.candidateSummary.nvidia?.primaryGlossKo)} | ${escapeCell(item.candidateSummary.openai?.primaryGlossKo)} | ${item.sourceSummary.genesisOccurrences} | ${escapeCell(item.confessionalReferences.join(', '))} |`)
  }
  for (const item of audit.items) {
    lines.push('', `## ${item.strong} · ${item.riskLevel} · ${item.routing.queue}`, '')
    lines.push(`- lemma: ${escapeCell(item.sourceSummary.lemmas.join(', '))}`)
    lines.push(`- 위험 트리거: ${escapeCell(item.riskTriggers.join(', ') || '없음')}`)
    lines.push(`- 창세기 용례: ${item.sourceSummary.genesisOccurrences}회 · ${item.sourceSummary.genesisChapters.length}장`)
    lines.push(`- 신조 교차점: ${escapeCell(item.confessionalReferences.join(', '))}`)
    lines.push('', '### 사람 감사 체크', '')
    for (const check of item.reviewChecklist) lines.push(`- [ ] ${check.question}`)
  }
  return `${lines.join('\n')}\n`
}

function readRawJson(path) {
  const raw = readFileSync(resolve(path), 'utf8')
  return { raw, data: JSON.parse(raw) }
}

function writePackage(args) {
  const context = readRawJson(args.contextReview)
  const audit = buildGenesisTheologyAudit({ contextReview: context.data, contextReviewDigest: sha256(context.raw) })
  const outputDir = resolve(args.outputDir)
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(resolve(outputDir, 'theology-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
  writeFileSync(resolve(outputDir, 'theology-audit.md'), renderGenesisTheologyAuditMarkdown(audit), 'utf8')
  return audit
}

function fixtureItem(strong, expected = []) {
  return {
    strong, role: 'fixture',
    identity: { lemmas: [strong], transliterations: [strong] },
    providers: { nvidia: { primaryGlossKo: '후보 A' }, openai: { primaryGlossKo: '후보 B' } },
    lexicalEvidence: { packetId: `source:${strong}`, sourceNodeCount: 2, lowAgreementSourceNodeIds: [] },
    genesisUsageEvidence: { totalOccurrences: 3, chapters: [1], sampleContextIds: [`${strong}:o1`] },
    candidateMetrics: { agreement: { nodeAverage: 0.8 }, confidence: { average: 0.9 }, warnings: [], riskCoverage: { expected, missing: [] } },
  }
}

function runSelfTest() {
  const contextReview = {
    reviewVersion: 'fixture', status: 'human-context-review-required',
    counts: { reviewItems: 2 }, gates: { sourceEvidenceReady: true, candidateEvidenceReady: true },
    items: [fixtureItem('H430', ['theological-sensitive']), fixtureItem('H776', ['polysemy'])],
  }
  const audit = buildGenesisTheologyAudit({ contextReview, contextReviewDigest: `sha256:${'a'.repeat(64)}` })
  assert.equal(audit.status, 'pending-human-theology-audit')
  assert.equal(audit.items.find((item) => item.strong === 'H430').riskLevel, 'R4')
  assert.equal(audit.items.find((item) => item.strong === 'H776').riskLevel, 'R2')
  assert.equal(audit.gates.automaticTheologyApprovalAllowed, false)
  assert(renderGenesisTheologyAuditMarkdown(audit).includes('WCF 2.1-3'))
  console.log('✓ Genesis G4 theology audit builder self-test passed')
}

function parseArgs(argv) {
  const args = { contextReview: DEFAULT_CONTEXT_REVIEW, outputDir: DEFAULT_OUTPUT_DIR, selfTest: false }
  for (const arg of argv) {
    if (arg === '--self-test') args.selfTest = true
    else if (arg.startsWith('--context-review=')) args.contextReview = arg.slice(17)
    else if (arg.startsWith('--output-dir=')) args.outputDir = arg.slice(13)
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) return runSelfTest()
  const audit = writePackage(args)
  console.log(`✓ Genesis G4 theology audit · items=${audit.counts.auditItems}/${audit.counts.expectedItems} · status=${audit.status}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
