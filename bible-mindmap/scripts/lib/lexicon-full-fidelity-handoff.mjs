// Full-Fidelity handoff classifier for Genesis Korean lexicon correction candidates.
// Deterministic, evidence-based classification into:
//   - RESEARCH_IN_PROGRESS: candidate skeleton missing (no identity, no nodes)
//   - CORRECTION_CANDIDATE_INCOMPLETE: candidate exists but missing Full-Fidelity
//     expansion fields promised by the Full-Fidelity contract
//   - HANDOFF_READY: FF expansion fields present with structural integrity and,
//     for lemma-specific baselines, the known deficiencies are addressed
//   - VERIFIER_READY: HANDOFF_READY + governance closed-write invariants +
//     candidateFingerprint self-consistency
//
// Classification is objective: presence, count, structural shape, and known
// lemma-specific coverage. Branch name, phase label, or human interpretation
// must never move a candidate up the ladder.

import { createHash } from 'node:crypto'

export const FULL_FIDELITY_REQUIRED_FIELDS = Object.freeze([
  'sourceAccount',
  'usageQualifier',
  'representativeRefs',
  'genesisRefs',
  'morphologyForms',
  'rightsBasis',
])

// Missing-field → reason code. Matches Genesis card §H776/BDB Full-Fidelity contract naming.
const MISSING_REASON_CODE = Object.freeze({
  sourceAccount: 'MISSING_SOURCE_ACCOUNT',
  usageQualifier: 'MISSING_USAGE_QUALIFIERS',
  representativeRefs: 'MISSING_REPRESENTATIVE_REFS',
  genesisRefs: 'MISSING_GENESIS_REFS',
  morphologyForms: 'MISSING_MORPHOLOGY_FORMS',
  rightsBasis: 'MISSING_RIGHTS_BASIS',
})

// Lemma-specific baselines derived from the Genesis card 2026-08-13 🧭/🛠️ callouts.
// These are the deficiencies GPT has already publicly acknowledged for these
// lemmas; a HANDOFF_READY candidate MUST demonstrably address them.
export const LEMMA_SPECIFIC_REQUIREMENTS = Object.freeze({
  H1254a: Object.freeze({
    usageQualifierMustMatch: [/신적|divine|deity|god\b/i],
    morphologyStemsRequired: ['Qal', 'Niphal', 'Piel'],
    minGenesisRefs: 3,
    knownDeficiencies: Object.freeze([
      'QAL_FORM_LIST',
      'ALWAYS_OF_DIVINE_ACTIVITY_QUALIFIER',
      'FOUR_QAL_USAGE_GROUPS',
    ]),
  }),
  H430: Object.freeze({
    minUsageQualifiers: 3,
    minRepresentativeRefs: 5,
    minGenesisRefs: 3,
    knownDeficiencies: Object.freeze([
      'BDB_PRINT_QUALIFIERS',
      'REPRESENTATIVE_REFERENCES',
    ]),
  }),
})

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0
}

function stringifyStable(value) {
  if (Array.isArray(value)) return `[${value.map(stringifyStable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stringifyStable(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(stringifyStable(value)).digest('hex')}`
}

function collectMissingBaseFields(candidate) {
  return FULL_FIDELITY_REQUIRED_FIELDS.filter((field) => {
    const value = candidate?.[field]
    if (field === 'rightsBasis') return !value || (typeof value === 'object' && Object.keys(value).length === 0)
    return !isNonEmptyArray(value)
  })
}

function evaluateLemmaSpecific(candidate, rules) {
  const violations = []
  if (rules.usageQualifierMustMatch) {
    const joined = (candidate.usageQualifier || [])
      .map((item) => (typeof item === 'string' ? item : String(item?.text ?? item?.qualifier ?? '')))
      .join(' | ')
    for (const rx of rules.usageQualifierMustMatch) {
      if (!rx.test(joined)) violations.push(`LEMMA_QUALIFIER_MISSING:${rx.source}`)
    }
  }
  if (rules.morphologyStemsRequired) {
    const stems = (candidate.morphologyForms || [])
      .map((item) => (typeof item === 'string' ? item : String(item?.stem ?? item?.binyan ?? '')))
      .map((value) => value.toLowerCase())
    for (const stem of rules.morphologyStemsRequired) {
      if (!stems.some((observed) => observed.includes(stem.toLowerCase()))) {
        violations.push(`MORPHOLOGY_STEM_MISSING:${stem}`)
      }
    }
  }
  if (rules.minGenesisRefs && (candidate.genesisRefs || []).length < rules.minGenesisRefs) {
    violations.push(`MISSING_GENESIS_REFS:min=${rules.minGenesisRefs}`)
  }
  if (rules.minUsageQualifiers && (candidate.usageQualifier || []).length < rules.minUsageQualifiers) {
    violations.push(`MISSING_USAGE_QUALIFIERS:min=${rules.minUsageQualifiers}`)
  }
  if (rules.minRepresentativeRefs && (candidate.representativeRefs || []).length < rules.minRepresentativeRefs) {
    violations.push(`MISSING_REPRESENTATIVE_REFS:min=${rules.minRepresentativeRefs}`)
  }
  return violations
}

function evaluateVerifierReadyInvariants(candidate) {
  const violations = []
  const gov = candidate.governance || {}
  const closedWriteKeys = [
    'finalApprovalAllowed',
    'approvalRegistryWriteAllowed',
    'serviceUiWriteAllowed',
    'productionWriteAllowed',
    'existingApprovedMeaningMutationAllowed',
  ]
  for (const key of closedWriteKeys) {
    if (gov[key] !== false) violations.push(`GOVERNANCE_OPEN_WRITE:${key}`)
  }
  if (candidate.candidateFingerprint) {
    const { candidateFingerprint, ...rest } = candidate
    if (candidateFingerprint !== sha256(rest)) violations.push('CANDIDATE_FINGERPRINT_DRIFT')
  } else {
    violations.push('MISSING_CANDIDATE_FINGERPRINT')
  }
  return violations
}

export function classifyCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return {
      classification: 'RESEARCH_IN_PROGRESS',
      missingFields: FULL_FIDELITY_REQUIRED_FIELDS.slice(),
      reasons: ['MISSING_CANDIDATE_OBJECT'],
    }
  }

  const hasIdentity = candidate.candidateId && candidate.identity?.lemma && candidate.identity?.transliterationKo
  const hasNodes = isNonEmptyArray(candidate.nodes)
  if (!hasIdentity || !hasNodes) {
    const reasons = []
    if (!candidate.candidateId) reasons.push('MISSING_CANDIDATE_ID')
    if (!candidate.identity?.lemma) reasons.push('MISSING_LEMMA')
    if (!candidate.identity?.transliterationKo) reasons.push('MISSING_TRANSLITERATION_KO')
    if (!hasNodes) reasons.push('MISSING_NODES')
    return {
      classification: 'RESEARCH_IN_PROGRESS',
      missingFields: FULL_FIDELITY_REQUIRED_FIELDS.slice(),
      reasons,
    }
  }

  const missingBaseFields = collectMissingBaseFields(candidate)
  if (missingBaseFields.length > 0) {
    return {
      classification: 'CORRECTION_CANDIDATE_INCOMPLETE',
      missingFields: missingBaseFields,
      reasons: [
        ...missingBaseFields.map((field) => MISSING_REASON_CODE[field]),
        'FULL_FIDELITY_GAP_UNRESOLVED',
      ],
    }
  }

  const lemma = candidate.sourceStrong || candidate.baseStrong
  const rules = LEMMA_SPECIFIC_REQUIREMENTS[lemma]
  if (rules) {
    const violations = evaluateLemmaSpecific(candidate, rules)
    if (violations.length > 0) {
      return {
        classification: 'CORRECTION_CANDIDATE_INCOMPLETE',
        missingFields: [],
        reasons: [...violations, 'FULL_FIDELITY_GAP_UNRESOLVED'],
      }
    }
  }

  const verifierViolations = evaluateVerifierReadyInvariants(candidate)
  if (verifierViolations.length > 0) {
    return { classification: 'HANDOFF_READY', missingFields: [], reasons: verifierViolations }
  }

  return { classification: 'VERIFIER_READY', missingFields: [], reasons: [] }
}

// If a candidate's declared status/label claims handoff-readiness but the
// classifier fails it, that is a hard governance violation. The bundle must
// never be able to advertise a readiness level it does not objectively meet.
export function detectClaimedButIncomplete(candidate, classification) {
  const claim = String(candidate?.status || '').toLowerCase()
  const claimed = claim === 'handoff-ready' || claim === 'verifier-ready' || claim === 'pass' || claim === 'approved'
  if (!claimed) return null
  if (classification === 'VERIFIER_READY') return null
  if (classification === 'HANDOFF_READY' && claim !== 'verifier-ready') return null
  return `HANDOFF_READY_CLAIMED_BUT_INCOMPLETE:${claim}→${classification}`
}

// -----------------------------------------------------------------------------
// Deterministic self-tests. Fixtures are inline so the whole contract lives in
// this one tracked module; no additional JSON files to keep in sync.
// -----------------------------------------------------------------------------

function makeParityOnlyCandidate(overrides = {}) {
  return {
    candidateId: 'GEN-P5-H1254-H1254a-GPT-v1',
    baseStrong: 'H1254',
    sourceStrong: 'H1254a',
    status: 'candidate',
    identity: { lemma: 'בָּרָא', transliterationKo: '바라' },
    nodes: [{ sourceNodeId: '1', textKo: '창조하다', confidence: 0.86, riskFlags: [] }],
    governance: {
      candidateOnly: true,
      finalApprovalAllowed: false,
      approvalRegistryWriteAllowed: false,
      serviceUiWriteAllowed: false,
      productionWriteAllowed: false,
      existingApprovedMeaningMutationAllowed: false,
    },
    ...overrides,
  }
}

function makeHandoffReadyH1254a() {
  const candidate = {
    ...makeParityOnlyCandidate(),
    sourceAccount: [
      { sourceNodeId: '1', bdbLocator: 'BrownDriverBriggs.xml:b.cw.aa', capturedText: 'to shape, fashion, create (always of divine activity)' },
      { sourceNodeId: '1.2', bdbLocator: 'BrownDriverBriggs.xml:b.cw.aa#niphal', capturedText: 'be created' },
    ],
    usageQualifier: [
      { qualifier: 'Qal은 항상 신적 활동의 주어와 함께 쓰인다', context: 'always of divine activity' },
      { qualifier: '새 조건·상황의 창조', context: 'new condition/state' },
    ],
    representativeRefs: [
      { ref: 'GEN 1:1', textEn: 'In the beginning God created the heavens and the earth.' },
      { ref: 'GEN 1:21' }, { ref: 'GEN 1:27' }, { ref: 'GEN 2:3' }, { ref: 'GEN 5:1' }, { ref: 'ISA 45:7' },
    ],
    genesisRefs: [
      { ref: 'GEN 1:1' }, { ref: 'GEN 1:21' }, { ref: 'GEN 1:27' }, { ref: 'GEN 2:3' }, { ref: 'GEN 5:1' },
    ],
    morphologyForms: [
      { stem: 'Qal', form: 'בָּרָא', gloss: 'created' },
      { stem: 'Niphal', form: 'נִבְרְאוּ', gloss: 'were created' },
      { stem: 'Piel', form: 'בֵּרֵא', gloss: 'cut down' },
    ],
    rightsBasis: {
      datasetCommit: '21c9add13bc727d3a951361778e97e3ff7afd1ce',
      license: 'CC BY 4.0',
      attribution: 'Open Scriptures Hebrew Bible Project',
    },
  }
  return candidate
}

function makeVerifierReadyH1254a() {
  const base = makeHandoffReadyH1254a()
  base.candidateFingerprint = sha256({ ...base })
  return base
}

export function runFullFidelityHandoffSelfTest({ assertFn } = {}) {
  const assert = assertFn || ((ok, msg) => { if (!ok) throw new Error(`self-test failed: ${msg}`) })
  const parity = makeParityOnlyCandidate()
  const parityResult = classifyCandidate(parity)
  assert(parityResult.classification === 'CORRECTION_CANDIDATE_INCOMPLETE', `parity got ${parityResult.classification}`)
  assert(parityResult.reasons.includes('FULL_FIDELITY_GAP_UNRESOLVED'), 'parity should surface FULL_FIDELITY_GAP_UNRESOLVED')
  assert(parityResult.reasons.includes('MISSING_SOURCE_ACCOUNT'), 'parity missing sourceAccount reason')

  const handoff = makeHandoffReadyH1254a()
  const handoffResult = classifyCandidate(handoff)
  assert(
    handoffResult.classification === 'HANDOFF_READY' || handoffResult.classification === 'VERIFIER_READY',
    `handoff-ready fixture landed at ${handoffResult.classification} (${handoffResult.reasons.join(', ')})`,
  )
  // HANDOFF_READY never automatically equals PASS.
  assert(handoffResult.classification !== 'PASS', 'HANDOFF_READY must not equal PASS')

  const verifierReady = makeVerifierReadyH1254a()
  const verifierResult = classifyCandidate(verifierReady)
  assert(verifierResult.classification === 'VERIFIER_READY', `verifier-ready fixture got ${verifierResult.classification}`)

  // Governance override should demote VERIFIER_READY → HANDOFF_READY.
  const openWrite = { ...verifierReady, governance: { ...verifierReady.governance, approvalRegistryWriteAllowed: true } }
  openWrite.candidateFingerprint = sha256({ ...openWrite, candidateFingerprint: undefined })
  const openResult = classifyCandidate(openWrite)
  assert(openResult.classification === 'HANDOFF_READY', `open-write should demote to HANDOFF_READY, got ${openResult.classification}`)
  assert(openResult.reasons.some((r) => r.startsWith('GOVERNANCE_OPEN_WRITE')), 'open-write should be flagged')

  // Claim-vs-reality guard.
  const bogusClaim = { ...parity, status: 'handoff-ready' }
  const claimWarning = detectClaimedButIncomplete(bogusClaim, classifyCandidate(bogusClaim).classification)
  assert(claimWarning && claimWarning.startsWith('HANDOFF_READY_CLAIMED_BUT_INCOMPLETE'), 'claim-vs-reality guard must fire')

  // XML-node parity alone must never produce HANDOFF_READY, even for many nodes.
  const heavyParity = makeParityOnlyCandidate({
    nodes: Array.from({ length: 26 }, (_, index) => ({
      sourceNodeId: `${index + 1}`,
      textKo: '한국어',
      confidence: 0.9,
      riskFlags: [],
    })),
  })
  const heavyResult = classifyCandidate(heavyParity)
  assert(heavyResult.classification === 'CORRECTION_CANDIDATE_INCOMPLETE', `heavy parity landed at ${heavyResult.classification}`)
}
